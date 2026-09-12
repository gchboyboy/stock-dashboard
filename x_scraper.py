"""StockPulse X scraper – Python 3.9+ compatible, multi-strategy.

Free-first fetch chain (no paid API required):
  1. RSS-Bridge  – self-hosted or public instance (config.FEED_SOURCE_URL)
  2. Syndication – X's free embed timeline endpoint (no auth)
  3. tweepy      – official X API v2 (skipped unless X_BEARER_TOKEN set)
  4. Guest GQL   – X guest-token GraphQL (fragile, may 429)
  5. Nitter      – last resort via ntscraper (mostly dead, kept as safety net)

Other features:
  - Disk cache: last successful fetch survives server restarts / all-fail runs.
  - Rolling 90-day cashtag mention counts stored in data/mentions.json.
  - Feed source fully configurable via FEED_SOURCE_URL in .env.
"""
import json
import os
import re
import logging
import html as _html_mod
import time
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

import requests

import config

logger = logging.getLogger(__name__)
CASHTAG_RE = re.compile(r"\$[A-Z]{1,5}\b")


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _ensure_data_dir():
    os.makedirs(config.DATA_DIR, exist_ok=True)


def _load_tweets():
    if os.path.exists(config.TWEETS_FILE):
        try:
            with open(config.TWEETS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"tweets": [], "last_updated": None}


def _save_tweets(data):
    _ensure_data_dir()
    with open(config.TWEETS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _extract_tickers(text):
    found = []
    upper = text.upper()
    for ticker in config.STOCK_TICKERS:
        pat = r'(?:^|[\s$#@])' + re.escape(ticker) + r'(?:$|[\s,.!\u2026])'
        if re.search(pat, upper):
            found.append(ticker)
    return sorted(set(found))


def _clean_text(text):
    """Unescape HTML entities, strip t.co short-links, collapse whitespace."""
    text = _html_mod.unescape(text)
    text = re.sub(r'https?://t\.co/\w+', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def _make_tweet_dict(tid, text, date, username, display_name,
                     avatar_url, likes=0, rts=0, replies=0):
    return {
        "id": str(tid),
        "text": _clean_text(text),
        "date": date,
        "username": username,
        "display_name": display_name,
        "avatar_url": avatar_url,
        "tickers": _extract_tickers(text),
        "like_count": int(likes or 0),
        "retweet_count": int(rts or 0),
        "reply_count": int(replies or 0),
        "url": "https://x.com/{}/status/{}".format(username, tid),
    }




# ---------------------------------------------------------------------------
# Rolling 90-day mention store  (req #4)
# ---------------------------------------------------------------------------
def _load_mention_events():
    pp = getattr(config, "MENTIONS_FILE", os.path.join(config.DATA_DIR, "mentions.json"))
    if os.path.exists(pp):
        try:
            with open(pp, "r", encoding="utf-8") as f:
                d = json.load(f)
                return d if isinstance(d, list) else d.get("events", [])
        except Exception:
            return []
    return []

def _save_mention_events(events):
    _ensure_data_dir()
    pp = getattr(config, "MENTIONS_FILE", os.path.join(config.DATA_DIR, "mentions.json"))
    with open(pp, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

def _parse_iso(s):
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return parsedate_to_datetime(s)
    except Exception:
        return None

def _prune_mention_events(events, window_days=None):
    days = window_days if window_days is not None else getattr(config, "ROLLING_WINDOW_DAYS", 90)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    out = []
    for e in events:
        d = _parse_iso(e.get("timestamp", "") or "")
        if d is None:
            d = cutoff
        if d >= cutoff:
            out.append(e)
    return out

def _merge_mention_events(tweets):
    existing = _load_mention_events()
    seen = {(e.get("tweet_id"), e.get("ticker")) for e in existing}
    to_add = []
    for tt in tweets:
        tid = str(tt.get("id", ""))
        text = tt.get("text", "") or ""
        ts = tt.get("date", "") or datetime.now(timezone.utc).isoformat()
        for raw in CASHTAG_RE.findall(text):
            tk = raw[1:].upper()
            key = (tid, tk)
            if key not in seen:
                to_add.append({"ticker": tk, "timestamp": ts, "tweet_id": tid})
                seen.add(key)
        for tk in (tt.get("tickers") or []):
            key = (tid, tk)
            if key not in seen:
                to_add.append({"ticker": tk, "timestamp": ts, "tweet_id": tid})
                seen.add(key)
    if to_add:
        existing.extend(to_add)
    pruned = _prune_mention_events(existing)
    _save_mention_events(pruned)
    counts = {}
    for e in pruned:
        counts[e["ticker"]] = counts.get(e["ticker"], 0) + 1
    return counts

def get_rolling_mention_counts(window_days=None):
    events = _prune_mention_events(_load_mention_events(), window_days=window_days)
    c = {}
    for e in events:
        c[e["ticker"]] = c.get(e["ticker"], 0) + 1
    return c

def _write_feed_meta(status, last_success_iso, error):
    _ensure_data_dir()
    pp = getattr(config, "FEED_META_FILE", os.path.join(config.DATA_DIR, "feed_meta.json"))
    with open(pp, "w", encoding="utf-8") as f:
        json.dump({
            "status": status,
            "last_success": last_success_iso,
            "last_error": error,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }, f, ensure_ascii=False, indent=2)

def _read_feed_meta():
    pp = getattr(config, "FEED_META_FILE", os.path.join(config.DATA_DIR, "feed_meta.json"))
    if os.path.exists(pp):
        try:
            with open(pp, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def _candidate_feed_urls():
    urls = []
    primary = (getattr(config, "FEED_SOURCE_URL", "") or "").strip()
    if primary:
        urls.append(primary)
    for u in getattr(config, "FALLBACK_FEED_URLS", []) or []:
        uu = (u or "").strip()
        if uu and uu not in urls:
            urls.append(uu)
    return urls


# ---------------------------------------------------------------------------
# Strategy 1 - RSS-Bridge  (FREE, self-hosted or public instance)
# ---------------------------------------------------------------------------
# Set FEED_SOURCE_URL in .env.  Local Docker example:
#   docker run -d --name rss-bridge -p 3000:80 rssbridge/rss-bridge:latest
#   FEED_SOURCE_URL=http://localhost:3000/?action=display&bridge=Twitter
#     &context=By+username&u=aleabitoreddit&norep=on&noretweet=on&format=Atom
#
# Supported formats: Atom (format=Atom), RSS 2.0 (format=Mrss), JSON (format=Json)

_FEED_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


def _parse_atom_entry(entry, fallback_username):
    import xml.etree.ElementTree as ET
    ns = "http://www.w3.org/2005/Atom"
    def _t(el, tag):
        child = el.find(f"{{{ns}}}{tag}")
        return (child.text or "").strip() if child is not None else ""
    uid = _t(entry, "id")
    link_el = entry.find(f"{{{ns}}}link")
    url = link_el.get("href", "") if link_el is not None else uid
    tid_m = re.search(r"/status/(\d+)", url or uid)
    tid = tid_m.group(1) if tid_m else uid or str(int(time.time() * 1000))
    published = _t(entry, "published") or _t(entry, "updated")
    title = _t(entry, "title")
    content_el = entry.find(f"{{{ns}}}content")
    if content_el is not None and content_el.text:
        full_text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", content_el.text)).strip()
    else:
        full_text = title
    author_el = entry.find(f"{{{ns}}}author")
    if author_el is not None:
        name_el = author_el.find(f"{{{ns}}}name")
        uri_el  = author_el.find(f"{{{ns}}}uri")
        display_name = (name_el.text or fallback_username).strip() if name_el is not None else fallback_username
        uri = (uri_el.text or "").strip() if uri_el is not None else ""
        hm = re.search(r"(?:twitter|x)\.com/([^/\s?]+)", uri)
        username = hm.group(1) if hm else fallback_username
    else:
        username = display_name = fallback_username
    avatar_url = ""
    if content_el is not None and content_el.text:
        im = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content_el.text)
        if im:
            avatar_url = im.group(1)
    return _make_tweet_dict(tid=tid, text=full_text, date=published,
                            username=username, display_name=display_name, avatar_url=avatar_url)


def _parse_rss_item(item, fallback_username):
    def _t(el, tag, ns=""):
        child = el.find(f"{{{ns}}}{tag}" if ns else tag)
        return (child.text or "").strip() if child is not None else ""
    guid = _t(item, "guid")
    link = _t(item, "link") or guid
    pub  = _t(item, "pubDate")
    raw  = _t(item, "description") or _t(item, "title")
    full_text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw)).strip()
    tid_m = re.search(r"/status/(\d+)", link or guid)
    tid   = tid_m.group(1) if tid_m else guid or str(int(time.time() * 1000))
    creator = _t(item, "creator", "http://purl.org/dc/elements/1.1/")
    author  = creator or _t(item, "author") or fallback_username
    hm = re.search(r"@(\w+)", author)
    username     = hm.group(1) if hm else fallback_username
    display_name = re.sub(r"\s*\(@\w+\)", "", author).strip() or username
    avatar_url = ""
    im = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', raw)
    if im:
        avatar_url = im.group(1)
    return _make_tweet_dict(tid=tid, text=full_text, date=pub,
                            username=username, display_name=display_name, avatar_url=avatar_url)


def _parse_json_feed_items(payload, fallback_username, count):
    results = []
    for item in payload.get("items", [])[:count]:
        url   = item.get("url", "")
        tid_m = re.search(r"/status/(\d+)", url)
        tid   = tid_m.group(1) if tid_m else item.get("id", str(int(time.time() * 1000)))
        text  = item.get("title", "")
        body  = item.get("content_text") or item.get("content_html", "")
        if body:
            body = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)).strip()
            if len(body) > len(text):
                text = body
        pub    = item.get("date_published") or item.get("date_modified", "")
        author = item.get("author") or {}
        results.append(_make_tweet_dict(
            tid=tid, text=text, date=pub, username=fallback_username,
            display_name=author.get("name", fallback_username),
            avatar_url=author.get("avatar", ""),
        ))
    return results


def _fetch_one_feed(url, username, count, timeout):
    import xml.etree.ElementTree as ET
    resp = requests.get(
        url,
        headers={"User-Agent": _FEED_UA,
                 "Accept": "application/atom+xml,application/rss+xml,application/json,text/xml,*/*"},
        timeout=timeout,
    )
    resp.raise_for_status()
    ct  = resp.headers.get("Content-Type", "")
    raw = resp.content
    if "json" in ct or raw.lstrip()[:1] == b"{":
        try:
            return _parse_json_feed_items(resp.json(), username, count)
        except Exception as exc:
            logger.warning("RSS-Bridge JSON parse error: %s", exc)
            return []
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        logger.warning("RSS-Bridge XML parse error: %s", exc)
        return []
    results = []
    tag = root.tag.lower()
    if "feed" in tag:
        atom_ns = "http://www.w3.org/2005/Atom"
        for entry in root.findall(f"{{{atom_ns}}}entry")[:count]:
            try:
                td = _parse_atom_entry(entry, username)
                if td:
                    results.append(td)
            except Exception as exc:
                logger.debug("Atom entry error: %s", exc)
    else:
        channel = root.find("channel") or root
        for item in channel.findall("item")[:count]:
            try:
                td = _parse_rss_item(item, username)
                if td:
                    results.append(td)
            except Exception as exc:
                logger.debug("RSS item error: %s", exc)
    return results


def _fetch_via_rss_bridge(username, count):
    """Strategy 1 - RSS-Bridge (FREE). Tries each candidate URL in turn."""
    urls = _candidate_feed_urls()
    if not urls:
        logger.info(
            "RSS-Bridge: FEED_SOURCE_URL not set. Add to .env -- e.g. "
            "http://localhost:3000/?action=display&bridge=Twitter"
            "&context=By+username&u=%s&norep=on&noretweet=on&format=Atom",
            username,
        )
        return []
    timeout = getattr(config, "FEED_TIMEOUT_SECS", 20)
    for url in urls:
        try:
            results = _fetch_one_feed(url, username, count, timeout)
            if results:
                logger.info("RSS-Bridge: %d posts from %s", len(results), url)
                return results
            logger.info("RSS-Bridge: 0 items from %s, trying next.", url)
        except requests.HTTPError as exc:
            logger.warning("RSS-Bridge HTTP %s from %s", exc.response.status_code, url)
        except requests.RequestException as exc:
            logger.warning("RSS-Bridge connection error for %s: %s", url, exc)
        except Exception as exc:
            logger.warning("RSS-Bridge error for %s: %s", url, exc)
    logger.warning("RSS-Bridge: all candidate URLs failed.")
    return []



# ---------------------------------------------------------------------------
# Strategy 2: Syndication embed endpoint (FREE, no API key needed)
# ---------------------------------------------------------------------------
# X's embed timeline endpoint returns a Next.js page with tweet data
# embedded as JSON in a __NEXT_DATA__ script tag.  Rate-limited to
# 30 requests / 15 min which is plenty for daily fetching.

_SYNDC_URL = (
    "https://syndication.twitter.com/srv/timeline-profile"
    "/screen-name/{username}"
)
_SYNDC_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


def _fetch_via_syndication(username, count):
    """Fetch tweets from X's syndication embed timeline (free, no auth)."""
    try:
        url = _SYNDC_URL.format(username=username)
        resp = requests.get(
            url,
            headers={"User-Agent": _SYNDC_UA, "Accept": "text/html"},
            timeout=20,
        )
        if resp.status_code == 429:
            logger.warning("Syndication rate-limited (429).")
            return []
        resp.raise_for_status()

        # Extract the __NEXT_DATA__ JSON blob from the HTML
        match = re.search(
            r'<script\s+id="__NEXT_DATA__"\s+type="application/json">'
            r"(.*?)</script>",
            resp.text,
            re.DOTALL,
        )
        if not match:
            logger.warning("Syndication: no __NEXT_DATA__ found.")
            return []

        data = json.loads(match.group(1))
        entries = (
            data.get("props", {})
            .get("pageProps", {})
            .get("timeline", {})
            .get("entries", [])
        )
        if not entries:
            logger.info("Syndication returned 0 entries.")
            return []

        # Extract user info for avatar / display name
        user_info = None
        for entry in entries:
            tweet_data = entry.get("content", {}).get("tweet", {})
            if tweet_data.get("user"):
                user_info = tweet_data["user"]
                break

        tweets = []
        for entry in entries:
            if entry.get("type") != "tweet":
                continue
            tw = entry.get("content", {}).get("tweet", {})
            leg = tw  # the syndication JSON uses flat tweet fields
            tid = leg.get("id_str") or leg.get("conversation_id_str")
            if not tid:
                continue
            created = leg.get("created_at", "")
            try:
                pd = datetime.strptime(
                    created, "%a %b %d %H:%M:%S %z %Y"
                ).isoformat()
            except Exception:
                pd = created
            un = (leg.get("user") or {}).get("screen_name", username)
            dn = (leg.get("user") or {}).get("name", username)
            av = (leg.get("user") or {}).get("profile_image_url_https", "")
            if av:
                av = re.sub(r"_normal(\.\w+)$", r"\1", av)
            full_text = leg.get("full_text") or leg.get("text", "")
            tweets.append(_make_tweet_dict(
                tid=tid, text=full_text, date=pd,
                username=un, display_name=dn, avatar_url=av,
                likes=leg.get("favorite_count", 0),
                rts=leg.get("retweet_count", 0),
                replies=leg.get("reply_count", 0),
            ))
        logger.info("Syndication returned %d tweets.", len(tweets))
        return tweets[:count]
    except Exception as exc:
        logger.warning("Syndication failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Strategy 3: Official X API v2 via tweepy (requires paid API credits)
# ---------------------------------------------------------------------------

def _fetch_via_tweepy(username, count):
    """Use the official X API v2 with tweepy."""
    bearer = config.X_BEARER_TOKEN
    if not bearer:
        logger.info("No X_BEARER_TOKEN configured, skipping tweepy.")
        return []

    try:
        import tweepy
        client = tweepy.Client(bearer_token=bearer)
        user = client.get_user(username=username)
        if not user.data:
            return []
        user_id = user.data.id
        resp = client.get_users_tweets(
            id=user_id, max_results=min(count, 100),
            tweet_fields=["created_at", "public_metrics", "text", "author_id"],
            user_fields=["name", "username", "profile_image_url"],
            expansions=["author_id"],
        )
        authors = {}
        if resp.includes and "users" in resp.includes:
            for u in resp.includes["users"]:
                authors[u.id] = u

        tweets = []
        for t in (resp.data or []):
            a = authors.get(t.author_id)
            m = t.public_metrics or {}
            created = t.created_at.isoformat() if t.created_at else None
            av = ""
            if a and hasattr(a, "profile_image_url"):
                av = re.sub(r'_normal(\.\w+)$', r'\1', a.profile_image_url or "")
            tweets.append(_make_tweet_dict(
                tid=t.id, text=t.text or "", date=created,
                username=(a.username if a else username),
                display_name=(a.name if a else username),
                avatar_url=av,
                likes=m.get("like_count", 0),
                rts=m.get("retweet_count", 0),
                replies=m.get("reply_count", 0),
            ))
        logger.info("tweepy returned %d tweets.", len(tweets))
        return tweets
    except ImportError:
        return []
    except Exception as exc:
        logger.warning("tweepy failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Strategy 4: Guest-token GraphQL API (no keys, may be blocked by X)
# ---------------------------------------------------------------------------

_X_BEARER_GQL = (
    "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs"
    "%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
)
_GQL_USER_URL = "https://x.com/i/api/graphql/xmU6X_CKVnQ5lSrCbAmJsg/UserByScreenName"
_GQL_TWEETS_URL = "https://x.com/i/api/graphql/E3opETHurmVJflFsUBVuUQ/UserTweets"
_GQL_FEATURES = {
    "hidden_profile_subscriptions_enabled": True,
    "rweb_tipjar_consumption_enabled": True,
    "responsive_web_graphql_exclude_directive_enabled": True,
    "verified_phone_label_enabled": False,
    "subscriptions_verification_info_is_identity_verified_enabled": True,
    "subscriptions_verification_info_verified_since_enabled": True,
    "highlights_tweets_tab_ui_enabled": True,
    "responsive_web_twitter_article_notes_tab_enabled": True,
    "subscriptions_feature_can_gift_premium": True,
    "creator_subscriptions_tweet_preview_api_enabled": True,
    "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
    "responsive_web_graphql_timeline_navigation_enabled": True,
}


class _GuestClient:
    def __init__(self):
        self.s = requests.Session()
        self.s.headers.update({
            "Authorization": "Bearer " + _X_BEARER_GQL,
            "User-Agent": "Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36",
            "X-Twitter-Active-User": "yes",
            "X-Twitter-Client-Language": "en",
        })
        self._tok = None

    def _activate(self):
        try:
            r = self.s.post("https://x.com/i/api/1.1/guest/activate.json", timeout=10)
            r.raise_for_status()
            self._tok = r.json().get("guest_token")
            if self._tok:
                self.s.headers["x-guest-token"] = self._tok
                return True
        except Exception:
            pass
        return False

    def _h(self):
        if not self._tok:
            self._activate()
        return self.s.headers

    def get_user_id(self, name):
        p = {"variables": json.dumps({"screen_name": name, "withSafetyModeUserFields": True}),
             "features": json.dumps(_GQL_FEATURES)}
        r = self.s.get(_GQL_USER_URL, params=p, headers=self._h(), timeout=15)
        r.raise_for_status()
        res = r.json().get("data", {}).get("user", {}).get("result", {})
        return res.get("rest_id"), res

    def get_tweets(self, uid, count):
        p = {"variables": json.dumps({"userId": uid, "count": count,
             "includePromotedContent": False, "withVoice": True, "withV2Timeline": True}),
             "features": json.dumps(_GQL_FEATURES)}
        r = self.s.get(_GQL_TWEETS_URL, params=p, headers=self._h(), timeout=15)
        r.raise_for_status()
        return r.json()


def _parse_gql_entry(entry, fallback_name):
    """Parse one GraphQL timeline entry into a tweet dict."""
    try:
        tr = entry.get("content", {}).get("itemContent", {}).get("tweet_results", {}).get("result")
        if tr is None:
            items = entry.get("content", {}).get("items", [])
            if items:
                tr = items[0].get("item", {}).get("itemContent", {}).get("tweet_results", {}).get("result")
        if tr is None:
            return None
        if tr.get("__typename") == "TweetWithVisibilityResults":
            tr = tr.get("tweet", {})
        leg = tr.get("legacy", {})
        tid = leg.get("id_str") or tr.get("rest_id")
        if not tid:
            return None
        core = tr.get("core", {}).get("user_results", {}).get("result", {}).get("legacy", {})
        un = core.get("screen_name", fallback_name)
        dn = core.get("name", fallback_name)
        av = core.get("profile_image_url_https", "")
        if av:
            av = re.sub(r'_normal(\.\w+)$', r'\1', av)
        created = leg.get("created_at")
        pd = None
        if created:
            try:
                pd = datetime.strptime(created, "%a %b %d %H:%M:%S +0000 %Y"
                                      ).replace(tzinfo=timezone.utc).isoformat()
            except Exception:
                pd = created
        return _make_tweet_dict(
            tid=tid, text=leg.get("full_text", ""), date=pd,
            username=un, display_name=dn, avatar_url=av,
            likes=leg.get("favorite_count", 0),
            rts=leg.get("retweet_count", 0),
            replies=leg.get("reply_count", 0),
        )
    except Exception:
        return None


def _fetch_via_guest(username, count):
    """Fetch via X guest-token GraphQL."""
    try:
        c = _GuestClient()
        uid, _ = c.get_user_id(username)
        if not uid:
            return []
        tl = c.get_tweets(uid, count)
        instrs = (tl.get("data", {}).get("user", {}).get("result", {})
                  .get("timeline_v2", {}).get("timeline", {})
                  .get("instructions", []))
        tweets = []
        for ins in instrs:
            for e in ins.get("entries", []):
                pt = _parse_gql_entry(e, username)
                if pt:
                    tweets.append(pt)
        logger.info("Guest GraphQL returned %d tweets.", len(tweets))
        return tweets
    except Exception as exc:
        logger.warning("Guest GraphQL failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Strategy 5: Nitter proxy (last resort)
# ---------------------------------------------------------------------------

def _fetch_via_nitter(username, count):
    """Fetch via Nitter instances (last resort)."""
    try:
        from ntscraper import Nitter
        s = Nitter(skip_instance_check=True)
        raw = s.get_tweets(username, mode="user", number=count)
        tweets = []
        for t in raw.get("tweets", []):
            text = t.get("text", "")
            tweets.append(_make_tweet_dict(
                tid=t.get("id", ""), text=text, date=t.get("date", ""),
                username=username,
                display_name=t.get("user", {}).get("name", username),
                avatar_url=t.get("user", {}).get("avatar", ""),
                likes=t.get("stats", {}).get("likes", 0),
                rts=t.get("stats", {}).get("retweets", 0),
                replies=t.get("stats", {}).get("replies", 0),
            ))
        logger.info("Nitter returned %d tweets.", len(tweets))
        return tweets
    except Exception as exc:
        logger.warning("Nitter failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_latest_tweets():
    """
    Fetch latest posts using the free-first strategy chain:
      1. RSS-Bridge  (free — set FEED_SOURCE_URL in .env)
      2. Syndication (free — X embed endpoint, no auth)
      3. tweepy      (skipped unless X_BEARER_TOKEN set)
      4. Guest GQL   (fragile, may 429)
      5. Nitter      (last resort)

    On success the result is persisted to disk.
    On total failure the cached result is returned with a stale notice.
    """
    username = config.TRACKED_ACCOUNT
    count    = config.MAX_TWEETS
    logger.info("Fetching posts from @%s ...", username)

    parsed = _fetch_via_rss_bridge(username, count)

    if not parsed:
        parsed = _fetch_via_syndication(username, count)

    if not parsed and config.X_BEARER_TOKEN:
        parsed = _fetch_via_tweepy(username, count)

    if not parsed:
        parsed = _fetch_via_guest(username, count)

    if not parsed:
        parsed = _fetch_via_nitter(username, count)

    # Sort newest-first (tolerant: missing dates go to the end)
    def _sort_key(t):
        d = _parse_iso(t.get("date") or "")
        return d if d is not None else datetime.min.replace(tzinfo=timezone.utc)

    parsed.sort(key=_sort_key, reverse=True)
    parsed = parsed[:count]

    # Update rolling mention counts
    if parsed:
        _merge_mention_events(parsed)

    now_iso = datetime.now(timezone.utc).isoformat()
    error = None

    if not parsed:
        cached = _load_tweets()
        if cached.get("tweets"):
            logger.warning("All strategies failed — serving stale cache.")
            cached["stale"] = True
            cached["error"] = (
                "Live fetch failed. Showing cached posts. "
                "Set FEED_SOURCE_URL in .env to use the free RSS-Bridge feed."
            )
            _write_feed_meta("stale", cached.get("last_updated"), cached["error"])
            return cached
        error = (
            "All fetch strategies failed and no cache is available. "
            "To enable the free feed: set FEED_SOURCE_URL in .env. "
            "Example: http://localhost:3000/?action=display"
            "&bridge=Twitter&context=By+username"
            "&u={}&norep=on&noretweet=on&format=Atom".format(username)
        )

    data = {
        "tweets":          parsed,
        "last_updated":    now_iso,
        "tracked_account": username,
        "tweet_count":     len(parsed),
        "error":           error,
        "stale":           False,
    }
    _save_tweets(data)
    _write_feed_meta("ok", now_iso if parsed else None, error)
    logger.info("Saved %d posts.", len(parsed))
    return data


def get_stored_tweets():
    """Return posts from disk cache without making any network call."""
    return _load_tweets()

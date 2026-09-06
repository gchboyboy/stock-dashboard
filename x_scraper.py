"""X/Twitter scraper – Python 3.9+ compatible, multi-strategy.

Fetches tweets from the tracked account using these strategies in order:
1. Syndication embed endpoint    (FREE, no API key needed – primary)
2. Official X API v2 via tweepy  (needs paid API credits)
3. Guest-token GraphQL API       (may be blocked by X)
4. Nitter instance scraping      (unreliable, last resort)
"""
import json
import os
import re
import logging
from datetime import datetime, timezone

import requests

import config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _ensure_data_dir():
    os.makedirs(config.DATA_DIR, exist_ok=True)


def _load_tweets():
    if os.path.exists(config.TWEETS_FILE):
        with open(config.TWEETS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
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
        "like_count": likes,
        "retweet_count": rts,
        "reply_count": replies,
        "url": "https://x.com/{}/status/{}".format(username, tid),
    }


# ---------------------------------------------------------------------------
# Strategy 1: Syndication embed endpoint (FREE, no API key needed)
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
# Strategy 2: Official X API v2 via tweepy (requires paid API credits)
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
# Strategy 3: Guest-token GraphQL API (no keys, may be blocked by X)
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
    """Fetch latest tweets. Tries syndication -> tweepy -> guest -> Nitter."""
    username = config.TRACKED_ACCOUNT
    count = config.MAX_TWEETS
    logger.info("Fetching tweets from @%s ...", username)
    parsed = _fetch_via_syndication(username, count)
    if not parsed:
        parsed = _fetch_via_tweepy(username, count)
    if not parsed:
        parsed = _fetch_via_guest(username, count)
    if not parsed:
        parsed = _fetch_via_nitter(username, count)

    error = None
    if not parsed:
        error = ("Could not fetch tweets. All strategies failed. "
                 "X requires paid API access ($0.005/read) or the "
                 "syndication endpoint may be rate-limited. "
                 "Try again in a few minutes.")
    data = {
        "tweets": parsed,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "tracked_account": username,
        "tweet_count": len(parsed),
        "error": error,
    }
    _save_tweets(data)
    logger.info("Saved %d tweets.", len(parsed))
    return data


def get_stored_tweets():
    """Return tweets from disk (no network call)."""
    return _load_tweets()

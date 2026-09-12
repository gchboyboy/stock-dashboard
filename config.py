"""Configuration loaded from .env file.

Feed source is now a self-hosted RSS-Bridge (or compatible RSS/Atom/JSON feed)
so the dashboard does not depend on the paid X API.  Swap instances by
changing FEED_SOURCE_URL in .env — no code change needed.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ── Feed source (requirement #5: config value, not hardcoded) ──────────────
# Self-hosted RSS-Bridge URL for @aleabitoreddit.
# Example self-hosted:  http://localhost:3000/?action=display&bridge=TwitterBridge&u=aleabitoreddit&format=Atom
# Example public/demo:  https://rss-bridge.example/?action=display&bridge=TwitterBridge&u=aleabitoreddit&format=Atom
# Leave empty to use the single demo fallback built into x_scraper (purely for
# local development without a bridge — not for production).
FEED_SOURCE_URL = os.getenv("FEED_SOURCE_URL", "").strip()

# Fallback RSS-Bridge URLs tried only when FEED_SOURCE_URL is empty.
# Keep this list short; production should set FEED_SOURCE_URL explicitly.
FALLBACK_FEED_URLS: list[str] = [
    u.strip() for u in os.getenv(
        "FALLBACK_FEED_URLS",
        ""
    ).split(",") if u.strip()
]

# Poll interval in hours — server-side polling only (req #1). 2-4h window.
FEED_POLL_INTERVAL_HOURS = int(os.getenv("FEED_POLL_INTERVAL_HOURS", "3"))

# Request timeout / retry knobs for feed fetches
FEED_TIMEOUT_SECS = int(os.getenv("FEED_TIMEOUT_SECS", "20"))
FEED_MAX_RETRIES = int(os.getenv("FEED_MAX_RETRIES", "2"))

# ── Legacy X API creds kept for manual fallback only (not primary) ─────────
X_API_KEY = os.getenv("X_API_KEY", "")
X_API_SECRET = os.getenv("X_API_SECRET", "")
X_ACCESS_TOKEN = os.getenv("X_ACCESS_TOKEN", "")
X_ACCESS_SECRET = os.getenv("X_ACCESS_SECRET", "")
X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN", "")

# The X account to monitor for stock mentions
TRACKED_ACCOUNT = os.getenv("TRACKED_ACCOUNT", "aleabitoreddit")

# Daily schedule (24h format, server local time) — retained for compatibility;
# the interval scheduler below is now the primary trigger.  The cron job is kept
# as a secondary daily kick but does not drive the feed.
SCHEDULE_HOUR = int(os.getenv("SCHEDULE_HOUR", "9"))
SCHEDULE_MINUTE = int(os.getenv("SCHEDULE_MINUTE", "0"))

# How many tweets to fetch per refresh (= top N feed items shown, req #3)
MAX_TWEETS = int(os.getenv("MAX_TWEETS", "10"))

# Data storage path
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
TWEETS_FILE = os.path.join(DATA_DIR, "tweets.json")
# Separate file for 90-day rolling mention events (req #4)
MENTIONS_FILE = os.path.join(DATA_DIR, "mentions.json")
# Optional: persist last fetch meta (used for "last successful fetch" notice)
FEED_META_FILE = os.path.join(DATA_DIR, "feed_meta.json")

ROLLING_WINDOW_DAYS = int(os.getenv("ROLLING_WINDOW_DAYS", "90"))

# Common stock ticker patterns to detect in tweets — retained for sector table.
STOCK_TICKERS = [
    # Semiconductors / AI hardware
    "NVDA", "SKHY", "SNDK", "SIVE", "GFS", "JBL", "POET",
    "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD",
    "INTC", "QCOM", "AVGO", "MU", "ASML", "ARM", "TSM",
    "SMCI", "MRVL", "ON", "STM", "WOLF", "COHR", "AEHR",
    # Crypto mining / neocloud / HPC (tracked account focus)
    "CRWV", "NBIS", "IREN", "APLD", "RIOT", "CIFR", "WULF",
    "HUT", "CLSK", "HIVE", "WYFI", "MARA", "BITF", "BTBT",
    "BTDR", "CORZ", "GLXY", "HOOD",
    # Other frequently mentioned
    "PLTR", "SOFI", "ROKU", "SNOW", "NET", "DDOG",
]

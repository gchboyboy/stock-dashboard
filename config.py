"""Configuration loaded from .env file."""
import os
from dotenv import load_dotenv

load_dotenv()

# X/Twitter API v2 credentials (Official API - most reliable)
X_API_KEY = os.getenv("X_API_KEY", "")
X_API_SECRET = os.getenv("X_API_SECRET", "")
X_ACCESS_TOKEN = os.getenv("X_ACCESS_TOKEN", "")
X_ACCESS_SECRET = os.getenv("X_ACCESS_SECRET", "")
X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN", "")

# The X account to monitor for stock mentions
TRACKED_ACCOUNT = os.getenv("TRACKED_ACCOUNT", "aleabitoreddit")

# Daily schedule (24h format, server local time)
SCHEDULE_HOUR = int(os.getenv("SCHEDULE_HOUR", "9"))
SCHEDULE_MINUTE = int(os.getenv("SCHEDULE_MINUTE", "0"))

# How many tweets to fetch per refresh
MAX_TWEETS = int(os.getenv("MAX_TWEETS", "50"))

# Data storage path
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
TWEETS_FILE = os.path.join(DATA_DIR, "tweets.json")

# Common stock ticker patterns to detect in tweets
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

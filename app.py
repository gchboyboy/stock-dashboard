"""
StockPulse Dashboard – Flask backend with daily X scraper.

Run:
    pip3 install -r requirements.txt
    python3 app.py

The dashboard is served at http://localhost:5000
Tweets are fetched daily at the configured time (default 9:00 AM).
"""
import logging
import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

import config
import x_scraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("app")

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)


# ---------------------------------------------------------------------------
# Scheduled job – fetch tweets at 9 AM daily
# ---------------------------------------------------------------------------
def scheduled_fetch():
    logger.info("Scheduler triggered - fetching tweets ...")
    try:
        data = x_scraper.fetch_latest_tweets()
        logger.info("Scheduled fetch complete: %d tweets.", data.get("tweet_count", 0))
    except Exception as exc:
        logger.error("Scheduled fetch failed: %s", exc)


scheduler = BackgroundScheduler(timezone="UTC")
scheduler.add_job(
    scheduled_fetch,
    "cron",
    hour=config.SCHEDULE_HOUR,
    minute=config.SCHEDULE_MINUTE,
    id="daily_x_fetch",
    replace_existing=True,
)
scheduler.start()
logger.info(
    "Scheduler started – daily fetch at %02d:%02d (server local time).",
    config.SCHEDULE_HOUR,
    config.SCHEDULE_MINUTE,
)

# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

@app.route("/api/tweets")
def api_tweets():
    """Return the latest stored tweets as JSON."""
    data = x_scraper.get_stored_tweets()
    return jsonify(data)


@app.route("/api/refresh", methods=["POST"])
def api_refresh():
    """Manually trigger a tweet refresh right now."""
    try:
        data = x_scraper.fetch_latest_tweets()
        return jsonify({"ok": True, "tweet_count": data.get("tweet_count", 0)})
    except Exception as exc:
        logger.error("Manual refresh failed: %s", exc)
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.route("/api/status")
def api_status():
    """Return scheduler and scraper status."""
    return jsonify({
        "tracked_account": config.TRACKED_ACCOUNT,
        "schedule": f"{config.SCHEDULE_HOUR:02d}:{config.SCHEDULE_MINUTE:02d}",
        "tweets_file": config.TWEETS_FILE,
        "tweets_exist": os.path.exists(config.TWEETS_FILE),
    })


# ---------------------------------------------------------------------------
# Serve frontend
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Run an initial fetch on startup (in background thread)
    logger.info("Running initial tweet fetch on startup …")
    try:
        scheduled_fetch()
    except Exception as exc:
        logger.warning("Startup fetch failed (will retry at schedule time): %s", exc)

    port = int(os.getenv("PORT", "5000"))
    logger.info("Starting StockPulse dashboard on http://localhost:%d", port)
    app.run(host="0.0.0.0", port=port, debug=True)

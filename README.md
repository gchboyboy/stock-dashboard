# StockPulse Dashboard

A real-time stock price tracking dashboard that **automatically fetches the latest X (Twitter) posts** from @aleabitoreddit every day at 9:00 AM and displays stock mentions on the dashboard.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip3 install -r requirements.txt
```

### 2. Get X API Keys (Recommended)

The dashboard works best with the **official X API v2** (free tier):

1. Go to [developer.x.com](https://developer.x.com/en/portal/dashboard)
2. Create a free Developer account
3. Create a new Project and App
4. Copy your **Bearer Token** into `.env`

### 3. Configure

Edit `.env` with your X Bearer Token:

```bash
# Paste your Bearer Token here (free tier is sufficient)
X_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAALu1%2FQEAAAAA6QSQl8onAnyrteNkrNffxqeNHUY%3D7J1X3aLZSLqhgwyN1oyl6YpiWdZBv3lRo4SKlAjPdLpGGLH5gS

# The account to track
TRACKED_ACCOUNT=aleabitoreddit

# Daily update time (24-hour format)
SCHEDULE_HOUR=9
SCHEDULE_MINUTE=0
```

> **Without API keys**: The dashboard tries X guest-token scraping and Nitter as fallbacks, but these are often blocked. The official API is the most reliable option.

### 4. Run the Dashboard

```bash
python3 app.py
```

Then open: **http://localhost:5000**

The dashboard will:
- Fetch tweets from @aleabitoreddit **on startup**
- Automatically re-fetch **every day at 9:00 AM** (configurable)
- You can also click **Refresh** in the X Feed panel for an on-demand update

## 📊 Features

### X Feed Integration
- **Daily Auto-Refresh** — Fetches latest @aleabitoreddit posts at 9 AM daily
- **Stock Ticker Detection** — Automatically highlights mentioned tickers (NVDA, GFS, etc.)
- **Mentions Summary** — Bar chart showing most-discussed stocks
- **Manual Refresh** — Click Refresh for an instant update
- **Link to Original** — Each tweet links to the original post on X

### Real-Time Price Tracking
- **Live Stock Prices** — Updates every 5 seconds with realistic market movements
- **8 Tracked Stocks** — AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, AMD
- **Mini Line Charts** — Real-time price visualization with area fills

### Dashboard Analytics
- **Watchlist** — Custom stock watchlist with live prices
- **Market Movers** — Full table with price, change, and volume
- **Dark/Light Mode** — Toggle between themes

## 📈 Architecture

```
┌─────────────────┐      ┌──────────────────────┐      ┌──────────────────┐
│  X (Twitter)    │─────▶│  app.py              │─────▶│ data/tweets.json │
│  @aleabitoreddit│      │  Flask + APScheduler  │      │ (persistent)     │
│                 │      └──────────┬───────────┘      └──────────────────┘
│  Fetch via:     │                 │
│  1. tweepy (API)│         ┌──────▼───────┐
│  2. Guest token │         │  Browser     │
│  3. Nitter      │         │  index.html  │
└─────────────────┘         │  script.js   │
                            │  styles.css  │
                            └──────────────┘
```

## 📁 File Structure

```
stock-dashboard/
├── app.py              # Flask backend + daily scheduler
├── config.py           # Configuration from .env
├── x_scraper.py        # X scraper (tweepy / guest API / nitter)
├── requirements.txt    # Python dependencies
├── .env                # API keys + settings (not committed)
├── .gitignore          # Excludes .env and data/
├── index.html          # Main HTML structure
├── script.js           # Frontend logic + X feed rendering
├── styles.css          # Dashboard styling + X feed styles
├── data/
│   └── tweets.json     # Persisted tweet data (auto-created)
└── README.md           # This file
```

## 🔄 Schedule Configuration

Edit `.env` to change the daily update time:

```bash
# Default: 9:00 AM
SCHEDULE_HOUR=9
SCHEDULE_MINUTE=0

# Change to 7:30 AM
SCHEDULE_HOUR=7
SCHEDULE_MINUTE=30
```

## 🛠 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tweets` | GET | Returns stored tweet data as JSON |
| `/api/refresh` | POST | Triggers an immediate tweet fetch |
| `/api/status` | GET | Returns scheduler and config status |

## 📝 License

This project is open source. Feel free to use, modify, and distribute as needed.

## 👤 About

Created to track and visualize stock mentions from @aleabitoreddit's research on AI infrastructure and semiconductor supply chains.

**Last Updated:** September 6, 2026
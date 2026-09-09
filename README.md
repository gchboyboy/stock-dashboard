# Serenity Stock Dashboard

A real-time stock tracking dashboard that monitors AI and semiconductor supply chain stocks mentioned by [@aleabitoreddit](https://x.com/aleabitoreddit) on X.

The project combines a Python backend for automated data scraping with a modern interactive frontend for visualization.

## 🏗️ Architecture

- **Backend**: Flask server handling API requests and scheduling.
- **Scraper**: A multi-strategy X scraper that fetches and filters tweets for specific stock tickers.
- **Frontend**: HTML5, CSS3, and Vanilla JavaScript using the Canvas API for real-time price charts.
- **Data**: Stored locally in `data/tweets.json`.

## 🚀 Quick Start

### 1. Setup Environment
Create a `.env` file in the root directory:
```env
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_SECRET=your_access_secret
X_BEARER_TOKEN=your_bearer_token
TRACKED_ACCOUNT=aleabitoreddit
SCHEDULE_HOUR=9
SCHEDULE_MINUTE=0
MAX_TWEETS=50
```
*(Note: The scraper can work without API keys using the syndication strategy, but Official API keys are recommended for reliability.)*

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Application
```bash
python app.py
```
The dashboard will be available at `http://localhost:5000`.

## 📊 Key Features

### Live Market Dashboard
- **Real-Time Price Tracking**: Simulated market movements with Canvas-based mini charts.
- **Dynamic Watchlist**: Track key semiconductor and AI hardware stocks.
- **Visual Indicators**: Pulsing live updates badge and color-coded performance.

### X-Driven Insights
- **Automated Scraping**: Daily fetch of tweets from the tracked research account.
- **Ticker Detection**: Automatic extraction of stock symbols from tweet text.
- **Coverage Analysis**: Dynamic table and bar charts showing which stocks are being discussed most frequently.
- **Signal Strength**: Analysis of mention frequency to determine investment signal strength.

## 🛠️ Technical Implementation

### The Scraper
The `x_scraper.py` module implements a fallback strategy to ensure data is always available:
1. **Syndication Endpoint**: Free, no-auth access to public timelines.
2. **Official X API v2**: High-reliability access via Tweepy.
3. **Guest GraphQL API**: Fallback for authenticated-like access.
4. **Nitter Instances**: Last-resort scraping.

### The Backend
The Flask app provides:
- `/api/tweets`: Serves the latest scraped data.
- `/api/refresh`: Allows manual triggering of the scraper.
- `/api/status`: System health and schedule check.
- **APScheduler**: Ensures tweets are refreshed every morning.

## 📁 File Structure
```
stock-dashboard/
├── app.py              # Flask backend & scheduler
├── config.py           # Environment & ticker configuration
├── x_scraper.py        # Multi-strategy X scraper
├── requirements.txt    # Python dependencies
├── data/
│   └── tweets.json     # Scraped tweet storage
├── index.html          # Dashboard structure
├── script.js           # Frontend logic & chart rendering
└── styles.css          # Dashboard styling
```

## 🎯 Future Roadmap
- [ ] Integrate real-time price APIs (Alpha Vantage / Finnhub).
- [ ] Implement user-defined watchlists via a database.
- [ ] Add sentiment analysis to tweets using NLP.
- [ ] Expand ticker list to include broader AI infrastructure.

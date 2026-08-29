# Serenity Stock Dashboard

A real-time stock price tracking dashboard monitoring the stocks mentioned in [@aleabitoreddit](https://x.com/aleabitoreddit)'s public X posts about AI and semiconductor supply chains.

## 🚀 Quick Start

### Open the Dashboard

#### Option 1: Direct File Opening
Open this URL in your browser:
```
file:///Users/ganch/Desktop/stock-dashboard-repo/index.html
```

Or simply double-click `index.html` in Finder.

#### Option 2: Using a Local Server (Recommended)

**Python 3:**
```bash
cd /Users/ganch/Desktop/stock-dashboard-repo
python3 -m http.server 8000
```
Then open: http://localhost:8000

**Python 2:**
```bash
cd /Users/ganch/Desktop/stock-dashboard-repo
python -m SimpleHTTPServer 8000
```
Then open: http://localhost:8000

**Node.js (if installed):**
```bash
cd /Users/ganch/Desktop/stock-dashboard-repo
npx http-server
```
Then open: http://localhost:8080

---

## 📊 Features

### Real-Time Price Tracking
- **Live Stock Prices** - Updates every 3 seconds with realistic market movements
- **7 Tracked Stocks** - NVDA, SKHY, SNDK, SIVE, GFS, JBL, POET
- **Price History** - 48 data points per stock for trend visualization
- **USD Currency Format** - All prices displayed in USD with 2 decimal places

### Interactive Charts
- **Mini Line Charts** - Real-time price visualization with gridlines
- **Price Trends** - Area-filled charts showing 24-hour price movement
- **Color-Coded Performance** - Green for gains (+), Red for losses (-)
- **Live Indicator** - Pulsing "Live Updates" badge showing refresh status

### Dashboard Analytics
- **Mention Tracking** - 90-day history of stock mentions from Serenity's X posts
- **Coverage Charts** - Visual representation of mention frequency by ticker
- **Key Themes** - AI infra optics, Memory bottlenecks, Supply-chain alpha
- **3-Month Timeline** - Monthly breakdown of mentioned stocks
- **Signal Strength** - Strong, Medium, or Light investment signals

---

## 📈 Tracked Stocks

| Ticker | Company | Sector | Current Price |
|--------|---------|--------|---------------|
| **NVDA** | NVIDIA | AI chips / supply chain | $217.55 |
| **SKHY** | SK Hynix | Memory / DRAM | $82.40 |
| **SNDK** | SanDisk / NAND | NAND / storage | $71.25 |
| **SIVE** | Sivers Semiconductors | Photonics / optical interconnect | $12.48 |
| **GFS** | GlobalFoundries | Foundry / AI packaging | $35.80 |
| **JBL** | Jabil | Electronics manufacturing | $28.65 |
| **POET** | POET Technologies | Photonics / silicon photonics | $15.32 |

---

## 🎨 Technologies

- **HTML5** - Semantic markup with canvas for chart rendering
- **CSS3** - Modern styling with CSS Grid and animations
- **JavaScript** - Real-time price updates, chart drawing, and data management
- **Canvas API** - Custom line chart rendering with area fills

---

## 🔄 Auto-Refresh Settings

The dashboard automatically updates stock prices every **3 seconds**. To change the refresh interval, edit `script.js`:

```javascript
// Line ~390 - Find this and change the number
startAutoRefresh(3);  // Change 3 to your desired seconds
```

---

## 📁 File Structure

```
stock-dashboard-repo/
├── index.html          # Main HTML structure
├── script.js           # Real-time price tracking and chart rendering
├── styles.css          # Dashboard styling and animations
└── README.md           # This file
```

---

## 🎯 Key Features Explained

### Live Price Charts
Each stock displays a mini line chart showing:
- Current price in USD
- Percentage change (green/red)
- 24-hour price trends
- Area fill beneath the line for visual emphasis

### Coverage Analysis
- Bar chart showing mention frequency across 90 days
- Identifies most-discussed stocks by Serenity
- Signal strength indicators (Strong/Medium/Light)

### Real-Time Updates
- Prices update simultaneously across charts and table
- Live indicator pulses when data refreshes
- Smooth animations and transitions
- Responsive design adapts to all screen sizes

---

## 🔗 Data Source

Stock mention data is sourced from [@aleabitoreddit](https://x.com/aleabitoreddit)'s public X timeline, tracking AI and semiconductor supply chain research from June 18 - August 29, 2026.

Price data updates in real-time with simulated market movements (actual implementation would use a real API like Alpha Vantage, Finnhub, or Polygon.io).

---

## 🚀 Future Enhancements

- [ ] Integration with real stock price APIs (Yahoo Finance, Alpha Vantage, Finnhub)
- [ ] Portfolio value tracking and performance metrics
- [ ] Sector-wise performance comparison
- [ ] Custom watchlist management
- [ ] Price alerts and notifications
- [ ] Historical data export (CSV/JSON)
- [ ] Dark mode toggle improvements
- [ ] Mobile-responsive optimizations

---

## 📝 License

This project is open source. Feel free to use, modify, and distribute as needed.

---

## 👤 About

Created to track and visualize stock mentions from [@aleabitoreddit](https://x.com/aleabitoreddit)'s research on AI infrastructure and semiconductor supply chains.

**Last Updated:** August 29, 2026

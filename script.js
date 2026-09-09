const STOCKS = [
  { symbol: "AAPL", name: "Apple", price: 214.7, change: 1.46, volume: "81.4M", lastPrice: 214.7 },
  { symbol: "MSFT", name: "Microsoft", price: 428.18, change: 0.88, volume: "28.2M", lastPrice: 428.18 },
  { symbol: "NVDA", name: "NVIDIA", price: 128.34, change: 2.12, volume: "49.6M", lastPrice: 128.34 },
  { symbol: "AMZN", name: "Amazon", price: 195.81, change: -0.34, volume: "35.9M", lastPrice: 195.81 },
  { symbol: "GOOGL", name: "Alphabet", price: 176.02, change: 0.72, volume: "18.8M", lastPrice: 176.02 },
  { symbol: "META", name: "Meta", price: 520.44, change: 1.21, volume: "12.4M", lastPrice: 520.44 },
  { symbol: "TSLA", name: "Tesla", price: 247.3, change: -1.44, volume: "78.3M", lastPrice: 247.3 },
  { symbol: "AMD", name: "AMD", price: 168.86, change: 1.97, volume: "43.1M", lastPrice: 168.86 }
];

const stockPrices = {
  'NVDA': { price: 217.55, lastPrice: 217.55, change: 1.24, history: [217.55] },
  'SKHY': { price: 82.40, lastPrice: 82.40, change: 0.89, history: [82.40] },
  'SNDK': { price: 71.25, lastPrice: 71.25, change: 1.67, history: [71.25] },
  'SIVE': { price: 12.48, lastPrice: 12.48, change: 3.15, history: [12.48] },
  'GFS': { price: 35.80, lastPrice: 35.80, change: 0.95, history: [35.80] },
  'JBL': { price: 28.65, lastPrice: 28.65, change: -0.32, history: [28.65] },
  'POET': { price: 15.32, lastPrice: 15.32, change: 2.41, history: [15.32] },
};

const state = {
  selectedSymbol: "AAPL",
  watchlist: ["AAPL", "MSFT", "NVDA"],
  theme: "dark",
  autoRefreshInterval: null,
  isUpdating: false,
  maxHistoryLength: 48
};
const appState = state; // alias — merged duplicate state

const historicalMentions = [
  { date: '2026-06-18', ticker: 'NVDA', company: 'NVIDIA', sector: 'AI chips / supply chain', signal: 'Strong', theme: 'Memory-led AI infrastructure buildout', why: 'The account tied NVIDIA supply commitments to storage demand and flagged a sharp increase in procurement spending.' },
  { date: '2026-06-25', ticker: 'SKHY', company: 'SK Hynix', sector: 'Memory / DRAM', signal: 'Strong', theme: 'Storage shortage through 2030', why: 'CEO commentary was framed as proof that memory scarcity will persist for years.' },
  { date: '2026-07-02', ticker: 'SNDK', company: 'SanDisk / NAND', sector: 'NAND / storage', signal: 'Strong', theme: 'Structural NAND demand', why: 'Management comments were used to support a positive structural demand view through 2030.' },
  { date: '2026-07-14', ticker: 'SIVE', company: 'Sivers Semiconductors', sector: 'Photonics / optical interconnect', signal: 'Strong', theme: 'AI data-center optics and laser capacity', why: 'The account highlighted unusual capacity and scaling potential for CW laser supply into AI DCs.' },
  { date: '2026-07-20', ticker: 'GFS', company: 'GlobalFoundries', sector: 'Foundry / AI packaging', signal: 'Medium', theme: 'Pluggable optics ecosystems', why: 'GFS was associated with scale-oriented packaging and CPO/NPO paths in AI infrastructure.' },
  { date: '2026-07-27', ticker: 'SIVE', company: 'Sivers Semiconductors', sector: 'Photonics / optical interconnect', signal: 'Strong', theme: 'AI data-center optics and laser capacity', why: 'The account repeated the idea that Sivers is unusually positioned for AI DC optics and capacity bottlenecks.' },
  { date: '2026-08-04', ticker: 'JBL', company: 'Jabil', sector: 'Electronics manufacturing', signal: 'Medium', theme: 'AI hardware ramp partner', why: 'Jabil was called out as the primary ramp partner in a 7-engagement pluggable optical story.' },
  { date: '2026-08-08', ticker: 'POET', company: 'POET Technologies', sector: 'Photonics / silicon photonics', signal: 'Medium', theme: 'ELS path and photonics design wins', why: 'The account included POET in the ELS/AI optics opportunity set.' },
  { date: '2026-08-18', ticker: 'SIVE', company: 'Sivers Semiconductors', sector: 'Photonics / optical interconnect', signal: 'Strong', theme: 'AI data-center optics and laser capacity', why: 'Sivers surfaced again as the most unusual $1B photonics play in the AI DC buildout.' },
  { date: '2026-08-21', ticker: 'SIVE', company: 'Sivers Semiconductors', sector: 'Photonics / optical interconnect', signal: 'Strong', theme: 'AI data-center optics and laser capacity', why: 'The account used the company to explain cloud providers locking up CW laser capacity and the opportunity for optical transceiver suppliers.' },
  { date: '2026-08-28', ticker: 'NVDA', company: 'NVIDIA', sector: 'AI chips / supply chain', signal: 'Strong', theme: 'Memory-led AI infrastructure buildout', why: 'The account reinforced the storage procurement angle, linking memory and supply chain buildout to Nvidia capacity commitments.' },
  { date: '2026-08-29', ticker: 'SIVE', company: 'Sivers Semiconductors', sector: 'Photonics / optical interconnect', signal: 'Strong', theme: 'AI data-center optics and laser capacity', why: 'The account again emphasized that Sivers is unusually exposed to AI DC photonics and laser capacity indexing.' }
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getStockBySymbol(symbol) {
  return STOCKS.find((stock) => stock.symbol === symbol) || null;
}

function generateSeries(basePrice, volatility = 1.4) {
  const points = [];
  let current = basePrice * 0.97;

  for (let i = 0; i < 24; i += 1) {
    const wave = Math.sin(i / 2.1) * volatility;
    const drift = i * 0.42;
    current = current + wave + drift * 0.07;
    points.push(Number(current.toFixed(2)));
  }

  return points;
}

function getStockData(symbol) {
  const stock = getStockBySymbol(symbol);
  if (!stock) return null;

  return {
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price,
    change: stock.change,
    volume: stock.volume,
    series: generateSeries(stock.price, stock.change > 0 ? 1.6 : 1.1)
  };
}

// Real-time price update simulation
function generateRealisticPriceUpdate(stock, volatilityFactor = 0.5) {
  const variation = randomDelta(stock.price, volatilityFactor);
  const newPrice = Math.max(stock.price * 0.8, stock.price + variation);
  const changePercent = ((newPrice - stock.lastPrice) / stock.lastPrice) * 100;
  
  return {
    price: Number(newPrice.toFixed(2)),
    change: Number(changePercent.toFixed(2))
  };
}

// Update prices for all stocks with realistic market movements
function updatePricesInRealTime() {
  if (state.isUpdating) return;
  state.isUpdating = true;
  
  STOCKS.forEach(stock => {
    const update = generateRealisticPriceUpdate(stock, 1.2);
    stock.lastPrice = stock.price;
    stock.price = update.price;
    stock.change = update.change;
  });
  
  state.isUpdating = false;
}

// Start auto-refresh for real-time updates
function startAutoRefresh(intervalSeconds = 5) {
  // Clear existing interval if any
  if (state.autoRefreshInterval) {
    clearInterval(state.autoRefreshInterval);
  }
  
  state.autoRefreshInterval = setInterval(() => {
    updatePricesInRealTime();
    renderDashboard();
    showUpdateIndicator();
  }, intervalSeconds * 1000);
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (state.autoRefreshInterval) {
    clearInterval(state.autoRefreshInterval);
    state.autoRefreshInterval = null;
  }
}

// Show visual indicator when prices update
function showUpdateIndicator() {
  if (!els.statusIndicator) return;
  
  els.statusIndicator.classList.add('updating');
  setTimeout(() => {
    els.statusIndicator.classList.remove('updating');
  }, 300);
}

function renderMarketSummary() {
  const marketStats = [
    { label: "S&P 500", value: "5,421.80", trend: "+0.92%", positive: true },
    { label: "Nasdaq", value: "19,746.10", trend: "+1.25%", positive: true },
    { label: "Dow", value: "39,862.40", trend: "-0.18%", positive: false }
  ];

  els.marketSummary.innerHTML = marketStats
    .map(
      (item) => `
        <div class="summary-card">
          <span class="label">${item.label}</span>
          <span class="value">${item.value}</span>
          <span class="trend ${item.positive ? "positive" : "negative"}">
            ${item.positive ? "▲" : "▼"} ${item.trend}
          </span>
        </div>
      `
    )
    .join("");
}

function renderWatchlist() {
  const items = state.watchlist
    .map((symbol) => {
      const stock = getStockBySymbol(symbol);
      if (!stock) return null;

      const isActive = symbol === state.selectedSymbol;
      return `
        <li class="watchlist-item ${isActive ? "active" : ""}" data-symbol="${symbol}">
          <div class="watchlist-symbol">
            <strong>${stock.symbol}</strong>
            <span>${stock.name}</span>
          </div>
          <div class="watchlist-meta">
            <strong>${formatCurrency(stock.price)}</strong>
            <span class="${stock.change >= 0 ? "positive" : "negative"}">
              ${formatPercent(stock.change)}
            </span>
          </div>
        </li>
      `;
    })
    .filter(Boolean)
    .join("");
}

// Aggregate historicalMentions into stockData for the table
const stockData = (() => {
  const map = {};
  historicalMentions.forEach((entry) => {
    if (!map[entry.ticker]) {
      map[entry.ticker] = {
        ticker: entry.ticker,
        company: entry.company,
        sector: entry.sector,
        mentions: 0,
        signal: entry.signal,
        why: entry.why,
      };
    }
    map[entry.ticker].mentions += 1;
    // Keep strongest signal
    const rank = { Strong: 3, Medium: 2, Light: 1 };
    if ((rank[entry.signal] || 0) > (rank[map[entry.ticker].signal] || 0)) {
      map[entry.ticker].signal = entry.signal;
      map[entry.ticker].why = entry.why;
    }
  });
  return Object.values(map).sort((a, b) => b.mentions - a.mentions);
})();

const accountInfo = { source: "@aleabitoreddit" };

function calculateStockData(tweets) {
  const map = {};
  tweets.forEach((t) => {
    (t.tickers || []).forEach((ticker) => {
      if (!map[ticker]) map[ticker] = { ticker, company: "Unknown Company", sector: "Unknown Sector", mentions: 0, signal: "Light", why: t.text };
      map[ticker].mentions += 1;
      if (map[ticker].mentions > 5) map[ticker].signal = "Strong";
      else if (map[ticker].mentions > 2) map[ticker].signal = "Medium";
    });
  });
  return Object.values(map).sort((a, b) => b.mentions - a.mentions);
}

// Format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Format percentage change
function formatPercent(value) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// Get price for a ticker
function getPriceData(ticker) {
  return stockPrices[ticker] || null;
}

function randomDelta(price, volatilityFactor) { return (Math.random() - 0.5) * price * (volatilityFactor / 100); }

// Ticker-based price updater (renamed — was duplicate name)
function generateRealisticPriceUpdateForTicker(ticker) {
  const data = stockPrices[ticker];
  if (!data) return null;
  
  const volatility = ticker === 'SIVE' ? 0.8 : 0.4; // SIVE is more volatile
  const variation = randomDelta(data.price, volatility);
  const newPrice = Math.max(data.price * 0.8, data.price + variation);
  const changePercent = ((newPrice - data.lastPrice) / data.lastPrice) * 100;
  
  return {
    price: Number(newPrice.toFixed(2)),
    change: Number(changePercent.toFixed(2))
  };
}

// Update all prices in real-time
function updateAllPrices() {
  if (appState.isUpdating) return;
  appState.isUpdating = true;
  
  for (const ticker in stockPrices) {
    const update = generateRealisticPriceUpdateForTicker(ticker);
    if (update) {
      stockPrices[ticker].lastPrice = stockPrices[ticker].price;
      stockPrices[ticker].price = update.price;
      stockPrices[ticker].change = update.change;
      
      // Add to price history
      stockPrices[ticker].history.push(update.price);
      if (stockPrices[ticker].history.length > appState.maxHistoryLength) {
        stockPrices[ticker].history.shift();
      }
    }
  }
  
  appState.isUpdating = false;
  try { renderStockTable(); } catch(e) { console.warn(e); }
  try { renderPriceCharts(); } catch(e) { console.warn(e); }
  showLiveIndicator();
}

// Render stock table with prices
function renderStockTable(data) {
  const _data = data || stockData;
  const stockTableBody = document.getElementById('stockTableBody');
  if (!stockTableBody) return;
  stockTableBody.innerHTML = _data
    .slice()
    .map((stock) => {
      const signalClass = stock.signal === 'Strong' ? 'strong' : stock.signal === 'Medium' ? 'medium' : 'light';
      const priceData = getPriceData(stock.ticker);
      const priceHTML = priceData 
        ? `<span class="price-value">${formatCurrency(priceData.price)}</span>
           <span class="price-change ${priceData.change >= 0 ? 'positive' : 'negative'}">${formatPercent(priceData.change)}</span>`
        : '<span class="price-unavailable">—</span>';
      
      return `
        <tr class="stock-row" data-ticker="${stock.ticker}">
          <td><span class="ticker-pill">${stock.ticker}</span></td>
          <td class="company">${stock.company}</td>
          <td class="sector">${stock.sector}</td>
          <td>${stock.mentions}</td>
          <td><span class="signal-badge ${signalClass}">${stock.signal}</span></td>
          <td class="price-cell">${priceHTML}</td>
          <td>${stock.why}</td>
        </tr>
      `;
    })
    .join('');
}

// Draw mini chart for a stock
function drawMiniChart(canvas, history, ticker) {
  if (!canvas || history.length < 2) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = 8;
  
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  
  // Clear canvas
  ctx.fillStyle = 'rgba(12, 24, 38, 0.5)';
  ctx.fillRect(0, 0, width, height);
  
  // Draw gridlines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = padding + (i / 2) * (height - padding * 2);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  
  // Draw price line
  const points = history.map((price, index) => {
    const x = padding + (index / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((price - min) / range) * (height - padding * 2);
    return { x, y };
  });
  
  // Draw line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = '#41d3ff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw area fill
  ctx.lineTo(points[points.length - 1].x, height - padding);
  ctx.lineTo(points[0].x, height - padding);
  ctx.fillStyle = 'rgba(65, 211, 255, 0.15)';
  ctx.fill();
  
  // Draw last price dot
  const lastPoint = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#41d3ff';
  ctx.fill();
}

// Render all price charts
function renderPriceCharts() {
  const chartsContainer = document.getElementById('priceCharts');
  if (!chartsContainer) return;
  
  chartsContainer.innerHTML = stockData
    .slice(0, 7) // Show all 7 stocks
    .map(stock => {
      const priceData = getPriceData(stock.ticker);
      if (!priceData) return '';
      
      const priceChange = priceData.change;
      const changeClass = priceChange >= 0 ? 'positive' : 'negative';
      
      return `
        <div class="stock-chart-card">
          <div class="chart-header">
            <div>
              <span class="chart-ticker">${stock.ticker}</span>
              <span class="chart-company">${stock.company}</span>
            </div>
            <div class="chart-price-info">
              <span class="chart-price">${formatCurrency(priceData.price)}</span>
              <span class="chart-change ${changeClass}">${formatPercent(priceChange)}</span>
            </div>
          </div>
          <canvas id="chart-${stock.ticker}" class="mini-chart" width="280" height="80"></canvas>
          <div class="chart-footer">
            <span class="chart-stat">24H range</span>
          </div>
        </div>
      `;
    })
    .join('');
  
  // Draw all charts
  for (const ticker in stockPrices) {
    const canvas = document.getElementById(`chart-${ticker}`);
    if (canvas) {
      drawMiniChart(canvas, stockPrices[ticker].history, ticker);
    }
  }
}

// Show visual indicator when prices update
function showLiveIndicator() {
  const indicator = document.getElementById('liveIndicator');
  if (!indicator) return;
  
  indicator.classList.add('pulse');
  setTimeout(() => {
    indicator.classList.remove('pulse');
  }, 300);
}

// Start auto-refresh
function startAutoRefresh(intervalSeconds = 5) {
  if (appState.autoRefreshInterval) {
    clearInterval(appState.autoRefreshInterval);
  }
  
  appState.autoRefreshInterval = setInterval(() => {
    updateAllPrices();
  }, intervalSeconds * 1000);
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (appState.autoRefreshInterval) {
    clearInterval(appState.autoRefreshInterval);
    appState.autoRefreshInterval = null;
  }
}

// Initialize dashboard
window.addEventListener('load', () => {
  const stockTableBody = document.getElementById('stockTableBody');
  renderStockTable();
  renderPriceCharts();
  
  const sourceNote = document.getElementById('sourceNote');
  sourceNote.textContent = `Source: ${accountInfo.source} • Last 90 days`;
  
  // Start real-time updates
  startAutoRefresh(3);
});

window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});

// X Feed – fetch latest tweets from backend API
// ---------------------------------------------------------------------------

const API_BASE = window.location.origin;

const xEls = {
  feedList: document.getElementById("xFeedList"),
  mentionsSummary: document.getElementById("xMentionsSummary"),
  lastUpdated: document.getElementById("xLastUpdated"),
  feedStatus: document.getElementById("xFeedStatus"),
  refreshBtn: document.getElementById("refreshXFeed"),
  trackedAccount: document.getElementById("trackedAccount"),
};

let xFeedRefreshing = false;

function formatXDate(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return isoString; }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function highlightTickers(text, tickers) {
  let escaped = escapeHtml(text);
  tickers.forEach((ticker) => {
    const regex = new RegExp(`\\b(${ticker})\\b`, "gi");
    escaped = escaped.replace(regex, '<span class="ticker-highlight">$1</span>');
  });
  return escaped;
}

async function fetchXFeed() {
  try {
    const resp = await fetch(`${API_BASE}/api/tweets`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.warn("Could not fetch X feed:", err.message);
    return { tweets: [], error: err.message, last_updated: null };
  }
}

async function refreshXFeedManually() {
  if (xFeedRefreshing) return;
  xFeedRefreshing = true;
  if (xEls.feedStatus) {
    xEls.feedStatus.innerHTML = '<div class="x-status-msg">🔄 Refreshing from X…</div>';
  }
  try {
    const resp = await fetch(`${API_BASE}/api/refresh`, { method: "POST" });
    const result = await resp.json();
    if (result.ok) {
      await renderXFeed();
    } else if (xEls.feedStatus) {
      xEls.feedStatus.innerHTML = `<div class="x-status-msg x-error">❌ Refresh failed: ${escapeHtml(result.error || "Unknown error")}</div>`;
    }
  } catch (err) {
    if (xEls.feedStatus) {
      xEls.feedStatus.innerHTML = `<div class="x-status-msg x-error">❌ Could not reach server: ${escapeHtml(err.message)}</div>`;
    }
  }
  xFeedRefreshing = false;
}

async function renderXFeed() {
  const data = await fetchXFeed();
  const tweets = data.tweets || [];

  if (xEls.trackedAccount && data.tracked_account) {
    xEls.trackedAccount.textContent = data.tracked_account;
  }
  if (xEls.lastUpdated && data.last_updated) {
    xEls.lastUpdated.textContent = `Updated ${formatXDate(data.last_updated)}`;
  }

  if (data.error && tweets.length === 0) {
    if (xEls.feedStatus) {
      xEls.feedStatus.innerHTML = `<div class="x-status-msg x-error">⚠️ ${escapeHtml(data.error)}<br><small>The syndication endpoint may be rate-limited. Try again in a few minutes.</small></div>`;
    }
    if (xEls.feedList) xEls.feedList.innerHTML = "";
    if (xEls.mentionsSummary) xEls.mentionsSummary.innerHTML = "";
    return;
  }
  if (xEls.feedStatus) xEls.feedStatus.innerHTML = "";

  if (xEls.feedList) {
    if (tweets.length === 0) {
      xEls.feedList.innerHTML = '<div class="x-status-msg">No tweets yet. Click Refresh or wait for the daily update.</div>';
    } else {
      xEls.feedList.innerHTML = tweets.map((t) => `
        <div class="x-tweet-card">
          <div class="x-tweet-header">
            <img class="x-avatar" src="${escapeHtml(t.avatar_url || "")}" alt="" onerror="this.style.display='none'" />
            <div class="x-tweet-meta">
              <span class="x-display-name">${escapeHtml(t.display_name || t.username)}</span>
              <span class="x-username">@${escapeHtml(t.username)}</span>
            </div>
            <span class="x-tweet-date">${formatXDate(t.date)}</span>
          </div>
          <div class="x-tweet-body">${highlightTickers(t.text, t.tickers || [])}</div>
          ${t.tickers && t.tickers.length > 0
            ? `<div class="x-tweet-tickers">${t.tickers.map((tk) => `<span class="ticker-badge">${escapeHtml(tk)}</span>`).join("")}</div>`
            : ""}
          <div class="x-tweet-footer">
            <span class="x-stat">❤️ ${t.like_count || 0}</span>
            <span class="x-stat">🔁 ${t.retweet_count || 0}</span>
            <span class="x-stat">💬 ${t.reply_count || 0}</span>
            <a class="x-tweet-link" href="${escapeHtml(t.url)}" target="_blank" rel="noopener">View on X ↗</a>
          </div>
        </div>`).join("");
    }
  }

  // X feed drives table — if tweets empty, fall back to historical stockData
  const xStockData = (tweets.length ? calculateStockData(tweets) : (typeof stockData !== 'undefined' ? stockData : []));
  try { renderStockTable(xStockData); } catch(e) { console.warn(e); }
  try { renderPriceCharts(xStockData); } catch(e) { console.warn(e); }

  // Mentions summary
  if (xEls.mentionsSummary) {
    const tickerCounts = {};
    tweets.forEach((t) => {
      (t.tickers || []).forEach((tk) => { tickerCounts[tk] = (tickerCounts[tk] || 0) + 1; });
    });
    const sorted = Object.entries(tickerCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (sorted.length === 0) {
      xEls.mentionsSummary.innerHTML = '<div class="x-status-msg">No stock mentions detected in recent tweets.</div>';
    } else {
      const maxCount = sorted[0][1];
      xEls.mentionsSummary.innerHTML = sorted.map(([ticker, count]) => `
        <div class="mention-bar-row">
          <span class="mention-ticker">${escapeHtml(ticker)}</span>
          <div class="mention-bar-track">
            <div class="mention-bar-fill" style="width: ${(count / maxCount) * 100}%"></div>
          </div>
          <span class="mention-count">${count}</span>
        </div>`).join("");
    }
  }
}

// Load X Feed on page load
renderXFeed();

// Attach event listener for manual refresh
if (xEls.refreshBtn) {
  xEls.refreshBtn.addEventListener("click", refreshXFeedManually);
}

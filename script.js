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

const state = {
  selectedSymbol: "AAPL",
  watchlist: ["AAPL", "MSFT", "NVDA"],
  theme: "dark",
  autoRefreshInterval: null,
  isUpdating: false
};

const els = {
  searchInput: document.getElementById("searchInput"),
  addWatchlistBtn: document.getElementById("addWatchlistBtn"),
  themeToggle: document.getElementById("themeToggle"),
  marketHeadline: document.getElementById("marketHeadline"),
  marketSummary: document.getElementById("marketSummary"),
  chartTitle: document.getElementById("chartTitle"),
  selectedPrice: document.getElementById("selectedPrice"),
  selectedChange: document.getElementById("selectedChange"),
  watchlist: document.getElementById("watchlist"),
  stocksTableBody: document.getElementById("stocksTableBody"),
  refreshWatchlist: document.getElementById("refreshWatchlist"),
  chart: document.getElementById("priceChart"),
  statusIndicator: document.getElementById("statusIndicator")
};

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
  const variation = (Math.random() - 0.5) * stock.price * (volatilityFactor / 100);
  const newPrice = Math.max(stock.price * 0.8, stock.price + variation);
  const priceDiff = newPrice - stock.lastPrice;
  const changePercent = (priceDiff / stock.lastPrice) * 100;
  
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

  els.watchlist.innerHTML = items;

  document.querySelectorAll(".watchlist-item").forEach((item) => {
    item.addEventListener("click", () => {
      state.selectedSymbol = item.dataset.symbol;
      renderDashboard();
    });
  });
}

function renderTable() {
  const q = els.searchInput.value.trim().toLowerCase();
  const matchingStocks = STOCKS.filter((stock) => {
    if (!q) return true;
    return stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q);
  });

  els.stocksTableBody.innerHTML = matchingStocks
    .map((stock) => `
      <tr data-symbol="${stock.symbol}">
        <td class="stock-symbol">${stock.symbol}</td>
        <td>${formatCurrency(stock.price)}</td>
        <td class="stock-change ${stock.change >= 0 ? "positive" : "negative"}">
          ${formatPercent(stock.change)}
        </td>
        <td>${stock.volume}</td>
      </tr>
    `)
    .join("");

  document.querySelectorAll("#stocksTableBody tr").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedSymbol = row.dataset.symbol;
      renderDashboard();
    });
  });
}

function renderChart(series, symbol, price, change) {
  const canvas = els.chart;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 760;
  const height = rect.height || 260;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const padding = 20;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 5; i += 1) {
    const y = padding + (i / 4) * (height - padding * 2);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  const linePoints = series.map((point, index) => {
    const x = padding + (index / (series.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point - min) / range) * (height - padding * 2);
    return { x, y };
  });

  ctx.beginPath();
  ctx.moveTo(linePoints[0].x, linePoints[0].y);

  linePoints.forEach((point, index) => {
    if (index > 0) ctx.lineTo(point.x, point.y);
  });

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(96, 165, 250, 0.35)";
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const lastPoint = linePoints[linePoints.length - 1];
  const firstPoint = linePoints[0];

  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#60a5fa";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);
  ctx.lineTo(lastPoint.x, lastPoint.y);
  ctx.strokeStyle = "rgba(96, 165, 250, 0.18)";
  ctx.setLineDash([6, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  els.chartTitle.textContent = symbol;
  els.selectedPrice.textContent = formatCurrency(price);
  els.selectedChange.textContent = formatPercent(change);
  els.selectedChange.classList.toggle("positive", change >= 0);
  els.selectedChange.classList.toggle("negative", change < 0);
}

function renderDashboard() {
  const selectedStock = getStockBySymbol(state.selectedSymbol) || STOCKS[0];
  const chartData = getStockData(selectedStock.symbol);

  els.marketHeadline.textContent = selectedStock.name || "Market";

  renderMarketSummary();
  renderWatchlist();
  renderTable();

  if (chartData) {
    renderChart(chartData.series, chartData.symbol, chartData.price, chartData.change);
  }
}

function applyTheme() {
  const dark = state.theme === "dark";
  document.body.classList.toggle("dark", dark);
  els.themeToggle.textContent = dark ? "Light mode" : "Dark mode";
}

function addSearchResultToWatchlist() {
  const q = els.searchInput.value.trim().toUpperCase();
  if (!q) return;

  const found = STOCKS.find(
    (stock) => stock.symbol === q || stock.name.toLowerCase().includes(q.toLowerCase())
  );

  if (!found) {
    alert("Stock not found in the current market list.");
    return;
  }

  if (!state.watchlist.includes(found.symbol)) {
    state.watchlist.push(found.symbol);
  }

  state.selectedSymbol = found.symbol;
  renderDashboard();
}

els.addWatchlistBtn.addEventListener("click", addSearchResultToWatchlist);

els.searchInput.addEventListener("input", () => {
  renderTable();
});

els.refreshWatchlist.addEventListener("click", () => {
  renderDashboard();
});

els.themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
});

window.addEventListener("resize", () => {
  renderDashboard();
});

window.addEventListener("beforeunload", () => {
  stopAutoRefresh();
});

applyTheme();
renderDashboard();

// Start real-time price updates every 5 seconds
startAutoRefresh(5);

// ---------------------------------------------------------------------------
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
      xEls.feedStatus.innerHTML = `<div class="x-status-msg x-error">⚠️ ${escapeHtml(data.error)}<br><small>Ensure X credentials are set in .env and the server is running.</small></div>`;
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

// Attach event listener for manual refresh
if (xEls.refreshBtn) {
  xEls.refreshBtn.addEventListener("click", refreshXFeedManually);
}

// Initial render of X feed on page load
renderXFeed();
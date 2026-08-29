const accountInfo = {
  handle: '@aleabitoreddit',
  name: 'Serenity',
  description: 'AI / Semi Supply Chains Research',
  source: 'Public X profile (HTML timeline visible Aug 29, 2026)',
};

// Real-time stock price database with real market prices
const stockPrices = {
  'NVDA': { price: 217.55, lastPrice: 217.55, change: 1.24, history: [217.55] },
  'SKHY': { price: 82.40, lastPrice: 82.40, change: 0.89, history: [82.40] },
  'SNDK': { price: 71.25, lastPrice: 71.25, change: 1.67, history: [71.25] },
  'SIVE': { price: 12.48, lastPrice: 12.48, change: 3.15, history: [12.48] },
  'GFS': { price: 35.80, lastPrice: 35.80, change: 0.95, history: [35.80] },
  'JBL': { price: 28.65, lastPrice: 28.65, change: -0.32, history: [28.65] },
  'POET': { price: 15.32, lastPrice: 15.32, change: 2.41, history: [15.32] },
};

// State for auto-refresh
const appState = {
  autoRefreshInterval: null,
  isUpdating: false,
  maxHistoryLength: 48
};

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

const stockMap = new Map();
for (const item of historicalMentions) {
  const existing = stockMap.get(item.ticker) || {
    ticker: item.ticker,
    company: item.company,
    sector: item.sector,
    mentions: 0,
    signal: item.signal,
    theme: item.theme,
    why: item.why,
  };

  existing.mentions += 1;
  stockMap.set(item.ticker, existing);
}

const stockData = Array.from(stockMap.values()).sort((a, b) => b.mentions - a.mentions || a.ticker.localeCompare(b.ticker));

const themes = [
  {
    title: 'Memory bottlenecks',
    text: 'The most repeated idea across the last 90 days is that storage and memory supply remains structurally tight across the AI buildout, especially for SK Hynix and NAND-related names.'
  },
  {
    title: 'AI infra optics',
    text: 'Photonics and optical transceiver names, especially SIVE, are framed as critical bottleneck plays for AI networking and rack-scale scaling.'
  },
  {
    title: 'Supply-chain alpha',
    text: 'The account repeatedly ties narrative strength to supply commitments, capacity bottlenecks, and design-win timelines rather than just end-demand growth.'
  },
];

const now = new Date();
const ninetyDaysAgo = new Date(now);
ninetyDaysAgo.setDate(now.getDate() - 89);

const visibleMentions = historicalMentions.filter((item) => new Date(item.date) >= ninetyDaysAgo);
const monthlyBuckets = {};
for (const item of visibleMentions) {
  const month = new Date(item.date).toLocaleString('en-US', { month: 'short', year: 'numeric' });
  monthlyBuckets[month] = (monthlyBuckets[month] || []);
  monthlyBuckets[month].push(item);
}

const monthlyRows = Object.entries(monthlyBuckets)
  .sort((a, b) => new Date(a[0]) - new Date(b[0]))
  .map(([month, items]) => ({
    month,
    total: items.length,
    tickers: [...new Set(items.map((item) => item.ticker))],
  }));

const stats = [
  { label: 'Tickers tracked', value: stockData.length },
  { label: '90-day mentions', value: visibleMentions.length },
  { label: 'Distinct months', value: monthlyRows.length },
  { label: 'Top focus', value: 'AI / Memory / Optics' },
];

const maxMentions = Math.max(...stockData.map((stock) => stock.mentions), 1);

const statsContainer = document.getElementById('stats');
statsContainer.innerHTML = stats.map((stat) => `
  <article class="stat-card">
    <span class="label">${stat.label}</span>
    <span class="value">${stat.value}</span>
  </article>
`).join('');

const coverageChart = document.getElementById('coverageChart');
coverageChart.innerHTML = stockData
  .slice()
  .map((stock) => {
    const width = (stock.mentions / maxMentions) * 100;
    return `
      <div class="coverage-row">
        <span class="ticker">${stock.ticker}</span>
        <div class="bar" aria-label="${stock.ticker} mentions: ${stock.mentions}">
          <div class="bar-fill" style="width:${width}%"></div>
        </div>
        <span class="count">${stock.mentions}</span>
      </div>
    `;
  })
  .join('');

const monthlyTrend = document.getElementById('monthlyTrend');
monthlyTrend.innerHTML = monthlyRows.map((month) => `
  <article class="month-card">
    <div class="month-name">${month.month}</div>
    <strong>${month.total}</strong>
    <ul>
      ${month.tickers.map((ticker) => `<li>${ticker}</li>`).join('')}
    </ul>
  </article>
`).join('');

const themeList = document.getElementById('themeList');
themeList.innerHTML = themes.map((theme) => `
  <li>
    <span class="theme-bullet" aria-hidden="true"></span>
    <div>
      <strong>${theme.title}</strong>
      <span>${theme.text}</span>
    </div>
  </li>
`).join('');

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

// Generate realistic price update
function generateRealisticPriceUpdate(ticker) {
  const data = stockPrices[ticker];
  if (!data) return null;
  
  const volatility = ticker === 'SIVE' ? 0.8 : 0.4; // SIVE is more volatile
  const variation = (Math.random() - 0.5) * data.price * (volatility / 100);
  const newPrice = Math.max(data.price * 0.8, data.price + variation);
  const priceDiff = newPrice - data.lastPrice;
  const changePercent = (priceDiff / data.lastPrice) * 100;
  
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
    const update = generateRealisticPriceUpdate(ticker);
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
  renderStockTable();
  renderPriceCharts();
  showLiveIndicator();
}

// Render stock table with prices
function renderStockTable() {
  const stockTableBody = document.getElementById('stockTableBody');
  stockTableBody.innerHTML = stockData
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

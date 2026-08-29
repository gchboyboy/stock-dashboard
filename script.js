const accountInfo = {
  handle: '@aleabitoreddit',
  name: 'Serenity',
  description: 'AI / Semi Supply Chains Research',
  source: 'Public X profile (HTML timeline visible Aug 29, 2026)',
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

const stockTableBody = document.getElementById('stockTableBody');
stockTableBody.innerHTML = stockData
  .slice()
  .map((stock) => {
    const signalClass = stock.signal === 'Strong' ? 'strong' : stock.signal === 'Medium' ? 'medium' : 'light';
    return `
      <tr>
        <td><span class="ticker-pill">${stock.ticker}</span></td>
        <td class="company">${stock.company}</td>
        <td class="sector">${stock.sector}</td>
        <td>${stock.mentions}</td>
        <td><span class="signal-badge ${signalClass}">${stock.signal}</span></td>
        <td>${stock.why}</td>
      </tr>
    `;
  })
  .join('');

const sourceNote = document.getElementById('sourceNote');
sourceNote.textContent = `Source: ${accountInfo.source} • Last 90 days`;

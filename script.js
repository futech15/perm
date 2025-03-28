// Configuration
const CONFIG = {
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  DATA_VERSION: '4.5'
};

// DOM Elements
const elements = {
  refreshBtn: document.getElementById('refreshBtn'),
  pendingStatus: document.getElementById('pendingStatus'),
  novemberCount: document.getElementById('novemberCount'),
  novemberPercent: document.getElementById('novemberPercent'),
  todayCount: document.getElementById('todayCount'),
  todayPercent: document.getElementById('todayPercent'),
  todayUpdated: document.getElementById('todayUpdated'),
  nextRefresh: document.getElementById('nextRefresh'),
  pendingChart: document.getElementById('pendingChart'),
  completedChart: document.getElementById('completedChart'),
  totalPending: document.getElementById('totalPending')
};

// Chart instances and state
let charts = {
  pending: null,
  completed: null
};
let state = {
  pendingData: [
    { month: 'November 2023', count: 6722, percentage: 43.98 },
    { month: 'December 2023', count: 13857, percentage: null },
    { month: 'January 2024', count: 11186, percentage: null },
    { month: 'February 2024', count: 11247, percentage: null },
    { month: 'March 2024', count: 10145, percentage: null },
    { month: 'April 2024', count: 10622, percentage: null },
    { month: 'May 2024', count: 12703, percentage: null }
  ],
  completedData: []
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  initializeCharts();
  await fetchData();
  startAutoRefresh();
});

function initializeCharts() {
  if (charts.pending) charts.pending.destroy();
  if (charts.completed) charts.completed.destroy();
  
  charts.pending = new Chart(elements.pendingChart, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: getChartOptions('Month', 'Applications')
  });
  
  charts.completed = new Chart(elements.completedChart, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: getChartOptions('Date', 'Cases')
  });
}

async function fetchData() {
  try {
    elements.refreshBtn.disabled = true;
    elements.pendingStatus.textContent = "Fetching data...";
    
    // First try direct fetch with proxy
    let html;
    try {
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent('https://permtimeline.com/')}`);
      if (!response.ok) throw new Error('Proxy failed');
      html = await response.text();
    } catch (proxyError) {
      console.log("Trying fallback method...");
      // Fallback to alternative method if proxy fails
      const fallback = await fetch('https://permtimeline.com/', { mode: 'no-cors' })
        .then(r => r.text())
        .catch(e => { throw new Error('All fetch methods failed') });
      html = fallback;
    }
    
    processHtmlData(html);
    updatePendingTotal();
    updateCharts();
    elements.pendingStatus.textContent = `Last updated: ${formatDateTime(new Date())}`;
    
  } catch (error) {
    console.error("Fetch error:", error);
    elements.pendingStatus.textContent = `Error: ${error.message}`;
  } finally {
    elements.refreshBtn.disabled = false;
    updateNextRefreshTime();
  }
}

function processHtmlData(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 1. Update November data
  updateNovemberData(doc);
  
  // 2. Update today's completed cases
  updateTodaysCompletedCases(doc);
}

function updateNovemberData(doc) {
  const novemberSection = Array.from(doc.querySelectorAll('section.timeline-entry, div.timeline-section'))
    .find(section => {
      const header = section.querySelector('h2, h3');
      return header && header.textContent.includes('November');
    });
  
  if (novemberSection) {
    const pendingText = novemberSection.textContent.match(/Pending Applications:\s*([\d,]+)\s*\(([\d.]+)%\)/);
    if (pendingText) {
      const newCount = parseInt(pendingText[1].replace(/,/g, ''));
      const newPercent = parseFloat(pendingText[2]);
      
      // Update state
      state.pendingData[0].count = newCount;
      state.pendingData[0].percentage = newPercent;
      
      // Update UI
      elements.novemberCount.textContent = newCount.toLocaleString();
      elements.novemberPercent.textContent = `${newPercent}%`;
    }
  }
}

function updateTodaysCompletedCases(doc) {
  const today = new Date().toISOString().split('T')[0];
  const completedParagraph = Array.from(doc.querySelectorAll('p'))
    .find(p => p.textContent.includes('Total Completed Today'));
  
  if (completedParagraph) {
    const matches = completedParagraph.textContent.match(/(\d+)\s*\(([\d.]+)%\)/);
    if (matches) {
      const count = parseInt(matches[1]);
      const percent = parseFloat(matches[2]);
      
      // Update today's display
      elements.todayCount.textContent = count;
      elements.todayPercent.textContent = percent;
      elements.todayUpdated.textContent = formatDateTime(new Date());
      
      // Update state for chart
      const existingIndex = state.completedData.findIndex(d => d.date === today);
      if (existingIndex >= 0) {
        state.completedData[existingIndex] = { date: today, count, percent };
      } else {
        state.completedData.push({ date: today, count, percent });
        // Keep only last 7 days
        if (state.completedData.length > 7) {
          state.completedData.shift();
        }
      }
    }
  }
}

function updatePendingTotal() {
  const total = state.pendingData.reduce((sum, month) => sum + month.count, 0);
  elements.totalPending.textContent = total.toLocaleString();
}

function updateCharts() {
  // Update Pending Applications Chart
  charts.pending.data.labels = state.pendingData.map(m => m.month.split(' ')[0]);
  charts.pending.data.datasets = [{
    label: 'Pending Applications',
    data: state.pendingData.map(m => m.count),
    backgroundColor: 'rgba(52, 152, 219, 0.7)',
    borderColor: 'rgba(52, 152, 219, 1)',
    borderWidth: 1
  }];
  charts.pending.update();
  
  // Update Completed Cases Chart
  const chartData = [...state.completedData].reverse(); // Newest first
  charts.completed.data.labels = chartData.map(d => formatChartDate(new Date(d.date)));
  charts.completed.data.datasets = [{
    label: 'Completed Cases',
    data: chartData.map(d => d.count),
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderColor: 'rgba(46, 204, 113, 1)',
    borderWidth: 2,
    tension: 0.1,
    fill: true
  }];
  charts.completed.update();
}

function formatChartDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getChartOptions(xLabel, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: yLabel }
      },
      x: {
        title: { display: true, text: xLabel }
      }
    }
  };
}

function setupEventListeners() {
  elements.refreshBtn.addEventListener('click', fetchData);
}

function startAutoRefresh() {
  setInterval(fetchData, CONFIG.REFRESH_INTERVAL);
  updateNextRefreshTime();
}

function updateNextRefreshTime() {
  const nextRefresh = new Date(Date.now() + CONFIG.REFRESH_INTERVAL);
  elements.nextRefresh.textContent = `Next refresh: ${formatTime(nextRefresh)}`;
}

function formatDateTime(date) {
  return date.toLocaleString();
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

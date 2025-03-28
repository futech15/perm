// Configuration
const CONFIG = {
  PROXY_URL: 'https://api.allorigins.win/get?url=https://permtimeline.com/',
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  MAX_HISTORY_DAYS: 7,
  DATA_VERSION: '4.0'
};

// DOM Elements
const elements = {
  refreshBtn: document.getElementById('refreshBtn'),
  pendingStatus: document.getElementById('pendingStatus'),
  pendingTableBody: document.querySelector('#pendingTable tbody'),
  totalPending: document.getElementById('totalPending'),
  todayCount: document.getElementById('todayCount'),
  todayPercent: document.getElementById('todayPercent'),
  todayUpdated: document.getElementById('todayUpdated'),
  completedTableBody: document.querySelector('#completedTable tbody'),
  weekTotal: document.getElementById('weekTotal'),
  nextRefresh: document.getElementById('nextRefresh'),
  pendingChart: document.getElementById('pendingChart'),
  completedChart: document.getElementById('completedChart')
};

// Application State
let state = {
  pending: [],
  today: { count: 0, percentage: 0 },
  history: [],
  lastUpdated: null,
  refreshTimer: null
};

// Charts
let charts = {
  pending: null,
  completed: null
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  loadSavedData();
  setupEventListeners();
  await fetchAllData();
  startAutoRefresh();
});

// Data Functions
async function fetchAllData() {
  try {
    elements.refreshBtn.disabled = true;
    elements.pendingStatus.textContent = "Fetching data...";
    
    const response = await fetch(CONFIG.PROXY_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    if (!data.contents) throw new Error("No content received");
    
    processHtmlData(data.contents);
    state.lastUpdated = new Date().toISOString();
    saveData();
    renderAllData();
    
    elements.pendingStatus.textContent = `Last updated: ${formatDateTime(state.lastUpdated)}`;
    
  } catch (error) {
    console.error("Fetch error:", error);
    elements.pendingStatus.textContent = `Error: ${error.message}`;
  } finally {
    elements.refreshBtn.disabled = false;
  }
}

function processHtmlData(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Process Pending Applications
  const pendingData = [];
  const monthSections = doc.querySelectorAll('div.timeline-section, section.timeline-entry');
  
  monthSections.forEach(section => {
    const monthHeader = section.querySelector('h2, h3');
    if (!monthHeader) return;
    
    const monthText = monthHeader.textContent.trim();
    if (!/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i.test(monthText)) return;
    
    const pendingElement = section.querySelector('p:contains("Pending Applications")') || 
                          section.querySelector('p.font-medium');
    if (!pendingElement) return;
    
    const matches = pendingElement.textContent.match(/Pending Applications:\s*([\d,]+)\s*\(([\d.]+)%\)/);
    if (!matches || matches.length < 3) return;
    
    pendingData.push({
      month: monthText.replace(':', '').trim(),
      count: parseInt(matches[1].replace(/,/g, '')),
      percentage: parseFloat(matches[2])
    });
  });
  
  state.pending = pendingData;
  
  // Process Today's Completed Cases
  let todayCount = 0;
  let todayPercent = 0;
  const completedElements = doc.querySelectorAll('p');
  
  for (const element of completedElements) {
    if (element.textContent.includes('Total Completed Today')) {
      const matches = element.textContent.match(/Total Completed Today:\s*<!--\s*-->(\d+).*?([\d.]+)%/);
      if (matches) {
        todayCount = parseInt(matches[1]);
        todayPercent = parseFloat(matches[2]) || 0;
      }
      break;
    }
  }
  
  state.today = {
    count: todayCount,
    percentage: todayPercent,
    updated: new Date().toISOString()
  };
  
  // Update history if it's a new day
  updateHistory();
}

function updateHistory() {
  const today = new Date().toISOString().split('T')[0];
  
  // Only add to history if we have data and it's a new day
  if (state.today.count > 0 && 
      (!state.history.length || state.history[state.history.length-1].date !== today)) {
    
    state.history.push({
      date: today,
      count: state.today.count,
      percentage: state.today.percentage
    });
    
    // Keep only the most recent 7 days
    if (state.history.length > CONFIG.MAX_HISTORY_DAYS) {
      state.history = state.history.slice(-CONFIG.MAX_HISTORY_DAYS);
    }
  }
}

// UI Functions
function renderAllData() {
  renderPendingData();
  renderTodayData();
  renderHistoryData();
  renderCharts();
}

function renderPendingData() {
  elements.pendingTableBody.innerHTML = '';
  let total = 0;
  
  state.pending.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.month}</td>
      <td>${item.count.toLocaleString()}</td>
      <td>${item.percentage.toFixed(2)}%</td>
    `;
    elements.pendingTableBody.appendChild(row);
    total += item.count;
  });
  
  elements.totalPending.textContent = total.toLocaleString();
}

function renderTodayData() {
  elements.todayCount.textContent = state.today.count;
  elements.todayPercent.textContent = state.today.percentage.toFixed(2);
  elements.todayUpdated.textContent = state.today.updated ? 
    formatDateTime(state.today.updated) : 'Never';
}

function renderHistoryData() {
  elements.completedTableBody.innerHTML = '';
  let total = 0;
  
  // Show most recent first
  const displayData = [...state.history].reverse();
  
  displayData.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(item.date, true)}</td>
      <td>${item.count.toLocaleString()}</td>
      <td>${item.percentage ? item.percentage.toFixed(2) + '%' : ''}</td>
    `;
    elements.completedTableBody.appendChild(row);
    total += item.count;
  });
  
  elements.weekTotal.textContent = total.toLocaleString();
}

function renderCharts() {
  // Pending Chart
  if (charts.pending) charts.pending.destroy();
  charts.pending = new Chart(elements.pendingChart, {
    type: 'bar',
    data: {
      labels: state.pending.map(item => item.month),
      datasets: [{
        label: 'Pending Applications',
        data: state.pending.map(item => item.count),
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 1
      }]
    },
    options: getChartOptions('Month', 'Number of Applications')
  });
  
  // Completed Chart
  if (charts.completed) charts.completed.destroy();
  const chartData = [...state.history].reverse();
  charts.completed = new Chart(elements.completedChart, {
    type: 'line',
    data: {
      labels: chartData.map(item => formatDate(item.date, true)),
      datasets: [{
        label: 'Daily Completed Cases',
        data: chartData.map(item => item.count),
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
        borderColor: 'rgba(46, 204, 113, 1)',
        borderWidth: 2,
        tension: 0.1,
        fill: true
      }]
    },
    options: getChartOptions('Date', 'Number of Cases')
  });
}

// Storage Functions
function loadSavedData() {
  try {
    const saved = localStorage.getItem('gcTimelineData');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version === CONFIG.DATA_VERSION) {
        if (parsed.pending) state.pending = parsed.pending;
        if (parsed.today) state.today = parsed.today;
        if (parsed.history) state.history = parsed.history;
        if (parsed.lastUpdated) state.lastUpdated = parsed.lastUpdated;
        
        renderAllData();
      }
    }
  } catch (error) {
    console.error("Load error:", error);
  }
}

function saveData() {
  try {
    const data = {
      pending: state.pending,
      today: state.today,
      history: state.history,
      lastUpdated: state.lastUpdated,
      version: CONFIG.DATA_VERSION
    };
    localStorage.setItem('gcTimelineData', JSON.stringify(data));
  } catch (error) {
    console.error("Save error:", error);
  }
}

// Utility Functions
function setupEventListeners() {
  elements.refreshBtn.addEventListener('click', fetchAllData);
}

function startAutoRefresh() {
  if (state.refreshTimer) clearTimeout(state.refreshTimer);
  
  state.refreshTimer = setTimeout(() => {
    fetchAllData();
    startAutoRefresh();
  }, CONFIG.REFRESH_INTERVAL);
  
  const nextRefresh = new Date(Date.now() + CONFIG.REFRESH_INTERVAL);
  elements.nextRefresh.textContent = `Next refresh: ${formatTime(nextRefresh)}`;
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatDate(dateString, short = false) {
  const date = new Date(dateString);
  return short ? 
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
    date.toISOString().split('T')[0];
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getChartOptions(xLabel, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: yLabel } },
      x: { title: { display: true, text: xLabel } }
    }
  };
}

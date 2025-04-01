// Configuration
const CONFIG = {
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  DAILY_UPDATE_HOUR: 23, // 11 PM
  DAILY_UPDATE_MINUTE: 58, // 58 minutes
  HISTORY_DAYS: 7 // Number of days to keep
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
  nextArchive: document.getElementById('nextArchive'),
  pendingChart: document.getElementById('pendingChart'),
  completedChart: document.getElementById('completedChart'),
  totalPending: document.getElementById('totalPending'),
  monthSelect: document.getElementById('monthSelect'),
  calculateBtn: document.getElementById('calculateBtn'),
  selectedPending: document.getElementById('selectedPending'),
  completionRate: document.getElementById('completionRate'),
  expectedDate: document.getElementById('expectedDate'),
  weekTotal: document.getElementById('weekTotal'),
  completedTableBody: document.querySelector('#completedTable tbody')
};

// Application State
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
  completedData: [], // Will be initialized with last 7 days
  todayCompleted: { count: 0, percentage: 0 }
};

// Chart instances
let charts = {
  pending: null,
  completed: null
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  initializeCompletedData();
  initializeCharts();
  setupEventListeners();
  await fetchData();
  startAutoRefresh();
  scheduleDailyUpdate();
  updateUI();
});

function initializeCompletedData() {
  // Initialize with empty data for last 7 days (excluding today)
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i - 1); // Subtract 1 to exclude today
    const dateStr = date.toISOString().split('T')[0];
    state.completedData.push({
      date: dateStr,
      count: 0,
      percentage: null
    });
  }
}

function initializeCharts() {
  if (charts.pending) charts.pending.destroy();
  if (charts.completed) charts.completed.destroy();

  // Pending Applications Chart
  charts.pending = new Chart(elements.pendingChart, {
    type: 'bar',
    data: {
      labels: state.pendingData.map(m => m.month.split(' ')[0] + ' ' + m.month.split(' ')[1].slice(2)),
      datasets: [{
        label: 'Pending Applications',
        data: state.pendingData.map(m => m.count),
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 1
      }]
    },
    options: getChartOptions('Month', 'Applications')
  });

  // Completed Cases Chart (shows last 7 days excluding today)
  charts.completed = new Chart(elements.completedChart, {
    type: 'line',
    data: {
      labels: getLast7DaysLabels(),
      datasets: [{
        label: 'Daily Completed Cases',
        data: getLast7DaysData(),
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
        borderColor: 'rgba(46, 204, 113, 1)',
        borderWidth: 2,
        tension: 0.1,
        fill: true,
        pointBackgroundColor: 'rgba(46, 204, 113, 1)',
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: getChartOptions('Date', 'Cases')
  });
}

function updateUI() {
  elements.novemberCount.textContent = state.pendingData[0].count.toLocaleString();
  elements.novemberPercent.textContent = `${state.pendingData[0].percentage}%`;
  elements.todayCount.textContent = state.todayCompleted.count;
  elements.todayPercent.textContent = state.todayCompleted.percentage.toFixed(2);
  elements.todayUpdated.textContent = formatDateTime(new Date());
  updatePendingTotal();
  updateCompletedTable();
  updateCharts();
}

function getLast7DaysLabels() {
  return state.completedData.map(day => formatChartDate(new Date(day.date)));
}

function getLast7DaysData() {
  return state.completedData.map(day => day.count);
}

async function fetchData() {
  try {
    elements.refreshBtn.disabled = true;
    elements.pendingStatus.textContent = "Fetching data...";
    
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = encodeURIComponent('https://permtimeline.com/');
    const response = await fetch(proxyUrl + targetUrl);
    
    if (!response.ok) throw new Error(`Network error: ${response.status}`);
    processHtmlData(await response.text());
    
  } catch (error) {
    console.error("Fetch error:", error);
    elements.pendingStatus.textContent = `Error: ${error.message}`;
  } finally {
    updatePendingTotal();
    updateCharts();
    elements.pendingStatus.textContent = `Last updated: ${formatDateTime(new Date())}`;
    elements.refreshBtn.disabled = false;
    updateNextRefreshTime();
  }
}

function processHtmlData(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  updateNovemberData(doc);
  updateTodaysCompletedCases(doc);
}

function updateNovemberData(doc) {
  const sections = Array.from(doc.querySelectorAll('section, div'));
  const novemberSection = sections.find(section => {
    const header = section.querySelector('h2, h3') || section;
    return header.textContent.includes('November');
  });

  if (novemberSection) {
    const pendingText = novemberSection.textContent;
    const matches = pendingText.match(/Pending Applications:\s*([\d,]+)\s*\(([\d.]+)%\)/);
    
    if (matches && matches.length >= 3) {
      state.pendingData[0].count = parseInt(matches[1].replace(/,/g, ''));
      state.pendingData[0].percentage = parseFloat(matches[2]);
    }
  }
}

function updateTodaysCompletedCases(doc) {
  const paragraphs = Array.from(doc.querySelectorAll('p'));
  const todayParagraph = paragraphs.find(p => p.textContent.includes('Total Completed Today'));
  
  if (todayParagraph) {
    const text = todayParagraph.textContent.replace(/<!--.*?-->/g, '');
    const matches = text.match(/Total Completed Today:\s*(\d+)\s*\(([\d.]+)%\)/);
    
    if (matches && matches.length >= 3) {
      state.todayCompleted.count = parseInt(matches[1]);
      state.todayCompleted.percentage = parseFloat(matches[2]);
    }
  }
}

function updateCompletedTable() {
  elements.completedTableBody.innerHTML = '';
  let weekTotal = 0;

  state.completedData.forEach(day => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatTableDate(day.date)}</td>
      <td>${day.count.toLocaleString()}</td>
      <td>${day.percentage ? day.percentage.toFixed(2) + '%' : ''}</td>
    `;
    elements.completedTableBody.appendChild(row);
    weekTotal += day.count;
  });

  elements.weekTotal.textContent = weekTotal.toLocaleString();
}

function archiveTodaysData() {
  if (state.todayCompleted.count > 0) {
    // Add today's data as yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Remove the oldest day
    if (state.completedData.length >= CONFIG.HISTORY_DAYS) {
      state.completedData.shift();
    }
    
    // Add yesterday's data
    state.completedData.push({
      date: yesterdayStr,
      count: state.todayCompleted.count,
      percentage: state.todayCompleted.percentage
    });
    
    // Reset today's count
    state.todayCompleted.count = 0;
    state.todayCompleted.percentage = 0;
    
    updateUI();
  }
}

function scheduleDailyUpdate() {
  const now = new Date();
  const updateTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    CONFIG.DAILY_UPDATE_HOUR,
    CONFIG.DAILY_UPDATE_MINUTE,
    0
  );

  if (now > updateTime) {
    updateTime.setDate(updateTime.getDate() + 1);
  }

  setTimeout(() => {
    archiveTodaysData();
    scheduleDailyUpdate();
  }, updateTime - now);
  
  elements.nextArchive.textContent = updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Utility functions
function formatTableDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatChartDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(date) {
  return date.toLocaleString();
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updatePendingTotal() {
  elements.totalPending.textContent = state.pendingData.reduce((sum, month) => sum + month.count, 0).toLocaleString();
}

function updateCharts() {
  charts.pending.data.datasets[0].data = state.pendingData.map(m => m.count);
  charts.pending.update();
  
  charts.completed.data.labels = getLast7DaysLabels();
  charts.completed.data.datasets[0].data = getLast7DaysData();
  charts.completed.update();
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

function setupEventListeners() {
  elements.refreshBtn.addEventListener('click', fetchData);
  elements.calculateBtn.addEventListener('click', calculateExpectedDate);
}

function startAutoRefresh() {
  setInterval(fetchData, CONFIG.REFRESH_INTERVAL);
  updateNextRefreshTime();
}

function updateNextRefreshTime() {
  elements.nextRefresh.textContent = `Next refresh: ${formatTime(new Date(Date.now() + CONFIG.REFRESH_INTERVAL))}`;
}

function calculateExpectedDate() {
  try {
    const selectedMonth = elements.monthSelect.value;
    const monthIndex = state.pendingData.findIndex(m => m.month === selectedMonth);
    if (monthIndex === -1) throw new Error("Selected month not found");
    
    const sum = state.pendingData.slice(0, monthIndex + 1).reduce((sum, month) => sum + month.count, 0);
    const weekTotal = parseInt(elements.weekTotal.textContent.replace(/,/g, '')) || 1;
    
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + Math.ceil((sum / weekTotal) * 7));
    
    elements.selectedPending.textContent = sum.toLocaleString();
    elements.completionRate.textContent = weekTotal.toLocaleString();
    elements.expectedDate.textContent = expectedDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    
  } catch (error) {
    console.error("Calculation error:", error);
    elements.expectedDate.textContent = "Error in calculation";
  }
}

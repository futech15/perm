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
  weekTotal: document.getElementById('weekTotal')
};

// Application State with your historical data and today's dynamic data
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
  completedData: [
    { date: '2024-03-25', count: 630, percentage: null },
    { date: '2024-03-26', count: 662, percentage: null },
    { date: '2024-03-27', count: 509, percentage: null },
    { date: '2024-03-28', count: 467, percentage: null },
    { date: '2024-03-29', count: 107, percentage: null },
    { date: '2024-03-30', count: 97, percentage: null },
    { date: '2024-03-31', count: 522, percentage: null }
  ],
  todayCompleted: { count: 0, percentage: 0 } // Today's dynamic data
};

// Chart instances
let charts = {
  pending: null,
  completed: null
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  initializeCharts();
  setupEventListeners();
  await fetchData();
  startAutoRefresh();
  scheduleDailyUpdate();
  updateUI();
});

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

  // Completed Cases Chart (shows historical data + today)
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
    options: {
      ...getChartOptions('Date', 'Cases'),
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw}`;
            }
          }
        }
      }
    }
  });
}

function updateUI() {
  // Initialize with your specified values
  elements.novemberCount.textContent = state.pendingData[0].count.toLocaleString();
  elements.novemberPercent.textContent = `${state.pendingData[0].percentage}%`;
  elements.todayCount.textContent = state.todayCompleted.count;
  elements.todayPercent.textContent = state.todayCompleted.percentage.toFixed(2);
  elements.todayUpdated.textContent = formatDateTime(new Date());
  updatePendingTotal();
  updateCompletedTable();
  updateCharts();
}

// Helper functions for chart data
function getLast7DaysLabels() {
  const today = new Date();
  const dates = [];
  
  // Add historical dates (6 days ago to yesterday)
  for (let i = 6; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(formatChartDate(date));
  }
  
  // Add today's date
  dates.push(formatChartDate(today));
  
  return dates;
}

function getLast7DaysData() {
  const today = new Date().toISOString().split('T')[0];
  const data = [];
  
  // Add historical data (6 days ago to yesterday)
  for (let i = 6; i >= 1; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = state.completedData.find(d => d.date === dateStr);
    data.push(dayData ? dayData.count : 0);
  }
  
  // Add today's count
  data.push(state.todayCompleted.count);
  
  return data;
}

async function fetchData() {
  try {
    elements.refreshBtn.disabled = true;
    elements.pendingStatus.textContent = "Fetching data...";
    elements.novemberCount.textContent = "Updating...";
    elements.novemberPercent.textContent = "Updating...";

    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = encodeURIComponent('https://permtimeline.com/');
    
    const response = await fetch(proxyUrl + targetUrl);
    if (!response.ok) throw new Error(`Network error: ${response.status}`);
    
    const html = await response.text();
    processHtmlData(html);
    
  } catch (error) {
    console.error("Fetch error:", error);
    elements.pendingStatus.textContent = `Error: ${error.message}`;
    elements.novemberCount.textContent = state.pendingData[0].count.toLocaleString();
    elements.novemberPercent.textContent = `${state.pendingData[0].percentage}%`;
  } finally {
    updatePendingTotal();
    updateCharts();
    elements.pendingStatus.textContent = `Last updated: ${formatDateTime(new Date())}`;
    elements.refreshBtn.disabled = false;
    updateNextRefreshTime();
  }
}

function processHtmlData(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  updateNovemberData(doc);
  updateTodaysCompletedCases(doc); // Only updates today's count
}

function updateNovemberData(doc) {
  const possibleSelectors = ['section.timeline-entry', 'div.timeline-section', 'section', 'div'];
  let novemberSection = null;
  
  for (const selector of possibleSelectors) {
    const sections = Array.from(doc.querySelectorAll(selector));
    novemberSection = sections.find(section => {
      const header = section.querySelector('h2, h3') || section;
      return header.textContent.includes('November');
    });
    if (novemberSection) break;
  }
  
  if (novemberSection) {
    const pendingText = novemberSection.textContent;
    const matches = pendingText.match(/Pending Applications:\s*([\d,]+)\s*\(([\d.]+)%\)/);
    
    if (matches && matches.length >= 3) {
      const newCount = parseInt(matches[1].replace(/,/g, ''));
      const newPercent = parseFloat(matches[2]);
      
      state.pendingData[0].count = newCount;
      state.pendingData[0].percentage = newPercent;
      
      elements.novemberCount.textContent = newCount.toLocaleString();
      elements.novemberPercent.textContent = `${newPercent}%`;
      return;
    }
  }
  
  console.warn("November data not found in HTML");
  elements.novemberCount.textContent = state.pendingData[0].count.toLocaleString();
  elements.novemberPercent.textContent = `${state.pendingData[0].percentage}%`;
}

function updateTodaysCompletedCases(doc) {
  const today = new Date().toISOString().split('T')[0];
  const paragraphs = Array.from(doc.querySelectorAll('p'));
  
  for (const p of paragraphs) {
    if (p.textContent.includes('Total Completed Today')) {
      const text = p.textContent.replace(/<!--.*?-->/g, '');
      const matches = text.match(/Total Completed Today:\s*(\d+)\s*\(([\d.]+)%\)/);
      
      if (matches && matches.length >= 3) {
        state.todayCompleted.count = parseInt(matches[1]);
        state.todayCompleted.percentage = parseFloat(matches[2]);
        
        elements.todayCount.textContent = state.todayCompleted.count;
        elements.todayPercent.textContent = state.todayCompleted.percentage.toFixed(2);
        elements.todayUpdated.textContent = formatDateTime(new Date());
        updateCharts();
        return;
      }
    }
  }
  
  console.warn("Today's completed cases not found");
  state.todayCompleted.count = 0;
  state.todayCompleted.percentage = 0;
  elements.todayCount.textContent = "0";
  elements.todayPercent.textContent = "0.00";
}

function updateCompletedTable() {
  const tableBody = document.querySelector('#completedTable tbody');
  tableBody.innerHTML = '';

  const today = new Date().toISOString().split('T')[0];
  let weekTotal = 0;

  // Add historical data
  state.completedData.forEach(day => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatTableDate(day.date)}</td>
      <td>${day.count.toLocaleString()}</td>
      <td>${day.percentage ? day.percentage.toFixed(2) + '%' : ''}</td>
    `;
    tableBody.appendChild(row);
    weekTotal += day.count;
  });

  // Add today's data if it exists
  if (state.todayCompleted.count > 0) {
    const todayRow = document.createElement('tr');
    todayRow.innerHTML = `
      <td>Today</td>
      <td>${state.todayCompleted.count.toLocaleString()}</td>
      <td>${state.todayCompleted.percentage.toFixed(2)}%</td>
    `;
    tableBody.insertBefore(todayRow, tableBody.firstChild);
    weekTotal += state.todayCompleted.count;
  }

  elements.weekTotal.textContent = weekTotal.toLocaleString();
}

function calculateExpectedDate() {
  try {
    const selectedMonth = elements.monthSelect.value;
    const weekTotal = parseInt(elements.weekTotal.textContent.replace(/,/g, '')) || 1;
    
    const monthIndex = state.pendingData.findIndex(m => m.month === selectedMonth);
    if (monthIndex === -1) throw new Error("Selected month not found");
    
    let sum = 0;
    for (let i = 0; i <= monthIndex; i++) {
      sum += state.pendingData[i].count;
    }
    
    elements.selectedPending.textContent = sum.toLocaleString();
    elements.completionRate.textContent = weekTotal.toLocaleString();
    
    const today = new Date();
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() + Math.ceil((sum / weekTotal) * 7));
    
    elements.expectedDate.textContent = expectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
  } catch (error) {
    console.error("Calculation error:", error);
    elements.expectedDate.textContent = "Error in calculation";
    elements.selectedPending.textContent = "0";
    elements.completionRate.textContent = "0";
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

  const timeUntilUpdate = updateTime - now;
  elements.nextArchive.textContent = updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  setTimeout(() => {
    archiveTodaysData();
    scheduleDailyUpdate();
  }, timeUntilUpdate);
}

function archiveTodaysData() {
  if (state.todayCompleted.count > 0) {
    const today = new Date().toISOString().split('T')[0];
    
    // Add today's data to history
    state.completedData.push({
      date: today,
      count: state.todayCompleted.count,
      percentage: state.todayCompleted.percentage
    });
    
    // Remove oldest if needed
    if (state.completedData.length > CONFIG.HISTORY_DAYS) {
      state.completedData.shift();
    }
    
    // Reset today's count
    state.todayCompleted.count = 0;
    state.todayCompleted.percentage = 0;
    elements.todayCount.textContent = "0";
    elements.todayPercent.textContent = "0.00";
    
    updateCompletedTable();
    updateCharts();
  }
}

function updatePendingTotal() {
  const total = state.pendingData.reduce((sum, month) => sum + month.count, 0);
  elements.totalPending.textContent = total.toLocaleString();
}

function updateCharts() {
  charts.pending.data.datasets[0].data = state.pendingData.map(m => m.count);
  charts.pending.update();
  
  charts.completed.data.labels = getLast7DaysLabels();
  charts.completed.data.datasets[0].data = getLast7DaysData();
  charts.completed.update();
}

// Utility functions
function formatTableDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

function getChartOptions(xLabel, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: yLabel
        }
      },
      x: {
        title: {
          display: true,
          text: xLabel
        }
      }
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
  const nextRefresh = new Date(Date.now() + CONFIG.REFRESH_INTERVAL);
  elements.nextRefresh.textContent = `Next refresh: ${formatTime(nextRefresh)}`;
}

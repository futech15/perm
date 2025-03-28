// Configuration Constants
const CONFIG = {
  PROXY_URL: 'https://api.allorigins.win/get?url=https://permtimeline.com/',
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes in milliseconds
  DAILY_UPDATE_TIME: '23:58', // Time to archive today's data (HH:MM)
  DATA_VERSION: '3.0',
  MAX_HISTORY_DAYS: 7 // Keep 7 days of history
};

// Static pending applications data
const STATIC_PENDING_DATA = [
  { month: 'November 2023', count: 6722, percentage: 43.98 },
  { month: 'December 2023', count: 13857, percentage: null },
  { month: 'January 2024', count: 11186, percentage: null },
  { month: 'February 2024', count: 11247, percentage: null },
  { month: 'March 2024', count: 10145, percentage: null },
  { month: 'April 2024', count: 10622, percentage: null },
  { month: 'May 2024', count: 12703, percentage: null }
];

// Initial completed cases history
const INITIAL_HISTORY = [
  { date: '2024-03-21', count: 597, percentage: null },
  { date: '2024-03-22', count: 223, percentage: null },
  { date: '2024-03-23', count: 89, percentage: null },
  { date: '2024-03-24', count: 546, percentage: null },
  { date: '2024-03-25', count: 630, percentage: null },
  { date: '2024-03-26', count: 662, percentage: null },
  { date: '2024-03-27', count: 509, percentage: null }
];

// DOM Elements
const elements = {
  todayCount: document.getElementById('todayCount'),
  todayPercent: document.getElementById('todayPercent'),
  todayUpdated: document.getElementById('todayUpdated'),
  refreshTodayBtn: document.getElementById('refreshTodayBtn'),
  completedTableBody: document.querySelector('#completedTable tbody'),
  weekTotal: document.getElementById('weekTotal'),
  nextRefresh: document.getElementById('nextRefresh'),
  pendingChart: document.getElementById('pendingChart'),
  completedChart: document.getElementById('completedChart')
};

// Application State
let state = {
  today: { count: 0, percentage: 0, updated: null },
  history: [...INITIAL_HISTORY],
  refreshTimer: null,
  dailyUpdateTimer: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  try {
    // Load any saved data
    loadSavedData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize charts
    renderPendingChart();
    renderCompletedChart();
    
    // Start auto-refresh and daily update schedule
    startAutoRefresh();
    scheduleDailyUpdate();
    
    // Fetch today's data immediately
    await fetchTodayData();
    
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Data Management Functions
function loadSavedData() {
  try {
    const savedData = localStorage.getItem('gcTimelineData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      
      // Only use saved data if version matches
      if (parsedData.version === CONFIG.DATA_VERSION) {
        if (parsedData.today) state.today = parsedData.today;
        if (parsedData.history) state.history = parsedData.history;
      }
    }
  } catch (error) {
    console.error('Error loading saved data:', error);
  }
}

function saveData() {
  try {
    const dataToSave = {
      today: state.today,
      history: state.history,
      version: CONFIG.DATA_VERSION,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('gcTimelineData', JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Data Fetching and Processing
async function fetchTodayData() {
  try {
    // Show loading state
    elements.todayUpdated.textContent = 'Loading...';
    elements.refreshTodayBtn.disabled = true;
    
    // Fetch data through proxy
    const response = await fetch(CONFIG.PROXY_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const proxyData = await response.json();
    if (!proxyData.contents) throw new Error('No content received from proxy');
    
    // Parse and process the HTML
    const todayData = processTodayData(proxyData.contents);
    
    // Update application state
    state.today = {
      count: todayData.count,
      percentage: todayData.percentage,
      updated: new Date().toISOString()
    };
    
    // Update UI
    updateTodayDisplay();
    saveData();
    
    // Schedule next refresh
    scheduleNextRefresh();
    
  } catch (error) {
    console.error('Error fetching today data:', error);
    elements.todayUpdated.textContent = 'Error: ' + error.message;
    
  } finally {
    elements.refreshTodayBtn.disabled = false;
  }
}

function processTodayData(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  let completedCount = 0;
  let completedPercentage = 0;
  
  // Find the "Total Completed Today" element
  const completedElements = doc.querySelectorAll('p');
  for (const element of completedElements) {
    if (element.textContent.includes('Total Completed Today')) {
      const matches = element.textContent.match(/Total Completed Today:\s*<!--\s*-->(\d+).*?([\d.]+)%/);
      if (matches) {
        completedCount = parseInt(matches[1]);
        completedPercentage = parseFloat(matches[2]) || 0;
      }
      break;
    }
  }
  
  return {
    count: completedCount,
    percentage: completedPercentage
  };
}

// UI Update Functions
function updateTodayDisplay() {
  elements.todayCount.textContent = state.today.count;
  elements.todayPercent.textContent = state.today.percentage.toFixed(2);
  elements.todayUpdated.textContent = formatDateTime(state.today.updated);
}

function updateHistoryDisplay() {
  // Clear existing rows
  elements.completedTableBody.innerHTML = '';
  
  let weekTotal = 0;
  
  // Add history rows (newest first)
  const displayHistory = [...state.history].reverse();
  displayHistory.forEach(day => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(day.date, true)}</td>
      <td>${day.count}</td>
      <td>${day.percentage ? day.percentage.toFixed(2) + '%' : ''}</td>
    `;
    elements.completedTableBody.appendChild(row);
    weekTotal += day.count;
  });
  
  // Update week total
  elements.weekTotal.textContent = weekTotal.toLocaleString();
  
  // Update chart
  renderCompletedChart();
}

// Chart Functions
function renderPendingChart() {
  if (charts.pending) {
    charts.pending.destroy();
  }
  
  charts.pending = new Chart(elements.pendingChart, {
    type: 'bar',
    data: {
      labels: STATIC_PENDING_DATA.map(item => item.month),
      datasets: [{
        label: 'Pending Applications',
        data: STATIC_PENDING_DATA.map(item => item.count),
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 1
      }]
    },
    options: getChartOptions('Month', 'Number of Applications')
  });
}

function renderCompletedChart() {
  if (charts.completed) {
    charts.completed.destroy();
  }
  
  // Prepare data for chart (newest first)
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

// Timer and Scheduling Functions
function startAutoRefresh() {
  // Clear any existing timer
  if (state.refreshTimer) {
    clearTimeout(state.refreshTimer);
  }
  
  // Schedule next refresh
  state.refreshTimer = setTimeout(() => {
    fetchTodayData();
    startAutoRefresh(); // Continue the cycle
  }, CONFIG.REFRESH_INTERVAL);
  
  // Update next refresh display
  const nextRefreshTime = new Date(Date.now() + CONFIG.REFRESH_INTERVAL);
  elements.nextRefresh.textContent = formatDateTime(nextRefreshTime);
}

function scheduleDailyUpdate() {
  // Clear any existing timer
  if (state.dailyUpdateTimer) {
    clearTimeout(state.dailyUpdateTimer);
  }
  
  // Calculate time until 23:58
  const now = new Date();
  const [targetHour, targetMinute] = CONFIG.DAILY_UPDATE_TIME.split(':').map(Number);
  let targetTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    targetHour,
    targetMinute
  );
  
  // If it's already past 23:58 today, schedule for tomorrow
  if (now > targetTime) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  
  const timeUntilUpdate = targetTime - now;
  
  // Set timer
  state.dailyUpdateTimer = setTimeout(() => {
    archiveTodayData();
    scheduleDailyUpdate(); // Schedule for next day
  }, timeUntilUpdate);
}

function archiveTodayData() {
  // Only archive if we have today's data
  if (state.today.count > 0) {
    const today = new Date().toISOString().split('T')[0];
    
    // Add today's data to history
    state.history.push({
      date: today,
      count: state.today.count,
      percentage: state.today.percentage
    });
    
    // Keep only the most recent 7 days
    if (state.history.length > CONFIG.MAX_HISTORY_DAYS) {
      state.history = state.history.slice(-CONFIG.MAX_HISTORY_DAYS);
    }
    
    // Reset today's count
    state.today = { count: 0, percentage: 0, updated: null };
    
    // Update UI and save
    updateTodayDisplay();
    updateHistoryDisplay();
    saveData();
  }
}

// Utility Functions
function setupEventListeners() {
  elements.refreshTodayBtn.addEventListener('click', fetchTodayData);
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatDate(dateString, short = false) {
  const date = new Date(dateString);
  if (short) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toISOString().split('T')[0];
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

// Initialize charts object
const charts = {
  pending: null,
  completed: null
};

// Initial render
updateTodayDisplay();
updateHistoryDisplay();

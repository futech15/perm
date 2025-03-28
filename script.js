// Configuration Constants
const CONFIG = {
  PROXY_URL: 'https://api.allorigins.win/get?url=https://permtimeline.com/',
  REFRESH_INTERVAL: 60 * 60 * 1000, // 1 hour in milliseconds
  MAX_COMPLETED_DAYS: 60, // Store up to 60 days of completed cases
  DATA_VERSION: '2.1', // Data structure version
  BACKUP_KEYS: ['gcTimelineData', 'gcTimelineData_v1', 'gcTimelineData_backup'] // Possible storage keys
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

// DOM Elements
const elements = {
  pendingTableBody: document.querySelector('#pendingTable tbody'),
  completedTableBody: document.querySelector('#completedTable tbody'),
  totalPending: document.getElementById('totalPending'),
  totalCompleted: document.getElementById('totalCompleted'),
  lastUpdated: document.getElementById('lastUpdated'),
  nextRefresh: document.getElementById('nextRefresh'),
  refreshBtn: document.getElementById('refreshBtn'),
  status: document.getElementById('status')
};

// Chart Instances
let charts = {
  pending: null,
  completed: null
};

// Application State
let state = {
  pending: [...STATIC_PENDING_DATA],
  completed: [],
  lastUpdated: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  try {
    // Attempt to recover any existing data first
    recoverData();
    
    // Set up UI event listeners
    setupEventListeners();
    
    // Render initial data
    renderAllData();
    
    // Fetch new completed cases data and start auto-refresh
    await fetchCompletedData();
    startAutoRefresh();
    
  } catch (error) {
    console.error('Initialization error:', error);
    elements.status.textContent = 'Initialization failed. See console for details.';
  }
}

// Data Management Functions
function recoverData() {
  try {
    // Check all possible storage keys for completed cases data
    for (const key of CONFIG.BACKUP_KEYS) {
      const storedData = localStorage.getItem(key);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        
        // Migrate from old versions if needed
        if (!parsedData.version || parsedData.version === 'v1') {
          state.completed = Array.isArray(parsedData.completed) ? parsedData.completed : [];
          state.lastUpdated = parsedData.lastUpdated || null;
        } else {
          state.completed = parsedData.completed || [];
          state.lastUpdated = parsedData.lastUpdated || null;
        }
        
        // Create backup of recovered data
        createBackup();
        break;
      }
    }
  } catch (error) {
    console.error('Data recovery error:', error);
    // Initialize empty completed cases if recovery fails
    state.completed = [];
  }
}

function saveData() {
  try {
    // Create backup before saving
    createBackup();
    
    // Prepare data for storage (only save completed cases as pending is static)
    const dataToSave = {
      completed: state.completed,
      version: CONFIG.DATA_VERSION,
      lastUpdated: state.lastUpdated,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('gcTimelineData', JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Data save error:', error);
  }
}

function createBackup() {
  try {
    const backupData = {
      completed: state.completed,
      lastUpdated: state.lastUpdated,
      version: CONFIG.DATA_VERSION
    };
    localStorage.setItem('gcTimelineData_backup', JSON.stringify(backupData));
  } catch (error) {
    console.error('Backup creation failed:', error);
  }
}

// Data Fetching and Processing
async function fetchCompletedData() {
  try {
    // Update UI state
    elements.refreshBtn.disabled = true;
    elements.status.textContent = 'Fetching latest completed cases...';
    
    // Fetch data through proxy
    const response = await fetch(CONFIG.PROXY_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const proxyData = await response.json();
    if (!proxyData.contents) throw new Error('No content received from proxy');
    
    // Parse and process the HTML for completed cases
    const completedData = processCompletedData(proxyData.contents);
    
    // Update application state
    updateCompletedState(completedData);
    
    // Save and render
    saveData();
    renderCompletedData();
    renderCompletedChart();
    
    // Update status
    elements.status.textContent = 'Data updated successfully!';
    setTimeout(() => elements.status.textContent = '', 3000);
    
  } catch (error) {
    console.error('Data fetch error:', error);
    elements.status.textContent = `Error: ${error.message}`;
    
  } finally {
    elements.refreshBtn.disabled = false;
    scheduleNextRefresh();
  }
}

function processCompletedData(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // Extract completed cases
  let completedCount = 0;
  let completedPercentage = 0;
  const completedElements = doc.querySelectorAll('p');
  
  for (const element of completedElements) {
    if (element.textContent.includes('Total Completed Today')) {
      const matches = element.textContent.match(/Total Completed Today:\s*<!--\s*-->(\d+).*?([\d.]+)%/);
      if (matches) {
        completedCount = parseInt(matches[1]);
        completedPercentage = matches[2] ? parseFloat(matches[2]) : 0;
      }
      break;
    }
  }
  
  return {
    count: completedCount,
    percentage: completedPercentage
  };
}

function updateCompletedState(newData) {
  // Add today's completed cases if valid
  if (newData.count > 0) {
    const today = new Date().toISOString().split('T')[0];
    const existingIndex = state.completed.findIndex(entry => entry.date === today);
    
    if (existingIndex >= 0) {
      // Update existing entry
      state.completed[existingIndex] = {
        date: today,
        count: newData.count,
        percentage: newData.percentage
      };
    } else {
      // Add new entry
      state.completed.unshift({
        date: today,
        count: newData.count,
        percentage: newData.percentage
      });
      
      // Trim to max allowed days
      if (state.completed.length > CONFIG.MAX_COMPLETED_DAYS) {
        state.completed = state.completed.slice(0, CONFIG.MAX_COMPLETED_DAYS);
      }
    }
  }
  
  state.lastUpdated = new Date().toISOString();
}

// UI Rendering Functions
function renderAllData() {
  renderPendingData();
  renderCompletedData();
  updateLastUpdated();
  renderCharts();
}

function renderPendingData() {
  elements.pendingTableBody.innerHTML = '';
  let totalPending = 0;
  
  state.pending.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.month}</td>
      <td>${item.count.toLocaleString()}</td>
      <td>${item.percentage ? item.percentage + '%' : ''}</td>
    `;
    elements.pendingTableBody.appendChild(row);
    totalPending += item.count;
  });
  
  elements.totalPending.textContent = totalPending.toLocaleString();
}

function renderCompletedData() {
  elements.completedTableBody.innerHTML = '';
  let totalCompleted = 0;
  
  state.completed.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${item.count.toLocaleString()}</td>
      <td>${item.percentage}%</td>
    `;
    elements.completedTableBody.appendChild(row);
    totalCompleted += item.count;
  });
  
  elements.totalCompleted.textContent = totalCompleted.toLocaleString();
}

function renderCharts() {
  renderPendingChart();
  renderCompletedChart();
}

function renderPendingChart() {
  const ctx = document.getElementById('pendingChart').getContext('2d');
  
  if (charts.pending) {
    charts.pending.destroy();
  }
  
  if (state.pending.length > 0) {
    charts.pending = new Chart(ctx, {
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
  }
}

function renderCompletedChart() {
  const ctx = document.getElementById('completedChart').getContext('2d');
  
  if (charts.completed) {
    charts.completed.destroy();
  }
  
  if (state.completed.length > 0) {
    // Show last 30 days for better visibility
    const displayData = [...state.completed].slice(0, 30).reverse();
    
    charts.completed = new Chart(ctx, {
      type: 'line',
      data: {
        labels: displayData.map(item => formatDate(item.date, true)),
        datasets: [{
          label: 'Daily Completed Cases',
          data: displayData.map(item => item.count),
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
}

// Utility Functions
function setupEventListeners() {
  elements.refreshBtn.addEventListener('click', fetchCompletedData);
  
  // Add window event listeners
  window.addEventListener('beforeunload', createBackup);
}

function startAutoRefresh() {
  // Initial fetch already happened, just schedule next
  scheduleNextRefresh();
}

function scheduleNextRefresh() {
  if (state.lastUpdated) {
    const nextRefresh = new Date(new Date(state.lastUpdated).getTime() + CONFIG.REFRESH_INTERVAL);
    elements.nextRefresh.textContent = formatDateTime(nextRefresh);
  }
}

function updateLastUpdated() {
  elements.lastUpdated.textContent = state.lastUpdated ? formatDateTime(state.lastUpdated) : 'Never';
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatDate(dateString, short = false) {
  const date = new Date(dateString);
  return short ? date.toLocaleDateString() : date.toISOString().split('T')[0];
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

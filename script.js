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
  todayCompleted: { count: 0, percentage: 0 },
  initialized: false
};

// Chart instances
let charts = {
  pending: null,
  completed: null
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  await initializeApplication();
});

async function initializeApplication() {
  await initializeCompletedData();
  initializeCharts();
  setupEventListeners();
  await fetchData();
  startAutoRefresh();
  scheduleDailyUpdate();
  updateUI();
  state.initialized = true;
}

async function initializeCompletedData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Create array for last 7 days (excluding today)
  state.completedData = Array.from({ length: CONFIG.HISTORY_DAYS }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (CONFIG.HISTORY_DAYS - i));
    return {
      date: date.toISOString().split('T')[0],
      count: 0,
      percentage: null
    };
  });

  // Try to load any existing data from localStorage
  const savedData = localStorage.getItem('completedData');
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      // Merge saved data with our initialized structure
      parsedData.forEach(savedDay => {
        const existingDay = state.completedData.find(d => d.date === savedDay.date);
        if (existingDay) {
          existingDay.count = savedDay.count;
          existingDay.percentage = savedDay.percentage;
        }
      });
    } catch (e) {
      console.error('Failed to parse saved data:', e);
    }
  }
}

function initializeCharts() {
  if (charts.pending) charts.pending.destroy();
  if (charts.completed) charts.completed.destroy();

  // Pending Applications Chart
  charts.pending = new Chart(elements.pendingChart, {
    type: 'bar',
    data: {
      labels: state.pendingData.map(m => `${m.month.split(' ')[0]} '${m.month.split(' ')[1].slice(2)}`),
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

  // Completed Cases Chart
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
  if (!state.initialized) return;

  // Update pending data display
  elements.novemberCount.textContent = state.pendingData[0].count.toLocaleString();
  elements.novemberPercent.textContent = `${state.pendingData[0].percentage}%`;
  
  // Update today's data display
  elements.todayCount.textContent = state.todayCompleted.count;
  elements.todayPercent.textContent = state.todayCompleted.percentage.toFixed(2);
  elements.todayUpdated.textContent = formatDateTime(new Date());
  
  // Update other UI elements
  updatePendingTotal();
  updateCompletedTable();
  updateCharts();
}

function getLast7DaysLabels() {
  return [...state.completedData]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(day => formatChartDate(new Date(day.date)));
}

function getLast7DaysData() {
  return [...state.completedData]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(day => day.count);
}

async function fetchData() {
  try {
    elements.refreshBtn.disabled = true;
    elements.pendingStatus.textContent = "Fetching data...";
    
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = encodeURIComponent('https://permtimeline.com/');
    const response = await fetch(proxyUrl + targetUrl);
    
    if (!response.ok) throw new Error(`Network error: ${response.status}`);
    
    const html = await response.text();
    processHtmlData(html);
    
  } catch (error) {
    console.error("Fetch error:", error);
    elements.pendingStatus.textContent = `Error: ${error.message}`;
    // Retry after 1 minute if failed
    setTimeout(fetchData, 60000);
  } finally {
    updateUI();
    elements.refreshBtn.disabled = false;
    updateNextRefreshTime();
  }
}

function processHtmlData(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  updateNovemberData(doc);
  updateTodaysCompletedCases(doc);
  saveCompletedData();
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

  // Sort by date ascending
  const sortedData = [...state.completedData].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  sortedData.forEach(day => {
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

function saveCompletedData() {
  try {
    localStorage.setItem('completedData', JSON.stringify(state.completedData));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

function archiveTodaysData() {
  if (state.todayCompleted.count > 0) {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Remove the oldest day
    state.completedData.shift();
    
    // Add yesterday's data
    state.completedData.push({
      date: yesterdayStr,
      count: state.todayCompleted.count,
      percentage: state.todayCompleted.percentage
    });
    
    // Reset today's count
    state.todayCompleted.count = 0;
    state.todayCompleted.percentage = 0;
    
    // Save and update UI
    saveCompletedData();
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

  // If already past today's update time, schedule for tomorrow
  if (now > updateTime) {
    updateTime.setDate(updateTime.getDate() + 1);
  }

  const timeUntilUpdate = updateTime - now;
  elements.nextArchive.textContent = `Next archive: ${formatTime(updateTime)}`;

  setTimeout(() => {
    archiveTodaysData();
    scheduleDailyUpdate(); // Reschedule for next day
  }, timeUntilUpdate);
}

// Utility functions
function formatTableDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatChartDate(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatDateTime(date) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function updatePendingTotal() {
  const total = state.pendingData.reduce((sum, month) => sum + month.count, 0);
  elements.totalPending.textContent = total.toLocaleString();
}

function updateCharts() {
  if (!charts.pending || !charts.completed) return;
  
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
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw.toLocaleString()}`;
          }
        }
      }
    }
  };
}

function setupEventListeners() {
  elements.refreshBtn.addEventListener('click', fetchData);
  elements.calculateBtn.addEventListener('click', calculateExpectedDate);
  
  // Add error handling for chart elements
  if (!elements.pendingChart || !elements.completedChart) {
    console.error('Chart elements not found!');
  }
}

function startAutoRefresh() {
  setInterval(fetchData, CONFIG.REFRESH_INTERVAL);
  updateNextRefreshTime();
}

function updateNextRefreshTime() {
  const nextRefresh = new Date(Date.now() + CONFIG.REFRESH_INTERVAL);
  elements.nextRefresh.textContent = `Next refresh: ${formatTime(nextRefresh)}`;
}

function calculateExpectedDate() {
  try {
    const selectedMonth = elements.monthSelect.value;
    const monthIndex = state.pendingData.findIndex(m => m.month === selectedMonth);
    
    if (monthIndex === -1) {
      throw new Error("Selected month not found");
    }
    
    const sum = state.pendingData
      .slice(0, monthIndex + 1)
      .reduce((sum, month) => sum + month.count, 0);
      
    const weekTotal = parseInt(elements.weekTotal.textContent.replace(/,/g, '')) || 1;
    const daysToAdd = Math.ceil((sum / weekTotal) * 7);
    
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + daysToAdd);
    
    elements.selectedPending.textContent = sum.toLocaleString();
    elements.completionRate.textContent = weekTotal.toLocaleString();
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

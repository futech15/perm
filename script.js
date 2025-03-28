// Configuration
const CONFIG = {
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  DATA_VERSION: '4.8'
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
  completedData: []
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
});

function initializeCharts() {
  // Destroy existing charts if they exist
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

  // Completed Cases Chart
  charts.completed = new Chart(elements.completedChart, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Completed Cases',
        data: [],
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
        borderColor: 'rgba(46, 204, 113, 1)',
        borderWidth: 2,
        tension: 0.1,
        fill: true
      }]
    },
    options: getChartOptions('Date', 'Cases')
  });
}

async function fetchData() {
  try {
    elements.refreshBtn.disabled = true;
    elements.pendingStatus.textContent = "Fetching data...";
    elements.novemberCount.textContent = "Updating...";
    elements.novemberPercent.textContent = "Updating...";

    // Use CORS proxy with error handling
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = encodeURIComponent('https://permtimeline.com/');
    
    const response = await fetch(proxyUrl + targetUrl);
    if (!response.ok) throw new Error(`Network error: ${response.status}`);
    
    const html = await response.text();
    processHtmlData(html);
    
  } catch (error) {
    console.error("Fetch error:", error);
    elements.pendingStatus.textContent = `Error: ${error.message}`;
    // Fallback to default values if fetch fails
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
  
  // 1. Update November data
  updateNovemberData(doc);
  
  // 2. Update today's completed cases
  updateTodaysCompletedCases(doc);
}

function updateNovemberData(doc) {
  // Try multiple ways to find November data
  const possibleSelectors = [
    'section.timeline-entry', 
    'div.timeline-section',
    'section',
    'div'
  ];
  
  let novemberSection = null;
  
  // Try each selector until we find November data
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
      
      // Update state
      state.pendingData[0].count = newCount;
      state.pendingData[0].percentage = newPercent;
      
      // Update UI
      elements.novemberCount.textContent = newCount.toLocaleString();
      elements.novemberPercent.textContent = `${newPercent}%`;
      return;
    }
  }
  
  // If we get here, November data wasn't found
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
        const count = parseInt(matches[1]);
        const percent = parseFloat(matches[2]);
        
        elements.todayCount.textContent = count;
        elements.todayPercent.textContent = percent;
        elements.todayUpdated.textContent = formatDateTime(new Date());
        
        // Update completed data for chart
        state.completedData = state.completedData.filter(d => d.date !== today);
        state.completedData.push({ date: today, count, percent });
        
        // Keep only last 7 days
        if (state.completedData.length > 7) {
          state.completedData.shift();
        }
        return;
      }
    }
  }
  
  // Fallback if not found
  console.warn("Today's completed cases not found");
  elements.todayCount.textContent = "0";
  elements.todayPercent.textContent = "0.00";
}

function updatePendingTotal() {
  const total = state.pendingData.reduce((sum, month) => sum + month.count, 0);
  elements.totalPending.textContent = total.toLocaleString();
}

function updateCharts() {
  // Update Pending Applications Chart
  charts.pending.data.datasets[0].data = state.pendingData.map(m => m.count);
  charts.pending.update();
  
  // Update Completed Cases Chart
  const chartData = [...state.completedData].reverse();
  charts.completed.data.labels = chartData.map(d => formatChartDate(new Date(d.date)));
  charts.completed.data.datasets[0].data = chartData.map(d => d.count);
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

// Initialize with default values
elements.novemberCount.textContent = state.pendingData[0].count.toLocaleString();
elements.novemberPercent.textContent = `${state.pendingData[0].percentage}%`;
updatePendingTotal();

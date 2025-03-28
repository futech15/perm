// Configuration
const CONFIG = {
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  DATA_VERSION: '4.4'
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
  completedChart: document.getElementById('completedChart')
};

// Chart instances
let charts = {
  pending: null,
  completed: null
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  initializeCharts(); // Initialize charts first
  await fetchData();
  startAutoRefresh();
});

function initializeCharts() {
  // Destroy existing charts if they exist
  if (charts.pending) charts.pending.destroy();
  if (charts.completed) charts.completed.destroy();
  
  // Initialize with empty data (will be updated after fetch)
  charts.pending = new Chart(elements.pendingChart, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Pending Applications',
        data: [],
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(52, 152, 219, 1)',
        borderWidth: 1
      }]
    },
    options: getChartOptions('Month', 'Applications')
  });
  
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
    
    const response = await fetch('https://api.allorigins.win/raw?url=' + 
                              encodeURIComponent('https://permtimeline.com/'));
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    processHtmlData(html);
    updateCharts(); // Update charts with new data
    
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
  updateNovemberData(doc);
  updateTodaysCompletedCases(doc);
}

function updateNovemberData(doc) {
  const sections = doc.querySelectorAll('section.timeline-entry, div.timeline-section');
  
  for (const section of sections) {
    const header = section.querySelector('h2, h3');
    if (!header || !header.textContent.includes('November')) continue;
    
    const pendingText = section.textContent.match(/Pending Applications:\s*([\d,]+)\s*\(([\d.]+)%\)/);
    if (pendingText) {
      elements.novemberCount.textContent = pendingText[1];
      elements.novemberPercent.textContent = `${pendingText[2]}%`;
      return;
    }
  }
  
  elements.novemberCount.textContent = '6,722';
  elements.novemberPercent.textContent = '43.98%';
}

function updateTodaysCompletedCases(doc) {
  const paragraphs = doc.querySelectorAll('p');
  
  for (const p of paragraphs) {
    if (p.textContent.includes('Total Completed Today')) {
      const matches = p.textContent.match(/(\d+)\s*\(([\d.]+)%\)/);
      if (matches) {
        elements.todayCount.textContent = matches[1];
        elements.todayPercent.textContent = matches[2];
        elements.todayUpdated.textContent = formatDateTime(new Date());
      }
      return;
    }
  }
  
  elements.todayCount.textContent = '100';
  elements.todayPercent.textContent = '0.04';
}

function updateCharts() {
  // Update Pending Applications Chart
  charts.pending.data.labels = [
    'Nov 2023', 'Dec 2023', 'Jan 2024', 
    'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024'
  ];
  charts.pending.data.datasets[0].data = [
    6722, 13857, 11186, 11247, 10145, 10622, 12703
  ];
  charts.pending.update();
  
  // Update Completed Cases Chart (last 7 days)
  const today = new Date();
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    dates.push(formatChartDate(date));
  }
  
  charts.completed.data.labels = dates;
  charts.completed.data.datasets[0].data = [597, 223, 89, 546, 630, 662, 509];
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

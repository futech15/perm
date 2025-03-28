// Configuration
const CONFIG = {
  PROXY_URL: 'https://api.allorigins.win/get?url=https://permtimeline.com/',
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  DATA_VERSION: '4.1'
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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await fetchData();
  startAutoRefresh();
});

// Data Functions
async function fetchData() {
  try {
    elements.refreshBtn.disabled = true;
    elements.pendingStatus.textContent = "Fetching data...";
    
    const response = await fetch(CONFIG.PROXY_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    if (!data.contents) throw new Error("No content received");
    
    processHtmlData(data.contents);
    elements.pendingStatus.textContent = `Last updated: ${formatDateTime(new Date())}`;
    
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
  
  // 1. Update November's pending data
  updateNovemberData(doc);
  
  // 2. Update today's completed cases
  updateTodaysCompletedCases(doc);
}

function updateNovemberData(doc) {
  const monthSections = doc.querySelectorAll('div.timeline-section, section.timeline-entry');
  
  for (const section of monthSections) {
    const monthHeader = section.querySelector('h2, h3');
    if (!monthHeader) continue;
    
    const monthText = monthHeader.textContent.trim();
    if (!monthText.includes('November 2023')) continue;
    
    const pendingElement = section.querySelector('p:contains("Pending Applications")') || 
                          section.querySelector('p.font-medium');
    if (!pendingElement) continue;
    
    const matches = pendingElement.textContent.match(/Pending Applications:\s*([\d,]+)\s*\(([\d.]+)%\)/);
    if (!matches) continue;
    
    elements.novemberCount.textContent = matches[1];
    elements.novemberPercent.textContent = matches[2] + '%';
    break;
  }
}

function updateTodaysCompletedCases(doc) {
  const completedElements = doc.querySelectorAll('p');
  
  for (const element of completedElements) {
    if (element.textContent.includes('Total Completed Today')) {
      // Fix: Better regex to handle the HTML comment tags
      const matches = element.textContent.match(/Total Completed Today:\s*(?:<!--\s*-->)?(\d+)\s*(?:<!--\s*-->)?\s*\(?\s*(?:<!--\s*-->)?([\d.]+)?/);
      
      if (matches) {
        const count = matches[1] || '0';
        const percent = matches[2] || '0.00';
        
        elements.todayCount.textContent = count;
        elements.todayPercent.textContent = percent;
        elements.todayUpdated.textContent = formatDateTime(new Date());
      }
      break;
    }
  }
}

// Utility Functions
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

// Initialize charts
let pendingChart = new Chart(elements.pendingChart, {
  type: 'bar',
  data: {
    labels: ['Nov 2023', 'Dec 2023', 'Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024'],
    datasets: [{
      label: 'Pending Applications',
      data: [6722, 13857, 11186, 11247, 10145, 10622, 12703],
      backgroundColor: 'rgba(52, 152, 219, 0.7)'
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    }
  }
});

let completedChart = new Chart(elements.completedChart, {
  type: 'line',
  data: {
    labels: ['Mar 21', 'Mar 22', 'Mar 23', 'Mar 24', 'Mar 25', 'Mar 26', 'Mar 27'],
    datasets: [{
      label: 'Completed Cases',
      data: [597, 223, 89, 546, 630, 662, 509],
      borderColor: 'rgba(46, 204, 113, 1)',
      tension: 0.1
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    }
  }
});

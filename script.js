// Configuration
const CONFIG = {
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  DATA_VERSION: '4.6'
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
    { month: 'November 2023', count: 6722, percentage: 43.98 }, // Default values
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
  initializeCharts();
  setupEventListeners();
  await fetchData();
  startAutoRefresh();
});

async function fetchData() {
  try {
    elements.refreshBtn.disabled = true;
    elements.pendingStatus.textContent = "Fetching data...";
    elements.novemberCount.textContent = "Updating...";
    elements.novemberPercent.textContent = "Updating...";
    
    // Using CORS proxy with error handling
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = encodeURIComponent('https://permtimeline.com/');
    
    const response = await fetch(proxyUrl + targetUrl);
    if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
    
    const html = await response.text();
    processHtmlData(html);
    
  } catch (error) {
    console.error("Fetch error:", error);
    elements.pendingStatus.textContent = `Error: ${error.message}`;
    // Fallback to default November values
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
  
  // 1. Find November data
  const sections = Array.from(doc.querySelectorAll('section.timeline-entry, div.timeline-section'));
  const novemberSection = sections.find(section => {
    const header = section.querySelector('h2, h3');
    return header && header.textContent.includes('November');
  });

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
    }
  }

  // 2. Find Today's Completed Cases
  const paragraphs = Array.from(doc.querySelectorAll('p'));
  const completedPara = paragraphs.find(p => p.textContent.includes('Total Completed Today'));
  
  if (completedPara) {
    const text = completedPara.textContent.replace(/<!--.*?-->/g, '');
    const matches = text.match(/Total Completed Today:\s*(\d+)\s*\(([\d.]+)%\)/);
    
    if (matches && matches.length >= 3) {
      const count = parseInt(matches[1]);
      const percent = parseFloat(matches[2]);
      
      elements.todayCount.textContent = count;
      elements.todayPercent.textContent = percent;
      elements.todayUpdated.textContent = formatDateTime(new Date());
      
      // Update completed data for chart
      const today = new Date().toISOString().split('T')[0];
      state.completedData = state.completedData.filter(d => d.date !== today);
      state.completedData.push({ date: today, count, percent });
      
      // Keep only last 7 days
      if (state.completedData.length > 7) {
        state.completedData.shift();
      }
    }
  }
}

function updatePendingTotal() {
  const total = state.pendingData.reduce((sum, month) => sum + month.count, 0);
  elements.totalPending.textContent = total.toLocaleString();
}

// ... (keep all other functions the same as previous version)

// Initialize with default values on first load
elements.novemberCount.textContent = state.pendingData[0].count.toLocaleString();
elements.novemberPercent.textContent = `${state.pendingData[0].percentage}%`;
updatePendingTotal();

// Configuration
const CONFIG = {
  PROXY_URL: 'https://api.allorigins.win/get?url=https://permtimeline.com/',
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  DATA_VERSION: '4.2'
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
  nextRefresh: document.getElementById('nextRefresh')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await fetchData(); // Fetch immediately on load
  startAutoRefresh();
});

async function fetchData() {
  try {
    elements.refreshBtn.disabled = true;
    elements.pendingStatus.textContent = "Fetching data...";
    
    // Use cors-anywhere proxy to avoid CORS issues
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const response = await fetch(proxyUrl + 'https://permtimeline.com/');
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    processHtmlData(html);
    
    elements.pendingStatus.textContent = `Last updated: ${formatDateTime(new Date())}`;
    
  } catch (error) {
    console.error("Fetch error:", error);
    elements.pendingStatus.textContent = `Error: ${error.message}`;
    
    // Fallback: Try the original proxy if cors-anywhere fails
    if (!error.message.includes('cors-anywhere')) {
      await tryFallbackProxy();
    }
  } finally {
    elements.refreshBtn.disabled = false;
    updateNextRefreshTime();
  }
}

async function tryFallbackProxy() {
  try {
    const response = await fetch(CONFIG.PROXY_URL);
    if (!response.ok) throw new Error(`Fallback proxy failed`);
    
    const data = await response.json();
    if (!data.contents) throw new Error("No content from fallback");
    
    processHtmlData(data.contents);
    elements.pendingStatus.textContent = `Last updated: ${formatDateTime(new Date())} (via fallback)`;
    
  } catch (fallbackError) {
    console.error("Fallback failed:", fallbackError);
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
  let novemberUpdated = false;
  const monthSections = doc.querySelectorAll('div.timeline-section, section.timeline-entry');
  
  for (const section of monthSections) {
    const monthHeader = section.querySelector('h2, h3');
    if (!monthHeader) continue;
    
    const monthText = monthHeader.textContent.trim();
    if (!monthText.includes('November 2023')) continue;
    
    const pendingElement = section.querySelector('p:contains("Pending Applications")') || 
                          section.querySelector('p.font-medium');
    if (!pendingElement) continue;
    
    // More robust regex to handle different formats
    const matches = pendingElement.textContent.match(/Pending Applications:\s*([\d,]+)\s*\(?([\d.]+)?%?\)?/);
    if (!matches) continue;
    
    elements.novemberCount.textContent = matches[1] || 'N/A';
    elements.novemberPercent.textContent = matches[2] ? `${matches[2]}%` : 'N/A';
    novemberUpdated = true;
    break;
  }
  
  if (!novemberUpdated) {
    elements.novemberCount.textContent = 'Not found';
    elements.novemberPercent.textContent = 'N/A';
  }
}

function updateTodaysCompletedCases(doc) {
  let casesUpdated = false;
  const completedElements = doc.querySelectorAll('p');
  
  for (const element of completedElements) {
    if (element.textContent.includes('Total Completed Today')) {
      // More robust parsing that handles different HTML formats
      const text = element.textContent.replace(/<!--.*?-->/g, ''); // Remove HTML comments
      const matches = text.match(/Total Completed Today:\s*(\d+)\s*\(?\s*([\d.]+)?\s*%?\s*\)?/);
      
      if (matches) {
        elements.todayCount.textContent = matches[1] || '0';
        elements.todayPercent.textContent = matches[2] ? `${matches[2]}%` : '0.00%';
        elements.todayUpdated.textContent = formatDateTime(new Date());
        casesUpdated = true;
      }
      break;
    }
  }
  
  if (!casesUpdated) {
    elements.todayCount.textContent = '0';
    elements.todayPercent.textContent = '0.00%';
    elements.todayUpdated.textContent = 'Data not found';
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

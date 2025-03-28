// Configuration
const CONFIG = {
  REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  DATA_VERSION: '4.7'
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

        // Use a CORS proxy to fetch data
        const proxyUrl = "https://api.allorigins.win/get?url=";
        const targetUrl = encodeURIComponent("https://permtimeline.com/");
        const response = await fetch(`${proxyUrl}${targetUrl}`);

        if (!response.ok) throw new Error("Failed to fetch data");

        const json = await response.json(); // Extract JSON response
        const html = json.contents; // Get the page HTML

        processHtmlData(html); // Extract data
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



async function fetchWithRetry(url, retries) {
    const proxyUrl = 'https://api.allorigins.win/raw?url='; // Consider replacing with a better proxy
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(proxyUrl + encodeURIComponent(url), { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.text();
        } catch (error) {
            console.warn(`Fetch attempt ${attempt} failed: ${error.message}`);
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
        }
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
  console.log("Parsing fetched HTML...");

  // Log the full HTML response for debugging
  console.log(doc.documentElement.outerHTML);

  // Select sections where data is expected
  const sections = Array.from(doc.querySelectorAll('section, div'));

  // Log found sections
  console.log("Found sections:", sections.length);

  // Look for the one mentioning "November"
  const novemberSection = sections.find(section => 
    section.textContent.includes('November')
  );

  if (!novemberSection) {
    console.warn("November section not found in the fetched data.");
    return;
  }

  console.log("November section found:", novemberSection.textContent);

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

    console.log("Updated November data:", newCount, newPercent);
  } else {
    console.warn("Could not extract November data.");
  }
}



function updateTodaysCompletedCases(doc) {
  const today = new Date().toISOString().split('T')[0];
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
    elements.refreshBtn.addEventListener('click', async () => {
        console.log("Refresh button clicked.");
        await fetchData(); // Ensure this updates immediately
    });
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

// Configuration
const config = {
    proxyUrl: 'https://api.allorigins.win/get?url=https://permtimeline.com/',
    refreshInterval: 60 * 60 * 1000, // 1 hour in milliseconds
    maxCompletedDays: 30 // Keep last 30 days of completed cases
};

// Data storage
let appData = {
    pending: [],
    completed: [],
    lastUpdated: null
};

// DOM elements
const pendingTableBody = document.querySelector('#pendingTable tbody');
const completedTableBody = document.querySelector('#completedTable tbody');
const totalPendingElement = document.getElementById('totalPending');
const totalCompletedElement = document.getElementById('totalCompleted');
const lastUpdatedElement = document.getElementById('lastUpdated');
const nextRefreshElement = document.getElementById('nextRefresh');
const refreshBtn = document.getElementById('refreshBtn');
const statusElement = document.getElementById('status');

// Charts
let pendingChart;
let completedChart;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    fetchData();
    startAutoRefresh();
});

function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchData);
}

function loadData() {
    const savedData = localStorage.getItem('gcTimelineData');
    if (savedData) {
        appData = JSON.parse(savedData);
        renderTables();
        renderCharts();
        updateLastUpdated();
    }
}

function saveData() {
    localStorage.setItem('gcTimelineData', JSON.stringify(appData));
}

async function fetchData() {
    try {
        refreshBtn.disabled = true;
        statusElement.textContent = 'Fetching latest data...';
        
        const response = await fetch(config.proxyUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        if (!data.contents) throw new Error('No content received from proxy');
        
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(data.contents, 'text/html');
        
        // Extract pending applications data with proper month names
        const pendingData = [];
        
        // Find all h3 elements that likely contain month names
        const monthHeaders = htmlDoc.querySelectorAll('h3');
        
        monthHeaders.forEach(header => {
            const monthText = header.textContent.trim();
            if (monthText.match(/(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/)) {
                const pendingElement = header.nextElementSibling;
                if (pendingElement && pendingElement.textContent.includes('Pending Applications')) {
                    const matches = pendingElement.textContent.match(/Pending Applications: ([0-9,]+) \(([0-9.]+)%\)/);
                    if (matches && matches.length === 3) {
                        pendingData.push({
                            month: monthText.replace(':', '').trim(),
                            count: parseInt(matches[1].replace(/,/g, '')),
                            percentage: parseFloat(matches[2])
                        });
                    }
                }
            }
        });
        
        // Extract completed cases
        const completedElements = htmlDoc.querySelectorAll('p');
        let completedCount = 0;
        let completedPercentage = 0;
        
        for (const p of completedElements) {
            if (p.textContent.includes('Total Completed Today')) {
                const matches = p.textContent.match(/Total Completed Today: <!-- -->([0-9]+).*?([0-9.]+)%/);
                if (matches && matches.length >= 2) {
                    completedCount = parseInt(matches[1]);
                    if (matches[2]) {
                        completedPercentage = parseFloat(matches[2]);
                    }
                    break;
                }
            }
        }
        
        // Update app data
        appData.pending = pendingData;
        
        // Add today's completed data if it's new
        const today = new Date().toISOString().split('T')[0];
        const hasTodayData = appData.completed.some(entry => entry.date === today);
        
        if (!hasTodayData && completedCount > 0) {
            appData.completed.unshift({
                date: today,
                count: completedCount,
                percentage: completedPercentage
            });
            
            // Keep only the most recent days
            if (appData.completed.length > config.maxCompletedDays) {
                appData.completed = appData.completed.slice(0, config.maxCompletedDays);
            }
        }
        
        appData.lastUpdated = new Date().toISOString();
        
        saveData();
        renderTables();
        renderCharts();
        updateLastUpdated();
        
        statusElement.textContent = 'Data updated successfully!';
        setTimeout(() => statusElement.textContent = '', 3000);
    } catch (error) {
        console.error('Error fetching data:', error);
        statusElement.textContent = `Error: ${error.message}`;
    } finally {
        refreshBtn.disabled = false;
        scheduleNextRefresh();
    }
}

// ... (rest of the code remains the same as previous version)

function renderTables() {
    // Render pending table
    pendingTableBody.innerHTML = '';
    let totalPending = 0;
    
    appData.pending.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.month}</td>
            <td>${item.count.toLocaleString()}</td>
            <td>${item.percentage}%</td>
        `;
        pendingTableBody.appendChild(row);
        totalPending += item.count;
    });
    
    totalPendingElement.textContent = totalPending.toLocaleString();
    
    // Render completed table
    completedTableBody.innerHTML = '';
    let totalCompleted = 0;
    
    appData.completed.forEach(item => {
        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString();
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${item.count.toLocaleString()}</td>
            <td>${item.percentage}%</td>
        `;
        completedTableBody.appendChild(row);
        totalCompleted += item.count;
    });
    
    totalCompletedElement.textContent = totalCompleted.toLocaleString();
}

function renderCharts() {
    // Pending chart
    const pendingCtx = document.getElementById('pendingChart').getContext('2d');
    
    if (pendingChart) {
        pendingChart.destroy();
    }
    
    if (appData.pending.length > 0) {
        pendingChart = new Chart(pendingCtx, {
            type: 'bar',
            data: {
                labels: appData.pending.map(item => item.month),
                datasets: [{
                    label: 'Pending Applications',
                    data: appData.pending.map(item => item.count),
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Applications'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    }
                }
            }
        });
    }
    
    // Completed chart
    const completedCtx = document.getElementById('completedChart').getContext('2d');
    
    if (completedChart) {
        completedChart.destroy();
    }
    
    if (appData.completed.length > 0) {
        completedChart = new Chart(completedCtx, {
            type: 'line',
            data: {
                labels: appData.completed.map(item => new Date(item.date).toLocaleDateString()),
                datasets: [{
                    label: 'Daily Completed Cases',
                    data: appData.completed.map(item => item.count),
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Cases'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }
}

function updateLastUpdated() {
    if (appData.lastUpdated) {
        const date = new Date(appData.lastUpdated);
        lastUpdatedElement.textContent = date.toLocaleString();
    } else {
        lastUpdatedElement.textContent = 'Never';
    }
}

function startAutoRefresh() {
    fetchData(); // Initial fetch
    setInterval(fetchData, config.refreshInterval);
    scheduleNextRefresh();
}

function scheduleNextRefresh() {
    if (appData.lastUpdated) {
        const nextRefresh = new Date(new Date(appData.lastUpdated).getTime() + config.refreshInterval);
        nextRefreshElement.textContent = new Date(nextRefresh).toLocaleString();
    }
}

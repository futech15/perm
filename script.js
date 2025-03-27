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
const fetchPendingBtn = document.getElementById('fetchPendingBtn');
const clearPendingBtn = document.getElementById('clearPendingBtn');
const fetchCompletedBtn = document.getElementById('fetchCompletedBtn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// Charts
let pendingChart;
let completedChart;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    renderTables();
    renderCharts();
    updateLastUpdated();
});

function setupEventListeners() {
    fetchPendingBtn.addEventListener('click', fetchPendingData);
    clearPendingBtn.addEventListener('click', clearPendingData);
    fetchCompletedBtn.addEventListener('click', fetchCompletedData);
    clearCompletedBtn.addEventListener('click', clearCompletedData);
}

function loadData() {
    const savedData = localStorage.getItem('gcTimelineData');
    if (savedData) {
        appData = JSON.parse(savedData);
    }
}

function saveData() {
    localStorage.setItem('gcTimelineData', JSON.stringify(appData));
}

function updateLastUpdated() {
    if (appData.lastUpdated) {
        const date = new Date(appData.lastUpdated);
        lastUpdatedElement.textContent = date.toLocaleString();
    } else {
        lastUpdatedElement.textContent = 'Never';
    }
}

async function fetchPendingData() {
    try {
        fetchPendingBtn.disabled = true;
        fetchPendingBtn.textContent = 'Fetching...';
        
        // In a real implementation, you would fetch from permtimeline.com
        // This is a mock implementation since we can't actually scrape from GitHub Pages
        const mockData = [
            { month: 'November 2023', count: 7167, percentage: 46.89 },
            { month: 'December 2023', count: 13860, percentage: 95.29 },
            { month: 'January 2024', count: 11189, percentage: 94.23 },
            { month: 'February 2024', count: 11251, percentage: 95.96 },
            { month: 'March 2024', count: 10145, percentage: 96.31 },
            { month: 'April 2024', count: 10622, percentage: 96.35 }
        ];
        
        // Update the data
        appData.pending = mockData;
        appData.lastUpdated = new Date().toISOString();
        
        saveData();
        renderTables();
        renderCharts();
        updateLastUpdated();
        
        alert('Pending data fetched successfully! (Note: This is mock data as actual scraping isn\'t possible from GitHub Pages)');
    } catch (error) {
        console.error('Error fetching pending data:', error);
        alert('Error fetching pending data. See console for details.');
    } finally {
        fetchPendingBtn.disabled = false;
        fetchPendingBtn.textContent = 'Fetch Latest Pending Data';
    }
}

async function fetchCompletedData() {
    try {
        fetchCompletedBtn.disabled = true;
        fetchCompletedBtn.textContent = 'Fetching...';
        
        // In a real implementation, you would fetch from permtimeline.com
        // This is a mock implementation since we can't actually scrape from GitHub Pages
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Check if we already have data for today
        const hasTodayData = appData.completed.some(entry => entry.date === todayStr);
        
        if (hasTodayData) {
            alert('Today\'s data already exists!');
            return;
        }
        
        // Mock data - in a real app this would come from scraping
        const mockCount = Math.floor(Math.random() * 200) + 50; // Random number between 50-250
        const mockPercentage = (Math.random() * 0.2).toFixed(2); // Random percentage 0-0.2
        
        // Add to completed data
        appData.completed.push({
            date: todayStr,
            count: mockCount,
            percentage: mockPercentage
        });
        
        // Sort by date (newest first)
        appData.completed.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        appData.lastUpdated = today.toISOString();
        
        saveData();
        renderTables();
        renderCharts();
        updateLastUpdated();
        
        alert(`Completed data added for today: ${mockCount} cases (${mockPercentage}%) (Note: This is mock data as actual scraping isn't possible from GitHub Pages)`);
    } catch (error) {
        console.error('Error fetching completed data:', error);
        alert('Error fetching completed data. See console for details.');
    } finally {
        fetchCompletedBtn.disabled = false;
        fetchCompletedBtn.textContent = 'Fetch Today\'s Completed';
    }
}

function clearPendingData() {
    if (confirm('Are you sure you want to clear all pending data?')) {
        appData.pending = [];
        appData.lastUpdated = new Date().toISOString();
        saveData();
        renderTables();
        renderCharts();
        updateLastUpdated();
    }
}

function clearCompletedData() {
    if (confirm('Are you sure you want to clear all completed data?')) {
        appData.completed = [];
        appData.lastUpdated = new Date().toISOString();
        saveData();
        renderTables();
        renderCharts();
        updateLastUpdated();
    }
}

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
        // Limit to last 30 days for better visibility
        const recentCompleted = appData.completed.slice(0, 30).reverse();
        
        completedChart = new Chart(completedCtx, {
            type: 'line',
            data: {
                labels: recentCompleted.map(item => new Date(item.date).toLocaleDateString()),
                datasets: [{
                    label: 'Daily Completed Cases',
                    data: recentCompleted.map(item => item.count),
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

// Auto-fetch completed data at 23:58 daily
function scheduleDailyFetch() {
    const now = new Date();
    const targetTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 58, 0
    );
    
    let timeUntilFetch = targetTime - now;
    
    // If it's already past 23:58, schedule for tomorrow
    if (timeUntilFetch < 0) {
        timeUntilFetch += 24 * 60 * 60 * 1000; // Add 24 hours
    }
    
    setTimeout(() => {
        fetchCompletedData();
        // Schedule again for the next day
        scheduleDailyFetch();
    }, timeUntilFetch);
}

// Start the daily scheduler
scheduleDailyFetch();

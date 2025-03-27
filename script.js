// Data storage
let appData = {
    pending: [
        { month: 'November 2023', count: 7167, percentage: 46.89 },
        { month: 'December 2023', count: 13860, percentage: 95.29 },
        { month: 'January 2024', count: 11189, percentage: 94.23 },
        { month: 'February 2024', count: 11251, percentage: 95.96 },
        { month: 'March 2024', count: 10145, percentage: 96.31 },
        { month: 'April 2024', count: 10622, percentage: 96.35 }
    ],
    completed: [],
    lastUpdated: null
};

// DOM elements
const pendingTableBody = document.querySelector('#pendingTable tbody');
const completedTableBody = document.querySelector('#completedTable tbody');
const totalPendingElement = document.getElementById('totalPending');
const totalCompletedElement = document.getElementById('totalCompleted');
const lastUpdatedElement = document.getElementById('lastUpdated');
const addPendingBtn = document.getElementById('addPendingBtn');
const clearPendingBtn = document.getElementById('clearPendingBtn');
const addCompletedBtn = document.getElementById('addCompletedBtn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const modal = document.getElementById('dataModal');
const closeBtn = document.querySelector('.close');
const modalTitle = document.getElementById('modalTitle');
const dataForm = document.getElementById('dataForm');
const monthField = document.getElementById('monthField');
const dateField = document.getElementById('dateField');
const monthInput = document.getElementById('month');
const dateInput = document.getElementById('date');
const countInput = document.getElementById('count');
const percentageInput = document.getElementById('percentage');

// Charts
let pendingChart;
let completedChart;

// Track whether we're adding pending or completed data
let currentDataType = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    renderTables();
    renderCharts();
    updateLastUpdated();
});

function setupEventListeners() {
    addPendingBtn.addEventListener('click', () => openModal('pending'));
    clearPendingBtn.addEventListener('click', clearPendingData);
    addCompletedBtn.addEventListener('click', () => openModal('completed'));
    clearCompletedBtn.addEventListener('click', clearCompletedData);
    closeBtn.addEventListener('click', closeModal);
    dataForm.addEventListener('submit', saveData);
}

function openModal(dataType) {
    currentDataType = dataType;
    
    if (dataType === 'pending') {
        modalTitle.textContent = 'Add Pending Data';
        monthField.style.display = 'block';
        dateField.style.display = 'none';
    } else {
        modalTitle.textContent = 'Add Completed Data';
        monthField.style.display = 'none';
        dateField.style.display = 'block';
        dateInput.valueAsDate = new Date();
    }
    
    // Clear form
    monthInput.value = '';
    countInput.value = '';
    percentageInput.value = '';
    
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
}

function saveData(e) {
    e.preventDefault();
    
    const count = parseInt(countInput.value);
    const percentage = parseFloat(percentageInput.value);
    
    if (currentDataType === 'pending') {
        const month = monthInput.value;
        appData.pending.push({ month, count, percentage });
    } else {
        const date = dateInput.value;
        appData.completed.push({ date, count, percentage });
        // Sort by date (newest first)
        appData.completed.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    appData.lastUpdated = new Date().toISOString();
    
    saveToLocalStorage();
    renderTables();
    renderCharts();
    updateLastUpdated();
    closeModal();
}

function loadData() {
    const savedData = localStorage.getItem('gcTimelineData');
    if (savedData) {
        appData = JSON.parse(savedData);
    }
}

function saveToLocalStorage() {
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

function clearPendingData() {
    if (confirm('Are you sure you want to clear all pending data?')) {
        appData.pending = [];
        appData.lastUpdated = new Date().toISOString();
        saveToLocalStorage();
        renderTables();
        renderCharts();
        updateLastUpdated();
    }
}

function clearCompletedData() {
    if (confirm('Are you sure you want to clear all completed data?')) {
        appData.completed = [];
        appData.lastUpdated = new Date().toISOString();
        saveToLocalStorage();
        renderTables();
        renderCharts();
        updateLastUpdated();
    }
}

function renderTables() {
    // Render pending table
    pendingTableBody.innerHTML = '';
    let totalPending = 0;
    
    appData.pending.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.month}</td>
            <td>${item.count.toLocaleString()}</td>
            <td>${item.percentage}%</td>
            <td><button class="action-btn" data-index="${index}" data-type="pending">Delete</button></td>
        `;
        pendingTableBody.appendChild(row);
        totalPending += item.count;
    });
    
    totalPendingElement.textContent = totalPending.toLocaleString();
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.action-btn[data-type="pending"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            appData.pending.splice(index, 1);
            saveToLocalStorage();
            renderTables();
            renderCharts();
        });
    });
    
    // Render completed table
    completedTableBody.innerHTML = '';
    let totalCompleted = 0;
    
    appData.completed.forEach((item, index) => {
        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString();
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${item.count.toLocaleString()}</td>
            <td>${item.percentage}%</td>
            <td><button class="action-btn" data-index="${index}" data-type="completed">Delete</button></td>
        `;
        completedTableBody.appendChild(row);
        totalCompleted += item.count;
    });
    
    totalCompletedElement.textContent = totalCompleted.toLocaleString();
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.action-btn[data-type="completed"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            appData.completed.splice(index, 1);
            saveToLocalStorage();
            renderTables();
            renderCharts();
        });
    });
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
        const recentCompleted = [...appData.completed].reverse().slice(0, 30);
        
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

// Close modal when clicking outside of it
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

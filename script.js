// Configuration
const config = {
    proxyUrl: 'https://api.allorigins.win/get?url=https://permtimeline.com/',
    refreshInterval: 60 * 60 * 1000, // 1 hour
    maxCompletedDays: 30
};

// Data storage
let appData = {
    pending: [],
    completed: [],
    lastUpdated: null
};

// DOM elements
const refreshBtn = document.getElementById('refresh-btn');
const statusElement = document.getElementById('status');
const lastUpdatedElement = document.getElementById('last-updated');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    loadData();
    await fetchData();
    startAutoRefresh();
}

function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchData);
}

function loadData() {
    const savedData = localStorage.getItem('appData');
    if (savedData) {
        appData = JSON.parse(savedData);
        renderTables();
    }
}

function saveData() {
    localStorage.setItem('appData', JSON.stringify(appData));
}

async function fetchData() {
    try {
        refreshBtn.disabled = true;
        statusElement.textContent = 'Fetching latest data...';

        const response = await fetch(config.proxyUrl);
        if (!response.ok) throw new Error('Network error');

        const data = await response.json();
        if (!data.contents) throw new Error('No content received');

        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(data.contents, 'text/html');

        // Improved parsing for pending applications
        const allTextNodes = Array.from(htmlDoc.querySelectorAll('*'))
            .filter(el => el.innerText && el.innerText.trim().length > 0);

        const pendingData = [];
        const monthMap = {
            "November 2023": "nov", "December 2023": "dec", "January 2024": "jan",
            "February 2024": "feb", "March 2024": "mar", "April 2024": "apr", "May 2024": "may"
        };

        Object.keys(monthMap).forEach(month => {
            const monthIndex = allTextNodes.findIndex(el => 
                el.innerText.includes(`Submission Month: ${month}`)
            );
            if (monthIndex !== -1) {
                for (let i = monthIndex + 1; i < Math.min(monthIndex + 15, allTextNodes.length); i++) {
                    const text = allTextNodes[i].innerText;
                    if (text.includes("Pending Applications") && !text.includes("173,427")) {
                        const matches = text.match(/Pending Applications: ([0-9,]+) \(([0-9.]+)%\)/);
                        if (matches) {
                            pendingData.push({
                                month: month,
                                count: parseInt(matches[1].replace(/,/g, '')),
                                percentage: parseFloat(matches[2])
                            });
                            break;
                        }
                    }
                }
            }
        });

        // Extract completed cases
        let completedCount = 0;
        let completedPercentage = 0;
        const completedText = allTextNodes.find(el => el.innerText.includes("Total Completed Today"));
        if (completedText) {
            const matches = completedText.innerText.match(/Total Completed Today:.*?([0-9]+).*?([0-9.]+)%/);
            if (matches) {
                completedCount = parseInt(matches[1]);
                completedPercentage = matches[2] ? parseFloat(matches[2]) : 0;
            }
        }

        // Update app data
        appData.pending = pendingData;
        const today = new Date().toISOString().split('T')[0];
        if (!appData.completed.some(entry => entry.date === today) && completedCount > 0) {
            appData.completed.unshift({
                date: today,
                count: completedCount,
                percentage: completedPercentage
            });
            if (appData.completed.length > config.maxCompletedDays) {
                appData.completed = appData.completed.slice(0, config.maxCompletedDays);
            }
        }

        appData.lastUpdated = new Date().toISOString();
        saveData();
        renderTables();
        statusElement.textContent = 'Data updated successfully!';
        setTimeout(() => statusElement.textContent = '', 3000);
    } catch (error) {
        console.error('Fetch error:', error);
        statusElement.textContent = `Error: ${error.message}`;
    } finally {
        refreshBtn.disabled = false;
    }
}

function renderTables() {
    const monthMap = {
        "November 2023": "nov", "December 2023": "dec", "January 2024": "jan",
        "February 2024": "feb", "March 2024": "mar", "April 2024": "apr", "May 2024": "may"
    };

    let totalPending = 0;
    Object.keys(monthMap).forEach(month => {
        const data = appData.pending.find(p => p.month === month);
        const countEl = document.getElementById(`pending-${monthMap[month]}`);
        const percentEl = document.getElementById(`percent-${monthMap[month]}`);
        if (data) {
            countEl.textContent = data.count.toLocaleString();
            percentEl.textContent = `${data.percentage}%`;
            totalPending += data.count;
        } else {
            countEl.textContent = "Not Found";
            percentEl.textContent = "";
        }
    });
    document.getElementById('total-pending').textContent = totalPending.toLocaleString();

    const dailyBody = document.getElementById('daily-data');
    dailyBody.innerHTML = '';
    appData.completed.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.count.toLocaleString()}</td>
            <td>${entry.percentage}%</td>
        `;
        dailyBody.appendChild(row);
    });

    updateLastUpdated();
}

function updateLastUpdated() {
    lastUpdatedElement.textContent = appData.lastUpdated 
        ? new Date(appData.lastUpdated).toLocaleString() 
        : 'Never';
}

function startAutoRefresh() {
    setInterval(fetchData, config.refreshInterval);
}

// Fallback static data (optional, update with Puppeteer results)
/*
const staticData = {
    pending: [
        { month: "November 2023", count: 7110, percentage: 46.51 },
        { month: "December 2023", count: 13860, percentage: 68.29 },
        { month: "January 2024", count: 11189, percentage: 65.43 },
        { month: "February 2024", count: 11251, percentage: 63.21 },
        { month: "March 2024", count: 10145, percentage: 61.87 },
        { month: "April 2024", count: 10622, percentage: 62.34 },
        { month: "May 2024", count: 12705, percentage: 64.12 }
    ],
    completed: []
};
*/

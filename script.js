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

// DOM elements and charts (same as before)

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    loadData();
    await fetchData();
    startAutoRefresh();
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
        
        // NEW IMPROVED PARSING LOGIC
        const pendingData = [];
        
        // Find all timeline entries
        const timelineSections = htmlDoc.querySelectorAll('div.timeline-section');
        
        timelineSections.forEach(section => {
            const monthHeader = section.querySelector('h3');
            if (!monthHeader) return;
            
            const monthText = monthHeader.textContent.trim();
            if (!monthText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i)) {
                return;
            }
            
            const pendingElement = section.querySelector('p.font-medium');
            if (!pendingElement || !pendingElement.textContent.includes('Pending Applications')) {
                return;
            }
            
            const matches = pendingElement.textContent.match(/Pending Applications: ([0-9,]+) \(([0-9.]+)%\)/);
            if (!matches || matches.length < 3) return;
            
            pendingData.push({
                month: monthText.replace(':', '').trim(),
                count: parseInt(matches[1].replace(/,/g, '')),
                percentage: parseFloat(matches[2])
            });
        });
        
        // Extract completed cases (same as before)
        let completedCount = 0;
        let completedPercentage = 0;
        const completedText = Array.from(htmlDoc.querySelectorAll('p'))
            .find(p => p.textContent.includes('Total Completed Today'));
        
        if (completedText) {
            const matches = completedText.textContent.match(/Total Completed Today: <!-- -->([0-9]+).*?([0-9.]+)%/);
            if (matches) {
                completedCount = parseInt(matches[1]);
                if (matches[2]) completedPercentage = parseFloat(matches[2]);
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
        renderCharts();
        updateLastUpdated();
        
        statusElement.textContent = 'Data updated successfully!';
        setTimeout(() => statusElement.textContent = '', 3000);
    } catch (error) {
        console.error('Fetch error:', error);
        statusElement.textContent = `Error: ${error.message}`;
    } finally {
        refreshBtn.disabled = false;
        scheduleNextRefresh();
    }
}

// Rest of your existing functions (renderTables, renderCharts, etc.) remain the same

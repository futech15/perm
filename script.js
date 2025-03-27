const proxyUrl = 'https://api.allorigins.win/get?url=https://permtimeline.com/';

function fetchData() {
    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(data.contents, 'text/html');

            // Select all paragraphs with class "font-medium"
            const elements = doc.querySelectorAll("p.font-medium");

            const monthMap = {
                "November 2023": "nov",
                "December 2023": "dec",
                "January 2024": "jan",
                "February 2024": "feb",
                "March 2024": "mar",
                "April 2024": "apr",
                "May 2024": "may"
            };

            let totalPending = 0;

            elements.forEach(el => {
                // Extract month and pending applications count
                let match = el.innerText.match(/(November|December|January|February|March|April|May)\s+\d{4}.*?Pending Applications:\s+([\d,]+)/i);
                
                if (match) {
                    let monthName = `${match[1]} 2023`; // Adjust year dynamically if needed
                    let pendingCount = parseInt(match[2].replace(/,/g, ''));

                    if (monthMap[monthName]) {
                        let monthKey = monthMap[monthName];
                        document.getElementById(`pending-${monthKey}`).innerText = pendingCount.toLocaleString();
                        totalPending += pendingCount;
                    }
                }
            });

            // Update total pending count
            document.getElementById("total-pending").innerText = totalPending.toLocaleString();

            // Extract "Total Completed Today" value
            const completedElement = Array.from(doc.querySelectorAll("p"))
                .find(p => p.innerText.includes("Total Completed Today"));

            if (completedElement) {
                let completedCount = completedElement.innerText.match(/\d+/)?.[0];
                saveDailyChange(completedCount);
            }
        })
        .catch(error => console.error("Error fetching data:", error));
}

function saveDailyChange(count) {
    let today = new Date().toLocaleDateString();
    let savedData = JSON.parse(localStorage.getItem("dailyChanges")) || [];

    if (!savedData.some(entry => entry.date === today)) {
        savedData.push({ date: today, count: count });
        localStorage.setItem("dailyChanges", JSON.stringify(savedData));
    }

    updateDailyTable(savedData);
}

function updateDailyTable(data) {
    let tableBody = document.getElementById("daily-data");
    tableBody.innerHTML = "";

    data.forEach(entry => {
        let row = document.createElement("tr");
        row.innerHTML = `<td>${entry.date}</td><td>${entry.count}</td>`;
        tableBody.appendChild(row);
    });
}

fetchData();

// Auto-refresh at 23:58
setInterval(() => {
    let now = new Date();
    if (now.getHours() === 23 && now.getMinutes() === 58) {
        fetchData();
    }
}, 60000);

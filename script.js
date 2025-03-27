const proxyUrl = 'https://api.allorigins.win/get?url=https://permtimeline.com/';

function fetchData() {
    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(data.contents, 'text/html');

            // Get Pending Applications
            const monthMap = {
                "nov": "November 2023",
                "dec": "December 2023",
                "jan": "January 2024",
                "feb": "February 2024",
                "mar": "March 2024",
                "apr": "April 2024",
                "may": "May 2024"
            };
            let totalPending = 0;

            // Get all p.font-medium elements
            const pendingElements = Array.from(doc.querySelectorAll("p.font-medium"))
                .filter(p => p.innerText.includes("Pending Applications"));

            Object.keys(monthMap).forEach(month => {
                // Find the element that matches the month by checking the preceding text or structure
                const monthText = monthMap[month];
                const element = pendingElements.find(p => {
                    const prevSibling = p.previousElementSibling;
                    return prevSibling && prevSibling.innerText.includes(monthText) ||
                           p.innerText.includes(monthText);
                });

                if (element) {
                    const value = element.innerText.match(/\d{1,}(?:,\d{3})*/);
                    if (value) {
                        let pendingCount = parseInt(value[0].replace(/,/g, ''));
                        document.getElementById(`pending-${month}`).innerText = pendingCount.toLocaleString();
                        totalPending += pendingCount;
                    } else {
                        document.getElementById(`pending-${month}`).innerText = "Not Found";
                    }
                } else {
                    document.getElementById(`pending-${month}`).innerText = "Not Found";
                }
            });

            // Update total pending
            document.getElementById("total-pending").innerText = totalPending.toLocaleString();

            // Get Total Completed Today
            let completedElement = Array.from(doc.querySelectorAll("p")).find(p => 
                p.innerText.includes("Total Completed Today")
            );
            if (completedElement) {
                let completedCount = completedElement.innerText.match(/\d+/)?.[0];
                saveDailyChange(completedCount);
            }
        })
        .catch(error => console.error("Error fetching data:", error));
}

// Save daily change at 11:58 PM
function saveDailyChange(count) {
    let today = new Date().toLocaleDateString();
    let savedData = JSON.parse(localStorage.getItem("dailyChanges")) || [];

    // Prevent duplicate entries for today
    if (!savedData.some(entry => entry.date === today)) {
        savedData.push({ date: today, count: count });
        localStorage.setItem("dailyChanges", JSON.stringify(savedData));
    }

    updateDailyTable(savedData);
}

// Update Daily Completed Table
function updateDailyTable(data) {
    let tableBody = document.getElementById("daily-data");
    tableBody.innerHTML = "";

    data.forEach(entry => {
        let row = document.createElement("tr");
        row.innerHTML = `<td>${entry.date}</td><td>${entry.count}</td>`;
        tableBody.appendChild(row);
    });
}

// Auto-fetch data on page load
fetchData();

// Set an interval to update at 11:58 PM daily
setInterval(() => {
    let now = new Date();
    if (now.getHours() === 23 && now.getMinutes() === 58) {
        fetchData();
    }
}, 60000); // Check every minute

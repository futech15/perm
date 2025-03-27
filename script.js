const proxyUrl = 'https://api.allorigins.win/get?url=https://permtimeline.com/';

function fetchData() {
    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(data.contents, 'text/html');

            // Get Pending Applications
            let months = [
                { id: "nov", name: "November 2023" },
                { id: "dec", name: "December 2023" },
                { id: "jan", name: "January 2024" },
                { id: "feb", name: "February 2024" },
                { id: "mar", name: "March 2024" },
                { id: "apr", name: "April 2024" },
                { id: "may", name: "May 2024" }
            ];
            
            let totalPending = 0;

            months.forEach(month => {
                // Find the paragraph that contains both the month name and "Pending Applications"
                let elements = Array.from(doc.querySelectorAll("p.font-medium"));
                let element = elements.find(p => 
                    p.textContent.includes(month.name) && 
                    p.textContent.includes("Pending Applications")
                );
                
                if (element) {
                    let value = element.textContent.match(/\d{1,3}(?:,\d{3})*/);
                    if (value) {
                        let pendingCount = parseInt(value[0].replace(/,/g, ''));
                        document.getElementById(`pending-${month.id}`).innerText = pendingCount.toLocaleString();
                        totalPending += pendingCount;
                    } else {
                        document.getElementById(`pending-${month.id}`).innerText = "Not Found";
                    }
                } else {
                    document.getElementById(`pending-${month.id}`).innerText = "Not Found";
                }
            });

            // Update total pending
            document.getElementById("total-pending").innerText = totalPending.toLocaleString();

            // Get Total Completed Today
            let completedElement = Array.from(doc.querySelectorAll("p")).find(p => p.innerText.includes("Total Completed Today"));
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

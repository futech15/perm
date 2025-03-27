const proxyUrl = 'https://api.allorigins.win/get?url=https://permtimeline.com/';

function fetchData() {
    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(data.contents, 'text/html');

            // Month configuration with exact selectors
            const monthData = [
                { id: "nov", name: "November 2023" },
                { id: "dec", name: "December 2023" },
                { id: "jan", name: "January 2024" },
                { id: "feb", name: "February 2024" },
                { id: "mar", name: "March 2024" },
                { id: "apr", name: "April 2024" },
                { id: "may", name: "May 2024" }
            ];

            let totalPending = 0;

            monthData.forEach(month => {
                // Find element containing both month name and "Pending Applications"
                const elements = Array.from(doc.querySelectorAll('p.font-medium'));
                const element = elements.find(el => 
                    el.textContent.includes(month.name) && 
                    el.textContent.includes("Pending Applications")
                );

                if (element) {
                    const match = element.textContent.match(/Pending Applications:\s*([\d,]+)/);
                    if (match && match[1]) {
                        const pendingCount = parseInt(match[1].replace(/,/g, ''));
                        document.getElementById(`pending-${month.id}`).textContent = pendingCount.toLocaleString();
                        totalPending += pendingCount;
                    } else {
                        document.getElementById(`pending-${month.id}`).textContent = "Format error";
                    }
                } else {
                    document.getElementById(`pending-${month.id}`).textContent = "Not found";
                }
            });

            document.getElementById("total-pending").textContent = totalPending.toLocaleString();

            // Get Total Completed Today
            const completedElement = Array.from(doc.querySelectorAll("p.font-medium"))
                .find(p => p.textContent.includes("Total Completed Today"));
            if (completedElement) {
                const completedCount = completedElement.textContent.match(/\d+/)?.[0];
                saveDailyChange(completedCount);
            }
        })
        .catch(error => {
            console.error("Error fetching data:", error);
            // Mark all fields as error
            document.querySelectorAll("[id^='pending-']").forEach(el => {
                el.textContent = "Fetch error";
            });
        });
}

// Rest of your functions remain the same
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

// Initial fetch
fetchData();

// Set interval for daily refresh
setInterval(() => {
    let now = new Date();
    if (now.getHours() === 23 && now.getMinutes() === 58) {
        fetchData();
    }
}, 60000);

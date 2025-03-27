const proxyUrl = 'https://api.allorigins.win/get?url=https://permtimeline.com/';

function fetchData() {
    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(data.contents, 'text/html');

            console.log("Fetched HTML Content:\n", data.contents); // Debug: Print entire fetched HTML

            // Select all relevant paragraphs
            const elements = doc.querySelectorAll("p.font-medium");

            console.log("Extracted Elements Count:", elements.length); // Debug: How many elements were found?
            elements.forEach(el => console.log("Element Text:", el.innerText)); // Debug: Print all extracted text

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
                let text = el.innerText.trim();

                // Match lines containing "Pending Applications"
                let match = text.match(/(November|December|January|February|March|April|May)\s+\d{4}.*?Pending Applications:\s*([\d,]+)/i);
                
                if (match) {
                    let monthName = `${match[1]} 2023`; // Adjust dynamically if needed
                    let pendingCount = parseInt(match[2].replace(/,/g, ''), 10);

                    console.log(`Assigned ${monthName}: ${pendingCount}`); // Debug: See exact assigned values

                    if (monthMap[monthName]) {
                        let monthKey = monthMap[monthName];
                        document.getElementById(`pending-${monthKey}`).innerText = pendingCount.toLocaleString();
                        totalPending += pendingCount;
                    }
                } else {
                    console.warn("No match found for:", text); // Debug: Identify any missed elements
                }
            });

            // Update total pending count
            document.getElementById("total-pending").innerText = totalPending.toLocaleString();
        })
        .catch(error => console.error("Error fetching data:", error));
}

fetchData();



// Save daily change at 11:58 PM
function saveDailyChange(count) {
    let today = new Date().toLocaleDateString();
    let savedData = JSON.parse(localStorage.getItem("dailyChanges")) || [];

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
}, 60000);

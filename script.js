function fetchData() {
    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(data.contents, 'text/html');

            const allTextNodes = Array.from(doc.querySelectorAll("*"))
                .filter(el => el.innerText && el.innerText.trim().length > 0);

            const pendingElements = allTextNodes.filter(el => 
                el.innerText.includes("Pending Applications") && 
                !el.innerText.includes("173,427")
            );
            console.log("Pending Applications found:", pendingElements.map(el => el.innerText));

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

            Object.keys(monthMap).forEach((month, index) => {
                let pendingCount = null;

                if (index < pendingElements.length) {
                    const value = pendingElements[index].innerText.match(/\d{1,}(?:,\d{3})*/);
                    if (value) {
                        pendingCount = parseInt(value[0].replace(/,/g, ''));
                        console.log(Assigned ${monthMap[month]}:, pendingCount);
                    }
                }

                if (pendingCount !== null) {
                    document.getElementById(pending-${month}).innerText = pendingCount.toLocaleString();
                    totalPending += pendingCount;
                } else {
                    document.getElementById(pending-${month}).innerText = "Not Found";
                }
            });

            document.getElementById("total-pending").innerText = totalPending.toLocaleString();

            const completedElement = allTextNodes.find(el => el.innerText.includes("Total Completed Today"));
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
        row.innerHTML = <td>${entry.date}</td><td>${entry.count}</td>;
        tableBody.appendChild(row);
    });
}

fetchData();

setInterval(() => {
    let now = new Date();
    if (now.getHours() === 23 && now.getMinutes() === 58) {
        fetchData();
    }
}, 60000);

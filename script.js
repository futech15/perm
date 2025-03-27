const proxyUrl = 'https://api.allorigins.win/get?url=https://permtimeline.com/';

// Month configuration with exact matching patterns
const MONTHS = [
  { id: "nov", pattern: "November 2023: Pending Applications: " },
  { id: "dec", pattern: "December 2023: Pending Applications: " },
  { id: "jan", pattern: "January 2024: Pending Applications: " },
  { id: "feb", pattern: "February 2024: Pending Applications: " },
  { id: "mar", pattern: "March 2024: Pending Applications: " },
  { id: "apr", pattern: "April 2024: Pending Applications: " },
  { id: "may", pattern: "May 2024: Pending Applications: " }
];

function fetchData() {
  fetch(proxyUrl)
    .then(response => response.json())
    .then(data => {
      const rawText = data.contents;
      console.log("Raw text sample:", rawText.substring(0, 500)); // Debugging

      let totalPending = 0;

      MONTHS.forEach(month => {
        const startIdx = rawText.indexOf(month.pattern);
        if (startIdx !== -1) {
          const valueStart = startIdx + month.pattern.length;
          const valueEnd = rawText.indexOf(" ", valueStart);
          const numberText = rawText.substring(valueStart, valueEnd);
          const number = parseInt(numberText.replace(/,/g, ''));

          if (!isNaN(number)) {
            document.getElementById(`pending-${month.id}`).textContent = number.toLocaleString();
            totalPending += number;
          } else {
            document.getElementById(`pending-${month.id}`).textContent = "Invalid number";
          }
        } else {
          document.getElementById(`pending-${month.id}`).textContent = "Pattern not found";
        }
      });

      document.getElementById("total-pending").textContent = totalPending.toLocaleString();

      // Extract daily completed
      const dailyStart = rawText.indexOf("Total Completed Today: ");
      if (dailyStart !== -1) {
        const valueStart = dailyStart + "Total Completed Today: ".length;
        const valueEnd = rawText.indexOf(" ", valueStart);
        const dailyValue = rawText.substring(valueStart, valueEnd);
        saveDailyChange(dailyValue);
      }
    })
    .catch(error => {
      console.error("Fetch error:", error);
      document.querySelectorAll("[id^='pending-']").forEach(el => {
        el.textContent = "Connection error";
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

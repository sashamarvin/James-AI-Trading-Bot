ALPHA_VANTAGE_API_KEY = "POBA29NG9DZ4L9ZA"

document.addEventListener("DOMContentLoaded", function () {
  const fetchButton = document.getElementById("fetchStockButton");
  //const fetchInput = document.getElementById("fetchStockInput");
  const fetchInput = document.getElementById("stockInput"); 

  fetchButton.addEventListener("click", async function () {
      const newTicker = fetchInput.value.trim().toUpperCase();
      if (!newTicker) return;  // Prevent empty request

      console.log(`📡 Fetching data for: ${newTicker}`);

      const url = "https://www.alphavantage.co/query";
      const params = {
          "function": "TIME_SERIES_DAILY",
          "symbol": newTicker,
          "apikey": "ALPHA_VANTAGE_API_KEY",
          "outputsize": "full"
      };

      try {
          const response = await fetch(`${url}?${new URLSearchParams(params)}`);
          const data = await response.json();
      
          if (!data["Time Series (Daily)"]) {
              console.error("❌ Error fetching data:", data);
              alert("Failed to fetch data. Check API key or symbol.");
              return;
          }
      
          // ✅ Convert to CSV format
          let csvContent = "Date,Open,High,Low,Close,Volume\n";
          const timeSeries = data["Time Series (Daily)"];

          // Extract dates and sort in ascending order (oldest → newest)
          let dates = Object.keys(timeSeries).sort((a, b) => new Date(a) - new Date(b));

          // Iterate through sorted dates and write CSV
          for (const date of dates) {
              const values = timeSeries[date];
              csvContent += `${date},${parseFloat(values["1. open"])},${parseFloat(values["2. high"])},${parseFloat(values["3. low"])},${parseFloat(values["4. close"])},${parseInt(values["5. volume"])}\n`;
          }

          // ✅ Trigger download
          const blob = new Blob([csvContent], { type: "text/csv" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `alphavantage_${newTicker}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          console.log(`✅ CSV saved: alphavantage_${newTicker}.csv`);

          // ✅ Optional: Auto-fill lower input box for quick chart load
          //stockInput.value = newTicker;
          document.querySelector("footer").innerText = `✔️ Saved & Ready: ${newTicker}`;
      } catch (error) {
          console.error("❌ Fetch error:", error);
          alert("Something went wrong while fetching stock data.");
      }
  });
});

async function fetchStockData() {
  try {
      const fileName = `alphavantage_${selectedTicker}.csv`;
      const response = await fetch(fileName);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.text();
      const rows = data.split("\n").filter(row => row.trim() !== ""); // Remove empty lines


      let parsedData = rows.slice(1).map((row, index) => { // Skip header
          const cols = row.split(",");

          if (cols.length < 6) {
              console.warn(`⚠️ Skipping Row (Index ${index}): ${row}`);
              return null;
          }

          let parsedRow = { 
              time: cols[0].trim(), // Date stays the same
              open: parseFloat(cols[1]), // Removes trailing zeroes
              high: parseFloat(cols[2]), // Removes trailing zeroes
              low: parseFloat(cols[3]), // Removes trailing zeroes
              close: parseFloat(cols[4]), // Removes trailing zeroes
              volume: parseInt(cols[5]) // Ensure volume is an integer
          };
          
          return parsedRow;

      }).filter(row => row !== null);


      return parsedData;

  } catch (error) {
      console.error(`❌ ERROR: Failed to load stock data for ${selectedTicker}!`, error);
      return [];
  }
} // END: fetchStockData
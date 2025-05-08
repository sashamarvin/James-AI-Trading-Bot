


  // 🛑 Exit Draw Pattern Mode (Meta Command)
function exitPatternMode() {
    if (patternPoints.length === 0) {
        console.log("⚠️ No points selected. Pattern mode exited.");
        return;
    }

    // ✅ Add final dot marker
    const lastPoint = patternPoints[patternPoints.length - 1];
    patternMarkers.push({
        time: lastPoint.time,
        position: "belowBar",
        color: "purple",
        shape: "circle",
        text: "",
    });

    LightweightCharts.createSeriesMarkers(mainSeries, patternMarkers);

    // ✅ Save pattern data
    console.log(`✅ Pattern Saved! ${patternPoints.length} Points Stored.`);
     
}



function loadSavedPatterns() {
    console.log("📡 Fetching saved patterns...");

    fetch("/get-patterns")
        .then(response => response.json())
        .then(data => {
            console.log("✅ Debug - Fetched Patterns:", data);

            const savedPatternsList = document.getElementById("savedPatternsList");
            savedPatternsList.innerHTML = ""; // Clear old data

            // ✅ Group patterns by type (e.g., VCP Short, Rally, Breakouts)
            const patternGroups = {};
            data.forEach(pattern => {
                if (!patternGroups[pattern.patternType]) {
                    patternGroups[pattern.patternType] = [];
                }
                // ✅ Ensure no duplicates
                if (!patternGroups[pattern.patternType].some(p => p.ticker === pattern.ticker && p.startDate === pattern.startDate)) {
                    patternGroups[pattern.patternType].push(pattern);
                }
            });

            // ✅ Create collapsible sections
            Object.keys(patternGroups).forEach(type => {
                const section = document.createElement("div");
                section.classList.add("pattern-section");

                // ✅ Section Header (Category Title)
                const header = document.createElement("div");
                header.classList.add("pattern-header");
                header.textContent = type;
                header.onclick = () => {
                    list.classList.toggle("collapsed"); // Toggle collapse
                };

                // ✅ List Container (Hidden by default)
                const list = document.createElement("ul");
                list.classList.add("pattern-list", "collapsed"); // Start collapsed

                patternGroups[type].forEach(pattern => {
                    const listItem = document.createElement("li");
                    listItem.textContent = `${pattern.ticker} ${pattern.startDate.split("T")[0]}`;
                    
                    // ✅ Store pattern data in `data-attribute`
                    listItem.dataset.pattern = JSON.stringify(pattern);
                    
                    // ✅ Click event: Load pattern when clicked
                    listItem.addEventListener("click", function() {
                        console.log("🧐 Debug - Raw dataset.pattern:", this.dataset.pattern);
                        const parsedPattern = JSON.parse(this.dataset.pattern);
                        console.log("✅ Debug - Parsed Pattern:", parsedPattern);
                        applyPatternFromDB(parsedPattern);
                    });

                    list.appendChild(listItem);
                });

                section.appendChild(header);
                section.appendChild(list);
                savedPatternsList.appendChild(section);
            });

            console.log("✅ Saved patterns list updated!");
        })
        .catch(error => console.error("❌ Fetch Error:", error));
}

async function applyPatternFromDB(patternData) {
    console.log("📡 Loading saved pattern:", patternData);

    console.log("🔍 Debug - Extracted Ticker:", patternData.ticker);

    if (!patternData.ticker) {
        console.error("❌ Error - No ticker found in patternData");
        return;
    }

    // ✅ Update the global selectedTicker variable
    selectedTicker = patternData.ticker;

    // ✅ Set the stock ticker in the input field
    const stockInput = document.getElementById("stockInput");
    stockInput.value = selectedTicker;

    console.log("🔄 Stock ticker updated:", selectedTicker);

    // ✅ Reload the stock chart with the correct ticker
    await loadRealStockData();

    // ✅ Draw the pattern after loading stock data
    patternPoints = JSON.parse(patternData.patternPoints);

    if (patternPoints.length === 0) return;

    // ✅ Step 2: Plot the first marker and store it in patternMarkers
    const firstPoint = patternPoints[0];
    patternMarkers.push({
        time: firstPoint.time,
        position: "aboveBar",
        color: "purple",
        shape: "circle",
        text: "",
    });

    // ✅ Step 3: Plot the last marker and store it in patternMarkers
    const lastPoint = patternPoints[patternPoints.length - 1];
    patternMarkers.push({
        time: lastPoint.time,
        position: "belowBar",
        color: "purple",
        shape: "circle",
        text: "",
    });

    // ✅ Apply markers to the chart
    LightweightCharts.createSeriesMarkers(mainSeries, patternMarkers);

    // ✅ Step 4: Plot the trendline connecting all points and store it in patternTrendlines
    const line = chart.addSeries(LightweightCharts.LineSeries, {
        color: "purple",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
    });

    line.setData(patternPoints);
    patternTrendlines.push(line);
}



function showPatternSummary() {
    const summaryElement = document.getElementById("patternSummary");

    // ✅ Format patternData for display
    const summaryHTML = `
        <strong>Pattern Type:</strong> ${patternData.patternType} <br>
        <strong>Ticker:</strong> ${patternData.ticker} <br>
        <strong>Start Date:</strong> ${patternData.startDate} <br>
        <strong>End Date:</strong> ${patternData.endDate} <br>
        <strong>Support Levels:</strong> ${JSON.stringify(patternData.supportLevels)} <br>
        <strong>Resistance Levels:</strong> ${JSON.stringify(patternData.resistanceLevels)} <br>
        <strong>Volume Dry-Up Days:</strong> ${JSON.stringify(patternData.volumeDryUpDays)} <br>
        <strong>Volatility Contraction:</strong> ${patternData.volatilityContraction ? "Yes" : "No"} <br>
        <strong>Consolidation Confirmed:</strong> ${patternData.consolidationConfirmed ? "Yes" : "No"} <br>
        <strong>No-Fly Zone:</strong> ${patternData.noFlyZonePattern ? "Yes" : "No"} <br>
        <strong>Invalid Reason:</strong> ${patternData.invalidReason || "None"} <br>
        <hr>
        <strong>Daily Data (First 3 Days):</strong> <br>
        ${patternData.dailyData.slice(0, 3).map(day => `
            📅 ${day.time} | O: ${day.open} H: ${day.high} L: ${day.low} C: ${day.close} Vol: ${day.volume}
        `).join("<br>")}
    `;

    // ✅ Insert summary into pop-up
    summaryElement.innerHTML = summaryHTML;

    // ✅ Show the pop-up
    document.getElementById("savePopup").style.display = "block";
}

function savePatternData(patternType, ticker, stockData) {
    if (patternPoints.length < 2) {
        console.warn("Not enough points to save a pattern.");
        return;
    }

    integrateATR(stockData);
    integrateEMA(stockData);
    integrateVolumeData(stockData);
    integrateVolumeSMA50(stockData);  // ✅ Uses default period = 50   

    // ✅ Define `startDate` and `endDate` based on patternPoints
    const startDate = patternPoints[0].time;
    const endDate = patternPoints[patternPoints.length - 1].time;

    // ✅ Step 1: Collect ONLY `time`
    const dailyData = stockData.filter(day =>
    day.time >= startDate && day.time <= endDate
    ).map(day => ({
        time: day.time,
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        ema10: day.ema10 ? parseFloat(day.ema10.toFixed(2)) : null,   // ✅ Float 2 decimals, no trailing zeros
        volume: day.volume ? Math.round(day.volume) : null,          // ✅ Integer (no decimals)
        volumeSMA50: day.volumeSMA50 ? Math.round(day.volumeSMA50) : null,  // ✅ Integer (no decimals)
        atr10: day.atr10 ? parseFloat(day.atr10.toFixed(2)) : null,   // ✅ Float 2 decimals, no trailing zeros
        rs10: day.rs10 ? parseFloat(day.rs10.toFixed(2)) : null,      // ✅ Float 2 decimals, no trailing zeros
        rs50: day.rs50 ? parseFloat(day.rs50.toFixed(2)) : null,      // ✅ Float 2 decimals, no trailing zeros
        rs200: day.rs200 ? parseFloat(day.rs200.toFixed(2)) : null    // ✅ Float 2 decimals, no trailing zeros
    }));
    
    console.log("✅ Step 7 - Collected dailyData (Added volumeSMA50 & atr10):");
    console.table(dailyData);  // ✅ Show full pattern days

    // ✅ Final pattern object
    patternData = {
        patternType,
        ticker,
        patternPoints,
        patternMarkers,
        startDate: patternPoints[0]?.time || null,
        endDate: patternPoints[patternPoints.length - 1]?.time || null, 
        supportLevels: [],  // ⏳ To Do: Detect support levels
        resistanceLevels: [],  // ⏳ To Do: Detect resistance levels
        dailyData,
        volumeDryUpDays: [],
        volatilityContraction: null,  // ⏳ To Do: Manual Yes/No Selection
        consolidationConfirmed: null,  // ⏳ To Do: Manual Yes/No Selection
        noFlyZonePattern: false,  // ✅ Default: Pattern is NOT in the no-fly zone
        invalidReason: "",
    };

    console.log("✅ Pattern Saved:", patternData);
    console.table(patternData);

    showPatternSummary();  // ✅ Show confirmation pop-up

}

    
// Send the data to the backend using the fetch API

function sendPatternDataToDB() {

    fetch("/save-pattern", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(patternData)
        })
        .then(response => response.text())  // Get response from server
        .then(data => {
            console.log("✅ Server Response:", data);
            alert("✅ Pattern Saved Successfully!");  // Show confirmation
            document.getElementById("savePopup").style.display = "none";  // Hide pop-up
            loadSavedPatterns();  // ✅ Refresh sidebar after saving!
        })
        .catch(error => {
            console.error("❌ Save Failed:", error);
            alert("❌ Error Saving Pattern!");  // Show error
        });

}
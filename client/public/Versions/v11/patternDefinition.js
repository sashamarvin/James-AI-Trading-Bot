


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
    fetch("/get-patterns")
        .then(response => response.json())
        .then(data => {
            console.log("✅ Debug - Loaded Patterns:", data);

            const patternList = document.getElementById("savedPatternsList");
            patternList.innerHTML = "";  // Clear previous entries

            if (data.length === 0) {
                patternList.innerHTML = "<li>No saved patterns yet.</li>";
                return;
            }

            data.forEach((pattern, index) => {
                const listItem = document.createElement("li");
                listItem.textContent = `#${index + 1} → ${pattern.patternType} | ${pattern.ticker} (${pattern.startDate})`;
                listItem.dataset.patternId = pattern.id;  // ✅ Store ID for future actions

                // ✅ Optional: Click to view details later
                listItem.addEventListener("click", () => {
                    console.log(`🟢 Clicked pattern ID: ${pattern.id}`);
                    // Future: Load pattern details when clicked
                });

                patternList.appendChild(listItem);
            });
        })
        .catch(error => console.error("❌ Error loading patterns:", error));
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
        patternPoints: patternPoints,
        patternMarkers: patternMarkers,
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
            //loadSavedPatterns();  // ✅ Refresh sidebar after saving!
        })
        .catch(error => {
            console.error("❌ Save Failed:", error);
            alert("❌ Error Saving Pattern!");  // Show error
        });

}
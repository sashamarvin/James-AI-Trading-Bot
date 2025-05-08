


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
    markDrawPatternComplete();
     
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
                console.log("🔍 DEBUG: Processing Pattern →", pattern);
            
                if (!patternGroups[pattern.patternType]) {
                    patternGroups[pattern.patternType] = [];
                }
            
                // ✅ Ensure no duplicates
                const exists = patternGroups[pattern.patternType].some(
                    p => p.id === pattern.id  // ✅ Check by ID instead of startDate
                );
            
                if (!exists) {
                    patternGroups[pattern.patternType].push(pattern);
                } else {
                    console.warn("⚠️ Skipping duplicate pattern:", pattern);
                }
            });
            
            console.log("🔍 DEBUG: Pattern Groups After Processing →", patternGroups);

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
                
                    // ✅ Wrap pattern name and trash icon inside a flex container
                    listItem.innerHTML = `
                        <span class="pattern-name">${pattern.ticker} (${pattern.patternType})</span>
                        <span class="delete-icon" data-id="${pattern.id}">🗑️</span>
                    `;
                
                    listItem.classList.add("pattern-item"); // ✅ Add a class for styling
                
                    // ✅ Store pattern data in `data-attribute`
                    listItem.dataset.pattern = JSON.stringify(pattern);
                
                    // ✅ Click event: Load pattern or delete it
                    listItem.addEventListener("click", function (event) {
                        const deleteIcon = event.target.closest(".delete-icon");
                
                        if (deleteIcon) {
                            event.stopPropagation(); // ✅ Prevent accidental loading when deleting
                            confirmDeletePattern(pattern.id, listItem);
                            return;
                        }
                
                        // ✅ Load pattern when clicking anywhere else on the list item
                        const parsedPattern = JSON.parse(this.dataset.pattern);
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

function resetMarkersAndLines() {
    while (volDryUpMarkers.length > 0) volDryUpMarkers.pop();
    while (shakeoutMarkers.length > 0) shakeoutMarkers.pop();
    while (followThruMarkers.length > 0) followThruMarkers.pop();
    while (buyMarkers.length > 0) buyMarkers.pop();
    while (sellMarkers.length > 0) sellMarkers.pop();

    LightweightCharts.createSeriesMarkers(mainSeries, volDryUpMarkers);
    LightweightCharts.createSeriesMarkers(mainSeries, shakeoutMarkers);
    LightweightCharts.createSeriesMarkers(mainSeries, followThruMarkers);
    LightweightCharts.createSeriesMarkers(mainSeries, buyMarkers);
    LightweightCharts.createSeriesMarkers(mainSeries, sellMarkers);

    while (breakoutTrendlines.length > 0) chart.removeSeries(breakoutTrendlines.pop());
    while (stopTrendlines.length > 0) chart.removeSeries(stopTrendlines.pop());
    while (buyLines.length > 0) chart.removeSeries(buyLines.pop());
    while (sellLines.length > 0) chart.removeSeries(sellLines.pop());
    while (patternTrendlines.length > 0) chart.removeSeries(patternTrendlines.pop());
    while (harmonicsTrendlines.length > 0) chart.removeSeries(harmonicsTrendlines.pop()); // ✅ Clears Harmonic Lines

    patternPoints = [];  // ✅ Clear pattern points array
    harmonicsPoints = []; // ✅ Clear harmonic points array
}

async function applyPatternFromDB(patternData) {


    resetMarkersAndLines();

    if (!patternData.ticker) {
        console.error("❌ Error - No ticker found in patternData");
        return;
    }

    // ✅ Update the pattern type dropdown
    const patternTypeDropdown = document.getElementById("patternType"); // Correct ID
    if (patternTypeDropdown) {
        patternTypeDropdown.value = patternData.patternType;
        console.log("🔄 Pattern Type Updated:", patternData.patternType);
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

    // ✅ Step 5: Draw the Breakout Line if it exists
    if (patternData.breakoutPoints.length >= 2) {
        const breakoutLine = chart.addSeries(LightweightCharts.LineSeries, {
            color: "green",
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Solid,
        });

        breakoutLine.setData(JSON.parse(patternData.breakoutPoints));
        breakoutTrendlines.push(breakoutLine);
        console.log("✅ Breakout Line Drawn:", patternData.breakoutPoints);
    }

    // ✅ Step 6: Draw Stop Line
    if (patternData.stopPoints.length >= 2) {
        const stopLine = chart.addSeries(LightweightCharts.LineSeries, {
            color: "red",
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Solid,
        });
        stopLine.setData(JSON.parse(patternData.stopPoints));
        stopTrendlines.push(stopLine); // ✅ Store Stop Line correctly
    }

    // ✅ Step 7: Draw Volume Dry-Up Markers
    if (patternData.volDryUpMarkers.length > 0) {
        const parsedMarkers = JSON.parse(patternData.volDryUpMarkers);
        parsedMarkers.forEach(m => volDryUpMarkers.push(m)); // ✅ Push into array
        LightweightCharts.createSeriesMarkers(mainSeries, volDryUpMarkers);
    }

    // ✅ Step 8: Draw Shakeout Markers
    if (patternData.shakeoutMarkers.length > 0) {
        const parsedMarkers = JSON.parse(patternData.shakeoutMarkers);
        parsedMarkers.forEach(m => shakeoutMarkers.push(m)); // ✅ Push into array
        LightweightCharts.createSeriesMarkers(mainSeries, shakeoutMarkers);
    }

    // ✅ Step 9: Draw Follow-Through Markers
    if (patternData.followThruMarkers.length > 0) {
        const parsedMarkers = JSON.parse(patternData.followThruMarkers);
        parsedMarkers.forEach(m => followThruMarkers.push(m)); // ✅ Push into array
        LightweightCharts.createSeriesMarkers(mainSeries, followThruMarkers);
    }

    // ✅ Step 10: Draw Buy Markers & Lines
    if (patternData.buyMarkers.length > 0) {
        const parsedMarkers = JSON.parse(patternData.buyMarkers);
        parsedMarkers.forEach(m => buyMarkers.push(m)); // ✅ Push into array
        LightweightCharts.createSeriesMarkers(mainSeries, buyMarkers);

        parsedMarkers.forEach(m => {
            const c = mainSeries.data(), i = c.findIndex(d => d.time === m.time);
            if (i <= 0) return;
            const buyLine = chart.addSeries(LightweightCharts.LineSeries, { 
                color: "blue", lineWidth: 2 
            });
            buyLine.setData([{ time: c[Math.max(i - 1, 0)].time, value: m.value },
                            { time: c[Math.min(i + 1, c.length - 1)].time, value: m.value }]);
            buyLines.push(buyLine); // ✅ Store for clearing
        });
    }

    // ✅ Step 11: Draw Sell Markers & Lines
    if (patternData.sellMarkers.length > 0) {
        const parsedMarkers = JSON.parse(patternData.sellMarkers);
        parsedMarkers.forEach(m => sellMarkers.push(m)); // ✅ Push into array
        LightweightCharts.createSeriesMarkers(mainSeries, sellMarkers);

        parsedMarkers.forEach(m => {
            const c = mainSeries.data(), i = c.findIndex(d => d.time === m.time);
            if (i <= 0) return;
            const sellLine = chart.addSeries(LightweightCharts.LineSeries, { 
                color: "red", lineWidth: 2 
            });
            sellLine.setData([{ time: c[Math.max(i - 1, 0)].time, value: m.value },
                            { time: c[Math.min(i + 1, c.length - 1)].time, value: m.value }]);
            sellLines.push(sellLine); // ✅ Store for clearing
        });
    }

    // ✅ Step 12: Draw Harmonics Line (if exists)
    // ✅ Step X: Draw Harmonics Lines
    if (patternData.harmonicsPoints && patternData.harmonicsPoints.length > 0) {
        const parsedHarmonics = JSON.parse(patternData.harmonicsPoints);
        
        parsedHarmonics.forEach(linePoints => {
            const harmonicLine = chart.addSeries(LightweightCharts.LineSeries, {
                color: "blue",
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Solid,
            });

            harmonicLine.setData(linePoints);
            harmonicsTrendlines.push(harmonicLine); // ✅ Store for clearing
        });

        console.log("✅ Harmonics Lines Drawn:", parsedHarmonics);
}

    // ✅ Ensure the checklist is visible
    const checklist = document.getElementById("patternChecklist");
    if (checklist.classList.contains("hidden")) {
        checklist.classList.remove("hidden");
    }

    // ✅ Update checklist values after ensuring it's visible
    setTimeout(() => {
        
        document.getElementById("drawPatternStatus").innerText = patternPoints.length ? "✅" : "--";
        document.getElementById("breakoutLineStatus").innerText = breakoutPoints.length ? "✅" : "--";
        document.getElementById("stopLineStatus").innerText = stopPoints.length ? "✅" : "--";
        document.getElementById("harmonicsLineStatus").innerText = harmonicsPoints.length ? "✅" : "--";
        document.getElementById("volDryUpStatus").innerText = volDryUpMarkers.length ? "✅" : "--";
        document.getElementById("shakeoutStatus").innerText = shakeoutMarkers.length ? "✅" : "--";
        document.getElementById("followthruStatus").innerText = followThruMarkers.length ? "✅" : "--";
        document.getElementById("buyStatus").innerText = buyMarkers.length ? "✅" : "--";
        document.getElementById("sellStatus").innerText = sellMarkers.length ? "✅" : "--";
        document.getElementById("volatilityContractionStatus").innerText = patternData.volatilityContraction ? "yes" : "no";
        document.getElementById("consolidationConfirmedStatus").innerText = patternData.consolidationConfirmed ? "yes" : "no";
        document.getElementById("noFlyZoneStatus").innerText = patternData.noFlyZonePattern ? "yes" : "no";
        document.getElementById("invalidReasonStatus").innerText = patternData.invalidReason || "none";

        console.log("✅ Checklist updated & now visible!");
    }, 50); // Small delay ensures DOM updates correctly

    

}



function showPatternSummary() {
    const summaryElement = document.getElementById("patternSummary");

    // ✅ Format patternData for display
    const summaryHTML = `
        <div style="font-size: 14px; line-height: 1.4;">
            <strong>Pattern Type:</strong> ${patternData.patternType} <br>
            <strong>Ticker:</strong> ${patternData.ticker} <br>
            <strong>Breakout Line:</strong> ${patternData.breakoutPoints.length ? "✅" : "--"} <br>
            <strong>Stop Line:</strong> ${patternData.stopPoints.length ? "✅" : "--"} <br>
            <strong>Harmonics:</strong> ${patternData.harmonicsPoints?.length ? "✅" : "--"} <br>
            <strong>Vol Dry-Up Days:</strong> ${patternData.volDryUpMarkers.length ? "✅" : "--"} <br>
            <strong>Shakeout Day:</strong> ${patternData.shakeoutMarkers.length ? "✅" : "--"} <br>
            <strong>Follow Thru Day:</strong> ${patternData.followThruMarkers.length ? "✅" : "--"} <br>
            <strong>Buy Points:</strong> ${patternData.buyMarkers.length ? "✅" : "--"} <br>
            <strong>Sell Points:</strong> ${patternData.sellMarkers.length ? "✅" : "--"} <br>
            <strong>Volatility Contraction:</strong> ${patternData.volatilityContraction ? "Yes" : "No"} <br>
            <strong>Consolidation Confirmed:</strong> ${patternData.consolidationConfirmed ? "Yes" : "No"} <br>
            <strong>No-Fly Zone:</strong> ${patternData.noFlyZonePattern ? "Yes" : "No"} <br>
            <strong>Invalid Reason:</strong> ${patternData.invalidReason || "None"} <br>
            <hr>
            <strong>Daily Data (First 3 Days):</strong> <br>
            ${patternData.dailyData.slice(0, 3).map(day => `
                📅 ${day.time} | O: ${day.open} H: ${day.high} L: ${day.low} C: ${day.close} Vol: ${day.volume}
            `).join("<br>")}
        </div>
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
        dailyData,
        breakoutPoints,
        stopPoints,
        harmonicsPoints,
        shakeoutMarkers,
        followThruMarkers,
        buyMarkers,
        sellMarkers,
        volDryUpMarkers,
        volatilityContraction: document.getElementById("volatilityContractionStatus").innerText === "yes",
        consolidationConfirmed: document.getElementById("consolidationConfirmedStatus").innerText === "yes",
        noFlyZonePattern: document.getElementById("noFlyZoneStatus").innerText === "yes",
        invalidReason: document.getElementById("invalidReasonStatus").innerText || ""
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

function confirmDeletePattern(patternId, listItem) {
    const confirmation = confirm("⚠️ Are you sure you want to delete this pattern?");
    if (!confirmation) return;

    deletePattern(patternId, listItem);
}

function deletePattern(patternId, listItem) {
    console.log(`🗑️ Deleting pattern with ID: ${patternId}`);

    fetch(`/delete-pattern/${patternId}`, { method: "DELETE" })
        .then(response => response.text())
        .then(data => {
            console.log("✅ Pattern Deleted:", data);

            // ✅ Remove the pattern from the UI
            const parentList = listItem.parentElement;
            listItem.remove();

            // ✅ If the category (header + list) is empty, remove it
            if (parentList.children.length === 0) {
                const categoryHeader = parentList.previousElementSibling;
                if (categoryHeader && categoryHeader.classList.contains("pattern-header")) {
                    categoryHeader.remove(); // 🗑️ Remove category header
                }
                parentList.remove(); // 🗑️ Remove empty list
            }
        })
        .catch(error => {
            console.error("❌ Delete Failed:", error);
        });
}
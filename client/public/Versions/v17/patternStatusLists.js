

function updateChecklistStatus(stepId) {
    const stepElement = document.getElementById(stepId);
    if (stepElement) stepElement.innerText = "✅";
}

function markDrawPatternComplete() {
    updateChecklistStatus("drawPatternStatus");
}

function setDrawPatternMode() {
    console.log(`🛠 Mode Changed: drawPatternMode`);

    // Store the selected mode globally for reference
    window.currentMode = "drawPatternMode";

    // Visual feedback in the footer
    document.querySelector("footer").innerText = `🎯 Current Mode: drawPatternMode`;
}



function setBreakoutLineMode() {
    console.log(`🛠 Mode Changed: breakoutLineMode`);

    // Store the selected mode globally for reference
    window.currentMode = "breakoutLineMode";

    // Visual feedback in the footer
    document.querySelector("footer").innerText = `🎯 Current Mode: breakoutLineMode`;

    breakoutPoints = []; // Reset previous points
	// ✅ Remove all stored breakout trendlines from the chart
    breakoutTrendlines.forEach(line => chart.removeSeries(line));
    breakoutTrendlines = []; // ✅ Clear the array reference
	resetBreakoutLineStatus();

	document.getElementById("breakoutLineStatus").innerText = `--`;
	
	// ✅ If a stop point exists, remove risk % but keep ✅
    if (stopPoints.length > 0) {
        document.getElementById("stopLineStatus").innerText = `✅`;
    }
}

function drawBreakoutLine(points) {
    const breakoutLine = chart.addSeries(LightweightCharts.LineSeries, {
        color: "green",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
    });

    breakoutLine.setData(points);
    breakoutTrendlines.push(breakoutLine); // ✅ Store reference for future access
}

function markBreakoutLineComplete() {
    updateChecklistStatus("breakoutLineStatus");

	// ✅ Recalculate risk % if a stop point exists
    if (stopPoints.length > 0) {
        calculateRiskPercentage();
    }
}

function resetBreakoutLineStatus() {
    document.getElementById("breakoutLineStatus").innerText = "--";
}

function setStopLineMode() {
    console.log(`🛠 Mode Changed: stopLineMode`);

    // Store the selected mode globally for reference
    window.currentMode = "stopLineMode";

    // Visual feedback in the footer
    document.querySelector("footer").innerText = `🎯 Current Mode: stopLineMode`;

    stopPoints = []; // Reset previous points
    // ✅ Remove all stored stop trendlines from the chart
    stopTrendlines.forEach(line => chart.removeSeries(line));
    stopTrendlines = []; // ✅ Clear the array reference
    document.getElementById("stopLineStatus").innerText = "--";
}

function drawStopLine(points) {
    const stopLine = chart.addSeries(LightweightCharts.LineSeries, {
        color: "red", // ✅ Solid red for stop line
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
    });

    stopLine.setData(points);
    stopTrendlines.push(stopLine); // ✅ Store reference for future access
}

function markStopLineComplete() {
    updateChecklistStatus("stopLineStatus");
}

function resetStopLineStatus() {
    document.getElementById("stopLineStatus").innerText = "--";
}


function setVolDryUpMode() {
    console.log(`🛠 Mode Changed: volDryUpMode`);
    window.currentMode = "volDryUpMode";
    document.querySelector("footer").innerText = `🎯 Current Mode: volDryUpMode`;
	
	// ✅ Remove all markers from the array one by one
    while (volDryUpMarkers.length > 0) {
        volDryUpMarkers.pop();
    }

    // ✅ Ensure chart updates properly
    LightweightCharts.createSeriesMarkers(mainSeries, volDryUpMarkers);

    resetVolDryUpStatus(); // ✅ Reset UI status
}

function markVolDryUpComplete() {
    updateChecklistStatus("volDryUpStatus");
}

function resetVolDryUpStatus() {
    document.getElementById("volDryUpStatus").innerText = "--";
}

function setShakeoutMode() {
    console.log(`🛠 Mode Changed: shakeoutMode`);
    window.currentMode = "shakeoutMode";
    document.querySelector("footer").innerText = `🎯 Current Mode: shakeoutMode`;

    // ✅ Remove all markers from the array one by one
    while (shakeoutMarkers.length > 0) {
        shakeoutMarkers.pop();
    }

    // ✅ Ensure chart updates properly
    LightweightCharts.createSeriesMarkers(mainSeries, shakeoutMarkers);

    resetShakeoutStatus(); // ✅ Reset UI status
}

function markShakeoutComplete() {
    updateChecklistStatus("shakeoutStatus");
}

function resetShakeoutStatus() {
    document.getElementById("shakeoutStatus").innerText = "--";
}

function toggleVolatilityContraction() {
    const statusElement = document.getElementById("volatilityContractionStatus");
    statusElement.innerText = statusElement.innerText === "no" ? "yes" : "no";
}

function toggleConsolidationConfirmed() {
    const statusElement = document.getElementById("consolidationConfirmedStatus");
    statusElement.innerText = statusElement.innerText === "no" ? "yes" : "no";
}

function toggleNoFlyZone() {
    const statusElement = document.getElementById("noFlyZoneStatus");
    if (statusElement.innerText === "no") {
        statusElement.innerText = "yes";
        const reason = prompt("Invalid Reason (or leave blank for none):", "none");
        document.getElementById("invalidReasonStatus").innerText = reason || "none";
    } else {
        statusElement.innerText = "no";
        document.getElementById("invalidReasonStatus").innerText = "none";
    }
}

function resetPatternChecklist() {
    document.getElementById("volatilityContractionStatus").innerText = "no";
    document.getElementById("consolidationConfirmedStatus").innerText = "no";
    document.getElementById("noFlyZoneStatus").innerText = "no";
    document.getElementById("invalidReasonStatus").innerText = "none";
}

// Interpolate the breakout price at a given date using the two breakoutPoints
function getBreakoutPriceAtTime(targetDate) {
    if (breakoutPoints.length < 2) return null;

    const [start, end] = breakoutPoints;
    const startIndex = stockData.findIndex(day => day.time === start.time);
    const endIndex = stockData.findIndex(day => day.time === end.time);
    const targetIndex = stockData.findIndex(day => day.time === targetDate);

    if (startIndex === -1 || endIndex === -1 || targetIndex === -1) return null;

    // Linear interpolation: y = y1 + (x - x1)*(y2 - y1) / (x2 - x1)
    return start.value + ((targetIndex - startIndex) * (end.value - start.value)) / (endIndex - startIndex);
}

// Find the first day where the breakout line is pierced
function findBreakoutDate() {
    if (breakoutPoints.length < 2) return null;

    for (let i = 0; i < stockData.length; i++) {
        const day = stockData[i];
        const breakoutPrice = getBreakoutPriceAtTime(day.time);
        if (!breakoutPrice) continue;

        // If the day's price range includes the breakoutPrice, assume it's pierced
        if (day.high >= breakoutPrice && day.low <= breakoutPrice) {
            console.log(`📅 Breakout pierced on ${day.time}`);
            return day.time;
        }
    }
    console.warn("⚠️ No breakout date found.");
    return null;
}

// Calculate the breakout price using angle adjustment:
// - If the line is nearly horizontal (within 5°), use the interpolated price plus 1 cent.
// - If the line is slanted downward more than 5°, use the piercing day's high plus 1 cent.
function calculateBreakoutPrice() {
    if (breakoutPoints.length < 2) {
        console.warn("⚠️ Not enough points to determine breakout price.");
        return null;
    }

    const breakoutDate = findBreakoutDate();
    if (!breakoutDate) return null;

    // Compute the angle of the breakout line using stockData indices for time
    const start = breakoutPoints[0], end = breakoutPoints[1];
    const startIndex = stockData.findIndex(day => day.time === start.time);
    const endIndex = stockData.findIndex(day => day.time === end.time);
    if (startIndex === -1 || endIndex === -1) return null;
    
    const indexDiff = endIndex - startIndex;
    const priceDiff = end.value - start.value;
    const slope = priceDiff / indexDiff;
    const angleDegrees = Math.atan(slope) * (180 / Math.PI);

    let breakoutThreshold;
    if (Math.abs(angleDegrees) < 5) {
        console.log("📏 Line is nearly horizontal.");
        // For a nearly horizontal line, use the interpolated breakout price + $0.01
        breakoutThreshold = getBreakoutPriceAtTime(breakoutDate) + 0.01;
    } else if (angleDegrees < -5) {
        console.log("📐 Line is slanted downward.");
        // For a downward slanted line, use the high of the piercing day + $0.01
        const piercingDayData = stockData.find(day => day.time === breakoutDate);
        if (!piercingDayData) return null;
        breakoutThreshold = piercingDayData.high + 0.01;
    } else {
        // For an upward slanted line, or any other case, treat as nearly horizontal.
        console.log("📏 Line is slanted upward or near horizontal, treating as horizontal.");
        breakoutThreshold = getBreakoutPriceAtTime(breakoutDate) + 0.01;
    }

	breakoutThreshold = parseFloat(breakoutThreshold.toFixed(2));
    console.log(`📈 Calculated Breakout Threshold: ${breakoutThreshold}`);
	document.getElementById("breakoutLineStatus").innerText = `✅ ${breakoutThreshold}`;

    return breakoutThreshold;
}

function calculateRiskPercentage() {
    const breakoutPrice = calculateBreakoutPrice();
    if (!breakoutPrice) {
        console.warn("⚠️ Cannot calculate risk % without a breakout price.");
        return;
    }

    if (stopPoints.length === 0) {
        console.warn("⚠️ No stop point set. Risk calculation skipped.");
        return;
    }

    // ✅ Use the first stop point as the stop-loss level
    const stopPrice = stopPoints[0].value;
    if (stopPrice >= breakoutPrice) {
        console.warn("⚠️ Stop price is above or equal to breakout price. Risk % invalid.");
        return;
    }

    // ✅ Risk percentage formula: ((breakout - stop) / breakout) * 100
    const riskPercent = ((breakoutPrice - stopPrice) / breakoutPrice) * 100;

    // ✅ Update the Stop Line checklist item
    document.getElementById("stopLineStatus").innerText = `✅ risk: ${riskPercent.toFixed(2)}%`;
    console.log(`🎯 Calculated Risk %: ${riskPercent.toFixed(2)}%`);
}

function setFollowThruMode() {
    console.log(`🛠 Mode Changed: followThruMode`);
    window.currentMode = "followThruMode";
    document.querySelector("footer").innerText = `🎯 Current Mode: followThruMode`;

    // ✅ Remove all markers from the array one by one
    while (followThruMarkers.length > 0) {
        followThruMarkers.pop();
    }

    // ✅ Ensure chart updates properly
    LightweightCharts.createSeriesMarkers(mainSeries, followThruMarkers);

    resetFollowThruStatus(); // ✅ Reset UI status
}
function resetFollowThruStatus() {
    document.getElementById("followthruStatus").innerText = "--";
}
function resetFollowThruMode() {
    console.log("🗑 Resetting Follow Thru Days...");

    followThruMarkers = []; // ✅ Clear stored markers
    LightweightCharts.createSeriesMarkers(mainSeries, followThruMarkers); // ✅ Remove from chart
    resetFollowThruStatus(); // ✅ Reset UI status
}
function markFollowThruComplete() {
    document.getElementById("followthruStatus").innerText = "✅";
}
function setBuyPointsMode() {
    window.currentMode = "buyMode";

    // ✅ Remove all buy markers without affecting sell markers
    while (buyMarkers.length > 0) {
        buyMarkers.pop();
    }

    // ✅ Update chart with only buy markers
    LightweightCharts.createSeriesMarkers(mainSeries, buyMarkers);
	document.getElementById("buyStatus").innerText = "Active";

}

function setSellPointsMode() {
    window.currentMode = "sellMode";

    // ✅ Remove all sell markers without affecting buy markers
    while (sellMarkers.length > 0) {
        sellMarkers.pop();
    }

    // ✅ Update chart with only sell markers
    LightweightCharts.createSeriesMarkers(mainSeries, sellMarkers);
	document.getElementById("sellStatus").innerText = "Active";

}

function resetBuyStatus() {
    document.getElementById("buyStatus").innerText = "--";
}

function resetSellStatus() {
    document.getElementById("sellStatus").innerText = "--";
}	


function markBuyComplete() {
    document.getElementById("buyStatus").innerText = "✅"; // Set Buy to OK
}

function markSellComplete() {
    document.getElementById("sellStatus").innerText = "✅"; // Set Sell to OK
}
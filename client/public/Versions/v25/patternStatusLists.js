/* code for drawing a one day width line
	const time = param.time;
	const price = cursorPrice;

	// ✅ Create a new harmonics trendline
	let oneDayLine = chart.addSeries(LightweightCharts.LineSeries, {
		color: "blue",
		lineWidth: 2,
		lineStyle: LightweightCharts.LineStyle.Solid,
	});

	// ✅ Set initial point
	oneDayLine.setData([{ time, value: price }]);
	harmonicsTrendlines.push(oneDayLine);
*/


function autoDrawMode() {

	drawMode = !drawMode;

	document.querySelector("footer").innerText = `Draw Mode: ${drawMode ? "ON ✏️" : "OFF"}`;
	document.body.style.cursor = drawMode ? "crosshair" : "default";
	// ✅ Check if draw-mode-icon exists before modifying it
    let drawModeIcon = document.getElementById("draw-mode-icon");
    if (drawModeIcon) {
        drawModeIcon.style.display = drawMode ? "block" : "none";
    } else {
        console.warn("⚠️ draw-mode-icon not found, skipping display change.");
    } 
	// ✅ If exiting drawMode while in drawPatternMode, trigger exitPatternMode()
	if (!drawMode && window.currentMode === "drawPatternMode") {
		exitPatternMode();
	}
	// ✅ If exiting drawMode while in breakoutLineMode, mark task complete
	if (!drawMode && window.currentMode === "breakoutLineMode") {
		markBreakoutLineComplete();
	}
	// ✅ If exiting drawMode while in stopLineMode, mark task complete
	if (!drawMode && window.currentMode === "stopLineMode") {
		markStopLineComplete();
		// ✅ Preserve risk % when exiting drawMode in stopLineMode
		calculateRiskPercentage();
	}

	drawMode = true;
}

function updateChecklistStatus(stepId) {
    const stepElement = document.getElementById(stepId);
    if (stepElement) stepElement.innerText = "✅";
}

function updateChecklistStatusPatternDays(stepId) {
    const stepElement = document.getElementById(stepId);
    if (stepElement) stepElement.innerText = "✅ Trading days: "+ totalDays;
}

function markDrawPatternComplete() {
    updateChecklistStatusPatternDays("drawPatternStatus");
}

function setDrawPatternMode() {
    console.log(`🛠 Mode Changed: drawPatternMode`);

    // Store the selected mode globally for reference
    window.currentMode = "drawPatternMode";

    // Visual feedback in the footer
    document.querySelector("footer").innerText = `🎯 Current Mode: drawPatternMode`;

	autoDrawMode();
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
	autoDrawMode();
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

	autoDrawMode();
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

function setHarmonicsLineMode() {
    console.log(`🛠 Mode Changed: harmonicsLineMode`);
    window.currentMode = "harmonicsLineMode";
    document.querySelector("footer").innerText = `🎯 Current Mode: harmonicsLineMode`;
    autoDrawMode();
}


function resetHarmonicsLineStatus() {
    document.getElementById("harmonicsLineStatus").innerText = "--";
}






function setVolDryUpMode() {
    console.log(`🛠 Mode Changed: volDryUpMode`);
    window.currentMode = "volDryUpMode";
    document.querySelector("footer").innerText = `🎯 Current Mode: volDryUpMode`;
	autoDrawMode();
}

function markVolDryUpComplete() {
    updateChecklistStatus("volDryUpStatus");
}

function resetVolDryUpStatus() {
    document.getElementById("volDryUpStatus").innerText = "--";
}

function setInsideDayMode() {
    console.log(`🛠 Mode Changed: insideDayMode`);
    window.currentMode = "insideDayMode";
    document.querySelector("footer").innerText = `🎯 Current Mode: insideDayMode`;
    autoDrawMode();
}
function markInsideDayComplete() {
    updateChecklistStatus("insideDayStatus");
}
function resetInsideDayStatus() {
    document.getElementById("insideDayStatus").innerText = "--";
}

function setEarningsDayMode() {
    console.log(`🛠 Mode Changed: earningsDayMode`);
    window.currentMode = "earningsDayMode";
    document.querySelector("footer").innerText = `🎯 Current Mode: earningsDayMode`;
    autoDrawMode();
}

function markEarningsDayComplete() {
    updateChecklistStatus("earningsDayStatus");
}

function resetEarningsDayStatus() {
    document.getElementById("earningsDayStatus").innerText = "--";
}

function setFollowThruMode() {
    console.log(`🛠 Mode Changed: followThruMode`);
    window.currentMode = "followThruMode";
    document.querySelector("footer").innerText = `🎯 Current Mode: followThruMode`;
	autoDrawMode();
}

function resetFollowThruStatus() {
    document.getElementById("followthruStatus").innerText = "--";
}
function markFollowThruComplete() {
    document.getElementById("followthruStatus").innerText = "✅";
}

function setShakeoutMode() {
    console.log(`🛠 Mode Changed: shakeoutMode`);
    window.currentMode = "shakeoutMode";
    document.querySelector("footer").innerText = `🎯 Current Mode: shakeoutMode`;
    autoDrawMode();
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


	// ✅ Create a new harmonics trendline
	let oneDayLine = chart.addSeries(LightweightCharts.LineSeries, {
		color: "blue",
		lineWidth: 2,
		lineStyle: LightweightCharts.LineStyle.Solid,
	});

	// ✅ Set initial point
	oneDayLine.setData([{ time: breakoutDate, value: breakoutThreshold }]);
	buyLines.push(oneDayLine);

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



function setBuyPointsMode() {
    window.currentMode = "buyMode";
	document.querySelector("footer").innerText = `Status: Buy Mode`; // For buy clicks
	autoDrawMode();
}

function resetBuyStatus() {
    document.getElementById("buyStatus").innerText = "--";
}
function markBuyComplete() {
    document.getElementById("buyStatus").innerText = "✅"; // Set Buy to OK
}



function setSellPointsMode() {
    window.currentMode = "sellMode";
    document.querySelector("footer").innerText = `Status: Sell Mode`; // For sell clicks
    autoDrawMode();
}

function resetSellStatus() {
    document.getElementById("sellStatus").innerText = "--";
}	
function markSellComplete() {
    document.getElementById("sellStatus").innerText = "✅"; // Set Sell to OK
}



function resetChecklist() {
    console.log("🧹 Resetting Checklist...");

    // ✅ Reset all checklist statuses without triggering full mode functions
    document.getElementById("breakoutLineStatus").innerText = "--";
    document.getElementById("stopLineStatus").innerText = "--";
	document.getElementById("harmonicsLineStatus").innerText = "--";
    document.getElementById("buyStatus").innerText = "--";
    document.getElementById("sellStatus").innerText = "--";
    document.getElementById("drawPatternStatus").innerText = "--";
    document.getElementById("volDryUpStatus").innerText = "--";
    document.getElementById("shakeoutStatus").innerText = "--";
    document.getElementById("followthruStatus").innerText = "--";
    document.getElementById("insideDayStatus").innerText = "--";

    // ✅ Reset Yes/No toggles and invalid reason fields
    document.querySelectorAll(".yes-no-toggle").forEach(el => el.innerText = "--");
    document.getElementById("invalidReasonStatus").value = "";

	resetMarkersAndLines();

	// ✅ Reload the stock chart with the correct ticker
    loadRealStockData();

	
}

function countTradingDays(patternPoints, stockData) {
    if (patternPoints.length < 2) return 0;

    const startDate = patternPoints[0].time;
    const endDate = patternPoints[patternPoints.length - 1].time;

    const startIdx = stockData.findIndex(day => day.time === startDate);
    const endIdx = stockData.findIndex(day => day.time === endDate);

    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return 0;

    // Count only valid trading days
    let tradingDays = 0;
    for (let i = startIdx; i <= endIdx; i++) {
        const day = stockData[i];
        if (day.open !== undefined && day.close !== undefined) { // Ensure it's a valid trading day
            tradingDays++;
        }
    }

    totalDays = tradingDays;
}


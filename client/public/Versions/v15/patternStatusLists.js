

function updateChecklistStatus(stepId) {
    const stepElement = document.getElementById(stepId);
    if (stepElement) stepElement.innerText = "✅";
}

function markDrawPatternComplete() {
    updateChecklistStatus("drawPatternStatus");
}

function markBreakoutLineComplete() {
    updateChecklistStatus("breakoutLineStatus");
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
	document.getElementById("breakoutLineStatus").innerText = "--";

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
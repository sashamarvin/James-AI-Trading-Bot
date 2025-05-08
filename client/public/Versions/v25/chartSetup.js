document.addEventListener("DOMContentLoaded", function () {
    
    const tooltip = document.getElementById("tooltip");
    
    window.chartContainer = document.getElementById('container'); // ✅ Global access
    if (!chartContainer) {
        console.error("❌ ERROR: Chart container not found!");
        return;
    }

    window.chart = LightweightCharts.createChart(chartContainer); // ✅ Global access to `chart`




    chart.applyOptions({
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: { color: "#808080", width: 1, style: LightweightCharts.LineStyle.Dashed, visible: true },
            horzLine: { color: "#808080", width: 1, style: LightweightCharts.LineStyle.Dashed, visible: true },
        },
    });

    // ✅ Update tooltip dynamically when moving the crosshair
    chart.subscribeCrosshairMove((param) => {
        if (!param || !param.point || !param.seriesData) {
            tooltip.style.opacity = "0"; // Hide tooltip when no data
            return;
        }

        const bar = param.seriesData.get(mainSeries);
        if (!bar) return;

        // Extract OHLC data
        const time = param.time;
        const open = bar.open.toFixed(2);
        const high = bar.high.toFixed(2);
        const low = bar.low.toFixed(2);
        const close = bar.close.toFixed(2);

        // ✅ Show live preview for breakout line when in drawMode
        const cursorPrice = mainSeries.coordinateToPrice(param.point.y);
        
        // ✅ Ensure `incDecPercent` updates dynamically when measuring
        let incDecPercent = "";
        if (drawMode && window.currentMode === "tempMeasureMode" && measurePoints.length === 1) {
            const firstPoint = measurePoints[0];

            if (firstPoint) {
                const percentChange = ((cursorPrice - firstPoint.value) / firstPoint.value) * 100;
                incDecPercent = percentChange.toFixed(2) + "%";
            }
        }


        tooltip.innerHTML = `
            <div id="allocation-text" style="display: ${window.currentMode === "buyMode" || window.currentMode === "sellMode" ? "block" : "none"};">
                ${tradeAllocation} Position
            </div>
            <div id="percentage" style="display: ${window.currentMode === "tempMeasureMode" ? "block" : "none"};">
                ${incDecPercent}
            </div>
            <div id="draw-mode-icon" style="display: ${drawMode ? "block" : "none"}; margin-right: 5px;">✏️ Draw Mode</div>
            <div class="ticker">${selectedTicker}</div>
            <hr class="divider">
            <div class="ohlc">
                <strong>📅 ${time}</strong><br>
                <span class="open">🔺 Open: ${open}</span>
                <span class="high">🔼 High: ${high}</span>
                <span class="low">🔽 Low: ${low}</span>
                <span class="close">⏺ Close: ${close}</span>
            </div>
        `;

        tooltip.style.display = "block"; // Ensure it's visible
        tooltip.style.opacity = "1";     // Force full visibility
        tooltip.style.zIndex = "1000";   // Bring to front

        

        // ✅ Ensure preview only runs when exactly **1 point is clicked**
        if (drawMode && window.currentMode === "breakoutLineMode" && breakoutPoints.length === 1) {
            const livePoint = { time, value: cursorPrice };

            if (!breakoutPreviewLine) {
                breakoutPreviewLine = chart.addSeries(LightweightCharts.LineSeries, {
                    color: "rgba(0, 122, 255, 0.5)", // ✅ Semi-transparent preview
                    lineWidth: 1,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                });
            }

            breakoutPreviewLine.setData([breakoutPoints[0], livePoint]); // ✅ Update dynamically
        }

        // ✅ Live Preview for Stop Line
        if (drawMode && window.currentMode === "stopLineMode" && stopPoints.length === 1) {
            const livePoint = { time, value: cursorPrice };

            if (!stopPreviewLine) {
                stopPreviewLine = chart.addSeries(LightweightCharts.LineSeries, {
                    color: "rgba(255, 0, 0, 0.5)", // ✅ Semi-transparent red for stop line
                    lineWidth: 1,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                });
            }

            stopPreviewLine.setData([stopPoints[0], livePoint]); // ✅ Update dynamically
        }

        // ✅ Ensure preview only runs when exactly **1 point is clicked**
        if (drawMode && window.currentMode === "tempMeasureMode" && measurePoints.length === 1) {
            const livePoint = { time, value: cursorPrice };

            if (!measurePreviewLine) {
                measurePreviewLine = chart.addSeries(LightweightCharts.LineSeries, {
                    color: "rgb(255, 0, 0)", // ✅ Solid red for measure line
                    lineWidth: 1,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                });
            }

            measurePreviewLine.setData([measurePoints[0], livePoint]); // ✅ Update dynamically
        }

        

    });

    chartContainer.addEventListener("mousemove", (event) => {
        const rect = chartContainer.getBoundingClientRect();
        let x = event.clientX - rect.left + 15; // Offset for better visibility
        let y = event.clientY - rect.top + 15;
    
        // Prevent tooltip from overflowing
        x = Math.min(x, rect.width - tooltip.offsetWidth - 10);
        y = Math.min(y, rect.height - tooltip.offsetHeight - 10);
    
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        tooltip.style.opacity = "1";  // Ensure visibility
    });
    
    chartContainer.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0"; // Smooth fade-out
    });
    
    chartContainer.addEventListener("mouseenter", () => {
        tooltip.style.display = "block";
    });
    
    chart.subscribeCrosshairMove((param) => {
        if (!param || !param.point || !param.seriesData) {
            tooltip.style.opacity = "0"; // Hide tooltip when no data
            return;
        }
    });

    console.log("✅ Chart Initialized Successfully");

    loadRealStockData(); // ✅ Auto-loads data when the page loads

    console.log("✅ loadRealStockData() it's a GO!");

});
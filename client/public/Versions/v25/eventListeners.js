document.addEventListener("DOMContentLoaded", function () {
    console.log("🟢 eventListeners.js Loaded!");

    // ✅ Set the stock ticker in the input field
    const stockInput = document.getElementById("stockInput");
    stockInput.value = selectedTicker;

    loadSavedPatterns();  // ✅ Load saved patterns on startup

    // Ensure chart is initialized before adding event listeners
    setTimeout(() => {
        if (!window.chart) {
            console.error("❌ ERROR: Chart is not initialized!");
            return;
        }

        console.log("✅ Chart is ready, adding event listeners.");

    window.currentMode = ""; // Default Mode
    
    chart.subscribeClick(param => {
        if (!param.time) return;

        const bar = param.seriesData.get(mainSeries);
        if (!bar) return;

        const cursorPrice = mainSeries.coordinateToPrice(param.point.y);
        const snapPrice = findClosestPrice(cursorPrice, bar);

        const snapMode = document.getElementById("snapModeToggle").checked; // ✅ Check Snap Mode

        let chartPrice;
        if (snapMode) {chartPrice = snapPrice;} else {chartPrice = cursorPrice;}

        // 🛠 Get the currently selected mode
        const currentMode = window.currentMode || ""; 

        if (currentMode === "trendlineMode" && drawMode) {

            if (!startPoint) {
                startPoint = { time: param.time, value: chartPrice };

                dynamicMarkers.push({
                    time: startPoint.time,
                    position: "belowBar",
                    color: "blue",
                    shape: "arrowUp",
                    text: "",
                });

                LightweightCharts.createSeriesMarkers(mainSeries, dynamicMarkers);
            } else {
                let endPoint = { time: param.time, value: chartPrice };

                // 🛑 Prevent chart from breaking by ensuring time order
                if (endPoint.time < startPoint.time) {
                    [startPoint, endPoint] = [endPoint, startPoint]; // ✅ Swap if needed
                }

                if (startPoint.time === endPoint.time && startPoint.value === endPoint.value) {
                    return;
                }

                const percentageChange = ((endPoint.value - startPoint.value) / startPoint.value) * 100;
                const formattedChange = percentageChange.toFixed(2) + "%";

                dynamicMarkers.push({
                    time: endPoint.time,
                    position: "aboveBar",
                    color: "red",
                    shape: "arrowDown",
                    text: formattedChange,
                });

                LightweightCharts.createSeriesMarkers(mainSeries, dynamicMarkers);

                const line = chart.addSeries(LightweightCharts.LineSeries, {
                    color: "blue",
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                });

                line.setData([startPoint, endPoint]);
                trendlines.push(line);

                startPoint = null;
            }
        } 
        else if (currentMode === "drawPatternMode" && drawMode) {
            // ✅ Ensure patternPoints exists
            if (!patternPoints) {
                patternPoints = [];
            }
        
            // ✅ Add clicked point
            const newPoint = { time: param.time, value: chartPrice };
            patternPoints.push(newPoint);
        
            // ✅ First Click → Draw starting dot
            if (patternPoints.length === 1) {
                patternMarkers.push({
                    time: newPoint.time,
                    position: "belowBar",
                    color: "purple",
                    shape: "circle",
                    text: "",
                });
                
                LightweightCharts.createSeriesMarkers(mainSeries, patternMarkers);
            }
        
            // ✅ Draw lines connecting all points (if more than one point exists)
            if (patternPoints.length > 1) {
                // Remove previous trendline before updating
                if (patternTrendlines.length) {
                    patternTrendlines[patternTrendlines.length - 1].applyOptions({ visible: false });
                }
        
                const line = chart.addSeries(LightweightCharts.LineSeries, {
                    color: "purple",
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                });
        
                // **Draw a continuous line connecting all selected points**
                line.setData([...patternPoints]);
                patternTrendlines.push(line);

                countTradingDays(patternPoints, stockData);
            }
            
        }
        if (currentMode === "breakoutLineMode" && drawMode) {
            const time = param.time;
        
            // ✅ If this is the first point, store the price for shift-locking
            if (breakoutPoints.length === 0) {
                breakoutPoints.push({ time, value: chartPrice });
                console.log("🟢 First Breakout Click at", chartPrice);
            } else {
                let finalPrice = chartPrice;
        
                // ✅ If Shift is held, lock the second point to the first point’s price
                if (event.shiftKey) {
                    finalPrice = breakoutPoints[0].value; // ✅ Lock price to first click
                    console.log("🔒 Shift Held → Breakout Line Locked at", finalPrice);
                }
        
                breakoutPoints.push({ time, value: parseFloat(finalPrice.toFixed(2)) });
        
                // ✅ Ensure final breakout line uses either free points or locked horizontal
                drawBreakoutLine(breakoutPoints);
        
                // ✅ Remove the temp preview line
                if (breakoutPreviewLine) {
                    breakoutPreviewLine.setData([]); // Clears data
                    chart.removeSeries(breakoutPreviewLine); // ✅ Completely remove the series
                    breakoutPreviewLine = null;
                }

            }
        }

        if (currentMode === "stopLineMode" && drawMode) {
            const time = param.time;
        
            // ✅ If this is the first point, store the price for shift-locking
            if (stopPoints.length === 0) {
                stopPoints.push({ time, value: cursorPrice });
                console.log("🟢 First Stop Click at", cursorPrice);
            } else {
                let finalPrice = cursorPrice;
        
                // ✅ If Shift is held, lock the second point to the first point’s price
                if (event.shiftKey) {
                    finalPrice = stopPoints[0].value; // ✅ Lock price to first click
                    console.log("🔒 Shift Held → Stop Line Locked at", finalPrice);
                }
        
                stopPoints.push({ time, value: parseFloat(finalPrice.toFixed(2)) });
        
                // ✅ Ensure final stop line uses **either free points or locked horizontal**
                drawStopLine(stopPoints);
        
                // ✅ Remove the temp preview line
                if (stopPreviewLine) {
                    stopPreviewLine.setData([]); // Clears data
                    chart.removeSeries(stopPreviewLine); // ✅ Completely remove the series
                    stopPreviewLine = null;
                }
            }
        
            // ✅ Calculate risk percentage after setting the first stop
            if (stopPoints.length === 1) {
                calculateRiskPercentage();
            }
        }

        if (currentMode === "tempMeasureMode") {
            const time = param.time;
        
            if (measurePoints.length === 0) {
                // ✅ First click: Store the first measurement point
                measurePoints.push({ time, value: cursorPrice });
                console.log("🟢 First Measure Click at", cursorPrice);
                autoDrawMode();
            } 

        }

        if (currentMode === "harmonicsLineMode" && drawMode) {
            const time = param.time;
            const price = cursorPrice;
        
            // ✅ Store first click
            if (harmonicsTempPoints.length === 0) {
                harmonicsTempPoints.push({ time, value: price });
                console.log("🟢 First Click (Harmonics) at:", time, price);
                return;
            }

            // ✅ Store second click
            if (harmonicsTempPoints.length === 1) {
                harmonicsTempPoints.push({ time, value: price });

                // ✅ Sort by time only (earliest time first)
                let [firstPoint, secondPoint] = harmonicsTempPoints[0].time < harmonicsTempPoints[1].time
                    ? [harmonicsTempPoints[0], harmonicsTempPoints[1]]
                    : [harmonicsTempPoints[1], harmonicsTempPoints[0]];

                harmonicsTempPoints = [firstPoint, secondPoint];

                // ✅ Plot temp line
                let tempHarmonicLine = chart.addSeries(LightweightCharts.LineSeries, {
                    color: "blue",
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                });

                tempHarmonicLine.setData(harmonicsTempPoints);
                harmonicsTempLine.push(tempHarmonicLine);

                console.log("🔵 Temporary Harmonic Line Drawn:", harmonicsTempPoints);
                return;
            }

        
            // 2️⃣ Third Click → Compute Delta & Adjust Top Point
            else {
                // 🟢 Third Click Detected: Prepare to Relocate the Harmonic Line
                if (harmonicsTempPoints.length === 2) {
                    const newBottom = { time, value: price }; // Clicked position
                    let oldBottom, oldTop;

                    // ✅ Identify bottom & top based on price (NOT TIME)
                    if (harmonicsTempPoints[0].value < harmonicsTempPoints[1].value) {
                        oldBottom = harmonicsTempPoints[0];
                        oldTop = harmonicsTempPoints[1];
                    } else {
                        oldBottom = harmonicsTempPoints[1];
                        oldTop = harmonicsTempPoints[0];
                    }

                    let Point1, Point2, DateOldBottom, DateOldTop, PriceOldTop;

                    if (oldBottom.time < oldTop.time) {
                        Point1 = oldBottom;
                        Point2 = oldTop;
                        DateOldBottom = Point1.time;
                        PriceOldBottom = Point1.value;
                        DateOldTop = Point2.time;
                        PriceOldTop = Point2.value;
                    } else {
                        Point1 = oldTop;
                        Point2 = oldBottom;
                        DateOldBottom = Point2.time;
                        PriceOldBottom = Point2.value;
                        DateOldTop = Point1.time;
                        PriceOldTop = Point1.value;
                    }

                    console.log("🟠 Moving Bottom Point to:", newBottom);
                    console.log("🔹 Coordinates: ", Point1, " & ", Point2);

                    // ✅ Find index shift using stock data
                    const oldBottomIndex = stockData.findIndex(day => day.time === DateOldBottom);
                    const newBottomIndex = stockData.findIndex(day => day.time === newBottom.time);
                    const oldTopIndex = stockData.findIndex(day => day.time === DateOldTop);

                    if (oldBottomIndex === -1 || newBottomIndex === -1 || oldTopIndex === -1) {
                        console.error("❌ Could not find one of the harmonic points in stock data!");
                        return;
                    }

                    // ✅ Calculate the shift
                    const deltaDays = newBottomIndex - oldBottomIndex;
                    const deltaPrice = newBottom.value - PriceOldBottom;

                    console.log(`📊 Delta Days: ${deltaDays}, Delta Price: ${deltaPrice}`);

                    // ✅ Compute new top point
                    const newTopIndex = oldTopIndex + deltaDays;

                    // ✅ Ensure new top is within stock data range
                    if (newTopIndex < 0 || newTopIndex >= stockData.length) {
                        console.error("❌ New top index is out of bounds:", newTopIndex);
                        return;
                    }

                    const newTopTime = stockData[newTopIndex].time;
                    const newTopValue = PriceOldTop + deltaPrice;

                    // ✅ Create the new harmonic line
                    
                    let newHarmonicLine;

                    if (newBottom.time < newTopTime) {
                        // ✅ If the new bottom is earlier in time, keep this order
                        newHarmonicLine = [
                            { time: newBottom.time, value: newBottom.value },
                            { time: newTopTime, value: newTopValue }
                        ];
                    } else {
                        // ✅ If the new top is earlier in time, swap their positions
                        newHarmonicLine = [
                            { time: newTopTime, value: newTopValue },
                            { time: newBottom.time, value: newBottom.value }
                        ];
                    }

                    console.log("✨ New Harmonic Line:", newHarmonicLine);

                    // ✅ Remove temporary reference line
                    if (harmonicsTempLine.length) {
                        const lastTempLine = harmonicsTempLine.pop();
                        chart.removeSeries(lastTempLine);
                    }
                    harmonicsTempPoints = [];

                    // ✅ Store & draw new harmonic line
                    harmonicsPoints.push(newHarmonicLine.map(point => ({
                        time: point.time,
                        value: parseFloat(point.value.toFixed(2)) // ✅ Ensures float with 2 decimals
                    })));

                    const newLineSeries = chart.addSeries(LightweightCharts.LineSeries, {
                        color: "blue",
                        lineWidth: 2,
                        lineStyle: LightweightCharts.LineStyle.Solid,
                    });

                    newLineSeries.setData(newHarmonicLine);
                    harmonicsTrendlines.push(newLineSeries);

                    updateChecklistStatus("harmonicsLineStatus");

                }
            }
        }
        

        if (currentMode === "volDryUpMode" && drawMode) {
            const markerPosition = { time: param.time, value: snapPrice };
        
            volDryUpMarkers.push({
                time: markerPosition.time,
                position: "belowBar",
                color: "orange",
                shape: "arrowUp",
                text: "",
            });
        
            LightweightCharts.createSeriesMarkers(mainSeries, volDryUpMarkers);
            markVolDryUpComplete();
        }

        if (currentMode === "shakeoutMode" && drawMode) {
            const markerPosition = { time: param.time, value: snapPrice };
        
            shakeoutMarkers.push({
                time: markerPosition.time,
                position: "belowBar",
                color: "red",
                shape: "arrowDown",
                text: "",
            });
        
            LightweightCharts.createSeriesMarkers(mainSeries, shakeoutMarkers);
            markShakeoutComplete();
        }

        if (currentMode === "followThruMode" && drawMode) {
            const time = param.time;
            //const cursorPrice = mainSeries.coordinateToPrice(param.point.y);
        
            const marker = {
                time,
                position: "aboveBar",
                color: "green",
                shape: "arrowUp",
                text: "F-T",
            };
        
            followThruMarkers.push(marker);
            LightweightCharts.createSeriesMarkers(mainSeries, followThruMarkers);
        
            // ✅ Mark as completed in the checklist
            markFollowThruComplete();
        }

        if (currentMode === "insideDayMode" && drawMode) {
            const markerPosition = { time: param.time, value: snapPrice };
        
            insideDayMarkers.push({
                time: markerPosition.time,
                position: "belowBar",
                color: "cyan",
                shape: "arrowUp",
                text: "",
            });
        
            LightweightCharts.createSeriesMarkers(mainSeries, insideDayMarkers);
            markInsideDayComplete();
        }

        if (currentMode === "earningsDayMode" && drawMode) {
            const markerPosition = { time: param.time, value: snapPrice };
        
            earningsDayMarkers.push({
                time: markerPosition.time,
                position: "belowBar",
                color: "blue",
                shape: "text",
                text: "E",
            });
        
            LightweightCharts.createSeriesMarkers(mainSeries, earningsDayMarkers);
            markEarningsDayComplete();
        }

        if ((currentMode === "buyMode" || currentMode === "sellMode") && drawMode) {
            const time = param.time;
            //const cursorPrice = mainSeries.coordinateToPrice(param.point.y);
        
            const marker = {
                time,
                position: currentMode === "buyMode" ? "belowBar" : "aboveBar",
                color: currentMode === "buyMode" ? "blue" : "red",
                shape: currentMode === "buyMode" ? "arrowUp" : "arrowDown",
                text: `${tradeAllocation}`, // Allocation
                value: parseFloat(cursorPrice.toFixed(2)) // ✅ Store the price value!
            };
        
            // Push the marker into the respective array
            if (currentMode === "buyMode") {
                buyMarkers.push(marker); // Add to buyMarkers
                document.querySelector("footer").innerText = `📌 Buy: ${tradeAllocation} @ ${cursorPrice.toFixed(2)} (${time})`;
            } else {
                sellMarkers.push(marker); // Add to sellMarkers
                document.querySelector("footer").innerText = `📌 Sell: ${tradeAllocation} @ ${cursorPrice.toFixed(2)} (${time})`;
            }
        
            // Update chart with combined markers (both buy and sell)
            LightweightCharts.createSeriesMarkers(mainSeries, buyMarkers);
            LightweightCharts.createSeriesMarkers(mainSeries, sellMarkers);
        
            // ✅ Mark as completed in the correct checklist
            if (currentMode === "buyMode") {
                markBuyComplete(); // ✅ Marks "Buy points" in checklist
            } else {
                markSellComplete(); // ✅ Marks "Sell points" in checklist
            }

            if (currentMode === "buyMode") {
                // ✅ Find the index of the clicked day
                const chartData = mainSeries.data();
                let buyIndex = chartData.findIndex(d => d.time === time);
                
                if (buyIndex <= 0) return; // Prevent errors

                let startIndex = buyIndex - 1; // ✅ Start one trading day before
                let endIndex = buyIndex + 1;   // ✅ End one trading day before the original

                if (endIndex >= chartData.length) {
                    endIndex = chartData.length - 1; // Prevent overflow
                }

                const startTime = chartData[startIndex].time;
                const endTime = chartData[endIndex].time;

                // ✅ Create a new line series for this buy point
                const buyLineSeries = chart.addSeries(LightweightCharts.LineSeries, {
                    color: 'blue',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                });

                buyLineSeries.setData([
                    { time: startTime, value: cursorPrice }, // Start one day before
                    { time: endTime, value: cursorPrice }   // End one day before the original end
                ]);

                // ✅ Store the new line in the global `buyLines` array
                buyLines.push(buyLineSeries);
            } 
            if (currentMode === "sellMode" && drawMode) {
                // ✅ Find the index of the clicked day
                const chartData = mainSeries.data();
                let sellIndex = chartData.findIndex(d => d.time === time);
                
                if (sellIndex <= 0) return; // Prevent errors
            
                let startIndex = sellIndex - 1; // ✅ Start one trading day before
                let endIndex = sellIndex + 1;   // ✅ End one trading day before the original
            
                if (endIndex >= chartData.length) {
                    endIndex = chartData.length - 1; // Prevent overflow
                }
            
                const startTime = chartData[startIndex].time;
                const endTime = chartData[endIndex].time;
            
                // ✅ Create a new line series for this sell point
                const sellLineSeries = chart.addSeries(LightweightCharts.LineSeries, {
                    color: 'red',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Solid,
                });
            
                sellLineSeries.setData([
                    { time: startTime, value: cursorPrice }, // Start one day before
                    { time: endTime, value: cursorPrice }   // End one day before the original end
                ]);
            
                // ✅ Store the new line in the global `sellLines` array
                sellLines.push(sellLineSeries);
            }
            
        }

    
        // 📝 Always update the footer with latest click info if not drawMode
        document.querySelector("footer").innerText =
            `📌 Clicked on: ${param.time} | O: ${bar.open} H: ${bar.high} L: ${bar.low} C: ${bar.close}`;
    
    }); // END: chart.subscribeClick


    // ✅ ESC KEY HANDLER - Works like Spacebar, then removes measure line
    document.addEventListener("keydown", (event) => {
        if (event.code === "Escape" && currentMode === "tempMeasureMode") {
            console.log("🚨 ESC Pressed: Toggling Draw Mode & Clearing Measure Line");

            // ✅ Toggle drawMode (just like Spacebar)
            drawMode = !drawMode;
            document.body.style.cursor = drawMode ? "crosshair" : "default";
            document.getElementById("draw-mode-icon").style.display = drawMode ? "block" : "none";

            // ✅ After 50ms, remove the temp measure line
            setTimeout(() => {
                if (measurePreviewLine) {
                    measurePreviewLine.setData([]);
                    chart.removeSeries(measurePreviewLine);
                    measurePreviewLine = null;
                }
                measurePoints = [];
                window.currentMode = "";
                console.log("🗑 Temp Measure Line Cleared After 50ms");
            }, 50);
        }
    });



    // DELETE DELETE last trendline and markers
    // DELETE DELETE last trendline and markers
    // DELETE DELETE last trendline and markers
    // DELETE DELETE last trendline and markers
    // DELETE DELETE last trendline and markers
    // DELETE DELETE last trendline and markers
    document.addEventListener("keydown", (event) => {
        if (event.key === "Delete" || (event.key === "Backspace" && !event.metaKey && !event.ctrlKey)) {
            const Mode = window.currentMode || ""; // ✅ Default to empty string if undefined
            console.log("DEBUG: Current Mode →", Mode); // ✅ Debugging

            if (Mode === "trendlineMode") {
                console.log("DEBUG: Deleting Last Trendline"); // ✅ Debug check
                if (trendlines.length > 0) {
                    const lastLine = trendlines.pop();
                    chart.removeSeries(lastLine);

                    if (dynamicMarkers.length >= 2) {
                        dynamicMarkers.pop();
                        dynamicMarkers.pop();
                    }
                }

                if (trendlines.length === 0 && dynamicMarkers.length > 0) {
                    dynamicMarkers.pop();
                }

                LightweightCharts.createSeriesMarkers(mainSeries, dynamicMarkers);
                document.querySelector("footer").innerText =
                    (trendlines.length === 0 && dynamicMarkers.length === 0)
                        ? "🗑️ All Trendlines & Markers Deleted"
                        : "🗑️ Last Item Deleted";
            
            // ✅ Delete only the last pattern segment if in drawPatternMode & drawMode
            } else if (Mode === "drawPatternMode" && drawMode) {
                console.log("DEBUG: Deleting Last Pattern Segment"); // ✅ Debugging

                if (patternPoints.length >= 1) {
                    patternPoints.pop(); // ✅ Remove only the last plotted point
                
                    // ✅ Instead of deleting, replot the trendline with updated points
                    if (patternTrendlines.length > 0) {
                        const lastPatternLine = patternTrendlines.pop();
                        chart.removeSeries(lastPatternLine); // ✅ Remove old line
                
                        const newLine = chart.addSeries(LightweightCharts.LineSeries, {
                            color: "purple",
                            lineWidth: 2,
                            lineStyle: LightweightCharts.LineStyle.Solid,
                        });
                
                        newLine.setData([...patternPoints]); // ✅ Replot with updated points
                        patternTrendlines.push(newLine);
                    }

                    // ✅ If only one point remains, delete it and remove the marker
                    if (patternPoints.length == 1) {
                        patternPoints.pop(); // ✅ Remove last point
                        
                        if (patternMarkers.length > 0) {
                            patternMarkers.pop(); // ✅ Remove the last marker
                            LightweightCharts.createSeriesMarkers(mainSeries, patternMarkers); // ✅ Update chart markers
                            document.getElementById("drawPatternStatus").innerText = "--";
                        }
                    }
                    
                }

            }
            // ✅ If we are in pattern mode but NOT in draw mode, remove EVERYTHING
            else if (Mode === "drawPatternMode" && !drawMode) {
                console.log("DEBUG: Deleting Entire Pattern"); // ✅ Debugging

                // ✅ Remove all pattern points
                patternPoints = [];

                // ✅ Remove all pattern lines
                patternTrendlines.forEach(line => chart.removeSeries(line));
                patternTrendlines = [];

                patternMarkers.pop(); // ✅ Remove the last marker
                patternMarkers.pop(); // ✅ Remove the first marker
                LightweightCharts.createSeriesMarkers(mainSeries, patternMarkers); // ✅ Update chart markers
                document.getElementById("drawPatternStatus").innerText = "--";

                document.querySelector("footer").innerText = "🗑️ Entire Pattern Deleted";
            }
            
            if (window.currentMode === "breakoutLineMode") {
                console.log("🗑 Resetting Breakout Line...");
    
                // ✅ Remove all breakout lines from chart
                breakoutTrendlines.forEach(line => chart.removeSeries(line));
                breakoutTrendlines = [];
    
                breakoutPoints = []; // ✅ Clear stored points
                resetBreakoutLineStatus(); // ✅ Reset UI status
            }

            if (window.currentMode === "stopLineMode") {
                console.log("🗑 Resetting Stop Line...");
    
                // ✅ Remove all stop lines from chart
                stopTrendlines.forEach(line => chart.removeSeries(line));
                stopTrendlines = [];
    
                stopPoints = []; // ✅ Clear stored points
                resetStopLineStatus(); // ✅ Reset UI status
            }

            if (window.currentMode === "volDryUpMode" && drawMode) {
                if (volDryUpMarkers.length > 0) {
                    console.log("🗑 Removing Last Vol Dry-Up Marker...");
                    
                    volDryUpMarkers.pop(); // ✅ Remove last marker
                    
                    LightweightCharts.createSeriesMarkers(mainSeries, volDryUpMarkers); // ✅ Update chart
                    
                    // ✅ Reset status if no markers remain
                    if (volDryUpMarkers.length === 0) {
                        resetVolDryUpStatus();
                    }
                }
            } else if (Mode === "volDryUpMode" && !drawMode) {
                // ✅ Remove all markers from the array one by one
                while (volDryUpMarkers.length > 0) {
                    volDryUpMarkers.pop();
                }

                // ✅ Ensure chart updates properly
                LightweightCharts.createSeriesMarkers(mainSeries, volDryUpMarkers);

                resetVolDryUpStatus(); // ✅ Reset UI status

            }


            // ✅ Delete logic for Shakeout Markers
            if (window.currentMode === "shakeoutMode" && drawMode) {
                if (shakeoutMarkers.length > 0) {
                    console.log("🗑 Removing Last Shakeout Marker...");
                    shakeoutMarkers.pop();
                    LightweightCharts.createSeriesMarkers(mainSeries, shakeoutMarkers);
                    if (shakeoutMarkers.length === 0) resetShakeoutStatus();
                }
            } else if (window.currentMode === "shakeoutMode" && !drawMode) {
                console.log("🗑 Removing All Shakeout Markers...");
                // ✅ Remove all markers from the array one by one
                while (shakeoutMarkers.length > 0) {
                    shakeoutMarkers.pop();
                }
                LightweightCharts.createSeriesMarkers(mainSeries, shakeoutMarkers);
                resetShakeoutStatus();
            }




            if (window.currentMode === "followThruMode" && drawMode ) {
                if (followThruMarkers.length > 0) {
                    console.log("🗑 Removing Last Follow Thru Marker...");
                    followThruMarkers.pop(); // ✅ Remove last marker
                    LightweightCharts.createSeriesMarkers(mainSeries, followThruMarkers);
            
                    if (followThruMarkers.length === 0) {
                        resetFollowThruStatus();
                    }
                }
            } else if (window.currentMode === "followThruMode" && !drawMode ) {
                // ✅ Remove all markers from the array one by one
                while (followThruMarkers.length > 0) {
                    followThruMarkers.pop();
                }
                // ✅ Ensure chart updates properly
                LightweightCharts.createSeriesMarkers(mainSeries, followThruMarkers);
                resetFollowThruStatus();
            }


            // ✅ Delete logic for Inside Day Markers
            if (window.currentMode === "insideDayMode" && drawMode) {
                if (insideDayMarkers.length > 0) {
                    console.log("🗑 Removing Last Inside Day Marker...");
                    insideDayMarkers.pop();
                    LightweightCharts.createSeriesMarkers(mainSeries, insideDayMarkers);
                    if (insideDayMarkers.length === 0) resetInsideDayStatus();
                }
            } else if (window.currentMode === "insideDayMode" && !drawMode) {
                console.log("🗑 Removing All Inside Day Markers...");
                while (insideDayMarkers.length > 0) {
                    insideDayMarkers.pop();
                }
                LightweightCharts.createSeriesMarkers(mainSeries, insideDayMarkers);
                resetInsideDayStatus();
            }

            if (window.currentMode === "earningsDayMode" && drawMode) {
                if (earningsDayMarkers.length > 0) {
                    console.log("🗑 Removing Last Earnings Day Marker...");
            
                    earningsDayMarkers.pop(); // ✅ Remove last marker
                    LightweightCharts.createSeriesMarkers(mainSeries, earningsDayMarkers); // ✅ Update chart
            
                    if (earningsDayMarkers.length === 0) {
                        resetEarningsDayStatus();
                    }
                }
            } else if (window.currentMode === "earningsDayMode" && !drawMode) {
                console.log("🗑 Removing All Inside Day Markers...");
                while (earningsDayMarkers.length > 0) {
                    earningsDayMarkers.pop();
                }
                LightweightCharts.createSeriesMarkers(mainSeries, earningsDayMarkers);
                resetEarningsDayStatus();
            }

            if (window.currentMode === "buyMode" && drawMode) {
                if (buyMarkers.length > 0) {
                    console.log("🗑 Removing Last Buy Marker...");
                    buyMarkers.pop(); // ✅ Remove last buy marker
            
                    // ✅ Ensure chart updates only buy markers
                    LightweightCharts.createSeriesMarkers(mainSeries, buyMarkers);

                    // ✅ Remove last buy line if one exists
                    if (buyLines.length > 0) {
                        const lastLine = buyLines.pop(); // ✅ Remove from array
                        chart.removeSeries(lastLine); // ✅ Remove from chart
                    }
            
                    // ✅ Reset status if no buy markers remain
                    if (buyMarkers.length === 0) {
                        resetBuyStatus();
                    }
                }
            } else if (window.currentMode === "buyMode" && !drawMode) {
                // ✅ Remove all sell markers without affecting buy markers
                while (buyMarkers.length > 0) {
                    buyMarkers.pop();
                }
                // ✅ Update chart with only sell markers
                LightweightCharts.createSeriesMarkers(mainSeries, buyMarkers);
                // ✅ Remove all sell lines from the chart
                while (buyLines.length > 0) {
                    const line = buyLines.pop(); // ✅ Remove from array
                    chart.removeSeries(line);     // ✅ Remove from chart
                }
                resetBuyStatus();
            }

            if (window.currentMode === "sellMode" && drawMode) {
                if (sellMarkers.length > 0) {
                    console.log("🗑 Removing Last Sell Marker...");
                    sellMarkers.pop(); // ✅ Remove last sell marker
                    LightweightCharts.createSeriesMarkers(mainSeries, sellMarkers);

                    // ✅ Remove last sell line if one exists
                    if (sellLines.length > 0) {
                        const lastLine = sellLines.pop(); // ✅ Remove from array
                        chart.removeSeries(lastLine); // ✅ Remove from chart
                    }
            
                    // ✅ Reset status if no sell markers remain
                    if (sellMarkers.length === 0) {
                        // ✅ Remove all sell markers without affecting buy markers
                        while (sellMarkers.length > 0) {
                            sellMarkers.pop();
                        }
                        // ✅ Update chart with only sell markers
                        LightweightCharts.createSeriesMarkers(mainSeries, sellMarkers);
                        // ✅ Remove all sell lines from the chart
                        while (sellLines.length > 0) {
                            const line = sellLines.pop(); // ✅ Remove from array
                            chart.removeSeries(line);     // ✅ Remove from chart
                        }
                        resetSellStatus();
                    }
                }
            } else if (window.currentMode === "sellMode" && !drawMode) {
                // ✅ Remove all sell markers without affecting buy markers
                while (sellMarkers.length > 0) {
                    sellMarkers.pop();
                }
                // ✅ Update chart with only sell markers
                LightweightCharts.createSeriesMarkers(mainSeries, sellMarkers);
                // ✅ Remove all sell lines from the chart
                while (sellLines.length > 0) {
                    const line = sellLines.pop(); // ✅ Remove from array
                    chart.removeSeries(line);     // ✅ Remove from chart
                }
                resetSellStatus();
            }

            
            

            if (window.currentMode === "harmonicsLineMode" && drawMode) {
                console.log("🗑 Resetting Harmonics Lines...");
            
                if (drawMode && harmonicsTrendlines.length > 0) {
                    // ✅ Remove ONLY the last harmonic line
                    const lastHarmonicLine = harmonicsTrendlines.pop();
                    chart.removeSeries(lastHarmonicLine);
                    harmonicsPoints.pop(); // ✅ Remove last stored points
            
                    console.log("🗑 Deleted LAST Harmonic Line.");
                } else {
                    // ✅ Remove ALL harmonic lines when drawMode is OFF
                    harmonicsTrendlines.forEach(line => chart.removeSeries(line));
                    harmonicsTrendlines = [];
                    harmonicsPoints = [];
            
                    console.log("🗑 Deleted ALL Harmonic Lines.");
                    resetHarmonicsLineStatus(); // ✅ Reset UI status
                }
            } else if (window.currentMode === "harmonicsLineMode" && !drawMode) {
                harmonicsPoints = []; // Reset previous points

                // ✅ Remove all stored harmonics trendlines from the chart
                harmonicsTrendlines.forEach(line => chart.removeSeries(line));
                harmonicsTrendlines = []; // ✅ Clear the array reference
                resetHarmonicsLineStatus(); // ✅ Reset UI status
            }

            

            

        }
    }); // END: Delete Key Handling


    document.addEventListener("keydown", function (event) {
        if (event.metaKey) {
            tradeAllocation = tradeAllocation === "¼" ? "½" : tradeAllocation === "½" ? "Full" : "¼";
            console.log(`Allocation: ${tradeAllocation}`);

            // ✅ Update allocation text dynamically
            const allocDiv = document.getElementById("allocation-text");
            if (allocDiv) {
                allocDiv.innerText = `${tradeAllocation} Position`;
                allocDiv.style.display = (window.currentMode === "buyMode" || window.currentMode === "sellMode") ? "block" : "none";
            }
        }
    });
    

    // Toggle Draw Mode (⌘ for Mac, Ctrl for Windows)
    document.addEventListener("keydown", (event) => {
        if (event.code === "Space" && window.currentMode != "") {  // ✅ Spacebar
            drawMode = !drawMode; 
            
            document.querySelector("footer").innerText = `Draw Mode: ${drawMode ? "ON ✏️" : "OFF"}`;
            document.body.style.cursor = drawMode ? "crosshair" : "default";
            document.getElementById("draw-mode-icon").style.display = drawMode ? "block" : "none"; 
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
        }
    }); // END: Toggle Draw Mode


    // FUNCTION: Handle Stock Input Change
    document.getElementById("stockInput").addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            const newTicker = this.value.trim().toUpperCase();
            if (newTicker) {
                selectedTicker = newTicker; // ✅ Update global variable
                loadRealStockData(); // ✅ Reload chart with new stock data
                document.querySelector("footer").innerText = `📈 Loaded: ${selectedTicker}`;
            }
        }
    });

    // ✅ Ensure chart resizes properly on window resize
    window.addEventListener("resize", () => {
        if (window.chart) {
            window.chart.resize(window.innerWidth, window.innerHeight);
            console.log("📏 Chart resized to:", window.innerWidth, "x", window.innerHeight);
        } else {
            console.warn("⚠️ Chart is not defined during resize event.");
        }
    }); // END: window resize


    /*
    // ✅ Event Listener for Mode Selection
    document.getElementById("modeToggle").addEventListener("change", function () {
        const selectedMode = this.value;
        console.log(`🛠 Mode Changed: ${selectedMode}`);

        // Store the selected mode globally for reference
        window.currentMode = selectedMode;

        // Visual feedback in the footer
        document.querySelector("footer").innerText = `🎯 Current Mode: ${selectedMode}`;
    });
    */

    // ✅ Event Listener for Mode Selection (Using Buttons Instead of Dropdown)
    document.querySelectorAll(".mode-btn").forEach(button => {
        button.addEventListener("click", function () {
            const selectedMode = this.dataset.mode;
            console.log(`🛠 Mode Changed: ${selectedMode}`);

            // Store the selected mode globally for reference
            window.currentMode = selectedMode;

            // Visual feedback in the footer
            document.querySelector("footer").innerText = `🎯 Current Mode: ${selectedMode}`;

            // Remove active state from all buttons and highlight selected one
            document.querySelectorAll(".mode-btn").forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
        });
    });

    document.getElementById("savePatternButton").addEventListener("click", function() {
        const patternType = document.getElementById("patternType").value; // Get pattern type
        savePatternData(patternType, selectedTicker, stockData);  // ✅ Pass stockData
    });

    document.getElementById("confirmSave").addEventListener("click", function() {
        sendPatternDataToDB();  // ✅ Pass stockData
    });

    // Close the pop-up when clicking "Cancel"
    document.getElementById("cancelSave").addEventListener("click", function() {
        document.getElementById("savePopup").style.display = "none";
    });


    document.getElementById("savedPatternsHeader").addEventListener("click", function () {
        const savedPatternsList = document.getElementById("savedPatternsList");
        const toggleArrow = document.querySelector(".toggle-arrow");
    
        // Toggle hidden class
        savedPatternsList.classList.toggle("hidden");
    
        // Rotate arrow
        if (savedPatternsList.classList.contains("hidden")) {
            toggleArrow.style.transform = "rotate(0deg)";
        } else {
            toggleArrow.style.transform = "rotate(180deg)";
        }
    });

    document.querySelectorAll(".mode-btn").forEach(button => {
        button.addEventListener("click", function() {
            // Remove active state from all buttons
            document.querySelectorAll(".mode-btn").forEach(btn => btn.classList.remove("active"));
    
            // Add active class to selected button
            this.classList.add("active");
    
            // Trigger mode change event (this keeps existing event listeners working)
            const mode = this.dataset.mode;
            document.dispatchEvent(new CustomEvent("modeChange", { detail: mode }));
        });
    });

    

    document.getElementById("patternType").addEventListener("change", function() {
        const selectedPattern = this.value;
        const checklist = document.getElementById("patternChecklist");
        const resetBtn = document.getElementById("resetChecklistBtn");
    
        if (selectedPattern === "please select") {
            checklist.classList.add("hidden");
            resetBtn.style.display = "none"; // ✅ Hide Reset Button if checklist is hidden
            return;
        }
    
        // ✅ Show the checklist
        checklist.classList.remove("hidden");
        resetBtn.style.display = "inline-block"; // ✅ Show Reset Button when checklist is visible
    
        // ✅ Change the title dynamically
        document.getElementById("patternTitle").innerText = `Define Pattern: ${selectedPattern}`;
    
        // ✅ Reset checklist values
        resetPatternChecklist();
    
        // ✅ Track the selected pattern type globally
        window.activePattern = selectedPattern;
    });

    document.getElementById("resetChecklistBtn").addEventListener("click", function () {
        console.log("🔄 Manual Checklist Reset Triggered");
        resetChecklist();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key.toLowerCase() === "s") {
            const snapToggle = document.getElementById("snapModeToggle");
            snapToggle.checked = !snapToggle.checked; // ✅ Toggle the checkbox state
    
            console.log(`🎯 Snap Mode: ${snapToggle.checked ? "ON" : "OFF"}`);
        }
    });

    document.getElementById("reloadChartBtn").addEventListener("click", async () => {
        console.warn("⚠️ Emergency Chart Reload Triggered!");
    
        try {
            //resetMarkersAndLines(); // Clears all markers and trendlines
            await loadRealStockData(); // Reloads stock data
            console.log("✅ Chart Reloaded Successfully!");
        } catch (error) {
            console.error("❌ Error Reloading Chart:", error);
        }
    });



}, 500); // 🕐 Ensure everything initializes before event listeners
});
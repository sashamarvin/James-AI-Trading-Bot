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

    window.currentMode = "trendlineMode"; // Default Mode
    
    chart.subscribeClick(param => {
        if (!param.time) return;

        const bar = param.seriesData.get(mainSeries);
        if (!bar) return;

        const cursorPrice = mainSeries.coordinateToPrice(param.point.y);
        const snapPrice = findClosestPrice(cursorPrice, bar);

        // 🛠 Get the currently selected mode
        const currentMode = window.currentMode || "trendlineMode"; 

        if (currentMode === "trendlineMode" && drawMode) {
            if (!startPoint) {
                startPoint = { time: param.time, value: snapPrice };

                dynamicMarkers.push({
                    time: startPoint.time,
                    position: "belowBar",
                    color: "blue",
                    shape: "arrowUp",
                    text: "",
                });

                LightweightCharts.createSeriesMarkers(mainSeries, dynamicMarkers);
            } else {
                let endPoint = { time: param.time, value: snapPrice };

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
            const newPoint = { time: param.time, value: snapPrice };
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
            }
            
        }
        if (currentMode === "breakoutLineMode" && drawMode) {
            const time = param.time;
            const cursorPrice = mainSeries.coordinateToPrice(param.point.y); // ✅ Free cursor position

            breakoutPoints.push({ time, value: cursorPrice });

            // console.log("📌 DEBUG: Clicked Breakout Point →", { time, cursorPrice });
            
            if (breakoutPoints.length === 2) {
                // ✅ Ensure final breakout line uses **free cursor points**
                drawBreakoutLine(breakoutPoints);

                // ✅ Remove the temp preview line
                if (breakoutPreviewLine) {
                    breakoutPreviewLine.setData([]); // Clears data
                    chart.removeSeries(breakoutPreviewLine); // ✅ Completely remove the series
                    breakoutPreviewLine = null;
                }

            }
        }
    
        // 📝 Always update the footer with latest click info if not drawMode
        document.querySelector("footer").innerText =
            `📌 Clicked on: ${param.time} | O: ${bar.open} H: ${bar.high} L: ${bar.low} C: ${bar.close}`;
    
    }); // END: chart.subscribeClick

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

                document.querySelector("footer").innerText = "🗑️ Entire Pattern Deleted";
            }

            if (Mode === "breakoutLineMode") {
                markBreakoutLineComplete(); // ✅ Mark as completed
            }
            
            

        }
    }); // END: Delete Key Handling

    

    // Toggle Draw Mode (⌘ for Mac, Ctrl for Windows)
    document.addEventListener("keydown", (event) => {
        if (event.metaKey || event.ctrlKey) {
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
        // Hide all pattern checklists
        document.querySelectorAll("#VCPshort, #VCP, #TightFlag").forEach(div => div.classList.add("hidden"));
    
        // Show the selected pattern's checklist
        const selectedPattern = this.value;
        const checklist = document.getElementById(selectedPattern);
        if (checklist) checklist.classList.remove("hidden");
    });



}, 500); // 🕐 Ensure everything initializes before event listeners
});
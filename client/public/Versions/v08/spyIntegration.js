// ✅ Load SPY Data from CSV
async function loadSPYData(stockData) {
    try {
        const response = await fetch("alphavantage_SPY.csv");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const text = await response.text();
        const rows = text.split("\n").slice(1); // Skip header

        let spyData = {};
        const stockDates = new Set(stockData.map(d => d.time)); // Get stock date range

        rows.forEach(row => {
            const [date, open, high, low, close] = row.split(",");
            if (stockDates.has(date.trim())) { // ✅ Only keep matching dates
                spyData[date.trim()] = parseFloat(close);
            }
        });

        console.log("📊 SPY Data Loaded →", Object.entries(spyData).slice(0, 5));
        return spyData;
    } catch (error) {
        console.error("❌ ERROR: Failed to load SPY data!", error);
        return {};
    }
}

function integrateSPYAndRS(stockData, spyData, chart, allSeries) {
    // ✅ Extract last 10 trading days for scaling
    const lastTwoWeeksStock = stockData.slice(-10);
    const stockMin = Math.min(...lastTwoWeeksStock.map(d => d.close));
    const stockMax = Math.max(...lastTwoWeeksStock.map(d => d.close));

    const lastTwoWeeksSPY = Object.keys(spyData).slice(-10).map(date => spyData[date]);
    const spyMin = Math.min(...lastTwoWeeksSPY);
    const spyMax = Math.max(...lastTwoWeeksSPY);

    // ✅ Declare `rescaledSPY` before the loop
    const rescaledSPY = {};  

    // ✅ Rescale SPY to fit stock scale without excessive magnitude
    for (let date in spyData) {
        rescaledSPY[date] = stockMax + ((spyData[date] - spyMin) / (spyMax - spyMin)) * (stockMax - stockMin) * 0.15; 
    }

    console.log("📊 DEBUG: Rescaled SPY Data →", Object.entries(rescaledSPY).slice(0, 5));

    // ✅ Convert Rescaled SPY Object to Array for Charting
    let spyChartData = Object.keys(rescaledSPY).map(date => ({
        time: date,
        value: rescaledSPY[date]
    }));

    console.log("📊 DEBUG: Adjusted SPY Data →", spyChartData.slice(0, 5));

    // ✅ Plot SPY Line
    const spySeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: "black",
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dotted,
    });

    spySeries.setData(spyChartData);
    allSeries.push(spySeries);

    console.log("📊 SPY Plotted → First 5:", spyChartData.slice(0, 5));

    // ✅ Add SPY Marker at Last Point
    const lastSPYPoint = spyChartData[spyChartData.length - 1];
    if (lastSPYPoint) {
        const spyMarker = [{
            time: lastSPYPoint.time,
            position: "belowBar",
            color: "black",
            shape: "circle",
            text: "SPY",
            size: 0.1
        }];
        LightweightCharts.createSeriesMarkers(spySeries, spyMarker);
        console.log("📊 DEBUG: SPY Marker →", spyMarker);
    }

    // ✅ Calculate RS for Each Data Point
    stockData.forEach((bar) => {
        if (rescaledSPY[bar.time]) {
            bar.rs = (bar.close / rescaledSPY[bar.time]).toFixed(3);
        } else {
            bar.rs = null;
        }
    });

    // ✅ Find RS Min/Max for Scaling
    const rsValues = stockData.map(bar => bar.rs ? parseFloat(bar.rs) : null).filter(val => val !== null);
    const rsMin = Math.min(...rsValues);
    const rsMax = Math.max(...rsValues);

    // ✅ Normalize RS to Fit Stock Chart Scale
    const normalizedRSData = stockData.map(bar => ({
        time: bar.time,
        value: bar.rs ? ((parseFloat(bar.rs) - rsMin) / (rsMax - rsMin)) * (stockMax - stockMin) + stockMin : null
    }));

    console.log("📊 DEBUG: Normalized RS Values →", normalizedRSData.slice(0, 5));

    // ✅ Plot RS Line
    const rsSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: "orange",
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dotted,
    });

    rsSeries.setData(normalizedRSData);
    allSeries.push(rsSeries);

    // ✅ Add RS Marker at Last Point
    const lastRSPoint = normalizedRSData[normalizedRSData.length - 1];
    if (lastRSPoint) {
        const rsMarker = [{
            time: lastRSPoint.time,
            position: "belowBar",
            color: "orange",
            shape: "circle",
            text: `RS: ${(parseFloat(stockData[stockData.length - 1].rs) * 100).toFixed(0)}`,
            size: 0.5,
        }];
        LightweightCharts.createSeriesMarkers(rsSeries, rsMarker);
    }

    console.log("📊 RS Plotted → Last Value:", lastRSPoint);
}
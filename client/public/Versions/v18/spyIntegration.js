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
    // ✅ Rescale SPY to fit stock scale with a 15% offset above stock price
    for (let date in spyData) {
        const offsetFactor = 1.10;  // ✅ 15% above stock max
        rescaledSPY[date] = (stockMax * offsetFactor) + ((spyData[date] - spyMin) / (spyMax - spyMin)) * (stockMax - stockMin) * 0.5;
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

    ///// RS SECTION HERE


    stockData.forEach((bar, index) => {
        const recent = stockData[index]?.close;
        const spyRecent = spyData[bar.time]; // ✅ Ensure `spyRecent` is assigned at the start
    
        // ✅ Compute 10-Day RS
        if (index < 10) {
            bar.rs10 = null;
        } else {
            const past10 = stockData[index - 10]?.close;
            const stockChange10 = ((recent - past10) / past10) * 100;
    
            const spyPast10 = spyData[stockData[index - 10]?.time];
    
            if (spyRecent !== undefined && spyPast10 !== undefined) {
                const spyChange10 = ((spyRecent - spyPast10) / spyPast10) * 100;
                bar.rs10 = stockChange10 - spyChange10;
            } else {
                bar.rs10 = null;
            }
        }
    
        // ✅ Compute 50-Day RS
        if (index >= 50) {
            const past50 = stockData[index - 50]?.close;
            const stockChange50 = ((recent - past50) / past50) * 100;
            const spyPast50 = spyData[stockData[index - 50]?.time];
    
            if (spyRecent !== undefined && spyPast50 !== undefined) {
                const spyChange50 = ((spyRecent - spyPast50) / spyPast50) * 100;
                bar.rs50 = stockChange50 - spyChange50;
            } else {
                bar.rs50 = null;
            }
        }
    
        // ✅ Compute 200-Day RS
        if (index >= 200) {
            const past200 = stockData[index - 200]?.close;
            const stockChange200 = ((recent - past200) / past200) * 100;
            const spyPast200 = spyData[stockData[index - 200]?.time];
    
            if (spyRecent !== undefined && spyPast200 !== undefined) {
                const spyChange200 = ((spyRecent - spyPast200) / spyPast200) * 100;
                bar.rs200 = stockChange200 - spyChange200;
            } else {
                bar.rs200 = null;
            }
        }
    });

    console.log("📊 DEBUG: Last 10 Days of RS Calculations:");
    stockData.slice(-10).forEach(bar => {
        console.log(`📊 ${bar.time} | RS10: ${bar.rs10?.toFixed(2)} | RS50: ${bar.rs50?.toFixed(2)} | RS200: ${bar.rs200?.toFixed(2)}`);
    });
    

    
}
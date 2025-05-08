// ✅ Compute True Range & ATR(10)
function calculateATR(stockData, period = 10) {
    let atrData = [];
    
    for (let i = 0; i < stockData.length; i++) {
        const bar = stockData[i];
        const prevBar = stockData[i - 1] || bar;  // Use current bar if first day

        const trueRange = Math.max(
            bar.high - bar.low,
            Math.abs(bar.high - prevBar.close),
            Math.abs(bar.low - prevBar.close)
        );

        if (i < period) {
            atrData.push({ time: bar.time, value: null }); // Not enough data
        } else {
            // Compute ATR using the smoothed method
            const prevATR = atrData[i - 1]?.value || trueRange;
            const atr = ((prevATR * (period - 1)) + trueRange) / period;
            atrData.push({ time: bar.time, value: atr });
        }
    }

    return atrData;
}

// ✅ Store ATR(10) for Later Use
function integrateATR(stockData) {
    const atr10Data = calculateATR(stockData, 10);

    // Attach ATR values to stockData for AI learning
    stockData.forEach((bar, i) => {
        bar.atr10 = atr10Data[i]?.value || null;
    });

}

// ✅ Compute EMA for a given period
function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = [];
    let prevEMA = data[0].close; // Start with first close price

    for (let i = 0; i < data.length; i++) {
        const currentEMA = (data[i].close * k) + (prevEMA * (1 - k));
        ema.push({ time: data[i].time, value: currentEMA });
        prevEMA = currentEMA;
    }
    return ema;
}



// ✅ Compute and Plot EMA10
function calculateAndPlotEma10(stockData, chart, allSeries) {
    const ema10Data = calculateEMA(stockData, 10);

    const ema10Series = chart.addSeries(LightweightCharts.LineSeries, {
        color: 'rgba(52, 152, 219, 0.7)', // ✅ Soft Blue, 70% opacity
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Solid,
    });

    ema10Series.setData(ema10Data);
    allSeries.push(ema10Series);

    // ✅ Disable Hover Dots for EMA10
    ema10Series.applyOptions({
        crosshairMarkerVisible: false, // 🚀 Extra check
    });


    //console.log("📊 EMA10 Plotted →", ema10Data.slice(0, 5));
}

function integrateEMA(stockData) {
    const ema10Data = calculateEMA(stockData, 10);

    // Attach EMA values to stockData for AI learning
    stockData.forEach((bar, i) => {
        bar.ema10 = ema10Data[i]?.value || null;
    });
}

// ✅ Compute Volume SMA for a given period
function calculateVolumeSMA(volumeData, period = 50) {
    let sma = [];
    for (let i = 0; i < volumeData.length; i++) {
        if (i < period - 1) {
            sma.push({ time: volumeData[i].time, value: null }); // Not enough data yet
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += volumeData[i - j].value;
        }
        let avg = sum / period;
        sma.push({ time: volumeData[i].time, value: avg });
    }
    return sma;
}



// ✅ Compute and Plot Volume with 50-day SMA
function addVolumeAndVolAvg50(stockData, chart, allSeries) {
    // ✅ Clean volume data
    const volumeData = stockData
        .filter(bar => bar.volume)
        .map(bar => ({
            time: bar.time,
            value: bar.volume,
            color: bar.close > bar.open ? 'rgba(100, 149, 237, 0.4)' : 'rgba(135, 206, 250, 0.35)',
        }));

    if (volumeData.length === 0) {
        console.warn("⚠️ No valid volume data to display.");
        return;
    }

    // ✅ Add Volume Histogram
    const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume-scale',
    });

    // ✅ Force volume to start at the bottom
    volumeSeries.priceScale().applyOptions({
        scaleMargins: {
            top: 0.5,  // ✅ Push volume up
            bottom: 0,  // ⛔ Removes any empty space below the volume bars
        },
    });

    volumeSeries.setData(volumeData);
    allSeries.push(volumeSeries);

    // ✅ Compute and Plot Volume SMA 50
    const volumeSMA50 = calculateVolumeSMA(volumeData, 50);

    const volumeSmaSeries = chart.addSeries(LightweightCharts.LineSeries, {
        color: 'rgba(255, 179, 71, 0.85)', // Brighter for visibility
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Solid,
        priceScaleId: 'volume-scale', // ✅ Assign to same scale as volume
    });

    volumeSmaSeries.setData(volumeSMA50);
    allSeries.push(volumeSmaSeries);

    //console.log("📊 Volume & 50-SMA Plotted →", volumeSMA50.slice(0, 5));
}

// ✅ Store Volume in Stock Data
function integrateVolumeData(stockData) {
    stockData.forEach(bar => {
        bar.volume = bar.volume || null;  // ✅ Ensure volume is present
    });

    //console.log("📊 Volume Data Integrated →", stockData.slice(0, 5));  // ✅ Debug Output
}


function integrateVolumeSMA50(stockData, period = 50) {
    //console.log("✅ Checking if `integrateVolumeSMA50()` is executing...");

    if (!stockData.some(bar => bar.volume)) {
        console.warn("⚠️ No volume data found, skipping SMA50 calculation.");
        return;
    }

    let sum = 0;

    for (let i = 0; i < stockData.length; i++) {
        if (i < period - 1) {
            stockData[i].volumeSMA50 = null;  // ✅ Not enough data yet
            continue;
        }

        sum = stockData.slice(i - period + 1, i + 1).reduce((acc, bar) => acc + (bar.volume || 0), 0);
        stockData[i].volumeSMA50 = parseFloat((sum / period).toFixed(2));  // ✅ Store directly
    }

    //console.log("📊 Debug: First 5 `stockData` Entries AFTER Calculating `volumeSMA50`:", stockData.slice(0, 5));
}
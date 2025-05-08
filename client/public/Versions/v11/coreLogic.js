function findClosestPrice(clickPrice, bar) {
    const prices = [bar.open, bar.high, bar.low, bar.close];
    return prices.reduce((closest, curr) =>
        Math.abs(curr - clickPrice) < Math.abs(closest - clickPrice) ? curr : closest
    );
} // END: findClosestPrice

let selectedTicker = "CART";  // Placeholder, dynamically replace later
let stockData = [];  // ✅ Declare globally
let drawMode = false;
let startPoint = null;
let trendlines = [];
let dynamicMarkers = [];
let mainSeries = null;
let ema10Series = null;
let volumeSeries = null;
let volumeSmaSeries = null;
let allSeries = [];  // ✅ Track all series in an array
let patternPoints = []; // ✅ Store pattern click points for drawing
let patternTrendlines = []; // ✅ Store drawn pattern trendlines
let drawPatternMode = false;
let patternMarkers = [];
let supportLevels = [];  // ⏳ To Do: Detect support levels
let resistanceLevels = [];  // ⏳ To Do: Detect resistance levels
let volumeDryUpDays = [];
let patternData = [];

const USE_OHLC_BARS = true; // ✅ Change to `true` for OHLC bars

async function loadRealStockData() {

    // ✅ Remove all drawn trendlines
    if (trendlines.length > 0) {
        trendlines.forEach(line => chart.removeSeries(line));
        trendlines = []; // ✅ Reset trendline array
    }

    // ✅ Clear all dynamic markers
    if (dynamicMarkers.length > 0) {
        dynamicMarkers = []; // ✅ Clear stored markers
        LightweightCharts.createSeriesMarkers(mainSeries, dynamicMarkers);
    }

    // ✅ Remove all previous series
    if (allSeries.length > 0) {
        allSeries.forEach(series => chart.removeSeries(series));
        allSeries = [];  // ✅ Clear tracking array
    }

    // ✅ Fetch new stock data
    stockData = await fetchStockData();
    if (stockData.length === 0) return;

    const spyData = await loadSPYData(stockData); // ✅ Now passes stockData for filtering

    if (Object.keys(spyData).length === 0) {
        console.warn("⚠️ SPY data unavailable, skipping RS calculation.");
    }

    // ✅ Choose Series Type Based on `USE_OHLC_BARS`
    if (USE_OHLC_BARS) {
        mainSeries = chart.addSeries(LightweightCharts.BarSeries, {
            upColor: '#26a69a',
            downColor: '#e74c3c',
            thinBars: false, // ✅ Old OHLC Style
            openVisible: false, // ✅ Removes Open Thick
        });
    } else {
        mainSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#e74c3c',
            borderUpColor: '#26a69a',
            borderDownColor: '#e74c3c',
            wickUpColor: '#26a69a',
            wickDownColor: '#e74c3c',
        });
    }

    mainSeries.setData(stockData);
    allSeries.push(mainSeries);  // ✅ Track this series

    integrateSPYAndRS(stockData, spyData, chart, allSeries);
    calculateAndPlotEma10(stockData, chart, allSeries);
    addVolumeAndVolAvg50(stockData, chart, allSeries);
    integrateATR(stockData);
    

} // END: loadRealStockData
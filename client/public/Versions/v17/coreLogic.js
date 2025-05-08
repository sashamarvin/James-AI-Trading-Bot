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
let breakoutPoints = [];
let breakoutPreviewLine = null;
let breakoutTrendlines = [];
let stopPoints = [];
let stopPreviewLine = null;
let stopTrendlines = [];
let volDryUpMarkers = []; // ✅ Store markers
let shakeoutMarkers = []; // ✅ Store markers
let followThruMarkers = []; // ✅ Store Follow Thru Day markers
let buyMarkers = []; // Stores buy/sell points
let sellMarkers = [];
let tradeAllocation = "¼"; // Default allocation

const USE_OHLC_BARS = true; // ✅ Change to `true` for OHLC bars

async function loadRealStockData() {
    // ✅ Clear all trendlines, markers, and series
    if (trendlines.length > 0) {
        trendlines.forEach(line => chart.removeSeries(line));
        trendlines = [];
    }
    if (patternTrendlines.length > 0) {
        patternTrendlines.forEach(line => chart.removeSeries(line));
        patternTrendlines = [];
    }
    if (dynamicMarkers.length > 0) {
        dynamicMarkers = [];
        LightweightCharts.createSeriesMarkers(mainSeries, dynamicMarkers);
    }
    if (patternMarkers.length > 0) {
        patternMarkers = [];
        LightweightCharts.createSeriesMarkers(mainSeries, patternMarkers);
    }
    if (allSeries.length > 0) {
        allSeries.forEach(series => chart.removeSeries(series));
        allSeries = [];
    }

    // ✅ Reset key tracking arrays
    patternPoints = [];
    supportLevels = [];
    resistanceLevels = [];
    volumeDryUpDays = [];
    patternData = [];
    stockData = [];

    console.log("🗑️ Reset pattern data, levels, and volume dry-up days.");

    // ✅ Fetch new stock data
    stockData = await fetchStockData();
    if (stockData.length === 0) return;

    // ✅ Fetch SPY Data
    const spyData = await loadSPYData(stockData);

    // ✅ Set up main chart series inside this function
    if (USE_OHLC_BARS) {
        mainSeries = chart.addSeries(LightweightCharts.BarSeries, {
            upColor: '#26a69a',
            downColor: '#e74c3c',
            thinBars: false,
            openVisible: false,
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

    allSeries.push(mainSeries); // ✅ Track the main chart series

    // ✅ Now that `mainSeries` exists, set stock data
    mainSeries.setData(stockData);

    // ✅ Continue with indicators and RS calculation
    integrateSPYAndRS(stockData, spyData, chart, allSeries);
    calculateAndPlotEma10(stockData, chart, allSeries);
    addVolumeAndVolAvg50(stockData, chart, allSeries);
    integrateATR(stockData);

} // END: loadRealStockData


dailyData = [
    {
      time: "YYYY-MM-DD",
      open: 123.4,
      high: 125.6,
      low: 120.8,
      close: 124.2,
      volume: 1000000,
      volumeSMA50: 900000,  // 50-day avg volume
      atr10: 2.5,           // ATR(10)
      vcpTightening: true,  // If part of a VCP tightening sequence
      insideDay: false,     // If this was an inside day
      spyRelativeStrength10: 5.2, // RS vs SPY (10-day)
      spyRelativeStrength50: 8.1, // RS vs SPY (50-day)
      spyRelativeStrength200: 12.3, // RS vs SPY (200-day)
    },
    
];

  /*

  {
    "patternType": "VCP_short",
    "ticker": "CART",
    "startDate": "2024-08-01",
    "endDate": "2024-08-16",
    "breakoutDate": "2024-08-17",
    "breakoutPrice": 134.5,
    "majorShapePoints": [
      { "time": "2024-08-01", "price": 120 },
      { "time": "2024-08-05", "price": 122 },
      { "time": "2024-08-10", "price": 118 }
    ],
    "highestHigh": 140.2,
    "lowestLow": 115.5,
    "supportLevels": [120.5, 118.7],
    "resistanceLevels": [130.2, 128.7],
    "dailyData": [...], // Includes all daily values
    "mostSignificantUpDays": [...],
    "mostSignificantDownDays": [...],
    "volatilityDryUp": [...],
    "consolidationConfirmed": true,
    "VolumeDaysDryUp": [...],
  }

  */

  // 🛑 Exit Draw Pattern Mode (Meta Command)
function exitPatternMode() {
    if (patternPoints.length === 0) {
        console.log("⚠️ No points selected. Pattern mode exited.");
        return;
    }

    // ✅ Add final dot marker
    const lastPoint = patternPoints[patternPoints.length - 1];
    patternMarkers.push({
        time: lastPoint.time,
        position: "belowBar",
        color: "purple",
        shape: "circle",
        text: "",
    });

    LightweightCharts.createSeriesMarkers(mainSeries, patternMarkers);

    // ✅ Save pattern data
    console.log(`✅ Pattern Saved! ${patternPoints.length} Points Stored.`);
    
    // TODO: Store patternPoints in JSON (if required)
    
    
     
}


function savePatternData(patternType, ticker) {
    if (patternPoints.length < 2) {
        console.warn("Not enough points to save a pattern.");
        return;
    }

    const startDate = patternPoints[0].time;
    const endDate = patternPoints[patternPoints.length - 1].time;
    const breakoutDate = endDate; // Placeholder until logic refines
    const breakoutPrice = patternPoints[patternPoints.length - 1].value;

    // ✅ Extract major points (shape of pattern)
    const majorShapePoints = patternPoints.map(point => ({
        time: point.time,
        price: point.value
    }));

    // ✅ Calculate highest high & lowest low in the pattern
    const prices = patternPoints.map(p => p.value);
    const highestHigh = Math.max(...prices);
    const lowestLow = Math.min(...prices);

    // ✅ Placeholder logic for support & resistance levels
    const supportLevels = [lowestLow + 1.5, lowestLow + 3]; // Adjust later
    const resistanceLevels = [highestHigh - 2, highestHigh - 3]; // Adjust later

    // ✅ Collect relevant daily data
    const dailyData = stockData.filter(day =>
        day.time >= startDate && day.time <= endDate
    ).map(day => ({
        time: day.time,
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        volume: day.volume,
        volumeSMA50: day.volumeSMA50,
        atr10: day.atr10,
        vcpTightening: day.vcpTightening,
        insideDay: day.insideDay,
        spyRelativeStrength10: day.spyRelativeStrength10,
        spyRelativeStrength50: day.spyRelativeStrength50,
        spyRelativeStrength200: day.spyRelativeStrength200
    }));

    // ✅ Identify significant days
    const mostSignificantUpDays = dailyData
        .filter(day => day.close > day.open && day.volume > day.volumeSMA50)
        .map(day => ({ time: day.time, close: day.close, volume: day.volume }));

    const mostSignificantDownDays = dailyData
        .filter(day => day.close < day.open && day.volume > day.volumeSMA50)
        .map(day => ({ time: day.time, close: day.close, volume: day.volume }));

    // ✅ Volume Dry-Up: Days where volume is significantly lower than average
    const volumeDryUp = dailyData
        .filter(day => day.volume < 0.5 * day.volumeSMA50) // Less than 50% of avg volume
        .map(day => ({ time: day.time, volume: day.volume }));

    // ✅ Volatility Contraction: ATR decreasing compared to its recent trend
    const volatilityContraction = dailyData
        .filter((day, index, arr) => index > 0 && day.atr10 < arr[index - 1].atr10)
        .map(day => ({ time: day.time, atr10: day.atr10 }));

    // ✅ Consolidation confirmation (if multiple VCP tightening days)
    const consolidationConfirmed = dailyData.filter(day => day.vcpTightening).length > 2;

    // ✅ Final pattern object
    const patternData = {
        patternType,
        ticker,
        startDate,
        endDate,
        breakoutDate,
        breakoutPrice,
        majorShapePoints,
        highestHigh,
        lowestLow,
        supportLevels,
        resistanceLevels,
        dailyData,
        mostSignificantUpDays,
        mostSignificantDownDays,
        volumeDryUp,
        volatilityContraction,
        consolidationConfirmed,
    };

    console.log("✅ Pattern Saved:", patternData);
    return patternData; // Could be saved to a file or database
}
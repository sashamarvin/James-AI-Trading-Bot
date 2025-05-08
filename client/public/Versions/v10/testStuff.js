/* ✅ Check if MySQL is running
brew services list

# ✅ Start MySQL
brew services start mysql

# ✅ Restart MySQL (if something isn't working)
brew services restart mysql

# ✅ Stop MySQL
brew services stop mysql

# ✅ Connect to MySQL (without password)
mysql -u root

# ✅ Connect to MySQL (if you set a password)
mysql -u root -p

mysql> EXIT;

*/

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
}
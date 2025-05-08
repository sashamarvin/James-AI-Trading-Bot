// ✅ db.js

const mysql = require("mysql2");

// ✅ Connect to MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "trading_patterns",
  password: ""  // Leave empty if no password
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Failed:", err);
    return;
  }
  console.log("✅ MySQL Connected Successfully!");
});

// ✅ Save Pattern Data Function
function sendPatternDataToDB(patternData, res) {

  console.log("🛠 SQL Query About to Run:");
console.log(sql);
console.log("🛠 Values About to Be Inserted:");
console.log(JSON.stringify(values, null, 2));

process.stdout.write("✅ Console Log Flushed\n"); // Forces immediate output


  const sql = `
    INSERT INTO patterns (
        patternType, ticker, startDate, endDate, 
        patternPoints, patternMarkers, 
        supportLevels, resistanceLevels, dailyData, 
        volumeDryUpDays, volatilityContraction, consolidationConfirmed,
        noFlyZonePattern, invalidReason,
        breakoutLevel, breakoutStrength, breakoutType,
        trendStrength, gaps, pullbackType, pullbackDepth,
        buyZoneType, buyAmount, sellAmount, sellReason,
        harmonicLevel, riskRewardRatio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
      patternData.patternType || null,
      patternData.ticker || null,
      patternData.startDate || null,
      patternData.endDate || null,
      JSON.stringify(patternData.patternPoints || []),
      JSON.stringify(patternData.patternMarkers || []),
      JSON.stringify(patternData.supportLevels || []),
      JSON.stringify(patternData.resistanceLevels || []),
      JSON.stringify(patternData.dailyData || []),
      JSON.stringify(patternData.volumeDryUpDays || []),
      toBooleanDB(patternData.volatilityContraction),
      toBooleanDB(patternData.consolidationConfirmed),
      toBooleanDB(patternData.noFlyZonePattern),
      patternData.invalidReason || null,
      patternData.breakoutLevel ?? null,
      patternData.breakoutStrength || null,
      patternData.breakoutType || null,
      patternData.trendStrength || null,
      patternData.gaps || null,
      patternData.pullbackType || null,
      patternData.pullbackDepth ?? null,
      patternData.buyZoneType || null,
      patternData.buyAmount ?? null,
      patternData.sellAmount ?? null,
      patternData.sellReason || null,
      patternData.harmonicLevel ?? null,
      patternData.riskRewardRatio ?? null
  ];
  
    

  db.query(sql, values, (err, result) => {
    if (err) {
      console.log("🛠 ######## Final SQL Query:", sql);
      console.log("🛠 ######## Final Values Before Insert:", values);
      console.error("❌ Database Insert Error:", err);
      res.status(500).send("Database Insert Failed");
    } else {
      console.log("🛠 ######## Final SQL Query:", sql);
      console.log("🛠 ######## Final Values Before Insert:", values);
      console.log("✅ Pattern Saved:", result);
      res.send("✅ Pattern Saved Successfully!");
    }
  });
}

// ✅ Fetch Saved Patterns from DB
function getPatternDataFromDB(res) {
  db.query("SELECT * FROM patterns", (err, results) => {
    if (err) {
      console.error("❌ Error fetching patterns:", err);
      return res.status(500).json({ error: "Database error" });
    }
    console.log(`✅ Retrieved ${results.length} patterns.`);
    res.json(results.length ? results : []);  // ✅ Return empty array if no results
  });
}

// ✅ Export Functions
module.exports = {
  sendPatternDataToDB,
  getPatternDataFromDB,
  db  // ✅ Export `db` in case it's needed elsewhere
};
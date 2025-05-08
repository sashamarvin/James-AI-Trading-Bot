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
    const sql = `
        INSERT INTO patterns (
            patternType, ticker, startDate, endDate, 
            supportLevels, resistanceLevels, dailyData, 
            volumeDryUpDays, volatilityContraction, consolidationConfirmed,
            noFlyZonePattern, invalidReason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        patternData.patternType,
        patternData.ticker,
        patternData.startDate,
        patternData.endDate,
        JSON.stringify(patternData.supportLevels),
        JSON.stringify(patternData.resistanceLevels),
        JSON.stringify(patternData.dailyData),
        JSON.stringify(patternData.volumeDryUpDays),
        patternData.volatilityContraction,
        patternData.consolidationConfirmed,
        patternData.noFlyZonePattern,
        patternData.invalidReason || null
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ Database Insert Error:", err);
            res.status(500).send("Database Insert Failed");
        } else {
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
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
            patternType, ticker, patternPoints, dailyData, breakoutPoints, 
            stopPoints, shakeoutMarkers, followThruMarkers, insideDayMarkers, buyMarkers, 
            sellMarkers, volDryUpMarkers, harmonicsPoints, volatilityContraction, 
            consolidationConfirmed, noFlyZonePattern, invalidReason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        patternData.patternType,
        patternData.ticker,
        JSON.stringify(patternData.patternPoints),
        JSON.stringify(patternData.dailyData),
        JSON.stringify(patternData.breakoutPoints),
        JSON.stringify(patternData.stopPoints),
        JSON.stringify(patternData.shakeoutMarkers),
        JSON.stringify(patternData.followThruMarkers),
        JSON.stringify(patternData.insideDayMarkers),
        JSON.stringify(patternData.buyMarkers),
        JSON.stringify(patternData.sellMarkers),
        JSON.stringify(patternData.volDryUpMarkers),
        JSON.stringify(patternData.harmonicsPoints),
        patternData.volatilityContraction ? 1 : 0,
        patternData.consolidationConfirmed ? 1 : 0,
        patternData.noFlyZonePattern ? 1 : 0,
        patternData.invalidReason || null
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ Database Insert Error:", err);
            res.status(500).send("Database Insert Failed");
        } else {
            console.log("✅ Pattern Saved in DB:", result);
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

function deletePatternFromDB(patternId, res) {
    console.log(`🗑️ Attempting to delete pattern with ID: ${patternId}`); // ✅ Debug log

    const sql = "DELETE FROM patterns WHERE id = ?";
    
    db.query(sql, [patternId], (err, result) => {
        if (err) {
            console.error("❌ Database Delete Error:", err);
            res.status(500).send("Database Delete Failed");
            return;
        }
        
        console.log("✅ Delete Query Result:", result);

        if (result.affectedRows === 0) {
            console.warn("⚠️ No pattern found with that ID!");
            res.status(404).send("Pattern not found");
        } else {
            console.log("✅ Pattern Deleted Successfully!");
            res.send("✅ Pattern Deleted");
        }
    });
}

// ✅ Fetch a single pattern by ID
function getPatternByIdFromDB(patternId, res) {
    db.query("SELECT * FROM patterns WHERE id = ?", [patternId], (err, results) => {
        if (err) {
            console.error("❌ Error fetching pattern:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (results.length === 0) {
            console.warn("⚠️ Pattern not found:", patternId);
            return res.status(404).json({ error: "Pattern not found" });
        }
        //console.log("✅ Retrieved pattern:", results[0]);
        res.json(results[0]); // ✅ Return only the first result
    });
}


function getPatternIDs(res) {
    db.query("SELECT id, ticker, patternType FROM patterns", (err, results) => {
        if (err) {
            console.error("❌ Error fetching pattern IDs:", err);
            return res.status(500).json({ error: "Database error" });
        }
        //console.log("✅ Retrieved pattern metadata:", results);
        res.json(results);
    });
}

// ✅ Export Functions
module.exports = {
  sendPatternDataToDB,
  getPatternDataFromDB,
  deletePatternFromDB,
  getPatternByIdFromDB,
  getPatternIDs,
  db  // ✅ Export `db` in case it's needed elsewhere
};
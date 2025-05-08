const express = require("express");
const path = require("path");
const mysql = require("mysql2");

const app = express();
const PORT = 3000;

// ✅ Use express.json() to parse incoming JSON requests
app.use(express.json()); // This line is important!

// Serve static files (like index.html)
app.use(express.static(path.join(__dirname)));

// ✅ Connect to MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "trading_patterns",
    password: "" // Leave empty if no password
});

// POST request to save pattern data
app.post("/save-pattern", (req, res) => {
    // Extract the data from the request body
    const { 
        patternType, 
        ticker, 
        startDate, 
        endDate, 
        breakoutDate, 
        breakoutPrice, 
        highestHigh, 
        lowestLow, 
        supportLevels, 
        resistanceLevels, 
        dailyData, 
        mostSignificantUpDays, 
        mostSignificantDownDays, 
        volumeDryUp, 
        volatilityContraction, 
        consolidationConfirmed 
    } = req.body;

    // SQL query to insert pattern data into MySQL
    const sql = `INSERT INTO patterns (patternType, ticker, startDate, endDate, breakoutDate, breakoutPrice, highestHigh, lowestLow, supportLevels, resistanceLevels, dailyData, mostSignificantUpDays, mostSignificantDownDays, volumeDryUp, volatilityContraction, consolidationConfirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        patternType,
        ticker,
        startDate,
        endDate,
        breakoutDate,
        breakoutPrice,
        highestHigh,
        lowestLow,
        JSON.stringify(supportLevels),
        JSON.stringify(resistanceLevels),
        JSON.stringify(dailyData),
        JSON.stringify(mostSignificantUpDays),
        JSON.stringify(mostSignificantDownDays),
        JSON.stringify(volumeDryUp),
        JSON.stringify(volatilityContraction),
        consolidationConfirmed
    ];

    // Run the query to insert data into MySQL
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ Database Insert Error:", err);
            res.status(500).send("Database Insert Failed");
        } else {
            console.log("✅ Pattern Saved from UI:", result);
            res.send("✅ Pattern Saved Successfully!");
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/`);
});
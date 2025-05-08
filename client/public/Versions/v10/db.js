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
node db.js #runs the db

# to create the DB
mysql -u root
CREATE DATABASE trading_patterns;
SHOW DATABASES;

USE trading_patterns;
SELECT * FROM patterns;

USE trading_patterns;
SELECT COUNT(*) FROM patterns;



*/

const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",  // Default MySQL user
  password: "",  // Empty since we didn’t set a password
  database: "trading_patterns" // The database we created earlier
});

connection.connect((err) => {
  if (err) {
      console.error("❌ MySQL Connection Failed:", err);
      return;
  }
  console.log("✅ MySQL Connected Successfully!");
});

function insertPattern(patternData) {
  const sql = `
      INSERT INTO patterns 
      (patternType, ticker, startDate, endDate, breakoutDate, breakoutPrice, 
      highestHigh, lowestLow, supportLevels, resistanceLevels, dailyData, 
      mostSignificantUpDays, mostSignificantDownDays, volumeDryUp, 
      volatilityContraction, consolidationConfirmed) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
      patternData.patternType,
      patternData.ticker,
      patternData.startDate,
      patternData.endDate,
      patternData.breakoutDate,
      patternData.breakoutPrice,
      patternData.highestHigh,
      patternData.lowestLow,
      JSON.stringify(patternData.supportLevels),
      JSON.stringify(patternData.resistanceLevels),
      JSON.stringify(patternData.dailyData),
      JSON.stringify(patternData.mostSignificantUpDays),
      JSON.stringify(patternData.mostSignificantDownDays),
      JSON.stringify(patternData.volumeDryUp),
      JSON.stringify(patternData.volatilityContraction),
      patternData.consolidationConfirmed
  ];

  connection.query(sql, values, (err, result) => {
      if (err) {
          console.error("❌ Error inserting pattern:", err);
          return;
      }
      console.log("✅ Pattern inserted successfully! ID:", result.insertId);
  });
}

// ✅ Sample pattern data for testing
const samplePattern = {
  patternType: "VCP_short",
  ticker: "CART",
  startDate: "2024-08-01",
  endDate: "2024-08-16",
  breakoutDate: "2024-08-17",
  breakoutPrice: 134.5,
  highestHigh: 140.2,
  lowestLow: 115.5,
  supportLevels: [120.5, 118.7],
  resistanceLevels: [130.2, 128.7],
  dailyData: [], // Can be filled with actual daily data
  mostSignificantUpDays: [],
  mostSignificantDownDays: [],
  volumeDryUp: [],
  volatilityContraction: [],
  consolidationConfirmed: true
};

// ✅ Call function to insert the pattern
// insertPattern(samplePattern);
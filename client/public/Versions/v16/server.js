/* ✅ Check if MySQL is running
brew services list

# ✅ Start MySQL and start Project <-------------------------------------
brew services start mysql
node server.js

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

Summary of Running Environments
	•	MySQL (Database) is running to store your data.
	•	Node.js (Backend) is running to process requests and interact with MySQL.
	•	Express.js helps manage routes and makes handling HTTP requests easy.
	•	MySQL2 is the database client allowing Node.js to communicate with MySQL.
	•	Front-end (HTML/CSS/JavaScript) is served by Node.js to display the UI.


*/


// ✅ server.js

const express = require("express");
const path = require("path");


const app = express();
const PORT = 3000;

app.use(express.json());  // ✅ Parse JSON requests
app.use(express.static(path.join(__dirname)));  // ✅ Serve static files

// ✅ Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/`);
});

const { sendPatternDataToDB } = require("./db");  // ✅ Import using require()

// ✅ Handle pattern saving request
app.post("/save-pattern", (req, res) => {
    sendPatternDataToDB(req.body, res);
});

const { getPatternDataFromDB } = require("./db"); // ✅ Import using require()

app.get("/get-patterns", (req, res) => {
    console.log("📡 Incoming request: /get-patterns");
    getPatternDataFromDB(res);
});
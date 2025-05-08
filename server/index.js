// ✅ server.js

const express = require("express");
const path = require("path");


const app = express();
const PORT = 3000;

app.use(express.json());  // ✅ Parse JSON requests
app.use(express.static(path.join(__dirname, "../client/public")));  // ✅ Serve static files

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
    //console.log("📡 Incoming request: /get-patterns");
    getPatternDataFromDB(res);
});

const { deletePatternFromDB } = require("./db"); // ✅ Import using require()

app.delete("/delete-pattern/:id", (req, res) => {
    const patternId = req.params.id;
    deletePatternFromDB(patternId, res);
});

const { getPatternByIdFromDB } = require("./db"); // ✅ Import using require()

app.get("/get-pattern/:id", (req, res) => {
    //console.log(`📡 Incoming request: /get-pattern/${req.params.id}`);
    getPatternByIdFromDB(req.params.id, res);
});

const { getPatternIDs } = require("./db"); // ✅ Import using require()

app.get("/get-pattern-ids", (req, res) => {
    //console.log("📡 Fetching pattern IDs and metadata...");
    getPatternIDs(res);
});


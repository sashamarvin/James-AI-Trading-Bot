// script.js
fetch("http://localhost:3001/ping")
  .then(response => response.text())
  .then(data => {
    document.getElementById("server-status").innerText = `✅ Server says: "${data}"`;
  })
  .catch(error => {
    document.getElementById("server-status").innerText = `❌ Failed to reach server`;
    console.error("Error connecting to server:", error);
  });
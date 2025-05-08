import mysql.connector
import json
import os

# Load DB config from shared JSON file
def load_db_config():
    config_path = os.path.join(os.path.dirname(__file__), "..", "config", "db_config.json")
    with open(config_path, "r") as f:
        return json.load(f)

# Establish DB connection
def get_connection():
    config = load_db_config()
    return mysql.connector.connect(
        host=config["host"],
        user=config["user"],
        password=config["password"],
        database=config["database"]
    )

# Example query: fetch all patterns
def fetch_all_patterns():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, patternType, ticker, patternPoints FROM patterns")
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return results
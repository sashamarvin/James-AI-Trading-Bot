from db_utils import fetch_all_patterns

try:
    patterns = fetch_all_patterns()
    print(f"✅ Retrieved {len(patterns)} patterns from the DB.")
    for p in patterns[:3]:  # Just show a preview
        print(f"📌 {p['ticker']} | {p['patternType']} | Points: {p['patternPoints'][:60]}...")
except Exception as e:
    print("❌ DB connection failed:", e)
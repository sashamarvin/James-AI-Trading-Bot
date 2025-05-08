#!/bin/bash

# Step 1: Activate Python virtual environment
source venv/bin/activate
echo "✅ Python venv activated"

# Step 2: Start Node.js server (runs in background)
echo "🚀 Starting Node server..."
cd ../server
node index.js &
cd ../ai

# Step 3: Optional run for ai_bot.py
read -p "👉 Enter Pattern ID to test ai_bot.py (or press Enter to skip): " pattern_id

if [[ ! -z "$pattern_id" ]]; then
    python ai_bot.py $pattern_id
else
    echo "⚠️ Skipped running ai_bot.py"
fi

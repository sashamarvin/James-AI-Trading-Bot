
# Function Summary from `buy_logic.py`

This file contains various functions used in the decision-making logic for buying stock positions within the AI trading bot. Each function plays a role in identifying breakout conditions, risk evaluation, and buy triggers. Here's a detailed summary of what each function does based on its implementation:

---

### 🔍 `detect_breakout_level_from_pattern_points(pattern_points)`
Scans through the VCP pattern points and identifies the breakout level by comparing the last two contraction highs. It returns the breakout level and the index where it should be applied.

---

### 📈 `detect_breakout_day(daily_data, breakout_level, start_index)`
Starts scanning the daily stock data from a given index to detect when a breakout over the specified level occurs. It looks for a high price above the breakout level and ensures some strength (e.g., close is strong) before returning the breakout day's index and price.

---

### 🚀 `buy_pilot_position(pattern_data, max_risk=0.04)`
This is used for early entries using a slanted-down trendline breakout. It calculates pilot buy trigger using slanted support lines from `lambda_versify_highs_lows()` and attempts a low-risk early entry.

---

### 🔓 `buy_breakout_confirmation(pattern_data, max_risk=0.07, position_size="1/2", require_accumulation=False, require_1r=False)`
Used for standard breakout entries. It validates whether price action confirms a breakout using a horizontal level, with optional filters for accumulation volume and risk:reward thresholds.

---

### ➕ `buy_additional_confirmation(pattern_data, allow_pivot=False, follow_through=False)`
Looks for additional buy opportunities after the main breakout, especially if there's a follow-through day or a mini-pivot setup. It ensures the breakout high is exceeded within a few days.

---

### 🧠 `calculate_risk(entry, stop)`
Simple helper function to return percentage risk between entry and stop price.

---

### 🧠 `calculate_position(entry, stop, max_risk)`
Calculates how much position to take based on max allowable risk and current entry/stop levels.

---

### 🔄 `lambda_versify_highs_lows(data, start, end)`
Extracts high and low pivot points using a swing detection algorithm that focuses on lower highs and higher lows (used to detect pullbacks or tightening in a downtrend).

---

### 🔄 `lambda_flat_or_ascending_highs_lows(data, start, end)`
This is used to detect tightening action with ascending or flat highs/lows, useful for flat bases or slow uptrends. Good for detecting slanted breakout setups on the upside.

---

### ❓ `detect_breakout_from_slanted_line(data, highs, lows)`
Checks if the price broke above a computed slanted breakout line created from the detected highs and lows (likely from `lambda_*` outputs).

---

### 📐 `calculate_slanted_line(p1, p2, length)`
Given two points (time and value), calculates a linear path (slope) that forms the slanted breakout or support/resistance line.

---

### 💬 `print_trade_summary(entry_type, entry_price, stop, risk_pct)`
Utility function that prints out trade execution details in a clean format.

---

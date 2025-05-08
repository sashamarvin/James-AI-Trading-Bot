import json
import numpy as np  # type: ignore
import pyperclip  # type: ignore
from scipy.spatial import ConvexHull  # type: ignore
import math 
import numpy as np # type: ignore



def calculate_slope(start, end, daily_data):
    """
    Calculate the slope of the breakout line using two breakout points (start and end).
    """
    start_index = next((i for i, day in enumerate(daily_data) if day["time"] == start["time"]), None)
    end_index = next((i for i, day in enumerate(daily_data) if day["time"] == end["time"]), None)
    
    if start_index is None or end_index is None:
        return None  # Safety check if indexes not found
    
    index_diff = end_index - start_index
    price_diff = end["value"] - start["value"]
    
    # Calculate the slope of the breakout line
    slope = price_diff / index_diff
    return slope

def get_breakout_price_at_time(target_time, breakout_points, daily_data):
    """
    Interpolates the breakout price at a given date using the two breakout points.
    """
    if len(breakout_points) < 2:
        return None  # Ensure we have two points to calculate
    
    start, end = breakout_points[0], breakout_points[1]
    start_index = next((i for i, day in enumerate(daily_data) if day["time"] == start["time"]), None)
    end_index = next((i for i, day in enumerate(daily_data) if day["time"] == end["time"]), None)
    target_index = next((i for i, day in enumerate(daily_data) if day["time"] == target_time), None)
    
    if start_index is None or end_index is None or target_index is None:
        return None  # Safety check if indexes not found
    
    # Linear interpolation to calculate the breakout price
    breakout_price = start["value"] + ((target_index - start_index) * (end["value"] - start["value"])) / (end_index - start_index)
    return breakout_price


def is_breakout_today(daily_data, breakout_points, current_day_index, tick_price):
    """
    Check if the current day is a breakout day.
    Breakout = price pierces the slanted breakout line AND high > previous day's high.
    """
    if len(breakout_points) < 2 or current_day_index == 0:
        return False

    today = daily_data[current_day_index]
    prev_day = daily_data[current_day_index - 1]

    breakout_price = get_breakout_price_at_time(today["time"], breakout_points, daily_data)
    if breakout_price is None:
        return False
    
    # print(f"🧪 {today['time']} breakout check:")
    # print(f"    ➤ Interpolated breakout price: {round(breakout_price, 4)}")
    # print(f"    ➤ Previous day's high: {prev_day['high']}")

    # Use the higher of breakout price or previous day's high as the true trigger
    true_trigger = max(breakout_price, prev_day["high"]) + 0.01

    # was before if today["high"] > true_trigger:
    if tick_price > true_trigger:
        return round(true_trigger, 2)

    return None


def calculate_slanted(breakout_points, daily_data):
    """
    Returns slope true false of the breakout line.
    """
    if len(breakout_points) < 2:
        print("⚠️ Not enough points to determine breakout line.")
        return None
    
    # Calculate the breakout slope
    start, end = breakout_points[0], breakout_points[1]
    slope = calculate_slope(start, end, daily_data)
    
    if slope is None:
        return None  # Safety check
    
    # Check if the line is nearly horizontal (within 5 degrees)
    angle_degrees = np.degrees(np.arctan(slope))
    if abs(angle_degrees) < 5:
        #print("📏 Line is nearly horizontal.")
        return False
    elif angle_degrees < -5:
        #print("📐 Line is slanted downward.")
        return True
    else:
        #print("📏 Line is slanted upward or near horizontal.")
        return False
     


def detect_converging_channel(daily_data, start_idx, end_idx):

    # Slice the relevant range
    current_data = daily_data[start_idx:end_idx + 1]

    # Extract highs and lows with their index (as x)
    highs = [{"x": i, "time": d["time"], "value": d["high"]} for i, d in enumerate(current_data)]
    lows  = [{"x": i, "time": d["time"], "value": d["low"]}  for i, d in enumerate(current_data)]

    # Extract x and y for highs and lows
    x_high = np.array([p["x"] for p in highs])
    y_high = np.array([p["value"] for p in highs])
    x_low = np.array([p["x"] for p in lows])
    y_low = np.array([p["value"] for p in lows])

    # Fit linear regression lines
    high_slope, high_intercept = np.polyfit(x_high, y_high, 1)
    low_slope, low_intercept = np.polyfit(x_low, y_low, 1)

    # Create projected regression lines
    start_x = 0
    end_x = len(current_data) - 1
    high_line = [
        {"time": current_data[start_x]["time"], "value": high_slope * start_x + high_intercept},
        {"time": current_data[end_x]["time"], "value": high_slope * end_x + high_intercept}
    ]
    low_line = [
        {"time": current_data[start_x]["time"], "value": low_slope * start_x + low_intercept},
        {"time": current_data[end_x]["time"], "value": low_slope * end_x + low_intercept}
    ]

    # === New Logic

    # Find first meaningful high (true peak)
    highest_idx = 0
    highest_val = float('-inf')
    for i, p in enumerate(highs):
        if p["value"] > highest_val:
            highest_val = p["value"]
            highest_idx = i

    # Slice highs from that point forward
    meaningful_highs = highs[highest_idx:]

    def build_resistance_line(points, tolerance=0.3, min_points=3):
        best_line = None
        max_points = 0

        for i in range(len(points)):
            for j in range(i + 1, len(points)):
                x1, y1 = points[i]["x"], points[i]["value"]
                x2, y2 = points[j]["x"], points[j]["value"]
                if x2 == x1:
                    continue

                slope = (y2 - y1) / (x2 - x1)
                intercept = y1 - slope * x1

                count = 0
                for p in points:
                    y_line = slope * p["x"] + intercept
                    if p["value"] <= y_line + tolerance:
                        count += 1

                if count > max_points:
                    max_points = count
                    best_line = (slope, intercept)

        return best_line if best_line and max_points >= min_points else None
    
    # Find first lower low (true low)
    lowest_idx = 0
    lowest_val = float('inf')
    for i, p in enumerate(lows):
        if p["value"] < lowest_val:
            lowest_val = p["value"]
            lowest_idx = i

    # Slice lows from that point forward
    meaningful_lows = lows[lowest_idx:]
    
    def build_support_line(points, tolerance=0.3, min_points=3):
        best_line = None
        max_points = 0

        for i in range(len(points)):
            for j in range(i + 1, len(points)):
                x1, y1 = points[i]["x"], points[i]["value"]
                x2, y2 = points[j]["x"], points[j]["value"]
                if x2 == x1:
                    continue

                slope = (y2 - y1) / (x2 - x1)
                intercept = y1 - slope * x1

                count = 0
                for p in points:
                    y_line = slope * p["x"] + intercept
                    if p["value"] >= y_line - tolerance:
                        count += 1

                if count > max_points:
                    max_points = count
                    best_line = (slope, intercept)

        return best_line if best_line and max_points >= min_points else None

    smart_top = build_resistance_line(meaningful_highs)
    smart_bottom = build_support_line(meaningful_lows)

    if smart_top:
        smart_slope, smart_intercept = smart_top
        smart_top_line = [
            {"time": current_data[0]["time"], "value": smart_slope * 0 + smart_intercept},
            {"time": current_data[-1]["time"], "value": smart_slope * (len(current_data) - 1) + smart_intercept}
        ]
    else:
        smart_top_line = []

    if smart_bottom:
        bot_slope, bot_intercept = smart_bottom
        smart_bottom_line = [
            {"time": current_data[0]["time"], "value": bot_slope * 0 + bot_intercept},
            {"time": current_data[-1]["time"], "value": bot_slope * (len(current_data) - 1) + bot_intercept}
        ]
    else:
        smart_bottom_line = []

    # Collect all lines
    channel_lines = [high_line, low_line]
    if smart_top_line:
        channel_lines.append(smart_top_line)
    if smart_bottom_line:
        channel_lines.append(smart_bottom_line)

    
    # pyperclip.copy(json.dumps(channel_lines))
    # print("📋 Copied lines to clipboard!")
    return channel_lines




def update_stop_loss_after_buy(stop_price, position_status):
    print(f"🛡️ Stop set at {stop_price}")
    position_status["stop"] = stop_price






############################## SELL LOGIC ##############################

def calculate_trend_angle(start_price, end_price, days):
    """
    Calculates the angle of a trend line using normalized scale:
    - X-axis: 1 candle = 1 unit
    - Y-axis: 1% price change = 1 unit
    Returns angle in degrees (0° = horizontal, 90° = vertical)
    """
    if days == 0 or start_price == 0:
        return 0

    price_change_percent = ((end_price - start_price) / start_price) * 100
    angle_rad = math.atan2(price_change_percent, days)
    angle_deg = math.degrees(angle_rad)
    return round(angle_deg, 2)

def detect_trend_mode(daily_data, lookback=3):
    """
    Determines trend mode: 'parabolic', 'strong', 'normal', or fallback.
    - Ignores current (unfinished) day.
    - Assumes last candle is yesterday (fully formed).
    - Detects parabolic if at least 2 steep high-to-high angles > 63°.
    - 'Strong' if steep price/EMA angles or strong close after ramp.
    """
    if len(daily_data) < lookback + 2:
        return "unknown"

    last_closed = daily_data[-2]

    # === PARABOLIC Detection ===
    parabolic_count = 0
    for i in range(-lookback - 1, -1):
        angle = calculate_trend_angle(daily_data[i]["high"], daily_data[i + 1]["high"], 1)
        if angle > 63:
            parabolic_count += 1
    if parabolic_count >= 2:
        return "parabolic"

    # === REGULAR TREND DETECTION ===
    p_start = daily_data[-lookback - 1]["high"]
    p_end = last_closed["high"]
    ema10_start = daily_data[-lookback - 1]["ema10"]
    ema10_end = last_closed["ema10"]
    ema50_start = daily_data[-lookback - 1]["ema50"]
    ema50_end = last_closed["ema50"]

    price_angle = calculate_trend_angle(p_start, p_end, lookback)
    ema10_angle = calculate_trend_angle(ema10_start, ema10_end, lookback)
    ema50_angle = calculate_trend_angle(ema50_start, ema50_end, lookback)

    close_range = last_closed["high"] - last_closed["low"]
    close_pos = (last_closed["close"] - last_closed["low"]) / close_range if close_range != 0 else 0

    if ema50_angle >= 1 and abs(ema10_angle - ema50_angle) > 10 and price_angle > 0:
        return "strong"

    elif ema50_angle >= 1 and abs(ema10_angle - ema50_angle) <= 10:
        if price_angle > 40 and close_pos > 0.5:
            return "strong"
        return "normal"

    return "correcting or probably pulling back"







# for the STOP loss function we will use this advanced swings lows and high detection formula in find_lambda_hybrid(...):, first. 
# If there's no new lows on the uptrending path from where we started our positions we will use the 2R 3R and higher multiple risk factors.

def find_lambda_hybrid(daily_data, start_idx, end_idx):
    current_data = daily_data[start_idx:end_idx + 1]
    pattern = []
    idx = 0
    find_high = True

    while idx < len(current_data):
        point = None

        if find_high:
            highs = current_data[idx:]
            max_high = highs[0]
            max_index = 0

            for i in range(1, len(highs)):
                if highs[i]['high'] >= max_high['high']:
                    max_high = highs[i]
                    max_index = i
                else:
                    # 🛑 Stop at the first lower high (pause)
                    break

            point = max_high
            pattern.append({"type": "high", "time": point['time'], "value": point['high']})
        else:
            point = min(current_data[idx:], key=lambda d: d['low'])
            pattern.append({"type": "low", "time": point['time'], "value": point['low']})

        # Move index past the point found
        idx = next((i for i, d in enumerate(current_data) if d['time'] == point['time']), len(current_data)) + 1
        find_high = not find_high

        if idx >= len(current_data):
            break

    return pattern




def append_sell(position_data, action, price, reason):
    """
    Logs the sell action into position_data["sells"]
    """
    if "sells" not in position_data:
        position_data["sells"] = []

    position_data["sells"].append({
        "day": position_data["entries"][-1]["day"],  # for now use last entry day
        "action": action,  # '1.0', '0.5', '0.25'
        "price": round(price, 2),
        "reason": reason
    })



################################# NEW BUY FUNCTIONS ################################



def check_buy_1(pattern_data, position_data, position_size, max_risk, current_day_index, fullPosition, tick_price, log_entry):
    """
    Executes the pilot 0.25 buy:
    - Only if price pierces the slanted high trendline
    - Stop placed at most recent low
    - Risk must be below max_risk (default: 5%)
    """

    # 1. Extract breakout price when price crosses trendline
    # 2. Find most recent low (support)
    # 3. Calculate risk percentage
    # 4. Execute if risk < max_risk
    
    daily_data = pattern_data["dailyData"]

    # 1. Detect recent peaks and troughs (for stop and breakout type)
    contraction_range = pattern_data["patternPoints"][1:-1]
    start_time = contraction_range[0]["time"]
    end_time = contraction_range[-1]["time"]

    
    
    start_idx = next(i for i, d in enumerate(daily_data) if d["time"] == start_time)
    end_idx = next(i for i, d in enumerate(daily_data) if d["time"] == end_time)

    points = find_lambda_hybrid(daily_data, start_idx, current_day_index - 1)

    # Detect stop from most recent low
    recent_low = next((pt for pt in reversed(points) if pt["type"] == "low"), None)
    if not recent_low:
        fallback_low = min(daily_data[start_idx:end_idx+1], key=lambda d: d["low"])
        stop_price = fallback_low["low"]
        print(f"⚠️ No swing low found. Using fallback stop at {stop_price} ({fallback_low['time']})")
    else:
        stop_price = recent_low["value"]

    # 2. Decide breakout logic based on swing high structure
    swing_highs = [pt["value"] for pt in points if pt["type"] == "high"]
    flat_base = False

    if len(swing_highs) >= 2:
        highest = max(swing_highs)
        lowest = min(swing_highs)
        if (abs(highest - lowest) / highest) <= 0.015:  # Flat base within 1.5%
            flat_base = True
            print("🟦 Flat base detected — skipping trendline logic.")

    # 3. Either flat base logic or downtrend breakout logic
    if flat_base:
        return "runCheckBuy2"
    else:
        trendlines = detect_converging_channel(daily_data, start_idx, current_day_index - 1)
        if not trendlines or len(trendlines) < 3:
            print("❌ No smart resistance line found.")
            return False
        breakout_line = max(trendlines, key=lambda line: sum(p["value"] for p in line) / len(line))
        breakout_points = breakout_line
        slanted = calculate_slanted(breakout_points, daily_data)
        if not slanted:
            print("❌ Resistance line not slanted downward — skipping breakout.")
            return False

        # is_breakout_today is where tick_price is compared to last breakout point detection by the fancy functions
        
        threshold = is_breakout_today(daily_data, breakout_points, current_day_index, tick_price)
        if not threshold:
            # print("❌ No breakout detected — no pilot buy.")
            return False

    breakout_day = daily_data[current_day_index]["time"]

    # 6. Confirm risk with special rule for flat bases
    max_risk_allowed = 0.07 if flat_base else max_risk
    risk = (threshold - stop_price) / threshold
    if risk > max_risk_allowed:
        print(f"❌ No trade executed ⚠️ Risk {round(risk*100, 2)}% exceeds max allowed {round(max_risk_allowed*100, 2)}%.")
        return False

    # 7. Execute pilot position
    buy_price = round(threshold + 0.01, 2)
    
    pattern_data["last_breakout"] = threshold  # ✅ Store breakout level for Buy 2+ filtering   
    
    log_buy_event("0.25", buy_price, stop_price, risk, breakout_day, position_data, fullPosition)
    
    shares, cost = calculate_shares(position_size, buy_price, fullPosition)
    position_data["total_shares"] = position_data.get("total_shares", 0) + shares
    
    position_data["entries"].append({
        "price": buy_price,
        "size": position_size,
        "shares": shares,
        "day": breakout_day,
        "risk": round(risk * 100, 2),  # Store as percentage
        "reason": "Pilot entry"
    })
    position_data["stop"] = stop_price
    
    get_position_status(position_data, fullPosition)


    return True


def check_buy_2(pattern_data, position_data, position_size, max_risk, require_accumulation=False, require_1r=False, current_day_index=None, full_position=None, tick_price=None, log_entry=None):
    
    
    """
    2nd Buy: Breakout Confirmation on a specific day (day-by-day logic).
    Mirrors buy_breakout_confirmation() but scoped to just today.
    """
    daily_data = pattern_data["dailyData"]
    pattern_points = pattern_data["patternPoints"]
        

    # 🗓️ Get pattern window range
    start_time = pattern_points[1]["time"]
    end_index = current_day_index - 1  # 🔒 Pattern logic must end before today

    start_index = next(i for i, d in enumerate(daily_data) if d["time"] == start_time)

    # 🧠 Extract highs/lows structure
    points = find_lambda_hybrid(daily_data, start_index, end_index)


    # 📈 Recent high = breakout trigger
    # 📈 Filter highs strictly above last breakout
    last_breakout = pattern_data.get("last_breakout", 0)
    valid_highs = [pt for pt in reversed(points) if pt["type"] == "high" and pt["value"] > last_breakout + 0.01]

    if not valid_highs:
        print(f"❌ No new breakout level above previous ({last_breakout}).")
        return False
    
    if log_entry is not None and not log_entry.get("lambda_logged"):
        log_entry["lambda_points"] = []
        for pt in points[-2:]:
            if pt["type"] == "high":
                flag = "✅" if pt in valid_highs else "❌"
                log_entry["lambda_points"].append(f"{flag} 🔺 {pt['time']} → {pt['value']}")
            else:
                log_entry["lambda_points"].append(f"   🔻 {pt['time']} → {pt['value']}")
        log_entry["lambda_logged"] = True

    recent_high = valid_highs[0]
    breakout_level = recent_high["value"]

    # 📉 Recent low = stop
    recent_low = next((pt for pt in reversed(points) if pt["type"] == "low"), None)
    if not recent_low:
        print("❌ No recent low found for stop placement.")
        return False
    stop_price = recent_low["value"]

    # 📅 Today’s candle (live day)
    today = daily_data[current_day_index]

    # print(f"🧪 {today['time']} breakout check:")
    # print(f"    ➤ Breakout level: {breakout_level} and Tick price:{tick_price}")
    # print(f"    ➤ Lambda stop: {stop_price}")

    # 🚀 Breakout trigger check
    if (
            tick_price > breakout_level + 0.01 and 
            breakout_level > pattern_data.get("last_breakout", 0)
        ):
        
        pattern_data["last_breakout"] = breakout_level  # ✅ Update last breakout level for next buy function logic
        
        risk = (breakout_level - stop_price) / breakout_level
        print(f"    ➤ Risk: {risk:.2%} (max allowed: {max_risk:.2%})")

        if risk > max_risk:
            print(f"⛔ Risk too high: {risk:.2%}")
            return False
        
        buy_price = round(breakout_level + 0.01, 2)
        
        log_buy_event(position_size, buy_price, stop_price, risk, today["time"], position_data, full_position)
        
        shares, cost = calculate_shares(position_size, buy_price, full_position)
        position_data["total_shares"] = position_data.get("total_shares", 0) + shares
        
        position_data["entries"].append({
            "price": buy_price,
            "size": position_size,
            "shares": shares,
            "day": today["time"],
            "risk": round(risk * 100, 2),
            "reason": "Breakout confirmation"
        })
        position_data["stop"] = stop_price
        
        
        
        get_position_status(position_data, full_position)
        
        
        
        return True

    return False


def check_buy_3(pattern_data, position_data, position_size, allow_pivot=True, follow_through=True, current_day_index=None, full_position=None, tick_price=None, log_entry=None, daily_state=None):
    """
    3rd Buy: Add on strength. Requires a follow-through day after previous buy.
    """
    if len(position_data["entries"]) < 2:
        print("⚠️ Not enough entries to evaluate 3rd buy.")
        return False

    daily_data = pattern_data["dailyData"]
    today = daily_data[current_day_index]
    
    # ⏳ Enforce follow-through: must be after last buy day
    last_buy_day = position_data["entries"][-1]["day"]
    if today["time"] <= last_buy_day:
        if not daily_state.get(today["time"], {}).get("follow_through_logged"):
            print("⏳ Waiting for a follow-through day after last buy.")
            daily_state[today["time"]] = {"follow_through_logged": True}
        return False

    # 📈 Must beat all previous entries
    previous_high = max(entry["price"] for entry in position_data["entries"])
    breakout_trigger = round(previous_high + 0.01, 2)
    stop_price = position_data["stop"]

    if tick_price > breakout_trigger:
        risk = (breakout_trigger - stop_price) / breakout_trigger
        print(f"    ➤ Risk: {risk:.2%}")
        if risk > 0.07:
            print(f"⛔ Risk too high: {risk:.2%}")
            return False

        buy_price = round(breakout_trigger + 0.01, 2)
        
        log_buy_event("0.25", buy_price, stop_price, risk, today["time"], position_data, full_position)
        
        shares, cost = calculate_shares(position_size, buy_price, full_position)
        position_data["total_shares"] = position_data.get("total_shares", 0) + shares
        
        position_data["entries"].append({
            "price": buy_price,
            "size": position_size,
            "shares": shares,
            "day": today["time"],
            "risk": round(risk * 100, 2),
            "reason": "Add on strength"
        })
        position_data["stop"] = stop_price

        get_position_status(position_data, full_position)
            
        if not daily_state.get(today["time"], {}).get("follow_through_logged"):
            print("⏳ Waiting for a follow-through day after last buy.")
            daily_state[today["time"]] = {"follow_through_logged": True}
            
        return True

    return False
    
cool_off_mode = None  # 🔥 Add this here
last_prompt_day = None  # 🧊 Tracks last day prompt shown in Cool Off Mode

position_sequence = [0.25, 0.5, 0.25]

def check_buy(pattern_data, position_data, max_risk, current_day_index, full_position, tick_price, log_entry, daily_state):
    """
    Main entry checker, routed by how many buys have been made so far.
    """

    global cool_off_mode, last_prompt_day

    # --- COOL OFF MODE CHECK ---
    if cool_off_mode and cool_off_mode["active"]:
        current_day = pattern_data["dailyData"][current_day_index]["time"]
        global last_prompt_day
        if last_prompt_day != current_day:
            user_input = input("🧊 Cool Off Mode active. Resume monitoring this stock? (Y/n): ").strip().lower()
            last_prompt_day = current_day
            if user_input == "y":
                print("✅ Monitoring resumed!")
                cool_off_mode = None
            else:
                print("🛑 Staying in Cool Off Mode. Skipping buy for today.")
                return False
        else:
            return False
    # --- END -- COOL OFF MODE CHECK ---

    if not position_data["entries"]:
        # 1st Buy: Pilot Entry
        position_size = position_sequence[0]
        result = check_buy_1(pattern_data, position_data, position_size, max_risk,
                             current_day_index, full_position, tick_price, log_entry)

        if result == "runCheckBuy2":
            return check_buy_2(pattern_data, position_data, position_size, max_risk=0.07,
                               require_accumulation=False, require_1r=False,
                               current_day_index=current_day_index, full_position=full_position,
                               tick_price=tick_price, log_entry=log_entry)
        return result

    elif len(position_data["entries"]) == 1:
        # 2nd Buy: Breakout Confirmation
        position_size = position_sequence[1]
        return check_buy_2(pattern_data, position_data, position_size, max_risk=0.07,
                           require_accumulation=False, require_1r=False,
                           current_day_index=current_day_index, full_position=full_position,
                           tick_price=tick_price, log_entry=log_entry)

    elif len(position_data["entries"]) == 2:
        # 3rd Buy: Add on strength
        position_size = position_sequence[2]
        return check_buy_3(pattern_data, position_data, position_size,
                           allow_pivot=True, follow_through=True,
                           current_day_index=current_day_index, full_position=full_position,
                           tick_price=tick_price, log_entry=log_entry, daily_state=daily_state)

    return False
    
    
    
    
    
################################### SELLING FUNCTIONS ######################################

from datetime import datetime, time

def calculate_fib_levels(intraday_low, intraday_high):
    diff = intraday_high - intraday_low
    return {
        "50%": intraday_low + diff * 0.5,
        "61.8%": intraday_low + diff * 0.618,
        "78.6%": intraday_low + diff * 0.786,
    }

def check_intraday_exit_logic_old(tick, intraday_low, intraday_high):
    
    tick_price = tick["price"]
    
    fibs = calculate_fib_levels(intraday_low, intraday_high)

    tick_time = datetime.strptime(tick["time"], "%Y-%m-%d %H:%M:%S").time()

    if tick_time < time(11, 30):
        return 0.0, fibs  # Hold

    is_eod = tick_time >= time(15, 30)

    if tick_price < fibs["50%"]:
        return 1.0, fibs
    elif is_eod:
        if tick_price < fibs["61.8%"]:
            return 1.0, fibs
        elif tick_price < fibs["78.6%"]:
            return 0.5, fibs
        else:
            return 0.0, fibs
    elif tick_price < fibs["61.8%"]:
        return 0.75, fibs
    elif tick_price < fibs["78.6%"]:
        return 0.5, fibs
    else:
        return 0.0, fibs  # Hold
    
def check_intraday_exit_logic(tick, intraday_low, intraday_high, prev_day_high_low=None):
    tick_price = tick["price"]
    tick_time = datetime.strptime(tick["time"], "%Y-%m-%d %H:%M:%S").time()

    fibs = calculate_fib_levels(intraday_low, intraday_high)

    # Rule 1: Before 13:00 → use *previous day* range to detect early weakness
    if tick_time < time(13, 0):
        if prev_day_high_low:
            prev_low, prev_high = prev_day_high_low
            prev_50 = prev_low + (prev_high - prev_low) * 0.5
            if tick_price < prev_50:
                return 1.0, fibs  # Full exit
        return 0.0, fibs  # Hold

    # Rule 2: After 13:00 → use current day's range
    if tick_price < fibs["50%"]:
        return 1.0, fibs  # Full exit

    # Rule 3: After 15:30 → trailing strength logic
    if tick_time >= time(15, 30):
        if tick_price > fibs["78.6%"]:
            return 0.0, fibs  # Hold
        elif tick_price > fibs["61.8%"]:
            return 0.5, fibs  # Sell half
        elif tick_price > fibs["50%"]:
            return 0.75, fibs  # Sell 3/4
        else:
            return 1.0, fibs  # Full exit if it dropped again

    return 0.0, fibs  # Default hold


def check_sell(pattern_data, position_data, current_day_index, full_position, position_history, tick, intraday_low, intraday_high, log_entry):
    """
    Daily sell logic (day-by-day version of sell_on_strength).
    Evaluates stop hit, stall after parabolic, and profit-taking logic.
    """
    daily_data = pattern_data["dailyData"]

    if len(daily_data) < 2 or current_day_index is None:
        return False

    today = daily_data[current_day_index]
    price = today["close"]
    stop_price = position_data.get("stop")
    tick_price = tick["price"]

    if not stop_price:
        return False

    last_entry = position_data["entries"][-1]
    entry_price = last_entry["price"]
    one_r = entry_price - stop_price
    r_multiple = (price - entry_price) / one_r if one_r else 0
    gain_pct = (price - entry_price) / entry_price

    total_size = 1.0
    sold = position_data.get("sold", [])
    for s in sold:
        if s["type"] == "0.25":
            total_size -= 0.25
        elif s["type"] == "0.5":
            total_size -= 0.5
        elif s["type"] == "0.75":
            total_size -= 0.75
        elif s["type"] == "1.0":
            total_size = 1.0

    # --- Stop Hit ---
    if tick_price <= stop_price and total_size > 0:
        shares = int(position_data.get("total_shares", 0))
        if shares > 0:
            position_data.setdefault("sells", []).append({
                "price": price,
                "date": today["time"],
                "reason": f"Stop hit at {stop_price} — {shares} shares",
                "size": 1.0  # ✅ required
            })
            
            for e in position_data["entries"]:
                e["exit"] = price
                
            log_sell_event(1.0, price, "Stop hit", today["time"], position_data, full_position, shares)
            
            position_history.append(position_data["entries"][:])
            position_data["stop"] = None
            position_data["entries"].clear()
            position_data["total_shares"] = 0
            handle_full_exit(today, position_data, position_history, current_day_index, daily_data)
            return True

    # --- Stall after Parabolic ---
    if current_day_index >= 2:
        mode_yesterday = detect_trend_mode(daily_data[:current_day_index])
        if log_entry is not None:
            log_entry["trend"] = mode_yesterday

        if mode_yesterday == "parabolic" and total_size > 0:
            prev_day = daily_data[current_day_index - 1]
            prev_day_high_low = (prev_day["low"], prev_day["high"])
            action, _ = check_intraday_exit_logic(tick, intraday_low, intraday_high, prev_day_high_low)

            if action == 1.0:
                shares = position_data.get("total_shares", 0)
                if shares > 0:
                    
                    for e in position_data["entries"]:
                        e["exit"] = price
                    
                    log_sell_event(1.0, price, "Intraday < 50%", today["time"], position_data, full_position, shares)
                    
                    position_history.append(position_data["entries"][:])
                    position_data["stop"] = None
                    position_data["entries"].clear()
                    position_data["total_shares"] = 0
                    handle_full_exit(today, position_data, position_history, current_day_index, daily_data)
                    return True

            elif action == 0.75 and total_size >= 0.75:
                shares = min(round(position_data.get("total_shares", 0) * 0.75), position_data.get("total_shares", 0))
                if shares > 0:
                    log_sell_event(0.75, price, "Intraday 50–61.8%", today["time"], position_data, full_position, shares)
                    position_data["total_shares"] -= shares
                    return True

            elif action == 0.5 and total_size >= 0.5:
                shares = min(round(position_data.get("total_shares", 0) * 0.5), position_data.get("total_shares", 0))
                if shares > 0:
                    log_sell_event(0.5, price, "Intraday 61.8–78.6%", today["time"], position_data, full_position, shares)
                    position_data["total_shares"] -= shares
                    return True

    # --- Sell 0.5 at 3R ---
    if r_multiple >= 3 and not position_data.get("sold_half") and total_size >= 0.5:
        shares = min(round(position_data.get("total_shares", 0) * 0.5), position_data.get("total_shares", 0))
        if shares > 0:
            log_sell_event(0.5, price, "3R target hit", today["time"], position_data, full_position, shares)
            position_data["sold_half"] = True
            position_data["total_shares"] -= shares
            return True

    # --- Sell 0.25 at +20% ---
    if gain_pct >= 0.20 and not position_data.get("sold_quarter") and total_size >= 0.25:
        shares = min(round(position_data.get("total_shares", 0) * 0.25), position_data.get("total_shares", 0))
        if shares > 0:
            log_sell_event(0.25, price, "20% gain", today["time"], position_data, full_position, shares)
            position_data["sold_quarter"] = True
            position_data["total_shares"] -= shares
            return True

    return False

def handle_full_exit(today, position_data, position_history, current_day_index, daily_data):
    print("🛑 No shares left. Stop deactivated.")
    position_data["stop"] = None
    position_data["entries"].clear()
    
    global cool_off_mode
    cool_off_mode = {
        "active": True,
        "start_day": current_day_index,
        "min_days": 5,
    }
    print(f"🚫 Full position sold on {daily_data[current_day_index]['time']}. Entering Cool Off Mode for 5 days.")



################################################### LOG PRINT EVENTS ######################################


def get_position_status(position_data, full_position):
    
    # for idx, s in enumerate(position_data.get("sells", [])):
        # print(f"  ➤ Sell {idx}: {s}")
    """
    Returns current position status:
    - total shares bought
    - total shares sold
    - remaining shares
    - average entry price
    - total invested cost
    """
    total_bought = 0
    total_cost = 0
    for entry in position_data.get("entries", []):
        shares, cost = calculate_shares(entry["size"], entry["price"], full_position)
        total_bought += shares
        total_cost += cost

    total_sold = 0
    for sell in position_data.get("sold", []):
        shares, _ = calculate_shares(sell["size"], sell["price"], full_position)
        total_sold += shares

    remaining_shares = total_bought - total_sold
    avg_entry_price = total_cost / total_bought if total_bought else 0

    return {
        "total_shares": total_bought,
        "remaining_shares": remaining_shares,
        "average_entry_price": avg_entry_price,
        "invested_cost": total_cost
    }

def calculate_shares(size, price, full_position):
    """
    Calculates shares and cost based on size (as float), price, and full position.
    """
    fraction = float(size)
    amount = full_position * fraction
    shares = int(amount // price)
    return shares, amount

def log_buy_event(size, price, stop, risk, day, position_data, full_position):
    shares, cost = calculate_shares(float(size), price, full_position)
    total_shares = sum(calculate_shares(float(e["size"]), e["price"], full_position)[0] for e in position_data["entries"]) + shares
    total_cost = sum(calculate_shares(float(e["size"]), e["price"], full_position)[1] for e in position_data["entries"]) + cost

    print_log(
        "buy",
        day=day,
        size=size,
        price=price,
        stop=stop,
        risk=risk * 100,
        shares=shares,
        cost=cost,
        total_cost=total_cost,
        total_shares=total_shares
    )

def log_sell_event(size, price, reason, day, position_data, full_position, shares=None):
    # Ensure size is a float (e.g., 0.25, 0.5, 0.75, 1.0)
    size = float(size)

    # Get current position status
    status = get_position_status(position_data, full_position)
    avg_entry_price = status["average_entry_price"]

    # Determine share count if not passed
    if shares is None:
        shares = int(status["remaining_shares"] * size)

    # Calculate profit
    profit_per_share = price - avg_entry_price
    total_profit = shares * profit_per_share

    # Convert label for display
    label = "1/4" if size == 0.25 else "1/2" if size == 0.5 else "3/4" if size == 0.75 else "FULL"

    # Log it
    print_log(
        "sell",
        day=day,
        size=label,
        price=price,
        reason=reason,
        profit=total_profit,
        shares=shares
    )
    
    # Append the sell to position history
    position_data.setdefault("sells", []).append({
        "price": price,
        "date": day,
        "reason": reason,
        "size": size  # ✅ Required by get_position_status
    })

def print_log(event_type, **kwargs):
    if event_type == "buy":
        day = kwargs.get("day")
        size = float(kwargs.get("size"))
        price = kwargs.get("price")
        stop = kwargs.get("stop")
        risk = kwargs.get("risk")
        shares = kwargs.get("shares")
        cost = kwargs.get("cost")
        total_cost = kwargs.get("total_cost")
        total_shares = kwargs.get("total_shares")
        label = "1/4" if size == 0.25 else "1/2" if size == 0.5 else "FULL"
        print(f"🟢 BUY  | 📅 {day} | {label} @ ${price:.2f} | Stop: ${stop:.2f} | Risk: {risk:.1f}% | Shares: {shares} | 💰 ${int(cost):,} [Total ${int(total_cost):,} ::: {total_shares} shares]")

    elif event_type == "sell":
        day = kwargs.get("day")
        size = kwargs.get("size")
        price = kwargs.get("price")
        reason = kwargs.get("reason")
        profit = kwargs.get("profit")
        shares = kwargs.get("shares", "?")
        print(f"🔴 SELL | 📅 {day} | {size} @ ${price:.2f} | 📈 Profit: ${int(profit):,} | Shares: {shares} | Reason: {reason}")
    
    elif event_type == "trend":
        day = kwargs.get("day")
        prev = kwargs.get("previous")
        curr = kwargs.get("current")
        print(f"📊 Trend | 📅 {day} | Yesterday: {prev} → Today: {curr}")

def summarize_trading_results(position_history, full_position):
    print("\n📊 Summary of Closed Trades:")
    print("-" * 70)

    total_profit = 0
    for idx, trade in enumerate(position_history, start=1):
        if not trade:
            continue
        avg_entry = sum(e["price"] * calculate_shares(e["size"], e["price"], full_position)[0] for e in trade) / sum(calculate_shares(e["size"], e["price"], full_position)[0] for e in trade)
        total_shares = sum(calculate_shares(e["size"], e["price"], full_position)[0] for e in trade)
        exit_price = trade[0].get("exit", 0)
        profit = (exit_price - avg_entry) * total_shares
        total_profit += profit

        print(f"#{idx:02d} | Avg Entry: ${avg_entry:.2f} | Exit: ${exit_price:.2f} | Shares: {total_shares} | Profit: ${profit:,.2f}")

    print("-" * 70)
    print(f"✅ Total Trades: {len(position_history)}")
    print(f"💰 Total Profit: ${total_profit:,.2f}")
    
    



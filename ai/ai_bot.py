import mysql.connector  # type: ignore
import json
import sys
from buy_logic import *  # type: ignore
from detect_logic import *  # type: ignore
import os
import pandas as pd
from datetime import datetime, timedelta
import exchange_calendars as ecals

if len(sys.argv) != 5:
    print("❌ Usage: python ai_bot.py <TICKER> <SIM_START> <SIM_END> <HYBRID_START>")
    print("Example: python ai_bot.py DASH 2025-01-16 2025-02-20 2024-12-17")
    exit()

ticker = sys.argv[1]
sim_start = sys.argv[2]
sim_end = sys.argv[3]
hybrid_start = sys.argv[4]


def load_ticks_for_day(ticker, date_str):
    """
    Load intraday 30-min ticks from the IB CSV for a specific day.
    Returns a list of dicts with 'time' and 'price'.
    """
    filename = f"../data/{ticker}/{ticker}_{date_str}_30min.csv"
    if os.path.exists(filename):
        df = pd.read_csv(filename, parse_dates=['date'])
        return [{"time": row["date"].strftime("%Y-%m-%d %H:%M:%S"), "price": row["close"]} for _, row in df.iterrows()]
    else:
        print(f"⚠️ No intraday data for {date_str}")
        return []


def load_daily_history_for_day(ticker, date_str):
    """
    Load full 100-day daily history from a specific file like DASH_2025-01-16.csv.
    This simulates loading the full history *as of* that day.
    """
    filename = f"../data/{ticker}/{ticker}_{date_str}.csv"
    if not os.path.exists(filename):
        print(f"❌ Daily file not found for {date_str}: {filename}")
        return []

    df = pd.read_csv(filename, parse_dates=["date"]).rename(columns={"date": "time"})
    df["ema10"] = df["close"].ewm(span=10, adjust=False).mean().round(2)
    df["ema50"] = df["close"].ewm(span=50, adjust=False).mean().round(2)
    df["time"] = df["time"].dt.strftime("%Y-%m-%d")
    
    cols = ["time", "open", "high", "low", "close", "ema10", "ema50"]
    return df[cols].to_dict(orient="records")


# Global trading configuration
totalAccount = 100000
fullPosition = totalAccount * 0.20  # One full position = 20% of account
positionBuySequence = [0.25, 0.5, 0.25, 0.25]  # 1st, 2nd, 3rd, extra buy as fractions of full position


# Initial position data
position_data = {
    "entries": [],
    "stop": None,
    "total_size": 0.0,
    "avg_entry": None,
}

import exchange_calendars as ecals
from datetime import date

# NYSE calendar loaded once
xnas = ecals.get_calendar("XNYS")

def get_trading_days(start_date, end_date):
    """
    Returns a list of valid trading session dates from start to end (inclusive).
    """
    return xnas.sessions_in_range(start_date, end_date)

def is_trading_day(some_date):
    """
    Returns True if the date is a valid NYSE trading session.
    """
    return xnas.is_session(some_date)




from buy_logic import detect_trend_mode

def simulate_trading_day_by_day(pattern_data, daily_data, position_data, sim_start, sim_end, hybrid_start):
    """
    Walk through each real trading day using the official NYSE calendar.
    """
    daily_log = []
    position_history = []
    daily_state = {}

    sim_start_date = datetime.strptime(sim_start, "%Y-%m-%d")
    sim_end_date = datetime.strptime(sim_end, "%Y-%m-%d")

    trading_days = get_trading_days(sim_start_date, sim_end_date)

    print(f"🕵️ Monitoring begins at: {sim_start}")
    input("⏸ Press Enter to start monitoring from this day...\n")

    for current_date in trading_days:
        current_day = current_date.strftime("%Y-%m-%d")
        
        log_entry = {
            "date": current_day,
            "trend": None,
            "breakout_level": None,
            "tick_prices": [],
            "buy_events": [],
            "sell_events": [],
            "events": [],
            "lambda_points": [],
            "max_size_warning": False
        }
        
        

        # ⏪ Reload daily data
        daily_data = load_daily_history_for_day(ticker, current_day)
        if not daily_data:
            print(f"⚠️ Skipping {current_day} due to missing daily file.")
            continue

        pattern_data["dailyData"] = daily_data

        # Load intraday ticks
        ticks_today = load_ticks_for_day(ticker, current_day)

        intraday_low = float("inf")
        intraday_high = float("-inf")

        current_day_index = len(daily_data) - 1  # No gaps now — synced to real trading days
        
        # 📊 Detect trend before processing ticks

        trend = detect_trend_mode(daily_data[:current_day_index])
        log_entry["trend"] = trend
            
        trend_note = f" --> Trending ::::: {trend}"
        print(f"\n📅 current_day: {current_day}{trend_note}")
        
        def format_tick_prices(tick_data):
            return " ".join(f"{t['price']:.2f}" for t in tick_data)
        # print("📈 Tick Prices:", format_tick_prices(ticks_today))

        for tick in ticks_today:
            tick_price = tick["price"]
            intraday_low = min(intraday_low, tick_price)
            intraday_high = max(intraday_high, tick_price)
            
            log_entry["tick_prices"].append(round(tick_price, 2))  # Collect for final print

            check_buy(pattern_data, position_data, max_risk=0.04,
                      current_day_index=current_day_index,
                      full_position=fullPosition,
                      tick_price=tick_price, log_entry=log_entry, daily_state=daily_state)

            check_sell(pattern_data, position_data,
                       current_day_index,
                       fullPosition,
                       position_history,
                       tick,
                       intraday_low,
                       intraday_high, log_entry=log_entry)

        key = input("➡️ Press Enter for next day, or Q to quit: ").strip().lower()
        if key == "q":
            print("🚪 Exiting day-by-day simulation.")
            break

    print("✅ End of simulation.")
    summarize_trading_results(position_history, fullPosition)


def find_previous_valid_daily_file(ticker, sim_start_str):
    date = datetime.strptime(sim_start_str, "%Y-%m-%d")
    for _ in range(10):  # Check up to 10 days back
        date -= timedelta(days=1)
        test_date = date.strftime("%Y-%m-%d")
        data = load_daily_history_for_day(ticker, test_date)
        if data:
            return test_date, data
    raise ValueError(f"No valid daily file found before {sim_start_str}")

previous_day, daily_data = find_previous_valid_daily_file(ticker, sim_start)

pattern_data = {
    "dailyData": daily_data,
    "patternPoints": [
        {"time": "0000-00-00"},
        {"time": hybrid_start[:10]},
        {"time": sim_start[:10]},
        {"time": sim_end[:10]},
    ]
}

simulate_trading_day_by_day(pattern_data, daily_data, position_data, sim_start, sim_end, hybrid_start)
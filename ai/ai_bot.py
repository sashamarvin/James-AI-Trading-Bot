import mysql.connector  # type: ignore
import json
import sys
from buy_logic import *  # type: ignore
from detect_logic import *  # type: ignore
import os
import pandas as pd
from datetime import datetime, timedelta
import exchange_calendars as ecals
from pytz import timezone

from ib import *  # type: ignore
import time
from buy_logic import detect_trend_mode

from snapshot import create_snapshot, save_trade_log # type: ignore

from buy_logic import printParameters





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





# Hardcoded flags
realtime = True
IBdata = True

        
        
        
        
        
### WORKING ON MONITOR STOCK LIVE        
### WORKING ON MONITOR STOCK LIVE   
### WORKING ON MONITOR STOCK LIVE   
### WORKING ON MONITOR STOCK LIVE   
### WORKING ON MONITOR STOCK LIVE   


testMode = False        
        
def monitor_stock_live(pattern_data, ticker):
    # Get the start date directly from pattern_data
    start_date = pattern_data["patternPoints"][2]["time"]

    # Get the last closed trading day and if market is currently open
    last_closed_day, market_is_open, now = get_last_closed_trading_day(simulate_date=start_date)
    
    if market_is_open:
        live_session_day = start_date
    else:
        now_time = now.strftime("%H:%M:%S")
        if "00:00:00" <= now_time < "09:30:00":
            live_session_day = start_date
        else:
            live_session_day = get_next_trading_day(start_date)
    
    # Initialize logs and position history
    daily_log = []
    position_history = []
    
    # 🛑 Get the end date from pattern_data
    sim_end_date = datetime.strptime(pattern_data["patternPoints"][3]["time"], "%Y-%m-%d")
    
    while True:
        
        # ➡️ Check if we are past the simulation end date
        live_session_datetime = datetime.strptime(live_session_day, "%Y-%m-%d")
        if live_session_datetime > sim_end_date:
            print(f"🏁 Reached the end of simulation period: {sim_end_date}")
            print("🔄 Finalizing and summarizing trading results...")
            summarize_trading_results(position_history, fullPosition)
            return
        
        # 1️⃣ Fetch Daily Data 
        fetch_daily_ohlcv_100days(ticker, live_session_day, save_path=f"../data/{ticker}/{ticker}_{live_session_day}.csv")
        daily_data = load_daily_history_for_day(ticker, last_closed_day)
        pattern_data["dailyData"] = daily_data
        pattern_data["patternPoints"][2]["time"] = last_closed_day
                
        # 🛑 Pause and wait for input before streaming
        while True:
            key = input("➡️ Press Enter for next day, Q to quit, or P to toggle print parameters: ").strip().lower()
            
            if key == "q":
                print("🚪 Exiting real-time monitoring.")
                summarize_trading_results(position_history, fullPosition)
                return
            elif key == "p":
                import buy_logic
                buy_logic.printParameters = not buy_logic.printParameters
                status = "ON" if buy_logic.printParameters else "OFF"
                print(f"🖨️ Print Parameters now {status}")
            else:
                print("➡️ Continuing to the next trading session...")
                break

        # 2️⃣ Initialize Intraday Variables
        
        intraday_low = float("inf")
        intraday_high = float("-inf")
        current_day_index = len(daily_data) - 1

        # 3️⃣ Detect Trend up to the last closed session
        trend = detect_trend_mode(daily_data[:current_day_index])

        log_entry = {
            "date": last_closed_day,
            "trend": trend,
            "breakout_level": None,
            "tick_prices": [],
            "buy_events": [],
            "sell_events": [],
            "events": [],
            "lambda_points": [],
            "max_size_warning": False
        }

        daily_state = {}

        def handle_realtime_tick(price_data):
            nonlocal intraday_low, intraday_high, current_day_index
            
            tick_price = price_data["price"]
            tick_time = price_data["time"]
            
            intraday_low = min(intraday_low, tick_price)
            intraday_high = max(intraday_high, tick_price)

            log_entry["tick_prices"].append(round(tick_price, 2))

            check_buy(
                pattern_data,
                position_data,
                max_risk=0.04,
                current_day_index=current_day_index,
                full_position=fullPosition,
                tick_price=tick_price,
                log_entry=log_entry,
                daily_state=daily_state
            )

            check_sell(
                pattern_data,
                position_data,
                current_day_index,
                fullPosition,
                position_history,
                {"time": tick_time, "price": tick_price},
                intraday_low,
                intraday_high,
                log_entry=log_entry
            )

        # 🔄 Stream Ticks for the Day
        get_GW_realtime_data_TEST_market_closed(ticker, live_session_day, handle_realtime_tick, live_simulated=True)
        
        # 🗓️ Log entry and append to daily log
        daily_log.append(log_entry)

        # ✅ Update the last closed day to the session we just finished
        last_closed_day = live_session_day

        # 6️⃣ Get the Next Open Day
        live_session_day = get_next_trading_day(live_session_day)

        # ➡️ Save the current state as a snapshot for recovery TO DO DO NOT DELETE THIS COMMENT
        ## create_snapshot(ticker, pattern_data, position_data, daily_state, log_entry)
        ## save_trade_log(ticker, log_entry)
    








now_live_simulated = True
 
def monitor_stock_live_simulated(pattern_data, daily_data, position_data, ticker, sim_start, sim_end, hybrid_start, realtime=True, IBdata=False):
    """
    Walk through each real trading day using the official NYSE calendar.
    If 'realtime' is True and 'IBdata' is False, data is streamed from local 1-min CSV.
    If 'realtime' is True and 'IBdata' is True, data is streamed from Interactive Brokers Gateway.
    """
    daily_log = []
    position_history = []
    daily_state = {}

    sim_start_date = datetime.strptime(sim_start, "%Y-%m-%d")
    sim_end_date = datetime.strptime(sim_end, "%Y-%m-%d")

    trading_days = get_trading_days(sim_start_date, sim_end_date)

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

        # 🗓️ Get the next NYSE trading day for 1-min data
        next_session_day = get_next_trading_day(current_day)

        intraday_low = float("inf")
        intraday_high = float("-inf")
        current_day_index = len(daily_data) - 1  

        # 📊 Detect trend before processing ticks
        trend = detect_trend_mode(daily_data[:current_day_index])
        log_entry["trend"] = trend
            
        trend_note = f" --> Trending ::::: {trend}"
        print(f"\n📅 Trend up to the last closed session: {current_day}{trend_note}")


        # 🔄 Callback Handler for Real-Time Data
        def handle_realtime_tick(price_data):
            """
            Handle each tick data streamed from the CSV file in real-time.
            """
            nonlocal intraday_low, intraday_high, current_day_index
            
            tick_price = price_data["price"]
            tick_time = price_data["time"]
            
            # 🗓️ Update intraday low and high
            intraday_low = min(intraday_low, tick_price)
            intraday_high = max(intraday_high, tick_price)

            log_entry["tick_prices"].append(round(tick_price, 2))

            # 🟢 Execute Buy Logic
            check_buy(
                pattern_data,
                position_data,
                max_risk=0.04,
                current_day_index=current_day_index,
                full_position=fullPosition,
                tick_price=tick_price,
                log_entry=log_entry,
                daily_state=daily_state
            )

            # 🔴 Execute Sell Logic
            check_sell(
                pattern_data,
                position_data,
                current_day_index,
                fullPosition,
                position_history,
                {"time": tick_time, "price": tick_price},
                intraday_low,
                intraday_high,
                log_entry=log_entry
            )

        get_GW_realtime_data_TEST_market_closed(ticker, next_session_day, handle_realtime_tick, live_simulated=True)

        

        # 🛑 Pause for log checking
        key = input("➡️ Press Enter for next day, Q to quit, or P to toggle print parameters: ").strip().lower()

        if key == "q":
            print("🚪 Exiting day-by-day simulation.")
            break
        elif key == "p":
            # Toggle printParameters in buy_logic
            import buy_logic
            buy_logic.printParameters = not buy_logic.printParameters
            status = "ON" if buy_logic.printParameters else "OFF"
            print(f"🖨️ Print Parameters now {status}")

    print("✅ End of monitoring.")
    summarize_trading_results(position_history, fullPosition)       



    

def monitor_stock_simulated(pattern_data, daily_data, position_data, ticker, sim_start, sim_end, hybrid_start, realtime=True, IBdata=False):
    """
    Walk through each real trading day using the official NYSE calendar.
    If 'realtime' is True and 'IBdata' is False, data is streamed from local 1-min CSV.
    If 'realtime' is True and 'IBdata' is True, data is streamed from Interactive Brokers Gateway.
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

        # 🗓️ Get the next NYSE trading day for 1-min data
        next_session_day = get_next_trading_day(current_day)
        print(f"🔄 Loading 1-min ticks for the next session: {next_session_day}")

        # 📂 Load the 1-min data for the next open session
        if realtime and IBdata == False:
            ticks_today = load_ticks_for_day_1min(ticker, next_session_day)
        else:
            ticks_today = load_ticks_for_day_1min(ticker, next_session_day)

        if not ticks_today:
            print(f"⚠️ No tick data available for {current_day}")
            continue

        intraday_low = float("inf")
        intraday_high = float("-inf")
        current_day_index = len(daily_data) - 1  

        # 📊 Detect trend before processing ticks
        trend = detect_trend_mode(daily_data[:current_day_index])
        log_entry["trend"] = trend
            
        trend_note = f" --> Trending ::::: {trend}"
        print(f"\n📅 Trend up to the last closed session: {current_day}{trend_note}")


        for tick in ticks_today:
            tick_price = tick["price"]
            intraday_low = min(intraday_low, tick_price)
            intraday_high = max(intraday_high, tick_price)

            log_entry["tick_prices"].append(round(tick_price, 2))


            # 🟢 Execute Buy Logic
            check_buy(
                pattern_data,
                position_data,
                max_risk=0.04,
                current_day_index=current_day_index,
                full_position=fullPosition,
                tick_price=tick_price,
                log_entry=log_entry,
                daily_state=daily_state
            )

            # 🔴 Execute Sell Logic
            check_sell(
                pattern_data,
                position_data,
                current_day_index,
                fullPosition,
                position_history,
                tick,
                intraday_low,
                intraday_high,
                log_entry=log_entry
            )

            # ⏳ If realtime, simulate 200ms delay
            if realtime and IBdata == False:
                time.sleep(10)

        

        key = input("➡️ Press Enter for next day, or Q to quit: ").strip().lower()
        if key == "q":
            print("🚪 Exiting day-by-day simulation.")
            break

    print("✅ End of monitoring.")
    summarize_trading_results(position_history, fullPosition)


def load_ticks_for_day_1min(ticker, date_str):
    """
    Load intraday 1-min ticks from the IB CSV for a specific day.
    Returns a list of dicts with 'time' and 'price'.
    """
    filename = f"../data/{ticker}/{ticker}_{date_str}_1min.csv"
    if os.path.exists(filename):
        df = pd.read_csv(filename, parse_dates=['date'])
        print(f"🔄 Loaded {len(df)} 1-min ticks for {date_str}")
        return [{"time": row["date"].strftime("%Y-%m-%d %H:%M:%S"), "price": row["close"]} for _, row in df.iterrows()]
    else:
        print(f"⚠️ No intraday data for {date_str}")
        return []


def find_previous_valid_daily_file(ticker, sim_start_str):
    date = datetime.strptime(sim_start_str, "%Y-%m-%d")
    for _ in range(10):  # Check up to 10 days back
        date -= timedelta(days=1)
        test_date = date.strftime("%Y-%m-%d")
        data = load_daily_history_for_day(ticker, test_date)
        if data:
            return test_date, data
    raise ValueError(f"No valid daily file found before {sim_start_str}")




if len(sys.argv) == 5:
    # Simulation Mode
    ticker = sys.argv[1]
    sim_start = sys.argv[2]
    sim_end = sys.argv[3]
    hybrid_start = sys.argv[4]
    print(f"🔵 Running in Simulation Mode for {ticker}")
    
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
    if now_live_simulated:
        monitor_stock_live_simulated(pattern_data, daily_data, position_data, ticker, sim_start, sim_end, hybrid_start, realtime=True, IBdata=False)
    else:
        monitor_stock_simulated(pattern_data, daily_data, position_data, ticker, sim_start, sim_end, hybrid_start, realtime=True, IBdata=False)

elif len(sys.argv) == 3:
    # Real-Time Mode
    ticker = sys.argv[1]
    hybrid_start = sys.argv[2]
    
    # 🔄 Define the simulation start and end for now
    sim_start = "2024-08-19"
    sim_end = "2024-08-27"

    print(f"🟢 Running in Real-Time Simulation Mode for {ticker}")

    pattern_data = {
        "dailyData": [],
        "patternPoints": [
            {"time": "0000-00-00"}, #0
            {"time": hybrid_start[:10]}, #1
            {"time": sim_start[:10]}, #2
            {"time": sim_end[:10]}, #3
        ]
    }

    # Launch the live monitor with pattern_data already defined
    monitor_stock_live(pattern_data, ticker)

else:
    print("❌ Invalid number of arguments. Use either:\n"
          "Simulation Mode → python ai_bot.py <TICKER> <SIM_START> <SIM_END> <HYBRID_START>\n"
          "Real-Time Mode → python ai_bot.py <TICKER> <HYBRID_START>")
    exit()
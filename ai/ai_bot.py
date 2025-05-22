from ib_insync import *  # type: ignore

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
from snapshot import *  # type: ignore
import time
from buy_logic import detect_trend_mode

from buy_logic import printParameters

import exchange_calendars as ecals
from datetime import date

import psutil # type: ignore

from datetime import datetime
import pytz


def initialize_monitoring_session(ticker, session_name):
    # Define paths
    base_path = f"monitoring_sessions/{ticker}/{session_name}"
    snapshot_file = f"{base_path}/{ticker}_snapshot.json"

    # Create directories if they don't exist
    os.makedirs(base_path, exist_ok=True)

    # Initialize a blank snapshot if it doesn't exist
    if not os.path.exists(snapshot_file):
        print(f"📁 Creating snapshot for session: {session_name}")
        initial_data = {
            "ticker": ticker,
            "session_name": session_name,
            "positions": [],
            "intraday_low": None,
            "intraday_high": None,
            "last_price": None,
            "current_day_index": None,
            "hybrid_start": None
        }
        with open(snapshot_file, 'w') as f:
            json.dump(initial_data, f, indent=4)
    else:
        print(f"🔄 Existing snapshot found for session: {session_name}")

    return snapshot_file


###################################### INSPECT STATE ########################################

def inspection_prompt(position_data, log_entry, daily_state, pattern_data, fullPosition, liveMode, ticker, clientId, sim_start, sim_end):
    """
    Prompts the user for inspection mode or to continue.
    Press Enter to continue or 'i' for inspection.
    """
    print("🛠️ Enter 'i' for Inspection Mode or just press Enter to continue: ", end='', flush=True)
    user_input = input().strip().lower()

    if user_input == 'i':
        inspect_state(position_data, log_entry, daily_state, pattern_data, fullPosition, liveMode, ticker, clientId, sim_start, sim_end)
        print("🔄 Returning to monitoring loop...")
    else:
        print("⏭️ Moving to the next iteration...\n")
    

def inspect_state(position_data, log_entry, daily_state, pattern_data, fullPosition, liveMode, ticker, clientId, sim_start, sim_end):
    """
    Interactive inspection of current session state.
    """
    while True:
        print("\n📝 ** Interactive Inspection Mode **")
        print("D = Show Position Data")
        print("L = Show Log Entry")
        print("S = Show Daily State")
        print("P = Show Pattern Data")
        print("F = Show Full Position Amount")
        print("M = Show Mode (Live/Simulation)")
        print("T = Show Ticker and Client ID")
        print("R = Show Simulation Start/End Dates")
        print("Q = Quit Inspection Mode")
        user_input = input("Choose an option: ").strip().lower()

        if user_input == "d":
            print("\n🔎 ** Position Data **")
            print(json.dumps(position_data, indent=4))
        elif user_input == "l":
            print("\n🔎 ** Log Entry **")
            print(json.dumps(log_entry, indent=4))
        elif user_input == "s":
            print("\n🔎 ** Daily State **")
            print(json.dumps(daily_state, indent=4))
        elif user_input == "p":
            print("\n🔎 ** Pattern Data **")
            print(json.dumps(pattern_data, indent=4))
        elif user_input == "f":
            print("\n🔎 ** Full Position Amount **")
            print(f"💰 Full Position Amount: ${fullPosition}")
        elif user_input == "m":
            print("\n🔎 ** Mode **")
            mode = "Live Trading Mode" if liveMode else "Simulation Mode"
            print(f"🛠️ Mode: {mode}")
        elif user_input == "t":
            print("\n🔎 ** Ticker and Client ID **")
            print(f"🔹 Ticker: {ticker}")
            print(f"🔹 Client ID: {clientId if clientId else 'N/A'}")
        elif user_input == "r":
            print("\n🔎 ** Simulation Dates **")
            print(f"📅 Simulation Start: {sim_start}")
            print(f"📅 Simulation End: {sim_end}")
        elif user_input == "q":
            print("\n🔙 Exiting Inspection Mode.")
            break
        else:
            print("❌ Invalid option. Try again.")
            
            
#################################################################### END


def clear_stale_sessions(port=4002):
    """ Cleans up old IB Gateway client connections. """
    for process in psutil.process_iter(['pid', 'name', 'cmdline']):
        if 'python' in process.info['name'] and f'{port}' in str(process.info['cmdline']):
            print(f"Killing stale client process: {process.info['pid']}")
            process.kill()


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




        
        
### WORKING ON MONITOR STOCK LIVE        
### WORKING ON MONITOR STOCK LIVE   
### WORKING ON MONITOR STOCK LIVE   
### WORKING ON MONITOR STOCK LIVE   
### WORKING ON MONITOR STOCK LIVE   



liveMode = False ##### IMPORTANT !!! this is now set in if len(sys.argv) == 4 OR 5 down at the end

def monitor_stock_live(pattern_data, ticker):
    
    # ✈️ Startup Flags
    fresh_start = True
    recovered_from_snapshot = False
    finalize_this_session = False
    cool_off_mode = None  # 🔥 Add this here
    last_prompt_day = None  # 🧊 Tracks last day prompt shown in Cool Off Mode
    
    if liveMode:
        # ⏰ Set the live mode to start today (NYSE time) and roll forward 30 days for end date
        nyc_tz = pytz.timezone('America/New_York')
        
        # Set start date to today in NY timezone
        start_date = datetime.now(nyc_tz).strftime("%Y-%m-%d")
        pattern_data["patternPoints"][2]["time"] = start_date
        
        # Set the simulation end date to 30 days in the future (NY timezone)
        future_end = (datetime.now(nyc_tz) + timedelta(days=30)).strftime("%Y-%m-%d")
        pattern_data["patternPoints"][3]["time"] = future_end
        
        # 🔄 Parse the end date into a datetime object for comparisons
        sim_end_date = datetime.strptime(future_end, "%Y-%m-%d")
        
        # Clear stale sessions
        clear_stale_sessions()
        
        # ✅ CONNECT TO IB GW HERE
        
        clientId = pattern_data["clientId"]
        print(f"🔗 Connecting to IB Gateway for live data with Client ID = {clientId}")
        ib = IB() # type: ignore
        pattern_data["ib"] = ib
        ib.connect('127.0.0.1', 4002, clientId)
        
    else: 
        # Get the start date directly from pattern_data
        start_date = pattern_data["patternPoints"][2]["time"]
        
        # 📝 Parse the simulation end date from pattern_data
        sim_end_date = datetime.strptime(pattern_data["patternPoints"][3]["time"], "%Y-%m-%d")

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
            
    # 🔄 Fetch the open and close times
    market_open, market_close = get_market_open_close(live_session_day)
    print(f"🕒 Market for {live_session_day} opens at {market_open} and closes at {market_close}")
    
    # Initialize logs and position history
    daily_log = []
    position_history = []
    
    
    
    
    while True:
        
        # ➡️ Check if we are past the simulation end date
        live_session_datetime = datetime.strptime(live_session_day, "%Y-%m-%d")
        if live_session_datetime > sim_end_date:
            print(f"🏁 Reached the end of simulation period: {sim_end_date}")
            print("🔄 Finalizing and summarizing trading results...")
            summarize_trading_results(position_history, fullPosition)
            return
        
        # 1️⃣ Fetch Daily Data
        if liveMode:
            print("🌐 Fetching daily data from IB Gateway...") 
            fetch_daily_ohlcv_100days(ib, ticker, live_session_day, save_path=f"../data/{ticker}/{ticker}_{live_session_day}.csv")
        daily_data = load_daily_history_for_day(ticker, last_closed_day)
        pattern_data["dailyData"] = daily_data
        pattern_data["patternPoints"][2]["time"] = last_closed_day

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
            "last_tick_price": [],
            "buy_events": [],
            "sell_events": [],
            "events": [],
            "lambda_points": [],
            "max_size_warning": False
        }

        daily_state = {}
        
        # 🔄 Attempt Recovery if Snapshot Exists
        global position_data
        # 🔄 One-time INIT recovery logic
        if fresh_start:
            snapshot = load_snapshot(ticker, pattern_data["patternPoints"][1]["time"], market_is_open, now)

            if snapshot:
                print("🗓️ Snapshot found. Evaluating session status...")

                # ✅ Load snapshot state
                position_data = snapshot["position_data"]
                log_entry = snapshot["log_entry"]
                daily_state = snapshot["daily_state"]
                # ❌ DO NOT override these time-sensitive values
                # pattern_data = snapshot["pattern_data"]
                # last_closed_day = snapshot["last_closed_day"]
                # live_session_day = snapshot["live_session_day"]
                intraday_low = snapshot["intraday_low"]
                intraday_high = snapshot["intraday_high"]
                position_history = snapshot.get("position_history", [])
                cool_off_mode = snapshot.get("cool_off_mode", None)
                last_prompt_day = snapshot.get("last_prompt_day", None)
                
                # ❌ Do NOT override daily_data or pattern points
                # daily_data = pattern_data["dailyData"]
                # current_day_index = len(daily_data) - 1
                # pattern_data["patternPoints"][2]["time"] = last_closed_day

                # 🧠 Core logic: what was the monitoring session doing?
                if snapshot.get("session_in_progress"):

                    if market_is_open:
                        print("🔁 Session was in progress and market is open. Resuming trading.")
                        recovered_from_snapshot = True

                    else:
                        print("⏳ Session was in progress but market is now closed. Will finalize and roll.")
                        finalize_this_session = True
                        recovered_from_snapshot = True

                else:
                    print("✅ Session already closed. Loading state and continuing.")
                    recovered_from_snapshot = True

            else:
                print("📂 No snapshot found. This is a true fresh start.")

            # ✅ Disable any further startup checks
            fresh_start = False

        def handle_realtime_tick(price_data):
            
            nonlocal cool_off_mode, last_prompt_day
            nonlocal intraday_low, intraday_high, current_day_index
            
            # ✅ Step 3a: Mark session as started on first tick
            if not daily_state.get("session_started"):
                print("🚀 First tick received. Marking session as in progress.")
                daily_state["session_started"] = True  # Prevent running again

                save_snapshot(
                    ticker,
                    pattern_data["patternPoints"][1]["time"],
                    **build_snapshot(position_data, log_entry, daily_state, pattern_data, intraday_low, intraday_high, last_closed_day, live_session_day, True, position_history, cool_off_mode, last_prompt_day)
                )
            
            tick_price = price_data["price"]
            tick_time = price_data["time"]
        

            # 🧨 TEMPORARY INTERRUPTION INJECTION FOR TESTING
            if False and not liveMode:
                interrupt_point = datetime.fromisoformat("2024-08-22 13:10:00-04:00")

                # Convert tick_time to datetime (if it's not already)
                if isinstance(tick_time, str):
                    current_tick_time = datetime.fromisoformat(tick_time)
                elif isinstance(tick_time, datetime):
                    current_tick_time = tick_time
                else:
                    raise TypeError(f"Unexpected tick_time type: {type(tick_time)} → {tick_time}")

                # Convert both to timestamps for safe comparison
                if current_tick_time.timestamp() > interrupt_point.timestamp():
                    print(f"🔌 Simulated interruption triggered at {current_tick_time}")
                    raise KeyboardInterrupt("Artificial interruption for snapshot test.")
            
            intraday_low = min(intraday_low, tick_price)
            intraday_high = max(intraday_high, tick_price)

            log_entry["last_tick_price"] = round(tick_price, 2)

            buy_result, cool_off_mode, last_prompt_day = check_buy(
                pattern_data,
                position_data,
                max_risk=0.04,
                current_day_index=current_day_index,
                full_position=fullPosition,
                tick_price=tick_price,
                log_entry=log_entry,
                daily_state=daily_state,
                cool_off_mode=cool_off_mode,
                last_prompt_day=last_prompt_day
            )
            
            if isinstance(buy_result, tuple):
                buy_result, cool_off_mode, last_prompt_day = buy_result

            sell_result, cool_off_mode = check_sell(
                pattern_data,
                position_data,
                current_day_index,
                fullPosition,
                position_history,
                {"time": tick_time, "price": tick_price},
                intraday_low,
                intraday_high,
                log_entry=log_entry,
                cool_off_mode=cool_off_mode
            )
            
            # If either one of them returned True, the snapshot is saved
            if buy_result or sell_result:
                print(f"💾 Snapshot saved after {'BUY' if buy_result else 'SELL'} event.")
                save_snapshot(
                    ticker,
                    pattern_data["patternPoints"][1]["time"],
                    **build_snapshot(position_data, log_entry, daily_state, pattern_data, intraday_low, intraday_high, last_closed_day, live_session_day, True, position_history, cool_off_mode, last_prompt_day)
                )
                
        # 🔄 Stream Ticks for the Day
        if liveMode:
            get_GW_realtime_data(ib, ticker, handle_realtime_tick, market_open, market_close)
        else:
            get_GW_realtime_data_TEST_market_closed(ticker, live_session_day, handle_realtime_tick, live_simulated=True)
            
        
        # 🗓️ Log entry and append to daily log
        daily_log.append(log_entry)
        
        last_closed_day = live_session_day
        live_session_day = get_next_trading_day(live_session_day)    

        # 🧹 Reset daily log for next loop
        daily_log = []
        
        # ✅ Step 3b: Mark session as closed
        save_snapshot(
            ticker,
            pattern_data["patternPoints"][1]["time"],
            **build_snapshot(position_data, log_entry, daily_state, pattern_data, intraday_low, intraday_high, last_closed_day, live_session_day, False, position_history, cool_off_mode, last_prompt_day)
        )
        
        ## save_trade_log(ticker, log_entry)
        
        # This will prompt for inspection or continue
        if not liveMode:
            clientId = pattern_data["clientId"]
            inspection_prompt(position_data, log_entry, daily_state, pattern_data, fullPosition, liveMode, ticker, clientId, sim_start, sim_end)

    
    
    




if len(sys.argv) == 4:
    clientId, ticker, hybrid_start = sys.argv[1], sys.argv[2], sys.argv[3]
    liveMode = True
    print(f"🟢 Running in Real-Time Mode for {ticker} with Client ID: {clientId}")

elif len(sys.argv) == 5:
    ticker, hybrid_start, sim_start, sim_end = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    liveMode = False
    clientId = None  # No need for client ID in simulation
    print(f"🔵 Running in Simulation Mode for {ticker} from {sim_start} to {sim_end}")

else:
    print("❌ Invalid number of arguments. Use:\n"
          "   Real-Time Mode → python ai_bot.py <CLIENT_ID> <TICKER> <HYBRID_START>\n"
          "   Simulation Mode → python ai_bot.py <TICKER> <HYBRID_START> <SIM_START> <SIM_END>")
    exit()

pattern_data = {
    "dailyData": [],
    "patternPoints": [
        {"time": "0000-00-00"},
        {"time": hybrid_start[:10]},
        {"time": sim_start if not liveMode else "0000-00-00"},
        {"time": sim_end if not liveMode else "0000-00-00"},
    ],
    "liveMode": liveMode,
    "ticker": ticker,
    "clientId": clientId,
    "ib": None  # 👈 Pass the instance here
}

monitor_stock_live(pattern_data, ticker)
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
import time
from buy_logic import detect_trend_mode

from snapshot import create_snapshot, save_trade_log # type: ignore

from buy_logic import printParameters

import exchange_calendars as ecals
from datetime import date

import psutil

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
        if liveMode:
            get_GW_realtime_data(ib, ticker, handle_realtime_tick)
        else:
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
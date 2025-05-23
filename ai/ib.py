from ib_insync import *  # type: ignore
from datetime import datetime, timedelta
import sys
import os
import pandas as pd
import time
import exchange_calendars as ecals
import pytz

calendar = ecals.get_calendar("XNYS")  # NYSE calendar
ny_tz = pytz.timezone('America/New_York')


def get_GW_realtime_data_TEST_market_closed(ticker, live_session_day, monitor_callback, live_simulated=True):
    """
    Simulates real-time data feed using 1-min CSV files for each trading day.
    
    Args:
        ticker (str): The stock ticker symbol (e.g., "AAPL").
        live_session_day (str): The current trading day in simulation.
        monitor_callback (func): The callback function to execute on each new tick.
        live_simulated (bool): If True, uses CSV simulation instead of IB Gateway.
    """
    ## file_path = f"../data/{ticker}/{ticker}_{live_session_day}_1min.csv"
    ## print(f"📂 Loading _1min.csv {live_session_day}")
    
    file_path = f"../data/{ticker}/{ticker}_{live_session_day}_30min.csv"
    print(f"📂 Loading {live_session_day}_30min.csv for intraday tick monitoring simulation")
    
    try:
        df = pd.read_csv(file_path, parse_dates=['date'])
    except FileNotFoundError:
        print(f"❌ CSV file not found for {live_session_day}.")
        return

    # 🔄 Stream all ticks from the _1min.csv
    for _, row in df.iterrows():
        price_data = {
            "time": row['date'].strftime("%Y-%m-%d %H:%M:%S"),
            "price": round(row['close'], 2)
        }
        """
        # 🕒 Skip ticks before 14:30 if resuming 2024-08-26 after artificial interruption
        if live_simulated and live_session_day == "2024-08-22":
            skip_resume_point = datetime.fromisoformat("2024-08-22 14:30:00-04:00").timestamp()
            current_tick_time = row['date'].timestamp()

            if current_tick_time < skip_resume_point:
                continue
        
        # 🕒 Skip ticks before 10:00 if resuming 2024-08-26 after artificial interruption
        if live_simulated and live_session_day == "2024-08-26":
            skip_resume_point = datetime.fromisoformat("2024-08-26 10:00:00-04:00").timestamp()
            current_tick_time = row['date'].timestamp()

            if current_tick_time < skip_resume_point:
                continue
        
        # 🕒 Simulates if the restart is after market close    
        if live_simulated and live_session_day == "2024-08-26":
            print(f"🛑 Simulated start after market close on {live_session_day} at 16:30")
            return
        """
        
        # 🔄 Callback with price data
        monitor_callback(price_data)
        
        # 🔄 Simulate 1ms real-time interval
        time.sleep(0.001)
    





def get_last_closed_trading_day(simulate_date=None):
    """
    Determines if the market is open and identifies the last closed trading day.
    
    Args:
        simulate_date (str): Optional. If provided, it forces the date (e.g., "2024-08-16").
    
    Returns:
        tuple: (last closed trading day as "YYYY-MM-DD", market_is_open as bool, datetime object for now)
    """
    
    if simulate_date:
        # 🌎 For simulation purposes, force the date and time
        today = datetime.strptime(simulate_date, "%Y-%m-%d").date()
        now = ny_tz.localize(datetime.strptime(f"{simulate_date} 09:30:00", "%Y-%m-%d %H:%M:%S"))
    else:
        # ✅ Real-time execution
        today = datetime.now().date()
        now = datetime.now(pytz.utc).astimezone(ny_tz)

    # 🔄 Get all trading sessions around today (+1 day to include today if trading)
    all_sessions = calendar.sessions_in_range(today - timedelta(days=30), today + timedelta(days=1))
    session_dates = [session.date() for session in all_sessions]

    # ✅ Check if today is a trading session
    if today in session_dates:
        market_open = calendar.session_open(today)
        market_close = calendar.session_close(today)
        
        if market_open <= now < market_close:
            # Market is currently open → last closed day is yesterday
            last_closed_day = session_dates[session_dates.index(today) - 1]
            return last_closed_day.strftime("%Y-%m-%d"), True, now
        
    # ❌ If market is closed or not a session → Find the last valid session
    last_closed_day = max([d for d in session_dates if d < today])
    return last_closed_day.strftime("%Y-%m-%d"), False, now



def get_market_open_close(trading_day):
    """
    Fetches the market open and close times for a given trading day.

    Args:
        trading_day (str): Date of the trading session in 'YYYY-MM-DD' format.

    Returns:
        tuple: (market_open, market_close) as timezone-aware datetime objects.
    """
    ny_tz = pytz.timezone('America/New_York')
    date_obj = datetime.strptime(trading_day, "%Y-%m-%d")
    
    # Calendar session open and close
    market_open = calendar.session_open(date_obj).astimezone(ny_tz)
    market_close = calendar.session_close(date_obj).astimezone(ny_tz)

    print(f"🕒 Market on {trading_day} → Open: {market_open}, Close: {market_close}")
    
    return market_open, market_close



def get_next_trading_day(current_date):
    """
    Returns the next trading day for the NYSE market based on the given date.
    
    Args:
        current_date (str): The current date in the format 'YYYY-MM-DD'.
    
    Returns:
        str: The next open trading day.
    """
    print(f"🔄 Finding next trading day after {current_date}")
    
    # Convert to datetime object if not already
    if isinstance(current_date, str):
        current_date = datetime.strptime(current_date, "%Y-%m-%d")

    # Remove timezone if it exists (make it naive)
    if current_date.tzinfo is not None:
        current_date = current_date.replace(tzinfo=None)

    # Fetch next available session dates
    next_sessions = calendar.sessions_in_range(current_date + timedelta(days=1), 
                                               current_date + timedelta(days=10))

    next_open = next_sessions[0].strftime("%Y-%m-%d")
    print(f"🗓️ Next trading session: {next_open}")
    return next_open


from datetime import datetime
import pytz
import sys

# 🛡️ Resilient GW Streamer with Reconnection Support
def get_GW_realtime_data(ib, ticker, monitor_callback, market_open, market_close):

    ny_tz = pytz.timezone('America/New_York')
    contract = Stock(ticker, 'SMART', 'USD')  # type: ignore

    # 🔁 Retry loop until Gateway is responsive
    while True:
        try:
            ib.qualifyContracts(contract)
            break
        except Exception as e:
            print(f"⚠️ IB Gateway unavailable ({e}). Retrying in 5s...")
            time.sleep(5)

    def on_tick(tick_set):
        try:
            tick = next(iter(tick_set))
        except StopIteration:
            print("⚠️ Tick set empty.")
            return

        if hasattr(tick, 'last') and tick.last is not None:
            price_data = {
                "time": datetime.now(ny_tz).strftime("%Y-%m-%d %H:%M:%S"),
                "price": tick.last
            }
            sys.stdout.write(f"\r💡 Tick | {price_data['time']} | ${price_data['price']:.2f}")
            sys.stdout.flush()
            monitor_callback(price_data)

        # 🕒 End session if market closed
        now = datetime.now(ny_tz)
        if now >= market_close:
            print(f"\n⏹️ Market closed at {market_close.strftime('%H:%M')}. Ending stream.")
            ib.cancelMktData(contract)
            ib.disconnect()
            raise StopIteration

    # 📡 Subscribe and stream
    ib.reqMktData(contract, "", False, False)
    ib.pendingTickersEvent += on_tick

    print(f"🚀 GW Live Stream started for {ticker} with auto-reconnect")

    while True:
        try:
            ib.run()
            break
        except Exception as e:
            print(f"\n❌ GW Error: {e} — attempting reconnect in 5s...")
            ib.disconnect()
            time.sleep(5)
            try:
                if not ib.isConnected():
                    ib.connect('127.0.0.1', 4002, clientId=ib.clientId)
                ib.reqMktData(contract, "", False, False)
            except Exception as e2:
                print(f"🔁 Reconnect failed: {e2}")



def safe_fetch_daily_ohlcv(ib, ticker, live_session_day, save_path, max_retries=10, wait_seconds=5):
    """
    Attempts to fetch daily OHLCV data safely with retry logic.
    Prevents crash if GW is restarting or momentarily unresponsive.
    """
    for attempt in range(max_retries):
        try:
            fetch_daily_ohlcv_100days(ib, ticker, live_session_day, save_path)
            return  # ✅ Success, return immediately
        except Exception as e:
            print(f"⚠️ Attempt {attempt+1}/{max_retries} failed: {e}")
            print(f"⏳ Waiting {wait_seconds}s before retrying...")
            time.sleep(wait_seconds)
    
    print("❌ All retry attempts failed. Daily data could not be fetched.")

def fetch_daily_ohlcv_100days(ib, ticker, end_date, save_path):
    ## ib = IB() # type: ignore
    ## ib.connect('127.0.0.1', 4002, clientId=1)

    contract = Stock(ticker, 'SMART', 'USD') # type: ignore
    end_dt = datetime.strptime(end_date, '%Y-%m-%d').strftime('%Y%m%d %H:%M:%S')

    bars = ib.reqHistoricalData( # type: ignore
        contract,
        endDateTime=end_dt,
        durationStr='6 M',
        barSizeSetting='1 day',
        whatToShow='TRADES',
        useRTH=True,
        formatDate=1
    )

    df = util.df(bars) # type: ignore

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    last_date = df['date'].max().strftime('%Y-%m-%d')
    true_path = f"../data/{ticker}/{ticker}_{last_date}.csv"
    df.to_csv(true_path, index=False)
    print(f"💾 Saved daily data to: {true_path}")


def fetch_daily_range(ticker, start_date, end_date):
    sessions = calendar.sessions_in_range(start_date, end_date)
    dates_to_fetch = [session.strftime("%Y-%m-%d") for session in sessions]

    for date_str in dates_to_fetch:
        filename = f"../data/{ticker}/{ticker}_{date_str}.csv"

        if os.path.exists(filename):
            print(f"✅ Cached daily: {filename} — skipping")
            continue

        print(f"📅 Fetching 100d daily for: {date_str}")
        try:
            fetch_daily_ohlcv_100days(ticker, date_str, save_path=filename)
            time.sleep(10)
        except Exception as e:
            print(f"⚠️ Error fetching daily on {date_str}: {e}")


def fetch_intraday_ohlcv(ticker, date):
    filename = f"../data/{ticker}/{ticker}_{date}_30min.csv"

    if os.path.exists(filename):
        print(f"🔁 Cached intraday: {filename} — skipping")
        return

    ib = IB() # type: ignore
    ib.connect('127.0.0.1', 4002, clientId=2)

    contract = Stock(ticker, 'SMART', 'USD') # type: ignore
    end_dt = datetime.strptime(date, '%Y-%m-%d').strftime('%Y%m%d 16:00:00')

    bars = ib.reqHistoricalData(
        contract,
        endDateTime=end_dt,
        durationStr='1 D',
        barSizeSetting='30 mins',
        whatToShow='TRADES',
        useRTH=True,
        formatDate=1
    )

    ib.disconnect()
    df = util.df(bars) # type: ignore

    os.makedirs(f"../data/{ticker}", exist_ok=True)
    df.to_csv(filename, index=False)
    print(f"💾 Saved intraday data to: {filename}")


def fetch_intraday_range(ticker, start_date, end_date):
    sessions = calendar.sessions_in_range(start_date, end_date)

    for session in sessions:
        date_str = session.strftime("%Y-%m-%d")
        filename = f"../data/{ticker}/{ticker}_{date_str}_30min.csv"

        if os.path.exists(filename):
            print(f"✅ Cached intraday: {filename} — skipping")
            continue  # ⛔ Do NOT sleep if cached

        fetch_intraday_ohlcv(ticker, date_str)
        time.sleep(11)  # 💤 Delay only if we actually fetch
        
def fetch_intraday_minute_by_minute(ticker, date):
    """
    Fetches 1-minute interval intraday data for the specified ticker and date.
    Saves the data as a CSV file in the ../data/{ticker}/ folder.
    """
    filename = f"../data/{ticker}/{ticker}_{date}_1min.csv"

    if os.path.exists(filename):
        print(f"🔁 Cached intraday 1-min: {filename} — skipping")
        return

    print(f"📅 Fetching 1-minute intraday for: {date}")
    
    ib = IB() # type: ignore
    ib.connect('127.0.0.1', 4002, clientId=3)

    contract = Stock(ticker, 'SMART', 'USD') # type: ignore
    end_dt = datetime.strptime(date, '%Y-%m-%d').strftime('%Y%m%d 16:00:00')

    bars = ib.reqHistoricalData(
        contract,
        endDateTime=end_dt,
        durationStr='1 D',
        barSizeSetting='1 min',
        whatToShow='TRADES',
        useRTH=True,
        formatDate=1
    )

    ib.disconnect()
    
    if bars:
        df = util.df(bars) # type: ignore
        os.makedirs(f"../data/{ticker}", exist_ok=True)
        df.to_csv(filename, index=False)
        print(f"💾 Saved intraday minute-by-minute data to: {filename}")
    else:
        print(f"⚠️ No data returned for {ticker} on {date}")


def fetch_intraday_minute_range(ticker, start_date, end_date):
    """
    Fetches 1-minute interval intraday data for a date range.
    """
    sessions = calendar.sessions_in_range(start_date, end_date)

    for session in sessions:
        date_str = session.strftime("%Y-%m-%d")
        filename = f"../data/{ticker}/{ticker}_{date_str}_1min.csv"

        if os.path.exists(filename):
            print(f"✅ Cached 1-min intraday: {filename} — skipping")
            continue  # ⛔ Do NOT sleep if cached

        fetch_intraday_minute_by_minute(ticker, date_str)
        time.sleep(11)  # 💤 Delay only if we actually fetch


# MAIN
if __name__ == "__main__":
    ticker = sys.argv[1]
    sim_start = sys.argv[2]
    sim_end = sys.argv[3]
    
    if len(sys.argv) == 5 and sys.argv[4] == "minute":
        fetch_intraday_minute_range(ticker, sim_start, sim_end)
    else:
        fetch_daily_range(ticker, sim_start, sim_end)
        fetch_intraday_range(ticker, sim_start, sim_end)
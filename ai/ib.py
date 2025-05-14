from ib_insync import *  # type: ignore
from datetime import datetime, timedelta
import sys
import os
import pandas as pd
import time
import exchange_calendars as ecals
import pytz

calendar = ecals.get_calendar("XNYS")  # NYSE calendar



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
    ny_tz = pytz.timezone('America/New_York')
    
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


from datetime import datetime, timedelta
import exchange_calendars as ecals

calendar = ecals.get_calendar("XNYS")  # NYSE calendar

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


# Initialize the IB connection
def get_GW_realtime_data(ticker, monitor_callback):
    """
    Connects to the IB Gateway and streams real-time price data to the monitor_stock function.

    Args:
        ticker (str): The stock ticker symbol (e.g., "AAPL").
        monitor_callback (func): The callback function to execute on each new tick.
    """
    ib = IB() # type: ignore
    ib.connect('127.0.0.1', 4002, clientId=4)

    # Define the contract for the stock
    contract = Stock(ticker, 'SMART', 'USD') # type: ignore
    ib.qualifyContracts(contract)

    # Live ticker storage
    live_ticks = []

    # Define the callback for live tick updates
    def on_tick(tick):
        if tick.field == 4:  # Last price field in IB API
            price_data = {
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "price": tick.price
            }
            live_ticks.append(price_data)
            print(f"💡 Tick: {price_data}")

            # Send the tick to the monitor for buy/sell checks
            monitor_callback(price_data)

    # Subscribe to live market data
    ib.reqMktData(contract, "", False, False)
    ib.pendingTickersEvent += on_tick

    print(f"🚀 Real-time feed started for {ticker}")
    
    try:
        ib.run()
    except KeyboardInterrupt:
        print("🔌 Real-time feed stopped.")
        ib.disconnect()


def fetch_daily_ohlcv_100days(ticker, end_date, save_path):
    ib = IB() # type: ignore
    ib.connect('127.0.0.1', 4002, clientId=1)

    contract = Stock(ticker, 'SMART', 'USD') # type: ignore
    end_dt = datetime.strptime(end_date, '%Y-%m-%d').strftime('%Y%m%d %H:%M:%S')

    bars = ib.reqHistoricalData(
        contract,
        endDateTime=end_dt,
        durationStr='6 M',
        barSizeSetting='1 day',
        whatToShow='TRADES',
        useRTH=True,
        formatDate=1
    )

    ib.disconnect()
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
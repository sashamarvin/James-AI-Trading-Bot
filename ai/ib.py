from ib_insync import *  # type: ignore
from datetime import datetime, timedelta
import sys
import os
import pandas as pd
import time
import exchange_calendars as ecals

calendar = ecals.get_calendar("XNYS")  # NYSE calendar


def fetch_daily_ohlcv_100days(ticker, end_date, save_path):
    ib = IB()
    ib.connect('127.0.0.1', 4002, clientId=1)

    contract = Stock(ticker, 'SMART', 'USD')
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
    df = util.df(bars)

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

    ib = IB()
    ib.connect('127.0.0.1', 4002, clientId=2)

    contract = Stock(ticker, 'SMART', 'USD')
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
    df = util.df(bars)

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


# MAIN
if __name__ == "__main__":
    ticker = sys.argv[1]
    sim_start = sys.argv[2]
    sim_end = sys.argv[3]

    fetch_daily_range(ticker, sim_start, sim_end)
    fetch_intraday_range(ticker, sim_start, sim_end)
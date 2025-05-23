import os
import json

import os
import json

def build_snapshot(
    position_data,
    log_entry,
    daily_state,
    intraday_low,
    intraday_high,
    session_in_progress,
    position_history=None,
    cool_off_mode=None,
    last_prompt_day=None
):
    return {
        "position_data": position_data,
        "log_entry": log_entry,
        "daily_state": daily_state,
        "intraday_low": intraday_low,
        "intraday_high": intraday_high,
        "session_in_progress": session_in_progress,
        "position_history": position_history,
        "cool_off_mode": cool_off_mode,
        "last_prompt_day": last_prompt_day
    }

def save_snapshot(
    ticker,
    hybrid_start_date,
    position_data,
    log_entry,
    daily_state,
    intraday_low,
    intraday_high,
    session_in_progress=False,
    position_history=None,
    cool_off_mode=None, 
    last_prompt_day=None,
    silent=False
):
    snapshot_data = {
        "position_data": position_data,
        "log_entry": log_entry,
        "daily_state": daily_state,
        "intraday_low": intraday_low,
        "intraday_high": intraday_high,
        "session_in_progress": session_in_progress
    }

    if position_history is not None:
        snapshot_data["position_history"] = position_history
    if cool_off_mode is not None:
        snapshot_data["cool_off_mode"] = cool_off_mode
    if last_prompt_day is not None:
        snapshot_data["last_prompt_day"] = last_prompt_day

    base_path = f"monitoring_sessions/{ticker}"
    os.makedirs(base_path, exist_ok=True)
    snapshot_file = f"{base_path}/{ticker}_{hybrid_start_date}_logs.json"

    with open(snapshot_file, 'w') as f:
        json.dump(snapshot_data, f, indent=4)

    if not silent:
        print(f"💾 Snapshot saved at {snapshot_file}")
      

from datetime import datetime
from ib import get_next_trading_day  # Importing from ib.py

def load_snapshot(ticker, hybrid_start, market_is_open, now):
    """
    Loads the last saved snapshot from the monitoring sessions.
    Determines if the snapshot is intraday or end of day and acts accordingly.

    Args:
        ticker (str): The stock ticker symbol.
        hybrid_start (str): The start date of the hybrid pattern.
        market_is_open (bool): Whether the market is currently open.
        now (datetime): The current synchronized NYSE time.
    
    Returns:
        dict: The snapshot data, or None if no valid snapshot is found.
    """
    session_path = f"monitoring_sessions/{ticker}/{ticker}_{hybrid_start}_logs.json"
    
    if not os.path.exists(session_path):
        print(f"❌ No snapshot found for {ticker} at {session_path}")
        return None

    with open(session_path, 'r') as f:
        snapshot = json.load(f)
    
    print(f"💾 Snapshot loaded from {session_path}")

    # Retrieve date and session state
    session_in_progress = snapshot.get("session_in_progress", False)
    snapshot_date = snapshot.get("snapshot_date")
    live_session_day = snapshot.get("live_session_day")
    
    # Restore optional values
    cool_off_mode = snapshot.get("cool_off_mode", None)
    last_prompt_day = snapshot.get("last_prompt_day", None)

    # Inject them back into the snapshot dict
    snapshot["cool_off_mode"] = cool_off_mode
    snapshot["last_prompt_day"] = last_prompt_day

    # 🟢 CASE 1: Market is open and session was in progress → resume
    if market_is_open and session_in_progress:
        print(f"🟢 Resuming live market session for {live_session_day}")
        return snapshot

    # ⏳ CASE 2: Market closed, session in progress → finalize
    elif not market_is_open and session_in_progress:
        print(f"⏳ Market closed but session was in progress. Will finalize {live_session_day}")
        return snapshot

    # ✅ CASE 3: Market closed, session already complete → no action needed
    elif not market_is_open and not session_in_progress:
        print(f"✅ Market closed and session already completed. Resuming cleanly from {live_session_day}")
        return snapshot

    # 🤷‍♂️ Fallback (rare): assume snapshot is okay, return as is
    print(f"⚠️ Unusual snapshot condition. Returning as-is.")
    return snapshot

def save_trade_log(ticker, log_entry):
    return
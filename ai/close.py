#!/usr/bin/env python

import sys
from ib_insync import IB, Stock, MarketOrder # type: ignore

def close_position(symbol):
    ib = IB()
    try:
        ib.connect('127.0.0.1', 4002, clientId=999)

        for pos in ib.positions():
            if pos.contract.symbol.upper() == symbol.upper() and pos.position != 0:
                action = 'SELL' if pos.position > 0 else 'BUY'
                qty = abs(pos.position)
                contract = Stock(symbol.upper(), 'SMART', 'USD')
                ib.qualifyContracts(contract)
                order = MarketOrder(action, qty)
                order.outsideRth = True  # ✅ Allow after-hours execution
                ib.placeOrder(contract, order)
                print(f"🔴 Closing {qty} shares of {symbol.upper()} ({action})...")
                ib.sleep(2)
                print(f"✅ Position for {symbol.upper()} closed.")
                break
        else:
            print(f"⚠️ No open position found for {symbol.upper()}")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        ib.disconnect()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python close.py <SYMBOL>")
        sys.exit(1)
    symbol = sys.argv[1]
    close_position(symbol)
#!/usr/bin/env python

from ib_insync import IB

def show_portfolio():
    ib = IB()
    try:
        ib.connect('127.0.0.1', 4002, clientId=97)

        portfolio = ib.portfolio()
        account_summary = ib.accountSummary()

        print("📊 Open Portfolio Positions:\n")
        total_market_value = 0
        total_unrealized_pnl = 0

        if not portfolio:
            print("📭 No open positions.")
        else:
            for item in portfolio:
                contract = item.contract
                mv = item.marketValue or 0
                pnl = item.unrealizedPNL or 0
                total_market_value += mv
                total_unrealized_pnl += pnl

                print(f"🪙 Symbol       : {contract.symbol}")
                print(f"📈 Position     : {item.position}")
                print(f"💵 Avg Cost     : ${item.averageCost:.2f}")
                print(f"💰 Market Value : ${mv:.2f}")
                print(f"📊 Unrealized PnL: ${pnl:.2f}")
                print(f"🧾 Account      : {item.account}")
                print("-" * 40)

        print("\n🧮 TOTALS:")
        print(f"💼 Total Market Value : ${total_market_value:,.2f}")
        print(f"📉 Total Unrealized PnL: ${total_unrealized_pnl:,.2f}")

        print("\n💳 ACCOUNT SUMMARY:\n")
        fields = [
            'NetLiquidation', 'BuyingPower', 'AvailableFunds', 'CashBalance',
            'EquityWithLoanValue', 'ExcessLiquidity', 'FullInitMarginReq', 'FullMaintMarginReq'
        ]

        for field in fields:
            value = next((row.value for row in account_summary if row.tag == field), 'N/A')
            try:
                print(f"{field:<25}: ${float(value):,.2f}")
            except:
                print(f"{field:<25}: {value}")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        ib.disconnect()

if __name__ == "__main__":
    show_portfolio()
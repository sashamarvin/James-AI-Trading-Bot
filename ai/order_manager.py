from ib_insync import Order, Contract, IB  # type: ignore
import logging
import time

# Initialize logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def create_contract(symbol, secType='STK', exchange='SMART', currency='USD'):
    """
    Create a contract object for the specified symbol.
    """
    contract = Contract()
    contract.symbol = symbol
    contract.secType = secType
    contract.exchange = exchange
    contract.currency = currency
    return contract


def place_order(ib, symbol, action, quantity, order_type='MKT', limit_price=None, stop_price=None, stop_loss=None):
    """
    Place an order on IB Gateway.
    """
    contract = create_contract(symbol)
    order = Order()
    order.action = action
    order.totalQuantity = quantity
    order.orderType = order_type

    if order_type == 'LMT' and limit_price:
        order.lmtPrice = limit_price
    elif order_type == 'STP' and stop_price:
        order.auxPrice = stop_price

    # Place the main order
    trade = ib.placeOrder(contract, order)
    logging.info(f"🚀 Placed Order: {action} {quantity} of {symbol} at {order_type}")

    if stop_loss and action == "BUY":
        stop_order = Order()
        stop_order.action = "SELL"
        stop_order.totalQuantity = quantity
        stop_order.orderType = "STP"
        stop_order.auxPrice = stop_loss
        ib.placeOrder(contract, stop_order)
        logging.info(f"🔒 Stop Loss Set at ${stop_loss} for {symbol}")
    
    return trade
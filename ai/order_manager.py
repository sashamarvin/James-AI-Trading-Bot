from ib_insync import Order, Contract, IB  # type: ignore
import logging
import time

# Initialize logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# IB Connection instance
ib = IB()


def connect_ib_gateway(host='127.0.0.1', port=4002, clientId=4):
    """
    Connect to IB Gateway or TWS instance. Reattempts if the connection fails.
    """
    max_retries = 3
    attempts = 0
    
    while attempts < max_retries:
        if not ib.isConnected():
            ib.connect(host, port, clientId)
            logging.info(f"✅ Connected to IB Gateway (Attempt {attempts + 1}/{max_retries})")
            time.sleep(1)  # Small pause to allow full connection
            if not ib.isConnected() or "ushmds" not in ib.reqNewsBulletins():
                logging.warning("⚠️ ushmds farm not connected. Retrying...")
            else:
                return True
        else:
            logging.info("⚠️ Already connected to IB Gateway")
            return True
        
        attempts += 1
        time.sleep(2)  # Wait before retrying
    
    logging.error("❌ Failed to connect to IB Gateway after 3 attempts.")
    return False


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


def place_order(symbol, action, quantity, order_type='MKT', limit_price=None, stop_price=None, stop_loss=None):
    """
    Place an order on IB Gateway.
    """
    connect_ib_gateway()
    
    contract = create_contract(symbol)
    
    # Main Order (Market, Limit, or Stop)
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
    
    # Optional: Place Stop Loss if defined and action is "BUY"
    if stop_loss and action == "BUY":
        stop_order = Order()
        stop_order.action = "SELL"
        stop_order.totalQuantity = quantity
        stop_order.orderType = "STP"
        stop_order.auxPrice = stop_loss
        ib.placeOrder(contract, stop_order)
        logging.info(f"🔒 Stop Loss Set at ${stop_loss} for {symbol}")
    
    return trade
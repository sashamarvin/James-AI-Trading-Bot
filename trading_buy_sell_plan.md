
# 📘 Trading Buy & Sell Plan

---

## 🎯 BUY STRATEGIES

| Buy | Pattern        | Used When                  | Function                         |
|-----|----------------|----------------------------|----------------------------------|
| A   | Slanted down   | Early entries / Pullbacks  | `buy_pilot_position()`           |
| B   | Horizontal     | Standard breakouts         | `buy_breakout_confirmation()`    |
| C   | Follow-through | After breakout momentum    | `buy_additional_confirmation()`  |

---

## ⚔️ AGGRESSIVE PLAN

| Buy | Conditions   | Position | Max Risk | Stop Logic                  |
|-----|--------------|----------|----------|-----------------------------|
| 1st | Buy A or B   | 1/4      | 4%       | Closest support             |
| 2nd | Buy B        | 1/2      | 7%       | Updated stop for all shares|
| 3rd | A/B/C        | 1/4      | 7%       | Updated stop for all shares|

---

## 🛡️ CONSERVATIVE PLAN

| Buy | Conditions     | Position | Max Risk | Extra Requirement             |
|-----|----------------|----------|----------|--------------------------------|
| 1st | Buy B          | 1/4      | 5%       | 3-day base or pivot            |
| 2nd | Buy B or C     | 1/2      | 7%       | 5-day base or pivot            |
| 3rd | Buy B or C     | 1/4      | 7%       | 3-day consolidation required   |

---

## 🧠 STOP LOGIC

- Set at **most recent swing low** after each buy.
- If new higher support forms, **raise the stop** for total position.
- If price **accelerates above EMA10/EMA50**, tighten stop accordingly.
- On **partial sell**, stop may **revert to last valid level**.

---

## 💸 SELL LOGIC

- Calculate **1R, 2R, 3R** from each buy's risk %.
- Detect trend phase via **EMA10 vs EMA50 angle**:
  - `<10°` → Normal trend
  - `10–40°` → Strong trend
  - `>40°` → Parabolic
- **Sell logic**:
  - Sell 1/4 at **2R or first harmonic target**
  - Sell 1/2 at **+20% gain**
  - Hold last 1/4 with **tight stop trailing**
- **Harmonics targets**:
  - `W2 x 2`
  - `W1 + W2`
  - `W3 + W2`

---

## 🔧 TOOLS USED

- `lambdaA()` — detects pullbacks (lower highs)
- `lambdaB()` — detects rallies (higher lows)

---

Ready to implement.

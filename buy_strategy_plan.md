
# Buy Strategy Plan

## Buy Types

- **BuyA: Slanted down**
  - Used for early entry or buy on pullback
  - Function: `buy_pilot_position()`

- **BuyB: Horizontal**
  - Used for most cases
  - Function: `buy_breakout_confirmation()`

- **BuyC: Follow through**
  - Used for additional buys crossing previous day high AND max 3 days from breakout day high
  - Function: `buy_additional_confirmation()`

---

## Aggressive Strategy

1. **1st Buy**: BuyA or BuyB
   - Position size: 1/4
   - Stop: Closest support level
   - Max risk: 4%

2. **2nd Buy**: BuyB
   - Position size: 1/2
   - Stop: Closest support level (all shares)
   - Max risk: 7%

3. **3rd Buy**: BuyC or A or B
   - Position size: 1/4
   - Stop: Closest support level (all shares)
   - Max risk: 7%

---

## Conservative Strategy

1. **1st Buy**: BuyB
   - Requires: min 3 days consolidation or a pivot
   - Position size: 1/4
   - Stop: Closest support level
   - Max risk: 5%

2. **2nd Buy**: BuyB or BuyC
   - Requires: min 5 days consolidation or pivot
   - Position size: 1/2
   - Max risk: 7%

3. **3rd Buy**: BuyB or BuyC
   - Requires: min 3 days consolidation
   - Position size: 1/4
   - Max risk: 7% from most recent low swing (stop)

---

## Stop Logic

- Set at closest support level (recent low swing) immediately after a buy for **all open shares**.
- If last support is **higher than previous**, stop is **elevated to that level** and applied to full position.
- If price accelerates and **distance from EMA10/50 increases**, stop gets **closer to price** proportionally.
- On **parabolic strength**, **partial sell** can occur and stop resets **lower** (needs more verification).
- Stop is removed on full sell by sell function.

---

## Sell Logic

- **1R** = break-even + original risk %
- **2R, 3R...** compound based on entry risk %
- **Trend Mode**:
  - Normal: EMA50 follow
  - Strong: EMA10 and EMA50 diverge < 40°
  - Parabolic: Divergence > 40°, 3-day angle acceleration

- **Profit-taking rules**:
  - Sell 1/4 at 2R or harmonic targets (whichever comes first)
  - Harmonics:
    - W2 x 2 = W2 target
    - W1 + W2 = W1 target
    - W3 + W2 = W3 target
  - Sell 1/2 at 20%
  - Keep 1/4 to ride trend with trailing stop

---

## Lambda Function Usage

- `lambdaB`: detects **swings on the uptrend / rallies** → Used to determine **stop levels**.
- `lambdaA`: detects **lower highs / pullbacks**
- `detect_lambda_type_smart()`: determines lambda type based on shape
- `lambda_flat_or_ascending_highs_lows()`: detects **swing highs** or **ceiling patterns**
- `lambda_versify_highs_lows()`: detects **lower high pullbacks**

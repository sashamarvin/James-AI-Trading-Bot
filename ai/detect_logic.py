def analyze_contraction_waves(pattern_points):
    drops = []

    contraction_values = [pt["value"] for pt in pattern_points[1:-1]]

    for i in range(0, len(contraction_values) - 1, 2):
        high = contraction_values[i]
        low = contraction_values[i + 1]
        drop_pct = ((high - low) / high) * 100
        drops.append(round(drop_pct, 2))

    allowed_soft_violation = 0
    is_tightening = True

    for i in range(len(drops) - 1):
        if drops[i + 1] > drops[i]:
            # Allow one soft violation if the increase is minor (≤15% of prior wave)
            if allowed_soft_violation == 0 and (drops[i + 1] - drops[i]) / drops[i] <= 0.15:
                allowed_soft_violation += 1
                continue
            is_tightening = False
            break

    return {
        "contractions": drops,
        "is_tightening": is_tightening,
        "diagnostic": (
            "Wave contractions are tightening with acceptable natural variation."
            if is_tightening else
            "Contractions show inconsistent tightening beyond tolerance."
        )
    }

def analyze_ema_symmetry(pattern_points, daily_data):
    contraction_points = pattern_points[1:-1]  # Skip pre/post

    deviations = []
    for point in contraction_points:
        date = point["time"]
        value = point["value"]
        bar = next((d for d in daily_data if d["time"] == date), None)
        if not bar:
            continue
        ema = bar.get("ema10")
        if not ema:
            continue
        deviation_pct = abs(value - ema) / ema * 100
        deviations.append(round(deviation_pct, 2))

    avg_dev = round(sum(deviations) / len(deviations), 2) if deviations else 0

    if avg_dev <= 2:
        note = "Price hugged EMA10 closely — typical in tight VCPs."
    elif avg_dev <= 4:
        note = "Some distance from EMA10 — still reasonable."
    else:
        note = "Wider deviation from EMA10 — watch for price loose behavior."

    return {
        "avg_deviation": avg_dev,
        "note": note
    }


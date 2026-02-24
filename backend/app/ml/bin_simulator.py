"""
Smart Bins Simulation Engine
Simulates dynamic bin fill-level behavior under varying scenarios.
Session 6: Smart Bins Simulation – Optimization Using Analytics.
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional


# Fill rate profiles (liters per hour) by bin type
FILL_RATE_PROFILES = {
    "residential": {
        "weekday": {
            "night": 0.5,    # 00-06
            "morning": 3.0,  # 06-10
            "midday": 1.5,   # 10-14
            "afternoon": 2.0,# 14-18
            "evening": 3.5,  # 18-22
            "late": 1.0,     # 22-00
        },
        "weekend": {
            "night": 0.3,
            "morning": 2.0,
            "midday": 3.0,
            "afternoon": 3.5,
            "evening": 4.0,
            "late": 1.5,
        },
    },
    "commercial": {
        "weekday": {
            "night": 0.2,
            "morning": 4.0,
            "midday": 5.0,
            "afternoon": 4.5,
            "evening": 2.0,
            "late": 0.3,
        },
        "weekend": {
            "night": 0.1,
            "morning": 1.0,
            "midday": 1.5,
            "afternoon": 1.0,
            "evening": 0.5,
            "late": 0.1,
        },
    },
    "public_space": {
        "weekday": {
            "night": 0.1,
            "morning": 2.0,
            "midday": 3.5,
            "afternoon": 3.0,
            "evening": 4.0,
            "late": 1.0,
        },
        "weekend": {
            "night": 0.2,
            "morning": 2.5,
            "midday": 5.0,
            "afternoon": 5.5,
            "evening": 5.0,
            "late": 2.0,
        },
    },
}


def _get_time_period(hour: int) -> str:
    if hour < 6:
        return "night"
    elif hour < 10:
        return "morning"
    elif hour < 14:
        return "midday"
    elif hour < 18:
        return "afternoon"
    elif hour < 22:
        return "evening"
    else:
        return "late"


def _get_fill_rate(bin_type: str, hour: int, is_weekend: bool, noise_std: float = 0.3) -> float:
    """Get fill rate for given conditions with random noise."""
    day_type = "weekend" if is_weekend else "weekday"
    period = _get_time_period(hour)

    profile = FILL_RATE_PROFILES.get(bin_type, FILL_RATE_PROFILES["residential"])
    base_rate = profile[day_type][period]

    # Add Gaussian noise
    rate = base_rate + np.random.normal(0, noise_std)
    return max(0, rate)


class BinSimulator:
    """
    Simulates bin fill-level dynamics over time with configurable parameters.
    Supports fixed vs. dynamic alert thresholds comparison.
    """

    def simulate(
        self,
        days: int = 7,
        bin_type: str = "residential",
        capacity_liters: int = 240,
        initial_fill: float = 0.0,
        fill_rate_multiplier: float = 1.0,
        fixed_threshold: float = 80.0,
        noise_std: float = 0.3,
    ) -> Dict:
        """
        Run a fill-level simulation.

        Args:
            days: Number of days to simulate
            bin_type: "residential", "commercial", or "public_space"
            capacity_liters: Bin capacity in liters
            initial_fill: Starting fill level (%)
            fill_rate_multiplier: Scale factor for fill rate
            fixed_threshold: Fixed collection threshold (%)
            noise_std: Noise standard deviation for fill rate

        Returns:
            Simulation timeline and summary statistics
        """
        start_time = datetime(2026, 1, 1, 0, 0)
        timeline = []
        current_fill = initial_fill
        collections_triggered = 0
        overflows = 0
        total_hours = days * 24

        for hour_offset in range(total_hours):
            current_time = start_time + timedelta(hours=hour_offset)
            is_weekend = current_time.weekday() >= 5
            hour = current_time.hour

            # Calculate fill rate
            rate = _get_fill_rate(bin_type, hour, is_weekend, noise_std)
            rate *= fill_rate_multiplier

            # Fill increase as percentage of capacity
            fill_increase = (rate / capacity_liters) * 100
            current_fill += fill_increase

            # Check overflow
            if current_fill >= 100:
                overflows += 1
                current_fill = 100

            # Fixed threshold collection
            collected = False
            if current_fill >= fixed_threshold:
                collections_triggered += 1
                collected = True
                current_fill = max(0, np.random.uniform(0, 5))  # Reset after collection

            timeline.append({
                "hour": hour_offset,
                "timestamp": current_time.isoformat(),
                "fill_level": round(current_fill, 2),
                "fill_rate": round(rate, 3),
                "is_weekend": is_weekend,
                "collected": collected,
                "day_label": current_time.strftime("%a"),
            })

        return {
            "parameters": {
                "days": days,
                "bin_type": bin_type,
                "capacity_liters": capacity_liters,
                "fill_rate_multiplier": fill_rate_multiplier,
                "fixed_threshold": fixed_threshold,
            },
            "summary": {
                "total_hours": total_hours,
                "collections_triggered": collections_triggered,
                "overflows": overflows,
                "avg_fill_level": round(
                    np.mean([t["fill_level"] for t in timeline]), 2
                ),
                "max_fill_level": round(
                    max(t["fill_level"] for t in timeline), 2
                ),
                "avg_collections_per_day": round(collections_triggered / days, 2),
            },
            "timeline": timeline,
        }

    def compare_thresholds(
        self,
        days: int = 7,
        bin_type: str = "residential",
        capacity_liters: int = 240,
        fill_rate_multiplier: float = 1.0,
        fixed_threshold: float = 80.0,
        dynamic_base: float = 70.0,
        dynamic_weekend_offset: float = -10.0,
        dynamic_peak_offset: float = -15.0,
    ) -> Dict:
        """
        Compare fixed vs. dynamic alert thresholds.

        Dynamic threshold adjusts based on:
        - Weekend/weekday patterns
        - Peak hours (lower threshold during high-generation periods)

        Returns comparison data for both strategies.
        """
        np.random.seed(42)  # Reproducible for fair comparison

        start_time = datetime(2026, 1, 1, 0, 0)
        total_hours = days * 24

        # Generate shared fill rates first
        fill_rates = []
        for hour_offset in range(total_hours):
            t = start_time + timedelta(hours=hour_offset)
            is_weekend = t.weekday() >= 5
            rate = _get_fill_rate(bin_type, t.hour, is_weekend, 0.3)
            rate *= fill_rate_multiplier
            fill_rates.append((t, rate, is_weekend))

        strategies = {}

        for strategy_name, get_threshold in [
            ("fixed", lambda t, is_wknd: fixed_threshold),
            ("dynamic", lambda t, is_wknd: (
                dynamic_base
                + (dynamic_weekend_offset if is_wknd else 0)
                + (dynamic_peak_offset if _get_time_period(t.hour) in ("morning", "evening") else 0)
            )),
        ]:
            current_fill = 0.0
            collections = 0
            overflows = 0
            waste_at_collection = []
            timeline = []

            for hour_offset, (t, rate, is_weekend) in enumerate(fill_rates):
                fill_increase = (rate / capacity_liters) * 100
                current_fill += fill_increase

                if current_fill >= 100:
                    overflows += 1
                    current_fill = 100

                threshold = get_threshold(t, is_weekend)
                collected = False
                if current_fill >= threshold:
                    collections += 1
                    waste_at_collection.append(current_fill)
                    collected = True
                    current_fill = np.random.uniform(0, 5)

                timeline.append({
                    "hour": hour_offset,
                    "timestamp": t.isoformat(),
                    "fill_level": round(current_fill, 2),
                    "threshold": round(threshold, 2),
                    "collected": collected,
                    "day_label": t.strftime("%a"),
                })

            avg_at_collection = round(np.mean(waste_at_collection), 2) if waste_at_collection else 0
            efficiency = round(
                (1 - overflows / max(1, total_hours)) * 100, 2
            )

            strategies[strategy_name] = {
                "collections_triggered": collections,
                "overflows": overflows,
                "avg_fill_at_collection": avg_at_collection,
                "efficiency_percent": efficiency,
                "avg_collections_per_day": round(collections / days, 2),
                "timeline": timeline,
            }

        # Recommendation
        fixed_s = strategies["fixed"]
        dynamic_s = strategies["dynamic"]

        if dynamic_s["overflows"] < fixed_s["overflows"]:
            recommendation = "Dynamic thresholds reduce overflows and are recommended."
        elif dynamic_s["collections_triggered"] < fixed_s["collections_triggered"] and dynamic_s["overflows"] <= fixed_s["overflows"]:
            recommendation = "Dynamic thresholds use fewer collections with equal reliability."
        else:
            recommendation = "Fixed threshold is simpler and performs equally well for this scenario."

        return {
            "parameters": {
                "days": days,
                "bin_type": bin_type,
                "capacity_liters": capacity_liters,
                "fixed_threshold": fixed_threshold,
                "dynamic_base": dynamic_base,
            },
            "fixed": strategies["fixed"],
            "dynamic": strategies["dynamic"],
            "recommendation": recommendation,
        }

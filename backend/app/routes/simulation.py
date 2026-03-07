"""
Simulation API Routes
Endpoints for bin fill-level simulation and threshold comparison.
"""

from fastapi import APIRouter, Depends, Query
from app.middleware.auth import require_role
from typing import Optional

from app.ml.bin_simulator import BinSimulator

router = APIRouter()

_simulator = BinSimulator()


@router.post("/run")
def run_simulation(
    days: int = Query(7, ge=1, le=30),
    bin_type: str = Query("residential"),
    capacity_liters: int = Query(240, ge=60, le=1100),
    initial_fill: float = Query(0.0, ge=0, le=100),
    fill_rate_multiplier: float = Query(1.0, ge=0.1, le=5.0),
    fixed_threshold: float = Query(80.0, ge=50, le=100),
    user=Depends(require_role("admin"))
):
    """
    Run a bin fill-level simulation with specified parameters.
    Returns hourly timeline data and summary statistics.
    """
    result = _simulator.simulate(
        days=days,
        bin_type=bin_type,
        capacity_liters=capacity_liters,
        initial_fill=initial_fill,
        fill_rate_multiplier=fill_rate_multiplier,
        fixed_threshold=fixed_threshold,
    )
    return result


@router.post("/compare-thresholds")
def compare_thresholds(
    days: int = Query(7, ge=1, le=30),
    bin_type: str = Query("residential"),
    capacity_liters: int = Query(240, ge=60, le=1100),
    fill_rate_multiplier: float = Query(1.0, ge=0.1, le=5.0),
    fixed_threshold: float = Query(80.0, ge=50, le=100),
    dynamic_base: float = Query(70.0, ge=40, le=95),
    dynamic_weekend_offset: float = Query(-10.0, ge=-30, le=0),
    dynamic_peak_offset: float = Query(-15.0, ge=-30, le=0),
    user=Depends(require_role("admin"))
):
    """
    Compare fixed vs. dynamic collection thresholds.
    Returns side-by-side results with recommendation.
    """
    result = _simulator.compare_thresholds(
        days=days,
        bin_type=bin_type,
        capacity_liters=capacity_liters,
        fill_rate_multiplier=fill_rate_multiplier,
        fixed_threshold=fixed_threshold,
        dynamic_base=dynamic_base,
        dynamic_weekend_offset=dynamic_weekend_offset,
        dynamic_peak_offset=dynamic_peak_offset,
    )
    return result

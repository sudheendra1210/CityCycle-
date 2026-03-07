from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import require_role
from sqlalchemy.orm import Session
from app.models.database_models import Bin, BinReading
from app.utils.database import get_db
from app.ml.predictor import predict_fill_level
from app.ml.route_optimizer import optimize_collection_route
from typing import List, Dict
from datetime import datetime
from app.models.schemas import FillLevelPrediction, RouteOptimization, RouteOptimizationRequest

from app.utils.convex_client import convex_manager

router = APIRouter()

def map_reading(r):
    """Map Convex reading to the format expected by ML predictor"""
    return {
        "bin_id": r["bin_id"],
        "fill_level_percent": r["fill_level_percent"],
        "timestamp": datetime.fromtimestamp(r["timestamp"] / 1000.0) if isinstance(r["timestamp"], (int, float)) else r["timestamp"]
    }

@router.get("/fill-level/{bin_id}", response_model=FillLevelPrediction)
def predict_bin_fill_level(
    bin_id: str, 
    hours_ahead: int = 24, 
    user=Depends(require_role("admin"))
):
    """Predict when a bin will be full"""
    
    # Get bin from Convex
    bin_data = convex_manager.get_bin(bin_id)
    if not bin_data:
        raise HTTPException(status_code=404, detail="Bin not found")
    
    # Get historical readings from Convex
    raw_readings = convex_manager.get_bin_readings(bin_id, limit=100)
    readings = [map_reading(r) for r in raw_readings]
    
    if len(readings) < 5:
        raise HTTPException(status_code=400, detail="Not enough data for prediction")
    
    # Make prediction
    prediction = predict_fill_level(readings, hours_ahead)
    
    return prediction

@router.post("/route-optimization", response_model=RouteOptimization)
def optimize_route(
    request: RouteOptimizationRequest,
    user=Depends(require_role("admin"))
):
    """Optimize collection route for bins above threshold"""
    
    vehicle_id = request.vehicle_id
    threshold = request.threshold
    
    # Get all bins and their latest readings from Convex
    all_bins = convex_manager.get_bins()
    high_fill_bins = [b for b in all_bins if b.get('current_fill_level', 0) >= threshold]
    
    if not high_fill_bins:
        return {
            "vehicle_id": vehicle_id,
            "bins_to_collect": [],
            "total_distance_km": 0,
            "estimated_duration_minutes": 0,
            "optimized_sequence": []
        }
    
    # Optimize route
    optimized_route = optimize_collection_route(vehicle_id, high_fill_bins)
    
    return optimized_route

@router.get("/all-bins")
def predict_all_bins(
    area_name: str = None, 
    threshold: float = 70.0, 
    user=Depends(require_role("admin"))
):
    """Get predictions for all bins above threshold, optionally filtered by area"""
    
    # Get bins from Convex
    all_bins = convex_manager.get_bins()
    if area_name:
        all_bins = [b for b in all_bins if b.get('area_name') == area_name]
    
    predictions = []
    for bin_data in all_bins:
        bin_id = bin_data['bin_id']
        raw_readings = convex_manager.get_bin_readings(bin_id, limit=50)
        readings = [map_reading(r) for r in raw_readings]
        
        if len(readings) >= 5:
            try:
                prediction = predict_fill_level(readings, hours_ahead=24)
                if prediction['predicted_fill_level'] >= threshold:
                    predictions.append(prediction)
            except:
                continue
    
    return sorted(predictions, key=lambda x: x.get('hours_until_full', 999))

@router.post("/bin-fill")
def predict_specific_bin_fill(
    payload: Dict,
    user=Depends(require_role("admin"))
):
    """Predict fill level for a specific bin passed in JSON body"""
    bin_id = payload.get("bin_id")
    hours_ahead = payload.get("hours_ahead", 24)
    
    if not bin_id:
        raise HTTPException(status_code=400, detail="bin_id is required")
        
    bin_data = convex_manager.get_bin(bin_id)
    if not bin_data:
        raise HTTPException(status_code=404, detail="Bin not found")
        
    raw_readings = convex_manager.get_bin_readings(bin_id, limit=100)
    readings = [map_reading(r) for r in raw_readings]
    
    if len(readings) < 5:
        raise HTTPException(status_code=400, detail="Not enough data")
        
    prediction = predict_fill_level(readings, hours_ahead)
    return prediction

"""
Forecasting API Routes
Endpoints for ML-based fill-level prediction and model management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional, Dict
from datetime import datetime, timedelta

from app.utils.convex_client import convex_manager
from app.middleware.auth import require_role
from app.ml.fill_level_forecaster import FillLevelForecaster, ModelComparator

router = APIRouter()


def get_bin_info(bin: dict) -> dict:
    """Convert Bin dict to formatted dictionary for feature engineering"""
    return {
        'bin_type': bin.get('bin_type', 'residential'),
        'capacity_liters': bin['capacity_liters'],
        'zone': bin.get('zone'),
        'ward': bin.get('ward'),
        'latitude': bin['latitude'],
        'longitude': bin['longitude']
    }

def map_reading(r):
    """Map Convex reading to the format expected by ML forecaster"""
    return {
        "bin_id": r["bin_id"],
        "fill_level_percent": r["fill_level_percent"],
        "timestamp": datetime.fromtimestamp(r["timestamp"] / 1000.0) if isinstance(r["timestamp"], (int, float)) else r["timestamp"]
    }


@router.post("/train")
def train_models(
    bin_ids: Optional[List[str]] = Query(None),
    model_types: List[str] = Query(['linear', 'tree', 'forest']),
    user: Dict = Depends(require_role("admin"))
):
    """Train ML models for specified bins using Convex data"""
    # Get bins to train from Convex
    if bin_ids:
        # Fetch individual bins (inefficient but safe for batch)
        bins = []
        for bid in bin_ids:
            b = convex_manager.get_bin(bid)
            if b: bins.append(b)
    else:
        # Fetch all bins
        bins = convex_manager.get_bins()[:10] # Limit to 10 for performance
    
    if not bins:
        raise HTTPException(status_code=404, detail="No bins found")
    
    results = {}
    
    for bin_data in bins:
        bin_id = bin_data['bin_id']
        # Get historical readings from Convex
        raw_readings = convex_manager.get_bin_readings(bin_id)
        readings = [map_reading(r) for r in raw_readings]
        
        if len(readings) < 20:
            results[bin_id] = {'error': 'Insufficient data (need at least 20 readings)'}
            continue
        
        # Create forecaster
        forecaster = FillLevelForecaster(bin_id)
        
        # Get bin info
        bin_info = get_bin_info(bin_data)
        
        # Train models
        try:
            metrics = forecaster.train_models(readings, bin_info, model_types)
            results[bin_id] = metrics
        except Exception as e:
            results[bin_id] = {'error': str(e)}
    
    return {
        'trained_bins': len([r for r in results.values() if 'error' not in r]),
        'total_bins': len(bins),
        'results': results
    }


@router.get("/predict/{bin_id}")
def predict_fill_level(
    bin_id: str,
    hours_ahead: int = Query(24, ge=1, le=168),
    model_type: str = Query('forest', regex='^(linear|tree|forest|arima)$'),
    user: Dict = Depends(require_role("admin"))
):
    """Get fill-level predictions using Convex data"""
    # Get bin
    bin_data = convex_manager.get_bin(bin_id)
    if not bin_data:
        raise HTTPException(status_code=404, detail="Bin not found")
    
    # Get historical readings
    raw_readings = convex_manager.get_bin_readings(bin_id)
    readings = [map_reading(r) for r in raw_readings]
    
    if len(readings) < 20:
        raise HTTPException(
            status_code=400, 
            detail="Insufficient data for prediction (need at least 20 readings)"
        )
    
    # Create forecaster
    forecaster = FillLevelForecaster(bin_id)
    bin_info = get_bin_info(bin_data)
    
    # Make prediction
    try:
        prediction = forecaster.predict(readings, bin_info, hours_ahead, model_type)
        if 'error' in prediction:
            raise HTTPException(status_code=400, detail=prediction['error'])
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare-models/{bin_id}")
def compare_models(
    bin_id: str,
    user: Dict = Depends(require_role("admin"))
):
    """Compare model performance using Convex data"""
    # Get bin
    bin_data = convex_manager.get_bin(bin_id)
    if not bin_data:
        raise HTTPException(status_code=404, detail="Bin not found")
    
    # Get historical readings
    raw_readings = convex_manager.get_bin_readings(bin_id)
    readings = [map_reading(r) for r in raw_readings]
    
    if len(readings) < 20:
        raise HTTPException(
            status_code=400, 
            detail="Insufficient data for model comparison"
        )
    
    # Create forecaster and train all models
    forecaster = FillLevelForecaster(bin_id)
    bin_info = get_bin_info(bin_data)
    
    try:
        metrics = forecaster.train_models(
            readings, 
            bin_info, 
            model_types=['linear', 'tree', 'forest', 'arima']
        )
        comparison = ModelComparator.compare_models(metrics)
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature-importance/{bin_id}")
def get_feature_importance(
    bin_id: str,
    model_type: str = Query('forest', regex='^(tree|forest)$'),
    user: Dict = Depends(require_role("admin"))
):
    """Get feature importance for tree-based models"""
    # Create forecaster
    forecaster = FillLevelForecaster(bin_id)
    
    # Get feature importance
    try:
        importance = forecaster.get_feature_importance(model_type)
        if 'error' in importance:
            raise HTTPException(status_code=400, detail=importance['error'])
        return importance
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions-batch")
def get_batch_predictions(
    threshold: float = Query(70.0, ge=0, le=100),
    hours_ahead: int = Query(24, ge=1, le=168),
    model_type: str = Query('forest', regex='^(linear|tree|forest|arima)$'),
    limit: int = Query(20, ge=1, le=50),
    user: Dict = Depends(require_role("admin"))
):
    """Get predictions for multiple bins above threshold using Convex"""
    # Get bins from Convex
    all_bins = convex_manager.get_bins()
    high_fill_bins = [b for b in all_bins if b.get('current_fill_level', 0) >= threshold][:limit]
    
    predictions = []
    
    for bin_data in high_fill_bins:
        bin_id = bin_data['bin_id']
        raw_readings = convex_manager.get_bin_readings(bin_id)
        readings = [map_reading(r) for r in raw_readings]
        
        if len(readings) < 20:
            continue
        
        forecaster = FillLevelForecaster(bin_id)
        bin_info = get_bin_info(bin_data)
        
        try:
            prediction = forecaster.predict(readings, bin_info, hours_ahead, model_type)
            if 'error' not in prediction:
                predictions.append(prediction)
        except:
            continue
    
    predictions.sort(key=lambda x: x.get('hours_until_full') or 999)
    
    return {
        'count': len(predictions),
        'predictions': predictions
    }


@router.get("/historical-vs-predicted/{bin_id}")
def get_historical_vs_predicted(
    bin_id: str,
    days_back: int = Query(7, ge=1, le=30),
    hours_ahead: int = Query(24, ge=1, le=168),
    model_type: str = Query('forest', regex='^(linear|tree|forest|arima)$'),
    user: Dict = Depends(require_role("admin"))
):
    """Get historical vs predicted data overlay using Convex"""
    # Get bin
    bin_data = convex_manager.get_bin(bin_id)
    if not bin_data:
        raise HTTPException(status_code=404, detail="Bin not found")
    
    # Get all readings for training and display
    raw_readings = convex_manager.get_bin_readings(bin_id)
    all_readings = [map_reading(r) for r in raw_readings]
    
    if len(all_readings) < 10:
        raise HTTPException(status_code=400, detail="Insufficient historical data")
    
    # Create forecaster
    forecaster = FillLevelForecaster(bin_id)
    bin_info = get_bin_info(bin_data)
    
    try:
        prediction = forecaster.predict(all_readings, bin_info, hours_ahead, model_type)
        if 'error' in prediction:
            raise HTTPException(status_code=400, detail=prediction['error'])
        
        # Format historical data
        cutoff_time = datetime.utcnow() - timedelta(days=days_back)
        historical = [
            {
                'timestamp': r['timestamp'],
                'fill_level_percent': r['fill_level_percent'],
                'type': 'actual'
            }
            for r in all_readings if r['timestamp'] >= cutoff_time
        ]
        
        # Format predicted data
        predicted = [
            {
                'timestamp': p['timestamp'],
                'fill_level_percent': p['predicted_fill_level'],
                'type': 'predicted'
            }
            for p in prediction.get('hourly_predictions', [])
        ]
        
        return {
            'bin_id': bin_id,
            'model_type': model_type,
            'historical': historical,
            'predicted': predicted,
            'current_fill_level': prediction.get('current_fill_level'),
            'predicted_fill_level': prediction.get('predicted_fill_level'),
            'hours_until_full': prediction.get('hours_until_full')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

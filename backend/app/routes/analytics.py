from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.database_models import Bin, BinReading, Collection, Complaint
from app.utils.database import get_db
from app.middleware.auth import require_role
from datetime import datetime, timedelta
from geopy.distance import geodesic

from app.utils.convex_client import convex_manager

router = APIRouter()

@router.get("/dashboard")
def get_dashboard_stats(
    area_name: str = None, 
    user=Depends(require_role("worker"))
):
    """Get overall dashboard statistics from Convex native query"""
    return convex_manager.client.query("analytics:getDashboardStats", {"area_name": area_name})

@router.get("/trends/fill-levels")
def get_fill_level_trends(
    area_name: str = None, 
    days: int = 7, 
    user=Depends(require_role("admin"))
):
    """Get fill level trends from Convex native query"""
    return convex_manager.client.query("analytics:getFillLevelTrends", {"area_name": area_name, "days": days})

@router.get("/alerts")
def get_alerts(
    area_name: str = None, 
    user=Depends(require_role("worker"))
):
    """Get active alerts from Convex data"""
    bins = convex_manager.get_bins()
    if area_name:
        bins = [b for b in bins if b.get('area_name') == area_name]
        
    alerts = []
    for b in bins:
        fill = b.get('current_fill_level', 0)
        if fill >= 85:
            alerts.append({
                "id": f"alert-{b['bin_id']}",
                "type": "critical",
                "bin_id": b['bin_id'],
                "message": f"Critical fill level: {round(fill)}%",
                "timestamp": datetime.utcnow(), # Placeholder
                "severity": "high"
            })
            
    return alerts

@router.get("/map/bins")
def get_bins_for_map(
    area_name: str = None, 
    user=Depends(require_role("worker"))
):
    """Get bins for map from Convex"""
    bins = convex_manager.get_bins()
    if area_name:
        bins = [b for b in bins if b.get('area_name') == area_name]
        
    result = []
    for b in bins:
        result.append({
            "bin_id": b['bin_id'],
            "latitude": b['latitude'],
            "longitude": b['longitude'],
            "capacity_liters": b['capacity_liters'],
            "bin_type": b.get('bin_type', 'residential'),
            "zone": b.get('zone', 'Unknown'),
            "fill_level": b.get('current_fill_level', 0),
            "status": b.get('status', 'active')
        })
    
    return result

@router.get("/area")
def get_area_analytics(
    lat: float,
    lng: float,
    radius_km: float = 5.0,
    user=Depends(require_role("worker"))
):
    """Get area analytics from Convex"""
    bins = convex_manager.get_bins()
    user_coords = (lat, lng)
    
    area_bins = []
    for b in bins:
        if geodesic(user_coords, (b['latitude'], b['longitude'])).km <= radius_km:
            area_bins.append(b)
            
    if not area_bins:
        return {
            "bin_count": 0,
            "avg_fill_level": 0,
            "waste_generated_weekly_kg": 0,
            "trends": []
        }
        
    avg_fill = sum([b.get('current_fill_level', 0) for b in area_bins]) / len(area_bins)
    
    return {
        "bin_count": len(area_bins),
        "avg_fill_level": round(avg_fill, 1),
        "waste_generated_weekly_kg": 0, # Placeholder
        "trends": [] # Placeholder
    }

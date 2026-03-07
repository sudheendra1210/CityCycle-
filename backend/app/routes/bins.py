from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.database_models import Bin, BinReading, BinType, BinStatus
from app.models.schemas import BinCreate, BinResponse, BinReadingCreate, BinReadingResponse
from app.utils.database import get_db
from app.middleware.auth import get_optional_user, require_role, get_current_user
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from geopy.distance import geodesic
from pydantic import BaseModel
import random
import math

from app.utils.convex_client import convex_manager

router = APIRouter()

class SeedRequest(BaseModel):
    latitude: float
    longitude: float
    count: int = 10
    radius_km: float = 2.0

@router.post("/seed-nearby")
def seed_bins_nearby(
    data: SeedRequest, 
    user=Depends(require_role("admin"))
):
    """Seed test bins via Convex (Implementation simplified for migration)"""
    # This would ideally call a Convex action to seed data
    return {"message": "Seeding should now be done via Convex dashboard or migration script"}

@router.get("/", response_model=List[BinResponse])
def get_all_bins(
    skip: int = 0, 
    limit: int = 100, 
    area_name: Optional[str] = None,
    user: Dict = Depends(get_current_user)
):
    """Get all bins from Convex"""
    bins = convex_manager.get_bins()
    
    if area_name:
        bins = [b for b in bins if b.get('area_name') == area_name]
        
    # Map Convex result to BinResponse schema
    formatted_bins = []
    for b in bins:
        formatted_bins.append({
            "id": 0, # Legacy ID
            "bin_id": b['bin_id'],
            "latitude": b['latitude'],
            "longitude": b['longitude'],
            "area_name": b.get('area_name'),
            "capacity_liters": b['capacity_liters'],
            "bin_type": b['bin_type'],
            "sensor_type": b.get('sensor_type', 'ultrasonic'),
            "zone": b.get('zone', 'Unknown'),
            "ward": b.get('ward', 0),
            "status": b.get('status', 'active'),
            "installation_date": datetime.fromtimestamp(b.get('installation_date', 0) / 1000) if b.get('installation_date') else datetime.utcnow(),
            "current_fill_level": b.get('current_fill_level', 0)
        })
        
    return formatted_bins[skip:skip+limit]

@router.get("/{bin_id}", response_model=BinResponse)
def get_bin(bin_id: str):
    """Get specific bin details from Convex"""
    bin_data = convex_manager.client.query("bins:getById", {"bin_id": bin_id})
    if not bin_data:
        raise HTTPException(status_code=404, detail="Bin not found")
    
    return {
        "id": 0,
        "bin_id": bin_data['bin_id'],
        "latitude": bin_data['latitude'],
        "longitude": bin_data['longitude'],
        "area_name": bin_data.get('area_name'),
        "capacity_liters": bin_data['capacity_liters'],
        "bin_type": bin_data['bin_type'],
        "sensor_type": bin_data.get('sensor_type', 'ultrasonic'),
        "zone": bin_data.get('zone', 'Unknown'),
        "ward": bin_data.get('ward', 0),
        "status": bin_data.get('status', 'active'),
        "installation_date": datetime.fromtimestamp(bin_data.get('installation_date', 0) / 1000) if bin_data.get('installation_date') else datetime.utcnow(),
        "current_fill_level": bin_data.get('current_fill_level', 0)
    }

@router.post("/", response_model=BinResponse)
def create_bin(
    bin: BinCreate, 
    user=Depends(require_role("admin"))
):
    """Create a new bin in Convex"""
    bin_id = convex_manager.client.mutation("bins:create", bin.dict())
    return get_bin(bin.bin_id)

@router.get("/{bin_id}/readings", response_model=List[BinReadingResponse])
def get_bin_readings(
    bin_id: str, 
    hours: int = 24
):
    """Get recent readings for a bin from Convex"""
    # Note: Simplified to get all recent readings for this bin
    # We might need a specific Convex query for this
    all_bins = convex_manager.client.query("bins:getWithReadings")
    # This is inefficient, but okay for a first pass. 
    # Ideally, we add a getReadings query to Convex.
    return [] # Placeholder until we have a proper reading query

@router.post("/{bin_id}/readings", response_model=BinReadingResponse)
def create_bin_reading(
    bin_id: str,
    reading: BinReadingCreate
):
    """Add a new sensor reading via Convex"""
    convex_manager.add_bin_reading(
        bin_id=bin_id,
        fill_level=reading.fill_level_percent,
        battery_level=reading.battery_percent
    )
    
    # Mapping back to response (id and timestamp are placeholder)
    return {
        "id": 0,
        "bin_id": bin_id,
        "fill_level_percent": reading.fill_level_percent,
        "weight_kg": reading.weight_kg,
        "temperature_c": reading.temperature_c,
        "battery_percent": reading.battery_percent,
        "timestamp": datetime.utcnow()
    }

@router.get("/alerts/high-fill", response_model=List[BinResponse])
def get_high_fill_bins(threshold: float = 80.0):
    """Get bins above fill threshold from Convex"""
    bins = convex_manager.get_bins()
    high_fill = [b for b in bins if b.get('current_fill_level', 0) >= threshold]
    
    # Map to responses (reusing logic from get_all_bins)
    formatted = []
    for b in high_fill:
        formatted.append({
            "id": 0,
            "bin_id": b['bin_id'],
            "latitude": b['latitude'],
            "longitude": b['longitude'],
            "area_name": b.get('area_name'),
            "capacity_liters": b['capacity_liters'],
            "bin_type": b['bin_type'],
            "sensor_type": b.get('sensor_type', 'ultrasonic'),
            "zone": b.get('zone', 'Unknown'),
            "ward": b.get('ward', 0),
            "status": b.get('status', 'active'),
            "installation_date": datetime.fromtimestamp(b.get('installation_date', 0) / 1000) if b.get('installation_date') else datetime.utcnow(),
            "current_fill_level": b.get('current_fill_level', 0)
        })
    return formatted

@router.get("/nearby", response_model=List[Dict])
def get_nearby_bins(
    lat: float,
    lng: float,
    radius_km: float = 5.0
):
    """Get bins within a radius from Convex"""
    bins = convex_manager.get_bins()
    nearby_bins = []
    user_coords = (lat, lng)
    
    for b in bins:
        bin_coords = (b['latitude'], b['longitude'])
        distance = geodesic(user_coords, bin_coords).km
        
        if distance <= radius_km:
            fill_level = b.get('current_fill_level', 0)
            status = "Empty"
            if fill_level > 80: status = "Full"
            elif fill_level > 40: status = "Partially Filled"
            
            nearby_bins.append({
                "bin_id": b['bin_id'],
                "latitude": b['latitude'],
                "longitude": b['longitude'],
                "distance_km": round(distance, 2),
                "fill_level": fill_level,
                "status": status,
                "bin_type": b.get('bin_type', 'residential'),
                "zone": b.get('zone', 'Unknown')
            })
            
    nearby_bins.sort(key=lambda x: x["distance_km"])
    return nearby_bins

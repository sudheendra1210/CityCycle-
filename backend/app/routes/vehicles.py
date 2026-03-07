from fastapi import APIRouter, Depends
from app.middleware.auth import require_role
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.database_models import Vehicle, GPSLog
from app.models.schemas import VehicleCreate, VehicleResponse
from app.utils.database import get_db
from typing import List

router = APIRouter()

from app.utils.convex_client import convex_manager

router = APIRouter()

@router.get("/", response_model=List[VehicleResponse])
def get_vehicles(
    user=Depends(require_role("worker"))
):
    """Get all vehicles from Convex"""
    return convex_manager.get_vehicles()

@router.post("/", response_model=VehicleResponse)
def create_vehicle(
    vehicle: VehicleCreate, 
    user=Depends(require_role("admin"))
):
    """Add a new vehicle to Convex"""
    vehicle_data = vehicle.dict()
    res = convex_manager.create_vehicle(vehicle_data)
    # res is the ID if we want, or we can just return the input since Convex create doesn't return the full obj usually
    return {**vehicle_data, "id": res}

@router.get("/{vehicle_id}/location")
def get_vehicle_location(
    vehicle_id: str, 
    user=Depends(require_role("worker"))
):
    """Get current vehicle location from Convex"""
    vehicle = convex_manager.client.query("vehicles:getById", {"vehicle_id": vehicle_id})
    
    if not vehicle or not vehicle.get("current_latitude"):
        return {"vehicle_id": vehicle_id, "location": None}
    
    return {
        "vehicle_id": vehicle_id,
        "latitude": vehicle["current_latitude"],
        "longitude": vehicle["current_longitude"],
        "status": vehicle.get("status"),
        "timestamp": datetime.utcnow() # Placeholder
    }

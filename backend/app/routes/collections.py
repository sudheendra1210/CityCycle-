from fastapi import APIRouter, Depends
from app.middleware.auth import require_role
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.models.database_models import Collection, Bin
from app.models.schemas import CollectionCreate, CollectionResponse
from app.utils.database import get_db
from typing import List
from datetime import datetime, timedelta

router = APIRouter()

from app.utils.convex_client import convex_manager

router = APIRouter()

@router.get("/", response_model=List[CollectionResponse])
def get_collections(
    bin_id: str = None,
    vehicle_id: str = None,
    user=Depends(require_role("worker"))
):
    """Get all collections from Convex"""
    return convex_manager.get_collections(bin_id=bin_id, vehicle_id=vehicle_id)

@router.post("/", response_model=CollectionResponse)
def create_collection(
    collection: CollectionCreate, 
    user=Depends(require_role("worker"))
):
    """Record a new collection in Convex"""
    collection_data = collection.dict()
    res = convex_manager.create_collection(collection_data)
    return {**collection_data, "id": res}

@router.get("/stats/daily")
def get_daily_stats(
    days: int = 7, 
    user=Depends(require_role("admin"))
):
    """Get daily collection statistics from Convex"""
    stats = convex_manager.client.query("collections:getStats", {"days": days})
    return stats.get("daily", [])

@router.get("/stats/composition")
def get_waste_composition(
    user=Depends(require_role("admin"))
):
    """Get average waste composition from Convex"""
    stats = convex_manager.client.query("collections:getStats", {})
    return stats.get("composition") or {
        "organic": 0, "plastic": 0, "paper": 0, "metal": 0, "glass": 0, "other": 0
    }

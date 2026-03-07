from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import require_role
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.database_models import Complaint, ComplaintStatus
from app.models.schemas import ComplaintCreate, ComplaintResponse
from app.utils.database import get_db
from typing import List
from datetime import datetime
import uuid

from app.utils.convex_client import convex_manager

router = APIRouter()

@router.get("/", response_model=List[ComplaintResponse])
def get_complaints(
    status: str = None,
    area_name: str = None,
    skip: int = 0,
    limit: int = 100,
    user=Depends(require_role("admin"))
):
    """Get all complaints from Convex"""
    complaints = convex_manager.get_complaints(status)
    if area_name:
        complaints = [c for c in complaints if c.get('area_name') == area_name]
    
    # Map to ComplaintResponse
    formatted = []
    for c in complaints:
        formatted.append({
            "id": 0,
            "complaint_id": c['complaint_id'],
            "timestamp": datetime.fromtimestamp(c['timestamp'] / 1000),
            "complaint_type": c['complaint_type'],
            "latitude": c['latitude'],
            "longitude": c['longitude'],
            "area_name": c.get('area_name'),
            "bin_id": c.get('bin_id'),
            "description": c.get('description'),
            "urgency": c.get('urgency', 'medium'),
            "status": c.get('status', 'open'),
            "resolution_hours": c.get('resolution_hours'),
            "citizen_rating": c.get('citizen_rating'),
            "resolved_at": datetime.fromtimestamp(c['resolved_at'] / 1000) if c.get('resolved_at') else None
        })
    return formatted[skip:skip+limit]

@router.post("/", response_model=ComplaintResponse)
def create_complaint(complaint: ComplaintCreate):
    """Create a new citizen complaint via Convex"""
    from geopy.distance import geodesic
    
    complaint_data = complaint.dict()
    complaint_id = f"CMP_{uuid.uuid4().hex[:8].upper()}"
    complaint_data["complaint_id"] = complaint_id

    # Auto-link to nearest bin via Convex query
    if not complaint_data.get("bin_id"):
        bins = convex_manager.get_bins()
        if bins:
            user_loc = (complaint_data["latitude"], complaint_data["longitude"])
            closest_bin = min(
                bins, 
                key=lambda b: geodesic(user_loc, (b['latitude'], b['longitude'])).km
            )
            complaint_data["bin_id"] = closest_bin['bin_id']

    # Call Convex mutation
    convex_manager.create_complaint(complaint_data)
    
    # Return placeholder response (Convex will handle real storage)
    return {
        "id": 0,
        "complaint_id": complaint_id,
        "timestamp": datetime.utcnow(),
        "status": "open",
        "urgency": "medium",
        **complaint_data
    }

@router.patch("/{complaint_id}/resolve")
def resolve_complaint(
    complaint_id: str,
    rating: int = None,
    current_user=Depends(require_role("worker"))
):
    """Mark complaint as resolved in Convex"""
    resolved_by = "worker" # In a real app, use current_user info
    convex_manager.resolve_complaint(complaint_id, resolved_by)
    
    # For the response, we might need to fetch the updated complaint
    return {"message": "Complaint marked as resolved in Convex"}

@router.get("/stats/summary")
def get_complaint_stats(
    user=Depends(require_role("admin"))
):
    """Get complaint statistics from Convex"""
    complaints = convex_manager.get_complaints()
    
    total = len(complaints)
    open_count = len([c for c in complaints if c.get('status') == 'open'])
    resolved_count = len([c for c in complaints if c.get('status') == 'resolved'])
    
    resolution_times = [c.get('resolution_hours') for c in complaints if c.get('resolution_hours') is not None]
    avg_resolution = sum(resolution_times) / len(resolution_times) if resolution_times else 0
    
    by_type = {}
    for c in complaints:
        ct = c['complaint_type']
        by_type[ct] = by_type.get(ct, 0) + 1
        
    return {
        "total": total,
        "open": open_count,
        "resolved": resolved_count,
        "avg_resolution_hours": round(avg_resolution, 2),
        "by_type": by_type
    }

"""
Waste Classification API Routes
Endpoints for waste classification, confusion matrix, and recycling analytics.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from app.middleware.auth import require_role
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import Dict, Optional

from app.models.database_models import Collection, Bin
from app.utils.database import get_db
from app.ml.waste_classifier import WasteClassifier

router = APIRouter()

# Singleton classifier instance
_classifier = WasteClassifier()


from types import SimpleNamespace
from app.utils.convex_client import convex_manager

router = APIRouter()

# Singleton classifier instance
_classifier = WasteClassifier()

def enrich_collections():
    """Fetch collections and bins from Convex and merge them for ML logic"""
    collections = convex_manager.get_collections()
    bins = convex_manager.get_bins()
    bin_map = {b['bin_id']: b for b in bins}
    
    enriched = []
    for c in collections:
        # Wrap in SimpleNamespace to maintain dot notation compatibility (e.g. c.bin.zone)
        bin_data = bin_map.get(c['bin_id'], {})
        c_obj = SimpleNamespace(**c)
        c_obj.bin = SimpleNamespace(**bin_data) if bin_data else None
        enriched.append(c_obj)
    
    return enriched

@router.post("/train")
def train_classifier(
    user=Depends(require_role("admin"))
):
    """Train the waste classification model using Convex data"""
    collections = enrich_collections()
    if not collections:
        raise HTTPException(status_code=404, detail="No collection data available for training")

    result = _classifier.train(collections)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result

@router.post("/predict")
def predict_waste(
    organic: float = Query(0, ge=0, le=100),
    plastic: float = Query(0, ge=0, le=100),
    paper: float = Query(0, ge=0, le=100),
    metal: float = Query(0, ge=0, le=100),
    glass: float = Query(0, ge=0, le=100),
    other: float = Query(0, ge=0, le=100),
    weight_kg: float = Query(10, ge=0),
    model_type: str = Query("random_forest"),
    user=Depends(require_role("admin"))
):
    """Classify a waste sample using Convex-backed model"""
    if not _classifier.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained yet. POST /train first.")

    sample = {
        "organic": organic,
        "plastic": plastic,
        "paper": paper,
        "metal": metal,
        "glass": glass,
        "other": other,
        "weight_kg": weight_kg,
    }
    result = _classifier.classify(sample, model_type)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/confusion-matrix")
def get_confusion_matrix(
    model_type: str = Query("random_forest"),
    user=Depends(require_role("admin"))
):
    """Get the confusion matrix for the Convex-backed model"""
    result = _classifier.get_confusion_matrix(model_type)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/recycling-stats")
def get_recycling_stats(
    user=Depends(require_role("admin"))
):
    """Get recycling analytics using Convex data"""
    collections = enrich_collections()
    if not collections:
        raise HTTPException(status_code=404, detail="No collection data available")

    result = WasteClassifier.get_recycling_stats(collections)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

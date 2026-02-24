"""
Waste Classification API Routes
Endpoints for waste classification, confusion matrix, and recycling analytics.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from typing import Dict, Optional

from app.models.database_models import Collection, Bin
from app.utils.database import get_db
from app.ml.waste_classifier import WasteClassifier

router = APIRouter()

# Singleton classifier instance
_classifier = WasteClassifier()


@router.post("/train")
def train_classifier(db: Session = Depends(get_db)):
    """
    Train the waste classification model on existing collection data.
    """
    collections = db.query(Collection).options(joinedload(Collection.bin)).all()
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
):
    """
    Classify a waste sample based on composition percentages.
    """
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
):
    """
    Get the confusion matrix from the last training run.
    """
    result = _classifier.get_confusion_matrix(model_type)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/recycling-stats")
def get_recycling_stats(db: Session = Depends(get_db)):
    """
    Get recycling analytics across all zones.
    """
    collections = db.query(Collection).options(joinedload(Collection.bin)).all()
    if not collections:
        raise HTTPException(status_code=404, detail="No collection data available")

    result = WasteClassifier.get_recycling_stats(collections)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

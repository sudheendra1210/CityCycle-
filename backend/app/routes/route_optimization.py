"""
Route Optimization API Routes
Endpoints for advanced route optimization using Dijkstra's and K-Means.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.models.database_models import Bin, BinReading, BinStatus
from app.utils.database import get_db
from app.ml.advanced_route_optimizer import (
    optimize_route_advanced,
    cluster_bins_kmeans,
    compare_basic_vs_advanced,
    build_distance_graph,
    dijkstra_shortest_path,
)

router = APIRouter()


@router.post("/optimize")
def advanced_optimize(
    n_vehicles: int = Query(3, ge=1, le=10),
    fill_threshold: float = Query(60.0, ge=0, le=100),
    db: Session = Depends(get_db),
):
    """
    Run advanced route optimization using K-Means clustering + TSP.
    Only includes bins above the fill threshold.
    """
    # Get bins with latest readings above threshold
    from sqlalchemy import func

    subq = (
        db.query(
            BinReading.bin_id,
            func.max(BinReading.timestamp).label("latest"),
        )
        .group_by(BinReading.bin_id)
        .subquery()
    )
    latest_readings = (
        db.query(BinReading)
        .join(subq, (BinReading.bin_id == subq.c.bin_id) & (BinReading.timestamp == subq.c.latest))
        .filter(BinReading.fill_level_percent >= fill_threshold)
        .all()
    )

    bin_ids = [r.bin_id for r in latest_readings]
    bins = db.query(Bin).filter(Bin.bin_id.in_(bin_ids), Bin.status == BinStatus.ACTIVE).all()

    if not bins:
        return {
            "message": "No bins above threshold found",
            "algorithm": "K-Means Clustering + TSP",
            "vehicle_routes": [],
        }

    result = optimize_route_advanced(bins, n_vehicles=n_vehicles)
    return result


@router.post("/cluster")
def cluster_bins(
    n_clusters: int = Query(3, ge=1, le=10),
    db: Session = Depends(get_db),
):
    """
    Cluster all active bins into geographic zones using K-Means.
    """
    bins = db.query(Bin).filter(Bin.status == BinStatus.ACTIVE).all()
    if not bins:
        raise HTTPException(status_code=404, detail="No active bins found")

    result = cluster_bins_kmeans(bins, n_clusters=n_clusters)
    return result


@router.get("/compare")
def compare_routes(
    n_vehicles: int = Query(3, ge=1, le=10),
    fill_threshold: float = Query(60.0, ge=0, le=100),
    db: Session = Depends(get_db),
):
    """
    Compare basic nearest-neighbor vs advanced K-Means + TSP optimization.
    """
    from sqlalchemy import func

    subq = (
        db.query(
            BinReading.bin_id,
            func.max(BinReading.timestamp).label("latest"),
        )
        .group_by(BinReading.bin_id)
        .subquery()
    )
    latest_readings = (
        db.query(BinReading)
        .join(subq, (BinReading.bin_id == subq.c.bin_id) & (BinReading.timestamp == subq.c.latest))
        .filter(BinReading.fill_level_percent >= fill_threshold)
        .all()
    )

    bin_ids = [r.bin_id for r in latest_readings]
    bins = db.query(Bin).filter(Bin.bin_id.in_(bin_ids), Bin.status == BinStatus.ACTIVE).all()

    if not bins:
        return {"message": "No bins above threshold to compare"}

    result = compare_basic_vs_advanced(bins, n_vehicles=n_vehicles)
    return result


@router.get("/shortest-path")
def get_shortest_path(
    start_bin: str = Query(...),
    end_bin: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Find the shortest path between two bins using Dijkstra's algorithm.
    """
    bins = db.query(Bin).filter(Bin.status == BinStatus.ACTIVE).all()
    if not bins:
        raise HTTPException(status_code=404, detail="No active bins found")

    # Verify start and end bins exist
    bin_ids = {b.bin_id for b in bins}
    if start_bin not in bin_ids:
        raise HTTPException(status_code=404, detail=f"Start bin {start_bin} not found")
    if end_bin not in bin_ids:
        raise HTTPException(status_code=404, detail=f"End bin {end_bin} not found")

    graph = build_distance_graph(bins, max_edge_km=5.0)
    path, distance = dijkstra_shortest_path(graph, start_bin, end_bin)

    if not path:
        return {"message": "No path found between the two bins", "path": [], "distance_km": None}

    # Enrich path with coordinates
    bin_lookup = {b.bin_id: b for b in bins}
    path_details = []
    for bid in path:
        b = bin_lookup[bid]
        path_details.append({
            "bin_id": bid,
            "latitude": b.latitude,
            "longitude": b.longitude,
            "zone": b.zone,
        })

    return {
        "start": start_bin,
        "end": end_bin,
        "path": path_details,
        "hops": len(path) - 1,
        "total_distance_km": distance,
    }

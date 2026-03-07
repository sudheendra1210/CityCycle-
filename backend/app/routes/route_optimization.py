"""
Route Optimization API Routes
Endpoints for advanced route optimization using Dijkstra's and K-Means.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from app.middleware.auth import require_role
from typing import Optional, List
from app.ml.advanced_route_optimizer import (
    optimize_route_advanced,
    cluster_bins_kmeans,
    compare_basic_vs_advanced,
    build_distance_graph,
    dijkstra_shortest_path,
)

from types import SimpleNamespace
from app.utils.convex_client import convex_manager

router = APIRouter()

def wrap_bin(b):
    """Wrap Convex bin dict in SimpleNamespace for ML function compatibility"""
    return SimpleNamespace(
        bin_id=b["bin_id"],
        latitude=b["latitude"],
        longitude=b["longitude"],
        zone=b.get("zone", ""),
        bin_type=SimpleNamespace(value=b["bin_type"]),
        status=b["status"]
    )

@router.post("/optimize")
def advanced_optimize(
    n_vehicles: int = Query(3, ge=1, le=10),
    fill_threshold: float = Query(60.0, ge=0, le=100),
):
    """Advanced route optimization using Convex data"""
    all_bins = convex_manager.get_bins()
    high_fill_bins = [b for b in all_bins if b.get('current_fill_level', 0) >= fill_threshold]
    
    if not high_fill_bins:
        return {
            "message": "No bins above threshold found",
            "algorithm": "K-Means Clustering + TSP",
            "vehicle_routes": [],
        }
    
    wrapped_bins = [wrap_bin(b) for b in high_fill_bins]
    result = optimize_route_advanced(wrapped_bins, n_vehicles=n_vehicles)
    return result

@router.post("/cluster")
def cluster_bins(
    n_clusters: int = Query(3, ge=1, le=10),
):
    """Cluster all active bins using Convex data"""
    all_bins = convex_manager.get_bins()
    active_bins = [b for b in all_bins if b.get('status') == 'active']
    
    if not active_bins:
        raise HTTPException(status_code=404, detail="No active bins found")

    wrapped_bins = [wrap_bin(b) for b in active_bins]
    result = cluster_bins_kmeans(wrapped_bins, n_clusters=n_clusters)
    return result

@router.get("/compare")
def compare_routes(
    n_vehicles: int = Query(3, ge=1, le=10),
    fill_threshold: float = Query(60.0, ge=0, le=100),
):
    """Compare optimization algorithms using Convex data"""
    all_bins = convex_manager.get_bins()
    high_fill_bins = [b for b in all_bins if b.get('current_fill_level', 0) >= fill_threshold]
    
    if not high_fill_bins:
        return {"message": "No bins above threshold to compare"}

    wrapped_bins = [wrap_bin(b) for b in high_fill_bins]
    result = compare_basic_vs_advanced(wrapped_bins, n_vehicles=n_vehicles)
    return result

@router.get("/shortest-path")
def get_shortest_path(
    start_bin: str = Query(...),
    end_bin: str = Query(...),
):
    """Find shortest path between bins using Convex data"""
    all_bins = convex_manager.get_bins()
    active_bins = [b for b in all_bins if b.get('status') == 'active']
    
    if not active_bins:
        raise HTTPException(status_code=404, detail="No active bins found")

    bin_ids = {b['bin_id'] for b in active_bins}
    if start_bin not in bin_ids:
        raise HTTPException(status_code=404, detail=f"Start bin {start_bin} not found")
    if end_bin not in bin_ids:
        raise HTTPException(status_code=404, detail=f"End bin {end_bin} not found")

    wrapped_bins = [wrap_bin(b) for b in active_bins]
    graph = build_distance_graph(wrapped_bins, max_edge_km=5.0)
    path, distance = dijkstra_shortest_path(graph, start_bin, end_bin)

    if not path:
        return {"message": "No path found between the two bins", "path": [], "distance_km": None}

    bin_lookup = {b['bin_id']: b for b in active_bins}
    path_details = []
    for bid in path:
        b = bin_lookup[bid]
        path_details.append({
            "bin_id": bid,
            "latitude": b['latitude'],
            "longitude": b['longitude'],
            "zone": b.get('zone', ""),
        })

    return {
        "start": start_bin,
        "end": end_bin,
        "path": path_details,
        "hops": len(path) - 1,
        "total_distance_km": distance,
    }

"""
Advanced Route Optimization Module
Implements Dijkstra's shortest path and K-Means clustering for waste collection routes.
Session 4: Route Optimization with geospatial analytics.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from geopy.distance import geodesic
from sklearn.cluster import KMeans
import heapq


def build_distance_graph(bins: List, max_edge_km: float = 5.0) -> Dict:
    """
    Build a weighted graph from bin locations using geodesic distances.
    Only adds edges between bins within max_edge_km to keep graph sparse.
    
    Returns:
        adjacency: {bin_id: [(neighbor_id, distance_km), ...]}
    """
    adjacency = {b.bin_id: [] for b in bins}
    
    for i, b1 in enumerate(bins):
        for j, b2 in enumerate(bins):
            if i >= j:
                continue
            dist = geodesic(
                (b1.latitude, b1.longitude),
                (b2.latitude, b2.longitude)
            ).kilometers
            if dist <= max_edge_km:
                adjacency[b1.bin_id].append((b2.bin_id, round(dist, 4)))
                adjacency[b2.bin_id].append((b1.bin_id, round(dist, 4)))
    
    return adjacency


def dijkstra_shortest_path(
    graph: Dict, start: str, end: str
) -> Tuple[List[str], float]:
    """
    Dijkstra's algorithm for finding shortest path between two bins.
    
    Args:
        graph: adjacency dict {node: [(neighbor, weight), ...]}
        start: starting bin_id
        end: destination bin_id
    
    Returns:
        (path, total_distance_km) – ordered list of bin_ids and total distance
    """
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    previous = {node: None for node in graph}
    priority_queue = [(0, start)]
    visited = set()
    
    while priority_queue:
        current_dist, current_node = heapq.heappop(priority_queue)
        
        if current_node in visited:
            continue
        visited.add(current_node)
        
        if current_node == end:
            break
        
        for neighbor, weight in graph.get(current_node, []):
            if neighbor in visited:
                continue
            new_dist = current_dist + weight
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                previous[neighbor] = current_node
                heapq.heappush(priority_queue, (new_dist, neighbor))
    
    # Reconstruct path
    path = []
    node = end
    while node is not None:
        path.append(node)
        node = previous.get(node)
    path.reverse()
    
    if path[0] != start:
        return [], float('inf')  # No path found
    
    return path, round(distances[end], 4)


def cluster_bins_kmeans(
    bins: List, n_clusters: int = 3
) -> Dict:
    """
    Cluster bins into geographic zones using K-Means.
    Each cluster can be assigned to a different collection vehicle.
    
    Args:
        bins: List of Bin ORM objects
        n_clusters: Number of clusters (zones/vehicles)
    
    Returns:
        Dictionary with cluster assignments and centroids
    """
    if len(bins) < n_clusters:
        n_clusters = max(1, len(bins))
    
    coords = np.array([[b.latitude, b.longitude] for b in bins])
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(coords)
    
    clusters = {}
    for i in range(n_clusters):
        cluster_bins = [bins[j] for j in range(len(bins)) if labels[j] == i]
        clusters[i] = {
            "cluster_id": i,
            "centroid": {
                "latitude": round(float(kmeans.cluster_centers_[i][0]), 6),
                "longitude": round(float(kmeans.cluster_centers_[i][1]), 6),
            },
            "bin_count": len(cluster_bins),
            "bins": [
                {
                    "bin_id": b.bin_id,
                    "latitude": b.latitude,
                    "longitude": b.longitude,
                    "zone": b.zone,
                    "bin_type": b.bin_type.value,
                }
                for b in cluster_bins
            ],
        }
    
    return {
        "n_clusters": n_clusters,
        "clusters": clusters,
        "inertia": round(float(kmeans.inertia_), 6),
    }


def _tsp_nearest_neighbor(bin_list: List, depot_lat: float, depot_lon: float):
    """
    Nearest-neighbor TSP heuristic for ordering bins in a single cluster.
    """
    if not bin_list:
        return [], 0.0
    
    unvisited = list(bin_list)
    route = []
    current_lat, current_lon = depot_lat, depot_lon
    total_distance = 0.0
    
    while unvisited:
        nearest = None
        min_dist = float('inf')
        for b in unvisited:
            d = geodesic((current_lat, current_lon), (b["latitude"], b["longitude"])).kilometers
            if d < min_dist:
                min_dist = d
                nearest = b
        route.append(nearest)
        total_distance += min_dist
        current_lat, current_lon = nearest["latitude"], nearest["longitude"]
        unvisited.remove(nearest)
    
    # Return to depot
    total_distance += geodesic(
        (current_lat, current_lon), (depot_lat, depot_lon)
    ).kilometers
    
    return route, round(total_distance, 4)


def optimize_route_advanced(
    bins: List,
    n_vehicles: int = 3,
    depot_lat: float = 17.3850,
    depot_lon: float = 78.4867,
) -> Dict:
    """
    Full advanced optimization: K-Means clustering + per-cluster TSP.
    
    1. Cluster bins into n_vehicles zones using K-Means
    2. Within each cluster, find shortest tour using nearest-neighbor TSP
    3. Optionally refine with Dijkstra between sequential stops
    
    Args:
        bins: List of Bin ORM objects
        n_vehicles: Number of collection vehicles / clusters
        depot_lat/lon: Starting depot coordinates
    
    Returns:
        Per-vehicle optimized routes with distances and sequences
    """
    # Step 1: Cluster
    clustering = cluster_bins_kmeans(bins, n_clusters=n_vehicles)
    
    # Step 2: Optimize each cluster
    vehicle_routes = []
    total_distance = 0.0
    
    for cluster_id, cluster_data in clustering["clusters"].items():
        cluster_bins = cluster_data["bins"]
        
        route, distance = _tsp_nearest_neighbor(cluster_bins, depot_lat, depot_lon)
        total_distance += distance
        
        sequence = []
        for idx, b in enumerate(route):
            sequence.append({
                "sequence": idx + 1,
                "bin_id": b["bin_id"],
                "latitude": b["latitude"],
                "longitude": b["longitude"],
                "bin_type": b["bin_type"],
                "zone": b.get("zone", ""),
            })
        
        travel_time = (distance / 30) * 60  # 30 km/h average
        collection_time = len(route) * 5  # 5 mins per bin
        
        vehicle_routes.append({
            "vehicle_index": cluster_id,
            "cluster_centroid": cluster_data["centroid"],
            "bins_count": len(route),
            "total_distance_km": round(distance, 2),
            "estimated_duration_minutes": round(travel_time + collection_time, 2),
            "optimized_sequence": sequence,
        })
    
    return {
        "algorithm": "K-Means Clustering + Nearest-Neighbor TSP",
        "n_vehicles": n_vehicles,
        "total_distance_km": round(total_distance, 2),
        "vehicle_routes": vehicle_routes,
    }


def compare_basic_vs_advanced(bins: List, n_vehicles: int = 3) -> Dict:
    """
    Compare basic nearest-neighbor (single vehicle) vs advanced (clustered multi-vehicle).
    """
    from app.ml.route_optimizer import optimize_collection_route
    
    # Basic: single vehicle, all bins
    basic_result = optimize_collection_route("TRUCK_01", bins)
    basic_distance = basic_result["total_distance_km"]
    
    # Advanced: clustered multi-vehicle
    advanced_result = optimize_route_advanced(bins, n_vehicles=n_vehicles)
    advanced_distance = advanced_result["total_distance_km"]
    
    improvement = 0
    if basic_distance > 0:
        improvement = round(((basic_distance - advanced_distance) / basic_distance) * 100, 2)
    
    return {
        "basic": {
            "algorithm": "Nearest-Neighbor (single vehicle)",
            "total_distance_km": basic_distance,
            "vehicles_used": 1,
        },
        "advanced": {
            "algorithm": advanced_result["algorithm"],
            "total_distance_km": advanced_distance,
            "vehicles_used": n_vehicles,
        },
        "distance_improvement_percent": improvement,
        "recommendation": (
            "Advanced multi-vehicle routing" if improvement > 0
            else "Basic single-vehicle routing"
        ),
    }

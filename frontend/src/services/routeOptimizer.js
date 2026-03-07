/**
 * Route Optimizer — Nearest-Neighbor TSP for critical bins
 */
import { haversineDistance } from '../utils/distance';

/**
 * Find the shortest route visiting all critical bins using nearest-neighbor heuristic
 * @param {Array} bins - All bins
 * @param {number} startLat - Starting latitude (user location)
 * @param {number} startLng - Starting longitude (user location)
 * @returns {{ route: Array, totalDistance: number, binCount: number }}
 */
export function optimizeRoute(bins, startLat, startLng) {
    // Filter to critical bins only (fill > 80%)
    const criticalBins = bins.filter((b) => b.fillLevel > 80);

    if (criticalBins.length === 0) {
        return { route: [], totalDistance: 0, binCount: 0 };
    }

    // Nearest-neighbor algorithm
    const visited = new Set();
    const route = [];
    let currentLat = startLat;
    let currentLng = startLng;
    let totalDistance = 0;

    while (visited.size < criticalBins.length) {
        let nearestBin = null;
        let nearestDist = Infinity;

        for (const bin of criticalBins) {
            if (visited.has(bin.id)) continue;
            const dist = haversineDistance(currentLat, currentLng, bin.lat, bin.lng);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestBin = bin;
            }
        }

        if (!nearestBin) break;

        visited.add(nearestBin.id);
        const distFromUser = haversineDistance(startLat, startLng, nearestBin.lat, nearestBin.lng);
        route.push({
            lat: nearestBin.lat,
            lng: nearestBin.lng,
            binId: nearestBin.id,
            fillLevel: nearestBin.fillLevel,
            distanceFromUser: parseFloat(distFromUser.toFixed(2)),
            routeOrder: route.length + 1,
        });
        totalDistance += nearestDist;
        currentLat = nearestBin.lat;
        currentLng = nearestBin.lng;
    }

    return {
        route,
        totalDistance: parseFloat(totalDistance.toFixed(2)),
        binCount: route.length,
    };
}

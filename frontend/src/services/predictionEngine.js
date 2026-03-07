/**
 * AI-like Prediction Engine
 * Detects high-waste-zone hotspots and generates per-bin forecasts
 */
import { haversineDistance } from '../utils/distance';

/**
 * Detect hotspots: areas where 3+ bins within 500m all have fill > 80%
 * Returns array of { center: {lat, lng}, binIds: [], severity }
 */
export function detectHotspots(bins) {
    const criticalBins = bins.filter((b) => b.fillLevel > 80);
    const hotspots = [];
    const visited = new Set();

    for (const bin of criticalBins) {
        if (visited.has(bin.id)) continue;

        // Find all critical bins within 500m of this one
        const cluster = criticalBins.filter(
            (other) =>
                haversineDistance(bin.lat, bin.lng, other.lat, other.lng) <= 0.5
        );

        if (cluster.length >= 3) {
            const ids = cluster.map((b) => b.id);
            ids.forEach((id) => visited.add(id));

            // Centroid of cluster
            const centerLat = cluster.reduce((s, b) => s + b.lat, 0) / cluster.length;
            const centerLng = cluster.reduce((s, b) => s + b.lng, 0) / cluster.length;
            const avgFill = cluster.reduce((s, b) => s + b.fillLevel, 0) / cluster.length;

            hotspots.push({
                id: `HS-${hotspots.length + 1}`,
                center: { lat: centerLat, lng: centerLng },
                binIds: ids,
                severity: avgFill > 90 ? 'extreme' : 'high',
                avgFill: Math.round(avgFill),
                radius: 500, // meters
            });
        }
    }

    return hotspots;
}

/**
 * Generate per-bin predictions: predicted fill in 24h and hours until full
 */
export function generatePredictions(bins) {
    return bins
        .filter((b) => b.fillLevel > 40) // Only predict for bins with meaningful fill
        .map((bin) => {
            // Simulate fill rate: ~2-6% per hour
            const fillRate = 2 + Math.random() * 4;
            const remaining = 100 - bin.fillLevel;
            const hoursUntilFull = Math.max(1, Math.round(remaining / fillRate));
            const predictedFill = Math.min(100, Math.round(bin.fillLevel + fillRate * 24));

            return {
                binId: bin.id,
                currentFill: bin.fillLevel,
                predictedFillLevel: predictedFill,
                hoursUntilFull,
                riskLevel: predictedFill > 90 ? 'high' : predictedFill > 70 ? 'medium' : 'low',
            };
        })
        .sort((a, b) => b.predictedFillLevel - a.predictedFillLevel)
        .slice(0, 8); // Top 8 predictions
}

/**
 * Generate alert objects from current bin state
 */
export function generateAlerts(bins) {
    const alerts = [];
    const now = new Date();

    bins.forEach((bin) => {
        if (bin.fillLevel > 90) {
            alerts.push({
                id: `alert-fill-${bin.id}`,
                binId: bin.id,
                type: 'overflow',
                severity: 'critical',
                message: `Fill level at ${bin.fillLevel}% — immediate collection required`,
                timestamp: now.toISOString(),
            });
        }
        if (bin.batteryLevel < 20) {
            alerts.push({
                id: `alert-bat-${bin.id}`,
                binId: bin.id,
                type: 'battery',
                severity: 'warning',
                message: `Battery critically low at ${bin.batteryLevel}%`,
                timestamp: now.toISOString(),
            });
        }
        if (bin.temperature > 45) {
            alerts.push({
                id: `alert-temp-${bin.id}`,
                binId: bin.id,
                type: 'temperature',
                severity: 'warning',
                message: `Abnormal temperature: ${bin.temperature}°C detected`,
                timestamp: now.toISOString(),
            });
        }
        if (bin.temperature < -5) {
            alerts.push({
                id: `alert-cold-${bin.id}`,
                binId: bin.id,
                type: 'temperature',
                severity: 'warning',
                message: `Sub-zero temperature: ${bin.temperature}°C`,
                timestamp: now.toISOString(),
            });
        }
    });

    return alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1));
}

/**
 * Smart Bin Generator & Real-Time Simulation Engine
 */
import {
    WASTE_TYPES,
    randomBetween,
    randomInt,
    randomChoice,
    randomLatLngOffset,
    randomLastCollected,
} from '../utils/randomData';

/**
 * Generate `count` smart bins spread around a center point
 */
export function generateBins(centerLat, centerLng, count = 25) {
    const bins = [];
    for (let i = 1; i <= count; i++) {
        const { latOffset, lngOffset } = randomLatLngOffset(centerLat, 2);
        const fillLevel = randomInt(5, 95);
        bins.push({
            id: `BIN-${String(i).padStart(3, '0')}`,
            lat: centerLat + latOffset,
            lng: centerLng + lngOffset,
            fillLevel,
            temperature: parseFloat(randomBetween(15, 50).toFixed(1)),
            wasteType: randomChoice(WASTE_TYPES),
            lastCollected: randomLastCollected(),
            status: getStatus(fillLevel),
            batteryLevel: randomInt(10, 100),
        });
    }
    return bins;
}

/**
 * Derive status from fill level
 */
export function getStatus(fillLevel) {
    if (fillLevel > 80) return 'critical';
    if (fillLevel >= 50) return 'warning';
    return 'normal';
}

/**
 * Simulate one tick of real-time data:
 * - Fill levels increase 1-5%
 * - Occasional collection event (resets a random bin)
 * - Battery slowly drains
 * - Temperature fluctuates
 */
export function simulateTick(bins) {
    return bins.map((bin) => {
        let { fillLevel, batteryLevel, temperature } = bin;

        // ~8% chance of collection event (resets the bin)
        if (Math.random() < 0.08) {
            fillLevel = randomInt(3, 12);
            return {
                ...bin,
                fillLevel,
                status: getStatus(fillLevel),
                batteryLevel: Math.min(100, batteryLevel + randomInt(0, 5)),
                lastCollected: new Date().toISOString(),
                temperature: parseFloat((temperature + randomBetween(-1, 1)).toFixed(1)),
            };
        }

        // Normal tick — fill increases
        fillLevel = Math.min(100, fillLevel + randomInt(1, 5));
        batteryLevel = Math.max(0, batteryLevel - randomBetween(0, 0.5));
        temperature = parseFloat(
            Math.max(5, Math.min(60, temperature + randomBetween(-2, 2))).toFixed(1)
        );

        return {
            ...bin,
            fillLevel,
            batteryLevel: Math.round(batteryLevel),
            temperature,
            status: getStatus(fillLevel),
        };
    });
}

/**
 * Generate 7-day trend data for charts
 */
export function generateTrendData() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day) => ({
        day,
        wasteCollected: randomInt(120, 480),
        avgFillLevel: randomInt(30, 75),
        criticalBins: randomInt(1, 8),
    }));
}

/**
 * Random data helpers for smart-bin simulation
 */

export const WASTE_TYPES = ['General', 'Recyclable', 'Organic', 'Hazardous', 'E-Waste'];

export function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
}

export function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Random lat/lng offset within a radius (in km)
 * 1 degree latitude ≈ 111 km
 * 1 degree longitude ≈ 111 * cos(lat) km
 */
export function randomLatLngOffset(centerLat, radiusKm) {
    const latOffset = (randomBetween(-radiusKm, radiusKm)) / 111;
    const lngOffset = (randomBetween(-radiusKm, radiusKm)) / (111 * Math.cos((centerLat * Math.PI) / 180));
    return { latOffset, lngOffset };
}

/**
 * Generate a realistic "last collected" timestamp (1-48 hours ago)
 */
export function randomLastCollected() {
    const hoursAgo = randomBetween(1, 48);
    return new Date(Date.now() - hoursAgo * 3600000).toISOString();
}

// Geodesic utilities for great-circle calculations
// Used for realistic flight path routing on a spherical Earth

// Earth's mean radius in meters
const EARTH_RADIUS = 6371008.8;

// Convert degrees to radians
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

// Convert radians to degrees
function toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
}

/**
 * Calculate the great-circle distance between two points using the Haversine formula
 * @param from Starting point [longitude, latitude] in degrees
 * @param to Ending point [longitude, latitude] in degrees
 * @returns Distance in meters
 */
export function greatCircleDistance(
    from: [number, number],
    to: [number, number]
): number {
    const lat1 = toRadians(from[1]);
    const lat2 = toRadians(to[1]);
    const deltaLat = toRadians(to[1] - from[1]);
    const deltaLng = toRadians(to[0] - from[0]);

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS * c;
}

/**
 * Calculate the initial bearing (forward azimuth) from one point to another
 * @param from Starting point [longitude, latitude] in degrees
 * @param to Ending point [longitude, latitude] in degrees
 * @returns Bearing in degrees (0-360, where 0 is north)
 */
export function greatCircleBearing(
    from: [number, number],
    to: [number, number]
): number {
    const lat1 = toRadians(from[1]);
    const lat2 = toRadians(to[1]);
    const deltaLng = toRadians(to[0] - from[0]);

    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    const bearing = toDegrees(Math.atan2(x, y));

    // Normalize to 0-360
    return ((bearing % 360) + 360) % 360;
}

/**
 * Interpolate a point along the great-circle path between two points
 * @param from Starting point [longitude, latitude] in degrees
 * @param to Ending point [longitude, latitude] in degrees
 * @param fraction Fraction along the path (0 = start, 1 = end)
 * @returns Interpolated point [longitude, latitude] in degrees
 */
export function greatCircleInterpolate(
    from: [number, number],
    to: [number, number],
    fraction: number
): [number, number] {
    const lat1 = toRadians(from[1]);
    const lng1 = toRadians(from[0]);
    const lat2 = toRadians(to[1]);
    const lng2 = toRadians(to[0]);

    // Calculate angular distance
    const deltaLat = lat2 - lat1;
    const deltaLng = lng2 - lng1;
    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Handle coincident points
    if (d < 1e-10) {
        return [...from] as [number, number];
    }

    const A = Math.sin((1 - fraction) * d) / Math.sin(d);
    const B = Math.sin(fraction * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lng = Math.atan2(y, x);

    return [toDegrees(lng), toDegrees(lat)];
}

/**
 * Generate a great-circle path as a GeoJSON LineString
 * @param from Starting point [longitude, latitude] in degrees
 * @param to Ending point [longitude, latitude] in degrees
 * @param numPoints Number of points to generate along the path (default: 100)
 * @returns GeoJSON LineString geometry
 */
export function greatCirclePath(
    from: [number, number],
    to: [number, number],
    numPoints: number = 100
): GeoJSON.LineString {
    const coordinates: [number, number][] = [];

    for (let i = 0; i <= numPoints; i++) {
        const fraction = i / numPoints;
        coordinates.push(greatCircleInterpolate(from, to, fraction));
    }

    return {
        type: 'LineString',
        coordinates,
    };
}

/**
 * Calculate the destination point given a start point, bearing, and distance
 * @param from Starting point [longitude, latitude] in degrees
 * @param bearing Bearing in degrees (0-360, where 0 is north)
 * @param distance Distance in meters
 * @returns Destination point [longitude, latitude] in degrees
 */
export function destinationPoint(
    from: [number, number],
    bearing: number,
    distance: number
): [number, number] {
    const lat1 = toRadians(from[1]);
    const lng1 = toRadians(from[0]);
    const bearingRad = toRadians(bearing);
    const angularDistance = distance / EARTH_RADIUS;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
    );

    const lng2 = lng1 + Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

    // Normalize longitude to -180 to 180
    const normalizedLng = ((toDegrees(lng2) + 540) % 360) - 180;

    return [normalizedLng, toDegrees(lat2)];
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "1,234 km" or "567 m")
 */
export function formatDistance(meters: number): string {
    if (meters >= 1000) {
        return `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
    }
    return `${Math.round(meters).toLocaleString()} m`;
}

/**
 * Format ETA for display
 * @param seconds Time in seconds
 * @returns Formatted string (e.g., "2h 34m" or "5m 23s")
 */
export function formatETA(seconds: number): string {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m ${secs}s`;
}

/**
 * Convert speed from km/h to degrees per millisecond (approximate)
 * Uses a simplified calculation based on Earth's circumference
 * @param kmh Speed in km/h
 * @returns Speed in degrees per millisecond
 */
export function speedToDegreesPerMs(kmh: number): number {
    // Earth's circumference at equator: ~40,075 km = 360 degrees
    // 1 degree = ~111.32 km at equator
    // kmh to km/ms: kmh / 3600000
    // km/ms to deg/ms: (km/ms) / 111.32
    const kmPerMs = kmh / 3600000;
    const degPerMs = kmPerMs / 111.32;
    return degPerMs;
}

/**
 * Convert degrees per millisecond to km/h (approximate)
 * @param degPerMs Speed in degrees per millisecond
 * @returns Speed in km/h
 */
export function degreesPerMsToSpeed(degPerMs: number): number {
    const kmPerMs = degPerMs * 111.32;
    const kmh = kmPerMs * 3600000;
    return kmh;
}

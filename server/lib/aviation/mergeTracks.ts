// Merge aircraft tracks from multiple sources
// Implements precedence: adsb.lol > OpenSky

import type { AircraftTrack } from './types.js';
import type { RegistryEntry } from '../registry/types.js';

/**
 * Merge tracks from multiple sources with proper precedence
 * adsb.lol takes priority over OpenSky
 */
export function mergeTracks(
    adsbTracks: AircraftTrack[],
    openskyTracks: AircraftTrack[],
    registry: RegistryEntry[]
): AircraftTrack[] {
    const trackMap = new Map<string, AircraftTrack>();

    // First, add all adsb.lol tracks (highest priority)
    for (const track of adsbTracks) {
        trackMap.set(track.icao24, track);
    }

    // Then add OpenSky tracks only if not already present or if adsb.lol track is stale
    for (const track of openskyTracks) {
        const existing = trackMap.get(track.icao24);

        if (!existing) {
            // No existing track, add OpenSky track
            trackMap.set(track.icao24, track);
        } else if (existing.stale && !track.stale) {
            // Existing track is stale, but OpenSky track is fresh - use OpenSky
            trackMap.set(track.icao24, track);
        }
        // Otherwise keep adsb.lol track
    }

    // Enrich tracks with registry data
    const enrichedTracks = Array.from(trackMap.values()).map(track => {
        const registryEntry = registry.find(
            e => e.icao24?.toLowerCase() === track.icao24.toLowerCase() ||
                e.registration === track.registration
        );

        if (registryEntry) {
            return {
                ...track,
                registration: track.registration || registryEntry.registration,
                operator: track.operator || registryEntry.operator,
                role: track.role || registryEntry.role,
            };
        }

        return track;
    });

    return enrichedTracks;
}

/**
 * Identify which aircraft are missing or stale
 */
export function identifyMissingAircraft(
    registryIcao24List: string[],
    tracks: AircraftTrack[],
    staleThresholdSeconds: number = 15
): string[] {
    const trackedIcao24 = new Set(
        tracks
            .filter(t => !t.stale || t.age_s <= staleThresholdSeconds)
            .map(t => t.icao24.toLowerCase())
    );

    return registryIcao24List
        .map(hex => hex.toLowerCase())
        .filter(hex => !trackedIcao24.has(hex));
}

/**
 * Convert tracks to GeoJSON FeatureCollection
 */
export function tracksToGeoJSON(tracks: AircraftTrack[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: tracks.map(track => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [track.lon, track.lat, track.alt_m],
            },
            properties: {
                icao24: track.icao24,
                registration: track.registration,
                callsign: track.callsign,
                altitude_m: track.alt_m,
                ground_speed_mps: track.ground_speed_mps,
                track_deg: track.track_deg,
                vertical_rate: track.vertical_rate,
                age_s: track.age_s,
                stale: track.stale,
                source: track.source,
                operator: track.operator,
                role: track.role,
                on_ground: track.on_ground,
            },
        })),
    };
}

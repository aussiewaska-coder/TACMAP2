// OpenSky Network API integration
// Fallback source for aircraft tracking

import type { AircraftTrack, OpenSkyResponse, OpenSkyState } from './types.js';

const OPENSKY_BASE_URL = 'https://opensky-network.org/api';

/**
 * Fetch aircraft positions from OpenSky Network using an Australian bounding box
 */
export async function fetchOpenSky(icao24List: string[]): Promise<AircraftTrack[]> {
    if (icao24List.length === 0) {
        return [];
    }

    const icaoSet = new Set(icao24List.map(i => i.toLowerCase()));

    try {
        // Australia Bounding Box
        const lamin = -45;
        const lomin = 110;
        const lamax = -10;
        const lomax = 155;

        const url = `${OPENSKY_BASE_URL}/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;

        // Check for credentials
        const clientId = process.env.OPENSKY_CLIENT_ID;
        const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

        const headers: HeadersInit = {
            'User-Agent': 'TAC-MAP Emergency Services Dashboard',
        };

        if (clientId && clientSecret) {
            const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            console.warn(`OpenSky returned ${response.status}`);
            return [];
        }

        const data: OpenSkyResponse = await response.json();
        const now = Date.now() / 1000;
        const tracks: AircraftTrack[] = [];

        if (data.states) {
            for (const state of data.states) {
                const hex = state.icao24.toLowerCase();

                // Only include if in our requested list
                if (!icaoSet.has(hex)) continue;
                if (state.latitude === null || state.longitude === null) continue;

                const age_s = Math.floor(now - state.last_contact);
                const alt_m = state.baro_altitude || state.geo_altitude || 0;

                const track: AircraftTrack = {
                    icao24: hex,
                    lat: state.latitude,
                    lon: state.longitude,
                    alt_m,
                    ground_speed_mps: state.velocity || 0,
                    track_deg: state.true_track || 0,
                    age_s,
                    stale: age_s > 15,
                    source: 'opensky',
                    callsign: state.callsign?.trim() || undefined,
                    vertical_rate: state.vertical_rate || undefined,
                    on_ground: state.on_ground,
                };

                tracks.push(track);
            }
        }

        return tracks;
    } catch (error) {
        console.error('OpenSky fetch error:', error);
        return [];
    }
}

/**
 * Fetch all aircraft in a bounding box (optional)
 */
export async function fetchOpenSkyBbox(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number
): Promise<AircraftTrack[]> {
    try {
        const url = `${OPENSKY_BASE_URL}/states/all?lamin=${minLat}&lomin=${minLon}&lamax=${maxLat}&lomax=${maxLon}`;

        const clientId = process.env.OPENSKY_CLIENT_ID;
        const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

        const headers: HeadersInit = {
            'User-Agent': 'TAC-MAP Emergency Services Dashboard',
        };

        if (clientId && clientSecret) {
            const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            console.warn(`OpenSky bbox query returned ${response.status}`);
            return [];
        }

        const data: OpenSkyResponse = await response.json();
        const now = Date.now() / 1000;
        const tracks: AircraftTrack[] = [];

        if (data.states) {
            for (const state of data.states) {
                if (state.latitude === null || state.longitude === null) continue;

                const age_s = Math.floor(now - state.last_contact);
                const alt_m = state.baro_altitude || state.geo_altitude || 0;
                const ground_speed_mps = state.velocity || 0;
                const track_deg = state.true_track || 0;

                tracks.push({
                    icao24: state.icao24.toLowerCase(),
                    lat: state.latitude,
                    lon: state.longitude,
                    alt_m,
                    ground_speed_mps,
                    track_deg,
                    age_s,
                    stale: age_s > 15,
                    source: 'opensky',
                    callsign: state.callsign?.trim() || undefined,
                    vertical_rate: state.vertical_rate || undefined,
                    on_ground: state.on_ground,
                });
            }
        }

        return tracks;
    } catch (error) {
        console.error('OpenSky bbox fetch error:', error);
        return [];
    }
}

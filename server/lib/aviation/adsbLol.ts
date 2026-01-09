// adsb.lol API integration
// Primary source for aircraft tracking

import type { AircraftTrack, AdsbLolResponse } from './types.js';

const ADSB_LOL_BASE_URL = 'https://api.adsb.lol';

/**
 * Fetch aircraft positions from adsb.lol by ICAO24 hex codes
 */
export async function fetchAdsbLol(icao24List: string[]): Promise<AircraftTrack[]> {
    if (icao24List.length === 0) {
        return [];
    }

    const tracks: AircraftTrack[] = [];
    const now = Date.now() / 1000; // Unix timestamp in seconds

    try {
        // Limit concurrency to avoid timeouts and IP blocks
        const BATCH_SIZE = 5;
        for (let i = 0; i < icao24List.length; i += BATCH_SIZE) {
            const chunk = icao24List.slice(i, i + BATCH_SIZE);
            const promises = chunk.map(async (icao24) => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s individual timeout

                    const url = `${ADSB_LOL_BASE_URL}/api/aircraft/icao/${icao24.toUpperCase()}/`;
                    const response = await fetch(url, {
                        headers: {
                            'User-Agent': 'TAC-MAP Emergency Services Dashboard',
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        console.warn(`adsb.lol returned ${response.status} for ${icao24}`);
                        return null;
                    }

                    const data: AdsbLolResponse = await response.json();

                    // Parse aircraft data
                    if (data.ac && data.ac.length > 0) {
                        const ac = data.ac[0]; // First aircraft in response

                        // Validate required fields
                        if (ac.lat === undefined || ac.lon === undefined) {
                            return null;
                        }

                        // Calculate age
                        const lastSeen = data.now || now;
                        const age_s = Math.floor(now - lastSeen);

                        // Parse altitude (can be string like "ground")
                        let alt_m = 0;
                        if (typeof ac.alt_baro === 'number') {
                            alt_m = ac.alt_baro * 0.3048; // feet to meters
                        }

                        // Parse ground speed (knots to m/s)
                        const ground_speed_mps = (ac.gs || 0) * 0.514444;

                        const track: AircraftTrack = {
                            icao24: ac.hex.toLowerCase(),
                            lat: ac.lat,
                            lon: ac.lon,
                            alt_m,
                            ground_speed_mps,
                            track_deg: ac.track || 0,
                            age_s,
                            stale: age_s > 15,
                            source: 'adsb_lol',
                            callsign: ac.flight?.trim() || undefined,
                            vertical_rate: ac.baro_rate,
                        };

                        return track;
                    }

                    return null;
                } catch (error) {
                    console.error(`Error fetching ${icao24} from adsb.lol:`, error);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            tracks.push(...results.filter((t): t is AircraftTrack => t !== null));
        }

    } catch (error) {
        console.error('adsb.lol fetch error:', error);
    }

    return tracks;
}

/**
 * Fetch aircraft in a geographic area (optional, for ambient awareness)
 */
export async function fetchAdsbLolArea(
    lat: number,
    lon: number,
    distanceNm: number = 50
): Promise<AircraftTrack[]> {
    try {
        const url = `${ADSB_LOL_BASE_URL}/api/aircraft/lat/${lat}/lon/${lon}/dist/${distanceNm}/`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'TAC-MAP Emergency Services Dashboard',
            },
        });

        if (!response.ok) {
            console.warn(`adsb.lol area query returned ${response.status}`);
            return [];
        }

        const data: AdsbLolResponse = await response.json();
        const now = Date.now() / 1000;
        const tracks: AircraftTrack[] = [];

        if (data.ac) {
            for (const ac of data.ac) {
                if (ac.lat === undefined || ac.lon === undefined) continue;

                const lastSeen = data.now || now;
                const age_s = Math.floor(now - lastSeen);

                let alt_m = 0;
                if (typeof ac.alt_baro === 'number') {
                    alt_m = ac.alt_baro * 0.3048;
                }

                const ground_speed_mps = (ac.gs || 0) * 0.514444;

                tracks.push({
                    icao24: ac.hex.toLowerCase(),
                    lat: ac.lat,
                    lon: ac.lon,
                    alt_m,
                    ground_speed_mps,
                    track_deg: ac.track || 0,
                    age_s,
                    stale: age_s > 15,
                    source: 'adsb_lol',
                    callsign: ac.flight?.trim() || undefined,
                    vertical_rate: ac.baro_rate,
                });
            }
        }

        return tracks;
    } catch (error) {
        console.error('adsb.lol area fetch error:', error);
        return [];
    }
}

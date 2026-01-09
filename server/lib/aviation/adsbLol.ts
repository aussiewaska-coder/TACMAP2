// adsb.lol API integration
// Primary source for aircraft tracking

import type { AircraftTrack, AdsbLolResponse } from './types.js';

const ADSB_LOL_BASE_URL = 'https://api.adsb.lol';

/**
 * Fetch aircraft positions from adsb.lol using a bulk regional query
 */
export async function fetchAdsbLol(icao24List: string[]): Promise<AircraftTrack[]> {
    if (icao24List.length === 0) {
        return [];
    }

    const tracks: AircraftTrack[] = [];
    const now = Date.now() / 1000;
    const icaoSet = new Set(icao24List.map(i => i.toLowerCase()));

    try {
        // Query the bulk Australia region (Center of AU, 250nm radius max per v2 API)
        // This is much more efficient than 137 individual calls
        // Note: v2 API has 250nm max radius limit
        const url = `${ADSB_LOL_BASE_URL}/v2/lat/-25/lon/135/dist/250`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'TAC-MAP Emergency Services Dashboard',
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`adsb.lol bulk query returned ${response.status}`);
            return [];
        }

        const data: AdsbLolResponse = await response.json();

        if (data.ac) {
            for (const ac of data.ac) {
                const hex = ac.hex.toLowerCase();

                // Only include if it was in our requested list
                if (!icaoSet.has(hex)) continue;
                if (ac.lat === undefined || ac.lon === undefined) continue;

                // v2 API provides 'seen' field (seconds since last update)
                const age_s = Math.floor(ac.seen || 0);

                let alt_m = 0;
                if (typeof ac.alt_baro === 'number') {
                    alt_m = ac.alt_baro * 0.3048;
                }

                const track: AircraftTrack = {
                    icao24: hex,
                    lat: ac.lat,
                    lon: ac.lon,
                    alt_m,
                    ground_speed_mps: (ac.gs || 0) * 0.514444,
                    track_deg: ac.track || 0,
                    age_s,
                    stale: age_s > 15,
                    source: 'adsb_lol',
                    callsign: ac.flight?.trim() || undefined,
                    vertical_rate: ac.baro_rate,
                };
                tracks.push(track);
            }
        }
    } catch (error) {
        console.error('adsb.lol bulk fetch error:', error);
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
        const url = `${ADSB_LOL_BASE_URL}/v2/lat/${lat}/lon/${lon}/dist/${distanceNm}`;
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

                // v2 API provides 'seen' field (seconds since last update)
                const age_s = Math.floor(ac.seen || 0);

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

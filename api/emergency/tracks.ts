// Emergency Services Aircraft Tracking API
// Returns live aircraft positions as GeoJSON

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadRegistry } from '../../server/lib/registry/loadRegistry.js';
import { fetchAdsbLol } from '../../server/lib/aviation/adsbLol.js';
import { fetchOpenSky } from '../../server/lib/aviation/opensky.js';
import { mergeTracks, identifyMissingAircraft, tracksToGeoJSON } from '../../server/lib/aviation/mergeTracks.js';
import { fetchWithCache } from '../../server/lib/ingest/fetchWithCache.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Load aircraft registry
        const registry = await loadRegistry();
        const aviationAssets = registry.filter(e => e.category === 'Aviation' && e.icao24);

        if (aviationAssets.length === 0) {
            res.status(200).json({
                type: 'FeatureCollection',
                features: [],
                metadata: {
                    message: 'No aviation assets in registry',
                    stale: false,
                },
            });
            return;
        }

        // Extract ICAO24 codes
        const icao24List = aviationAssets
            .map(a => a.icao24)
            .filter((hex): hex is string => !!hex);

        console.log(`Tracking ${icao24List.length} aircraft`);

        // Fetch with caching
        const result = await fetchWithCache(
            'emergency:aircraft:tracks',
            async () => {
                // Primary: fetch from adsb.lol (Regional Bulk)
                console.log('Fetching regional aircraft from adsb.lol...');
                const adsbTracks = await fetchAdsbLol(icao24List);
                console.log(`adsb.lol returned ${adsbTracks.length} active tracks for registry`);

                // Identify missing/stale aircraft
                const missing = identifyMissingAircraft(icao24List, adsbTracks, 15);

                let openskyTracks: any[] = [];
                if (missing.length > 0) {
                    console.log(`${missing.length} aircraft missing from adsb.lol, querying OpenSky (Regional BBox)...`);
                    openskyTracks = await fetchOpenSky(missing);
                    console.log(`OpenSky returned ${openskyTracks.length} fallback tracks`);
                }

                // Merge tracks with precedence
                const mergedTracks = mergeTracks(adsbTracks, openskyTracks, aviationAssets);

                return mergedTracks;
            },
            {
                ttlSeconds: 5, // 5 second cache
                staleWhileRevalidateSeconds: 30, // Serve stale for up to 30s
            }
        );

        // Convert to GeoJSON
        const geojson = tracksToGeoJSON(result.data || []);

        res.status(200).json({
            ...geojson,
            metadata: {
                total_tracked: icao24List.length,
                active_tracks: result.data?.length || 0,
                stale: result.stale,
                error: result.error,
            },
        });

    } catch (error) {
        console.error('Aircraft tracking API error:', error);
        res.status(500).json({
            error: 'Failed to fetch aircraft tracks',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

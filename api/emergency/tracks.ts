// Vercel Serverless Function - Emergency Aircraft Tracking
// Fast, reliable aircraft tracking using ADSB.LOL v2 API
import https from 'https';

// Helper to make HTTPS requests (more reliable than fetch in serverless)
function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers, timeout: 8000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Invalid JSON: ${data.substring(0, 100)}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

export default async function handler(request, response) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        return response.status(200).end();
    }

    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Use adsb.lol API v2 - 2000nm radius from Sydney covers ALL of Australia
        const targetUrl = 'https://api.adsb.lol/v2/lat/-33.8/lon/151.2/dist/2000';

        const headers = {
            'User-Agent': 'TAC-MAP/2.0',
            'Accept': 'application/json',
        };

        const data = await httpsGet(targetUrl, headers);

        // adsb.lol returns: { ac: [{hex, flight, lat, lon, alt_baro, track, gs, ...}], ...}
        let aircraft = [];

        if (data.ac && Array.isArray(data.ac)) {
            aircraft = data.ac
                .filter(ac => {
                    // Must have position
                    return ac.lat != null && ac.lon != null;
                })
                .map(ac => {
                    const hex = ac.hex?.toUpperCase() || 'UNKNOWN';
                    const seen = ac.seen || 0;

                    return {
                        hex: hex,
                        callsign: (ac.flight || ac.r || hex).trim(),
                        lat: ac.lat,
                        lon: ac.lon,
                        altitude: Math.round(ac.alt_baro || ac.alt_geom || 0),
                        heading: ac.track || 0,
                        speed: Math.round(ac.gs || 0),
                        verticalRate: Math.round(ac.baro_rate || 0),
                        seen: seen,
                        registration: ac.r || null,
                        aircraftType: ac.t || null,
                        onGround: ac.alt_baro <= 0,
                        status: seen > 120 ? 'stale' : 'active',
                    };
                });
        }

        // Set CORS headers
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Cache-Control', 's-maxage=3, stale-while-revalidate=30');

        return response.status(200).json({
            type: 'FeatureCollection',
            features: aircraft.map(ac => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [ac.lon, ac.lat]
                },
                properties: ac
            })),
            metadata: {
                total_tracked: aircraft.length,
                active_tracks: aircraft.filter(a => a.status === 'active').length,
                stale: aircraft.filter(a => a.status === 'stale').length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Aircraft API Error:', error.message);
        response.setHeader('Access-Control-Allow-Origin', '*');

        return response.status(200).json({
            type: 'FeatureCollection',
            features: [],
            metadata: {
                total_tracked: 0,
                active_tracks: 0,
                stale: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
}

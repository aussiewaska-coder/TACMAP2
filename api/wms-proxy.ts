
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_WMS_HOSTS = [
    'services.ga.gov.au',
    'portal.geoserver.sa.gov.au',
    'mapprod3.environment.nsw.gov.au',
    'data.gov.au',
    'maps.six.nsw.gov.au',
    'gis.drm.vic.gov.au',
    'sentinel.ga.gov.au',
    'localhost',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.status(200).end();
        return;
    }

    const { url, ...params } = req.query;

    if (!url || typeof url !== "string") {
        res.status(400).send("Missing url parameter");
        return;
    }

    try {
        const urlObj = new URL(url);
        const isAllowed = ALLOWED_WMS_HOSTS.some(host =>
            urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`)
        );

        if (!isAllowed) {
            console.warn(`[Security] Blocked WMS proxy request to unauthorized host: ${urlObj.hostname}`);
            res.status(403).send("Forbidden: Host not in whitelist");
            return;
        }

        // Reconstruct target URL
        // req.query in Vercel is parsed object, so we enable proper serialization
        // Note: req.query values can be string or string[], we need to handle that
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, v));
            } else if (value !== undefined) {
                queryParams.append(key, value as string);
            }
        });

        const targetUrl = `${url}?${queryParams.toString()}`;

        const response = await fetch(targetUrl);

        if (!response.ok) {
            throw new Error(`Upstream error: ${response.statusText}`);
        }

        // Forward Content-Type
        const contentType = response.headers.get("content-type");
        if (contentType) res.setHeader("Content-Type", contentType);

        // Allow CORS for the image itself
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Stream the image back
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("WMS Proxy Error:", error);
        res.status(500).send("Proxy Error");
    }
}


import type { VercelRequest, VercelResponse } from '@vercel/node';

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

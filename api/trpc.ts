// Vercel serverless function for tRPC API
// This replaces the Express server for Vercel deployment

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../server/routers';
import type { User } from '../drizzle/schema';

// Minimal context for Vercel serverless
interface VercelTrpcContext {
    req: Request;
    res: Response | null;
    user: User | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(200).end();
        return;
    }

    // Build the full URL
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const url = `${protocol}://${host}${req.url}`;

    // Create headers from request
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
        if (value) {
            headers.set(key, Array.isArray(value) ? value[0] : value);
        }
    });

    // Get body for POST/PUT requests
    let body: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Create a standard Request object
    const fetchRequest = new Request(url, {
        method: req.method || 'GET',
        headers,
        body,
    });

    try {
        const response = await fetchRequestHandler({
            endpoint: '/api/trpc',
            req: fetchRequest,
            router: appRouter,
            createContext: async ({ req: fetchReq }) => {
                // For now, all routes are public on Vercel
                // TODO: Implement auth from cookies/headers
                return {
                    req: fetchReq,
                    res: null,
                    user: null as User | null,
                };
            },
        });

        // Set response headers
        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Send response
        const responseText = await response.text();
        res.status(response.status).send(responseText);

    } catch (error) {
        console.error('tRPC Error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

// React Query hook for aircraft tracking

import { useQuery } from '@tanstack/react-query';

interface AircraftTrackFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    properties: {
        icao24: string;
        registration?: string;
        callsign?: string;
        altitude_m?: number;
        speed?: number;
        heading?: number;
        verticalRate?: number;
        seen?: number;
        status?: 'active' | 'stale';
        operator?: string;
        role?: string;
        onGround?: boolean;
        source_id?: string;
        jurisdiction_state?: string;
    };
}

interface AircraftTracksResponse {
    type: 'FeatureCollection';
    features: AircraftTrackFeature[];
    metadata: {
        total_tracked: number;
        active_tracks: number;
        stale: number;
        error?: string;
    };
}

export function useAircraftTracks(enabled: boolean = true) {
    return useQuery<AircraftTracksResponse>({
        queryKey: ['emergency', 'aircraft', 'tracks'],
        queryFn: async () => {
            const response = await fetch('/api/emergency/tracks');
            if (!response.ok) {
                throw new Error(`Failed to fetch aircraft tracks: ${response.statusText}`);
            }
            return response.json();
        },
        refetchInterval: 5000, // Poll every 5 seconds for live updates
        enabled,
        staleTime: 4000, // Consider data stale after 4 seconds
    });
}

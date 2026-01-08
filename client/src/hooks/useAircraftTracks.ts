// React Query hook for aircraft tracking

import { useQuery } from '@tanstack/react-query';

interface AircraftTrackFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number, number];
    };
    properties: {
        icao24: string;
        registration?: string;
        callsign?: string;
        altitude_m: number;
        ground_speed_mps: number;
        track_deg: number;
        vertical_rate?: number;
        age_s: number;
        stale: boolean;
        source: 'adsb_lol' | 'opensky';
        operator?: string;
        role?: string;
        on_ground?: boolean;
    };
}

interface AircraftTracksResponse {
    type: 'FeatureCollection';
    features: AircraftTrackFeature[];
    metadata: {
        total_tracked: number;
        active_tracks: number;
        stale: boolean;
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

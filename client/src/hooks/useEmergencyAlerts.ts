// React Query hook for emergency alerts

import { useQuery } from '@tanstack/react-query';

interface AlertFeature {
    type: 'Feature';
    geometry: GeoJSON.Geometry;
    properties: {
        id: string;
        source_id: string;
        category: string;
        hazard_type: string;
        severity: string;
        severity_rank: number;
        title: string;
        description: string;
        issued_at: string;
        updated_at: string;
        expires_at?: string;
        url?: string;
        confidence: string;
        age_s: number;
    };
}

interface AlertsResponse {
    type: 'FeatureCollection';
    features: AlertFeature[];
    metadata: {
        total_alerts: number;
        sources_count: number;
        stale: boolean;
        error?: string;
    };
}

export function useEmergencyAlerts(enabled: boolean = true) {
    return useQuery<AlertsResponse>({
        queryKey: ['emergency', 'alerts'],
        queryFn: async () => {
            const response = await fetch('/api/emergency/alerts');
            if (!response.ok) {
                throw new Error(`Failed to fetch alerts: ${response.statusText}`);
            }
            return response.json();
        },
        refetchInterval: 30000, // Poll every 30 seconds
        enabled,
        staleTime: 25000, // Consider data stale after 25 seconds
    });
}

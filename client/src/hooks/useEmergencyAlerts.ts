import { useQuery } from '@tanstack/react-query';

interface AlertFeature {
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: {
    id: string;
    source_id: string;
    category: string;
    title: string;
    description: string;
    severity: string;
  };
}

interface AlertsResponse {
  type: 'FeatureCollection';
  features: AlertFeature[];
  metadata: {
    total_alerts: number;
    sources_count: number;
  };
}

export function useEmergencyAlerts(enabled = true) {
  return useQuery<AlertsResponse>({
    queryKey: ['emergency', 'alerts'],
    queryFn: async () => {
      const res = await fetch('/api/emergency/alerts');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
    refetchInterval: 30000,
    enabled,
    staleTime: 25000,
  });
}

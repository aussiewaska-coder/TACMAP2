// Heatmap Hook - Port from waze-police-reporter
// Fetches aggregated heatmap data and renders using MapLibre

import { useEffect, useState, useRef } from 'react';
import { useMapStore } from '@/stores';
import { trpc } from '@/lib/trpc';
import maplibregl from 'maplibre-gl';

interface HeatmapData {
  count: number;
  data: [number, number, number][]; // [lat, lon, weight]
  cameras: any[];
  camera_summary: { high: number; medium: number; low: number };
}

export type HeatmapColorScheme = 'thermal' | 'green' | 'plasma' | 'ocean' | 'fire';

export const HEATMAP_SCHEMES: Record<HeatmapColorScheme, { name: string; colors: any[] }> = {
  thermal: {
    name: 'Thermal',
    colors: [
      0, 'rgba(0, 0, 0, 0)',
      0.2, 'rgba(128, 0, 128, 0.7)',
      0.4, 'rgba(255, 0, 0, 0.8)',
      0.6, 'rgba(255, 128, 0, 0.85)',
      0.8, 'rgba(255, 255, 0, 0.9)',
      1, 'rgba(255, 255, 255, 0.95)'
    ]
  },
  green: {
    name: 'Night Vision',
    colors: [
      0, 'rgba(0, 20, 0, 0)',
      0.2, 'rgba(0, 80, 0, 0.6)',
      0.4, 'rgba(0, 160, 0, 0.75)',
      0.6, 'rgba(50, 200, 50, 0.85)',
      0.8, 'rgba(100, 255, 100, 0.9)',
      1, 'rgba(200, 255, 200, 0.95)'
    ]
  },
  plasma: {
    name: 'Plasma',
    colors: [
      0, 'rgba(10, 0, 30, 0)',
      0.2, 'rgba(100, 0, 150, 0.7)',
      0.4, 'rgba(200, 50, 150, 0.8)',
      0.6, 'rgba(255, 100, 100, 0.85)',
      0.8, 'rgba(255, 200, 50, 0.9)',
      1, 'rgba(255, 255, 200, 0.95)'
    ]
  },
  ocean: {
    name: 'Ocean',
    colors: [
      0, 'rgba(0, 0, 30, 0)',
      0.2, 'rgba(0, 50, 100, 0.6)',
      0.4, 'rgba(0, 100, 180, 0.75)',
      0.6, 'rgba(0, 180, 220, 0.85)',
      0.8, 'rgba(100, 220, 255, 0.9)',
      1, 'rgba(220, 255, 255, 0.95)'
    ]
  },
  fire: {
    name: 'Fire',
    colors: [
      0, 'rgba(0, 0, 0, 0)',
      0.2, 'rgba(80, 0, 0, 0.6)',
      0.4, 'rgba(180, 30, 0, 0.75)',
      0.6, 'rgba(255, 100, 0, 0.85)',
      0.8, 'rgba(255, 180, 0, 0.9)',
      1, 'rgba(255, 255, 100, 0.95)'
    ]
  }
};

export interface UseHeatmapOptions {
  enabled: boolean;
  hoursAgo: number;
  colorScheme?: HeatmapColorScheme;
}

const HEATMAP_SOURCE_ID = 'heatmap-source';
const HEATMAP_LAYER_ID = 'heatmap-layer';

export function useHeatmap(options: UseHeatmapOptions) {
  const { enabled, hoursAgo, colorScheme = 'thermal' } = options;
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);
  const sessionData = useRef<Map<string, number>>(new Map());
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Fetch heatmap data from server
  const { data: heatmapData, isLoading } = trpc.police.heatmap.useQuery(
    { hoursAgo },
    {
      enabled: enabled && !!map && isLoaded,
      refetchInterval: 60000, // Refresh every minute
      onSuccess: (data) => {
        console.log(`🔥 Heatmap data received: ${data.count} locations`);
      },
      onError: (error) => {
        console.error('Heatmap fetch error:', error);
      }
    }
  );

  // Accumulate data into session map (like old system)
  useEffect(() => {
    if (!heatmapData || !enabled) return;

    let newPoints = 0;
    heatmapData.data.forEach(([lat, lon, count]) => {
      const key = `${lat},${lon}`;
      if (!sessionData.current.has(key)) {
        newPoints++;
      }
      // Keep higher count
      const existing = sessionData.current.get(key) || 0;
      sessionData.current.set(key, Math.max(existing, count));
    });

    console.log(`🔥 Heatmap session: +${newPoints} points (${sessionData.current.size} total)`);

    // Trigger re-render to update map
    setRenderTrigger(prev => prev + 1);
  }, [heatmapData, enabled]);

  // Render heatmap using MapLibre
  useEffect(() => {
    if (!map || !isLoaded || !enabled || sessionData.current.size === 0) {
      console.log(`❌ Not rendering heatmap: map=${!!map}, loaded=${isLoaded}, enabled=${enabled}, size=${sessionData.current.size}`);
      return;
    }

    console.log(`🔥 Rendering heatmap: ${sessionData.current.size} points`);

    // Convert session data to GeoJSON
    const features: any[] = [];
    sessionData.current.forEach((count, key) => {
      const [lat, lon] = key.split(',').map(Number);
      // Normalize weight (cap at 20 for consistency)
      const weight = Math.min(count / 20, 1);
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        properties: { weight }
      });
    });

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    // Add or update source
    if (!map.getSource(HEATMAP_SOURCE_ID)) {
      map.addSource(HEATMAP_SOURCE_ID, {
        type: 'geojson',
        data: geojson as any
      });
    } else {
      (map.getSource(HEATMAP_SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson as any);
    }

    const heatmapColorExpr = [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      ...HEATMAP_SCHEMES[colorScheme].colors
    ];

    // Add heatmap layer (only if not exists)
    if (!map.getLayer(HEATMAP_LAYER_ID)) {
      map.addLayer({
        id: HEATMAP_LAYER_ID,
        type: 'heatmap',
        source: HEATMAP_SOURCE_ID,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'],
            8, 0.5,
            12, 1.5,
            16, 2.5,
            20, 4
          ],
          'heatmap-color': heatmapColorExpr,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'],
            8, 30,
            10, 40,
            12, 55,
            14, 75,
            16, 100,
            18, 130,
            20, 160
          ],
          'heatmap-opacity': 0.7
        }
      });
      console.log('✅ Heatmap layer added');
    } else {
      // Update color scheme on existing layer
      map.setPaintProperty(HEATMAP_LAYER_ID, 'heatmap-color', heatmapColorExpr);
    }

    // Cleanup function
    return () => {
      if (map.getLayer(HEATMAP_LAYER_ID)) {
        map.removeLayer(HEATMAP_LAYER_ID);
      }
      if (map.getSource(HEATMAP_SOURCE_ID)) {
        map.removeSource(HEATMAP_SOURCE_ID);
      }
    };
  }, [map, isLoaded, enabled, renderTrigger, colorScheme]);

  // Clear session data when disabled
  useEffect(() => {
    if (!enabled) {
      sessionData.current.clear();
    }
  }, [enabled]);

  return {
    isLoading,
    heatmapCount: sessionData.current.size
  };
}

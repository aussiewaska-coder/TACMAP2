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

export interface UseHeatmapOptions {
  enabled: boolean;
  hoursAgo: number;
}

const HEATMAP_SOURCE_ID = 'heatmap-source';
const HEATMAP_LAYER_ID = 'heatmap-layer';

export function useHeatmap(options: UseHeatmapOptions) {
  const { enabled, hoursAgo } = options;
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

    // Add heatmap layer (only if not exists)
    if (!map.getLayer(HEATMAP_LAYER_ID)) {
      map.addLayer({
        id: HEATMAP_LAYER_ID,
        type: 'heatmap',
        source: HEATMAP_SOURCE_ID,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          // Intensity increases as you zoom in to compensate for smaller visual coverage
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'],
            8, 0.5,   // Regional view - subtle
            12, 1.5,  // City view - moderate
            16, 2.5,  // Neighborhood - stronger
            20, 4     // Street level - full intensity
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 255, 0)',
            0.2, 'rgba(0, 255, 255, 0.8)',
            0.4, 'rgba(0, 255, 0, 0.8)',
            0.6, 'rgba(255, 255, 0, 0.8)',
            0.8, 'rgba(255, 128, 0, 0.8)',
            1, 'rgba(255, 0, 0, 0.8)'
          ],
          // CRITICAL: Radius must be large at low zoom for smooth blending
          // Decreases as you zoom in so individual hotspots become visible
          'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'],
            8, 60,    // Regional - large radius for smooth coverage
            10, 45,   // State/metro - good blending
            12, 35,   // City view - smooth clusters
            14, 25,   // Suburb - starting to show detail
            16, 18,   // Neighborhood - individual areas visible
            18, 12,   // Street level - precise hotspots
            20, 8     // Maximum zoom - exact locations
          ],
          'heatmap-opacity': 0.7
        }
      });
      console.log('✅ Heatmap layer added');
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
  }, [map, isLoaded, enabled, renderTrigger]);

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

import { useEffect } from 'react';
import { useMapStore } from '@/stores/mapStore';
import * as maptilersdk from '@maptiler/sdk';

interface LocationCoverage {
  id: string;
  name: string;
  total: number;
  cached: number;
  percent: number;
  coordinates?: [number, number]; // lng, lat
}

/**
 * Cache Coverage Layer Hook
 * Fetches coverage stats and renders circles on the map showing cache density
 * Green = fully cached, Red = empty
 */
export function useCacheCoverageLayer() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const fetchAndRender = async () => {
      try {
        const response = await fetch('/api/cache/coverage');
        if (!response.ok) return;

        const data = await response.json();
        const locations: LocationCoverage[] = data.locations || [];

        // Hardcoded coordinates for strategic locations (matches server config)
        const coordMap: Record<string, [number, number]> = {
          'byron-bay': [153.6020, -28.6474],
          'sydney': [151.2093, -33.8688],
          'melbourne': [144.9631, -37.8136],
          'brisbane': [153.0251, -27.4698],
          'perth': [115.8605, -31.9505],
          'adelaide': [138.6007, -34.9285],
          'hobart': [147.1192, -42.8821],
          'nimbin': [153.0516, -28.3893],
          'darwin': [130.8353, -12.4634],
          'canberra': [149.1244, -35.2809],
        };

        // Create feature collection for cache coverage circles
        const features: GeoJSON.Feature[] = locations.map((loc) => {
          const coords = coordMap[loc.id];
          if (!coords) return null;

          const [lng, lat] = coords;
          const coverage = loc.percent || 0;

          // Color: green (cached) to red (empty)
          const hue = (coverage / 100) * 120; // 0-120 degrees (red to green)
          const color = `hsl(${hue}, 70%, 50%)`;

          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [lng, lat],
            },
            properties: {
              id: loc.id,
              name: loc.name,
              coverage: coverage,
              cached: loc.cached,
              total: loc.total,
              color: color,
            },
          };
        }).filter(Boolean) as GeoJSON.Feature[];

        if (features.length === 0) return;

        const sourceId = 'cache-coverage-source';
        const layerId = 'cache-coverage-circles';

        // Remove existing layer/source
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);

        // Add source
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: features,
          },
        });

        // Add circle layer
        map.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4, 8,
              12, 20,
              15, 35,
            ],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.8,
          },
        });

        // Add popup on click
        map.on('click', layerId, (e) => {
          const feature = e.features?.[0];
          if (!feature || !feature.properties) return;

          const props = feature.properties;
          const html = `
            <div style="font-family: monospace; font-size: 12px; min-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${props.name}</div>
              <div style="color: #0f0; margin-bottom: 8px;">Cache Coverage</div>
              <div style="margin: 4px 0;">Cached: ${props.cached.toLocaleString()} / ${props.total.toLocaleString()}</div>
              <div style="margin: 4px 0;">Coverage: <span style="color: #0f0; font-weight: bold;">${props.coverage}%</span></div>
              <div style="font-size: 10px; color: #666; margin-top: 8px;">Click to dismiss</div>
            </div>
          `;

          new maptilersdk.Popup({ offset: 25 })
            .setLngLat([feature.geometry.coordinates[0], feature.geometry.coordinates[1]])
            .setHTML(html)
            .addTo(map);
        });

        // Change cursor on hover
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      } catch (err) {
        console.error('[CacheCoverageLayer] Error:', err);
      }
    };

    fetchAndRender();

    // Refresh every 60 seconds
    const interval = setInterval(fetchAndRender, 60000);

    return () => {
      clearInterval(interval);
      // Cleanup
      if (map.getLayer('cache-coverage-circles')) {
        map.removeLayer('cache-coverage-circles');
      }
      if (map.getSource('cache-coverage-source')) {
        map.removeSource('cache-coverage-source');
      }
    };
  }, [map, isLoaded]);
}

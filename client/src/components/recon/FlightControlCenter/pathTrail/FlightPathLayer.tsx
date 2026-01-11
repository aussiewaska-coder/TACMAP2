import { useEffect } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useFlightControlStore } from '@/stores/flightControlStore';
import { isMapValid, safeRemoveLayer, safeRemoveSource } from '@/utils/mapUtils';

const LAYER_ID = 'flight-path-trail';
const SOURCE_ID = 'flight-path-source';

export function FlightPathLayer() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);
  const { pathPoints, pathVisible } = useFlightControlStore();

  useEffect(() => {
    if (!isMapValid(map) || !isLoaded) return;

    // Remove existing layer/source
    safeRemoveLayer(map, LAYER_ID);
    safeRemoveSource(map, SOURCE_ID);

    if (!pathVisible || pathPoints.length < 2) return;

    // Create GeoJSON from path points
    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: pathPoints.map((p) => p.coords),
      },
    };

    // Add source
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: geojson,
    });

    // Add line layer with gradient (fading trail)
    map.addLayer(
      {
        id: LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#06b6d4', // cyan-500
          'line-width': 3,
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            0.2, // Start of line: 20% opacity
            1,
            1, // End of line: 100% opacity
          ],
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            '#06b6d4', // cyan-500 at start
            1,
            '#f59e0b', // amber-500 at end (current position)
          ],
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      },
      'water' // Insert before water layer to keep it below most features
    );

    return () => {
      safeRemoveLayer(map, LAYER_ID);
      safeRemoveSource(map, SOURCE_ID);
    };
  }, [map, isLoaded, pathPoints, pathVisible]);

  return null; // No UI, just map layer
}

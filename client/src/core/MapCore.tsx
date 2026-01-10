import { useEffect, useRef, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { useMapStore } from '../stores/mapStore';

// Byron Bay default
const DEFAULT_CENTER: [number, number] = [153.6020, -28.6474];
const DEFAULT_ZOOM = 12;

interface MapCoreProps {
  className?: string;
}

function buildRasterStyle(): maptilersdk.StyleSpecification {
  return {
    version: 8,
    sources: {
      'tacmap-tiles': {
        type: 'raster',
        tiles: ['/api/tiles/{z}/{x}/{y}'],
        tileSize: 256,
        attribution: 'TacMap Critical Infrastructure',
      },
    },
    layers: [
      {
        id: 'base-layer',
        type: 'raster',
        source: 'tacmap-tiles',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

export function MapCore({ className = '' }: MapCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);

  const setMap = useMapStore((s) => s.setMap);
  const setLoaded = useMapStore((s) => s.setLoaded);
  const setInitializing = useMapStore((s) => s.setInitializing);
  const setError = useMapStore((s) => s.setError);

  const destroyMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    mapRef.current = null;
    setMap(null);
    setLoaded(false);
    try {
      map.remove();
    } catch {
      // Ignore cleanup errors
    }
  }, [setMap, setLoaded]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    setInitializing(true);
    setError(null);

    try {
      // Don't set global API key - we use custom tile source
      const map = new maptilersdk.Map({
        container: containerRef.current,
        style: buildRasterStyle(),
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 3,
        maxZoom: 20,
        attributionControl: false,
      });

      map.addControl(
        new maptilersdk.AttributionControl({ compact: true }),
        'bottom-right'
      );

      map.addControl(
        new maptilersdk.ScaleControl({ maxWidth: 200, unit: 'metric' }),
        'bottom-left'
      );

      map.addControl(new maptilersdk.NavigationControl(), 'top-right');

      map.on('load', () => {
        mapRef.current = map;
        setMap(map);
        setLoaded(true);
        setInitializing(false);
        console.log('[MapCore] Initialized at Byron Bay');
      });

      map.on('error', (e) => {
        // Log errors but don't retry - backend handles fallbacks
        console.error('[MapCore] Error:', e);
      });

    } catch (error) {
      console.error('[MapCore] Init failed:', error);
      setError(error instanceof Error ? error : new Error('Init failed'));
      setInitializing(false);
    }

    return destroyMap;
  }, [destroyMap, setMap, setLoaded, setInitializing, setError]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: '100%' }} />
    </div>
  );
}

export default MapCore;

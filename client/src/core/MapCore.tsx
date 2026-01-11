import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { useEffect, useRef, useState, ReactNode } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { getRedisProxiedStyle } from './styleInterceptor';
import { MAP_CONFIG } from './constants';

interface MapCoreProps {
  children?: (map: maptilersdk.Map) => ReactNode;
}

export function MapCore({ children }: MapCoreProps) {
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setMap, setLoaded: setStoreLoaded } = useMapStore();

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

    const initMap = async () => {
      try {
        const styleId = import.meta.env.VITE_MAPTILER_STYLE;
        if (!styleId) {
          throw new Error('VITE_MAPTILER_STYLE not configured');
        }

        // Fetch MapTiler style and rewrite tile URLs to use Redis proxy
        console.log('[MapCore] Fetching and rewriting style for Redis proxy...');
        const styleUrl = await getRedisProxiedStyle(styleId);

        const map = new maptilersdk.Map({
          container: containerRef.current!,
          style: styleUrl,
          center: MAP_CONFIG.DEFAULT_CENTER,
          zoom: MAP_CONFIG.DEFAULT_ZOOM,
          pitch: MAP_CONFIG.DEFAULT_PITCH,
          bearing: MAP_CONFIG.DEFAULT_BEARING,
          maxBounds: [
            [MAP_CONFIG.BOUNDS.MIN_LNG, MAP_CONFIG.BOUNDS.MIN_LAT],
            [MAP_CONFIG.BOUNDS.MAX_LNG, MAP_CONFIG.BOUNDS.MAX_LAT],
          ] as [[number, number], [number, number]],
        });

        map.on('load', () => {
          console.log('[MapCore] ✓ Loaded with Redis proxy tile URLs');
          setLoaded(true);
          setStoreLoaded(true);
        });
        map.on('error', (e) => { console.error('[MapCore] Error:', e); setError('Map error'); });

        mapRef.current = map;
        setMap(map);

        return () => {
          map.remove();
          mapRef.current = null;
          setMap(null);
          setStoreLoaded(false);
        };
      } catch (err) {
        console.error('[MapCore] Init failed:', err instanceof Error ? err.message : err);
        setError('Failed to load map');
      }
    };

    initMap();
  }, [setMap, setStoreLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {error && <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded z-50">{error}</div>}
      {loaded && mapRef.current && children?.(mapRef.current)}
    </div>
  );
}

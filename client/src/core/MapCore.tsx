import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { useEffect, useRef, useState, ReactNode } from 'react';
import { useMapStore } from '@/stores/mapStore';

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

    try {
      const map = new maptilersdk.Map({
        container: containerRef.current,
        style: import.meta.env.VITE_MAPTILER_STYLE || maptilersdk.MapStyle.STREETS,
        center: [133.7751, -25.2744],
        zoom: 4,
        pitch: 45,
        maxBounds: [[100, -50], [180, -5]],
      });

      map.on('load', () => {
        console.log('[MapCore] Loaded');
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
    } catch (err) { console.error('[MapCore] Init failed:', err); setError('Init failed'); }
  }, [setMap, setStoreLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {error && <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded z-50">{error}</div>}
      {loaded && mapRef.current && children?.(mapRef.current)}
    </div>
  );
}

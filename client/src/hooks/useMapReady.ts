import { useState, useEffect } from 'react';
import type { Map } from '@maptiler/sdk';

export function useMapReady(map: Map | null): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!map) { setReady(false); return; }
    if (map.loaded()) { setReady(true); return; }
    const h = () => setReady(true);
    map.on('load', h);
    return () => { map.off('load', h); };
  }, [map]);
  return ready;
}

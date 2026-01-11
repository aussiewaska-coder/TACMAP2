import { useState, useEffect } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { cn } from '@/lib/utils';

export function FlightStatusDisplay() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);

  const [currentZoom, setCurrentZoom] = useState(0);
  const [currentPitch, setCurrentPitch] = useState(0);
  const [currentBearing, setCurrentBearing] = useState(0);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const update = () => {
      setCurrentZoom(map.getZoom());
      setCurrentPitch(map.getPitch());
      setCurrentBearing(map.getBearing());
    };

    update();
    map.on('move', update);
    return () => {
      map.off('move', update);
    };
  }, [map, isLoaded]);

  // Calculate synthetic "altitude" for display (zoom * 1000 = feet approximation)
  const altitude = Math.round(currentZoom * 1000);
  const heading = ((currentBearing % 360) + 360).toFixed(0).padStart(3, '0');

  const StatusCard = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
    <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
      <div className="text-xs text-slate-400 uppercase font-semibold mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <div className="text-xl font-mono text-cyan-400 font-bold">{value}</div>
        <div className="text-xs text-slate-400">{unit}</div>
      </div>
    </div>
  );

  return (
    <div className="p-4 border-b border-slate-800/50">
      <div className="text-xs text-slate-500 uppercase mb-3 font-semibold">Telemetry</div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatusCard label="Altitude" value={altitude.toLocaleString()} unit="ft" />
        <StatusCard label="Pitch" value={currentPitch.toFixed(0)} unit="°" />
        <StatusCard label="Heading" value={heading} unit="°" />
      </div>
    </div>
  );
}

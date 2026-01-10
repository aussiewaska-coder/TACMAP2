import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import { useFlightControlStore } from '@/stores/flightControlStore';

const ALTITUDE_THRESHOLDS = {
  LOW: 6, // zoom < 6 = very high altitude (warning)
  HIGH: 18, // zoom > 18 = very low altitude (warning)
  DANGER_LOW: 5, // zoom < 5 = dangerous altitude
  DANGER_HIGH: 20, // zoom > 20 = dangerously close
};

export function FlightWarnings() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);
  const { warnings, addWarning, removeWarning } = useFlightControlStore();

  // Monitor altitude (zoom level as proxy)
  useEffect(() => {
    if (!map || !isLoaded) return;

    const checkAltitude = () => {
      const zoom = map.getZoom();

      if (zoom < ALTITUDE_THRESHOLDS.DANGER_LOW) {
        addWarning({
          type: 'altitude-high',
          severity: 'danger',
          message: `⚠️ CRITICAL ALTITUDE: ${(zoom * 1000).toFixed(0)} ft - Dangerously high`,
        });
      } else if (zoom < ALTITUDE_THRESHOLDS.LOW) {
        addWarning({
          type: 'altitude-high',
          severity: 'warning',
          message: `⚠️ High altitude: ${(zoom * 1000).toFixed(0)} ft`,
        });
      } else {
        removeWarning('altitude-high');
      }

      if (zoom > ALTITUDE_THRESHOLDS.DANGER_HIGH) {
        addWarning({
          type: 'altitude-low',
          severity: 'danger',
          message: `⚠️ CRITICAL ALTITUDE: ${(zoom * 1000).toFixed(0)} ft - Dangerously low`,
        });
      } else if (zoom > ALTITUDE_THRESHOLDS.HIGH) {
        addWarning({
          type: 'altitude-low',
          severity: 'warning',
          message: `⚠️ Low altitude: ${(zoom * 1000).toFixed(0)} ft`,
        });
      } else {
        removeWarning('altitude-low');
      }
    };

    map.on('zoom', checkAltitude);
    checkAltitude(); // Initial check

    return () => {
      map.off('zoom', checkAltitude);
    };
  }, [map, isLoaded, addWarning, removeWarning]);

  if (warnings.length === 0) return null;

  return (
    <div className="p-4 border-b border-slate-800/50 space-y-2">
      {warnings.map((warning, idx) => {
        const Icon =
          warning.severity === 'danger'
            ? AlertTriangle
            : warning.severity === 'warning'
              ? AlertCircle
              : Info;
        const colorClass =
          warning.severity === 'danger'
            ? 'text-red-400 border-red-500/40 bg-red-950/40'
            : warning.severity === 'warning'
              ? 'text-yellow-400 border-yellow-500/40 bg-yellow-950/40'
              : 'text-blue-400 border-blue-500/40 bg-blue-950/40';

        return (
          <div
            key={`${warning.type}-${idx}`}
            className={`flex items-start gap-2 p-2.5 rounded-lg border ${colorClass} text-sm`}
          >
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{warning.message}</div>
          </div>
        );
      })}
    </div>
  );
}

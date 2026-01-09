import { useRef, useEffect } from 'react';
import { Plane, PlaneTakeoff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlightSimulator } from '@/hooks/useFlightSimulator';
import { useLongPress } from '@/hooks/useLongPress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Map as MapLibreGLMap } from 'maplibre-gl';

interface FlightSimulatorButtonProps {
  map: MapLibreGLMap | null;
}

export function FlightSimulatorButton({ map }: FlightSimulatorButtonProps) {
  const { mode, startSimplePan, startRandomSightseeing, stop } = useFlightSimulator({ map });

  // Use ref to avoid stale closure in callbacks
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const longPressHandlers = useLongPress({
    onShortPress: () => {
      if (modeRef.current === 'off') {
        startSimplePan();
        toast.info('Flight mode: Slow pan north');
      } else {
        stop();
        toast.info('Flight mode stopped');
      }
    },
    onLongPress: () => {
      startRandomSightseeing();
      toast.info('Flight mode: Random sightseeing (globe view)');
    },
    longPressThreshold: 500,
  });

  return (
    <Button
      variant={mode !== 'off' ? 'default' : 'outline'}
      size="icon"
      className={cn(
        'shadow-xl w-14 h-14 md:w-12 md:h-12 transition-all select-none',
        mode === 'simple-pan' && 'bg-blue-600 text-white hover:bg-blue-700',
        mode === 'random-sightseeing' && 'bg-purple-600 text-white hover:bg-purple-700 animate-pulse',
        mode === 'off' && 'bg-white text-gray-800 hover:bg-gray-100'
      )}
      title="Flight Simulator (click: pan north, hold: sightseeing)"
      {...longPressHandlers}
    >
      {mode === 'off' ? (
        <Plane className="w-6 h-6" />
      ) : (
        <PlaneTakeoff className="w-6 h-6" />
      )}
    </Button>
  );
}

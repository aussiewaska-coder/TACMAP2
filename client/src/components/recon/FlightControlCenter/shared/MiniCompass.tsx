import { Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniCompassProps {
  bearing: number;
  onReset: () => void;
}

export function MiniCompass({ bearing, onReset }: MiniCompassProps) {
  return (
    <button
      onClick={onReset}
      className="relative w-16 h-16 rounded-full bg-slate-900/80 border border-cyan-500/40 hover:border-cyan-400/60 transition-all group"
      title="Reset bearing to North (click)"
    >
      {/* Rotating needle */}
      <div
        className="absolute inset-1.5 flex items-center justify-center transition-transform"
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        <Navigation className="w-6 h-6 text-cyan-400 fill-cyan-400/30 group-hover:text-cyan-300" />
      </div>

      {/* North indicator */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-cyan-400">N</div>

      {/* Bearing label */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-mono text-cyan-400/70">
        {((bearing % 360) + 360).toFixed(0).padStart(3, '0')}°
      </div>
    </button>
  );
}

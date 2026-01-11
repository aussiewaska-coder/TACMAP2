import { Button } from '@/components/ui/button';
import { KeyboardHint } from './shared/KeyboardHint';
import { cn } from '@/lib/utils';
import { Eye, Orbit, Plane, Compass, Navigation } from 'lucide-react';
import type { FlightMode } from '@/stores/flightControlStore';

interface ModeDefinition {
  id: FlightMode;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  description: string;
}

const FLIGHT_MODES: ModeDefinition[] = [
  {
    id: 'auto-rotate',
    label: 'TopDown',
    icon: <Eye className="w-6 h-6" />,
    shortcut: '1',
    description: 'Bird\'s eye view of target',
  },
  {
    id: 'auto-orbit',
    label: 'Orbit',
    icon: <Orbit className="w-6 h-6" />,
    shortcut: '2',
    description: 'Circle around target (Cmd+Click to set)',
  },
  {
    id: 'flight',
    label: 'Flight',
    icon: <Plane className="w-6 h-6" />,
    shortcut: '3',
    description: 'Manual flight controls (WASD)',
  },
  {
    id: 'random-path',
    label: 'Random',
    icon: <Compass className="w-6 h-6" />,
    shortcut: '4',
    description: 'Autonomous random navigation',
  },
  {
    id: 'standard',
    label: 'Nav',
    icon: <Navigation className="w-6 h-6" />,
    shortcut: '5',
    description: 'Standard map navigation',
  },
];

interface FlightModeSelectorProps {
  activeMode: FlightMode;
  onModeChange: (mode: FlightMode) => void;
  isAutoRotating?: boolean;
}

export function FlightModeSelector({ activeMode, onModeChange, isAutoRotating }: FlightModeSelectorProps) {
  return (
    <div className="p-4 border-b border-slate-800/50">
      <div className="text-xs text-slate-500 uppercase mb-3 font-semibold">Flight Mode</div>

      {/* Icon Grid - 5 columns */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {FLIGHT_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={cn(
              'relative flex flex-col items-center justify-center',
              'h-20 rounded-lg border transition-all',
              'group',
              activeMode === mode.id
                ? 'bg-cyan-600/60 border-cyan-400/60 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
            )}
            title={mode.description}
          >
            {/* Icon */}
            <div
              className={cn(
                'mb-1 transition-transform',
                activeMode === mode.id && mode.id === 'auto-rotate' && 'animate-pulse'
              )}
            >
              {mode.icon}
            </div>

            {/* Label */}
            <span className="text-[10px] font-semibold text-center leading-tight">{mode.label}</span>

            {/* Keyboard Hint Badge */}
            <KeyboardHint shortcut={mode.shortcut} className="absolute -top-1.5 -right-1.5 text-[8px]" />
          </button>
        ))}
      </div>

      {/* Active Mode Description */}
      <div className="text-center text-xs text-cyan-400 font-mono bg-slate-800/40 rounded py-2">
        {FLIGHT_MODES.find((m) => m.id === activeMode)?.description}
      </div>
    </div>
  );
}

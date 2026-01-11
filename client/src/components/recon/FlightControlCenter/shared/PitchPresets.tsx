import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PitchPresetsProps {
  presets: number[];
  currentPitch: number;
  onPitchSelect: (pitch: number) => void;
  threshold?: number;
  className?: string;
}

export function PitchPresets({
  presets,
  currentPitch,
  onPitchSelect,
  threshold = 5,
  className,
}: PitchPresetsProps) {
  return (
    <div className={cn('flex gap-2 flex-wrap', className)}>
      {presets.map((p) => (
        <Button
          key={p}
          size="sm"
          variant="ghost"
          onClick={() => onPitchSelect(p)}
          className={cn(
            'text-sm px-3 h-10 border font-medium',
            Math.abs(currentPitch - p) < threshold
              ? 'bg-cyan-600/40 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border-slate-700/50'
          )}
          title={`Set pitch to ${p}°`}
        >
          {p}°
        </Button>
      ))}
    </div>
  );
}

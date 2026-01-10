import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickViewControlsProps {
  activeMagnification: null | '5x' | '10x';
  onMagnificationChange: (mag: null | '5x' | '10x') => void;
}

export function QuickViewControls({ activeMagnification, onMagnificationChange }: QuickViewControlsProps) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onMagnificationChange(activeMagnification === '5x' ? null : '5x')}
        className={cn(
          'flex-1 h-11 text-sm font-bold transition-all border',
          activeMagnification === '5x'
            ? 'bg-amber-600/60 border-amber-400/60 text-white'
            : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
        )}
        title="5x magnification snap zoom"
      >
        5X
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onMagnificationChange(activeMagnification === '10x' ? null : '10x')}
        className={cn(
          'flex-1 h-11 text-sm font-bold transition-all border',
          activeMagnification === '10x'
            ? 'bg-red-600/60 border-red-400/60 text-white'
            : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-700/60'
        )}
        title="10x magnification snap zoom"
      >
        10X
      </Button>
    </div>
  );
}

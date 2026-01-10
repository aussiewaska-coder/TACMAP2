import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DirectionPadProps {
  onPan: (dir: 'N' | 'S' | 'E' | 'W') => void;
}

export function DirectionPad({ onPan }: DirectionPadProps) {
  return (
    <div className="grid grid-cols-3 gap-1 w-fit">
      {/* Top row */}
      <div />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onPan('N')}
        className="h-11 w-11 bg-slate-800/60 hover:bg-cyan-600/40 text-cyan-400 border border-slate-700/50 hover:border-cyan-500/50 flex items-center justify-center"
        title="Pan North"
      >
        <ChevronUp className="w-5 h-5" />
      </Button>
      <div />

      {/* Middle row */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onPan('W')}
        className="h-11 w-11 bg-slate-800/60 hover:bg-cyan-600/40 text-cyan-400 border border-slate-700/50 hover:border-cyan-500/50 flex items-center justify-center"
        title="Pan West"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <div className="h-11 w-11 bg-slate-900/40 rounded flex items-center justify-center border border-slate-700/50">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500/50" />
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onPan('E')}
        className="h-11 w-11 bg-slate-800/60 hover:bg-cyan-600/40 text-cyan-400 border border-slate-700/50 hover:border-cyan-500/50 flex items-center justify-center"
        title="Pan East"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>

      {/* Bottom row */}
      <div />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onPan('S')}
        className="h-11 w-11 bg-slate-800/60 hover:bg-cyan-600/40 text-cyan-400 border border-slate-700/50 hover:border-cyan-500/50 flex items-center justify-center"
        title="Pan South"
      >
        <ChevronDown className="w-5 h-5" />
      </Button>
      <div />
    </div>
  );
}

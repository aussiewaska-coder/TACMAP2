import { cn } from '@/lib/utils';

interface KeyboardHintProps {
  shortcut: string;
  className?: string;
}

export function KeyboardHint({ shortcut, className }: KeyboardHintProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-5 h-5 px-1.5 rounded',
        'bg-slate-800/80 border border-cyan-500/30',
        'text-[10px] font-mono font-bold text-cyan-300',
        'shadow-sm',
        className
      )}
    >
      {shortcut}
    </span>
  );
}

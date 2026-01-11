export function AutoRotateControls() {
  return (
    <div className="p-4 border-b border-slate-800/50">
      <div className="text-xs text-slate-500 uppercase mb-3 font-semibold">Top-Down View</div>
      <div className="space-y-2 text-sm text-slate-300">
        <div className="flex items-center gap-2 bg-slate-800/40 rounded p-2.5 border border-slate-700/50">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-medium">Bird's Eye View Active</span>
        </div>

        <div className="text-xs text-slate-400 bg-slate-800/30 rounded p-2 italic">
          • Direct overhead view
          <br />
          • Perfect for tactical planning
          <br />
          • Zoom with +/- keys
        </div>
      </div>
    </div>
  );
}

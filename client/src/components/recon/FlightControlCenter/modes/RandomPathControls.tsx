export function RandomPathControls() {
  return (
    <div className="p-4 border-b border-slate-800/50 space-y-3">
      {/* Status */}
      <div>
        <div className="text-xs text-slate-500 uppercase mb-2 font-semibold">Autonomous Flight</div>
        <div className="flex items-center gap-2 bg-slate-800/40 rounded p-2.5 border border-slate-700/50">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-slate-200">Navigation Active</span>
        </div>
      </div>

      {/* Features */}
      <div>
        <div className="text-xs text-slate-500 uppercase mb-2 font-semibold">Features</div>
        <div className="text-xs text-slate-400 bg-slate-800/30 rounded p-2.5 space-y-1">
          <div>• Random heading every 3-7 seconds</div>
          <div>• Smooth altitude variation</div>
          <div>• Dynamic pitch oscillation (55-75°)</div>
          <div>• Fully autonomous (no manual control)</div>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-slate-400 bg-slate-800/30 rounded p-2.5 italic">
        Aircraft will continue on autonomous random path. Click Random to return to manual control.
      </div>
    </div>
  );
}

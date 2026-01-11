interface AutoOrbitControlsProps {
  orbitCenter: [number, number] | null;
  orbitRadius: number;
  orbitSpeed: number;
}

export function AutoOrbitControls({
  orbitCenter,
  orbitRadius,
  orbitSpeed,
}: AutoOrbitControlsProps) {
  return (
    <div className="p-4 border-b border-slate-800/50">
      <div className="text-xs text-slate-500 uppercase mb-3 font-semibold">Orbit Status</div>
      <div className="space-y-2 text-sm text-slate-300">
        <div className="flex items-center gap-2 bg-slate-800/40 rounded p-2.5 border border-slate-700/50">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="font-medium">Orbiting Active</span>
        </div>

        {orbitCenter && (
          <>
            <div className="bg-slate-800/40 rounded p-2.5 border border-slate-700/50 text-[11px] font-mono">
              <div className="text-slate-400 mb-1">Center: {orbitCenter[0].toFixed(4)}°, {orbitCenter[1].toFixed(4)}°</div>
              <div className="text-cyan-300">Radius: {orbitRadius.toFixed(3)}°</div>
            </div>
            <div className="text-xs text-slate-400 bg-slate-800/30 rounded p-2 italic">
              • 60-second full rotation
              <br />
              • Right-click to set new center
              <br />
              • Double-click to fly to location
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useCacheCoverageLayer } from '@/hooks/useCacheCoverageLayer';

/**
 * Cache Coverage Checker Component
 * Toggle button to show/hide cache coverage visualization
 * Shows which locations have cached tiles
 */
export function CacheCoverageChecker() {
  const [enabled, setEnabled] = useState(false);

  // Only render the layer if enabled
  if (enabled) {
    useCacheCoverageLayer();
  }

  return (
    <div className="fixed bottom-2 right-2 z-40">
      <button
        onClick={() => setEnabled(!enabled)}
        className={`px-4 py-2 rounded font-mono text-sm transition-all border ${
          enabled
            ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
            : 'bg-slate-950/90 border-cyan-500/30 text-cyan-400 hover:border-cyan-500/60'
        }`}
        title="Toggle cache coverage visualization"
      >
        {enabled ? '✓ Cache Coverage' : 'Cache Coverage'}
      </button>
      {enabled && (
        <div className="absolute bottom-full right-0 mb-2 bg-slate-950/95 border border-green-500/30 rounded p-2 text-xs font-mono text-green-400 max-w-xs whitespace-nowrap">
          🟢 Fully cached · 🟡 Partial · 🔴 Empty
        </div>
      )}
    </div>
  );
}

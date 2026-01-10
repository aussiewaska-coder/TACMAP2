import { useMemo } from 'react';
import { useMapProviderStore, type MapProvider } from '@/stores';

const PROVIDERS: Array<{
  id: MapProvider;
  label: string;
  envKey: string;
}> = [
  { id: 'mapbox', label: 'Mapbox', envKey: 'VITE_MAPBOX_ACCESS_TOKEN' },
  { id: 'maptiler', label: 'MapTiler', envKey: 'VITE_MAPTILER_API_KEY' },
];

const MAPTILER_STYLES = [
  { id: '019ba5e4-9d97-74d1-bac9-f2e25b888881', label: 'EmergServe' },
  { id: 'streets-v2', label: 'Streets' },
  { id: 'basic-v2', label: 'Basic' },
  { id: 'outdoor-v2', label: 'Outdoor' },
  { id: 'satellite', label: 'Satellite' },
];

export function MapProviderSwitcher() {
  const provider = useMapProviderStore((state) => state.provider);
  const setProvider = useMapProviderStore((state) => state.setProvider);
  const maptilerStyle = useMapProviderStore((state) => state.maptilerStyle);
  const setMaptilerStyle = useMapProviderStore((state) => state.setMaptilerStyle);

  const envStatus = useMemo(
    () => ({
      maptiler: Boolean(import.meta.env.VITE_MAPTILER_API_KEY),
      mapbox: Boolean(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN),
    }),
    []
  );

  const handleSelect = (nextProvider: MapProvider) => {
    if (!envStatus[nextProvider]) return;
    setProvider(nextProvider);
    const url = new URL(window.location.href);
    url.searchParams.set('provider', nextProvider);
    window.history.replaceState(null, '', url.toString());
  };

  const handleMaptilerStyle = (styleId: string) => {
    if (!envStatus.maptiler) return;
    setMaptilerStyle(styleId);
    const url = new URL(window.location.href);
    url.searchParams.set('maptilerStyle', styleId);
    window.history.replaceState(null, '', url.toString());
  };

  return (
    <div className="pointer-events-auto w-[260px] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-slate-900/80 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.65)] backdrop-blur">
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.35em] text-white/50">
        <span>Map</span>
        <span className="text-[10px] text-emerald-300/80">Chooser</span>
      </div>

      <div className="mt-3 grid gap-2">
        {PROVIDERS.map((item) => {
          const isReady = envStatus[item.id];
          const isActive = provider === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              disabled={!isReady}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                isActive
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.2)]'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
              } ${!isReady ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span className="font-semibold">{item.label}</span>
              <span className="text-[10px] text-white/50">{item.envKey}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-2">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50">
          <span>MapTiler</span>
          <span className="text-[10px] text-cyan-300/80">Defaults</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {MAPTILER_STYLES.map((style) => {
            const isActive = maptilerStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => handleMaptilerStyle(style.id)}
                disabled={!envStatus.maptiler}
                className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                  isActive
                    ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                } ${!envStatus.maptiler ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MapProviderSwitcher;

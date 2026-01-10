import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Map, Shield, Sliders, Waves } from 'lucide-react';
import { useMapProviderStore } from '@/stores';

const PROVIDERS = [
  {
    id: 'mapbox' as const,
    name: 'Mapbox',
    summary: 'Gold-standard rendering engine with premium vector styles.',
    envKey: 'VITE_MAPBOX_ACCESS_TOKEN',
    badge: 'Default',
    accent: 'from-amber-400/20 via-orange-400/10 to-transparent',
    glow: 'shadow-amber-500/20',
  },
  {
    id: 'maptiler' as const,
    name: 'MapTiler',
    summary: 'Open-source engine (MapLibre) with privacy-first basemaps.',
    envKey: 'VITE_MAPTILER_API_KEY',
    badge: 'Open-source',
    accent: 'from-emerald-400/20 via-cyan-400/10 to-transparent',
    glow: 'shadow-emerald-500/20',
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const setProvider = useMapProviderStore((state) => state.setProvider);

  const envStatus = useMemo(() => ({
    maptiler: Boolean(import.meta.env.VITE_MAPTILER_API_KEY),
    mapbox: Boolean(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN),
  }), []);

  const handleLaunch = (providerId: 'maptiler' | 'mapbox') => {
    setProvider(providerId);
    setLocation(`/map?provider=${providerId}`);
  };

  const handleLaunchFlightSim = () => {
    setProvider('maptiler');
    setLocation('/flight-sim');
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950 text-white"
      style={{
        fontFamily: 'var(--recon-font-sans)',
      }}
    >
      {/* Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,_rgba(245,158,11,0.12),_transparent_55%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-16 pt-16">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/60">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live readiness
            </div>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Hello, welcome to <span className="text-emerald-300">RECONMAP</span>.
            </h1>
            <p className="max-w-xl text-lg text-white/70">
              A modular AU emergency and police alerts platform. Choose your map engine, deploy the plugin,
              and instantly serve live alerts, Waze sweeps, heatmaps, and operational filters.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Shield className="h-4 w-4 text-emerald-300" />
                  Emergency alerts
                </div>
                <p className="mt-2 text-xs text-white/50">Multi-feed registry, CAP/RSS/GeoJSON normalizers.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Waves className="h-4 w-4 text-cyan-300" />
                  Police sweep
                </div>
                <p className="mt-2 text-xs text-white/50">Waze ingest with persistence + heatmap overlays.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Sliders className="h-4 w-4 text-amber-300" />
                  Ops filters
                </div>
                <p className="mt-2 text-xs text-white/50">State, hazard, and severity controls for quick triage.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Map className="h-4 w-4 text-white/70" />
                  Swap map engines
                </div>
                <p className="mt-2 text-xs text-white/50">Mapbox or MapTiler, same alerts pipeline.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Map Providers</p>
                <h2 className="mt-2 text-2xl font-semibold">Select your engine</h2>
              </div>
              <span
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60"
                style={{ fontFamily: 'var(--recon-font-mono)' }}
              >
                Plug-in ready
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              {PROVIDERS.map((provider) => {
                const isReady = envStatus[provider.id];
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleLaunch(provider.id)}
                    className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-2xl ${provider.glow}`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${provider.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{provider.name}</h3>
                          <p className="text-xs text-white/50">{provider.badge}</p>
                        </div>
                        <div
                          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                            isReady
                              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                              : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                          }`}
                          style={{ fontFamily: 'var(--recon-font-mono)' }}
                        >
                          {isReady ? 'Key ready' : 'Key missing'}
                        </div>
                      </div>
                      <p className="text-sm text-white/70">{provider.summary}</p>
                      <div className="flex items-center justify-between text-xs text-white/50">
                        <span style={{ fontFamily: 'var(--recon-font-mono)' }}>{provider.envKey}</span>
                        <span className="inline-flex items-center gap-1 text-white/70">
                          Launch dashboard
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Flight Simulator</p>
                  <h3 className="mt-1 text-lg font-semibold text-emerald-200">Cinematic MapTiler Flight</h3>
                  <p className="mt-1 text-sm text-emerald-50/70">Launch the stealth aircraft sim (MapLibre + MapTiler, orbit + click-to-target).</p>
                </div>
                <button
                  type="button"
                  onClick={handleLaunchFlightSim}
                  className="rounded-full border border-emerald-300/60 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-300/20"
                  style={{ fontFamily: 'var(--recon-font-mono)' }}
                >
                  Launch
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-xs text-white/60">
          <div className="flex items-center gap-3" style={{ fontFamily: 'var(--recon-font-mono)' }}>
            <span className="text-emerald-300">RECONMAP v0.1</span>
            <span className="text-white/30">/</span>
            <span>Alert plugin online</span>
          </div>
          <div className="text-white/50">Select a provider to initialize the map and load the alerts system.</div>
        </section>
      </main>
    </div>
  );
}

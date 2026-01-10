import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { AlertTriangle, Radio, Shield, Scan, Flame, Layers, MapPin, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMapProviderStore, useMapStore } from '@/stores';
import { trpc } from '@/lib/trpc';
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts';
import { useUnifiedAlerts } from '@/hooks/useUnifiedAlerts';
import { useHeatmap, HEATMAP_SCHEMES, HeatmapColorScheme } from '@/hooks/useHeatmap';

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'AUS'] as const;

const HAZARD_TYPES = [
  { id: 'fire', label: 'Fire', accent: 'border-rose-500/40 text-rose-200' },
  { id: 'flood', label: 'Flood', accent: 'border-cyan-400/40 text-cyan-200' },
  { id: 'road', label: 'Road', accent: 'border-amber-400/40 text-amber-200' },
  { id: 'space', label: 'Space', accent: 'border-purple-400/40 text-purple-200' },
  { id: 'general', label: 'General', accent: 'border-slate-400/40 text-slate-200' },
];

type AlertMode = 'emergency' | 'police';

type OpsMode = 'all' | 'warning' | 'ground_truth';

interface AlertsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AlertsSidebar({ collapsed, onToggle }: AlertsSidebarProps) {
  const [, setLocation] = useLocation();
  const provider = useMapProviderStore((state) => state.provider);
  const map = useMapStore((state) => state.map);

  const [enabled, setEnabled] = useState(true);
  const [alertMode, setAlertMode] = useState<AlertMode>('emergency');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [heatmapScheme, setHeatmapScheme] = useState<HeatmapColorScheme>('thermal');

  const [activeFilters, setActiveFilters] = useState<string[]>(HAZARD_TYPES.map((h) => h.id));
  const [opsMode, setOpsMode] = useState<OpsMode>('all');
  const [selectedStates, setSelectedStates] = useState<string[]>([...STATES]);
  const [hoursAgo, setHoursAgo] = useState(336);

  const hasAutoSwept = useRef(false);

  useEffect(() => {
    if (showHeatmap && alertMode === 'police') {
      setShowMarkers(false);
    }
  }, [showHeatmap, alertMode]);

  useEffect(() => {
    if (alertMode === 'emergency') {
      setShowHeatmap(false);
      setShowMarkers(true);
    }
  }, [alertMode]);

  const utils = trpc.useUtils();
  const { data: rawEmergencyData, isLoading: emergencyLoading } = useEmergencyAlerts(enabled && alertMode === 'emergency');

  const sweepMutation = trpc.waze.getAlertsAndJams.useMutation({
    onSuccess: (data) => {
      const count = data.count || 0;
      if (count > 0) {
        toast.success('Sweep complete', {
          description: `Found ${count} new alerts`,
          duration: 3000,
        });
        utils.police.list.invalidate();
      } else {
        toast.info('Sweep complete', {
          description: 'No new alerts detected',
          duration: 2500,
        });
      }
    },
    onError: (err) => {
      toast.error('Sweep failed', {
        description: err.message || 'Unable to scan area',
        duration: 3000,
      });
    },
  });

  const { data: policeReports, isLoading: policeLoading } = trpc.police.list.useQuery(
    { hoursAgo },
    {
      enabled: enabled && alertMode === 'police',
      refetchInterval: 60000,
    }
  );

  useEffect(() => {
    if (alertMode === 'police' && policeReports?.length === 0 && !hasAutoSwept.current && map) {
      hasAutoSwept.current = true;
      const bounds = map.getBounds();
      const bottomLeft = `${bounds.getSouth()},${bounds.getWest()}`;
      const topRight = `${bounds.getNorth()},${bounds.getEast()}`;
      sweepMutation.mutate({
        bottomLeft,
        topRight,
        radiusUnits: 'KM',
        maxAlerts: 100,
        maxJams: 0,
      });
    }
  }, [alertMode, policeReports, map, sweepMutation]);

  const handleSweep = () => {
    if (!map) {
      toast.error('Map not ready');
      return;
    }
    const bounds = map.getBounds();
    const center = map.getCenter();
    const zoom = map.getZoom();

    const width = bounds.getEast() - bounds.getWest();
    const height = bounds.getNorth() - bounds.getSouth();
    const approxWidth = Math.round(width * 111 * Math.cos(center.lat * Math.PI / 180));
    const approxHeight = Math.round(height * 111);

    const bottomLeft = `${bounds.getSouth()},${bounds.getWest()}`;
    const topRight = `${bounds.getNorth()},${bounds.getEast()}`;

    toast.loading('Sweeping area', {
      description: `${approxWidth}×${approxHeight} km @ ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)} (z${zoom.toFixed(1)})`,
      duration: 8000,
      id: 'police-sweep',
    });

    sweepMutation.mutate(
      {
        bottomLeft,
        topRight,
        radiusUnits: 'KM',
        maxAlerts: 100,
        maxJams: 0,
      },
      {
        onSettled: () => toast.dismiss('police-sweep'),
      }
    );
  };

  const filteredEmergencyData = useMemo(() => {
    if (!rawEmergencyData || alertMode !== 'emergency') return null;

    const filteredFeatures = rawEmergencyData.features
      .map((feature: any) => {
        const props = feature.properties || {};
        const sub = (props.hazard_type || '').toLowerCase();
        const sub2 = (props.subcategory || '').toLowerCase();
        const cat = (props.category || '').toLowerCase();
        const tags = (props.tags || []).map((t: string) => t.toLowerCase());

        const isFire = sub.includes('fire') || cat.includes('fire') || sub2.includes('fire') || tags.includes('fire') || sub.includes('bushfire');
        const isFlood = sub.includes('flood') || sub.includes('storm') || cat.includes('weather') || sub2.includes('storm');
        const isRoad = sub.includes('road') || sub.includes('traffic') || cat.includes('transport') || sub.includes('crash');
        const isSpace = sub.includes('space') || sub.includes('solar') || cat.includes('space');
        const isGroundTruth = tags.includes('fire_ground_truth') || tags.includes('operational') || tags.includes('ground_truth');
        const isWarning = tags.includes('public_warning') || !isGroundTruth;

        const matchesOps =
          opsMode === 'all' ||
          (opsMode === 'ground_truth' && isGroundTruth) ||
          (opsMode === 'warning' && isWarning);

        const matchesFilter =
          matchesOps &&
          ((activeFilters.includes('fire') && isFire) ||
            (activeFilters.includes('flood') && isFlood) ||
            (activeFilters.includes('road') && isRoad) ||
            (activeFilters.includes('space') && isSpace) ||
            (activeFilters.includes('general') && !isFire && !isFlood && !isRoad && !isSpace));

        const alertState = props.state?.toUpperCase() || 'AUS';
        const matchesState = selectedStates.includes(alertState);

        if (!matchesFilter || !matchesState) return null;

        return feature;
      })
      .filter(Boolean);

    return {
      ...rawEmergencyData,
      features: filteredFeatures,
    };
  }, [rawEmergencyData, alertMode, activeFilters, opsMode, selectedStates]);

  const currentData = alertMode === 'emergency' ? filteredEmergencyData : policeReports;
  const isLoading = alertMode === 'emergency' ? emergencyLoading : policeLoading;

  const { alertCount } = useUnifiedAlerts({
    enabled,
    alertSource: alertMode,
    data: currentData ?? null,
    showMarkers,
    layerPrefix: `recon-${alertMode}`,
    clusterRadius: 60,
    clusterMaxZoom: 14,
  });

  const { heatmapCount } = useHeatmap({
    enabled: showHeatmap && alertMode === 'police',
    hoursAgo,
    colorScheme: heatmapScheme,
  });

  if (collapsed) {
    return (
      <div className="fixed left-4 top-1/2 z-40 -translate-y-1/2">
        <button
          type="button"
          onClick={onToggle}
          className="group flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-white/15 bg-slate-900/80 text-white shadow-2xl backdrop-blur transition hover:border-emerald-400/50"
        >
          <AlertTriangle className="h-5 w-5 text-emerald-300" />
          <span className="mt-1 text-[10px] font-semibold">{alertCount}</span>
        </button>
      </div>
    );
  }

  return (
    <aside className="fixed inset-y-4 left-4 z-30 flex w-[360px] max-w-[92vw] flex-col rounded-3xl border border-white/10 bg-slate-950/85 shadow-[0_25px_80px_rgba(15,23,42,0.6)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Recon Alerts
          </div>
          <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-5 w-5 text-emerald-300" />
            Alerts Command
          </h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
            {provider}
          </Badge>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocation('/')}
              className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white"
            >
              Switch
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">System</p>
              <p className="text-sm text-white/70">Alerts pipeline</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-black/40 p-1">
            <button
              onClick={() => setAlertMode('emergency')}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                alertMode === 'emergency'
                  ? 'bg-emerald-500/30 text-emerald-200'
                  : 'text-white/40 hover:bg-white/5'
              }`}
            >
              <AlertTriangle className="mr-2 inline h-3.5 w-3.5" />
              Emergency
            </button>
            <button
              onClick={() => setAlertMode('police')}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                alertMode === 'police'
                  ? 'bg-blue-500/30 text-blue-200'
                  : 'text-white/40 hover:bg-white/5'
              }`}
            >
              <Radio className="mr-2 inline h-3.5 w-3.5" />
              Police
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Visuals</p>
              <p className="text-sm text-white/70">Map overlays</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-white/60">
            <Label htmlFor="show-markers" className="cursor-pointer">Show markers</Label>
            <Switch id="show-markers" checked={showMarkers} onCheckedChange={setShowMarkers} />
          </div>

          {alertMode === 'police' && (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowHeatmap((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  showHeatmap
                    ? 'border-orange-400/40 bg-orange-400/10 text-orange-200'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Flame className="h-4 w-4" /> Heatmap
                </span>
                <span className="text-[10px]">{heatmapCount} nodes</span>
              </button>
              {showHeatmap && (
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(HEATMAP_SCHEMES) as HeatmapColorScheme[]).map((scheme) => (
                    <button
                      key={scheme}
                      type="button"
                      onClick={() => setHeatmapScheme(scheme)}
                      className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                        heatmapScheme === scheme
                          ? 'border-white/50 bg-white/15 text-white'
                          : 'border-white/10 text-white/40 hover:border-white/30'
                      }`}
                    >
                      {HEATMAP_SCHEMES[scheme].name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {alertMode === 'emergency' && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Filters</p>
                <p className="text-sm text-white/70">Hazard types</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {HAZARD_TYPES.map((type) => {
                const isActive = activeFilters.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() =>
                      setActiveFilters((prev) =>
                        prev.includes(type.id) ? prev.filter((f) => f !== type.id) : [...prev, type.id]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] transition ${
                      isActive ? type.accent : 'border-white/10 text-white/40 hover:border-white/30'
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-black/40 p-1">
              {['all', 'warning', 'ground_truth'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setOpsMode(mode as OpsMode)}
                  className={`rounded-lg py-1 text-[10px] uppercase tracking-[0.2em] transition ${
                    opsMode === mode
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:bg-white/5'
                  }`}
                >
                  {mode === 'all' ? 'All' : mode === 'warning' ? 'Warnings' : 'Ground'}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/40">
                <span>States</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedStates((prev) =>
                      prev.length === STATES.length ? [] : [...STATES]
                    )
                  }
                  className="text-white/50 hover:text-white"
                >
                  {selectedStates.length === STATES.length ? 'None' : 'All'}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {STATES.map((state) => {
                  const isActive = selectedStates.includes(state);
                  return (
                    <button
                      key={state}
                      type="button"
                      onClick={() =>
                        setSelectedStates((prev) =>
                          prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
                        )
                      }
                      className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                        isActive ? 'border-cyan-400/40 text-cyan-200' : 'border-white/10 text-white/40'
                      }`}
                    >
                      {state}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {alertMode === 'police' && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Scan window</p>
                <p className="text-sm text-white/70">Time range</p>
              </div>
              <Badge className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
                {hoursAgo > 48 ? `${Math.round(hoursAgo / 24)}d` : `${hoursAgo}h`}
              </Badge>
            </div>
            <div className="mt-3">
              <Slider
                value={[hoursAgo]}
                onValueChange={(value) => setHoursAgo(value[0])}
                min={1}
                max={336}
                step={1}
              />
              <div className="mt-2 flex justify-between text-[10px] text-white/40">
                <span>1h</span>
                <span>14d</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
              onClick={handleSweep}
              disabled={sweepMutation.isPending}
            >
              <Scan className={`mr-2 h-4 w-4 ${sweepMutation.isPending ? 'animate-spin' : ''}`} />
              {sweepMutation.isPending ? 'Sweeping...' : 'Sweep Area'}
            </Button>
          </section>
        )}
      </div>

      <footer className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-emerald-300" />
            {isLoading ? 'Syncing alerts...' : `${alertCount} live alerts`}
          </span>
          <span className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-cyan-300" />
            {enabled ? 'Active' : 'Paused'}
          </span>
        </div>
      </footer>
    </aside>
  );
}

export default AlertsSidebar;

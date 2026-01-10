import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle,
  Radio,
  Shield,
  Scan,
  Flame,
  Layers,
  MapPin,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Map,
  X,
  Settings,
  Trash2,
  Database,
  Loader2,
  Plane,
  Target,
} from 'lucide-react';
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
import { useFlyToAndOrbit } from '@/hooks/useFlyToAndOrbit';

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'AUS'] as const;

const HAZARD_TYPES = [
  { id: 'fire', label: 'Fire', accent: 'border-rose-500/40 text-rose-200' },
  { id: 'flood', label: 'Flood', accent: 'border-cyan-400/40 text-cyan-200' },
  { id: 'road', label: 'Road', accent: 'border-amber-400/40 text-amber-200' },
  { id: 'space', label: 'Space', accent: 'border-purple-400/40 text-purple-200' },
  { id: 'general', label: 'General', accent: 'border-slate-400/40 text-slate-200' },
];

const MAPTILER_STYLES = [
  { id: '019ba6b7-5a01-7042-bc9a-d1ace6393958', label: 'EmergServe' },
  { id: 'streets-v2', label: 'Streets' },
  { id: 'basic-v2', label: 'Basic' },
  { id: 'outdoor-v2', label: 'Outdoor' },
  { id: 'satellite', label: 'Satellite' },
];

// ATAK Maps - organized by provider (filtered to standard TMS format only)
const ATAK_MAPS_BY_PROVIDER = [
  {
    provider: 'Google',
    maps: [
      { id: 'atak-google-roadmap', label: 'Google - Roadmap', url: 'http://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}' },
      { id: 'atak-google-satellite', label: 'Google - Satellite', url: 'http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}' },
      { id: 'atak-google-hybrid', label: 'Google - Hybrid', url: 'http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' },
      { id: 'atak-google-terrain', label: 'Google - Terrain', url: 'http://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}' },
    ],
  },
  {
    provider: 'Esri',
    maps: [
      { id: 'atak-esri-world-topo', label: 'Esri - World Topo', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}' },
      { id: 'atak-esri-nat-geo', label: 'Esri - Nat Geo World', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}' },
      { id: 'atak-esri-usa-topo', label: 'Esri - USA Topo Maps', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}' },
      { id: 'atak-esri-clarity', label: 'Esri - Clarity', url: 'http://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    ],
  },
  {
    provider: 'USGS',
    maps: [
      { id: 'atak-usgs-topo', label: 'USGS - Topo', url: 'https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}' },
      { id: 'atak-usgs-imagery', label: 'USGS - Imagery Only', url: 'https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}' },
      { id: 'atak-usgs-imagery-topo', label: 'USGS - Imagery Topo', url: 'https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}' },
      { id: 'atak-usgs-shaded-relief', label: 'USGS - Shaded Relief', url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}' },
    ],
  },
  {
    provider: 'NAIP (USDA)',
    maps: [
      { id: 'atak-naip-conus-prime', label: 'NAIP - USDA CONUS Prime', url: 'https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/tile/{z}/{y}/{x}' },
      { id: 'atak-naip-national-map', label: 'NAIP - USGS National Map', url: 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/tile/{z}/{y}/{x}' },
    ],
  },
  {
    provider: 'OpenSeaMap',
    maps: [
      { id: 'atak-openseamap-base', label: 'OpenSeaMap - Base Chart', url: 'https://t2.openseamap.org/tiles/base/{z}/{x}/{y}.png' },
      { id: 'atak-openseamap-seamarks', label: 'OpenSeaMap - Seamarks', url: 'https://t1.openseamap.org/seamark/{z}/{x}/{y}.png' },
    ],
  },
  {
    provider: 'Specialty',
    maps: [
      { id: 'atak-cycleosm', label: 'CycleOSM - Bike Routes', url: 'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png' },
      { id: 'atak-mtbmap', label: 'MTBMap - Mountain Bike', url: 'http://tile.mtbmap.cz/mtbmap_tiles/{z}/{x}/{y}.png' },
      { id: 'atak-finland', label: 'Finland - National Land Survey', url: 'https://tiles.kartat.kapsi.fi/peruskartta/{z}/{x}/{y}.jpg' },
      { id: 'atak-poland', label: 'Poland - Ortofoto Std', url: 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&STYLE=default&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg' },
      { id: 'atak-canada-topo', label: 'Canada - Toporama', url: 'https://maps.geogratis.gc.ca/wms/toporama_en?' },
    ],
  },
];

const PANEL_MARGIN = 16;

type AlertMode = 'emergency' | 'police';
type OpsMode = 'all' | 'warning' | 'ground_truth';
type PanelTab = 'alerts' | 'map' | 'settings' | 'controls' | 'targets';

interface AlertsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

type CacheType = 'style' | 'tile' | 'sprite' | 'glyph' | 'tilejson';

const CACHE_TYPES: { type: CacheType; label: string; description: string; dangerous?: boolean }[] = [
  { type: 'style', label: 'Styles', description: 'Map style JSON' },
  { type: 'tile', label: 'Tiles', description: 'PERMANENT cache', dangerous: true },
  { type: 'sprite', label: 'Sprites', description: 'Icon sprites' },
  { type: 'glyph', label: 'Glyphs', description: 'Font glyphs' },
  { type: 'tilejson', label: 'TileJSON', description: 'Tile metadata' },
];

function SettingsTab() {
  const [clearing, setClearing] = useState<CacheType | null>(null);
  const [tileConfirmStep, setTileConfirmStep] = useState(0);

  const clearCache = async (type: CacheType) => {
    setClearing(type);
    try {
      const response = await fetch('/api/maptiler/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Cleared ${data.cleared} cached items`, {
          description: `${type} cache cleared successfully`,
        });
      } else {
        toast.error('Failed to clear cache', {
          description: data.error || 'Unknown error',
        });
      }
    } catch (error) {
      toast.error('Failed to clear cache', {
        description: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setClearing(null);
    }
  };

  const handleCacheClick = (type: CacheType) => {
    // Reset tile confirmation if clicking something else
    if (type !== 'tile') {
      setTileConfirmStep(0);
      clearCache(type);
      return;
    }

    // TILE: 2-step confirmation
    if (tileConfirmStep === 0) {
      setTileConfirmStep(1);
      toast('⚠️ WARNING: Tile cache is PERMANENT', {
        description: 'Click AGAIN to confirm. This will cost API calls to rebuild!',
        duration: 8000,
        style: { background: '#7f1d1d', border: '1px solid #dc2626', color: '#fecaca' },
      });
      return;
    }

    if (tileConfirmStep === 1) {
      setTileConfirmStep(2);
      toast('🚨 FINAL WARNING', {
        description: 'Click ONE MORE TIME to delete all cached tiles forever.',
        duration: 8000,
        style: { background: '#450a0a', border: '2px solid #ef4444', color: '#fca5a5' },
      });
      return;
    }

    // Step 2 - actually clear
    setTileConfirmStep(0);
    clearCache(type);
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Redis Cache Management */}
      <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Cache</p>
            <p className="text-sm text-emerald-100/70">Redis MapTiler Cache</p>
          </div>
          <Database className="h-5 w-5 text-emerald-400/60" />
        </div>
        <p className="mt-2 text-xs text-emerald-100/50">
          Clear cached map resources from Redis. Use when tiles appear stale or after style updates.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {CACHE_TYPES.map((cache) => {
            const isClearing = clearing === cache.type;
            const isDangerous = cache.dangerous;
            const isTileConfirming = cache.type === 'tile' && tileConfirmStep > 0;
            return (
              <button
                key={cache.type}
                type="button"
                disabled={clearing !== null}
                onClick={() => handleCacheClick(cache.type)}
                className={`flex h-14 flex-col items-center justify-center rounded-xl border px-2 text-center transition active:scale-[0.98] disabled:opacity-50 md:h-auto md:rounded-lg md:py-2 ${
                  isDangerous || isTileConfirming
                    ? isTileConfirming
                      ? 'border-rose-400/60 bg-rose-500/30 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse'
                      : 'border-rose-400/30 bg-rose-500/10 text-rose-200 hover:border-rose-300/50 hover:bg-rose-500/20'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-sm font-medium md:text-xs">
                      <Trash2 className="h-3 w-3" />
                      {isTileConfirming ? `CONFIRM ${tileConfirmStep}/2` : cache.label}
                    </span>
                    <span className="text-[10px] opacity-60">
                      {isTileConfirming ? 'CLICK TO CONFIRM!' : cache.description}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Environment Info */}
      <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Environment</p>
            <p className="text-sm text-emerald-100/70">System info</p>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-xs text-emerald-100/50">
          <div className="flex justify-between">
            <span>MapTiler Style</span>
            <span className="font-mono text-emerald-300/70">
              {import.meta.env.VITE_MAPTILER_STYLE?.slice(0, 8) || 'Not set'}...
            </span>
          </div>
          <div className="flex justify-between">
            <span>API Key</span>
            <span className="font-mono text-emerald-300/70">
              {import.meta.env.VITE_MAPTILER_API_KEY ? '••••••••' : 'Not set'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AlertsSidebar({ collapsed, onToggle }: AlertsSidebarProps) {
  const [, setLocation] = useLocation();
  const provider = useMapProviderStore((state) => state.provider);
  const maptilerStyle = useMapProviderStore((state) => state.maptilerStyle);
  const setMaptilerStyle = useMapProviderStore((state) => state.setMaptilerStyle);
  const map = useMapStore((state) => state.map);

  const [activeTab, setActiveTab] = useState<PanelTab>('alerts');
  const [enabled, setEnabled] = useState(true);
  const [alertMode, setAlertMode] = useState<AlertMode>('emergency');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);
  const [showAlertGeometry, setShowAlertGeometry] = useState(false); // Off by default
  const [heatmapScheme, setHeatmapScheme] = useState<HeatmapColorScheme>('thermal');

  const [activeFilters, setActiveFilters] = useState<string[]>(HAZARD_TYPES.map((h) => h.id));
  const [opsMode, setOpsMode] = useState<OpsMode>('all');
  const [selectedStates, setSelectedStates] = useState<string[]>([...STATES]);
  const [hoursAgo, setHoursAgo] = useState(1);

  // Label visibility state
  const [labelsVisible, setLabelsVisible] = useState({
    cities: true,
    suburbs: true,
    towns: true,
    roads: true,
  });

  // Targets tab state
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [targetFilter, setTargetFilter] = useState<'all' | 'emergency' | 'police'>('all');
  const [targetSort, setTargetSort] = useState<'severity' | 'time' | 'distance'>('severity');

  // ATAK Maps state
  const [selectedAtakMapId, setSelectedAtakMapId] = useState<string | null>(null);
  const [expandedAtakProvider, setExpandedAtakProvider] = useState<string | null>(null);

  const hasAutoSwept = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);

  const [panelSide, setPanelSide] = useState<'left' | 'right'>('left');
  const [panelTop, setPanelTop] = useState(PANEL_MARGIN);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (showHeatmap && alertMode === 'police') {
      setShowMarkers(false);
    }
  }, [showHeatmap, alertMode]);

  useEffect(() => {
    if (alertMode === 'emergency') {
      setShowHeatmap(false);
    }
  }, [alertMode]);

  // Toggle alert geometry visibility
  useEffect(() => {
    if (!map) return;
    const alertLayers = ['recon-emergency-polygons', 'recon-emergency-outline', 'recon-emergency-dots'];
    alertLayers.forEach(layer => {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', showAlertGeometry ? 'visible' : 'none');
      }
    });
  }, [map, showAlertGeometry]);

  // Toggle label visibility
  const toggleLabel = useCallback((labelType: keyof typeof labelsVisible) => {
    if (!map) return;

    const layerPatterns: Record<string, string[]> = {
      cities: ['place_city', 'place-city'],
      suburbs: ['place_suburb', 'place_neighbourhood', 'place_neighborhood', 'place-suburb'],
      towns: ['place_town', 'place_village', 'place-town', 'place-village'],
      roads: ['road_label', 'road-label', 'street_label', 'street-label'],
    };

    const patterns = layerPatterns[labelType] || [];
    const style = map.getStyle();

    if (!style?.layers) return;

    const newState = !labelsVisible[labelType];

    style.layers.forEach((layer: any) => {
      if (layer.type === 'symbol') {
        const matches = patterns.some(pattern =>
          layer.id.toLowerCase().includes(pattern.toLowerCase())
        );
        if (matches) {
          try {
            map.setLayoutProperty(layer.id, 'visibility', newState ? 'visible' : 'none');
          } catch (e) {
            // Layer may not exist
          }
        }
      }
    });

    setLabelsVisible(prev => ({ ...prev, [labelType]: newState }));
  }, [map, labelsVisible]);

  const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile) return; // Disable drag on mobile
    if (event.button !== 0 || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const startPosition = { x: rect.left, y: rect.top };
    dragPositionRef.current = startPosition;
    setDragPosition(startPosition);
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (event: PointerEvent) => {
      if (!panelRef.current || !dragOffsetRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const panelWidth = rect.width;
      const panelHeight = rect.height;
      const minX = PANEL_MARGIN;
      const minY = PANEL_MARGIN;
      const maxX = Math.max(PANEL_MARGIN, window.innerWidth - panelWidth - PANEL_MARGIN);
      const maxY = Math.max(PANEL_MARGIN, window.innerHeight - panelHeight - PANEL_MARGIN);
      const nextX = clampValue(event.clientX - dragOffsetRef.current.x, minX, maxX);
      const nextY = clampValue(event.clientY - dragOffsetRef.current.y, minY, maxY);
      const nextPosition = { x: nextX, y: nextY };
      dragPositionRef.current = nextPosition;
      setDragPosition(nextPosition);
    };

    const handleUp = () => {
      const finalPosition = dragPositionRef.current;
      if (finalPosition && panelRef.current) {
        const panelWidth = panelRef.current.getBoundingClientRect().width;
        const nextSide = finalPosition.x + panelWidth / 2 >= window.innerWidth / 2 ? 'right' : 'left';
        setPanelSide(nextSide);
        setPanelTop(finalPosition.y);
      }
      dragOffsetRef.current = null;
      dragPositionRef.current = null;
      setIsDragging(false);
      setDragPosition(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  useEffect(() => {
    if (!collapsed) return;
    dragOffsetRef.current = null;
    dragPositionRef.current = null;
    setIsDragging(false);
    setDragPosition(null);
  }, [collapsed]);

  const handleMaptilerStyle = (styleId: string) => {
    setMaptilerStyle(styleId);
    const url = new URL(window.location.href);
    url.searchParams.set('maptilerStyle', styleId);
    window.history.replaceState(null, '', url.toString());
  };

  /**
   * Handle switching to an ATAK map (custom TMS source)
   * Adds or updates a raster source with the ATAK map tiles
   */
  const handleAtakMapSelect = (mapId: string, mapUrl: string) => {
    if (!map || !isLoaded) {
      toast.error('Map not ready', { description: 'Please wait for map to load', duration: 2000 });
      return;
    }

    try {
      setSelectedAtakMapId(mapId);

      // Source ID for ATAK maps
      const sourceId = 'atak-tiles';
      const layerId = 'atak-layer';

      // Remove existing ATAK layer and source if present
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      // Add new raster source with ATAK map tiles
      map.addSource(sourceId, {
        type: 'raster',
        url: mapUrl,
        tileSize: 256,
      });

      // Add raster layer
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {},
      });

      // Move ATAK layer below any annotation layers
      const layers = map.getStyle().layers;
      if (layers) {
        for (let i = layers.length - 1; i >= 0; i--) {
          const layer = layers[i];
          if (layer.id && (layer.id.includes('label') || layer.id.includes('annotation'))) {
            map.moveLayer(layerId, layer.id);
            break;
          }
        }
      }

      // Find map label and show toast
      const selectedMap = ATAK_MAPS_BY_PROVIDER.flatMap(p => p.maps).find(m => m.id === mapId);
      if (selectedMap) {
        toast.success('Map loaded', { description: selectedMap.label, duration: 2000 });
      }
    } catch (error) {
      console.error('Error loading ATAK map:', error);
      toast.error('Failed to load map', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 2000,
      });
    }
  };

  const utils = trpc.useUtils();
  const isLoaded = useMapStore((state) => state.isLoaded);
  const { data: rawEmergencyData, isLoading: emergencyLoading } = useEmergencyAlerts(enabled && alertMode === 'emergency');

  // Hook for smooth fly-to and orbit animations on target selection
  const { flyToAndOrbit, stopOrbit } = useFlyToAndOrbit();

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
    clusterRadius: 30,
    clusterMaxZoom: 14,
  });

  const { heatmapCount } = useHeatmap({
    enabled: showHeatmap && alertMode === 'police',
    hoursAgo,
    colorScheme: heatmapScheme,
  });

  // Mobile: full-screen overlay
  // Desktop: draggable panel
  const panelStyle = isMobile
    ? {}
    : dragPosition
      ? { left: dragPosition.x, top: dragPosition.y, right: 'auto' }
      : panelSide === 'left'
        ? { left: PANEL_MARGIN, top: panelTop, right: 'auto' }
        : { right: PANEL_MARGIN, top: panelTop, left: 'auto' };

  const panelTransform = isMobile
    ? collapsed
      ? 'translate-y-full'
      : 'translate-y-0'
    : collapsed
      ? panelSide === 'left'
        ? '-translate-x-[115%]'
        : 'translate-x-[115%]'
      : 'translate-x-0';

  const collapsedButtonStyle = isMobile
    ? { bottom: 24, left: '50%', transform: 'translateX(-50%)' }
    : {
        top: panelTop + 24,
        ...(panelSide === 'left' ? { left: PANEL_MARGIN } : { right: PANEL_MARGIN }),
      };

  const CollapseIcon = panelSide === 'left' ? ChevronLeft : ChevronRight;
  const RevealIcon = panelSide === 'left' ? ChevronRight : ChevronLeft;

  // ===== TARGETS TAB HELPERS =====

  /**
   * Extract coordinates from either emergency (GeoJSON) or police alert
   */
  const getAlertCoordinates = (alert: any): [number, number] | null => {
    // Emergency alerts (GeoJSON)
    if (alert.geometry?.type === 'Point') {
      return alert.geometry.coordinates as [number, number];
    }
    if (alert.geometry?.type === 'Polygon') {
      // Calculate centroid of polygon
      const coords = alert.geometry.coordinates[0];
      const centroid = coords.reduce(
        (acc: [number, number], [lng, lat]: [number, number]) => [acc[0] + lng, acc[1] + lat],
        [0, 0]
      ).map((v: number) => v / coords.length) as [number, number];
      return centroid;
    }

    // Police alerts (lat/lng properties)
    if (alert.latitude && alert.longitude) {
      return [alert.longitude, alert.latitude];
    }

    return null;
  };

  /**
   * Haversine distance in km between two coordinates
   */
  const haversineDistance = (
    [lon1, lat1]: [number, number],
    [lon2, lat2]: [number, number]
  ): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Calculate distance from current map center to an alert
   */
  const getDistance = (alert: any): number => {
    const mapCenter = map?.getCenter();
    if (!mapCenter) return Infinity;

    const alertCoords = getAlertCoordinates(alert);
    if (!alertCoords) return Infinity;

    return haversineDistance(
      [mapCenter.lng, mapCenter.lat],
      alertCoords
    );
  };

  /**
   * Get emoji icon for hazard type
   */
  const getHazardIcon = (hazardType: string): string => {
    switch (hazardType?.toLowerCase()) {
      case 'fire':
      case 'bushfire':
        return '🔥';
      case 'flood':
      case 'storm':
        return '💧';
      case 'road':
      case 'traffic':
      case 'crash':
        return '🚗';
      case 'space':
      case 'solar':
        return '🛰️';
      default:
        return '⚠️';
    }
  };

  /**
   * Format seconds or date into human readable age string
   */
  const formatAge = (value: number | Date | string): string => {
    let seconds: number;

    if (typeof value === 'number') {
      seconds = value;
    } else if (value instanceof Date) {
      seconds = Math.floor((Date.now() - value.getTime()) / 1000);
    } else if (typeof value === 'string') {
      seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    } else {
      return 'Unknown';
    }

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  /**
   * Combined and sorted alerts for Targets tab
   */
  const sortedTargets = useMemo(() => {
    // Combine emergency + police alerts with type marker
    const combined: any[] = [];

    if (filteredEmergencyData?.features) {
      combined.push(
        ...filteredEmergencyData.features.map((f: any) => ({
          ...f,
          alertType: 'emergency',
          _id: f.properties?.id || f.id,
        }))
      );
    }

    if (policeReports) {
      combined.push(
        ...policeReports.map((p: any) => ({
          ...p,
          alertType: 'police',
          _id: p.alertId,
        }))
      );
    }

    // Filter by type
    const filtered = combined.filter((a) =>
      targetFilter === 'all' || a.alertType === targetFilter
    );

    // Sort by selected criteria
    return filtered.sort((a, b) => {
      if (targetSort === 'severity') {
        return (b.properties?.severity_rank || 0) - (a.properties?.severity_rank || 0);
      }
      if (targetSort === 'time') {
        // Emergency: age_s (seconds), Police: createdAt (date)
        const ageA = a.properties?.age_s ?? (a.createdAt ? Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 1000) : Infinity);
        const ageB = b.properties?.age_s ?? (b.createdAt ? Math.floor((Date.now() - new Date(b.createdAt).getTime()) / 1000) : Infinity);
        return ageA - ageB;
      }
      // distance - calculate from current map center
      return getDistance(a) - getDistance(b);
    });
  }, [filteredEmergencyData, policeReports, targetFilter, targetSort, map?.getCenter()]);

  /**
   * Handle target card click - fly to and orbit
   */
  const handleTargetClick = (alert: any) => {
    const coords = getAlertCoordinates(alert);
    if (!coords) {
      toast.error('Unable to locate target', {
        description: 'Coordinates unavailable',
        duration: 2000,
      });
      return;
    }

    const alertId = alert.properties?.id || alert.alertId;
    setSelectedTargetId(alertId);

    // Zoom wider for polygons, tighter for points
    const zoom = alert.geometry?.type === 'Polygon' ? 11 : 13;

    flyToAndOrbit(coords, { zoom, pitch: 60 });

    const title = alert.properties?.title || `${alert.type} - ${alert.subtype}`;
    toast.success('Target acquired', {
      description: title,
      duration: 2000,
    });
  };

  /**
   * Stop orbit when user interacts with map
   */
  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleInteraction = () => {
      stopOrbit();
      setSelectedTargetId(null);
    };

    map.on('mousedown', handleInteraction);
    map.on('touchstart', handleInteraction);
    map.on('wheel', handleInteraction);

    return () => {
      map.off('mousedown', handleInteraction);
      map.off('touchstart', handleInteraction);
      map.off('wheel', handleInteraction);
    };
  }, [map, isLoaded, stopOrbit]);

  /**
   * Stop orbit when switching tabs or collapsing sidebar
   */
  useEffect(() => {
    if (activeTab !== 'targets') {
      stopOrbit();
      setSelectedTargetId(null);
    }
  }, [activeTab, stopOrbit]);

  useEffect(() => {
    if (collapsed) {
      stopOrbit();
      setSelectedTargetId(null);
    }
  }, [collapsed, stopOrbit]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopOrbit();
    };
  }, [stopOrbit]);

  return (
    <>
      <aside
        ref={panelRef}
        style={panelStyle}
        className={`${
          isMobile
            ? 'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] w-full rounded-t-3xl'
            : 'fixed z-30 max-h-[calc(100vh-2rem)] w-[360px] max-w-[92vw] rounded-2xl'
        } flex flex-col border border-emerald-400/15 bg-emerald-950/95 shadow-[0_30px_80px_rgba(3,20,12,0.65)] ring-1 ring-emerald-500/10 backdrop-blur-2xl ${
          collapsed ? 'pointer-events-none' : 'pointer-events-auto'
        } ${panelTransform} ${isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out'}`}
        aria-hidden={collapsed}
      >
        {/* Drag handle - desktop only */}
        {!isMobile && (
          <div className="flex justify-center pt-3">
            <div
              onPointerDown={handleDragStart}
              className={`flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-emerald-200/70 ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              } select-none touch-none`}
              role="button"
              tabIndex={0}
            >
              <GripVertical className="h-3 w-3" />
              Drag
            </div>
          </div>
        )}

        {/* Mobile pull indicator */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1.5 w-12 rounded-full bg-emerald-400/30" />
          </div>
        )}

        {/* Header */}
        <header className="flex items-center justify-between border-b border-emerald-400/15 px-4 py-3 md:px-5 md:py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-emerald-100/60 md:gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Recon Alerts
            </div>
            <h2 className="mt-1.5 flex items-center gap-2 text-base font-semibold text-emerald-50 md:mt-2 md:text-lg">
              <Shield className="h-4 w-4 text-emerald-300 md:h-5 md:w-5" />
              Alerts Command
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="hidden rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100/70 md:inline-flex">
              {provider}
            </Badge>
            <button
              type="button"
              onClick={onToggle}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-50/80 hover:text-emerald-50 active:scale-95 md:h-8 md:w-8 md:rounded-full"
            >
              {isMobile ? <X className="h-5 w-5" /> : <CollapseIcon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Tab navigation */}
        <div className="flex border-b border-emerald-400/15 px-4 md:px-5">
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`flex h-12 flex-1 items-center justify-center gap-2 text-sm font-medium transition md:h-10 md:text-xs ${
              activeTab === 'alerts'
                ? 'border-b-2 border-emerald-400 text-emerald-100'
                : 'text-emerald-100/50 hover:text-emerald-100/70'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Alerts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('targets')}
            className={`flex h-12 flex-1 items-center justify-center gap-2 text-sm font-medium transition md:h-10 md:text-xs ${
              activeTab === 'targets'
                ? 'border-b-2 border-amber-400 text-amber-100'
                : 'text-emerald-100/50 hover:text-emerald-100/70'
            }`}
          >
            <Target className="h-4 w-4" />
            Targets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex h-12 flex-1 items-center justify-center gap-2 text-sm font-medium transition md:h-10 md:text-xs ${
              activeTab === 'map'
                ? 'border-b-2 border-emerald-400 text-emerald-100'
                : 'text-emerald-100/50 hover:text-emerald-100/70'
            }`}
          >
            <Map className="h-4 w-4" />
            Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('controls')}
            className={`flex h-12 flex-1 items-center justify-center gap-2 text-sm font-medium transition md:h-10 md:text-xs ${
              activeTab === 'controls'
                ? 'border-b-2 border-cyan-400 text-cyan-100'
                : 'text-emerald-100/50 hover:text-emerald-100/70'
            }`}
          >
            <Plane className="h-4 w-4" />
            Flight
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex h-12 flex-1 items-center justify-center gap-2 text-sm font-medium transition md:h-10 md:text-xs ${
              activeTab === 'settings'
                ? 'border-b-2 border-emerald-400 text-emerald-100'
                : 'text-emerald-100/50 hover:text-emerald-100/70'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5">
          {activeTab === 'alerts' && (
            <div className="space-y-4 md:space-y-5">
              {/* System toggle */}
              <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">System</p>
                    <p className="text-sm text-emerald-100/70">Alerts pipeline</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-emerald-900/30 p-1">
                  <button
                    onClick={() => setAlertMode('emergency')}
                    className={`flex h-12 items-center justify-center rounded-lg text-sm font-semibold transition md:h-auto md:py-2 md:text-xs ${
                      alertMode === 'emergency'
                        ? 'bg-emerald-500/30 text-emerald-200'
                        : 'text-emerald-100/40 hover:bg-emerald-500/10'
                    }`}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4 md:h-3.5 md:w-3.5" />
                    Emergency
                  </button>
                  <button
                    onClick={() => setAlertMode('police')}
                    className={`flex h-12 items-center justify-center rounded-lg text-sm font-semibold transition md:h-auto md:py-2 md:text-xs ${
                      alertMode === 'police'
                        ? 'bg-blue-500/30 text-blue-200'
                        : 'text-emerald-100/40 hover:bg-emerald-500/10'
                    }`}
                  >
                    <Radio className="mr-2 h-4 w-4 md:h-3.5 md:w-3.5" />
                    Police
                  </button>
                </div>
              </section>

              {/* Visuals */}
              <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Visuals</p>
                    <p className="text-sm text-emerald-100/70">Map overlays</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Label htmlFor="show-markers" className="cursor-pointer text-sm text-emerald-100/70 md:text-xs">
                    Show markers
                  </Label>
                  <button
                    id="show-markers"
                    type="button"
                    onClick={() => setShowMarkers((prev) => !prev)}
                    aria-pressed={showMarkers}
                    className={`relative inline-flex h-12 w-28 items-center rounded-xl border px-1 text-xs uppercase tracking-[0.2em] transition active:scale-[0.98] md:h-8 md:w-24 md:rounded-full md:text-[10px] md:tracking-[0.25em] ${
                      showMarkers
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                        : 'border-emerald-400/20 bg-emerald-950/40 text-emerald-100/40'
                    }`}
                  >
                    <span className="relative z-10 flex-1 text-center">Off</span>
                    <span className="relative z-10 flex-1 text-center">On</span>
                    <span
                      className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-emerald-400/30 transition-transform duration-300 md:rounded-full ${
                        showMarkers ? 'translate-x-full' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {alertMode === 'police' && (
                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowHeatmap((prev) => !prev)}
                      className={`flex h-12 w-full items-center justify-between rounded-xl border px-4 text-sm font-semibold transition md:h-auto md:px-3 md:py-2 md:text-xs ${
                        showHeatmap
                          ? 'border-orange-400/40 bg-orange-400/10 text-orange-200'
                          : 'border-emerald-400/20 bg-emerald-950/40 text-emerald-100/60 hover:border-emerald-300/50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Flame className="h-5 w-5 md:h-4 md:w-4" /> Heatmap
                      </span>
                      <span className="text-xs md:text-[10px]">{heatmapCount} nodes</span>
                    </button>
                    {showHeatmap && (
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(HEATMAP_SCHEMES) as HeatmapColorScheme[]).map((scheme) => (
                          <button
                            key={scheme}
                            type="button"
                            onClick={() => setHeatmapScheme(scheme)}
                            className={`h-10 rounded-lg border px-4 text-xs uppercase tracking-[0.15em] md:h-auto md:rounded-full md:px-3 md:py-1 md:text-[10px] md:tracking-[0.2em] ${
                              heatmapScheme === scheme
                                ? 'border-emerald-200/60 bg-emerald-500/20 text-emerald-50'
                                : 'border-emerald-400/20 text-emerald-100/40 hover:border-emerald-300/50'
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

              {/* Emergency filters */}
              {alertMode === 'emergency' && (
                <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Filters</p>
                      <p className="text-sm text-emerald-100/70">Hazard types</p>
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
                          className={`h-10 rounded-lg border px-4 text-xs uppercase tracking-[0.15em] transition md:h-auto md:rounded-full md:px-3 md:py-1 md:text-[11px] md:tracking-[0.2em] ${
                            isActive ? type.accent : 'border-emerald-400/15 text-emerald-100/40 hover:border-emerald-300/50'
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-emerald-900/30 p-1">
                    {['all', 'warning', 'ground_truth'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setOpsMode(mode as OpsMode)}
                        className={`h-10 rounded-lg text-xs uppercase tracking-[0.15em] transition md:h-auto md:py-1 md:text-[10px] md:tracking-[0.2em] ${
                          opsMode === mode
                            ? 'bg-emerald-500/15 text-emerald-50'
                            : 'text-emerald-100/40 hover:bg-emerald-500/10'
                        }`}
                      >
                        {mode === 'all' ? 'All' : mode === 'warning' ? 'Warnings' : 'Ground'}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-emerald-100/50">
                      <span>States</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStates((prev) =>
                            prev.length === STATES.length ? [] : [...STATES]
                          )
                        }
                        className="h-8 px-2 text-emerald-100/60 hover:text-emerald-50"
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
                            className={`h-10 min-w-[48px] rounded-lg border px-3 text-xs uppercase tracking-[0.15em] md:h-auto md:rounded-md md:px-2 md:py-1 md:text-[10px] md:tracking-[0.2em] ${
                              isActive ? 'border-cyan-400/40 text-cyan-200' : 'border-emerald-400/15 text-emerald-100/40'
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

              {/* Police scan window */}
              {alertMode === 'police' && (
                <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Scan window</p>
                      <p className="text-sm text-emerald-100/70">Time range</p>
                    </div>
                    <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100/70">
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
                    <div className="mt-2 flex justify-between text-[10px] text-emerald-100/40">
                      <span>1h</span>
                      <span>14d</span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="mt-4 h-12 w-full border border-cyan-400/30 bg-cyan-500/10 text-base text-cyan-100 hover:bg-cyan-500/20 md:h-auto md:text-sm"
                    onClick={handleSweep}
                    disabled={sweepMutation.isPending}
                  >
                    <Scan className={`mr-2 h-5 w-5 md:h-4 md:w-4 ${sweepMutation.isPending ? 'animate-spin' : ''}`} />
                    {sweepMutation.isPending ? 'Sweeping...' : 'Sweep Area'}
                  </Button>
                </section>
              )}
            </div>
          )}

          {activeTab === 'map' && (
            <div className="space-y-4 md:space-y-5">
              {/* Map Labels */}
              <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Labels</p>
                    <p className="text-sm text-emerald-100/70">Place names</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cities' as const, label: 'Cities' },
                    { id: 'suburbs' as const, label: 'Suburbs' },
                    { id: 'towns' as const, label: 'Towns' },
                    { id: 'roads' as const, label: 'Roads' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => toggleLabel(id)}
                      className={`text-xs px-3 py-2 rounded border font-medium transition ${
                        labelsVisible[id]
                          ? 'bg-cyan-600/40 border-cyan-500/50 text-cyan-300'
                          : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-700/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Alert Geometry Toggle */}
              <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Overlays</p>
                    <p className="text-sm text-emerald-100/70">Alert geometry</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAlertGeometry(!showAlertGeometry)}
                    className={`h-10 rounded-lg border px-4 text-xs uppercase tracking-[0.15em] transition md:h-auto md:rounded-full md:px-3 md:py-1 md:text-[10px] ${
                      showAlertGeometry
                        ? 'border-red-400/50 bg-red-500/20 text-red-200'
                        : 'border-emerald-400/20 text-emerald-100/40 hover:border-emerald-300/50'
                    }`}
                  >
                    {showAlertGeometry ? 'On' : 'Off'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-emerald-100/50">
                  Show emergency alert polygons and boundaries on the map.
                </p>
              </section>

              {/* MapTiler Styles */}
              <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">MapTiler</p>
                    <p className="text-sm text-emerald-100/70">Choose style</p>
                  </div>
                  <Badge className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                    Active
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:gap-2">
                  {MAPTILER_STYLES.map((style) => {
                    const isActive = maptilerStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleMaptilerStyle(style.id)}
                        className={`h-14 rounded-xl border px-4 text-sm font-medium transition active:scale-[0.98] md:h-auto md:rounded-lg md:px-2 md:py-2 md:text-[11px] ${
                          isActive
                            ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                        }`}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ATAK Maps */}
              <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">ATAK Maps</p>
                    <p className="text-sm text-emerald-100/70">Global reference layers</p>
                  </div>
                  <Badge className="rounded-full border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-purple-100">
                    {selectedAtakMapId ? '✓' : 'Browse'}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {ATAK_MAPS_BY_PROVIDER.map((providerGroup) => (
                    <div key={providerGroup.provider} className="rounded-lg border border-purple-400/20 bg-purple-950/30">
                      {/* Provider Header */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAtakProvider(
                            expandedAtakProvider === providerGroup.provider ? null : providerGroup.provider
                          )
                        }
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-purple-100 hover:bg-purple-500/10 transition rounded-lg"
                      >
                        <span>{providerGroup.provider}</span>
                        <span className="text-purple-100/60 text-xs">
                          {expandedAtakProvider === providerGroup.provider ? '▼' : '▶'}
                        </span>
                      </button>

                      {/* Maps List (Expandable) */}
                      {expandedAtakProvider === providerGroup.provider && (
                        <div className="border-t border-purple-400/10 px-3 py-2 space-y-1">
                          {providerGroup.maps.map((mapItem) => (
                            <button
                              key={mapItem.id}
                              type="button"
                              onClick={() => handleAtakMapSelect(mapItem.id, mapItem.url)}
                              className={`w-full text-left px-3 py-2 rounded text-xs font-medium transition active:scale-[0.98] ${
                                selectedAtakMapId === mapItem.id
                                  ? 'bg-purple-400/30 text-purple-100 border border-purple-400/50'
                                  : 'bg-purple-950/50 text-purple-100/70 hover:bg-purple-500/20'
                              }`}
                            >
                              {mapItem.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-emerald-100/50">
                  Load reference basemaps from various providers. Click provider to expand and browse available maps.
                </p>
              </section>

              {/* Map info */}
              <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Engine</p>
                    <p className="text-sm text-emerald-100/70">MapLibre GL JS</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-emerald-100/50">
                  Open-source rendering engine with MapTiler vector tiles. Supports 3D terrain, custom styles, and privacy-first basemaps.
                </p>
                <button
                  type="button"
                  onClick={() => setLocation('/')}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-sm font-medium text-emerald-100/70 transition hover:border-emerald-300/50 hover:text-emerald-50 active:scale-[0.98] md:h-auto md:py-2 md:text-xs"
                >
                  Back to Home
                </button>
              </section>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-4 md:space-y-5">
              {/* Note: Will show Flight Controls from FlightControlCenter */}
              <div className="text-xs text-slate-400 text-center py-8">
                <p>Flight mode controls appear in the right sidebar</p>
                <p className="mt-2 text-slate-500">Map label filters are in the MAP tab</p>
              </div>
            </div>
          )}

          {activeTab === 'targets' && (
            <div className="space-y-4 md:space-y-5">
              {/* Quick Filters */}
              <section className="rounded-2xl border border-amber-400/15 bg-amber-950/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/60">Filter by Type</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTargetFilter('all')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition md:py-1.5 ${
                      targetFilter === 'all'
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                        : 'border-amber-400/20 bg-amber-950/40 text-amber-100/60 hover:bg-amber-500/10'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTargetFilter('emergency')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition md:py-1.5 ${
                      targetFilter === 'emergency'
                        ? 'border-rose-400/60 bg-rose-500/20 text-rose-100'
                        : 'border-amber-400/20 bg-amber-950/40 text-amber-100/60 hover:bg-amber-500/10'
                    }`}
                  >
                    Emergency
                  </button>
                  <button
                    onClick={() => setTargetFilter('police')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition md:py-1.5 ${
                      targetFilter === 'police'
                        ? 'border-blue-400/60 bg-blue-500/20 text-blue-100'
                        : 'border-amber-400/20 bg-amber-950/40 text-amber-100/60 hover:bg-amber-500/10'
                    }`}
                  >
                    Police
                  </button>
                </div>
              </section>

              {/* Sort Controls */}
              <section className="rounded-2xl border border-amber-400/15 bg-amber-950/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/60">Sort by</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTargetSort('severity')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition md:py-1.5 ${
                      targetSort === 'severity'
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                        : 'border-amber-400/20 bg-amber-950/40 text-amber-100/60 hover:bg-amber-500/10'
                    }`}
                  >
                    Severity
                  </button>
                  <button
                    onClick={() => setTargetSort('time')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition md:py-1.5 ${
                      targetSort === 'time'
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                        : 'border-amber-400/20 bg-amber-950/40 text-amber-100/60 hover:bg-amber-500/10'
                    }`}
                  >
                    Time
                  </button>
                  <button
                    onClick={() => setTargetSort('distance')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition md:py-1.5 ${
                      targetSort === 'distance'
                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                        : 'border-amber-400/20 bg-amber-950/40 text-amber-100/60 hover:bg-amber-500/10'
                    }`}
                  >
                    Distance
                  </button>
                </div>
              </section>

              {/* Targets List */}
              {sortedTargets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Target className="mb-3 h-12 w-12 text-emerald-400/30" />
                  <p className="font-medium text-emerald-100/60">No targets in range</p>
                  <p className="mt-1 text-xs text-emerald-100/40">Adjust filters or scan a wider area</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Emergency Alerts Section */}
                  {sortedTargets.some((t) => t.alertType === 'emergency') && (
                    <section className="rounded-2xl border border-rose-400/15 bg-rose-950/40 p-4">
                      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-rose-100/70">
                        Emergency Alerts ({sortedTargets.filter((t) => t.alertType === 'emergency').length})
                      </p>
                      <div className="space-y-2">
                        {sortedTargets
                          .filter((t) => t.alertType === 'emergency')
                          .map((alert: any) => (
                            <button
                              key={alert.properties?.id}
                              onClick={() => handleTargetClick(alert)}
                              className={`w-full rounded-lg border px-3 py-3 text-left transition hover:bg-rose-500/15 active:scale-95 md:py-2 ${
                                selectedTargetId === alert.properties?.id
                                  ? 'border-rose-400/60 bg-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                  : 'border-rose-400/20 bg-rose-950/60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-2 text-sm font-semibold text-rose-100">
                                    <span className="text-lg">{getHazardIcon(alert.properties?.hazard_type)}</span>
                                    <span className="truncate">{alert.properties?.title}</span>
                                    {alert.properties?.severity && (
                                      <Badge className="ml-auto flex-shrink-0 border-rose-400/40 bg-rose-500/20 text-[10px] text-rose-100 md:text-[9px]">
                                        {alert.properties.severity.toUpperCase()}
                                      </Badge>
                                    )}
                                  </p>
                                  <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-rose-100/60">
                                    <span>{alert.properties?.state || 'AUS'}</span>
                                    <span>•</span>
                                    <span>{formatAge(alert.properties?.age_s)}</span>
                                    <span>•</span>
                                    <span>{getDistance(alert).toFixed(1)} km</span>
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </section>
                  )}

                  {/* Police Alerts Section */}
                  {sortedTargets.some((t) => t.alertType === 'police') && (
                    <section className="rounded-2xl border border-blue-400/15 bg-blue-950/40 p-4">
                      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-blue-100/70">
                        Police Alerts ({sortedTargets.filter((t) => t.alertType === 'police').length})
                      </p>
                      <div className="space-y-2">
                        {sortedTargets
                          .filter((t) => t.alertType === 'police')
                          .map((alert: any) => (
                            <button
                              key={alert.alertId}
                              onClick={() => handleTargetClick(alert)}
                              className={`w-full rounded-lg border px-3 py-3 text-left transition hover:bg-blue-500/15 active:scale-95 md:py-2 ${
                                selectedTargetId === alert.alertId
                                  ? 'border-blue-400/60 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                                  : 'border-blue-400/20 bg-blue-950/60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                                    <span className="text-lg">👮</span>
                                    <span className="truncate">{alert.type} - {alert.subtype}</span>
                                    {alert.alertReliability && (
                                      <Badge className="ml-auto flex-shrink-0 border-blue-400/40 bg-blue-500/20 text-[10px] text-blue-100 md:text-[9px]">
                                        ★{alert.alertReliability}
                                      </Badge>
                                    )}
                                  </p>
                                  <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-blue-100/60">
                                    <span>{alert.street || alert.city || 'Unknown location'}</span>
                                    <span>•</span>
                                    <span>{formatAge(alert.createdAt)}</span>
                                    <span>•</span>
                                    <span>{getDistance(alert).toFixed(1)} km</span>
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-emerald-400/15 px-4 py-3 md:px-5 md:py-4">
          <div className="flex items-center justify-between text-xs text-emerald-50/70">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-300 md:h-3.5 md:w-3.5" />
              {isLoading ? 'Syncing...' : `${alertCount} alerts`}
            </span>
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-300 md:h-3.5 md:w-3.5" />
              {enabled ? 'Active' : 'Paused'}
            </span>
          </div>
        </footer>
      </aside>

      {/* Collapsed state button */}
      {collapsed && (
        <div className="fixed z-40" style={collapsedButtonStyle}>
          <button
            type="button"
            onClick={onToggle}
            className={`group flex items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-950/90 text-emerald-50 shadow-[0_18px_45px_rgba(3,20,12,0.6)] backdrop-blur transition hover:border-emerald-300/60 active:scale-95 ${
              isMobile ? 'h-16 gap-3 px-6' : 'h-14 w-14 flex-col'
            }`}
          >
            <AlertTriangle className="h-6 w-6 text-emerald-300 md:h-5 md:w-5" />
            <div className={`flex items-center gap-1 font-semibold ${isMobile ? 'text-base' : 'mt-1 text-[10px]'}`}>
              <span>{alertCount}</span>
              {!isMobile && <RevealIcon className="h-3 w-3 text-emerald-200/80" />}
              {isMobile && <span className="text-emerald-200/80">Alerts</span>}
            </div>
          </button>
        </div>
      )}
    </>
  );
}

export default AlertsSidebar;

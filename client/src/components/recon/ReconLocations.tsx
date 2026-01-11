import { useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useFlightControlStore } from '@/stores/flightControlStore';
import { RECON_LOCATIONS, getRandomFlightParams, type ReconLocation } from '@/data/reconLocations';
import { MapPin, Mountain, Building2, Compass, Landmark, Waves } from 'lucide-react';

const CATEGORY_ICONS = {
  coastal: Waves,
  urban: Building2,
  outback: Compass,
  mountain: Mountain,
  landmark: Landmark,
};

const CATEGORY_COLORS = {
  coastal: 'text-cyan-400',
  urban: 'text-amber-400',
  outback: 'text-orange-500',
  mountain: 'text-emerald-400',
  landmark: 'text-purple-400',
};

interface ReconLocationsProps {
  onFlyTo?: (location: ReconLocation) => void;
}

export function ReconLocations({ onFlyTo }: ReconLocationsProps) {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);
  const { setActiveMode } = useFlightControlStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [flyingTo, setFlyingTo] = useState<string | null>(null);

  const handleFlyTo = (location: ReconLocation) => {
    if (!map || !isLoaded) return;

    setFlyingTo(location.id);
    const params = getRandomFlightParams();

    // Calculate approach position (offset from target)
    const approachDistance = 0.01 + Math.random() * 0.02; // Random distance
    const approachBearing = params.bearing * (Math.PI / 180);
    const approachLng = location.coords[0] + Math.sin(approachBearing) * approachDistance;
    const approachLat = location.coords[1] + Math.cos(approachBearing) * approachDistance;

    // First fly to approach position
    map.flyTo({
      center: [approachLng, approachLat],
      zoom: location.defaultZoom + params.zoomOffset - 1,
      pitch: Math.min(params.pitch, 80),
      bearing: params.bearing,
      duration: 3000,
      essential: true,
    });

    // Then smoothly transition to orbit
    setTimeout(() => {
      map.flyTo({
        center: location.coords,
        zoom: location.defaultZoom + params.zoomOffset,
        pitch: Math.min(location.defaultPitch, 80),
        bearing: params.bearing + 45,
        duration: 2500,
        essential: true,
      });

      // Switch to orbit mode after arrival
      setTimeout(() => {
        setActiveMode('auto-orbit');
        setFlyingTo(null);
        onFlyTo?.(location);
      }, 2500);
    }, 3000);
  };

  const categories = ['coastal', 'urban', 'outback', 'mountain', 'landmark'] as const;

  const filteredLocations = activeCategory
    ? RECON_LOCATIONS.filter((l) => l.category === activeCategory)
    : RECON_LOCATIONS;

  return (
    <div className="p-3 border-t border-cyan-500/20">
      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Recon Locations</div>

      {/* Category filters */}
      <div className="flex gap-1 mb-3 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-2 py-1 text-[10px] rounded ${
            activeCategory === null
              ? 'bg-cyan-500/30 text-cyan-300'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          All
        </button>
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-2 py-1 text-[10px] rounded flex items-center gap-1 ${
                activeCategory === cat
                  ? 'bg-cyan-500/30 text-cyan-300'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Location list */}
      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
        {filteredLocations.map((location) => {
          const Icon = CATEGORY_ICONS[location.category];
          const colorClass = CATEGORY_COLORS[location.category];
          const isFlying = flyingTo === location.id;

          return (
            <button
              key={location.id}
              onClick={() => handleFlyTo(location)}
              disabled={isFlying}
              className={`w-full text-left p-2 rounded bg-slate-800/40 hover:bg-slate-700/60 transition-all group ${
                isFlying ? 'ring-1 ring-cyan-500 animate-pulse' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-200 truncate">{location.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{location.description}</div>
                </div>
                <MapPin className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

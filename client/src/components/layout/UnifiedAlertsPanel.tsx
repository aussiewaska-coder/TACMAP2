// UnifiedAlertsPanel - Merged Emergency + Police Alerts System
// Consistent UI, filtering, and rendering for all alert types

import { useState, useMemo, useEffect, useRef } from 'react';
import { AlertTriangle, Radio, Flame, Scan, Plane, Waves, Construction, Satellite } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMapStore } from '@/stores';
import { trpc } from '@/lib/trpc';
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts';
import { useUnifiedAlerts } from '@/hooks/useUnifiedAlerts';
import { useHeatmap } from '@/hooks/useHeatmap';
import maplibregl from 'maplibre-gl';

type AlertMode = 'emergency' | 'police';
type OpsMode = 'all' | 'warning' | 'ground_truth';

const HAZARD_TYPES = [
    { id: 'fire', label: 'Fire', icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', activeBg: 'bg-red-500', activeText: 'text-white' },
    { id: 'flood', label: 'Flood/Storm', icon: Waves, color: 'text-blue-500', bg: 'bg-blue-500/10', activeBg: 'bg-blue-500', activeText: 'text-white' },
    { id: 'road', label: 'Roads', icon: Construction, color: 'text-orange-500', bg: 'bg-orange-500/10', activeBg: 'bg-orange-500', activeText: 'text-white' },
    { id: 'aviation', label: 'Aviation', icon: Plane, color: 'text-green-500', bg: 'bg-green-500/10', activeBg: 'bg-green-500', activeText: 'text-white' },
    { id: 'space', label: 'Space', icon: Satellite, color: 'text-purple-500', bg: 'bg-purple-500/10', activeBg: 'bg-purple-500', activeText: 'text-white' },
    { id: 'general', label: 'Alerts', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', activeBg: 'bg-yellow-600', activeText: 'text-white' },
];

/**
 * Unified Alerts Panel - Merges Emergency Services and Police Alerts
 * Consistent UI, filtering, and interaction patterns
 */
export function UnifiedAlertsPanel() {
    const map = useMapStore((state) => state.map);
    const isLoaded = useMapStore((state) => state.isLoaded);

    // Mode toggle
    const [alertMode, setAlertMode] = useState<AlertMode>('emergency');
    const [enabled, setEnabled] = useState(true); // ✅ ENABLED BY DEFAULT
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showMarkers, setShowMarkers] = useState(true);

    // Auto-hide markers when heatmap is enabled (old system behavior)
    useEffect(() => {
        if (showHeatmap) {
            setShowMarkers(false);
        }
    }, [showHeatmap]);

    // Emergency filters
    const [activeFilters, setActiveFilters] = useState<string[]>(HAZARD_TYPES.map(h => h.id));
    const [opsMode, setOpsMode] = useState<OpsMode>('all');
    const [selectedStates, setSelectedStates] = useState<string[]>(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'AUS']);

    // Police filters
    const [hoursAgo, setHoursAgo] = useState(336); // 14 days default

    const utils = trpc.useUtils();
    const hasAutoSwept = useRef(false);
    const [iconsReady, setIconsReady] = useState(false);

    // --- ICON REGISTRATION ---
    useEffect(() => {
        if (!map || !isLoaded) return;

        const icons = {
            'icon-fire': {
                path: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
                color: '#ef4444'
            },
            'icon-flood': {
                path: 'M2 6c.6.5 1.2 1 2.5 1C5.8 7 6.5 6 8 6c1.5 0 2.2 1 3.5 1 1.3 0 2-1 3.5-1s2.2 1 3.5 1c1.3 0 1.9-.5 2.5-1M2 12c.6.5 1.2 1 2.5 1 1.3 0 2-1 3.5-1 1.5 0 2.2 1 3.5 1 1.3 0 2-1 3.5-1s2.2 1 3.5 1c1.3 0 1.9-.5 2.5-1M2 18c.6.5 1.2 1 2.5 1 1.3 0 2-1 3.5-1 1.5 0 2.2 1 3.5 1 1.3 0 2-1 3.5-1s2.2 1 3.5 1c1.3 0 1.9-.5 2.5-1',
                color: '#3b82f6'
            },
            'icon-road': {
                path: 'M3 21h18M3 7l9-4 9 4M5 21V7m14 14V7m-7 14V11',
                color: '#f97316'
            },
            'icon-aviation': {
                path: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
                color: '#10b981'
            },
            'icon-space': {
                path: 'M13 7l2 2M9 11l2 2M8 4l8 8M3 4l4 4M2 11l9 9M7 11l2 2M11 7l2-2M18 5L5 18M10 10l4 4M21 21l-3-3',
                color: '#a855f7'
            },
            'icon-warning': {
                path: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01',
                color: '#eab308'
            },
            'icon-police': {
                path: 'M12 2l8 4v6c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4zm0 2l-6 3v5c0 4.1 2.8 8 6 9 3.2-1 6-4.9 6-9V7l-6-3z',
                color: '#dc2626'
            }
        };

        const registerIcons = () => {
            Object.entries(icons).forEach(([name, config]) => {
                if (map.hasImage(name)) return;

                const size = 64;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Background circle
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, (size / 2) - 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // SVG path
                const p = new Path2D(config.path);
                ctx.save();
                ctx.translate(size / 4, size / 4);
                ctx.scale(size / 48, size / 48);
                ctx.strokeStyle = config.color;
                ctx.lineWidth = 3;
                ctx.stroke(p);
                ctx.restore();

                const imageData = ctx.getImageData(0, 0, size, size);
                map.addImage(name, imageData);
            });
            setIconsReady(true);
        };

        if (map.isStyleLoaded()) {
            registerIcons();
        }
        map.on('styledata', registerIcons);

        return () => {
            if (map) map.off('styledata', registerIcons);
        };
    }, [map, isLoaded]);

    // --- DATA FETCHING ---
    const { data: rawEmergencyData, isLoading: emergencyLoading } = useEmergencyAlerts(enabled && alertMode === 'emergency');

    const sweepMutation = trpc.waze.getAlertsAndJams.useMutation({
        onSuccess: (data) => {
            const count = data.count || 0;
            if (count > 0) {
                toast.success(`[✓] sweep.complete`, {
                    description: `[INFO] Found ${count} new alert${count === 1 ? '' : 's'} → database.updated`,
                    duration: 4000
                });
                utils.police.list.invalidate();
            } else {
                toast.info("[i] sweep.complete", {
                    description: "[INFO] No new alerts detected in scan area",
                    duration: 3000
                });
            }
        },
        onError: (err) => {
            toast.error("[✗] sweep.error", {
                description: `[ERROR] ${err.message || "Unable to scan area"}`,
                duration: 5000
            });
        }
    });

    const { data: policeReports, isLoading: policeLoading } = trpc.police.list.useQuery(
        { hoursAgo },
        {
            enabled: enabled && alertMode === 'police',
            refetchInterval: 60000
        }
    );

    // Toast notifications for feed loading - terminal style
    useEffect(() => {
        if (enabled && alertMode === 'emergency' && emergencyLoading) {
            toast.loading("$ emergency.fetch --stream", {
                description: "[LOAD] Connecting to emergency.services.api...",
                id: 'emergency-feed'
            });
        } else {
            toast.dismiss('emergency-feed');
        }
    }, [emergencyLoading, enabled, alertMode]);

    useEffect(() => {
        if (enabled && alertMode === 'police' && policeLoading) {
            toast.loading("$ police.query --hours=" + hoursAgo, {
                description: "[LOAD] Reading from alerts.db → filtering records...",
                id: 'police-feed'
            });
        } else {
            toast.dismiss('police-feed');
        }
    }, [policeLoading, enabled, alertMode, hoursAgo]);

    // Auto-sweep police data on first mount if empty
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
                maxJams: 0
            });
        }
    }, [alertMode, policeReports, map, sweepMutation]);

    const handleSweep = () => {
        if (!map) return;
        const bounds = map.getBounds();
        const center = map.getCenter();
        const zoom = map.getZoom();

        // Calculate approximate area dimensions in km
        const width = bounds.getEast() - bounds.getWest();
        const height = bounds.getNorth() - bounds.getSouth();
        const approxWidth = Math.round(width * 111 * Math.cos(center.lat * Math.PI / 180));
        const approxHeight = Math.round(height * 111);

        const bottomLeft = `${bounds.getSouth()},${bounds.getWest()}`;
        const topRight = `${bounds.getNorth()},${bounds.getEast()}`;

        // Show sweep area info - terminal style
        toast.loading("$ waze.sweep --active", {
            description: `[SCAN] ${approxWidth}×${approxHeight}km @ [${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}] z${zoom.toFixed(1)}`,
            duration: 10000,
            id: 'police-sweep'
        });

        sweepMutation.mutate({
            bottomLeft,
            topRight,
            radiusUnits: 'KM',
            maxAlerts: 100,
            maxJams: 0
        }, {
            onSettled: () => {
                toast.dismiss('police-sweep');
            }
        });
    };

    // --- FILTERING ---
    const filteredEmergencyData = useMemo(() => {
        if (!rawEmergencyData || alertMode !== 'emergency') return null;

        const filteredFeatures = rawEmergencyData.features.map((f: any) => {
            const props = f.properties;
            const sub = (props.hazard_type || '').toLowerCase();
            const sub2 = (props.subcategory || '').toLowerCase();
            const cat = (props.category || '').toLowerCase();
            const tags = (props.tags || []).map((t: string) => t.toLowerCase());

            const isFire = sub.includes('fire') || cat.includes('fire') || sub2.includes('fire') || tags.includes('fire') || sub.includes('bushfire') || sub.includes('burn');
            const isFlood = sub.includes('flood') || sub.includes('storm') || sub.includes('rain') || sub.includes('tsunami') || cat.includes('weather') || sub2.includes('storm') || sub.includes('tide') || sub.includes('meteorological');
            const isRoad = sub.includes('road') || sub.includes('traffic') || sub.includes('closure') || cat.includes('transport') || sub2.includes('road') || sub.includes('crash') || sub.includes('incident');
            const isSpace = sub.includes('space') || sub.includes('sws') || cat.includes('space') || sub.includes('solar') || sub.includes('geomagnetic');
            const isAviation = cat.includes('aviation') || sub.includes('aircraft') || sub2.includes('aircraft') || tags.includes('aviation');

            let markerIcon = 'icon-warning';
            if (isFire) markerIcon = 'icon-fire';
            else if (isFlood) markerIcon = 'icon-flood';
            else if (isRoad) markerIcon = 'icon-road';
            else if (isAviation) markerIcon = 'icon-aviation';
            else if (isSpace) markerIcon = 'icon-space';

            const isGroundTruth = tags.includes('fire_ground_truth') || tags.includes('operational') || tags.includes('ground_truth');
            const isWarning = tags.includes('public_warning') || (!isGroundTruth);

            const matchesOps = opsMode === 'all' ||
                (opsMode === 'ground_truth' && isGroundTruth) ||
                (opsMode === 'warning' && isWarning);

            const matchesFilter = matchesOps && (
                (activeFilters.includes('fire') && isFire) ||
                (activeFilters.includes('flood') && isFlood) ||
                (activeFilters.includes('road') && isRoad) ||
                (activeFilters.includes('space') && isSpace) ||
                (activeFilters.includes('aviation') && isAviation) ||
                (activeFilters.includes('general') && !isFire && !isFlood && !isRoad && !isSpace && !isAviation)
            );

            const alertState = props.state?.toUpperCase() || 'AUS';
            const matchesState = selectedStates.includes(alertState);

            if (!matchesFilter || !matchesState) return null;

            return {
                ...f,
                properties: {
                    ...f.properties,
                    markerIcon
                }
            };
        }).filter(Boolean);

        return {
            ...rawEmergencyData,
            features: filteredFeatures
        };
    }, [rawEmergencyData, activeFilters, opsMode, selectedStates, alertMode]);

    const toggleFilter = (id: string) => {
        setActiveFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const toggleState = (state: string) => {
        setSelectedStates(prev =>
            prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
        );
    };

    const toggleAllStates = () => {
        const allStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'AUS'];
        if (selectedStates.length === allStates.length) {
            setSelectedStates([]);
        } else {
            setSelectedStates(allStates);
        }
    };

    // --- UNIFIED RENDERING ---
    const currentData = alertMode === 'emergency' ? filteredEmergencyData : policeReports;
    const isLoading = alertMode === 'emergency' ? emergencyLoading : policeLoading;

    const { alertCount } = useUnifiedAlerts({
        enabled,
        alertSource: alertMode,
        data: currentData ?? null,
        showMarkers,
        layerPrefix: `unified-${alertMode}`,
        clusterRadius: 60,
        clusterMaxZoom: 14
    });

    // NEW: Use the old heatmap system (police only for now)
    const { heatmapCount, isLoading: heatmapLoading } = useHeatmap({
        enabled: showHeatmap && alertMode === 'police',
        hoursAgo
    });

    // Stats
    const typeBreakdown = useMemo(() => {
        if (alertMode === 'police' && policeReports) {
            const counts: Record<string, number> = {};
            policeReports.forEach((r: any) => {
                const type = r.type || 'Unknown';
                counts[type] = (counts[type] || 0) + 1;
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        }
        return [];
    }, [alertMode, policeReports]);

    const stateBreakdown = useMemo(() => {
        if (alertMode === 'emergency' && rawEmergencyData) {
            const counts: Record<string, number> = {};
            rawEmergencyData.features.forEach((f: any) => {
                const state = f.properties.state?.toUpperCase() || 'AUS';
                counts[state] = (counts[state] || 0) + 1;
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]);
        }
        return [];
    }, [alertMode, rawEmergencyData]);

    return (
        <div className="space-y-6">
            {/* Mode Selector */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${enabled ? 'bg-red-500/30' : 'bg-gray-500/20'}`}>
                            {alertMode === 'emergency' ? (
                                <AlertTriangle className={`w-6 h-6 ${enabled ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
                            ) : (
                                <Radio className={`w-6 h-6 ${enabled ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Alerts System</h4>
                            <p className="text-xs text-white/50">Live monitoring & incidents</p>
                        </div>
                    </div>
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                {enabled && (
                    <>
                        {/* Mode Toggle */}
                        <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5 mb-4">
                            <button
                                onClick={() => setAlertMode('emergency')}
                                className={`py-2 text-sm font-bold rounded-lg transition-all ${alertMode === 'emergency' ? 'bg-orange-500 text-white shadow-lg scale-105 ring-2 ring-orange-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                            >
                                🔥 Emergency
                            </button>
                            <button
                                onClick={() => setAlertMode('police')}
                                className={`py-2 text-sm font-bold rounded-lg transition-all ${alertMode === 'police' ? 'bg-blue-500 text-white shadow-lg scale-105 ring-2 ring-blue-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                            >
                                🚨 Police
                            </button>
                        </div>

                        {/* Heatmap Toggle */}
                        <div className="space-y-2">
                            <Button
                                variant={showHeatmap ? "default" : "outline"}
                                size="sm"
                                className="w-full"
                                disabled={alertMode !== 'police'}
                                onClick={() => {
                                    const newState = !showHeatmap;
                                    setShowHeatmap(newState);
                                    if (newState) {
                                        toast.loading("[...] heatmap.loading", {
                                            description: "[INFO] Fetching density data...",
                                            id: 'heatmap-toggle'
                                        });
                                    } else {
                                        toast.info("[i] heatmap.disabled", {
                                            description: "[INFO] Heatmap layer hidden",
                                            duration: 2000
                                        });
                                    }
                                }}
                            >
                                <Flame className={`w-4 h-4 mr-2 ${showHeatmap ? 'animate-pulse' : ''}`} />
                                {showHeatmap ? `Heatmap (${heatmapCount} hotspots)` : 'Show Heatmap'}
                                {alertMode !== 'police' && ' (Police Only)'}
                            </Button>

                            {showHeatmap && (
                                <div className="flex items-center space-x-2 px-1 animate-in fade-in">
                                    <Switch
                                        id="show-markers"
                                        checked={showMarkers}
                                        onCheckedChange={setShowMarkers}
                                        className="scale-75"
                                    />
                                    <Label htmlFor="show-markers" className="text-xs text-white/70 cursor-pointer">
                                        Show Markers Overlay
                                    </Label>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="mt-4 flex items-center justify-between text-sm bg-black/20 p-3 rounded-lg">
                            <span className="text-white/60">Active Alerts</span>
                            <span className="font-mono text-2xl text-red-400">
                                {isLoading ? '...' : alertCount}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Mode-specific filters */}
            {enabled && alertMode === 'emergency' && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl">
                    <h4 className="text-sm font-bold text-white/70 mb-3">Emergency Filters</h4>

                    {/* Ops Mode */}
                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1 mb-2 block">Mode</label>
                        <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                            <button
                                onClick={() => setOpsMode('all')}
                                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${opsMode === 'all' ? 'bg-white/10 text-white' : 'text-white/30'}`}
                            >
                                ALL
                            </button>
                            <button
                                onClick={() => setOpsMode('warning')}
                                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${opsMode === 'warning' ? 'bg-blue-500/20 text-blue-400' : 'text-white/30'}`}
                            >
                                WARNINGS
                            </button>
                            <button
                                onClick={() => setOpsMode('ground_truth')}
                                className={`py-1 text-[10px] font-bold rounded-lg transition-all ${opsMode === 'ground_truth' ? 'bg-red-500/20 text-red-400' : 'text-white/30'}`}
                            >
                                GROUND
                            </button>
                        </div>
                    </div>

                    {/* Hazard Types */}
                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1 mb-2 block">Hazard Types</label>
                        <div className="flex flex-wrap gap-2">
                            {HAZARD_TYPES.map((type) => {
                                const Icon = type.icon;
                                const isActive = activeFilters.includes(type.id);
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => toggleFilter(type.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isActive ? `${type.activeBg} ${type.activeText} shadow-lg` : 'bg-white/5 text-white/40'}`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {type.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* States */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">States</label>
                            <button
                                onClick={toggleAllStates}
                                className="text-[9px] text-white/40 hover:text-white/80 uppercase font-bold"
                            >
                                {selectedStates.length === 9 ? 'None' : 'All'}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'AUS'].map((state) => {
                                const isActive = selectedStates.includes(state);
                                return (
                                    <button
                                        key={state}
                                        onClick={() => toggleState(state)}
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${isActive ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/40'}`}
                                    >
                                        {state}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {stateBreakdown.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <h4 className="text-[10px] font-bold text-white/40 uppercase mb-2">By State</h4>
                            <div className="space-y-1">
                                {stateBreakdown.slice(0, 5).map(([state, count]) => (
                                    <div key={state} className="flex items-center justify-between bg-black/20 px-2 py-1 rounded">
                                        <span className="text-[11px] text-white/80">{state}</span>
                                        <span className="text-[11px] font-mono text-white/90">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {enabled && alertMode === 'police' && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl">
                    <h4 className="text-sm font-bold text-white/70 mb-3">Police Filters</h4>

                    {/* Time Range */}
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs">
                            <span className="text-white/60">Time Range</span>
                            <span className="font-medium">{hoursAgo > 48 ? `${Math.round(hoursAgo / 24)} days` : `${hoursAgo}h`}</span>
                        </div>
                        <Slider
                            value={[hoursAgo]}
                            onValueChange={(v) => setHoursAgo(v[0])}
                            min={1}
                            max={336}
                            step={1}
                            className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-white/40">
                            <span>1 hour</span>
                            <span>14 days</span>
                        </div>
                    </div>

                    {/* Sweep Button */}
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-full bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-100 border border-cyan-800/50"
                        onClick={handleSweep}
                        disabled={sweepMutation.isPending}
                    >
                        <Scan className={`w-4 h-4 mr-2 ${sweepMutation.isPending ? 'animate-spin' : ''}`} />
                        {sweepMutation.isPending ? 'Sweeping...' : 'SWEEP AREA'}
                    </Button>
                    <p className="text-[10px] text-center text-white/40 mt-1">
                        Scans current view for new police activity
                    </p>

                    {typeBreakdown.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <h4 className="text-[10px] font-bold text-white/40 uppercase mb-2">By Type</h4>
                            <div className="space-y-1">
                                {typeBreakdown.map(([type, count]) => (
                                    <div key={type} className="flex items-center justify-between bg-black/20 px-2 py-1 rounded">
                                        <span className="text-[11px] text-white/80 capitalize">{type.toLowerCase().replace(/_/g, ' ')}</span>
                                        <span className="text-[11px] font-mono text-white/90">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default UnifiedAlertsPanel;

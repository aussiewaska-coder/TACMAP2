// ToolsPanel - Measurement and directions tools
// Used in both mobile bottom sheet and desktop sidebar

import { useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Ruler, Route, Triangle, Navigation2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';
import { SearchBox } from './SearchBox';

type ToolMode = 'none' | 'measure-distance' | 'measure-area' | 'directions';

interface DirectionsState {
    from: string;
    fromCoords: [number, number] | null;
    to: string;
    toCoords: [number, number] | null;
}

/**
 * Tools panel with measurement and directions
 */
export function ToolsPanel() {
    const [activeMode, setActiveMode] = useState<ToolMode>('none');
    const [directions, setDirections] = useState<DirectionsState>({
        from: '',
        fromCoords: null,
        to: '',
        toCoords: null,
    });
    const [route, setRoute] = useState<{
        distance: string;
        duration: string;
    } | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const map = useMapStore((state) => state.map);

    const handleModeChange = async (mode: ToolMode) => {
        const { pluginRegistry } = await import('@/plugins/registry');
        const measurement = pluginRegistry.get('measurement')?.instance as any;

        if (activeMode === mode) {
            setActiveMode('none');
            if (measurement) measurement.stopMeasurement();
            toast.info('Tool deactivated');
        } else {
            setActiveMode(mode);
            if (measurement) {
                if (mode === 'measure-distance') {
                    measurement.startDistanceMeasurement();
                    toast.info('Click on map to measure distance');
                } else if (mode === 'measure-area') {
                    measurement.startAreaMeasurement();
                    toast.info('Click on map to measure area');
                }
            } else {
                toast.error('Measurement tool not available');
            }
        }
    };

    const calculateRoute = async () => {
        if (!directions.fromCoords || !directions.toCoords) {
            toast.error('Please enter both start and destination');
            return;
        }

        setIsCalculating(true);

        try {
            const coords = `${directions.fromCoords[0]},${directions.fromCoords[1]};${directions.toCoords[0]},${directions.toCoords[1]}`;
            const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes?.[0]) {
                throw new Error('No route found');
            }

            const routeData = data.routes[0];
            const distanceKm = (routeData.distance / 1000).toFixed(1);
            const durationMin = Math.round(routeData.duration / 60);
            const hours = Math.floor(durationMin / 60);
            const mins = durationMin % 60;

            setRoute({
                distance: `${distanceKm} km`,
                duration: hours > 0 ? `${hours}h ${mins}m` : `${mins} min`,
            });

            // Draw route on map if we have access
            if (map) {
                const source = map.getSource('directions-route');
                if (source && 'setData' in source) {
                    (source as any).setData({
                        type: 'Feature',
                        properties: {},
                        geometry: routeData.geometry,
                    });
                }

                // Fit bounds
                const coords = routeData.geometry.coordinates;
                if (coords.length > 0) {
                    const bounds = coords.reduce(
                        (b: any, c: [number, number]) => b.extend(c),
                        new maplibregl.LngLatBounds(coords[0], coords[0])
                    );
                    map.fitBounds(bounds, { padding: 50, duration: 1000 });
                }
            }

            toast.success('Route calculated!');
        } catch (error) {
            console.error('Route error:', error);
            toast.error('Failed to calculate route');
        } finally {
            setIsCalculating(false);
        }
    };

    const clearRoute = () => {
        setDirections({ from: '', fromCoords: null, to: '', toCoords: null });
        setRoute(null);

        // Clear route from map
        if (map) {
            const source = map.getSource('directions-route');
            if (source && 'setData' in source) {
                (source as any).setData({
                    type: 'FeatureCollection',
                    features: [],
                });
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Measurement Tools */}
            <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <Ruler className="w-4 h-4" />
                    Measurement
                </h3>

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={activeMode === 'measure-distance' ? 'default' : 'outline'}
                        onClick={() => handleModeChange('measure-distance')}
                        className="h-12 flex flex-col items-center justify-center gap-1"
                    >
                        <Ruler className="w-5 h-5" />
                        <span className="text-xs">Distance</span>
                    </Button>
                    <Button
                        variant={activeMode === 'measure-area' ? 'default' : 'outline'}
                        onClick={() => handleModeChange('measure-area')}
                        className="h-12 flex flex-col items-center justify-center gap-1"
                    >
                        <Triangle className="w-5 h-5" />
                        <span className="text-xs">Area</span>
                    </Button>
                </div>

                {(activeMode === 'measure-distance' || activeMode === 'measure-area') && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                        Click on the map to add points. Double-click to finish.
                    </div>
                )}
            </div>

            {/* Directions */}
            <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <Route className="w-4 h-4" />
                    Directions
                </h3>

                <div className="space-y-3">
                    {/* From */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">From</label>
                        <SearchBox
                            placeholder="Starting point..."
                            onResultSelect={(res) => setDirections(prev => ({ ...prev, from: res.name, fromCoords: res.coordinates }))}
                        />
                    </div>

                    {/* To */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">To</label>
                        <SearchBox
                            placeholder="Destination..."
                            onResultSelect={(res) => setDirections(prev => ({ ...prev, to: res.name, toCoords: res.coordinates }))}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={calculateRoute}
                            disabled={isCalculating}
                            className="flex-1"
                        >
                            {isCalculating ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Calculating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Navigation2 className="w-4 h-4" />
                                    Get Directions
                                </span>
                            )}
                        </Button>
                        {route && (
                            <Button variant="outline" size="icon" onClick={clearRoute}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    {/* Route result */}
                    {route && (
                        <div className="p-4 bg-green-50 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-lg font-bold text-green-800">{route.distance}</div>
                                    <div className="text-sm text-green-600">{route.duration} by car</div>
                                </div>
                                <Route className="w-8 h-8 text-green-500" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="text-center py-2 text-gray-400 text-xs border-t">
                Powered by OpenStreetMap & OSRM
            </div>
        </div>
    );
}

export default ToolsPanel;

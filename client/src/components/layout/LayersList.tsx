// LayersList - Layer visibility controls and basemap picker

import { Eye, Layers, Map, Cloud } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useMapStore } from '@/stores';
import { StylePicker } from './StylePicker';

/**
 * Layers list with visibility toggles and basemap selector
 */
export function LayersList() {
    const terrainEnabled = useMapStore((state) => state.terrainEnabled);
    const terrainExaggeration = useMapStore((state) => state.terrainExaggeration);
    const setTerrainEnabled = useMapStore((state) => state.setTerrainEnabled);
    const setTerrainExaggeration = useMapStore((state) => state.setTerrainExaggeration);

    return (
        <div className="space-y-6">
            {/* Basemap Style Picker */}
            <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <Map className="w-4 h-4" />
                    Basemap Style
                </h3>
                <StylePicker />
            </div>

            {/* Terrain layer */}
            <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <Layers className="w-4 h-4" />
                    Overlays
                </h3>

                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Layers className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">3D Terrain</h4>
                                <p className="text-sm text-gray-500">Elevation overlay</p>
                            </div>
                        </div>
                        <Switch
                            checked={terrainEnabled}
                            onCheckedChange={setTerrainEnabled}
                        />
                    </div>

                    {terrainEnabled && (
                        <div className="space-y-3 pt-3 border-t">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Exaggeration</span>
                                <span className="font-medium text-gray-900">{terrainExaggeration.toFixed(1)}x</span>
                            </div>
                            <Slider
                                value={[terrainExaggeration]}
                                onValueChange={([value]) => setTerrainExaggeration(value)}
                                min={0.5}
                                max={3}
                                step={0.1}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Subtle</span>
                                <span>Dramatic</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hillshade layer */}
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Eye className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">Hillshade</h4>
                            <p className="text-sm text-gray-500">Terrain shading</p>
                        </div>
                    </div>
                    <Switch checked={terrainEnabled} disabled />
                </div>
                <p className="text-xs text-gray-400 mt-2 ml-13">
                    Linked to 3D terrain
                </p>
            </div>

            {/* Weather Radar layer */}
            <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <Cloud className="w-4 h-4" />
                    Weather
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Cloud className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">Rain Radar</h4>
                                <p className="text-sm text-gray-500">BOM Live (AU only)</p>
                            </div>
                        </div>
                        <Switch
                            onCheckedChange={async (checked) => {
                                const { pluginRegistry } = await import('@/plugins/registry');
                                if (checked) {
                                    await pluginRegistry.enable('weather');
                                } else {
                                    await pluginRegistry.disable('weather');
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Placeholder for more layers */}
            <div className="text-center py-4 text-gray-400 text-sm border-t">
                Custom layers coming soon...
            </div>
        </div>
    );
}

export default LayersList;

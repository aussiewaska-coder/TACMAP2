// LayersList - Layer visibility controls
// Placeholder for now, will be populated with actual layers

import { Eye, EyeOff, Layers } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useMapStore } from '@/stores';

/**
 * Layers list with visibility toggles
 */
export function LayersList() {
    const terrainEnabled = useMapStore((state) => state.terrainEnabled);
    const terrainExaggeration = useMapStore((state) => state.terrainExaggeration);
    const setTerrainEnabled = useMapStore((state) => state.setTerrainEnabled);
    const setTerrainExaggeration = useMapStore((state) => state.setTerrainExaggeration);

    return (
        <div className="space-y-6">
            {/* Terrain layer */}
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Layers className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">3D Terrain</h4>
                            <p className="text-sm text-gray-500">AWS Elevation Tiles</p>
                        </div>
                    </div>
                    <Switch
                        checked={terrainEnabled}
                        onCheckedChange={setTerrainEnabled}
                    />
                </div>

                {terrainEnabled && (
                    <div className="space-y-3">
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

            {/* OSM Base layer (always on) */}
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Eye className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">OpenStreetMap</h4>
                            <p className="text-sm text-gray-500">Base map layer</p>
                        </div>
                    </div>
                    <Switch checked={true} disabled />
                </div>
            </div>

            {/* Hillshade layer */}
            <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Layers className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">Hillshade</h4>
                            <p className="text-sm text-gray-500">Terrain shading effect</p>
                        </div>
                    </div>
                    <Switch checked={true} disabled />
                </div>
            </div>

            {/* Placeholder for more layers */}
            <div className="text-center py-4 text-gray-400 text-sm">
                More layers coming soon...
            </div>
        </div>
    );
}

export default LayersList;

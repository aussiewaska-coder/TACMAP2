// SettingsPanel - Map settings controls
// Camera, terrain, and display settings

import { RotateCw, Compass, Mountain, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useMapStore } from '@/stores';
import { MAP_CONFIG } from '@/core/constants';
import { toast } from 'sonner';

/**
 * Settings panel for map configuration
 */
export function SettingsPanel() {
    const map = useMapStore((state) => state.map);
    const pitch = useMapStore((state) => state.pitch);
    const bearing = useMapStore((state) => state.bearing);
    const terrainEnabled = useMapStore((state) => state.terrainEnabled);
    const terrainExaggeration = useMapStore((state) => state.terrainExaggeration);
    const setTerrainEnabled = useMapStore((state) => state.setTerrainEnabled);
    const setTerrainExaggeration = useMapStore((state) => state.setTerrainExaggeration);

    const handleRotate90 = () => {
        if (map) {
            const currentBearing = map.getBearing();
            map.easeTo({
                bearing: currentBearing + 90,
                duration: 500,
            });
            toast.info('Rotating map 90°');
        }
    };

    const handleResetNorth = () => {
        if (map) {
            map.easeTo({
                bearing: 0,
                duration: 500,
            });
            toast.info('Resetting to north');
        }
    };

    const handleFlatView = () => {
        if (map) {
            map.easeTo({
                pitch: 0,
                duration: 500,
            });
        }
    };

    const handleTerrainView = () => {
        if (map) {
            map.easeTo({
                pitch: 60,
                duration: 500,
            });
        }
    };

    const handlePitchChange = (value: number[]) => {
        if (map) {
            map.easeTo({
                pitch: value[0],
                duration: 200,
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Camera Controls */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Camera
                </h3>

                {/* Pitch slider */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-2">
                            <Mountain className="w-4 h-4" />
                            Tilt Angle
                        </span>
                        <span className="font-medium text-gray-900">{Math.round(pitch)}°</span>
                    </div>
                    <Slider
                        value={[pitch]}
                        onValueChange={handlePitchChange}
                        min={0}
                        max={85}
                        step={5}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Top-down</span>
                        <span>3D View</span>
                    </div>
                </div>

                {/* Quick view buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        onClick={handleFlatView}
                        className="h-11"
                    >
                        <SunMedium className="w-4 h-4 mr-2" />
                        Flat View
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleTerrainView}
                        className="h-11"
                    >
                        <Mountain className="w-4 h-4 mr-2" />
                        3D View
                    </Button>
                </div>

                {/* Rotation controls */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRotate90}
                        className="h-11"
                    >
                        <RotateCw className="w-4 h-4 mr-2" />
                        Rotate 90°
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleResetNorth}
                        className="h-11"
                    >
                        <Compass className="w-4 h-4 mr-2" />
                        Reset North
                    </Button>
                </div>
            </div>

            {/* Terrain Settings */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Terrain
                </h3>

                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-gray-900">3D Terrain</h4>
                            <p className="text-sm text-gray-500">AWS Elevation Tiles</p>
                        </div>
                        <Switch
                            checked={terrainEnabled}
                            onCheckedChange={setTerrainEnabled}
                        />
                    </div>

                    {terrainEnabled && (
                        <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Exaggeration</span>
                                <span className="font-medium text-gray-900">{terrainExaggeration.toFixed(1)}x</span>
                            </div>
                            <Slider
                                value={[terrainExaggeration]}
                                onValueChange={([value]) => setTerrainExaggeration(value)}
                                min={MAP_CONFIG.TERRAIN.MIN_EXAGGERATION}
                                max={MAP_CONFIG.TERRAIN.MAX_EXAGGERATION}
                                step={0.1}
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SettingsPanel;

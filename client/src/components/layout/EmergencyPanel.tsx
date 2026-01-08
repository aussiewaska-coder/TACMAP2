// EmergencyPanel - Emergency Services controls for sidebar
// Displays aircraft tracking and emergency feeds

import { useState } from 'react';
import { Plane, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAircraftTracks } from '@/hooks/useAircraftTracks';
import { Badge } from '@/components/ui/badge';

/**
 * Emergency Services panel for sidebar
 * Controls aircraft tracking and emergency feeds
 */
export function EmergencyPanel() {
    const [aircraftEnabled, setAircraftEnabled] = useState(true);

    const { data: aircraftData, isLoading, error } = useAircraftTracks(aircraftEnabled);

    return (
        <div className="space-y-6">
            {/* Aircraft Tracking Section */}
            <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${aircraftEnabled ? 'bg-green-500/30' : 'bg-gray-500/20'}`}>
                            <Plane className={`w-5 h-5 ${aircraftEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h4 className="font-medium">Aircraft Tracking</h4>
                            <p className="text-sm text-white/60">Live emergency aircraft</p>
                        </div>
                    </div>
                    <Switch checked={aircraftEnabled} onCheckedChange={setAircraftEnabled} />
                </div>

                {aircraftEnabled && (
                    <div className="space-y-4">
                        {/* Stats */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Active Aircraft</span>
                                <span className="font-semibold text-lg">
                                    {isLoading ? '...' : aircraftData?.metadata.active_tracks || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Total Tracked</span>
                                <span className="font-semibold">
                                    {aircraftData?.metadata.total_tracked || 0}
                                </span>
                            </div>

                            {aircraftData?.metadata.stale && (
                                <Badge variant="outline" className="bg-yellow-900 text-yellow-100 text-xs w-full justify-center">
                                    Stale Data
                                </Badge>
                            )}

                            {error && (
                                <Badge variant="destructive" className="text-xs w-full justify-center">
                                    Error loading data
                                </Badge>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="pt-3 border-t border-white/10">
                            <h4 className="text-sm font-medium mb-3">Aircraft Legend</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                                    <span className="text-white/70">adsb.lol (Primary)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white" />
                                    <span className="text-white/70">OpenSky (Fallback)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gray-600 border-2 border-white opacity-50" />
                                    <span className="text-white/60">Stale (\u003e15s)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Coming Soon Sections */}
            <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    <h4 className="font-medium">Emergency Alerts</h4>
                </div>
                <p className="text-sm text-white/50 italic">Coming in Phase 2</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h4 className="font-medium">Radio Streams</h4>
                </div>
                <p className="text-sm text-white/50 italic">Coming in Phase 3</p>
            </div>
        </div>
    );
}

export default EmergencyPanel;

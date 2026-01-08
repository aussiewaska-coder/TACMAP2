// Emergency Services Dashboard Page
// Phase 1: Aircraft Tracking Only

import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, ScaleControl, GeolocateControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAircraftTracks } from '../hooks/useAircraftTracks';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plane, Radio, AlertTriangle } from 'lucide-react';

export default function EmergencyServices() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<MapLibreMap | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    const { data: aircraftData, isLoading, error } = useAircraftTracks(true);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new MapLibreMap({
            container: mapContainer.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [133.7751, -25.2744], // Center of Australia
            zoom: 4,
        });

        map.current.addControl(new NavigationControl(), 'top-right');
        map.current.addControl(new ScaleControl(), 'bottom-left');
        map.current.addControl(new GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }), 'top-right');

        map.current.on('load', () => {
            setMapLoaded(true);
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update aircraft layer
    useEffect(() => {
        if (!map.current || !mapLoaded || !aircraftData) return;

        const mapInstance = map.current;

        // Add or update aircraft source
        if (!mapInstance.getSource('aircraft')) {
            mapInstance.addSource('aircraft', {
                type: 'geojson',
                data: aircraftData,
            });

            // Add aircraft points layer
            mapInstance.addLayer({
                id: 'aircraft-points',
                type: 'circle',
                source: 'aircraft',
                paint: {
                    'circle-radius': [
                        'case',
                        ['get', 'stale'], 6,
                        8
                    ],
                    'circle-color': [
                        'case',
                        ['get', 'stale'], '#666666',
                        ['==', ['get', 'source'], 'adsb_lol'], '#00ff00',
                        '#ffaa00'
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': [
                        'case',
                        ['get', 'stale'], 0.4,
                        0.9
                    ],
                },
            });

            // Add aircraft labels
            mapInstance.addLayer({
                id: 'aircraft-labels',
                type: 'symbol',
                source: 'aircraft',
                layout: {
                    'text-field': [
                        'coalesce',
                        ['get', 'registration'],
                        ['get', 'callsign'],
                        ['get', 'icao24']
                    ],
                    'text-font': ['Open Sans Regular'],
                    'text-size': 11,
                    'text-offset': [0, 1.5],
                    'text-anchor': 'top',
                },
                paint: {
                    'text-color': '#ffffff',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1,
                    'text-opacity': [
                        'case',
                        ['get', 'stale'], 0.5,
                        1
                    ],
                },
            });

            // Add popup on click
            mapInstance.on('click', 'aircraft-points', (e) => {
                if (!e.features || e.features.length === 0) return;

                const feature = e.features[0];
                const props = feature.properties;

                const html = `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">
              ${props?.registration || props?.callsign || props?.icao24}
            </h3>
            <div style="font-size: 12px;">
              <div><strong>ICAO24:</strong> ${props?.icao24}</div>
              ${props?.operator ? `<div><strong>Operator:</strong> ${props.operator}</div>` : ''}
              ${props?.role ? `<div><strong>Role:</strong> ${props.role}</div>` : ''}
              <div><strong>Altitude:</strong> ${Math.round(props?.altitude_m || 0)}m</div>
              <div><strong>Speed:</strong> ${Math.round((props?.ground_speed_mps || 0) * 3.6)} km/h</div>
              <div><strong>Source:</strong> ${props?.source}</div>
              <div><strong>Age:</strong> ${props?.age_s}s ${props?.stale ? '(stale)' : ''}</div>
            </div>
          </div>
        `;

                new (window as any).maplibregl.Popup()
                    .setLngLat((e.lngLat as any))
                    .setHTML(html)
                    .addTo(mapInstance);
            });

            // Change cursor on hover
            mapInstance.on('mouseenter', 'aircraft-points', () => {
                mapInstance.getCanvas().style.cursor = 'pointer';
            });

            mapInstance.on('mouseleave', 'aircraft-points', () => {
                mapInstance.getCanvas().style.cursor = '';
            });

        } else {
            // Update existing source
            const source = mapInstance.getSource('aircraft') as any;
            source.setData(aircraftData);
        }
    }, [aircraftData, mapLoaded]);

    return (
        <div className="h-screen w-full flex flex-col">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <h1 className="text-xl font-bold text-white">Emergency Services Dashboard</h1>
                        <Badge variant="outline" className="bg-blue-900 text-blue-100">
                            Phase 1: Aviation Tracking
                        </Badge>
                    </div>

                    <div className="flex items-center gap-4">
                        {aircraftData && (
                            <div className="flex items-center gap-2 text-sm">
                                <Plane className="w-4 h-4 text-green-400" />
                                <span className="text-white">
                                    {aircraftData.metadata.active_tracks} / {aircraftData.metadata.total_tracked} aircraft
                                </span>
                                {aircraftData.metadata.stale && (
                                    <Badge variant="outline" className="bg-yellow-900 text-yellow-100 text-xs">
                                        Stale Data
                                    </Badge>
                                )}
                            </div>
                        )}

                        {isLoading && (
                            <span className="text-gray-400 text-sm">Loading...</span>
                        )}

                        {error && (
                            <Badge variant="destructive" className="text-xs">
                                Error loading data
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
                <div ref={mapContainer} className="absolute inset-0" />

                {/* Legend */}
                <Card className="absolute bottom-4 left-4 p-3 bg-gray-900/90 border-gray-700">
                    <h3 className="text-sm font-semibold text-white mb-2">Aircraft Legend</h3>
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                            <span className="text-gray-200">adsb.lol (Primary)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white" />
                            <span className="text-gray-200">OpenSky (Fallback)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-600 border-2 border-white opacity-50" />
                            <span className="text-gray-400">Stale (\u003e15s)</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

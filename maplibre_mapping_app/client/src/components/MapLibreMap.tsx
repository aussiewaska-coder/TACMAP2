import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreGLMap, NavigationControl, ScaleControl, AttributionControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapLibreMapProps {
  /** Initial center coordinates [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Initial pitch (tilt) in degrees */
  pitch?: number;
  /** Initial bearing (rotation) in degrees */
  bearing?: number;
  /** Map style URL or style object */
  style?: string | maplibregl.StyleSpecification;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Map bounds to restrict panning */
  maxBounds?: [[number, number], [number, number]];
  /** Callback when map is loaded and ready */
  onMapLoad?: (map: MapLibreGLMap) => void;
  /** Callback when map moves */
  onMapMove?: (map: MapLibreGLMap) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show navigation controls */
  showNavigation?: boolean;
  /** Whether to show scale control */
  showScale?: boolean;
  /** Whether to enable terrain */
  enableTerrain?: boolean;
}

/**
 * Core MapLibre GL JS map component configured for Australia
 * 
 * Features:
 * - Australia-centered view (lat: -25.2744, lng: 133.7751)
 * - Zoom levels 3-20 (continent to street level)
 * - Navigation controls (zoom, compass, pitch, rotation)
 * - Scale bar
 * - Responsive container
 * - Touch-enabled interactions
 * 
 * @example
 * ```tsx
 * <MapLibreMap
 *   center={[133.7751, -25.2744]}
 *   zoom={4}
 *   onMapLoad={(map) => {
 *     // Add custom layers, markers, etc.
 *   }}
 * />
 * ```
 */
export function MapLibreMap({
  center = [133.7751, -25.2744], // Australia center
  zoom = 4,
  pitch = 0,
  bearing = 0,
  style = "https://demotiles.maplibre.org/style.json",
  minZoom = 3,
  maxZoom = 20,
  maxBounds,
  onMapLoad,
  onMapMove,
  className = "",
  showNavigation = true,
  showScale = true,
  enableTerrain = false,
}: MapLibreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreGLMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: style,
      center: center,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      minZoom: minZoom,
      maxZoom: maxZoom,
      maxBounds: maxBounds,
      attributionControl: false,
    });

    // Add attribution control
    map.current.addControl(new AttributionControl({
      compact: true,
    }), "bottom-right");

    // Add navigation control (zoom, compass, pitch, rotation)
    if (showNavigation) {
      map.current.addControl(
        new NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true,
        }),
        "top-right"
      );
    }

    // Add scale control
    if (showScale) {
      map.current.addControl(
        new ScaleControl({
          maxWidth: 100,
          unit: "metric",
        }),
        "bottom-left"
      );
    }

    // Handle map load event
    map.current.on("load", () => {
      if (!map.current) return;
      
      setMapLoaded(true);

      // Enable terrain if requested
      if (enableTerrain) {
        // Add terrain source and layer
        // Note: Requires a terrain-enabled style or DEM source
        try {
          map.current.addSource("terrainSource", {
            type: "raster-dem",
            url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
          });
          map.current.setTerrain({ source: "terrainSource", exaggeration: 1.5 });
        } catch (error) {
          console.warn("Terrain not available:", error);
        }
      }

      if (onMapLoad) {
        onMapLoad(map.current);
      }
    });

    // Handle map move events
    if (onMapMove) {
      map.current.on("move", () => {
        if (map.current) {
          onMapMove(map.current);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array - only initialize once

  // Update map style when it changes
  useEffect(() => {
    if (map.current && mapLoaded && typeof style === "string") {
      map.current.setStyle(style);
    }
  }, [style, mapLoaded]);

  return (
    <div 
      ref={mapContainer} 
      className={`w-full h-full ${className}`}
      style={{ minHeight: "400px" }}
    />
  );
}

export default MapLibreMap;

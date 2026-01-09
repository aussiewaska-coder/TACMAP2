import { useEffect, useRef } from "react";
import { Map as MapLibreGLMap } from "maplibre-gl";
// @ts-ignore - mapbox-gl-draw doesn't have types
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
// @ts-ignore - maplibre-gl-geocoder type issues
import MaplibreGeocoder from "@maplibre/maplibre-gl-geocoder";
import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";
import { MaplibreExportControl, Size, PageOrientation, Format, DPI } from "@watergis/maplibre-gl-export";
import "@watergis/maplibre-gl-export/dist/maplibre-gl-export.css";
// @ts-ignore - mapbox-gl-compare doesn't have types
import Compare from "mapbox-gl-compare";
import "mapbox-gl-compare/dist/mapbox-gl-compare.css";

export interface MapPluginsProps {
  map: MapLibreGLMap;
  enableDraw?: boolean;
  enableGeocoder?: boolean;
  enableExport?: boolean;
  enableMeasure?: boolean;
  onDrawCreate?: (features: any) => void;
  onDrawUpdate?: (features: any) => void;
  onDrawDelete?: (features: any) => void;
}

/**
 * MapPlugins component - Integrates MapLibre plugins
 * 
 * Supported plugins:
 * - MapboxDraw: Drawing and editing geometries (points, lines, polygons)
 * - MaplibreGeocoder: Search and geocoding functionality
 * - MapboxExportControl: Export map to PDF/PNG/JPEG/SVG
 * - Measure: Distance and area measurements
 * 
 * @example
 * ```tsx
 * <MapPlugins
 *   map={mapInstance}
 *   enableDraw={true}
 *   enableGeocoder={true}
 *   enableExport={true}
 *   onDrawCreate={(features) => console.log('Created:', features)}
 * />
 * ```
 */
export function MapPlugins({
  map,
  enableDraw = false,
  enableGeocoder = false,
  enableExport = false,
  enableMeasure = false,
  onDrawCreate,
  onDrawUpdate,
  onDrawDelete,
}: MapPluginsProps) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const geocoderRef = useRef<MaplibreGeocoder | null>(null);
  const exportControlRef = useRef<MaplibreExportControl | null>(null);

  // Initialize Draw plugin
  useEffect(() => {
    if (!map || !enableDraw) return;

    if (!drawRef.current) {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          point: true,
          line_string: true,
          polygon: true,
          trash: true,
          combine_features: false,
          uncombine_features: false,
        },
        styles: [
          // Custom styles for drawn features
          {
            id: "gl-draw-polygon-fill-inactive",
            type: "fill",
            filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            paint: {
              "fill-color": "#3bb2d0",
              "fill-outline-color": "#3bb2d0",
              "fill-opacity": 0.1,
            },
          },
          {
            id: "gl-draw-polygon-fill-active",
            type: "fill",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
            paint: {
              "fill-color": "#fbb03b",
              "fill-outline-color": "#fbb03b",
              "fill-opacity": 0.1,
            },
          },
          {
            id: "gl-draw-polygon-stroke-inactive",
            type: "line",
            filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#3bb2d0",
              "line-width": 2,
            },
          },
          {
            id: "gl-draw-polygon-stroke-active",
            type: "line",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#fbb03b",
              "line-width": 2,
            },
          },
          {
            id: "gl-draw-line-inactive",
            type: "line",
            filter: ["all", ["==", "active", "false"], ["==", "$type", "LineString"], ["!=", "mode", "static"]],
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#3bb2d0",
              "line-width": 2,
            },
          },
          {
            id: "gl-draw-line-active",
            type: "line",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "LineString"]],
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#fbb03b",
              "line-width": 2,
            },
          },
          {
            id: "gl-draw-point-inactive",
            type: "circle",
            filter: ["all", ["==", "active", "false"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
            paint: {
              "circle-radius": 5,
              "circle-color": "#3bb2d0",
            },
          },
          {
            id: "gl-draw-point-active",
            type: "circle",
            filter: ["all", ["==", "active", "true"], ["==", "$type", "Point"]],
            paint: {
              "circle-radius": 7,
              "circle-color": "#fbb03b",
            },
          },
        ],
      });

      map.addControl(draw as any, "top-left");
      drawRef.current = draw;

      // Event listeners
      if (onDrawCreate) {
        map.on("draw.create", (e) => onDrawCreate(e.features));
      }
      if (onDrawUpdate) {
        map.on("draw.update", (e) => onDrawUpdate(e.features));
      }
      if (onDrawDelete) {
        map.on("draw.delete", (e) => onDrawDelete(e.features));
      }
    }

    return () => {
      if (drawRef.current && map) {
        try {
          map.removeControl(drawRef.current as any);
        } catch (error) {
          console.warn('Error removing draw control:', error);
        }
        drawRef.current = null;
      }
    };
  }, [map, enableDraw, onDrawCreate, onDrawUpdate, onDrawDelete]);

  // Initialize Geocoder plugin
  useEffect(() => {
    if (!map || !enableGeocoder) return;

    if (!geocoderRef.current) {
      // @ts-ignore - geocoder API type mismatch
      const geocoder = new MaplibreGeocoder({
        forwardGeocode: async (config: any): Promise<any> => {
          // Use Nominatim for geocoding (free, no API key required)
          const features = [];
          try {
            const request = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
              config.query
            )}&format=geojson&limit=5&countrycodes=au&addressdetails=1`;
            
            const response = await fetch(request);
            const geojson = await response.json();
            
            for (const feature of geojson.features) {
              const center = [
                feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
                feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2,
              ];
              const point = {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: center,
                },
                place_name: feature.properties.display_name,
                properties: feature.properties,
                text: feature.properties.display_name,
                place_type: ["place"],
                center,
              };
              features.push(point);
            }
          } catch (e) {
            console.error("Geocoding error:", e);
          }

          return {
            type: "FeatureCollection",
            features,
          };
        },
        maplibregl: (window as any).maplibregl || undefined,
        placeholder: "Search Australia...",
        proximity: {
          longitude: 133.7751,
          latitude: -25.2744,
        },
        collapsed: false,
        clearAndBlurOnEsc: true,
        clearOnBlur: false,
      } as any);

      map.addControl(geocoder as any, "top-left");
      geocoderRef.current = geocoder;
    }

    return () => {
      if (geocoderRef.current && map) {
        try {
          map.removeControl(geocoderRef.current as any);
        } catch (error) {
          console.warn('Error removing geocoder control:', error);
        }
        geocoderRef.current = null;
      }
    };
  }, [map, enableGeocoder]);

  // Initialize Export plugin
  useEffect(() => {
    if (!map || !enableExport) return;

    if (!exportControlRef.current) {
      const exportControl = new MaplibreExportControl({
        PageSize: Size.A4,
        PageOrientation: PageOrientation.Portrait,
        Format: Format.PNG,
        DPI: DPI[300],
        Crosshair: true,
        PrintableArea: true,
        Local: "en",
      });

      map.addControl(exportControl as any, "top-right");
      exportControlRef.current = exportControl;
    }

    return () => {
      if (exportControlRef.current && map) {
        try {
          map.removeControl(exportControlRef.current as any);
        } catch (error) {
          console.warn('Error removing export control:', error);
        }
        exportControlRef.current = null;
      }
    };
  }, [map, enableExport]);

  return null; // This component doesn't render anything
}

export default MapPlugins;

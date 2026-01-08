import { useState, useRef, useEffect } from "react";
import maplibregl, { Map as MapLibreGLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DndContext } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Settings, MapPin, Pencil, RotateCw, Navigation } from "lucide-react";
import MapSettingsModal from "@/components/MapSettingsModal";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Mobile-friendly map page with clean UI
 * All controls are hidden in modals on mobile
 */
export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreGLMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCities, setShowCities] = useState(false);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.5);
  
  // Fetch map settings
  const { data: settings } = trpc.mapSettings.get.useQuery();

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Create complete style with AWS terrain built in
    const mapStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        "osm-tiles": {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
        // AWS Terrain Tiles - Terrarium format (DEFAULT)
        "aws-terrain": {
          type: "raster-dem",
          tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
          tileSize: 256,
          encoding: "terrarium",
          maxzoom: 15,
        },
      },
      layers: [
        {
          id: "osm-layer",
          type: "raster",
          source: "osm-tiles",
          minzoom: 0,
          maxzoom: 22,
        },
        {
          id: "hillshade",
          type: "hillshade",
          source: "aws-terrain",
          layout: { visibility: "visible" },
          paint: {
            "hillshade-exaggeration": 0.6,
            "hillshade-shadow-color": "#473B24",
            "hillshade-highlight-color": "#FFFFFF",
          },
        },
      ],
      // TERRAIN IS DEFAULT - loads immediately
      terrain: {
        source: "aws-terrain",
        exaggeration: 1.5,
      },
      // Sky layer for atmosphere effect
      sky: {},
    };

    // Initialize map with terrain style
    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: settings ? [parseFloat(settings.centerLng), parseFloat(settings.centerLat)] : [133.7751, -25.2744],
      zoom: settings?.zoom || 4,
      pitch: 60, // Tilted view to see terrain
      bearing: settings?.bearing || 0,
      minZoom: 3,
      maxZoom: 18,
    });

    // Add navigation controls
    mapRef.current.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "top-right"
    );

    // Add scale control
    mapRef.current.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 200,
        unit: "metric",
      }),
      "bottom-left"
    );

    // Add geolocate control
    mapRef.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      "top-right"
    );

    mapRef.current.on("load", () => {
      if (!mapRef.current) return;

      // Add sky layer for 3D atmosphere
      mapRef.current.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 0.0],
          "sky-atmosphere-sun-intensity": 15,
        },
      } as any);

      // Add Australia outline
      mapRef.current.addSource("australia-outline", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [113, -10],
              [153, -10],
              [153, -44],
              [113, -44],
              [113, -10],
            ]],
          },
          properties: {},
        },
      });

      mapRef.current.addLayer({
        id: "australia-outline-layer",
        type: "line",
        source: "australia-outline",
        paint: {
          "line-color": "#0080ff",
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      });

      setMapLoaded(true);
      console.log("Map loaded with AWS 3D terrain (DEFAULT)");
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update terrain exaggeration dynamically
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      try {
        mapRef.current.setTerrain({
          source: "aws-terrain",
          exaggeration: terrainExaggeration,
        });
      } catch (error) {
        console.warn("Failed to update terrain exaggeration:", error);
      }
    }
  }, [terrainExaggeration, mapLoaded]);

  const flyToCity = async (name: string, lng: number, lat: number, zoom: number = 12) => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    
    // Show loading toast
    const loadingToast = toast.loading(`Preparing ${name}...`);
    
    try {
      // Step 1: Preload tiles at destination by temporarily setting view
      // This loads tiles without animation
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      const currentPitch = map.getPitch();
      const currentBearing = map.getBearing();
      
      // Jump to destination to trigger tile loading (invisible to user)
      map.jumpTo({
        center: [lng, lat],
        zoom: zoom,
      });
      
      // Wait for tiles to load
      await new Promise<void>((resolve) => {
        let tilesLoaded = false;
        const checkTiles = () => {
          if (!map.areTilesLoaded()) {
            setTimeout(checkTiles, 100);
          } else {
            if (!tilesLoaded) {
              tilesLoaded = true;
              resolve();
            }
          }
        };
        // Start checking after a brief delay
        setTimeout(checkTiles, 200);
        // Timeout after 3 seconds to prevent infinite waiting
        setTimeout(() => {
          if (!tilesLoaded) {
            tilesLoaded = true;
            resolve();
          }
        }, 3000);
      });
      
      // Step 2: Jump back to original position
      map.jumpTo({
        center: currentCenter,
        zoom: currentZoom,
        pitch: currentPitch,
        bearing: currentBearing,
      });
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      toast.success(`Flying to ${name}`);
      
      // Step 3: Now do the smooth animated flyTo
      // Tiles are already loaded, so no loading delay!
      map.flyTo({
        center: [lng, lat],
        zoom: zoom,
        pitch: 60,
        duration: 3500, // Slower, more cinematic (3.5 seconds)
        essential: true,
        easing: (t) => {
          // Custom easing for smooth deceleration
          return t * (2 - t); // ease-out quad
        },
      });
      
      setShowCities(false); // Close modal after selection
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Failed to navigate to ${name}`);
      console.error("Navigation error:", error);
    }
  };

  const resetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [133.7751, -25.2744],
        zoom: 4,
        pitch: 60,
        bearing: 0,
        duration: 2000,
      });
      toast.info("Resetting to Australia view");
      setShowCities(false);
    }
  };

  const rotateMap = () => {
    if (mapRef.current) {
      const currentBearing = mapRef.current.getBearing();
      mapRef.current.easeTo({
        bearing: currentBearing + 90,
        duration: 1000,
      });
      toast.info("Rotating map 90°");
    }
  };

  const toggleDraw = () => {
    toast.info("Draw mode - Coming soon");
  };

  return (
    <DndContext>
      <div className="relative w-full h-screen">
        {/* Map Container */}
        <div ref={mapContainer} className="w-full h-full" />

        {/* Settings Modal */}
        {showSettings && mapRef.current && (
          <MapSettingsModal
            map={mapRef.current}
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            terrainExaggeration={terrainExaggeration}
            onTerrainExaggerationChange={setTerrainExaggeration}
          />
        )}

        {/* Cities Modal */}
        <Dialog open={showCities} onOpenChange={setShowCities}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Australian Cities
              </DialogTitle>
              <DialogDescription>
                Quick navigation to major cities and landmarks
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 mt-4">
              <Button variant="outline" onClick={() => flyToCity("Sydney", 151.2093, -33.8688)} className="justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                Sydney
              </Button>
              <Button variant="outline" onClick={() => flyToCity("Melbourne", 144.9631, -37.8136)} className="justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                Melbourne
              </Button>
              <Button variant="outline" onClick={() => flyToCity("Brisbane", 153.0251, -27.4698)} className="justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                Brisbane
              </Button>
              <Button variant="outline" onClick={() => flyToCity("Perth", 115.8605, -31.9505)} className="justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                Perth
              </Button>
              <Button variant="outline" onClick={() => flyToCity("Adelaide", 138.6007, -34.9285)} className="justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                Adelaide
              </Button>
              <Button variant="outline" onClick={() => flyToCity("Canberra", 149.1300, -35.2809)} className="justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                Canberra
              </Button>
              <Button variant="outline" onClick={() => flyToCity("Blue Mountains", 150.3117, -33.7152, 13)} className="justify-start bg-green-50">
                <MapPin className="w-4 h-4 mr-2 text-green-600" />
                Blue Mountains ⛰️
              </Button>
              <Button variant="outline" onClick={() => flyToCity("Tasmania (Cradle Mt)", 145.9500, -41.6500, 13)} className="justify-start bg-green-50">
                <MapPin className="w-4 h-4 mr-2 text-green-600" />
                Tasmania (Cradle Mt) ⛰️
              </Button>
              <div className="border-t pt-2 mt-2">
                <Button variant="outline" onClick={resetView} className="justify-start w-full">
                  Reset to Australia View
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile-Friendly Control Buttons - Bottom Right */}
        <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-3 md:bottom-4">
          {/* Cities Button */}
          <Button
            variant="default"
            size="icon"
            onClick={() => setShowCities(true)}
            title="Cities & Locations"
            className="bg-blue-600 text-white hover:bg-blue-700 shadow-xl w-14 h-14 md:w-12 md:h-12"
          >
            <Navigation className="w-6 h-6" />
          </Button>
          
          {/* Settings Button */}
          <Button
            variant="default"
            size="icon"
            onClick={() => setShowSettings(true)}
            title="Map Settings"
            className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl w-14 h-14 md:w-12 md:h-12"
          >
            <Settings className="w-6 h-6" />
          </Button>
          
          {/* Draw Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleDraw}
            title="Toggle Draw Mode"
            className="bg-white text-gray-800 hover:bg-gray-100 shadow-xl w-14 h-14 md:w-12 md:h-12"
          >
            <Pencil className="w-6 h-6" />
          </Button>
          
          {/* Rotate Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={rotateMap}
            title="Rotate Map 90°"
            className="bg-white text-gray-800 hover:bg-gray-100 shadow-xl w-14 h-14 md:w-12 md:h-12"
          >
            <RotateCw className="w-6 h-6" />
          </Button>
        </div>

        {/* Status Indicator - Hidden on small mobile */}
        {mapLoaded && (
          <div className="hidden sm:flex absolute bottom-20 left-4 z-10 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-xl items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            AWS 3D Terrain Active
          </div>
        )}
      </div>
    </DndContext>
  );
}

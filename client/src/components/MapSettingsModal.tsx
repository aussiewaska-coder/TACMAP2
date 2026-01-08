import { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, Layers, Palette, Sliders, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map as MapLibreGLMap } from "maplibre-gl";
import { toast } from "sonner";

export interface MapSettingsModalProps {
  map: MapLibreGLMap | null;
  isOpen: boolean;
  onClose: () => void;
  terrainExaggeration?: number;
  onTerrainExaggerationChange?: (value: number) => void;
}

function DraggableModal({ children, isOpen, onClose }: { children: React.ReactNode; isOpen: boolean; onClose: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "map-settings-modal",
  });

  const style = transform
    ? {
      transform: CSS.Translate.toString(transform),
    }
    : undefined;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[200]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={setNodeRef}
        style={style}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[500px] max-w-[90vw] max-h-[80vh] overflow-hidden"
      >
        <Card className="shadow-2xl border-2">
          <CardHeader
            {...listeners}
            {...attributes}
            className="cursor-move bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-5 h-5" />
                <CardTitle>Map Settings</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <CardDescription className="text-white/90">
              Configure map layers, styles, and controls
            </CardDescription>
          </CardHeader>
          {children}
        </Card>
      </div>
    </>
  );
}

/**
 * Draggable settings modal with WORKING controls
 */
export function MapSettingsModal({ map, isOpen, onClose, terrainExaggeration: parentTerrainExaggeration, onTerrainExaggerationChange }: MapSettingsModalProps) {
  const [pitch, setPitch] = useState(60);
  const [bearing, setBearing] = useState(0);
  const [zoom, setZoom] = useState(4);
  const [activeStyle, setActiveStyle] = useState("default");
  const [localTerrainExaggeration, setLocalTerrainExaggeration] = useState(parentTerrainExaggeration || 1.5);

  // Use parent state if provided, otherwise use local state
  const terrainExaggeration = parentTerrainExaggeration !== undefined ? parentTerrainExaggeration : localTerrainExaggeration;
  const setTerrainExaggeration = onTerrainExaggerationChange || setLocalTerrainExaggeration;

  // Real map styles
  const mapStyles = [
    {
      id: "default",
      name: "Default (MapLibre Demo)",
      url: "https://demotiles.maplibre.org/style.json"
    },
    {
      id: "osm-bright",
      name: "OSM Bright",
      url: "https://tiles.openfreemap.org/styles/bright"
    },
    {
      id: "osm-liberty",
      name: "OSM Liberty",
      url: "https://tiles.openfreemap.org/styles/liberty"
    },
    {
      id: "positron",
      name: "Positron (Light)",
      url: "https://tiles.openfreemap.org/styles/positron"
    },
    {
      id: "dark-matter",
      name: "Dark Matter",
      url: "https://tiles.openfreemap.org/styles/dark-matter"
    },
  ];

  // Layer controls
  const [layers, setLayers] = useState([
    { id: "hills", name: "Hillshade", visible: true, opacity: 100, type: "hillshade" },
    { id: "sky", name: "Sky Layer", visible: true, opacity: 100, type: "sky" },
    { id: "australia-outline-layer", name: "Australia Outline", visible: true, opacity: 100, type: "line" },
    { id: "gov-landuse-layer", name: "🇦🇺 Land Use (2019)", visible: false, opacity: 70, type: "raster" },
    { id: "gov-geology-layer", name: "🇦🇺 Surface Geology", visible: false, opacity: 60, type: "raster" },
    { id: "gov-bushfire-layer", name: "🔥 Active Fires (72h)", visible: false, opacity: 90, type: "raster" },
    { id: "heatmap-layer", name: "Heatmap", visible: true, opacity: 100, type: "heatmap" },
    { id: "clusters", name: "Clusters", visible: true, opacity: 100, type: "circle" },
  ]);

  // Update state when map changes
  useEffect(() => {
    if (!map) return;

    const updateMapState = () => {
      setPitch(Math.round(map.getPitch()));
      setBearing(Math.round(map.getBearing()));
      setZoom(Math.round(map.getZoom() * 10) / 10);
    };

    map.on("move", updateMapState);
    updateMapState();

    return () => {
      map.off("move", updateMapState);
    };
  }, [map]);

  const handlePitchChange = (value: number[]) => {
    if (map) {
      map.easeTo({ pitch: value[0], duration: 300 });
      setPitch(value[0]);
    }
  };

  const handleBearingChange = (value: number[]) => {
    if (map) {
      map.easeTo({ bearing: value[0], duration: 300 });
      setBearing(value[0]);
    }
  };

  const handleZoomChange = (value: number[]) => {
    if (map) {
      map.easeTo({ zoom: value[0], duration: 300 });
      setZoom(value[0]);
    }
  };

  const handleTerrainExaggerationChange = (value: number[]) => {
    if (!map) return;

    const exaggeration = value[0];
    setTerrainExaggeration(exaggeration);

    // ACTUALLY SET THE TERRAIN EXAGGERATION
    map.setTerrain({
      source: "terrainSource",
      exaggeration: exaggeration,
    });

    toast.success(`Terrain exaggeration: ${exaggeration.toFixed(1)}x`);
  };

  const handleLayerVisibilityToggle = (layerId: string) => {
    if (!map) return;

    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        const newVisibility = !layer.visible;

        try {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(
              layerId,
              "visibility",
              newVisibility ? "visible" : "none"
            );
            toast.success(`${layer.name}: ${newVisibility ? "visible" : "hidden"}`);
          }
        } catch (error) {
          console.warn(`Layer ${layerId} not found on map`);
        }

        return { ...layer, visible: newVisibility };
      }
      return layer;
    }));
  };

  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    if (!map) return;

    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        try {
          if (map.getLayer(layerId)) {
            const layerType = map.getLayer(layerId)?.type;
            const opacityValue = opacity / 100;

            switch (layerType) {
              case "line":
                map.setPaintProperty(layerId, "line-opacity", opacityValue);
                break;
              case "fill":
                map.setPaintProperty(layerId, "fill-opacity", opacityValue);
                break;
              case "circle":
                map.setPaintProperty(layerId, "circle-opacity", opacityValue);
                break;
              case "heatmap":
                map.setPaintProperty(layerId, "heatmap-opacity", opacityValue);
                break;
              case "raster":
                map.setPaintProperty(layerId, "raster-opacity", opacityValue);
                break;
            }
          }
        } catch (error) {
          console.warn(`Could not set opacity for layer ${layerId}`);
        }

        return { ...layer, opacity };
      }
      return layer;
    }));
  };

  const handleStyleChange = (styleId: string) => {
    if (!map) return;

    const style = mapStyles.find(s => s.id === styleId);
    if (style) {
      toast.info(`Switching to ${style.name}...`);

      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      const currentPitch = map.getPitch();
      const currentBearing = map.getBearing();

      map.setStyle(style.url);

      map.once("style.load", () => {
        map.jumpTo({
          center: currentCenter,
          zoom: currentZoom,
          pitch: currentPitch,
          bearing: currentBearing,
        });

        // Re-add terrain sources
        if (!map.getSource("terrainSource")) {
          map.addSource("terrainSource", {
            type: "raster-dem",
            url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
            tileSize: 256,
          });
        }

        if (!map.getSource("hillshadeSource")) {
          map.addSource("hillshadeSource", {
            type: "raster-dem",
            url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
            tileSize: 256,
          });
        }

        // Re-enable terrain
        map.setTerrain({
          source: "terrainSource",
          exaggeration: terrainExaggeration,
        });

        toast.success(`Switched to ${style.name}`);
      });

      setActiveStyle(styleId);
    }
  };

  return (
    <DraggableModal isOpen={isOpen} onClose={onClose}>
      <CardContent className="p-4 overflow-y-auto max-h-[60vh]">
        <Tabs defaultValue="terrain" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="terrain">
              <MapIcon className="w-4 h-4 mr-1" />
              Terrain
            </TabsTrigger>
            <TabsTrigger value="layers">
              <Layers className="w-4 h-4 mr-1" />
              Layers
            </TabsTrigger>
            <TabsTrigger value="styles">
              <Palette className="w-4 h-4 mr-1" />
              Styles
            </TabsTrigger>
            <TabsTrigger value="controls">
              <Sliders className="w-4 h-4 mr-1" />
              Controls
            </TabsTrigger>
          </TabsList>

          {/* Terrain Tab - FIRST */}
          <TabsContent value="terrain" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-800 mb-2">✅ 3D Terrain is ACTIVE</p>
                <p className="text-xs text-green-700">Zoom in to cities to see real elevation. Adjust exaggeration below.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Terrain Exaggeration</Label>
                  <span className="text-sm font-bold text-indigo-600">{terrainExaggeration.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[terrainExaggeration]}
                  onValueChange={handleTerrainExaggerationChange}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-gray-600">
                  Adjust vertical exaggeration of terrain elevation. Higher values make mountains more dramatic.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Layers Tab */}
          <TabsContent value="layers" className="space-y-4 mt-4">
            <div className="space-y-4">
              {layers.map(layer => (
                <div key={layer.id} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`layer-${layer.id}`} className="font-medium">
                      {layer.name}
                    </Label>
                    <Switch
                      id={`layer-${layer.id}`}
                      checked={layer.visible}
                      onCheckedChange={() => handleLayerVisibilityToggle(layer.id)}
                    />
                  </div>
                  {layer.visible && layer.type !== "sky" && layer.type !== "hillshade" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Opacity</span>
                        <span className="font-medium">{layer.opacity}%</span>
                      </div>
                      <Slider
                        value={[layer.opacity]}
                        onValueChange={(value) => handleLayerOpacityChange(layer.id, value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Styles Tab */}
          <TabsContent value="styles" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Basemap Style</Label>
              <Select value={activeStyle} onValueChange={handleStyleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  {mapStyles.map(style => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600">
                Choose a basemap style. Terrain will be preserved when switching.
              </p>
            </div>
          </TabsContent>

          {/* Controls Tab */}
          <TabsContent value="controls" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Pitch Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pitch (Tilt)</Label>
                  <span className="text-sm font-medium">{pitch}°</span>
                </div>
                <Slider
                  value={[pitch]}
                  onValueChange={handlePitchChange}
                  min={0}
                  max={85}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Bearing Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Bearing (Rotation)</Label>
                  <span className="text-sm font-medium">{bearing}°</span>
                </div>
                <Slider
                  value={[bearing]}
                  onValueChange={handleBearingChange}
                  min={0}
                  max={360}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Zoom Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Zoom Level</Label>
                  <span className="text-sm font-medium">{zoom}</span>
                </div>
                <Slider
                  value={[zoom]}
                  onValueChange={handleZoomChange}
                  min={3}
                  max={20}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (map) {
                    map.easeTo({
                      pitch: 60,
                      bearing: 0,
                      zoom: 4,
                      center: [133.7751, -25.2744],
                      duration: 1000,
                    });
                    toast.success("Reset to default view");
                  }
                }}
              >
                Reset to Default View
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </DraggableModal>
  );
}

export default MapSettingsModal;

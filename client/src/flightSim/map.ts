import maplibregl, { Map, LngLatLike } from "maplibre-gl";

export function initMap(containerId = "flight-map"): Map {
  const MAPTILER_KEY =
    (import.meta as any).env?.VITE_MAPTILER_API_KEY ||
    (typeof process !== "undefined" ? (process as any).env?.VITE_MAPTILER_API_KEY : undefined) ||
    "YOUR_API_KEY";

  const map = new maplibregl.Map({
    container: containerId,
    style: `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`,
    center: [0, 0],
    zoom: 5,
    pitch: 45,
    bearing: 0,
    projection: "mercator"
  });

  map.touchZoomRotate.disableRotation(); // camera roll driven by aircraft, not gestures
  map.on("load", () => {
    map.setFog({
      color: "rgba(11,12,20,0.85)",
      "horizon-blend": 0.1
    });
  });

  return map;
}

export function smoothSetMapView(map: Map, center: LngLatLike, pitch: number, bearing: number) {
  // Small eased adjustments each frame keep motion cinematic without snapping.
  map.jumpTo({
    center,
    pitch,
    bearing
  });
}

export function setProjection(map: Map, globe: boolean) {
  const projection = globe ? "globe" : "mercator";
  const current = (map as any).getProjection ? (map as any).getProjection() : null;
  const currentName = current?.name;
  if (!currentName) return;
  if (currentName !== projection) {
    map.setProjection(projection);
  }
}

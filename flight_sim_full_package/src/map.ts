import maplibregl, { Map } from "maplibre-gl";

export function initMap(): Map {
  const MAPTILER_KEY =
    (import.meta as any).env?.VITE_MAPTILER_API_KEY ||
    (typeof process !== "undefined" ? (process as any).env?.VITE_MAPTILER_API_KEY : undefined) ||
    "YOUR_API_KEY";

  const map = new maplibregl.Map({
    container: "map",
    style: `https://api.maptiler.com/maps/3d-world/style.json?key=${MAPTILER_KEY}`,
    center: [0, 0],
    zoom: 5,
    pitch: 45,
    bearing: 0,
    projection: "mercator"
  } as any);

  map.touchZoomRotate.disableRotation(); // camera roll driven by aircraft, not gestures
  map.on("load", () => {
    (map as any).setFog({
      color: "rgba(11,12,20,0.85)",
      "horizon-blend": 0.1
    });
  });

  return map;
}

export function setProjection(map: Map, globe: boolean) {
  const projection = globe ? "globe" : "mercator";
  const current = (map.getProjection() as any)?.name;
  if (current !== projection) {
    (map as any).setProjection(projection);
  }
}

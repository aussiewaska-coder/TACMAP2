import type { Map, Marker } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { Target } from "./types";

export function initNavigation(map: Map, setTarget: (target: Target | null) => void) {
  let marker: Marker | null = null;

  map.on("click", (e) => {
    const target: Target = { lat: e.lngLat.lat, lng: e.lngLat.lng };
    setTarget(target);
    marker = ensureMarker(marker, map, target);
  });

  map.on("dragstart", () => {
    // user drag shouldn't clear target
  });

  return {
    clearTarget() {
      setTarget(null);
      if (marker) {
        marker.remove();
        marker = null;
      }
    }
  };
}

function ensureMarker(existing: Marker | null, map: Map, target: Target): Marker {
  if (existing) {
    existing.setLngLat([target.lng, target.lat]);
    return existing;
  }
  const el = document.createElement("div");
  el.style.width = "12px";
  el.style.height = "12px";
  el.style.border = "2px solid #ffed8a";
  el.style.borderRadius = "50%";
  el.style.boxShadow = "0 0 12px rgba(255,237,138,0.7)";
  el.style.background = "rgba(255,237,138,0.1)";
  return new maplibregl.Marker({ element: el }).setLngLat([target.lng, target.lat]).addTo(map);
}

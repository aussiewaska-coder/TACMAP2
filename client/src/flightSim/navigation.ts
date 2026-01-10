import type { Map, Marker } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { Target } from "./types";

export interface NavigationOptions {
  orbitMode?: boolean; // Whether to enter orbit mode immediately
  orbitRadius?: number; // Custom orbit radius in meters (optional)
  orbitSpeed?: number; // Custom orbit speed in rad/sec (optional)
}

export function initNavigation(
  map: Map,
  setTarget: (target: Target | null, options?: NavigationOptions) => void
) {
  let marker: Marker | null = null;

  map.on("click", (e) => {
    const originalEvent = e.originalEvent as MouseEvent;

    // Detect Shift+Command+Click (or Shift+Ctrl+Click on Windows/Linux)
    const isOrbitClick = originalEvent.shiftKey && (originalEvent.metaKey || originalEvent.ctrlKey);

    const target: Target = { lat: e.lngLat.lat, lng: e.lngLat.lng };

    if (isOrbitClick) {
      // Calculate zoom-adaptive orbit parameters
      const zoom = map.getZoom();
      const orbitRadius = calculateOrbitRadius(zoom);
      const orbitSpeed = calculateOrbitSpeed(); // 1 rotation per 60 seconds

      setTarget(target, {
        orbitMode: true,
        orbitRadius,
        orbitSpeed
      });
    } else {
      // Normal navigation mode
      setTarget(target);
    }

    marker = ensureMarker(marker, map, target, isOrbitClick);
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

// Calculate orbit radius based on zoom level
function calculateOrbitRadius(zoom: number): number {
  // Zoom-adaptive radius:
  // zoom 3 (continent) -> ~50km radius
  // zoom 6 (region) -> ~10km radius
  // zoom 9 (city) -> ~2km radius
  // zoom 12 (neighborhood) -> ~500m radius
  // zoom 15 (street) -> ~100m radius
  const baseRadius = 100_000; // 100km at zoom 0
  const zoomFactor = Math.pow(0.5, zoom - 3);
  const radius = baseRadius * zoomFactor;

  // Clamp between 100m and 100km
  return Math.max(100, Math.min(radius, 100_000));
}

// Calculate orbit speed for 1 rotation per 60 seconds
function calculateOrbitSpeed(): number {
  // 2π radians in 60 seconds = π/30 rad/sec
  return (2 * Math.PI) / 60;
}

function ensureMarker(existing: Marker | null, map: Map, target: Target, isOrbitMode = false): Marker {
  if (existing) {
    existing.setLngLat([target.lng, target.lat]);
    updateMarkerStyle(existing.getElement(), isOrbitMode);
    return existing;
  }
  const el = document.createElement("div");
  el.style.width = "12px";
  el.style.height = "12px";
  el.style.border = isOrbitMode ? "2px solid #60a5fa" : "2px solid #ffed8a";
  el.style.borderRadius = "50%";
  el.style.boxShadow = isOrbitMode
    ? "0 0 12px rgba(96,165,250,0.7)"
    : "0 0 12px rgba(255,237,138,0.7)";
  el.style.background = isOrbitMode
    ? "rgba(96,165,250,0.1)"
    : "rgba(255,237,138,0.1)";
  return new maplibregl.Marker({ element: el }).setLngLat([target.lng, target.lat]).addTo(map);
}

function updateMarkerStyle(el: HTMLElement, isOrbitMode: boolean) {
  el.style.border = isOrbitMode ? "2px solid #60a5fa" : "2px solid #ffed8a";
  el.style.boxShadow = isOrbitMode
    ? "0 0 12px rgba(96,165,250,0.7)"
    : "0 0 12px rgba(255,237,138,0.7)";
  el.style.background = isOrbitMode
    ? "rgba(96,165,250,0.1)"
    : "rgba(255,237,138,0.1)";
}

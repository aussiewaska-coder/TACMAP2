import { distanceToTargetMeters } from "./aircraft";
import { FlightState } from "./types";

export function initUI() {
  let hud = document.getElementById("hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "hud";
    hud.style.position = "absolute";
    hud.style.top = "16px";
    hud.style.left = "16px";
    hud.style.color = "#b7f8ff";
    hud.style.fontFamily = "monospace";
    hud.style.fontSize = "14px";
    hud.style.padding = "12px 14px";
    hud.style.background = "rgba(8,10,14,0.6)";
    hud.style.border = "1px solid rgba(183,248,255,0.2)";
    hud.style.borderRadius = "8px";
    hud.style.zIndex = "30";
    document.body.appendChild(hud);
  }

  function render(state: FlightState) {
    const dist = distanceToTargetMeters(state);
    const targetText = dist !== null ? `${(dist / 1000).toFixed(1)} km` : "—";
    hud!.innerHTML = `
      <div>MODE: ${state.mode}</div>
      <div>Speed: ${state.speedMps.toFixed(0)} m/s (Tier ${state.speedTier})</div>
      <div>Altitude: ${state.altitudeFt.toFixed(0)} ft</div>
      <div>Heading: ${(toDegrees(state.heading) + 360) % 360 | 0}°</div>
      <div>Target Distance: ${targetText}</div>
      <div>Globe: ${state.globe ? "ON" : "OFF"}</div>
    `;
  }

  return { render };
}

export function teardownUI() {
  const hud = document.getElementById("hud");
  if (hud && hud.parentElement) {
    hud.parentElement.removeChild(hud);
  }
}

function toDegrees(rad: number): number {
  return rad * (180 / Math.PI);
}

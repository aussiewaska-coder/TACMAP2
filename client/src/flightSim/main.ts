import { initMap } from "./map";
import { initAircraft, InitialFlightConfig } from "./aircraft";
import { consumeFrameInput, initControls, teardownControls } from "./controls";
import { initNavigation } from "./navigation";
import { initUI, teardownUI } from "./ui";
import { addAircraftModelLayer } from "./modelLayer";

export function startFlightSim(containerId = "flight-map", initial?: InitialFlightConfig) {
  const map = initMap({
    containerId,
    center: [initial?.lng ?? 133, initial?.lat ?? -25], // fallback to AU-ish center
    zoom: 6
  });
  const aircraft = initAircraft(map, initial);
  const ui = initUI();
  const nav = initNavigation(map, aircraft.setTarget);
  initControls();

  let stopped = false;

  map.on("load", () => {
    addAircraftModelLayer(map, () => aircraft.state);
  });

  function loop() {
    if (stopped) return;
    requestAnimationFrame(loop);
    const frameInput = consumeFrameInput();
    if (frameInput.cancelTarget) nav.clearTarget();
    aircraft.update(frameInput);
    ui.render(aircraft.state);
  }

  loop();

  return () => {
    stopped = true;
    teardownControls();
    teardownUI();
    map.remove();
  };
}

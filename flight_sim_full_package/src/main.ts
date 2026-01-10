import { initMap } from "./map";
import { initAircraft } from "./aircraft";
import { consumeFrameInput, initControls } from "./controls";
import { initNavigation } from "./navigation";
import { initUI } from "./ui";
import { addAircraftModelLayer } from "./modelLayer";
import { initCamera } from "./camera";

const map = initMap();
const aircraft = initAircraft(map);
const ui = initUI();
const nav = initNavigation(map, aircraft.setTarget);
const camera = initCamera(map);
initControls();

map.on("load", () => {
  addAircraftModelLayer(map, () => aircraft.state);
});

function loop() {
  requestAnimationFrame(loop);
  const frameInput = consumeFrameInput();
  if (frameInput.cancelTarget) nav.clearTarget();
  aircraft.update(frameInput);
  camera.update(aircraft.state);
  ui.render(aircraft.state);
}

loop();

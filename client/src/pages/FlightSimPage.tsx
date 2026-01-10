import { useEffect } from "react";
import { startFlightSim } from "@/flightSim/main";
import "@/flightSim/flightSim.css";
import "maplibre-gl/dist/maplibre-gl.css";

export default function FlightSimPage() {
  useEffect(() => {
    const teardown = startFlightSim("flight-map");
    return () => teardown?.();
  }, []);

  return (
    <div className="flight-sim-root">
      <div id="flight-map" className="flight-map" />
    </div>
  );
}

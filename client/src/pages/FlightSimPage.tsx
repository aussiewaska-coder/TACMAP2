import { useEffect, useMemo } from "react";
import { startFlightSim } from "@/flightSim/main";
import "@/flightSim/flightSim.css";
import "maplibre-gl/dist/maplibre-gl.css";

export default function FlightSimPage() {
  const initial = useMemo(() => {
    // Randomized Australian start near mid-continent, 10k ft, ~15,000 kph
    const lat = -44 + Math.random() * (-10 - -44);
    const lng = 112 + Math.random() * (154 - 112);
    return { lat, lng, altitudeFt: 10_000, speedKph: 15_000 };
  }, []);

  useEffect(() => {
    const teardown = startFlightSim("flight-map", initial);
    return () => teardown?.();
  }, [initial]);

  return (
    <div className="flight-sim-root">
      <div id="flight-map" className="flight-map" />
    </div>
  );
}

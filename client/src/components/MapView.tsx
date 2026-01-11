import { MapCore } from '../core/MapCore';
import { AlertsSidebar } from './AlertsSidebar';
import { AlertMarkers } from './AlertMarkers';
import { LayerControls } from './LayerControls';
import { FlightControlCenter } from './recon/FlightControlCenter';
import { TileSourceDebugger } from './TileSourceDebugger';
import { RedisCacheStatus } from './RedisCacheStatus';
import { CacheCoverageChecker } from './CacheCoverageChecker';

export function MapView() {
  return (
    <div className="relative w-full h-full">
      <MapCore>
        {(map) => (
          <>
            <LayerControls map={map} />
            <AlertsSidebar />
            <AlertMarkers />
            <FlightControlCenter />
            <TileSourceDebugger />
            <RedisCacheStatus />
            <CacheCoverageChecker />
          </>
        )}
      </MapCore>
    </div>
  );
}

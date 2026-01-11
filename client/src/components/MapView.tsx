import { MapCore } from '../core/MapCore';
import { AlertsSidebar } from './AlertsSidebar';
import { AlertMarkers } from './AlertMarkers';
import { LayerControls } from './LayerControls';
import { FlightControlCenter } from './recon/FlightControlCenter';
import { TileSourceDebugger } from './TileSourceDebugger';
import { RedisCacheStatus } from './RedisCacheStatus';
import { CacheCoverageChecker } from './CacheCoverageChecker';
import { useTilePreloader } from '@/hooks/useTilePreloader';

export function MapView() {
  // Preload tiles for current viewport to avoid jankiness when panning
  useTilePreloader();

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

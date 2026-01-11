import { MapCore } from '../core/MapCore';
import { AlertsSidebar } from './AlertsSidebar';
import { LayerControls } from './LayerControls';
import { FlightControlCenter } from './recon/FlightControlCenter';

export function MapView() {
  return (
    <div className="relative w-full h-full">
      <MapCore>
        {(map) => (
          <>
            <LayerControls map={map} />
            <AlertsSidebar />
            <FlightControlCenter />
          </>
        )}
      </MapCore>
    </div>
  );
}

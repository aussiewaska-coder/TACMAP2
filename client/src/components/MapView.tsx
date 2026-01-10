import { MapCore } from '../core/MapCore';
import { AlertsSidebar } from './AlertsSidebar';
import { LayerControls } from './LayerControls';

export function MapView() {
  return (
    <div className="relative w-full h-full">
      <MapCore>
        {(map) => (
          <>
            <LayerControls map={map} />
            <AlertsSidebar />
          </>
        )}
      </MapCore>
    </div>
  );
}

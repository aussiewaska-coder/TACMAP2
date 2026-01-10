import type { Map } from '@maptiler/sdk';

interface Props { map: Map; }

export function LayerControls({ map }: Props) {
  return (
    <div className="absolute bottom-8 left-4 flex flex-col gap-2 z-40">
      <button onClick={() => map.zoomIn()} className="w-10 h-10 bg-white rounded shadow-lg flex items-center justify-center hover:bg-gray-100">+</button>
      <button onClick={() => map.zoomOut()} className="w-10 h-10 bg-white rounded shadow-lg flex items-center justify-center hover:bg-gray-100">-</button>
      <button onClick={() => map.flyTo({ center: [133.7751, -25.2744], zoom: 4, pitch: 0, bearing: 0 })} className="w-10 h-10 bg-white rounded shadow-lg flex items-center justify-center hover:bg-gray-100 text-xs">AU</button>
    </div>
  );
}

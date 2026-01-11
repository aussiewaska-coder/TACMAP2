/**
 * Tile Source Debugger Component
 * Shows tile z/x/y and source (Redis HIT vs MAPTILER) when hovering over the map
 * Enable/disable by toggling in settings or URL parameter (?debug=tiles)
 */

import { useTileSourceDebug } from '@/hooks/useTileSourceDebug';

export function TileSourceDebugger() {
  useTileSourceDebug();
  return null; // This component only provides functionality, no UI
}

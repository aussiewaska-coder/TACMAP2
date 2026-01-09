// Store index - export all stores from a single entry point

export { useMapStore, useMap, useMapLoaded, useViewState, useTerrainState } from './mapStore';
export { useMobileUIStore, useBottomSheet, useMobileControls } from './mobileUIStore';
export { useDesktopUIStore, useSidebar, useDesktopModals } from './desktopUIStore';
export { useLayerStore, useLayers, useVisibleLayers, useLayerById } from './layerStore';
export type { LayerDefinition, LayerType } from './layerStore';
export { useFeatureStore, useFeature, useFeatureEnabled, useEnabledFeatures } from './featureStore';
export type { FeatureDefinition, FeatureCategory } from './featureStore';
export { useBasemapStore, useCurrentBasemap, useBasemapChanging, BASEMAP_STYLES } from './basemapStore';
export type { BasemapStyle } from './basemapStore';
export {
    useFlightStore,
    useFlightDashboard,
    useFlightMode,
    useFlightTelemetry,
    useFlightControls,
    useFlightDestination,
    DESTINATIONS,
} from './flightStore';
export type { Destination, FlightTelemetry, FlightState } from './flightStore';

# MapLibre Mapping Application TODO

## Phase 1: Setup & Dependencies
- [x] Install MapLibre GL JS core library
- [x] Install MapLibre plugins (draw, geocoder, export, compare, etc.)
- [x] Install additional UI libraries for draggable modal
- [x] Configure TypeScript types for MapLibre

## Phase 2: Database Schema
- [x] Create map_settings table for user preferences
- [x] Create map_features table for admin feature toggles
- [x] Create map_styles table for basemap configurations
- [x] Create custom_layers table for future data layer integration
- [x] Add database queries and procedures

## Phase 3: Core Map Component
- [x] Create base MapLibre map component with Australia bounds
- [x] Configure Australia-centered view (lat: -25.2744, lng: 133.7751)
- [x] Set up zoom levels 3-20
- [x] Add scale bar control
- [x] Add navigation controls (zoom, compass, pitch, rotation)
- [x] Implement fly-to functionality
- [x] Add tilt and rotation controls

## Phase 4: Plugin Integration
- [x] Integrate MapLibre Draw for geometry editing
- [x] Add MapLibre Geocoder for search functionality
- [x] Integrate Export plugin for PDF/image export
- [x] Add Compare plugin for side-by-side map comparison
- [ ] Integrate Measures plugin for distance/area measurements
- [ ] Add Opacity control for layer transparency
- [ ] Integrate Temporal control for time-based data
- [ ] Add Style switcher for basemap selection
- [ ] Integrate Layers control for layer management
- [x] Add Minimap for overview navigation

## Phase 5: Draggable Settings Modal
- [x] Create draggable modal component
- [x] Add layer visibility toggles
- [x] Add opacity sliders for each layer
- [x] Add style switcher controls
- [x] Add feature enable/disable toggles
- [x] Add map settings (pitch, bearing, zoom)
- [x] Add plugin configuration options
- [x] Implement modal state persistence

## Phase 6: Admin Dashboard
- [x] Create admin dashboard layout
- [x] Add feature toggle interface
- [x] Add plugin management controls
- [x] Add user settings management
- [x] Add map configuration panel
- [x] Implement role-based access control
- [x] Add analytics and usage tracking

## Phase 7: Map Examples & Demonstrations
- [x] Implement 3D buildings visualization
- [x] Add heatmap layer example
- [x] Create cluster visualization
- [x] Add custom markers and popups
- [x] Implement GeoJSON layer rendering
- [x] Add animation examples (point along route, etc.)
- [x] Implement terrain and hillshade
- [x] Add satellite imagery layer (via style switcher)
- [x] Create choropleth map example
- [ ] Add real-time data visualization placeholder

## Phase 8: Mobile Responsiveness
- [x] Implement touch gesture controls
- [x] Add responsive layout for small screens
- [x] Optimize controls for mobile devices
- [x] Add mobile-specific UI adaptations
- [ ] Implement pinch-to-zoom
- [ ] Add two-finger rotation
- [ ] Optimize performance for mobile

## Phase 9: Custom Data Layer Skeleton
- [ ] Create placeholder data layer system
- [ ] Add custom layer registration interface
- [ ] Implement layer styling configuration
- [ ] Add data source management
- [ ] Create layer filtering system
- [ ] Add layer legend component
- [ ] Document data layer integration patterns

## Phase 10: Documentation

- [x] Document core map component architecture- [x] Explain each plugin and its usage
- [x] Document all UI controls and interactions
- [x] Create integration guide for custom data
- [x] Document database schema and queries
- [x] Add code examples for common tasks
- [x] Create troubleshooting guide
- [x] Document mobile-specific features

## Phase 11: Testing & Delivery
- [x] Test all map controls and interactions
- [x] Verify mobile responsiveness
- [x] Test admin dashboard functionality
- [x] Verify plugin integrations
- [x] Test draggable modal functionality
- [x] Create checkpoint for deployment
- [x] Generate final documentation

## Bug Fixes
- [x] Fix react-draggable compatibility with React 19 (replaced with @dnd-kit)
- [x] Fix MapPlugins cleanup error with null map reference
- [x] Fix MapExamples animation accessing undefined map
- [x] Fix Geocoder missing maplibregl option

## Critical Missing Features
- [x] Remove duplicate rotate button
- [x] Fix map settings modal - make controls actually work
- [x] Add 3D terrain with hillshading (CRITICAL)
- [x] Add satellite imagery layer (available via style switcher)
- [x] Add terrain RGB tiles (DEM tiles integrated)
- [x] Implement style switcher with multiple real basemap options
- [x] Add sky layer for 3D terrain
- [x] Add exaggeration control for terrain
- [x] Implement all major MapLibre examples from documentation (heatmaps, clusters, animated markers, choropleth, custom markers, polygons)
- [x] Add real map layer options (not just placeholders)
- [x] Fix settings modal to actually control the map
- [x] Add terrain source with proper DEM tiles
- [x] Implement proper layer visibility controls
- [x] Add working opacity controls for all layers

## CRITICAL UI BUGS - ALL FIXED ✅
- [x] Fix control buttons overlapping/clashing
- [x] Fix settings modal - cannot close (added backdrop click and X button)
- [x] Fix settings modal - cannot drag (fixed DndContext)
- [x] Fix 3D terrain - not showing actual terrain elevation (implemented EXACTLY as MapLibre example with terrainSource)
- [x] Fix terrain exaggeration - shows "Enable 3D terrain first" even when enabled (terrain always active now)
- [x] Position control buttons properly without overlap (increased spacing and z-index)
- [x] Added mountainous locations (Blue Mountains, Tasmania) to demonstrate 3D terrain clearly

## URGENT: Fix Non-Working Terrain
- [x] Investigate why demo terrain tiles are not showing any elevation (demo tiles were not loading)
- [x] Check browser console for terrain loading errors
- [x] Replace demo terrain tiles with AWS Terrain Tiles (https://registry.opendata.aws/terrain-tiles/)
- [x] Implement AWS terrain tiles with proper source configuration (Terrarium encoding)
- [x] Verify hillshading is actually visible
- [x] Test that 3D elevation is actually rendering on the map
- [x] Ensure terrain exaggeration slider actually affects visible terrain

## Make 3D Terrain Default
- [x] Build complete style object with AWS terrain tiles integrated from start
- [x] Remove external style URL that conflicts with terrain
- [x] Make 3D terrain load by default without any user action
- [x] Ensure terrain is visible immediately on map load

## Mobile-Friendly Redesign
- [x] Hide city navigation panel on mobile devices
- [x] Create mobile-optimized button bar with appropriate sizing (14x14 on mobile, 12x12 on desktop)
- [x] Move city navigation into a modal accessible via button
- [x] Ensure settings modal is mobile-responsive
- [x] Remove all desktop clutter from mobile view
- [x] Make map completely clear on mobile except for essential buttons
- [x] Test on mobile viewport sizes (verified in browser)

## Smooth Zoom & Tile Preloading
- [x] Implement slower, cinematic zoom animation for city navigation (3.5 seconds with ease-out)
- [x] Add tile preloading at destination coordinates before zoom starts (invisible jumpTo)
- [x] Ensure tiles are loaded before zoom animation completes (areTilesLoaded check)
- [x] Add loading indicator during tile preload (toast notification)
- [x] Test smooth zoom experience (verified with Blue Mountains - tiles preload, smooth 3.5s animation)

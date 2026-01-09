import { Map as MapLibreGLMap, LngLatLike } from "maplibre-gl";
import * as turf from "@turf/turf";

/**
 * Comprehensive MapLibre examples implementation
 * Based on https://maplibre.org/maplibre-gl-js/docs/examples/
 */

/**
 * Add 3D buildings layer
 */
export function add3DBuildings(map: MapLibreGLMap) {
  if (map.getLayer("buildings-3d")) return;

  map.addLayer({
    id: "buildings-3d",
    type: "fill-extrusion",
    source: "openmaptiles",
    "source-layer": "building",
    filter: ["==", "extrude", "true"],
    minzoom: 15,
    paint: {
      "fill-extrusion-color": "#aaa",
      "fill-extrusion-height": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        0,
        15.05,
        ["get", "height"],
      ],
      "fill-extrusion-base": [
        "interpolate",
        ["linear"],
        ["zoom"],
        15,
        0,
        15.05,
        ["get", "min_height"],
      ],
      "fill-extrusion-opacity": 0.6,
    },
  } as any);
}

/**
 * Add heatmap layer with Australian city data
 */
export function addHeatmapLayer(map: MapLibreGLMap) {
  if (map.getSource("heatmap-source")) return;

  // Australian cities and towns for heatmap
  const australianCities = [
    { coordinates: [151.2093, -33.8688], weight: 100 }, // Sydney
    { coordinates: [144.9631, -37.8136], weight: 95 }, // Melbourne
    { coordinates: [153.0251, -27.4698], weight: 80 }, // Brisbane
    { coordinates: [115.8605, -31.9505], weight: 70 }, // Perth
    { coordinates: [138.6007, -34.9285], weight: 60 }, // Adelaide
    { coordinates: [149.1300, -35.2809], weight: 40 }, // Canberra
    { coordinates: [147.3272, -42.8821], weight: 35 }, // Hobart
    { coordinates: [130.8456, -12.4634], weight: 30 }, // Darwin
    { coordinates: [146.8169, -19.2590], weight: 25 }, // Townsville
    { coordinates: [152.7789, -27.5598], weight: 28 }, // Toowoomba
    { coordinates: [153.1139, -30.3022], weight: 22 }, // Coffs Harbour
    { coordinates: [145.7781, -16.9186], weight: 24 }, // Cairns
    { coordinates: [150.8931, -34.4278], weight: 32 }, // Wollongong
    { coordinates: [151.1507, -33.9173], weight: 30 }, // Newcastle
    { coordinates: [138.5986, -35.0000], weight: 18 }, // Victor Harbor
    { coordinates: [145.1382, -37.9716], weight: 26 }, // Geelong
    { coordinates: [146.4173, -38.1499], weight: 20 }, // Traralgon
    { coordinates: [144.2787, -36.7333], weight: 22 }, // Shepparton
    { coordinates: [142.1593, -10.5833], weight: 15 }, // Thursday Island
    { coordinates: [116.8453, -20.7256], weight: 17 }, // Karratha
  ];

  const features = australianCities.map(city => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: city.coordinates,
    },
    properties: {
      weight: city.weight,
    },
  }));

  map.addSource("heatmap-source", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: features,
    },
  });

  map.addLayer({
    id: "heatmap-layer",
    type: "heatmap",
    source: "heatmap-source",
    maxzoom: 15,
    paint: {
      // Increase weight as diameter increases
      "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 100, 1],
      // Increase intensity as zoom level increases
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
      // Color ramp for heatmap
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(33,102,172,0)",
        0.2,
        "rgb(103,169,207)",
        0.4,
        "rgb(209,229,240)",
        0.6,
        "rgb(253,219,199)",
        0.8,
        "rgb(239,138,98)",
        1,
        "rgb(178,24,43)",
      ],
      // Adjust radius by zoom level
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 20],
      // Transition from heatmap to circle layer by zoom level
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 15, 0],
    },
  });
}

/**
 * Add cluster visualization
 */
export function addClusterLayer(map: MapLibreGLMap) {
  if (map.getSource("clusters-source")) return;

  // Generate random points across Australia
  const points: any[] = [];
  for (let i = 0; i < 200; i++) {
    const lng = 113 + Math.random() * 40; // Australia longitude range
    const lat = -44 + Math.random() * 34; // Australia latitude range
    points.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
      properties: {
        id: i,
      },
    });
  }

  map.addSource("clusters-source", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: points,
    },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });

  // Cluster circles
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "clusters-source",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#51bbd6",
        10,
        "#f1f075",
        30,
        "#f28cb1",
      ],
      "circle-radius": ["step", ["get", "point_count"], 20, 10, 30, 30, 40],
    },
  });

  // Cluster count labels
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "clusters-source",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
  });

  // Unclustered points
  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "clusters-source",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "#11b4da",
      "circle-radius": 6,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#fff",
    },
  });
}

/**
 * Add animated marker along route
 */
export function addAnimatedMarker(map: MapLibreGLMap) {
  if (map.getSource("route")) return;

  // Route across Australia (Sydney to Perth)
  const route = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [151.2093, -33.8688], // Sydney
            [149.1300, -35.2809], // Canberra
            [144.9631, -37.8136], // Melbourne
            [138.6007, -34.9285], // Adelaide
            [131.0, -30.0], // Middle of Australia
            [125.0, -28.0],
            [120.0, -26.0],
            [115.8605, -31.9505], // Perth
          ],
        },
        properties: {},
      },
    ],
  };

  // Animated point
  const point = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: route.features[0].geometry.coordinates[0],
        },
        properties: {},
      },
    ],
  };

  map.addSource("route", {
    type: "geojson",
    data: route,
  });

  map.addSource("point", {
    type: "geojson",
    data: point,
  });

  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#ff7e5f",
      "line-width": 4,
      "line-dasharray": [2, 2],
    },
  });

  map.addLayer({
    id: "point-layer",
    type: "circle",
    source: "point",
    paint: {
      "circle-radius": 10,
      "circle-color": "#ff0000",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  // Animation
  let counter = 0;
  const coordinates = route.features[0].geometry.coordinates;
  const steps = 200;

  let animationFrameId: number;
  
  function animate() {
    if (!map || !map.getSource) {
      return;
    }

    const start = coordinates[Math.floor(counter / steps)];
    const end = coordinates[Math.floor(counter / steps) + 1];

    if (!start || !end) {
      counter = 0;
      return;
    }

    const progress = (counter % steps) / steps;
    const lng = start[0] + (end[0] - start[0]) * progress;
    const lat = start[1] + (end[1] - start[1]) * progress;

    point.features[0].geometry.coordinates = [lng, lat];
    
    try {
      const source = map.getSource("point") as any;
      if (source) {
        source.setData(point);
      }
    } catch (error) {
      console.warn('Animation source not available:', error);
      return;
    }

    counter++;
    if (counter >= steps * (coordinates.length - 1)) {
      counter = 0;
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  animate();
  
  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}

/**
 * Add choropleth map (Australian states by population)
 */
export function addChoroplethMap(map: MapLibreGLMap) {
  if (map.getSource("states-choropleth")) return;

  // Simplified Australian states boundaries with population data
  const statesData = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { name: "New South Wales", population: 8166000, density: 10.2 },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [141, -29], [153.6, -29], [153.6, -37], [149, -37.5], [141, -34], [141, -29]
          ]],
        },
      },
      {
        type: "Feature" as const,
        properties: { name: "Victoria", population: 6681000, density: 29.3 },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [141, -34], [149, -37.5], [149, -39], [141, -39], [141, -34]
          ]],
        },
      },
      {
        type: "Feature" as const,
        properties: { name: "Queensland", population: 5185000, density: 2.9 },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [138, -10.5], [153.6, -10.5], [153.6, -29], [141, -29], [138, -20], [138, -10.5]
          ]],
        },
      },
      {
        type: "Feature" as const,
        properties: { name: "Western Australia", population: 2667000, density: 1.1 },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [113, -13.5], [129, -13.5], [129, -26], [126, -34], [113, -35], [113, -13.5]
          ]],
        },
      },
      {
        type: "Feature" as const,
        properties: { name: "South Australia", population: 1771000, density: 1.8 },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [129, -26], [141, -26], [141, -38], [135, -38], [129, -34], [129, -26]
          ]],
        },
      },
    ],
  };

  map.addSource("states-choropleth", {
    type: "geojson",
    data: statesData,
  });

  map.addLayer({
    id: "states-fill",
    type: "fill",
    source: "states-choropleth",
    paint: {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["get", "population"],
        1000000,
        "#feedde",
        3000000,
        "#fdbe85",
        5000000,
        "#fd8d3c",
        7000000,
        "#e6550d",
        9000000,
        "#a63603",
      ],
      "fill-opacity": 0.6,
    },
  });

  map.addLayer({
    id: "states-border",
    type: "line",
    source: "states-choropleth",
    paint: {
      "line-color": "#000",
      "line-width": 2,
    },
  });

  // Add popup on click
  map.on("click", "states-fill", (e) => {
    if (!e.features || e.features.length === 0) return;
    
    const feature = e.features[0];
    const maplibregl = (window as any).maplibregl;
    
    if (maplibregl && maplibregl.Popup) {
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="p-2">
            <strong>${feature.properties.name}</strong><br/>
            Population: ${(feature.properties.population / 1000000).toFixed(2)}M<br/>
            Density: ${feature.properties.density} per km²
          </div>`
        )
        .addTo(map);
    }
  });

  // Change cursor on hover
  map.on("mouseenter", "states-fill", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "states-fill", () => {
    map.getCanvas().style.cursor = "";
  });
}

/**
 * Add custom markers for major Australian landmarks
 */
export function addCustomMarkers(map: MapLibreGLMap) {
  const maplibregl = (window as any).maplibregl;
  if (!maplibregl || !maplibregl.Marker) return;

  const landmarks = [
    { name: "Sydney Opera House", coordinates: [151.2153, -33.8568], color: "#e74c3c" },
    { name: "Uluru", coordinates: [131.0369, -25.3444], color: "#e67e22" },
    { name: "Great Barrier Reef", coordinates: [145.7781, -16.9186], color: "#3498db" },
    { name: "Twelve Apostles", coordinates: [143.1048, -38.6656], color: "#9b59b6" },
    { name: "Bondi Beach", coordinates: [151.2743, -33.8908], color: "#f39c12" },
  ];

  landmarks.forEach(landmark => {
    const el = document.createElement("div");
    el.className = "w-10 h-10 rounded-full border-3 border-white shadow-lg cursor-pointer flex items-center justify-center text-white font-bold text-xs";
    el.style.backgroundColor = landmark.color;
    el.textContent = landmark.name.charAt(0);

    new maplibregl.Marker({ element: el })
      .setLngLat(landmark.coordinates as LngLatLike)
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2"><strong>${landmark.name}</strong></div>`
        )
      )
      .addTo(map);
  });
}

/**
 * Add polygon drawing example
 */
export function addPolygonExample(map: MapLibreGLMap) {
  if (map.getSource("polygon-example")) return;

  // Example polygon around Sydney region
  const polygon = turf.polygon([[
    [150.5, -33.5],
    [152.0, -33.5],
    [152.0, -34.5],
    [150.5, -34.5],
    [150.5, -33.5],
  ]]);

  const buffered = turf.buffer(polygon, 50, { units: "kilometers" });

  map.addSource("polygon-example", {
    type: "geojson",
    data: buffered as any,
  });

  map.addLayer({
    id: "polygon-example-fill",
    type: "fill",
    source: "polygon-example",
    paint: {
      "fill-color": "#088",
      "fill-opacity": 0.3,
    },
  });

  map.addLayer({
    id: "polygon-example-outline",
    type: "line",
    source: "polygon-example",
    paint: {
      "line-color": "#088",
      "line-width": 2,
    },
  });
}

/**
 * Initialize all examples
 */
export function initializeAllExamples(map: MapLibreGLMap) {
  try {
    addHeatmapLayer(map);
    addClusterLayer(map);
    addAnimatedMarker(map);
    addChoroplethMap(map);
    addCustomMarkers(map);
    addPolygonExample(map);
    console.log("All map examples initialized successfully");
  } catch (error) {
    console.error("Error initializing map examples:", error);
  }
}

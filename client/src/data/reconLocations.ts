export interface ReconLocation {
  id: string;
  name: string;
  coords: [number, number]; // [lng, lat]
  defaultZoom: number;
  defaultPitch: number;
  description: string;
  category: 'coastal' | 'urban' | 'outback' | 'mountain' | 'landmark';
}

export const RECON_LOCATIONS: ReconLocation[] = [
  // Coastal
  {
    id: 'byron-bay-lighthouse',
    name: 'Byron Bay Lighthouse',
    coords: [153.6386, -28.6474],
    defaultZoom: 15,
    defaultPitch: 65,
    description: "Australia's most easterly point",
    category: 'coastal',
  },
  {
    id: 'surfers-paradise',
    name: 'Surfers Paradise',
    coords: [153.4300, -28.0027],
    defaultZoom: 14,
    defaultPitch: 60,
    description: 'Gold Coast skyline and beaches',
    category: 'coastal',
  },
  {
    id: 'bondi-beach',
    name: 'Bondi Beach',
    coords: [151.2749, -33.8915],
    defaultZoom: 15,
    defaultPitch: 55,
    description: 'Iconic Sydney beach',
    category: 'coastal',
  },
  {
    id: 'great-ocean-road',
    name: 'Twelve Apostles',
    coords: [143.1046, -38.6659],
    defaultZoom: 14,
    defaultPitch: 70,
    description: 'Limestone stacks on the Victorian coast',
    category: 'coastal',
  },
  {
    id: 'whitehaven-beach',
    name: 'Whitehaven Beach',
    coords: [149.0417, -20.2833],
    defaultZoom: 13,
    defaultPitch: 60,
    description: 'Pristine white silica sand beach',
    category: 'coastal',
  },
  // Urban
  {
    id: 'sydney-harbour',
    name: 'Sydney Harbour',
    coords: [151.2153, -33.8568],
    defaultZoom: 14,
    defaultPitch: 60,
    description: 'Opera House and Harbour Bridge',
    category: 'urban',
  },
  {
    id: 'melbourne-cbd',
    name: 'Melbourne CBD',
    coords: [144.9631, -37.8136],
    defaultZoom: 14,
    defaultPitch: 55,
    description: 'Cultural capital of Australia',
    category: 'urban',
  },
  {
    id: 'brisbane-south-bank',
    name: 'Brisbane South Bank',
    coords: [153.0234, -27.4798],
    defaultZoom: 15,
    defaultPitch: 55,
    description: 'River city parklands',
    category: 'urban',
  },
  {
    id: 'perth-swan-river',
    name: 'Perth Swan River',
    coords: [115.8575, -31.9505],
    defaultZoom: 13,
    defaultPitch: 50,
    description: 'Western capital by the river',
    category: 'urban',
  },
  {
    id: 'hobart-waterfront',
    name: 'Hobart Waterfront',
    coords: [147.3272, -42.8821],
    defaultZoom: 14,
    defaultPitch: 55,
    description: 'Historic Tasmanian capital',
    category: 'urban',
  },
  // Outback
  {
    id: 'uluru',
    name: 'Uluru',
    coords: [131.0369, -25.3444],
    defaultZoom: 14,
    defaultPitch: 70,
    description: 'Sacred red monolith',
    category: 'outback',
  },
  {
    id: 'kata-tjuta',
    name: 'Kata Tjuta',
    coords: [130.7395, -25.3052],
    defaultZoom: 13,
    defaultPitch: 65,
    description: 'The Olgas rock formation',
    category: 'outback',
  },
  {
    id: 'kings-canyon',
    name: 'Kings Canyon',
    coords: [131.4936, -24.2561],
    defaultZoom: 14,
    defaultPitch: 70,
    description: 'Dramatic red rock gorge',
    category: 'outback',
  },
  {
    id: 'coober-pedy',
    name: 'Coober Pedy',
    coords: [134.7544, -29.0135],
    defaultZoom: 13,
    defaultPitch: 50,
    description: 'Underground opal mining town',
    category: 'outback',
  },
  {
    id: 'nimbin',
    name: 'Nimbin',
    coords: [153.2236, -28.5958],
    defaultZoom: 15,
    defaultPitch: 60,
    description: 'Alternative lifestyle village in the hills',
    category: 'outback',
  },
  // Mountain
  {
    id: 'blue-mountains',
    name: 'Blue Mountains Three Sisters',
    coords: [150.3122, -33.7320],
    defaultZoom: 14,
    defaultPitch: 70,
    description: 'Iconic sandstone rock formation',
    category: 'mountain',
  },
  {
    id: 'mt-kosciuszko',
    name: 'Mount Kosciuszko',
    coords: [148.2633, -36.4558],
    defaultZoom: 13,
    defaultPitch: 75,
    description: "Australia's highest peak",
    category: 'mountain',
  },
  {
    id: 'cradle-mountain',
    name: 'Cradle Mountain',
    coords: [145.9420, -41.6527],
    defaultZoom: 13,
    defaultPitch: 70,
    description: 'Tasmanian wilderness icon',
    category: 'mountain',
  },
  {
    id: 'glass-house-mountains',
    name: 'Glass House Mountains',
    coords: [152.9456, -26.9067],
    defaultZoom: 13,
    defaultPitch: 65,
    description: 'Volcanic plugs in Queensland',
    category: 'mountain',
  },
  {
    id: 'grampians',
    name: 'The Grampians',
    coords: [142.4747, -37.1471],
    defaultZoom: 12,
    defaultPitch: 60,
    description: 'Rugged Victorian mountain ranges',
    category: 'mountain',
  },
  // Landmarks
  {
    id: 'great-barrier-reef',
    name: 'Great Barrier Reef',
    coords: [146.8169, -16.5004],
    defaultZoom: 11,
    defaultPitch: 45,
    description: 'World heritage coral reef system',
    category: 'landmark',
  },
  {
    id: 'kakadu',
    name: 'Kakadu National Park',
    coords: [132.3917, -12.8333],
    defaultZoom: 11,
    defaultPitch: 50,
    description: 'Ancient Aboriginal rock art and wetlands',
    category: 'landmark',
  },
  {
    id: 'daintree',
    name: 'Daintree Rainforest',
    coords: [145.4185, -16.2500],
    defaultZoom: 12,
    defaultPitch: 55,
    description: 'Ancient tropical rainforest',
    category: 'landmark',
  },
  {
    id: 'shark-bay',
    name: 'Shark Bay',
    coords: [113.8500, -25.9667],
    defaultZoom: 11,
    defaultPitch: 45,
    description: 'World heritage marine area',
    category: 'landmark',
  },
  {
    id: 'port-arthur',
    name: 'Port Arthur',
    coords: [147.8500, -43.1500],
    defaultZoom: 14,
    defaultPitch: 55,
    description: 'Historic convict settlement',
    category: 'landmark',
  },
];

// Get a random location
export function getRandomLocation(): ReconLocation {
  return RECON_LOCATIONS[Math.floor(Math.random() * RECON_LOCATIONS.length)];
}

// Get random flight parameters for variety
export function getRandomFlightParams() {
  return {
    bearing: Math.random() * 360,
    pitch: 50 + Math.random() * 30, // 50-80 degrees
    zoomOffset: (Math.random() - 0.5) * 2, // -1 to +1
  };
}

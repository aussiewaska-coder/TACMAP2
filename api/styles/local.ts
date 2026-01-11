export const config = {
  runtime: 'edge',
};

export default function handler() {
  return new Response(
    JSON.stringify({
      version: 8,
      name: 'Local Cached Tiles',
      sources: {
        tiles: {
          type: 'raster',
          tiles: [`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:5173'}/api/tiles/{z}/{x}/{y}`],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 20,
        },
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': '#d4d4d8',
          },
        },
        {
          id: 'tiles',
          type: 'raster',
          source: 'tiles',
          minzoom: 0,
          maxzoom: 20,
        },
      ],
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}

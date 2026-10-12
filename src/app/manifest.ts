import type { MetadataRoute } from 'next';

// Permite instalar la app en la pantalla de inicio; en iPhone es condición
// para recibir notificaciones push.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tendar — Tablero de oportunidades',
    short_name: 'Tendar',
    description: 'Detección temprana de productos en tendencia en Mercado Libre Argentina',
    start_url: '/insights',
    display: 'standalone',
    background_color: '#121214',
    theme_color: '#121214',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

// src/app/manifest.ts
import type { MetadataRoute } from 'next'

// Si installa sulla schermata Home (D3-3), ma senza service worker (spec §4.1):
// niente lavora fuori linea.
export default function manifesto(): MetadataRoute.Manifest {
  return {
    name: 'AVStyle',
    short_name: 'AVStyle',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FDEDF0',
    theme_color: '#C2185B',
    icons: [
      { src: '/icona-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icona-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

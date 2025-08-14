import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // use your file in public/
      includeAssets: [
        '/favicon-16.png',
        '/favicon-32.png',
        '/icons/apple-touch-icon-180.png',
        '/icons/icon-192.png',
        '/icons/icon-256.png',
        '/icons/icon-384.png',
        '/icons/icon-512.png',
        '/icons/icon-192-maskable.png',
        '/icons/icon-512-maskable.png',
        '/offline.html'
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 3 }
          },
          {
            urlPattern: ({ request }) =>
              ['script', 'style', 'worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets' }
          },
          {
            urlPattern: ({ request }) =>
              ['image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 60, maxAgeSeconds: 60*60*24*30 }
            }
          }
        ]
      }
    })
  ]
})

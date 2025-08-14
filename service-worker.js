const CACHE_NAME = 'gemini-scheduler-v3';
// A comprehensive list of assets to pre-cache for robust offline functionality.
// This includes local files, CDN entry points, and their resolved dependencies.
const URLS_TO_PRECACHE = [
  // App Shell
  '/',
  '/index.html',
  '/manifest.json',
  '/metadata.json',

  // Local Modules
  '/index.tsx',
  '/types.ts',
  '/utils.ts',
  '/App.tsx',
  '/components/icons.tsx',
  '/components/WorkletItem.tsx',
  '/components/WorkletDetailModal.tsx',
  '/components/Dashboard.tsx',
  '/components/CalendarView.tsx',
  '/components/AddAssignmentView.tsx',
  '/components/AddWorkletView.tsx',
  '/components/PastWorkView.tsx',
  '/components/SpeedCheckView.tsx',
  '/components/SpeedCheckSessionView.tsx',
  '/components/AddRoutineView.tsx',
  '/components/SettingsView.tsx',
  '/components/AnalyticsView.tsx',
  '/components/RadialMenu.tsx',

  // External Vendor Libraries (Comprehensive List)
  'https://cdn.tailwindcss.com',
  // -- React & ReactDOM initial requests (from importmap)
  'https://esm.sh/react@19.1.0',
  'https://esm.sh/react-dom@19.1.0/client',
  'https://esm.sh/react@19.1.0/jsx-runtime',
  // -- Final resolved URLs & dependencies (to guarantee cache hits)
  'https://esm.sh/v135/react@19.1.0/es2022/react.mjs',
  'https://esm.sh/v135/react-dom@19.1.0/es2022/client.mjs',
  'https://esm.sh/v135/react@19.1.0/es2022/jsx-runtime.mjs',
  'https://esm.sh/v135/react-dom@19.1.0/es2022/react-dom.mjs',
  'https://esm.sh/v135/scheduler@0.24.0/es2022/scheduler.mjs',
  'https://esm.sh/v135/object-assign@4.1.1/es2022/object-assign.mjs'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache, pre-caching assets');
        // Use a Request object to handle potential CORS issues with CDNs
        const cachePromises = URLS_TO_PRECACHE.map(url => {
            const request = new Request(url, {mode: 'no-cors'});
            return cache.add(request);
        });
        return Promise.all(cachePromises);
      })
      .catch(err => {
        console.error('Failed to pre-cache assets:', err);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Use a "Stale-While-Revalidate" strategy
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            // Avoid caching non-GET requests or chrome-extension URLs
            if (!event.request.url.startsWith('chrome-extension://')) {
                 cache.put(event.request, networkResponse.clone());
            }
          }
          return networkResponse;
        }).catch(err => {
            console.error('Network fetch failed:', err);
            // If network fails and there is no cached response, it will fail, which is expected for offline.
            // But if there's a cached response, it would have been returned already.
        });

        // Return cached response immediately if available, and update cache in background
        return cachedResponse || fetchPromise;
      });
    })
  );
});
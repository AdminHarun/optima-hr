// Optima HR - Service Worker
// Cache strategy: Network-first for API, Cache-first for static assets

const STATIC_CACHE = 'optima-static-v2';
const API_CACHE = 'optima-api-v2';
const EXPECTED_CACHES = [STATIC_CACHE, API_CACHE];

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/logo3.png',
  '/logo3.ico',
];

// ----------------------------
// INSTALL - Pre-cache essentials
// ----------------------------
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching essential assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately, don't wait for old SW to finish
  self.skipWaiting();
});

// ----------------------------
// ACTIVATE - Clean old caches, claim clients
// ----------------------------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!EXPECTED_CACHES.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming all clients');
      return self.clients.claim();
    })
  );
});

// ----------------------------
// FETCH - Routing & caching strategies
// ----------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket and chrome-extension requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || url.protocol === 'chrome-extension:') {
    return;
  }

  // API calls -> Network-first strategy
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/chat/') || url.hostname === 'api.optima-hr.net') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets (JS, CSS, images from /assets/) -> Cache-first strategy
  if (url.pathname.startsWith('/assets/') || isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigation requests -> Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Everything else -> Network-first
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ----------------------------
// Cache Strategies
// ----------------------------

/**
 * Network-first: Try network, fall back to cache
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Cache-first: Try cache, fall back to network
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // For static assets, there's no fallback - just let it fail
    throw error;
  }
}

/**
 * Network-first with offline fallback for navigation
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Try serving cached version of the page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try serving cached index.html (SPA fallback)
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) {
      return cachedIndex;
    }

    // Last resort: offline page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    throw error;
  }
}

// ----------------------------
// Helpers
// ----------------------------

/**
 * Check if a pathname points to a static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp',
  ];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// ----------------------------
// BACKGROUND SYNC - Pending messages
// ----------------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('[SW] Syncing pending messages...');
    event.waitUntil(syncPendingMessages());
  }
});

/**
 * Sync any messages that were queued while offline
 */
async function syncPendingMessages() {
  try {
    // Open IndexedDB to get pending messages
    const db = await openDB();
    const tx = db.transaction('pending-messages', 'readonly');
    const store = tx.objectStore('pending-messages');
    const messages = await getAllFromStore(store);

    for (const message of messages) {
      try {
        const response = await fetch(message.url, {
          method: message.method || 'POST',
          headers: message.headers || { 'Content-Type': 'application/json' },
          body: message.body,
        });

        if (response.ok) {
          // Remove from pending queue
          const deleteTx = db.transaction('pending-messages', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending-messages');
          deleteStore.delete(message.id);
        }
      } catch (err) {
        console.log('[SW] Failed to sync message:', message.id, err);
      }
    }
  } catch (err) {
    console.log('[SW] Background sync failed:', err);
  }
}

/**
 * Simple IndexedDB wrapper for pending messages
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('optima-sw-db', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-messages')) {
        db.createObjectStore('pending-messages', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

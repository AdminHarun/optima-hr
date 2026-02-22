/**
 * Optima HR - Service Worker Registration
 *
 * Handles registration lifecycle, update detection, and unregistration.
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/)
);

/**
 * Register the service worker.
 * In production, registers the SW. On localhost, validates the SW exists first.
 */
export function register() {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW Registration] Service workers are not supported in this browser.');
    return;
  }

  // Only register in production or explicitly on localhost for testing
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction && !isLocalhost) {
    console.log('[SW Registration] Skipping registration in development mode.');
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    if (isLocalhost) {
      // On localhost, check if SW exists before registering
      checkValidServiceWorker(swUrl);
      navigator.serviceWorker.ready.then(() => {
        console.log('[SW Registration] App is being served cache-first by a service worker (localhost).');
      });
    } else {
      // In production, register directly
      registerValidSW(swUrl);
    }
  });
}

/**
 * Perform the actual service worker registration
 */
function registerValidSW(swUrl) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[SW Registration] Service worker registered with scope:', registration.scope);

      // Check for updates periodically (every 60 minutes)
      setInterval(() => {
        registration.update();
        console.log('[SW Registration] Checking for service worker updates...');
      }, 60 * 60 * 1000);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        console.log('[SW Registration] New service worker is being installed...');

        installingWorker.onstatechange = () => {
          switch (installingWorker.state) {
            case 'installed':
              if (navigator.serviceWorker.controller) {
                // New content is available; old SW is still serving
                console.log('[SW Registration] New content is available and will be used when all tabs are closed.');
                // Optionally notify the user
                onUpdateAvailable(registration);
              } else {
                // Content is cached for the first time (fresh install)
                console.log('[SW Registration] Content is cached for offline use.');
              }
              break;

            case 'redundant':
              console.log('[SW Registration] The installing service worker became redundant.');
              break;

            case 'activating':
              console.log('[SW Registration] New service worker is activating...');
              break;

            case 'activated':
              console.log('[SW Registration] New service worker activated.');
              break;

            default:
              break;
          }
        };
      };
    })
    .catch((error) => {
      console.error('[SW Registration] Error during service worker registration:', error);
    });
}

/**
 * On localhost, validate the SW file exists before registering
 */
function checkValidServiceWorker(swUrl) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // SW not found - unregister any existing one and reload
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // SW found, proceed with registration
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('[SW Registration] No internet connection found. App is running in offline mode.');
    });
}

/**
 * Called when a new SW update is detected.
 * Can be extended to show a UI notification to the user.
 */
function onUpdateAvailable(registration) {
  // Dispatch a custom event so the app can show an update prompt
  const event = new CustomEvent('sw-update-available', {
    detail: { registration },
  });
  window.dispatchEvent(event);
}

/**
 * Unregister the service worker
 */
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[SW Registration] Service worker unregistered successfully.');
          } else {
            console.log('[SW Registration] Service worker unregistration failed.');
          }
        });
      })
      .catch((error) => {
        console.error('[SW Registration] Error during unregistration:', error.message);
      });
  }
}

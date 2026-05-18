/* ============================================================
   Service Worker — AGENDA CHIARA
   Stratégie : Network-first avec fallback cache.
   Changer CACHE_VERSION à chaque déploiement pour forcer la MAJ.
   ============================================================ */

const CACHE_VERSION = "v32";
const CACHE_NAME    = `agenda-cache-${CACHE_VERSION}`;

/* ---- Install : skipWaiting pour activer immédiatement ---- */
self.addEventListener("install", () => {
  self.skipWaiting();
});

/* ---- Activate : supprime les anciens caches et prend le contrôle ---- */
self.addEventListener("activate", evt => {
  evt.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(n => n !== CACHE_NAME)
          .map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- Fetch : réseau d'abord, cache en fallback ---- */
self.addEventListener("fetch", evt => {
  if (evt.request.method !== "GET") return;

  evt.respondWith(
    fetch(evt.request)
      .then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(evt.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(evt.request))
  );
});

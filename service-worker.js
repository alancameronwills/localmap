self.addEventListener('install', function(e) {
    e.waitUntil(
      caches.open('deep-map').then(function(cache) {
        return cache.addAll([
          '/localmap/index.html',
          '/localmap/css/deep-map.css',
          '/localmap/scripts/deep-map.js',
          '/localmap/scripts/util.js'
        ]);
      })
    );
   });

   self.addEventListener('fetch', (e) => {
    e.respondWith(
      caches.match(e.request).then((r) => {
            console.log('[Service Worker] Fetching resource: '+e.request.url);
        return r || fetch(e.request).then((response) => {
                  return caches.open('deep-map').then((cache) => {
            console.log('[Service Worker] Caching new resource: '+e.request.url);
            cache.put(e.request, response.clone());
            return response;
          });
        });
      })
    );
  });
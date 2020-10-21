self.addEventListener('install', function(e) {
    e.waitUntil(
      caches.open('deep-map').then(function(cache) {
        return cache.addAll([
          '/localmap/scripts/index.html',
          '/localmap/scripts/deep-map.css',
          '/localmap/scripts/deep-map.js',
        ]);
      })
    );
   });

   self.addEventListener('fetch', function(event) {
    console.log(event.request.url);
   });

   self.addEventListener('fetch', function(event) {
    console.log(event.request.url);
   
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
   });
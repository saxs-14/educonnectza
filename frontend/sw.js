const CACHE_NAME = 'educonnect-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/forgot-password.html',
  '/reset-password.html',
  '/learner-dashboard.html',
  '/teacher-dashboard.html',
  '/school-admin-dashboard.html',
  '/dev-admin-dashboard.html',
  '/dev-ai-insights.html',
  '/dev-content-management.html',
  '/dev-database-explorer.html',
  '/dev-school-management.html',
  '/dev-system-controls.html',
  '/dev-user-management.html',
  '/branding-studio.html',
  '/manifest.json',
  '/images/logo.png',
  '/src/js/api.js',
  '/src/js/auth.js',
  '/src/js/firebase.js',
  '/src/js/signup.js',
  '/src/js/forgot-password.js',
  '/src/js/reset-password.js',
  '/src/js/utils.js',
  '/src/js/theme-engine.js',
  '/src/js/pages/dev-admin.js',
  '/src/js/pages/dev-ai-insights.js',
  '/src/js/pages/dev-content.js',
  '/src/js/pages/dev-database.js',
  '/src/js/pages/dev-school-management.js',
  '/src/js/pages/dev-system.js',
  '/src/js/pages/dev-user-management.js',
  '/src/js/pages/branding-studio.js',
  '/src/css/dev-shell.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(err => {
        return new Response(JSON.stringify({ message: 'Network Error: Cannot connect to backend' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});

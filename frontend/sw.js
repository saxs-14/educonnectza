const CACHE_NAME = 'educonnect-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/signup.html',
  '/dashboard.html',
  '/manifest.json',
  '/images/logo.png',
  '/src/js/api.js',
  '/src/js/auth.js',
  '/src/js/signup.js',
  '/src/js/dashboard.js',
  '/src/js/offline.js',
  '/src/js/utils.js',
  '/src/js/components/Header.js',
  '/src/js/components/Sidebar.js',
  '/src/js/components/CalendarView.js',
  '/src/js/pages/LearnerDashboard.js',
  '/src/js/pages/TeacherDashboard.js',
  '/src/js/pages/AdminDashboard.js',
  '/src/js/pages/DevAdminDashboard.js',
  '/src/js/pages/Profile.js',
  '/src/js/pages/SubjectView.js',
  '/forgot-password.html',
  '/reset-password.html'
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

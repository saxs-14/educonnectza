import { api } from './api.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { LearnerDashboard } from './pages/LearnerDashboard.js';
import { TeacherDashboard } from './pages/TeacherDashboard.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { DevAdminDashboard } from './pages/DevAdminDashboard.js';
import { Profile } from './pages/Profile.js';
import { SubjectView } from './pages/SubjectView.js';
import { initOfflineSync, syncPending } from './offline.js';
import { auth, rtdb } from './firebase.js';
import { ref, onChildAdded, query as dbQuery, limitToLast } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js';

const user = JSON.parse(localStorage.getItem('user') || '{}');

// DEV ADMIN GLOBAL REDIRECT
if (user.email === 'mamagauphathu@gmail.com') {
  if (!window.location.href.includes('dev-admin-dashboard.html')) {
    window.location.href = 'dev-admin-dashboard.html';
  }
}

// Normalize role string (remove spaces, make lowercase) for robust routing
const normalizedRole = (user.role || '').replace(/\s+/g, '').toLowerCase();

// Map normalized role to hash values for auto-navigation
const roleHashMap = {
  learner: '#learner',
  teacher: '#teacher',
  schooladmin: '#admin',
  devadmin: '#devadmin'
};

const desiredHash = roleHashMap[normalizedRole] || '#dashboard';
if (window.location.hash === '' || window.location.hash === '#dashboard') {
  if (window.location.hash !== desiredHash) {
    window.location.hash = desiredHash;
  }
}

// Only redirect to login if actually missing data
if (!user._id && !window.location.href.includes('index.html')) {
  window.location.href = 'index.html';
}

// Strict Auth Guard: Listen to Firebase Authentication state
auth.onAuthStateChanged((firebaseUser) => {
  if (!firebaseUser) {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }
});

if (user.school?.theme) {
  const root = document.documentElement;
  root.style.setProperty('--primary', user.school.theme.primaryColor);
  root.style.setProperty('--secondary', user.school.theme.secondaryColor);
}

// Initialize UI
const sidebarContainer = document.getElementById('sidebar-container');
const headerContainer = document.getElementById('header-container');
const mainContent = document.getElementById('main-content');

if (sidebarContainer) sidebarContainer.innerHTML = Sidebar(user.role);
if (headerContainer) headerContainer.innerHTML = Header(user);

function loadRoute() {
  const hash = window.location.hash || '#dashboard';
  if (!mainContent) return;
  
  mainContent.innerHTML = '';
  
  // 1. Static Routes
  if (hash === '#profile') {
    Profile(mainContent);
    return;
  }
  
  if (hash.startsWith('#subject/')) {
    const subjectId = hash.split('/')[1];
    SubjectView(mainContent, subjectId);
    return;
  }

  // 2. Role-Based Component Selection
  // We check the hash first, then fallback to normalizedRole
  const route = hash.replace('#', '');
  
  if (route === 'learner' || (route === 'dashboard' && normalizedRole === 'learner')) {
    LearnerDashboard(mainContent);
  } else if (route === 'teacher' || (route === 'dashboard' && normalizedRole === 'teacher')) {
    TeacherDashboard(mainContent);
  } else if (route === 'admin' || (route === 'dashboard' && normalizedRole === 'schooladmin')) {
    AdminDashboard(mainContent);
  } else if (route === 'devadmin' || (route === 'dashboard' && normalizedRole === 'devadmin')) {
    DevAdminDashboard(mainContent);
  } else {
    mainContent.innerHTML = `<div class="p-8 text-center text-gray-500">
      <p class="text-xl font-semibold">Welcome to EduConnectZA</p>
      <p class="mt-2">Please select an option from the sidebar to begin.</p>
    </div>`;
  }
}

window.addEventListener('hashchange', loadRoute);
loadRoute();

document.addEventListener('click', (e) => {
  if (e.target.id === 'logout-btn') {
    api.post('/auth/logout').then(() => {
      localStorage.clear();
      window.location.href = 'index.html';
    });
  }
  if (e.target.id === 'menu-toggle') {
    document.querySelector('.sidebar').classList.toggle('open');
  }
});

window.addEventListener('online', () => {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.add('hidden');
  syncPending();
});
window.addEventListener('offline', () => {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.remove('hidden');
});

if (!navigator.onLine) {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.remove('hidden');
}

initOfflineSync();

// Realtime Notifications Setup
const notificationsRef = dbQuery(ref(rtdb, 'notifications'), limitToLast(1));
let isFirstLoad = true;
onChildAdded(notificationsRef, (snapshot) => {
  if (isFirstLoad) {
    isFirstLoad = false;
    return;
  }
  const data = snapshot.val();
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded shadow-lg z-50 transition-opacity duration-300';
  toast.innerHTML = `<strong>🔔 Notification:</strong> ${data.message}`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
});

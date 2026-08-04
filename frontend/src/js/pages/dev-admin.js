import { api } from '../api.js';
import { auth } from '../firebase.js';
import { escapeHtml } from '../utils.js';

// --- State ---
let schools = [];

// --- Elements ---
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const refreshAllBtn = document.getElementById('refreshAllBtn');
const logoutBtn = document.getElementById('logout-btn');

// Overview Elements
const totalUsersEl = document.getElementById('totalUsers');
const totalSchoolsEl = document.getElementById('totalSchools');
const userGrowthEl = document.getElementById('userGrowth');
const schoolGrowthEl = document.getElementById('schoolGrowth');
const aiHealthScoreEl = document.getElementById('aiHealthScore');

// School Elements
const pendingSchoolsList = document.getElementById('pendingSchoolsList');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth (UX gate only - the real enforcement is server-side per request)
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'DevAdmin') {
        window.location.href = 'index.html';
        return;
    }

    setupTabs();
    await fetchMetrics();
    await fetchSchools();
    setupMiscActions();
});

// --- Tab Logic ---
function setupTabs() {
    tabBtns.forEach(btn => {
        // If it's a link (like Branding Studio), let the default action happen
        if (btn.tagName === 'A') return;

        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            
            // Update buttons
            tabBtns.forEach(b => {
                b.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
                b.classList.add('text-slate-500', 'hover:text-slate-700');
            });
            btn.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
            btn.classList.remove('text-slate-500', 'hover:text-slate-700');

            // Update panels
            tabPanels.forEach(panel => {
                const panelId = `${target}-panel`;
                if (panel.id === panelId) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            });
        });
    });
}

// --- Data Fetching ---
async function fetchMetrics() {
    try {
        const metrics = await api.get('/schools/global-metrics');
        if (totalUsersEl) totalUsersEl.textContent = metrics.learners + metrics.teachers + metrics.admins;
        if (totalSchoolsEl) totalSchoolsEl.textContent = metrics.schools;
        // Mock growth for now
        if (userGrowthEl) userGrowthEl.textContent = '+5%';
        if (schoolGrowthEl) schoolGrowthEl.textContent = '+1';

        // Fetch AI health
        const audit = await api.get('/ai/audit');
        if (aiHealthScoreEl) aiHealthScoreEl.textContent = audit.healthScore + '%';
    } catch (err) {
        console.error('Failed to fetch metrics:', err);
    }
}

async function fetchSchools() {
    try {
        schools = await api.get('/schools');
        renderPendingSchools();
    } catch (err) {
        console.error('Failed to fetch schools:', err);
    }
}

// --- Pending Schools Logic ---
function renderPendingSchools() {
    if (!pendingSchoolsList) return;

    const pending = schools.filter(s => !s.isActive);
    if (pending.length === 0) {
        pendingSchoolsList.innerHTML = '<div class="text-center py-4 text-slate-400 text-sm">No pending requests</div>';
        return;
    }

    pendingSchoolsList.innerHTML = '';
    pending.forEach(school => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-slate-50 p-3 rounded-xl';
        div.innerHTML = `
            <div>
                <p class="font-medium">${escapeHtml(school.name)}</p>
                <p class="text-xs text-slate-500">Code: ${escapeHtml(school.uniqueCode)} • applied recently</p>
            </div>
            <div class="flex gap-2">
                <button class="approve-btn bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold" data-id="${school._id}">Approve</button>
                <button class="reject-btn bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs" data-id="${school._id}">Reject</button>
            </div>
        `;
        pendingSchoolsList.appendChild(div);
    });

    pendingSchoolsList.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            try {
                await api.put(`/schools/${id}`, { isActive: true });
                alert('School approved!');
                await fetchSchools();
            } catch (err) {
                alert('Failed to approve: ' + err.message);
            }
        });
    });
}

// --- Misc Actions ---
function setupMiscActions() {
    if (refreshAllBtn) {
        refreshAllBtn.addEventListener('click', async () => {
            await fetchMetrics();
            await fetchSchools();
            alert('Data refreshed from server');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (err) {
                console.error('Logout failed:', err);
            }
        });
    }
}

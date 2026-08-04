import { api } from '../api.js';
import { escapeHtml } from '../utils.js';

const userTableBody = document.getElementById('userTableBody');
const userSearch = document.getElementById('userSearch');
const totalUsersEl = document.getElementById('totalUsers');
const learnerCountEl = document.getElementById('learnerCount');
const teacherCountEl = document.getElementById('teacherCount');
const activeNowEl = document.getElementById('activeNow');
const displayedCountEl = document.getElementById('displayedCount');
const totalCountEl = document.getElementById('totalCount');

let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    
    userSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsers.filter(user => 
            user.fullNames?.toLowerCase().includes(query) || 
            user.surname?.toLowerCase().includes(query) || 
            user.email?.toLowerCase().includes(query) || 
            user.userCode?.toLowerCase().includes(query)
        );
        renderUsers(filtered);
    });
});

async function fetchUsers() {
    try {
        allUsers = await api.get('/users');
        renderUsers(allUsers);
        updateStats();
    } catch (err) {
        console.error('Failed to fetch users:', err);
        userTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-red-500">Error loading users: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderUsers(users) {
    userTableBody.innerHTML = '';
    
    if (users.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400">No users found</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'user-row border-b border-slate-100 transition-colors';
        
        const roleColors = {
            'Learner': 'bg-blue-100 text-blue-700',
            'Teacher': 'bg-purple-100 text-purple-700',
            'SchoolAdmin': 'bg-amber-100 text-amber-700',
            'DevAdmin': 'bg-slate-800 text-white'
        };

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                        ${user.fullNames ? escapeHtml(user.fullNames[0]) : '?'}
                    </div>
                    <div>
                        <p class="font-bold text-slate-900">${escapeHtml(user.fullNames)} ${escapeHtml(user.surname)}</p>
                        <p class="text-xs text-slate-500">${escapeHtml(user.email)}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${roleColors[user.role] || 'bg-slate-100'}">
                    ${escapeHtml(user.role)}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600 font-medium">
                ${escapeHtml(user.schoolId?.name) || 'N/A'}
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <span class="h-2 w-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                    <span class="text-sm font-medium ${user.isActive ? 'text-emerald-700' : 'text-slate-500'}">${user.isActive ? 'Active' : 'Inactive'}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                    <button class="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition" title="Edit User"><i class="fas fa-edit"></i></button>
                    <button class="toggle-status-btn p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition" data-id="${user._id}" data-active="${user.isActive}" title="${user.isActive ? 'Deactivate' : 'Activate'}">
                        <i class="fas ${user.isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                </div>
            </td>
        `;
        userTableBody.appendChild(row);
    });

    displayedCountEl.textContent = users.length;
    totalCountEl.textContent = allUsers.length;

    // Attach toggle event
    userTableBody.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const newStatus = btn.dataset.active === 'false';
            try {
                await api.put(`/users/${id}`, { isActive: newStatus });
                alert(`User ${newStatus ? 'activated' : 'deactivated'} successfully.`);
                fetchUsers();
            } catch (err) {
                alert('Action failed: ' + err.message);
            }
        });
    });
}

function updateStats() {
    totalUsersEl.textContent = allUsers.length;
    learnerCountEl.textContent = allUsers.filter(u => u.role === 'Learner').length;
    teacherCountEl.textContent = allUsers.filter(u => u.role === 'Teacher').length;
    activeNowEl.textContent = allUsers.filter(u => u.isActive).length;
}

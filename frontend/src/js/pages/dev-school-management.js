import { api } from '../api.js';
import { escapeHtml } from '../utils.js';

const schoolGrid = document.getElementById('schoolGrid');
const addSchoolBtn = document.getElementById('addSchoolBtn');
const schoolModal = document.getElementById('schoolModal');
const closeModal = document.getElementById('closeModal');
const schoolForm = document.getElementById('schoolForm');

document.addEventListener('DOMContentLoaded', () => {
    fetchSchools();
    
    addSchoolBtn.addEventListener('click', () => schoolModal.classList.remove('hidden'));
    closeModal.addEventListener('click', () => schoolModal.classList.add('hidden'));
    
    schoolForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('name').value,
            province: document.getElementById('province').value,
            address: document.getElementById('address').value
        };
        
        try {
            await api.post('/schools', data);
            alert('School registered successfully!');
            schoolModal.classList.add('hidden');
            schoolForm.reset();
            fetchSchools();
        } catch (err) {
            alert('Failed to register school: ' + err.message);
        }
    });
});

async function fetchSchools() {
    try {
        const schools = await api.get('/schools');
        renderSchools(schools);
    } catch (err) {
        console.error('Failed to fetch schools:', err);
        schoolGrid.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">Error loading schools: ${escapeHtml(err.message)}</div>`;
    }
}

function renderSchools(schools) {
    schoolGrid.innerHTML = '';
    
    if (schools.length === 0) {
        schoolGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">No schools registered yet</div>';
        return;
    }

    schools.forEach(school => {
        const card = document.createElement('div');
        card.className = 'glass-card p-6 rounded-[2rem] flex flex-col transition-all hover:shadow-xl hover:-translate-y-1';
        
        const logo = school.theme?.logoUrl || 'https://placehold.co/100?text=Logo';
        const primary = school.theme?.primaryColor || '#1e3a8a';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-6">
                <img src="${escapeHtml(logo)}" class="h-12 w-auto object-contain rounded-lg">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${school.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                    ${school.isActive ? 'Active' : 'Pending'}
                </span>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-1">${escapeHtml(school.name)}</h3>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4"><i class="fas fa-map-marker-alt mr-1"></i> ${escapeHtml(school.province)} Region</p>

            <div class="mt-auto space-y-3 pt-4 border-t border-slate-100">
                <div class="flex justify-between text-xs font-medium">
                    <span class="text-slate-400">Unique Code:</span>
                    <span class="text-slate-900 font-bold">${escapeHtml(school.uniqueCode)}</span>
                </div>
                <div class="flex justify-between text-xs font-medium">
                    <span class="text-slate-400">Subscription:</span>
                    <span class="text-blue-600 font-bold uppercase">${escapeHtml(school.subscriptionTier) || 'Basic'}</span>
                </div>
                <div class="flex gap-2 pt-2">
                    <button class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition">Settings</button>
                    <button class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"><i class="fas fa-external-link-alt"></i></button>
                </div>
            </div>
        `;
        schoolGrid.appendChild(card);
    });
}

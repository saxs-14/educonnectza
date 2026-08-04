import { api } from '../api.js';
import { escapeHtml } from '../utils.js';

const contentTableBody = document.getElementById('contentTableBody');
const addContentBtn = document.getElementById('addContentBtn');
const contentModal = document.getElementById('contentModal');
const closeModal = document.getElementById('closeModal');
const contentForm = document.getElementById('contentForm');

document.addEventListener('DOMContentLoaded', () => {
    fetchContent();
    
    addContentBtn.addEventListener('click', () => contentModal.classList.remove('hidden'));
    closeModal.addEventListener('click', () => contentModal.classList.add('hidden'));
    
    contentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            title: document.getElementById('title').value,
            type: document.getElementById('type').value,
            grade: parseInt(document.getElementById('grade').value),
            subject: document.getElementById('subject').value,
            url: document.getElementById('url').value
        };
        
        try {
            await api.post('/dev/content', data);
            alert('Resource published successfully!');
            contentModal.classList.add('hidden');
            contentForm.reset();
            fetchContent();
        } catch (err) {
            alert('Failed to publish: ' + err.message);
        }
    });
});

async function fetchContent() {
    try {
        const content = await api.get('/dev/content');
        renderContent(content);
    } catch (err) {
        console.error('Failed to fetch content:', err);
    }
}

function renderContent(content) {
    contentTableBody.innerHTML = '';
    
    if (content.length === 0) {
        contentTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-400">No global resources found.</td></tr>';
        return;
    }

    content.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 transition-colors border-b border-slate-100';
        
        const typeColors = {
            'Past Paper': 'bg-blue-100 text-blue-700',
            'Pacing Guide': 'bg-purple-100 text-purple-700',
            'Study Guide': 'bg-amber-100 text-amber-700'
        };

        row.innerHTML = `
            <td class="px-6 py-4">
                <p class="font-bold text-slate-900">${escapeHtml(item.title)}</p>
                <p class="text-[10px] text-slate-400 font-mono">${escapeHtml(item._id)}</p>
            </td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${typeColors[item.type] || 'bg-slate-100'}">
                    ${escapeHtml(item.type)}
                </span>
            </td>
            <td class="px-6 py-4 text-sm">
                <span class="font-bold text-slate-700">Gr ${escapeHtml(item.grade)}</span> • ${escapeHtml(item.subject)}
            </td>
            <td class="px-6 py-4">
                <span class="flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <span class="h-2 w-2 rounded-full bg-emerald-500"></span> ${escapeHtml(item.status)}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <a href="${escapeHtml(item.url)}" target="_blank" class="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition" title="View Link"><i class="fas fa-external-link-alt"></i></a>
                <button class="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        contentTableBody.appendChild(row);
    });
}

import { api } from '../api.js';
import { escapeHtml } from '../utils.js';

const collectionList = document.getElementById('collectionList');
const currentCollectionName = document.getElementById('currentCollectionName');
const documentGrid = document.getElementById('documentGrid');
const refreshBtn = document.getElementById('refreshCollection');

let activeCollection = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchCollections();
    
    refreshBtn.addEventListener('click', () => {
        if (activeCollection) fetchRecords(activeCollection);
    });
});

async function fetchCollections() {
    try {
        const collections = await api.get('/dev/db/collections');
        renderCollections(collections);
    } catch (err) {
        console.error('Failed to fetch collections:', err);
    }
}

function renderCollections(collections) {
    collectionList.innerHTML = '';
    collections.forEach(col => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left px-4 py-3 rounded-xl hover:bg-white hover:shadow-sm transition-all flex justify-between items-center group';
        btn.innerHTML = `
            <span class="text-sm font-medium text-slate-600 group-hover:text-slate-900">${col.name}</span>
            <span class="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold">${col.count}</span>
        `;
        btn.addEventListener('click', () => {
            // Update active state
            collectionList.querySelectorAll('button').forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'border-l-4', 'border-indigo-600'));
            btn.classList.add('bg-white', 'shadow-sm', 'border-l-4', 'border-indigo-600');
            
            activeCollection = col.name;
            currentCollectionName.textContent = col.name;
            fetchRecords(col.name);
        });
        collectionList.appendChild(btn);
    });
}

async function fetchRecords(collection) {
    try {
        documentGrid.innerHTML = '<div class="text-center py-20 text-slate-400"><i class="fas fa-spinner fa-spin text-3xl mb-4"></i><p>Scanning shards...</p></div>';
        const records = await api.get(`/dev/db/${collection}`);
        renderRecords(records);
    } catch (err) {
        documentGrid.innerHTML = `<div class="text-center py-20 text-rose-500"><i class="fas fa-exclamation-triangle text-3xl mb-4"></i><p>${escapeHtml(err.message)}</p></div>`;
    }
}

function renderRecords(records) {
    documentGrid.innerHTML = '';
    if (records.length === 0) {
        documentGrid.innerHTML = '<div class="text-center py-20 text-slate-400">Empty collection.</div>';
        return;
    }

    records.forEach(doc => {
        const div = document.createElement('div');
        div.className = 'bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono text-[11px] overflow-x-auto';
        
        // Pretty print JSON with custom coloring. Escape FIRST so any stored
        // HTML/script in a field value renders as inert text, not markup.
        let json = escapeHtml(JSON.stringify(doc, null, 2));
        json = json.replace(/&quot;(\w+)&quot;:/g, '<span class="json-key">&quot;$1&quot;</span>:');
        json = json.replace(/: &quot;(.*)&quot;/g, ': <span class="json-string">&quot;$1&quot;</span>');
        json = json.replace(/: (\d+)/g, ': <span class="json-number">$1</span>');
        
        div.innerHTML = `<pre>${json}</pre>`;
        documentGrid.appendChild(div);
    });
}

import { api } from '../api.js';
import { escapeHtml } from '../utils.js';

const healthScoreEl = document.getElementById('healthScore');
const healthCircle = document.getElementById('healthCircle');
const lastScanTimeEl = document.getElementById('lastScanTime');
const insightsList = document.getElementById('insightsList');
const runScanBtn = document.getElementById('runScanBtn');
const scanningOverlay = document.getElementById('scanningOverlay');
const scanStatus = document.getElementById('scanStatus');
const recommendationsSection = document.getElementById('recommendationsSection');
const recommendationsList = document.getElementById('recommendationsList');

document.addEventListener('DOMContentLoaded', () => {
    fetchAudit();
    
    runScanBtn.addEventListener('click', runDeepScan);
});

async function fetchAudit() {
    try {
        const data = await api.get('/ai/audit');
        renderAudit(data);
    } catch (err) {
        console.error('Failed to fetch AI audit:', err);
    }
}

function renderAudit(data) {
    // Render Health Score
    healthScoreEl.textContent = data.healthScore;
    const offset = 440 - (440 * data.healthScore) / 100;
    healthCircle.style.strokeDashoffset = offset;
    
    lastScanTimeEl.textContent = new Date(data.lastScan).toLocaleTimeString();
    
    // Render Insights
    insightsList.innerHTML = '';
    data.insights.forEach(insight => {
        const div = document.createElement('div');
        const colorClass = insight.type === 'critical' ? 'bg-red-50 text-red-700 border-red-100' : 
                          insight.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                          'bg-blue-50 text-blue-700 border-blue-100';
        
        const icon = insight.type === 'critical' ? 'fa-exclamation-circle' : 
                    insight.type === 'warning' ? 'fa-triangle-exclamation' : 
                    'fa-circle-info';

        div.className = `p-4 rounded-2xl border ${colorClass} flex items-start gap-4 transition-all hover:shadow-md`;
        div.innerHTML = `
            <i class="fas ${icon} mt-1"></i>
            <div class="flex-1">
                <p class="font-bold text-sm uppercase tracking-wider mb-1">${escapeHtml(insight.type)}</p>
                <p class="text-sm font-medium">${escapeHtml(insight.message)}</p>
                ${insight.action !== 'None' ? `<button class="mt-2 text-xs font-bold underline">${escapeHtml(insight.action)}</button>` : ''}
            </div>
        `;
        insightsList.appendChild(div);
    });
}

async function runDeepScan() {
    runScanBtn.disabled = true;
    scanningOverlay.classList.remove('hidden');
    scanStatus.classList.remove('hidden');
    
    try {
        const data = await api.post('/ai/db-check', {});
        
        // Simulate progress
        setTimeout(() => {
            scanningOverlay.classList.add('hidden');
            renderDeepResults(data);
            runScanBtn.disabled = false;
        }, 3000);
        
    } catch (err) {
        alert('AI Scan failed: ' + err.message);
        scanningOverlay.classList.add('hidden');
        runScanBtn.disabled = false;
    }
}

function renderDeepResults(data) {
    recommendationsSection.classList.remove('hidden');
    recommendationsList.innerHTML = '';

    const hasOrphans = data.summary.orphanRecords > 0;
    const borderClass = hasOrphans ? 'border-l-amber-500' : 'border-l-indigo-600';
    const iconWrapClass = hasOrphans ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600';
    const iconClass = hasOrphans ? 'fa-triangle-exclamation' : 'fa-check';

    data.recommendations.forEach(rec => {
        const div = document.createElement('div');
        div.className = `glass-card p-5 rounded-2xl border-l-4 ${borderClass} flex items-center gap-4`;
        div.innerHTML = `
            <div class="${iconWrapClass} w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <i class="fas ${iconClass}"></i>
            </div>
            <p class="text-slate-700 font-medium text-sm">${escapeHtml(rec)}</p>
        `;
        recommendationsList.appendChild(div);
    });
}

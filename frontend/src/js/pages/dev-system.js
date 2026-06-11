import { api } from '../api.js';

const clusterNameEl = document.getElementById('clusterName');
const cpuLoadEl = document.getElementById('cpuLoad');
const cpuBar = document.getElementById('cpuBar');
const minPodsInput = document.getElementById('minPods');
const maxPodsInput = document.getElementById('maxPods');
const applyScalingBtn = document.getElementById('applyScalingBtn');
const currentVersionEl = document.getElementById('currentVersion');
const deploymentHistory = document.getElementById('deploymentHistory');

document.addEventListener('DOMContentLoaded', () => {
    fetchSystemConfig();
    
    applyScalingBtn.addEventListener('click', updateScaling);
});

async function fetchSystemConfig() {
    try {
        const config = await api.get('/dev/system');
        
        clusterNameEl.textContent = config.clusterName;
        cpuLoadEl.textContent = config.cpuLoad + '%';
        cpuBar.style.width = config.cpuLoad + '%';
        
        minPodsInput.value = config.minPods;
        maxPodsInput.value = config.maxPods;
        
        currentVersionEl.textContent = config.version;
        
        renderHistory(config.history);
    } catch (err) {
        console.error('Failed to fetch system config:', err);
    }
}

function renderHistory(history) {
    deploymentHistory.innerHTML = '';
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group';
        div.innerHTML = `
            <div>
                <span class="font-mono text-xs font-bold text-slate-900">${item.version}</span>
                <p class="text-[10px] text-slate-500 mt-1">${item.description}</p>
            </div>
            <button class="opacity-0 group-hover:opacity-100 bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-bold transition-all">Rollback</button>
        `;
        div.querySelector('button').addEventListener('click', () => {
            alert(`Initiating rollback to ${item.version}... (Simulated)`);
        });
        deploymentHistory.appendChild(div);
    });
}

async function updateScaling() {
    const data = {
        minPods: parseInt(minPodsInput.value),
        maxPods: parseInt(maxPodsInput.value)
    };
    
    try {
        applyScalingBtn.disabled = true;
        applyScalingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
        
        await api.put('/dev/system/scaling', data);
        
        alert('Cluster configuration updated successfully!');
        await fetchSystemConfig();
    } catch (err) {
        alert('Failed to update cluster: ' + err.message);
    } finally {
        applyScalingBtn.disabled = false;
        applyScalingBtn.innerHTML = '<i class="fas fa-save"></i> Apply Cluster Configuration';
    }
}

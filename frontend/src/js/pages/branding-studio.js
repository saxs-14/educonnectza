import { api } from '../api.js';
import { auth } from '../firebase.js';

// --- State ---
let user = null;
let schools = [];
let currentSchoolId = null;
let currentSchool = null;
let logoFile = null;

// --- Elements ---
const schoolSelector = document.getElementById('schoolSelector');
const schoolBrandSelect = document.getElementById('schoolBrandSelect');
const primaryColorPicker = document.getElementById('primaryColorPicker');
const secondaryColorPicker = document.getElementById('secondaryColorPicker');
const primaryHex = document.getElementById('primaryHex');
const secondaryHex = document.getElementById('secondaryHex');
const schoolLogoUpload = document.getElementById('schoolLogoUpload');
const logoStatus = document.getElementById('logoStatus');
const logoPreviewImg = document.getElementById('logoPreviewImg');
const logoFileName = document.getElementById('logoFileName');
const removeLogoBtn = document.getElementById('removeLogoBtn');
const saveBrandingBtn = document.getElementById('saveBrandingBtn');
const presetBtns = document.querySelectorAll('.preset-btn');
const viewTabBtns = document.querySelectorAll('.view-tab-btn');

// Preview Elements
const previewHeader = document.getElementById('previewHeader');
const previewLogo = document.getElementById('previewLogo');
const previewSchoolName = document.getElementById('previewSchoolName');
const previewTitle = document.getElementById('previewTitle');
const previewBadge = document.getElementById('previewBadge');
const gradientBgElements = document.querySelectorAll('.gradient-bg');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'DevAdmin') {
        window.location.href = 'index.html';
        return;
    }

    schoolSelector.classList.remove('hidden');
    await fetchSchools();

    setupEventListeners();
    updateLivePreview();
});

// --- Data Fetching ---
async function fetchSchools() {
    try {
        schools = await api.get('/schools');
        schoolBrandSelect.innerHTML = '<option value="">Select a school...</option>';
        schools.filter(s => s.isActive).forEach(school => {
            const option = document.createElement('option');
            option.value = school._id;
            option.textContent = school.name;
            schoolBrandSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to fetch schools:', err);
    }
}

async function fetchCurrentSchool() {
    try {
        const school = await api.get(`/schools/${currentSchoolId}`);
        currentSchool = school;
        applySchoolData(school);
    } catch (err) {
        console.error('Failed to fetch school:', err);
    }
}

function applySchoolData(school) {
    primaryColorPicker.value = school.theme?.primaryColor || '#1e3a8a';
    secondaryColorPicker.value = school.theme?.secondaryColor || '#10b981';
    primaryHex.textContent = primaryColorPicker.value.toUpperCase();
    secondaryHex.textContent = secondaryColorPicker.value.toUpperCase();
    
    if (school.theme?.logoUrl) {
        showLogoStatus(school.theme.logoUrl, 'current-logo.png');
    } else {
        hideLogoStatus();
    }

    previewSchoolName.textContent = school.name;
    updateLivePreview();
}

// --- Event Listeners ---
function setupEventListeners() {
    schoolBrandSelect?.addEventListener('change', async (e) => {
        currentSchoolId = e.target.value;
        if (currentSchoolId) {
            await fetchCurrentSchool();
        }
    });

    primaryColorPicker.addEventListener('input', () => {
        primaryHex.textContent = primaryColorPicker.value.toUpperCase();
        updateLivePreview();
    });

    secondaryColorPicker.addEventListener('input', () => {
        secondaryHex.textContent = secondaryColorPicker.value.toUpperCase();
        updateLivePreview();
    });

    schoolLogoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            logoFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                showLogoStatus(event.target.result, file.name);
                previewLogo.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    removeLogoBtn.addEventListener('click', () => {
        logoFile = null;
        schoolLogoUpload.value = '';
        if (currentSchool?.theme?.logoUrl) {
            showLogoStatus(currentSchool.theme.logoUrl, 'current-logo.png');
            previewLogo.src = currentSchool.theme.logoUrl;
        } else {
            hideLogoStatus();
            previewLogo.src = 'https://placehold.co/100x40/white/blue?text=Logo';
        }
    });

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            primaryColorPicker.value = btn.dataset.primary;
            secondaryColorPicker.value = btn.dataset.secondary;
            primaryHex.textContent = btn.dataset.primary.toUpperCase();
            secondaryHex.textContent = btn.dataset.secondary.toUpperCase();
            updateLivePreview();
        });
    });

    viewTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewTabBtns.forEach(b => {
                b.classList.remove('bg-white', 'shadow-lg', 'text-indigo-600');
                b.classList.add('text-slate-500', 'hover:text-slate-800');
            });
            btn.classList.add('bg-white', 'shadow-lg', 'text-indigo-600');
            btn.classList.remove('text-slate-500', 'hover:text-slate-800');
            
            updateMockContent(btn.dataset.view);
        });
    });

    saveBrandingBtn.addEventListener('click', saveBranding);
}

// --- UI Updates ---
function updateLivePreview() {
    const primary = primaryColorPicker.value;
    const secondary = secondaryColorPicker.value;
    
    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--secondary-color', secondary);
    
    // Update gradient elements manually since CSS vars in tailwind might need a refresh or specific classes
    const gradient = `linear-gradient(135deg, ${primary}, ${secondary})`;
    previewHeader.style.background = gradient;
    previewBadge.style.background = gradient;
    
    document.querySelectorAll('.preview-window .gradient-bg').forEach(el => {
        el.style.background = gradient;
    });
}

function updateMockContent(view) {
    const title = document.getElementById('previewTitle');
    const badge = document.getElementById('previewBadge');
    
    switch(view) {
        case 'admin':
            previewSchoolName.textContent = (currentSchool?.name || 'Institutional') + ' Admin';
            badge.textContent = 'System Active';
            break;
        case 'teacher':
            previewSchoolName.textContent = (currentSchool?.name || 'Institutional') + ' Staff';
            badge.textContent = 'Term 2 Prep';
            break;
        case 'learner':
            previewSchoolName.textContent = (currentSchool?.name || 'Institutional') + ' Learner';
            badge.textContent = '84% Progress';
            break;
    }
}

function showLogoStatus(src, name) {
    logoPreviewImg.src = src;
    logoFileName.textContent = name;
    logoStatus.classList.remove('hidden');
}

function hideLogoStatus() {
    logoStatus.classList.add('hidden');
}

// --- Actions ---
async function saveBranding() {
    if (!currentSchoolId) {
        alert('Please select a school first');
        return;
    }

    try {
        saveBrandingBtn.disabled = true;
        saveBrandingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';

        // 1. Update Colors
        const body = {
            primaryColor: primaryColorPicker.value,
            secondaryColor: secondaryColorPicker.value
        };
        await api.put(`/schools/${currentSchoolId}/theme`, body);

        // 2. Update Logo if file selected
        if (logoFile) {
            const formData = new FormData();
            formData.append('logo', logoFile);
            await api.put(`/schools/${currentSchoolId}/theme`, formData, true);
        }

        alert('✨ Branding synced successfully with the database!');
        await fetchSchools();
    } catch (err) {
        alert('Failed to sync branding: ' + err.message);
    } finally {
        saveBrandingBtn.disabled = false;
        saveBrandingBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Sync & Save Changes';
    }
}

import { api } from './api.js';

/**
 * Theme Engine for EduConnectZA
 * Fetches and applies school branding to the dashboard
 */
export async function applyTheme() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.schoolId) return;

        // Fetch school branding (prefer cache if possible in a real app, but fetch for now)
        const school = await api.get(`/schools/${user.schoolId}`);
        
        if (school && school.theme) {
            const { primaryColor, secondaryColor, logoUrl } = school.theme;

            // Apply colors to CSS variables
            document.documentElement.style.setProperty('--primary-color', primaryColor || '#1e3a8a');
            document.documentElement.style.setProperty('--secondary-color', secondaryColor || '#10b981');

            // Apply logo if available
            const logoElements = document.querySelectorAll('.school-logo');
            logoElements.forEach(img => {
                if (logoUrl) {
                    img.src = logoUrl;
                    img.classList.remove('hidden');
                } else {
                    img.classList.add('hidden');
                }
            });

            // Update school name if elements exist
            const schoolNameElements = document.querySelectorAll('.school-name');
            schoolNameElements.forEach(el => {
                el.textContent = school.name;
            });

            console.log(`Theme applied for ${school.name}`);
            
            // Dispatch event for components that might need to react
            window.dispatchEvent(new CustomEvent('themeApplied', { detail: school.theme }));
        }
    } catch (err) {
        console.error('Failed to apply theme:', err);
    }
}

// Auto-init if not imported as a module? No, better to call it explicitly in dashboards.

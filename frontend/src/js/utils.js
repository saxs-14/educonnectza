const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  };
  toast.className = `fixed top-4 right-4 ${colors[type] || colors.info} text-white px-6 py-3 rounded shadow-lg z-50 transition-opacity duration-300`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export function isOnline() {
  return navigator.onLine;
}

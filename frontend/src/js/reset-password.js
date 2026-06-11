import { api } from '../api.js';

const form = document.getElementById('reset-password-form');
const msgDiv = document.getElementById('message');

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
  msgDiv.textContent = 'Invalid or missing reset token.';
  msgDiv.className = 'mt-4 text-center text-sm text-red-500';
  msgDiv.classList.remove('hidden');
  form.style.display = 'none';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  if (password !== confirmPassword) {
    msgDiv.textContent = 'Passwords do not match.';
    msgDiv.className = 'mt-4 text-center text-sm text-red-500';
    msgDiv.classList.remove('hidden');
    return;
  }
  try {
    await api.post(`/auth/reset-password/${token}`, { password });
    msgDiv.innerHTML = 'Password reset successful. <a href="index.html" class="text-blue-600 underline">Log in</a>.';
    msgDiv.className = 'mt-4 text-center text-sm text-green-600';
    form.style.display = 'none';
  } catch (err) {
    msgDiv.textContent = err.message;
    msgDiv.className = 'mt-4 text-center text-sm text-red-500';
  }
  msgDiv.classList.remove('hidden');
});

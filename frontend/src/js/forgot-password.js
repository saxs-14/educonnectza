import { api } from '../api.js';

const form = document.getElementById('forgot-password-form');
const msgDiv = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  try {
    await api.post('/auth/forgot-password', { email });
    msgDiv.textContent = 'Password reset link has been sent to your email.';
    msgDiv.className = 'mt-4 text-center text-sm text-green-600';
  } catch (err) {
    msgDiv.textContent = err.message;
    msgDiv.className = 'mt-4 text-center text-sm text-red-500';
  }
  msgDiv.classList.remove('hidden');
});

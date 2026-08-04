import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorDiv = document.getElementById('error-message');
const spinner = document.getElementById('login-spinner');
const loginText = document.getElementById('login-text');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    showError('Please fill in all fields');
    return;
  }
  setLoading(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch user profile from Node.js / MongoDB
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ firebaseUid: user.uid })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('user', JSON.stringify(data));
      
      // DevAdmins go straight to the dev console, based on role - not a hardcoded email.
      if (data.role === 'DevAdmin') {
        window.location.href = 'dev-admin-dashboard.html';
        return;
      }
      
      const card = document.getElementById('login-card');
      card.style.transform = 'scale(0.95)';
      card.style.opacity = '0';
      
      // Determine target dashboard based on user role
      const role = data.role;
      let targetPage = 'index.html'; // fallback: unrecognized role, send back to login
      if (role === 'SchoolAdmin') {
        targetPage = 'school-admin-dashboard.html';
      } else if (role === 'Teacher') {
        targetPage = 'teacher-dashboard.html';
      } else if (role === 'Learner') {
        targetPage = 'learner-dashboard.html';
      }

      setTimeout(() => {
        window.location.href = targetPage;
      }, 300);
    } else {
      showError(data.message || 'Failed to fetch user profile from database.');
      auth.signOut();
    }
  } catch (error) {
    let msg = 'Authentication failed.';
    if (error.code === 'auth/invalid-credential') {
      msg = 'Invalid email or password.';
    } else {
      msg = error.message;
    }
    showError(msg);
  } finally {
    setLoading(false);
  }
});

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
}

function setLoading(loading) {
  if (loading) {
    spinner.classList.remove('hidden');
    loginText.textContent = 'Signing in...';
  } else {
    spinner.classList.add('hidden');
    loginText.textContent = 'Log In';
  }
}

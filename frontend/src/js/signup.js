import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { api } from './api.js';

const schoolCodeInput = document.getElementById('schoolCode');
const schoolNameP = document.getElementById('school-name');
const roleSelect = document.getElementById('role');
const gradeField = document.getElementById('grade-field');
const parentConsentCheckbox = document.getElementById('parentConsent');
const form = document.getElementById('signup-form');
const errorDiv = document.getElementById('error-message');
const spinner = document.getElementById('signup-spinner');
const signupText = document.getElementById('signup-text');

schoolCodeInput.addEventListener('blur', async () => {
  const code = schoolCodeInput.value.trim();
  if (code.length < 5) return;
  
  schoolNameP.textContent = 'Verifying school...';
  schoolNameP.classList.remove('hidden', 'text-red-600', 'text-green-600');
  schoolNameP.classList.add('text-slate-500');

  try {
    const data = await api.post('/auth/verify-school', { schoolCode: code });
    if (data.exists) {
      schoolNameP.textContent = `✓ ${data.schoolName}`;
      schoolNameP.classList.remove('text-slate-500', 'text-red-600');
      schoolNameP.classList.add('text-green-600');
    } else {
      schoolNameP.textContent = `✗ Invalid School Code`;
      schoolNameP.classList.remove('text-slate-500', 'text-green-600');
      schoolNameP.classList.add('text-red-600');
    }
  } catch (err) {
    console.error('School code verification failed:', err);
    schoolNameP.textContent = `✗ Verification failed`;
    schoolNameP.classList.remove('text-slate-500', 'text-green-600');
    schoolNameP.classList.add('text-red-600');
  }
});

roleSelect.addEventListener('change', () => {
  const isLearner = roleSelect.value === 'Learner';
  gradeField.classList.toggle('hidden', !isLearner);
  parentConsentCheckbox.required = isLearner;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const password = formData.get('password');
  const email = formData.get('email');
  const role = formData.get('role');
  const schoolCode = formData.get('schoolCode');
  
  if (password.length < 6) {
    showError('Password must be at least 6 characters');
    return;
  }
  if (role === 'Learner' && !formData.get('parentConsent')) {
    showError('Parent or guardian consent is required to register as a learner');
    return;
  }
  setLoading(true);
  let firebaseUser = null;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    firebaseUser = userCredential.user;
    
    // Append firebaseUid to formData to send to backend
    formData.append('firebaseUid', firebaseUser.uid);
    
    // Send FormData directly as a multipart/form-data request using the api wrapper
    const data = await api.post('/auth/register', formData, true);
    
    // Successful registration – store user data and redirect based on role
    localStorage.setItem('user', JSON.stringify(data));
    
    let targetPage = 'index.html'; // fallback: unrecognized role, send back to login
    if (data.role === 'SchoolAdmin') {
      targetPage = 'school-admin-dashboard.html';
    } else if (data.role === 'Teacher') {
      targetPage = 'teacher-dashboard.html';
    } else if (data.role === 'Learner') {
      targetPage = 'learner-dashboard.html';
    }

    window.location.href = targetPage;
  } catch (error) {
    // Roll back Firebase user if registration failed on the server
    if (firebaseUser) {
      try {
        await firebaseUser.delete();
      } catch (delError) {
        console.error('Failed to rollback Firebase user:', delError);
      }
    }
    let msg = error.message;
    if (error.code === 'auth/email-already-in-use') {
      msg = 'An account with this email already exists.';
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
    signupText.textContent = 'Creating account...';
  } else {
    spinner.classList.add('hidden');
    signupText.textContent = 'Sign Up';
  }
}

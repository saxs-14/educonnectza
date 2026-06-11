import { api } from '../api.js';

export const AdminDashboard = (container) => {
  container.innerHTML = `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">School Administration</h2>
      
      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="flex space-x-4">
          <button class="tab-btn px-4 py-2 text-blue-600 border-b-2 border-blue-600" data-tab="overview">Overview</button>
          <button class="tab-btn px-4 py-2 text-gray-500 hover:text-gray-700" data-tab="classes">Classes</button>
          <button class="tab-btn px-4 py-2 text-gray-500 hover:text-gray-700" data-tab="users">Users</button>
          <button class="tab-btn px-4 py-2 text-gray-500 hover:text-gray-700" data-tab="subjects">Subjects</button>
          <button class="tab-btn px-4 py-2 text-gray-500 hover:text-gray-700" data-tab="reports">Reports</button>
        </nav>
      </div>

      <!-- Tab Contents -->
      <div id="tab-content" class="bg-white p-6 rounded-lg shadow"></div>

      <!-- Add Class Modal -->
      <div id="class-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 class="text-xl font-bold mb-4">Create New Class</h3>
          <form id="class-form">
            <div class="mb-4">
              <label class="block mb-1">Grade</label>
              <select name="grade" class="w-full border rounded px-3 py-2">
                <option value="8">Grade 8</option><option value="9">Grade 9</option>
                <option value="10">Grade 10</option><option value="11">Grade 11</option><option value="12">Grade 12</option>
              </select>
            </div>
            <div class="mb-4">
              <label class="block mb-1">Class Identifier (e.g., A, B, C)</label>
              <input type="text" name="classId" maxlength="1" class="w-full border rounded px-3 py-2">
            </div>
            <div class="mb-4">
              <label class="block mb-1">Class Owner (Teacher)</label>
              <select name="teacherId" id="teacher-select" class="w-full border rounded px-3 py-2"></select>
            </div>
            <div class="flex justify-end space-x-3">
              <button type="button" class="close-modal px-4 py-2 border rounded">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add User Modal -->
      <div id="user-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 class="text-xl font-bold mb-4">Add User</h3>
          <form id="user-form">
            <div class="mb-4">
              <label class="block mb-1">Role</label>
              <select name="role" id="user-role" class="w-full border rounded px-3 py-2">
                <option value="Teacher">Teacher</option>
                <option value="Learner">Learner</option>
              </select>
            </div>
            <div class="mb-4">
              <label class="block mb-1">Full Names</label>
              <input type="text" name="fullNames" required class="w-full border rounded px-3 py-2">
            </div>
            <div class="mb-4">
              <label class="block mb-1">Surname</label>
              <input type="text" name="surname" required class="w-full border rounded px-3 py-2">
            </div>
            <div class="mb-4">
              <label class="block mb-1">ID Number</label>
              <input type="text" name="idNumber" required class="w-full border rounded px-3 py-2">
            </div>
            <div class="mb-4">
              <label class="block mb-1">Date of Birth</label>
              <input type="date" name="dateOfBirth" required class="w-full border rounded px-3 py-2">
            </div>
            <div class="mb-4" id="grade-container">
              <label class="block mb-1">Grade</label>
              <select name="grade" class="w-full border rounded px-3 py-2">
                <option value="8">8</option><option value="9">9</option>
                <option value="10">10</option><option value="11">11</option><option value="12">12</option>
              </select>
            </div>
            <div class="mb-4">
              <label class="block mb-1">Email</label>
              <input type="email" name="email" required class="w-full border rounded px-3 py-2">
            </div>
            <div class="mb-4">
              <label class="block mb-1">Password</label>
              <input type="password" name="password" required minlength="6" class="w-full border rounded px-3 py-2">
            </div>
            <div class="flex justify-end space-x-3">
              <button type="button" class="close-modal px-4 py-2 border rounded">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
            </div>
          </form>
        </div>
      </div>

      <!-- CSV Upload Modal -->
      <div id="csv-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 class="text-xl font-bold mb-4">Upload Term Reports (CSV)</h3>
          <form id="csv-form" enctype="multipart/form-data">
            <div class="mb-4">
              <label class="block mb-1">CSV File</label>
              <input type="file" name="csvFile" accept=".csv" required class="w-full border rounded px-3 py-2">
              <p class="text-sm text-gray-500 mt-1">Format: learnerCode, promoted (true/false), [grades...]</p>
            </div>
            <div class="flex justify-end space-x-3">
              <button type="button" class="close-modal px-4 py-2 border rounded">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Upload</button>
            </div>
          </form>
        </div>
        <!-- Add Subject Modal -->
      <div id="subject-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 class="text-xl font-bold mb-4">Create New Subject</h3>
          <form id="subject-form">
            <div class="mb-4">
              <label class="block mb-1">Subject Name</label>
              <input type="text" name="name" required class="w-full border rounded px-3 py-2">
            </div>
            <div class="mb-4">
              <label class="block mb-1">Grade</label>
              <select name="grade" class="w-full border rounded px-3 py-2">
                <option value="8">Grade 8</option><option value="9">Grade 9</option>
                <option value="10">Grade 10</option><option value="11">Grade 11</option><option value="12">Grade 12</option>
              </select>
            </div>
            <div class="flex items-center mb-4">
              <input type="checkbox" name="isMandatory" id="isMandatory" class="mr-2">
              <label for="isMandatory">Mandatory Subject</label>
            </div>
            <div class="flex justify-end space-x-3">
              <button type="button" class="close-modal px-4 py-2 border rounded">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
  `;

  // Tab switching
  const tabs = document.querySelectorAll('.tab-btn');
  const contentDiv = document.getElementById('tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600'));
      tabs.forEach(t => t.classList.add('text-gray-500'));
      tab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
      tab.classList.remove('text-gray-500');
      loadTabContent(tab.dataset.tab);
    });
  });

  const loadTabContent = async (tab) => {
    switch (tab) {
      case 'overview':
        contentDiv.innerHTML = await renderOverview();
        break;
      case 'classes':
        contentDiv.innerHTML = await renderClasses();
        break;
      case 'users':
        contentDiv.innerHTML = await renderUsers();
        break;
      case 'subjects':
        contentDiv.innerHTML = await renderSubjects();
        break;
      case 'reports':
        contentDiv.innerHTML = renderReports();
        break;
    }
  };

  const renderOverview = async () => {
    try {
      const metrics = await api.get('/schools/metrics');
      return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 p-4 rounded-lg"><p class="text-3xl font-bold">${metrics.learners}</p><p>Learners</p></div>
          <div class="bg-green-50 p-4 rounded-lg"><p class="text-3xl font-bold">${metrics.teachers}</p><p>Teachers</p></div>
          <div class="bg-yellow-50 p-4 rounded-lg"><p class="text-3xl font-bold">${metrics.classes}</p><p>Classes</p></div>
        </div>
      `;
    } catch (e) {
      return '<p class="text-red-500">Failed to load metrics</p>';
    }
  };

  const renderClasses = async () => {
    try {
      const classes = await api.get('/schools/classes');
      return `
        <div class="flex justify-between mb-4">
          <h3 class="text-lg font-semibold">All Classes</h3>
          <button id="add-class-btn" class="bg-blue-600 text-white px-3 py-1 rounded">+ Add Class</button>
        </div>
        <table class="w-full">
          <thead><tr class="border-b"><th class="text-left py-2">Class</th><th>Owner</th><th>Learners</th></tr></thead>
          <tbody>
            ${classes.map(c => `<tr class="border-b"><td class="py-2">Grade ${c.grade}${c.classId}</td><td>${c.owner?.fullNames || 'Not assigned'}</td><td>${c.learnerCount}</td></tr>`).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      return '<p class="text-red-500">Failed to load classes</p>';
    }
  };

  const renderUsers = async () => {
    try {
      const users = await api.get('/users');
      return `
        <div class="flex justify-between mb-4">
          <h3 class="text-lg font-semibold">All Users</h3>
          <button id="add-user-btn" class="bg-blue-600 text-white px-3 py-1 rounded">+ Add User</button>
        </div>
        <table class="w-full">
          <thead><tr class="border-b"><th class="text-left py-2">Name</th><th>Role</th><th>Grade</th><th>User Code</th></tr></thead>
          <tbody>
            ${users.map(u => `<tr class="border-b"><td class="py-2">${u.fullNames} ${u.surname}</td><td>${u.role}</td><td>${u.grade || '-'}</td><td>${u.userCode}</td></tr>`).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      return '<p class="text-red-500">Failed to load users</p>';
    }
  };

  const renderSubjects = async () => {
    try {
      const subjects = await api.get('/subjects');
      const teachers = await api.get('/users?role=Teacher');
      return `
        <div class="flex justify-between mb-4">
          <h3 class="text-lg font-semibold">Subject Allocation</h3>
          <button id="add-subject-btn" class="bg-blue-600 text-white px-3 py-1 rounded">+ Add Subject</button>
        </div>
        <div class="space-y-3">
          ${subjects.map(s => `
            <div class="border p-3 rounded">
              <p class="font-medium">${s.name} (Grade ${s.grade})</p>
              <select class="teacher-allocation w-full mt-2 border rounded" data-subject="${s._id}">
                <option value="">Select Teacher</option>
                ${teachers.map(t => `<option value="${t._id}">${t.fullNames} ${t.surname}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>
        <button id="save-allocations" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Save Allocations</button>
      `;
    } catch (e) {
      return '<p class="text-red-500">Failed to load subjects</p>';
    }
  };

  const renderReports = () => {
    return `
      <h3 class="text-lg font-semibold mb-4">Term Reports & Grade Promotion</h3>
      <button id="upload-csv-btn" class="bg-blue-600 text-white px-4 py-2 rounded">Upload CSV Report</button>
      <p class="mt-4 text-gray-600">Upload term 4 results to automatically promote learners.</p>
    `;
  };

  // Event delegation
  document.addEventListener('click', (e) => {
    if (e.target.id === 'add-class-btn') {
      document.getElementById('class-modal').classList.remove('hidden');
      loadTeachersForSelect();
    }
    if (e.target.id === 'add-user-btn') {
      document.getElementById('user-modal').classList.remove('hidden');
    }
    if (e.target.id === 'upload-csv-btn') {
      document.getElementById('csv-modal').classList.remove('hidden');
    }
    if (e.target.id === 'add-subject-btn') {
      document.getElementById('subject-modal').classList.remove('hidden');
    }
    if (e.target.classList.contains('close-modal')) {
      e.target.closest('.fixed').classList.add('hidden');
    }
  });

  document.getElementById('user-role')?.addEventListener('change', (e) => {
    document.getElementById('grade-container').style.display = e.target.value === 'Learner' ? 'block' : 'none';
  });

  document.getElementById('class-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
      await api.post('/schools/classes', data);
      document.getElementById('class-modal').classList.add('hidden');
      loadTabContent('classes');
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.post('/users', formData);
      document.getElementById('user-modal').classList.add('hidden');
      loadTabContent('users');
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('csv-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await api.post('/schools/upload-reports', formData, true);
      document.getElementById('csv-modal').classList.add('hidden');
      alert('Reports processed. Grade promotion completed.');
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('subject-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.isMandatory = formData.has('isMandatory');
    try {
      await api.post('/subjects', data);
      document.getElementById('subject-modal').classList.add('hidden');
      loadTabContent('subjects');
    } catch (err) {
      alert(err.message);
    }
  });

  document.addEventListener('click', async (e) => {
    if (e.target.id === 'save-allocations') {
      const selects = document.querySelectorAll('.teacher-allocation');
      const allocations = Array.from(selects).map(s => ({
        subjectId: s.dataset.subject,
        teacherId: s.value,
      })).filter(a => a.teacherId);
      try {
        await api.post('/allocations/teacher/bulk', { allocations });
        alert('Allocations saved');
      } catch (err) {
        alert(err.message);
      }
    }
  });

  async function loadTeachersForSelect() {
    try {
      const teachers = await api.get('/users?role=Teacher');
      const select = document.getElementById('teacher-select');
      select.innerHTML = teachers.map(t => `<option value="${t._id}">${t.fullNames} ${t.surname}</option>`).join('');
    } catch (e) {
      console.error(e);
    }
  }

  // Load default tab
  loadTabContent('overview');
};

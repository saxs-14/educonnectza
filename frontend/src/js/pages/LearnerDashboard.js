import { api } from '../api.js';
import { addPendingSubmission } from '../offline.js';

export const LearnerDashboard = (container) => {
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white shadow-lg">
        <h1 class="text-3xl font-extrabold mb-2">Welcome back, Learner! 👋</h1>
        <p class="text-blue-100">Ready to conquer your subjects today?</p>
      </div>

      <div class="border-b border-gray-200 mb-6">
        <nav class="flex space-x-4">
          <button class="learner-tab-btn px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium" data-tab="overview">Overview</button>
          <button class="learner-tab-btn px-4 py-2 text-gray-500 hover:text-gray-700 font-medium" data-tab="grades">My Grades</button>
        </nav>
      </div>

      <div id="overview-tab" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-4">Upcoming Assignments</h3>
            <div id="upcoming-assignments" class="space-y-3"></div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-4">Recent Quizzes</h3>
            <div id="recent-quizzes"></div>
          </div>
        </div>
        <div class="space-y-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-4">Study Groups</h3>
            <div id="study-groups"></div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-4">Calendar</h3>
            <div id="mini-calendar"></div>
          </div>
        </div>
      </div>

      <div id="grades-tab" class="hidden">
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-xl font-bold mb-4">Gradebook</h3>
          <div id="gradebook-content"><p class="text-gray-500">Loading grades...</p></div>
        </div>
      </div>

      <!-- Submission Modal -->
      <div id="submission-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-lg">
          <h3 class="text-xl font-bold mb-4">Submit Assignment</h3>
          <form id="submission-form">
            <input type="hidden" id="assignment-id" name="assignmentId">
            <div class="mb-4">
              <label class="block mb-1">Text Answer (optional)</label>
              <textarea name="textAnswer" rows="4" class="w-full border rounded px-3 py-2"></textarea>
            </div>
            <div class="mb-4">
              <label class="block mb-1">Upload File / Photo</label>
              <input type="file" name="file" accept="image/*,.pdf,.doc,.docx" capture="environment" class="w-full border rounded px-3 py-2">
            </div>
            <div class="flex justify-end space-x-3">
              <button type="button" id="close-modal" class="px-4 py-2 border rounded">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Submit</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const modal = document.getElementById('submission-modal');
  const closeBtn = document.getElementById('close-modal');
  const form = document.getElementById('submission-form');
  const assignmentIdInput = document.getElementById('assignment-id');

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const assignmentId = assignmentIdInput.value;
    if (!navigator.onLine) {
      const file = formData.get('file');
      let fileData = null;
      if (file && file.size > 0) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        fileData = await new Promise(resolve => reader.onload = () => resolve(reader.result));
      }
      await addPendingSubmission({
        assignmentId,
        textAnswer: formData.get('textAnswer'),
        file: fileData,
        fileName: file?.name,
      });
      alert('Saved offline. Will sync when online.');
      modal.classList.add('hidden');
      loadAssignments();
      return;
    }
    try {
      await api.post(`/assignments/${assignmentId}/submit`, formData, true);
      modal.classList.add('hidden');
      loadAssignments();
    } catch (error) {
      alert('Submission failed: ' + error.message);
    }
  });

  const loadAssignments = async () => {
    const container = document.getElementById('upcoming-assignments');
    try {
      const assignments = await api.get('/assignments');
      const pending = assignments.filter(a => !a.submitted && new Date(a.dueDate) > new Date());
      container.innerHTML = pending.slice(0, 5).map(a => `
        <div class="border-l-4 border-blue-500 pl-4 py-2">
          <p class="font-medium">${a.title}</p>
          <p class="text-sm text-gray-600">${a.subjectId?.name} - Due: ${new Date(a.dueDate).toLocaleDateString()}</p>
          <button class="submit-btn mt-1 text-sm text-blue-600" data-id="${a._id}">Submit</button>
        </div>
      `).join('') || '<p class="text-gray-500">No pending assignments</p>';
      document.querySelectorAll('.submit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          assignmentIdInput.value = btn.dataset.id;
          modal.classList.remove('hidden');
        });
      });
    } catch (error) {
      container.innerHTML = '<p class="text-red-500">Failed to load</p>';
    }
  };

  const loadQuizzes = async () => {
    const container = document.getElementById('recent-quizzes');
    try {
      const quizzes = await api.get('/quizzes');
      container.innerHTML = quizzes.slice(0, 5).map(q => `
        <div class="border-b py-2">
          <p class="font-medium">${q.title}</p>
          <p class="text-sm">${q.subjectId?.name} - Score: ${q.score ?? 'Not taken'}</p>
        </div>
      `).join('') || '<p class="text-gray-500">No quizzes available</p>';
    } catch (error) {
      container.innerHTML = '<p class="text-red-500">Failed to load</p>';
    }
  };

  const loadStudyGroups = async () => {
    const container = document.getElementById('study-groups');
    try {
      const groups = await api.get('/study-groups');
      container.innerHTML = groups.map(g => `
        <div class="border-b py-2">
          <p class="font-medium">${g.name}</p>
          <p class="text-sm text-gray-600">${g.subjectId?.name || ''} - Members: ${g.members?.length || 1}</p>
          ${g.meetLink ? `<a href="${g.meetLink}" target="_blank" class="text-sm text-blue-600 hover:underline mt-1 inline-block">📹 Join Video Call</a>` : ''}
        </div>
      `).join('') || '<p class="text-gray-500">No study groups joined</p>';
    } catch (error) {
      container.innerHTML = '<p class="text-red-500">Failed to load groups</p>';
    }
  };

  const loadGrades = async () => {
    const container = document.getElementById('gradebook-content');
    try {
      const assignments = await api.get('/assignments');
      const quizzes = await api.get('/quizzes');
      
      const gradedAssignments = assignments.filter(a => a.submission && a.submission.grade !== undefined);
      
      container.innerHTML = `
        <table class="w-full text-left">
          <thead class="bg-gray-50">
            <tr><th class="p-3 border-b">Subject</th><th class="p-3 border-b">Task</th><th class="p-3 border-b">Score</th></tr>
          </thead>
          <tbody>
            ${gradedAssignments.map(a => `
              <tr class="border-b">
                <td class="p-3">${a.subjectId?.name || ''}</td>
                <td class="p-3">${a.title}</td>
                <td class="p-3 font-semibold text-blue-600">${a.submission.grade}%</td>
              </tr>
            `).join('')}
            ${quizzes.filter(q => q.attempted).map(q => `
              <tr class="border-b">
                <td class="p-3">${q.subjectId?.name || ''}</td>
                <td class="p-3">${q.title}</td>
                <td class="p-3 font-semibold text-blue-600">${q.score} pts</td>
              </tr>
            `).join('')}
            ${gradedAssignments.length === 0 && !quizzes.some(q=>q.attempted) ? '<tr><td colspan="3" class="p-3 text-gray-500">No grades available yet.</td></tr>' : ''}
          </tbody>
        </table>
      `;
    } catch (e) {
      container.innerHTML = '<p class="text-red-500">Error loading grades</p>';
    }
  };

  const tabs = document.querySelectorAll('.learner-tab-btn');
  if(tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600'));
        tabs.forEach(t => t.classList.add('text-gray-500'));
        tab.classList.remove('text-gray-500');
        tab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        
        document.getElementById('overview-tab').classList.add('hidden');
        document.getElementById('grades-tab').classList.add('hidden');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.remove('hidden');

        if (tab.dataset.tab === 'grades') loadGrades();
      });
    });
  }

  loadAssignments();
  loadQuizzes();
  loadStudyGroups();
};

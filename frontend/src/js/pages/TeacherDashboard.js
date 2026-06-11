import { api } from '../api.js';

export const TeacherDashboard = (container) => {
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-xl p-8 text-white shadow-lg mb-6">
        <h1 class="text-3xl font-extrabold mb-2">Teacher Dashboard 👩‍🏫</h1>
        <p class="text-blue-100">Manage your classes, assignments, and grades.</p>
      </div>

      <div class="flex justify-between items-center mb-6">
        <nav class="flex space-x-4">
          <button class="teacher-tab-btn px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium" data-tab="overview">Overview</button>
          <button class="teacher-tab-btn px-4 py-2 text-gray-500 hover:text-gray-700 font-medium" data-tab="gradebook">Gradebook</button>
        </nav>
        <div class="space-x-2">
          <button id="create-assignment-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow">+ Assignment</button>
          <button id="create-quiz-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow">+ Quiz</button>
        </div>
      </div>

      <div id="overview-tab" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-4">My Assignments</h3>
            <div id="teacher-assignments"></div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-4">Pending Submissions</h3>
            <div id="pending-submissions"></div>
          </div>
        </div>
        <div class="space-y-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-lg font-semibold mb-4">My Classes</h3>
            <div id="teacher-classes"></div>
          </div>
        </div>
      </div>

        </div>
      </div>

      <div id="gradebook-tab" class="hidden">
        <div class="bg-white p-6 rounded-lg shadow">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold">Class Gradebook</h3>
            <button id="export-csv-btn" class="bg-gray-800 text-white px-3 py-1 rounded text-sm hover:bg-gray-900">📥 Export CSV</button>
          </div>
          <div id="teacher-gradebook-content" class="overflow-x-auto"><p class="text-gray-500">Loading gradebook...</p></div>
        </div>
      </div>

      <!-- Assignment Modal -->
      <div id="assignment-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
          <h3 class="text-xl font-bold mb-4">Create Assignment</h3>
          <form id="assignment-form">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block mb-1">Title</label>
                <input type="text" name="title" required class="w-full border rounded px-3 py-2">
              </div>
              <div>
                <label class="block mb-1">Subject</label>
                <select name="subjectId" id="subject-select" required class="w-full border rounded px-3 py-2"></select>
              </div>
              <div>
                <label class="block mb-1">Class (optional)</label>
                <input type="text" name="gradeClass" placeholder="e.g., 10A" class="w-full border rounded px-3 py-2">
              </div>
              <div class="col-span-2">
                <label class="block mb-1">Description</label>
                <textarea name="description" rows="3" class="w-full border rounded px-3 py-2"></textarea>
              </div>
              <div>
                <label class="block mb-1">Due Date</label>
                <input type="datetime-local" name="dueDate" required class="w-full border rounded px-3 py-2">
              </div>
              <div>
                <label class="block mb-1">Difficulty</label>
                <select name="tierLevel" class="w-full border rounded px-3 py-2">
                  <option value="easy">Easy</option>
                  <option value="medium" selected>Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="block mb-1">Attachments</label>
                <input type="file" name="attachments" multiple class="w-full border rounded px-3 py-2">
              </div>
            </div>
            <div class="mt-6 flex justify-end space-x-3">
              <button type="button" class="close-modal px-4 py-2 border rounded">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
            </div>
          </form>
        </div>
      </div>
      <!-- View Submissions Modal -->
      <div id="submissions-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">Submissions</h3>
          <div id="submissions-list" class="space-y-4"></div>
          <div class="mt-6 flex justify-end">
            <button type="button" class="close-modal px-4 py-2 border rounded">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modal = document.getElementById('assignment-modal');
  const openBtn = document.getElementById('create-assignment-btn');
  const closeBtns = document.querySelectorAll('.close-modal');
  const form = document.getElementById('assignment-form');
  const subjectSelect = document.getElementById('subject-select');

  const loadSubjects = async () => {
    const subjects = await api.get('/subjects/my');
    subjectSelect.innerHTML = subjects.map(s => `<option value="${s._id}">${s.name} (Grade ${s.grade})</option>`).join('');
  };
  loadSubjects();

  openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
  closeBtns.forEach(btn => btn.addEventListener('click', () => modal.classList.add('hidden')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    try {
      await api.post('/assignments', formData, true);
      modal.classList.add('hidden');
      loadAssignments();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });

  const loadAssignments = async () => {
    const container = document.getElementById('teacher-assignments');
    try {
      const assignments = await api.get('/assignments');
      container.innerHTML = assignments.map(a => `
        <div class="border-b py-2">
          <p class="font-medium">${a.title}</p>
          <p class="text-sm">${a.subjectId?.name} - Due: ${new Date(a.dueDate).toLocaleDateString()}</p>
          <div class="mt-2 space-x-2">
            <button class="view-submissions-btn text-sm text-blue-600 hover:underline" data-id="${a._id}">View Submissions</button>
          </div>
        </div>
      `).join('') || '<p class="text-gray-500">No assignments created</p>';
      
      document.querySelectorAll('.view-submissions-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const assignmentId = e.target.dataset.id;
          try {
            const submissions = await api.get(`/assignments/${assignmentId}/submissions`);
            const listDiv = document.getElementById('submissions-list');
            listDiv.innerHTML = submissions.map(s => `
              <div class="border p-4 rounded bg-gray-50">
                <p class="font-medium">${s.learnerId?.fullNames} ${s.learnerId?.surname} (${s.learnerId?.userCode})</p>
                <div class="mt-2 text-sm text-gray-700">
                  <p><strong>Text Answer:</strong> ${s.textAnswer || 'N/A'}</p>
                  ${s.fileUrl ? `<p><a href="${s.fileUrl}" target="_blank" class="text-blue-500 underline">View Attachment</a></p>` : ''}
                </div>
                <div class="mt-4 flex items-center space-x-3">
                  <input type="number" id="grade-${s._id}" value="${s.grade || ''}" placeholder="Grade /100" class="border rounded px-2 py-1 w-24">
                  <input type="text" id="feedback-${s._id}" value="${s.teacherFeedback || ''}" placeholder="Feedback" class="border rounded px-2 py-1 flex-1">
                  <button class="save-grade-btn bg-green-600 text-white px-3 py-1 rounded" data-id="${s._id}">Save</button>
                </div>
              </div>
            `).join('') || '<p class="text-gray-500">No submissions yet.</p>';
            
            document.querySelectorAll('.save-grade-btn').forEach(saveBtn => {
              saveBtn.addEventListener('click', async (se) => {
                const subId = se.target.dataset.id;
                const grade = document.getElementById(`grade-${subId}`).value;
                const feedback = document.getElementById(`feedback-${subId}`).value;
                try {
                  await api.post(`/assignments/submissions/${subId}/grade`, { grade: Number(grade), teacherFeedback: feedback });
                  alert('Grade saved');
                } catch (err) {
                  alert(err.message);
                }
              });
            });
            document.getElementById('submissions-modal').classList.remove('hidden');
          } catch (err) {
            alert('Failed to load submissions');
          }
        });
      });
    } catch (error) {
      container.innerHTML = '<p class="text-red-500">Failed to load</p>';
    }
  };

  const loadClasses = async () => {
    const container = document.getElementById('teacher-classes');
    try {
      const classes = await api.get('/schools/classes');
      container.innerHTML = classes.map(c => `
        <div class="border-b py-2">
          <p class="font-medium">Grade ${c.grade}${c.classId}</p>
          <p class="text-sm text-gray-600">Learners: ${c.learnerCount || 0}</p>
          ${c.meetLink ? `<a href="${c.meetLink}" target="_blank" class="text-sm text-blue-600 hover:underline mt-1 inline-block">📹 Start Live Session</a>` : ''}
        </div>
      `).join('') || '<p class="text-gray-500">No classes assigned</p>';
    } catch (error) {
      container.innerHTML = '<p class="text-red-500">Failed to load classes</p>';
    }
  };

  const loadTeacherGradebook = async () => {
    const container = document.getElementById('teacher-gradebook-content');
    try {
      // In a real implementation we'd fetch all submissions for all assignments by the teacher
      const assignments = await api.get('/assignments');
      // For each assignment, fetch submissions. (Normally do this via a single backend endpoint to save requests)
      
      let html = '<table class="w-full text-left whitespace-nowrap"><thead class="bg-gray-50 border-b"><tr><th class="p-3">Assignment</th><th class="p-3">Learner</th><th class="p-3">Grade</th><th class="p-3">Status</th></tr></thead><tbody>';
      
      let hasData = false;
      for (const a of assignments) {
        const subs = await api.get(`/assignments/${a._id}/submissions`);
        if (subs.length > 0) hasData = true;
        subs.forEach(s => {
          html += `<tr class="border-b">
            <td class="p-3">${a.title}</td>
            <td class="p-3">${s.learnerId?.fullNames} ${s.learnerId?.surname} (${s.learnerId?.userCode})</td>
            <td class="p-3 font-semibold ${s.grade !== undefined ? 'text-blue-600' : 'text-gray-400'}">${s.grade !== undefined ? s.grade + '%' : 'Not graded'}</td>
            <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${s.grade !== undefined ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${s.grade !== undefined ? 'Graded' : 'Pending Review'}</span></td>
          </tr>`;
        });
      }
      
      html += '</tbody></table>';
      if (!hasData) html = '<p class="text-gray-500 p-4">No submissions found to grade.</p>';
      
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = '<p class="text-red-500">Failed to load gradebook.</p>';
    }
  };

  const tabs = document.querySelectorAll('.teacher-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600'));
      tabs.forEach(t => t.classList.add('text-gray-500'));
      tab.classList.remove('text-gray-500');
      tab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
      
      document.getElementById('overview-tab').classList.add('hidden');
      document.getElementById('gradebook-tab').classList.add('hidden');
      document.getElementById(`${tab.dataset.tab}-tab`).classList.remove('hidden');

      if (tab.dataset.tab === 'gradebook') loadTeacherGradebook();
    });
  });

  loadAssignments();
  loadClasses();
};

import { api } from '../api.js';

export const SubjectView = async (container, subjectId) => {
  container.innerHTML = `<div class="flex justify-center items-center h-64"><div class="animate-pulse text-gray-400">Loading subject...</div></div>`;
  const user = JSON.parse(localStorage.getItem('user'));
  
  try {
    const materials = await api.get(`/materials/subject/${subjectId}`);
    
    // Quick trick: fetch subject name from one of the materials if populated, or we could fetch the subject directly. 
    // Assuming we just show "Subject Materials" for now.
    
    container.innerHTML = `
      <div class="mb-6 flex justify-between items-center">
        <h2 class="text-3xl font-bold text-gray-800">Course Materials</h2>
        ${user.role === 'Teacher' || user.role === 'SchoolAdmin' ? `
          <button id="add-material-btn" class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">+ Add Material</button>
        ` : ''}
      </div>
      
      <div class="border-b border-gray-200 mb-6">
        <nav class="flex space-x-4">
          <button class="subject-tab-btn px-4 py-2 text-blue-600 border-b-2 border-blue-600" data-tab="materials">Materials</button>
          <button class="subject-tab-btn px-4 py-2 text-gray-500 hover:text-gray-700" data-tab="discussions">Discussions</button>
        </nav>
      </div>

      <div id="subject-tab-content">
        <!-- Materials Tab Content -->
        <div id="materials-tab" class="bg-white rounded-lg shadow p-6">
          <div id="materials-list" class="space-y-4">
            ${materials.length === 0 ? '<p class="text-gray-500">No materials uploaded yet.</p>' : ''}
            ${materials.map(m => `
              <div class="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded shadow-sm">
                <h4 class="font-semibold text-lg">${m.title} <span class="text-xs text-gray-500 font-normal bg-gray-200 px-2 py-1 rounded ml-2">${m.topic}</span></h4>
                <p class="text-gray-600 mt-1">${m.description || ''}</p>
                <div class="mt-3 flex space-x-3">
                  ${m.fileUrl ? `<a href="/${m.fileUrl}" target="_blank" class="text-blue-600 hover:underline flex items-center"><span class="mr-1">📄</span> View File</a>` : ''}
                  ${m.externalLink ? `<a href="${m.externalLink}" target="_blank" class="text-blue-600 hover:underline flex items-center"><span class="mr-1">🔗</span> External Link</a>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Discussions Tab Content -->
        <div id="discussions-tab" class="hidden bg-white rounded-lg shadow p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">Discussion Forum</h3>
            <button id="add-topic-btn" class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">New Topic</button>
          </div>
          <div id="topics-list" class="space-y-3"></div>
        </div>
      </div>

      <!-- Add Material Modal -->
      <div id="material-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg w-full max-w-lg">
          <h3 class="text-xl font-bold mb-4">Add Study Material</h3>
          <form id="material-form">
            <input type="hidden" name="subjectId" value="${subjectId}">
            <div class="mb-3">
              <label class="block text-sm font-medium">Title</label>
              <input type="text" name="title" required class="w-full border rounded p-2">
            </div>
            <div class="mb-3">
              <label class="block text-sm font-medium">Topic / Module Name</label>
              <input type="text" name="topic" placeholder="e.g. Week 1, Algebra" required class="w-full border rounded p-2">
            </div>
            <div class="mb-3">
              <label class="block text-sm font-medium">Description</label>
              <textarea name="description" class="w-full border rounded p-2"></textarea>
            </div>
            <div class="mb-3">
              <label class="block text-sm font-medium">File Upload</label>
              <input type="file" name="file" class="w-full border rounded p-2">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium">Or External Link (YouTube, Google Drive)</label>
              <input type="url" name="externalLink" class="w-full border rounded p-2">
            </div>
            <div class="flex justify-end space-x-2">
              <button type="button" id="close-material-modal" class="px-4 py-2 border rounded">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Upload</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Topic Modal -->
      <div id="topic-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg w-full max-w-lg">
          <h3 class="text-xl font-bold mb-4">Start New Discussion</h3>
          <form id="topic-form">
            <div class="mb-3">
              <label class="block text-sm font-medium">Topic Title</label>
              <input type="text" id="topic-title" required class="w-full border rounded p-2">
            </div>
            <div class="mb-3">
              <label class="block text-sm font-medium">Message</label>
              <textarea id="topic-content" required rows="4" class="w-full border rounded p-2"></textarea>
            </div>
            <div class="flex justify-end space-x-2">
              <button type="button" id="close-topic-modal" class="px-4 py-2 border rounded">Cancel</button>
              <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded">Post Topic</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Tabs logic
    const tabs = document.querySelectorAll('.subject-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600'));
        tabs.forEach(t => t.classList.add('text-gray-500'));
        tab.classList.remove('text-gray-500');
        tab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        
        document.getElementById('materials-tab').classList.add('hidden');
        document.getElementById('discussions-tab').classList.add('hidden');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.remove('hidden');

        if (tab.dataset.tab === 'discussions') {
          loadTopics();
        }
      });
    });

    const loadTopics = async () => {
      const topicsContainer = document.getElementById('topics-list');
      topicsContainer.innerHTML = '<p class="text-gray-400">Loading topics...</p>';
      try {
        const topics = await api.get(`/forums/subject/${subjectId}`);
        topicsContainer.innerHTML = topics.map(t => `
          <div class="border p-4 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer topic-card" data-id="${t._id}">
            <h4 class="font-bold text-lg text-blue-700">${t.title} ${t.isPinned ? '📌' : ''}</h4>
            <p class="text-sm text-gray-500">By ${t.author?.fullNames} ${t.author?.surname} • ${new Date(t.createdAt).toLocaleDateString()}</p>
          </div>
        `).join('') || '<p class="text-gray-500">No discussions started yet. Be the first!</p>';

        document.querySelectorAll('.topic-card').forEach(card => {
          card.addEventListener('click', () => {
            alert('Opening Topic ' + card.dataset.id + ' (Replies feature coming soon)');
          });
        });
      } catch (err) {
        topicsContainer.innerHTML = '<p class="text-red-500">Failed to load topics</p>';
      }
    };

    // Topic modal logic
    const topicModal = document.getElementById('topic-modal');
    document.getElementById('add-topic-btn').addEventListener('click', () => {
      topicModal.classList.remove('hidden');
      topicModal.classList.add('flex');
    });
    document.getElementById('close-topic-modal').addEventListener('click', () => {
      topicModal.classList.add('hidden');
      topicModal.classList.remove('flex');
    });

    document.getElementById('topic-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('topic-title').value;
      const content = document.getElementById('topic-content').value;
      try {
        await api.post('/forums/topics', { title, content, subjectId });
        topicModal.classList.add('hidden');
        topicModal.classList.remove('flex');
        loadTopics();
      } catch (err) {
        alert(err.message);
      }
    });

    if (user.role === 'Teacher' || user.role === 'SchoolAdmin') {
      const modal = document.getElementById('material-modal');
      document.getElementById('add-material-btn').addEventListener('click', () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      });
      document.getElementById('close-material-modal').addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      });

      document.getElementById('material-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
          await api.post('/materials', formData, true);
          // Refresh view
          SubjectView(container, subjectId);
        } catch (err) {
          alert('Error: ' + err.message);
        }
      });
    }

  } catch (error) {
    container.innerHTML = `<p class="text-red-500">Failed to load subject materials.</p>`;
  }
};

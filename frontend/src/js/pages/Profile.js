import { api } from '../api.js';

export const Profile = async (container) => {
  container.innerHTML = `<div class="flex justify-center items-center h-64"><div class="animate-pulse text-gray-400">Loading profile...</div></div>`;
  
  try {
    const user = await api.get('/users/profile');
    
    container.innerHTML = `
      <div class="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-6">My Profile</h2>
        
        <form id="profile-form" enctype="multipart/form-data">
          <div class="flex items-center space-x-6 mb-6">
            <div class="shrink-0">
              <img class="h-24 w-24 object-cover rounded-full shadow-sm" src="${user.profilePictureUrl ? '/' + user.profilePictureUrl : 'images/default-avatar.png'}" alt="Current profile photo" />
            </div>
            <label class="block">
              <span class="sr-only">Choose profile photo</span>
              <input type="file" name="profilePicture" accept="image/*" class="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
              "/>
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Full Names</label>
              <input type="text" name="fullNames" value="${user.fullNames}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Surname</label>
              <input type="text" name="surname" value="${user.surname}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700">Email Address</label>
              <input type="email" name="email" value="${user.email}" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">User Code</label>
              <input type="text" value="${user.userCode}" disabled class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 bg-gray-50 text-gray-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Role</label>
              <input type="text" value="${user.role}" disabled class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 bg-gray-50 text-gray-500">
            </div>
          </div>
          
          <div class="mt-8 flex justify-end">
            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">Save Changes</button>
          </div>
        </form>
        <div id="profile-msg" class="mt-4 text-center hidden"></div>
      </div>
    `;

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const msgDiv = document.getElementById('profile-msg');
      try {
        const updatedUser = await api.put('/users/profile', formData, true);
        localStorage.setItem('user', JSON.stringify({ ...JSON.parse(localStorage.getItem('user')), ...updatedUser }));
        msgDiv.textContent = 'Profile updated successfully!';
        msgDiv.className = 'mt-4 text-center text-green-600';
      } catch (err) {
        msgDiv.textContent = err.message;
        msgDiv.className = 'mt-4 text-center text-red-500';
      }
      msgDiv.classList.remove('hidden');
    });

  } catch (error) {
    container.innerHTML = `<p class="text-red-500">Failed to load profile.</p>`;
  }
};

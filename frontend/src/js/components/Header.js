export const Header = (user) => {
  return `
    <div class="flex items-center">
      <button id="menu-toggle" class="md:hidden mr-4 text-2xl">☰</button>
      <h1 class="text-xl font-bold" style="color: var(--primary)">EduConnectZA</h1>
    </div>
    <div class="flex items-center gap-4">
      <span class="text-gray-700">${user.fullNames || user.email}</span>
      <img src="${user.profilePictureUrl || 'images/logo.png'}" alt="Profile" class="w-10 h-10 rounded-full object-cover">
      <button id="logout-btn" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Logout</button>
    </div>
  `;
};


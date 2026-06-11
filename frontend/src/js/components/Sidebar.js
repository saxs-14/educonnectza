export const Sidebar = (role) => {
  const links = [
    { name: 'Dashboard', icon: '🏠', href: '#dashboard' },
    { name: 'Assignments', icon: '📝', href: '#assignments' },
    { name: 'Quizzes', icon: '❓', href: '#quizzes' },
    { name: 'Calendar', icon: '📅', href: '#calendar' },
    { name: 'My Profile', icon: '👤', href: '#profile' },
  ];
  if (role === 'Learner') {
    links.push({ name: 'Past Papers', icon: '📚', href: '#papers' });
    links.push({ name: 'Study Groups', icon: '👥', href: '#groups' });
  } else if (role === 'Teacher') {
    links.push({ name: 'My Classes', icon: '👩‍🏫', href: '#classes' });
  } else if (role === 'SchoolAdmin') {
    links.push({ name: 'Manage School', icon: '🏫', href: '#admin-school' });
    links.push({ name: 'Users', icon: '👤', href: '#users' });
    links.push({ name: 'Reports', icon: '📊', href: '#reports' });
  } else if (role === 'DevAdmin') {
    links.push({ name: 'All Schools', icon: '🏢', href: '#schools' });
    links.push({ name: 'System', icon: '⚙️', href: '#system' });
  }
  return `
    <div class="p-4">
      <div class="mb-6 text-center">
        <img src="images/logo.png" alt="EduConnectZA" class="h-12 mx-auto">
      </div>
      <nav>
        ${links.map(link => `
          <a href="${link.href}" class="flex items-center p-3 rounded-lg hover:bg-gray-100 nav-link" data-page="${link.href.substring(1)}">
            <span class="mr-3">${link.icon}</span> ${link.name}
          </a>
        `).join('')}
      </nav>
    </div>
  `;
};

export function DevAdminDashboard(container) {
  // Simple placeholder for the Dev Admin dashboard
  // In a real app you would fetch Firestore collections and render a table editor.
  const html = `
    <section class="p-6">
      <h2 class="text-2xl font-bold mb-4 text-gray-800">Dev Admin Dashboard</h2>
      <p class="text-gray-600">Here you can manage all Firestore collections, view raw data, and perform admin tasks.</p>
      <div id="dev-admin-content" class="mt-4"></div>
    </section>
  `;
  container.innerHTML = html;
  // Placeholder – you can extend this with API calls later.
}

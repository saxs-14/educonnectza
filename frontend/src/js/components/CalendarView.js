import { api } from '../api.js';
import { formatDate } from '../utils.js';

export const CalendarView = (container, options = {}) => {
  let currentDate = new Date();
  
  const render = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Fetch events for this month
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0).toISOString();
    let events = [];
    try {
      events = await api.get(`/calendar/events?start=${start}&end=${end}`);
    } catch (e) {
      console.error('Failed to load events', e);
    }

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    container.innerHTML = `
      <div class="calendar">
        <div class="flex justify-between items-center mb-4">
          <button id="prev-month" class="px-3 py-1 border rounded">&lt;</button>
          <h3 class="text-lg font-semibold">${new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <button id="next-month" class="px-3 py-1 border rounded">&gt;</button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-600">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div class="grid grid-cols-7 gap-1 mt-1">
          ${days.map(day => {
            if (day === null) return `<div class="h-20 border rounded p-1 bg-gray-50"></div>`;
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayEvents = events.filter(e => e.startDate.startsWith(dateStr));
            return `
              <div class="h-20 border rounded p-1 overflow-hidden hover:bg-gray-50">
                <div class="font-medium">${day}</div>
                ${dayEvents.slice(0,2).map(e => `<div class="text-xs bg-blue-100 text-blue-800 px-1 truncate" title="${e.title}">${e.title}</div>`).join('')}
                ${dayEvents.length > 2 ? `<div class="text-xs text-gray-500">+${dayEvents.length-2} more</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="mt-4">
          <button id="add-event-btn" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">+ Add Event</button>
        </div>
      </div>
    `;

    document.getElementById('prev-month').addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      render();
    });
    document.getElementById('next-month').addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      render();
    });
    document.getElementById('add-event-btn')?.addEventListener('click', () => {
      showEventModal();
    });
  };

  const showEventModal = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">Add Event</h3>
        <form id="event-form">
          <div class="mb-3"><label class="block mb-1">Title</label><input type="text" name="title" required class="w-full border rounded px-3 py-2"></div>
          <div class="mb-3"><label class="block mb-1">Start</label><input type="datetime-local" name="startDate" required class="w-full border rounded px-3 py-2"></div>
          <div class="mb-3"><label class="block mb-1">End</label><input type="datetime-local" name="endDate" required class="w-full border rounded px-3 py-2"></div>
          <div class="mb-3"><label class="block mb-1">Description</label><textarea name="description" class="w-full border rounded px-3 py-2"></textarea></div>
          <div class="flex justify-end space-x-3">
            <button type="button" class="cancel-modal px-4 py-2 border rounded">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.cancel-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('#event-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      try {
        await api.post('/calendar/events', data);
        modal.remove();
        render();
      } catch (err) {
        alert(err.message);
      }
    });
  };

  render();
};

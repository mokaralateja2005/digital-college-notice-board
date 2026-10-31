const STORAGE_KEY = 'campus-notice-board-v1';
function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
const seedNotices = [
  { id: 'welcome-1', title: 'Welcome back, campus community!', category: 'General', date: dateOffset(0), deadline: '', pinned: true, body: 'A new semester is underway. Check this board regularly for important announcements, upcoming events, and updates from your campus teams.' },
  { id: 'welcome-2', title: 'Course add/drop deadline approaching', category: 'Deadlines', date: dateOffset(-1), deadline: dateOffset(5), pinned: true, body: 'Students who need to make changes to their schedules must complete them through the student portal by 5:00 PM on the deadline. Contact your academic advisor if you need help.' },
  { id: 'welcome-3', title: 'Student research showcase — submissions open', category: 'Academic', date: dateOffset(-2), deadline: dateOffset(18), pinned: false, body: 'Share your research with the college community. Undergraduate and graduate students can submit a short abstract to the Office of Academic Affairs. Selected projects will be presented at the upcoming showcase.' },
  { id: 'welcome-4', title: 'Clubs fair in the student quad', category: 'Events', date: dateOffset(-3), deadline: '', pinned: false, body: 'Meet student organizations, discover new interests, and find your people. Join us in the quad from 11:00 AM to 2:00 PM. All students are welcome.' },
  { id: 'welcome-5', title: 'Library extended hours begin next week', category: 'Facilities', date: dateOffset(-4), deadline: '', pinned: false, body: 'The main library will stay open until midnight Sunday through Thursday during the midterm study period. Remember to bring your student ID for after-hours entry.' },
  { id: 'welcome-6', title: 'Financial aid document reminder', category: 'Deadlines', date: dateOffset(-5), deadline: dateOffset(12), pinned: false, body: 'Please upload any outstanding financial aid documents by the listed deadline to avoid delays in processing. The Financial Aid Office is available for appointments Monday through Friday.' }
];

const els = {
  list: document.getElementById('noticeList'),
  empty: document.getElementById('emptyState'),
  search: document.getElementById('searchInput'),
  category: document.getElementById('categoryFilter'),
  sort: document.getElementById('dateSort'),
  chips: document.getElementById('categoryChips'),
  form: document.getElementById('noticeForm'),
  panel: document.getElementById('staffPanel'),
  toggle: document.getElementById('staffToggle'),
  toast: document.getElementById('toast')
};
let notices = loadNotices();
let staffMode = false;
let toastTimer;
let apiConnected = false;
let staffApiKey = '';

function loadNotices() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedNotices;
  } catch {
    return seedNotices;
  }
}
function saveLocalNotices() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notices)); } catch { showToast('Changes could not be saved in this browser.'); }
}
async function requestApi(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (staffApiKey) headers.Authorization = `Bearer ${staffApiKey}`;

  const response = await fetch(path, { ...options, headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return result;
}
async function loadFromDatabase() {
  try {
    const result = await requestApi('/api/notices');
    if (!Array.isArray(result)) throw new Error('The notices response was invalid.');
    notices = result;
    apiConnected = true;
  } catch {
    apiConnected = false;
    showToast('Database unavailable; showing notices saved in this browser.');
  }
  render();
}
function requestStaffKey() {
  if (staffApiKey) return true;
  staffApiKey = window.prompt('Enter the staff API key:') || '';
  return Boolean(staffApiKey);
}
function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function formatDate(value) {
  if (!value) return '';
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function render() {
  const query = els.search.value.trim().toLowerCase();
  const category = els.category.value;
  const sortOrder = els.sort.value;
  const filtered = notices.filter(notice => {
    const matchesCategory = category === 'all' || notice.category === category;
    const matchesQuery = !query || `${notice.title} ${notice.body} ${notice.category}`.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  }).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
  });

  els.list.innerHTML = filtered.map(notice => {
    const categoryClass = notice.category.toLowerCase().replace(/[^a-z]/g, '');
    const deadline = notice.deadline ? `<span class="deadline-text">Due ${escapeHTML(formatDate(notice.deadline))}</span>` : '';
    const actions = staffMode ? `<div class="card-actions"><button class="card-action" type="button" data-action="edit" data-id="${escapeHTML(notice.id)}">Edit</button><button class="card-action delete" type="button" data-action="delete" data-id="${escapeHTML(notice.id)}">Remove</button></div>` : '';
    return `<article class="notice-card">
      <div class="card-top"><span class="category-label ${categoryClass}">${escapeHTML(notice.category)}</span>${notice.pinned ? '<span class="important-label">★ Important</span>' : ''}</div>
      <h3 class="card-title">${escapeHTML(notice.title)}</h3><p class="card-body">${escapeHTML(notice.body)}</p>
      <div class="card-bottom"><div><span class="card-date">Published ${escapeHTML(formatDate(notice.date))}</span>${deadline}</div>${actions}</div>
    </article>`;
  }).join('');

  els.empty.hidden = filtered.length > 0;
  els.list.hidden = filtered.length === 0;
  document.getElementById('noticeCount').textContent = notices.length;
  document.getElementById('headingCount').textContent = filtered.length;
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('deadlineCount').textContent = notices.filter(item => item.deadline && item.deadline >= today).length;
  renderCategories();
}
function renderCategories() {
  const categories = [...new Set(notices.map(item => item.category))].sort();
  const current = els.category.value || 'all';
  els.category.innerHTML = '<option value="all">All categories</option>' + categories.map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('');
  els.category.value = categories.includes(current) || current === 'all' ? current : 'all';
  els.chips.innerHTML = ['all', ...categories].map(name => {
    const selected = els.category.value === name;
    return `<button type="button" class="chip${selected ? ' selected' : ''}" data-category="${escapeHTML(name)}">${name === 'all' ? 'All notices' : escapeHTML(name)}</button>`;
  }).join('');
}
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('visible'), 2500);
}
function resetForm() {
  els.form.reset();
  document.getElementById('noticeId').value = '';
  document.getElementById('noticeDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('formHeading').textContent = 'Create a notice';
  document.getElementById('saveNotice').textContent = 'Publish notice';
  document.getElementById('cancelEdit').hidden = true;
}
function startEdit(id) {
  const notice = notices.find(item => item.id === id);
  if (!notice) return;
  document.getElementById('noticeId').value = notice.id;
  document.getElementById('noticeTitle').value = notice.title;
  document.getElementById('noticeCategory').value = notice.category;
  document.getElementById('noticeDate').value = notice.date;
  document.getElementById('noticeDeadline').value = notice.deadline || '';
  document.getElementById('noticePinned').checked = notice.pinned;
  document.getElementById('noticeBody').value = notice.body;
  document.getElementById('formHeading').textContent = 'Edit notice';
  document.getElementById('saveNotice').textContent = 'Save changes';
  document.getElementById('cancelEdit').hidden = false;
  els.panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

els.toggle.addEventListener('click', () => {
  staffMode = !staffMode;
  els.panel.hidden = !staffMode;
  els.toggle.classList.toggle('active', staffMode);
  els.toggle.setAttribute('aria-expanded', String(staffMode));
  render();
  if (staffMode) document.getElementById('noticeDate').value = new Date().toISOString().slice(0, 10);
});
document.getElementById('closePanel').addEventListener('click', () => {
  staffMode = false;
  els.panel.hidden = true;
  els.toggle.classList.remove('active');
  els.toggle.setAttribute('aria-expanded', 'false');
  render();
});
els.form.addEventListener('submit', async event => {
  event.preventDefault();
  const id = document.getElementById('noticeId').value;
  const notice = {
    id: id || `notice-${Date.now()}`,
    title: document.getElementById('noticeTitle').value.trim(),
    category: document.getElementById('noticeCategory').value,
    date: document.getElementById('noticeDate').value,
    deadline: document.getElementById('noticeDeadline').value,
    pinned: document.getElementById('noticePinned').checked,
    body: document.getElementById('noticeBody').value.trim()
  };
  if (apiConnected) {
    if (!requestStaffKey()) return;
    try {
      const savedNotice = await requestApi(`/api/notices${id ? `/${encodeURIComponent(id)}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(notice)
      });
      notices = id
        ? notices.map(item => item.id === id ? savedNotice : item)
        : [...notices, savedNotice];
      showToast(id ? 'Notice updated.' : 'Notice published.');
    } catch (error) {
      if (error.status === 401 || error.status === 503) staffApiKey = '';
      showToast(error.message);
      return;
    }
  } else {
    if (id) notices = notices.map(item => item.id === id ? notice : item);
    else notices.push(notice);
    saveLocalNotices();
    showToast('Saved in this browser only; the database is unavailable.');
  }
  resetForm();
  render();
});
document.getElementById('cancelEdit').addEventListener('click', resetForm);
document.getElementById('clearFilters').addEventListener('click', () => {
  els.search.value = '';
  els.category.value = 'all';
  els.sort.value = 'newest';
  render();
});
els.search.addEventListener('input', render);
els.category.addEventListener('change', render);
els.sort.addEventListener('change', render);
els.chips.addEventListener('click', event => {
  const chip = event.target.closest('[data-category]');
  if (!chip) return;
  els.category.value = chip.dataset.category;
  render();
});
els.list.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'edit') startEdit(button.dataset.id);
  if (button.dataset.action === 'delete' && window.confirm('Remove this notice from the board?')) {
    if (apiConnected) {
      if (!requestStaffKey()) return;
      try {
        await requestApi(`/api/notices/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
      } catch (error) {
        if (error.status === 401 || error.status === 503) staffApiKey = '';
        showToast(error.message);
        return;
      }
    }
    notices = notices.filter(item => item.id !== button.dataset.id);
    if (!apiConnected) saveLocalNotices();
    render();
    showToast(apiConnected ? 'Notice removed.' : 'Removed from this browser only.');
  }
});
document.getElementById('todayLabel').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' });
document.getElementById('noticeDate').value = new Date().toISOString().slice(0, 10);
loadFromDatabase();

(() => {
  'use strict';
  const menu = document.getElementById('manage-staff');
  const panel = document.getElementById('staff-panel');
  const form = document.getElementById('staff-form');
  if (!menu || !panel || !form) return;
  const list = document.getElementById('staff-list');
  const status = document.getElementById('staff-status');
  const refresh = document.getElementById('refresh-staff');
  const password = document.getElementById('staff-password');
  const showPassword = document.getElementById('show-staff-password');
  let adding = false;
  let loading = false;
  let loadAgain = false;

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('error', error);
    status.hidden = !text;
  }

  async function api(payload) {
    const response = await fetch('/api/staff', {
      method: payload === undefined ? 'GET' : 'POST',
      credentials: 'same-origin', cache: 'no-store',
      headers: payload === undefined ? {} : {'Content-Type': 'application/json'},
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      password.value = '';
      location.replace('/admin.html');
      throw new Error('Your session expired. Sign in again.');
    }
    if (!response.ok) throw new Error(data.error || 'Staff accounts could not be loaded. Try again.');
    return data;
  }

  function render(staff) {
    list.replaceChildren();
    document.getElementById('staff-count').textContent = staff.length + (staff.length === 1 ? ' staff account' : ' staff accounts');
    if (!staff.length) {
      list.textContent = 'No staff accounts have been added yet.';
      return;
    }
    for (const member of staff) {
      const row = document.createElement('li');
      row.className = 'staff-member';
      const name = document.createElement('strong');
      name.textContent = member.username;
      const role = document.createElement('span');
      role.className = 'chip neutral';
      role.textContent = member.role === 'admin' ? 'Administrator' : 'Editor';
      const active = document.createElement('span');
      active.className = 'staff-active';
      active.textContent = member.active ? 'Active' : 'Inactive';
      row.append(name, role, active);
      list.append(row);
    }
  }

  async function loadStaff() {
    if (loading) { loadAgain = true; return; }
    loading = true;
    refresh.disabled = true;
    list.setAttribute('aria-busy', 'true');
    try {
      const data = await api();
      if (!Array.isArray(data.staff)) throw new Error('The staff list could not be read. Refresh to try again.');
      render(data.staff);
    } catch (error) {
      list.replaceChildren();
      list.textContent = error.message;
      document.getElementById('staff-count').textContent = '';
    } finally {
      loading = false;
      refresh.disabled = false;
      list.setAttribute('aria-busy', 'false');
      if (loadAgain) { loadAgain = false; loadStaff(); }
    }
  }

  menu.addEventListener('click', () => {
    panel.hidden = false;
    menu.setAttribute('aria-expanded', 'true');
    panel.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
    document.getElementById('staff-heading').focus({preventScroll: true});
    loadStaff();
  });
  document.getElementById('close-staff').addEventListener('click', () => {
    panel.hidden = true;
    menu.setAttribute('aria-expanded', 'false');
    menu.focus();
  });
  refresh.addEventListener('click', loadStaff);
  showPassword.addEventListener('click', () => {
    const showing = password.type === 'password';
    password.type = showing ? 'text' : 'password';
    showPassword.textContent = showing ? 'Hide' : 'Show';
    showPassword.setAttribute('aria-pressed', String(showing));
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (adding || !form.reportValidity()) return;
    adding = true;
    const fields = Array.from(form.elements);
    const submit = document.getElementById('add-staff');
    const payload = {
      username: document.getElementById('staff-username').value.trim().toLowerCase(),
      email: document.getElementById('staff-email').value.trim(),
      password: password.value,
      role: document.getElementById('staff-role').value
    };
    fields.forEach(field => { field.disabled = true; });
    submit.textContent = 'Adding staff…';
    message('');
    try {
      const data = await api(payload);
      form.reset();
      password.type = 'password';
      showPassword.textContent = 'Show';
      showPassword.setAttribute('aria-pressed', 'false');
      const name = data.staff?.username || payload.username;
      message(name + ' was added as ' + (payload.role === 'admin' ? 'Administrator' : 'Editor') + '. They can sign in with their username and the password you provided.');
      await loadStaff();
    } catch (error) {
      message(error.message, true);
    } finally {
      payload.password = '';
      fields.forEach(field => { field.disabled = false; });
      submit.textContent = 'Add staff account';
      adding = false;
    }
  });

  fetch('/api/auth?action=session', {credentials: 'same-origin', cache: 'no-store'})
    .then(response => response.ok ? response.json() : null)
    .then(identity => { if (identity?.role === 'admin') menu.hidden = false; })
    .catch(() => {});
})();

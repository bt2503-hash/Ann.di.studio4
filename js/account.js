/* Особистий кабінет: вхід, реєстрація, історія замовлень */
(() => {
  const { $, esc, money } = U;
  let mode = 'in', message = '';

  function dot() { $('#accountDot').hidden = !Api.user; }

  async function render() {
    const root = $('#accountBody'), { L } = Shop;
    if (!Api.enabled) {
      root.innerHTML = `<h2>${L('Особистий кабінет', 'Account')}</h2><p class="muted">${L('База даних ще не підключена. Заповніть supabase-config.js та виконайте supabase-setup.sql.', 'The database is not connected yet. Fill in supabase-config.js and run supabase-setup.sql.')}</p>`;
      return;
    }
    if (!Api.user) {
      root.innerHTML = `<h2>${mode === 'in' ? L('Вхід', 'Sign in') : L('Реєстрація', 'Create account')}</h2>
        <div class="seg"><button class="${mode === 'in' ? 'on' : ''}" data-mode="in">${L('Увійти', 'Sign in')}</button><button class="${mode === 'up' ? 'on' : ''}" data-mode="up">${L('Реєстрація', 'Register')}</button></div>
        <form id="authForm" class="stack">
          ${mode === 'up' ? `<label>${L('Ім’я', 'Name')}<input name="name" autocomplete="name"></label>` : ''}
          <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
          <label>${L('Пароль', 'Password')}<input name="password" type="password" minlength="6" required autocomplete="${mode === 'in' ? 'current-password' : 'new-password'}"></label>
          <button class="btn btn-wine full">${mode === 'in' ? L('Увійти', 'Sign in') : L('Створити акаунт', 'Create account')}</button>
          <p class="note" id="authNote" role="status">${esc(message)}</p></form>`;
      return;
    }
    root.innerHTML = `<h2>${L('Мої замовлення', 'My orders')}</h2><p class="muted">${esc(Api.user.email)}</p>
      <div id="myOrders" class="orders"><p class="muted">${L('Завантажуємо…', 'Loading…')}</p></div>
      <button class="btn btn-line full" id="logout">${L('Вийти', 'Sign out')}</button>`;
    try {
      const orders = await Api.myOrders();
      $('#myOrders').innerHTML = orders.length ? orders.map(o => `<article class="order">
        <div><b>#${esc(o.order_number)}</b><span>${new Date(o.created_at).toLocaleDateString(Shop.S.lang === 'uk' ? 'uk-UA' : 'en-GB')}</span></div>
        <em class="st">${esc(o.status)}</em>
        <ul>${(o.items || []).map(i => `<li>${esc(i.name)} × ${Number(i.qty) || 1}</li>`).join('')}</ul>
        <b>${money(Number(o.total) || 0, Shop.S.lang)}</b></article>`).join('') : `<p class="muted">${L('Замовлень поки немає.', 'No orders yet.')}</p>`;
    } catch { $('#myOrders').innerHTML = `<p class="note err">${L('Не вдалося завантажити замовлення.', 'Could not load your orders.')}</p>`; }
  }

  function open(msg = '') { message = msg; render(); Shop.openPanel('accountModal'); }

  document.addEventListener('click', async e => {
    const m = e.target.closest('[data-mode]'); if (m) { mode = m.dataset.mode; message = ''; render(); }
    if (e.target.closest('#logout')) { await Api.signOut(); render(); }
  });
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'authForm') return;
    e.preventDefault();
    const f = e.target, note = $('#authNote'), btn = $('button.btn', f), v = n => f.elements[n]?.value.trim() ?? '';
    btn.disabled = true; note.className = 'note'; note.textContent = '';
    try {
      if (mode === 'up') {
        const r = await Api.signUp(v('email'), f.elements.password.value, v('name'));
        if (r.session) { render(); return; }
        note.textContent = Shop.L('Перевірте пошту та підтвердіть реєстрацію, потім увійдіть.', 'Check your email to confirm your registration, then sign in.'); note.className = 'note ok';
      } else { await Api.signIn(v('email'), f.elements.password.value); render(); return; }
    } catch (ex) { note.textContent = ex.message || 'Error'; note.className = 'note err'; }
    btn.disabled = false;
  });

  $('#accountBtn').onclick = () => open();
  Api.onAuth(() => { dot(); if ($('#accountModal').classList.contains('open')) render(); });
  window.Account = { open, refresh() { dot(); if ($('#accountModal').classList.contains('open')) render(); } };
})();

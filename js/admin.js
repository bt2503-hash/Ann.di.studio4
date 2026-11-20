/* Адмінпанель: замовлення, товари, запити, налаштування сайту. Усе зберігається в Supabase. */
(() => {
  const { $, $$, esc, money } = U;
  const STATUSES = ['Нове', 'Підтверджено', 'В обробці', 'Відправлено', 'Виконано', 'Скасовано'];
  const st = { orders: [], products: [], requests: [], images: [], single: { heroImage: '', aboutImage: '' }, works: [] };

  let toastTimer;
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400); };
  const fail = e => toast('Помилка: ' + (e.message || e));
  const date = s => new Date(s).toLocaleString('uk-UA');

  /* ───────── вхід ───────── */
  async function start() {
    await Api.init();
    if (Api.user && Api.isAdmin) return show();
    $('#login').hidden = false;
    if (!Api.enabled) $('#loginErr').textContent = 'Supabase не підключений: заповніть supabase-config.js.';
  }
  $('#loginForm').onsubmit = async e => {
    e.preventDefault(); $('#loginErr').textContent = '';
    try {
      await Api.signIn($('#email').value, $('#password').value);
      if (!Api.isAdmin) { await Api.signOut(); throw new Error('Цей акаунт не адміністратор. Додайте app_metadata {"role":"admin"} у Supabase → Authentication → Users.'); }
      show();
    } catch (err) { $('#loginErr').textContent = err.message; }
  };
  $('#logout').onclick = async () => { await Api.signOut(); location.reload(); };

  async function show() {
    $('#login').hidden = true; $('#dash').hidden = false; $('#logout').hidden = false;
    await loadAll(); fillSite();
  }
  async function loadAll() {
    try {
      [st.orders, st.requests, st.products] = await Promise.all([Api.adminOrders(), Api.adminRequests(), Api.getProducts().then(p => p || [])]);
    } catch (e) { fail(e); }
    $('#stNew').textContent = st.orders.filter(o => o.status === 'Нове').length;
    $('#stOrders').textContent = st.orders.length; $('#stProducts').textContent = st.products.length; $('#stRequests').textContent = st.requests.length;
    renderOrders(); renderProducts(); renderRequests();
  }

  $$('.tab').forEach(b => b.onclick = () => {
    $$('.tab').forEach(x => x.classList.toggle('on', x === b));
    ['orders', 'products', 'requests', 'site'].forEach(k => $('#p-' + k).hidden = k !== b.dataset.tab);
  });

  /* ───────── замовлення ───────── */
  function renderOrders() {
    $('#ordersList').innerHTML = st.orders.length ? `<div class="table"><table><thead><tr><th>№ / дата</th><th>Клієнт</th><th>Склад</th><th>Сума</th><th>Статус</th><th></th></tr></thead><tbody>${st.orders.map(o => `<tr>
      <td><b>${esc(o.order_number)}</b><br><small>${date(o.created_at)}</small></td>
      <td>${esc(o.customer)}<br>${esc(o.phone)}<br>${esc(o.email)}<br><small>${esc([o.delivery, o.payment, o.region, o.city, o.branch || o.address].filter(Boolean).join(' · '))}</small>${o.comment ? `<br><small>💬 ${esc(o.comment)}</small>` : ''}</td>
      <td>${(o.items || []).map(i => `${esc(i.name)} × ${i.qty}`).join('<br>')}</td>
      <td><b>${money(Number(o.total))}</b></td>
      <td><select data-status="${o.id}">${STATUSES.map(s => `<option${o.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select></td>
      <td><button class="danger" data-del-order="${o.id}">Видалити</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">Замовлень поки немає.</p>';
  }
  $('#exportCsv').onclick = () => {
    const rows = [['Номер', 'Дата', 'Клієнт', 'Телефон', 'Email', 'Доставка', 'Оплата', 'Сума', 'Статус'], ...st.orders.map(o => [o.order_number, o.created_at, o.customer, o.phone, o.email, o.delivery, o.payment, o.total, o.status])];
    const csv = '﻿' + rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: 'orders.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  };

  /* ───────── запити ───────── */
  function renderRequests() {
    $('#requestsList').innerHTML = st.requests.length ? st.requests.map(r => `<article class="req"><div><b>${esc(r.name)}</b> · <a href="mailto:${esc(r.email)}">${esc(r.email)}</a><p>${esc(r.message)}</p><small>${date(r.created_at)}</small></div><button class="danger" data-del-req="${r.id}">Видалити</button></article>`).join('') : '<p class="empty">Запитів поки немає.</p>';
  }

  /* ───────── товари ───────── */
  function renderProducts() {
    $('#seedBtn').hidden = st.products.length > 0;
    $('#productsList').innerHTML = st.products.length ? st.products.map(p => `<div class="prow"><img src="${esc(p.img)}" alt=""><div><b>${esc(p.name.uk)}</b><br><small>${esc(p.desc?.uk || '')}</small></div><strong>${p.price ? money(p.price) : 'за запитом'}</strong><div class="acts"><button class="ghost" data-edit="${p.id}">Редагувати</button><button class="danger" data-del-prod="${p.id}">Видалити</button></div></div>`).join('')
      : '<p class="empty">У базі ще немає товарів — на сайті показані стандартні. Натисніть «Імпортувати стандартні товари», щоб їх можна було редагувати та замовляти.</p>';
  }
  $('#seedBtn').onclick = async () => { try { await Api.seedProducts(DEFAULT_PRODUCTS); toast('Товари імпортовано'); await loadAll(); } catch (e) { fail(e); } };

  function thumbs(el, list, attr, main) {
    el.innerHTML = list.map((s, i) => `<div class="thumb${main && !i ? ' main' : ''}"><img src="${esc(s)}" alt=""><button type="button" data-${attr}-rm="${i}" aria-label="Видалити">×</button>${main && i ? `<button type="button" class="mk" data-${attr}-main="${i}" aria-label="Зробити головним">★</button>` : ''}</div>`).join('');
  }
  function openForm(p) {
    $('#pForm').reset(); $('#pId').value = p?.id || ''; $('#pTitle').textContent = p ? 'Редагувати товар' : 'Новий товар';
    st.images = p ? [...(p.gallery?.length ? p.gallery : [p.img])] : [];
    if (p) {
      $('#nameUk').value = p.name.uk; $('#nameEn').value = p.name.en; $('#price').value = p.price; $('#category').value = p.category; $('#color').value = p.color;
      $('#stock').value = String(p.stock); $('#descUk').value = p.desc?.uk || ''; $('#descEn').value = p.desc?.en || ''; $('#detUk').value = p.details?.uk || ''; $('#detEn').value = p.details?.en || '';
    }
    thumbs($('#pThumbs'), st.images, 'ph', true); $('#pModal').classList.add('open');
  }
  const closeForm = () => $('#pModal').classList.remove('open');
  $('#addProduct').onclick = () => openForm(); $('#pClose').onclick = closeForm; $('#pModal').onclick = e => { if (e.target.id === 'pModal') closeForm(); };

  async function uploadFiles(files, max, folder) {
    const urls = [];
    for (const f of files) {
      try { urls.push(await Api.uploadImage(await U.shrink(f, max), folder)); } catch (e) { fail(e); }
    }
    return urls;
  }
  $('#pFiles').onchange = async e => {
    toast('Завантажуємо фото…'); st.images.push(...await uploadFiles(e.target.files, 1400, 'products')); e.target.value = '';
    thumbs($('#pThumbs'), st.images, 'ph', true); toast('Готово');
  };
  $('#pForm').onsubmit = async e => {
    e.preventDefault();
    const idv = $('#pId').value, id = idv ? +idv : Math.max(0, ...st.products.map(p => p.id)) + 1;
    const p = {
      id, category: $('#category').value, color: $('#color').value, stock: $('#stock').value === 'true', price: Math.max(0, Math.round(+$('#price').value)),
      name: { uk: $('#nameUk').value.trim(), en: $('#nameEn').value.trim() }, desc: { uk: $('#descUk').value.trim(), en: $('#descEn').value.trim() },
      details: { uk: $('#detUk').value.trim(), en: $('#detEn').value.trim() }, img: st.images[0] || 'assets/logo.png', gallery: st.images
    };
    $('#pSave').disabled = true;
    try {
      await Api.saveProduct(p, idv ? undefined : st.products.length);
      closeForm(); toast('Товар збережено'); await loadAll();
    } catch (err) { fail(err); }
    $('#pSave').disabled = false;
  };

  /* ───────── налаштування сайту ───────── */
  async function fillSite() {
    st.saved = await Api.getSettings().catch(() => ({}));
    const S = st.saved;
    $$('[data-f]').forEach(el => { const [k, l] = el.dataset.f.split('.'); el.value = (l ? (S[k] || {})[l] : S[k]) ?? (l ? '' : DEFAULT_SITE[k] ?? ''); });
    st.single.heroImage = S.heroImage || ''; st.single.aboutImage = S.aboutImage || ''; st.works = [...(S.works?.length ? S.works : DEFAULT_SITE.works)];
    ['heroImage', 'aboutImage'].forEach(renderSingle); thumbs($('#th-works'), st.works, 'w', false);
  }
  function renderSingle(k) { thumbs($('#th-' + k), st.single[k] ? [st.single[k]] : [], 's-' + k, true); if (!st.single[k]) $('#th-' + k).innerHTML = '<small>Стандартне фото</small>'; }
  $$('[data-single]').forEach(inp => inp.onchange = async e => {
    const k = inp.dataset.single; if (!e.target.files[0]) return; toast('Завантажуємо…');
    const [u] = await uploadFiles([e.target.files[0]], k === 'heroImage' ? 1800 : 1400, 'site'); if (u) st.single[k] = u; renderSingle(k); e.target.value = ''; toast('Готово');
  });
  $('#worksFile').onchange = async e => { toast('Завантажуємо…'); st.works.push(...await uploadFiles(e.target.files, 1400, 'site')); e.target.value = ''; thumbs($('#th-works'), st.works, 'w', false); toast('Готово'); };
  $('#siteForm').onsubmit = async e => {
    e.preventDefault();
    const S = {};
    $$('[data-f]').forEach(el => { const [k, l] = el.dataset.f.split('.'); if (l) (S[k] = S[k] || {})[l] = el.value; else S[k] = el.value; });
    Object.assign(S, st.single, { works: st.works });
    try { await Api.saveSettings(S); toast('Збережено — зміни вже на сайті'); } catch (err) { fail(err); }
  };
  $('#siteReset').onclick = async () => { if (!confirm('Скинути всі тексти й фото сайту до стандартних?')) return; try { await Api.saveSettings({}); await fillSite(); toast('Скинуто'); } catch (e) { fail(e); } };

  /* ───────── спільні кліки ───────── */
  document.addEventListener('click', async e => {
    const c = s => e.target.closest(s); let el;
    try {
      if ((el = c('[data-edit]'))) openForm(st.products.find(p => p.id === +el.dataset.edit));
      else if ((el = c('[data-del-prod]'))) { if (confirm('Видалити товар?')) { await Api.deleteProduct(+el.dataset.delProd); await loadAll(); } }
      else if ((el = c('[data-del-order]'))) { if (confirm('Видалити замовлення?')) { await Api.deleteOrder(el.dataset.delOrder); await loadAll(); } }
      else if ((el = c('[data-del-req]'))) { if (confirm('Видалити запит?')) { await Api.deleteRequest(el.dataset.delReq); await loadAll(); } }
      else if ((el = c('[data-ph-rm]'))) { st.images.splice(+el.dataset.phRm, 1); thumbs($('#pThumbs'), st.images, 'ph', true); }
      else if ((el = c('[data-ph-main]'))) { st.images.unshift(...st.images.splice(+el.dataset.phMain, 1)); thumbs($('#pThumbs'), st.images, 'ph', true); }
      else if ((el = c('[data-w-rm]'))) { st.works.splice(+el.dataset.wRm, 1); thumbs($('#th-works'), st.works, 'w', false); }
      else if ((el = c('[data-s-heroImage-rm]'))) { st.single.heroImage = ''; renderSingle('heroImage'); }
      else if ((el = c('[data-s-aboutImage-rm]'))) { st.single.aboutImage = ''; renderSingle('aboutImage'); }
    } catch (err) { fail(err); }
  });
  document.addEventListener('change', async e => {
    if (!e.target.matches('[data-status]')) return;
    try { await Api.setOrderStatus(e.target.dataset.status, e.target.value); toast('Статус оновлено'); await loadAll(); } catch (err) { fail(err); }
  });

  start();
})();

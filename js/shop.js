/* Вітрина: каталог, фільтри, кошик, обране, картка товару, тексти сайту */
(() => {
  const { $, $$, esc, br, money } = U;
  const TEXT_KEYS = ['heroTitle', 'heroText', 'aboutTitle', 'aboutText', 'worksTitle', 'worksText'];

  const S = {
    lang: U.store.get('annLang', 'uk'),
    products: [], loaded: false,
    cart: U.store.get('annCart', []), favs: U.store.get('annFav', []),
    cat: 'all', color: 'all', q: '', sort: 'featured', stockOnly: false,
    site: structuredClone(DEFAULT_SITE)
  };
  const t = k => I18N[S.lang][k] ?? I18N.uk[k] ?? k;
  const L = (u, e) => (S.lang === 'uk' ? u : e);
  const $m = n => money(n, S.lang);
  const name = p => p.name[S.lang] || p.name.uk;
  const byId = id => S.products.find(p => p.id === id);
  const canBuy = p => p.stock && p.price > 0;
  const saveLocal = () => { U.store.set('annCart', S.cart); U.store.set('annFav', S.favs); };

  /* ───────── утиліти UI ───────── */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function openPanel(id) {
    $('#scrim').classList.add('show'); $('#' + id).classList.add('open');
    document.body.classList.add('lock'); $('#' + id + ' [data-close]')?.focus();
  }
  function closeAll() {
    $$('.drawer,.modal').forEach(x => x.classList.remove('open'));
    $('#checkoutPage').hidden = true; $('#scrim').classList.remove('show'); document.body.classList.remove('lock');
  }

  /* ───────── тексти й налаштування сайту ───────── */
  function mergeSite(saved) {
    const s = structuredClone(DEFAULT_SITE);
    TEXT_KEYS.forEach(k => ['uk', 'en'].forEach(l => { const v = saved[k]?.[l]; if (v && v.trim()) s[k][l] = v.trim(); }));
    ['heroImage', 'aboutImage'].forEach(k => { if (saved[k]) s[k] = saved[k]; });
    if (saved.works?.length) s.works = saved.works;
    ['phone', 'email', 'address', 'instagram'].forEach(k => { if (saved[k] !== undefined) s[k] = saved[k]; });
    return s;
  }
  const text = k => (TEXT_KEYS.includes(k) && S.site[k]?.[S.lang]) || t(k);
  const bg = url => `url("${String(url).replace(/"/g, '%22')}")`;

  function renderStatic() {
    document.documentElement.lang = S.lang;
    $$('[data-i18n]').forEach(el => { el.textContent = text(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach(el => { el.innerHTML = br(text(el.dataset.i18nHtml)); });
    $$('[data-ph]').forEach(el => { el.placeholder = t(el.dataset.ph); });
    $$('[data-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.aria)); });
    $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === S.lang));
    $('#heroImage').style.backgroundImage = bg(S.site.heroImage || 'assets/tees.jpg');
    $('#aboutImage').style.backgroundImage = bg(S.site.aboutImage || 'assets/towels.jpg');
    $('#gallery').innerHTML = S.site.works.map((u, i) =>
      `<figure class="g${i % 5}"><img src="${esc(u)}" alt="" loading="lazy"></figure>`).join('');
    renderContacts();
  }

  function renderContacts() {
    const { phone, email, address, instagram } = S.site;
    let ig = (instagram || '').trim();
    if (ig && !/^https?:\/\//i.test(ig)) ig = 'https://instagram.com/' + ig.replace('@', '');
    const handle = ig ? '@' + ig.replace(/\/+$/, '').split('?')[0].split('/').pop() : '';
    const card = (label, inner) => `<article><small>${label}</small>${inner}</article>`;
    const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address || '');
    $('#contactCards').innerHTML = [
      phone && card(t('cPhone'), `<a href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">${esc(phone)}</a>`),
      address && card(t('cAddress'), `<a href="${maps}" target="_blank" rel="noopener">${esc(address)}</a>`),
      ig && card(t('cInstagram'), `<a href="${esc(ig)}" target="_blank" rel="noopener">${esc(handle)}</a>`),
      email && card(t('cEmail'), `<a href="mailto:${esc(email)}">${esc(email)}</a>`)
    ].filter(Boolean).join('');
  }

  /* ───────── каталог ───────── */
  function renderFilters() {
    const cats = [...new Set(S.products.map(p => p.category))];
    $('#chips').innerHTML = [['all', t('all')], ...cats.map(c => [c, CATEGORIES[c]?.[S.lang === 'uk' ? 0 : 1] || c])]
      .map(([k, label]) => `<button class="chip${S.cat === k ? ' on' : ''}" data-cat="${esc(k)}">${esc(label)}</button>`).join('');
    const colors = [...new Set(S.products.map(p => p.color))].filter(c => COLORS[c]);
    $('#swatches').innerHTML = colors.length > 1
      ? [`<button class="sw all${S.color === 'all' ? ' on' : ''}" data-color="all" aria-label="${t('all')}"></button>`,
        ...colors.map(c => `<button class="sw${S.color === c ? ' on' : ''}" data-color="${c}" style="--c:${COLORS[c][2]}" title="${COLORS[c][S.lang === 'uk' ? 0 : 1]}" aria-label="${COLORS[c][S.lang === 'uk' ? 0 : 1]}"></button>`)].join('')
      : '';
  }

  function plural(n) {
    if (S.lang !== 'uk') return `${n} ${n === 1 ? 'product' : 'products'}`;
    const a = n % 10, b = n % 100;
    return `${n} ${a === 1 && b !== 11 ? 'товар' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'товари' : 'товарів'}`;
  }

  function filtered() {
    const q = S.q.toLowerCase();
    const list = S.products.filter(p =>
      (S.cat === 'all' || p.category === S.cat) && (S.color === 'all' || p.color === S.color) &&
      (!S.stockOnly || p.stock) && (!q || `${name(p)} ${p.desc?.[S.lang] || ''}`.toLowerCase().includes(q)));
    if (S.sort === 'low') list.sort((a, b) => a.price - b.price);
    if (S.sort === 'high') list.sort((a, b) => b.price - a.price);
    return list;
  }

  const heart = id => S.favs.includes(id);
  function renderGrid() {
    if (!S.loaded) { $('#grid').innerHTML = ''; $('#empty').hidden = false; $('#empty').textContent = t('loading'); return; }
    const list = filtered();
    $('#count').textContent = plural(list.length);
    $('#empty').hidden = !!list.length; $('#empty').textContent = t('noResults');
    $('#grid').innerHTML = list.map(p => {
      const action = !p.stock ? `<span class="sold">${t('sold')}</span>`
        : canBuy(p) ? `<button class="btn btn-small" data-add="${p.id}">${t('add')}</button>`
          : `<a class="btn btn-small btn-line" href="#contact">${t('requestBtn')}</a>`;
      return `<article class="product${p.stock ? '' : ' out'}">
        <div class="ph"><img src="${esc(p.img)}" alt="${esc(name(p))}" loading="lazy" data-open="${p.id}">
          <button class="fav${heart(p.id) ? ' on' : ''}" data-fav="${p.id}" aria-pressed="${heart(p.id)}" aria-label="${t('saveFav')}">${heart(p.id) ? '♥' : '♡'}</button></div>
        <h3><button class="plain" data-open="${p.id}">${esc(name(p))}</button></h3>
        <p class="d">${esc(p.desc?.[S.lang] || '')}</p>
        <div class="pb"><b>${p.price ? $m(p.price) : t('onRequest')}</b>${action}</div></article>`;
    }).join('');
  }

  /* ───────── кошик та обране ───────── */
  const cartRows = () => S.cart.map(c => ({ ...c, p: byId(c.id) })).filter(r => r.p);
  const cartSum = () => cartRows().reduce((s, r) => s + r.p.price * r.qty, 0);

  function renderCart() {
    const rows = cartRows(), sum = cartSum();
    const n = rows.reduce((a, r) => a + r.qty, 0); $('#cartCount').textContent = n; $('#cartCount').hidden = !n;
    $('#cartTotal').textContent = $m(sum);
    $('#cartItems').innerHTML = rows.length ? rows.map(({ p, qty }) => `
      <div class="line"><img src="${esc(p.img)}" alt=""><div><h4>${esc(name(p))}</h4><p>${$m(p.price)}</p>
        <div class="qty"><button data-qty="${p.id}" data-d="-1" aria-label="−">−</button><span>${qty}</span><button data-qty="${p.id}" data-d="1" aria-label="+">+</button></div></div>
        <button class="x sm" data-rm="${p.id}" aria-label="×">×</button></div>`).join('')
      : `<p class="muted pad">${t('emptyCart')}</p>`;
    $('#shipMsg').textContent = !rows.length ? '' : sum >= FREE_SHIPPING ? t('freeShip') : t('toFree') + $m(FREE_SHIPPING - sum);
    $('#checkoutBtn').disabled = !rows.length;
  }
  function renderFavs() {
    const list = S.products.filter(p => heart(p.id));
    $('#favCount').textContent = list.length; $('#favCount').hidden = !list.length;
    $('#favItems').innerHTML = list.length ? list.map(p => `
      <div class="line"><img src="${esc(p.img)}" alt="" data-open="${p.id}"><div><h4>${esc(name(p))}</h4><p>${p.price ? $m(p.price) : t('onRequest')}</p>
        ${canBuy(p) ? `<button class="btn btn-small" data-add="${p.id}">${t('add')}</button>` : ''}</div>
        <button class="x sm" data-fav="${p.id}" aria-label="×">×</button></div>`).join('')
      : `<p class="muted pad">${t('emptyFav')}</p>`;
  }

  function addToCart(id) {
    const p = byId(id); if (!p || !canBuy(p)) return;
    const item = S.cart.find(c => c.id === id);
    item ? item.qty = Math.min(99, item.qty + 1) : S.cart.push({ id, qty: 1 });
    saveLocal(); renderCart(); toast(t('added'));
  }
  function toggleFav(id) {
    S.favs = heart(id) ? S.favs.filter(x => x !== id) : [...S.favs, id];
    saveLocal(); renderGrid(); renderFavs();
    if ($('#productModal').classList.contains('open')) openProduct(id, true);
  }

  /* ───────── картка товару ───────── */
  function openProduct(id, keep) {
    const p = byId(id); if (!p) return;
    const g = p.gallery?.length ? p.gallery : [p.img], det = p.details?.[S.lang] || '';
    const cta = !p.stock ? `<span class="sold">${t('sold')}</span>`
      : canBuy(p) ? `<button class="btn btn-wine" data-add="${p.id}">${t('add')}</button>`
        : `<a class="btn btn-wine" href="#contact" data-close>${t('requestBtn')}</a>`;
    $('#productBody').innerHTML = `<div class="pm">
      <div class="pm-gal"><img id="pmMain" src="${esc(g[0])}" alt="${esc(name(p))}">
        ${g.length > 1 ? `<div class="thumbs">${g.map((s, i) => `<button class="${i ? '' : 'on'}" data-thumb="${esc(s)}"><img src="${esc(s)}" alt=""></button>`).join('')}</div>` : ''}</div>
      <div class="pm-info"><h2>${esc(name(p))}</h2><p class="price">${p.price ? $m(p.price) : t('onRequest')}</p>
        <p class="d">${esc(p.desc?.[S.lang] || '')}</p>${det ? `<p class="det">${br(det)}</p>` : ''}
        <dl><dt>${t('category')}</dt><dd>${esc(CATEGORIES[p.category]?.[S.lang === 'uk' ? 0 : 1] || p.category)}</dd>
          <dt>${t('color')}</dt><dd>${esc(COLORS[p.color]?.[S.lang === 'uk' ? 0 : 1] || p.color)}</dd>
          <dt>${t('availability')}</dt><dd>${p.stock ? t('inStockV') : t('sold')}</dd></dl>
        <div class="pm-act">${cta}<button class="btn btn-line" data-fav="${p.id}">${heart(p.id) ? '♥' : '♡'} ${t('wishlist')}</button></div>
        <p class="muted small">${t('shipNote')}</p></div></div>`;
    if (!keep) openPanel('productModal');
  }

  /* ───────── події ───────── */
  document.addEventListener('click', e => {
    const c = sel => e.target.closest(sel);
    let el;
    if ((el = c('[data-add]'))) addToCart(+el.dataset.add);
    else if ((el = c('[data-fav]'))) toggleFav(+el.dataset.fav);
    else if ((el = c('[data-open]'))) openProduct(+el.dataset.open);
    else if ((el = c('[data-thumb]'))) { $('#pmMain').src = el.dataset.thumb; $$('.thumbs button').forEach(b => b.classList.toggle('on', b === el)); }
    else if ((el = c('[data-qty]'))) {
      const it = S.cart.find(x => x.id === +el.dataset.qty); it.qty += +el.dataset.d;
      if (it.qty <= 0) S.cart = S.cart.filter(x => x !== it); saveLocal(); renderCart();
    } else if ((el = c('[data-rm]'))) { S.cart = S.cart.filter(x => x.id !== +el.dataset.rm); saveLocal(); renderCart(); }
    else if ((el = c('[data-cat]'))) { S.cat = el.dataset.cat; renderFilters(); renderGrid(); }
    else if ((el = c('[data-color]'))) { S.color = el.dataset.color; renderFilters(); renderGrid(); }
    else if (c('[data-close]') || e.target.id === 'scrim' || e.target.classList.contains('modal')) closeAll();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

  $('#cartBtn').onclick = () => { renderCart(); openPanel('cartDrawer'); };
  $('#favBtn').onclick = () => { renderFavs(); openPanel('favDrawer'); };
  $('#checkoutBtn').onclick = () => window.Checkout.open();
  $('#burger').onclick = () => { const o = $('#nav').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); };
  $$('#nav a').forEach(a => a.addEventListener('click', () => $('#nav').classList.remove('open')));
  $('#searchBtn').onclick = () => { $('#shop').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => $('#search').focus({ preventScroll: true }), 450); };
  $('#search').oninput = e => { S.q = e.target.value.trim(); renderGrid(); };
  $('#sort').onchange = e => { S.sort = e.target.value; renderGrid(); };
  $('#stockOnly').onchange = e => { S.stockOnly = e.target.checked; renderGrid(); };
  $('#resetFilters').onclick = () => {
    Object.assign(S, { cat: 'all', color: 'all', q: '', sort: 'featured', stockOnly: false });
    $('#search').value = ''; $('#sort').value = 'featured'; $('#stockOnly').checked = false; renderFilters(); renderGrid();
  };
  $$('.lang button').forEach(b => b.onclick = () => {
    S.lang = b.dataset.lang; U.store.set('annLang', S.lang);
    renderStatic(); renderFilters(); renderGrid(); renderCart(); renderFavs(); window.Account?.refresh();
  });

  $('#contactForm').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, btn = $('button', f), note = $('#contactNote'); btn.disabled = true;
    try {
      await Api.sendRequest({ name: f.elements.name.value.trim(), email: f.elements.email.value.trim(), message: f.elements.message.value.trim() });
      note.textContent = t('sent'); note.className = 'note ok'; f.reset();
    } catch { note.textContent = t('sendFail'); note.className = 'note err'; }
    btn.disabled = false;
  };

  /* ───────── запуск ───────── */
  async function boot() {
    $('#year').textContent = new Date().getFullYear();
    renderStatic(); renderFilters(); renderGrid(); renderCart(); renderFavs();
    await Api.init();
    const [prods, site] = await Promise.all([Api.getProducts().catch(() => null), Api.getSettings().catch(() => ({}))]);
    S.products = prods || structuredClone(DEFAULT_PRODUCTS);
    S.site = mergeSite(site || {}); S.loaded = true;
    S.cart = S.cart.filter(c => byId(c.id)); S.favs = S.favs.filter(byId);
    renderStatic(); renderFilters(); renderGrid(); renderCart(); renderFavs();
    window.Account?.refresh();
  }

  window.Shop = { S, t, L, $m, toast, closeAll, openPanel, cartRows, cartSum, renderCart, clearCart() { S.cart = []; saveLocal(); renderCart(); }, byId, name };
  boot();
})();

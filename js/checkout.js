/* Оформлення замовлення (повноекранна сторінка поверх сайту) */
(() => {
  const { $, esc, money } = U;
  const REGIONS = ['Вінницька', 'Волинська', 'Дніпропетровська', 'Донецька', 'Житомирська', 'Закарпатська', 'Запорізька', 'Івано-Франківська', 'Київська', 'м. Київ', 'Кіровоградська', 'Луганська', 'Львівська', 'Миколаївська', 'Одеська', 'Полтавська', 'Рівненська', 'Сумська', 'Тернопільська', 'Харківська', 'Херсонська', 'Хмельницька', 'Черкаська', 'Чернівецька', 'Чернігівська'];
  const DELIVERY = [['np', 'Нова Пошта (відділення)', 'Nova Poshta (branch)'], ['npc', 'Нова Пошта (кур’єр)', 'Nova Poshta (courier)'], ['up', 'Укрпошта', 'Ukrposhta'], ['pick', 'Самовивіз', 'Pickup']];
  const PAYMENT = [
    ['cod', 'Оплата при отриманні', 'Cash on delivery', 'Оплачуєте під час отримання замовлення.', 'You pay when you receive the order.'],
    ['bank', 'Переказ на рахунок', 'Bank transfer', 'Реквізити надішлемо після підтвердження.', 'We will send the details after confirmation.'],
    ['online', 'Онлайн-оплата', 'Online payment', 'Посилання на оплату надішлемо після підтвердження.', 'We will send a payment link after confirmation.']
  ];
  const pick = (row, i) => row[Shop.S.lang === 'uk' ? i : i + 1];

  function open() {
    const { L, $m, cartRows, cartSum } = Shop, rows = cartRows(), sum = cartSum();
    if (!rows.length) return;
    Shop.closeAll();
    const field = (n, label, req, type = 'text', cls = '') =>
      `<label class="${cls}"><span>${label}${req ? ' <i>*</i>' : ''}</span><input name="${n}" type="${type}" ${req ? 'required' : ''}></label>`;
    const u = Api.user;
    $('#checkoutPage').innerHTML = `<div class="co-wrap">
      <button type="button" class="back" data-cohide>← ${L('Назад до магазину', 'Back to shop')}</button>
      <form id="coForm" class="co-grid">
        <div>
          <h2>${L('Доставка', 'Delivery')}</h2>
          <div class="fields">
            ${field('first', L('Ім’я', 'First name'), 1)}${field('last', L('Прізвище', 'Last name'), 1)}
            ${field('phone', L('Телефон', 'Phone'), 1, 'tel', 'w')}${field('city', L('Місто / селище', 'City / town'), 1, 'text', 'w')}
            <label class="w"><span>${L('Область', 'Region')} <i>*</i></span><select name="region" required><option value="">${L('Оберіть область', 'Choose a region')}</option>${REGIONS.map(r => `<option>${r}</option>`).join('')}</select></label>
            <label class="w" id="coBranch"><span>${L('Номер відділення або поштомату', 'Branch or locker number')}</span><input name="branch"></label>
            <label class="w" id="coAddr" hidden><span>${L('Адреса кур’єрської доставки', 'Courier address')}</span><input name="address" placeholder="${L('Вулиця, будинок, квартира', 'Street, building, apartment')}"></label>
          </div>
          <h2>${L('Коментар', 'Notes')}</h2>
          <label class="w"><textarea name="comment" rows="3" maxlength="1000" placeholder="${L('Побажання щодо вишивки чи доставки', 'Embroidery or delivery requests')}"></textarea></label>
        </div>
        <div class="summary">
          <h2>${L('Ваше замовлення', 'Your order')}</h2>
          ${rows.map(r => `<div class="srow"><span>${esc(Shop.name(r.p))} × ${r.qty}</span><b>${$m(r.p.price * r.qty)}</b></div>`).join('')}
          <div class="srow total"><span>${L('Разом', 'Total')}</span><b>${$m(sum)}</b></div>
          <p class="muted small">${sum >= FREE_SHIPPING ? L('Доставка безкоштовна', 'Free shipping') : L('Доставка — за тарифами перевізника', 'Shipping at the carrier’s rates')}</p>
          <fieldset><legend>${L('Спосіб доставки', 'Shipping')}</legend>${DELIVERY.map((d, i) => `<label><input type="radio" name="dm" value="${d[0]}" ${i ? '' : 'checked'}> ${pick(d, 1)}</label>`).join('')}</fieldset>
          <fieldset><legend>${L('Оплата', 'Payment')}</legend>${PAYMENT.map((d, i) => `<label><input type="radio" name="pay" value="${d[0]}" ${i ? '' : 'checked'}> ${pick(d, 1)}</label>`).join('')}<p class="muted small" id="payHint">${pick(PAYMENT[0], 3)}</p></fieldset>
          <label class="agree"><input type="checkbox" required> ${L('Погоджуюсь на обробку даних для виконання замовлення', 'I agree to my data being processed to fulfil the order')}</label>
          <p class="note err" id="coError" role="alert"></p>
          <button class="btn btn-wine full" id="coSubmit">${L('Підтвердити замовлення', 'Place order')}</button>
          <p class="muted small">${u ? esc(u.email) : L('Для оформлення потрібно увійти в кабінет.', 'You need to sign in to place the order.')}</p>
        </div></form></div>`;
    $('#checkoutPage').hidden = false; document.body.classList.add('lock'); $('#checkoutPage').scrollTop = 0;
  }

  document.addEventListener('click', e => { if (e.target.closest('[data-cohide]')) Shop.closeAll(); });
  document.addEventListener('change', e => {
    if (e.target.name === 'dm') { const v = e.target.value; $('#coBranch').hidden = !(v === 'np' || v === 'up'); $('#coAddr').hidden = v !== 'npc'; }
    if (e.target.name === 'pay') $('#payHint').textContent = pick(PAYMENT.find(p => p[0] === e.target.value), 3);
  });

  document.addEventListener('submit', async e => {
    if (e.target.id !== 'coForm') return;
    e.preventDefault();
    const { L } = Shop, fd = new FormData(e.target), err = $('#coError'), btn = $('#coSubmit');
    err.textContent = '';
    if (!Api.enabled) { err.textContent = L('База даних не підключена — замовлення зараз неможливе.', 'The database is not connected — ordering is unavailable.'); return; }
    if (!Api.user) { Shop.closeAll(); window.Account.open(L('Увійдіть або створіть акаунт, щоб оформити замовлення.', 'Sign in or create an account to place your order.')); return; }
    const d = DELIVERY.find(x => x[0] === fd.get('dm')), p = PAYMENT.find(x => x[0] === fd.get('pay'));
    const number = 'A' + Date.now().toString().slice(-7);
    btn.disabled = true;
    try {
      await Api.createOrder({
        number, customer: `${fd.get('first')} ${fd.get('last')}`.trim(), email: Api.user.email, phone: fd.get('phone'),
        city: fd.get('city'), region: fd.get('region'), branch: fd.get('branch') || '', address: fd.get('address') || '',
        delivery: d[1], payment: p[1], comment: fd.get('comment') || '',
        items: Shop.cartRows().map(r => ({ id: r.p.id, qty: r.qty }))
      });
    } catch (ex) { err.textContent = (ex.message || String(ex)); btn.disabled = false; return; }
    Shop.clearCart();
    $('#checkoutPage').innerHTML = `<div class="co-wrap done"><h2>${L('Дякуємо за замовлення!', 'Thank you for your order!')}</h2>
      <p>${L('Номер замовлення', 'Order number')}: <b>${number}</b></p><p>${L('Ми зв’яжемося з вами для підтвердження.', 'We will contact you to confirm.')}</p>
      <button class="btn btn-wine" data-cohide>${L('Повернутися до магазину', 'Back to shop')}</button></div>`;
  });

  window.Checkout = { open };
})();

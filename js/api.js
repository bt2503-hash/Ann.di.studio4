/* Єдиний шар роботи з Supabase. Решта коду не звертається до бази напряму.
   Якщо Supabase не налаштований — сайт працює на стандартних даних (тільки читання). */
(function () {
  const url = window.ANN_SUPABASE_URL, key = window.ANN_SUPABASE_ANON_KEY;
  const configured = url && key && !url.includes('PASTE_') && !key.includes('PASTE_');
  const db = configured && window.supabase ? window.supabase.createClient(url, key) : null;
  let user = null;
  const listeners = [];

  const must = () => { if (!db) throw new Error('База даних не підключена (див. supabase-config.js).'); return db; };
  const ok = ({ data, error }) => { if (error) throw error; return data; };

  async function init() {
    if (!db) return;
    user = (await db.auth.getSession()).data.session?.user || null;
    db.auth.onAuthStateChange((_e, s) => { user = s?.user || null; listeners.forEach(f => f(user)); });
  }

  window.Api = {
    enabled: !!db,
    get user() { return user; },
    get isAdmin() { return user?.app_metadata?.role === 'admin'; },
    init,
    onAuth: f => listeners.push(f),

    /* ── акаунти ── */
    signIn: async (email, password) => ok(await must().auth.signInWithPassword({ email, password })).user,
    signUp: async (email, password, name) =>
      ok(await must().auth.signUp({ email, password, options: { data: { full_name: name || '' } } })),
    signOut: async () => { if (db) await db.auth.signOut(); },

    /* ── товари ── */
    async getProducts() {
      if (!db) return null;
      const rows = ok(await db.from('products').select('id,data').order('position').order('id'));
      return rows.length ? rows.map(r => ({ ...r.data, id: r.id })) : null;
    },
    async saveProduct(p, position) {
      const { id, ...data } = p;
      ok(await must().from('products').upsert({ id, data, ...(position != null ? { position } : {}) }));
    },
    async deleteProduct(id) { ok(await must().from('products').delete().eq('id', id)); },
    async seedProducts(list) {
      ok(await must().from('products').upsert(list.map(({ id, ...data }, i) => ({ id, data, position: i }))));
    },

    /* ── налаштування сайту ── */
    async getSettings() {
      if (!db) return {};
      const { data } = await db.from('site_settings').select('value').eq('key', 'site').maybeSingle();
      return data?.value || {};
    },
    async saveSettings(value) { ok(await must().from('site_settings').upsert({ key: 'site', value })); },

    /* ── фото ── */
    async uploadImage(blob, folder = 'img') {
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      ok(await must().storage.from('media').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' }));
      return must().storage.from('media').getPublicUrl(path).data.publicUrl;
    },

    /* ── замовлення ── */
    async createOrder(o) {
      if (!user) throw new Error('Спочатку увійдіть в особистий кабінет.');
      return ok(await must().from('orders').insert({
        user_id: user.id, order_number: o.number, customer: o.customer, email: o.email, phone: o.phone,
        city: o.city, region: o.region, branch: o.branch, address: o.address,
        delivery: o.delivery, payment: o.payment, comment: o.comment,
        items: o.items.map(i => ({ id: i.id, qty: i.qty }))
      }).select().single());
    },
    myOrders: async () => ok(await must().from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false })),
    adminOrders: async () => ok(await must().from('orders').select('*').order('created_at', { ascending: false })),
    setOrderStatus: async (id, status) => ok(await must().from('orders').update({ status }).eq('id', id)),
    deleteOrder: async id => ok(await must().from('orders').delete().eq('id', id)),

    /* ── запити з контактної форми ── */
    sendRequest: async r => ok(await must().from('requests').insert(r)),
    adminRequests: async () => ok(await must().from('requests').select('*').order('created_at', { ascending: false })),
    deleteRequest: async id => ok(await must().from('requests').delete().eq('id', id))
  };
})();

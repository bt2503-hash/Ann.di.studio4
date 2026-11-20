/* Спільні дрібниці: екранування, гроші, переклад, стиснення фото */
window.U = {
  $: (s, r = document) => r.querySelector(s),
  $$: (s, r = document) => [...r.querySelectorAll(s)],
  esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  br: s => U.esc(s).replace(/\n/g, '<br>'),
  money: (n, lang = 'uk') => new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'en-US').format(n) + (lang === 'uk' ? ' грн' : ' UAH'),
  /* Стискає фото до max px і повертає Blob (jpeg) */
  shrink(file, max = 1400, quality = .82) {
    return new Promise((resolve, reject) => {
      const img = new Image(), src = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(src);
        c.toBlob(b => b ? resolve(b) : reject(new Error('encode')), 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('read'));
      img.src = src;
    });
  },
  store: {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
  }
};

/* =========================================================
   helpers.js — دوال مساعدة (H): عملة، تواريخ، تفققيط، تقديرات، تنزيل…
   ========================================================= */
'use strict';

(function () {
  const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const H = {
    /* ---------- نصوص ---------- */
    esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    initials(name) { return String(name || '؟').trim().charAt(0); },

    /* ---------- أرقام ومال ---------- */
    num(n, d = 0) {
      const v = parseFloat(n) || 0;
      return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: 2 });
    },
    money(n) { return H.num(n) + ' ' + ((window.Store && Store.ready) ? Store.getSetting('currency', 'ريال') : 'ريال'); },
    moneyPlain(n) { return H.num(n); },
    pct(part, total) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; },
    sum(arr, f) { return (arr || []).reduce((a, x) => a + (parseFloat(f ? f(x) : x) || 0), 0); },
    round2(n) { return Math.round((parseFloat(n) || 0) * 100) / 100; },

    /* ---------- التواريخ ---------- */
    today() { return new Date().toISOString().slice(0, 10); },
    now() { return new Date().toISOString(); },
    monthKey(d) { return String(d || H.today()).slice(0, 7); },
    fmtDate(d) {
      if (!d) return '—';
      const dt = new Date(d);
      if (isNaN(dt)) return String(d);
      return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    },
    fmtDateTime(d) {
      if (!d) return '—';
      const dt = new Date(d);
      if (isNaN(dt)) return String(d);
      let h = dt.getHours(), m = String(dt.getMinutes()).padStart(2, '0');
      const am = h < 12 ? 'ص' : 'م';
      h = h % 12 || 12;
      return `${H.fmtDate(d)} ${h}:${m} ${am}`;
    },
    arDate(d) {
      const dt = new Date(d || Date.now());
      if (isNaN(dt)) return '';
      return `${AR_DAYS[dt.getDay()]} ${dt.getDate()} ${AR_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
    },
    arMonth(key) { const m = parseInt(String(key).slice(5, 7), 10) - 1; return AR_MONTHS[m] || key; },
    timeAgo(iso) {
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'الآن';
      if (m < 60) return `قبل ${m} دقيقة`;
      const h = Math.floor(m / 60);
      if (h < 24) return `قبل ${h} ساعة`;
      const d = Math.floor(h / 24);
      if (d < 30) return `قبل ${d} يوم`;
      return H.fmtDate(iso);
    },

    /* ---------- التفقيط (تحويل الرقم إلى كلمات عربية) ---------- */
    _ones: ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
      'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'],
    _tens: ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'],
    _hundreds: ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'],

    _below1000(n) {
      if (n === 0) return '';
      if (n < 20) return H._ones[n];
      if (n < 100) {
        const t = Math.floor(n / 10), o = n % 10;
        return o ? `${H._ones[o]} و${H._tens[t]}` : H._tens[t];
      }
      const h = Math.floor(n / 100), r = n % 100;
      return r ? `${H._hundreds[h]} و${H._below1000(r)}` : H._hundreds[h];
    },

    tafqit(n) {
      n = Math.floor(Math.abs(parseFloat(n) || 0));
      if (n === 0) return 'صفر';
      const parts = [];
      const millions = Math.floor(n / 1e6); n %= 1e6;
      const thousands = Math.floor(n / 1e3); n %= 1e3;
      if (millions) {
        if (millions === 1) parts.push('مليون');
        else if (millions === 2) parts.push('مليونان');
        else if (millions <= 10) parts.push(`${H._below1000(millions)} ملايين`);
        else parts.push(`${H._below1000(millions)} مليوناً`);
      }
      if (thousands) {
        if (thousands === 1) parts.push('ألف');
        else if (thousands === 2) parts.push('ألفان');
        else if (thousands <= 10) parts.push(`${H._below1000(thousands)} آلاف`);
        else parts.push(`${H._below1000(thousands)} ألف`);
      }
      if (n) parts.push(H._below1000(n));
      return parts.filter(Boolean).join(' و');
    },

    tafqitMoney(n) {
      const cur = (window.Store && Store.ready) ? Store.getSetting('currency', 'ريال') : 'ريال';
      const whole = Math.floor(Math.abs(parseFloat(n) || 0));
      const cents = Math.round((Math.abs(parseFloat(n) || 0) - whole) * 100);
      let s = `فقط ${H.tafqit(whole)} ${cur}`;
      if (cents > 0) s += ` و${H.tafqit(cents)} فلساً`;
      return s + ' لا غير';
    },

    /* ---------- التقدير ---------- */
    gradeInfo(pct) {
      const list = (window.Store && Store.ready) ? Store.getSetting('estimates', Config.DEFAULT_SETTINGS.estimates) : Config.DEFAULT_SETTINGS.estimates;
      const p = parseFloat(pct) || 0;
      for (const e of list) if (p >= e.min) return { label: e.label, cls: e.cls, pct: p };
      return { label: '—', cls: 'badge-muted', pct: p };
    },
    passed(pct) { const pm = (window.Store && Store.ready) ? Store.getSetting('passMark', 50) : 50; return (parseFloat(pct) || 0) >= pm; },

    /* ---------- جداول ---------- */
    sortBy(arr, key, asc = true) {
      return [...(arr || [])].sort((a, b) => {
        const x = a[key], y = b[key];
        if (typeof x === 'number' && typeof y === 'number') return asc ? x - y : y - x;
        return asc ? String(x || '').localeCompare(String(y || ''), 'ar') : String(y || '').localeCompare(String(x || ''), 'ar');
      });
    },
    groupBy(arr, key) {
      const m = {};
      for (const it of arr || []) { const k = typeof key === 'function' ? key(it) : it[key]; (m[k] = m[k] || []).push(it); }
      return m;
    },
    unique(arr) { return [...new Set(arr)]; },

    /* ---------- ملفات ---------- */
    download(filename, content, mime = 'text/plain;charset=utf-8') {
      const isObj = typeof content === 'object';
      const blob = new Blob([isObj ? JSON.stringify(content, null, 1) : content], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    },

    /* ---------- QR ---------- */
    qrcode(text, cell = 3) {
      try {
        if (window.QRCodeGen) return QRCodeGen.toDataURL(String(text), { cell });
      } catch (e) { console.warn('QR', e); }
      return '';
    },

    /* ---------- معرفات ---------- */
    uid(prefix) {
      return (window.Store && Store.uid)
        ? Store.uid(prefix)
        : (prefix ? prefix + '-' : '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    debounce(fn, ms = 300) {
      let t;
      return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
    },

    /** رقم الطالب/الموظف التسلسلي بصيغة عرض */
    pad(n, len = 3) { return String(n).padStart(len, '0'); }
  };

  window.H = H;
  window.Helpers = H;
})();

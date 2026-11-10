/* =========================================================
   database.js — قاعدة البيانات المحلية المشفرة (Store)
   - ذاكرة تزامنية للقراءة السريعة + تشفير AES غير تزامني عند الحفظ
   - كتابة مؤجلة (debounced) لتفادي اهتزاز localStorage
   - بذر بيانات الهيكل الأساسي عند أول تشغيل
   ========================================================= */
'use strict';

(function () {
  const P = Config.PREFIX;
  const DIRTY_DELAY = 350;

  const Store = {
    ready: false,
    mem: {},             // { col: [records] } + settings ككائن
    _dirty: new Set(),
    _timer: null,

    /* ================= التهيئة ================= */
    async init() {
      await CryptoEngine.init();
      for (const col of Config.COLS) {
        const raw = localStorage.getItem(P + col);
        if (raw == null) { this.mem[col] = (col === 'settings') ? {} : []; continue; }
        let data = null;
        try { data = await CryptoEngine.decrypt(raw); } catch (e) { data = null; }
        if (data == null) {
          /* توافق مع تخزين قديم غير مشفر */
          try { data = JSON.parse(raw); } catch (e) { data = null; }
        }
        this.mem[col] = (col === 'settings') ? (data || {}) : (Array.isArray(data) ? data : []);
      }
      this._seed();
      this.ready = true;
    },

    /* ================= البذر الأول =================
       تطبيق فاضي بلا بيانات — لا مراحل ولا مواد ولا مخزون مدمجة.
       يُبذر فقط: الإعدادات الافتراضية + مستخدم المدير + قوالب البطاقات.
       تُستعاد البيانات القديمة من النسخة الاحتياطية. */
    _seed() {
      const st = this.mem.settings;
      let changed = false;
      const ensure = (k, def) => { if (st[k] === undefined) { st[k] = def; changed = true; } };
      for (const [k, v] of Object.entries(Config.DEFAULT_SETTINGS)) {
        if (k === 'weights' || k === 'estimates') {
          ensure(k, JSON.parse(JSON.stringify(v)));
        } else ensure(k, v);
      }
      /* مستخدم افتراضي */
      if (!this.mem.users.length) {
        this.mem.users.push({ id: 'u-admin', username: 'admin', name: 'مدير النظام', role: 'admin', salt: '', hash: '', _pendingPw: 'admin123' });
        changed = true;
      }
      /* قالب بطاقة لكل نوع */
      if (!this.mem.idTemplates.length) {
        this.mem.idTemplates = JSON.parse(JSON.stringify(Config.CARD_TYPES));
        changed = true;
      }
      if (changed) this._dirty.add('settings'), ['users', 'idTemplates'].forEach((c) => this._dirty.add(c));
      /* تهيئة كلمة مرور المستخدم المؤجلة */
      this.mem.users.forEach((u) => {
        if (u._pendingPw) {
          const pw = u._pendingPw; delete u._pendingPw;
          u.salt = CryptoEngine.salt();
          u.hash = '';
          CryptoEngine.hashPassword(pw, u.salt).then((h) => { u.hash = h; this._dirty.add('users'); this.flush(); });
        }
      });
      this.flush();
    },

    /* ================= قراءة تزامنية ================= */
    col(name) { return this.mem[name] || (this.mem[name] = []); },
    settings() { return this.mem.settings || (this.mem.settings = {}); },

    get(name, id) { return this.col(name).find((r) => r.id === id) || null; },
    find(name, fn) { return this.col(name).find(fn) || null; },
    filter(name, fn) { return this.col(name).filter(fn); },
    where(name, kv) {
      return this.col(name).filter((r) => Object.entries(kv).every(([k, v]) => r[k] === v));
    },
    /* ترتيب (يفوَّض لـ H عند الاستدعاء — helpers يُحمَّل لاحقاً) */
    sortBy(arr, key, asc = true) { return H.sortBy(arr, key, asc); },
    unique(arr) { return H.unique(arr); },
    count(name, fn) { return fn ? this.col(name).filter(fn).length : this.col(name).length; },

    /* ================= كتابة ================= */
    put(name, obj) {
      if (!obj.id) obj.id = this.uid(name);
      obj.updated = new Date().toISOString();
      const arr = this.col(name);
      const i = arr.findIndex((r) => r.id === obj.id);
      if (i >= 0) { obj.created = arr[i].created || obj.updated; arr[i] = obj; }
      else { obj.created = obj.updated; arr.push(obj); }
      this._mark(name);
      return obj;
    },
    setCol(name, arr) {
      this.mem[name] = arr;
      this._mark(name);
    },
    del(name, id) {
      this.mem[name] = this.col(name).filter((r) => r.id !== id);
      this._mark(name);
    },

    /* ترقيم متسلسل */
    nextSeq(name) {
      const c = this.mem.counters || (this.mem.counters = {});
      c[name] = (c[name] || 0) + 1;
      this._mark('counters');
      return c[name];
    },
    seqOf(name) { return (this.mem.counters || {})[name] || 0; },

    /* إعدادات مفردة */
    getSetting(key, def) {
      const v = this.settings()[key];
      return v === undefined ? def : v;
    },
    setSetting(key, val) { this.settings()[key] = val; this._mark('settings'); },

    /* ================= مساعدات ================= */
    uid(prefix) {
      return (prefix ? prefix + '-' : '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    _mark(name) {
      this._dirty.add(name);
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.flush(), DIRTY_DELAY);
    },

    /* ================= حفظ مشفر ================= */
    async flush() {
      if (!this.ready) return;
      const cols = [...this._dirty];
      this._dirty.clear();
      for (const c of cols) {
        try {
          const data = this.mem[c];
          localStorage.setItem(P + c, await CryptoEngine.encrypt(data));
        } catch (e) {
          console.error('[Store] فشل حفظ', c, e);
          if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
            UI && UI.toast && UI.toast('مساحة التخزين ممتلئة — صدّر نسخة احتياطية واحذف الصور القديمة', 'error');
          }
        }
      }
    },

    /* ================= نسخ واستعادة ================= */
    export() {
      const out = { _app: Config.APP, _version: Config.VERSION, _exported: new Date().toISOString(), settings: {} };
      for (const c of Config.COLS) out[c] = this.mem[c];
      return JSON.parse(JSON.stringify(out));
    },
    import(data, { replace = true } = {}) {
      if (!data || typeof data !== 'object') throw new Error('بيانات غير صالحة');
      for (const c of Config.COLS) {
        if (data[c] === undefined) continue;
        if (replace || !this.mem[c] || (Array.isArray(this.mem[c]) && !this.mem[c].length) ||
            (c === 'settings' && Object.keys(this.mem[c]).length === 0)) {
          this.mem[c] = data[c];
          this._dirty.add(c);
        }
      }
      return this.flush();
    },

    /* إحصاءات الحجم */
    sizeInfo() {
      let total = 0;
      for (const c of Config.COLS) total += (localStorage.getItem(P + c) || '').length;
      return { usedKB: Math.round(total / 1024), quotaKB: 5120 };
    }
  };

  window.Store = Store;
  window.DB = Store;
})();

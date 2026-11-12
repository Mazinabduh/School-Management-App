/* =========================================================
   database.js — قاعدة البيانات المحلية المشفرة (Store) — نظام المحطة بالضبط
   DbStorage: خزنة IndexedDB مستقلة (edupro_school_vault)
   + مرآة localStorage للطوارئ + ترحيل لمرة واحدة من المفاتيح القديمة
   كتابة مؤجلة (debounced) + تشفير AES عبر CryptoEngine
   مستقلة تماماً عن أي تطبيق آخر (بادئة وقاعدة بيانات بأسماء خاصة بالمدرسة)
   ========================================================= */
'use strict';

(function () {
  const P = Config.PREFIX;
  const DIRTY_DELAY = 350;

  /* ==================== خزنة IndexedDB (نفس بنية المحطة) ==================== */
  const DbStorage = {
    _db: null,
    async open() {
      if (this._db) return this._db;
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('edupro_school_vault', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('store')) db.createObjectStore('store');
        };
        req.onsuccess = () => { this._db = req.result; resolve(this._db); };
        req.onerror = () => reject(req.error || new Error('IndexedDB database open error'));
      });
    },
    async get(key) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('store', 'readonly');
        const req = tx.objectStore('store').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    async set(key, value) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('store', 'readwrite');
        const req = tx.objectStore('store').put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    },
    async remove(key) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('store', 'readwrite');
        const req = tx.objectStore('store').delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    },
    async clear() {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('store', 'readwrite');
        const req = tx.objectStore('store').clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }
  };

  const VAULT_KEY = 'edupro_school_secure_v1';
  /* مفاتيح الترحيل من الإصدارات القديمة لهذا التطبيق فقط */
  const LEGACY_KEYS = ['EP_'];

  const Store = {
    ready: false,
    mem: {},             // { col: [records] } + settings ككائن
    _dirty: new Set(),
    _timer: null,
    _migrated: false,

    /* ==================== التهيئة ==================== */
    async init() {
      await CryptoEngine.init();

      /* 1) المحرّك الأساسي: الخزنة المشفرة في IndexedDB */
      let loaded = null;
      try {
        const raw = await DbStorage.get(VAULT_KEY);
        if (raw) {
          const obj = JSON.parse(raw);
          loaded = await CryptoEngine.decrypt(obj.enc);
          if (!loaded) { try { loaded = obj.plain ? JSON.parse(obj.plain) : null; } catch (e) {} }
        }
      } catch (e) { console.warn('[Store] IndexedDB read failed, falling back', e); }

      /* 2) مرآة localStorage (نفس البنية — للطوارئ والسروات الأقدم) */
      if (!loaded) {
        const mirror = localStorage.getItem(P + '_vault');
        if (mirror) {
          try {
            const obj = JSON.parse(mirror);
            loaded = await CryptoEngine.decrypt(obj.enc);
            if (!loaded && obj.plain) loaded = JSON.parse(obj.plain);
          } catch (e) {}
        }
      }

      /* 3) ترحيل لمرة واحدة من مفاتيح الإصدار القديم (EP_* المشفرة أو الخام) */
      if (!loaded) {
        try {
          const legacy = {};
          let found = 0;
          for (const col of Config.COLS) {
            const rawL = localStorage.getItem(P + col);
            if (rawL == null) continue;
            found++;
            let data = null;
            try { data = await CryptoEngine.decrypt(rawL); } catch (e) {}
            if (data == null) { try { data = JSON.parse(rawL); } catch (e) {} }
            legacy[col] = data;
          }
          if (found > 0) {
            loaded = legacy;
            this._migrated = true;
            console.info('[Store] migrated legacy storage →', VAULT_KEY);
          }
        } catch (e) { console.warn('[Store] legacy migration skipped', e); }
      }

      this.mem = {};
      for (const col of Config.COLS) {
        const v = loaded ? loaded[col] : undefined;
        this.mem[col] = (col === 'settings') ? (v && typeof v === 'object' ? v : {}) : (Array.isArray(v) ? v : []);
      }

      this._seed();
      this.ready = true;
      await this.flush();
    },

    /* ==================== البذر الأول ====================
       تطبيق فاضي بلا بيانات — لا مراحل ولا مواد ولا مخزون مدمجة.
       يُبذر فقط: الإعدادات الافتراضية + مستخدم المدير + قوالب البطاقات + ثيم المحطة الافتراضي. */
    _seed() {
      const st = this.mem.settings;
      let changed = false;
      const ensure = (k, def) => { if (st[k] === undefined) { st[k] = def; changed = true; } };
      for (const [k, v] of Object.entries(Config.DEFAULT_SETTINGS)) {
        if (k === 'weights' || k === 'estimates' || k === 'theme') {
          ensure(k, JSON.parse(JSON.stringify(v)));
        } else ensure(k, v);
      }
      if (!st.theme) { st.theme = JSON.parse(JSON.stringify(Config.THEME_DEFAULTS_STATION)); changed = true; }
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
      if (changed) {
        this._dirty.add('settings');
        ['users', 'idTemplates'].forEach((c) => this._dirty.add(c));
      }
      /* تهيئة كلمة مرور المستخدم المؤجلة */
      this.mem.users.forEach((u) => {
        if (u._pendingPw) {
          const pw = u._pendingPw; delete u._pendingPw;
          u.salt = CryptoEngine.salt();
          u.hash = '';
          CryptoEngine.hashPassword(pw, u.salt).then((h) => { u.hash = h; this._dirty.add('users'); this.flush(); });
        }
      });
    },

    /* ==================== قراءة تزامنية ==================== */
    col(name) { return this.mem[name] || (this.mem[name] = []); },
    settings() { return this.mem.settings || (this.mem.settings = {}); },

    get(name, id) { return this.col(name).find((r) => r.id === id) || null; },
    find(name, fn) { return this.col(name).find(fn) || null; },
    filter(name, fn) { return this.col(name).filter(fn); },
    where(name, kv) {
      return this.col(name).filter((r) => Object.entries(kv).every(([k, v]) => r[k] === v));
    },
    sortBy(arr, key, asc = true) { return H.sortBy(arr, key, asc); },
    unique(arr) { return H.unique(arr); },
    count(name, fn) { return fn ? this.col(name).filter(fn).length : this.col(name).length; },

    /* ==================== كتابة ==================== */
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

    nextSeq(name) {
      const c = this.mem.counters || (this.mem.counters = {});
      c[name] = (c[name] || 0) + 1;
      this._mark('counters');
      return c[name];
    },
    seqOf(name) { return (this.mem.counters || {})[name] || 0; },

    getSetting(key, def) {
      const v = this.settings()[key];
      return v === undefined ? def : v;
    },
    setSetting(key, val) { this.settings()[key] = val; this._mark('settings'); },

    /* ==================== مساعدات ==================== */
    uid(prefix) {
      return (prefix ? prefix + '-' : '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    _mark(name) {
      this._dirty.add(name);
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.flush(), DIRTY_DELAY);
    },

    /* ==================== الحفظ المشفر (خزنة IndexedDB + مرآة) ==================== */
    async flush() {
      if (!this.ready) return;
      try {
        /* نسخة كاملة واحدة مشفرة في الخزنة (نفس نمط المحطة: كائن واحد) */
        const enc = await CryptoEngine.encrypt(this.mem);
        const payload = JSON.stringify({ v: 1, enc, ts: new Date().toISOString() });
        await DbStorage.set(VAULT_KEY, payload);
        /* مرآة localStorage للطوارئ (قد تفشل بسبب الحجم — لا مشكلة) */
        try { localStorage.setItem(P + '_vault', payload); } catch (e) { /* Quota — الخزنة تكفي */ }
        /* تنظيف مفاتيح الترحيل القديمة بعد نجاح الخزنة */
        if (this._migrated) {
          LEGACY_KEYS.forEach((pfx) => {
            for (const col of Config.COLS) localStorage.removeItem(pfx + col);
          });
          this._migrated = false;
        }
      } catch (e) {
        console.error('[Store] فشل الحفظ في الخزنة', e);
        /* احتياط: حفظ الأعمدة المتغيرة فقط في المرآة */
        for (const c of [...this._dirty]) {
          try { localStorage.setItem(P + c, await CryptoEngine.encrypt(this.mem[c])); } catch (e2) {}
        }
        if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
          UI && UI.toast && UI.toast('مساحة التخزين ممتلئة — صدّر نسخة احتياطية واحذف الصور القديمة', 'error');
        }
      } finally {
        this._dirty.clear();
      }
    },

    /* ==================== نسخ واستعادة ==================== */
    export() {
      const out = { _app: Config.APP, _version: Config.VERSION, _exported: new Date().toISOString(), settings: {} };
      for (const c of Config.COLS) out[c] = this.mem[c];
      return JSON.parse(JSON.stringify(out));
    },
    async import(data, { replace = true } = {}) {
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

    sizeInfo() {
      let total = 0;
      try { total = (localStorage.getItem(P + '_vault') || '').length; } catch (e) {}
      return { usedKB: Math.round(total / 1024), quotaKB: 5120 };
    }
  };

  window.Store = Store;
  window.DB = Store;
  window.EduproVault = DbStorage;
})();

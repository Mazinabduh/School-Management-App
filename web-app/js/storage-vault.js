/* =========================================================
   storage-vault.js — الحصن المحلي — نظام تطبيق المحطة v2026.100 بالنص
   (storage-manager-v2026.69 مُكيَّف لبيانات المدرسة)
   مرآة SQLite في الأندرويد + نسخ تلقائية خارجية في Download/Edupro/data/backups
   + استعادة الإقلاع من الحصن إذا فُقدت البيانات — بدون أي قائمة اختيار مجلد
   المتصفح: IndexedDB أساساً + navigator.storage.persist للحماية من الإخلاء
   ========================================================= */
"use strict";

(function () {
  if (window.StorageVault) return;
  const SQL_DB = "edupro_vault_v1";
  const LS_EVER = "edupro_ever_had_data";
  const LS_LAST_BAK = "edupro_autobak_last";
  const LS_MODE = "edupro_vault_mode_v35";
  const BAK_MIN_GAP = 10 * 60 * 1e3;
  const BAK_KEEP = 30;

  function nb() {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.isNativeApp === "function" && window.AndroidBridge.isNativeApp() === true) return window.AndroidBridge;
    } catch (_) {}
    return null;
  }
  function jp(s, d) {
    try {
      const v = JSON.parse(s);
      return v === null || v === undefined ? d : v;
    } catch (_) {
      return d;
    }
  }
  function toast(msg, kind) {
    try {
      if (window.UI && UI.toast) UI.toast(msg, kind === "err" ? "error" : kind === "warn" ? "warn" : "success");
    } catch (_) {}
  }
  function hasRealData(d) {
    try {
      return !!((d.students || []).length || (d.feeplans || []).length || (d.payments || []).length || (d.grades || []).length || (d.employees || []).length);
    } catch (_) {
      return false;
    }
  }
  /* دمج الإعدادات عند الاستعادة: توكن GitHub وإعدادات السحابة الحالية لا تُطمس أبداً */
  function mergeSettings(cur, rst) {
    const s = Object.assign({}, cur, rst);
    try {
      if (cur.ghToken && !(rst.ghToken || "").trim()) s.ghToken = cur.ghToken;
      if (cur.ghRepo && !(rst.ghRepo || "").trim()) s.ghRepo = cur.ghRepo;
      if (cur.ghBranch && !(rst.ghBranch || "").trim()) s.ghBranch = cur.ghBranch;
      if (cur.ghPath && !(rst.ghPath || "").trim()) s.ghPath = cur.ghPath;
    } catch (_) {}
    return s;
  }
  async function loadExternal(data, label) {
    try {
      if (!data || typeof data !== "object" || !hasRealData(data)) return false;
      const cur = Store.settings() || {};
      data.settings = mergeSettings(cur, data.settings || {});
      await Store.import(data, { replace: true });
      toast("تم استرجاع بياناتك من " + label + " ✓", "ok");
      try { if (window.Audit) Audit.log("نسخ", "استرجاع تلقائي للبيانات: " + label); } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }
  function backupPayload() {
    const raw = Store.export();
    return { raw: raw, now: new Date };
  }

  const Vault = {
    ver: "2026.100",
    engine: "IndexedDB",
    sqliteOk: false,
    persistOk: false,
    backupCount: 0,
    lastBackupAt: "",
    lastMirrorAt: "",
    bootBusy: false,
    _hooked: false,
    _sqlTimer: null,
    _bakTimer: null,

    mode() {
      try {
        const m = localStorage.getItem(LS_MODE);
        return m === "auto" ? "auto" : "manual";
      } catch (_) { return "manual"; }
    },
    setMode(m) {
      try { localStorage.setItem(LS_MODE, m === "auto" ? "auto" : "manual"); } catch (_) {}
      this.renderCard();
      return this.mode();
    },

    async init() {
      try {
        const b = nb();
        try {
          if (hasRealData(Store.export())) localStorage.setItem(LS_EVER, String(Date.now()));
        } catch (_) {}
        if (b && typeof b.sqlOpen === "function") {
          this.engine = "SQLite + IndexedDB (أندرويد)";
          const r = jp(b.sqlOpen(SQL_DB), null);
          if (r && r.ok) {
            this.sqliteOk = true;
            try {
              b.sqlExec(SQL_DB, "CREATE TABLE IF NOT EXISTS vault (key TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL, ts INTEGER NOT NULL)", "[]");
            } catch (_) {}
            this.bootBusy = true;
            try {
              await this.bootRestore(b);
            } finally {
              this.bootBusy = false;
            }
          }
        }
        if (!b && navigator.storage && navigator.storage.persist) {
          try { this.persistOk = await navigator.storage.persist(); } catch (_) {}
        }
        this.hookStore();
        this.refreshStatus();
        try { setInterval(() => this.refreshStatus(), 9e4); } catch (_) {}
        try { window.addEventListener("online", () => this.refreshStatus()); } catch (_) {}
      } finally {
        this._bootDone = true;
      }
    },

    /* استعادة الإقلاع: إذا فُقدت البيانات من IndexedDB تُقرأ من مرآة SQLite
       ثم من النسخ التلقائية الخارجية — نفس تسلسل المحطة بالنص */
    async bootRestore(b) {
      try {
        if (!Store || Store.ready !== true) return;
        if (hasRealData(Store.export())) return;
        const rows = jp(b.sqlQuery(SQL_DB, "SELECT key, json FROM vault", "[]"), null);
        if (rows && rows.ok && Array.isArray(rows.rows) && rows.rows.length) {
          const data = {};
          rows.rows.forEach((r) => {
            try { data[r.key] = JSON.parse(r.json); } catch (_) {}
          });
          if (await loadExternal(data, "الحصن المحلي SQLite")) return;
        }
        if (typeof b.listAutoBackups === "function") {
          const list = jp(b.listAutoBackups(), []) || [];
          for (const item of list) {
            try {
              const env = jp(b.readAutoBackup(item.name), null);
              if (env && env.format === "edupro-backup" && env.encrypted === false && env.data) {
                if (await loadExternal(env.data, "النسخة الاحتياطية الخارجية (" + item.name + ")")) return;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    },

    hookStore() {
      if (this._hooked || typeof Store === "undefined" || typeof Store.flush !== "function") return;
      this._hooked = true;
      const self = this;
      const orig = Store.flush.bind(Store);
      Store.flush = async function () {
        const r = await orig();
        try { self.onSaved(); } catch (_) {}
        return r;
      };
    },

    onSaved() {
      try {
        if (hasRealData(Store.export())) {
          try { localStorage.setItem(LS_EVER, String(Date.now())); } catch (_) {}
        }
      } catch (_) {}
      const b = nb();
      if (b && this.sqliteOk) {
        if (this._sqlTimer) clearTimeout(this._sqlTimer);
        this._sqlTimer = setTimeout(() => this.mirrorToSqlite(b), 8e3);
      }
      if (this.mode() === "auto") {
        if (this._bakTimer) clearTimeout(this._bakTimer);
        this._bakTimer = setTimeout(() => this.autoBackup(false), 3e4);
      }
    },

    async mirrorToSqlite(b) {
      try {
        const d = Store.export();
        const now = Date.now();
        const stmts = [];
        for (const k of Object.keys(d)) {
          if (k === "_app" || k === "_version" || k === "_exported") continue;
          const v = d[k];
          if (v === null || typeof v !== "object") continue;
          let json;
          try { json = JSON.stringify(v); } catch (_) { continue; }
          if (!json || json.length > 24e6) continue;
          stmts.push({
            sql: "INSERT OR REPLACE INTO vault (key, json, ts) VALUES (?, ?, ?)",
            params: [k, json, now]
          });
        }
        if (!stmts.length) return;
        const r = jp(b.sqlBatch(SQL_DB, JSON.stringify(stmts)), null);
        if (r && r.ok) {
          this.lastMirrorAt = (new Date).toLocaleString("ar-EG");
          this.renderCard();
        }
      } catch (_) {}
    },

    autoBackup(force) {
      const b = nb();
      if (!b || typeof b.saveAutoBackup !== "function") return false;
      try {
        const last = parseInt(localStorage.getItem(LS_LAST_BAK) || "0", 10) || 0;
        if (!force && Date.now() - last < BAK_MIN_GAP) return false;
        const p = backupPayload();
        const now = p.now;
        const f = (n) => String(n).padStart(2, "0");
        const name = "edupro_auto_" + now.getFullYear() + "-" + f(now.getMonth() + 1) + "-" + f(now.getDate()) + "_" + f(now.getHours()) + "-" + f(now.getMinutes()) + "-" + f(now.getSeconds()) + ".json";
        const payload = {
          format: "edupro-backup",
          version: 3,
          encrypted: false,
          type: "full",
          createdAt: now.toISOString(),
          createdDisplay: now.toLocaleString("ar-EG"),
          auto: !force,
          data: p.raw
        };
        const ok = b.saveAutoBackup(name, JSON.stringify(payload));
        if (ok) {
          localStorage.setItem(LS_LAST_BAK, String(Date.now()));
          this.lastBackupAt = payload.createdDisplay;
          this.pruneBackups(b);
          try { if (window.Audit) Audit.log("نسخ", (force ? "نسخة احتياطية يدوية: " : "نسخة تلقائية خارجية: ") + name); } catch (_) {}
        }
        return ok;
      } catch (_) {
        return false;
      }
    },

    backupNow() {
      const ok = this.autoBackup(true);
      toast(ok ? "تم إنشاء نسخة احتياطية الآن ✓" : "تعذر إنشاء النسخة (متاح في تطبيق أندرويد)", ok ? "ok" : "err");
      return ok;
    },

    pruneBackups(b) {
      try {
        if (typeof b.deleteAutoBackup !== "function") return;
        const list = jp(b.listAutoBackups(), []) || [];
        for (let i = BAK_KEEP; i < list.length; i++) {
          try { b.deleteAutoBackup(list[i].name); } catch (_) {}
        }
      } catch (_) {}
    },

    async restoreFromExternalBackup(name) {
      const b = nb();
      if (!b || typeof b.readAutoBackup !== "function") return false;
      try {
        const env = jp(b.readAutoBackup(name), null);
        if (env && env.format === "edupro-backup" && env.encrypted === false && env.data) {
          const ok = await loadExternal(env.data, "النسخة الاحتياطية " + name);
          if (ok && typeof Store !== "undefined" && Store.flush) Store.flush();
          return ok;
        }
      } catch (_) {}
      return false;
    },

    async refreshStatus() {
      try {
        const b = nb();
        if (b && typeof b.listAutoBackups === "function") {
          const list = jp(b.listAutoBackups(), []) || [];
          this.backupCount = list.length;
        }
        const last = parseInt(localStorage.getItem(LS_LAST_BAK) || "0", 10) || 0;
        if (last) this.lastBackupAt = new Date(last).toLocaleString("ar-EG");
        this.renderCard();
      } catch (_) {}
    },

    renderCard() {
      try {
        const isNative = !!nb();
        const el = document.getElementById("vaultEngineLine");
        if (el) el.textContent = "المحرك: " + this.engine + (this.sqliteOk ? " — SQLite ✓" : "") + (!isNative && this.persistOk ? " — حماية من الإخلاء ✓" : "");
        const el2 = document.getElementById("vaultBackupLine");
        if (el2) el2.textContent = (isNative ? "النسخ في Download/Edupro/data/backups: " + this.backupCount : "النسخ الاحتياطية: تصدير يدوي") + (this.lastBackupAt ? " — آخر نسخة: " + this.lastBackupAt : "");
        const el4 = document.getElementById("vaultMirrorLine");
        if (el4) el4.textContent = this.sqliteOk ? "مرآة SQLite: " + (this.lastMirrorAt || "جاهزة") : "مرآة SQLite: غير متاحة (المتصفح يستخدم IndexedDB أساساً)";
        const el6 = document.getElementById("vaultModeLine");
        if (el6) el6.textContent = this.mode() === "auto" ? "النسخ الخارجية: تلقائية (شغّلتها أنت)" : "النسخ الخارجية: يدوية — أنت من ينشئها";
      } catch (_) {}
    }
  };
  window.StorageVault = Vault;
})();

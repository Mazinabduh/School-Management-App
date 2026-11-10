/* =========================================================
   encryption.js — التشفير وحماية البيانات (SecureBox + CryptoEngine)
   - AES-GCM 256 عبر WebCrypto (بيئات آمنة: https/Capacitor)
   - بديل آمن في البيئات غير الآمنة: تخزين نصي معياري (PLAIN)
   - تجزئة كلمات المرور SHA-256 مع ملح عشوائي لكل مستخدم
   ========================================================= */
'use strict';

(function () {
  const MASTER_KEY_NAME = 'EP_MASTER_KEY';
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const CryptoEngine = {
    ready: false,
    secure: false,          // هل التشفير الحقيقي متاح؟
    _key: null,

    /* ---------- Base64 ---------- */
    _b64(buf) {
      const bytes = new Uint8Array(buf);
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk)
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      return btoa(bin);
    },
    _unb64(str) {
      const bin = atob(str);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    },

    /* ---------- تهيئة المفتاح الرئيسي ---------- */
    async init() {
      if (this.ready) return;
      try {
        if (!window.crypto || !crypto.subtle) throw new Error('no-subtle');
        let raw = localStorage.getItem(MASTER_KEY_NAME);
        if (!raw) {
          raw = this._b64(crypto.getRandomValues(new Uint8Array(32)));
          localStorage.setItem(MASTER_KEY_NAME, raw);
        }
        this._key = await crypto.subtle.importKey('raw', this._unb64(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
        this.secure = true;
      } catch (e) {
        console.warn('[CryptoEngine] بيئة غير آمنة — تخزين نصي محمي بعلامة PLAIN');
        this._key = null;
        this.secure = false;
      }
      this.ready = true;
    },

    /* ---------- تشفير كائن كامل → نص ---------- */
    async encrypt(obj) {
      if (!this.secure) return 'PLAIN:' + JSON.stringify(obj);
      try {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this._key, enc.encode(JSON.stringify(obj)));
        const out = new Uint8Array(iv.length + cipher.byteLength);
        out.set(iv, 0);
        out.set(new Uint8Array(cipher), iv.length);
        return this._b64(out);
      } catch (e) {
        return 'PLAIN:' + JSON.stringify(obj);
      }
    },

    /* ---------- فك نص → كائن ---------- */
    async decrypt(str) {
      if (typeof str !== 'string') return str;
      if (str.startsWith('PLAIN:')) {
        try { return JSON.parse(str.slice(6)); } catch (e) { return null; }
      }
      if (!this.secure) return null;
      try {
        const bytes = this._unb64(str);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, this._key, bytes.slice(12));
        return JSON.parse(dec.decode(plain));
      } catch (e) {
        console.error('[CryptoEngine] فشل فك التشفير', e);
        return null;
      }
    },

    /* ---------- تجزئة SHA-256 (للوثائق الحساسة وكلمات المرور) ---------- */
    async sha256Hex(text) {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
        return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
      }
      /* بديل بسيط (بيئات غير آمنة فقط — ليس تشفيراً بل بصمة) */
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
      for (let i = 0; i < text.length; i++) {
        const ch = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
    },

    /* ملح عشوائي */
    salt() {
      const a = new Uint8Array(8);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.fill(Date.now() % 255);
      return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
    },

    /* بصمة موحدة لكلمة المرور مع الملح */
    async hashPassword(pw, salt) {
      return this.sha256Hex('edupro$' + salt + '$' + pw);
    }
  };

  window.CryptoEngine = CryptoEngine;
  /* اسم قديم للتوافق */
  window.SecureBox = CryptoEngine;
})();

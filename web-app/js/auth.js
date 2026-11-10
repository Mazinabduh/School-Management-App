/* =========================================================
   auth.js — حماية الدخول والجلسات (AuthGuard)
   - جلسة 30 يوماً في localStorage مع تجديد انزلاقي
   - كلمات مرور مجزأة SHA-256 + ملح
   ========================================================= */
'use strict';

(function () {
  const K = Config.SESSION_KEY, DAYS = Config.SESSION_DAYS, MS = DAYS * 24 * 3600 * 1000;

  const AuthGuard = {
    user: null,

    /* ---------- الجلسة ---------- */
    _save() {
      const s = { uid: this.user.id, t: Date.now(), exp: Date.now() + MS };
      try { localStorage.setItem(K, JSON.stringify(s)); } catch (e) {}
    },

    async restore() {
      try {
        let raw = localStorage.getItem(K);
        if (!raw) {
          /* مرآة الجلسة الأصلية (SharedPreferences) — تحمي من أي مسح للويب فيو */
          try {
            const n = window.AndroidBridge && AndroidBridge.nativeGetPref ? AndroidBridge.nativeGetPref(Config.SESSION_MIRROR_KEY) : null;
            if (n) { localStorage.setItem(K, n); raw = n; }
          } catch (e) {}
        }
        if (!raw && typeof sessionStorage !== 'undefined') raw = sessionStorage.getItem(K);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!s || !s.uid || Date.now() > s.exp) { localStorage.removeItem(K); return null; }
        const u = Store.get('users', s.uid);
        if (!u) { localStorage.removeItem(K); return null; }
        this.user = u;
        s.exp = Date.now() + MS;                    // تجديد انزلاقي
        try { localStorage.setItem(K, JSON.stringify(s)); } catch (e) {}
        return u;
      } catch (e) { return null; }
    },

    /* ---------- دخول/خروج ---------- */
    async login(username, password, remember = true) {
      const u = Store.find('users', (x) => x.username.toLowerCase() === String(username).toLowerCase().trim());
      if (!u || !u.hash) return { ok: false, msg: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      const h = await CryptoEngine.hashPassword(password, u.salt || '');
      if (h !== u.hash) return { ok: false, msg: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
      this.user = u;
      if (remember) {
        this._save();
      } else {
        /* بلا تذكر: جلسة للجلسة الحالية فقط — يُطلب الدخول مرة أخرى */
        try {
          sessionStorage.setItem(K, JSON.stringify({ uid: this.user.id, t: Date.now(), exp: Date.now() + MS }));
          localStorage.removeItem(K);
        } catch (e) { this._save(); }
      }
      Audit.log('دخول', `تسجيل دخول: ${u.name}`);
      return { ok: true, user: u };
    },

    logout() {
      if (this.user) Audit.log('خروج', `تسجيل خروج: ${this.user.name}`);
      this.user = null;
      localStorage.removeItem(K);
      try { sessionStorage.removeItem(K); } catch (e) {}
    },

    /* ---------- إدارة الحسابات ---------- */
    async changePassword(oldPw, newPw) {
      if (!this.user) return { ok: false, msg: 'لا توجد جلسة' };
      const h = await CryptoEngine.hashPassword(oldPw, this.user.salt || '');
      if (h !== this.user.hash) return { ok: false, msg: 'كلمة المرور الحالية غير صحيحة' };
      if (String(newPw).length < 6) return { ok: false, msg: 'كلمة المرور الجديدة قصيرة (6 أحرف على الأقل)' };
      this.user.salt = CryptoEngine.salt();
      this.user.hash = await CryptoEngine.hashPassword(newPw, this.user.salt);
      Store.put('users', this.user);
      Audit.log('أمان', 'تغيير كلمة المرور');
      return { ok: true };
    },

    async addUser({ username, name, role, password }) {
      if (Store.find('users', (x) => x.username.toLowerCase() === String(username).toLowerCase().trim()))
        return { ok: false, msg: 'اسم المستخدم موجود مسبقاً' };
      const salt = CryptoEngine.salt();
      const hash = await CryptoEngine.hashPassword(password, salt);
      const u = Store.put('users', { username: username.trim(), name, role, salt, hash });
      Audit.log('مستخدمون', `إضافة مستخدم: ${name} (${role})`);
      return { ok: true, user: u };
    },

    async resetPassword(userId, newPw) {
      const u = Store.get('users', userId);
      if (!u) return { ok: false, msg: 'المستخدم غير موجود' };
      u.salt = CryptoEngine.salt();
      u.hash = await CryptoEngine.hashPassword(newPw, u.salt);
      Store.put('users', u);
      Audit.log('مستخدمون', `إعادة تعيين كلمة مرور: ${u.name}`);
      return { ok: true };
    },

    delUser(userId) {
      if (userId === (this.user && this.user.id)) return false;
      Store.del('users', userId);
      return true;
    },

    roleLabel(role) { return (Config.ROLES[role] || {}).label || role; },
    isAdmin() { return this.user && this.user.role === 'admin'; },
    initials() {
      const n = (this.user && this.user.name) || '؟';
      return n.trim().charAt(0);
    }
  };

  window.AuthGuard = AuthGuard;
  window.Auth = AuthGuard;
})();

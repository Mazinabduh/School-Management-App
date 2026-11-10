/* =========================================================
   app.js — المحرك الرئيسي (يُحمَّل أخيراً)
   تفويض الأحداث الموحد + تسلسل الإقلاع + الجلسة + SW + إدارة الأخطاء
   ========================================================= */
'use strict';

/* ================= لا فشل صامت أبداً ================= */
window.addEventListener('error', (e) => {
  console.error('[خطأ عام]', e.message, e.filename, e.lineno);
  if (window.UI && e.message && !e.message.includes('Script error')) UI.toast('خطأ: ' + e.message, 'error', 4500);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[وعد مرفوض]', e.reason);
  if (window.UI) UI.toast('خطأ غير متوقع: ' + (e.reason && e.reason.message ? e.reason.message : e.reason), 'error', 4500);
});

/* ================= تفويض الأحداث الموحد ================= */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const [ns, fn] = (el.dataset.action || '').split(':');
  if (!ns || !fn) return;
  e.preventDefault();
  Actions.call(ns, fn, el.dataset, el, e);
});

/* حقول الإدخال المعلّمة: data-input="ns:fn" — المعالجة تستقبل (el, val, dataset) */
const fireInput = (el) => {
  const [ns, fn] = (el.dataset.input || '').split(':');
  if (!ns || !fn) return;
  const val = el.type === 'checkbox' ? el.checked : el.value;
  const m = Actions.reg[ns];
  const f = m && m[fn];
  if (typeof f !== 'function') {
    console.error(`[Actions] فعل إدخال مفقود: ${ns}:${fn}`);
    if (window.UI) UI.toast(`خطأ برمجي: الفعل ${ns}:${fn} غير مسجل`, 'error');
    return;
  }
  try { f(el, val, el.dataset); }
  catch (err) {
    console.error(`[Actions] خطأ في ${ns}:${fn}`, err);
    if (window.UI) UI.toast('حدث خطأ غير متوقع: ' + err.message, 'error');
  }
};
document.addEventListener('input', (e) => { const el = e.target.closest('[data-input]'); if (el) fireInput(el); });
document.addEventListener('change', (e) => { const el = e.target.closest('[data-input]'); if (el) fireInput(el); });

/* ESC يغلق أعلى نافذة */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const backs = document.querySelectorAll('.modal-backdrop');
  if (backs.length) backs[backs.length - 1].remove();
});

/* ================= أفعال الهيكل ================= */
Actions.register('shell', {
  toggleSidebar() { Router.toggleSidebar(); },
  closeSidebar() { Router.closeSidebar(); },
  toggleDark() {
    const u = Store.getSetting('themeUI', Config.THEME_DEFAULTS);
    ThemeApply.save({ dark: !u.dark });
    UI.toast(!u.dark ? '🌙 تم تفعيل الوضع الليلي' : '☀️ تم تفعيل الوضع النهاري', 'success', 1800);
  },
  printSettings() {
    Router.go('settings-branding');
    setTimeout(() => Actions.call('set', 'tab', { t: 'print' }), 80);
  },
  async userMenu() {
    const u = AuthGuard.user;
    if (!u) return;
    const pick = await UI.sheet({
      title: `${u.name} — ${AuthGuard.roleLabel(u.role)}`,
      items: [
        { ico: '⚙️', label: 'الإعدادات والهوية', sub: 'بيانات المدرسة والمظهر', color: 'ic-slate', id: 'set' },
        { ico: '🎨', label: 'ثيمات المستندات الدولية', sub: '4 قوالب للكشوفات والشهادات', color: 'ic-purple', id: 'themes' },
        { ico: '☁️', label: 'النسخ الاحتياطي', sub: 'تصدير/استعادة/GitHub', color: 'ic-blue', id: 'bak' },
        { ico: 'ℹ️', label: 'حول البرنامج', sub: 'YCMS — حول النظام والمطور', color: 'ic-gold', id: 'about' },
        { ico: '🔑', label: 'تغيير كلمة المرور', color: 'ic-gold', id: 'pw' },
        { ico: '🚪', label: 'تسجيل الخروج', color: 'ic-rose', id: 'out' }
      ]
    });
    if (!pick) return;
    if (pick.id === 'set') Router.go('settings-branding');
    if (pick.id === 'themes') { Router.go('settings-branding'); setTimeout(() => Actions.call('set', 'tab', { t: 'print' }), 80); }
    if (pick.id === 'bak') Router.go('backup-restore');
    if (pick.id === 'about') {
      UI.modal({
        title: 'ℹ️ حول البرنامج',
        body: `
          <div style="text-align:center;padding:6px 4px">
            <img src="assets/images/ycms-logo.png" alt="شعار YCMS" style="width:110px;height:110px;object-fit:contain;border-radius:24px;padding:10px;background:linear-gradient(150deg,#0d2040,#061022);border:1px solid rgba(0,212,255,.25);box-shadow:0 10px 30px rgba(0,0,0,.35)">
            <h3 style="margin:10px 0 4px;font-size:17px">${H.esc(Store.getSetting('schoolName') || 'تطبيق ادارة المدرسة')}</h3>
            <div style="font-size:12.5px;color:var(--text-3);margin-bottom:14px">نظام EduPro الإداري الأكاديمي — الإصدار ${Config.VERSION} (بناء ${Config.BUILD})</div>
            <div style="background:linear-gradient(135deg,rgba(0,180,255,.08),rgba(0,230,118,.05));border:1px solid rgba(0,180,255,.2);border-radius:14px;padding:14px 12px;margin-bottom:10px">
              <div style="font-weight:900;font-size:13.5px;margin-bottom:6px">جميع الحقوق محفوظة لشركة YCMS</div>
              <div style="font-size:12.5px;color:var(--text-2)">برمجة وتطوير: <b>مازن عبدالوهاب</b></div>
              <a href="tel:774047989" style="display:inline-block;margin-top:8px;background:rgba(0,180,255,.14);color:var(--primary);font-weight:800;padding:8px 18px;border-radius:10px;text-decoration:none;font-size:13px">📞 774047989</a>
            </div>
            <small style="color:var(--text-3);font-size:11px">يعمل دون إنترنت — البيانات محفوظة في جهازك ومشفرة</small>
          </div>`,
        foot: [{ label: 'إغلاق', cls: 'btn-ghost', onClick: (h) => h.close() }]
      });
    }
    if (pick.id === 'pw') {
      const d = await UI.form('🔑 تغيير كلمة المرور', [
        { name: 'old', label: 'الحالية', type: 'password', req: true },
        { name: 'new', label: 'الجديدة (6+ أحرف)', type: 'password', req: true }
      ]);
      if (d) {
        const r = await AuthGuard.changePassword(d.old, d.new);
        UI.toast(r.ok ? 'تم التغيير ✓' : r.msg, r.ok ? 'success' : 'error');
      }
    }
    if (pick.id === 'out') {
      if (await UI.confirm({ title: 'تسجيل الخروج', msg: 'البيانات محفوظة في جهازك ولن تُفقد. تسجيل الخروج يلغي «تذكرني» وسيُطلب الدخول مرة أخرى. متابعة؟', okLabel: 'خروج', danger: true })) {
        Store.flush();
        AuthGuard.logout();
        try { native.del(Config.SESSION_MIRROR_KEY); native.del(Config.REMEMBER_KEY); } catch (e) {}
        location.reload();
      }
    }
  },
  logout() {
    Store.flush();
    AuthGuard.logout();
    location.reload();
  }
});

/* ================= تسلسل الإقلاع ================= */
(function () {
  const progress = (p) => { const b = document.getElementById('splash-bar'); if (b) b.style.width = p + '%'; };

  async function boot() {
    progress(15);
    await CryptoEngine.init();
    progress(35);
    await Store.init();
    progress(60);

    const restored = await AuthGuard.restore();
    progress(80);

    if (restored) {
      enterApp();
    } else {
      /* شاشة الدخول بنمط المحطة */
      document.getElementById('splash').classList.add('off');
      document.getElementById('login-screen').hidden = false;
      progress(100);
      initLoginExtras();
    }
  }

  /* ---------- بوابة التخزين الأصلي (مرآة الجلسة في SharedPreferences) ---------- */
  const native = {
    set(k, v) { try { if (window.AndroidBridge && AndroidBridge.nativeSetPref) AndroidBridge.nativeSetPref(k, v); } catch (e) {} },
    get(k) { try { if (window.AndroidBridge && AndroidBridge.nativeGetPref) return AndroidBridge.nativeGetPref(k); } catch (e) {} return null; },
    del(k) { try { if (window.AndroidBridge && AndroidBridge.nativeDelPref) AndroidBridge.nativeDelPref(k); } catch (e) {} }
  };

  /* ---------- تجهيزات شاشة الدخول (بنمط المحطة) ---------- */
  function initLoginExtras() {
    try {
      const ver = document.getElementById('login-version');
      if (ver) ver.textContent = Config.VERSION.split('.').slice(0, 2).join('.');
    } catch (e) {}
    /* خلفية Canvas متحركة */
    try { if (window.LoginBG) LoginBG.init('loginBgCanvas'); } catch (e) {}
    /* إظهار / إخفاء كلمة المرور */
    const toggle = document.getElementById('passToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const pass = document.getElementById('login-pass');
        const show = pass.type === 'password';
        pass.type = show ? 'text' : 'password';
        toggle.querySelector('.eye-open').style.display = show ? 'none' : '';
        toggle.querySelector('.eye-closed').style.display = show ? '' : 'none';
      });
    }
    /* استرجاع اسم المستخدم المحفوظ («تذكرني») */
    try {
      const r = localStorage.getItem(Config.REMEMBER_KEY) || native.get(Config.REMEMBER_KEY);
      if (r) {
        const inp = document.getElementById('login-user');
        if (inp && !inp.value) inp.value = r;
        const rem = document.getElementById('loginRemember');
        if (rem) rem.checked = true;
      }
    } catch (e) {}
    setTimeout(() => { const i = document.getElementById('login-user'); if (i) i.focus(); }, 350);
  }

  function enterApp() {
    const s = Store.settings();
    /* تطبيق الثيم المحفوظ قبل إظهار الواجهة */
    if (window.ThemeApply) ThemeApply.apply();
    RBAC.init();
    Router.updateBranding();

    /* ترحيب في القائمة */
    document.getElementById('sidebar-username').textContent = AuthGuard.user.name;
    document.getElementById('sidebar-role').textContent = `${(Config.ROLES[AuthGuard.user.role] || {}).ico || ''} ${AuthGuard.roleLabel(AuthGuard.user.role)}`;
    document.getElementById('sidebar-avatar').textContent = H.initials(AuthGuard.user.name);

    Router.buildShell();

    document.getElementById('login-screen').hidden = true;
    document.getElementById('splash').classList.add('off');
    document.getElementById('app').hidden = false;
    progress(100);

    /* الصفحة الأولى: من الهاش أو لوحة التحكم */
    const hash = (location.hash || '').replace('#', '');
    const target = hash && Pages[hash] && RBAC.can(hash) ? hash : 'dashboard';
    Router.go(target, { silent: true });

    Audit.log('دخول', 'تشغيل النظام v' + Config.VERSION);
    registerSW();
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('[SW]', e.message));
  }

  /* ---------- نموذج الدخول (بنمط المحطة — تذكرني + مرآة أصلية) ---------- */
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('login-error');
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const remember = !!(document.getElementById('loginRemember') || {}).checked;
    err.hidden = true;
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = '⏳ جارٍ التحقق…';
    try {
      const r = await AuthGuard.login(u, p, remember);
      if (!r.ok) {
        err.textContent = r.msg;
        err.hidden = false;
        /* لو الحساب الافتراضي لم يُهيأ بعد (تشفير أول تشغيل) */
        const user = Store.find('users', (x) => x.username.toLowerCase() === u.toLowerCase());
        if (user && !user.hash) err.textContent = 'جارٍ تهيئة الحساب الأول… أعد المحاولة بعد لحظات';
      } else {
        try {
          if (remember) {
            localStorage.setItem(Config.REMEMBER_KEY, u);
            native.set(Config.REMEMBER_KEY, u);
            const j = localStorage.getItem(Config.SESSION_KEY) || '';
            if (j) native.set(Config.SESSION_MIRROR_KEY, j);
          } else {
            localStorage.removeItem(Config.REMEMBER_KEY);
            native.del(Config.REMEMBER_KEY);
            native.del(Config.SESSION_MIRROR_KEY);
          }
        } catch (e2) {}
        if (window.LoginBG) LoginBG.stop();
        enterApp();
      }
    } catch (ex) {
      err.textContent = 'خطأ: ' + ex.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.querySelector('.btn-text').textContent = 'تسجيل الدخول';
    }
  });

  /* ---------- تحديث الواجهة عند العودة للتطبيق ---------- */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && AuthGuard.user) Store.flush();
  });
  window.addEventListener('beforeunload', () => { try { Store.flush(); } catch (e) {} });

  /* ---------- التنقل بالهاش ---------- */
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (id && Pages[id] && id !== Router.current) Router.go(id);
  });

  /* ---------- انطلاق ---------- */
  progress(8);
  boot();
})();

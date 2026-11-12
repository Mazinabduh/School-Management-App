/* =========================================================
   app.js — المحرك الرئيسي (يُحمَّل أخيراً) — بنمط تطبيق المحطة
   تفويض الأحداث الموحد + تسلسل الإقلاع + الجلسة + القائمة المنسدلة
   + لوحة الإشعارات + الثيمات (ThemePro) + SW + إدارة الأخطاء
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

/* حقول الإدخال المعلّمة: data-input="ns:fn" */
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

/* ESC يغلق أعلى نافذة أو القوائم المنسدلة */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const backs = document.querySelectorAll('.modal-backdrop');
  if (backs.length) { backs[backs.length - 1].remove(); return; }
  closeAdminDropdown();
  closeNotifPanel();
});

/* ================= القائمة المنسدلة + الإشعارات (بنمط المحطة) ================= */
function closeAdminDropdown() {
  const dd = document.getElementById('adminDropdown');
  if (dd) dd.classList.remove('open');
}
function closeNotifPanel() {
  const np = document.getElementById('notifPanel');
  if (np) np.classList.remove('open');
}
function toggleAdminDropdown() {
  const dd = document.getElementById('adminDropdown');
  if (!dd) return;
  closeNotifPanel();
  const opening = !dd.classList.contains('open');
  dd.classList.toggle('open', opening);
  if (opening) {
    const u = AuthGuard.user;
    if (u) {
      const dn = document.getElementById('dropName');
      const dr = document.getElementById('dropRole');
      if (dn) dn.textContent = u.name || 'مدير النظام';
      if (dr) dr.textContent = AuthGuard.roleLabel(u.role);
    }
  }
}
function toggleNotifPanel() {
  const np = document.getElementById('notifPanel');
  if (!np) return;
  closeAdminDropdown();
  np.classList.toggle('open', !np.classList.contains('open'));
  if (np.classList.contains('open')) renderNotifPanel();
}

/* ---------- إشعارات المدرسة (متأخرات + مخزون منخفض) ---------- */
function schoolNotifications() {
  const out = [];
  try {
    let due = 0, dueCount = 0;
    (Store.col('feeplans') || []).forEach((p) => {
      (p.items || []).forEach((i) => { if (!i.paid) { due += Number(i.amount) || 0; dueCount++; } });
    });
    if (due > 0) out.push({ icon: '⚠️', text: `لديك ${H.num(dueCount)} دفعة غير مسددة بإجمالي <b>${H.money(due)}</b>`, time: 'الآن' });
    const lowStock = (Store.col('inventory') || []).filter((i) => (Number(i.qty) || 0) <= 2);
    if (lowStock.length) out.push({ icon: '📦', text: `<b>${H.num(lowStock.length)}</b> صنفًا وشيك النفاد من المخزون`, time: 'الآن' });
    const last = Store.sortBy(Store.col('audit'), 'ts', false)[0];
    if (last) out.push({ icon: '🕐', text: H.esc((last.msg || '').slice(0, 80)), time: H.esc(last.time || '') });
  } catch (e) {}
  return out;
}
function renderNotifPanel() {
  const list = document.getElementById('notifList');
  if (!list) return;
  const items = schoolNotifications();
  if (!items.length) {
    list.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon">🔔</div><p>لا توجد إشعارات</p></div>';
    return;
  }
  list.innerHTML = items.map((n) => `
    <div class="notif-item">
      <div class="notif-item-icon">${n.icon}</div>
      <div class="notif-item-content">
        <div class="notif-item-text">${n.text}</div>
        <div class="notif-item-time">${n.time}</div>
      </div>
    </div>`).join('');
}
function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const n = schoolNotifications().length;
  badge.textContent = String(Math.max(0, n));
  badge.style.display = n > 0 ? 'flex' : 'none';
}

/* ================= أفعال الهيكل ================= */
Actions.register('shell', {
  goSettings() { closeAdminDropdown(); Router.go('settings-branding'); },
  goThemes() { closeAdminDropdown(); Router.go('themes'); },
  goBackup() { closeAdminDropdown(); Router.go('backup-restore'); },
  goPrint() { closeAdminDropdown(); Router.go('print-settings'); },
  about() {
    closeAdminDropdown();
    UI.modal({
      title: 'ℹ️ حول البرنامج',
      body: `
        <div style="text-align:center;padding:6px 4px">
          <img src="assets/images/ycms-logo.png" alt="شعار YCMS" style="width:110px;height:110px;object-fit:contain;border-radius:24px;padding:10px;background:linear-gradient(150deg,#0d2040,#061022);border:1px solid rgba(0,212,255,.25);box-shadow:0 10px 30px rgba(0,0,0,.35)">
          <h3 style="margin:10px 0 4px;font-size:17px">${H.esc(Store.getSetting('schoolName') || 'تطبيق ادارة المدرسة')}</h3>
          <div style="font-size:12.5px;color:var(--text-3);margin-bottom:14px">نظام EduPro الإداري الأكاديمي — الإصدار ${Config.VERSION} (بناء ${Config.BUILD})</div>
          <div style="background:linear-gradient(135deg,rgba(0,180,255,.08),rgba(0,230,118,.05));border:1px solid rgba(0,180,255,.2);border-radius:14px;padding:14px 12px;margin-bottom:10px">
            <div style="font-weight:900;font-size:14px;margin-bottom:8px">جميع الحقوق محفوظة لشركة YCMS</div>
            <div style="font-size:13px;color:var(--text-2);font-weight:800">برمجة وتطوير: <b>مازن عبدالوهاب</b></div>
            <div style="font-size:13px;color:var(--text-2);font-weight:800;margin-top:4px">إدارة محاسبية: <b>صدام نجم الدين</b></div>
            <a href="tel:774047989" style="display:inline-block;margin-top:10px;background:rgba(0,180,255,.14);color:var(--blue);font-weight:800;padding:8px 18px;border-radius:10px;text-decoration:none;font-size:13px">📞 774047989</a>
          </div>
          <small style="color:var(--text-3);font-size:11px">يعمل دون إنترنت — البيانات محفوظة في جهازك ومشفرة داخل خزنة IndexedDB</small>
        </div>`,
      foot: [{ label: 'إغلاق', cls: 'btn-ghost', onClick: (h) => h.close() }]
    });
  },
  async logout() {
    if (!await UI.confirm({ title: 'تسجيل الخروج', msg: 'البيانات محفوظة في جهازك ولن تُفقد. تسجيل الخروج يلغي «تذكرني» وسيُطلب الدخول مرة أخرى. متابعة؟', okLabel: 'خروج', danger: true })) return;
    closeAdminDropdown();
    Store.flush();
    AuthGuard.logout();
    try {
      if (window.AndroidBridge) {
        AndroidBridge.nativeDelPref && AndroidBridge.nativeDelPref(Config.SESSION_MIRROR_KEY);
        AndroidBridge.nativeDelPref && AndroidBridge.nativeDelPref(Config.REMEMBER_KEY);
      } else {
        localStorage.removeItem(Config.SESSION_MIRROR_KEY);
        localStorage.removeItem(Config.REMEMBER_KEY);
      }
    } catch (e) {}
    location.reload();
  },
  logoutBtn() { Actions.call('shell', 'logout', {}); },
  toggleSidebar() { Router.toggleSidebar(); },
  closeSidebar() { Router.closeSidebar(); }
});

/* ================= ربط عناصر الواجهة (المحطة) ================= */
function bindShell() {
  /* الهامبرغر: الكمبيوتر يُعالج في Router (طي/توسيع) — الهاتف يفتح الدرج */
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      if (window.matchMedia('(min-width:1024px)').matches) return; /* nav-pro يتكفل */
      e.preventDefault();
      Router.toggleSidebar();
    });
  }
  const closeBtn = document.getElementById('sidebarClose');
  if (closeBtn) closeBtn.addEventListener('click', () => Router.closeSidebar());
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) backdrop.addEventListener('click', () => Router.closeSidebar());

  const avatarBtn = document.getElementById('adminAvatarBtn');
  if (avatarBtn) avatarBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleAdminDropdown(); });
  const notifBtn = document.getElementById('notifBtn');
  if (notifBtn) notifBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleNotifPanel(); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#adminDropdown') && !e.target.closest('#adminAvatarBtn')) closeAdminDropdown();
    if (!e.target.closest('#notifPanel') && !e.target.closest('#notifBtn')) closeNotifPanel();
  });
  const notifClear = document.getElementById('notifClear');
  if (notifClear) notifClear.addEventListener('click', () => {
    renderNotifPanel();
  });
}

/* ================= تسلسل الإقلاع ================= */
(function () {
  const progress = (p) => { const b = document.getElementById('splash-bar'); if (b) b.style.width = p + '%'; };

  /* ---------- بوابة التخزين الأصلي (مرآة الجلسة في SharedPreferences) ---------- */
  const native = {
    set(k, v) { try { if (window.AndroidBridge && AndroidBridge.nativeSetPref) AndroidBridge.nativeSetPref(k, v); } catch (e) {} },
    get(k) { try { if (window.AndroidBridge && AndroidBridge.nativeGetPref) return AndroidBridge.nativeGetPref(k); } catch (e) {} return null; },
    del(k) { try { if (window.AndroidBridge && AndroidBridge.nativeDelPref) AndroidBridge.nativeDelPref(k); } catch (e) {} }
  };

  async function boot() {
    progress(15);
    await CryptoEngine.init();
    progress(35);
    await Store.init();
    progress(60);
    /* ---------- نظام المحطة _splash بالنص: اسم المدرسة وشعارها يظهران
       في شاشة البداية وشاشة الدخول فوراً من الإعدادات — قبل أي دخول ---------- */
    bootBranding();
    progress(75);
    bindShell();
    const restored = await AuthGuard.restore();
    progress(80);

    if (restored) {
      enterApp();
    } else {
      document.getElementById('splash').classList.add('off');
      document.getElementById('login-screen').hidden = false;
      progress(100);
      initLoginExtras();
    }
  }

  /* ---------- هوية المدرسة في البداية — نظام boot-login بالمحطة v2026.100 بالنص ----------
     استقصاء كل 150ms حتى تظهر الإعدادات + مراقب MutationObserver على شاشة الدخول
     يُعيد التطبيق عند كل ظهور لها — الاسم والشعار يُطبّقان في كل المواضع دفعة واحدة،
     وتُرسل مرآة الهوية إلى SharedPreferences ليظهرا في الإقلاع الأصلي أيضاً. */
  const bootApplied = { logo: null, name: null };

  function mirrorBrandToNative(s) {
    try {
      if (window.AndroidBridge && AndroidBridge.nativeSetPref) {
        AndroidBridge.nativeSetPref('edupro_brand:schoolName', s.schoolName || '');
        const logo = String(s.logo || '');
        if (logo.startsWith('data:image')) AndroidBridge.nativeSetPref('edupro_brand:logo', logo);
      }
    } catch (e) {}
  }

  function applyLogoEverywhere(logo) {
    ['splash-logo', 'login-logo', 'sidebarLogoImg', 'topLogoMiniImg'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) { el.src = logo; el.style.display = 'block'; }
    });
  }
  function applyNameEverywhere(name) {
    const t = document.getElementById('splash-title');
    if (t && name) t.textContent = name;
    const ln = document.getElementById('login-school-name');
    if (ln && name) ln.textContent = name;
    const sb = document.getElementById('sidebarSchoolName');
    if (sb && name) sb.textContent = name;
  }
  function readBrandSettings() {
    try {
      if (typeof Store === 'undefined' || !Store.ready) return null;
      const s = Store.settings();
      return s && typeof s === 'object' ? s : null;
    } catch (e) { return null; }
  }
  function bootBranding() {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      const s = readBrandSettings();
      let done = true;
      if (s) {
        if (s.logo && bootApplied.logo !== s.logo) {
          bootApplied.logo = s.logo;
          applyLogoEverywhere(s.logo);
        }
        if (s.schoolName && bootApplied.name !== s.schoolName) {
          bootApplied.name = s.schoolName;
          applyNameEverywhere(s.schoolName);
          mirrorBrandToNative(s);
        }
        done = (!!s.logo || tries > 40) && (bootApplied.name !== null || tries > 40);
      } else {
        done = false;
      }
      if (done || tries >= 60) clearInterval(timer);
    }, 150);
    try {
      const login = document.getElementById('login-screen');
      if (login && typeof MutationObserver !== 'undefined') {
        new MutationObserver(() => {
          if (!login.hidden && bootApplied.logo) {
            applyLogoEverywhere(bootApplied.logo);
            if (bootApplied.name) applyNameEverywhere(bootApplied.name);
          }
        }).observe(login, { attributes: true, attributeFilter: ['hidden', 'style'] });
      }
    } catch (e2) {}
    window.BootBrand = {
      applyLogo: (l) => { if (l) { bootApplied.logo = l; applyLogoEverywhere(l); } },
      applyName: (n) => { if (n) { bootApplied.name = n; applyNameEverywhere(n); } }
    };
    window.mirrorBrandToNative = mirrorBrandToNative;
  }

  /* ---------- تجهيزات شاشة الدخول ---------- */
  function initLoginExtras() {
    try {
      const ver = document.getElementById('login-version');
      if (ver) ver.textContent = Config.VERSION.split('.').slice(0, 2).join('.');
    } catch (e) {}
    try { if (window.LoginBG) LoginBG.init('loginBgCanvas'); } catch (e) {}
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
    /* تطبيق ثيم المحطة قبل إظهار الواجهة */
    if (window.ThemePro) ThemePro.apply();
    /* إعادة تطبيق الهوية فور الدخول — نفس boot-login بالمحطة */
    if (window.BootBrand) {
      if (s.logo) BootBrand.applyLogo(s.logo);
      if (s.schoolName) BootBrand.applyName(s.schoolName);
      try { mirrorBrandToNative(s); } catch (e) {}
    }

    RBAC.init();
    Router.updateBranding();
    Router.buildSidebar();
    Router.buildBottomBar();

    document.getElementById('login-screen').hidden = true;
    document.getElementById('splash').classList.add('off');
    const app = document.getElementById('mainApp');
    app.style.display = 'block';
    progress(100);

    /* الصفحة الأولى: من الهاش أو لوحة التحكم */
    const hash = (location.hash || '').replace('#', '');
    const target = hash && Pages[hash] && RBAC.can(hash) ? hash : 'dashboard';
    Router.go(target, { silent: true });

    updateNotifBadge();
    Router.setupDesktopToggle();

    Audit.log('دخول', 'تشغيل النظام v' + Config.VERSION);
    registerSW();
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('[SW]', e.message));
  }

  /* ---------- نموذج الدخول (تذكرني + مرآة أصلية) ---------- */
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
    if (document.visibilityState === 'visible' && AuthGuard.user) {
      Store.flush();
      updateNotifBadge();
    }
  });
  window.addEventListener('beforeunload', () => { try { Store.flush(); } catch (e) {} });

  /* ---------- التنقل بالهاش ---------- */
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (id && Pages[id] && id !== Router.current && AuthGuard.user) Router.go(id);
  });

  /* ---------- انطلاق ---------- */
  progress(8);
  boot();
})();

/* =========================================================
   navigation.js — نظام التنقل السريع (SPA Router)
   يبني القائمة الجانبية والشريط السفلي من سجل الصفحات Pages
   ويطبّق الصلاحيات — مع دعم الهاش (#students)
   ========================================================= */
'use strict';

(function () {
  /* ---------- خريطة التنقل ---------- */
  const NAV = [
    { label: 'الرئيسية', items: [
      { id: 'dashboard', ico: '🏠', label: 'لوحة التحكم', color: 'ic-blue' }
    ]},
    { label: 'شؤون الطلاب', items: [
      { id: 'students', ico: '👨‍🎓', label: 'الطلاب والتسجيل', color: 'ic-blue' },
      { id: 'stages-classes', ico: '🏫', label: 'المراحل والصفوف', color: 'ic-teal' }
    ]},
    { label: 'الشؤون الأكاديمية', items: [
      { id: 'grades-engine', ico: '✍️', label: 'رصد الدرجات', color: 'ic-purple' },
      { id: 'results-certificates', ico: '🏅', label: 'النتائج والشهادات', color: 'ic-gold' }
    ]},
    { label: 'الحسابات والمخزون', items: [
      { id: 'finance-budget', ico: '💰', label: 'الميزانية العامة', color: 'ic-green' },
      { id: 'installments', ico: '🧾', label: 'الأقساط والفواتير', color: 'ic-blue' },
      { id: 'store-books-uniform', ico: '👕', label: 'الزي والكتب', color: 'ic-orange' },
      { id: 'bus-management', ico: '🚌', label: 'اشتراكات الباص', color: 'ic-indigo' }
    ]},
    { label: 'الموظفون', items: [
      { id: 'hr-employees', ico: '👥', label: 'شؤون الموظفين', color: 'ic-teal' },
      { id: 'payroll-engine', ico: '💵', label: 'الرواتب والمستحقات', color: 'ic-green' }
    ]},
    { label: 'أدوات إدارية', items: [
      { id: 'id-card-studio', ico: '🪪', label: 'استوديو البطاقات', color: 'ic-purple' },
      { id: 'communications', ico: '📣', label: 'تواصل أولياء الأمور', color: 'ic-rose' },
      { id: 'reports-center', ico: '📊', label: 'مركز التقارير', color: 'ic-indigo' }
    ]},
    { label: 'النظام', items: [
      { id: 'settings-branding', ico: '⚙️', label: 'الإعدادات والهوية', color: 'ic-slate' },
      { id: 'backup-restore', ico: '☁️', label: 'النسخ الاحتياطي', color: 'ic-blue' },
      { id: 'audit-log', ico: '🛡️', label: 'سجل الحركات', color: 'ic-slate' }
    ]}
  ];

  const BOTTOM = ['dashboard', 'students', 'grades-engine', 'installments'];

  const Router = {
    NAV, BOTTOM,
    current: null,

    /* كل الصفحات المسموحة للدور الحالي */
    allowedItems() {
      const out = [];
      for (const g of NAV) for (const it of g.items) if (RBAC.can(it.id)) out.push(it);
      return out;
    },

    findItem(id) {
      for (const g of NAV) { const it = g.items.find((x) => x.id === id); if (it) return it; }
      return null;
    },

    /* ---------- بناء الهيكل ---------- */
    buildShell() {
      /* القائمة الجانبية */
      const nav = document.getElementById('sidebar-nav');
      const allowed = new Set(this.allowedItems().map((i) => i.id));
      nav.innerHTML = NAV.map((g) => {
        const items = g.items.filter((i) => allowed.has(i.id));
        if (!items.length) return '';
        return `<div class="nav-group-label">${g.label}</div>` + items.map((i) => `
          <button class="nav-item" data-page="${i.id}" data-action="nav:go">
            <span class="ni-ico icon3d ${i.color}">${i.ico}</span>
            <span class="ni-label">${i.label}</span>
          </button>`).join('');
      }).join('');

      /* الشريط السفلي */
      const bn = document.getElementById('bottomnav');
      const bottomItems = BOTTOM.filter((id) => allowed.has(id)).map((id) => this.findItem(id));
      bn.innerHTML = bottomItems.map((i) => `
        <button class="bottomnav-item" data-page="${i.id}" data-action="nav:go">
          <span class="bn-ico">${i.ico}</span><span>${i.label.split(' ')[0]}</span>
        </button>`).join('') + `
        <button class="bottomnav-item" id="btn-more-sheet" data-action="nav:more">
          <span class="bn-ico">⋯</span><span>المزيد</span>
        </button>`;
    },

    /* ---------- التنقل ---------- */
    go(id, { silent = false } = {}) {
      /* لا جلسة → لا تنقل إطلاقاً (شاشة الدخول معروضة) */
      if (!window.AuthGuard || !AuthGuard.user) {
        console.warn('[Router] محاولة تنقل بلا جلسة:', id);
        return false;
      }
      const item = this.findItem(id);
      const page = window.Pages && Pages[id];
      if (!page || typeof page.render !== 'function') {
        console.error('[Router] الصفحة غير مسجلة:', id);
        if (!silent) UI.toast(`الصفحة «${id}» غير متاحة`, 'error');
        return false;
      }
      if (!RBAC.can(id)) {
        if (!silent) { UI.toast('ليست لديك صلاحية لهذه الصفحة', 'error'); }
        if (this.current === 'dashboard' || silent) return false;
        return this.go('dashboard', { silent: true });
      }
      this.current = id;
      ChartsEngine.destroyAll();
      const root = document.getElementById('page-root');
      root.innerHTML = '<div style="padding:60px" class="text-center"><div class="spinner"></div></div>';
      try {
        root.innerHTML = '';
        page.render(root);
      } catch (err) {
        console.error('[Router] خطأ في عرض', id, err);
        root.innerHTML = UI.empty('💥', `حدث خطأ في عرض الصفحة: ${H.esc(err.message)}`,
          '<button class="btn btn-primary" data-action="nav:refresh">🔄 إعادة المحاولة</button>');
      }
      /* تمييز العناصر النشطة */
      document.querySelectorAll('#sidebar-nav .nav-item').forEach((n) => n.classList.toggle('active', n.dataset.page === id));
      document.querySelectorAll('#bottomnav .bottomnav-item').forEach((n) => n.classList.toggle('active', n.dataset.page === id));
      /* عنوان الشريط العلوي */
      const it = this.findItem(id);
      document.getElementById('topbar-page').textContent = it ? it.label : '';
      document.title = `${it ? it.label : ''} — ${(Store.getSetting('schoolName')) || 'EduPro'}`;
      this.closeSidebar();
      try { history.replaceState(null, '', '#' + id); } catch (e) {}
      root.scrollTop = 0;
      window.scrollTo(0, 0);
      return true;
    },

    refresh() { if (this.current) this.go(this.current); },

    /* ---------- قائمة "المزيد" ---------- */
    async more() {
      const bottomSet = new Set(BOTTOM);
      const items = this.allowedItems().filter((i) => !bottomSet.has(i.id))
        .map((i) => ({ ico: i.ico, label: i.label, sub: '', color: i.color, id: i.id }));
      if (!items.length) return;
      const picked = await UI.sheet({ title: 'كل الأقسام', items });
      if (picked && picked.id) this.go(picked.id);
    },

    /* ---------- القائمة الجانبية ---------- */
    toggleSidebar() {
      const sb = document.getElementById('sidebar');
      const bd = document.getElementById('sidebar-backdrop');
      sb.classList.toggle('open');
      bd.classList.toggle('show', sb.classList.contains('open'));
    },
    closeSidebar() {
      if (window.innerWidth >= 1024) return;
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-backdrop').classList.remove('show');
    },

    /* ---------- تحديث بيانات الهوية في الواجهة ---------- */
    updateBranding() {
      const s = Store.settings();
      const logo = s.logo || 'assets/images/logo-128.png';
      ['topbar-logo', 'sidebar-logo', 'login-logo', 'splash-logo'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.src = logo;
      });
      const name = s.schoolName || 'المدرسة الدولية الخاصة';
      ['topbar-school', 'sidebar-school', 'login-school-name'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = name;
      });
      const yr = document.getElementById('sidebar-year');
      if (yr) yr.textContent = s.year || '';
    }
  };

  Actions.register('nav', {
    go(ds) { if (ds && ds.page) Router.go(ds.page); },
    more() { Router.more(); },
    refresh() { Router.refresh(); },
    closeSidebar() { Router.closeSidebar(); },
    toggleSidebar() { Router.toggleSidebar(); }
  });

  window.Router = Router;
})();

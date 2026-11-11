/* =========================================================
   navigation.js — نظام التنقل السريع (SPA Router) — بنمط المحطة
   القائمة الجانبية والشريط السفلي بأيقونات 3D حقيقية (PNG)
   + أسطوانة الأخبار في الشريط العلوي + دعم الهاش (#students)
   ========================================================= */
'use strict';

(function () {
  /* ---------- خريطة التنقل — icon = ملف PNG ثلاثي الأبعاد ---------- */
  const NAV = [
    { label: 'الرئيسية', items: [
      { id: 'dashboard', icon: 'nav-home', label: 'لوحة التحكم' }
    ]},
    { label: 'شؤون الطلاب', items: [
      { id: 'students', icon: 'nav-students', label: 'الطلاب والتسجيل' },
      { id: 'stages-classes', icon: 'nav-stages', label: 'المراحل والصفوف' }
    ]},
    { label: 'الشؤون الأكاديمية', items: [
      { id: 'grades-engine', icon: 'nav-grades', label: 'رصد الدرجات' },
      { id: 'results-certificates', icon: 'nav-results', label: 'النتائج والشهادات' }
    ]},
    { label: 'الحسابات والمخزون', items: [
      { id: 'finance-budget', icon: 'nav-finance', label: 'الميزانية العامة' },
      { id: 'installments', icon: 'nav-installments', label: 'الأقساط والفواتير' },
      { id: 'store-books-uniform', icon: 'nav-store', label: 'الزي والكتب' },
      { id: 'bus-management', icon: 'nav-bus', label: 'اشتراكات الباص' }
    ]},
    { label: 'الموظفون', items: [
      { id: 'hr-employees', icon: 'nav-employees', label: 'شؤون الموظفين' },
      { id: 'payroll-engine', icon: 'nav-payroll', label: 'الرواتب والمستحقات' }
    ]},
    { label: 'أدوات إدارية', items: [
      { id: 'id-card-studio', icon: 'nav-cards', label: 'استوديو البطاقات' },
      { id: 'communications', icon: 'nav-communications', label: 'تواصل أولياء الأمور' },
      { id: 'reports-center', icon: 'nav-reports', label: 'مركز التقارير' }
    ]},
    { label: 'النظام', items: [
      { id: 'settings-branding', icon: 'nav-settings', label: 'الإعدادات والهوية' },
      { id: 'backup-restore', icon: 'nav-backup', label: 'النسخ الاحتياطي' },
      { id: 'audit-log', icon: 'nav-audit', label: 'سجل الحركات' }
    ]}
  ];

  const BOTTOM = ['dashboard', 'students', 'grades-engine', 'installments'];

  const ico = (name, cls) => `<img class="nav-icon-3d" src="assets/icons/${name}.png" alt="" loading="lazy">`;

  const Router = {
    NAV, BOTTOM,
    current: null,

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
      /* القائمة الجانبية — بنمط المحطة */
      const nav = document.getElementById('sidebar-nav');
      const allowed = new Set(this.allowedItems().map((i) => i.id));
      nav.innerHTML = NAV.map((g) => {
        const items = g.items.filter((i) => allowed.has(i.id));
        if (!items.length) return '';
        return `<div class="nav-group-label">${g.label}</div>` + items.map((i) => `
          <button class="nav-item" data-page="${i.id}" data-action="nav:go">
            <span class="ni-ico">${ico(i.icon)}</span>
            <span class="ni-label">${i.label}</span>
          </button>`).join('');
      }).join('');

      /* الشريط السفلي */
      const bn = document.getElementById('bottomnav');
      const bottomItems = BOTTOM.filter((id) => allowed.has(id)).map((id) => this.findItem(id));
      bn.innerHTML = bottomItems.map((i) => `
        <button class="bottomnav-item" data-page="${i.id}" data-action="nav:go">
          <span class="bn-ico">${ico(i.icon)}</span><span>${i.label.split(' ')[0]}</span>
        </button>`).join('') + `
        <button class="bottomnav-item" id="btn-more-sheet" data-action="nav:more">
          <span class="bn-ico">${ico('nav-more')}</span><span>المزيد</span>
        </button>`;

      this.buildTicker();
    },

    /* ---------- أسطوانة الأخبار (المحطة) ---------- */
    buildTicker() {
      const track = document.getElementById('cylinderTrack');
      if (!track) return;
      const s = Store.settings();
      const due = H.sum(Store.col('feeplans'), (p) => H.sum((p.items || []).filter((i) => !i.paid), (i) => i.amount));
      const items = [
        { t: `🏫 ${s.schoolName || 'المدرسة الدولية الخاصة'}` },
        { t: `👨‍🎓 الطلاب: <b>${H.num(Store.count('students'))}</b>` },
        { t: `👥 الموظفون: <b>${H.num(Store.count('employees'))}</b>` },
        { t: `⏳ المتأخرات: <b>${H.money(due)}</b>` },
        { t: `🗓️ العام الدراسي: <b>${H.esc(s.year || '')}</b>` },
        { t: `📅 ${H.arDate(Date.now())}` },
        { t: `🚌 مشتركو الباص: <b>${H.num(Store.count('busSubs', (b) => b.status === 'active'))}</b>` },
        { t: `🎓 جميع الحقوق محفوظة لشركة <b>YCMS</b>` }
      ];
      const one = items.map((x) => `<span class="tk">${x.t}</span><span class="tk-sep">◆</span>`).join('');
      track.innerHTML = one + one; /* نسختان للحلقة المستمرة */
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
      try {
        page.render(root);
      } catch (err) {
        console.error('[Router] خطأ في عرض', id, err);
        root.innerHTML = UI.empty('💥', `حدث خطأ في عرض الصفحة: ${H.esc(err.message)}`,
          '<button class="btn btn-primary" data-action="nav:refresh">🔄 إعادة المحاولة</button>');
      }
      /* تمييز العناصر النشطة */
      document.querySelectorAll('#sidebar-nav .nav-item').forEach((n) => n.classList.toggle('active', n.dataset.page === id));
      document.querySelectorAll('#bottomnav .bottomnav-item').forEach((n) => n.classList.toggle('active', n.dataset.page === id));
      const mb = document.getElementById('btn-menu');
      if (mb) mb.classList.remove('open');
      /* أسطوانة الأخبار تتحدث مع كل صفحة */
      this.buildTicker();
      document.title = `${item ? item.label : ''} — ${(Store.getSetting('schoolName')) || 'EduPro'}`;
      this.closeSidebar();
      try { history.replaceState(null, '', '#' + id); } catch (e) {}
      root.scrollTop = 0;
      window.scrollTo(0, 0);
      return true;
    },

    refresh() { if (this.current) this.go(this.current); },

    /* ---------- قائمة "المزيد" — بنمط المحطة بأيقونات 3D ---------- */
    async more() {
      const bottomSet = new Set(BOTTOM);
      const items = this.allowedItems().filter((i) => !bottomSet.has(i.id))
        .map((i) => ({ ico: i.icon, label: i.label, sub: '', id: i.id }));
      if (!items.length) return;
      const picked = await UI.sheet({ title: 'كل الأقسام', items });
      if (picked && picked.id) this.go(picked.id);
    },

    /* ---------- القائمة الجانبية ---------- */
    toggleSidebar() {
      const sb = document.getElementById('sidebar');
      const bd = document.getElementById('sidebar-backdrop');
      const mb = document.getElementById('btn-menu');
      sb.classList.toggle('open');
      bd.classList.toggle('show', sb.classList.contains('open'));
      if (mb) mb.classList.toggle('open', sb.classList.contains('open'));
    },
    closeSidebar() {
      if (window.innerWidth >= 1024) return;
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-backdrop').classList.remove('show');
      const mb = document.getElementById('btn-menu');
      if (mb) mb.classList.remove('open');
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
      /* حرف الأفاتار */
      const av = document.getElementById('topbar-avatar');
      if (av && window.AuthGuard && AuthGuard.user) av.textContent = H.initials(AuthGuard.user.name);
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

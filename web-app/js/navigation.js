/* =========================================================
   navigation.js — نظام التنقل — هيكل تطبيق المحطة بالضبط
   القائمة الجانبية: sidebar-link + أيقونات 3D + مجموعات np قابلة للطي
   + بحث فوري في الدرج + وضع مضغوط على الكمبيوتر (الهامبرغر)
   الشريط السفلي: bottom-tab بأيقونات PNG (6 تبويبات مباشرة — بدون المزيد مثل المحطة v2026.100)
   + أسطوانة الأخبار في القائمة العلوية (station-cylinder.js)
   ========================================================= */
'use strict';

(function () {
  if (window.__SchoolNavPro) return;
  window.__SchoolNavPro = true;

  const LS_GROUPS = 'edupro_navpro_groups_v33';
  const LS_COMPACT = 'edupro_navpro_compact_v33';

  /* ---------- خريطة التنقل (بيانات المدرسة — شكل المحطة) ---------- */
  const NAV = [
    { id: 'dashboard', icon: 'nav-home', label: 'لوحة التحكم', title: 'لوحة التحكم', standalone: true, count: null },

    { key: 'stu', label: 'شؤون الطلاب', cls: 'si-blue',
      icon: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      pages: [
        { id: 'students', icon: 'nav-students', label: 'الطلاب والتسجيل', title: 'الطلاب والتسجيل', count: () => Store.count('students') },
        { id: 'stages-classes', icon: 'nav-stages', label: 'المراحل والصفوف', title: 'المراحل والصفوف', count: () => Store.count('stages') }
      ]},

    { key: 'acd', label: 'الشؤون الأكاديمية', cls: 'si-purple',
      icon: '<svg viewBox="0 0 24 24"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>',
      pages: [
        { id: 'grades-engine', icon: 'nav-grades', label: 'رصد الدرجات', title: 'رصد الدرجات', count: null },
        { id: 'results-certificates', icon: 'nav-results', label: 'النتائج والشهادات', title: 'النتائج والشهادات', count: null }
      ]},

    { key: 'fin', label: 'المالية والمخزون', cls: 'si-green',
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      pages: [
        { id: 'finance-budget', icon: 'nav-finance', label: 'الميزانية العامة', title: 'الميزانية العامة', count: null },
        { id: 'installments', icon: 'nav-installments', label: 'الأقساط والفواتير', title: 'الأقساط والفواتير', count: () => Store.count('feeplans') },
        { id: 'store-books-uniform', icon: 'nav-store', label: 'الزي والكتب', title: 'الزي والكتب', count: () => Store.count('inventory') },
        { id: 'bus-management', icon: 'nav-bus', label: 'اشتراكات الباص', title: 'اشتراكات الباص', count: () => Store.count('busRoutes') }
      ]},

    { key: 'hr', label: 'الموظفون', cls: 'si-orange',
      icon: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
      pages: [
        { id: 'hr-employees', icon: 'nav-employees', label: 'شؤون الموظفين', title: 'شؤون الموظفين', count: () => Store.count('employees') },
        { id: 'payroll-engine', icon: 'nav-payroll', label: 'الرواتب والمستحقات', title: 'الرواتب والمستحقات', count: null }
      ]},

    { key: 'tools', label: 'الأدوات والتقارير', cls: 'si-cyan',
      icon: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
      pages: [
        { id: 'id-card-studio', icon: 'nav-cards', label: 'استوديو البطاقات', title: 'استوديو البطاقات', count: null },
        { id: 'communications', icon: 'nav-communications', label: 'تواصل أولياء الأمور', title: 'تواصل أولياء الأمور', count: null },
        { id: 'reports-center', icon: 'nav-reports', label: 'مركز التقارير', title: 'مركز التقارير', count: null }
      ]},

    { key: 'sys', label: 'النظام والإعدادات', cls: 'si-gray',
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      pages: [
        { id: 'settings-branding', icon: 'nav-settings', label: 'الإعدادات والهوية', title: 'الإعدادات والهوية', count: null },
        { id: 'print-settings', icon: 'nav-print', label: 'إعدادات الطباعة', title: 'إعدادات الطباعة', count: null },
        { id: 'themes', icon: 'nav-themes', label: 'الثيمات والمظهر', title: 'الثيمات والمظهر', count: null },
        { id: 'backup-restore', icon: 'nav-backup', label: 'النسخ الاحتياطي', title: 'النسخ الاحتياطي', count: null },
        { id: 'audit-log', icon: 'nav-audit', label: 'سجل الحركات', title: 'سجل الحركات', count: null }
      ]}
  ];

  const BOTTOM = [
    { id: 'dashboard', icon: 'nav-home', label: 'الرئيسية' },
    { id: 'students', icon: 'nav-students', label: 'الطلاب' },
    { id: 'grades-engine', icon: 'nav-grades', label: 'الدرجات' },
    { id: 'installments', icon: 'nav-installments', label: 'الأقساط' },
    { id: 'reports-center', icon: 'nav-reports', label: 'التقارير' },
    { id: 'settings-branding', icon: 'nav-settings', label: 'الإعدادات' }
  ];

  const ico = (name) => `<img class="nav-icon-3d" src="assets/icons/${name}.png" alt="" loading="lazy">`;

  function _load(key, def) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || def; } catch (e) { return def; }
  }
  function _save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  const Router = {
    NAV, BOTTOM,
    current: null,

    allItems() {
      const out = [];
      for (const g of NAV) {
        if (g.standalone) { out.push(g); continue; }
        for (const it of g.pages) out.push(it);
      }
      return out;
    },
    allowedItems() { return this.allItems().filter((i) => RBAC.can(i.id)); },
    findItem(id) { return this.allItems().find((x) => x.id === id) || null; },

    /* ---------- بناء القائمة الجانبية — بنمط المحطة بالضبط ---------- */
    buildSidebar() {
      const nav = document.getElementById('sidebarMenu');
      if (!nav) return;
      const allowed = new Set(this.allowedItems().map((i) => i.id));

      const linkHTML = (it, extra = '') => {
        const cnt = it.count ? it.count() : null;
        return `<button class="sidebar-link" data-page="${it.id}" data-title="${it.title || it.label}" data-action="nav:go" ${extra}>
          <div class="sidebar-icon-3d" style="background:transparent">${ico(it.icon)}</div>
          <span>${it.label}</span>
          ${cnt ? `<span class="sidebar-count">${H.num(cnt)}</span>` : ''}
        </button>`;
      };

      let html = '';
      const home = NAV.find((g) => g.standalone);
      if (home && allowed.has(home.id)) html += linkHTML(home);

      const state = _load(LS_GROUPS, {});
      for (const g of NAV) {
        if (g.standalone) continue;
        const items = g.pages.filter((i) => allowed.has(i.id));
        if (!items.length) continue;
        html += `
          <button type="button" class="np-group-head${state[g.key] ? ' collapsed' : ''}" data-group="${g.key}" aria-expanded="${state[g.key] ? 'false' : 'true'}">
            <span class="np-group-chip ${g.cls}">${g.icon}</span>
            <span class="np-group-title">${g.label}</span>
            <span class="np-group-count">${items.length}</span>
            <span class="np-group-arrow">▼</span>
          </button>
          <div class="np-group-body${state[g.key] ? ' collapsed' : ''}" data-group-body="${g.key}">
            ${items.map((i) => linkHTML(i)).join('')}
          </div>`;
      }

      html += `
        <div class="np-search-wrap"><span class="np-search-ico">🔍</span>
          <input type="text" id="npNavSearch" placeholder="بحث سريع في القوائم..." autocomplete="off" aria-label="بحث في القوائم">
        </div>
        <div class="np-no-results">لا توجد نتائج مطابقة</div>`;

      nav.innerHTML = html;
      nav.setAttribute('data-navpro', '1');
      this._bindGroupToggles(nav);
      this._bindSearch(nav);
    },

    _bindGroupToggles(nav) {
      nav.querySelectorAll('.np-group-head').forEach((head) => {
        const body = nav.querySelector(`.np-group-body[data-group-body="${head.dataset.group}"]`);
        if (!body) return;
        head.addEventListener('click', (e) => {
          e.stopPropagation();
          const collapsed = body.classList.toggle('collapsed');
          head.classList.toggle('collapsed', collapsed);
          head.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
          const st = _load(LS_GROUPS, {});
          st[head.dataset.group] = collapsed;
          _save(LS_GROUPS, st);
        });
      });
    },

    _bindSearch(nav) {
      const inp = nav.querySelector('#npNavSearch');
      if (!inp) return;
      inp.addEventListener('input', () => {
        const q = (inp.value || '').trim().toLowerCase();
        let anyVisible = false;
        nav.querySelectorAll('.sidebar-link').forEach((b) => {
          const title = b.getAttribute('data-title') || b.textContent || '';
          const match = !q || title.toLowerCase().includes(q);
          b.style.display = match ? '' : 'none';
          if (match) anyVisible = true;
        });
        nav.querySelectorAll('.np-group-body').forEach((body) => {
          const has = Array.prototype.some.call(body.querySelectorAll('.sidebar-link'), (b) => b.style.display !== 'none');
          const head = nav.querySelector(`.np-group-head[data-group="${body.dataset.groupBody}"]`);
          if (head) head.style.display = (q && !has) ? 'none' : '';
          if (q && has) body.classList.remove('collapsed');
        });
        const nr = nav.querySelector('.np-no-results');
        if (nr) nr.style.display = anyVisible ? 'none' : 'block';
      });
      inp.addEventListener('click', (e) => e.stopPropagation());
    },

    /* ---------- الشريط السفلي — تبويبات المحطة v2026.100 بالضبط ----------
       ستة تبويبات مباشرة بدون زر «المزيد» — كل الأقسام في القائمة الجانبية */
    buildBottomBar() {
      const bar = document.getElementById('bottomBar');
      if (!bar) return;
      const allowed = new Set(this.allowedItems().map((i) => i.id));
      const tabs = BOTTOM.filter((t) => allowed.has(t.id)).map((t) => `
        <button class="bottom-tab" data-page="${t.id}" data-action="nav:go">
          <div class="bottom-tab-icon"><img class="nav-icon-3d" src="assets/icons/${t.icon}.png" alt=""></div>
          <span>${t.label}</span>
        </button>`).join('');
      bar.innerHTML = '<div class="bottom-bar-bg"></div>' + tabs;
      bar.setAttribute('data-navpro', '1');
    },

    /* ---------- أسطوانة الأخبار (تفويض لمحرك المحطة) ---------- */
    buildTicker() {
      if (window.StationCylinder) StationCylinder.build();
    },

    /* ---------- التنقل ---------- */
    go(id, { silent = false } = {}) {
      if (!window.AuthGuard || !AuthGuard.user) {
        console.warn('[Router] محاولة تنقل بلا جلسة:', id);
        return false;
      }
      const item = this.findItem(id);
      const page = window.Pages && (Pages[id] || Pages[id.replace('-', '_')]);
      if (!page || typeof page.render !== 'function') {
        console.error('[Router] الصفحة غير مسجلة:', id);
        if (!silent) UI.toast(`الصفحة «${id}» غير متاحة`, 'error');
        return false;
      }
      if (!RBAC.can(id)) {
        if (!silent) UI.toast('ليست لديك صلاحية لهذه الصفحة', 'error');
        if (this.current === 'dashboard' || silent) return false;
        return this.go('dashboard', { silent: true });
      }
      this.current = id;
      if (window.ChartsEngine) ChartsEngine.destroyAll();
      const root = document.getElementById('page-root');
      try {
        page.render(root);
      } catch (err) {
        console.error('[Router] خطأ في عرض', id, err);
        root.innerHTML = `<div class="empty-box"><div class="empty-icon">💥</div><h3>حدث خطأ في عرض الصفحة</h3><p>${H.esc(err.message)}</p>
          <button class="btn-primary" data-action="nav:refresh">🔄 إعادة المحاولة</button></div>`;
      }
      /* تمييز العناصر النشطة — بنمط المحطة */
      document.querySelectorAll('#sidebarMenu .sidebar-link').forEach((n) => n.classList.toggle('active', n.dataset.page === id));
      document.querySelectorAll('#bottomBar .bottom-tab').forEach((n) => n.classList.toggle('active', n.dataset.page === id));
      const mb = document.getElementById('menuBtn');
      const hb = mb && mb.querySelector('.hamburger');
      if (hb) hb.classList.remove('active');
      this.buildTicker();
      document.title = `${item ? item.title || item.label : ''} — ${(Store.getSetting('schoolName')) || 'تطبيق ادارة المدرسة'}`;
      this.closeSidebar();
      try { history.replaceState(null, '', '#' + id); } catch (e) {}
      document.getElementById('mainArea').scrollTop = 0;
      window.scrollTo(0, 0);
      return true;
    },

    refresh() { if (this.current) this.go(this.current); },

    /* ---------- القائمة الجانبية (هاتف) ---------- */
    toggleSidebar() {
      const sb = document.getElementById('sidebar');
      const bd = document.getElementById('sidebarBackdrop');
      const open = !sb.classList.contains('open');
      sb.classList.toggle('open', open);
      bd.classList.toggle('open', open);
      const hb = document.querySelector('#menuBtn .hamburger');
      if (hb) hb.classList.toggle('active', open);
    },
    closeSidebar() {
      if (window.innerWidth >= 1024) return;
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarBackdrop').classList.remove('open');
      const hb = document.querySelector('#menuBtn .hamburger');
      if (hb) hb.classList.remove('active');
    },

    /* ---------- الكمبيوتر: طي/توسيع بالهامبرغر (nav-pro) ---------- */
    setupDesktopToggle() {
      const btn = document.getElementById('menuBtn');
      if (!btn || btn.dataset.np === '1') return;
      btn.dataset.np = '1';
      if (_load(LS_COMPACT, false)) document.body.classList.add('np-compact');
      btn.addEventListener('click', (e) => {
        if (!window.matchMedia('(min-width:1024px)').matches) return; /* هاتف: سلوك الدرج */
        e.stopImmediatePropagation();
        e.preventDefault();
        const compact = document.body.classList.toggle('np-compact');
        _save(LS_COMPACT, compact);
        const hb = btn.querySelector('.hamburger');
        if (hb) hb.classList.toggle('active', !compact);
      }, true);
    },

    /* ---------- تحديث بيانات الهوية ---------- */
    updateBranding() {
      const s = Store.settings();
      const logo = s.logo || 'assets/images/logo.png';
      ['topLogoMiniImg', 'sidebarLogoImg', 'login-logo', 'splash-logo'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.src = logo;
      });
      const name = s.schoolName || 'المدرسة الدولية الخاصة';
      const nm = document.getElementById('sidebarSchoolName');
      if (nm) nm.textContent = name;
      const sub = document.getElementById('sidebarSchoolSub');
      if (sub) sub.textContent = s.year || 'تطبيق ادارة المدرسة';
      const ls = document.getElementById('login-school-name');
      if (ls) ls.textContent = name;
      /* حرف الأفاتار */
      if (window.AuthGuard && AuthGuard.user) {
        const letter = H.initials(AuthGuard.user.name);
        const av = document.getElementById('avatarLetter');
        if (av) av.textContent = letter;
        const dav = document.getElementById('dropAvatarLetter');
        if (dav) dav.textContent = letter;
        const sav = document.getElementById('sidebar-avatar');
        if (sav) sav.textContent = letter;
        const dn = document.getElementById('dropName');
        if (dn) dn.textContent = AuthGuard.user.name || 'مدير النظام';
        const dr = document.getElementById('dropRole');
        if (dr) dr.textContent = AuthGuard.roleLabel(AuthGuard.user.role);
        const su = document.getElementById('sidebar-username');
        if (su) su.textContent = AuthGuard.user.name;
        const sr = document.getElementById('sidebar-role');
        if (sr) sr.textContent = AuthGuard.roleLabel(AuthGuard.user.role);
      }
    }
  };

  Actions.register('nav', {
    go(ds) { if (ds && ds.page) Router.go(ds.page); },
    refresh() { Router.refresh(); }
  });

  window.Router = Router;
})();

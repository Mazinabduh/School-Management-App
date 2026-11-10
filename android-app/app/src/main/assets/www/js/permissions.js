/* =========================================================
   permissions.js — صلاحيات المستخدمين (RBAC)
   admin=الكل | accountant=المال | registrar=الطلاب | teacher=الأكاديمي | viewer=قراءة
   ========================================================= */
'use strict';

(function () {
  const RBAC = {
    /* صفحات يمكن لكل دور الوصول إليها */
    ACCESS: {
      admin: '*',
      accountant: ['dashboard', 'students', 'installments', 'finance-budget', 'store-books-uniform',
        'bus-management', 'hr-employees', 'payroll-engine', 'reports-center', 'audit-log', 'backup-restore'],
      registrar: ['dashboard', 'students', 'stages-classes', 'grades-engine', 'results-certificates',
        'id-card-studio', 'communications', 'reports-center'],
      teacher: ['dashboard', 'grades-engine', 'results-certificates'],
      viewer: ['dashboard', 'reports-center']
    },

    can(pageId) {
      const u = window.AuthGuard && AuthGuard.user;
      if (!u) return false;
      const acc = this.ACCESS[u.role];
      if (acc === '*') return true;
      return (acc || []).includes(pageId);
    },

    readOnly() {
      const u = AuthGuard.user;
      return !!u && u.role === 'viewer';
    },

    /* زر كتابة مخفي تلقائياً للمشاهد */
    W() { return this.readOnly() ? 'hidden' : ''; },

    init() {
      const u = AuthGuard.user;
      if (!u) return;
      document.body.dataset.role = u.role;
      /* المشاهد: إخفاء كل أزرار الإضافة/الحفظ/الحذف */
      if (!document.getElementById('rbac-style')) {
        const st = document.createElement('style');
        st.id = 'rbac-style';
        st.textContent = 'body[data-role="viewer"] .btn-write, body[data-role="teacher"] .btn-finance-write { display:none !important; }';
        document.head.appendChild(st);
      }
    },

    guard(pageId) {
      if (this.can(pageId)) return true;
      UI.toast('ليست لديك صلاحية الوصول لهذه الصفحة', 'error');
      Router.go('dashboard');
      return false;
    }
  };

  window.RBAC = RBAC;
})();

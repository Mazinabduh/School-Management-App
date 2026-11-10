/* =========================================================
   audit-log.js — سجل حركات المستخدمين (الأمان)
   ========================================================= */
'use strict';

(function () {
  const state = { type: '', q: '' };

  function typeOf(action) {
    if (action.includes('حذف') || action.includes('إلغاء')) return 'حذف';
    if (action.includes('إضافة') || action.includes('تسجيل') || action.includes('توليد') || action.includes('بناء')) return 'إضافة';
    if (action.includes('تعديل') || action.includes('تحديث') || action.includes('تغيير')) return 'تعديل';
    if (action.includes('دخول')) return 'دخول';
    if (action.includes('خروج')) return 'خروج';
    if (action.includes('تصدير') || action.includes('نسخة')) return 'نسخ';
    return 'حدث';
  }

  const Audit = {
    log(action, detail = '') {
      try {
        const u = (window.AuthGuard && AuthGuard.user) || {};
        Store.col('audit').push({
          time: new Date().toISOString(),
          user: u.name || '—',
          role: u.role || '',
          action, detail,
          type: typeOf(action)
        });
        if (Store.col('audit').length > 500) Store.setCol('audit', Store.col('audit').slice(-400));
        Store._mark('audit');
      } catch (e) { console.warn('[Audit]', e); }
    }
  };
  window.Audit = Audit;

  const P = {
    id: 'audit-log',
    render(root) {
      const list = this.filtered();
      const types = H.unique(Store.col('audit').map((a) => a.type));
      root.innerHTML = `<div class="page">
        ${UI.pageHead('🛡️ سجل حركات المستخدمين', `
          <button class="btn btn-ghost" data-action="audit:excel">📊 Excel</button>
          <button class="btn btn-danger-soft btn-write" data-action="audit:clear">🗑️ تفريغ السجل</button>
        `, `${H.num(Store.count('audit'))} حركة مسجلة — آخر 500 حركة تُحفظ`)}
        <div class="table-toolbar">
          <div class="search-box"><input type="search" placeholder="بحث في السجل…" value="${H.esc(state.q)}" data-input="audit:search"></div>
          <select data-input="audit:ftype" style="max-width:160px">
            <option value="">كل الأنواع</option>
            ${types.map((t) => `<option value="${t}" ${state.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>الوقت</th><th>المستخدم</th><th>النوع</th><th>الإجراء</th><th>التفاصيل</th></tr></thead>
          <tbody>
            ${list.length ? list.slice().reverse().map((a) => `<tr>
              <td class="num" style="white-space:nowrap">${H.fmtDateTime(a.time)}</td>
              <td style="font-weight:700">${H.esc(a.user)}</td>
              <td>${UI.badge(a.type, a.type === 'حذف' ? 'badge-danger' : a.type === 'إضافة' ? 'badge-success' : a.type === 'دخول' ? 'badge-info' : 'badge-muted')}</td>
              <td>${H.esc(a.action)}</td>
              <td class="muted">${H.esc(a.detail || '')}</td>
            </tr>`).join('') : `<tr><td colspan="5">${UI.empty('🛡️', 'السجل فارغ')}</td></tr>`}
          </tbody>
        </table></div>
      </div>`;
    },
    filtered() {
      return Store.col('audit').filter((a) =>
        (!state.type || a.type === state.type) &&
        (!state.q || (a.action + ' ' + (a.detail || '') + ' ' + a.user).includes(state.q)));
    }
  };

  Actions.register('audit', {
    search(el, val) { state.q = val || ''; P.render(document.getElementById('page-root')); const i = document.querySelector('.table-toolbar input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
    ftype(el, val) { state.type = val; P.render(document.getElementById('page-root')); },
    excel() {
      const rows = P.filtered().map((a, i) => ({ '#': i + 1, 'الوقت': H.fmtDateTime(a.time), 'المستخدم': a.user, 'النوع': a.type, 'الإجراء': a.action, 'التفاصيل': a.detail || '' }));
      if (window.OfficeExport) OfficeExport.excel('سجل-الحركات.xlsx', 'السجل', rows);
    },
    async clear() {
      if (!AuthGuard.isAdmin()) return UI.toast('للمدير فقط', 'error');
      if (!await UI.confirm({ title: 'تفريغ السجل', msg: 'حذف كل حركات السجل نهائياً؟', okLabel: 'تفريغ', danger: true })) return;
      Store.setCol('audit', []);
      Audit.log('حذف', 'تفريغ سجل الحركات');
      Router.refresh();
    }
  });

  window.Pages = window.Pages || {};
  Pages['audit-log'] = P;
})();

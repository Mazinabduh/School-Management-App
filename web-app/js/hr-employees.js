/* =========================================================
   hr-employees.js — المدرسون، الموظفون، والعمال (تخصصاتهم ومستحقاتهم)
   ========================================================= */
'use strict';

(function () {
  let kind = '';

  const KINDS = [
    { id: 'teacher', label: 'مدرّس', ico: '👨‍🏫', color: 'ic-green', hex: '#16a34a' },
    { id: 'admin', label: 'إداري', ico: '🧑‍💼', color: 'ic-orange', hex: '#ea580c' },
    { id: 'worker', label: 'عامل', ico: '🧑‍🔧', color: 'ic-slate', hex: '#475569' },
    { id: 'bus', label: 'طاقم باص', ico: '🚌', color: 'ic-indigo', hex: '#4f46e5' }
  ];

  function kindMeta(k) { return KINDS.find((x) => x.id === k) || { label: k, ico: '👤', color: 'ic-blue' }; }

  const P = {
    id: 'hr-employees',

    render(root) {
      const emps = Store.sortBy(Store.col('employees').filter((e) => !kind || e.empKind === kind), 'name');
      root.innerHTML = `<div class="page">
        ${UI.pageHead('👥 شؤون الموظفين', `
          <button class="btn btn-primary btn-write" data-action="hr:add">➕ إضافة موظف</button>
        `, `${H.num(Store.count('employees'))} موظف — التخصص والراتب والمستحقات`)}
        <div class="tabs">
          <button class="tab ${!kind ? 'active' : ''}" data-action="hr:kind" data-k="">الكل (${Store.count('employees')})</button>
          ${KINDS.map((k) => `<button class="tab ${kind === k.id ? 'active' : ''}" data-action="hr:kind" data-k="${k.id}">${k.ico} ${k.label} (${Store.count('employees', (e) => e.empKind === k.id)})</button>`).join('')}
        </div>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">
          ${emps.length ? emps.map((e) => {
            const km = kindMeta(e.empKind);
            return `<div class="emp-card" data-action="hr:view" data-id="${e.id}">
              <span class="e-ava" style="--ec:${km.hex || '#0091ea'}">${km.ico}</span>
              <div class="e-info">
                <b>${H.esc(e.name)}</b>
                <small>${H.esc(e.job || km.label)}${e.specialization ? ' • ' + H.esc(e.specialization) : ''}</small>
                <small class="money text-success">الراتب: ${H.money(e.basicSalary || 0)}</small>
              </div>
              ${e.status === 'inactive' ? UI.badge('موقوف', 'badge-danger') : UI.badge('نشط', 'badge-success')}
            </div>`;
          }).join('') : UI.empty('👥', 'لا موظفين في هذه الفئة', '<button class="btn btn-primary" data-action="hr:add">➕ إضافة موظف</button>')}
        </div>
      </div>`;
    },

    async form(v) {
      const d = await UI.form(v ? 'تعديل موظف' : '➕ موظف جديد', [
        { name: 'name', label: 'الاسم الكامل', req: true, value: v && v.name },
        { name: 'empKind', label: 'الفئة', type: 'select', req: true, options: KINDS.map((k) => ({ v: k.id, t: `${k.ico} ${k.label}` })), value: (v && v.empKind) || 'teacher' },
        { name: 'job', label: 'الوظيفة', value: v && v.job, hint: 'مثال: مدرس رياضيات، محاسب، أمين مكتبة' },
        { name: 'specialization', label: 'التخصص', value: v && v.specialization, hint: 'مثال: بكالوريوس رياضيات، دبلوم حاسوب' },
        { name: 'phone', label: 'الهاتف', type: 'tel', value: v && v.phone },
        { name: 'hireDate', label: 'تاريخ التعيين', type: 'date', value: v && v.hireDate },
        { name: 'basicSalary', label: 'الراتب الأساسي', type: 'number', req: true, min: 0, value: (v && v.basicSalary) || 0 },
        { name: 'allowances', label: 'بدلات ثابتة شهرية', type: 'number', min: 0, value: (v && v.allowances) || 0 },
        { name: 'status', label: 'الحالة', type: 'select', options: [{ v: 'active', t: 'نشط' }, { v: 'inactive', t: 'موقوف' }], value: (v && v.status) || 'active' },
        { name: 'photo', label: 'صورة الموظف', type: 'photo', value: v && v.photo },
        { name: 'notes', label: 'ملاحظات', type: 'textarea', value: v && v.notes, span: true }
      ]);
      if (!d) return;
      Store.put('employees', v ? Object.assign({}, v, d) : Object.assign(d, { status: d.status || 'active' }));
      Audit.log(v ? 'تعديل' : 'إضافة', `موظف: ${d.name}`);
      Router.refresh();
    },

    view(id) {
      const e = Store.get('employees', id);
      if (!e) return;
      const km = kindMeta(e.empKind);
      /* سجل الرواتب المصروفة */
      const pays = [];
      for (const run of Store.col('payrollRuns'))
        for (const ln of run.lines || [])
          if (ln.empId === id && ln.paid) pays.push({ month: run.month, ...ln });
      const totalPaid = H.sum(pays, (x) => x.net);
      UI.modal({
        title: `ملف: ${H.esc(e.name)}`,
        body: `
          <div class="profile-head">
            <img class="p-photo" src="${e.photo || 'assets/images/default-avatar.png'}" alt="">
            <div>
              <h3>${H.esc(e.name)}</h3>
              <div class="p-meta">
                <span class="hero-chip">${km.ico} ${H.esc(e.job || km.label)}</span>
                ${e.specialization ? `<span class="hero-chip">🎓 ${H.esc(e.specialization)}</span>` : ''}
                <span class="hero-chip">💰 ${H.money(e.basicSalary || 0)}</span>
              </div>
            </div>
          </div>
          <div class="kv-grid mt-16">
            <div class="kv"><small>الهاتف</small><b class="num">${H.esc(e.phone || '—')}</b></div>
            <div class="kv"><small>تاريخ التعيين</small><b>${H.fmtDate(e.hireDate)}</b></div>
            <div class="kv"><small>بدلات ثابتة</small><b class="money">${H.money(e.allowances || 0)}</b></div>
            <div class="kv"><small>إجمالي المصروف حتى الآن</small><b class="money text-success">${H.money(totalPaid)}</b></div>
          </div>
          ${pays.length ? `<div class="card-title mt-16" style="font-size:14px">💵 سجل الرواتب المصروفة</div>
            <div class="table-wrap"><table class="data-table" style="min-width:0">
              <thead><tr><th>الشهر</th><th>الصافي</th><th>التاريخ</th></tr></thead>
              <tbody>${pays.slice(-8).reverse().map((x) => `<tr><td>${H.esc(x.month)}</td><td class="money">${H.money(x.net)}</td><td>${H.fmtDate(x.date)}</td></tr>`).join('')}</tbody>
            </table></div>` : ''}`,
        foot: [
          { label: '✏️ تعديل', cls: 'btn-soft', onClick: (h) => { h.close(); this.form(e); } },
          { label: '💵 صرف راتب', cls: 'btn-gold', onClick: (h) => { h.close(); if (Pages['payroll-engine']) Pages['payroll-engine'].quickPay(id); } },
          { label: '🗑️ حذف', cls: 'btn-danger-soft', onClick: async (h) => {
              h.close();
              if (!await UI.confirm({ title: 'حذف موظف', msg: `حذف «${H.esc(e.name)}» نهائياً؟`, okLabel: 'حذف', danger: true })) return;
              Store.del('employees', id);
              Audit.log('حذف', `حذف موظف: ${e.name}`);
              Router.refresh();
            } }
        ]
      });
    }
  };

  Actions.register('hr', {
    add() { if (RBAC.readOnly()) return; P.form(null); },
    kind(ds) { kind = ds.k; P.render(document.getElementById('page-root')); },
    view(ds) { P.view(ds.id); },
    edit(ds) { P.form(Store.get('employees', ds.id)); }
  });

  window.Pages = window.Pages || {};
  Pages['hr-employees'] = P;
})();

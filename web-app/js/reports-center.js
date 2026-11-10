/* =========================================================
   reports-center.js — مركز التقارير المالية والأكاديمية الشامل
   ========================================================= */
'use strict';

(function () {
  let current = null;

  const REPORTS = [
    { id: 'students', ico: '👨‍🎓', label: 'تقرير الطلاب حسب المراحل والصفوف', color: 'ic-blue' },
    { id: 'due', ico: '⏳', label: 'تقرير المتأخرات المالية', color: 'ic-rose' },
    { id: 'finance', ico: '💰', label: 'تقرير الميزانية الشهري', color: 'ic-green' },
    { id: 'payroll', ico: '💵', label: 'تقرير الرواتب المصروفة', color: 'ic-teal' },
    { id: 'inventory', ico: '📦', label: 'تقرير المخزون وحركة الزي والكتب', color: 'ic-orange' },
    { id: 'bus', ico: '🚌', label: 'تقرير اشتراكات الباص', color: 'ic-indigo' },
    { id: 'grades', ico: '📊', label: 'تقرير ملخص الدرجات لصف', color: 'ic-purple' },
    { id: 'audit', ico: '🛡️', label: 'تقرير سجل الحركات', color: 'ic-slate' }
  ];

  const P = {
    id: 'reports-center',

    render(root) {
      if (!current) {
        root.innerHTML = `<div class="page">
          ${UI.pageHead('📊 مركز التقارير', '', 'اختر تقريراً لعرضه مع خيارات الطباعة وPDF وExcel')}
          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">
            ${REPORTS.map((r) => `
              <div class="report-tile" data-action="rep:open" data-id="${r.id}">
                <span class="icon3d ${r.color}">${r.ico}</span>
                <b>${r.label}</b>
              </div>`).join('')}
          </div>
        </div>`;
        return;
      }
      const def = REPORTS.find((r) => r.id === current);
      root.innerHTML = `<div class="page">
        ${UI.pageHead(`📊 ${def.label}`, `
          <button class="btn btn-ghost" data-action="rep:back">◂ كل التقارير</button>
          <button class="btn btn-primary" data-action="rep:print">🖨️ طباعة</button>
          <button class="btn btn-gold" data-action="rep:pdf">📄 PDF</button>
          <button class="btn btn-ghost" data-action="rep:excel">📊 Excel</button>
        `)}
        <div id="rep-body">${this.bodyHTML(current)}</div>
      </div>`;
    },

    bodyHTML(id) {
      /* كل تقرير يعيد {title, headers[], rows[][], foot} */
      const d = this.data(id);
      if (!d) return UI.empty('📊', 'لا بيانات لهذا التقرير بعد');
      return `<div class="report-sum">
          <span class="rs-box">عدد السطور: <b>${d.rows.length}</b></span>
          ${d.foot ? `<span class="rs-box">${d.foot}</span>` : ''}
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr>${d.headers.map((h, i) => `<th ${i === 0 || i === 1 ? 'style="text-align:right"' : ''}>${h}</th>`).join('')}</tr></thead>
          <tbody>${d.rows.map((r) => `<tr>${r.map((c, i) => `<td ${i <= 1 ? 'style="text-align:right"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`;
    },

    data(id) {
      const money = (n) => H.money(n);
      if (id === 'students') {
        const rows = [];
        for (const st of Store.sortBy(Store.col('stages'), 'order'))
          for (const c of Store.col('classes').filter((x) => x.stageId === st.id)) {
            const n = Store.count('students', (s) => s.classId === c.id && s.status !== 'withdrawn');
            if (n) rows.push([st.name, c.name, String(n), String(Store.count('students', (s) => s.classId === c.id && s.gender === 'm')), String(Store.count('students', (s) => s.classId === c.id && s.gender === 'f'))]);
          }
        return { title: 'الطلاب حسب المراحل والصفوف', headers: ['المرحلة', 'الصف', 'العدد', 'ذكور', 'إناث'], rows, foot: `الإجمالي: ${H.num(Store.count('students', (s) => s.status !== 'withdrawn'))} طالب` };
      }
      if (id === 'due') {
        const rows = [];
        for (const s of Store.col('students')) {
          const p = Store.find('feeplans', (x) => x.studentId === s.id);
          const late = (p ? p.items : []).filter((i) => !i.paid);
          late.forEach((i) => rows.push([s.name, s.sid || '', (Store.get('classes', s.classId) || {}).name || '', i.label, money(i.amount), H.fmtDate(i.due), i.due < H.today() ? '⚠️ متأخر' : '']));
        }
        return { title: 'المتأخرات المالية', headers: ['الطالب', 'الرقم', 'الصف', 'البند', 'المبلغ', 'الاستحقاق', 'الحالة'], rows, foot: `الإجمالي: ${money(H.sum(rows, (r) => parseFloat(r[4].replace(/[^\d.]/g, '')) || 0))}` };
      }
      if (id === 'finance') {
        const g = H.groupBy(Store.col('transactions'), (t) => H.monthKey(t.date));
        const rows = Object.keys(g).sort().map((m) => {
          const inc = H.sum(g[m].filter((t) => t.type === 'income'), (t) => t.amount);
          const exp = H.sum(g[m].filter((t) => t.type === 'expense'), (t) => t.amount);
          return [H.arMonth(m) + ' ' + m.slice(0, 4), money(inc), money(exp), money(inc - exp), String(g[m].length)];
        });
        return { title: 'الميزانية الشهرية', headers: ['الشهر', 'الإيرادات', 'المصروفات', 'الصافي', 'الحركات'], rows };
      }
      if (id === 'payroll') {
        const rows = [];
        for (const run of Store.sortBy(Store.col('payrollRuns'), 'month'))
          (run.lines || []).filter((l) => l.paid).forEach((l) => rows.push([run.month, l.name, (Store.get('employees', l.empId) || {}).job || '', money(l.basic), money(l.bonus || 0), money(l.deductions || 0), money(l.advance || 0), money(l.net || (l.basic + (l.allowances || 0) + (l.bonus || 0) - (l.deductions || 0) - (l.advance || 0)))]));
        return { title: 'الرواتب المصروفة', headers: ['الشهر', 'الموظف', 'الوظيفة', 'الأساسي', 'مكافأة', 'خصم', 'سلفة', 'الصافي'], rows };
      }
      if (id === 'inventory') {
        const rows = Store.col('inventory').map((i) => [i.name, i.kind === 'book' ? 'كتاب' : 'زي', String(i.qty), money(i.price), money(i.cost), money(i.qty * (i.price || 0))]);
        return { title: 'المخزون الحالي', headers: ['الصنف', 'النوع', 'الكمية', 'سعر البيع', 'التكلفة', 'قيمة المخزون'], rows };
      }
      if (id === 'bus') {
        const rows = Store.col('busSubs').filter((b) => b.status === 'active').map((b) => {
          const s = Store.get('students', b.studentId) || {};
          const r = Store.get('busRoutes', b.routeId) || {};
          const p = Store.find('feeplans', (x) => x.studentId === b.studentId);
          const items = (p ? p.items : []).filter((i) => (b.itemIds || []).includes(i.id));
          return [s.name || '', s.sid || '', r.name || '', money(b.monthlyFee), String(b.months), money(H.sum(items, (i) => i.amount)), money(H.sum(items.filter((i) => i.paid), (i) => i.amount))];
        });
        return { title: 'اشتراكات الباص النشطة', headers: ['الطالب', 'الرقم', 'الخط', 'الشهري', 'الأشهر', 'الإجمالي', 'المسدد'], rows };
      }
      if (id === 'grades') {
        const grades = Store.col('grades');
        const rows = [];
        for (const g of grades) {
          const sub = (Store.get('subjects', g.subjectId) || {}).name || '';
          const cls = (Store.get('classes', g.classId) || {}).name || '';
          const entries = Object.values(g.entries || {}).filter((e) => Object.keys(e).length);
          const mx = Store.getSetting('gradeMax', 100);
          const avg = entries.length ? Math.round((H.sum(entries, (e) => H.sum(Object.values(e))) / entries.length) / mx * 1000) / 10 : 0;
          rows.push([cls, sub, g.term === 't1' ? 'ترم 1' : 'ترم 2', String(entries.length), avg + '%', H.gradeInfo(avg).label]);
        }
        return { title: 'ملخص الدرجات المرصودة', headers: ['الصف', 'المادة', 'الترم', 'عدد المرصودين', 'المعدل', 'التقدير'], rows };
      }
      if (id === 'audit') {
        const rows = Store.sortBy(Store.col('audit'), 'time').slice(-300).reverse().map((a) => [H.fmtDateTime(a.time), a.user || '', a.action || '', a.detail || '']);
        return { title: 'سجل حركات المستخدمين', headers: ['الوقت', 'المستخدم', 'الإجراء', 'التفاصيل'], rows };
      }
      return null;
    },

    /* حصول على نسخة نصية للطباعة/الإكسل */
    plain(id) {
      const d = this.data(id);
      if (!d) return null;
      return {
        ...d,
        rows: d.rows.map((r) => r.map((c) => String(c).replace(/<[^>]*>/g, '')))
      };
    }
  };

  Actions.register('rep', {
    open(ds) { current = ds.id; P.render(document.getElementById('page-root')); },
    back() { current = null; P.render(document.getElementById('page-root')); },
    print() {
      const d = P.plain(current);
      if (!d) return;
      ReportIntl.preview(ReportIntl.genericTableHTML(d.title, d.headers, d.rows, d.foot || ''), { title: d.title, orientation: d.rows.length && d.headers.length > 5 ? 'landscape' : 'portrait' });
    },
    pdf() {
      const d = P.plain(current);
      if (!d || !window.PDFEnterprise) return;
      PDFEnterprise.download(ReportIntl.genericTableHTML(d.title, d.headers, d.rows, d.foot || ''), `${d.title}.pdf`, d.headers.length > 5 ? 'landscape' : 'portrait');
    },
    excel() {
      const d = P.plain(current);
      if (!d || !window.OfficeExport) return;
      const rows = d.rows.map((r) => Object.fromEntries(d.headers.map((h, i) => [h, r[i]])));
      OfficeExport.excel(`${d.title}.xlsx`, 'تقرير', rows);
    }
  });

  window.Pages = window.Pages || {};
  Pages['reports-center'] = P;
})();

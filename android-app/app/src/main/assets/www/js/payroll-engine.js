/* =========================================================
   payroll-engine.js — محرك الرواتب والمستحقات والخصومات
   مسير شهري لكل الموظفين + سندات صرف فردية مرتبطة بالميزانية
   ========================================================= */
'use strict';

(function () {
  const state = { month: H.monthKey() };

  function runOf(month) { return Store.find('payrollRuns', (r) => r.month === month); }
  function netOf(ln) { return H.round2((ln.basic || 0) + (ln.allowances || 0) + (ln.bonus || 0) - (ln.deductions || 0) - (ln.advance || 0)); }
  function catFor(emp) { return emp && emp.empKind === 'bus' ? 'bus-sal' : 'salaries'; }

  const P = {
    id: 'payroll-engine',

    render(root) {
      const emps = Store.col('employees').filter((e) => e.status !== 'inactive');
      const run = runOf(state.month);
      const months = H.unique([...Store.col('payrollRuns').map((r) => r.month), H.monthKey()]).sort().reverse();

      root.innerHTML = `<div class="page">
        ${UI.pageHead('💵 الرواتب والمستحقات', `
          <select data-input="pay:selMonth" style="max-width:170px">
            ${months.map((m) => `<option value="${m}" ${state.month === m ? 'selected' : ''}>${H.arMonth(m)} ${m.slice(0, 4)}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-write" data-action="pay:build">⚙️ بناء مسير ${H.arMonth(state.month)}</button>
          ${run ? `
            <button class="btn btn-ghost" data-action="pay:printRun">🖨️ طباعة المسير</button>
            <button class="btn btn-ghost" data-action="pay:excelRun">📊 Excel</button>` : ''}
        `, 'الصرف يُرحّل تلقائياً مصروفاً في ميزانية المدرسة ويُقيّد بحساب الموظف')}

        ${run ? this.runHTML(run) : UI.empty('💵', `لم يُبنَ مسير رواتب لشهر ${H.arMonth(state.month)} — اضغط «بناء مسير»`,
          `<button class="btn btn-primary btn-write" data-action="pay:build">⚙️ بناء مسير (${emps.length} موظف نشط)</button>`)}
      </div>`;
    },

    runHTML(run) {
      const total = H.sum(run.lines, (x) => x.paid ? 0 : 0) || 0;
      const totalNet = H.sum(run.lines, netOf);
      const paidTotal = H.sum(run.lines.filter((x) => x.paid), netOf);
      return `<div class="payslip-run">
        <div class="pr-head">
          <b>📋 مسير رواتب ${H.arMonth(run.month)} ${run.month.slice(0, 4)}</b>
          <span>إجمالي المستحق: <b class="money">${H.money(totalNet)}</b> • المصروف: <b class="money text-success">${H.money(paidTotal)}</b> • المتبقي: <b class="money" style="color:#ffd6d6">${H.money(totalNet - paidTotal)}</b></span>
        </div>
        <div class="table-wrap" style="border:0;box-shadow:none">
          <table class="data-table">
            <thead><tr><th>الموظف</th><th>الأساسي</th><th>البدلات</th><th>مكافأة</th><th>خصومات</th><th>سلفة</th><th>الصافي</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              ${run.lines.map((ln, i) => {
                const e = Store.get('employees', ln.empId) || { name: ln.name };
                return `<tr>
                  <td style="font-weight:800">${H.esc(ln.name)}<br><small class="muted">${H.esc(e.job || '')}</small></td>
                  <td class="money">${H.num(ln.basic)}</td>
                  <td class="money">${H.num(ln.allowances)}</td>
                  <td><input type="number" class="gm-input" style="width:70px" value="${ln.bonus || 0}" data-input="pay:cell" data-i="${i}" data-k="bonus"></td>
                  <td><input type="number" class="gm-input" style="width:70px" value="${ln.deductions || 0}" data-input="pay:cell" data-i="${i}" data-k="deductions"></td>
                  <td><input type="number" class="gm-input" style="width:70px" value="${ln.advance || 0}" data-input="pay:cell" data-i="${i}" data-k="advance"></td>
                  <td class="money" style="font-weight:900;color:var(--primary)" data-net="${i}">${H.num(netOf(ln))}</td>
                  <td>${ln.paid ? UI.badge('مصروف ✓', 'badge-success') : UI.badge('معلق', 'badge-warn')}</td>
                  <td class="row-actions">
                    ${!ln.paid ? `<button class="btn btn-gold btn-sm btn-write" data-action="pay:payLine" data-i="${i}">💵 صرف</button>` : `<small class="muted">${H.fmtDate(ln.date)}</small>`}
                    <button class="icon-btn" data-action="pay:slip" data-i="${i}" title="قسيمة راتب">🧾</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot><tr><td colspan="6">الإجمالي</td><td colspan="3" class="money">${H.money(totalNet)}</td></tr></tfoot>
          </table>
        </div>
      </div>`;
    },

    build() {
      const emps = Store.col('employees').filter((e) => e.status !== 'inactive');
      if (!emps.length) return UI.toast('أضف موظفين أولاً من «شؤون الموظفين»', 'warn');
      let run = runOf(state.month);
      if (!run) {
        run = Store.put('payrollRuns', { month: state.month, lines: [], closed: false });
      }
      /* إضافة الموظفين الجدد فقط (لا يمس المدفوع) */
      emps.forEach((e) => {
        if (!run.lines.find((ln) => ln.empId === e.id)) {
          run.lines.push({
            empId: e.id, name: e.name,
            basic: e.basicSalary || 0, allowances: e.allowances || 0,
            bonus: 0, deductions: 0, advance: 0, paid: false
          });
        }
      });
      /* إزالة الموظفين غير المصرح لهم وغير المدفوعين */
      run.lines = run.lines.filter((ln) => ln.paid || emps.find((e) => e.id === ln.empId));
      Store.put('payrollRuns', run);
      Audit.log('إضافة', `بناء مسير رواتب ${state.month} (${run.lines.length} سطر)`);
      UI.toast('تم بناء المسير — عدّل المكافآت والخصومات ثم اصرف', 'success');
      Router.refresh();
    },

    cell(el, val) {
      const run = runOf(state.month);
      if (!run) return;
      const ln = run.lines[+el.dataset.i];
      if (!ln || ln.paid) { UI.toast('هذا السطر مصروف — لا يمكن تعديله', 'warn'); Router.refresh(); return; }
      ln[el.dataset.k] = parseFloat(val) || 0;
      Store.put('payrollRuns', run);
      const netEl = document.querySelector(`[data-net="${el.dataset.i}"]`);
      if (netEl) netEl.textContent = H.num(netOf(ln));
    },

    /* ---------- صرف سطر ---------- */
    async payLine(ds) {
      const run = runOf(state.month);
      const ln = run && run.lines[+ds.i];
      if (!ln || ln.paid) return;
      await this.doPay(run, ln);
    },

    /* ---------- صرف سريع لموظف (من ملفه أو الباص) ---------- */
    async quickPay(empId) {
      const e = Store.get('employees', empId);
      if (!e) return;
      const d = await UI.form(`💵 صرف راتب: ${e.name}`, [
        { name: 'month', label: 'شهر الراتب', value: H.monthKey(), hint: 'صيغة 2026-02' },
        { name: 'bonus', label: 'مكافآت إضافية', type: 'number', min: 0, value: 0 },
        { name: 'deductions', label: 'خصومات', type: 'number', min: 0, value: 0 },
        { name: 'advance', label: 'سلفة تُخصم', type: 'number', min: 0, value: 0 }
      ]);
      if (!d) return;
      let run = runOf(d.month) || Store.put('payrollRuns', { month: d.month, lines: [] });
      let ln = run.lines.find((x) => x.empId === empId);
      if (!ln) {
        ln = { empId, name: e.name, basic: e.basicSalary || 0, allowances: e.allowances || 0, bonus: 0, deductions: 0, advance: 0, paid: false };
        run.lines.push(ln);
      }
      ln.bonus = d.bonus; ln.deductions = d.deductions; ln.advance = d.advance;
      Store.put('payrollRuns', run);
      await this.doPay(run, ln);
    },

    async doPay(run, ln) {
      const e = Store.get('employees', ln.empId) || { name: ln.name, empKind: 'admin' };
      const net = netOf(ln);
      if (net <= 0) return UI.toast('الصافي صفر — راجع البنود', 'warn');
      if (!await UI.confirm({
        title: 'تأكيد صرف الراتب',
        msg: `صرف <b>${H.money(net)}</b> للموظف <b>${H.esc(ln.name)}</b> عن ${H.arMonth(run.month)}؟<br>سيُرحّل مصروفاً في الميزانية (${Fin.catLabel('expense', catFor(e))}).`,
        okLabel: 'صرف'
      })) return;
      const ref = `PAY-${run.month}-${ln.empId}`;
      Fin.removeByRef(ref);   /* منع ازدواج الترحيل */
      Fin.post('expense', catFor(e), net, { ref, refId: ref, note: `راتب ${H.arMonth(run.month)} — ${ln.name}` });
      ln.paid = true;
      ln.date = H.today();
      ln.ref = ref;
      Store.put('payrollRuns', run);
      Audit.log('إضافة', `صرف راتب ${ln.name} — ${H.money(net)} (${run.month})`);
      UI.toast(`تم الصرف والترحيل: ${H.money(net)} ✓`, 'success');
      Router.refresh();
    },

    slip(ds) {
      const run = runOf(state.month);
      const ln = run && run.lines[+ds.i];
      if (!ln) return;
      if (window.Receipt) Receipt.payslip({ run, ln, emp: Store.get('employees', ln.empId) || { name: ln.name } });
    },

    printRun() {
      const run = runOf(state.month);
      if (!run || !run.lines.length) return;
      const st = Store.settings();
      const totalNet = H.sum(run.lines, netOf);
      const totalBasic = H.sum(run.lines, (l) => l.basic || 0);
      const totalDed = H.sum(run.lines, (l) => (l.deductions || 0) + (l.advance || 0));
      const rows = run.lines.map((ln, i) => {
        const e = Store.get('employees', ln.empId) || {};
        return [i + 1, ln.name, e.job || '', H.num(ln.basic), H.num(ln.allowances), H.num(ln.bonus), H.num(ln.deductions), H.num(ln.advance), H.num(netOf(ln)), ln.paid ? 'مصروف' : 'معلق'];
      });
      /* مستيل المحطة — تقرير المؤسسة الموحد (PrintProV2026) */
      if (window.PrintProV2026) {
        const html = PrintProV2026.reportHTML({
          title: 'مسير رواتب الموظفين',
          subtitle: `${H.arMonth(run.month)} ${run.month.slice(0, 4)}`,
          kpis: [
            { label: 'عدد الموظفين', value: H.num(run.lines.length) },
            { label: 'إجمالي الأساسي', value: H.money(totalBasic) },
            { label: 'إجمالي الخصومات والسلف', value: H.money(totalDed) },
            { label: 'صافي المسير', value: H.money(totalNet) }
          ],
          sections: [{ icon: '💵', title: 'تفاصيل الرواتب', columns: ['#', 'الاسم', 'الوظيفة', 'الأساسي', 'البدلات', 'مكافأة', 'خصم', 'سلفة', 'الصافي', 'الحالة'], rows }]
        });
        return ReportIntl.preview(html, { title: 'مسير الرواتب', orientation: 'landscape' });
      }
      /* احتياط قديم */
      const rowsHtml = rows.map((r) => `<tr>${r.map((c, i) => `<td ${i === 1 ? 'style="text-align:right"' : ''}>${H.esc(c)}</td>`).join('')}</tr>`).join('');
      const html = `
      <div class="print-doc intl-doc">
        <div class="pd-page">
          <div class="pd-head">
            <img src="${st.logo || 'assets/images/logo.png'}" alt="">
            <div style="flex:1"><b>${H.esc(st.schoolName || '')}</b><small>${H.esc(st.schoolNameEn || '')}</small></div>
            <div style="text-align:left;font-size:11px">شهر: <b>${H.arMonth(run.month)} ${run.month.slice(0, 4)}</b></div>
          </div>
          <div class="pd-doc-title">مسير رواتب الموظفين</div>
          <table>
            <thead><tr><th>#</th><th style="text-align:right">الاسم</th><th>الوظيفة</th><th>الأساسي</th><th>البدلات</th><th>مكافأة</th><th>خصم</th><th>سلفة</th><th>الصافي</th><th>الحالة</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot><tr><td colspan="8">الإجمالي</td><td colspan="2"><b>${H.money(totalNet)}</b></td></tr></tfoot>
          </table>
          <div class="pd-foot">
            <span>${H.esc(st.issuedBy || 'إدارة المدرسة')}</span>
            <span>تاريخ: ${H.fmtDate(H.today())}</span>
            <span>EduPro v${Config.VERSION}</span>
          </div>
        </div>
      </div>`;
      ReportIntl.preview(html, { title: 'مسير الرواتب', orientation: 'landscape' });
    },

    excelRun() {
      const run = runOf(state.month);
      if (!run) return;
      const rows = run.lines.map((ln, i) => {
        const e = Store.get('employees', ln.empId) || {};
        return { '#': i + 1, 'الاسم': ln.name, 'الوظيفة': e.job || '', 'الأساسي': ln.basic, 'البدلات': ln.allowances, 'مكافأة': ln.bonus, 'خصومات': ln.deductions, 'سلفة': ln.advance, 'الصافي': netOf(ln), 'الحالة': ln.paid ? 'مصروف' : 'معلق' };
      });
      if (window.OfficeExport) OfficeExport.excel(`مسير-رواتب-${state.month}.xlsx`, 'الرواتب', rows);
    }
  };

  Actions.register('pay', {
    selMonth(el, val) { state.month = val; P.render(document.getElementById('page-root')); },
    build() { P.build(); },
    cell(el, val) { P.cell(el, val); },
    payLine(ds) { P.payLine(ds); },
    slip(ds) { P.slip(ds); },
    printRun() { P.printRun(); },
    excelRun() { P.excelRun(); }
  });

  window.Pages = window.Pages || {};
  Pages['payroll-engine'] = P;
})();

/* =========================================================
   installments.js — أقساط الطلاب، الفواتير، السندات، كشوف الحساب
   القاعدة: بنود "الأقساط" تُرحّل إيراداً عند التحصيل —
   بنود "الباص/الزي/الكتب" رُحّلت إيرادها لحظة الإنشاء (تسوية فقط هنا)
   ========================================================= */
'use strict';

(function () {
  const state = { q: '', focus: null, onlyDue: false };

  function planOf(sid) { return Store.find('feeplans', (p) => p.studentId === sid); }
  function student(sid) { return Store.get('students', sid) || { name: '—', sid: '' }; }
  function paidOf(p) { return H.sum((p.items || []).filter((i) => i.paid), (i) => i.amount); }
  function dueOf(p) { return H.sum((p.items || []).filter((i) => !i.paid), (i) => i.amount); }

  const P = {
    id: 'installments',

    openFor(sid) { state.focus = sid; state.onlyDue = false; },

    render(root) {
      const list = this.filtered();
      root.innerHTML = `<div class="page">
        ${UI.pageHead('🧾 الأقساط والفواتير', `
          <button class="btn btn-gold btn-write" data-action="insts:receipt">🧾 سند قبض جديد</button>
          <button class="btn btn-primary btn-write" data-action="insts:genClass">⚙️ توليد أقساط صف كامل</button>
          <button class="btn btn-ghost" data-action="insts:dueReport">⏳ تقرير المتأخرات</button>
        `)}

        <div class="table-toolbar">
          <div class="search-box"><input type="search" placeholder="بحث باسم الطالب أو رقمه…" value="${H.esc(state.q)}" data-input="insts:search"></div>
          <label class="switch"><input type="checkbox" data-input="insts:toggleDue" ${state.onlyDue ? 'checked' : ''}><span class="track"></span><span>المتأخرون فقط</span></label>
        </div>

        ${list.length ? list.map((row) => this.planCard(row)).join('') : UI.empty('🧾', 'لا نتائج — أنشئ خطة أقساط من زر «توليد أقساط صف كامل»')}
      </div>`;
    },

    filtered() {
      return Store.col('students')
        .filter((s) => s.status !== 'withdrawn')
        .map((s) => ({ s, p: planOf(s.id) }))
        .filter(({ s, p }) => {
          if (state.q && !((s.name || '').toLowerCase().includes(state.q.toLowerCase()) || (s.sid || '').includes(state.q))) return false;
          if (state.onlyDue && (!p || dueOf(p) <= 0)) return false;
          return true;
        })
        .filter(({ p }) => p);
    },

    planCard({ s, p }) {
      const paid = paidOf(p), due = dueOf(p), total = paid + due;
      const pctV = total ? H.pct(paid, total) : 0;
      const overdue = (p.items || []).some((i) => !i.paid && i.due && i.due < H.today());
      return `<div class="card mb-16">
        <div class="card-title">
          <span class="flex items-center gap-8">
            <span class="icon3d sm ic-blue">👨‍🎓</span>
            <span><b>${H.esc(s.name)}</b><br><small class="muted">${H.esc(s.sid || '')}</small></span>
          </span>
          ${overdue ? UI.badge('⚠️ متأخر', 'badge-danger') : UI.badge('منتظم', 'badge-success')}
        </div>
        <div class="flex items-center gap-12 wrap mb-8">
          <div style="flex:1;min-width:200px">${ChartsEngine.progressBar(pctV, pctV >= 100 ? 'green' : '')}</div>
          <small class="muted money">محصّل <b class="text-success">${H.money(paid)}</b> من ${H.money(total)} — متبقٍ <b class="text-danger">${H.money(due)}</b></small>
        </div>
        ${(p.items || []).map((i) => `
          <div class="inst-row">
            <div class="ir-main">
              <b>${i.kind === 'tuition' ? '🎓' : i.kind === 'bus' ? '🚌' : i.kind === 'store' ? '👕' : '📌'} ${H.esc(i.label)}</b>
              <small>استحقاق: ${H.fmtDate(i.due)} ${i.paid ? `• حُصّل: ${H.fmtDate(i.paidDate)}` : ''}</small>
            </div>
            <b class="money">${H.money(i.amount)}</b>
            ${i.paid ? UI.badge('مدفوع ✓', 'badge-success') : `<button class="btn btn-gold btn-sm btn-write" data-action="insts:payItem" data-sid="${s.id}" data-iid="${i.id}">💵 تحصيل</button>`}
            <button class="icon-btn btn-write" data-action="insts:delItem" data-sid="${s.id}" data-iid="${i.id}" title="حذف البند">🗑️</button>
          </div>`).join('')}
        <div class="flex gap-8 wrap mt-8">
          <button class="btn btn-soft btn-sm btn-write" data-action="insts:addItem" data-sid="${s.id}">➕ بند مستحق</button>
          <button class="btn btn-soft btn-sm" data-action="insts:statement" data-sid="${s.id}">📄 كشف حساب الطالب</button>
        </div>
      </div>`;
    },

    /* ---------- توليد أقساط ---------- */
    async genClass() {
      const classes = Store.col('classes');
      if (!classes.length) return UI.toast('أضف الصفوف أولاً', 'warn');
      const d = await UI.form('⚙️ توليد أقساط لصف كامل', [
        { name: 'classId', label: 'الصف', type: 'select', req: true, options: classes.map((c) => ({ v: c.id, t: c.name })) },
        { name: 'total', label: 'إجمالي الرسوم السنوية للطالب', type: 'number', req: true, min: 0 },
        { name: 'count', label: 'عدد الأقساط', type: 'number', req: true, value: 2, min: 1, max: 12 },
        { name: 'firstDue', label: 'تاريخ استحقاق القسط الأول', type: 'date', req: true, value: H.today() },
        { name: 'label', label: 'تسمية الأقساط', value: 'قسط دراسي' },
        { name: 'overwrite', label: 'استبدال الأقساط القديمة (غير المدفوعة)', type: 'switch', value: false, hint: 'البنود المدفوعة لا تُحذف أبداً' }
      ]);
      if (!d) return;
      const sts = Store.col('students').filter((s) => s.classId === d.classId && s.status !== 'withdrawn');
      if (!sts.length) return UI.toast('لا يوجد طلاب في هذا الصف', 'warn');
      const per = H.round2(d.total / d.count);
      let n = 0;
      for (const s of sts) {
        let p = planOf(s.id);
        if (!p) p = Store.put('feeplans', { studentId: s.id, items: [] });
        if (d.overwrite) p.items = (p.items || []).filter((i) => i.paid || i.kind !== 'tuition');
        for (let k = 0; k < d.count; k++) {
          const dueD = new Date(d.firstDue);
          dueD.setMonth(dueD.getMonth() + k);
          p.items.push({ id: H.uid('fi'), label: `${d.label || 'قسط'} (${k + 1}/${d.count})`, amount: per, due: dueD.toISOString().slice(0, 10), paid: false, kind: 'tuition' });
        }
        Store.put('feeplans', p);
        n++;
      }
      Audit.log('إضافة', `توليد أقساط لـ ${n} طالب — إجمالي ${H.money(d.total)} لكل طالب`);
      UI.toast(`تم توليد الأقساط لـ ${n} طالب ✓`, 'success');
      Router.refresh();
    },

    async addItem(ds) {
      const d = await UI.form('➕ بند مستحق جديد', [
        { name: 'label', label: 'البيان', req: true, value: 'رسوم إضافية' },
        { name: 'amount', label: 'المبلغ', type: 'number', req: true, min: 0 },
        { name: 'due', label: 'تاريخ الاستحقاق', type: 'date', req: true, value: H.today() },
        { name: 'kind', label: 'النوع', type: 'select', options: [{ v: 'tuition', t: '🎓 أقساط (إيراد عند التحصيل)' }, { v: 'other', t: '📌 أخرى' }] }
      ]);
      if (!d) return;
      const p = planOf(ds.sid) || Store.put('feeplans', { studentId: ds.sid, items: [] });
      p.items.push({ id: H.uid('fi'), label: d.label, amount: d.amount, due: d.due, paid: false, kind: d.kind });
      Store.put('feeplans', p);
      Audit.log('إضافة', `بند مستحق: ${d.label} — ${student(ds.sid).name}`);
      UI.toast('تمت إضافة البند لكشف الحساب ✓', 'success');
      Router.refresh();
    },

    async delItem(ds) {
      if (!await UI.confirm({ title: 'حذف بند', msg: 'حذف هذا البند من كشف الحساب؟', okLabel: 'حذف', danger: true })) return;
      const p = planOf(ds.sid);
      if (p) { p.items = (p.items || []).filter((i) => i.id !== ds.iid); Store.put('feeplans', p); }
      Router.refresh();
    },

    /* ---------- تحصيل قسط (سند) ---------- */
    async payItem(ds) {
      const p = planOf(ds.sid);
      const item = p && (p.items || []).find((i) => i.id === ds.iid);
      if (!item || item.paid) return;
      await this.receiptFlow(ds.sid, item);
    },

    /* ---------- سند قبض عام ---------- */
    async receipt() {
      const sts = Store.sortBy(Store.col('students').filter((s) => s.status !== 'withdrawn'), 'name');
      if (!sts.length) return UI.toast('لا يوجد طلاب بعد', 'warn');
      /* بنود غير مسددة لكل الطلاب */
      const unpaid = [];
      for (const s of sts) {
        const p = planOf(s.id);
        ((p && p.items) || []).filter((i) => !i.paid).forEach((i) => {
          unpaid.push({ v: s.id + '|' + i.id, t: `${s.name} — ${i.label} (${H.money(i.amount)})` });
        });
      }
      const d = await UI.form('🧾 سند قبض جديد', [
        { name: 'studentId', label: 'الطالب', type: 'select', req: true, options: sts.map((s) => ({ v: s.id, t: `${s.name} — ${s.sid || ''}` })) },
        { name: 'itemId', label: 'البند المسدد', type: 'select', options: [{ v: '', t: '💵 دفعة على الحساب العام' }, ...unpaid], hint: 'اختر «دفعة على الحساب» إن كان الدفع بدون بند محدد' },
        { name: 'amount', label: 'المبلغ المحصّل', type: 'number', req: true, min: 0, allowEmpty: true, hint: 'يُعبّأ تلقائياً بقيمة البند عند اختياره — عدّله يدوياً للدفعات الجزئية' },
        { name: 'method', label: 'طريقة الدفع', type: 'select', options: [{ v: 'نقداً', t: '💵 نقداً' }, { v: 'تحويل بنكي', t: '🏦 تحويل بنكي' }, { v: 'شيك', t: '🧾 شيك' }], value: 'نقداً' },
        { name: 'date', label: 'التاريخ', type: 'date', req: true, value: H.today() },
        { name: 'note', label: 'ملاحظات على السند' }
      ]);
      if (!d) return;
      let item = null, sid = d.studentId;
      if (d.itemId && d.itemId.includes('|')) {
        const [iSid, iid] = d.itemId.split('|');
        sid = iSid;
        const p = planOf(iSid);
        item = p && (p.items || []).find((i) => i.id === iid);
      }
      const amount = item ? item.amount : (parseFloat(d.amount) || 0);
      if (!(amount > 0)) return UI.toast('أدخل مبلغاً صحيحاً', 'warn');
      await this.applyPayment(sid, item, amount, d);
    },

    async receiptFlow(sid, item) {
      const d = await UI.form(`💵 تحصيل: ${item.label}`, [
        { name: 'amount', label: 'المبلغ المحصّل', type: 'number', req: true, value: item.amount },
        { name: 'method', label: 'طريقة الدفع', type: 'select', options: [{ v: 'نقداً', t: '💵 نقداً' }, { v: 'تحويل بنكي', t: '🏦 تحويل بنكي' }, { v: 'شيك', t: '🧾 شيك' }], value: 'نقداً' },
        { name: 'date', label: 'التاريخ', type: 'date', req: true, value: H.today() },
        { name: 'note', label: 'ملاحظات' }
      ]);
      if (!d) return;
      await this.applyPayment(sid, item, d.amount, d);
    },

    async applyPayment(sid, item, amount, d) {
      const s = student(sid);
      const p = planOf(sid);
      const receiptNo = 'R-' + H.pad(Store.nextSeq('receipt'), 5);
      let postedIncome = false;
      if (item) {
        item.paid = true;
        item.paidDate = d.date;
        item.receiptNo = receiptNo;
        Store.put('feeplans', p);
        /* الأقساط الدراسية فقط ترحّل إيراداً عند التحصيل */
        if (!item.kind || item.kind === 'tuition') {
          Fin.post('income', 'tuition', amount, { ref: receiptNo, refId: receiptNo, note: `تحصيل ${item.label} — ${s.name}`, date: d.date });
          postedIncome = true;
        }
      } else {
        /* دفعة على الحساب: تخفّض أقدم البنود غير المدفوعة */
        let rest = amount;
        (p.items || []).filter((i) => !i.paid).sort((a, b) => (a.due || '').localeCompare(b.due || '')).forEach((i) => {
          if (rest <= 0) return;
          if ((parseFloat(i.amount) || 0) <= rest) { i.paid = true; i.paidDate = d.date; i.receiptNo = receiptNo; rest -= i.amount; }
        });
        Store.put('feeplans', p);
        Fin.post('income', 'tuition', amount, { ref: receiptNo, refId: receiptNo, note: `دفعة على الحساب — ${s.name}`, date: d.date });
        postedIncome = true;
      }
      const pay = Store.put('payments', {
        receiptNo, studentId: sid, amount, method: d.method, date: d.date,
        note: d.note || '', itemId: item ? item.id : '', postedIncome,
        by: (AuthGuard.user || {}).name || ''
      });
      Audit.log('إضافة', `سند قبض ${receiptNo}: ${H.money(amount)} — ${s.name}`);
      UI.toast(`تم تسجيل السند ${receiptNo} ${postedIncome ? 'وترحيل الإيراد للميزانية ✓' : '✓'}`, 'success');

      /* خيارات الطباعة الفورية */
      const pick = await UI.sheet({
        title: `سند ${receiptNo} — تم الحفظ`,
        items: [
          { ico: '🧾', label: 'طباعة حرارية 80مم (طابعة الفواتير)', sub: 'سند قبض حراري', color: 'ic-blue', id: 'th' },
          { ico: '📄', label: 'طباعة A4 رسمية', sub: 'سند بتصميم دولي', color: 'ic-gold', id: 'a4' },
          { ico: '📄', label: 'تنزيل PDF', sub: 'نسخة إلكترونية', color: 'ic-green', id: 'pdf' },
          { ico: '✖️', label: 'إغلاق بدون طباعة', color: 'ic-slate', id: 'x' }
        ]
      });
      if (!pick || pick.id === 'x') { Router.refresh(); return; }
      const s2 = student(sid);
      if (pick.id === 'th' && window.Receipt) Receipt.payment({ pay, student: s2 });
      if (pick.id === 'a4' && window.ReportIntl) ReportIntl.preview(ReportIntl.receiptA4HTML(pay, s2), { title: 'سند قبض', orientation: 'portrait' });
      if (pick.id === 'pdf' && window.PDFEnterprise) PDFEnterprise.download(ReportIntl.receiptA4HTML(pay, s2), `سند-${receiptNo}.pdf`, 'portrait');
      Router.refresh();
    },

    /* ---------- كشف حساب طالب ---------- */
    statement(sid) {
      const s = student(sid);
      const p = planOf(sid);
      const pays = Store.sortBy(Store.where('payments', { studentId: sid }), 'date');
      const html = ReportIntl.statementHTML({ student: s, plan: p, payments: pays });
      ReportIntl.preview(html, { title: `كشف حساب ${s.name}`, orientation: 'portrait' });
    },

    dueReport() {
      const rows = [];
      for (const s of Store.col('students').filter((x) => x.status !== 'withdrawn')) {
        const p = planOf(s.id);
        if (!p) continue;
        (p.items || []).filter((i) => !i.paid).forEach((i) => {
          rows.push({ 'الطالب': s.name, 'الرقم': s.sid || '', 'الصف': (Store.get('classes', s.classId) || {}).name || '', 'البند': i.label, 'المبلغ': i.amount, 'الاستحقاق': H.fmtDate(i.due), 'متأخر': i.due && i.due < H.today() ? 'نعم' : '' });
        });
      }
      const html = ReportIntl.genericTableHTML('⏳ تقرير المتأخرات المالية', ['الطالب', 'الرقم', 'الصف', 'البند', 'المبلغ', 'الاستحقاق', 'متأخر'], rows.map((r) => [r['الطالب'], r['الرقم'], r['الصف'], r['البند'], H.num(r['المبلغ']), r['الاستحقاق'], r['متأخر']]), `الإجمالي: ${H.money(H.sum(rows, (r) => r['المبلغ']))}`);
      ReportIntl.preview(html, { title: 'تقرير المتأخرات', orientation: 'portrait' });
    }
  };

  Actions.register('insts', {
    receipt() { if (RBAC.readOnly()) return; P.receipt(); },
    payItem(ds) { P.payItem(ds); },
    addItem(ds) { P.addItem(ds); },
    delItem(ds) { P.delItem(ds); },
    genClass() { P.genClass(); },
    statement(ds) { P.statement(ds.sid); },
    dueReport() { P.dueReport(); },
    search(el, val) { state.q = val || ''; P.render(document.getElementById('page-root')); const inp = document.querySelector('.table-toolbar input'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } },
    toggleDue(el, val) { state.onlyDue = !!val; P.render(document.getElementById('page-root')); }
  });

  window.Pages = window.Pages || {};
  Pages.installments = P;
})();

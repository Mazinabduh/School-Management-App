/* =========================================================
   store-books-uniform.js — الزي المدرسي والكتب والمخزون
   التسليم: خصم من المخزون + إضافة التكلفة لحساب الطالب + ترحيل الإيراد
   ========================================================= */
'use strict';

(function () {
  let tab = 'inventory';

  const P = {
    id: 'store-books-uniform',

    render(root) {
      const inv = Store.col('inventory');
      const issues = Store.sortBy(Store.col('issues'), 'date').reverse();

      root.innerHTML = `<div class="page">
        ${UI.pageHead('👕 الزي المدرسي والكتب والمخزون', `
          <button class="btn btn-primary btn-write" data-action="store:addItem">➕ صنف جديد</button>
        `)}
        <div class="tabs">
          <button class="tab ${tab === 'inventory' ? 'active' : ''}" data-action="store:tab" data-t="inventory">📦 المخزون (${inv.length})</button>
          <button class="tab ${tab === 'deliver' ? 'active' : ''}" data-action="store:tab" data-t="deliver">🚚 تسليم للطلاب</button>
          <button class="tab ${tab === 'moves' ? 'active' : ''}" data-action="store:tab" data-t="moves">🧾 حركات التسليم (${issues.length})</button>
        </div>
        ${tab === 'inventory' ? this.invHTML() : tab === 'deliver' ? this.deliverHTML() : this.movesHTML()}
      </div>`;
    },

    invHTML() {
      const inv = Store.col('inventory');
      return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(290px,1fr))">
        ${inv.length ? inv.map((it) => `
          <div class="item-card ${it.qty <= 0 ? 'stock-zero' : ''}">
            <span class="it-ico">${it.icon || (it.kind === 'book' ? '📕' : '👕')}</span>
            <div class="it-info">
              <b>${H.esc(it.name)}</b>
              <small>${it.kind === 'book' ? '📚 كتب' : '👕 زي'} • بيع: <b class="money">${H.money(it.price)}</b></small>
              <div class="mt-8">${it.qty > 5 ? `<span class="badge badge-success">متوفر: ${H.num(it.qty)} ${H.esc(it.unit || '')}</span>` : it.qty > 0 ? `<span class="stock-warn">⚠️ منخفض: ${H.num(it.qty)}</span>` : '<span class="badge badge-danger">نفد المخزون</span>'}</div>
            </div>
            <div class="row-actions" style="flex-direction:column">
              <button class="icon-btn btn-write" data-action="store:editItem" data-id="${it.id}">✏️</button>
              <button class="icon-btn btn-write" data-action="store:delItem" data-id="${it.id}">🗑️</button>
            </div>
          </div>`).join('') : UI.empty('📦', 'لا أصناف — أضف أول صنف')}
      </div>`;
    },

    deliverHTML() {
      const inv = Store.col('inventory').filter((i) => i.qty > 0);
      const sts = Store.sortBy(Store.col('students').filter((s) => s.status !== 'withdrawn'), 'name');
      if (!inv.length) return UI.empty('📦', 'لا توجد أصناف متوفرة في المخزون');
      return `<div class="card">
        <div class="card-title">🚚 تسليم صنف لطالب <small class="muted">يُخصم من المخزون ويُضاف لحساب الطالب ويُرحّل الإيراد للميزانية تلقائياً</small></div>
        <div class="deliver-row">
          <div class="field" style="flex:2;min-width:200px"><label>الطالب</label>
            <select id="dlv-student">${sts.map((s) => `<option value="${s.id}">${H.esc(s.name)} — ${H.esc(s.sid || '')}</option>`).join('')}</select></div>
          <div class="field" style="flex:2;min-width:200px"><label>الصنف</label>
            <select id="dlv-item" data-input="store:pickItem">${inv.map((i) => `<option value="${i.id}">${H.esc(i.name)} (${H.money(i.price)}) — متوفر ${H.num(i.qty)}</option>`).join('')}</select></div>
          <div class="field qty-input"><label>الكمية</label>
            <input type="number" id="dlv-qty" value="1" min="1"></div>
          <div class="field"><label>&nbsp;</label>
            <button class="btn btn-gold btn-block btn-write" data-action="store:deliver">✅ تسليم وترحيل</button></div>
        </div>
        <div class="voucher-mini" id="dlv-preview"></div>
      </div>`;
    },

    movesHTML() {
      const issues = Store.sortBy(Store.col('issues'), 'date').reverse();
      return `<div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>الرقم</th><th>التاريخ</th><th>الطالب</th><th>الصنف</th><th>الكمية</th><th>القيمة</th><th>المستخدم</th><th></th></tr></thead>
          <tbody>
            ${issues.length ? issues.map((i) => `<tr>
              <td class="num">${H.esc(i.issueNo)}</td>
              <td class="num">${H.fmtDate(i.date)}</td>
              <td>${H.esc(i.studentName || '')}</td>
              <td>${H.esc(i.itemName || '')}</td>
              <td>${H.num(i.qty)}</td>
              <td class="money" style="font-weight:800">${H.money(i.total)}</td>
              <td class="muted">${H.esc(i.by || '')}</td>
              <td><button class="icon-btn" data-action="store:slip" data-id="${i.id}" title="سند تسليم">🧾</button></td>
            </tr>`).join('') : `<tr><td colspan="8">${UI.empty('🧾', 'لا حركات تسليم بعد')}</td></tr>`}
          </tbody>
        </table>
      </div>`;
    },

    /* ---------- نماذج ---------- */
    async itemForm(v) {
      const d = await UI.form(v ? 'تعديل صنف' : 'صنف جديد', [
        { name: 'name', label: 'اسم الصنف', req: true, value: v && v.name },
        { name: 'kind', label: 'النوع', type: 'select', options: [{ v: 'uniform', t: '👕 زي مدرسي' }, { v: 'book', t: '📚 كتاب' }], value: (v && v.kind) || 'uniform' },
        { name: 'price', label: 'سعر البيع (يُضاف لحساب الطالب)', type: 'number', req: true, min: 0, value: (v && v.price) || 0 },
        { name: 'cost', label: 'تكلفة الشراء (للإحصاء)', type: 'number', min: 0, value: (v && v.cost) || 0 },
        { name: 'qty', label: 'الكمية المتوفرة', type: 'number', req: true, min: 0, value: (v && v.qty) || 0 },
        { name: 'unit', label: 'وحدة القياس', value: (v && v.unit) || 'قطعة' }
      ]);
      if (!d) return;
      Store.put('inventory', v ? Object.assign({}, v, d) : d);
      Audit.log(v ? 'تعديل' : 'إضافة', `صنف مخزون: ${d.name}`);
      Router.refresh();
    },

    async deliver() {
      const sid = document.getElementById('dlv-student').value;
      const iid = document.getElementById('dlv-item').value;
      const qty = parseInt(document.getElementById('dlv-qty').value, 10);
      const it = Store.get('inventory', iid);
      const s = Store.get('students', sid);
      if (!it || !s) return;
      if (!(qty > 0)) return UI.toast('أدخل كمية صحيحة', 'warn');
      if (qty > it.qty) return UI.toast(`المتوفر ${it.qty} فقط`, 'warn');
      const total = H.round2((it.price || 0) * qty);
      if (!await UI.confirm({
        title: 'تأكيد التسليم',
        msg: `تسليم <b>${qty} × ${H.esc(it.name)}</b> للطالب <b>${H.esc(s.name)}</b><br>القيمة: <b>${H.money(total)}</b> تُضاف لحسابه ويُرحّل الإيراد.`,
        okLabel: 'تسليم'
      })) return;

      const issueNo = 'IS-' + H.pad(Store.nextSeq('issue'), 5);
      it.qty -= qty;
      Store.put('inventory', it);
      /* حساب الطالب */
      let p = Store.find('feeplans', (x) => x.studentId === sid);
      if (!p) p = Store.put('feeplans', { studentId: sid, items: [] });
      p.items.push({ id: H.uid('fi'), label: `${it.name} × ${qty}`, amount: total, due: H.today(), paid: false, kind: 'store' });
      Store.put('feeplans', p);
      /* ترحيل الإيراد فوراً */
      Fin.post('income', it.kind === 'book' ? 'books' : 'uniform', total, {
        ref: issueNo, refId: issueNo, note: `${it.name} × ${qty} — ${s.name}`
      });
      Store.put('issues', {
        issueNo, studentId: sid, studentName: s.name, itemId: iid, itemName: it.name,
        qty, unitPrice: it.price, total, date: H.today(), by: (AuthGuard.user || {}).name || ''
      });
      Audit.log('إضافة', `تسليم ${it.name} ×${qty} لـ ${s.name} — ${H.money(total)}`);
      UI.toast('تم التسليم وخصم المخزون وترحيل الإيراد ✓', 'success');
      tab = 'moves';
      Router.refresh();
    },

    slip(ds) {
      const i = Store.get('issues', ds.id);
      if (i && window.Receipt) Receipt.storeIssue(i);
    }
  };

  Actions.register('store', {
    tab(ds) { tab = ds.t; P.render(document.getElementById('page-root')); },
    addItem() { P.itemForm(null); },
    editItem(ds) { P.itemForm(Store.get('inventory', ds.id)); },
    async delItem(ds) {
      const it = Store.get('inventory', ds.id);
      if (!await UI.confirm({ title: 'حذف صنف', msg: `حذف «${H.esc(it.name)}» من المخزون؟`, okLabel: 'حذف', danger: true })) return;
      Store.del('inventory', ds.id);
      Router.refresh();
    },
    pickItem(el) {
      const it = Store.get('inventory', el.value);
      const pv = document.getElementById('dlv-preview');
      if (it && pv) pv.innerHTML = `<div class="v-head"><span>معاينة التسليم</span><b>${H.esc(it.name)}</b></div>
        السعر: <b class="money">${H.money(it.price)}</b> • المتوفر: ${H.num(it.qty)} ${H.esc(it.unit || '')} — سيُخصم من المخزون ويُضاف لحساب الطالب مباشرة`;
    },
    deliver() { P.deliver(); },
    slip(ds) { P.slip(ds); }
  });

  window.Pages = window.Pages || {};
  Pages['store-books-uniform'] = P;
})();

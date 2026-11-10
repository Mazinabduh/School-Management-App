/* =========================================================
   finance-budget.js — الميزانية العامة والترحيل المالي
   كل إيراد/مصروف في التطبيق يمر من هنا: Fin.post()
   ========================================================= */
'use strict';

(function () {
  const state = { type: '', cat: '', month: '' };

  const Fin = {
    /* ---------- الترحيل المالي الموحد ---------- */
    post(type, category, amount, { ref = '', refId = '', note = '', date = null } = {}) {
      if (!(parseFloat(amount) > 0)) return null;
      const tx = Store.put('transactions', {
        type, category, amount: H.round2(amount),
        ref, refId, note, date: date || H.today(),
        by: (AuthGuard.user || {}).name || ''
      });
      return tx;
    },

    removeByRef(refId) {
      if (!refId) return;
      const all = Store.col('transactions').filter((t) => t.refId === refId);
      Store.setCol('transactions', Store.col('transactions').filter((t) => t.refId !== refId));
      return all.length;
    },

    income() { return H.sum(Store.col('transactions').filter((t) => t.type === 'income'), (t) => t.amount); },
    expense() { return H.sum(Store.col('transactions').filter((t) => t.type === 'expense'), (t) => t.amount); },
    balance() { return Fin.income() - Fin.expense(); },

    byCat(type, month) {
      const g = H.groupBy(Store.col('transactions').filter((t) => t.type === type && (!month || H.monthKey(t.date) === month)), 'category');
      return Object.entries(g).map(([cat, arr]) => ({ cat, amount: H.sum(arr, (t) => t.amount) })).sort((a, b) => b.amount - a.amount);
    },

    catLabel(type, catId) {
      const list = (Config.BUDGET_CATEGORIES[type === 'income' ? 'income' : 'expense']) || [];
      const c = list.find((x) => x.id === catId);
      return c ? `${c.ico} ${c.label}` : (catId || '—');
    },

    /* خطة الميزانية التقديرية */
    plan() { return Store.getSetting('budgetPlan', {}); },
    setPlan(catId, amount) {
      const p = Fin.plan();
      if (amount > 0) p[catId] = amount; else delete p[catId];
      Store.setSetting('budgetPlan', p);
    }
  };

  const P = {
    id: 'finance-budget',

    render(root) {
      const txs = this.filtered();
      const months = H.unique(Store.col('transactions').map((t) => H.monthKey(t.date))).sort().reverse();
      const inc = Fin.income(), exp = Fin.expense();

      root.innerHTML = `<div class="page">
        ${UI.pageHead('💰 الميزانية العامة', `
          <button class="btn btn-success btn-write" data-action="fin:addIncome">➕ إيراد يدوي</button>
          <button class="btn btn-danger btn-write" data-action="fin:addExpense">➖ مصروف يدوي</button>
          <button class="btn btn-ghost" data-action="fin:planEditor">🎯 الميزانية التقديرية</button>
        `, 'ترحيل تلقائي: الأقساط والباص والزي والكتب إيرادات — الرواتب مصروفات')}

        <div class="fin-summary stagger" style="margin-bottom:14px">
          <div class="fin-box income"><small>📈 إجمالي الإيرادات</small><div class="v money">${H.money(inc)}</div></div>
          <div class="fin-box expense"><small>📉 إجمالي المصروفات</small><div class="v money">${H.money(exp)}</div></div>
          <div class="fin-box balance"><small>⚖️ الرصيد الصافي</small><div class="v money" style="color:${inc - exp >= 0 ? 'var(--success)' : 'var(--danger)'}">${H.money(inc - exp)}</div></div>
          <div class="fin-box"><small>🧾 عدد الحركات</small><div class="v">${H.num(Store.count('transactions'))}</div></div>
        </div>

        <div class="grid grid-2" style="margin-bottom:14px">
          <div class="chart-card"><div class="card-title">🥈 توزيع الإيرادات</div><div class="chart-wrap"><canvas id="ch-inc"></canvas></div></div>
          <div class="chart-card"><div class="card-title">🥉 توزيع المصروفات</div><div class="chart-wrap"><canvas id="ch-exp"></canvas></div></div>
        </div>

        <div class="card">
          <div class="card-title">📒 دفتر الحركات
            <div class="flex gap-8 wrap">
              <select data-input="fin:fType" style="max-width:150px">
                <option value="">الكل</option>
                <option value="income" ${state.type === 'income' ? 'selected' : ''}>إيرادات</option>
                <option value="expense" ${state.type === 'expense' ? 'selected' : ''}>مصروفات</option>
              </select>
              <select data-input="fin:fMonth" style="max-width:160px">
                <option value="">كل الأشهر</option>
                ${months.map((m) => `<option value="${m}" ${state.month === m ? 'selected' : ''}>${H.arMonth(m)} ${m.slice(0, 4)}</option>`).join('')}
              </select>
              <button class="btn btn-ghost btn-sm" data-action="fin:excel">📊 Excel</button>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>التاريخ</th><th>النوع</th><th>الفئة</th><th>البيان</th><th>المرجع</th><th>المبلغ</th><th></th></tr></thead>
              <tbody>
                ${txs.length ? txs.slice().reverse().map((t) => `<tr>
                  <td class="num">${H.fmtDate(t.date)}</td>
                  <td>${t.type === 'income' ? UI.badge('إيراد', 'badge-success') : UI.badge('مصروف', 'badge-danger')}</td>
                  <td>${H.esc(Fin.catLabel(t.type, t.category))}</td>
                  <td>${H.esc(t.note || t.ref || '—')}</td>
                  <td class="muted">${H.esc(t.ref || '')}</td>
                  <td class="money" style="font-weight:900;color:${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}">${t.type === 'income' ? '+' : '−'}${H.money(t.amount)}</td>
                  <td>${t.refId ? `<button class="icon-btn btn-write" data-action="fin:del" data-id="${t.id}" title="حذف">🗑️</button>` : ''}</td>
                </tr>`).join('') : `<tr><td colspan="7">${UI.empty('📒', 'لا حركات مالية بعد')}</td></tr>`}
              </tbody>
              <tfoot><tr><td colspan="5">الإجمالي المعروض</td>
                <td colspan="2" class="money">${H.money(H.sum(txs.filter((t) => t.type === 'income'), (t) => t.amount) - H.sum(txs.filter((t) => t.type === 'expense'), (t) => t.amount))}</td></tr></tfoot>
            </table>
          </div>
        </div>
      </div>`;

      /* رسوم الفئات */
      const incCats = Fin.byCat('income'), expCats = Fin.byCat('expense');
      ChartsEngine.make('ch-inc', 'doughnut', {
        labels: incCats.map((c) => Fin.catLabel('income', c.cat)),
        datasets: [{ data: incCats.map((c) => c.amount), backgroundColor: ChartsEngine.palette(incCats.length), borderWidth: 0 }]
      }, { cutout: '60%' });
      ChartsEngine.make('ch-exp', 'doughnut', {
        labels: expCats.map((c) => Fin.catLabel('expense', c.cat)),
        datasets: [{ data: expCats.map((c) => c.amount), backgroundColor: ['#dc2626', '#ea580c', '#d97706', '#e11d48', '#7c3aed', '#475569'].slice(0, Math.max(1, expCats.length)), borderWidth: 0 }]
      }, { cutout: '60%' });
    },

    filtered() {
      return Store.col('transactions').filter((t) =>
        (!state.type || t.type === state.type) &&
        (!state.month || H.monthKey(t.date) === state.month));
    },

    async form(type) {
      const cats = Config.BUDGET_CATEGORIES[type === 'income' ? 'income' : 'expense'];
      const data = await UI.form(type === 'income' ? '➕ إيراد يدوي' : '➖ مصروف يدوي', [
        { name: 'category', label: 'الفئة', type: 'select', req: true, options: cats.map((c) => ({ v: c.id, t: `${c.ico} ${c.label}` })) },
        { name: 'amount', label: 'المبلغ', type: 'number', req: true, min: 0 },
        { name: 'date', label: 'التاريخ', type: 'date', req: true, value: H.today() },
        { name: 'note', label: 'البيان / الوصف', req: true }
      ]);
      if (!data) return;
      Fin.post(type, data.category, data.amount, { ref: type === 'income' ? 'إيراد يدوي' : 'مصروف يدوي', note: data.note, date: data.date });
      Audit.log('إضافة', `${type === 'income' ? 'إيراد' : 'مصروف'} يدوي: ${H.money(data.amount)} — ${data.note}`);
      UI.toast('تم ترحيل الحركة إلى الميزانية ✓', 'success');
      Router.refresh();
    },

    planEditor() {
      const p = Fin.plan();
      const rows = ['income', 'expense'].map((type) => `
        <div class="card-title" style="margin-top:8px">${type === 'income' ? '📈 فئات الإيرادات' : '📉 فئات المصروفات'}</div>
        ${Config.BUDGET_CATEGORIES[type].map((c) => {
          const actual = H.sum(Store.col('transactions').filter((t) => t.type === type && t.category === c.id), (t) => t.amount);
          const planned = p[c.id] || 0;
          const pctV = planned ? H.pct(actual, planned) : 0;
          return `<div class="budget-cat">
            <b style="font-size:15px">${c.ico}</b>
            <div style="flex:1"><b>${H.esc(c.label)}</b>
              <div class="progress ${type === 'income' ? 'green' : 'red'} mt-8" style="max-width:260px"><i style="width:${Math.min(100, pctV)}%"></i></div>
              <small class="muted">المخطط: ${H.money(planned)} • الفعلي: ${H.money(actual)}</small>
            </div>
            <input type="number" class="qty-input" data-plan="${c.id}" value="${planned}" min="0" placeholder="مخطط" style="width:120px">
          </div>`;
        }).join('')}`).join('');
      const m = UI.modal({
        title: '🎯 الميزانية التقديرية مقابل الفعلي',
        body: rows,
        foot: [
          { label: 'إغلاق', cls: 'btn-ghost', onClick: (h) => h.close() },
          { label: '💾 حفظ المخطط', cls: 'btn-primary', onClick: (h) => {
              h.body.querySelectorAll('[data-plan]').forEach((inp) => Fin.setPlan(inp.dataset.plan, parseFloat(inp.value) || 0));
              UI.toast('تم حفظ الميزانية التقديرية ✓', 'success');
              h.close(); Router.refresh();
            } }
        ]
      });
      return m;
    }
  };

  Actions.register('fin', {
    addIncome() { P.form('income'); },
    addExpense() { P.form('expense'); },
    planEditor() { P.planEditor(); },
    async del(ds) {
      if (!await UI.confirm({ title: 'حذف حركة', msg: 'حذف هذه الحركة المالية نهائياً؟', okLabel: 'حذف', danger: true })) return;
      Store.del('transactions', ds.id);
      Audit.log('حذف', 'حذف حركة مالية يدوية');
      Router.refresh();
    },
    fType(el, val) { state.type = val; P.render(document.getElementById('page-root')); },
    fMonth(el, val) { state.month = val; P.render(document.getElementById('page-root')); },
    excel() {
      const rows = P.filtered().map((t, i) => ({
        '#': i + 1, 'التاريخ': H.fmtDate(t.date), 'النوع': t.type === 'income' ? 'إيراد' : 'مصروف',
        'الفئة': Fin.catLabel(t.type, t.category), 'البيان': t.note || '', 'المرجع': t.ref || '', 'المبلغ': t.amount, 'المستخدم': t.by || ''
      }));
      if (window.OfficeExport) OfficeExport.excel('دفتر-الحركات-المالية.xlsx', 'الحركات', rows);
    }
  });

  window.Fin = Fin;
  window.Pages = window.Pages || {};
  Pages['finance-budget'] = P;
})();

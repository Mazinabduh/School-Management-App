/* =========================================================
   bus-management.js — اشتراكات الباص + الخطوط + طاقم الباص
   الربط الذكي: الاشتراك → حساب الطالب → إيراد الميزانية
   رواتب الطاقم → مصروف الميزانية (عبر محرك الرواتب)
   ========================================================= */
'use strict';

(function () {
  let tab = 'subs';

  const P = {
    id: 'bus-management',

    render(root) {
      const routes = Store.col('busRoutes');
      const subs = Store.col('busSubs').filter((b) => b.status === 'active');
      const crew = Store.col('employees').filter((e) => e.empKind === 'bus');

      root.innerHTML = `<div class="page">
        ${UI.pageHead('🚌 اشتراكات الباصات', `
          <button class="btn btn-primary btn-write" data-action="bus:addRoute">🛣️ خط سير جديد</button>
          <button class="btn btn-gold btn-write" data-action="bus:addSub">➕ اشتراك طالب</button>
        `)}
        <div class="tabs">
          <button class="tab ${tab === 'subs' ? 'active' : ''}" data-action="bus:tab" data-t="subs">🎓 الاشتراكات (${subs.length})</button>
          <button class="tab ${tab === 'routes' ? 'active' : ''}" data-action="bus:tab" data-t="routes">🛣️ الخطوط (${routes.length})</button>
          <button class="tab ${tab === 'crew' ? 'active' : ''}" data-action="bus:tab" data-t="crew">👩‍✈️ طاقم الباص (${crew.length})</button>
        </div>
        ${tab === 'subs' ? this.subsHTML() : tab === 'routes' ? this.routesHTML() : this.crewHTML()}
      </div>`;
    },

    /* ---------- الاشتراكات ---------- */
    subsHTML() {
      const subs = Store.col('busSubs').filter((b) => b.status === 'active');
      if (!subs.length) return UI.empty('🚌', 'لا اشتراكات نشطة — أضف اشتراك طالب', '<button class="btn btn-primary" data-action="bus:addSub">➕ اشتراك</button>');
      return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">
        ${subs.map((b) => {
          const s = Store.get('students', b.studentId) || { name: 'محذوف', sid: '' };
          const r = Store.get('busRoutes', b.routeId) || { name: '—' };
          /* حالة السداد من بنود الحساب */
          let paid = 0, total = 0;
          (b.itemIds || []).forEach((iid) => {
            const p = Store.find('feeplans', (x) => x.studentId === b.studentId);
            const item = p && (p.items || []).find((x) => x.id === iid);
            if (item) { total += item.amount; if (item.paid) paid += item.amount; }
          });
          return `<div class="bus-card">
            <h4>👨‍🎓 ${H.esc(s.name)} <small style="opacity:.8">${H.esc(s.sid || '')}</small></h4>
            <div class="b-route">🛣️ ${H.esc(r.name)} • منذ ${H.fmtDate(b.start)} • ${H.num(b.months)} شهر</div>
            <div class="b-fee money">${H.money(b.monthlyFee)} <small style="font-size:12px;opacity:.85">/ شهرياً</small></div>
            <div class="mt-8" style="position:relative">
              ${paid >= total && total > 0 ? UI.badge('مسدد بالكامل ✓', 'badge-success') : `<span class="badge badge-warn">مسدد ${H.money(paid)} من ${H.money(total)}</span>`}
            </div>
            <div class="flex gap-8 mt-8" style="position:relative">
              <button class="btn btn-gold btn-sm" data-action="bus:pay" data-sid="${b.studentId}">💵 سداد</button>
              <button class="btn btn-danger-soft btn-sm btn-write" data-action="bus:cancelSub" data-id="${b.id}">إلغاء الاشتراك</button>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    },

    /* ---------- الخطوط ---------- */
    routesHTML() {
      const routes = Store.col('busRoutes');
      return `<div class="grid grid-3">
        ${routes.length ? routes.map((r) => `
          <div class="card">
            <div class="card-title">🛣️ ${H.esc(r.name)}</div>
            <div class="kv-grid" style="grid-template-columns:1fr 1fr">
              <div class="kv"><small>الاشتراك الشهري</small><b class="money">${H.money(r.monthlyFee)}</b></div>
              <div class="kv"><small>المشتركون</small><b>${H.num(Store.count('busSubs', (b) => b.routeId === r.id && b.status === 'active'))}</b></div>
            </div>
            ${r.notes ? `<div class="voucher-mini mt-8">${H.esc(r.notes)}</div>` : ''}
            <div class="flex gap-8 mt-8">
              <button class="btn btn-soft btn-sm btn-write" data-action="bus:editRoute" data-id="${r.id}">✏️ تعديل</button>
              <button class="btn btn-danger-soft btn-sm btn-write" data-action="bus:delRoute" data-id="${r.id}">🗑️ حذف</button>
            </div>
          </div>`).join('') : UI.empty('🛣️', 'لا خطوط سير — أضف خطاً أولاً', '<button class="btn btn-primary" data-action="bus:addRoute">➕ خط سير</button>')}
      </div>`;
    },

    /* ---------- الطاقم ---------- */
    crewHTML() {
      const crew = Store.col('employees').filter((e) => e.empKind === 'bus');
      return `<div>
        <div class="flex gap-8 mb-16"><button class="btn btn-primary btn-write" data-action="bus:addCrew">➕ إضافة مشرفة/سائق</button></div>
        ${crew.length ? crew.map((c) => `
          <div class="crew-item">
            <span class="c-ava">${c.job === 'سائق' ? '👨‍✈️' : '👩‍✈️'}</span>
            <div style="flex:1"><b>${H.esc(c.name)}</b><small>${H.esc(c.job || '')} • ${H.esc(c.phone || '')}</small></div>
            <b class="money">${H.money(c.basicSalary || 0)}</b>
            <button class="btn btn-gold btn-sm btn-write" data-action="bus:payCrew" data-id="${c.id}">💵 صرف راتب</button>
            <button class="icon-btn btn-write" data-action="bus:delCrew" data-id="${c.id}">🗑️</button>
          </div>`).join('') : UI.empty('👩‍✈️', 'لا طاقم باص — أضف مشرفات وسائقي الباصات لصرف رواتبهم من الميزانية')}
      </div>`;
    },

    /* ---------- نماذج ---------- */
    async routeForm(v) {
      const d = await UI.form(v ? 'تعديل خط سير' : '🛣️ خط سير جديد', [
        { name: 'name', label: 'اسم الخط / المنطقة', req: true, value: v && v.name },
        { name: 'monthlyFee', label: 'قيمة الاشتراك الشهري', type: 'number', req: true, min: 0, value: (v && v.monthlyFee) || 0 },
        { name: 'notes', label: 'المحطات / ملاحظات', type: 'textarea', value: v && v.notes }
      ]);
      if (!d) return;
      Store.put('busRoutes', v ? Object.assign({}, v, d) : d);
      Audit.log(v ? 'تعديل' : 'إضافة', `خط سير: ${d.name}`);
      Router.refresh();
    },

    async subForm() {
      const routes = Store.col('busRoutes');
      if (!routes.length) return UI.toast('أضف خط سير أولاً', 'warn');
      const sts = Store.sortBy(Store.col('students').filter((s) => s.status !== 'withdrawn'), 'name');
      if (!sts.length) return UI.toast('سجّل طلاباً أولاً', 'warn');
      const d = await UI.form('➕ اشتراك طالب في الباص', [
        { name: 'studentId', label: 'الطالب', type: 'select', req: true, options: sts.map((s) => ({ v: s.id, t: `${s.name} — ${s.sid || ''}` })) },
        { name: 'routeId', label: 'خط السير', type: 'select', req: true, options: routes.map((r) => ({ v: r.id, t: `${r.name} (${H.money(r.monthlyFee)}/شهر)` })) },
        { name: 'monthlyFee', label: 'قيمة الاشتراك الشهري', type: 'number', req: true, min: 0, value: routes[0].monthlyFee },
        { name: 'months', label: 'عدد أشهر الاشتراك', type: 'number', req: true, value: 9, min: 1, max: 12 },
        { name: 'start', label: 'شهر بداية السداد', type: 'date', req: true, value: H.today() }
      ]);
      if (!d) return;
      if (Store.find('busSubs', (b) => b.studentId === d.studentId && b.status === 'active'))
        return UI.toast('الطالب مشترك فعلاً — ألغِ الاشتراك القديم أولاً', 'warn');
      const s = Store.get('students', d.studentId);
      const subNo = 'BUS-' + H.pad(Store.nextSeq('bus'), 4);
      /* بنود الحساب الشهرية */
      const p = Store.find('feeplans', (x) => x.studentId === d.studentId) || Store.put('feeplans', { studentId: d.studentId, items: [] });
      const itemIds = [];
      const total = H.round2(d.monthlyFee * d.months);
      for (let k = 0; k < d.months; k++) {
        const due = new Date(d.start);
        due.setMonth(due.getMonth() + k);
        const item = { id: H.uid('fi'), label: `اشتراك باص — شهر ${k + 1}`, amount: d.monthlyFee, due: due.toISOString().slice(0, 10), paid: false, kind: 'bus' };
        p.items.push(item);
        itemIds.push(item.id);
      }
      Store.put('feeplans', p);
      Store.put('busSubs', {
        subNo, studentId: d.studentId, routeId: d.routeId, monthlyFee: d.monthlyFee,
        months: d.months, start: d.start, itemIds, status: 'active'
      });
      /* الترحيل: إيراد فوري بالقيمة الكلية + إشعار بالحساب */
      Fin.post('income', 'bus', total, { ref: subNo, refId: subNo, note: `اشتراك باص ${d.months} شهر — ${s.name}` });
      Audit.log('إضافة', `اشتراك باص: ${s.name} — ${H.money(total)}`);
      UI.toast(`تم الاشتراك وإضافة ${H.money(total)} لحساب الطالب وترحيل الإيراد ✓`, 'success');
      Router.refresh();
    },

    async cancelSub(ds) {
      if (!await UI.confirm({ title: 'إلغاء اشتراك', msg: 'إلغاء اشتراك الطالب في الباص؟ (البنود غير المسددة تُحذف من حسابه)', okLabel: 'إلغاء الاشتراك', danger: true })) return;
      const b = Store.get('busSubs', ds.id);
      if (b) {
        const p = Store.find('feeplans', (x) => x.studentId === b.studentId);
        if (p) {
          p.items = (p.items || []).filter((i) => !(b.itemIds || []).includes(i.id) || i.paid);
          Store.put('feeplans', p);
        }
        b.status = 'cancelled';
        Store.put('busSubs', b);
        Audit.log('حذف', `إلغاء اشتراك باص: ${(Store.get('students', b.studentId) || {}).name || ''}`);
      }
      Router.refresh();
    },

    async crewForm() {
      const d = await UI.form('➕ مشرفة/سائق باص', [
        { name: 'name', label: 'الاسم', req: true },
        { name: 'job', label: 'الوظيفة', type: 'select', options: [{ v: 'مشرفة باص', t: '👩‍✈️ مشرفة باص' }, { v: 'سائق', t: '👨‍✈️ سائق' }], value: 'مشرفة باص' },
        { name: 'phone', label: 'الهاتف', type: 'tel' },
        { name: 'basicSalary', label: 'الراتب الشهري', type: 'number', req: true, min: 0 }
      ]);
      if (!d) return;
      Store.put('employees', Object.assign(d, { empKind: 'bus', status: 'active' }));
      Audit.log('إضافة', `طاقم باص: ${d.name} (${d.job})`);
      UI.toast('تمت الإضافة — صرف الراتب يُرحّل مصروفاً في الميزانية', 'success');
      Router.refresh();
    },

    async delCrew(ds) {
      const c = Store.get('employees', ds.id);
      if (!await UI.confirm({ title: 'حذف', msg: `حذف «${H.esc(c.name)}» من طاقم الباص؟`, okLabel: 'حذف', danger: true })) return;
      Store.del('employees', ds.id);
      Router.refresh();
    },

    payCrew(ds) {
      if (Pages['payroll-engine'] && Pages['payroll-engine'].quickPay) Pages['payroll-engine'].quickPay(ds.id);
      else UI.toast('محرك الرواتب غير محمّل', 'error');
    },

    pay(ds) {
      /* سداد أقدم بند باص غير مسدد */
      const b = Store.find('busSubs', (x) => x.studentId === ds.sid && x.status === 'active');
      if (!b) return;
      const p = Store.find('feeplans', (x) => x.studentId === ds.sid);
      const item = p && (p.items || []).filter((i) => i.kind === 'bus' && !i.paid)
        .sort((a, c) => (a.due || '').localeCompare(c.due || ''))[0];
      if (!item) return UI.toast('كل بنود الباص مسددة ✓', 'success');
      if (Pages.installments) Pages.installments.payItem({ sid: ds.sid, iid: item.id });
    }
  };

  Actions.register('bus', {
    tab(ds) { tab = ds.t; P.render(document.getElementById('page-root')); },
    addRoute() { P.routeForm(null); },
    editRoute(ds) { P.routeForm(Store.get('busRoutes', ds.id)); },
    async delRoute(ds) {
      const r = Store.get('busRoutes', ds.id);
      if (Store.count('busSubs', (b) => b.routeId === ds.id && b.status === 'active'))
        return UI.toast('لا يمكن حذف خط به مشتركون نشطون', 'warn');
      if (!await UI.confirm({ title: 'حذف خط', msg: `حذف «${H.esc(r.name)}»؟`, okLabel: 'حذف', danger: true })) return;
      Store.del('busRoutes', ds.id);
      Router.refresh();
    },
    addSub() { P.subForm(); },
    cancelSub(ds) { P.cancelSub(ds); },
    addCrew() { P.crewForm(); },
    delCrew(ds) { P.delCrew(ds); },
    payCrew(ds) { P.payCrew(ds); },
    pay(ds) { P.pay(ds); }
  });

  window.Pages = window.Pages || {};
  Pages['bus-management'] = P;
})();

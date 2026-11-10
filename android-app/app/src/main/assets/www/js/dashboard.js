/* =========================================================
   dashboard.js — لوحة التحكم الرئيسية
   ========================================================= */
'use strict';

(function () {
  const P = {
    id: 'dashboard',

    render(root) {
      const s = Store.settings();
      const students = Store.col('students').filter((x) => x.status !== 'withdrawn');
      const staff = Store.col('employees');
      const txs = Store.col('transactions');
      const income = H.sum(txs.filter((t) => t.type === 'income'), (t) => t.amount);
      const expense = H.sum(txs.filter((t) => t.type === 'expense'), (t) => t.amount);
      const plans = Store.col('feeplans');
      const due = H.sum(plans, (p) => H.sum((p.items || []).filter((i) => !i.paid), (i) => i.amount));
      const busSubs = Store.count('busSubs', (b) => b.status === 'active');
      const audit = Store.col('audit').slice(-7).reverse();

      root.innerHTML = `
        <div class="page">
          ${UI.pageHead('🏠 لوحة التحكم', `
            <button class="btn btn-primary btn-write" data-action="students:add">➕ تسجيل طالب</button>
            <button class="btn btn-gold" data-action="insts:receipt">🧾 سند قبض</button>
          `)}
          <div class="dash-hero shine">
            <h3>أهلاً بك، ${H.esc((AuthGuard.user || {}).name || '')} 👋</h3>
            <p>${H.esc(s.schoolName || '')} — ${H.esc(s.slogan || '')}</p>
            <div class="hero-meta">
              <span class="hero-chip">📅 ${H.arDate(Date.now())}</span>
              <span class="hero-chip">🗓️ العام: ${H.esc(s.year || '')}</span>
              <span class="hero-chip">🎯 v${Config.VERSION}</span>
            </div>
          </div>

          <div class="grid grid-4 stagger" style="margin-bottom:14px">
            ${this.stat('👨‍🎓', 'ic-blue', 'عدد الطلاب', H.num(students.length), 'طالب مسجل', 'students')}
            ${this.stat('👥', 'ic-teal', 'الموظفون', H.num(staff.length), 'معلم وإداري وعامل', 'hr-employees')}
            ${this.stat('🚌', 'ic-indigo', 'مشتركو الباص', H.num(busSubs), 'اشتراك نشط', 'bus-management')}
            ${this.stat('⏳', 'ic-rose', 'متأخرات متبقية', H.money(due), 'أقساط لم تُسدد', 'installments')}
          </div>

          <div class="finance-mini stagger" style="margin-bottom:14px">
            <div class="fm-box fm-income">
              <div class="fm-label">💰 إجمالي الإيرادات</div>
              <div class="fm-value money">${H.money(income)}</div>
              <div class="fm-sub">أقساط + باص + زي وكتب</div>
            </div>
            <div class="fm-box fm-expense">
              <div class="fm-label">💸 إجمالي المصروفات</div>
              <div class="fm-value money">${H.money(expense)}</div>
              <div class="fm-sub">رواتب + تشغيل + صيانة</div>
            </div>
          </div>

          <div class="card" style="margin-bottom:14px">
            <div class="card-title">⚡ الإجراءات السريعة</div>
            <div class="quick-grid">
              ${this.quick('👨‍🎓', 'ic-blue', 'طلاب جديد', 'students')}
              ${this.quick('✍️', 'ic-purple', 'رصد درجات', 'grades-engine')}
              ${this.quick('🧾', 'ic-gold', 'سند قبض', 'installments', true)}
              ${this.quick('💰', 'ic-green', 'الميزانية', 'finance-budget')}
              ${this.quick('🚌', 'ic-indigo', 'باصات', 'bus-management')}
              ${this.quick('💵', 'ic-teal', 'رواتب', 'payroll-engine')}
              ${this.quick('🪪', 'ic-purple', 'بطاقات', 'id-card-studio')}
              ${this.quick('📊', 'ic-indigo', 'تقارير', 'reports-center')}
            </div>
          </div>

          <div class="grid grid-2" style="margin-bottom:14px">
            <div class="chart-card">
              <div class="card-title">📈 الإيرادات مقابل المصروفات (آخر 6 أشهر)</div>
              <div class="chart-wrap"><canvas id="ch-fin"></canvas></div>
            </div>
            <div class="chart-card">
              <div class="card-title">🥧 توزيع الطلاب على المراحل</div>
              <div class="chart-wrap"><canvas id="ch-stg"></canvas></div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">🕘 آخر الحركات <button class="btn btn-soft btn-sm" data-action="nav:go" data-page="audit-log">الكل ◂</button></div>
            <div class="activity-list">
              ${audit.length ? audit.map((a) => `
                <div class="activity-item">
                  <span class="icon3d sm ${a.type === 'حذف' ? 'ic-rose' : a.type === 'إضافة' ? 'ic-green' : 'ic-blue'}">${a.type === 'حذف' ? '🗑️' : a.type === 'إضافة' ? '➕' : '📝'}</span>
                  <div class="a-txt"><b>${H.esc(a.action)}</b><small>${H.esc(a.detail || '')}</small></div>
                  <small class="muted">${H.timeAgo(a.time)}</small>
                </div>`).join('') : UI.empty('🗒️', 'لا حركات مسجلة بعد')}
            </div>
          </div>
        </div>`;

      /* الرسوم */
      const months = [];
      const inc = [], exp = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const k = d.toISOString().slice(0, 7);
        months.push(H.arMonth(k));
        inc.push(H.round2(H.sum(txs.filter((t) => t.type === 'income' && H.monthKey(t.date) === k), (t) => t.amount)));
        exp.push(H.round2(H.sum(txs.filter((t) => t.type === 'expense' && H.monthKey(t.date) === k), (t) => t.amount)));
      }
      ChartsEngine.make('ch-fin', 'bar', {
        labels: months,
        datasets: [
          { label: 'إيرادات', data: inc, backgroundColor: '#16a34a', borderRadius: 7 },
          { label: 'مصروفات', data: exp, backgroundColor: '#dc2626', borderRadius: 7 }
        ]
      });

      const stages = Store.col('stages');
      const stgData = stages.map((st) => Store.count('students', (x) => x.stageId === st.id && x.status !== 'withdrawn'));
      ChartsEngine.make('ch-stg', 'doughnut', {
        labels: stages.map((st) => st.name),
        datasets: [{ data: stgData, backgroundColor: ChartsEngine.palette(stages.length), borderWidth: 0 }]
      }, { cutout: '62%' });
    },

    stat(ico, color, label, value, sub, page) {
      return `<div class="stat-card" data-action="nav:go" data-page="${page}">
        ${UI.icon(ico, color)}
        <div class="st-info">
          <div class="st-label">${label}</div>
          <div class="st-value">${value}</div>
          <div class="st-sub muted">${sub}</div>
        </div>
      </div>`;
    },

    quick(ico, color, label, page, isAction) {
      const act = isAction ? `data-action="insts:receipt"` : `data-action="nav:go" data-page="${page}"`;
      return `<button class="quick-item" ${act}>
        ${UI.icon(ico, color)}<span>${label}</span>
      </button>`;
    }
  };

  Actions.register('dash', {});

  window.Pages = window.Pages || {};
  Pages.dashboard = P;
})();

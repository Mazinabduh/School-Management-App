/* =========================================================
   dashboard.js — لوحة التحكم — هيكل تطبيق المحطة بالضبط
   stats-grid (بطاقات stat-3d) + إجراءات سريعة (quick-3d)
   + مؤشر التحصيل (gauge) + ملخص مالي (bars) + آخر النشاطات
   البيانات: المدرسة (طلاب/موظفون/أقساط/ميزانية) — الشكل: المحطة حرفياً
   ========================================================= */
'use strict';

(function () {
  const P = {
    render(root) {
      const d = this._data();
      const today = new Date();
      let dateS = '';
      try { dateS = today.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
      catch (e) { dateS = H.fmtDate(today.toISOString().slice(0, 10)); }

      root.innerHTML = `
      <div class="page">
        <div class="page-head">
          <h2 class="page-title-3d">
            <div class="title-icon-3d ti-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="24" height="24" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            لوحة التحكم الرئيسية
          </h2>
          <div class="page-date" id="todayDate">${H.esc(dateS)}</div>
        </div>

        <div class="stats-grid" id="statsGrid">
          <div class="stat-3d stat-blue">
            <div class="stat-3d-icon">👨‍🎓</div>
            <div class="stat-3d-val" id="s_students">${H.num(d.students)}</div>
            <div class="stat-3d-label">الطلاب</div>
            <div class="stat-3d-shine"></div>
          </div>
          <div class="stat-3d stat-purple">
            <div class="stat-3d-icon">👥</div>
            <div class="stat-3d-val" id="s_employees">${H.num(d.employees)}</div>
            <div class="stat-3d-label">الموظفون</div>
            <div class="stat-3d-shine"></div>
          </div>
          <div class="stat-3d stat-green">
            <div class="stat-3d-icon">💰</div>
            <div class="stat-3d-val" id="s_collected">${H.num(d.collected)}</div>
            <div class="stat-3d-label">المحصّل (${H.esc(Store.getSetting('currency', 'ريال'))})</div>
            <div class="stat-3d-shine"></div>
          </div>
          <div class="stat-3d stat-orange">
            <div class="stat-3d-icon">⚠️</div>
            <div class="stat-3d-val" id="s_arrears">${H.num(d.arrears)}</div>
            <div class="stat-3d-label">المتأخرات</div>
            <div class="stat-3d-shine"></div>
          </div>
          <div class="stat-3d stat-teal">
            <div class="stat-3d-icon">🚌</div>
            <div class="stat-3d-val" id="s_bus">${H.num(d.busSubs)}</div>
            <div class="stat-3d-label">مشتركو الباص</div>
            <div class="stat-3d-shine"></div>
          </div>
          <div class="stat-3d stat-red">
            <div class="stat-3d-icon">📊</div>
            <div class="stat-3d-val" id="s_net">${H.num(d.net)}</div>
            <div class="stat-3d-label">صافي الميزانية</div>
            <div class="stat-3d-shine"></div>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>⚡ إجراءات سريعة</h3></div>
          <div class="quick-grid">
            <button class="quick-3d" data-action="students:add">
              <div class="quick-3d-icon" style="background:transparent"><img class="nav-icon-3d" src="assets/icons/nav-students.png" alt=""></div>
              <span>تسجيل طالب</span>
            </button>
            <button class="quick-3d" data-action="nav:go" data-page="grades-engine">
              <div class="quick-3d-icon" style="background:transparent"><img class="nav-icon-3d" src="assets/icons/nav-grades.png" alt=""></div>
              <span>رصد درجات</span>
            </button>
            <button class="quick-3d" data-action="nav:go" data-page="installments">
              <div class="quick-3d-icon" style="background:transparent"><img class="nav-icon-3d" src="assets/icons/nav-installments.png" alt=""></div>
              <span>سند قبض</span>
            </button>
            <button class="quick-3d" data-action="nav:go" data-page="results-certificates">
              <div class="quick-3d-icon" style="background:transparent"><img class="nav-icon-3d" src="assets/icons/nav-certificate.png" alt=""></div>
              <span>الشهادات</span>
            </button>
            <button class="quick-3d" data-action="nav:go" data-page="reports-center">
              <div class="quick-3d-icon" style="background:transparent"><img class="nav-icon-3d" src="assets/icons/nav-reports.png" alt=""></div>
              <span>التقارير</span>
            </button>
            <button class="quick-3d" data-action="nav:go" data-page="backup-restore">
              <div class="quick-3d-icon" style="background:transparent"><img class="nav-icon-3d" src="assets/icons/nav-backup.png" alt=""></div>
              <span>النسخ الاحتياطي</span>
            </button>
          </div>
        </div>

        <div class="charts-grid">
          <div class="card-3d chart-card">
            <div class="card-3d-head"><h3>📈 مؤشر التحصيل</h3></div>
            <div class="gauge-wrap">
              <canvas id="gaugeCanvas" width="220" height="140" aria-label="مؤشر نسبة التحصيل"></canvas>
              <div class="gauge-val" id="gaugeVal">0%</div>
              <div class="gauge-lbl">نسبة التحصيل</div>
            </div>
          </div>

          <div class="card-3d chart-card">
            <div class="card-3d-head"><h3>📊 ملخص مالي</h3></div>
            <div class="barchart-wrap">
              <canvas id="barCanvas" width="300" height="180" aria-label="ملخص مالي"></canvas>
            </div>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head">
            <h3>🕐 آخر النشاطات</h3>
            <button class="see-all-btn" type="button" data-action="nav:go" data-page="audit-log" title="عرض سجل النشاط الكامل">عرض الكل</button>
          </div>
          <div class="activity-feed" id="activityFeed">
            <div class="empty-box">
              <div class="empty-icon">📋</div>
              <p>لا توجد نشاطات بعد</p>
            </div>
          </div>
        </div>
      </div>`;

      this._drawGauge(d);
      this._drawBars(d);
      this._renderActivity();
      if (window.StationCylinder) StationCylinder.update();
    },

    /* ---------- بيانات المدرسة ---------- */
    _data() {
      const students = Store.count('students');
      const employees = Store.count('employees');
      let billed = 0, collected = 0;
      (Store.col('feeplans') || []).forEach((p) => {
        (p.items || []).forEach((i) => { billed += Number(i.amount) || 0; if (i.paid) collected += Number(i.amount) || 0; });
      });
      const paymentsTotal = H.sum(Store.col('payments'), (p) => p.amount);
      if (billed === 0 && paymentsTotal > 0) collected = paymentsTotal;
      const arrears = Math.max(0, billed - collected);
      const busSubs = Store.count('busSubs', (b) => b.status === 'active');
      const income = H.sum(Store.col('transactions').filter((t) => t.type === 'income'), (t) => t.amount);
      const expense = H.sum(Store.col('transactions').filter((t) => t.type === 'expense'), (t) => t.amount);
      const net = income - expense;
      return { students, employees, billed, collected, arrears, busSubs, income, expense, net };
    },

    /* ---------- مؤشر التحصيل — رسم المحطة بالضبط ---------- */
    _drawGauge(s) {
      const canvas = document.getElementById('gaugeCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h - 10, radius = 85;
      const pct = s.billed > 0 ? Math.min(s.collected / s.billed * 100, 100) : 0;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
      ctx.lineWidth = 18;
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineCap = 'round';
      ctx.stroke();
      const valAngle = Math.PI + pct / 100 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, valAngle);
      ctx.lineWidth = 24;
      ctx.strokeStyle = 'rgba(0,180,255,0.08)';
      ctx.lineCap = 'round';
      ctx.stroke();
      const grad = ctx.createLinearGradient(0, cy, w, 0);
      grad.addColorStop(0, '#00b4ff');
      grad.addColorStop(1, '#00ff88');
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, valAngle);
      ctx.lineWidth = 18;
      ctx.strokeStyle = grad;
      ctx.lineCap = 'round';
      ctx.stroke();
      const dotX = cx + radius * Math.cos(valAngle);
      const dotY = cy + radius * Math.sin(valAngle);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#00b4ff';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
      const el = document.getElementById('gaugeVal');
      if (el) el.textContent = Math.round(pct) + '%';
    },

    /* ---------- الملخص المالي — أشرطة المحطة بالضبط ---------- */
    _drawBars(s) {
      const canvas = document.getElementById('barCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const data = [
        { l: 'محصّل', v: s.collected, c1: '#00e676', c2: '#00c853' },
        { l: 'متأخرات', v: s.arrears, c1: '#ffa726', c2: '#e65100' },
        { l: 'مصروفات', v: Math.max(s.expense, 0), c1: '#ff5252', c2: '#c62828' },
        { l: 'صافي', v: Math.max(s.net, 0), c1: '#42a5f5', c2: '#1565c0' }
      ];
      const maxV = Math.max(...data.map((d) => d.v), 1);
      const bw = 44;
      const gap = (w - data.length * bw) / (data.length + 1);
      const bot = 30, top = 12;
      const ch = h - bot - top;
      data.forEach((d, i) => {
        const x = gap + i * (bw + gap);
        const bh = Math.max(d.v / maxV * ch, 2);
        const y = h - bot - bh;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this._rRect(ctx, x + 3, y + 3, bw, bh, 5);
        ctx.fill();
        const g = ctx.createLinearGradient(x, y, x, h - bot);
        g.addColorStop(0, d.c1);
        g.addColorStop(1, d.c2 + '88');
        ctx.fillStyle = g;
        this._rRect(ctx, x, y, bw, bh, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this._rRect(ctx, x, y, bw / 3, bh, [5, 0, 0, 5]);
        ctx.fill();
        ctx.fillStyle = '#8da4bf';
        ctx.font = '10px Cairo, Tahoma';
        ctx.textAlign = 'center';
        ctx.fillText(d.l, x + bw / 2, h - 8);
        if (d.v > 0) {
          ctx.fillStyle = '#e8f0fe';
          ctx.font = 'bold 10px Cairo, Tahoma';
          ctx.fillText(Number(d.v).toLocaleString('ar-EG'), x + bw / 2, y - 5);
        }
      });
    },

    _rRect(ctx, x, y, w, h, r) {
      if (typeof r === 'number') r = [r, r, r, r];
      ctx.beginPath();
      ctx.moveTo(x + r[0], y);
      ctx.lineTo(x + w - r[1], y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
      ctx.lineTo(x + w, y + h - r[2]);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
      ctx.lineTo(x + r[3], y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
      ctx.lineTo(x, y + r[0]);
      ctx.quadraticCurveTo(x, y, x + r[0], y);
      ctx.closePath();
    },

    /* ---------- آخر النشاطات — بنمط المحطة ---------- */
    _renderActivity() {
      const feed = document.getElementById('activityFeed');
      if (!feed) return;
      const acts = Store.sortBy(Store.col('audit'), 'ts', false).slice(0, 8);
      if (!acts.length) {
        feed.innerHTML = '<div class="empty-box"><div class="empty-icon">📋</div><p>لا توجد نشاطات بعد</p></div>';
        return;
      }
      const colorOf = (t) => {
        if ((t || '').includes('حذف')) return 'a-err';
        if ((t || '').includes('تعديل')) return 'a-warn';
        if ((t || '').includes('إضافة') || (t || '').includes('دخول')) return 'a-ok';
        return 'a-info';
      };
      feed.innerHTML = acts.map((a) => `
        <div class="activity-row">
          <div class="activity-dot ${colorOf(a.type)}"></div>
          <div class="activity-msg">${a.type ? '【' + H.esc(a.type) + '】' : ''} ${H.esc(a.msg || '')}</div>
          <div class="activity-time">${H.esc(a.time || H.fmtDate((a.ts || '').slice(0, 10)))}</div>
        </div>`).join('');
    }
  };

  window.Pages = window.Pages || {};
  Pages.dashboard = P;
})();

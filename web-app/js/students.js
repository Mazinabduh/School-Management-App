/* =========================================================
   students.js — إدارة بيانات الطلاب والتسجيل والملفات
   قائمة الطلاب بنفس شكل قائمة المشتركين في تطبيق المحطة:
   بطاقات قابلة للتوسيع + عرض 50 ثم زر «المزيد» + أزرار إجراءات لكل بطاقة
   ========================================================= */
'use strict';

(function () {
  const state = { q: '', stageId: '', classId: '' };
  const PAGE = 50;   /* مثل تطبيق المحطة: عرض 50 ثم «المزيد» */

  const Pages_ = {
    _stShown: 0,
    _stFullList: [],
    _stFiltersKey: '',
    _stAppending: false,

    filtered() {
      let arr = Store.sortBy(Store.col('students'), 'name');
      if (state.q) {
        const q = state.q.toLowerCase();
        arr = arr.filter((s) => (s.name || '').toLowerCase().includes(q) || (s.sid || '').includes(q) || (s.guardian || '').toLowerCase().includes(q));
      }
      if (state.stageId) arr = arr.filter((s) => s.stageId === state.stageId);
      if (state.classId) arr = arr.filter((s) => s.classId === state.classId);
      return arr;
    },

    stageName(id) { const s = Store.get('stages', id); return s ? s.name : '—'; },
    className(id) { const c = Store.get('classes', id); return c ? c.name : '—'; },

    statusBadge(s) {
      if (s.status === 'withdrawn') return '<span class="sub-badge disc">🔴 منسحب</span>';
      if (s.status === 'graduated') return '<span class="sub-badge graduated">🎓 متخرج</span>';
      return '<span class="sub-badge paid-up">✓ نشط</span>';
    },

    render(root) {
      const stages = Store.sortBy(Store.col('stages'), 'order');
      const classes = Store.col('classes').filter((c) => !state.stageId || c.stageId === state.stageId);
      const list = this.filtered();

      root.innerHTML = `
        <div class="page">
          ${UI.pageHead('👨‍🎓 شؤون الطلاب', `
            <button class="btn btn-ghost" data-action="students:exportExcel">📊 تصدير Excel</button>
            <button class="btn btn-ghost" data-action="students:exportWord">📝 تصدير Word</button>
            <button class="btn btn-primary btn-write" data-action="students:add">➕ تسجيل طالب جديد</button>
          `, `${H.num(list.length)} طالب معروض من إجمالي ${H.num(Store.count('students'))}`)}

          <div class="table-toolbar">
            <div class="search-box"><input type="search" placeholder="بحث بالاسم أو الرقم أو ولي الأمر…" value="${H.esc(state.q)}" data-input="students:search"></div>
            <select data-input="students:filterStage" style="max-width:190px">
              <option value="">كل المراحل</option>
              ${stages.map((s) => `<option value="${s.id}" ${state.stageId === s.id ? 'selected' : ''}>${H.esc(s.name)}</option>`).join('')}
            </select>
            <select data-input="students:filterClass" style="max-width:190px">
              <option value="">كل الصفوف</option>
              ${classes.map((c) => `<option value="${c.id}" ${state.classId === c.id ? 'selected' : ''}>${H.esc(c.name)}</option>`).join('')}
            </select>
          </div>

          <div id="studentCards"></div>
        </div>`;

      this._renderStuList();
    },

    /* ---------- قائمة الطلاب — بنمط المشتركين: 50 ثم «المزيد» ---------- */
    _renderStuList() {
      const box = document.getElementById('studentCards');
      if (!box) return;
      const subs = this._stFullList = this.filtered();

      /* تصفير الترقيم عند تغيير البحث/المرشح (نفس آلية المحطة) */
      const fKey = (state.q || '') + '|' + (state.stageId || '') + '|' + (state.classId || '');
      if (this._stFiltersKey !== fKey) { this._stFiltersKey = fKey; this._stShown = 0; }
      if (!this._stShown) this._stShown = PAGE;

      const html = subs.map((s) => this.card(s));

      const shown = Math.min(this._stShown, html.length);
      const mainArea = document.getElementById('page-root');
      const keepScroll = this._stAppending && mainArea ? mainArea.scrollTop : 0;

      box.innerHTML = html.slice(0, shown).join('') + (html.length > shown
        ? `<div style="text-align:center;padding:14px 0 6px">
            <button class="btn btn-ghost" id="stMoreBtn" data-action="students:more" style="padding:11px 26px;font-weight:800;display:inline-flex;align-items:center;gap:8px">
                ⬇ المزيد — يوجد ${(html.length - shown)} إضافية (معروض ${shown} من ${html.length})
            </button>
        </div>`
        : (html.length > PAGE ? `<div style="text-align:center;padding:10px;font-size:11.5px;color:var(--text-3)">تم عرض كل ${html.length} طالب</div>` : ''));

      if (this._stAppending && mainArea) {
        mainArea.scrollTop = keepScroll;
        this._stAppending = false;
      }
    },

    card(s) {
      const isActive = s.status !== 'withdrawn' && s.status !== 'graduated';
      const plan = Store.find('feeplans', (p) => p.studentId === s.id);
      const due = plan ? H.sum((plan.items || []).filter((i) => !i.paid), (i) => i.amount) : 0;
      const cls = isActive ? 'active-s' : 'disconnected-s';
      /* سطر معلومات قصير — بطاقة مستطيلة متناسبة مثل تطبيق المحطة تماماً */
      const meter = `🆔 ${H.esc(s.sid || '—')} • ${H.esc(this.className(s.classId) !== '—' ? this.className(s.classId) : this.stageName(s.stageId))}`;
      return `
      <div class="sub-card ${cls}" id="stuc-${s.id}">
        <div class="sub-card-header" data-action="students:toggle" data-id="${s.id}">
          <div class="sub-card-header-left">
            <div class="sub-envelope-icon ${isActive ? '' : 'disc'}">
              ${s.photo ? `<img src="${H.esc(s.photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke="#fff" width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
            </div>
            <div style="min-width:0;flex:1">
              <div class="sub-card-name">${H.esc(s.name)}</div>
              <div class="sub-card-meter">${meter}</div>
            </div>
          </div>
          <div class="sub-card-right">
            ${due > 0 ? `<span class="sub-badge has-arrears">⚠ ${H.money(due, true)}</span>` : this.statusBadge(s)}
            <div class="sub-toggle-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg></div>
          </div>
        </div>

        <div class="sub-card-body">
          <div class="sub-card-divider"></div>
          <div class="sub-grid">
            <div class="sub-info">🚻 الجنس: <b>${s.gender === 'f' ? 'أنثى' : 'ذكر'}</b></div>
            <div class="sub-info">🎂 الميلاد: <b>${H.fmtDate(s.birthdate)}</b></div>
            <div class="sub-info">👨‍👦 ولي الأمر: <b>${H.esc(s.guardian || '—')}</b></div>
            <div class="sub-info">📱 الهاتف: <b class="num">${H.esc(s.phone || '—')}</b></div>
            <div class="sub-info">📍 العنوان: <b>${H.esc(s.address || '—')}</b></div>
            <div class="sub-info">📅 التسجيل: <b>${H.fmtDate(s.created)}</b></div>
            <div class="sub-info">📌 الحالة: <span class="sub-status ${isActive ? 'st-on' : 'st-off'}">${isActive ? '🟢 نشط' : (s.status === 'graduated' ? '🎓 متخرج' : '🔴 منسحب')}</span></div>
            ${s.notes ? `<div class="sub-info" style="grid-column:1/-1">📝 ${H.esc(s.notes)}</div>` : ''}
          </div>

          <div class="sub-btns">
            <button class="sub-btn sb-view" data-action="students:view" data-id="${s.id}">📂 الملف</button>
            ${s.phone ? `<a class="sub-btn sb-call" href="tel:${H.esc(s.phone)}" style="text-decoration:none">📞 اتصال</a>` : ''}
            <button class="sub-btn sb-stmt" data-action="students:installments" data-id="${s.id}">🧾 الأقساط</button>
            <button class="sub-btn sb-card" data-action="students:idcard" data-id="${s.id}">🪪 بطاقة</button>
            <button class="sub-btn sb-edit" data-action="students:edit" data-id="${s.id}">✏ تعديل</button>
            <button class="sub-btn sb-del" data-action="students:del" data-id="${s.id}">🗑 حذف</button>
          </div>
        </div>
      </div>`;
    },

    /* ---------- توسيع/طي البطاقة (نفس المحطة) ---------- */
    toggleCard(id) {
      const el = document.getElementById('stuc-' + id);
      if (el) el.classList.toggle('expanded');
    },

    /* ---------- المزيد ---------- */
    more() {
      const btn = document.getElementById('stMoreBtn');
      if (btn) { btn.disabled = true; btn.innerHTML = '⏳ جاري الإضافة...'; }
      setTimeout(() => {
        this._stShown += PAGE;
        this._stAppending = true;
        this._renderStuList();
      }, 30);
    },

    /* ---------- نموذج إضافة/تعديل ---------- */
    async form(existing) {
      const stages = Store.sortBy(Store.col('stages'), 'order');
      if (!stages.length) { UI.toast('أضف المراحل الدراسية أولاً من صفحة «المراحل والصفوف»', 'warn'); Router.go('stages-classes'); return; }
      const classes = Store.col('classes');
      const v = existing || {};
      const data = await UI.form(existing ? 'تعديل بيانات طالب' : 'تسجيل طالب جديد', [
        { name: 'name', label: 'اسم الطالب الرباعي', req: true, value: v.name },
        { name: 'sid', label: 'رقم الطالب (اتركه فارغاً للترقيم التلقائي)', value: v.sid, placeholder: 'تلقائي' },
        { name: 'gender', label: 'الجنس', type: 'select', options: [{ v: 'm', t: 'ذكر' }, { v: 'f', t: 'أنثى' }], value: v.gender || 'm' },
        { name: 'birthdate', label: 'تاريخ الميلاد', type: 'date', value: v.birthdate },
        { name: 'stageId', label: 'المرحلة', type: 'select', req: true, options: stages.map((s) => ({ v: s.id, t: s.name })), value: v.stageId },
        { name: 'classId', label: 'الصف', type: 'select', options: classes.filter((c) => !v.stageId || c.stageId === v.stageId).map((c) => ({ v: c.id, t: c.name })), value: v.classId },
        { name: 'guardian', label: 'اسم ولي الأمر', value: v.guardian },
        { name: 'phone', label: 'هاتف ولي الأمر', type: 'tel', value: v.phone },
        { name: 'address', label: 'العنوان', value: v.address, span: true },
        { name: 'photo', label: 'صورة الطالب', type: 'photo', value: v.photo },
        { name: 'status', label: 'الحالة', type: 'select', options: [{ v: 'active', t: 'نشط' }, { v: 'withdrawn', t: 'منسحب' }, { v: 'graduated', t: 'متخرج' }], value: v.status || 'active' },
        { name: 'notes', label: 'ملاحظات', type: 'textarea', value: v.notes, span: true }
      ]);
      if (!data) return;
      if (!data.sid) data.sid = 'STU-' + H.pad(Store.nextSeq('student'), 4);
      const rec = Store.put('students', existing ? Object.assign({}, existing, data) : data);
      Audit.log(existing ? 'تعديل' : 'إضافة', `${existing ? 'تعديل طالب' : 'تسجيل طالب'}: ${rec.name} (${rec.sid})`);
      UI.toast(existing ? 'تم تحديث بيانات الطالب ✓' : `تم تسجيل الطالب ${rec.name} برقم ${rec.sid} ✓`, 'success');
      /* إنشاء خطة أقساط فارغة تلقائياً */
      if (!existing && !Store.find('feeplans', (p) => p.studentId === rec.id)) {
        Store.put('feeplans', { studentId: rec.id, items: [] });
      }
      Router.refresh();
    },

    /* ---------- حذف مباشر من البطاقة (نفس المحطة) ---------- */
    async del(s) {
      if (!s) return;
      if (!await UI.confirm({ title: 'حذف طالب', msg: `سيتم حذف «${H.esc(s.name)}» نهائياً مع ملفه. متابعة؟`, okLabel: 'حذف', danger: true })) return;
      Store.del('students', s.id);
      Audit.log('حذف', `حذف طالب: ${s.name} (${s.sid})`);
      UI.toast('تم حذف الطالب', 'success');
      Router.refresh();
    },

    /* ---------- ملف الطالب ---------- */
    view(id) {
      const s = Store.get('students', id);
      if (!s) return;
      const plan = Store.find('feeplans', (p) => p.studentId === id);
      const paid = plan ? H.sum((plan.items || []).filter((i) => i.paid), (i) => i.amount) : 0;
      const due = plan ? H.sum((plan.items || []).filter((i) => !i.paid), (i) => i.amount) : 0;
      const subs = Store.where('busSubs', { studentId: id });
      const m = UI.modal({
        title: 'ملف الطالب',
        body: `
          <div class="profile-head">
            <img class="p-photo" src="${s.photo || 'assets/images/default-avatar.png'}" alt="">
            <div>
              <h3>${H.esc(s.name)}</h3>
              <div class="p-meta">
                <span class="hero-chip">🆔 ${H.esc(s.sid || '')}</span>
                <span class="hero-chip">🏫 ${H.esc(this.stageName(s.stageId))} — ${H.esc(this.className(s.classId))}</span>
                ${this.statusBadge(s)}
              </div>
            </div>
          </div>
          <div class="kv-grid mt-16">
            <div class="kv"><small>الجنس</small><b>${s.gender === 'f' ? 'أنثى' : 'ذكر'}</b></div>
            <div class="kv"><small>تاريخ الميلاد</small><b>${H.fmtDate(s.birthdate)}</b></div>
            <div class="kv"><small>ولي الأمر</small><b>${H.esc(s.guardian || '—')}</b></div>
            <div class="kv"><small>الهاتف</small><b class="num">${H.esc(s.phone || '—')}</b></div>
            <div class="kv"><small>العنوان</small><b>${H.esc(s.address || '—')}</b></div>
            <div class="kv"><small>المحصّل / المتبقي</small><b class="text-success">${H.money(paid)}</b> <span class="muted">/</span> <b class="text-danger">${H.money(due)}</b></div>
            <div class="kv"><small>اشتراك الباص</small><b>${subs.length ? H.esc((Store.get('busRoutes', subs[subs.length - 1].routeId) || {}).name || 'مشترك') : 'غير مشترك'}</b></div>
            <div class="kv"><small>تاريخ التسجيل</small><b>${H.fmtDate(s.created)}</b></div>
          </div>
          ${s.notes ? `<div class="voucher-mini mt-16">📝 ${H.esc(s.notes)}</div>` : ''}`,
        foot: [
          { label: '✏️ تعديل', cls: 'btn-soft', onClick: (h) => { h.close(); this.form(s); } },
          { label: '🧾 الأقساط والحساب', cls: 'btn-gold', onClick: (h) => { h.close(); if (Pages.installments) Pages.installments.openFor(s.id); Router.go('installments'); } },
          { label: '🪪 بطاقة', cls: 'btn-soft', onClick: (h) => { h.close(); if (Pages['id-card-studio']) Pages['id-card-studio'].openFor(s.id); Router.go('id-card-studio'); } },
          { label: '🖨️ طباعة الملف', cls: 'btn-soft', onClick: (h) => { h.close(); this.printProfile(s); } },
          { label: '🗑️ حذف', cls: 'btn-danger-soft', onClick: async (h) => { h.close(); this.del(s); } }
        ]
      });
      return m;
    },

    /* ---------- طباعة ملف الطالب — مستيل المحطة (المستطيل العلوي + pp-table) ---------- */
    printProfile(s) {
      const plan = Store.find('feeplans', (p) => p.studentId === s.id);
      const paid = plan ? H.sum((plan.items || []).filter((i) => i.paid), (i) => i.amount) : 0;
      const due = plan ? H.sum((plan.items || []).filter((i) => !i.paid), (i) => i.amount) : 0;
      const infoRows = [
        ['اسم الطالب', `<b>${H.esc(s.name)}</b>`, 'الرقم', H.esc(s.sid || '—')],
        ['الصف', H.esc(this.stageName(s.stageId)) + ' — ' + H.esc(this.className(s.classId)), 'المرحلة', H.esc(this.stageName(s.stageId))],
        ['ولي الأمر', H.esc(s.guardian || '—'), 'الهاتف', `<bdi>${H.esc(s.phone || '—')}</bdi>`],
        ['المحصّل', H.money(paid) + ' ' + H.esc(Store.getSetting('currency', 'ريال')), 'المتبقي', `<b>${H.money(due)} ${H.esc(Store.getSetting('currency', 'ريال'))}</b>`]
      ];
      const inner = `
        ${window.ThemesKit ? ThemesKit.headerHTML('ملف الطالب', s.sid || '', { subtitle: 'الطالب: ' + (s.name || '') }) : ''}
        <div class="pp-report-section" style="margin:14px 16px;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,.055)">
          <div class="pp-report-section-title"><span class="pp-report-section-title-bar"></span>👤 بيانات الطالب</div>
          <table class="pp-table"><tbody>
            ${infoRows.map((r) => `<tr><th style="width:16%">${H.esc(r[0])}</th><td style="text-align:right">${r[1]}</td><th style="width:16%">${H.esc(r[2])}</th><td style="text-align:right">${r[3]}</td></tr>`).join('')}
          </tbody></table>
        </div>
        ${s.notes ? `<div class="pp-notes" style="margin:12px 16px"><div class="pp-notes-title">📝 ${H.esc('ملاحظات')}</div>${H.esc(s.notes)}</div>` : ''}
        ${window.ThemesKit ? ThemesKit.footerHTML() : ''}`;
      PrintSettingsEngine.print(inner, { title: 'ملف الطالب' });
    },

    /* ---------- تصدير Excel (نفس السلوك الأصلي) ---------- */
    exportExcel() {
      const rows = this.filtered().map((s, i) => ({
        '#': i + 1, 'الرقم': s.sid, 'الاسم': s.name, 'المرحلة': this.stageName(s.stageId), 'الصف': this.className(s.classId),
        'الجنس': s.gender === 'f' ? 'أنثى' : 'ذكر', 'تاريخ الميلاد': H.fmtDate(s.birthdate), 'ولي الأمر': s.guardian || '',
        'الهاتف': s.phone || '', 'العنوان': s.address || '',
        'الحالة': s.status === 'active' ? 'نشط' : s.status === 'withdrawn' ? 'منسحب' : 'متخرج'
      }));
      if (window.OfficeExport) OfficeExport.excel('قائمة الطلاب.xlsx', 'الطلاب', rows);
      Audit.log('تصدير', 'تصدير قائمة الطلاب إلى Excel');
    },

    /* ---------- تصدير Word ---------- */
    exportWord() {
      const rows = this.filtered().map((s, i) => [
        String(i + 1), s.sid || '', s.name || '', this.stageName(s.stageId), this.className(s.classId),
        s.gender === 'f' ? 'أنثى' : 'ذكر', s.guardian || '', s.phone || '',
        s.status === 'active' ? 'نشط' : s.status === 'withdrawn' ? 'منسحب' : 'متخرج'
      ]);
      const headers = ['#', 'الرقم', 'الاسم', 'المرحلة', 'الصف', 'الجنس', 'ولي الأمر', 'الهاتف', 'الحالة'];
      if (window.OfficePro) OfficePro.word('قائمة الطلاب.doc', 'قائمة طلاب ' + (Store.getSetting('schoolName') || ''), headers, rows);
      Audit.log('تصدير', 'تصدير قائمة الطلاب إلى Word');
    }
  };

  /* ================= الأفعال ================= */
  Actions.register('students', {
    add() { if (RBAC.readOnly()) return UI.toast('وضع القراءة فقط', 'warn'); Pages_.form(null); },
    view(ds) { Pages_.view(ds.id); },
    edit(ds) { Pages_.form(Store.get('students', ds.id)); },
    toggle(ds) { Pages_.toggleCard(ds.id); },
    more() { Pages_.more(); },
    del(ds) { Pages_.del(Store.get('students', ds.id)); },
    installments(ds) {
      const s = Store.get('students', ds.id);
      if (s && Pages.installments) Pages.installments.openFor(s.id);
      Router.go('installments');
    },
    idcard(ds) {
      const s = Store.get('students', ds.id);
      if (s && Pages['id-card-studio']) Pages['id-card-studio'].openFor(s.id);
      Router.go('id-card-studio');
    },
    search(el, val) {
      state.q = val || '';
      Pages_._renderStuList();
    },
    filterStage(el, val) { state.stageId = val; state.classId = ''; Pages_.render(document.getElementById('page-root')); },
    filterClass(el, val) { state.classId = val; Pages_.render(document.getElementById('page-root')); },
    exportExcel() { Pages_.exportExcel(); },
    exportWord() { Pages_.exportWord(); }
  });

  window.Pages = window.Pages || {};
  Pages.students = Pages_;
})();

/* =========================================================
   results-certificates.js — إصدار النتائج الفردية والجماعية
   شهادة درجات لطالب / كشف نتائج للصف في كل المواد / طباعة للجميع
   ========================================================= */
'use strict';

(function () {
  const state = { stageId: '', classId: '', studentId: '', mode: 'individual' };

  /* أنواع شهادة التقدير */
  const HONOR_TYPES = [
    { id: 'excellence', label: 'التميّز والتفوق الدراسي', desc: 'لأصحاب المعدلات العالية' },
    { id: 'improve',    label: 'التميّز والتحصيل الدراسي', desc: 'شهادة تفوق عامة' },
    { id: 'attendance', label: 'الانتظام وحسن الحضور', desc: 'للمنتظمين طوال العام' },
    { id: 'behavior',   label: 'حسن السلوك والخُلق', desc: 'لأصحاب السلوك المثالي' },
    { id: 'activity',   label: 'المشاركة في الأنشطة', desc: 'للمشاركين المتميزين' },
    { id: 'effort',     label: 'الاجتهاد والكسب الجهد', desc: 'للطلاب المجتهدين' },
    { id: 'custom',     label: 'شهادة مخصصة', desc: 'اكتب سبب التقدير بنفسك' }
  ];
  const honorState = { type: 'excellence', custom: '', date: '' };

  function subjects() { return Store.col('subjects'); }
  function classStudents(classId) { return Store.sortBy(Store.col('students').filter((s) => s.classId === classId && s.status !== 'withdrawn'), 'name'); }
  function gMax() { return Store.getSetting('gradeMax', 100); }

  function termScore(sid, subjectId, term) {
    const rec = Store.get('grades', `${state.classId}|${subjectId}|${term}`);
    if (!rec || !rec.entries || !rec.entries[sid]) return null;
    const e = rec.entries[sid];
    const ks = term === 't1' ? ['year', 'monthly', 'midterm'] : ['year', 'monthly', 'final'];
    const vals = ks.map((k) => e[k]).filter((v) => v !== undefined && v !== '');
    if (!vals.length) return null;
    return H.round2(vals.reduce((a, b) => a + (parseFloat(b) || 0), 0));
  }

  function studentResults(sid) {
    return subjects().map((sub) => {
      const t1 = termScore(sid, sub.id, 't1');
      const t2 = termScore(sid, sub.id, 't2');
      const known = [t1, t2].filter((x) => x !== null);
      const avg = known.length ? H.round2(known.reduce((a, b) => a + b, 0) / known.length) : null;
      const pct = avg === null ? null : H.pct(avg, gMax());
      return { sub, t1, t2, avg, pct, grade: pct === null ? null : H.gradeInfo(pct) };
    });
  }

  function overallOf(results) {
    const known = results.filter((r) => r.avg !== null);
    if (!known.length) return { total: 0, pct: 0, grade: { label: '—', cls: 'badge-muted' }, rank: '—', count: 0 };
    const total = H.round2(known.reduce((a, r) => a + r.avg, 0));
    const pct = H.pct(total, known.length * gMax());
    return { total, pct, grade: H.gradeInfo(pct), count: known.length };
  }

  function ranking(classId) {
    const sts = classStudents(classId);
    const scored = sts.map((s) => {
      const res = studentResults(s.id);
      return { sid: s.id, o: overallOf(res), res };
    }).filter((x) => x.o.count > 0).sort((a, b) => b.o.pct - a.o.pct);
    const map = {};
    scored.forEach((x, i) => { map[x.sid] = i + 1; });
    return map;
  }

  /* ================= الوحدة ================= */
  const P = {
    id: 'results-certificates',

    render(root) {
      const stages = Store.sortBy(Store.col('stages'), 'order');
      if (!state.stageId && stages.length) state.stageId = stages[0].id;
      const classes = Store.col('classes').filter((c) => !state.stageId || c.stageId === state.stageId);
      if (!state.classId && classes.length) state.classId = classes[0].id;
      const sts = state.classId ? classStudents(state.classId) : [];
      if (!state.studentId && sts.length) state.studentId = sts[0].id;

      root.innerHTML = `<div class="page">
        ${UI.pageHead('🏅 النتائج والشهادات', `
          <button class="btn btn-ghost" data-action="res:printAllStudents">🖨️ شهادة لكل الطلاب</button>
        `, 'إصدار نتيجة فردية لطالب أو كشف جماعي لكل الصف في جميع المواد')}
        <div class="tabs">
          <button class="tab ${state.mode === 'individual' ? 'active' : ''}" data-action="res:mode" data-m="individual">🎓 شهادة فردية</button>
          <button class="tab ${state.mode === 'group' ? 'active' : ''}" data-action="res:mode" data-m="group">📋 كشف جماعي للصف</button>
          <button class="tab ${state.mode === 'honor' ? 'active' : ''}" data-action="res:mode" data-m="honor">🏆 شهادة تقدير</button>
        </div>
        <div class="card" style="margin-bottom:13px">
          <div class="gm-context">
            <div class="field"><label>المرحلة</label>
              <select data-input="res:selStage">${stages.map((s) => `<option value="${s.id}" ${state.stageId === s.id ? 'selected' : ''}>${H.esc(s.name)}</option>`).join('')}</select></div>
            <div class="field"><label>الصف</label>
              <select data-input="res:selClass">${classes.map((c) => `<option value="${c.id}" ${state.classId === c.id ? 'selected' : ''}>${H.esc(c.name)}</option>`).join('')}</select></div>
            ${state.mode === 'individual' || state.mode === 'honor' ? `
            <div class="field"><label>الطالب</label>
              <select data-input="res:selStudent">${sts.map((s) => `<option value="${s.id}" ${state.studentId === s.id ? 'selected' : ''}>${H.esc(s.name)} — ${H.esc(s.sid || '')}</option>`).join('')}</select></div>` : ''}
            ${state.mode === 'honor' ? `
            <div class="field"><label>نوع الشهادة</label>
              <select data-input="res:honorType">${HONOR_TYPES.map((h) => `<option value="${h.id}" ${honorState.type === h.id ? 'selected' : ''}>${h.label}</option>`).join('')}</select></div>
            ${honorState.type === 'custom' ? `<div class="field"><label>سبب التقدير (مخصص)</label><input data-input="res:honorCustom" value="${H.esc(honorState.custom)}" placeholder="مثال: المشاركة المتميزة في مسابقة القرآن الكريم"></div>` : ''}
            <div class="field"><label>تاريخ الإصدار</label><input type="date" data-input="res:honorDate" value="${honorState.date || H.today()}"></div>` : ''}
          </div>
        </div>
        <div id="res-body"></div>
      </div>`;
      this.renderBody();
    },

    renderBody() {
      const el = document.getElementById('res-body');
      if (!el) return;
      if (!state.classId) { el.innerHTML = UI.empty('🏫', 'أضف الصفوف أولاً'); return; }
      if (state.mode === 'individual') {
        if (!state.studentId) { el.innerHTML = UI.empty('👨‍🎓', 'لا يوجد طلاب في هذا الصف'); return; }
        const html = this.certHTML(state.studentId);
        el.innerHTML = `
          <div class="flex wrap gap-8 mb-16">
            <button class="btn btn-primary" data-action="res:printOne">🖨️ طباعة الشهادة</button>
            <button class="btn btn-gold" data-action="res:pdfOne">📄 PDF</button>
          </div>
          <div class="cert-wrap">${html}</div>`;
      } else if (state.mode === 'honor') {
        if (!state.studentId) { el.innerHTML = UI.empty('👨‍🎓', 'لا يوجد طلاب في هذا الصف'); return; }
        el.innerHTML = `
          <div class="flex wrap gap-8 mb-16">
            <button class="btn btn-primary" data-action="res:honorPrint">🖨️ طباعة شهادة التقدير</button>
            <button class="btn btn-gold" data-action="res:honorPdf">📄 PDF</button>
            <button class="btn btn-ghost" data-action="res:honorPrintAll">🏅 شهادة لكل الطلاب</button>
          </div>
          <div class="cert-wrap">${this.honorHTML(state.studentId)}</div>`;
      } else {
        el.innerHTML = `
          <div class="flex wrap gap-8 mb-16">
            <button class="btn btn-primary" data-action="res:printGroup">🖨️ طباعة الكشف (أفقي)</button>
            <button class="btn btn-gold" data-action="res:pdfGroup">📄 PDF</button>
            <button class="btn btn-ghost" data-action="res:excelGroup">📊 Excel</button>
          </div>
          <div class="table-wrap">${this.groupTableHTML()}</div>`;
      }
    },

    /* ---------- شهادة فردية ---------- */
    certHTML(sid) {
      const s = Store.get('students', sid);
      if (!s) return '';
      const st = Store.settings();
      const results = studentResults(sid);
      const o = overallOf(results);
      const rank = ranking(state.classId)[sid];
      const logo = st.logo || 'assets/images/logo.png';
      const theme = `doc-theme-${st.printTheme === 'purple' ? 'purple' : st.printTheme}`;

      return `
      <div class="intl-doc ${theme} cert-paper">
        <div class="cert-body">
          ${st.printWatermark ? `<div class="cert-watermark"><img src="${logo}" alt=""></div>` : ''}
          <div class="cert-head">
            <img src="${logo}" alt="الشعار">
            <div>
              <div class="ch-name">${H.esc(st.schoolName || '')}</div>
              <div class="ch-sub">${H.esc(st.schoolNameEn || '')} ${st.address ? '— ' + H.esc(st.address) : ''}</div>
            </div>
            <div class="ch-side">
              العام الدراسي: <b>${H.esc(st.year || '')}</b><br>
              ${H.esc(st.term1 || '')} و ${H.esc(st.term2 || '')}
            </div>
          </div>

          <div class="cert-title">بيان درجات ونتيجة طالب<small>Statement of Marks &amp; Result</small></div>

          <div class="cert-student">
            <div>الاسم: <b>${H.esc(s.name)}</b></div>
            <div>الرقم: <b>${H.esc(s.sid || '')}</b></div>
            <div>الصف: <b>${H.esc((Store.get('classes', state.classId) || {}).name || '')}</b></div>
            <div>المرحلة: <b>${H.esc((Store.get('stages', s.stageId) || {}).name || '')}</b></div>
          </div>

          <table class="cert-table">
            <thead><tr><th style="width:34%">المادة</th><th>${H.esc(st.term1 || 'ترم 1')}</th><th>${H.esc(st.term2 || 'ترم 2')}</th><th>المعدل</th><th>النسبة</th><th>التقدير</th></tr></thead>
            <tbody>
              ${results.map((r) => `<tr>
                <td style="text-align:right;font-weight:800">${r.sub.icon || ''} ${H.esc(r.sub.name)}</td>
                <td>${r.t1 === null ? '—' : H.num(r.t1)}</td>
                <td>${r.t2 === null ? '—' : H.num(r.t2)}</td>
                <td><b>${r.avg === null ? '—' : H.num(r.avg)}</b></td>
                <td>${r.pct === null ? '—' : r.pct + '%'}</td>
                <td>${r.grade ? r.grade.label : '—'}</td>
              </tr>`).join('')}
              <tr class="row-total">
                <td style="text-align:right">المجموع الكلي (من ${gMax()} لكل مادة)</td>
                <td colspan="2">عدد المواد المرصودة: ${o.count}</td>
                <td><b>${H.num(o.total)}</b></td>
                <td><b>${o.pct}%</b></td>
                <td><b>${o.grade.label}</b></td>
              </tr>
            </tbody>
          </table>

          <div class="cert-overall">
            <span>النتيجة العامة: <b>${o.pct >= (Store.getSetting('passMark', 50)) ? 'ناجح ومنقول' : 'لم يحقق الحد الأدنى'}</b></span>
            <span>النسبة: <b>${o.pct}%</b></span>
            <span>التقدير: <b>${o.grade.label}</b></span>
            <span>الترتيب في الصف: <b>${rank ? H.num(rank) : '—'}</b></span>
          </div>

          <div class="cert-foot">
            <div class="cert-sign"><div class="line"></div><small>ولي أمر الطالب</small></div>
            <div class="cert-qr">
              <img src="${H.qrcode(`RESULT|${s.sid}|${s.name}|${o.pct}%|${o.grade.label}|${st.year}`)}" alt="QR">
              <span>امسح للتحقق<br>وثيقة صادرة إلكترونياً من نظام EduPro v${Config.VERSION}</span>
            </div>
            <div class="cert-sign"><div class="line"></div><small>${H.esc(st.issuedBy || 'إدارة المدرسة')}</small></div>
          </div>
        </div>
      </div>`;
    },

    /* ---------- شهادة تقدير (شهادة شكر فاخرة) ---------- */
    honorText(sid) {
      const h = HONOR_TYPES.find((x) => x.id === honorState.type) || HONOR_TYPES[0];
      return honorState.type === 'custom' ? (honorState.custom || 'تقدير وجدل') : h.label;
    },
    honorHTML(sid) {
      const s = Store.get('students', sid);
      if (!s) return '';
      const st = Store.settings();
      const logo = st.logo || 'assets/images/logo.png';
      const klass = (Store.get('classes', s.classId) || {}).name || '';
      const stage = (Store.get('stages', s.stageId) || {}).name || '';
      const reason = this.honorText(sid);
      const results = studentResults(sid);
      const o = overallOf(results);
      const date = honorState.date || H.today();
      const qr = H.qrcode(`HONOR|${s.sid || ''}|${s.name}|${reason}|${st.year || ''}`);
      return `
      <div class="honor-cert" dir="rtl">
        <div class="hc-frame">
          <div class="hc-corner tl"></div><div class="hc-corner tr"></div>
          <div class="hc-corner bl"></div><div class="hc-corner br"></div>
          <div class="hc-inner">
            <div class="hc-head">
              <img src="${logo}" alt="الشعار">
              <div class="hc-republic">
                <b>الجمهورية اليمنية</b>
                <small>وزارة التربية والتعليم — مكتب التعليم</small>
              </div>
            </div>

            <div class="hc-title-band">
              <span class="hc-band-line"></span>
              <b class="hc-title">شهادة تقدير وتميّز</b>
              <small class="hc-title-sub">Certificate of Appreciation</small>
              <span class="hc-band-line"></span>
            </div>

            <p class="hc-lead">تتقدم إدارة <b>${H.esc(st.schoolName || '')}</b> بالشكر والتقدير إلى الطالب</p>

            <div class="hc-name">${H.esc(s.name)}</div>

            <p class="hc-body">
              والمرّتب في الصف <b>${H.esc(klass)}</b> — ${H.esc(stage)}
              ${o.count ? ` بمعدل عام <b class="num">${o.pct}%</b>` : ''}
              وللحصول على <b>${H.esc(reason)}</b>
              خلال العام الدراسي <b>${H.esc(st.year || '')}</b>
            </p>

            <p class="hc-body hc-pray">متمّين على هذا الجهد الظاهر، متقدمين للجميع بمزيد من العز والنماء والتميّز،
            ولكي يكون طالبنا هذا القدوة الحسنة لزملائه</p>

            <div class="hc-meta">
              <span>الرقم الأكاديمي: <b class="num">${H.esc(s.sid || '—')}</b></span>
              <span>التاريخ: <b>${H.fmtDate(date)}</b></span>
              <span>الترتيب في الصف: <b class="num">${ranking(state.classId)[sid] ? H.num(ranking(state.classId)[sid]) : '—'}</b></span>
            </div>

            <div class="hc-foot">
              <div class="hc-sign">
                <div class="hc-line"></div>
                <small>${H.esc(st.issuedBy || 'مدير المدرسة')}</small>
              </div>
              <div class="hc-stamp">
                <img src="${logo}" alt="">
                <span>شعار المدرسة</span>
              </div>
              <div class="hc-sign">
                <div class="hc-line"></div>
                <small>ولي أمر الطالب</small>
              </div>
            </div>

            <div class="hc-qr">
              <img src="${qr}" alt="QR">
              <span>امسح للتحقق — وثيقة صادرة إلكترونياً من نظام EduPro v${Config.VERSION}</span>
            </div>
          </div>
        </div>
      </div>`;
    },
    groupTableHTML() {
      const sts = classStudents(state.classId);
      const subs = subjects();
      const ranks = ranking(state.classId);
      const rows = sts.map((s, i) => {
        const res = studentResults(s.id);
        const o = overallOf(res);
        return `<tr>
          <td>${i + 1}</td>
          <td style="text-align:right;font-weight:700">${H.esc(s.name)}<br><small class="muted">${H.esc(s.sid || '')}</small></td>
          ${subs.map((sub) => {
            const r = res.find((x) => x.sub.id === sub.id);
            return `<td>${r && r.avg !== null ? H.num(r.avg) : '—'}</td>`;
          }).join('')}
          <td><b>${H.num(o.total)}</b></td>
          <td><b>${o.pct}%</b></td>
          <td>${o.grade.label}</td>
          <td>${ranks[s.id] ? H.num(ranks[s.id]) : '—'}</td>
        </tr>`;
      }).join('');

      return `<table class="data-table" style="min-width:900px">
        <thead><tr>
          <th>#</th><th style="text-align:right">الطالب</th>
          ${subs.map((sub) => `<th title="${H.esc(sub.name)}">${sub.icon || ''} ${H.esc(sub.name)}</th>`).join('')}
          <th>المجموع</th><th>النسبة</th><th>التقدير</th><th>الترتيب</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="${subs.length + 6}">${UI.empty('📋', 'لا يوجد طلاب')}</td></tr>`}</tbody>
      </table>`;
    },

    groupHTML() {
      const st = Store.settings();
      const klass = (Store.get('classes', state.classId) || {}).name || '';
      const stage = (Store.get('stages', state.stageId) || {}).name || '';
      const subs = subjects();
      const sts = classStudents(state.classId);
      const ranks = ranking(state.classId);

      const rows = sts.map((s, i) => {
        const res = studentResults(s.id);
        const o = overallOf(res);
        return `<tr><td>${i + 1}</td><td style="text-align:right">${H.esc(s.name)}<br><small>${H.esc(s.sid || '')}</small></td>
          ${subs.map((sub) => { const r = res.find((x) => x.sub.id === sub.id); return `<td>${r && r.avg !== null ? H.num(r.avg) : '—'}</td>`; }).join('')}
          <td>${H.num(o.total)}</td><td>${o.pct}%</td><td>${o.grade.label}</td><td>${ranks[s.id] || '—'}</td></tr>`;
      }).join('');

      return `
      <div class="print-doc intl-doc doc-theme-${st.printTheme === 'purple' ? 'purple' : st.printTheme}">
        <div class="pd-page">
          <div class="pd-head">
            <img src="${st.logo || 'assets/images/logo.png'}" alt="">
            <div style="flex:1">
              <b>${H.esc(st.schoolName || '')}</b>
              <small>${H.esc(st.schoolNameEn || '')}</small>
            </div>
            <div style="text-align:left;font-size:11px">العام الدراسي: <b>${H.esc(st.year || '')}</b></div>
          </div>
          <div class="pd-doc-title">كشف النتائج الجماعي — ${H.esc(stage)} / ${H.esc(klass)}</div>
          <table>
            <thead><tr><th>#</th><th style="text-align:right">الطالب</th>${subs.map((s2) => `<th>${H.esc(s2.name)}</th>`).join('')}<th>المجموع</th><th>النسبة</th><th>التقدير</th><th>الترتيب</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="pd-foot">
            <span>${H.esc(st.issuedBy || 'إدارة المدرسة')}</span>
            <span>تاريخ الإصدار: ${H.fmtDate(H.today())}</span>
            <span>EduPro v${Config.VERSION}</span>
          </div>
        </div>
      </div>`;
    }
  };

  /* ================= الأفعال ================= */
  Actions.register('res', {
    mode(ds) { state.mode = ds.m; P.render(document.getElementById('page-root')); },
    selStage(el, val) { state.stageId = val; state.classId = ''; state.studentId = ''; P.render(document.getElementById('page-root')); },
    selClass(el, val) { state.classId = val; state.studentId = ''; P.render(document.getElementById('page-root')); },
    selStudent(el, val) { state.studentId = val; state.mode === 'honor' ? P.renderBody() : P.renderBody(); },
    honorType(el, val) { honorState.type = val; P.render(document.getElementById('page-root')); },
    honorCustom(el, val) { honorState.custom = val; const body = document.getElementById('res-body'); if (body) { const w = body.querySelector('.cert-wrap'); if (w) w.innerHTML = P.honorHTML(state.studentId); } },
    honorDate(el, val) { honorState.date = val || H.today(); const body = document.getElementById('res-body'); if (body) { const w = body.querySelector('.cert-wrap'); if (w) w.innerHTML = P.honorHTML(state.studentId); } },

    honorPrint() {
      if (!state.studentId) return UI.toast('اختر الطالب أولاً', 'warn');
      if (window.ReportIntl) ReportIntl.preview(P.honorHTML(state.studentId), { title: 'شهادة تقدير', orientation: 'portrait' });
    },
    honorPdf() {
      const s = Store.get('students', state.studentId);
      if (!s) return;
      if (window.PDFEnterprise) PDFEnterprise.download(P.honorHTML(state.studentId), `شهادة-تقدير-${s.sid || s.name}.pdf`, 'portrait');
    },
    honorPrintAll() {
      const sts = classStudents(state.classId);
      if (!sts.length) return UI.toast('لا يوجد طلاب في الصف', 'warn');
      UI.loading(true, 'جارٍ تجهيز شهادات التقدير…');
      setTimeout(() => {
        const html = sts.map((s) => `<div class="avoid-break">${P.honorHTML(s.id)}</div><div class="page-break"></div>`).join('');
        UI.loading(false);
        if (window.ReportIntl) ReportIntl.preview(html, { title: `شهادات تقدير ${sts.length} طالب`, orientation: 'portrait' });
      }, 60);
    },

    printOne() {
      if (window.ReportIntl) ReportIntl.preview(P.certHTML(state.studentId), { title: 'شهادة درجات', orientation: 'portrait' });
    },
    pdfOne() {
      const s = Store.get('students', state.studentId);
      if (window.PDFEnterprise) PDFEnterprise.download(P.certHTML(state.studentId), `نتيجة-${(s || {}).sid || ''}.pdf`, 'portrait');
    },
    printGroup() {
      if (window.ReportIntl) ReportIntl.preview(P.groupHTML(), { title: 'كشف النتائج الجماعي', orientation: 'landscape' });
    },
    pdfGroup() {
      const k = (Store.get('classes', state.classId) || {}).name || '';
      if (window.PDFEnterprise) PDFEnterprise.download(P.groupHTML(), `نتائج-${k}.pdf`, 'landscape');
    },
    excelGroup() {
      const subs = subjects();
      const sts = classStudents(state.classId);
      const ranks = ranking(state.classId);
      const rows = sts.map((s, i) => {
        const res = studentResults(s.id);
        const o = overallOf(res);
        const row = { '#': i + 1, 'الطالب': s.name, 'الرقم': s.sid || '' };
        subs.forEach((sub) => { const r = res.find((x) => x.sub.id === sub.id); row[sub.name] = r && r.avg !== null ? r.avg : ''; });
        row['المجموع'] = o.total; row['النسبة%'] = o.pct; row['التقدير'] = o.grade.label; row['الترتيب'] = ranks[s.id] || '';
        return row;
      });
      if (window.OfficeExport) OfficeExport.excel(`نتائج-الصف.xlsx`, 'النتائج', rows);
    },
    printAllStudents() {
      const sts = classStudents(state.classId);
      if (!sts.length) return UI.toast('لا يوجد طلاب في الصف', 'warn');
      UI.loading(true, 'جارٍ تجهيز شهادات الطلاب…');
      setTimeout(() => {
        const html = sts.map((s) => `<div class="avoid-break">${P.certHTML(s.id)}</div><div class="page-break"></div>`).join('');
        UI.loading(false);
        if (window.ReportIntl) ReportIntl.preview(html, { title: `شهادات ${classStudents(state.classId).length} طالب`, orientation: 'portrait' });
      }, 60);
    }
  });

  window.Pages = window.Pages || {};
  Pages['results-certificates'] = P;
})();

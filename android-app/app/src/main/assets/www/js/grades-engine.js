/* =========================================================
   grades-engine.js — محرك رصد الدرجات اليدوي
   ترم1: أعمال السنة + الشهري + النصفي | ترم2: أعمال السنة + الشهري + النهائي
   حساب فوري للمجموع والنسبة والتقدير + منع تجاوز الدرجة العظمى
   ========================================================= */
'use strict';

(function () {
  const state = { stageId: '', classId: '', subjectId: '', term: 't1' };

  function parts(term) {
    if (term === 't1') return [
      { k: 'year', label: 'أعمال السنة' },
      { k: 'monthly', label: 'اختبار شهري' },
      { k: 'midterm', label: 'الاختبار النصفي' }
    ];
    return [
      { k: 'year', label: 'أعمال السنة' },
      { k: 'monthly', label: 'اختبار شهري' },
      { k: 'final', label: 'الاختبار النهائي' }
    ];
  }
  function weights(term) {
    const w = Store.getSetting('weights', Config.DEFAULT_SETTINGS.weights);
    return w[term] || { year: 25, monthly: 25, midterm: 50, final: 50 };
  }
  function maxOf(term, k) { return (weights(term))[k] || 0; }
  function gradeMax() { return Store.getSetting('gradeMax', 100); }

  function recId() { return `${state.classId}|${state.subjectId}|${state.term}`; }
  function record() {
    const id = recId();
    let r = Store.get('grades', id);
    if (!r) r = Store.put('grades', { id, classId: state.classId, subjectId: state.subjectId, term: state.term, entries: {} });
    return r;
  }
  function students() {
    return Store.sortBy(Store.col('students').filter((s) => s.classId === state.classId && s.status !== 'withdrawn'), 'name');
  }

  function entryOf(rec, sid) { return (rec.entries || {})[sid] || {}; }
  function entryTotal(rec, sid) {
    const e = entryOf(rec, sid);
    return parts(state.term).reduce((a, p) => a + (parseFloat(e[p.k]) || 0), 0);
  }

  const saveDebounced = H.debounce(() => {
    const rec = Store.get('grades', recId());
    if (rec) { Store.put('grades', rec); }
  }, 600);

  const P = {
    id: 'grades-engine',

    render(root) {
      const stages = Store.sortBy(Store.col('stages'), 'order');
      if (!state.stageId && stages.length) state.stageId = stages[0].id;
      const classes = Store.col('classes').filter((c) => !state.stageId || c.stageId === state.stageId);
      if (!state.classId && classes.length) state.classId = classes[0].id;
      const subjects = Store.col('subjects');
      if (!state.subjectId && subjects.length) state.subjectId = subjects[0].id;

      const ready = state.classId && state.subjectId;
      root.innerHTML = `<div class="page">
        ${UI.pageHead('✍️ كشف رصد الدرجات', `
          <button class="btn btn-ghost" data-action="grades:print">🖨️ طباعة</button>
          <button class="btn btn-ghost" data-action="grades:pdf">📄 PDF</button>
          <button class="btn btn-ghost" data-action="grades:excel">📊 Excel</button>
        `, 'أدخل الدرجات يدوياً في المربعات — يُحسب المجموع والنسبة والتقدير فوراً')}

        <div class="card" style="margin-bottom:13px">
          <div class="gm-context">
            <div class="field"><label>المرحلة</label>
              <select data-input="grades:selStage">${stages.map((s) => `<option value="${s.id}" ${state.stageId === s.id ? 'selected' : ''}>${H.esc(s.name)}</option>`).join('')}</select></div>
            <div class="field"><label>الصف</label>
              <select data-input="grades:selClass">${classes.map((c) => `<option value="${c.id}" ${state.classId === c.id ? 'selected' : ''}>${H.esc(c.name)}</option>`).join('')}</select></div>
            <div class="field"><label>المادة</label>
              <select data-input="grades:selSubject">${subjects.map((s) => `<option value="${s.id}" ${state.subjectId === s.id ? 'selected' : ''}>${H.esc(s.icon || '')} ${H.esc(s.name)}</option>`).join('')}</select></div>
          </div>
          <div class="tabs" style="margin-bottom:0">
            <button class="tab ${state.term === 't1' ? 'active' : ''}" data-action="grades:term" data-t="t1">1️⃣ ${H.esc(Store.getSetting('term1'))}</button>
            <button class="tab ${state.term === 't2' ? 'active' : ''}" data-action="grades:term" data-t="t2">2️⃣ ${H.esc(Store.getSetting('term2'))}</button>
          </div>
        </div>

        ${ready ? this.matrix() : UI.empty('📚', 'أضف الصفوف والمواد أولاً من صفحة «المراحل والصفوف»', '<button class="btn btn-primary" data-action="nav:go" data-page="stages-classes">إضافة</button>')}
      </div>`;

      if (ready) this.bindInputs();
    },

    matrix() {
      const rec = record();
      const sts = students();
      const ps = parts(state.term);
      const w = weights(state.term);
      const mx = gradeMax();

      const rows = sts.map((s) => {
        const e = entryOf(rec, s.id);
        const total = entryTotal(rec, s.id);
        const pct = H.pct(total, mx);
        const gi = H.gradeInfo(pct);
        return `<tr data-row="${s.id}">
          <th>${H.esc(s.name)} <small class="muted">${H.esc(s.sid || '')}</small></th>
          ${ps.map((p) => {
            const v = e[p.k];
            const over = v !== undefined && v !== '' && (parseFloat(v) || 0) > maxOf(state.term, p.k);
            return `<td><input type="number" class="gm-input ${over ? 'over' : (v !== undefined && v !== '' ? 'filled' : '')}"
              data-cell="1" data-sid="${s.id}" data-k="${p.k}" value="${v === undefined ? '' : v}"
              min="0" max="${maxOf(state.term, p.k)}" placeholder="0"></td>`;
          }).join('')}
          <td class="gm-total num" data-total>${H.num(total, 0)}</td>
          <td class="gm-pct num" data-pct>${pct}%</td>
          <td><span class="gm-grade-badge badge ${gi.cls}" data-grade>${gi.label}</span></td>
        </tr>`;
      }).join('');

      return `
        <div class="gm-summary" id="gm-summary">${this.summaryHTML()}</div>
        <div class="gm-table-wrap">
          <table class="gm-table">
            <thead><tr>
              <th style="min-width:170px;text-align:right">الطالب</th>
              ${ps.map((p) => `<th>${p.label}<br><small style="opacity:.8">من ${maxOf(state.term, p.k)}</small></th>`).join('')}
              <th>المجموع<br><small style="opacity:.8">من ${mx}</small></th><th>النسبة</th><th>التقدير</th>
            </tr></thead>
            <tbody id="gm-body">${rows || `<tr><td colspan="7">${UI.empty('👨‍🎓', 'لا يوجد طلاب في هذا الصف', '<button class="btn btn-primary" data-action="nav:go" data-page="students">تسجيل طلاب</button>')}</td></tr>`}</tbody>
          </table>
        </div>`;
    },

    summaryHTML() {
      const rec = Store.get('grades', recId());
      const sts = students();
      const mx = gradeMax();
      let entered = 0, sumPct = 0, pass = 0, fail = 0;
      sts.forEach((s) => {
        const total = entryTotal(rec, s.id);
        const has = parts(state.term).some((p) => { const v = entryOf(rec, s.id)[p.k]; return v !== undefined && v !== ''; });
        if (has) entered++;
        const pct = H.pct(total, mx);
        sumPct += pct;
        if (has) { if (H.passed(pct)) pass++; else fail++; }
      });
      const avg = entered ? Math.round((sumPct / entered) * 10) / 10 : 0;
      return `
        <span class="gm-chip">✍️ تم الرصد: <b>${entered} / ${sts.length}</b></span>
        <span class="gm-chip">📊 معدل الصف: <b>${avg}%</b></span>
        <span class="gm-chip">✅ ناجح: <b>${pass}</b></span>
        <span class="gm-chip">⛔ راسب: <b>${fail}</b></span>`;
    },

    /* ---------- تحديث صف واحد فورياً (بدون إعادة رسم تحفظ التركيز) ---------- */
    bindInputs() {
      const body = document.getElementById('gm-body');
      if (!body) return;
      body.addEventListener('input', (e) => {
        const inp = e.target.closest('[data-cell]');
        if (!inp) return;
        const sid = inp.dataset.sid, k = inp.dataset.k;
        const mx = maxOf(state.term, k);
        let v = inp.value === '' ? '' : parseFloat(inp.value);
        if (v !== '' && isNaN(v)) v = '';
        if (v !== '' && v < 0) { v = 0; inp.value = 0; }
        if (v !== '' && v > mx) { v = mx; inp.value = mx; UI.toast(`أقصى درجة لهذا الجزء ${mx} — تم التعديل تلقائياً`, 'warn'); }
        const rec = record();
        rec.entries[sid] = rec.entries[sid] || {};
        if (v === '') delete rec.entries[sid][k]; else rec.entries[sid][k] = v;
        inp.classList.toggle('over', false);
        inp.classList.toggle('filled', v !== '');
        /* تحديث الصف */
        const tr = body.querySelector(`tr[data-row="${sid}"]`);
        const total = entryTotal(rec, sid);
        const pct = H.pct(total, gradeMax());
        const gi = H.gradeInfo(pct);
        tr.querySelector('[data-total]').textContent = H.num(total, 0);
        tr.querySelector('[data-pct]').textContent = pct + '%';
        const gb = tr.querySelector('[data-grade]');
        gb.textContent = gi.label;
        gb.className = `gm-grade-badge badge ${gi.cls}`;
        saveDebounced();
        this.refreshSummary();
      });
    },

    refreshSummary() {
      const el = document.getElementById('gm-summary');
      if (el) el.innerHTML = this.summaryHTML();
    },

    /* ---------- بناء بيانات الكشف للطباعة ---------- */
    sheetData() {
      const rec = Store.get('grades', recId());
      const sts = students();
      const ps = parts(state.term);
      const mx = gradeMax();
      return {
        term: state.term,
        termLabel: state.term === 't1' ? Store.getSetting('term1') : Store.getSetting('term2'),
        subject: (Store.get('subjects', state.subjectId) || {}).name || '',
        klass: (Store.get('classes', state.classId) || {}).name || '',
        stage: (Store.get('stages', state.stageId) || {}).name || '',
        mx, ps,
        rows: sts.map((s) => {
          const e = entryOf(rec, s.id);
          const total = entryTotal(rec, s.id);
          const pct = H.pct(total, mx);
          return { sid: s.sid, name: s.name, vals: ps.map((p) => (e[p.k] === undefined ? '—' : e[p.k])), total, pct, grade: H.gradeInfo(pct).label };
        })
      };
    }
  };

  /* ================= الأفعال ================= */
  Actions.register('grades', {
    selStage(el, val) { state.stageId = val; state.classId = ''; P.render(document.getElementById('page-root')); },
    selClass(el, val) { state.classId = val; P.render(document.getElementById('page-root')); },
    selSubject(el, val) { state.subjectId = val; P.render(document.getElementById('page-root')); },
    term(ds) { state.term = ds.t; P.render(document.getElementById('page-root')); },

    print() { if (window.ReportIntl) ReportIntl.preview(ReportIntl.gradeSheetHTML(P.sheetData()), { title: 'كشف الدرجات', orientation: 'portrait' }); },
    pdf() { if (window.PDFEnterprise) PDFEnterprise.download(ReportIntl.gradeSheetHTML(P.sheetData()), `كشف-درجات-${P.sheetData().klass}.pdf`, 'portrait'); },
    excel() {
      const d = P.sheetData();
      const rows = d.rows.map((r, i) => ({
        '#': i + 1, 'رقم الطالب': r.sid, 'الاسم': r.name,
        ...Object.fromEntries(d.ps.map((p, j) => [p.label, r.vals[j]])),
        'المجموع': r.total, 'النسبة%': r.pct, 'التقدير': r.grade
      }));
      if (window.OfficeExport) OfficeExport.excel(`درجات-${d.klass}-${d.subject}.xlsx`, 'الدرجات', rows);
    }
  });

  window.Pages = window.Pages || {};
  Pages['grades-engine'] = P;
})();

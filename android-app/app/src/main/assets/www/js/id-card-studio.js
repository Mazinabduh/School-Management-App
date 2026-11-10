/* =========================================================
   id-card-studio.js — استوديو تصميم وإصدار البطاقات العصري
   لون مخصص لكل مرحلة + قالب مختلف لكل فئة + QR + وجه/ظهر + طباعة PVC
   ========================================================= */
'use strict';

(function () {
  const state = { type: 'student', personId: '', classId: '', tpl: 'modern', color: '#0091ea' };

  /* تغميق لون hex (بديل آمن عن color-mix لأندرويد القديم) */
  function darken(hex, f = 0.55) {
    const m = String(hex).replace('#', '');
    const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16);
    const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  function tplSaved(type) {
    const t = Store.get('idTemplates', type);
    return t || (Config.CARD_TYPES.find((c) => c.id === type) || { color: '#0091ea', tpl: 'modern' });
  }

  function person() {
    if (state.type === 'student') return Store.get('students', state.personId);
    return Store.get('employees', state.personId);
  }

  /* ---------- بناء بطاقة HTML ---------- */
  function cardHTML(v, { back = false, small = false } = {}) {
    const st = Store.settings();
    const color = v.color || '#0091ea';
    const c2 = darken(color, 0.5);
    const tpl = v.tpl || 'modern';
    const typeMeta = Config.CARD_TYPES.find((c) => c.id === v.type) || {};
    const isStudent = v.type === 'student';
    const stage = isStudent ? (Store.get('stages', v.stageId) || {}) : {};
    const qrText = `ID|${v.type}|${v.sid || ''}|${v.name || ''}|${st.schoolName || ''}|${st.year || ''}`;
    const qr = H.qrcode(qrText, 3);

    const roleLabel = typeMeta.label || 'بطاقة';
    const extraRows = isStudent
      ? `<div class="row"><b>المرحلة:</b><span>${H.esc(stage.name || '')}</span></div>
         <div class="row"><b>الصف:</b><span>${H.esc((Store.get('classes', v.classId) || {}).name || '')}</span></div>`
      : `<div class="row"><b>الوظيفة:</b><span>${H.esc(v.job || roleLabel)}</span></div>
         <div class="row"><b>التخصص:</b><span>${H.esc(v.specialization || '—')}</span></div>`;

    if (back) {
      return `
      <div class="idcard back tpl-${tpl}" style="--cd:${color};--cd2:${c2};${small ? 'transform:scale(.9)' : ''}">
        <div class="ic-inner">
          <div class="ic-head"><img class="ic-logo" src="${st.logo || 'assets/images/logo.png'}" alt=""><div class="ic-school">${H.esc(st.schoolName || '')}</div>
            <span class="ic-type">${H.esc(roleLabel)}</span></div>
          <div class="ic-terms">
            <b>تعليمات البطاقة:</b><br>
            • هذه البطاقة ملك خاص بـ ${H.esc(st.schoolName || 'المدرسة')}<br>
            • يجب إبرازها داخل الحرم المدرسي<br>
            • عند العثور عليها يُرجى تسليمها للإدارة<br>
            • العام الدراسي: ${H.esc(st.year || '')}
            ${st.phone ? `<br>• هاتف: <span class="num">${H.esc(st.phone)}</span>` : ''}
          </div>
          <div class="ic-foot">
            <div class="ic-barcode"><div class="bars"></div><small class="num">${H.esc(v.sid || '')}</small></div>
            <div class="ic-sign">توقيع المدير</div>
          </div>
        </div>
      </div>`;
    }

    return `
    <div class="idcard tpl-${tpl}" style="--cd:${color};--cd2:${c2};${small ? 'transform:scale(.9)' : ''}">
      <div class="ic-inner">
        <div class="ic-head">
          <img class="ic-logo" src="${st.logo || 'assets/images/logo.png'}" alt="">
          <div class="ic-school">${H.esc(st.schoolName || '')}</div>
          <span class="ic-type">${H.esc(roleLabel)}</span>
        </div>
        <div class="ic-body">
          <img class="ic-photo" src="${v.photo || 'assets/images/default-avatar.png'}" alt="">
          <div class="ic-data">
            <div class="ic-name">${H.esc(v.name || '')}</div>
            ${extraRows}
            <div class="row"><b>العام:</b><span>${H.esc(st.year || '')}</span></div>
          </div>
        </div>
        <div class="ic-foot">
          <img class="ic-qr" src="${qr}" alt="QR">
          <div class="ic-barcode"><div class="bars"></div><small class="num">${H.esc(v.sid || '')}</small></div>
          <span class="ic-id num">${H.esc(v.sid || '')}</span>
        </div>
      </div>
    </div>`;
  }

  const P = {
    id: 'id-card-studio',

    openFor(studentId) { state.type = 'student'; state.personId = studentId; },

    render(root) {
      const types = Config.CARD_TYPES;
      const saved = tplSaved(state.type);
      /* شخص افتراضي */
      const persons = this.personList();
      if (!state.personId && persons.length) state.personId = persons[0].id;
      const v = this.currentValues();

      root.innerHTML = `<div class="page">
        ${UI.pageHead('🪪 استوديو البطاقات الذكية', `
          <button class="btn btn-primary" data-action="card:printOne">🖨️ طباعة البطاقة</button>
          <button class="btn btn-gold" data-action="card:pdfOne">📄 PDF</button>
          ${state.type === 'student' ? `<button class="btn btn-ghost" data-action="card:printClass">🖨️ بطاقات صف كامل</button>` : ''}
        `, 'تصميم عصري — لون لكل مرحلة دراسية وقالب مميز لكل فئة')}

        <div class="tabs">
          ${types.map((t) => `<button class="tab ${state.type === t.id ? 'active' : ''}" data-action="card:selType" data-t="${t.id}">${t.ico} ${t.label}</button>`).join('')}
        </div>

        <div class="card mb-16">
          <div class="studio-panel">
            <div class="field"><label>${state.type === 'student' ? 'الطالب' : 'الموظف'}</label>
              <select data-input="card:selPerson">
                ${persons.map((p) => `<option value="${p.id}" ${state.personId === p.id ? 'selected' : ''}>${H.esc(p.name)} — ${H.esc(p.sid || '')}</option>`).join('')}
              </select></div>
            ${state.type === 'student' ? `
            <div class="field"><label>تجهيز صف كامل (للطباعة الجماعية)</label>
              <select data-input="card:selClass">
                <option value="">— اختر صف —</option>
                ${Store.col('classes').map((c) => `<option value="${c.id}" ${state.classId === c.id ? 'selected' : ''}>${H.esc(c.name)}</option>`).join('')}
              </select></div>` : ''}
            <div class="field"><label>قالب التصميم</label>
              <select data-input="card:selTpl">
                ${Config.CARD_TEMPLATES.map((t) => `<option value="${t.id}" ${v.tpl === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
              </select></div>
            <div class="field"><label>اللون ${state.type === 'student' ? '(افتراضي: لون المرحلة — قابل للتخصيص)' : ''}</label>
              <div class="color-row">
                ${Config.COLOR_SWATCHES.map((c) => `<span class="color-swatch ${v.color === c ? 'active' : ''}" style="background:${c}" data-action="card:color" data-c="${c}"></span>`).join('')}
                <input type="color" value="${v.color}" data-input="card:customColor" style="width:46px;height:36px;padding:2px;border-radius:9px;border:1.5px solid var(--line-2)" title="لون مخصص">
              </div></div>
          </div>
          ${state.type !== 'student' ? `<div class="mt-8"><button class="btn btn-soft btn-sm btn-write" data-action="card:saveTpl">💾 حفظ هذا القياس كقالب افتراضي للفئة</button></div>` : ''}
        </div>

        <div class="studio-stage">
          <div>${cardHTML(v)}</div>
          <div>${cardHTML(v, { back: true })}</div>
        </div>
      </div>`;
    },

    personList() {
      if (state.type === 'student')
        return Store.sortBy(Store.col('students').filter((s) => !state.classId || s.classId === state.classId), 'name');
      return Store.sortBy(Store.col('employees').filter((e) => e.empKind === state.type), 'name');
    },

    currentValues() {
      const p = person();
      const saved = tplSaved(state.type);
      let color = saved.color, tpl = saved.tpl;
      if (state.type === 'student' && p) {
        const stg = Store.get('stages', p.stageId);
        if (stg && stg.color) color = stg.color;
      }
      if (state._tplOverride) tpl = state._tplOverride;
      if (state._colorOverride) color = state._colorOverride;
      return {
        type: state.type, tpl, color,
        name: p ? p.name : '—', sid: p ? (p.sid || p.id.slice(-6).toUpperCase()) : '',
        photo: p ? p.photo : '', stageId: p ? p.stageId : '', classId: p ? p.classId : '',
        job: p ? p.job : '', specialization: p ? p.specialization : ''
      };
    },

    /* ---------- طباعة ---------- */
    printPairHTML(v) {
      return `<div class="idcard-print-grid avoid-break">${cardHTML(v)}${cardHTML(v, { back: true })}<div class="cut-hint">قص على الخط — وجه / ظهر</div></div>`;
    },

    batchHTML(list) {
      const st = Store.settings();
      return `<div class="print-doc">
        <div class="pd-page" style="padding:4mm">
          <div class="pd-head" style="margin-bottom:6px">
            <img src="${st.logo || 'assets/images/logo.png'}" alt="" style="width:44px;height:44px">
            <div style="flex:1"><b style="font-size:13px">${H.esc(st.schoolName || '')}</b><small>بطاقات تعريف — ${H.fmtDate(H.today())}</small></div>
          </div>
          ${list.map((v) => this.printPairHTML(v)).join('')}
        </div>
      </div>`;
    },

    async saveTpl() {
      const saved = tplSaved(state.type);
      saved.color = state._colorOverride || saved.color;
      saved.tpl = state._tplOverride || saved.tpl;
      Store.put('idTemplates', saved);
      UI.toast('تم حفظ قالب الفئة ✓', 'success');
      Audit.log('تعديل', `قالب بطاقة: ${state.type}`);
    }
  };

  /* ================= الأفعال ================= */
  Actions.register('card', {
    selType(ds) {
      state.type = ds.t; state.personId = '';
      state._tplOverride = null; state._colorOverride = null;
      P.render(document.getElementById('page-root'));
    },
    selPerson(el, val) { state.personId = val; P.render(document.getElementById('page-root')); },
    selClass(el, val) { state.classId = val; state.personId = ''; P.render(document.getElementById('page-root')); },
    selTpl(el, val) { state._tplOverride = val; P.render(document.getElementById('page-root')); },
    color(ds) { state._colorOverride = ds.c; P.render(document.getElementById('page-root')); },
    customColor(el, val) { state._colorOverride = val; P.render(document.getElementById('page-root')); },
    saveTpl() { P.saveTpl(); },

    printOne() {
      const v = P.currentValues();
      if (!v.name || v.name === '—') return UI.toast('اختر شخصاً أولاً', 'warn');
      ReportIntl.preview(P.printPairHTML(v), { title: 'بطاقة تعريف', orientation: 'portrait' });
    },
    pdfOne() {
      const v = P.currentValues();
      if (!v.name || v.name === '—') return UI.toast('اختر شخصاً أولاً', 'warn');
      if (window.PDFEnterprise) PDFEnterprise.download(P.batchHTML([v]), `بطاقة-${v.sid}.pdf`, 'portrait');
    },
    printClass() {
      if (!state.classId) return UI.toast('اختر صف أولاً', 'warn');
      const sts = Store.col('students').filter((s) => s.classId === state.classId && s.status !== 'withdrawn');
      if (!sts.length) return UI.toast('لا طلاب في هذا الصف', 'warn');
      const list = sts.map((s) => {
        const stg = Store.get('stages', s.stageId) || {};
        const saved = tplSaved('student');
        return {
          type: 'student', tpl: saved.tpl, color: stg.color || saved.color,
          name: s.name, sid: s.sid, photo: s.photo, stageId: s.stageId, classId: s.classId
        };
      });
      UI.loading(true, `تجهيز ${list.length} بطاقة…`);
      setTimeout(() => {
        UI.loading(false);
        ReportIntl.preview(P.batchHTML(list), { title: `بطاقات ${list.length} طالب`, orientation: 'portrait' });
      }, 80);
    }
  });

  window.Pages = window.Pages || {};
  Pages['id-card-studio'] = P;
})();

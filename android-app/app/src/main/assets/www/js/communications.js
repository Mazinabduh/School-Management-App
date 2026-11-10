/* =========================================================
   communications.js — إشعارات أولياء الأمور والتعميمات السريعة
   ========================================================= */
'use strict';

(function () {
  let tab = 'notices';

  const TEMPLATES = [
    { id: 'due', ico: '⏳', label: 'تنبيه تأخر سداد', text: 'السلام عليكم ورحمة الله،\nنفيدكم بأن ابكم/ابنتكم {name} لديه مبلغ متأخر بقيمة {due} عن {item}.\nنرجو التكرم بالسداد في أقرب وقت. شكراً لتعاونكم.\n{school}' },
    { id: 'absence', ico: '🚫', label: 'إشعار غياب', text: 'السلام عليكم،\nنلحظكم بغياب الطالب/ة {name} اليوم {date}.\nنرجو التكرم بالتواصل مع شؤون الطلاب.\n{school}' },
    { id: 'meeting', ico: '📅', label: 'دعوة اجتماع', text: 'السلام عليكم،\nيسرّنا دعوتكم لحضور اجتماع أولياء أمور {class} يوم {date}.\nحضوركم إثراء لدور أبنائكم.\n{school}' },
    { id: 'result', ico: '🏅', label: 'إعلان نتيجة', text: 'السلام عليكم،\nتم إصدار نتائج {term} للطالب/ة {name}.\nيمكن مراجعة كشف الدرجات من إدارة المدرسة.\n{school}' }
  ];

  const P = {
    id: 'communications',

    render(root) {
      const notices = Store.sortBy(Store.col('notices'), 'date').reverse();
      root.innerHTML = `<div class="page">
        ${UI.pageHead('📣 تواصل أولياء الأمور', `
          <button class="btn btn-primary btn-write" data-action="com:addNotice">➕ تعميم جديد</button>
        `)}
        <div class="tabs">
          <button class="tab ${tab === 'notices' ? 'active' : ''}" data-action="com:tab" data-t="notices">📋 التعميمات (${notices.length})</button>
          <button class="tab ${tab === 'sms' ? 'active' : ''}" data-action="com:tab" data-t="sms">💬 رسائل أولياء الأمور</button>
          <button class="tab ${tab === 'late' ? 'active' : ''}" data-action="com:tab" data-t="late">⏳ قائمة المتأخرين</button>
        </div>
        ${tab === 'notices' ? this.noticesHTML(notices) : tab === 'sms' ? this.smsHTML() : this.lateHTML()}
      </div>`;
    },

    noticesHTML(notices) {
      return notices.length ? notices.map((n) => `
        <div class="card mb-16">
          <div class="card-title">${H.esc(n.title)} <small class="muted">${H.fmtDate(n.date)}</small></div>
          <p style="white-space:pre-wrap;font-size:13.5px">${H.esc(n.body)}</p>
          <div class="flex gap-8 mt-8">
            <button class="btn btn-soft btn-sm" data-action="com:copyNotice" data-id="${n.id}">📋 نسخ النص</button>
            <button class="btn btn-ghost btn-sm btn-write" data-action="com:delNotice" data-id="${n.id}">🗑️ حذف</button>
          </div>
        </div>`).join('') : UI.empty('📋', 'لا تعميمات — أضف أول تعميم');
    },

    smsHTML() {
      return `<div class="card">
        <div class="card-title">💬 مولد رسائل أولياء الأمور <small class="muted">جاهزة للنسخ إلى تطبيق الواتساب أو SMS</small></div>
        <div class="form-grid">
          <div class="field"><label>الطالب</label>
            <select id="sms-student" data-input="com:smsStudent">
              <option value="">— اختر —</option>
              ${Store.sortBy(Store.col('students').filter((s) => s.status !== 'withdrawn'), 'name').map((s) => `<option value="${s.id}">${H.esc(s.name)} — ${H.esc(s.sid || '')}</option>`).join('')}
            </select></div>
          <div class="field"><label>نوع الرسالة</label>
            <select id="sms-template" data-input="com:smsTemplate">
              ${TEMPLATES.map((t) => `<option value="${t.id}">${t.ico} ${t.label}</option>`).join('')}
            </select></div>
        </div>
        <div class="field"><label>نص الرسالة (قابل للتعديل)</label>
          <textarea id="sms-text" rows="6"></textarea></div>
        <div class="flex gap-8 wrap">
          <button class="btn btn-primary" data-action="com:copySms">📋 نسخ الرسالة</button>
          <span class="muted" id="sms-phone" style="align-self:center"></span>
        </div>
      </div>`;
    },

    lateHTML() {
      const rows = [];
      for (const s of Store.col('students').filter((x) => x.status !== 'withdrawn')) {
        const p = Store.find('feeplans', (x) => x.studentId === s.id);
        const late = (p ? p.items : []).filter((i) => !i.paid && i.due && i.due < H.today());
        if (late.length) rows.push({ s, total: H.sum(late, (i) => i.amount), n: late.length, first: late[0] });
      }
      return `<div class="alert-strip mb-16">⏳ ${rows.length} طالب لديهم مستحقات متأخرة — إجمالي ${H.money(H.sum(rows, (r) => r.total))}</div>
        <div class="flex gap-8 mb-16 wrap">
          <button class="btn btn-ghost" data-action="com:exportLate">📊 تصدير أرقام الهواتف (Excel)</button>
          <button class="btn btn-ghost" data-action="com:printLate">🖨️ طباعة القائمة</button>
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>الطالب</th><th>الصف</th><th>هاتف ولي الأمر</th><th>عدد المتأخرات</th><th>الإجمالي</th><th></th></tr></thead>
          <tbody>
            ${rows.length ? rows.map((r) => `<tr>
              <td style="font-weight:800">${H.esc(r.s.name)}</td>
              <td>${H.esc((Store.get('classes', r.s.classId) || {}).name || '—')}</td>
              <td class="num">${H.esc(r.s.phone || '—')}</td>
              <td>${r.n}</td>
              <td class="money" style="font-weight:900;color:var(--danger)">${H.money(r.total)}</td>
              <td><button class="btn btn-soft btn-sm" data-action="com:quickLate" data-id="${r.s.id}">💬 رسالة تأخير</button></td>
            </tr>`).join('') : `<tr><td colspan="6">${UI.empty('✅', 'لا يوجد متأخرون — بارك الله فيكم')}</td></tr>`}
          </tbody>
        </table></div>`;
    },

    /* ---------- مولد نص الرسالة ---------- */
    fillTemplate(tplId, sid) {
      const s = Store.get('students', sid);
      const t = TEMPLATES.find((x) => x.id === tplId) || TEMPLATES[0];
      const st = Store.settings();
      let dueTxt = '—', itemTxt = '—';
      if (s) {
        const p = Store.find('feeplans', (x) => x.studentId === s.id);
        const late = (p ? p.items : []).filter((i) => !i.paid && i.due && i.due < H.today());
        if (late.length) { dueTxt = H.money(H.sum(late, (i) => i.amount)); itemTxt = late[0].label; }
      }
      return (t.text || '')
        .replace('{name}', s ? s.name : '______')
        .replace('{due}', dueTxt)
        .replace('{item}', itemTxt)
        .replace('{date}', H.fmtDate(H.today()))
        .replace('{class}', s ? ((Store.get('classes', s.classId) || {}).name || '') : '')
        .replace('{term}', st.term1 || '')
        .replace('{school}', st.schoolName || '');
    },

    async noticeForm() {
      const d = await UI.form('➕ تعميم جديد', [
        { name: 'title', label: 'عنوان التعميم', req: true },
        { name: 'body', label: 'النص', type: 'textarea', req: true, rows: 5 },
        { name: 'date', label: 'التاريخ', type: 'date', req: true, value: H.today() }
      ]);
      if (!d) return;
      Store.put('notices', d);
      Audit.log('إضافة', `تعميم: ${d.title}`);
      Router.refresh();
    }
  };

  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => UI.toast('تم النسخ ✓', 'success')).catch(() => fallbackCopy(txt));
    } else fallbackCopy(txt);
  }
  function fallbackCopy(txt) {
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); UI.toast('تم النسخ ✓', 'success'); } catch (e) { UI.toast('انسخ يدوياً', 'warn'); }
    ta.remove();
  }

  Actions.register('com', {
    tab(ds) { tab = ds.t; P.render(document.getElementById('page-root')); },
    addNotice() { P.noticeForm(); },
    copyNotice(ds) { const n = Store.get('notices', ds.id); if (n) copyText(`${n.title}\n${n.body}`); },
    async delNotice(ds) {
      if (!await UI.confirm({ title: 'حذف تعميم', okLabel: 'حذف', danger: true })) return;
      Store.del('notices', ds.id);
      Router.refresh();
    },
    smsStudent(el, val) {
      const txt = P.fillTemplate(document.getElementById('sms-template').value, val);
      document.getElementById('sms-text').value = txt;
      const s = Store.get('students', val);
      document.getElementById('sms-phone').textContent = s && s.phone ? `📞 ${s.phone}` : '';
    },
    smsTemplate(el, val) {
      const sid = document.getElementById('sms-student').value;
      document.getElementById('sms-text').value = P.fillTemplate(val, sid);
    },
    copySms() { copyText(document.getElementById('sms-text').value || ''); },
    quickLate(ds) {
      const txt = P.fillTemplate('due', ds.id);
      UI.modal({
        title: '💬 رسالة تأخر سداد',
        body: `<textarea id="late-txt" rows="7" style="width:100%">${H.esc(txt)}</textarea>`,
        foot: [
          { label: 'إغلاق', cls: 'btn-ghost', onClick: (h) => h.close() },
          { label: '📋 نسخ', cls: 'btn-primary', onClick: (h) => { copyText(h.body.querySelector('#late-txt').value); } }
        ]
      });
    },
    exportLate() {
      const rows = [];
      for (const s of Store.col('students')) {
        const p = Store.find('feeplans', (x) => x.studentId === s.id);
        const late = (p ? p.items : []).filter((i) => !i.paid && i.due && i.due < H.today());
        if (late.length) rows.push({ 'الطالب': s.name, 'الصف': (Store.get('classes', s.classId) || {}).name || '', 'الهاتف': s.phone || '', 'المتأخرات': late.length, 'الإجمالي': H.sum(late, (i) => i.amount) });
      }
      if (window.OfficeExport) OfficeExport.excel('المتأخرون.xlsx', 'المتأخرات', rows);
    },
    printLate() {
      const rows = [];
      for (const s of Store.col('students')) {
        const p = Store.find('feeplans', (x) => x.studentId === s.id);
        const late = (p ? p.items : []).filter((i) => !i.paid && i.due && i.due < H.today());
        if (late.length) rows.push([s.name, (Store.get('classes', s.classId) || {}).name || '', s.phone || '', String(late.length), H.money(H.sum(late, (i) => i.amount))]);
      }
      ReportIntl.preview(ReportIntl.genericTableHTML('قائمة المتأخرين مالياً', ['الطالب', 'الصف', 'الهاتف', 'عدد المتأخرات', 'الإجمالي'], rows, ''), { title: 'المتأخرون', orientation: 'portrait' });
    }
  });

  window.Pages = window.Pages || {};
  Pages.communications = P;
})();

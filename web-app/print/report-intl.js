/* =========================================================
   report-intl.js — بوابة القوالب الموحدة — مستيل تطبيق المحطة بالضبط
   كل القوالب تُبنى الآن عبر PrintProV2026 (نظام pp-* من المحطة v2026.87)
   فقط محتوى التقارير يختلف حسب وظيفة كل تقرير — كما في المحطة
   معاينة قبل الطباعة + طباعة iframe + PDF
   ========================================================= */
'use strict';

(function () {
  /* البناء عبر محرك المحطة إن وُجد — وإلا القالب الكلاسيكي احتياطاً */
  function viaPrintPro(buildFn) {
    if (window.PrintProV2026) {
      try { return buildFn(PrintProV2026); } catch (e) { console.error('PrintPro', e); }
    }
    return null;
  }

  const ReportIntl = {

    /* ================= معاينة + خيارات ================= */
    preview(html, { title = 'مستند', orientation = 'portrait' } = {}) {
      const m = UI.modal({
        title: `👁️ معاينة: ${title}`,
        wide: true,
        body: `<div style="background:var(--bg-2);padding:14px;border-radius:14px;overflow:auto;max-height:64vh">
                 <div style="max-width:${orientation === 'landscape' ? '1000px' : '760px'};margin:0 auto;box-shadow:var(--sh-3);border-radius:12px;overflow:hidden;background:#fff">
                 ${html}
                 </div></div>`,
        foot: [
          { label: 'إغلاق', cls: 'btn-ghost', onClick: (h) => h.close() },
          { label: '📄 تنزيل PDF', cls: 'btn-gold', onClick: (h) => { h.close(); PDFEnterprise.download(html, `${title}.pdf`, orientation); } },
          { label: '🖨️ طباعة', cls: 'btn-primary', onClick: (h) => { h.close(); ReportIntl.print(html, { orientation }); } }
        ]
      });
      return m;
    },

    /* ================= طباعة مباشرة ================= */
    print(html, { orientation = 'portrait' } = {}) {
      PrintSettingsEngine.print(html, { orientation });
    },

    /* ================= قالب جدول عام — مستيل المحطة ================= */
    genericTableHTML(title, headers, rows, foot = '') {
      const pp = viaPrintPro((P) => P.genericTableHTML(title, headers, rows, foot));
      if (pp) return pp;
      /* احتياط */
      return `<div class="print-doc"><div class="pd-page"><h3 style="text-align:center">${H.esc(title)}</h3>
        <table><thead><tr>${headers.map((h) => `<th>${H.esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${H.esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    },

    /* ================= كشف درجات مادة لصف — مستيل المحطة ================= */
    gradeSheetHTML(d) {
      const pp = viaPrintPro((P) => P.gradeSheetHTML(d));
      if (pp) return pp;
      return `<div class="print-doc"><div class="pd-page"><h3 style="text-align:center">كشف درجات: ${H.esc(d.subject)}</h3></div></div>`;
    },

    /* ================= سند قبض A4 رسمي — مستيل المحطة ================= */
    receiptA4HTML(pay, student) {
      const pp = viaPrintPro((P) => P.receiptA4HTML(pay, student));
      if (pp) return pp;
      return `<div class="print-doc"><div class="pd-page"><h3 style="text-align:center">سند قبض ${H.esc(pay.receiptNo || '')}</h3></div></div>`;
    },

    /* ================= كشف حساب طالب — مستيل المحطة ================= */
    statementHTML({ student, plan, payments }) {
      const pp = viaPrintPro((P) => P.statementHTML({ student, plan, payments }));
      if (pp) return pp;
      return `<div class="print-doc"><div class="pd-page"><h3 style="text-align:center">كشف حساب ${H.esc(student.name || '')}</h3></div></div>`;
    }
  };

  window.ReportIntl = ReportIntl;
})();

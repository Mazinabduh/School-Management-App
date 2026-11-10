/* =========================================================
   office-pro.js — تنسيق الجداول المتقدم وتصدير Word (doc.)
   مستندات Word متوافقة مع RTL تفتح في Word/WPS مباشرة
   ========================================================= */
'use strict';

(function () {
  const OfficePro = {
    /* تصدير جدول إلى Word */
    word(filename, title, headers, rows) {
      const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:w="urn:schemas-microsoft-com:office:word" lang="ar" dir="rtl"><head><meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Cairo', 'Segoe UI', Tahoma; direction: rtl; }
          h2 { text-align: center; color: #0b3d91; }
          table { border-collapse: collapse; width: 100%; }
          th { background: #0b3d91; color: #fff; border: 1px solid #7c8fa5; padding: 6px 9px; font-size: 12px; }
          td { border: 1px solid #9db1c9; padding: 5px 9px; font-size: 12px; text-align: center; }
          tr:nth-child(even) td { background: #f2f6fb; }
          .foot { text-align: left; color: #67788f; font-size: 10px; margin-top: 12px; }
        </style></head><body>
        <h2>${title}</h2>
        <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${String(c == null ? '' : c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <p class="foot">صادر من نظام EduPro School ERP v${Config.VERSION} — ${H.fmtDate(H.today())}</p>
        </body></html>`;
      H.download(filename, '\ufeff' + html, 'application/msword');
      UI.toast('تم تصدير ملف Word ✓', 'success');
      Audit.log('تصدير', `تصدير Word: ${filename}`);
    },

    /* تصدير نص إشعار/كتاب إداري */
    letter(filename, title, bodyText) {
      const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>
        <style>body{font-family:'Cairo',Tahoma;direction:rtl;line-height:2;padding:24px}
        h2{color:#0b3d91;border-bottom:2px solid #0b3d91;padding-bottom:8px}</style></head>
        <body><h2>${title}</h2><div style="white-space:pre-wrap">${bodyText}</div></body></html>`;
      H.download(filename, '\ufeff' + html, 'application/msword');
      UI.toast('تم التصدير ✓', 'success');
    }
  };

  window.OfficePro = OfficePro;
})();

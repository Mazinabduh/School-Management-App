/* =========================================================
   office-export.js — تصدير البيانات إلى Excel (xlsx) و CSV
   ========================================================= */
'use strict';

(function () {
  const OfficeExport = {
    /* rows: مصفوفة كائنات {header: value} */
    excel(filename, sheetName = 'بيانات', rows = []) {
      try {
        if (!window.XLSX) {
          /* بديل CSV إن لم تُحمّل المكتبة */
          return this.csv(filename.replace(/\.xlsx$/i, '.csv'), rows);
        }
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'لا بيانات': '—' }]);
        try { ws['!views'] = [{ RTL: true }]; } catch (e) {}
        /* عرض أعمدة تلقائي */
        const headers = rows.length ? Object.keys(rows[0]) : ['لا بيانات'];
        ws['!cols'] = headers.map((h) => {
          let max = String(h).length;
          rows.slice(0, 200).forEach((r) => { max = Math.max(max, String(r[h] == null ? '' : r[h]).length); });
          return { wch: Math.min(38, Math.max(8, max + 3)) };
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));
        XLSX.writeFile(wb, filename);
        UI.toast('تم تصدير Excel ✓', 'success');
        Audit.log('تصدير', `تصدير Excel: ${filename}`);
      } catch (e) {
        console.error('[Excel]', e);
        UI.toast('فشل تصدير Excel: ' + e.message, 'error');
      }
    },

    csv(filename, rows = []) {
      if (!rows.length) return UI.toast('لا بيانات للتصدير', 'warn');
      const headers = Object.keys(rows[0]);
      const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
      const csv = '\ufeff' + [headers.map(esc).join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
      H.download(filename, csv, 'text/csv;charset=utf-8');
      UI.toast('تم تصدير CSV ✓', 'success');
    },

    /* استيراد Excel إلى صفوف كائنات (للاستخدام المستقبلي) */
    async importExcel(file) {
      if (!window.XLSX) { UI.toast('مكتبة Excel غير محمّلة', 'error'); return null; }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { defval: '' });
    }
  };

  window.OfficeExport = OfficeExport;
})();

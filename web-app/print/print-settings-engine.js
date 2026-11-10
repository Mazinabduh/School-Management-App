/* =========================================================
   print-settings-engine.js — إعدادات الطباعة + محرك الإطار المشترك
   كل الطباعة تمر عبر ReliablePrint (iframe srcdoc معزول) — نفس تطبيق المحطة —
   وإعدادات PrintSettingsPro (ورقة/اتجاه/هوامش/خط/نسخ) تُطبَّق تلقائياً
   ========================================================= */
'use strict';

(function () {
  const PrintSettingsEngine = {
    /* ---------- قراءة الإعدادات ---------- */
    opts() {
      const s = Store.settings();
      /* الهوامش والحجم من محرك الإعدادات الجديد (متوافق مع المحطة) */
      let m = 8, copies = 1;
      try {
        const ps = window.PrintSettingsPro ? PrintSettingsPro.getPS() : null;
        if (ps) { m = parseFloat(ps.marginTop) || 0; copies = parseInt(ps.copies, 10) || 1; }
      } catch (e) {}
      return {
        theme: s.printTheme || 'royal',
        margins: m,
        copies,
        header: s.printHeader !== false,
        watermark: s.printWatermark !== false,
        zebra: s.printZebra !== false,
        thermalWidth: parseFloat(s.thermalWidth) || 80,
        logo: s.logo || 'assets/images/logo.png',
        schoolName: s.schoolName || '',
        year: s.year || '',
        currency: s.currency || 'ريال'
      };
    },

    reload() { /* الإعدادات تُقرأ من Store لحظياً — موجودة للتوافق */ },

    /* ---------- CSS إضافي حسب الإعدادات ---------- */
    pageStyle(orientation = 'portrait', mode = 'a4') {
      const o = this.opts();
      if (mode === 'thermal') {
        return `@page { size: ${o.thermalWidth}mm auto; margin: 2.5mm; }
                body { width: ${o.thermalWidth - 5}mm; margin:0; padding:0; background:#fff; }`;
      }
      /* ورقة/اتجاه/هوامش من محرك الإعدادات (نفس تطبيق المحطة) */
      if (window.PrintSettingsPro) {
        return PrintSettingsPro.pageRules(PrintSettingsPro.getPS());
      }
      const orient = orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
      return `@page { size: ${orient}; margin: ${o.margins}mm; } body { background:#fff; margin:0; }`;
    },

    /* ---------- بناء مستند iframe كامل ---------- */
    buildDoc({ bodyClass = '', inner = '', mode = 'a4', orientation = 'portrait' } = {}) {
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')]
        .map((l) => `<link rel="stylesheet" href="${l.href}">`).join('\n');
      const base = `<base href="${location.href.split('#')[0]}">`;
      return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
        ${base}${links}
        <style>${this.pageStyle(orientation, mode)}</style>
        </head><body class="${bodyClass}">
        <div class="print-doc">${inner}</div>
        </body></html>`;
    },

    /* ---------- الطباعة عبر iframe srcdoc معزول (نفس المحطة — محتوى فقط بلا واجهة) ---------- */
    async print(html, { orientation = 'portrait', mode = 'a4', onDone = null, title = 'طباعة' } = {}) {
      /* حراري → يمر عبر مسار الحراري كما هو */
      if (mode === 'thermal') {
        const doc = this.buildDoc({ bodyClass: 'thermal', inner: html, mode, orientation });
        return this._viaReliable(doc, { title: title || 'طباعة حرارية' }, onDone);
      }
      /* بناء المستند الكامل ثم حقن إعدادات الورقة/الخط ثم طباعة معزولة */
      let doc = this.buildDoc({ bodyClass: orientation === 'landscape' ? 'landscape' : '', inner: html, mode, orientation });
      if (window.PrintSettingsPro) doc = PrintSettingsPro.applyToHTMLString(doc);
      return this._viaReliable(doc, { title, orientation }, onDone);
    },

    /* القناة الموثوقة: ReliablePrint معزول + عدد النسخ من الإعدادات */
    async _viaReliable(fullDoc, opts, onDone) {
      if (!window.ReliablePrint) {
        /* احتياط قديم: الإطار الثابت */
        const frame = document.getElementById('print-frame');
        const doc = frame.contentWindow.document;
        doc.open();
        doc.write(fullDoc);
        doc.close();
        setTimeout(() => { try { frame.contentWindow.print(); } catch (e) {} }, 400);
        return;
      }
      try {
        if (window.PrintSettingsPro) {
          /* printWithCopies يطبع «عدد النسخ» المحفوظ في الإعدادات */
          await PrintSettingsPro.printWithCopies(fullDoc, opts);
        } else {
          await ReliablePrint.printHTML(fullDoc, opts);
        }
      } catch (e) {
        console.error('[Print]', e);
        UI.toast('تعذر فتح نافذة الطباعة — استخدم «تنزيل PDF»', 'error');
      }
      if (typeof onDone === 'function') setTimeout(onDone, 600);
    },

    /* ---------- PDF عبر html2canvas + jsPDF (القناة الأساسية الموثوقة على أندرويد) ---------- */
    async pdf(html, filename = 'document.pdf', { orientation = 'portrait', mode = 'a4' } = {}) {
      if (window.PDFEnterprise) return PDFEnterprise.download(html, filename, mode === 'thermal' ? 'thermal' : orientation);
      UI.toast('محرك PDF غير محمّل', 'error');
    }
  };

  window.PrintSettingsEngine = PrintSettingsEngine;
  window.PrintDoc = PrintSettingsEngine;   /* اسم مختصر للاستخدام الداخلي */
})();

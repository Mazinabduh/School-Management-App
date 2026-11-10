/* =========================================================
   reliable-print.js — محرك الطباعة الموثوق (نفس تطبيق المحطة v2026.15)
   طباعة داخل iframe منفصل (srcdoc) — الناتج يحتوي محتوى الطباعة فقط
   بلا أيقونات البرنامج العلوية أو السفلية، ولا صفحات بيضاء عند
   تغيير الطابعة/PDF/المقاس
   ========================================================= */
'use strict';

(function () {
  if (window.__ReliablePrintSchool) return;
  window.__ReliablePrintSchool = true;

  const FRAME_ID = 'rpReliablePrintFrame';

  function _log() {
    try { console.info.apply(console, ['[ReliablePrint]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
  }
  function _toast(msg, type) {
    try { if (typeof UI !== 'undefined' && UI.toast) { UI.toast(msg, type || 'info'); return; } } catch (e) {}
  }

  /* ---------- إزالة الإطار بعد الانتهاء ---------- */
  function removeFrame() {
    try {
      const old = document.getElementById(FRAME_ID);
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}
  }

  /* ---------- انتظار الصور ---------- */
  function waitImages(doc) {
    if (!doc || !doc.images || !doc.images.length) return Promise.resolve();
    const jobs = Array.prototype.map.call(doc.images, (img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        let done = false;
        const fin = () => { if (!done) { done = true; resolve(); } };
        img.addEventListener('load', fin, { once: true });
        img.addEventListener('error', fin, { once: true });
        setTimeout(fin, 4000);
      });
    });
    return Promise.all(jobs);
  }

  /* ---------- انتظار الخطوط ---------- */
  function waitFonts(doc) {
    try {
      if (doc.fonts && doc.fonts.ready && doc.fonts.status !== 'loaded') {
        return Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 5000))]);
      }
    } catch (e) {}
    return Promise.resolve();
  }

  /* ---------- الطباعة الفعلية عبر iframe srcdoc معزول ---------- */
  function printHTML(fullHTML, opts) {
    opts = opts || {};
    removeFrame();
    let html = String(fullHTML || '');
    if (!/<html[\s>]/i.test(html)) html = wrapBody(html, opts.title || 'طباعة');

    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.id = FRAME_ID;
      frame.setAttribute('aria-hidden', 'true');
      frame.title = opts.title || 'طباعة';
      frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
      document.body.appendChild(frame);

      let settled = false;
      function fail(err) {
        if (settled) return;
        settled = true;
        _log('print failed:', err && err.message || err);
        removeFrame();
        reject(err || new Error('print failed'));
      }

      frame.srcdoc = html;

      frame.onload = () => {
        const w = frame.contentWindow;
        let doc = null;
        try { doc = w.document; } catch (e) { fail(e); return; }
        if (!doc || !doc.body) { fail(new Error('empty print document')); return; }

        Promise.all([waitFonts(doc), waitImages(doc)]).then(() => {
          return new Promise((r) => setTimeout(r, 120));
        }).then(() => {
          try {
            let printed = false;
            function doPrint() {
              if (printed) return;
              printed = true;
              try {
                w.focus();
                w.print();
                settled = true;
                resolve();
                scheduleCleanup();
              } catch (e) { fail(e); }
            }
            try { w.addEventListener('afterprint', () => setTimeout(removeFrame, 400)); } catch (e) {}
            doPrint();
            /* محاولة احتياطية بعد 900مث إن لم يبدأ الإطار */
            setTimeout(() => {
              if (!settled) {
                try { w.print(); settled = true; resolve(); scheduleCleanup(); } catch (e) { fail(e); }
              }
            }, 900);
          } catch (e) { fail(e); }
        }).catch(fail);
      };

      frame.onerror = () => fail(new Error('iframe load error'));
      setTimeout(() => { if (!settled) fail(new Error('print timeout')); }, 30000);
    });
  }

  function scheduleCleanup() {
    setTimeout(removeFrame, 5 * 60 * 1000);
    try {
      window.addEventListener('afterprint', function onAfter() {
        window.removeEventListener('afterprint', onAfter);
        setTimeout(removeFrame, 600);
      });
    } catch (e) {}
  }

  /* ---------- غلاف مستند طباعة كامل ---------- */
  function wrapBody(bodyHTML, title) {
    const isAndroid = typeof window !== 'undefined' && window.AndroidBridge;
    const fontBase = isAndroid ? 'file:///android_asset/www/fonts' : 'fonts';
    return '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>' + String(title || 'طباعة').replace(/[<>&]/g, '') + '</title>' +
      '<style>' +
      '@font-face{font-family:"Cairo";font-style:normal;font-weight:400;font-display:swap;src:url("' + fontBase + '/Cairo.ttf") format("truetype")}' +
      '@font-face{font-family:"Cairo";font-style:normal;font-weight:700;font-display:swap;src:url("' + fontBase + '/Cairo.ttf") format("truetype")}' +
      '@font-face{font-family:"Cairo";font-style:normal;font-weight:800;font-display:swap;src:url("' + fontBase + '/Cairo.ttf") format("truetype")}' +

      '@page { size: A4 portrait; margin: 12mm; }' +
      '* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }' +
      'body { font-family:"Cairo",Tahoma,sans-serif; direction:rtl; color:#0a1628; background:#fff; padding:0; line-height:1.6; width:100%; }' +
      '.print-head { text-align:center; padding:10px; border-bottom:2px solid #1565c0; margin-bottom:15px; }' +
      '.print-head h2 { color:#1565c0; font-size:18pt; margin:0; }' +
      '.print-head p { color:#666; font-size:10pt; margin:4px 0 0; }' +
      '.print-foot { text-align:center; padding:8px; border-top:1px solid #ccc; margin-top:15px; font-size:9pt; color:#666; }' +
      'h3 { text-align:center; margin:15px 0; font-size:16pt; font-weight:800; border-bottom:2px solid #333; padding-bottom:8px; }' +
      '.print-tbl { width:100%; border-collapse:collapse; font-size:10pt; margin:10px 0; }' +
      '.print-tbl th { background:#1565c0; color:#fff; padding:8px 6px; border:1px solid #1565c0; font-weight:700; text-align:center; -webkit-print-color-adjust:exact; print-color-adjust:exact; }' +
      '.print-tbl td { padding:6px; border:1px solid #bbdefb; text-align:center; }' +
      '.print-tbl tbody tr:nth-child(even) { background:#f4f9ff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }' +
      '.print-page { width:100%; max-width:100%; }' +
      'table { max-width:100%; }' +
      '@media print { body { padding:0; } }' +
      '</style></head><body>' + bodyHTML + '</body></html>';
  }

  /* ---------- هل المستند حراري؟ ---------- */
  function isThermalDoc(html) {
    return /@page[^}]*size\s*:\s*(58|80)\s*mm/i.test(String(html || '')) ||
           /size\s*:\s*(58|80)\s*mm/i.test(String(html || ''));
  }

  /* ---------- ملاءمة كامل صفحة A4 ---------- */
  function ensureFullA4(html) {
    if (isThermalDoc(html)) return html;
    const fit = '<style data-rp-fit>' +
      '@page { margin: 12mm !important; }' +
      '.pp-doc,.pp-report,.ent-doc,.print-page,.inv-doc,.print-doc,.pd-page{width:100% !important;max-width:100% !important;margin:0 auto !important;box-shadow:none !important;border-radius:0 !important}' +
      '.pp-table,.print-tbl,.ent-tbl,.print-doc table{width:100% !important}' +
      '</style>';
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, fit + '</body>');
    return html + fit;
  }

  window.ReliablePrint = {
    printHTML,
    wrapBody,
    ensureFullA4,
    isThermalDoc,
    removeFrame,
    version: 'school-1.0'
  };

  _log('محرك الطباعة الموثوق جاهز — الطباعة معزولة عن واجهة البرنامج');
})();

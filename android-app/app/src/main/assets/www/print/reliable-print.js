/* =========================================================
   reliable-print.js — محرك الطباعة الموثوق (نفس تطبيق المحطة v2026.15)
   على أندرويد: منطقة #printZone داخل المستند الرئيسي + native-printing
   لإخفاء واجهة البرنامج كاملة، ثم AndroidBridge.printPageWithTitle —
   نظام الطباعة الأصلي (PrintManager) يطبع محتوى الطباعة فقط بلا أيقونات
   التطبيق العلوية أو السفلية وبلا صفحات بيضاء.
   في المتصفح: طباعة داخل iframe منفصل (srcdoc) كما في النسخة الويب.
   ========================================================= */
'use strict';

(function () {
  if (window.__ReliablePrintSchool) return;
  window.__ReliablePrintSchool = true;

  const FRAME_ID = 'rpReliablePrintFrame';
  const ZONE_ID = 'printZone';

  function _log() {
    try { console.info.apply(console, ['[ReliablePrint]'].concat(Array.prototype.slice.call(arguments))); } catch (e) {}
  }
  function _toast(msg, type) {
    try { if (typeof UI !== 'undefined' && UI.toast) { UI.toast(msg, type || 'info'); return; } } catch (e) {}
  }

  /* ---------- هل نحن داخل تطبيق أندرويد؟ ---------- */
  function nativeMode() {
    try {
      return typeof window !== 'undefined' && window.AndroidBridge &&
        (typeof window.AndroidBridge.printPageWithTitle === 'function' || typeof window.AndroidBridge.printPage === 'function');
    } catch (e) { return false; }
  }

  /* ═══════════ مسار أندرويد — نفس تطبيق المحطة حرفياً ═══════════ */

  function nativePrintHTML(fullHTML, opts) {
    opts = opts || {};
    let zone = document.getElementById(ZONE_ID);
    if (!zone) {
      zone = document.createElement('div');
      zone.id = ZONE_ID;
      document.body.appendChild(zone);
    }

    const bridge = window.AndroidBridge;
    const jobTitle = String(opts.title || 'طباعة');
    const orientation = String(opts.orientation || '');
    const root = document.documentElement;
    const previousRootBackground = root.style.backgroundColor;
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousBodyColor = document.body.style.color;
    const previousBodyOverflow = document.body.style.overflow;

    root.classList.add('native-printing');
    document.body.classList.add('native-printing');
    root.style.backgroundColor = '#ffffff';
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#0a1628';
    document.body.style.overflow = 'visible';

    const cleanup = () => {
      try {
        if (window.__nativePrintCleanupTimer) {
          clearTimeout(window.__nativePrintCleanupTimer);
          window.__nativePrintCleanupTimer = null;
        }
        zone.style.display = 'none';
        zone.style.position = '';
        zone.style.height = '';
        zone.style.maxHeight = '';
        zone.style.overflow = '';
        zone.style.backgroundColor = '';
        zone.style.color = '';
        zone.style.width = '';
        zone.style.maxWidth = '';
        zone.style.margin = '';
        zone.style.padding = '';
        zone.innerHTML = '';
        zone.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('printing');
        if (nativePrintStyle && nativePrintStyle.parentNode) {
          nativePrintStyle.parentNode.removeChild(nativePrintStyle);
          nativePrintStyle = null;
        }
        root.classList.remove('native-printing');
        document.body.classList.remove('native-printing');
        root.style.backgroundColor = previousRootBackground;
        document.body.style.backgroundColor = previousBodyBackground;
        document.body.style.color = previousBodyColor;
        document.body.style.overflow = previousBodyOverflow;
        if (window.__nativePrintCleanup === cleanup) window.__nativePrintCleanup = null;
      } catch (e) { void 0; }
    };
    window.__eduProPrintCleanup = cleanup;
    window.__nativePrintCleanup = cleanup;

    /* مستند كامل؟ استخرج كل وسم <style> (الرأس + جسم) + محتوى الجسم فقط —
       أنماط البرنامج الأساسية موجودة أصلاً في المستند الرئيسي */
    let printMarkup = String(fullHTML || '');
    if (/<(?:!doctype|html\b)/i.test(printMarkup) && typeof DOMParser !== 'undefined') {
      try {
        const parsed = new DOMParser().parseFromString(printMarkup, 'text/html');
        const styles = Array.prototype.map.call(
          parsed.querySelectorAll('style'),
          (st) => st.outerHTML
        ).join('');
        printMarkup = styles + (parsed.body ? parsed.body.innerHTML : printMarkup);
      } catch (e) { void 0; }
    }

    let nativePrintStyle = null;
    zone.innerHTML = printMarkup;

    nativePrintStyle = document.createElement('style');
    nativePrintStyle.id = 'native-print-layout-fix';
    nativePrintStyle.textContent = [
      'html.native-printing, body.native-printing{background:#fff!important;color:#0a1628!important;margin:0!important;padding:0!important}',
      'body.native-printing #printZone{display:block!important;position:static!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:0!important;background:#fff!important;color:#0a1628!important;overflow:visible!important}',
      'body.native-printing #app,body.printing #app,body.native-printing #page-root,body.printing #page-root,body.native-printing #topbar,body.native-printing #sidebar,body.native-printing #sidebar-backdrop,body.native-printing #bottomnav,body.native-printing #toast-root,body.native-printing #modal-root{display:none!important}',
      'body.native-printing #printZone .pp-doc,body.native-printing #printZone .pp-report,body.native-printing #printZone .printable,body.native-printing #printZone .print-page,body.native-printing #printZone .print-doc{width:100%!important;max-width:none!important;margin:0!important;background:#fff!important;box-shadow:none!important;border-radius:0!important;overflow:visible!important}',
      'body.native-printing #printZone .pp-page{width:100%!important;max-width:none!important;background:#fff!important}',
      '@media print{html.native-printing,body.native-printing{width:auto!important;min-height:0!important}body.native-printing #printZone{width:100%!important;height:auto!important;min-height:0!important}}'
    ].join('');
    zone.appendChild(nativePrintStyle);
    zone.style.backgroundColor = '#ffffff';
    zone.style.color = '#0a1628';
    zone.style.width = '100%';
    zone.style.maxWidth = 'none';
    zone.style.margin = '0';
    zone.style.padding = '0';

    zone.style.display = 'block';
    zone.style.position = 'static';
    zone.style.height = 'auto';
    zone.style.maxHeight = 'none';
    zone.style.overflow = 'visible';
    zone.setAttribute('aria-hidden', 'false');
    document.body.classList.add('printing');
    try { window.scrollTo(0, 0); } catch (e) { void 0; }

    /* انتظار الخطوط والصور ثم استدعاء الطباعة الأصلية (نفس المحطة) */
    const waitFonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    const images = Array.prototype.slice.call(zone.querySelectorAll('img'));
    const waitImages = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 2500);
      });
    });

    return Promise.all([waitFonts].concat(waitImages)).then(() => {
      return new Promise((r) => setTimeout(r, 250));
    }).then(() => {
      if (!bridge || typeof bridge.printPageWithTitle !== 'function') {
        try {
          if (bridge && typeof bridge.printPage === 'function') { bridge.printPage(); }
          else { window.print(); }
        } catch (e) { cleanup(); throw e; }
        window.__nativePrintCleanupTimer = setTimeout(cleanup, 10 * 60 * 1000);
        return true;
      }
      try {
        if (orientation === 'landscape' || orientation === 'portrait') {
          bridge.printPageWithTitle(jobTitle, orientation);
        } else {
          bridge.printPageWithTitle(jobTitle);
        }
      } catch (e) {
        _log('native print failed', e);
        cleanup();
        throw e;
      }
      window.__nativePrintCleanupTimer = setTimeout(cleanup, 10 * 60 * 1000);
      return true;
    }).catch((e) => {
      cleanup();
      throw e;
    });
  }

  /* ═══════════ مسار المتصفح — iframe srcdoc معزول ═══════════ */

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
  function printHTMLBrowser(fullHTML, opts) {
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

  /* ---------- الغلاف الكامل لمقتطف HTML (متصفح) ---------- */
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

  /* ---------- نقطة الدخول الموحدة ---------- */
  function printHTML(fullHTML, opts) {
    if (nativeMode()) return nativePrintHTML(fullHTML, opts);
    return printHTMLBrowser(fullHTML, opts);
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
    nativePrintHTML,
    printHTMLBrowser,
    wrapBody,
    ensureFullA4,
    isThermalDoc,
    removeFrame,
    nativeMode,
    version: 'school-1.1'
  };

  _log('محرك الطباعة الموثوق جاهز — أندرويد: printZone أصلية، متصفح: iframe معزول');
})();

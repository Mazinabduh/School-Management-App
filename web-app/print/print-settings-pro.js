/* =========================================================
   print-settings-pro.js — محرك إعدادات الطباعة (نفس تطبيق المحطة v2026.17)
   ورقة A4/A5/Letter/مخصصة + اتجاه عمودي/أفقي + هوامش كاملة
   + خط عربي وحجم الخط الأساسي وحجم خط كل قسم + عدد النسخ
   + CSS مخصص — تُطبَّق على الطباعة العادية وPDF معاً
   ========================================================= */
'use strict';

(function () {
  if (window.__PrintSettingsProSchool) return;
  window.__PrintSettingsProSchool = true;

  const MM_PX = 96 / 25.4;

  function _log() {
    try { console.info.apply(console, ['[PrintSettingsPro]'].concat([].slice.call(arguments))); } catch (e) {}
  }
  function num(v, d) { const n = parseFloat(v); return isNaN(n) ? (d || 0) : Math.max(0, Math.min(50, n)); }

  /* ---------- قراءة الإعدادات المحفوظة ---------- */
  function savedSettings() {
    try {
      const s = (typeof Store !== 'undefined' && Store.settings) ? Store.settings() : null;
      return (s && s.printSettings) ? s.printSettings : null;
    } catch (e) { return null; }
  }

  /* إعدادات افتراضية — متوافقة مع مفاتيح تطبيق المحطة */
  const DEFAULTS = {
    copies: 1,
    paperSize: 'A4',
    customWidth: 210,
    customHeight: 297,
    orientation: 'portrait',
    marginTop: 8, marginBottom: 8, marginRight: 8, marginLeft: 8,
    fontFamily: 'Cairo',
    fontSize: 11,
    titleFontSize: 0, tableHeaderFontSize: 0, tableBodyFontSize: 0, footerFontSize: 0,
    customCSS: ''
  };

  /* ترحيل إعدادات الطباعة القديمة (printMargins) مرة واحدة */
  function migrateOnce() {
    try {
      if (typeof Store === 'undefined' || !Store.settings) return;
      const s = Store.settings();
      if (!s.printSettings) {
        const oldM = parseFloat(s.printMargins);
        s.printSettings = Object.assign({}, DEFAULTS, {
          marginTop: !isNaN(oldM) ? oldM : 8,
          marginBottom: !isNaN(oldM) ? oldM : 8,
          marginRight: !isNaN(oldM) ? oldM : 8,
          marginLeft: !isNaN(oldM) ? oldM : 8
        });
        if (Store.flush) Store._mark ? Store._mark('settings') : null;
        _log('ترحيل إعدادات الطباعة إلى المحرك الجديد');
      }
    } catch (e) {}
  }

  function getPS() {
    migrateOnce();
    const saved = savedSettings();
    return Object.assign({}, DEFAULTS, saved || {});
  }

  /* حفظ جزئي/كامل */
  function savePS(patch) {
    try {
      const cur = getPS();
      const next = Object.assign({}, cur, patch || {});
      Store.setSetting('printSettings', next);
      Store.flush();
      return next;
    } catch (e) { _log('save error', e); }
  }

  /* ---------- هل المستند حراري؟ ---------- */
  function isThermalHTML(html) {
    return /size\s*:\s*(58|80)\s*mm/i.test(String(html || ''));
  }

  /* ---------- قاعدة @page حسب الإعدادات (نفس المحطة) ---------- */
  function pageRules(ps) {
    const orient = ps.orientation === 'landscape' ? 'landscape' : 'portrait';
    let size;
    if (ps.paperSize === 'Custom') {
      const w = num(ps.customWidth, 210), h = num(ps.customHeight, 297);
      size = orient === 'landscape' ? (h + 'mm ' + w + 'mm') : (w + 'mm ' + h + 'mm');
    } else if (ps.paperSize === 'A5' || ps.paperSize === 'Letter') {
      size = ps.paperSize + ' ' + orient;
    } else {
      size = 'A4 ' + orient;
    }
    const mT = num(ps.marginTop), mR = num(ps.marginRight), mB = num(ps.marginBottom), mL = num(ps.marginLeft);
    const margin = mT + 'mm ' + mR + 'mm ' + mB + 'mm ' + mL + 'mm';
    return '@page{size:' + size + ';margin:' + margin + ' !important}' +
           '@page :first{margin:' + margin + ' !important}';
  }

  function _optFam(v) { return String(v || '').replace(/['"\\;]/g, '').trim(); }

  /* ---------- بناء CSS الخطوط والأحجام (نفس المحطة) ---------- */
  function buildCSS(ps, scope) {
    let css = '';
    const p = scope;

    /* نوع الخط على كل المستند */
    const fam = _optFam(ps.fontFamily || 'Cairo') || 'Cairo';
    css += p + ', ' + p + ' *{font-family:\'' + fam + '\',Cairo,Tahoma,Arial,sans-serif !important}';

    /* حجم الخط الأساسي → تحجيم شامل للمستند (نفس آلية المحطة zoom) */
    const base = parseFloat(ps.fontSize) || 11;
    const zoom = base / 11;
    if (Math.abs(zoom - 1) > 0.015) {
      css += p + '.print-doc,' + p + '.pd-page,' + p + '.print-page{zoom:' + zoom.toFixed(3) + '}';
    }

    /* تخصيص حجم خط كل قسم */
    const tfs = parseInt(ps.titleFontSize, 10), thfs = parseInt(ps.tableHeaderFontSize, 10),
          tbfs = parseInt(ps.tableBodyFontSize, 10), ffs = parseInt(ps.footerFontSize, 10);
    if (tfs > 0) css += p + ' .pd-doc-title,' + p + ' .print-head h2,' + p + ' .pd-head b{font-size:' + tfs + 'pt !important}';
    if (thfs > 0) css += p + ' .print-doc thead th,' + p + ' .print-tbl th{font-size:' + thfs + 'pt !important}';
    if (tbfs > 0) css += p + ' .print-doc tbody td,' + p + ' .print-tbl td{font-size:' + tbfs + 'pt !important}';
    if (ffs > 0) css += p + ' .pd-foot,' + p + ' .print-foot{font-size:' + ffs + 'pt !important}';

    /* CSS مخصص من المستخدم */
    if (ps.customCSS && String(ps.customCSS).trim()) {
      css += String(ps.customCSS);
    }
    return css;
  }

  /* ---------- حقن الإعدادات داخل نص HTML للمطبوع ---------- */
  function applyToHTMLString(html) {
    let s = String(html || '');
    if (isThermalHTML(s)) return s;
    const ps = getPS();
    const st = '<style data-psp="1">' + pageRules(ps) + buildCSS(ps, 'body ') + '</style>';
    s = s.replace(/<style[^>]*data-psp[^>]*>[\s\S]*?<\/style>/gi, '');
    s = s.replace(/<style[^>]*data-rp-fit[^>]*>[\s\S]*?<\/style>/gi, '');
    if (/<\/body>/i.test(s)) return s.replace(/<\/body>/i, st + '</body>');
    return s + st;
  }

  /* ---------- فخّ html2canvas: هوامش PDF + الخط ---------- */
  function installHtml2CanvasTrap() {
    if (window.__pspH2cTrap) return true;
    const existing = typeof window.html2canvas === 'function' ? window.html2canvas : null;
    try {
      Object.defineProperty(window, 'html2canvas', {
        configurable: true,
        get() { return window.__pspH2cRef || existing || undefined; },
        set(fn) {
          window.__pspH2cRef = (typeof fn === 'function' && !fn.__psp) ? wrappedH2C(fn) : fn;
        }
      });
      window.__pspH2cTrap = true;
      if (existing && !existing.__psp) window.__pspH2cRef = wrappedH2C(existing);
      _log('html2canvas — فخّ هوامش PDF مثبّت');
      return true;
    } catch (e) { return false; }
  }
  function wrappedH2C(orig) {
    const fn = function (el, opts) {
      try { padCaptureContainer(el); } catch (e) {}
      return orig.apply(this, arguments);
    };
    fn.__psp = true;
    return fn;
  }
  function padCaptureContainer(el) {
    if (!el || el.nodeType !== 1) return;
    const w = el.offsetWidth || 0;
    if (w && w < 500) return;
    if (el.querySelector && el.querySelector('style[data-psp-pad]')) return;
    const ps = getPS();
    if (isThermalHTML(el.innerHTML || '')) return;
    const mT = num(ps.marginTop) * MM_PX, mR = num(ps.marginRight) * MM_PX,
          mB = num(ps.marginBottom) * MM_PX, mL = num(ps.marginLeft) * MM_PX;
    const fam = _optFam(ps.fontFamily || 'Cairo') || 'Cairo';
    const st = document.createElement('style');
    st.setAttribute('data-psp-pad', '1');
    st.textContent = '.__psp-pad{padding:' + mT.toFixed(1) + 'px ' + mR.toFixed(1) + 'px ' + mB.toFixed(1) + 'px ' + mL.toFixed(1) + 'px !important;box-sizing:border-box}' +
      '.__psp-pad *{font-family:\'' + fam + '\',Cairo,Tahoma,Arial,sans-serif !important}';
    const wrap = document.createElement('div');
    wrap.className = '__psp-pad';
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(st);
    el.appendChild(wrap);
  }

  /* ---------- طباعة مع عدد النسخ (كل نسخة مستند مستقل) ---------- */
  async function printWithCopies(fullHTML, opts) {
    const ps = getPS();
    const copies = Math.max(1, Math.min(20, parseInt(ps.copies, 10) || 1));
    for (let i = 0; i < copies; i++) {
      try { await ReliablePrint.printHTML(fullHTML, opts); } catch (e) { _log('copy ' + (i + 1) + ' failed', e); break; }
      if (i < copies - 1) await new Promise((r) => setTimeout(r, 450));
    }
  }

  window.PrintSettingsPro = {
    getPS, savePS, pageRules, buildCSS, applyToHTMLString,
    printWithCopies,
    installHtml2CanvasTrap,
    version: 'school-1.0'
  };

  installHtml2CanvasTrap();
  _log('جاهز — ورقة/اتجاه/هوامش/خط/عدد النسخ/CSS تُطبَّق على الطباعة وPDF');
})();

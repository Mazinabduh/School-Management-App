/* =========================================================
   pdf-enterprise.js — إنشاء PDF — نظام تطبيق المحطة v2026.100 بالنص
   (pdf-enterprise-v2026.6 مُكيَّف لبيانات المدرسة)
   • دعم عربي كامل: حاوية RTL + unicode-bidi + خط Cairo داخل الحاوية
     + onclone يفرض dir=rtl — فلا تظهر الكتابة مقلوبة أبداً
   • ترتيب الورق والصفحات: قطع ذكي عند الفراغات (لا يقص سطراً) + شريط تذييل
     باسم المدرسة + رقم الصفحة (مجموع الصفحات) + دعم النسخ المتعددة
   • أندرويد: حفظ عبر الجسر الأصلي savePdfBase64 في Download/Edupro Document
   ========================================================= */
'use strict';

(function () {
  if (window.__EDUPRO_PDF_V35) return;
  window.__EDUPRO_PDF_V35 = true;

  function _ps() {
    const base = {
      paperSize: 'A4',
      customWidth: 210,
      customHeight: 297,
      orientation: 'portrait',
      marginTop: 10,
      marginRight: 10,
      marginBottom: 10,
      marginLeft: 10,
      fontFamily: 'Cairo',
      copies: 1
    };
    try {
      if (window.PrintSettingsPro && PrintSettingsPro.getPS) {
        const m = PrintSettingsPro.getPS() || {};
        for (const k of Object.keys(base)) if (m[k] !== undefined && m[k] !== null && m[k] !== '') base[k] = m[k];
        if (m.copies !== undefined) base.copies = m.copies || 1;
        if (m.orientation) base.orientation = m.orientation;
      }
    } catch (_) {}
    return base;
  }

  function _paperInfo(orientationHint) {
    const ps = _ps();
    const sizes = {
      A4: [210, 297],
      A5: [148, 210],
      Letter: [216, 279],
      Thermal80: [80, 297],
      Thermal58: [58, 210]
    };
    const wh = ps.paperSize === 'Custom' ? [parseFloat(ps.customWidth) || 210, parseFloat(ps.customHeight) || 297] : sizes[ps.paperSize] || sizes.A4;
    let wmm = wh[0], hmm = wh[1];
    let landscape = ps.orientation === 'landscape';
    if (orientationHint === 'l' || orientationHint === 'landscape') landscape = true;
    if (orientationHint === 'p' || orientationHint === 'portrait') landscape = false;
    if (landscape) {
      const t = wmm;
      wmm = hmm;
      hmm = t;
    }
    const wpx = Math.round(wmm * 96 / 25.4);
    return { ps: ps, wmm: wmm, hmm: hmm, landscape: landscape, wpx: wpx };
  }

  function _jsPDFClass() {
    return (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  }

  async function _renderCanvas(html, wpx) {
    const isAndroid = !!window.AndroidBridge;
    const fontBase = isAndroid ? 'file:///android_asset/www/fonts' : 'fonts';
    const fontCSS = '<style>' +
      '@font-face{font-family:"Cairo";font-style:normal;font-weight:400;font-display:block;src:url("' + fontBase + '/Cairo-Regular.ttf") format("truetype")}' +
      '@font-face{font-family:"Cairo";font-style:normal;font-weight:700;font-display:block;src:url("' + fontBase + '/Cairo-Bold.ttf") format("truetype")}' +
      '@font-face{font-family:"Cairo";font-style:normal;font-weight:900;font-display:block;src:url("' + fontBase + '/Cairo-Bold.ttf") format("truetype")}' +
      '</style>';
    let _pdfFam = 'Cairo';
    try {
      const psf = String((_ps().fontFamily) || '').replace(/['"\\;]/g, '').trim();
      if (/^[A-Za-z ][A-Za-z0-9 ]{1,30}$/.test(psf)) _pdfFam = psf;
    } catch (_) {}

    /* حاوية RTL بالضبط مثل المحطة — ضمانة عدم انقلاب العربية */
    const container = document.createElement('div');
    container.setAttribute('dir', 'rtl');
    container.style.cssText = 'position:fixed;top:0;left:-20000px;width:' + wpx + 'px;background:#fff;z-index:-1;direction:rtl;unicode-bidi:plaintext;font-family:\'' + _pdfFam + '\',Cairo,Tahoma,sans-serif;letter-spacing:normal';
    container.innerHTML = fontCSS + html;
    document.body.appendChild(container);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch (_) {}
    await new Promise(function (r) { setTimeout(r, 600); });

    let canvas;
    try {
      canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: wpx,
        windowWidth: wpx,
        onclone: function (doc) {
          doc.documentElement.setAttribute('dir', 'rtl');
          doc.body.setAttribute('dir', 'rtl');
        }
      });
    } finally {
      if (container && container.parentNode) container.parentNode.removeChild(container);
    }
    return canvas;
  }

  /* ---------- قطع الصفحات عند الفراغات — نفس المحطة بالنص ---------- */
  function _blankBandAt(ctx, w, y, bandH) {
    if (y < 0 || y + bandH > ctx.canvas.height) return false;
    try {
      const data = ctx.getImageData(0, y, w, bandH).data;
      for (let i = 0; i < data.length; i += 12) if (data[i] < 238 || data[i + 1] < 238 || data[i + 2] < 238) return false;
      return true;
    } catch (_) {
      return false;
    }
  }
  function _findSafeCut(ctx, canvasW, targetY, canvasH) {
    const upLimit = Math.max(60, Math.floor(canvasW * 0.1));
    for (let d = 0; d <= upLimit; d += 2) {
      if (_blankBandAt(ctx, canvasW, targetY - d - 6, 6)) return targetY - d;
      if (_blankBandAt(ctx, canvasW, targetY + d, 6)) return targetY + d + 6;
    }
    return -1;
  }
  function _splitCanvasToPages(canvas, pageHeightPx) {
    const out = [];
    const canvasH = canvas.height;
    if (canvasH <= pageHeightPx * 1.06) {
      out.push({ canvas: canvas, overflow: canvasH > pageHeightPx });
      return out;
    }
    const canvasW = canvas.width;
    const ctx = canvas.getContext('2d');
    const cuts = [0];
    let y = pageHeightPx;
    while (y < canvasH - 4) {
      let cut = _findSafeCut(ctx, canvasW, y, canvasH);
      if (cut < 0) cut = y;
      if (cut <= cuts[cuts.length - 1] + 30) cut = cuts[cuts.length - 1] + 30;
      if (cut >= canvasH - 10) break;
      cuts.push(cut);
      y = cut + pageHeightPx;
    }
    cuts.push(canvasH);
    for (let i = 1; i < cuts.length; i++) {
      const srcY = cuts[i - 1];
      const srcH = cuts[i] - srcY;
      if (srcH <= 2) continue;
      const pc = document.createElement('canvas');
      pc.width = canvasW;
      pc.height = Math.max(1, Math.ceil(srcH));
      const pctx = pc.getContext('2d');
      pctx.fillStyle = '#ffffff';
      pctx.fillRect(0, 0, pc.width, pc.height);
      pctx.drawImage(canvas, 0, srcY, canvasW, srcH, 0, 0, canvasW, srcH);
      out.push({ canvas: pc, overflow: false });
    }
    try { canvas.width = 0; canvas.height = 0; } catch (_) {}
    return out;
  }

  /* ---------- شريط تذييل الصفحة — اسم المدرسة + رقم الصفحة ---------- */
  function _schoolName() {
    try {
      const s = Store.settings();
      if (s && s.schoolName) return s.schoolName;
    } catch (_) {}
    return 'تطبيق ادارة المدرسة';
  }
  function _bandPx(pageHeightPx) {
    return Math.max(26, Math.round(pageHeightPx * 0.03));
  }
  function _drawPageFooterBand(ctx, w, y, h, opts) {
    const u = Math.max(1, Math.round(h / 26));
    const gg = ctx.createLinearGradient(0, 0, w, 0);
    gg.addColorStop(0, '#C9A227');
    gg.addColorStop(0.5, '#E6C766');
    gg.addColorStop(1, '#C9A227');
    ctx.fillStyle = gg;
    ctx.fillRect(0, y, w, Math.max(2, Math.round(u * 0.5)));
    const bg = ctx.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, '#0A2647');
    bg.addColorStop(1, '#144272');
    ctx.fillStyle = bg;
    ctx.fillRect(0, y + Math.max(2, Math.round(u * 0.5)), w, h - Math.max(2, Math.round(u * 0.5)));
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';
    const midY = y + h / 2 + Math.round(u * 0.15);
    ctx.textAlign = 'right';
    ctx.font = '700 ' + Math.max(13, Math.round(u * 3.1)) + 'px Cairo, Tahoma, sans-serif';
    ctx.fillStyle = '#E6C766';
    ctx.fillText(_schoolName(), w - Math.round(u * 3.5), midY);
    ctx.textAlign = 'center';
    ctx.font = '800 ' + Math.max(13, Math.round(u * 3.2)) + 'px Cairo, Tahoma, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    if (opts && opts.showNo) ctx.fillText('صفحة ' + opts.page + ' من ' + opts.total, w / 2, midY);
    ctx.textAlign = 'left';
    ctx.font = Math.max(10, Math.round(u * 2.4)) + 'px Cairo, Tahoma, sans-serif';
    ctx.fillStyle = 'rgba(175,198,230,0.95)';
    ctx.fillText('نظام ادارة المدرسة EduPro', Math.round(u * 3.5), midY);
  }
  function _composePage(content, paper, opts) {
    const w = content.width;
    const pageH = Math.max(1, Math.floor(w * paper.hmm / paper.wmm));
    const bandH = _bandPx(pageH);
    const usable = pageH - bandH;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = pageH;
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, pageH);
    const ch = content.height;
    const drawH = Math.min(ch, usable);
    try { ctx.drawImage(content, 0, 0, content.width, ch, 0, 0, w, drawH); } catch (_) {}
    _drawPageFooterBand(ctx, w, pageH - bandH, bandH, opts || {});
    return c;
  }
  function _fittedPageImage(canvas, pageHeightPx, wmm) {
    const overflow = canvas.height > pageHeightPx;
    const h = overflow ? pageHeightPx : canvas.height;
    const pc = document.createElement('canvas');
    pc.width = canvas.width;
    pc.height = h;
    const ctx = pc.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pc.width, pc.height);
    if (!overflow) ctx.drawImage(canvas, 0, 0);
    else ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, pc.width, pc.height);
    const data = pc.toDataURL('image/jpeg', 0.95);
    try { pc.width = 0; pc.height = 0; } catch (_) {}
    return { data: data, hmm: h * wmm / canvas.width };
  }
  function _buildPdf(pageImages, wmm, hmm, copies) {
    const jsPDF = _jsPDFClass();
    const doc = new jsPDF({ orientation: wmm > hmm ? 'l' : 'p', unit: 'mm', format: [wmm, hmm] });
    copies = Math.max(1, Math.min(20, parseInt(copies, 10) || 1));
    let first = true;
    for (let c = 0; c < copies; c++) for (let i = 0; i < pageImages.length; i++) {
      if (!first) doc.addPage();
      first = false;
      doc.addImage(pageImages[i].data, 'JPEG', 0, 0, wmm, pageImages[i].hmm);
    }
    return doc;
  }

  function _safeName(n) {
    return String(n || 'ملف').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 110);
  }

  async function _saveBlob(blob, filename) {
    if (window.AndroidBridge && window.AndroidBridge.savePdfBase64) return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const base64 = reader.result.split(',')[1];
          const ok = window.AndroidBridge.savePdfBase64(base64, filename);
          ok ? resolve(true) : reject(new Error('AndroidBridge.savePdfBase64 failed'));
        } catch (e) { reject(e); }
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(blob);
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 1500);
    return true;
  }

  async function documentPDF(html, filenameBase, orientationHint) {
    const paper = _paperInfo(orientationHint);
    UI.loading(true, 'جارٍ إنشاء PDF…');
    try {
      if (!window.html2canvas) {
        try { await new Promise((r, e) => { const s = document.createElement('script'); s.src = 'vendor/html2canvas.min.js'; s.onload = r; s.onerror = e; document.head.appendChild(s); }); } catch (_) {}
      }
      if (!_jsPDFClass()) {
        try { await new Promise((r, e) => { const s = document.createElement('script'); s.src = 'vendor/jspdf.umd.min.js'; s.onload = r; s.onerror = e; document.head.appendChild(s); }); } catch (_) {}
      }
      if (typeof html2canvas === 'undefined') throw new Error('html2canvas غير متوفرة');
      if (!_jsPDFClass()) throw new Error('jsPDF غير متوفرة');

      const canvas = await _renderCanvas(html, paper.wpx);
      const limitPx = Math.max(1, Math.floor(canvas.width * paper.hmm / paper.wmm));
      const bandH = _bandPx(limitPx);
      const parts = _splitCanvasToPages(canvas, limitPx - bandH);
      const multi = parts.length > 1;
      const images = [];
      for (let j = 0; j < parts.length; j++) {
        const composed = multi ? _composePage(parts[j].canvas, paper, { page: j + 1, total: parts.length, showNo: true }) : parts[j].canvas;
        images.push(_fittedPageImage(composed, Math.max(1, Math.floor(composed.width * paper.hmm / paper.wmm)), paper.wmm));
      }
      const doc = _buildPdf(images, paper.wmm, paper.hmm, paper.ps.copies);
      const blob = doc.output('blob');
      await _saveBlob(blob, _safeName(filenameBase) + '.pdf');
      try { if (window.Audit) Audit.log('تصدير', 'تصدير PDF: ' + filenameBase); } catch (_) {}
      UI.toast('تم إنشاء PDF ✓' + (window.AndroidBridge ? ' — حُفظ في Download/Edupro Document وفتحه' : ''), 'success');
      return true;
    } catch (e) {
      console.error('[PDFEnterprise]', e);
      UI.toast('تعذر إنشاء PDF: ' + e.message, 'error');
      return false;
    } finally {
      UI.loading(false);
    }
  }

  const PDFEnterprise = {
    /* واجهة موحدة — كل التقارير تنادي download */
    download(html, filename = 'document.pdf', orientation = 'portrait') {
      /* نفس إصلاح الطباعة: th تُكسر في html2canvas — تُحوّل إلى td.pp-th */
      html = String(html || '')
        .replace(/<th(?=[\s>])/g, '<td class="pp-th"')
        .replace(/<\/th>/g, '</td>');
      const base = String(filename || 'document').replace(/\.pdf$/i, '');
      /* حراري → مسار الطباعة الحرارية كما هو */
      if (orientation === 'thermal' && window.ThermalPrint) return ThermalPrint.pdf(html, filename);
      return documentPDF(html, base, orientation);
    },
    /* حفظ أي عنصر ظاهر كـ PDF صفحة واحدة (بطاقة مثلاً) — كما كان */
    async element(el, filename, { wmm = 86, hmm = 54 } = {}) {
      try {
        UI.loading(true, 'جارٍ التصدير…');
        const canvas = await html2canvas(el, { scale: 3, backgroundColor: null, logging: false });
        const img = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: wmm > hmm ? 'landscape' : 'portrait', unit: 'mm', format: [wmm, hmm] });
        pdf.addImage(img, 'PNG', 0, 0, wmm, hmm);
        if (window.AndroidBridge && typeof window.AndroidBridge.savePdfBase64 === 'function') {
          const b64 = pdf.output('datauristring').split(',')[1] || '';
          window.AndroidBridge.savePdfBase64(b64, filename);
          UI.toast('تم التصدير ✓', 'success');
          return true;
        }
        pdf.save(filename);
        UI.toast('تم التصدير ✓', 'success');
        return true;
      } catch (e) {
        UI.toast('فشل التصدير: ' + e.message, 'error');
        return false;
      } finally { UI.loading(false); }
    }
  };

  window.PDFEnterprise = PDFEnterprise;
})();

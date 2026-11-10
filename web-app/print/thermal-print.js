/* =========================================================
   thermal-print.js — محرك الطابعات الحرارية (58مم / 80مم)
   طباعة مباشرة + PDF بمقاس اللفة — مثالي لأندرويد
   ========================================================= */
'use strict';

(function () {
  const ThermalPrint = {
    width() { return (window.PrintSettingsEngine ? PrintSettingsEngine.opts().thermalWidth : 80); },

    /* ---------- قالب إيصال حراري موحد ---------- */
    receiptHTML({ title = 'سند قبض', rows = [], totals = [], note = '', qrText = '', footNote = '' } = {}) {
      const s = Store.settings();
      const o = PrintSettingsEngine.opts();
      const qr = qrText ? H.qrcode(qrText, 3) : '';
      const is58 = o.thermalWidth <= 58;
      return `
      <div class="thermal-80" style="${is58 ? 'font-size:10.5px;width:52mm' : ''}">
        ${s.logo ? `<img class="th-logo" src="${s.logo}" alt="">` : ''}
        <div class="th-center th-school">${H.esc(s.schoolName || '')}</div>
        ${s.phone ? `<div class="th-center" style="font-size:10px">📞 <span class="num">${H.esc(s.phone)}</span></div>` : ''}
        ${s.address ? `<div class="th-center" style="font-size:10px">${H.esc(s.address)}</div>` : ''}
        <div class="th-title">${H.esc(title)}</div>
        ${rows.map((r) => `<div class="th-row"><b>${H.esc(r[0])}</b><span class="num" style="text-align:left">${H.esc(r[1])}</span></div>`).join('')}
        ${totals.map((r) => `<div class="th-row th-total"><b>${H.esc(r[0])}</b><span class="num">${H.esc(r[1])}</span></div>`).join('')}
        ${note ? `<div class="th-dash"></div><div style="font-size:10.5px">${H.esc(note)}</div>` : ''}
        ${qr ? `<img class="th-qr" src="${qr}" alt="QR">` : ''}
        <div class="th-dash"></div>
        <div class="th-foot">
          ${H.tafqitMoney(totals.length ? parseFloat(String(totals[0][1]).replace(/[^\d.]/g, '')) || 0 : 0)}<br>
          ${footNote ? H.esc(footNote) + '<br>' : ''}
          ${H.fmtDateTime(H.now())} — EduPro v${Config.VERSION}
        </div>
      </div>`;
    },

    /* ---------- طباعة حرارية مباشرة ---------- */
    print(html, cb) {
      if (!window.PrintSettingsEngine) return UI.toast('محرك الطباعة غير جاهز', 'error');
      PrintSettingsEngine.print(html, { mode: 'thermal', onDone: cb });
    },

    /* ---------- PDF بمقاس اللفة (يعمل على كل الأجهزة) ---------- */
    async pdf(html, filename = 'receipt.pdf') {
      const w = this.width();
      /* قياس الارتفاع عبر حاوية مخفية */
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + (w - 6) + 'mm;background:#fff;z-index:-1';
      holder.innerHTML = `<div class="print-doc">${html}</div>`;
      document.body.appendChild(holder);
      try {
        await (window.imagesReady ? imagesReady(holder) : Promise.resolve());
        const canvas = await html2canvas(holder, { scale: 2, backgroundColor: '#ffffff' });
        const img = canvas.toDataURL('image/jpeg', 0.92);
        const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: [w, Math.max(w, canvas.height * w / canvas.width) + 4] });
        pdf.addImage(img, 'JPEG', 1, 1, w - 2, canvas.height * (w - 2) / canvas.width);
        /* أندرويد: حفظ عبر الجسر الأصلي — نفس تطبيق المحطة */
        if (window.AndroidBridge && typeof window.AndroidBridge.savePdfBase64 === 'function') {
          const b64 = pdf.output('datauristring').split(',')[1] || '';
          window.AndroidBridge.savePdfBase64(b64, filename);
          UI.toast('تم حفظ PDF بمقاس اللفة وفتحه ✓', 'success');
          return true;
        }
        pdf.save(filename);
        UI.toast('تم تنزيل PDF بمقاس اللفة ✓', 'success');
      } catch (e) {
        console.error('[ThermalPDF]', e);
        UI.toast('تعذر إنشاء PDF: ' + e.message, 'error');
      } finally {
        holder.remove();
      }
    },

    /* ---------- فتح درج النقد (إن وجد عبر جسر أندرويد) ---------- */
    openCashDrawer() {
      try {
        if (window.AndroidBridge && window.AndroidBridge.openCashDrawer) {
          window.AndroidBridge.openCashDrawer();
          return true;
        }
      } catch (e) {}
      return false;
    }
  };

  /* انتظار تحميل كل الصور داخل عنصر */
  window.imagesReady = (root) => new Promise((res) => {
    const imgs = [...(root || document).querySelectorAll('img')].filter((i) => !i.complete);
    if (!imgs.length) return setTimeout(res, 120);
    let left = imgs.length;
    const done = () => { if (--left <= 0) setTimeout(res, 100); };
    imgs.forEach((i) => { i.onload = done; i.onerror = done; });
    setTimeout(res, 2500);
  });

  window.ThermalPrint = ThermalPrint;
})();

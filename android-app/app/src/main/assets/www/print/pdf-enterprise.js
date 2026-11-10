/* =========================================================
   pdf-enterprise.js — تصدير الشهادات وكشوف الحساب إلى PDF فخم
   html2canvas (رسم بكسل مثالي للعربية) + jsPDF متعدد الصفحات
   هذه هي القناة الأساسية الموثوقة على أندرويد
   ========================================================= */
'use strict';

(function () {
  const PDFEnterprise = {
    W: { portrait: 794, landscape: 1123 },   /* A4 @96dpi */

    async download(html, filename = 'document.pdf', orientation = 'portrait') {
      UI.loading(true, 'جارٍ إنشاء ملف PDF…');
      try {
        if (!window.html2canvas || !window.jspdf) throw new Error('مكتبات PDF غير محمّلة');
        if (orientation === 'thermal' && window.ThermalPrint) {
          UI.loading(false);
          return ThermalPrint.pdf(html, filename);
        }
        const w = this.W[orientation] || this.W.portrait;
        /* حاوية خارج الشاشة بعرض A4 */
        const holder = document.createElement('div');
        holder.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;background:#fff;z-index:-1`;
        holder.innerHTML = html;
        document.body.appendChild(holder);

        await imagesReady(holder);
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await new Promise((r) => setTimeout(r, 250));

        const canvas = await html2canvas(holder, {
          scale: 2, backgroundColor: '#ffffff', useCORS: true,
          windowWidth: w, logging: false
        });
        holder.remove();

        const img = canvas.toDataURL('image/jpeg', 0.93);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const imgW = pw;
        const imgH = canvas.height * imgW / canvas.width;

        let position = 0;
        let heightLeft = imgH;
        pdf.addImage(img, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= ph;
        while (heightLeft > 0.5) {
          position = heightLeft - imgH;
          pdf.addPage();
          pdf.addImage(img, 'JPEG', 0, position, imgW, imgH);
          heightLeft -= ph;
        }
        const safe = String(filename).replace(/[/\\?%*:|"<>]/g, '-');
        /* أندرويد: حفظ عبر الجسر الأصلي في التنزيلات ثم فتح العارض — نفس تطبيق المحطة */
        if (window.AndroidBridge && typeof window.AndroidBridge.savePdfBase64 === 'function') {
          const b64 = pdf.output('datauristring').split(',')[1] || '';
          const ok = window.AndroidBridge.savePdfBase64(b64, safe);
          if (ok) UI.toast('تم حفظ PDF وفتحه ✓', 'success');
          else UI.toast('تم إنشاء PDF ✓', 'success');
          Audit.log('تصدير', `تصدير PDF: ${safe}`);
          return true;
        }
        pdf.save(safe);
        UI.toast('تم إنشاء وتنزيل PDF ✓', 'success');
        Audit.log('تصدير', `تصدير PDF: ${safe}`);
        return true;
      } catch (e) {
        console.error('[PDFEnterprise]', e);
        UI.toast('تعذر إنشاء PDF: ' + e.message, 'error');
        return false;
      } finally {
        UI.loading(false);
      }
    },

    /* حفظ أي عنصر ظاهر كـ PDF صفحة واحدة (بطاقة مثلاً) */
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

/* =========================================================
   id-card-printer.js — محرك طباعة بطاقات الطلاب والموظفين
   وجهان/PVC على A4 + PDF بمقاس البطاقة الحقيقي + صورة PNG
   ========================================================= */
'use strict';

(function () {
  const IDCardPrinter = {
    /* شبكة بطاقات PVC (وجه + ظهر) على A4 */
    printHTML(html, { title = 'بطاقات' } = {}) {
      PrintSettingsEngine.print(html, { orientation: 'portrait' });
    },

    async pdf(html, filename = 'cards.pdf') {
      return PDFEnterprise.download(html, filename, 'portrait');
    },

    /* تصدير عنصر بطاقة ظاهر إلى PDF بمقاس CR80 الحقيقي (85.6×54مم) */
    async elementPDF(el, filename = 'card.pdf') {
      return PDFEnterprise.element(el, filename, { wmm: 85.6, hmm: 54 });
    },

    /* تصدير بطاقة كصورة PNG عالية الدقة */
    async elementPNG(el, filename = 'card.png') {
      try {
        UI.loading(true, 'جارٍ التصدير…');
        const canvas = await html2canvas(el, { scale: 4, backgroundColor: null, logging: false });
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 300);
        UI.toast('تم تصدير البطاقة PNG ✓', 'success');
        return true;
      } catch (e) {
        UI.toast('فشل التصدير: ' + e.message, 'error');
        return false;
      } finally { UI.loading(false); }
    },

    /* طباعة بطاقة واحدة وجه/ظهر */
    printCardPair(frontHTML, backHTML) {
      const html = `<div class="idcard-print-grid">${frontHTML}${backHTML}<div class="cut-hint">قص على الخط — وجه / ظهر</div></div>`;
      this.printHTML(html, { title: 'بطاقة' });
    }
  };

  window.IDCardPrinter = IDCardPrinter;
})();

/* =========================================================
   professional-themes.js — قوالب الكشوفات والفواتير ذات الطابع الدولي
   4 ثيمات: Royal Blue | Emerald | Gold Classic | Royal Purple
   ========================================================= */
'use strict';

(function () {
  const ThemesKit = {
    list: [
      { id: 'royal',   label: 'Royal Blue — الأزرق الملكي',      dot: '#0b3d91', desc: 'رسمي رصين مناسب لكل الكشوفات الرسمية' },
      { id: 'emerald', label: 'Emerald — الزمردي الخليجي',       dot: '#065f46', desc: 'أنيق هادئ بطابع خليجي' },
      { id: 'gold',    label: 'Gold Classic — الذهبي الفخم',      dot: '#8a6a1c', desc: 'فخامة كلاسيكية للشهادات والدبلومات' },
      { id: 'purple',  label: 'Royal Purple — البنفسجي العصري',   dot: '#5b21b6', desc: 'عصري مميز للبطاقات والنتائج' }
    ],

    current() { return Store.getSetting('printTheme', 'royal'); },

    apply(id) {
      if (!this.list.find((t) => t.id === id)) return;
      Store.setSetting('printTheme', id);
      Audit.log('تعديل', `تغيير ثيم المستندات: ${id}`);
      UI.toast(`تم تطبيق ثيم «${this.list.find((t) => t.id === id).label}» على كل المستندات ✓`, 'success');
    },

    /* اختيار سريع بنافذة */
    async picker() {
      const pick = await UI.sheet({
        title: 'ثيم المستندات الدولي',
        items: this.list.map((t) => ({ ico: '🎨', label: t.label, sub: t.desc, color: 'ic-blue', id: t.id }))
      });
      if (pick) this.apply(pick.id);
    },

    /* ---------- بنّاء الترويسة والتذييل الموحد للمستندات ---------- */
    headerHTML(docTitle, docNo = '') {
      const s = Store.settings();
      const st = window.PrintSettingsEngine ? PrintSettingsEngine.opts() : { header: s.printHeader !== false };
      if (st.header === false) return `<div class="pd-doc-title">${H.esc(docTitle)}</div>`;
      return `
        <div class="pd-head">
          <img src="${s.logo || 'assets/images/logo.png'}" alt="">
          <div style="flex:1">
            <b>${H.esc(s.schoolName || '')}</b>
            <small>${H.esc(s.schoolNameEn || '')}${s.phone ? ' • ' + H.esc(s.phone) : ''}${s.address ? ' • ' + H.esc(s.address) : ''}</small>
          </div>
          <div style="text-align:left;font-size:11px;line-height:1.7">
            ${docNo ? `رقم: <b class="num">${H.esc(docNo)}</b><br>` : ''}
            التاريخ: <b>${H.fmtDate(H.today())}</b><br>
            العام: <b>${H.esc(s.year || '')}</b>
          </div>
        </div>
        <div class="pd-doc-title">${H.esc(docTitle)}</div>`;
    },

    footerHTML() {
      const s = Store.settings();
      return `<div class="pd-foot">
        <span>${H.esc(s.issuedBy || 'إدارة المدرسة')}</span>
        <span>${H.esc(s.schoolName || '')}</span>
        <span>EduPro v${Config.VERSION}</span>
      </div>`;
    },

    /* غلاف مستند قياسي */
    wrap(docTitle, innerHTML, docNo = '') {
      const theme = this.current() === 'purple' ? 'purple' : this.current();
      return `
      <div class="print-doc intl-doc doc-theme-${theme}">
        <div class="pd-page">
          ${this.headerHTML(docTitle, docNo)}
          ${innerHTML}
          ${this.footerHTML()}
        </div>
      </div>`;
    }
  };

  window.ThemesKit = ThemesKit;
})();

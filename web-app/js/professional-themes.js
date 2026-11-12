/* =========================================================
   professional-themes.js — ثيمات المستندات — ممرّر لمستيل المحطة
   كل القوالب تُبنى الآن عبر PrintProV2026 (نظام pp-* من المحطة v2026.100):
   المستطيل العلوي (الشعار + اسم المدرسة + بياناتها) في كل طباعة
   فقط ثيمات الألوان تبقى اختيارية للشهادات والبطاقات
   ========================================================= */
'use strict';

(function () {
  const ThemesKit = {
    list: [
      { id: 'royal',   label: 'Royal Blue — الأزرق الملكي',      dot: '#1565c0', desc: 'رسمي رصين مناسب لكل الكشوفات الرسمية' },
      { id: 'emerald', label: 'Emerald — الزمردي الخليجي',       dot: '#2e7d32', desc: 'أنيق هادئ بطابع خليجي' },
      { id: 'gold',    label: 'Gold Classic — الذهبي الفخم',      dot: '#C9A227', desc: 'فخامة كلاسيكية للشهادات والدبلومات' },
      { id: 'purple',  label: 'Royal Purple — البنفسجي العصري',   dot: '#6a1b9a', desc: 'عصري مميز للبطاقات والنتائج' }
    ],

    /* لون ترويسة الطباعة حسب الثيم المختار — يُمرّر لمحرك المحطة */
    _headerColor() {
      const map = {
        royal:   { headerBg: '#1565c0', accentColor: '#1976d2', borderColor: '#bbdefb', rowEvenBg: '#e3f2fd' },
        emerald: { headerBg: '#2e7d32', accentColor: '#388e3c', borderColor: '#c8e6c9', rowEvenBg: '#e8f5e9' },
        gold:    { headerBg: '#8a6a1c', accentColor: '#C9A227', borderColor: '#efe3c0', rowEvenBg: '#fdf6e3' },
        purple:  { headerBg: '#6a1b9a', accentColor: '#8e24aa', borderColor: '#e1bee7', rowEvenBg: '#f3e5f5' }
      };
      return map[this.current()] || map.royal;
    },

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
        title: 'ثيم المستندات',
        items: this.list.map((t) => ({ ico: '🎨', label: t.label, sub: t.desc, color: 'ic-blue', id: t.id }))
      });
      if (pick) this.apply(pick.id);
    },

    /* ---------- ترويسة موحدة — المستطيل العلوي بنظام المحطة (مُصغَّر ومناسب) ----------
       opts: { subtitle: 'نص فرعي تحت العنوان', showYear: false } — متوافقة مع الاستدعاء القديم */
    headerHTML(docTitle, docNo = '', opts) {
      const o = (opts && typeof opts === 'object') ? opts : {};
      const s = Store.settings();
      const side = [];
      if (docNo) side.push(`<div>📄 <bdi>${H.esc(docNo)}</bdi></div>`);
      side.push(`<div>🗓 <bdi>${H.fmtDate(H.today())}</bdi></div>`);
      if (o.showYear !== false && s.year) side.push(`<div>${_arTxtSafe('العام الدراسي: ' + s.year)}</div>`);
      const underTitle = o.subtitle
        ? `<div style="font-size:8.5pt;opacity:.9">${_arTxtSafe(o.subtitle)}</div>`
        : `<div style="font-size:8pt;opacity:.85">${H.esc(s.schoolNameEn || '')}</div>`;
      return `
        <div class="pp-report-header">
          <div class="pp-report-heading">
            <div class="pp-report-logo" style="width:40px;height:40px;flex:0 0 40px;padding:3px">${s.logo ? `<img src="${s.logo}" alt="الشعار" style="width:100%;height:100%;object-fit:contain;border-radius:50%">` : '<span style="font-size:14pt">🎓</span>'}</div>
            <div>
              <div class="pp-report-title" style="font-size:13pt;font-weight:800;line-height:1.3">${_arTxtSafe(docTitle || '')}</div>
              ${underTitle}
            </div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:11pt;font-weight:800">${_arTxtSafe(s.schoolName || 'تطبيق ادارة المدرسة')}</div>
            <div style="font-size:8pt;opacity:.85">${H.esc(s.address || '')}${s.phone ? ' • ' + H.esc(s.phone) : ''}</div>
          </div>
          <div class="pp-report-meta" style="font-size:8pt;line-height:1.5">${side.join('')}</div>
        </div>`;
    },

    footerHTML() {
      const s = Store.settings();
      const now = new Date().toLocaleString('ar-EG');
      return `<div class="pp-footer">
        <div class="pp-footer-text">${_arTxtSafe(s.printFooter || 'شكراً لتعاملكم معنا')}</div>
        <div class="pp-footer-small">${_arTxtSafe(s.schoolName || 'تطبيق ادارة المدرسة')}</div>
        <div class="pp-footer-print-info">${_arTxtSafe('طُبعت في: ')}<bdi>${now}</bdi> &nbsp;•&nbsp; ${_arTxtSafe('تطبيق ادارة المدرسة EduPro')}</div>
      </div>`;
    },

    /* غلاف مستند — المستطيل العلوي + الجسم + التذييل بنظام المحطة بالضبط
       مع ألوان الثيم المختار (royal/emerald/gold/purple) كما في إعدادات الطباعة */
    wrap(docTitle, innerHTML, docNo = '') {
      const c = this._headerColor();
      let colorsCSS = '';
      try {
        const u = (window.PrintSettingsPro && PrintSettingsPro.getPS().intlColors) || {};
        if (u.headerBg) c.headerBg = u.headerBg;
        if (u.accentColor) c.accentColor = u.accentColor;
        if (u.borderColor) c.borderColor = u.borderColor;
        if (u.rowEvenBg) c.rowEvenBg = u.rowEvenBg;
        if (u.bodyColor) c.bodyColor = u.bodyColor;
      } catch (e) {}
      colorsCSS = '<style>' +
        '.pp-report-header{background:' + c.headerBg + '!important;color:#fff!important}' +
        '.pp-report-section-title,.pp-table th{background:' + c.accentColor + '!important}' +
        '.pp-table td{border-color:' + c.borderColor + '!important}' +
        '.pp-table tbody tr:nth-child(even),.pp-summary-row.alt{background:' + c.rowEvenBg + '!important}' +
        (c.bodyColor ? '.pp-report{color:' + c.bodyColor + '!important}' : '') +
        '</style>';
      return '<div class="pp-report" dir="rtl">' +
        colorsCSS +
        this.headerHTML(docTitle, docNo) +
        '<div class="pp-report-body">' + innerHTML + '</div>' +
        this.footerHTML() +
        '</div>';
    }
  };

  /* <bdi> آمن — نفس _arTxt في محرك المحطة */
  function _arTxtSafe(t) {
    return '<bdi>' + String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '</bdi>';
  }

  window.ThemesKit = ThemesKit;
})();

/* =========================================================
   print-settings-page.js — صفحة إعدادات الطباعة — واجهة تطبيق المحطة بالضبط
   (قوالب + عدد النسخ + أبعاد الصفحة + هوامش + خطوط + ألوان سريعة
    + ألوان التقارير + تخطيط + مكونات + محرر القالب + محرر التقارير
    + CSS مخصص + معاينة مباشرة + طباعة تجريبية + طباعة مستند محدد)
   المحرك: PrintSettingsPro (ورقة/اتجاه/هوامش/خط) + ThemesKit (ثيمات المستندات)
   الطباعة التجريبية تمر عبر ReliablePrint المعزول — بدون نوافذ منبثقة أبداً
   ========================================================= */
'use strict';

(function () {
  if (window.__SchoolPrintSettingsPage) return;
  window.__SchoolPrintSettingsPage = true;

  const PAGES = window.Pages = window.Pages || {};

  /* ==================== قوالب الطباعة (تتوافق مع ثيمات المستندات الدولية) ==================== */
  PAGES._printTemplates = {
    royal:   { id: 'royal',   name: 'الأزرق الملكي',     desc: 'كحلي رسمي — مستوى الشركات العالمية', headerBg: '#0b3d91' },
    emerald: { id: 'emerald', name: 'الزمردي الخليجي',   desc: 'أخضر أنيق هادئ',                     headerBg: '#065f46' },
    gold:    { id: 'gold',    name: 'الذهبي الفخم',      desc: 'فخامة كلاسيكية للشهادات',            headerBg: '#8a6a1c' },
    purple:  { id: 'purple',  name: 'البنفسجي العصري',   desc: 'عصري مميز للبطاقات والنتائج',        headerBg: '#5b21b6' }
  };

  PAGES._paperSizes = {
    A4: { label: 'A4 (210×297مم)' },
    A5: { label: 'A5 (148×210مم)' },
    Letter: { label: 'Letter (216×279مم)' },
    Custom: { label: 'مخصصة' }
  };

  PAGES._colorThemes = [
    { id: 'royal', name: 'ملكي', icon: '🔵', headerBg: '#0b3d91', borderColor: '#c7d7f0', accentColor: '#0b3d91' },
    { id: 'teal', name: 'مدرسي', icon: '🟢', headerBg: '#0f766e', borderColor: '#c6e7e2', accentColor: '#0f766e' },
    { id: 'gold', name: 'ذهبي', icon: '🟡', headerBg: '#8a6a1c', borderColor: '#e6d9b8', accentColor: '#8a6a1c' },
    { id: 'purple', name: 'بنفسجي', icon: '🟣', headerBg: '#5b21b6', borderColor: '#ddd0f5', accentColor: '#5b21b6' },
    { id: 'slate', name: 'رصاصي', icon: '⚪', headerBg: '#37474f', borderColor: '#cfd8dc', accentColor: '#37474f' }
  ];

  /* ---------- قراءة/حفظ إعدادات الألوان (طبقة فوق PrintSettingsPro) ---------- */
  function getColors() {
    try {
      const ps = (window.PrintSettingsPro && PrintSettingsPro.getPS()) || {};
      return ps.intlColors || {};
    } catch (e) { return {}; }
  }
  function saveColors(patch) {
    try {
      const ps = (window.PrintSettingsPro && PrintSettingsPro.getPS()) || {};
      ps.intlColors = Object.assign({}, ps.intlColors || {}, patch);
      if (PrintSettingsPro.savePS) PrintSettingsPro.savePS({ intlColors: ps.intlColors });
      else { const s = Store.settings(); s.printSettings = ps; Store.flush(); }
    } catch (e) { console.error(e); }
  }

  PAGES._getPSColors = getColors;

  /* ==================== بناء المعاينة (نموذج مدرسي) ==================== */
  PAGES._buildSampleDoc = function () {
    const s = Store.settings();
    const th = window.ThemesKit ? ThemesKit.current() : 'royal';
    const rows = [
      ['الرسوم الدراسية', '1', '450,000', '450,000'],
      ['اشتراك الباص', '1', '120,000', '120,000'],
      ['الزي المدرسي', '2', '60,000', '120,000']
    ];
    const inner = `
      <table class="pd-table"><tbody>
        <tr><th style="width:22%">الطالب</th><td><b>أحمد محمد عبدالله التجريبي</b></td><th style="width:16%">الرقم</th><td>STU-0001</td></tr>
        <tr><th>الصف</th><td>المرحلة الابتدائية — الصف الرابع</td><th>العام</th><td>${H.esc(s.year || '')}</td></tr>
      </tbody></table>
      <table class="pd-table">
        <thead><tr><th>البيان</th><th>العدد</th><th>السعر</th><th>الإجمالي</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="3" style="text-align:left;font-weight:800">الإجمالي المستحق</td><td class="num" style="font-weight:900">690,000</td></tr></tfoot>
      </table>
      <div class="pd-sign"><span>المحاسب</span><span>ولي الأمر</span><span>مدير المدرسة</span></div>`;
    return window.ThemesKit
      ? ThemesKit.wrap('سند قائمة مستحقات — نموذج معاينة', inner, 'PREVIEW-001')
      : inner;
  };

  PAGES._updateLivePreview = function () {
    const box = document.getElementById('psLivePreview');
    if (!box) return;
    box.innerHTML = PAGES._buildSampleDoc();
  };

  /* ==================== الطباعة التجريبية — عبر المحرك المعزول (المحطة) ==================== */
  PAGES._testPrint = async function () {
    try {
      PAGES._saveAllPrintSettings({ quiet: true });
      await PrintSettingsEngine.print(PAGES._buildSampleDoc(), { title: 'طباعة تجريبية — نموذج المدرسة' });
      UI.toast('تم إرسال الطباعة التجريبية إلى الطابعة ✓', 'success');
    } catch (e) {
      console.error('[TestPrint]', e);
      UI.toast('تعذر الطباعة التجريبية: ' + e.message, 'error');
    }
  };

  /* ==================== حفظ كل الإعدادات ==================== */
  PAGES._saveAllPrintSettings = function (opts = {}) {
    try {
      const g = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
      const gc = (id) => { const el = document.getElementById(id); return el ? el.checked : null; };
      const patch = {};
      const copies = parseInt(g('psCopies'), 10);
      if (copies >= 1) patch.copies = Math.min(20, copies);
      if (g('psPaperSize')) patch.paperSize = g('psPaperSize');
      if (g('psCustomWidth')) patch.customWidth = g('psCustomWidth');
      if (g('psCustomHeight')) patch.customHeight = g('psCustomHeight');
      if (g('psFontFamily')) patch.fontFamily = g('psFontFamily');
      const numOrNull = (id) => { const v = g(id); return v === null || v === '' ? null : parseFloat(v); };
      ['marginTop', 'marginBottom', 'marginRight', 'marginLeft'].forEach((k) => { const v = numOrNull('ps' + k.charAt(0).toUpperCase() + k.slice(1)); if (v !== null && !isNaN(v)) patch[k] = v; });
      const fs = numOrNull('psFontSize'); if (fs !== null && !isNaN(fs)) patch.fontSize = fs;
      ['titleFontSize', 'tableHeaderFontSize', 'tableBodyFontSize', 'footerFontSize', 'subscriberInfoFontSize'].forEach((k) => {
        const el = document.getElementById('ps' + k.charAt(0).toUpperCase() + k.slice(1));
        if (el) patch[k] = parseFloat(el.value) || 0;
      });
      const css = g('psCustomCSS'); if (css !== null) patch.customCSS = css;

      /* ألوان التقارير */
      const colorIds = ['psHeaderBg', 'psHeaderColor', 'psAccentColor', 'psBorderColor', 'psRowEvenBg', 'psRowOddBg', 'psBodyColor', 'psFooterBg', 'psFooterColor'];
      const colorMap = { psHeaderBg: 'headerBg', psHeaderColor: 'headerColor', psAccentColor: 'accentColor', psBorderColor: 'borderColor', psRowEvenBg: 'rowEvenBg', psRowOddBg: 'rowOddBg', psBodyColor: 'bodyColor', psFooterBg: 'footerBg', psFooterColor: 'footerColor' };
      const colors = {};
      colorIds.forEach((id) => { const el = document.getElementById(id); if (el) colors[colorMap[id]] = el.value; });
      patch.intlColors = colors;

      if (window.PrintSettingsPro && PrintSettingsPro.savePS) PrintSettingsPro.savePS(patch);
      else { const s = Store.settings(); s.printSettings = Object.assign({}, (window.PrintSettingsPro ? PrintSettingsPro.getPS() : {}), patch); Store.flush(); }

      /* خيارات المستندات العامة */
      const th = g('st-theme'); if (th) Store.setSetting('printTheme', th);
      const tw = g('st-thermal'); if (tw) Store.setSetting('thermalWidth', parseFloat(tw));
      const stH = gc('st-header'); if (stH !== null) Store.setSetting('printHeader', stH);
      const stW = gc('st-watermark'); if (stW !== null) Store.setSetting('printWatermark', stW);
      const stZ = gc('st-zebra'); if (stZ !== null) Store.setSetting('printZebra', stZ);

      try { Audit.log('تعديل', 'حفظ إعدادات الطباعة'); } catch (e) {}
      if (!opts.quiet) UI.toast('تم حفظ إعدادات الطباعة ✓', 'success');
    } catch (e) {
      console.error(e);
      UI.toast('خطأ في حفظ الإعدادات: ' + e.message, 'error');
    }
  };

  /* ==================== أفعال الواجهة (نفس أسماء المحطة) ==================== */
  PAGES._selectPrintTemplate = function (id) {
    if (!window.ThemesKit) return;
    ThemesKit.apply(id);
    Router.refresh();
  };
  PAGES._applyColorTheme = function (id) {
    const t = (PAGES._colorThemes || []).find((x) => x.id === id);
    if (!t) return;
    saveColors({
      headerBg: t.headerBg, headerColor: '#ffffff', accentColor: t.accentColor,
      borderColor: t.borderColor, rowEvenBg: '#f1f5f9', rowOddBg: '#ffffff',
      bodyColor: '#1e293b', footerBg: t.headerBg, footerColor: '#ffffff'
    });
    Router.refresh();
    UI.toast('تم تطبيق السمة اللونية على التقارير ✓', 'success');
  };
  PAGES._resetPrintColors = function () {
    try {
      const ps = (window.PrintSettingsPro && PrintSettingsPro.getPS()) || {};
      if (PrintSettingsPro.savePS) PrintSettingsPro.savePS({ intlColors: {} });
      else { ps.intlColors = {}; const s = Store.settings(); s.printSettings = ps; Store.flush(); }
      Router.refresh();
      UI.toast('أُعيدت الألوان إلى قالب الثيم ✓', 'success');
    } catch (e) {}
  };
  PAGES._setOrientation = function (o) {
    try { if (window.PrintSettingsPro) PrintSettingsPro.savePS({ orientation: o }); Router.refresh(); } catch (e) {}
  };
  PAGES._onPaperSizeChange = function () {
    const sel = document.getElementById('psPaperSize');
    const row = document.getElementById('psCustomSizeRow');
    if (sel && row) row.style.display = sel.value === 'Custom' ? 'grid' : 'none';
  };
  PAGES._adjustCopies = function (d) {
    const el = document.getElementById('psCopies');
    if (!el) return;
    let v = (parseInt(el.value, 10) || 1) + d;
    v = Math.max(1, Math.min(20, v));
    el.value = v;
  };
  PAGES._setLayoutField = function (k, v) {
    try {
      if (window.PrintSettingsPro) PrintSettingsPro.savePS({ [k]: v });
      Router.refresh();
    } catch (e) {}
  };
  PAGES._resetAllPrintSettings = async function () {
    if (!await UI.confirm({ title: 'إعادة تعيين إعدادات الطباعة', msg: 'سيتم الرجوع بكل إعدادات الطباعة والألوان إلى الوضع الافتراضي. متابعة؟', okLabel: 'إعادة تعيين', danger: true })) return;
    try {
      const ps = (window.PrintSettingsPro && PrintSettingsPro.getPS()) || {};
      Object.keys(ps).forEach((k) => { if (k !== 'intlColors') delete ps[k]; });
      ps.intlColors = {};
      const s = Store.settings();
      s.printSettings = ps;
      Store.flush();
      Router.refresh();
      UI.toast('أُعيدت جميع إعدادات الطباعة للوضع الافتراضي ✓', 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
  };

  /* ---------- طباعة مستند محدد (نفس المحطة — بأنواع المدرسة) ---------- */
  PAGES._onDocTypeChange = function () {
    const sel = document.getElementById('psDocSelect');
    const typeSel = document.getElementById('psDocType');
    if (!sel || !typeSel) return;
    const docType = typeSel.value;
    sel.innerHTML = '<option value="">-- جارٍ التحميل... --</option>';
    const populate = (items) => {
      sel.innerHTML = '<option value="">-- اختر المستند --</option>';
      if (!items || !items.length) { sel.innerHTML = '<option value="">-- لا توجد مستندات — أنشئ بيانات أولاً --</option>'; return; }
      items.forEach((it) => { sel.innerHTML += `<option value="${H.esc(it.id)}">${H.esc(it.label)}</option>`; });
    };
    try {
      if (docType === 'invoice') {
        populate((Store.col('feeplans') || []).map((p) => {
          const st = Store.get('students', p.studentId) || {};
          const due = H.sum((p.items || []).filter((i) => !i.paid), (i) => i.amount);
          return { id: p.id, label: `${st.name || 'طالب'} — متأخر ${H.num(due)}` };
        }));
      } else if (docType === 'receipt') {
        populate((Store.col('payments') || []).slice(-50).reverse().map((p) => {
          const st = Store.get('students', p.studentId) || {};
          return { id: p.id, label: `${p.receiptNo || p.id} — ${st.name || ''} — ${H.num(p.amount)}` };
        }));
      } else if (docType === 'gradeSheet') {
        populate((Store.col('classes') || []).map((c) => ({ id: c.id, label: `كشف درجات — ${c.name}` })));
      } else if (docType === 'studentList') {
        populate([{ id: 'all', label: 'قائمة كل الطلاب (' + Store.count('students') + ')' }]);
      } else if (docType === 'report') {
        populate([
          { id: 'finance', label: 'التقرير المالي العام' },
          { id: 'students', label: 'تقرير إحصاء الطلاب' },
          { id: 'employees', label: 'تقرير الموظفين' },
          { id: 'payroll', label: 'تقرير الرواتب' },
          { id: 'bus', label: 'تقرير اشتراكات الباص' }
        ]);
      }
    } catch (e) {
      sel.innerHTML = '<option value="">-- خطأ في قراءة البيانات --</option>';
    }
  };

  PAGES._printSpecificDocument = async function () {
    const type = (document.getElementById('psDocType') || {}).value;
    const id = (document.getElementById('psDocSelect') || {}).value;
    if (!type || !id) { UI.toast('اختر نوع المستند والمستند أولاً', 'warn'); return; }
    try {
      if (type === 'invoice' && Pages.installments && Pages.installments.printPlan) return Pages.installments.printPlan(id);
      if (type === 'receipt' && Pages.installments && Pages.installments.printReceipt) return Pages.installments.printReceipt(id);
      if (type === 'gradeSheet' && Pages['grades-engine'] && Pages['grades-engine'].printSheet) return Pages['grades-engine'].printSheet(id);
      if (type === 'studentList') return Pages.students.exportWord ? Pages.students.printList ? Pages.students.printList() : Pages.students.exportExcel() : null;
      if (type === 'report' && Pages['reports-center'] && Pages['reports-center'].printReport) return Pages['reports-center'].printReport(id);
      UI.toast('هذا المستند يُطبع من صفحته الخاصة', 'info');
    } catch (e) {
      UI.toast('تعذر الطباعة: ' + e.message, 'error');
    }
  };

  /* ==================== صفحة إعدادات الطباعة ==================== */
  PAGES['print-settings'] = {
    render(root) {
      const ps = (window.PrintSettingsPro && PrintSettingsPro.getPS()) || {};
      const colors = getColors();
      const s = Store.settings();
      const _e = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      const templateCards = Object.values(PAGES._printTemplates).map((t) => {
        const active = (window.ThemesKit ? ThemesKit.current() : 'royal') === t.id;
        return `<button class="print-template-card${active ? ' active' : ''}" data-action="psp:template" data-t="${t.id}" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 10px;border-radius:12px;border:2px solid ${active ? 'var(--blue)' : 'var(--border)'};background:${active ? 'rgba(0,180,255,.08)' : 'var(--bg-card)'};cursor:pointer;transition:all .2s;min-width:90px;flex:1">
          <div style="width:50px;height:36px;border-radius:6px;background:${t.headerBg};display:flex;align-items:center;justify-content:center;border:1px solid #ffffff33">
            <span style="color:#fff;font-size:10px;font-weight:700">🏫</span>
          </div>
          <span style="font-size:12px;font-weight:700;color:var(--text-1)">${t.name}</span>
          <span style="font-size:10px;color:var(--text-3);text-align:center">${t.desc}</span>
        </button>`;
      }).join('');

      const paperOptions = Object.entries(PAGES._paperSizes).map(([k, p]) =>
        `<option value="${k}" ${ps.paperSize === k ? 'selected' : ''}>${_e(p.label)}</option>`).join('');

      const fontOptions = ['Cairo', 'Tahoma', 'Arial', 'Traditional Arabic', 'Simplified Arabic'].map((f) =>
        `<option value="${f}" ${(ps.fontFamily || 'Cairo') === f ? 'selected' : ''}>${f}</option>`).join('');

      const colorField = (label, id, val) => `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 10px">
          <input type="color" id="${id}" value="${_e(val || '#0b3d91')}" style="width:44px;height:32px;border-radius:8px;border:none;cursor:pointer">
          <label style="flex:1;color:var(--text-2);font-size:13px">${label}</label>
        </div>`;

      const toggleField = (label, id, checked) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px">
          <span style="color:var(--text-2);font-size:13px">${label}</span>
          <label style="position:relative;display:inline-block;width:44px;height:24px">
            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="opacity:0;width:0;height:0" onchange="this.parentElement.querySelector('.toggle-slider').classList.toggle('checked',this.checked)">
            <span class="toggle-slider${checked ? ' checked' : ''}" style="position:absolute;cursor:pointer;inset:0;background:var(--border);border-radius:24px;transition:.3s"></span>
          </label>
        </div>`;

      const fontSizeRow = (label, id, val, min, max) => `
        <div class="form-grp"><label>${label}</label>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="range" id="${id}" min="${min}" max="${max}" value="${_e(val || 0)}" oninput="document.getElementById('${id}Val').textContent=this.value" style="flex:1">
            <span id="${id}Val" style="color:var(--blue);font-weight:700;min-width:30px;text-align:center">${_e(val || 0)}</span>
          </div>
        </div>`;

      const colorThemeCards = PAGES._colorThemes.map((ct) => `
        <button data-action="psp:colorTheme" data-t="${ct.id}" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 8px;border-radius:10px;border:2px solid var(--border);background:var(--bg-card);cursor:pointer;transition:all .2s;min-width:80px;flex:1">
          <div style="width:40px;height:28px;border-radius:6px;background:${ct.headerBg};border:1px solid ${ct.borderColor}"></div>
          <span style="font-size:11px;font-weight:600;color:var(--text-1)">${ct.icon} ${ct.name}</span>
        </button>`).join('');

      const docTypeOptions = `
        <option value="invoice">فاتورة / خطة أقساط</option>
        <option value="receipt">إيصال قبض</option>
        <option value="gradeSheet">كشف درجات (حسب الصف)</option>
        <option value="studentList">كشف قائمة الطلاب</option>
        <option value="report">تقرير</option>`;

      root.innerHTML = `
      <div class="page">
        <div class="page-head">
          <h2 class="page-title-3d">
            <div class="title-icon-3d" style="background:linear-gradient(135deg,#00bcd4,#0097a7)">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="22" height="22">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </div>
            إعدادات الطباعة
          </h2>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>📋 قوالب الطباعة — ثيمات المستندات الدولية</h3></div>
          <div style="padding:12px;display:flex;flex-wrap:wrap;gap:10px">${templateCards}</div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>🔢 عدد النسخ</h3></div>
          <div class="form-grp" style="padding:0 10px">
            <label>عدد النسخ</label>
            <div style="display:flex;align-items:center;gap:12px">
              <button data-action="psp:copies" data-d="-1" style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--bg-2);cursor:pointer;font-size:18px;font-weight:700;color:var(--text-1)">−</button>
              <input type="number" id="psCopies" class="form-inp" value="${_e(ps.copies || 1)}" min="1" max="20" style="width:60px;text-align:center;font-size:18px;font-weight:700">
              <button data-action="psp:copies" data-d="1" style="width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--bg-2);cursor:pointer;font-size:18px;font-weight:700;color:var(--text-1)">+</button>
              <span style="font-size:12px;color:var(--text-3)">(1 - 20)</span>
            </div>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>📄 أبعاد الصفحة</h3></div>
          <div class="form-grp"><label>نوع الصفحة</label>
            <select id="psPaperSize" class="form-inp form-select" onchange="Pages._onPaperSizeChange()">${paperOptions}</select>
          </div>
          <div id="psCustomSizeRow" style="display:${ps.paperSize === 'Custom' ? 'grid' : 'none'};grid-template-columns:1fr 1fr;gap:10px">
            <div class="form-grp"><label>العرض (مم)</label><input type="number" id="psCustomWidth" class="form-inp" value="${_e(ps.customWidth || 210)}" min="40" max="300"></div>
            <div class="form-grp"><label>الارتفاع (مم)</label><input type="number" id="psCustomHeight" class="form-inp" value="${_e(ps.customHeight || 297)}" min="40" max="400"></div>
          </div>
          <div class="form-grp"><label>اتجاه الصفحة</label>
            <div style="display:flex;gap:10px">
              <button class="btn-secondary${ps.orientation !== 'landscape' ? ' active' : ''}" data-action="psp:orientation" data-o="portrait" style="flex:1;padding:10px"> ↕ عمودي</button>
              <button class="btn-secondary${ps.orientation === 'landscape' ? ' active' : ''}" data-action="psp:orientation" data-o="landscape" style="flex:1;padding:10px"> ↔ أفقي</button>
            </div>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>📐 الهوامش (مم)</h3></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 10px">
            <div class="form-grp"><label>أعلى</label><input type="number" id="psMarginTop" class="form-inp" value="${_e(ps.marginTop ?? 8)}" min="0" max="50"></div>
            <div class="form-grp"><label>أسفل</label><input type="number" id="psMarginBottom" class="form-inp" value="${_e(ps.marginBottom ?? 8)}" min="0" max="50"></div>
            <div class="form-grp"><label>يمين</label><input type="number" id="psMarginRight" class="form-inp" value="${_e(ps.marginRight ?? 8)}" min="0" max="50"></div>
            <div class="form-grp"><label>يسار</label><input type="number" id="psMarginLeft" class="form-inp" value="${_e(ps.marginLeft ?? 8)}" min="0" max="50"></div>
          </div>
          <div style="padding:8px 10px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-secondary" data-action="psp:margins" data-m="0">📄 بكامل الصفحة (بدون حواف)</button>
            <button class="btn-secondary" data-action="psp:margins" data-m="10">📐 هوامش 10مم</button>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>🔤 إعدادات الخط</h3></div>
          <div class="form-grp"><label>نوع الخط</label>
            <select id="psFontFamily" class="form-inp form-select">${fontOptions}</select>
          </div>
          <div class="form-grp"><label>حجم الخط الأساسي (نقطة)</label>
            <div style="display:flex;align-items:center;gap:10px">
              <input type="range" id="psFontSize" min="7" max="18" value="${_e(ps.fontSize || 11)}" oninput="document.getElementById('psFontSizeVal').textContent=this.value" style="flex:1">
              <span id="psFontSizeVal" style="color:var(--blue);font-weight:700;min-width:30px;text-align:center">${_e(ps.fontSize || 11)}</span>
            </div>
          </div>
          <div style="padding:0 10px;margin-top:8px">
            <div style="font-size:12px;color:var(--text-3);padding:4px 0;margin-bottom:4px;border-bottom:1px solid var(--border)">تخصيص حجم الخط لكل قسم (0 = الافتراضي):</div>
            ${fontSizeRow('عنوان المستند', 'psTitleFontSize', ps.titleFontSize, 0, 28)}
            ${fontSizeRow('رأس الجدول', 'psTableHeaderFontSize', ps.tableHeaderFontSize, 0, 16)}
            ${fontSizeRow('محتوى الجدول', 'psTableBodyFontSize', ps.tableBodyFontSize, 0, 14)}
            ${fontSizeRow('التذييل', 'psFooterFontSize', ps.footerFontSize, 0, 12)}
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>🎨 ألوان سريعة</h3></div>
          <div style="font-size:12px;color:var(--text-3);padding:4px 10px;margin-bottom:4px">اختر سمة لونية لتطبيقها على جميع حقول التقارير</div>
          <div style="padding:12px;display:flex;flex-wrap:wrap;gap:8px">${colorThemeCards}</div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>🎨 ألوان التقارير</h3></div>
          <div style="font-size:12px;color:var(--text-3);padding:4px 10px;margin-bottom:4px;background:rgba(8,145,178,.08);border-radius:6px;border-right:3px solid var(--cyan)">
            ℹ️ <b>هذه الألوان تُطبّق على التقارير والكشوفات فقط</b> وتغطي ثيم المستند الدولي عند تغييرها. اتركها كما هي لاستخدام ألوان القالب المختار.
          </div>
          ${colorField('لون رأس التقرير', 'psHeaderBg', colors.headerBg)}
          ${colorField('لون نص الرأس', 'psHeaderColor', colors.headerColor)}
          ${colorField('اللون المميز (رأس الجدول)', 'psAccentColor', colors.accentColor)}
          ${colorField('لون حدود الجدول', 'psBorderColor', colors.borderColor)}
          ${colorField('خلفية صف زوجي', 'psRowEvenBg', colors.rowEvenBg)}
          ${colorField('خلفية صف فردي', 'psRowOddBg', colors.rowOddBg)}
          ${colorField('لون نص التقرير', 'psBodyColor', colors.bodyColor)}
          ${colorField('لون تذييل التقرير', 'psFooterBg', colors.footerBg)}
          ${colorField('لون نص التذييل', 'psFooterColor', colors.footerColor)}
          <div style="padding:8px 10px">
            <button class="btn-secondary" data-action="psp:resetColors" style="width:100%">🔄 إعادة تعيين الألوان للقالب</button>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>⚙️ خيارات المستندات</h3></div>
          <div class="form-grp"><label>ثيم المستندات الدولي</label>
            <select id="st-theme" class="form-inp form-select">
              ${(window.ThemesKit ? ThemesKit.list : []).map((t) => `<option value="${t.id}" ${(Store.getSetting('printTheme', 'royal')) === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-grp"><label>عرض الطابعة الحرارية</label>
            <select id="st-thermal" class="form-inp form-select">
              <option value="80" ${(Store.getSetting('thermalWidth', 80) == 80) ? 'selected' : ''}>80 مم (الشائع)</option>
              <option value="58" ${(Store.getSetting('thermalWidth', 80) == 58) ? 'selected' : ''}>58 مم</option>
            </select>
          </div>
          ${toggleField('ترويسة المدرسة والشعار في كل مستند', 'st-header', Store.getSetting('printHeader', true))}
          ${toggleField('علامة مائية بالشعار في الشهادات', 'st-watermark', Store.getSetting('printWatermark', true))}
          ${toggleField('تظليل متناوب لصفوف الجداول', 'st-zebra', Store.getSetting('printZebra', true))}
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>✏️ CSS مخصص</h3></div>
          <div class="form-grp"><label>أضف أنماط CSS خاصة لطباعتك</label>
            <textarea id="psCustomCSS" class="form-inp" rows="5" style="direction:ltr;text-align:left;font-family:monospace;font-size:12px;resize:vertical" placeholder=".print-doc td { font-size: 10pt; }">${_e(ps.customCSS || '')}</textarea>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>👁️ معاينة مباشرة</h3></div>
          <div id="psLivePreview" style="padding:12px;overflow:auto;max-height:400px;border:1px solid var(--border);border-radius:8px;background:#fff;direction:rtl"></div>
          <div style="padding:8px 10px;display:flex;gap:10px">
            <button class="btn-primary" data-action="psp:testPrint" style="flex:1;padding:12px">🖨️ طباعة تجريبية</button>
            <button class="btn-secondary" data-action="psp:refreshPreview" style="padding:12px">🔄 تحديث المعاينة</button>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>📄 طباعة مستند محدد</h3></div>
          <div class="form-grp"><label>نوع المستند</label>
            <select id="psDocType" class="form-inp form-select" onchange="Pages._onDocTypeChange()">${docTypeOptions}</select>
          </div>
          <div class="form-grp"><label>اختر المستند</label>
            <select id="psDocSelect" class="form-inp form-select"><option value="">-- اختر نوع المستند أولاً --</option></select>
          </div>
          <div style="padding:8px 10px">
            <button class="btn-primary" data-action="psp:printDoc" style="width:100%;padding:12px">🖨️ طباعة المستند</button>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn-primary" data-action="psp:save" style="flex:1;padding:14px;font-size:16px">💾 حفظ إعدادات الطباعة</button>
          <button class="btn-secondary" data-action="psp:refreshPreview" style="padding:14px;font-size:16px">👁 معاينة</button>
        </div>
        <div style="margin-top:10px;margin-bottom:20px">
          <button class="btn-danger" data-action="psp:resetAll" style="width:100%;padding:12px;font-size:14px">🔄 إعادة تعيين جميع إعدادات الطباعة</button>
        </div>
      </div>`;

      setTimeout(() => { PAGES._updateLivePreview(); }, 80);
      setTimeout(() => { PAGES._onDocTypeChange(); }, 160);
    }
  };

  /* ==================== تسجيل الأفعال ==================== */
  Actions.register('psp', {
    template(ds) { PAGES._selectPrintTemplate(ds.t); },
    colorTheme(ds) { PAGES._applyColorTheme(ds.t); },
    copies(ds) { PAGES._adjustCopies(parseInt(ds.d, 10) || 0); },
    orientation(ds) { PAGES._setOrientation(ds.o); },
    margins(ds) {
      const m = parseFloat(ds.m) || 0;
      try { if (window.PrintSettingsPro) PrintSettingsPro.savePS({ marginTop: m, marginBottom: m, marginRight: m, marginLeft: m }); Router.refresh(); } catch (e) {}
    },
    resetColors() { PAGES._resetPrintColors(); },
    testPrint() { PAGES._testPrint(); },
    refreshPreview() { PAGES._updateLivePreview(); },
    printDoc() { PAGES._printSpecificDocument(); },
    save() { PAGES._saveAllPrintSettings(); },
    resetAll() { PAGES._resetAllPrintSettings(); }
  });
})();

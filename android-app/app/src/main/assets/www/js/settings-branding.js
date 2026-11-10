/* =========================================================
   settings-branding.js — الهوية، الأكاديمي، الطباعة، المظهر، المستخدمون
   كل تغيير في المظهر يُطبَّق فورياً على متغيرات CSS (ليس شكلياً)
   ========================================================= */
'use strict';

(function () {
  let tab = 'branding';

  /* ---------- محرك الثيم الحي ---------- */
  const ThemeApply = {
    apply() {
      const u = Store.getSetting('themeUI', JSON.parse(JSON.stringify(Config.THEME_DEFAULTS)));
      const html = document.documentElement;
      html.dataset.accent = u.accent || 'blue';
      html.dataset.density = u.density || 'normal';
      if (u.dark) html.dataset.theme = 'dark';
      else delete html.dataset.theme;
      const r = html.style;
      r.setProperty('--fs-base', (u.fontSize || 15) + 'px');
      r.setProperty('--icon-size', (u.iconSize || 46) + 'px');
      r.setProperty('--topbar-h', (u.topbarH || 60) + 'px');
      r.setProperty('--bottomnav-h', (u.bottomnavH || 64) + 'px');
      r.setProperty('--sidebar-w', (u.sidebarW || 288) + 'px');
      /* زر الوضع الليلي */
      const btn = document.getElementById('btn-theme');
      if (btn) btn.textContent = u.dark ? '☀️' : '🌙';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = u.dark ? '#030b1a' : '#0091ea';
    },
    save(patch) {
      const u = Object.assign(Store.getSetting('themeUI', JSON.parse(JSON.stringify(Config.THEME_DEFAULTS))), patch);
      Store.setSetting('themeUI', u);
      this.apply();
    }
  };
  window.ThemeApply = ThemeApply;

  const P = {
    id: 'settings-branding',

    render(root) {
      const s = Store.settings();
      root.innerHTML = `<div class="page">
        ${UI.pageHead('⚙️ الإعدادات والهوية', '')}
        <div class="tabs">
          <button class="tab ${tab === 'branding' ? 'active' : ''}" data-action="set:tab" data-t="branding">🏫 هوية المدرسة</button>
          <button class="tab ${tab === 'academic' ? 'active' : ''}" data-action="set:tab" data-t="academic">🎯 النظام الأكاديمي</button>
          <button class="tab ${tab === 'print' ? 'active' : ''}" data-action="set:tab" data-t="print">🖨️ إعدادات الطباعة</button>
          <button class="tab ${tab === 'ui' ? 'active' : ''}" data-action="set:tab" data-t="ui">🎨 المظهر والثيمات</button>
          <button class="tab ${tab === 'users' ? 'active' : ''}" data-action="set:tab" data-t="users">👥 المستخدمون والأمان</button>
        </div>
        <div id="set-body">${this.bodyHTML()}</div>
      </div>`;
    },

    bodyHTML() {
      const s = Store.settings();
      if (tab === 'branding') return `
        <div class="card">
          <div class="card-title">🏫 بيانات المدرسة</div>
          <div class="form-grid">
            <div class="field span-2"><label>اسم المدرسة (عربي)</label><input id="st-name" value="${H.esc(s.schoolName || '')}"></div>
            <div class="field span-2"><label>الاسم بالإنجليزية</label><input id="st-name-en" value="${H.esc(s.schoolNameEn || '')}" dir="ltr"></div>
            <div class="field span-2"><label>الشعار / الأيقونة التعريفية</label><input id="st-slogan" value="${H.esc(s.slogan || '')}"></div>
            <div class="field"><label>العام الدراسي</label><input id="st-year" value="${H.esc(s.year || '')}"></div>
            <div class="field"><label>العملة</label><input id="st-currency" value="${H.esc(s.currency || 'ريال')}"></div>
            <div class="field"><label>اسم الفصل الأول</label><input id="st-term1" value="${H.esc(s.term1 || '')}"></div>
            <div class="field"><label>اسم الفصل الثاني</label><input id="st-term2" value="${H.esc(s.term2 || '')}"></div>
            <div class="field"><label>هاتف المدرسة</label><input id="st-phone" value="${H.esc(s.phone || '')}" type="tel"></div>
            <div class="field"><label>جهة الإصدار (التوقيع)</label><input id="st-issued" value="${H.esc(s.issuedBy || '')}"></div>
            <div class="field span-2"><label>العنوان</label><input id="st-address" value="${H.esc(s.address || '')}"></div>
          </div>
          <div class="field">
            <label>شعار المدرسة (PNG بخلفية شفافة — يظهر في النظام والطباعة والبطاقات)</label>
            <div class="flex items-center gap-12">
              <img id="st-logo-prev" src="${s.logo || 'assets/images/logo.png'}" class="photo-preview" style="background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 50%/16px" alt="">
              <div>
                <button class="btn btn-soft" data-action="set:pickLogo">🖼️ رفع شعار PNG</button>
                <button class="btn btn-ghost btn-sm ${s.logo ? '' : 'hidden'}" data-action="set:resetLogo">↩️ استعادة الافتراضي</button>
                <small class="muted" style="display:block;margin-top:4px">يفضَّل PNG شفاف مربع 512×512 — يُضغط تلقائياً</small>
              </div>
            </div>
          </div>
          <button class="btn btn-primary" data-action="set:saveBranding">💾 حفظ بيانات الهوية</button>
        </div>`;

      if (tab === 'academic') {
        const w = s.weights || Config.DEFAULT_SETTINGS.weights;
        return `
        <div class="card mb-16">
          <div class="card-title">🎯 معايير الدرجات</div>
          <div class="form-grid">
            <div class="field"><label>الدرجة العظمى للمادة</label><input type="number" id="st-gmax" value="${s.gradeMax || 100}"></div>
            <div class="field"><label>درجة النجاح (%)</label><input type="number" id="st-pass" value="${s.passMark || 50}"></div>
          </div>
          <div class="card-title" style="font-size:14px">1️⃣ ${H.esc(s.term1 || 'الفصل الأول')} — توزيع الدرجات</div>
          <div class="pay-grid">
            <div class="field"><label>أعمال السنة</label><input type="number" id="st-t1y" value="${w.t1.year}"></div>
            <div class="field"><label>الاختبار الشهري</label><input type="number" id="st-t1m" value="${w.t1.monthly}"></div>
            <div class="field"><label>الاختبار النصفي</label><input type="number" id="st-t1n" value="${w.t1.midterm}"></div>
          </div>
          <div class="card-title" style="font-size:14px">2️⃣ ${H.esc(s.term2 || 'الفصل الثاني')} — توزيع الدرجات</div>
          <div class="pay-grid">
            <div class="field"><label>أعمال السنة</label><input type="number" id="st-t2y" value="${w.t2.year}"></div>
            <div class="field"><label>الاختبار الشهري</label><input type="number" id="st-t2m" value="${w.t2.monthly}"></div>
            <div class="field"><label>الاختبار النهائي</label><input type="number" id="st-t2f" value="${w.t2.final}"></div>
          </div>
          <small class="muted">يجب أن يساوي مجموع كل فصل الدرجة العظمى (${s.gradeMax || 100})</small>
          <div class="mt-16"><button class="btn btn-primary" data-action="set:saveAcademic">💾 حفظ المعايير</button></div>
        </div>`;
      }

      if (tab === 'print') {
        const ps = (window.PrintSettingsPro && PrintSettingsPro.getPS()) || {};
        const fsRow = (label, id, val, min, max) => `
          <div class="field"><label>${label}</label>
            <div style="display:flex;align-items:center;gap:10px">
              <input type="range" min="${min}" max="${max}" value="${val || 0}" id="${id}" data-ps-range="1" style="flex:1;padding:0">
              <span id="${id}Val" style="color:var(--primary);font-weight:800;min-width:30px;text-align:center">${val || 0}</span>
            </div></div>`;
        return `
        <div class="card">
          <div class="card-title">🖨️ إعدادات الطباعة <small class="muted">نفس نظام تطبيق المحطة — تُطبّق فوراً على كل الكشوفات والسندات والشهادات وPDF</small></div>

          <div class="card-title" style="font-size:14px;margin-top:8px">🔢 عدد النسخ</div>
          <div class="field" style="display:flex;align-items:center;gap:12px;max-width:300px">
            <button class="btn btn-ghost" data-action="set:psCopies" data-d="-1" type="button" style="width:40px">−</button>
            <input type="number" id="psCopies" value="${ps.copies || 1}" min="1" max="20" style="width:70px;text-align:center;font-weight:800">
            <button class="btn btn-ghost" data-action="set:psCopies" data-d="1" type="button" style="width:40px">+</button>
            <small class="muted">(1 - 20)</small>
          </div>

          <div class="card-title" style="font-size:14px;margin-top:14px">📄 أبعاد الصفحة</div>
          <div class="form-grid">
            <div class="field"><label>نوع الصفحة</label>
              <select id="psPaperSize">
                <option value="A4" ${ps.paperSize !== 'A5' && ps.paperSize !== 'Letter' && ps.paperSize !== 'Custom' ? 'selected' : ''}>A4</option>
                <option value="A5" ${ps.paperSize === 'A5' ? 'selected' : ''}>A5</option>
                <option value="Letter" ${ps.paperSize === 'Letter' ? 'selected' : ''}>Letter</option>
                <option value="Custom" ${ps.paperSize === 'Custom' ? 'selected' : ''}>مخصصة</option>
              </select></div>
          </div>
          <div id="psCustomSizeRow" class="form-grid" style="display:${ps.paperSize === 'Custom' ? 'grid' : 'none'}">
            <div class="field"><label>العرض (مم)</label><input type="number" id="psCustomWidth" value="${ps.customWidth || 210}" min="40" max="300"></div>
            <div class="field"><label>الارتفاع (مم)</label><input type="number" id="psCustomHeight" value="${ps.customHeight || 297}" min="40" max="400"></div>
          </div>
          <div class="field"><label>اتجاه الصفحة</label>
            <div style="display:flex;gap:10px">
              <button class="btn ${ps.orientation === 'landscape' ? 'btn-ghost' : 'btn-primary'}" id="psPortrait" data-action="set:psOrientation" data-o="portrait" style="flex:1;padding:10px"> ↕ عمودي</button>
              <button class="btn ${ps.orientation === 'landscape' ? 'btn-primary' : 'btn-ghost'}" id="psLandscape" data-action="set:psOrientation" data-o="landscape" style="flex:1;padding:10px"> ↔ أفقي</button>
            </div>
          </div>

          <div class="card-title" style="font-size:14px;margin-top:14px">📐 الهوامش (مم)</div>
          <div class="form-grid">
            <div class="field"><label>أعلى</label><input type="number" id="psMarginTop" value="${ps.marginTop ?? 8}" min="0" max="50"></div>
            <div class="field"><label>أسفل</label><input type="number" id="psMarginBottom" value="${ps.marginBottom ?? 8}" min="0" max="50"></div>
            <div class="field"><label>يمين</label><input type="number" id="psMarginRight" value="${ps.marginRight ?? 8}" min="0" max="50"></div>
            <div class="field"><label>يسار</label><input type="number" id="psMarginLeft" value="${ps.marginLeft ?? 8}" min="0" max="50"></div>
          </div>
          <div class="flex gap-8 wrap mt-8">
            <button class="btn btn-ghost" data-action="set:psMargins" data-m="0">📄 بكامل الصفحة (بدون حواف)</button>
            <button class="btn btn-ghost" data-action="set:psMargins" data-m="10">📐 هوامش 10مم</button>
          </div>

          <div class="card-title" style="font-size:14px;margin-top:14px">🔤 إعدادات الخط</div>
          <div class="form-grid">
            <div class="field"><label>نوع الخط</label>
              <select id="psFontFamily">
                ${['Cairo', 'Tahoma', 'Arial', 'Traditional Arabic', 'Simplified Arabic'].map((f) => `<option value="${f}" ${(ps.fontFamily || 'Cairo') === f ? 'selected' : ''}>${f}</option>`).join('')}
              </select></div>
          </div>
          <div class="field"><label>حجم الخط الأساسي (نقطة): <b id="psFontSizeVal" style="color:var(--primary)">${ps.fontSize || 11}</b></label>
            <input type="range" id="psFontSize" min="7" max="18" value="${ps.fontSize || 11}" data-ps-range="1" style="width:100%;padding:0">
          </div>
          <div style="font-size:12px;color:var(--text-3);margin:8px 0 4px">تخصيص حجم الخط لكل قسم (0 = الافتراضي):</div>
          <div class="form-grid">
            ${fsRow('عنوان المستند', 'psTitleFontSize', ps.titleFontSize, 0, 28)}
            ${fsRow('رأس الجدول', 'psTableHeaderFontSize', ps.tableHeaderFontSize, 0, 16)}
            ${fsRow('محتوى الجدول', 'psTableBodyFontSize', ps.tableBodyFontSize, 0, 14)}
            ${fsRow('التذييل', 'psFooterFontSize', ps.footerFontSize, 0, 12)}
          </div>

          <div class="card-title" style="font-size:14px;margin-top:14px">⚙️ خيارات إضافية</div>
          <div class="form-grid">
            <div class="field"><label>ثيم المستندات</label>
              <select id="st-theme">
                ${(window.ThemesKit ? ThemesKit.list : []).map((t) => `<option value="${t.id}" ${(Store.getSetting('printTheme', 'royal')) === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
              </select></div>
            <div class="field"><label>عرض الطابعة الحرارية</label>
              <select id="st-thermal">
                <option value="80" ${(Store.getSetting('thermalWidth', 80) == 80) ? 'selected' : ''}>80 مم (الشائع)</option>
                <option value="58" ${(Store.getSetting('thermalWidth', 80) == 58) ? 'selected' : ''}>58 مم</option>
              </select></div>
          </div>
          <div class="grid grid-2 gap-8">
            <label class="switch"><input type="checkbox" id="st-header" ${Store.getSetting('printHeader', true) ? 'checked' : ''}><span class="track"></span><span>ترويسة المدرسة والشعار في كل مستند</span></label>
            <label class="switch"><input type="checkbox" id="st-watermark" ${Store.getSetting('printWatermark', true) ? 'checked' : ''}><span class="track"></span><span>علامة مائية بالشعار في الشهادات</span></label>
            <label class="switch"><input type="checkbox" id="st-zebra" ${Store.getSetting('printZebra', true) ? 'checked' : ''}><span class="track"></span><span>تظليل متناوب لصفوف الجداول</span></label>
          </div>

          <div class="card-title" style="font-size:14px;margin-top:14px">🎨 CSS مخصص <small class="muted">اختياري — لأنماط طباعتك الخاصة</small></div>
          <div class="field"><textarea id="psCustomCSS" rows="3" style="direction:ltr;text-align:left;font-family:monospace;font-size:12px;resize:vertical" placeholder=".print-doc td { font-size: 10pt; }">${(ps.customCSS || '').replace(/</g, '&lt;')}</textarea></div>

          <div class="card-title" style="font-size:14px;margin-top:14px">👁️ معاينة مباشرة</div>
          <div id="psLivePreview" style="padding:12px;overflow:auto;max-height:340px;border:1px solid var(--border);border-radius:12px;background:#fff;direction:rtl"></div>

          <div class="flex gap-8 wrap mt-16">
            <button class="btn btn-primary" data-action="set:savePrint">💾 حفظ إعدادات الطباعة</button>
            <button class="btn btn-gold" data-action="set:testPrint">🖨️ طباعة تجريبية</button>
            <button class="btn btn-ghost" data-action="set:psPreview">🔄 تحديث المعاينة</button>
          </div>
        </div>`;
      }

      if (tab === 'ui') {
        const u = Store.getSetting('themeUI', Config.THEME_DEFAULTS);
        return `
        <div class="card mb-16">
          <div class="card-title">🎨 ثيم الألوان</div>
          <div class="color-row mb-16">
            ${Config.ACCENTS.map((a) => `
              <button class="color-swatch ${u.accent === a.id ? 'active' : ''}" style="background:${a.dot};width:52px;height:52px;border-radius:14px;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center"
                data-action="set:accent" data-a="${a.id}" title="${a.label}">${a.label.split(' ')[0]}</button>`).join('')}
          </div>
          <label class="switch mb-16"><input type="checkbox" data-ui="dark" ${u.dark ? 'checked' : ''}><span class="track"></span><span>🌙 الوضع الليلي</span></label>
        </div>
        <div class="card">
          <div class="card-title">📐 التحكم الحي في المقاسات <small class="muted">يُطبّق فوراً على كل الواجهة</small></div>
          ${this.slider('حجم الخط العام', 'fontSize', u.fontSize || 15, 12, 20, 'px')}
          ${this.slider('حجم الأيقونات ثلاثية الأبعاد', 'iconSize', u.iconSize || 46, 32, 64, 'px')}
          ${this.slider('ارتفاع الشريط العلوي', 'topbarH', u.topbarH || 60, 48, 84, 'px')}
          ${this.slider('ارتفاع الشريط السفلي', 'bottomnavH', u.bottomnavH || 64, 52, 84, 'px')}
          ${this.slider('عرض القائمة الجانبية', 'sidebarW', u.sidebarW || 288, 240, 360, 'px')}
          <div class="field mt-16"><label>كثافة العرض</label>
            <select data-ui="density">
              <option value="compact" ${u.density === 'compact' ? 'selected' : ''}>مضغوط</option>
              <option value="normal" ${u.density === 'normal' ? 'selected' : ''}>عادي</option>
              <option value="cozy" ${u.density === 'cozy' ? 'selected' : ''}>مريح</option>
            </select></div>
          <div class="flex gap-8 mt-8">
            <button class="btn btn-ghost" data-action="set:resetUI">↩️ استعادة الافتراضي</button>
          </div>
        </div>`;
      }

      /* users */
      const me = AuthGuard.user;
      return `
      <div class="card mb-16">
        <div class="card-title">👥 مستخدمو النظام</div>
        <div class="table-wrap"><table class="data-table" style="min-width:0">
          <thead><tr><th>الاسم</th><th>المستخدم</th><th>الدور</th><th></th></tr></thead>
          <tbody>
            ${Store.col('users').map((u) => `<tr>
              <td style="font-weight:800">${H.esc(u.name)} ${u.id === me.id ? UI.badge('أنت', 'badge-info') : ''}</td>
              <td class="num">${H.esc(u.username)}</td>
              <td>${AuthGuard.roleLabel(u.role)}</td>
              <td class="row-actions">
                <button class="icon-btn btn-write" data-action="set:resetPw" data-id="${u.id}" title="إعادة تعيين كلمة المرور">🔑</button>
                ${u.id !== me.id ? `<button class="icon-btn btn-write" data-action="set:delUser" data-id="${u.id}" title="حذف">🗑️</button>` : ''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>
        <button class="btn btn-primary mt-16 btn-write" data-action="set:addUser">➕ إضافة مستخدم</button>
      </div>
      <div class="card">
        <div class="card-title">🔒 تغيير كلمة مروري</div>
        <div class="form-grid">
          <div class="field"><label>الحالية</label><input type="password" id="pw-old"></div>
          <div class="field"><label>الجديدة (6+ أحرف)</label><input type="password" id="pw-new"></div>
        </div>
        <button class="btn btn-primary" data-action="set:changePw">💾 تغيير كلمة المرور</button>
      </div>`;
    },

    slider(label, key, val, min, max, unit) {
      return `<div class="field">
        <label>${label}: <b data-ui-val="${key}">${val}${unit}</b></label>
        <input type="range" min="${min}" max="${max}" value="${val}" data-ui="${key}" style="width:100%;padding:0">
      </div>`;
    }
  };

  /* ================= الأفعال ================= */
  const saveDeb = H.debounce(() => Store.flush(), 400);

  /* جمع إعدادات الطباعة من الواجهة (مستوى وحدة — بلا this) */
  const _collectPrint = () => {
    const g = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
    const gn = (id, def) => { const v = parseFloat(g(id)); return isNaN(v) ? def : v; };
    const landEl = document.getElementById('psLandscape');
    return {
      copies: Math.max(1, Math.min(20, gn('psCopies', 1))),
      paperSize: g('psPaperSize') || 'A4',
      customWidth: gn('psCustomWidth', 210),
      customHeight: gn('psCustomHeight', 297),
      orientation: (landEl && String(landEl.className).includes('btn-primary')) ? 'landscape' : 'portrait',
      marginTop: gn('psMarginTop', 8), marginBottom: gn('psMarginBottom', 8),
      marginRight: gn('psMarginRight', 8), marginLeft: gn('psMarginLeft', 8),
      fontFamily: g('psFontFamily') || 'Cairo',
      fontSize: gn('psFontSize', 11),
      titleFontSize: gn('psTitleFontSize', 0),
      tableHeaderFontSize: gn('psTableHeaderFontSize', 0),
      tableBodyFontSize: gn('psTableBodyFontSize', 0),
      footerFontSize: gn('psFooterFontSize', 0),
      customCSS: g('psCustomCSS') || ''
    };
  };

  Actions.register('set', {
    tab(ds) {
      tab = ds.t;
      P.render(document.getElementById('page-root'));
      /* معاينة الطباعة الحية عند فتح التبويب */
      if (ds.t === 'print') setTimeout(() => { try { Actions.call('set', 'psPreview', {}); } catch (e) {} }, 60);
    },

    /* --- الهوية --- */
    saveBranding() {
      const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
      Store.setSetting('schoolName', g('st-name'));
      Store.setSetting('schoolNameEn', g('st-name-en'));
      Store.setSetting('slogan', g('st-slogan'));
      Store.setSetting('year', g('st-year'));
      Store.setSetting('currency', g('st-currency') || 'ريال');
      Store.setSetting('term1', g('st-term1'));
      Store.setSetting('term2', g('st-term2'));
      Store.setSetting('phone', g('st-phone'));
      Store.setSetting('address', g('st-address'));
      Store.setSetting('issuedBy', g('st-issued'));
      Router.updateBranding();
      Audit.log('تعديل', 'تحديث بيانات هوية المدرسة');
      UI.toast('تم حفظ بيانات المدرسة ✓', 'success');
    },
    pickLogo() {
      UI.pickPhoto((dataURL) => {
        Store.setSetting('logo', dataURL);
        Router.updateBranding();
        P.render(document.getElementById('page-root'));
        UI.toast('تم تحديث الشعار ✓', 'success');
        Audit.log('تعديل', 'تحديث شعار المدرسة');
      }, 512);
    },
    resetLogo() {
      Store.setSetting('logo', '');
      Router.updateBranding();
      P.render(document.getElementById('page-root'));
    },

    /* --- الأكاديمي --- */
    saveAcademic() {
      const g = (id) => parseFloat((document.getElementById(id) || {}).value) || 0;
      const gmax = g('st-gmax') || 100;
      const t1 = { year: g('st-t1y'), monthly: g('st-t1m'), midterm: g('st-t1n') };
      const t2 = { year: g('st-t2y'), monthly: g('st-t2m'), final: g('st-t2f') };
      if (t1.year + t1.monthly + t1.midterm !== gmax) return UI.toast(`مجموع درجات الفصل الأول (${t1.year + t1.monthly + t1.midterm}) لا يساوي ${gmax}`, 'error');
      if (t2.year + t2.monthly + t2.final !== gmax) return UI.toast(`مجموع درجات الفصل الثاني (${t2.year + t2.monthly + t2.final}) لا يساوي ${gmax}`, 'error');
      Store.setSetting('gradeMax', gmax);
      Store.setSetting('passMark', g('st-pass') || 50);
      Store.setSetting('weights', { t1, t2 });
      Audit.log('تعديل', 'تحديث معايير الدرجات');
      UI.toast('تم حفظ معايير الدرجات ✓', 'success');
    },

    /* --- الطباعة (نظام تطبيق المحطة) --- */
    psCopies(ds) {
      const inp = document.getElementById('psCopies');
      if (!inp) return;
      const v = Math.max(1, Math.min(20, (parseInt(inp.value, 10) || 1) + parseInt(ds.d, 10)));
      inp.value = v;
    },
    psOrientation(ds) {
      const po = document.getElementById('psPortrait'), pl = document.getElementById('psLandscape');
      if (!po || !pl) return;
      po.className = 'btn ' + (ds.o === 'portrait' ? 'btn-primary' : 'btn-ghost');
      pl.className = 'btn ' + (ds.o === 'landscape' ? 'btn-primary' : 'btn-ghost');
      /* حفظ فوري مثل تطبيق المحطة — الاتجاه يسري على كل الطباعات */
      const p = _collectPrint();
      p.orientation = ds.o;
      Store.setSetting('printSettings', p);
      Store.flush();
      UI.toast(ds.o === 'landscape' ? '↔ تم ضبط الاتجاه الأفقي وحفظه ✓' : '↕ تم ضبط الاتجاه العمودي وحفظه ✓', 'success', 1800);
    },
    psMargins(ds) {
      const m = ds.m === '0' ? '0' : '10';
      ['psMarginTop', 'psMarginBottom', 'psMarginLeft', 'psMarginRight'].forEach((id) => {
        const el = document.getElementById(id); if (el) el.value = m;
      });
      UI.toast(m === '0' ? 'تم ضبط الطباعة على بكامل الصفحة بدون حواف ✓' : 'تم ضبط الهوامش على 10مم ✓', 'success');
    },
    _collectPrintUI: _collectPrint,
    savePrint() {
      const p = _collectPrint();
      Store.setSetting('printSettings', p);
      const th = document.getElementById('st-theme');
      if (th) Store.setSetting('printTheme', th.value);
      Store.setSetting('thermalWidth', parseFloat(document.getElementById('st-thermal').value) || 80);
      Store.setSetting('printHeader', document.getElementById('st-header').checked);
      Store.setSetting('printWatermark', document.getElementById('st-watermark').checked);
      Store.setSetting('printZebra', document.getElementById('st-zebra').checked);
      Store.flush();
      if (window.PrintSettingsEngine) PrintSettingsEngine.reload();
      Audit.log('تعديل', 'تحديث إعدادات الطباعة');
      UI.toast('تم حفظ إعدادات الطباعة — ستطبق على كل المستندات وPDF ✓', 'success');
      Actions.call('set', 'psPreview', {});
    },
    psPreview() {
      const box = document.getElementById('psLivePreview');
      if (!box || !window.PrintSettingsPro) return;
      const p = _collectPrint();
      const zoom = (parseFloat(p.fontSize) || 11) / 11;
      const rows = [['1', 'أحمد محمد صالح', '95', 'ممتاز'], ['2', 'سمير عبدالله قاسم', '82', 'جيد جداً']];
      box.innerHTML = `
        <div style="zoom:${zoom.toFixed(3)}">
          <div style="text-align:center;font-weight:900;font-size:15pt;color:#0b3d91;padding:4px 0 10px;border-bottom:3px double #0b3d91;margin-bottom:10px">
            ${(Store.getSetting('schoolName') || 'المدرسة الدولية الخاصة')}
            <div style="font-size:10pt;color:#445;font-weight:700">نموذج معاينة الطباعة — ${p.paperSize === 'Custom' ? 'مخصصة' : p.paperSize} ${p.orientation === 'landscape' ? '↔ أفقي' : '↕ عمودي'}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-family:'${p.fontFamily}'">
            <thead><tr>${['#', 'الاسم', 'الدرجة', 'التقدير'].map((h) => `<th style="background:#e8eff9;border:1px solid #9db1c9;padding:6px;border:none;color:#111">${h}</th>`).join('')}</tr></thead>
            <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #9db1c9;padding:6px;text-align:center;color:#111">${c}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
          <div style="margin-top:10px;border-top:1.5px solid #9db1c9;padding-top:6px;font-size:9pt;color:#556;display:flex;justify-content:space-between"><span>مدير المدرسة: ..........</span><span>جميع الحقوق محفوظة لشركة YCMS</span></div>
        </div>`;
    },
    async testPrint() {
      this.savePrint();
      const rows = [['الصف الأول أ', 'رياضيات', '95', 'ممتاز'], ['الصف الثاني ب', 'علوم', '82', 'جيد جداً']];
      const html = ReportIntl.genericTableHTML('نموذج تجربة الطباعة — ' + (Store.getSetting('schoolName') || ''), ['الصف', 'المادة', 'الدرجة', 'التقدير'], rows, '');
      UI.toast('جارٍ تحضير الطباعة التجريبية…', 'info');
      await PrintSettingsEngine.print(html, { title: 'طباعة تجريبية' });
    },

    /* --- المظهر (تطبيق فوري) --- */
    accent(ds) { ThemeApply.save({ accent: ds.a }); P.render(document.getElementById('page-root')); UI.toast(`تم تطبيق الثيم ✓`, 'success'); },
    resetUI() {
      Store.setSetting('themeUI', JSON.parse(JSON.stringify(Config.THEME_DEFAULTS)));
      ThemeApply.apply();
      P.render(document.getElementById('page-root'));
      UI.toast('استُعيدت الإعدادات الافتراضية ✓', 'success');
    },

    /* --- المستخدمون --- */
    async addUser() {
      const d = await UI.form('➕ مستخدم جديد', [
        { name: 'name', label: 'الاسم', req: true },
        { name: 'username', label: 'اسم المستخدم (إنجليزي)', req: true },
        { name: 'role', label: 'الدور والصلاحيات', type: 'select', req: true, options: Object.entries(Config.ROLES).map(([k, v]) => ({ v: k, t: `${v.ico} ${v.label}` })) },
        { name: 'password', label: 'كلمة المرور (6+ أحرف)', type: 'password', req: true }
      ]);
      if (!d) return;
      const r = await AuthGuard.addUser(d);
      if (!r.ok) return UI.toast(r.msg, 'error');
      UI.toast('تمت إضافة المستخدم ✓', 'success');
      P.render(document.getElementById('page-root'));
    },
    async resetPw(ds) {
      const d = await UI.form('🔑 إعادة تعيين كلمة المرور', [
        { name: 'pw', label: 'كلمة المرور الجديدة', type: 'password', req: true }
      ]);
      if (!d) return;
      const r = await AuthGuard.resetPassword(ds.id, d.pw);
      UI.toast(r.ok ? 'تمت إعادة التعيين ✓' : r.msg, r.ok ? 'success' : 'error');
    },
    async delUser(ds) {
      if (!await UI.confirm({ title: 'حذف مستخدم', okLabel: 'حذف', danger: true })) return;
      AuthGuard.delUser(ds.id);
      P.render(document.getElementById('page-root'));
    },
    async changePw() {
      const old = document.getElementById('pw-old').value;
      const nw = document.getElementById('pw-new').value;
      const r = await AuthGuard.changePassword(old, nw);
      UI.toast(r.ok ? 'تم تغيير كلمة المرور ✓' : r.msg, r.ok ? 'success' : 'error');
      if (r.ok) P.render(document.getElementById('page-root'));
    }
  });

  /* تغييرات المظهر الحية (منزلقات + مفتاح ليلي + كثافة) */
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-ui]');
    if (!el) return;
    const k = el.dataset.ui;
    if (el.type === 'checkbox') ThemeApply.save({ [k]: el.checked });
    else if (el.type === 'range') {
      ThemeApply.save({ [k]: parseFloat(el.value) });
      const lbl = document.querySelector(`[data-ui-val="${k}"]`);
      if (lbl) lbl.textContent = el.value + 'px';
    } else ThemeApply.save({ [k]: el.value });
    saveDeb();
  });

  /* منزلقات إعدادات الطباعة (تحديث القيمة + المعاينة) + تبديل الصفحة المخصصة */
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-ps-range]');
    if (!el) return;
    const lbl = document.getElementById(el.id + 'Val');
    if (lbl) lbl.textContent = el.value;
    if (el.id === 'psFontSize') {
      const v = document.getElementById('psFontSizeVal');
      if (v) v.textContent = el.value;
    }
    try { Actions.call('set', 'psPreview', {}); } catch (e2) {}
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('#psPaperSize');
    if (!el) return;
    const row = document.getElementById('psCustomSizeRow');
    if (row) row.style.display = el.value === 'Custom' ? 'grid' : 'none';
  });

  window.Pages = window.Pages || {};
  Pages['settings-branding'] = P;
})();

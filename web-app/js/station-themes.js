/* =========================================================
   station-themes.js — نظام الثيمات والمظهر — نسخة تطبيق المحطة بالضبط
   (themes-enhanced + App._applyTheme + _updateSystemBars)
   + إضافة: حجم الخط العام للتطبيق (تكبير/تصغير المحتوى)
   تعمل مع بيانات المدرسة وتعرض داخل صفحة «الثيمات والمظهر»
   ========================================================= */
'use strict';

(function () {
  if (window.__SchoolThemePro) return;
  window.__SchoolThemePro = true;

  /* ---------- توافق الإشعارات مع واجهة المدرسة ---------- */
  if (typeof window.Notify === 'undefined') {
    window.Notify = {
      toast(m, t) { try { UI.toast(m, t === 'ok' ? 'success' : t === 'err' ? 'error' : 'info'); } catch (e) { console.log(m); } }
    };
  }
  if (typeof window.Dialog === 'undefined') {
    window.Dialog = {
      async show(title, msg) { try { return await UI.confirm({ title, msg }); } catch (e) { return window.confirm(msg); } }
    };
  }

  const ThemePro = {};

  /* ==================== الثيمات الجاهزة (المحطة) ==================== */
  ThemePro.presets = function () {
    return {
      dark:   { name: 'ليلي', icon: '🌙', desc: 'الوضع الافتراضي — خط أبيض', mode: 'dark',
        topBarColor: '#071428', topBarTextColor: '#e8f0fe', bottomBarColor: '#071428', bottomBarTextColor: '#8da4bf', sidebarColor: '#071428', sidebarTextColor: '#8da4bf', mainBgColor: '#030b1a' },
      light:  { name: 'نهاري', icon: '☀️', desc: 'وضع النهار — خط أسود', mode: 'light',
        topBarColor: '#ffffff', topBarTextColor: '#1e293b', bottomBarColor: '#ffffff', bottomBarTextColor: '#475569', sidebarColor: '#ffffff', sidebarTextColor: '#475569', mainBgColor: '#f0f4f8' },
      amoled: { name: 'AMOLED', icon: '⚫', desc: 'شاشة سوداء — توفير البطارية', mode: 'amoled',
        topBarColor: '#000000', topBarTextColor: '#f0f0f0', bottomBarColor: '#000000', bottomBarTextColor: '#999999', sidebarColor: '#000000', sidebarTextColor: '#999999', mainBgColor: '#000000' },
      spring: { name: 'ربيعي', icon: '🌱', desc: 'أخضر طبيعي منعش', mode: 'spring',
        topBarColor: '#ffffff', topBarTextColor: '#14532d', bottomBarColor: '#ffffff', bottomBarTextColor: '#166534', sidebarColor: '#ffffff', sidebarTextColor: '#166534', mainBgColor: '#f0fdf4' },
      summer: { name: 'صيفي', icon: '☀️', desc: 'دافئ ذهبي', mode: 'summer',
        topBarColor: '#ffffff', topBarTextColor: '#78350f', bottomBarColor: '#ffffff', bottomBarTextColor: '#92400e', sidebarColor: '#ffffff', sidebarTextColor: '#92400e', mainBgColor: '#fffbeb' },
      autumn: { name: 'خريفي', icon: '🍂', desc: 'بني دافئ أنيق', mode: 'autumn',
        topBarColor: '#2a1a0e', topBarTextColor: '#fde68a', bottomBarColor: '#2a1a0e', bottomBarTextColor: '#d4a06a', sidebarColor: '#2a1a0e', sidebarTextColor: '#d4a06a', mainBgColor: '#1a0f07' },
      winter: { name: 'شتوي', icon: '❄️', desc: 'أزرق بارد هادئ', mode: 'winter',
        topBarColor: '#0f2035', topBarTextColor: '#e0f2fe', bottomBarColor: '#0f2035', bottomBarTextColor: '#93c5fd', sidebarColor: '#0f2035', sidebarTextColor: '#93c5fd', mainBgColor: '#0c1929' },
      royal:  { name: 'أزرق ملكي', icon: '👑', desc: 'لون مميز فاخر', mode: 'dark',
        topBarColor: '#1a237e', topBarTextColor: '#ffffff', bottomBarColor: '#0d1b5e', bottomBarTextColor: '#bbdefb', sidebarColor: '#1a237e', sidebarTextColor: '#bbdefb', mainBgColor: '#0a0e3d' },
      nature: { name: 'أخضر طبيعي', icon: '🌿', desc: 'لون مريح للعين', mode: 'dark',
        topBarColor: '#1b5e20', topBarTextColor: '#e8f5e9', bottomBarColor: '#0d3a14', bottomBarTextColor: '#a5d6a7', sidebarColor: '#1b5e20', sidebarTextColor: '#a5d6a7', mainBgColor: '#0a2912' },
      purple: { name: 'بنفسجي ملكي', icon: '💜', desc: 'لون أنيق وفخم', mode: 'dark',
        topBarColor: '#4a148c', topBarTextColor: '#f3e5f5', bottomBarColor: '#311b92', bottomBarTextColor: '#ce93d8', sidebarColor: '#4a148c', sidebarTextColor: '#ce93d8', mainBgColor: '#1a0a40' }
    };
  };

  const MODE_COLORS = {
    light:  { topBarColor: '#ffffff', topBarTextColor: '#1e293b', bottomBarColor: '#ffffff', bottomBarTextColor: '#475569', sidebarColor: '#ffffff', sidebarTextColor: '#475569', mainBgColor: '#f0f4f8' },
    amoled: { topBarColor: '#000000', topBarTextColor: '#f0f0f0', bottomBarColor: '#000000', bottomBarTextColor: '#999999', sidebarColor: '#000000', sidebarTextColor: '#999999', mainBgColor: '#000000' },
    dark:   { topBarColor: '#071428', topBarTextColor: '#e8f0fe', bottomBarColor: '#071428', bottomBarTextColor: '#8da4bf', sidebarColor: '#071428', sidebarTextColor: '#8da4bf', mainBgColor: '#030b1a' },
    spring: { topBarColor: '#ffffff', topBarTextColor: '#14532d', bottomBarColor: '#ffffff', bottomBarTextColor: '#166534', sidebarColor: '#ffffff', sidebarTextColor: '#166534', mainBgColor: '#f0fdf4' },
    summer: { topBarColor: '#ffffff', topBarTextColor: '#78350f', bottomBarColor: '#ffffff', bottomBarTextColor: '#92400e', sidebarColor: '#ffffff', sidebarTextColor: '#92400e', mainBgColor: '#fffbeb' },
    autumn: { topBarColor: '#2a1a0e', topBarTextColor: '#fde68a', bottomBarColor: '#2a1a0e', bottomBarTextColor: '#d4a06a', sidebarColor: '#2a1a0e', sidebarTextColor: '#d4a06a', mainBgColor: '#1a0f07' },
    winter: { topBarColor: '#0f2035', topBarTextColor: '#e0f2fe', bottomBarColor: '#0f2035', bottomBarTextColor: '#93c5fd', sidebarColor: '#0f2035', sidebarTextColor: '#93c5fd', mainBgColor: '#0c1929' }
  };

  /* ==================== تطبيق الثيم — نفس منطق المحطة ==================== */
  ThemePro.apply = function () {
    const t = (Store.settings().theme) || {};
    const root = document.documentElement;
    const mode = t.mode || 'dark';
    const validThemes = ['dark', 'light', 'amoled', 'spring', 'summer', 'autumn', 'winter'];
    root.setAttribute('data-theme', validThemes.includes(mode) ? mode : 'dark');

    const topBarBg = document.querySelector('.topbar-bg-effect');
    const bottomBarBg = document.querySelector('.bottom-bar-bg');
    const sidebar = document.getElementById('sidebar');
    const glassOn = t.glassEnabled !== false;
    const glassAlpha = Math.min(1, Math.max(.15, parseFloat(t.glassOpacity) || .85));
    const glassBlur = Math.min(40, Math.max(0, parseInt(t.glassBlur, 10) || 24));

    root.style.setProperty('--glass-blur', glassBlur + 'px', 'important');
    root.style.setProperty('--glass-alpha', String(glassAlpha), 'important');
    root.style.setProperty('--topbar-h', (parseInt(t.topbarHeight, 10) || 58) + 'px');
    root.style.setProperty('--bottombar-h', (parseInt(t.bottombarHeight, 10) || 68) + 'px');
    root.style.setProperty('--sidebar-w', (parseInt(t.sidebarWidth, 10) || 290) + 'px');

    const barCol = (hex) => {
      if (!glassOn) return hex;
      try {
        const h = String(hex || '').replace('#', '');
        if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
        const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${glassAlpha})`;
      } catch (_) { return hex; }
    };

    if (t.topBarColor) {
      root.style.setProperty('--topbar-bg', barCol(t.topBarColor), 'important');
      if (topBarBg) topBarBg.style.setProperty('background', barCol(t.topBarColor), 'important');
      const topBar = document.querySelector('.top-bar');
      if (topBar) topBar.style.setProperty('background-color', barCol(t.topBarColor), 'important');
    } else {
      root.style.removeProperty('--topbar-bg');
      if (topBarBg) topBarBg.style.removeProperty('background');
      const topBar = document.querySelector('.top-bar');
      if (topBar) topBar.style.removeProperty('background-color');
    }
    if (t.bottomBarColor) {
      root.style.setProperty('--bottombar-bg', barCol(t.bottomBarColor), 'important');
      if (bottomBarBg) bottomBarBg.style.setProperty('background', barCol(t.bottomBarColor), 'important');
      const bottomBar = document.querySelector('.bottom-bar');
      if (bottomBar) bottomBar.style.setProperty('background-color', barCol(t.bottomBarColor), 'important');
    } else {
      root.style.removeProperty('--bottombar-bg');
      if (bottomBarBg) bottomBarBg.style.removeProperty('background');
      const bottomBar = document.querySelector('.bottom-bar');
      if (bottomBar) bottomBar.style.removeProperty('background-color');
    }
    if (t.sidebarColor && sidebar) {
      if (glassOn) {
        const c = t.sidebarColor, h = String(c).replace('#', '');
        let rgba = 'rgba(7,20,40,' + glassAlpha + ')';
        if (/^[0-9a-fA-F]{6}$/.test(h)) {
          const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
          rgba = `rgba(${r},${g},${b},${glassAlpha})`;
        }
        sidebar.style.setProperty('background', rgba, 'important');
      } else sidebar.style.setProperty('background', t.sidebarColor, 'important');
    } else if (sidebar) sidebar.style.removeProperty('background');

    if (t.mainBgColor) {
      root.style.setProperty('--bg-1', t.mainBgColor, 'important');
      document.body.style.setProperty('background', t.mainBgColor, 'important');
      const mainArea = document.getElementById('mainArea');
      if (mainArea) mainArea.style.setProperty('background', 'transparent', 'important');
    } else {
      root.style.removeProperty('--bg-1');
      document.body.style.removeProperty('background');
      const mainArea = document.getElementById('mainArea');
      if (mainArea) mainArea.style.removeProperty('background');
    }

    /* أحجام الخطوط والأيقونات — كما في المحطة */
    const topFontSize = (t.topBarFontSize || 14) + 'px';
    const bottomFontSize = (t.bottomBarFontSize || 10) + 'px';
    const sideFontSize = (t.sidebarFontSize || 14) + 'px';
    root.style.setProperty('--top-font', topFontSize, 'important');
    root.style.setProperty('--bottom-font', bottomFontSize, 'important');
    root.style.setProperty('--side-font', sideFontSize, 'important');

    const topIconSize = (t.topBarIconSize || 22) + 'px';
    const bottomIconSize = (t.bottomBarIconSize || 28) + 'px';
    const sideIconSize = (t.sidebarIconSize || 22) + 'px';
    const contentIconSize = (t.contentIconSize || 32) + 'px';
    root.style.setProperty('--top-icon', topIconSize, 'important');
    root.style.setProperty('--bottom-icon', bottomIconSize, 'important');
    root.style.setProperty('--side-icon', sideIconSize, 'important');
    root.style.setProperty('--content-icon', contentIconSize, 'important');

    /* حجم الخط العام للتطبيق (تكبير/تصغير المحتوى) */
    const zoom = Math.min(1.45, Math.max(.8, parseFloat(t.appFontSize) || 1));
    root.style.setProperty('--app-zoom', String(zoom));

    /* ألوان نصوص الأشرطة المخصصة */
    const topText = t.topBarTextColor, sideText = t.sidebarTextColor, bottomText = t.bottomBarTextColor;
    if (topText) root.style.setProperty('--top-text', topText, 'important'); else root.style.removeProperty('--top-text');
    if (sideText) root.style.setProperty('--side-text', sideText, 'important'); else root.style.removeProperty('--side-text');
    if (bottomText) root.style.setProperty('--bottom-text', bottomText, 'important'); else root.style.removeProperty('--bottom-text');

    /* ألوان الأسطوانة المخصصة */
    if (t.cylinderBg) {
      root.style.setProperty('--cyl-c1', t.cylinderBg, 'important');
      root.style.setProperty('--cyl-c2', t.cylinderBg, 'important');
      root.style.setProperty('--cyl-c3', t.cylinderBg, 'important');
    } else {
      root.style.removeProperty('--cyl-c1');
      root.style.removeProperty('--cyl-c2');
      root.style.removeProperty('--cyl-c3');
    }
    if (t.cylinderText) root.style.setProperty('--cyl-text', t.cylinderText, 'important'); else root.style.removeProperty('--cyl-text');

    /* مقاسات الأسطوانة */
    if (t.cylinderWidth) root.style.setProperty('--cyl-width', t.cylinderWidth + '%', 'important'); else root.style.removeProperty('--cyl-width');
    if (t.cylinderHeight) root.style.setProperty('--cyl-height', t.cylinderHeight + '%', 'important'); else root.style.removeProperty('--cyl-height');
    if (t.cylinderFontSize) root.style.setProperty('--cyl-font', t.cylinderFontSize + 'px', 'important'); else root.style.removeProperty('--cyl-font');

    /* تطبيق مباشر على العناصر (كما تفعل المحطة) */
    document.querySelectorAll('.topbar-btn svg').forEach((el) => { el.style.width = topIconSize; el.style.height = topIconSize; });
    document.querySelectorAll('.sidebar-icon-3d').forEach((el) => {
      el.style.width = sideIconSize; el.style.height = sideIconSize;
      el.style.minWidth = sideIconSize; el.style.minHeight = sideIconSize;
    });
    document.querySelectorAll('.sidebar-link').forEach((el) => { el.style.fontSize = sideFontSize; });
    document.querySelectorAll('.sidebar-brand-name').forEach((el) => { el.style.fontSize = `calc(${sideFontSize} + 2px)`; });
    document.querySelectorAll('.bottom-tab span').forEach((el) => { el.style.fontSize = bottomFontSize; });
    document.querySelectorAll('.bottom-tab-icon img').forEach((el) => {
      const s = `calc(${bottomIconSize} + 10px)`;
      el.style.width = s; el.style.height = s;
    });

    this.updateSystemBars(mode);

    /* meta theme-color */
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = mode === 'light' ? '#ffffff' : (mode === 'amoled' ? '#000000' : (t.mainBgColor || '#030b1a'));
    } catch (e) {}
  };

  /* ---------- ألوان أشرطة النظام في الأندرويد (المحطة) ---------- */
  ThemePro.updateSystemBars = function (mode) {
    try {
      if (typeof AndroidBridge === 'undefined' || !AndroidBridge.setSystemBarColors) return;
      var statusColor, navColor, lightMode;
      if (mode === 'light') { statusColor = '#ffffff'; navColor = '#f5f5f5'; lightMode = 1; }
      else if (mode === 'amoled') { statusColor = '#000000'; navColor = '#000000'; lightMode = 0; }
      else { statusColor = '#030b1a'; navColor = '#071428'; lightMode = 0; }
      AndroidBridge.setSystemBarColors(statusColor, navColor, lightMode);
    } catch (e) { console.error('updateSystemBars error:', e); }
  };

  function themeObj() {
    const s = Store.settings();
    if (!s.theme) s.theme = {};
    return s.theme;
  }
  function persist() {
    try { Store.flush(); } catch (e) {}
  }

  /* ==================== صفحة الثيمات — نفس واجهة المحطة ==================== */
  ThemePro.render = function (root) {
    const t = Store.settings().theme || {};
    const currentMode = t.mode || 'dark';
    const currentPreset = t.preset || currentMode;
    const presets = ThemePro.presets();
    const _e = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const sec = (title, colors, ranges) => `
      <div class="card-3d">
        <div class="card-3d-head"><h3>🎨 ${_e(title)}</h3></div>
        ${colors.map(([k, l, v]) => `
          <div class="color-row" style="display:flex;align-items:center;gap:10px;padding:8px 10px">
            <input type="color" class="color-inp" value="${_e(v || '#071428')}" oninput="ThemePro._setProp('${k}',this.value)" style="width:50px;height:36px;border-radius:8px;border:none;cursor:pointer">
            <label style="flex:1;color:var(--text-2)">${_e(l)}</label>
            <button onclick="ThemePro._setProp('${k}','')" style="background:transparent;border:1px solid var(--border);color:var(--text-3);padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px">↺</button>
          </div>`).join('')}
        ${ranges.map(([k, l, v, min, max]) => `
          <div class="range-row" style="padding:8px 10px">
            <label style="display:block;color:var(--text-2);margin-bottom:6px">${_e(l)}: <span id="rv_${k}" style="color:var(--blue);font-weight:700">${_e(v)}</span>px</label>
            <input type="range" min="${min}" max="${max}" value="${v}" oninput="document.getElementById('rv_${k}').textContent=this.value;ThemePro._setProp('${k}',parseInt(this.value))" style="width:100%">
          </div>`).join('')}
      </div>`;

    root.innerHTML = `
      <div class="page">
        <div class="page-head">
          <h2 class="page-title-3d">
            <div class="title-icon-3d" style="background:linear-gradient(135deg,#ffeb3b,#ffc107)">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="22" height="22">
                <circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/>
                <circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
              </svg>
            </div>
            الثيمات والمظهر
          </h2>
        </div>

        <!-- الثيمات الجاهزة -->
        <div class="card-3d">
          <div class="card-3d-head"><h3>🎭 الثيمات الجاهزة</h3></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;padding:8px">
            ${Object.keys(presets).map((key) => {
              const p = presets[key];
              const active = currentPreset === key;
              return `<button onclick="ThemePro.applyPreset('${key}')"
                style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 10px;border-radius:14px;cursor:pointer;border:2px solid ${active ? 'var(--blue)' : 'var(--border)'};background:${active ? 'rgba(0,180,255,.12)' : 'var(--bg-3)'};color:var(--text-1);font-weight:700;transition:all .3s ease;box-shadow:${active ? '0 0 20px rgba(0,180,255,.2)' : 'none'}">
                <div style="display:flex;gap:4px;margin-bottom:4px">
                  <div style="width:18px;height:18px;border-radius:50%;background:${p.topBarColor};border:2px solid #fff3"></div>
                  <div style="width:18px;height:18px;border-radius:50%;background:${p.mainBgColor};border:2px solid #fff3"></div>
                  <div style="width:18px;height:18px;border-radius:50%;background:${p.sidebarColor};border:2px solid #fff3"></div>
                </div>
                <span style="font-size:32px">${p.icon}</span>
                <span style="font-size:13px">${_e(p.name)}</span>
                <span style="font-size:10px;color:var(--text-3);font-weight:400;text-align:center">${_e(p.desc)}</span>
                ${active ? '<span style="font-size:10px;color:var(--blue)">✓ نشط</span>' : ''}
              </button>`;
            }).join('')}
          </div>
        </div>

        <!-- الوضع الأساسي -->
        <div class="card-3d">
          <div class="card-3d-head"><h3>🌗 الوضع الأساسي</h3></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:8px">
            ${[['dark', '🌙', 'ليلي', 'var(--blue)', 'rgba(0,180,255,.1)'],
               ['light', '☀️', 'نهاري', 'var(--blue)', 'rgba(0,180,255,.1)'],
               ['amoled', '⚫', 'AMOLED', 'var(--blue)', 'rgba(0,180,255,.1)'],
               ['spring', '🌱', 'ربيعي', 'var(--green)', 'rgba(0,230,118,.1)'],
               ['summer', '🔥', 'صيفي', 'var(--amber)', 'rgba(255,193,7,.1)'],
               ['autumn', '🍂', 'خريفي', 'var(--orange)', 'rgba(255,145,0,.1)'],
               ['winter', '❄️', 'شتوي', 'var(--cyan)', 'rgba(0,229,255,.1)']].map(([m, ic, lbl, col, bg]) => `
              <button class="mode-btn ${currentMode === m ? 'active' : ''}" onclick="ThemePro.setMode('${m}')"
                style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 10px;border-radius:14px;border:2px solid ${currentMode === m ? col : 'var(--border)'};background:${currentMode === m ? bg : 'var(--bg-3)'};color:var(--text-1);cursor:pointer;font-weight:700">
                <span style="font-size:32px">${ic}</span><span>${lbl}</span>
              </button>`).join('')}
          </div>
        </div>

        ${sec('القائمة العلوية', [['topBarColor', 'لون الخلفية', t.topBarColor || '#071428'], ['topBarTextColor', 'لون الخط', t.topBarTextColor || '#ffffff']], [['topBarFontSize', 'حجم الخط', t.topBarFontSize || 14, 10, 22], ['topBarIconSize', 'حجم الأيقونات', t.topBarIconSize || 22, 14, 36]])}

        ${sec('القائمة السفلية', [['bottomBarColor', 'لون الخلفية', t.bottomBarColor || '#071428'], ['bottomBarTextColor', 'لون الخط', t.bottomBarTextColor || '#8da4bf']], [['bottomBarFontSize', 'حجم الخط', t.bottomBarFontSize || 10, 8, 18], ['bottomBarIconSize', 'حجم الأيقونات', t.bottomBarIconSize || 28, 16, 44]])}

        ${sec('القائمة الجانبية', [['sidebarColor', 'لون الخلفية', t.sidebarColor || '#071428'], ['sidebarTextColor', 'لون الخط', t.sidebarTextColor || '#8da4bf']], [['sidebarFontSize', 'حجم الخط', t.sidebarFontSize || 14, 10, 22], ['sidebarIconSize', 'حجم الأيقونات', t.sidebarIconSize || 22, 14, 36]])}

        <!-- أحجام القوائم -->
        <div class="card-3d">
          <div class="card-3d-head"><h3>📏 أحجام القوائم (تصغير وتكبير)</h3></div>
          ${[['topbarHeight', 'ارتفاع القائمة العلوية', t.topbarHeight || 58, 40, 90],
             ['bottombarHeight', 'ارتفاع القائمة السفلية', t.bottombarHeight || 68, 44, 110],
             ['sidebarWidth', 'عرض القائمة الجانبية', t.sidebarWidth || 290, 220, 420]].map(([k, l, v, min, max]) => `
            <div class="range-row" style="padding:8px 10px">
              <label style="display:block;color:var(--text-2);margin-bottom:6px">${_e(l)}: <span id="rv_${k}" style="color:var(--blue);font-weight:700">${_e(v)}</span>px</label>
              <input type="range" min="${min}" max="${max}" value="${v}" oninput="document.getElementById('rv_${k}').textContent=this.value;ThemePro._setProp('${k}',parseInt(this.value))" style="width:100%">
            </div>`).join('')}
          <div class="range-row" style="padding:8px 10px">
            <label style="display:block;color:var(--text-2);margin-bottom:6px">📚 الخط العام للتطبيق (كل الصفحات): <span id="rv_appFontSize" style="color:var(--blue);font-weight:700">${Math.round((parseFloat(t.appFontSize) || 1) * 100)}%</span></label>
            <input type="range" min="80" max="145" value="${Math.round((parseFloat(t.appFontSize) || 1) * 100)}" oninput="document.getElementById('rv_appFontSize').textContent=this.value + '%';ThemePro._setProp('appFontSize',parseInt(this.value)/100)" style="width:100%">
            <small style="color:var(--text-3);font-size:11px">100% = الحجم الطبيعي — أقل من 100 تصغير القوائم والمحتوى، وأكثر منه تكبيرهما</small>
          </div>
        </div>

        <!-- الزجاج والشفافية -->
        <div class="card-3d">
          <div class="card-3d-head"><h3>🧊 الزجاج والشفافية</h3></div>
          <div class="form-grp" style="display:flex;align-items:center;justify-content:space-between;padding:0 10px">
            <label>قوائم زجاجية شفافة</label>
            <label class="toggle-switch"><input type="checkbox" id="setGlassEnabled" ${t.glassEnabled !== false ? 'checked' : ''} onchange="ThemePro._setProp('glassEnabled', this.checked)"><span class="toggle-slider"></span></label>
          </div>
          <div class="range-row" style="padding:8px 10px">
            <label style="display:block;color:var(--text-2);margin-bottom:6px">درجة الشفافية: <span id="rv_glassOpacity" style="color:var(--blue);font-weight:700">${Math.round((t.glassOpacity || .85) * 100)}</span>%</label>
            <input type="range" min="15" max="100" value="${Math.round((t.glassOpacity || .85) * 100)}" oninput="document.getElementById('rv_glassOpacity').textContent=this.value + '%';ThemePro._setProp('glassOpacity', parseInt(this.value)/100)" style="width:100%">
          </div>
          <div class="range-row" style="padding:8px 10px">
            <label style="display:block;color:var(--text-2);margin-bottom:6px">الضبابية (Blur): <span id="rv_glassBlur" style="color:var(--blue);font-weight:700">${t.glassBlur != null ? t.glassBlur : 24}</span>px</label>
            <input type="range" min="0" max="40" value="${t.glassBlur != null ? t.glassBlur : 24}" oninput="document.getElementById('rv_glassBlur').textContent=this.value;ThemePro._setProp('glassBlur', parseInt(this.value))" style="width:100%">
          </div>
        </div>

        <!-- أسطوانة الإعلانات -->
        <div class="card-3d">
          <div class="card-3d-head"><h3>🧾 أسطوانة الإعلانات العلوية</h3></div>
          <div class="color-row" style="display:flex;align-items:center;gap:10px;padding:8px 10px">
            <input type="color" id="cylBgColor" value="${_e(t.cylinderBg || '#144272')}" oninput="ThemePro._setCylProp('cylinderBg', this.value)" style="width:50px;height:36px;border-radius:8px;border:none;cursor:pointer">
            <label style="flex:1;color:var(--text-2)">لون خلفية الأسطوانة</label>
            <button class="btn-secondary" style="padding:4px 10px;font-size:12px" onclick="ThemePro._setCylProp('cylinderBg', '')">تلقائي</button>
          </div>
          <div class="color-row" style="display:flex;align-items:center;gap:10px;padding:8px 10px">
            <input type="color" id="cylTextColor" value="${_e(t.cylinderText || '#ffffff')}" oninput="ThemePro._setCylProp('cylinderText', this.value)" style="width:50px;height:36px;border-radius:8px;border:none;cursor:pointer">
            <label style="flex:1;color:var(--text-2)">لون خط الأسطوانة</label>
            <button class="btn-secondary" style="padding:4px 10px;font-size:12px" onclick="ThemePro._setCylProp('cylinderText', '')">تلقائي</button>
          </div>
          <div class="range-row" style="padding:8px 10px">
            <label style="display:block;color:var(--text-2);margin-bottom:6px">سرعة الكتابة الماشية: <span id="rv_cylinderSpeed" style="color:var(--blue);font-weight:700">${t.cylinderSpeed != null ? t.cylinderSpeed : 26}</span> ثانية/دورة</label>
            <input type="range" min="5" max="60" value="${t.cylinderSpeed != null ? t.cylinderSpeed : 26}" oninput="document.getElementById('rv_cylinderSpeed').textContent=this.value;ThemePro._setProp('cylinderSpeed', parseInt(this.value))" style="width:100%">
          </div>
          <div class="range-row" style="padding:8px 10px">
            <label style="display:block;color:var(--text-2);margin-bottom:6px">طول الأسطوانة: <span id="rv_cylinderWidth" style="color:var(--blue);font-weight:700">${t.cylinderWidth != null ? t.cylinderWidth : 100}</span>%</label>
            <input type="range" min="30" max="100" value="${t.cylinderWidth != null ? t.cylinderWidth : 100}" oninput="document.getElementById('rv_cylinderWidth').textContent=this.value;ThemePro._setProp('cylinderWidth', parseInt(this.value))" style="width:100%">
          </div>
          <div class="range-row" style="padding:8px 10px">
            <label style="display:block;color:var(--text-2);margin-bottom:6px">ارتفاع الأسطوانة: <span id="rv_cylinderHeight" style="color:var(--blue);font-weight:700">${t.cylinderHeight != null ? t.cylinderHeight : 74}</span>%</label>
            <input type="range" min="40" max="100" value="${t.cylinderHeight != null ? t.cylinderHeight : 74}" oninput="document.getElementById('rv_cylinderHeight').textContent=this.value;ThemePro._setProp('cylinderHeight', parseInt(this.value))" style="width:100%">
          </div>
          <div class="range-row" style="padding:8px 10px">
            <label style="display:block;color:var(--text-2);margin-bottom:6px">حجم خط الأسطوانة: <span id="rv_cylinderFontSize" style="color:var(--blue);font-weight:700">${t.cylinderFontSize != null ? t.cylinderFontSize : 12.5}</span>px</label>
            <input type="range" min="10" max="20" step="0.5" value="${t.cylinderFontSize != null ? t.cylinderFontSize : 12.5}" oninput="document.getElementById('rv_cylinderFontSize').textContent=this.value;ThemePro._setProp('cylinderFontSize', parseFloat(this.value))" style="width:100%">
          </div>
          <div style="padding:4px 10px;font-size:11px;color:var(--text-3)">السرعة الأقل = حركة أسرع. اترك الألوان «تلقائي» لتتبع الثيم الحالي.</div>
        </div>

        <!-- الخلفية الرئيسية -->
        <div class="card-3d">
          <div class="card-3d-head"><h3>🎨 الخلفية الرئيسية والأيقونات</h3></div>
          <div class="color-row" style="display:flex;align-items:center;gap:10px;padding:8px 10px">
            <input type="color" class="color-inp" value="${_e(t.mainBgColor || '#030b1a')}" oninput="ThemePro._setProp('mainBgColor',this.value)" style="width:50px;height:36px;border-radius:8px;border:none;cursor:pointer">
            <label style="flex:1;color:var(--text-2)">لون الخلفية الرئيسية</label>
            <code style="font-size:11px;color:var(--text-3);background:var(--bg-3);padding:2px 6px;border-radius:4px">${_e(t.mainBgColor || '#030b1a')}</code>
          </div>
          <div class="range-row" style="padding:8px 10px">
            <label style="display:block;color:var(--text-2);margin-bottom:6px">حجم أيقونات المحتوى: <span id="rv_contentIconSize" style="color:var(--blue);font-weight:700">${_e(t.contentIconSize || 32)}</span>px</label>
            <input type="range" min="20" max="56" value="${t.contentIconSize || 32}" oninput="document.getElementById('rv_contentIconSize').textContent=this.value;ThemePro._setProp('contentIconSize',parseInt(this.value))" style="width:100%">
          </div>
        </div>

        <!-- إجراءات -->
        <div class="card-3d">
          <div class="card-3d-head"><h3>⚙️ إجراءات سريعة</h3></div>
          <div style="padding:12px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-secondary" onclick="ThemePro.exportTheme()">📤 تصدير الثيم</button>
            <button class="btn-secondary" onclick="ThemePro.importTheme()">📥 استيراد ثيم</button>
            <button class="btn-secondary" onclick="ThemePro.resetTheme()">🔄 إعادة التعيين</button>
          </div>
        </div>
      </div>`;
  };

  /* ==================== أفعال الثيمات ==================== */
  ThemePro.applyPreset = function (presetKey) {
    const p = ThemePro.presets()[presetKey];
    if (!p) return;
    const t = themeObj();
    Object.assign(t, p, { preset: presetKey });
    persist();
    ThemePro.apply();
    Router.refresh();
    Notify.toast(`تم تطبيق ثيم "${p.name}" ✓`, 'ok');
  };

  ThemePro.setMode = function (mode) {
    const t = themeObj();
    t.mode = mode;
    t.preset = mode;
    Object.assign(t, MODE_COLORS[mode] || MODE_COLORS.dark);
    persist();
    ThemePro.apply();
    Router.refresh();
    Notify.toast('تم تطبيق الوضع على النظام كاملاً ✓', 'ok');
  };

  ThemePro._setProp = function (key, val) {
    const t = themeObj();
    t[key] = val;
    if (['topBarColor', 'topBarTextColor', 'sidebarColor', 'sidebarTextColor', 'bottomBarColor', 'bottomBarTextColor', 'mainBgColor'].includes(key)) t.preset = 'custom';
    persist();
    ThemePro.apply();
  };

  ThemePro._setCylProp = function (key, val) {
    const t = themeObj();
    if (val === '' || val == null) delete t[key]; else t[key] = val;
    persist();
    ThemePro.apply();
    if (window.StationCylinder) StationCylinder.build();
  };

  ThemePro.resetTheme = async function () {
    if (!await Dialog.show('🔄 إعادة تعيين', 'هل تريد العودة إلى الوضع الافتراضي؟')) return;
    const t = themeObj();
    Object.keys(t).forEach((k) => delete t[k]);
    t.mode = 'dark';
    persist();
    ThemePro.apply();
    Router.refresh();
    Notify.toast('تم إعادة التعيين ✓', 'ok');
  };

  ThemePro.exportTheme = function () {
    const data = JSON.stringify(Store.settings().theme || {}, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edupro_theme_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    Notify.toast('تم تصدير الثيم ✓', 'ok');
  };

  ThemePro.importTheme = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const theme = JSON.parse(ev.target.result);
          const t = themeObj();
          Object.assign(t, theme);
          persist();
          ThemePro.apply();
          Router.refresh();
          Notify.toast('تم الاستيراد ✓', 'ok');
        } catch (err) {
          Notify.toast('ملف غير صالح', 'err');
        }
      };
      reader.readAsText(f);
    };
    input.click();
  };

  window.ThemePro = ThemePro;

  /* صفحة الثيمات ضمن نظام الصفحات */
  window.Pages = window.Pages || {};
  Pages.themes = {
    render(root) { ThemePro.render(root); }
  };

  /* تطبيق فوري عند توفر المتجر (بعد الإقلاع يستدعيها app.js أيضاً) */
  let tries = 0;
  const bootApply = setInterval(() => {
    tries++;
    try {
      if (typeof Store !== 'undefined' && Store.ready) {
        ThemePro.apply();
        clearInterval(bootApply);
      }
    } catch (e) {}
    if (tries > 40) clearInterval(bootApply);
  }, 250);
})();

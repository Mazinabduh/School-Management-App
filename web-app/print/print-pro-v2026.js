/* =========================================================
   print-pro-v2026.js — محرك الطباعة المؤسسي — نظام تطبيق المحطة بالنص
   (PrintProV2026 من محرك المحطة v2026.87 — نفس البنية والألوان والأصناف pp-*)
   الفرق الوحيد: محتوى المدرسة (طلاب/أقساط/درجات/رواتب) بدل محتوى المحطة
   كل الطباعة تمر عبر قناة ReliablePrint الموثوقة نفسها
   ========================================================= */
'use strict';

(function () {
  if (window.__PrintProSchool) return;
  window.__PrintProSchool = true;

  /* ==================== أدوات مساعدة — نفس المحطة ==================== */
  function _e(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _money(n, decimals) {
    var d = decimals == null ? 2 : decimals;
    var num = parseFloat(n) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function _num(n) {
    var num = parseFloat(n) || 0;
    return num.toLocaleString('en-US');
  }
  function _date(d) {
    try {
      var date = d instanceof Date ? d : new Date(d);
      if (!date || isNaN(date.getTime())) return '-';
      var dd = String(date.getDate()).padStart(2, '0');
      var mm = String(date.getMonth() + 1).padStart(2, '0');
      var yy = date.getFullYear();
      return dd + '/' + mm + '/' + yy;
    } catch (e) { return '-'; }
  }
  function _dateTime(d) {
    try {
      var date = d instanceof Date ? d : new Date(d);
      if (!date || isNaN(date.getTime())) return '-';
      return _date(date) + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    } catch (e) { return '-'; }
  }
  function _arTxt(s) { return _e(s); }

  function _settings() {
    if (typeof Store !== 'undefined' && Store.settings) try {
      return Store.settings() || {};
    } catch (e) {}
    return {};
  }
  /* إعدادات الطباعة — من محرك PrintSettingsPro (مطابق لمفاتيح المحطة) */
  function _printSettings() {
    var s = _settings();
    var ps = (s && s.printSettings) || {};
    if (window.PrintSettingsPro && PrintSettingsPro.getPS) try {
      ps = PrintSettingsPro.getPS() || {};
    } catch (e) {}
    var base = {
      paperSize: 'A4',
      customWidth: 210,
      customHeight: 297,
      orientation: 'portrait',
      marginTop: 8,
      marginRight: 8,
      marginBottom: 8,
      marginLeft: 8,
      fontFamily: 'Cairo',
      fontSize: 11,
      titleFontSize: 20,
      tableHeaderFontSize: 10,
      tableBodyFontSize: 10,
      footerFontSize: 9,
      subscriberInfoFontSize: 11,
      headerBg: '#1565c0',
      headerColor: '#ffffff',
      accentColor: '#1565c0',
      borderColor: '#bbdefb',
      rowEvenBg: '#e3f2fd',
      rowOddBg: '#ffffff',
      bodyColor: '#0a1628',
      footerBg: '#1565c0',
      footerColor: '#ffffff',
      showWatermark: true,
      showSignatures: true,
      showNotes: true,
      showLogo: true,
      customCSS: ''
    };
    return Object.assign(base, ps || {});
  }
  function _paperCSS(ps) {
    ps = ps || _printSettings();
    var sizes = { A4: [210, 297], A5: [148, 210], Letter: [216, 279], Thermal80: [80, 297], Thermal58: [58, 210] };
    var wh = ps.paperSize === 'Custom' ? [ps.customWidth || 210, ps.customHeight || 297] : sizes[ps.paperSize] || sizes.A4;
    var w = wh[0], h = wh[1];
    if (ps.orientation === 'landscape') { var tmp = w; w = h; h = tmp; }
    return '@page{size:' + w + 'mm ' + h + 'mm;margin:' + (ps.marginTop || 8) + 'mm ' + (ps.marginRight || 8) + 'mm ' + (ps.marginBottom || 8) + 'mm ' + (ps.marginLeft || 8) + 'mm}';
  }
  function _cur() {
    var s = _settings();
    return s.currency || 'ريال';
  }
  /* خط Cairo المحلي — نفس نظام المحطة */
  function _fontCSS() {
    var ps = _printSettings();
    var ff = ps.fontFamily || 'Cairo';
    var fontBase = 'fonts';
    var css = '<style>' +
      '@font-face{font-family:"Cairo";font-weight:400;font-style:normal;font-display:swap;src:url("' + fontBase + '/Cairo.ttf") format("truetype")}' +
      '@font-face{font-family:"Cairo";font-weight:700;font-style:normal;font-display:swap;src:url("' + fontBase + '/Cairo.ttf") format("truetype")}' +
      '@font-face{font-family:"Cairo";font-weight:900;font-style:normal;font-display:swap;src:url("' + fontBase + '/Cairo.ttf") format("truetype")}' +
      _paperCSS(ps) +
      '*{margin:0;padding:0;box-sizing:border-box}' +
      'html,body{background:#fff;color:' + (ps.bodyColor || '#0a1628') + ';font-family:"' + ff + '",Cairo,Tahoma,Arial,sans-serif;direction:rtl;text-align:right;letter-spacing:normal !important;word-spacing:normal !important}' +
      'bdi{unicode-bidi:plaintext;direction:rtl;letter-spacing:normal}' +
      '.pp-doc,.pp-report{font-family:"' + ff + '",Cairo,Tahoma,Arial,sans-serif!important;color:' + (ps.bodyColor || '#0a1628') + '!important;font-size:' + (ps.fontSize || 11) + 'pt!important}' +
      '.pp-header{background:' + (ps.headerBg || '#1565c0') + '!important;color:' + (ps.headerColor || '#fff') + '!important}' +
      '.pp-report-header{background:' + (ps.headerBg || '#1565c0') + '!important;color:' + (ps.headerColor || '#fff') + '!important}' +
      '.pp-station-name,.pp-report-title{font-size:' + (ps.titleFontSize || 20) + 'pt!important;text-align:right!important}' +
      '.pp-report-heading{display:flex;align-items:center;gap:12px;min-width:0}.pp-report-heading>div:last-child{min-width:0}' +
      '.pp-report-logo{width:58px;height:58px;flex:0 0 58px;background:#fff;border-radius:50%;padding:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 5px 14px rgba(0,0,0,.2)}.pp-report-logo img{width:100%;height:100%;object-fit:contain;border-radius:50%}' +
      '.pp-section-title,.pp-report-section-title,.pp-table th{background:' + (ps.accentColor || '#1565c0') + '!important;color:#fff!important;font-size:' + (ps.tableHeaderFontSize || 10) + 'pt!important}' +
      '.pp-table td{font-size:' + (ps.tableBodyFontSize || 10) + 'pt!important;border-color:' + (ps.borderColor || '#bbdefb') + '!important}' +
      '.pp-table tbody tr:nth-child(even),.pp-summary-row.alt,.pp-cell{background:' + (ps.rowEvenBg || '#e3f2fd') + '!important}' +
      '.pp-table tbody tr:nth-child(odd),.pp-summary-row{background:' + (ps.rowOddBg || '#fff') + '!important}' +
      '.pp-footer{background:' + (ps.footerBg || '#1565c0') + '!important;color:' + (ps.footerColor || '#fff') + '!important;font-size:' + (ps.footerFontSize || 9) + 'pt!important}' +
      '.pp-doc,.pp-report{position:relative!important;overflow:hidden!important}.pp-header,.pp-info-strip,.pp-body,.pp-footer,.pp-report-header,.pp-report-body{position:relative;z-index:1}.pp-logo-watermark{z-index:0!important}' +
      (ps.showWatermark === false ? '.pp-watermark,.pp-logo-watermark{display:none!important}' : '') +
      (ps.showSignatures === false ? '.pp-signatures{display:none!important}' : '') +
      (ps.showNotes === false ? '.pp-notes{display:none!important}' : '') +
      (ps.showLogo === false ? '.pp-logo-wrap,.pp-report-logo{display:none!important}' : '') +
      (ps.customCSS || '') +
      '</style>';
    return css;
  }

  /* ==================== الشعار والعلامة المائية — نفس المحطة ==================== */
  function _logoHTML(size) {
    var s = _settings();
    var logo = s.logo || 'assets/images/logo.png';
    var px = size || 76;
    if (logo) return '<img src="' + _e(logo) + '" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain" alt="شعار">';
    return '<span style="font-size:' + Math.round(px * 0.6) + 'px;line-height:1">🎓</span>';
  }
  function _watermarkLogoHTML(kind) {
    try {
      var s = _settings();
      if (s.showWatermark === false) return '';
      var logo = s.logo;
      if (!logo) return '';
      return '<div class="pp-logo-watermark" aria-hidden="true"><img src="' + _e(logo) + '" alt="" onerror="this.parentNode.style.display=\'none\'"></div>';
    } catch (e) { return ''; }
  }

  /* ==================== الترويسة والتذييل والتواقيع — نفس المحطة ==================== */
  function _header(docType, extraSideHTML) {
    var s = _settings();
    var station = _e(s.schoolName || 'المدرسة الدولية الخاصة');
    var subtitle = _e(s.schoolNameEn || 'EDUPRO SCHOOL MANAGEMENT');
    var phone = _e(s.phone || '');
    var address = _e(s.address || '');
    var year = _e(s.year || '');
    var sideLines = [];
    if (phone) sideLines.push('☎ <bdi>' + phone + '</bdi>');
    if (year) sideLines.push('📅 ' + year);
    if (address) sideLines.push('📍 ' + address);
    return '<div class="pp-header">' +
      '<div class="pp-logo-wrap">' + _logoHTML(76) + '</div>' +
      '<div class="pp-station-info">' +
      '<h1 class="pp-station-name">' + _arTxt(station) + '</h1>' +
      '<div class="pp-station-subtitle">' + subtitle + '</div>' +
      (docType ? '<div class="pp-station-doc-type">' + _arTxt(docType) + '</div>' : '') +
      '</div>' +
      '<div class="pp-header-side">' + sideLines.map(function (l) { return '<div>' + l + '</div>'; }).join('') + (extraSideHTML || '') + '</div>' +
      '</div>';
  }
  function _footer(customMsg) {
    var s = _settings();
    var msg = _e(customMsg || s.printFooter || 'شكراً لتعاملكم معنا');
    var name = _e(s.schoolName || 'المدرسة الدولية الخاصة');
    var now = _dateTime(new Date);
    return '<div class="pp-footer">' +
      '<div class="pp-footer-text">' + _arTxt(msg) + '</div>' +
      '<div class="pp-footer-small">' + _arTxt(name) + '</div>' +
      '<div class="pp-footer-print-info">' + _arTxt('طُبعت في: ') + '<bdi>' + now + '</bdi> &nbsp;•&nbsp; ' + _arTxt('تطبيق ادارة المدرسة EduPro') + '</div>' +
      '</div>';
  }
  function _signatures(items) {
    var arr = items || [
      { name: 'المستلم' },
      { name: 'محاسب المدرسة' },
      { name: 'مدير المدرسة' }
    ];
    return '<div class="pp-signatures">' + arr.map(function (s) {
      return '<div class="pp-sign">' +
        '<div class="pp-sign-line"></div>' +
        '<div class="pp-sign-name">' + _arTxt(s.name) + '</div>' +
        (s.title ? '<div style="font-size:8.5pt;margin-top:2px">' + _arTxt(s.title) + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /* ==================== ملاءمة الأعمدة تلقائياً — نفس المحطة ==================== */
  function _fitCols(columns, rows) {
    var ps = _printSettings();
    var pt = ps.tableBodyFontSize || 10;
    var pxPerUnit = pt * 1.35 * .56;
    var isNumLabel = function (t) {
      t = String(t || '').trim();
      return /مبلغ|قيمة|إجمالي|مجموع|متأخر|محص|نسبة|سعر|رصيد|مدين|دائن|ضريبة|كمية|عدد|درجة|معدل|الأساسي|البدلات|مكافأة|خصم|سلفة|الصافي|^#|^م$|تاريخ$/.test(t);
    };
    var tlen = function (cell) {
      if (cell == null) return 0;
      var s;
      if (typeof cell === 'object') s = cell.html != null ? cell.html : cell.label != null ? cell.label : cell.value != null ? cell.value : '';
      else s = String(cell);
      s = s.replace(/<[^>]*>/g, '');
      var n = 0;
      for (var i = 0; i < s.length; i++) n += s.charCodeAt(i) > 255 ? 1 : .58;
      return n;
    };
    var meta = (columns || []).map(function (c) {
      var label = typeof c === 'object' ? c.label || '' : String(c || '');
      var fixed = typeof c === 'object' && c.width ? c.width : null;
      return { label: label, fixed: fixed, num: isNumLabel(label) };
    });
    if (!meta.length) return [];
    var maxLen = meta.map(function (m) { return tlen(m.label); });
    (rows || []).forEach(function (r) {
      if (!Array.isArray(r)) return;
      r.forEach(function (cell, ci) {
        if (ci < meta.length) {
          var L = tlen(cell);
          if (L > maxLen[ci]) maxLen[ci] = L;
        }
      });
    });
    meta.forEach(function (m, ci) {
      if (m.num || m.fixed) return;
      var any = false, allNum = true;
      (rows || []).forEach(function (r) {
        if (!Array.isArray(r)) return;
        var cell = r[ci];
        if (cell == null || cell === '') return;
        any = true;
        var t = tlen2(cell);
        if (!/^[\d.,\s\-+%×]*$/.test(t)) allNum = false;
      });
      m.num = any && allNum;
    });
    return meta.map(function (m, ci) {
      if (m.fixed) return { th: 'width:' + m.fixed + ';white-space:nowrap', td: 'white-space:nowrap' };
      if (m.num) {
        var w = Math.max(9, Math.round(maxLen[ci] * pxPerUnit + 18));
        return { th: 'width:' + Math.min(w, 130) + 'px;white-space:nowrap', td: 'white-space:nowrap;text-align:center;direction:ltr;unicode-bidi:isolate' };
      }
      var px = Math.round(maxLen[ci] * pxPerUnit + 24);
      return { th: 'min-width:' + Math.max(40, Math.min(px, 260)) + 'px;white-space:nowrap;text-align:right', td: 'white-space:nowrap;text-align:right' };
    });
  }
  function tlen2(cell) {
    if (cell == null) return '';
    if (typeof cell === 'object') return String(cell.html != null ? cell.html : cell.label != null ? cell.label : '').replace(/<[^>]*>/g, '');
    return String(cell);
  }

  /* ==================== تقرير المؤسسة الموحد — نفس reportHTML بالمحطة ==================== */
  function reportHTML(opts) {
    opts = opts || {};
    var ps = _printSettings();
    var s = _settings();
    var headTitle = opts.title || 'تقرير';
    var subtitle = opts.subtitle || '';
    var headStation = s.schoolName || 'المدرسة الدولية الخاصة';
    var headSubtitle = s.schoolNameEn || 'EDUPRO SCHOOL MANAGEMENT';
    var headPhone = s.phone || '';
    var period = opts.period || '';
    var kpis = opts.kpis || [];
    var sections = opts.sections || [];
    var notes = opts.notes || '';
    var now = _dateTime(new Date);
    var showRepLogo = ps.showLogo !== false;
    var sideLines = [];
    if (headPhone) sideLines.push('☎ <bdi>' + _e(headPhone) + '</bdi>');
    if (period) sideLines.push('📅 ' + _arTxt(period));
    sideLines.push('🗓 <bdi>' + now + '</bdi>');
    return _fontCSS() +
      '<div class="pp-report" dir="rtl">' +
      _watermarkLogoHTML('report') +
      '<div class="pp-report-header">' +
      '<div class="pp-report-heading">' +
      (showRepLogo ? '<div class="pp-report-logo">' + _logoHTML(54) + '</div>' : '') +
      '<div>' +
      '<div class="pp-report-title">' + _arTxt(headTitle) + '</div>' +
      (subtitle ? '<div style="font-size:10pt;opacity:0.9">' + _arTxt(subtitle) + '</div>' : '') +
      '<div style="font-size:9pt;opacity:0.85">' + _e(headSubtitle) + '</div>' +
      '</div>' +
      '</div>' +
      '<div style="flex:1;text-align:center">' +
      '<div style="font-size:14pt;font-weight:800">' + _arTxt(headStation) + '</div>' +
      '<div style="font-size:9pt;opacity:0.85">' + _e(headSubtitle) + '</div>' +
      '</div>' +
      '<div class="pp-report-meta">' + sideLines.map(function (l) { return '<div>' + l + '</div>'; }).join('') + '</div>' +
      '</div>' +
      (kpis.length > 0
        ? '<div class="pp-report-summary">' + kpis.map(function (k) {
            return '<div class="pp-kpi">' +
              '<div class="pp-kpi-label">' + _arTxt(k.label || '') + '</div>' +
              '<div class="pp-kpi-value' + (k.cls ? ' ' + k.cls : '') + '"><bdi>' + (k.value != null ? _e(k.value) : '-') + '</bdi></div>' +
              (k.sub ? '<div class="pp-kpi-sub">' + _arTxt(k.sub) + '</div>' : '') +
              '</div>';
          }).join('') + '</div>'
        : '') +
      '<div class="pp-report-body">' +
      sections.map(function (sec) {
        var cols = sec.columns || [];
        var rows = sec.rows || [];
        var totals = sec.totals || null;
        var html = '<div class="pp-report-section">' +
          (sec.title ? '<div class="pp-report-section-title">' +
            '<span class="pp-report-section-title-bar"></span>' +
            (sec.icon ? '<span style="font-size:14pt">' + sec.icon + '</span>' : '') +
            _arTxt(sec.title) + '</div>' : '');
        if (sec.html) html += sec.html;
        else if (cols.length > 0) {
          var fit = _fitCols(cols, rows);
          html += '<table class="pp-table">' +
            '<thead><tr>' + cols.map(function (c, ci) {
              var f = fit[ci] || {};
              var w = typeof c === 'object' && c.width ? 'width:' + c.width + ';' : '';
              var st = ' style="' + w + (f.th || '') + '"';
              return '<th' + st + '>' + _arTxt(typeof c === 'string' ? c : c.label) + '</th>';
            }).join('') + '</tr></thead>' +
            '<tbody>' + (rows.length === 0
              ? '<tr><td colspan="' + cols.length + '" style="padding:20px;color:#90a4ae">' + _arTxt('لا توجد بيانات') + '</td></tr>'
              : rows.map(function (r) {
                  return '<tr>' + r.map(function (cell, ci) {
                    var f = fit[ci] || {};
                    if (cell && typeof cell === 'object' && cell.html != null) {
                      var styleAttr = cell.style ? ' style="' + (f.td ? f.td + ';' : '') + cell.style + '"' : f.td ? ' style="' + f.td + '"' : '';
                      var clsAttr = cell.cls ? ' class="' + cell.cls + '"' : '';
                      return '<td' + styleAttr + clsAttr + '>' + cell.html + '</td>';
                    }
                    var tds = f.td ? ' style="' + f.td + '"' : '';
                    return '<td' + tds + '>' + _e(cell == null ? '-' : cell) + '</td>';
                  }).join('') + '</tr>';
                }).join('')) + '</tbody>' +
            (totals ? '<tfoot><tr class="pp-total">' + totals.map(function (t, ci) {
              var f = fit[ci] || {};
              var tds = f.td ? ' style="' + f.td + '"' : '';
              return '<td' + tds + '>' + (t && t.html ? t.html : t == null ? '' : _e(t)) + '</td>';
            }).join('') + '</tr></tfoot>' : '') +
            '</table>';
        }
        html += '</div>';
        return html;
      }).join('') +
      (notes ? '<div class="pp-notes">' + '<div class="pp-notes-title">' + _arTxt('ملاحظات') + '</div>' + _arTxt(notes) + '</div>' : '') +
      '</div>' +
      _footer() +
      '</div>';
  }

  /* ==================== قوالب المدرسة — نفس هيكل قوالب المحطة ==================== */
  /* جدول عام — كل تقارير المركز */
  function genericTableHTML(title, headers, rows, foot) {
    var kpis = [];
    if (foot) kpis.push({ label: foot.split(':')[0] || 'الإجمالي', value: foot.split(':')[1] ? foot.split(':')[1].trim() : foot });
    return reportHTML({
      title: title,
      kpis: kpis,
      sections: [{ columns: headers, rows: rows }]
    });
  }

  /* شريط معلومات المستند — نفس pp-info-strip بالمحطة */
  function _infoStrip(cells) {
    return '<div class="pp-info-strip">' + cells.map(function (c) {
      return '<div class="pp-info-strip-cell">' +
        '<div class="pp-info-strip-label">' + _arTxt(c.k) + '</div>' +
        '<div class="pp-info-strip-value">' + c.v + '</div>' +
        '</div>';
    }).join('') + '</div>';
  }
  /* قسم + جدول — نفس pp-section بالمحطة */
  function _section(icon, title, tableHTML) {
    return '<div class="pp-section">' +
      '<div class="pp-section-title">' +
      '<span class="pp-section-title-icon">' + icon + '</span>' +
      _arTxt(title) +
      '</div>' + tableHTML + '</div>';
  }
  function _table(headers, rowsHTML, footHTML) {
    return '<table class="pp-table">' +
      '<thead><tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + rowsHTML + '</tbody>' +
      (footHTML ? '<tfoot>' + footHTML + '</tfoot>' : '') +
      '</table>';
  }
  /* صف ملخص — نفس pp-summary-row بالمحطة */
  function _summary(rows) {
    return '<div class="pp-summary">' + rows.map(function (r, i) {
      return '<div class="pp-summary-row' + (r.cls ? ' ' + r.cls : (i % 2 ? ' alt' : '')) + '">' +
        '<span class="pp-summary-label">' + _arTxt(r.k) + '</span>' +
        '<span class="pp-summary-value' + (r.vcls ? ' ' + r.vcls : '') + '">' + r.v + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* كشف حساب طالب — نفس هيكل «كشف حساب مشترك» بالمحطة */
  function statementHTML(d) {
    var student = d.student || {};
    var plan = d.plan || {};
    var payments = d.payments || [];
    var items = plan.items || [];
    var totalDue = 0, totalPaid = 0;
    items.forEach(function (i) { totalDue += parseFloat(i.amount) || 0; });
    payments.forEach(function (p) { totalPaid += parseFloat(p.amount) || 0; });
    var balance = totalDue - totalPaid;
    var cls = (typeof Store !== 'undefined' && Store.get('classes', student.classId) || {}).name || '-';

    var ledger = items.map(function (i) { return { date: i.due || student.created, desc: 'استحقاق: ' + (i.label || ''), debit: parseFloat(i.amount) || 0, credit: 0 }; })
      .concat(payments.map(function (p) { return { date: p.date, desc: 'سند قبض ' + (p.receiptNo || '') + ' (' + (p.method || 'نقداً') + ')', debit: 0, credit: parseFloat(p.amount) || 0 }; }))
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var run = 0;
    var rowsHTML = ledger.length ? ledger.map(function (l, i) {
      run += (l.debit || 0) - (l.credit || 0);
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td><bdi>' + _date(l.date) + '</bdi></td>' +
        '<td style="text-align:right">' + _arTxt(l.desc) + '</td>' +
        '<td class="num">' + (l.debit ? _money(l.debit, 0) : '—') + '</td>' +
        '<td class="num">' + (l.credit ? _money(l.credit, 0) : '—') + '</td>' +
        '<td class="num" style="font-weight:800"><bdi>' + _money(run, 0) + '</bdi></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6" style="padding:20px;color:#90a4ae">' + _arTxt('لا توجد معاملات') + '</td></tr>';

    var cur = _cur();
    return _fontCSS() +
      '<div class="pp-doc" dir="rtl">' +
      _watermarkLogoHTML('statement') +
      _header('كشف حساب طالب') +
      _infoStrip([
        { k: 'اسم الطالب', v: _arTxt(student.name || '-') },
        { k: 'رقم الطالب', v: '<bdi>' + _e(student.sid || '-') + '</bdi>' },
        { k: 'الصف', v: _arTxt(cls) },
        { k: 'تاريخ الكشف', v: '<bdi>' + _date(new Date) + '</bdi>' }
      ]) +
      '<div class="pp-body">' +
      '<div class="pp-report-summary" style="background:transparent;padding:0;border:0;margin-bottom:14px">' +
      '<div class="pp-kpi"><div class="pp-kpi-label">' + _arTxt('عدد البنود') + '</div><div class="pp-kpi-value">' + _num(items.length) + '</div></div>' +
      '<div class="pp-kpi"><div class="pp-kpi-label">' + _arTxt('إجمالي المستحق') + '</div><div class="pp-kpi-value"><bdi>' + _money(totalDue) + '</bdi></div><div class="pp-kpi-sub">' + _arTxt(cur) + '</div></div>' +
      '<div class="pp-kpi"><div class="pp-kpi-label">' + _arTxt('إجمالي المسدّد') + '</div><div class="pp-kpi-value pos"><bdi>' + _money(totalPaid) + '</bdi></div><div class="pp-kpi-sub">' + _arTxt(cur) + '</div></div>' +
      '<div class="pp-kpi"><div class="pp-kpi-label">' + _arTxt('الرصيد المستحق') + '</div><div class="pp-kpi-value ' + (balance > 0 ? 'neg' : 'pos') + '"><bdi>' + _money(balance) + '</bdi></div><div class="pp-kpi-sub">' + _arTxt(cur) + '</div></div>' +
      '</div>' +
      _section('📋', 'سجل الحركات', _table(
        ['<span style="width:32px">#</span>', 'التاريخ', 'البيان', 'مدين (مستحق)', 'دائن (مدفوع)', 'الرصيد'],
        rowsHTML
      )) +
      '</div>' +
      _signatures([{ name: 'ولي الأمر' }, { name: 'محاسب المدرسة' }, { name: 'مدير المدرسة' }]) +
      _footer() +
      '</div>';
  }

  /* سند قبض — نفس هيكل «إيصال سداد» بالمحطة */
  function receiptA4HTML(pay, student) {
    var s = _settings();
    var itemLabel = 'دفعة على الحساب';
    if (pay.itemId && typeof Store !== 'undefined') {
      var p = Store.find('feeplans', function (x) { return x.studentId === pay.studentId; });
      var it = p && (p.items || []).find(function (i) { return i.id === pay.itemId; });
      if (it) itemLabel = it.label;
    }
    var cur = _cur();
    var qr = '';
    try {
      if (window.QRCodeGen) qr = QRCodeGen.toDataURL('RECEIPT|' + pay.receiptNo + '|' + pay.amount + '|' + pay.date, { cellSize: 3, margin: 1 }) || '';
    } catch (e) {}
    var tafqit = '';
    try { tafqit = H.tafqitMoney(pay.amount); } catch (e) {}
    return _fontCSS() +
      '<div class="pp-doc" dir="rtl" style="max-width:600px">' +
      _watermarkLogoHTML('receipt') +
      _header('سند قبض رسمي', '') +
      _infoStrip([
        { k: 'رقم السند', v: '<bdi>' + _e(pay.receiptNo || '-') + '</bdi>' },
        { k: 'التاريخ', v: '<bdi>' + _date(pay.date) + '</bdi>' },
        { k: 'طريقة الدفع', v: _arTxt(pay.method || 'نقداً') }
      ]) +
      '<div class="pp-body">' +
      _section('👤', 'بيانات الطالب', '<div class="pp-grid-2">' +
        '<div class="pp-cell"><div class="pp-cell-label">' + _arTxt('اسم الطالب') + '</div><div class="pp-cell-value">' + _arTxt((student && student.name) || '-') + '</div></div>' +
        '<div class="pp-cell"><div class="pp-cell-label">' + _arTxt('رقم الطالب') + '</div><div class="pp-cell-value"><bdi>' + _e((student && student.sid) || '-') + '</bdi></div></div>' +
        '</div>') +
      _section('💰', 'تفاصيل السداد', _table(
        ['البيان', 'المبلغ'],
        '<tr><td>' + _arTxt(itemLabel) + '</td><td class="num"><bdi>' + _money(pay.amount) + ' ' + _arTxt(cur) + '</bdi></td></tr>' +
        '<tr><td style="font-weight:900">' + _arTxt('المبلغ كتابةً') + '</td><td style="font-weight:800">' + _arTxt(tafqit || '-') + '</td></tr>' +
        (pay.note ? '<tr><td>' + _arTxt('ملاحظات') + '</td><td>' + _arTxt(pay.note) + '</td></tr>' : '')
      )) +
      _summary([
        { k: 'المبلغ المستلم', v: '<bdi>' + _money(pay.amount) + ' ' + _arTxt(cur) + '</bdi>', vcls: 'pp-cell-pos' }
      ]) +
      '<div class="pp-status-wrap"><span class="pp-status paid"><span style="font-size:14pt">✓</span>' + _arTxt('تم استلام المبلغ') + '</span></div>' +
      '</div>' +
      (qr ? '<div class="pp-qr-block"><div class="pp-qr-card"><img src="' + qr + '" alt="QR Code"><div class="pp-qr-meta"><div>' + _arTxt('رقم السند: ') + '<strong><bdi>' + _e(pay.receiptNo || '') + '</bdi></strong></div><div>' + _arTxt('المبلغ: ') + '<strong><bdi>' + _money(pay.amount) + ' ' + _arTxt(cur) + '</bdi></strong></div><div>' + _arTxt('التاريخ: ') + '<strong><bdi>' + _date(pay.date) + '</bdi></strong></div><div style="margin-top:4px;color:#90a4ae">' + _arTxt('امسح الكود للتحقق') + '</div></div></div></div>' : '') +
      _signatures([{ name: 'المستلم' }, { name: 'ولي الأمر' }, { name: s.issuedBy || 'إدارة المدرسة' }]) +
      _footer('شكراً لسدادكم في الوقت المحدد') +
      '</div>';
  }

  /* كشف درجات — نفس هيكل جداول المحطة */
  function gradeSheetHTML(d) {
    var headRow = ['<span style="width:32px">#</span>', 'الطالب', 'الرقم']
      .concat(d.ps.map(function (p) { return _arTxt(p.label) + '<div style="font-size:6.5pt;font-weight:400;opacity:.85">من ' + _e(p.max || '') + '</div>'; }))
      .concat(['المجموع', 'النسبة', 'التقدير']);
    var rowsHTML = d.rows.map(function (r, i) {
      return '<tr>' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td style="text-align:right">' + _arTxt(r.name) + '</td>' +
        '<td class="num">' + _e(r.sid || '') + '</td>' +
        r.vals.map(function (v) { return '<td class="num">' + _e(v) + '</td>'; }).join('') +
        '<td class="num" style="font-weight:800"><bdi>' + _num(r.total) + '</bdi></td>' +
        '<td class="num"><bdi>' + _e(r.pct) + '%</bdi></td>' +
        '<td>' + _arTxt(r.grade) + '</td>' +
        '</tr>';
    }).join('');
    return _fontCSS() +
      '<div class="pp-doc" dir="rtl">' +
      _watermarkLogoHTML('grades') +
      _header('كشف درجات') +
      _infoStrip([
        { k: 'المرحلة', v: _arTxt(d.stage || '-') },
        { k: 'الصف', v: _arTxt(d.klass || '-') },
        { k: 'المادة', v: _arTxt(d.subject || '-') },
        { k: d.termLabel || 'الترم', v: _arTxt('من ' + _num(d.mx) + ' درجة') }
      ]) +
      '<div class="pp-body">' +
      _section('✍️', 'درجات الطلاب', _table(headRow, rowsHTML)) +
      '</div>' +
      _signatures([{ name: 'معلم المادة' }, { name: 'راصد الصف' }, { name: 'مدير المدرسة' }]) +
      _footer() +
      '</div>';
  }

  /* ==================== الطباعة عبر القناة الموثوقة نفسها ==================== */
  function print(html, opts) {
    if (window.ReportIntl && ReportIntl.print) return ReportIntl.print(html, opts || {});
    if (window.PrintSettingsEngine) return PrintSettingsEngine.print(html, opts || {});
  }

  window.PrintProV2026 = {
    reportHTML: reportHTML,
    genericTableHTML: genericTableHTML,
    statementHTML: statementHTML,
    receiptA4HTML: receiptA4HTML,
    gradeSheetHTML: gradeSheetHTML,
    print: print,
    _header: _header,
    _footer: _footer,
    _signatures: _signatures,
    _fontCSS: _fontCSS,
    _fitCols: _fitCols,
    _e: _e,
    _money: _money,
    _date: _date,
    _printSettings: _printSettings
  };
})();

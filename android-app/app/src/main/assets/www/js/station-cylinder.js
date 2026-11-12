/* =========================================================
   station-cylinder.js — أسطوانة الأخبار العلوية — نسخة المحطة
   (topbar-cylinder-v2026.9) بالضبط، مع بيانات المدرسة:
   الطلاب / الموظفون / المتأخرات / نسبة التحصيل / التاريخ والوقت
   ========================================================= */
'use strict';

(function () {
  if (window.__SchoolCylinderV9) return;
  window.__SchoolCylinderV9 = true;

  var built = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmt(n) {
    try { return Number(n || 0).toLocaleString('ar-EG'); } catch (_) { return String(n || 0); }
  }
  function currency() {
    try { return (Store.settings() || {}).currency || 'ريال'; } catch (_) { return 'ريال'; }
  }
  function schoolName() {
    try { return (Store.settings() || {}).schoolName || 'المدرسة الدولية الخاصة'; } catch (_) { return 'المدرسة الدولية الخاصة'; }
  }
  function nowText() {
    var d = new Date;
    var dateS, timeS;
    try {
      dateS = d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) { dateS = d.toLocaleDateString(); }
    try {
      timeS = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (_) { timeS = d.toLocaleTimeString(); }
    return { dateS: dateS, timeS: timeS };
  }

  /* ---------- إحصاءات المدرسة ---------- */
  function statsData() {
    try {
      if (typeof Store !== 'undefined' && Store.col) {
        var students = Store.col('students') || [];
        var total = students.length;
        var active = students.filter(function (s) { return s.status !== 'withdrawn' && s.status !== 'graduated'; }).length;
        var employees = Store.count('employees');
        /* المتأخرات من خطط الأقساط */
        var arrearsTotal = 0, arrearsCount = 0, billed = 0;
        (Store.col('feeplans') || []).forEach(function (p) {
          (p.items || []).forEach(function (i) {
            billed += Number(i.amount) || 0;
            if (!i.paid) { arrearsTotal += Number(i.amount) || 0; arrearsCount++; }
          });
        });
        var collected = 0;
        (Store.col('payments') || []).forEach(function (p) { collected += Number(p.amount) || 0; });
        var rate = billed > 0 ? Math.min(100, Math.round(collected / billed * 100)) : 0;
        var busSubs = Store.count('busSubs', function (b) { return b.status === 'active'; });
        return {
          total: total, active: active, employees: employees,
          arrearsCount: arrearsCount, arrearsTotal: arrearsTotal,
          collected: collected, billed: billed, rate: rate, busSubs: busSubs
        };
      }
    } catch (_) {}
    return { total: 0, active: 0, employees: 0, arrearsCount: 0, arrearsTotal: 0, collected: 0, billed: 0, rate: 0, busSubs: 0 };
  }

  function segHTML() {
    return '<span class="cylinder-seg">مرحباً بكم في النظام الإداري والأكاديمي لـ ' + esc(schoolName()) + '</span>'
      + '<span class="cylinder-seg">عدد الطلاب: <b data-cyl="total"></b></span>'
      + '<span class="cylinder-seg">الطلاب النشطون: <b data-cyl="active"></b></span>'
      + '<span class="cylinder-seg">الموظفون: <b data-cyl="employees"></b></span>'
      + '<span class="cylinder-seg">المتأخرات المالية: <b data-cyl="arrearsTotal"></b></span>'
      + '<span class="cylinder-seg">نسبة التحصيل: <b data-cyl="rate"></b></span>'
      + '<span class="cylinder-seg">مشتركو الباص: <b data-cyl="busSubs"></b></span>'
      + '<span class="cylinder-seg">جميع الحقوق محفوظة لشركة <b>YCMS</b></span>'
      + '<span class="cylinder-seg">التاريخ: <b data-cyl="date"></b></span>'
      + '<span class="cylinder-seg">الوقت: <b data-cyl="time"></b></span>';
  }

  function repeatStr(s, n) {
    var out = '';
    for (var i = 0; i < n; i++) out += s;
    return out;
  }

  function speedSeconds() {
    try {
      if (typeof Store !== 'undefined' && Store.settings) {
        var t = (Store.settings() || {}).theme || {};
        var v = parseFloat(t.cylinderSpeed);
        if (!isNaN(v) && v >= 3 && v <= 120) return v;
      }
    } catch (_) {}
    return 26;
  }

  function applySpeed(track) {
    try {
      track.style.setProperty('animation-duration', speedSeconds() + 's', 'important');
      track.style.setProperty('-webkit-animation-duration', speedSeconds() + 's', 'important');
    } catch (_) {}
  }

  function build() {
    var track = document.getElementById('cylinderTrack');
    var body = document.getElementById('topCylinder');
    if (!track || !body) return;
    if (!built) {
      track.innerHTML = segHTML();
      var copyW = track.scrollWidth || track.getBoundingClientRect().width || 800;
      if (copyW <= 0) copyW = 800;
      var bodyW = body.offsetWidth || body.clientWidth || 600;
      if (bodyW <= 0) bodyW = 600;
      var n = Math.ceil(bodyW / copyW) * 2;
      if (n < 2) n = 2;
      track.innerHTML = repeatStr(segHTML(), n);
      built = true;
    }
    updateValues();
  }

  function updateValues() {
    var track = document.getElementById('cylinderTrack');
    if (!track) return;
    var d = statsData();
    var t = nowText();
    var c = esc(currency());
    function set(k, v) {
      var els = track.querySelectorAll('[data-cyl="' + k + '"]');
      for (var i = 0; i < els.length; i++) if (els[i].textContent !== v) els[i].textContent = v;
    }
    set('total', fmt(d.total));
    set('active', fmt(d.active));
    set('employees', fmt(d.employees));
    set('arrearsTotal', fmt(d.arrearsTotal) + ' ' + c);
    set('rate', fmt(d.rate) + '%');
    set('busSubs', fmt(d.busSubs));
    set('date', t.dateS);
    set('time', t.timeS);
    applySpeed(track);
  }

  function bindTouch() {
    var body = document.querySelector('.cylinder-body');
    if (!body || body.__cylTouchBound) return;
    body.__cylTouchBound = true;
    body.addEventListener('touchstart', function () {
      var t = document.getElementById('cylinderTrack');
      if (t) t.classList.add('paused');
    });
    body.addEventListener('touchend', function () {
      var t = document.getElementById('cylinderTrack');
      if (t) t.classList.remove('paused');
    });
  }

  function start() {
    bindTouch();
    build();
    setInterval(updateValues, 1e3);
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { built = false; build(); }, 250);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 400); });
  } else {
    setTimeout(start, 400);
  }

  window.StationCylinder = { build: build, update: updateValues };
})();

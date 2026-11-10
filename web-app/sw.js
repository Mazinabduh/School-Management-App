/* =========================================================
   sw.js — Service Worker | EduPro School ERP v3.0.0
   عمل كامل دون إنترنت: Cache-First + تحديث خلفي ذكي
   ========================================================= */
'use strict';

const VERSION  = '3.1.1';
const CACHE    = `edupro-v${VERSION}`;
const RUNTIME  = `edupro-runtime-v${VERSION}`;

/* ---------- قائمة الأصول (نفس ترتيب index.html حرفياً) ---------- */
const SHELL = [
  './', './index.html', './manifest.json',
  // assets
  './assets/fonts/Cairo.ttf', './assets/fonts/Cairo-Regular.ttf',
  './assets/images/logo.png', './assets/images/logo-128.png',
  './assets/images/default-avatar.png', './assets/images/watermark.png',
  './assets/images/ycms-logo.png', './assets/images/ycms-mark.png',
  './assets/icons/favicon.png',
  './assets/icons/icon-72.png', './assets/icons/icon-96.png', './assets/icons/icon-128.png',
  './assets/icons/icon-144.png', './assets/icons/icon-152.png', './assets/icons/icon-192.png',
  './assets/icons/icon-384.png', './assets/icons/icon-512.png', './assets/icons/icon-maskable-512.png',
  // vendor (9)
  './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js', './vendor/qrcode-generator.js',
  './vendor/xlsx.full.min.js', './vendor/pdfmake.min.js', './vendor/pdfmake-rtl.js',
  './vendor/vfs_fonts.js', './vendor/zxing.min.js', './vendor/arabic-reshaper.js',
  // css (26)
  './css/variables.css', './css/base.css', './css/splash.css', './css/login.css',
  './css/layout.css', './css/sidebar.css', './css/icons3d.css', './css/dashboard.css',
  './css/charts.css', './css/students.css', './css/academics.css', './css/grades-matrix.css',
  './css/certificates.css', './css/finance.css', './css/store-inventory.css', './css/bus-system.css',
  './css/hr-payroll.css', './css/id-cards.css', './css/reports.css', './css/modals.css',
  './css/tables.css', './css/forms.css', './css/enhancements.css', './css/responsive.css',
  './css/themes-intl.css', './css/print.css',
  // print engines (نظام تطبيق المحطة)
  './print/reliable-print.js', './print/print-settings-pro.js',
  './print/print-settings-engine.js', './print/thermal-print.js', './print/thermal-receipt.js',
  './print/report-intl.js', './print/id-card-printer.js', './print/pdf-enterprise.js',
  './print/office-pro.js', './print/office-export.js',
  // core js (10)
  './js/config.js', './js/encryption.js', './js/database.js', './js/auth.js', './js/ui.js',
  './js/permissions.js', './js/charts.js', './js/github.js', './js/navigation.js', './js/helpers.js',
  // modules (18)
  './js/dashboard.js', './js/students.js', './js/stages-classes.js', './js/grades-engine.js',
  './js/results-certificates.js', './js/finance-budget.js', './js/installments.js',
  './js/store-books-uniform.js', './js/bus-management.js', './js/hr-employees.js',
  './js/payroll-engine.js', './js/id-card-studio.js', './js/communications.js',
  './js/reports-center.js', './js/settings-branding.js', './js/audit-log.js',
  './js/backup-restore.js', './js/professional-themes.js',
  // main engine (last)
  './js/login-bg.js',
  './js/app.js'
];

/* ---------- التثبيت: تخزين كامل قبل التفعيل ---------- */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' }))))
    ).then(() => self.skipWaiting())
  );
});

/* ---------- التفعيل: حذف القوائم القديمة ---------- */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ---------- الجلب: Cache-First مع شبكة احتياطية ---------- */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // مزامنة GitHub تمر للشبكة مباشرة

  e.respondWith(
    caches.match(req, { ignoreSearch: url.pathname.endsWith('index.html') }).then((hit) => {
      if (hit) {
        // تحديث خلفي صامت
        fetch(req).then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() =>
        req.mode === 'navigate'
          ? caches.match('./index.html')
          : Response.error()
      );
    })
  );
});

/* ---------- استقبال رسالة تخطي انتظار ---------- */
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

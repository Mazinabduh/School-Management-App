/* =========================================================
   android-bridge-shim.js — يُحقَن من MainActivity عند onPageFinished
   نفس تطبيق المحطة حرفياً — يعترض كل تنزيلات blob: ويمرّرها للأندرويد
   (حفظ مباشر في التنزيلات أو SAF)، ويؤمّن الاستعادة وshowSaveFilePicker
   ========================================================= */
(function () {
  "use strict";
  if (window.__eduProShimV2) return;
  window.__eduProShimV2 = true;

  var native = !!(window.AndroidBridge && window.AndroidBridge.isNativeApp && window.AndroidBridge.isNativeApp() === true);
  window.HARA_NATIVE = native;
  window.EDUPRO_NATIVE = native;

  var bridge = window.AndroidBridge;
  if (!bridge) return;

  /* قناة تنظيف صفحة الطباعة بعد انتهاء مهمة الطباعة الأصلية (يستدعيها Bridge) */
  if (!window.__nativePrintCleanup) {
    window.__nativePrintCleanup = function () {
      try { document.body.classList.remove("printing-a4", "printing-thermal"); } catch (e) {}
      try { if (window.__eduProPrintCleanup) window.__eduProPrintCleanup(); } catch (e) {}
    };
  }

  var TEXTY = /^(text\/|application\/json|application\/xml|application\/javascript)/i;

  function toBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var chunk = 0x8000;
    var parts = [];
    for (var i = 0; i < bytes.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
    }
    return btoa(parts.join(""));
  }

  /* اعتراض التنزيل: نصّي → حفظ مباشر في التنزيلات، ثنائي → مربع اختيار المكان (SAF) */
  function saveBlob(blob, filename) {
    var name = filename || "edupro_export";
    var type = blob.type || "application/octet-stream";

    if (TEXTY.test(type)) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          if (bridge.saveFileDirect) bridge.saveFileDirect(name, String(reader.result));
          else bridge.saveBackupWithPicker(name, String(reader.result));
        } catch (e) { console.error("[shim] save text failed", e); }
      };
      reader.onerror = function () { console.error("[shim] read blob failed"); };
      reader.readAsText(blob);
    } else {
      blob.arrayBuffer().then(function (buf) {
        try {
          if (bridge.saveBinaryWithPicker) bridge.saveBinaryWithPicker(name, toBase64(buf));
          else if (bridge.saveBinaryAuto) bridge.saveBinaryAuto(name, toBase64(buf));
          else if (bridge.toast) bridge.toast("لا يمكن حفظ هذا النوع من الملفات");
        } catch (e) { console.error("[shim] save binary failed", e); }
      }).catch(function (e) { console.error("[shim] arrayBuffer failed", e); });
    }
  }

  /* اعتراض النقر على روابط التنزيل <a download href="blob:"> — capture قبل أن يبلغ الصفحة */
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[download]") : null;
    if (!a) return;

    var href = a.getAttribute("href") || "";
    if (href.indexOf("blob:") !== 0) return;

    ev.preventDefault();
    ev.stopPropagation();

    fetch(href)
      .then(function (r) { return r.blob(); })
      .then(function (blob) { saveBlob(blob, a.getAttribute("download")); })
      .catch(function (e) {
        console.error("[shim] blob fetch failed", e);
        if (bridge.toast) bridge.toast("فشل تصدير الملف");
      });
  }, true);

  /* اعتراض saveAs العام (FileSaver داخل jsPDF — يفضّله SheetJS أولاً):
     يرسل النقر على رابط غير مُلحق بالمستند فلا يصل اعتراض النقر إليه */
  try {
    if (typeof window.saveAs === "function" && !window.__saveAsNative) {
      window.__saveAsNative = window.saveAs;
      window.saveAs = function (blob, name) {
        try { saveBlob(blob, name || "edupro_export"); }
        catch (e) { console.error("[shim] saveAs failed", e); try { window.__saveAsNative(blob, name); } catch (e2) {} }
      };
    }
  } catch (e) { }

  /* بديل showSaveFilePicker (File System Access API غير موجودة في WebView) */
  if (!("showSaveFilePicker" in window)) {
    window.showSaveFilePicker = function (opts) {
      opts = opts || {};
      var suggested = (opts.suggestedName) || "edupro_db.json";

      var handle = {
        name: suggested,
        kind: "file",
        createWritable: function () {
          var chunks = [];
          return Promise.resolve({
            write: function (data) {
              chunks.push(typeof data === "string" ? data : "");
              return Promise.resolve();
            },
            close: function () {
              try {
                if (bridge.saveFileDirect) bridge.saveFileDirect(suggested, chunks.join(""));
                else bridge.saveBackupWithPicker(suggested, chunks.join(""));
              } catch (e) { console.error("[shim] write failed", e); }
              return Promise.resolve();
            },
            abort: function () { return Promise.resolve(); }
          });
        }
      };
      return Promise.resolve(handle);
    };
  }

  if (!("showDirectoryPicker" in window)) {
    window.showDirectoryPicker = function () {
      return Promise.reject(new DOMException("Not supported in Android app", "NotSupportedError"));
    };
  }

  /* استلام ملف مستورد من native openFilePicker → حقل الاستعادة #bak-file */
  window.__onAndroidFilePicked = function (file) {
    try {
      var input = document.getElementById("bak-file");
      if (input && typeof DataTransfer !== "undefined") {
        try {
          var dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        } catch (e) { }
      }
      if (bridge.toast) bridge.toast("تم اختيار الملف: " + file.name);
    } catch (e) {
      console.error("[shim] __onAndroidFilePicked failed", e);
    }
  };

  /* alert → toast أندرويد (نفس المحطة) */
  var _origAlert = window.alert;
  window.alert = function (msg) {
    if (bridge.toast) bridge.toast(String(msg));
    else _origAlert.apply(window, arguments);
  };

  /* حماية window.open داخل التطبيق (نفس المحطة) */
  if (!window.__eduProOpenGuard) {
    window.__eduProOpenGuard = true;
    var _origOpen = window.open;
    window.open = function (url) {
      var u = url == null ? "" : String(url);
      if (u === "" || /^(about:|blob:|data:|javascript:)/i.test(u)) {
        try { if (bridge.toast) bridge.toast("النوافذ المنبثقة غير مدعومة داخل التطبيق — استخدم أزرار الطباعة المخصصة"); } catch (e) {}
        return null;
      }
      try { return _origOpen.apply(window, arguments); } catch (e2) { return null; }
    };
  }

  console.info("[EduPro] الجسر الأصلي مفعّل — الطباعة والحفظ يعملان عبر أندرويد");
})();

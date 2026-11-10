/* =========================================================
   android-bridge-shim.js — يُحقَن من MainActivity عند onPageFinished
   يوثّق بيئة التشغيل ويضمن وجود دوال الحفظ قبل أي استخدام late
========================================================= */
(function(){
  "use strict";
  try{
    var native = !!(window.AndroidBridge && window.AndroidBridge.isNativeApp && window.AndroidBridge.isNativeApp() === true);
    window.HARA_NATIVE = native;
    // ضمان وجود قناة إشعار التنظيف بعد مهمة الطباعة الأصلية
    if (native && !window.__nativePrintCleanup){
      window.__nativePrintCleanup = function(){
        try{ document.body.classList.remove("printing-a4", "printing-thermal"); }catch(e){}
      };
    }
  }catch(e){}
})();

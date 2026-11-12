package com.ycms.school;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.biometric.BiometricManager;
import androidx.fragment.app.FragmentActivity;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.concurrent.Executor;

public class MainActivity extends FragmentActivity {

    public static final String APP_HOST = "appassets.androidplatform.net";
    public static final String START_URL = "https://" + APP_HOST + "/assets/index.html";

    public static final int REQ_FILE_CHOOSER = 41;
    public static final int REQ_SAF_TEXT = 42;
    public static final int REQ_SAF_BIN = 43;
    public static final int REQ_OPEN_FILE = 44;
    public static final int REQ_PICK_TREE = 45;
    public static final int REQ_RUNTIME = 77;
    public static final int REQ_BT_PERM = 79;

    WebView web;
    Bridge bridge;
    ValueCallback<Uri[]> fileCb;
    PermissionRequest pendingCamRequest;

    private static final String LOCK_PREFS = "school_app_lock";
    private FrameLayout rootLayout;
    private LinearLayout lockOverlay;
    private boolean leftForeground = false;
    private boolean lockPromptShowing = false;
    private final Handler uiHandler = new Handler(Looper.getMainLooper());

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setLoadsImagesAutomatically(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= 29) {
            try { s.setForceDark(WebSettings.FORCE_DARK_OFF); } catch (Throwable ignored) {}
        }
        WebView.setWebContentsDebuggingEnabled(false);

        bridge = new Bridge(this);
        web.addJavascriptInterface(bridge, "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                return serveAsset(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (u == null) return true;
                if (APP_HOST.equals(u.getHost())) return false;
                String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase();

                switch (scheme) {
                    case "tel":
                        try { startActivity(new Intent(Intent.ACTION_DIAL, u)); } catch (Throwable ignored) {}
                        return true;
                    case "sms": case "smsto": case "mailto":
                        try { startActivity(new Intent(Intent.ACTION_SENDTO, u)); } catch (Throwable ignored) {}
                        return true;
                    case "blob": case "about": case "data": case "javascript":
                        return true;
                    default: {
                        if ("http".equals(scheme) || "https".equals(scheme)) {
                            if (u.getHost() == null || u.getHost().trim().isEmpty()) return true;
                        }
                        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Throwable ignored) {}
                        return true;
                    }
                }
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                injectShim();
                injectVersionGuard();
            }

            @Override
            public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail detail) {
                try {
                    android.util.Log.w("SchoolApp", "WebView renderer gone — rebuilding");
                    rebuildWebView();
                    return true;
                } catch (Throwable t) {
                    return false;
                }
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (req != null && req.isForMainFrame()) {
                    String html = "<html dir='rtl'><body style='display:flex;align-items:center;justify-content:center;height:90vh;font-family:sans-serif;background:#030b1a;color:#e8f0fe;text-align:center'>"
                        + "<div><h2>تعذر تحميل الصفحة</h2><p>أعد فتح البرنامج — بياناتك محفوظة وآمنة</p></div></body></html>";
                    v.loadData(html, "text/html; charset=utf-8", "utf-8");
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    java.util.ArrayList<String> mimes = new java.util.ArrayList<>();
                    String[] accept = p.getAcceptTypes();
                    if (accept != null) {
                        for (String group : accept) {
                            if (group == null) continue;
                            for (String part : group.trim().split(",")) {
                                String t = part.trim().toLowerCase();
                                if (t.isEmpty() || "*/*".equals(t)) continue;
                                if (t.startsWith(".")) {
                                    String m = extToMime(t);
                                    if (m != null && !mimes.contains(m)) mimes.add(m);
                                } else if (t.contains("/")) {
                                    if (!mimes.contains(t)) mimes.add(t);
                                }
                            }
                        }
                    }
                    if (!mimes.isEmpty()) {
                        i.putExtra(Intent.EXTRA_MIME_TYPES, mimes.toArray(new String[0]));
                    }
                } catch (Throwable ignored) {}
                try {
                    startActivityForResult(Intent.createChooser(i, "اختيار ملف"), REQ_FILE_CHOOSER);
                } catch (Throwable e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest pr) {
                runOnUiThread(() -> {
                    for (String r : pr.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
                            pr.deny();
                            return;
                        }
                    }
                    pr.deny();
                });
            }
        });

        try {
            rootLayout = new FrameLayout(this);
            rootLayout.addView(web, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            setContentView(rootLayout);
        } catch (Throwable t) {
            setContentView(web);
            rootLayout = null;
        }
        web.loadUrl(START_URL);
    }

    private boolean isLockEnabled() {
        try {
            return getSharedPreferences(LOCK_PREFS, MODE_PRIVATE).getBoolean("lock_enabled", false);
        } catch (Throwable t) {
            return false;
        }
    }

    private void showLockOverlay() {
        try {
            if (rootLayout == null) {
                rootLayout = new FrameLayout(this);
                ViewGroup parent = (ViewGroup) web.getParent();
                if (parent != null && parent != rootLayout) {
                    parent.removeView(web);
                    rootLayout.addView(web, new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                    setContentView(rootLayout);
                }
            }
            if (rootLayout == null || lockOverlay != null) return;
            lockOverlay = new LinearLayout(this);
            lockOverlay.setOrientation(LinearLayout.VERTICAL);
            lockOverlay.setGravity(android.view.Gravity.CENTER);
            lockOverlay.setBackgroundColor(0xF4030B1A);
            lockOverlay.setClickable(true);
            lockOverlay.setFocusable(true);

            TextView icon = new TextView(this);
            icon.setText("🏘️");
            icon.setTextSize(56);
            icon.setGravity(android.view.Gravity.CENTER);

            TextView t1 = new TextView(this);
            t1.setText("تطبيق ادارة المدرسة");
            t1.setTextSize(18);
            t1.setTextColor(0xFFFFFFFF);
            t1.setGravity(android.view.Gravity.CENTER);
            t1.setPadding(0, 24, 0, 8);

            TextView t2 = new TextView(this);
            t2.setText("🔒 التطبيق مقفول — المس للتحقق بالبصمة/النقش");
            t2.setTextSize(14);
            t2.setTextColor(0xFF9FC5E8);
            t2.setGravity(android.view.Gravity.CENTER);
            t2.setPadding(0, 8, 0, 0);

            lockOverlay.addView(icon);
            lockOverlay.addView(t1);
            lockOverlay.addView(t2);
            lockOverlay.setOnClickListener(v -> tryShowBiometricPrompt());
            rootLayout.addView(lockOverlay, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            lockOverlay.postDelayed(() -> tryShowBiometricPrompt(), 350);
        } catch (Throwable ignored) {
            lockOverlay = null;
        }
    }

    private void hideLockOverlay() {
        try {
            if (lockOverlay != null && rootLayout != null) {
                rootLayout.removeView(lockOverlay);
            }
        } catch (Throwable ignored) {}
        lockOverlay = null;
    }

    private void tryShowBiometricPrompt() {
        try {
            if (lockPromptShowing || !isLockEnabled()) {
                if (!isLockEnabled()) hideLockOverlay();
                return;
            }
            Executor executor = ContextCompat.getMainExecutor(this);
            BiometricManager bm = BiometricManager.from(this);

            BiometricPrompt.PromptInfo.Builder pb = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("تطبيق ادارة المدرسة")
                    .setSubtitle("تحقق بالبصمة أو النقش لفتح التطبيق")
                    .setConfirmationRequired(false);

            lockPromptShowing = true;
            BiometricPrompt prompt = new BiometricPrompt(this, executor, new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    lockPromptShowing = false;
                    leftForeground = false;
                    hideLockOverlay();
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    lockPromptShowing = false;
                    if (errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                            || errorCode == BiometricPrompt.ERROR_USER_CANCELED
                            || errorCode == BiometricPrompt.ERROR_TIMEOUT) {
                        uiHandler.postDelayed(() -> tryShowBiometricPrompt(), 1000);
                    }
                }
            });

            if (Build.VERSION.SDK_INT >= 30) {
                int can = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK
                        | BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                if (can != BiometricManager.BIOMETRIC_SUCCESS) {
                    lockPromptShowing = false;
                    hideLockOverlay();
                    return;
                }
                pb.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK
                        | BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                prompt.authenticate(pb.build());
            } else {
                int canBio = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
                int canCred = bm.canAuthenticate(BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                if (canBio == BiometricManager.BIOMETRIC_SUCCESS && canCred == BiometricManager.BIOMETRIC_SUCCESS) {
                    pb.setDeviceCredentialAllowed(true);
                } else if (canBio == BiometricManager.BIOMETRIC_SUCCESS) {
                    pb.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK);
                    pb.setNegativeButtonText("إلغاء");
                    pb.setConfirmationRequired(false);
                } else if (canCred == BiometricManager.BIOMETRIC_SUCCESS) {
                    pb.setDeviceCredentialAllowed(true);
                } else {
                    lockPromptShowing = false;
                    hideLockOverlay();
                    return;
                }
                prompt.authenticate(pb.build());
            }
        } catch (Throwable t) {
            lockPromptShowing = false;
            hideLockOverlay();
        }
    }

    private void rebuildWebView() {
        try {
            uiHandler.postDelayed(() -> {
                try { recreate(); } catch (Throwable ignored) {}
            }, 150);
        } catch (Throwable ignored) {}
    }

    private WebResourceResponse serveAsset(Uri url) {
        try {
            if (!APP_HOST.equals(url.getHost())) return null;
            String path = url.getPath();
            if (path == null) return null;
            if (!path.startsWith("/assets/")) {
                if ("/".equals(path) || path.isEmpty()) path = "/assets/index.html";
                else return null;
            }
            String asset = "www/" + path.substring("/assets/".length());
            if (asset.endsWith("/")) asset += "index.html";
            AssetManager am = getAssets();
            InputStream is;
            try {
                is = am.open(asset);
            } catch (IOException e) {
                byte[] nf = ("404 — الملف غير موجود: " + path).getBytes("UTF-8");
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                        Collections.singletonMap("Access-Control-Allow-Origin", "*"),
                        new ByteArrayInputStream(nf));
            }
            WebResourceResponse r = new WebResourceResponse(guessMime(asset), null, is);
            java.util.Map<String, String> hdrs = new java.util.HashMap<>();
            hdrs.put("Access-Control-Allow-Origin", "*");
            r.setResponseHeaders(hdrs);
            return r;
        } catch (Throwable t) {
            return null;
        }
    }

    static String extToMime(String ext) {
        switch (ext == null ? "" : ext) {
            case ".json": return "application/json";
            case ".pdf": return "application/pdf";
            case ".csv": return "text/csv";
            case ".txt": return "text/plain";
            case ".png": return "image/png";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".zip": return "application/zip";
            case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case ".doc": return "application/msword";
            case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            default: return null;
        }
    }

    static String guessMime(String path) {
        String p = path.toLowerCase();
        String ext = p.contains(".") ? p.substring(p.lastIndexOf('.') + 1) : "";
        switch (ext) {
            case "html": case "htm": return "text/html";
            case "css": return "text/css";
            case "js": case "mjs": return "application/javascript";
            case "json": case "map": return "application/json";
            case "webmanifest": return "application/manifest+json";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "gif": return "image/gif";
            case "svg": return "image/svg+xml";
            case "webp": return "image/webp";
            case "ico": return "image/x-icon";
            case "woff": return "font/woff";
            case "woff2": return "font/woff2";
            case "ttf": return "font/ttf";
            case "otf": return "font/otf";
            case "pdf": return "application/pdf";
            case "txt": return "text/plain";
            case "xml": return "application/xml";
            default: return "application/octet-stream";
        }
    }

    /**
     * حارس الإصدار الأصلي — يقرأ إصدار APK من PackageManager مباشرة (لا يمكن أن يصبح قديماً).
     * يستخدم مخزناً مستقلاً (SharedPreferences: school_native_guard) منفصلاً تماماً عن
     * localStorage الخاص بالصفحة — لا يوجد مفتاح مشترك وبالتالي لا يوجد احتمال
     * لحلقة إعادة التحميل بين الحارسين (الدرس المستفاد من تطبيق المحطة).
     */
    private void injectVersionGuard() {
        try {
            String cur = null;
            try { cur = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Throwable ignored) {}
            if (cur == null || cur.trim().isEmpty()) return;
            android.content.SharedPreferences sp = getSharedPreferences("school_native_guard", MODE_PRIVATE);
            if (cur.equals(sp.getString("apk_ver", ""))) return;
            sp.edit().putString("apk_ver", cur).apply();
            final String js = "(function(){try{"
                + "var done=function(){location.replace(location.href);};"
                + "var p=(window.caches&&caches.keys)?caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k);}));}).catch(function(){}):Promise.resolve();"
                + "var q=(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations)?navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister();}));}).catch(function(){}):Promise.resolve();"
                + "Promise.all([p,q]).then(done,done);"
                + "}catch(e){}})();";
            web.post(() -> web.evaluateJavascript(js, null));
        } catch (Throwable ignored) {}
    }

    void injectShim() {
        try {
            InputStream is = getAssets().open("www/android-bridge-shim.js");
            java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            is.close();
            final String code = bo.toString("UTF-8");
            web.post(() -> web.evaluateJavascript(code, null));
        } catch (Throwable ignored) {}
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            if (fileCb != null) {
                fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                fileCb = null;
            }
            return;
        }
        if (bridge != null) bridge.onActivityResult(requestCode, resultCode, data);
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == REQ_RUNTIME && pendingCamRequest != null) {
            boolean ok = false;
            for (int g : grantResults) if (g == PackageManager.PERMISSION_GRANTED) ok = true;
            if (ok) pendingCamRequest.grant(pendingCamRequest.getResources());
            else pendingCamRequest.deny();
            pendingCamRequest = null;
        }
        if (requestCode == REQ_BT_PERM && bridge != null) {
            bridge.onBtPermResult(grantResults);
        }
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else moveTaskToBack(true);
    }

    @Override
    protected void onPause() {
        try { if (web != null) web.onPause(); } catch (Throwable ignored) {}
        super.onPause();
    }

    @Override
    protected void onStop() {
        try { if (web != null) web.onPause(); } catch (Throwable ignored) {}
        if (isLockEnabled() && !isFinishing()) leftForeground = true;
        super.onStop();
    }

    @Override
    protected void onRestart() {
        super.onRestart();
        try { if (web != null) web.onResume(); } catch (Throwable ignored) {}
        if (isLockEnabled() && leftForeground) {
            showLockOverlay();
            uiHandler.postDelayed(() -> tryShowBiometricPrompt(), 350);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        try { if (web != null) web.onResume(); } catch (Throwable ignored) {}
        if (isLockEnabled() && leftForeground) {
            showLockOverlay();
            uiHandler.postDelayed(() -> tryShowBiometricPrompt(), 350);
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}

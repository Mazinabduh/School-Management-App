package com.ycms.school;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintJob;
import android.print.PrintJobInfo;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;

public class Bridge {

    private final MainActivity act;
    private final Handler ui = new Handler(Looper.getMainLooper());

    private String pendingName, pendingText;
    private byte[] pendingBytes;

    Bridge(MainActivity act) { this.act = act; }

    @JavascriptInterface
    public boolean isNativeApp() { return true; }

    @JavascriptInterface
    public int getAndroidVersion() { return Build.VERSION.SDK_INT; }

    @JavascriptInterface
    public String appVersion() {
        try {
            return act.getPackageManager().getPackageInfo(act.getPackageName(), 0).versionName;
        } catch (Throwable t) { return "1.0"; }
    }

    @JavascriptInterface
    public void toast(String msg) {
        final String m = msg == null ? "" : msg;
        ui.post(() -> Toast.makeText(act, m, Toast.LENGTH_LONG).show());
    }

    @JavascriptInterface
    public void dial(String phone) {
        final String p = phone == null ? "" : phone.trim();
        if (p.isEmpty()) return;
        ui.post(() -> {
            try {
                act.startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + p)));
            } catch (Throwable t) {
                Toast.makeText(act, "لا يوجد تطبيق اتصال على الجهاز", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @JavascriptInterface
    public void sms(String phone, String body) {
        final String p = phone == null ? "" : phone.trim();
        if (p.isEmpty()) return;
        final String b = body == null ? "" : body;
        ui.post(() -> {
            try {
                Intent i = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + Uri.encode(p)));
                if (!b.isEmpty()) i.putExtra("sms_body", b);
                act.startActivity(i);
            } catch (Throwable t) {
                Toast.makeText(act, "لا يوجد تطبيق رسائل على الجهاز", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @JavascriptInterface
    public void vibrate(int ms) {
        try {
            android.os.Vibrator v = (android.os.Vibrator) act.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null) return;
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(android.os.VibrationEffect.createOneShot(Math.max(10, ms), android.os.VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(Math.max(10, ms));
        } catch (Throwable ignored) {}
    }

    @JavascriptInterface
    public void setSystemBarColors(String statusColor, String navColor, int lightMode) {
        final int sc = parseColor(statusColor, 0xFF030B1A);
        final int nc = parseColor(navColor, 0xFF071428);
        final boolean light = lightMode == 1;
        ui.post(() -> {
            try {
                Window w = act.getWindow();
                w.setStatusBarColor(sc);
                w.setNavigationBarColor(nc);
                View d = w.getDecorView();
                int vis = d.getSystemUiVisibility();
                if (light) vis |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                else vis &= ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                d.setSystemUiVisibility(vis);
            } catch (Throwable ignored) {}
        });
    }

    private static int parseColor(String s, int fallback) {
        try {
            if (s == null || s.isEmpty()) return fallback;
            String h = s.trim();
            if (!h.startsWith("#")) h = "#" + h;
            if (h.length() == 7) h = "#FF" + h.substring(1);
            return android.graphics.Color.parseColor(h);
        } catch (Throwable t) { return fallback; }
    }

    /* ═══════════ الطباعة عبر النظام (WebView print) ═══════════ */

    @JavascriptInterface
    public void printPage() { doPrint("طباعة", false); }

    @JavascriptInterface
    public void printPageWithTitle(String title) {
        doPrint(title == null || title.trim().isEmpty() ? "طباعة" : title.trim(), false);
    }

    /* الاتجاه من إعدادات الطباعة داخل التطبيق: "landscape" أو "portrait" */
    @JavascriptInterface
    public void printPageWithTitle(String title, String orientation) {
        boolean land = "landscape".equalsIgnoreCase(orientation);
        doPrint(title == null || title.trim().isEmpty() ? "طباعة" : title.trim(), land);
    }

    private void doPrint(final String jobName, final boolean landscape) {
        ui.post(() -> {
            try {
                act.web.resumeTimers();
                PrintManager pm = (PrintManager) act.getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter adapter = act.web.createPrintDocumentAdapter(jobName);
                /* مقاس A4 بالميل الصحيح (1/1000 بوصة): 8268×11693 — لم يكن 210×297! */
                PrintAttributes.MediaSize ms = landscape
                        ? new PrintAttributes.MediaSize("ISO_A4_LANDSCAPE", "A4 \u0639\u0631\u0636\u064a", 11693, 8268)
                        : new PrintAttributes.MediaSize("ISO_A4", "A4", 8268, 11693);
                PrintAttributes attrs = new PrintAttributes.Builder()
                        .setMediaSize(ms)
                        .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                        .build();
                final PrintJob job = pm.print(jobName, adapter, attrs);
                watchPrintJob(job, jobName);
            } catch (Throwable t) {
                Toast.makeText(act, "تعذّر فتح الطباعة: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    private void watchPrintJob(final PrintJob job, final String jobName) {
        final Handler h = new Handler(Looper.getMainLooper());
        final long startedAt = android.os.SystemClock.elapsedRealtime();
        final Runnable[] poll = new Runnable[1];
        poll[0] = () -> {
            boolean done = false;
            int state = -1;
            try {
                if (job == null || job.isCancelled()) done = true;
                else {
                    state = job.getInfo() != null ? job.getInfo().getState() : -1;
                    if (state == PrintJobInfo.STATE_COMPLETED
                            || state == PrintJobInfo.STATE_CANCELED
                            || state == PrintJobInfo.STATE_FAILED) done = true;
                }
            } catch (Throwable t) { done = false; }
            long elapsed = android.os.SystemClock.elapsedRealtime() - startedAt;
            if (!done && elapsed < 20 * 60_000L) {
                h.postDelayed(poll[0], 1200);
                return;
            }
            act.web.evaluateJavascript(
                    "try{if(window.__nativePrintCleanup)window.__nativePrintCleanup();}catch(e){}", null);
            if (state == PrintJobInfo.STATE_FAILED) toast("فشلت مهمة الطباعة: " + jobName);
        };
        h.postDelayed(poll[0], 1200);
    }

    /* ═══════════ حفظ الملفات ═══════════ */

    private static final String DOC_FOLDER = "Hara Document";
    private static final String BAK_FOLDER = "Hara Backup";

    private boolean isBackupName(String name) {
        String n = (name == null ? "" : name).toLowerCase();
        return n.contains("backup") || n.contains("نسخة") || n.contains("احتياطي") || n.contains("إحتياطي") || n.contains("restore");
    }

    @JavascriptInterface
    public boolean saveFileDirect(String name, String text) {
        byte[] bytes = (text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
        String folder = isBackupName(name) ? BAK_FOLDER : DOC_FOLDER;
        return saveToFolder(name, bytes, mimeFor(name), true, folder);
    }

    @JavascriptInterface
    public boolean saveBackupAuto(String name, String text) {
        byte[] bytes = (text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
        return saveToFolder(name, bytes, mimeFor(name), true, BAK_FOLDER);
    }

    @JavascriptInterface
    public boolean saveDocumentAuto(String name, String text) {
        byte[] bytes = (text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
        return saveToFolder(name, bytes, mimeFor(name), true, DOC_FOLDER);
    }

    @JavascriptInterface
    public boolean saveBinaryAuto(String name, String base64) {
        try {
            byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            return saveToFolder(name, bytes, mimeFor(name), true, DOC_FOLDER);
        } catch (Throwable t) { return false; }
    }

    @JavascriptInterface
    public boolean savePdfBase64(String base64, String name) {
        try {
            byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
            return saveToFolder(name, bytes, "application/pdf", true, DOC_FOLDER);
        } catch (Throwable t) {
            toast("فشل حفظ PDF: " + t.getMessage());
            return false;
        }
    }

    private boolean saveToFolder(String name, byte[] bytes, String mime, boolean announce, String subFolder) {
        try {
            final String fname = safeName(name);
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, fname);
                cv.put(MediaStore.Downloads.MIME_TYPE, mime);
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + subFolder);
                cv.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = act.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) return false;
                OutputStream os = act.getContentResolver().openOutputStream(uri);
                os.write(bytes);
                os.flush();
                os.close();
                ContentValues done = new ContentValues();
                done.put(MediaStore.Downloads.IS_PENDING, 0);
                act.getContentResolver().update(uri, done, null, null);
                if (announce) toast("حُفظ في Download/" + subFolder + ": " + fname);
                return true;
            } else {
                if (act.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    act.requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, MainActivity.REQ_RUNTIME);
                    toast("امنح إذن التخزين ثم أعد المحاولة");
                    return false;
                }
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), subFolder);
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, fname);
                FileOutputStream fo = new FileOutputStream(f);
                fo.write(bytes);
                fo.flush();
                fo.close();
                try {
                    Intent scan = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                    scan.setData(Uri.fromFile(f));
                    act.sendBroadcast(scan);
                } catch (Throwable ignored) {}
                if (announce) toast("حُفظ في Download/" + subFolder + ": " + fname);
                return true;
            }
        } catch (Throwable t) {
            toast("فشل الحفظ: " + t.getMessage());
            return false;
        }
    }

    /* ═══════════ الحفظ المُجزَّأ — للملفات الكبيرة (PDF/Excel الضخمة) ═══════════
       تمرير سلسلة base64 ضخمة دفعة واحدة عبر جسر JS يفشل صمتاً داخل WebView،
       لذا تُرسل البيانات لدفعات صغيرة ثم تُجمع وتُحفظ مرة واحدة. */

    private final Object chunkLock = new Object();
    private final java.util.HashMap<String, java.io.ByteArrayOutputStream> chunkBuf = new java.util.HashMap<>();
    private final java.util.HashMap<String, String> chunkMeta = new java.util.HashMap<>();

    @JavascriptInterface
    public String saveChunkBegin(String name, String mime) {
        try {
            String id = "c" + System.nanoTime();
            synchronized (chunkLock) {
                chunkBuf.put(id, new java.io.ByteArrayOutputStream());
                chunkMeta.put(id, (name == null ? "" : name) + "\u0001" + (mime == null ? "" : mime));
            }
            return id;
        } catch (Throwable t) { return ""; }
    }

    @JavascriptInterface
    public boolean saveChunk(String id, String base64Part) {
        try {
            if (id == null || base64Part == null) return false;
            synchronized (chunkLock) {
                java.io.ByteArrayOutputStream bo = chunkBuf.get(id);
                if (bo == null) return false;
                byte[] bytes = android.util.Base64.decode(base64Part, android.util.Base64.DEFAULT);
                bo.write(bytes);
                return true;
            }
        } catch (Throwable t) { return false; }
    }

    @JavascriptInterface
    public boolean saveChunkEnd(String id) {
        byte[] bytes;
        String meta;
        synchronized (chunkLock) {
            java.io.ByteArrayOutputStream bo = chunkBuf.remove(id);
            meta = chunkMeta.remove(id);
            bytes = bo == null ? null : bo.toByteArray();
        }
        if (bytes == null || meta == null) return false;
        String[] nm = meta.split("\u0001", 2);
        return saveToFolder(nm[0], bytes, mimeFor(nm[0]), true, DOC_FOLDER);
    }

    @JavascriptInterface
    public void saveChunkAbort(String id) {
        synchronized (chunkLock) { chunkBuf.remove(id); chunkMeta.remove(id); }
    }

    /* ═══════════ النسخ التلقائية (حفظ/قراءة/حذف) ═══════════ */

    private static final String AUTO_BAK_DIR = "Hara/data/backups";

    @JavascriptInterface
    public boolean saveAutoBackup(String name, String text) {
        byte[] bytes = (text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
        return saveToFolder(name, bytes, "application/json", false, AUTO_BAK_DIR);
    }

    @JavascriptInterface
    public String listAutoBackups() {
        StringBuilder sb = new StringBuilder("[");
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                String rel = Environment.DIRECTORY_DOWNLOADS + "/" + AUTO_BAK_DIR + "/";
                Cursor c = act.getContentResolver().query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        new String[]{MediaStore.Downloads.DISPLAY_NAME, MediaStore.Downloads.SIZE, MediaStore.Downloads.DATE_MODIFIED},
                        MediaStore.Files.FileColumns.RELATIVE_PATH + "=?",
                        new String[]{rel}, MediaStore.Downloads.DATE_MODIFIED + " DESC");
                if (c != null) {
                    boolean first = true;
                    while (c.moveToNext()) {
                        if (!first) sb.append(",");
                        first = false;
                        String nm = c.getString(0);
                        long sz = c.isNull(1) ? 0 : c.getLong(1);
                        long dm = c.isNull(2) ? 0 : c.getLong(2) * 1000L;
                        sb.append("{\"name\":\"").append(jesc(nm)).append("\",\"size\":").append(sz).append(",\"date\":").append(dm).append("}");
                    }
                    c.close();
                }
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), AUTO_BAK_DIR);
                File[] fs = dir.listFiles();
                if (fs != null) {
                    java.util.Arrays.sort(fs, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
                    boolean first = true;
                    for (File f : fs) {
                        if (f.isDirectory() || !f.getName().endsWith(".json")) continue;
                        if (!first) sb.append(",");
                        first = false;
                        sb.append("{\"name\":\"").append(jesc(f.getName())).append("\",\"size\":").append(f.length()).append(",\"date\":").append(f.lastModified()).append("}");
                    }
                }
            }
        } catch (Throwable ignored) {}
        sb.append("]");
        return sb.toString();
    }

    @JavascriptInterface
    public String readAutoBackup(String name) {
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                String rel = Environment.DIRECTORY_DOWNLOADS + "/" + AUTO_BAK_DIR + "/";
                Cursor c = act.getContentResolver().query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        new String[]{MediaStore.Downloads._ID},
                        MediaStore.Files.FileColumns.RELATIVE_PATH + "=? AND " + MediaStore.Downloads.DISPLAY_NAME + "=?",
                        new String[]{rel, name}, null);
                if (c != null && c.moveToFirst()) {
                    long id = c.getLong(0);
                    c.close();
                    Uri uri = android.content.ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id);
                    java.io.InputStream is = act.getContentResolver().openInputStream(uri);
                    java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
                    is.close();
                    return bo.toString("UTF-8");
                }
                if (c != null) c.close();
                return "";
            } else {
                File f = new File(new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), AUTO_BAK_DIR), name);
                if (!f.exists()) return "";
                java.io.FileInputStream fi = new java.io.FileInputStream(f);
                java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = fi.read(buf)) > 0) bo.write(buf, 0, n);
                fi.close();
                return bo.toString("UTF-8");
            }
        } catch (Throwable t) {
            return "";
        }
    }

    @JavascriptInterface
    public boolean deleteAutoBackup(String name) {
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                String rel = Environment.DIRECTORY_DOWNLOADS + "/" + AUTO_BAK_DIR + "/";
                int n = act.getContentResolver().delete(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        MediaStore.Files.FileColumns.RELATIVE_PATH + "=? AND " + MediaStore.Downloads.DISPLAY_NAME + "=?",
                        new String[]{rel, name});
                return n > 0;
            } else {
                File f = new File(new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), AUTO_BAK_DIR), name);
                return f.exists() && f.delete();
            }
        } catch (Throwable t) {
            return false;
        }
    }

    /* ═══════════ الطباعة الحرارية (بلوتوث / USB) ═══════════ */

    @JavascriptInterface
    public boolean isBluetoothAvailable() {
        BluetoothAdapter a = btAdapter();
        return a != null && a.isEnabled();
    }

    @JavascriptInterface
    public String getPairedBluetoothDevices() {
        try {
            if (!ensureBtPermissions()) return "[]";
            BluetoothAdapter a = btAdapter();
            if (a == null || !a.isEnabled()) return "[]";
            Set<BluetoothDevice> devs = a.getBondedDevices();
            JSONArray arr = new JSONArray();
            for (BluetoothDevice d : devs) {
                JSONObject o = new JSONObject();
                o.put("address", d.getAddress());
                String nm;
                try { nm = d.getName(); } catch (Throwable e) { nm = null; }
                o.put("name", nm == null ? "جهاز بلوتوث" : nm);
                int cls = 0;
                try { cls = d.getBluetoothClass() == null ? 0 : d.getBluetoothClass().getDeviceClass(); } catch (Throwable ignored) {}
                o.put("isPrinter", cls == 1536 || (cls >= 512 && cls <= 526));
                arr.put(o);
            }
            return arr.toString();
        } catch (Throwable t) { return "[]"; }
    }

    private String firstPairedPrinter() {
        try {
            if (!ensureBtPermissions()) return null;
            BluetoothAdapter a = btAdapter();
            if (a == null || !a.isEnabled()) return null;
            BluetoothDevice fallback = null;
            for (BluetoothDevice d : a.getBondedDevices()) {
                int cls = 0;
                try { cls = d.getBluetoothClass() == null ? 0 : d.getBluetoothClass().getDeviceClass(); } catch (Throwable ignored) {}
                if (cls == 1536 || (cls >= 512 && cls <= 526)) return d.getAddress();
                if (fallback == null) fallback = d;
            }
            return fallback == null ? null : fallback.getAddress();
        } catch (Throwable t) { return null; }
    }

    @JavascriptInterface
    public boolean printThermal(String base64) {
        byte[] data;
        try { data = android.util.Base64.decode(base64, android.util.Base64.DEFAULT); }
        catch (Throwable t) { toast("بيانات طباعة غير صالحة"); return false; }
        String addr = firstPairedPrinter();
        if (addr != null && btAdapter() != null && btAdapter().isEnabled())
            return ThermalPrinter.printBluetooth(act, addr, data);
        return ThermalPrinter.printUsb(act, data);
    }

    @JavascriptInterface
    public boolean printThermalBluetooth(String address, String base64) {
        byte[] data;
        try { data = android.util.Base64.decode(base64, android.util.Base64.DEFAULT); }
        catch (Throwable t) { toast("بيانات طباعة غير صالحة"); return false; }
        return ThermalPrinter.printBluetooth(act, address, data);
    }

    @JavascriptInterface
    public boolean printThermalUsb(String base64) {
        byte[] data;
        try { data = android.util.Base64.decode(base64, android.util.Base64.DEFAULT); }
        catch (Throwable t) { toast("بيانات طباعة غير صالحة"); return false; }
        return ThermalPrinter.printUsb(act, data);
    }

    BluetoothAdapter btAdapter() {
        try {
            BluetoothManager bm = (BluetoothManager) act.getSystemService(Context.BLUETOOTH_SERVICE);
            return bm == null ? null : bm.getAdapter();
        } catch (Throwable t) { return null; }
    }

    private boolean ensureBtPermissions() {
        if (Build.VERSION.SDK_INT < 31) return true;
        if (act.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) return true;
        act.requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, MainActivity.REQ_BT_PERM);
        return false;
    }

    void onBtPermResult(int[] grantResults) {
        boolean ok = false;
        for (int g : grantResults) if (g == PackageManager.PERMISSION_GRANTED) ok = true;
        if (!ok) toast("لم يُمنح إذن البلوتوث — لا يمكن الطباعة الحرارية");
    }

    /* ═══════════ قفل التطبيق ═══════════ */

    private static final String LOCK_PREFS = "school_app_lock";

    @JavascriptInterface
    public boolean isAppLockEnabled() {
        try {
            return act.getSharedPreferences(LOCK_PREFS, Context.MODE_PRIVATE).getBoolean("lock_enabled", false);
        } catch (Throwable t) { return false; }
    }

    @JavascriptInterface
    public void setAppLockEnabled(boolean enabled) {
        try {
            act.getSharedPreferences(LOCK_PREFS, Context.MODE_PRIVATE)
                    .edit().putBoolean("lock_enabled", enabled).apply();
            toast(enabled ? "تم تفعيل قفل البصمة" : "تم تعطيل قفل البصمة");
        } catch (Throwable ignored) {}
    }

    @JavascriptInterface
    public boolean hasBiometrics() {
        try {
            androidx.biometric.BiometricManager bm = androidx.biometric.BiometricManager.from(act);
            return bm.canAuthenticate(androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK)
                    == androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS;
        } catch (Throwable t) { return false; }
    }

    /* ═══════════ مرآة جلسة الدخول في التخزين الأصلي ═══════════
       تحمي «تذكرني» من أي مسح أو تلف لبيانات الويب فيو —
       الجلسة تُحفظ مرة واحدة محلياً ومرآتها هنا، ولا يُسأل المستخدم مرة أخرى */

    private static final String SESSION_PREFS = "school_session_store";

    @JavascriptInterface
    public void nativeSetPref(String key, String value) {
        try {
            act.getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
                    .edit().putString(key == null ? "" : key, value == null ? "" : value).apply();
        } catch (Throwable ignored) {}
    }

    @JavascriptInterface
    public String nativeGetPref(String key) {
        try {
            return act.getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
                    .getString(key == null ? "" : key, null);
        } catch (Throwable t) { return null; }
    }

    @JavascriptInterface
    public void nativeDelPref(String key) {
        try {
            act.getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
                    .edit().remove(key == null ? "" : key).apply();
        } catch (Throwable ignored) {}
    }

    /* ═══════════ أدوات ═══════════ */

    private static String jesc(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    private static String safeName(String n) {
        String s = (n == null ? "" : n).replaceAll("[\\\\/:*?\"<>|]", "-").trim();
        return s.isEmpty() ? "School-Documents" : s;
    }

    private static String mimeFor(String name) {
        String n = (name == null ? "" : name).toLowerCase();
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".csv")) return "text/csv";
        if (n.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (n.endsWith(".doc")) return "application/msword";
        if (n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (n.endsWith(".txt")) return "text/plain";
        if (n.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }

    void onActivityResult(int requestCode, int resultCode, Intent data) { /* SAF غير مستخدم حالياً */ }
}

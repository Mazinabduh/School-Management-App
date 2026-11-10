package com.ycms.school;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

/**
 * SplashActivity — مشهد إقلاع Native 100% (بدون WebView).
 * شعار شركة YCMS متوهج ينبض + اسم التطبيق + شريط تقدم
 * + جميع الحقوق محفوظة لشركة YCMS — برمجة وتطوير: مازن عبدالوهاب 774047989
 * المدة ≈ 2.8 ثانية — نقرة واحدة تتخطى المشهد.
 */
public class SplashActivity extends Activity {

    private static final long DURATION_MS = 2800;

    private SplashView scene;
    private boolean finished = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable endRun = new Runnable() {
        @Override public void run() { goNext(); }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window w = getWindow();
        w.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        w.setNavigationBarColor(Color.parseColor("#02060F"));
        w.setStatusBarColor(Color.parseColor("#02060F"));

        scene = new SplashView(this);
        scene.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { goNext(); }
        });
        setContentView(scene);

        handler.postDelayed(endRun, DURATION_MS);
    }

    private void goNext() {
        if (finished) return;
        finished = true;
        handler.removeCallbacks(endRun);
        try {
            startActivity(new Intent(this, MainActivity.class));
        } catch (Throwable ignored) {}
        finish();
        try {
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        } catch (Throwable ignored) {}
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        handler.removeCallbacks(endRun);
        if (scene != null) scene.stop();
    }

    /* ═════════════ مشهد البداية المرسوم برمجياً — شعار YCMS ═════════════ */
    static class SplashView extends View {

        private final long startAt = System.nanoTime();
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF rect = new RectF();
        private Bitmap logo;
        private volatile boolean running = true;

        SplashView(android.content.Context c) {
            super(c);
            try {
                logo = BitmapFactory.decodeStream(c.getAssets().open("www/assets/images/ycms-logo.png"));
            } catch (Throwable t) {
                logo = null;
            }
        }

        void stop() { running = false; }

        @Override
        protected void onDraw(Canvas canvas) {
            final int W = getWidth(), H = getHeight();
            float t = (System.nanoTime() - startAt) / 1_000_000_000f;

            // خلفية ليلية متدرجة
            LinearGradient bg = new LinearGradient(0, 0, 0, H,
                    Color.parseColor("#0D2C55"), Color.parseColor("#02060F"), Shader.TileMode.CLAMP);
            p.setShader(bg);
            canvas.drawRect(0, 0, W, H, p);

            // هالة متوهجة خلف الشعار
            float cx = W / 2f, cy = H * 0.38f;
            float glowR = Math.max(W, H) * (0.34f + 0.03f * (float) Math.sin(t * 2.2));
            RadialGradient glow = new RadialGradient(cx, cy, glowR,
                    new int[]{0x3300D4FF, 0x1400B4FF, 0x00000000},
                    new float[]{0f, 0.55f, 1f}, Shader.TileMode.CLAMP);
            p.setShader(glow);
            canvas.drawRect(0, 0, W, H, p);
            p.setShader(null);

            final float unit = Math.min(W, H) / 100f;

            // ─── شعار YCMS داخل إطار مستدير متوهج ───
            float logoSize = unit * 34;
            float pulse = 1f + 0.03f * (float) Math.sin(t * 2.6);
            float ls = logoSize * pulse;
            float lx = cx - ls / 2f, ly = cy - ls / 2f;

            // ظل هالة إضافي حول الإطار
            p.setColor(Color.parseColor("#00D4FF"));
            p.setAlpha(26);
            p.setStyle(Paint.Style.FILL);
            canvas.drawCircle(cx, cy, ls * 0.72f, p);
            p.setAlpha(255);

            if (logo != null) {
                rect.set(lx, ly, lx + ls, ly + ls);
                // إطار متوهج
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(unit * 0.55f);
                p.setColor(Color.parseColor("#00D4FF"));
                p.setAlpha(120);
                float r = ls * 0.22f;
                canvas.drawRoundRect(rect.left - unit, rect.top - unit,
                        rect.right + unit, rect.bottom + unit, r + unit, r + unit, p);
                p.setAlpha(255);
                // الشعار
                p.setStyle(Paint.Style.FILL);
                p.setColor(Color.parseColor("#040A16"));
                canvas.drawRoundRect(rect, r, r, p);
                canvas.drawBitmap(logo, null, rect, p);
            }

            // ─── العنوان ───
            float fadeIn = Math.min(1f, t / 0.7f);
            p.setAlpha((int) (255 * fadeIn));
            p.setColor(Color.WHITE);
            p.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
            p.setTextSize(unit * 8.2f);
            p.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("تطبيق ادارة المدرسة", cx, cy + unit * 26, p);

            p.setColor(Color.parseColor("#8DA4BF"));
            p.setTextSize(unit * 3.4f);
            p.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
            canvas.drawText("نظام EduPro الإداري الأكاديمي • طلاب • طباعة • تقارير", cx, cy + unit * 31.5f, p);

            p.setColor(Color.parseColor("#7FD8FF"));
            p.setTextSize(unit * 3.2f);
            p.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
            canvas.drawText("YCMS — Yemen Coding Company", cx, cy + unit * 37.5f, p);
            p.setAlpha(255);

            // ─── شريط التحميل ───
            float barW = unit * 46, barH = unit * 1.2f;
            float barX = cx - barW / 2f, barY = cy + unit * 43;
            p.setColor(0x22FFFFFF);
            canvas.drawRoundRect(barX, barY, barX + barW, barY + barH, barH, barH, p);
            float prog = Math.min(1f, t / (DURATION_MS / 1000f));
            LinearGradient barGrad = new LinearGradient(barX, barY, barX + barW, barY,
                    Color.parseColor("#00D4FF"), Color.parseColor("#00E676"), Shader.TileMode.CLAMP);
            p.setShader(barGrad);
            if (prog > 0.02f) {
                canvas.drawRoundRect(barX, barY, barX + barW * prog, barY + barH, barH, barH, p);
            }
            p.setShader(null);

            // ─── الحقوق ───
            p.setColor(Color.parseColor("#6D84A3"));
            p.setTextSize(unit * 2.9f);
            p.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
            canvas.drawText("جميع الحقوق محفوظة لشركة YCMS", cx, H - unit * 9.5f, p);
            canvas.drawText("برمجة وتطوير: مازن عبدالوهاب 774047989", cx, H - unit * 5.5f, p);

            if (running && t < DURATION_MS / 1000f + 0.3f) postInvalidateOnAnimation();
        }
    }
}

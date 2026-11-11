package com.ycms.school;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PathMeasure;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import java.util.Random;

/**
 * SplashActivity — المشهد الافتتاحي المبهر Native 100% (بدون WebView).
 * «أنيميشن متطور يناسب المدرسة بنفس أسلوب المحطة»
 *
 * المشهد: سماء ليلية بنجوم تلمع وقمر مكتمل، أرضية تتوهج، مبنى مدرسة
 * يرتفع ويرسم تفصيلاً (جناحان + قسم مركزي بسقف مثلثي وساعة تنبض
 * وثمانية نوافذ تضاء تباعاً وباب مقوس وعلم يرفرف على القمة)،
 * حروف وأرقام متوهجة (أ ب ت / 1 2 3) تطفو كالبالونات، كتاب مفتوح
 * تتنقل صفحاته، قبعة تخرج ترتفع بحلقتها المتأرجحة وينفجر حولها
 * تألق ذهبي، ثم شعار YCMS المتوهج واسم التطبيق والانتقال السلس.
 * المدة ≈ 3.6 ثانية — نقرة واحدة تتخطى المشهد.
 */
public class SplashActivity extends Activity {

    private static final long DURATION_MS = 3600;

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
        w.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        w.setNavigationBarColor(Color.parseColor("#020614"));
        w.setStatusBarColor(Color.parseColor("#020614"));

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
        try {
            startActivity(new Intent(this, MainActivity.class));
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        } catch (Throwable ignored) {}
        finish();
    }

    @Override
    public void onBackPressed() { goNext(); }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(endRun);
        if (scene != null) scene.stop();
        super.onDestroy();
    }

    /* ==================================================================== */

    static class SplashView extends View {

        private static final int SKY_TOP = 0xFF020614;
        private static final int SKY_MID = 0xFF061833;
        private static final int SKY_LOW = 0xFF0A2A52;
        private static final int ACCENT = 0xFF00B4FF;
        private static final int CYAN = 0xFF29B6F6;
        private static final int GOLD = 0xFFFFC107;
        private static final int GOLD_DEEP = 0xFFFF8F00;
        private static final int GROUND = 0xFF040D1E;

        private final long t0 = SystemClock.elapsedRealtime();
        private final Handler anim = new Handler(Looper.getMainLooper());
        private final Runnable tick = new Runnable() {
            @Override public void run() {
                invalidate();
                anim.postDelayed(this, 16);
            }
        };
        private boolean running = true;

        private final Random rnd = new Random(20261111L);

        /* نجوم ثابتة */
        private final float[] starX = new float[80];
        private final float[] starY = new float[80];
        private final float[] starR = new float[80];
        private final float[] starP = new float[80];

        /* حروف وأرقام طائرة: [حرف, نسبة x, تأخير, حجم, لون] */
        private static final char[] FLOAT_CHARS = {'أ', '٢', 'ب', 'A', '٤', 'ت', 'B', '١', '٣', '+', 'ج', 'C'};
        private final float[] floatX = new float[FLOAT_CHARS.length];
        private final float[] floatDelay = new float[FLOAT_CHARS.length];
        private final float[] floatSize = new float[FLOAT_CHARS.length];
        private final int[] floatColor = new int[FLOAT_CHARS.length];

        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint pGlow = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint pText = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint pTextGlow = new Paint(Paint.ANTI_ALIAS_FLAG);

        private float W, H, groundY;
        private Bitmap logo;

        SplashView(android.content.Context ctx) {
            super(ctx);
            for (int i = 0; i < starX.length; i++) {
                starX[i] = rnd.nextFloat();
                starY[i] = rnd.nextFloat() * 0.68f;
                starR[i] = 0.7f + rnd.nextFloat() * 1.9f;
                starP[i] = rnd.nextFloat() * 6.28f;
            }
            for (int i = 0; i < FLOAT_CHARS.length; i++) {
                floatX[i] = 0.06f + rnd.nextFloat() * 0.88f;
                floatDelay[i] = rnd.nextFloat() * 0.9f;
                floatSize[i] = 9f + rnd.nextFloat() * 8f;
                int c = i % 3;
                floatColor[i] = (c == 0) ? GOLD : (c == 1) ? CYAN : 0xFF8ECBFF;
            }
            pTextGlow.setShadowLayer(16, 0, 0, 0xFF1893D8);
            try {
                logo = BitmapFactory.decodeStream(ctx.getAssets().open("www/assets/images/ycms-logo.png"));
            } catch (Throwable t) {
                logo = null;
            }
            anim.postDelayed(tick, 16);
        }

        void stop() {
            running = false;
            anim.removeCallbacks(tick);
        }

        @Override
        protected void onSizeChanged(int w, int h, int ow, int oh) {
            super.onSizeChanged(w, h, ow, oh);
            W = w; H = h;
            groundY = H * 0.78f;
        }

        private static float clamp01(float v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

        /** تقدم مرحلة زمنية: start/end بالثواني */
        private static float phase(float t, float start, float end) {
            return clamp01((t - start) / (end - start));
        }

        @Override
        protected void onDraw(Canvas c) {
            float t = (SystemClock.elapsedRealtime() - t0) / 1000f;
            drawSky(c, t);
            drawMoon(c, t);
            drawStars(c, t);
            drawGround(c, t);
            drawSchool(c, t);
            drawFloatChars(c, t);
            drawBook(c, t);
            drawCap(c, t);
            drawSparkles(c, t);
            drawTitles(c, t);
        }

        /* ------------------------- السماء والقمر ------------------------- */

        private void drawSky(Canvas cv, float t) {
            float a = phase(t, 0f, 0.5f);
            LinearGradient g = new LinearGradient(0, 0, 0, H,
                    SKY_TOP, blend(SKY_TOP, SKY_LOW, a), Shader.TileMode.CLAMP);
            p.setShader(g);
            cv.drawRect(0, 0, W, H, p);
            p.setShader(null);
            /* توهج أفق بعيد */
            pGlow.setShader(new RadialGradient(W * 0.5f, groundY, W * 0.62f,
                    Color.argb((int) (52 * a), 0, 90, 160), Color.TRANSPARENT, Shader.TileMode.CLAMP));
            cv.drawRect(0, H * 0.3f, W, H, pGlow);
            pGlow.setShader(null);
        }

        private void drawMoon(Canvas cv, float t) {
            float a = phase(t, 0.15f, 0.8f);
            if (a <= 0) return;
            float mx = W * 0.84f, my = H * 0.16f, mr = W * 0.05f;
            /* هالة القمر */
            pGlow.setShader(new RadialGradient(mx, my, mr * 3.2f,
                    Color.argb((int) (60 * a), 200, 225, 255), Color.TRANSPARENT, Shader.TileMode.CLAMP));
            cv.drawCircle(mx, my, mr * 3.2f, pGlow);
            pGlow.setShader(null);
            /* القمر مع قصّة لصنع هلال مبتسم */
            p.setColor(Color.argb((int) (245 * a), 235, 244, 255));
            cv.drawCircle(mx, my, mr, p);
            p.setColor(Color.argb((int) (255 * a), SKY_TOP >> 16 & 0xFF, SKY_TOP >> 8 & 0xFF, SKY_TOP & 0xFF));
            cv.drawCircle(mx - mr * 0.42f, my - mr * 0.18f, mr * 0.82f, p);
        }

        private void drawStars(Canvas cv, float t) {
            float base = phase(t, 0.1f, 0.8f);
            if (base <= 0) return;
            for (int i = 0; i < starX.length; i++) {
                float tw = 0.45f + 0.55f * (0.5f + 0.5f * (float) Math.sin(t * 2.1f + starP[i]));
                int a = (int) (200 * base * tw);
                p.setColor(Color.argb(a, 210, 232, 255));
                cv.drawCircle(starX[i] * W, starY[i] * H, starR[i], p);
            }
        }

        private void drawGround(Canvas cv, float t) {
            float a = phase(t, 0.2f, 0.8f);
            p.setColor(Color.argb((int) (255 * a), Color.red(GROUND), Color.green(GROUND), Color.blue(GROUND)));
            cv.drawRect(0, groundY, W, H, p);
            /* خط توهج على سطح الأرض */
            pGlow.setColor(Color.argb((int) (70 * a), 0, 140, 220));
            cv.drawRect(0, groundY - 2, W, groundY + 2, pGlow);
        }

        /* ------------------------- مبنى المدرسة ------------------------- */

        private void drawSchool(Canvas cv, float t) {
            float pr = phase(t, 0.35f, 1.35f);
            if (pr <= 0) return;
            float rise = (1f - pr) * H * 0.14f;
            float alpha = pr;

            float cx = W * 0.5f;
            float bw = W * 0.62f, bh = H * 0.26f;
            float left = cx - bw / 2f, right = cx + bw / 2f;
            float bottom = groundY + rise;
            float top = bottom - bh;

            int wall = Color.argb((int) (255 * alpha), 17, 52, 92);
            int wallDeep = Color.argb((int) (255 * alpha), 10, 34, 62);
            int frame = Color.argb((int) (190 * alpha), 62, 150, 215);
            int goldC = Color.argb((int) (235 * alpha), 255, 193, 7);

            /* الجناحان (أقصر وأعرض) */
            float wingW = bw * 0.34f, wingH = bh * 0.62f;
            p.setStyle(Paint.Style.FILL);
            p.setShader(new LinearGradient(0, bottom - wingH, 0, bottom,
                    wall, wallDeep, Shader.TileMode.CLAMP));
            cv.drawRect(left, bottom - wingH, left + wingW, bottom, p);
            cv.drawRect(right - wingW, bottom - wingH, right, bottom, p);
            p.setShader(null);
            /* إطار الجناحين */
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1.6f, W * 0.0026f));
            p.setColor(frame);
            cv.drawRect(left, bottom - wingH, left + wingW, bottom, p);
            cv.drawRect(right - wingW, bottom - wingH, right, bottom, p);
            p.setStyle(Paint.Style.FILL);

            /* القسم المركزي الأطول */
            float midW = bw * 0.40f;
            float midTop = bottom - bh;
            p.setShader(new LinearGradient(0, midTop, 0, bottom,
                    Color.argb((int) (255 * alpha), 22, 64, 108), wallDeep, Shader.TileMode.CLAMP));
            cv.drawRect(cx - midW / 2, midTop, cx + midW / 2, bottom, p);
            p.setShader(null);
            p.setStyle(Paint.Style.STROKE);
            p.setColor(frame);
            cv.drawRect(cx - midW / 2, midTop, cx + midW / 2, bottom, p);
            p.setStyle(Paint.Style.FILL);

            /* السقف المثلثي فوق القسم المركزي */
            Path roof = new Path();
            roof.moveTo(cx - midW / 2 - W * 0.012f, midTop);
            roof.lineTo(cx, midTop - H * 0.05f);
            roof.lineTo(cx + midW / 2 + W * 0.012f, midTop);
            roof.close();
            p.setColor(Color.argb((int) (255 * alpha), 26, 78, 126));
            cv.drawPath(roof, p);
            p.setStyle(Paint.Style.STROKE);
            p.setColor(goldC);
            cv.drawPath(roof, p);
            p.setStyle(Paint.Style.FILL);

            /* الساعة على الواجهة تنبض */
            float clkR = W * 0.028f;
            float clkY = midTop + bh * 0.14f;
            float beat = 1f + 0.06f * (float) Math.sin(t * 4f);
            pGlow.setShader(new RadialGradient(cx, clkY, clkR * 2.6f,
                    Color.argb((int) (140 * alpha), 255, 214, 90), Color.TRANSPARENT, Shader.TileMode.CLAMP));
            cv.drawCircle(cx, clkY, clkR * 2.6f, pGlow);
            pGlow.setShader(null);
            p.setColor(Color.argb((int) (255 * alpha), 250, 247, 238));
            cv.drawCircle(cx, clkY, clkR * beat, p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1.4f, W * 0.0022f));
            p.setColor(Color.argb((int) (235 * alpha), 122, 90, 14));
            cv.drawCircle(cx, clkY, clkR * beat, p);
            /* عقارب الساعة تدور */
            float ang = t * 1.4f;
            cv.drawLine(cx, clkY, cx + (float) Math.cos(ang - 1.2) * clkR * 0.55f,
                    clkY + (float) Math.sin(ang - 1.2) * clkR * 0.55f, p);
            cv.drawLine(cx, clkY, cx + (float) Math.cos(ang * 3f) * clkR * 0.8f,
                    clkY + (float) Math.sin(ang * 3f) * clkR * 0.8f, p);
            p.setStyle(Paint.Style.FILL);

            /* الباب المقوس المضاء */
            float doorW = midW * 0.2f, doorH = bh * 0.3f;
            float dx = cx - doorW / 2, dy = bottom;
            RectF doorArc = new RectF(dx, dy - doorH, dx + doorW, dy + doorH);
            p.setColor(Color.argb((int) (255 * alpha), 255, 199, 71));
            cv.drawArc(doorArc, 180f, 180f, true, p);
            cv.drawRect(dx, dy - doorH / 2, dx + doorW, dy, p);
            /* خط عمودي للباب */
            p.setColor(Color.argb((int) (220 * alpha), 122, 90, 14));
            p.setStrokeWidth(Math.max(1.4f, W * 0.002f));
            cv.drawLine(cx, dy - doorH, cx, dy, p);

            /* ثمانية نوافذ تضاء تباعاً (4 في الجناحين + 4 في المركز) */
            float ww = bw * 0.052f, wh = bh * 0.115f;
            int lightStep = 0;
            for (int i = 0; i < 8; i++) {
                float wx, wy;
                if (i < 3) { wy = bottom - wingH + bh * 0.10f; }
                else if (i < 6) { wy = bottom - bh * 0.42f; }
                else { wy = bottom - wingH + bh * 0.10f; }
                switch (i) {
                    case 0: wx = left + wingW * 0.18f; break;
                    case 1: wx = left + wingW * 0.55f; break;
                    case 2: wx = left + wingW * 0.80f; break;
                    case 3: wx = cx - midW * 0.30f; break;
                    case 4: wx = cx + midW * 0.14f; break;
                    case 5: wx = cx + midW * 0.32f; break;
                    case 6: wx = right - wingW * 0.45f; break;
                    default: wx = right - wingW * 0.20f; break;
                }
                float lightAt = 1.35f + (lightStep++) * 0.11f;
                float lp = clamp01((t - lightAt) / 0.25f);
                p.setColor(Color.argb((int) ((60 + 130 * lp) * alpha), 12, 40, 66));
                cv.drawRect(wx, wy, wx + ww, wy + wh, p);
                if (lp > 0) {
                    pGlow.setShader(new RadialGradient(wx + ww / 2, wy + wh / 2, ww * 1.6f,
                            Color.argb((int) (170 * lp * alpha), 255, 199, 60), Color.TRANSPARENT, Shader.TileMode.CLAMP));
                    cv.drawRect(wx - ww * 0.8f, wy - wh * 0.8f, wx + ww * 1.8f, wy + wh * 1.8f, pGlow);
                    pGlow.setShader(null);
                    p.setColor(Color.argb((int) (255 * lp * alpha), 255, 205, 80));
                    cv.drawRect(wx, wy, wx + ww, wy + wh, p);
                }
            }

            /* سارية العلم على القمة + علم يرفرف */
            float poleTop = midTop - H * 0.05f;
            cv.drawLine(cx, poleTop, cx, poleTop - H * 0.075f, p);
            float flagH = H * 0.045f, flagW = W * 0.085f;
            float fx = cx, fy = poleTop - H * 0.07f;
            Path flag = new Path();
            flag.moveTo(fx, fy);
            for (int k = 1; k <= 10; k++) {
                float f = k / 10f;
                float wave = (float) Math.sin(t * 6f - f * 5f) * flagH * 0.16f;
                flag.lineTo(fx - flagW * f, fy + f * flagH * 0.28f + wave);
            }
            for (int k = 10; k >= 1; k--) {
                float f = k / 10f;
                float wave = (float) Math.sin(t * 6f - f * 5f) * flagH * 0.16f;
                flag.lineTo(fx - flagW * f, fy + f * flagH * 0.28f + flagH * 0.55f + wave);
            }
            flag.close();
            p.setColor(Color.argb((int) (235 * alpha), 220, 40, 40));
            cv.drawPath(flag, p);
            /* شريط أبيض */
            p.setColor(Color.argb((int) (235 * alpha), 245, 245, 245));
            cv.drawRect(fx - flagW * 0.55f, fy + flagH * 0.30f, fx - flagW * 0.35f, fy + flagH * 0.55f, p);
        }

        /* --------------------- الحروف والأرقام الطافية --------------------- */

        private void drawFloatChars(Canvas cv, float t) {
            float pr = phase(t, 0.9f, 1.5f);
            if (pr <= 0) return;
            pText.setTextAlign(Paint.Align.CENTER);
            for (int i = 0; i < FLOAT_CHARS.length; i++) {
                float lt = (t - 0.9f - floatDelay[i]) * 0.55f;
                if (lt <= 0) continue;
                float cyc = lt % 1.6f;
                float y = groundY - cyc * H * 0.52f;
                float x = floatX[i] * W + (float) Math.sin(lt * 5f + i) * W * 0.012f;
                float a = (cyc < 0.18f ? cyc / 0.18f : (cyc > 1.25f ? Math.max(0f, (1.6f - cyc) / 0.35f) : 1f))
                        * pr;
                float size = floatSize[i] * (W / 390f);
                int col = floatColor[i];
                pText.setTextSize(size);
                pTextGlow.setColor(Color.argb((int) (200 * a), Color.red(col), Color.green(col), Color.blue(col)));
                pTextGlow.setTextSize(size);
                cv.drawText(String.valueOf(FLOAT_CHARS[i]), x, y, pTextGlow);
            }
            pText.setTextAlign(Paint.Align.LEFT);
        }

        /* ------------------------- الكتاب المفتوح ------------------------- */

        private void drawBook(Canvas cv, float t) {
            float pr = phase(t, 1.15f, 1.9f);
            if (pr <= 0) return;
            float bx = W * 0.5f;
            float by = groundY + (1f - pr) * H * 0.06f;
            float bw = W * 0.22f, bh = W * 0.09f;
            float a = pr;

            /* الغلاف */
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(2f, W * 0.004f));
            p.setColor(Color.argb((int) (235 * a), 122, 90, 14));
            Path cover = new Path();
            cover.moveTo(bx - bw / 2, by);
            cover.quadTo(bx, by - bh * 0.55f, bx + bw / 2, by);
            cv.drawPath(cover, p);
            cv.drawLine(bx, by - bh * 0.28f, bx, by, p);
            /* الصفحات اليسرى واليمنى */
            p.setStrokeWidth(Math.max(1.3f, W * 0.0022f));
            p.setColor(Color.argb((int) (215 * a), 205, 228, 252));
            for (int i = 0; i < 4; i++) {
                float f = i / 4f;
                Path pl = new Path();
                pl.moveTo(bx - bw * 0.44f * (1f - f * 0.16f), by - bh * 0.06f * f);
                pl.quadTo(bx - bw * 0.1f, by - bh * (0.42f - f * 0.07f), bx - bw * 0.02f, by - bh * 0.24f - bh * 0.03f * f);
                cv.drawPath(pl, p);
                Path pr2 = new Path();
                pr2.moveTo(bx + bw * 0.44f * (1f - f * 0.16f), by - bh * 0.06f * f);
                pr2.quadTo(bx + bw * 0.1f, by - bh * (0.42f - f * 0.07f), bx + bw * 0.02f, by - bh * 0.24f - bh * 0.03f * f);
                cv.drawPath(pr2, p);
            }
            /* صفحة تتقلب باستمرار */
            float fp = ((t * 0.8f) % 1f);
            Path flip = new Path();
            float flipX = bx + (fp - 0.5f) * bw * 0.7f;
            flip.moveTo(bx, by - bh * 0.26f);
            flip.quadTo(flipX, by - bh * (0.52f - Math.abs(fp - 0.5f) * 0.5f), flipX, by - bh * 0.1f);
            p.setColor(Color.argb((int) (170 * a * (1f - Math.abs(fp - 0.5f))), 240, 247, 255));
            cv.drawPath(flip, p);
            /* توهج المعرفة فوق الكتاب */
            float gl = (float) Math.sin(t * 2.4f) * 0.5f + 0.5f;
            pGlow.setShader(new RadialGradient(bx, by - bh * 0.8f, bw * 0.5f,
                    Color.argb((int) (60 * a * gl), 255, 214, 90), Color.TRANSPARENT, Shader.TileMode.CLAMP));
            cv.drawCircle(bx, by - bh * 0.8f, bw * 0.5f, pGlow);
            pGlow.setShader(null);
            p.setStyle(Paint.Style.FILL);
        }

        /* --------------------- قبعة التخرج والمعرض --------------------- */

        private void drawCap(Canvas cv, float t) {
            float pr = phase(t, 1.55f, 2.35f);
            if (pr <= 0 || pr >= 1) {
                /* بعد الوصول للقمة تظل القبعة معلقة تتهادى */
                if (pr >= 1) {
                    float cx2 = W * 0.5f;
                    float cy2 = H * 0.315f + (float) Math.sin(t * 2.2f) * H * 0.008f;
                    drawCapShape(cv, cx2, cy2, W * 0.075f, (float) Math.sin(t * 2.2f) * 8f, 255);
                }
                return;
            }
            /* مسار القبعة من فوق المبنى إلى موضع الشعار */
            float fromX = W * 0.5f, fromY = groundY - H * 0.30f;
            float toX = W * 0.5f, toY = H * 0.315f;
            float f = 1f - pr; /* pr من 0→1 تعني من البداية للقمة، نعكس للحركة لأعلى */
            float fx = fromX + (toX - fromX) * pr;
            float fy = fromY + (toY - fromY) * pr - (float) Math.sin(pr * Math.PI) * H * 0.06f;
            drawCapShape(cv, fx, fy, W * 0.075f * (0.7f + 0.3f * pr), (float) Math.sin(pr * 8f) * 10f,
                    (int) (255 * clamp01(pr * 3f)));
        }

        private void drawCapShape(Canvas cv, float x, float y, float s, float tilt, int alpha) {
            cv.save();
            cv.rotate(tilt, x, y);
            /* القاعدة (البيريت) */
            p.setColor(Color.argb(alpha, 10, 26, 48));
            Path base = new Path();
            base.moveTo(x - s * 0.55f, y);
            base.quadTo(x, y - s * 0.32f, x + s * 0.55f, y);
            base.quadTo(x, y + s * 0.30f, x - s * 0.55f, y);
            base.close();
            cv.drawPath(base, p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1.5f, s * 0.05f));
            p.setColor(Color.argb(alpha, 62, 150, 215));
            cv.drawPath(base, p);
            p.setStyle(Paint.Style.FILL);
            /* اللوح العلوي الماسي */
            Path top = new Path();
            top.moveTo(x, y - s * 0.72f);
            top.lineTo(x + s * 0.68f, y - s * 0.18f);
            top.lineTo(x, y + s * 0.10f);
            top.lineTo(x - s * 0.68f, y - s * 0.18f);
            top.close();
            p.setColor(Color.argb(alpha, 16, 38, 68));
            cv.drawPath(top, p);
            p.setStyle(Paint.Style.STROKE);
            p.setColor(Color.argb(alpha, 90, 170, 235));
            cv.drawPath(top, p);
            p.setStyle(Paint.Style.FILL);
            /* الحلقة والشرابة الذهبية المتأرجحة */
            float tasselAng = (float) Math.sin(SystemClock.elapsedRealtime() / 220f) * 14f;
            p.setStrokeWidth(Math.max(2f, s * 0.06f));
            p.setColor(Color.argb(alpha, 255, 193, 7));
            cv.drawLine(x + s * 0.28f, y - s * 0.30f,
                    x + s * 0.34f + (float) Math.cos(tasselAng * 0.05f) * s * 0.18f,
                    y + s * 0.42f, p);
            cv.drawCircle(x + s * 0.34f, y + s * 0.46f, s * 0.09f, p);
            cv.drawCircle(x, y - s * 0.72f, s * 0.06f, p);
            p.setStrokeWidth(1f);
            cv.restore();
        }

        /* ------------------------- تألق ذهبي ------------------------- */

        private void drawSparkles(Canvas cv, float t) {
            float pr = phase(t, 2.0f, 2.7f);
            if (pr <= 0 || pr >= 1) return;
            float cx = W * 0.5f, cy = H * 0.315f;
            for (int i = 0; i < 18; i++) {
                float ang = (float) (i / 18.0 * Math.PI * 2 + t * 1.6f);
                float dist = W * (0.10f + 0.16f * pr);
                float sx = cx + (float) Math.cos(ang) * dist;
                float sy = cy + (float) Math.sin(ang) * dist * 0.62f;
                float a = (1f - pr) * 220f;
                p.setColor(Color.argb((int) a, 255, 214, 90));
                cv.drawCircle(sx, sy, Math.max(1.5f, W * 0.0035f * (1f + pr)), p);
            }
        }

        /* ------------------------- العنوان والتذييل ------------------------- */

        private void drawTitles(Canvas cv, float t) {
            float a = phase(t, 2.25f, 2.95f);
            if (a <= 0) return;
            float cx = W / 2f, cy = H * 0.315f;
            final float unit = Math.min(W, H) / 100f;

            /* ─── شعار YCMS داخل إطار مستدير متوهج ─── */
            if (logo != null) {
                float logoSize = unit * 30;
                float pulse = 1f + 0.03f * (float) Math.sin(t * 2.6);
                float ls = logoSize * pulse;
                float lx = cx - ls / 2f, ly = cy - ls / 2f;
                p.setAlpha((int) (255 * a));
                p.setColor(Color.parseColor("#00D4FF"));
                p.setAlpha((int) (26 * a));
                p.setStyle(Paint.Style.FILL);
                cv.drawCircle(cx, cy, ls * 0.74f, p);
                p.setAlpha(255);

                RectF rect = new RectF(lx, ly, lx + ls, ly + ls);
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(unit * 0.55f);
                p.setColor(Color.parseColor("#FFC94A"));
                p.setAlpha((int) (150 * a));
                float r = ls * 0.22f;
                cv.drawRoundRect(rect.left - unit, rect.top - unit,
                        rect.right + unit, rect.bottom + unit, r + unit, r + unit, p);
                p.setAlpha((int) (255 * a));
                p.setStyle(Paint.Style.FILL);
                p.setColor(Color.parseColor("#040A16"));
                cv.drawRoundRect(rect, r, r, p);
                cv.drawBitmap(logo, null, rect, p);
            }

            /* ─── العنوان ─── */
            p.setAlpha((int) (255 * a));
            p.setColor(Color.WHITE);
            p.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
            p.setTextSize(unit * 8.0f);
            p.setTextAlign(Paint.Align.CENTER);
            cv.drawText("تطبيق ادارة المدرسة", cx, cy + unit * 24.5f, p);

            p.setColor(Color.parseColor("#8DA4BF"));
            p.setTextSize(unit * 3.2f);
            p.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
            cv.drawText("نظام EduPro الإداري الأكاديمي • طلاب • درجات • طباعة • تقارير", cx, cy + unit * 30f, p);

            p.setColor(Color.parseColor("#FFD666"));
            p.setTextSize(unit * 3.1f);
            p.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
            cv.drawText("YCMS — Yemen Coding Company", cx, cy + unit * 36f, p);
            p.setAlpha(255);

            /* ─── شريط التحميل ─── */
            float barW = unit * 46, barH = unit * 1.2f;
            float barX = cx - barW / 2f, barY = cy + unit * 42;
            p.setColor(0x22FFFFFF);
            cv.drawRoundRect(barX, barY, barX + barW, barY + barH, barH, barH, p);
            float prog = Math.min(1f, t / (DURATION_MS / 1000f));
            LinearGradient barGrad = new LinearGradient(barX, barY, barX + barW, barY,
                    Color.parseColor("#00D4FF"), Color.parseColor("#FFC107"), Shader.TileMode.CLAMP);
            p.setShader(barGrad);
            if (prog > 0.02f) {
                cv.drawRoundRect(barX, barY, barX + barW * prog, barY + barH, barH, barH, p);
            }
            p.setShader(null);

            /* ─── الحقوق والتوقيعات ─── */
            p.setColor(Color.parseColor("#6D84A3"));
            p.setTextSize(unit * 2.8f);
            p.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
            cv.drawText("جميع الحقوق محفوظة لشركة YCMS", cx, H - unit * 11.5f, p);
            p.setColor(Color.parseColor("#8FB4DE"));
            p.setTextSize(unit * 3.0f);
            p.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
            cv.drawText("برمجة وتطوير: مازن عبدالوهاب — 774047989", cx, H - unit * 7.5f, p);
            p.setColor(Color.parseColor("#FFD666"));
            p.setTextSize(unit * 2.9f);
            cv.drawText("إدارة محاسبية: صدام نجم الدين", cx, H - unit * 3.8f, p);
        }
    }

    private static int blend(int c1, int c2, float f) {
        int r = (int) (Color.red(c1) + (Color.red(c2) - Color.red(c1)) * f);
        int g = (int) (Color.green(c1) + (Color.green(c2) - Color.green(c1)) * f);
        int b = (int) (Color.blue(c1) + (Color.blue(c2) - Color.blue(c1)) * f);
        return Color.rgb(r, g, b);
    }
}

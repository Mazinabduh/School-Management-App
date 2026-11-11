/* =========================================================
   github.js — المزامنة والنسخ الاحتياطي السحابي (GitHubSync)
   عبر GitHub Contents API — الرمز يُدخله المستخدم من صفحة النسخ الاحتياطي
   ========================================================= */
'use strict';

(function () {
  const API = 'https://api.github.com';

  const GitHubSync = {
    cfg() {
      const s = Store.settings();
      return {
        token: s.ghToken || '',
        repo: s.ghRepo || '',          // 'user/repo'
        branch: s.ghBranch || 'main',
        path: s.ghPath || 'backup/edupro-backup.json'
      };
    },

    isConfigured() {
      const c = this.cfg();
      return !!(c.token && c.repo);
    },

    _headers() {
      const c = this.cfg();
      return {
        'Authorization': `Bearer ${c.token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      };
    },

    _url(path) {
      const c = this.cfg();
      return `${API}/repos/${c.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(c.branch)}`;
    },

    /* ---------- اختبار الاتصال ---------- */
    async test() {
      const c = this.cfg();
      if (!c.token || !c.repo) return { ok: false, msg: 'أدخل الرمز واسم المستودع أولاً' };
      try {
        const r = await fetch(`${API}/repos/${c.repo}`, { headers: this._headers() });
        if (r.status === 401) return { ok: false, msg: 'الرمز غير صالح (401)' };
        if (r.status === 404) return { ok: false, msg: 'المستودع غير موجود أو الرمز لا يملك صلاحية (404)' };
        if (!r.ok) return { ok: false, msg: `خطأ من GitHub (${r.status})` };
        const j = await r.json();
        return { ok: true, msg: `متصل ✓ — ${j.full_name}` };
      } catch (e) {
        return { ok: false, msg: 'تعذر الاتصال بالإنترنت' };
      }
    },

    /* ---------- رفع نسخة ---------- */
    async push(dataObj, message) {
      const c = this.cfg();
      if (!c.token || !c.repo) return { ok: false, msg: 'أكمل إعدادات GitHub أولاً' };
      UI.loading(true, 'جارٍ رفع النسخة الاحتياطية…');
      try {
        let sha = null;
        const g = await fetch(this._url(c.path), { headers: this._headers() });
        if (g.ok) { const j = await g.json(); sha = j.sha; }
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataObj, null, 1))));
        const r = await fetch(`${API}/repos/${c.repo}/contents/${c.path.split('/').map(encodeURIComponent).join('/')}`, {
          method: 'PUT',
          headers: this._headers(),
          body: JSON.stringify({
            message: message || `EduPro backup ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
            content,
            branch: c.branch,
            sha: sha || undefined
          })
        });
        if (r.ok || r.status === 200 || r.status === 201) return { ok: true, msg: 'تم رفع النسخة إلى GitHub ✓' };
        const j = await r.json().catch(() => ({}));
        return { ok: false, msg: `فشل الرفع (${r.status}) ${j.message || ''}` };
      } catch (e) {
        return { ok: false, msg: 'تعذر الاتصال: ' + e.message };
      } finally {
        UI.loading(false);
      }
    },

    /* ---------- تنزيل نسخة — نظام المحطة v2026.82 بالنص ----------
       الملفات الأكبر من 1MB لا تُعيد GitHub محتواها (content: null) —
       فيُجلب النص من download_url مثل readJson في المحطة تماماً،
       مع تحويل Base64 الآمن للأسطر عند توفر المحتوى. */
    async pull() {
      const c = this.cfg();
      if (!c.token || !c.repo) return { ok: false, msg: 'أكمل إعدادات GitHub أولاً' };
      UI.loading(true, 'جارٍ تنزيل النسخة الاحتياطية…');
      try {
        const r = await fetch(this._url(c.path), { headers: this._headers() });
        if (r.status === 404) return { ok: false, msg: 'لا توجد نسخة مخزنة بعد في المسار المحدد' };
        if (!r.ok) {
          let detail = '';
          try { const j = await r.json(); detail = j && j.message ? ' — ' + j.message : ''; } catch (e) {}
          return { ok: false, msg: `فشل التنزيل (${r.status})${detail}` };
        }
        const j = await r.json();
        let text = '';
        if (j.content) {
          const bytes = Uint8Array.from(atob(j.content.replace(/\n/g, '')), (ch) => ch.charCodeAt(0));
          text = new TextDecoder().decode(bytes);
        } else if (j.download_url) {
          /* الملفات الأكبر من 1MB لا تُعيد GitHub محتواها — القناة الأولى:
             نفس واجهة Contents مع Accept: application/vnd.github.raw
             (نفس الأصل api.github.com — تتجاوز CORS وتدعم المستودعات الخاصة حتى 100MB)
             والقناة الثانية download_url كما في المحطة v2026.82 (بدون توكن — للمستودعات العامة) */
          let raw = await fetch(this._url(c.path), { headers: { ...this._headers(), 'Accept': 'application/vnd.github.raw' } });
          if (raw.ok) {
            text = await raw.text();
          } else {
            const raw2 = await fetch(j.download_url);
            if (!raw2.ok) return { ok: false, msg: `تعذر جلب محتوى النسخة (${raw.status}/${raw2.status})` };
            text = await raw2.text();
          }
        } else {
          return { ok: false, msg: 'استجابة غير متوقعة من GitHub — تأكد من المسار' };
        }
        let json;
        try { json = JSON.parse(text); } catch (e) { return { ok: false, msg: 'محتوى النسخة تالف (ليس JSON صالحاً)' }; }
        return { ok: true, data: json, sha: j.sha || '', msg: 'تم تنزيل النسخة ✓' };
      } catch (e) {
        return { ok: false, msg: 'تعذر الاتصال: ' + e.message };
      } finally {
        UI.loading(false);
      }
    }
  };

  window.GitHubSync = GitHubSync;
})();

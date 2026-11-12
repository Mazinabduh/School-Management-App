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

    /* ---------- تنزيل نسخة — نظام المحطة v2026.100 بالنص ----------
       ترتيب القنوات الموثوق:
       1) واجهة Contents مع Accept: application/vnd.github.raw (نفس الأصل
          api.github.com — تدعم المستودعات الخاصة والملفات حتى 100MB)
       2) محتوى Base64 من نفس الاستجابة (الملفات الصغيرة)
       3) download_url (المستودعات العامة)
       القبول مرن: نسخة EduPro الكاملة أو أي JSON يحوي بيانات أقسام صالحة. */
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
        /* القناة الأولى: raw عبر نفس واجهة Contents — الأقوى */
        try {
          const raw = await fetch(this._url(c.path), { headers: { ...this._headers(), 'Accept': 'application/vnd.github.raw' } });
          if (raw.ok) text = await raw.text();
        } catch (e) {}
        /* القناة الثانية: Base64 من نفس الاستجابة */
        if (!text && j.content) {
          try {
            const bytes = Uint8Array.from(atob(j.content.replace(/\n/g, '')), (ch) => ch.charCodeAt(0));
            text = new TextDecoder().decode(bytes);
          } catch (e) {}
        }
        /* القناة الثالثة: download_url (عامة فقط) */
        if (!text && j.download_url) {
          const raw2 = await fetch(j.download_url);
          if (raw2.ok) text = await raw2.text();
        }
        if (!text) return { ok: false, msg: 'تعذر جلب محتوى النسخة — تحقق من الاتصال والمسار' };
        let json;
        try { json = JSON.parse(text); } catch (e) { return { ok: false, msg: 'محتوى النسخة تالف (ليس JSON صالحاً)' }; }
        return { ok: true, data: json, sha: j.sha || '', msg: 'تم تنزيل النسخة ✓' };
      } catch (e) {
        return { ok: false, msg: 'تعذر الاتصال: ' + e.message };
      } finally {
        UI.loading(false);
      }
    },

    /* هل الحمولة قابلة للاستعادة؟ — مرن مع كل الصيغ الصادرة من هذا التطبيق */
    isRestorable(data) {
      if (!data || typeof data !== 'object') return false;
      if (data._app && data.settings) return true;               /* نسخة كاملة صادرة من EduPro */
      if (data.format === 'edupro-backup' && data.data) return true; /* نسخة الحصن الخارجية */
      if (data.settings && (data.students || data.employees || data.feeplans || data.grades)) return true;
      return false;
    }
  };

  window.GitHubSync = GitHubSync;
})();

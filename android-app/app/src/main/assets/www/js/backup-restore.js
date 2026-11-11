/* =========================================================
   backup-restore.js — الاستيراد والتصدير والنسخ السحابي (GitHub)
   ========================================================= */
'use strict';

(function () {
  const P = {
    id: 'backup-restore',

    render(root) {
      const s = Store.settings();
      const info = Store.sizeInfo();
      const demo = window.DemoData ? DemoData.counts() : { total: 0, counts: {} };
      root.innerHTML = `<div class="page">
        ${UI.pageHead('☁️ النسخ الاحتياطي والاستعادة')}

        <div class="grid grid-2 mb-16">
          <div class="card">
            <div class="card-title">💾 نسخة محلية (ملف JSON مشفر)</div>
            <p class="muted mb-8">تصدير كل بيانات النظام (طلاب، درجات، حسابات، موظفين…) في ملف واحد، واستعادته على أي جهاز.</p>
            <div class="flex gap-8 wrap">
              <button class="btn btn-primary" data-action="bak:export">⬇️ تصدير نسخة الآن</button>
              <button class="btn btn-soft" data-action="bak:importPick">⬆️ استعادة من ملف</button>
              <input type="file" id="bak-file" accept=".json,application/json" hidden>
            </div>
          </div>
          <div class="card">
            <div class="card-title">🐙 المزامنة السحابية (GitHub)</div>
            <div class="form-grid">
              <div class="field span-2"><label>Personal Access Token (صلاحية repo)</label><input type="password" id="gh-token" value="${H.esc(s.ghToken || '')}" placeholder="ghp_…" dir="ltr"></div>
              <div class="field"><label>المستودع (user/repo)</label><input id="gh-repo" value="${H.esc(s.ghRepo || '')}" placeholder="user/edupro-backup" dir="ltr"></div>
              <div class="field"><label>الفرع</label><input id="gh-branch" value="${H.esc(s.ghBranch || 'main')}" dir="ltr"></div>
              <div class="field span-2"><label>مسار ملف النسخة</label><input id="gh-path" value="${H.esc(s.ghPath || '')}" dir="ltr"></div>
            </div>
            <div class="flex gap-8 wrap">
              <button class="btn btn-primary" data-action="bak:ghSave">💾 حفظ الإعدادات</button>
              <button class="btn btn-soft" data-action="bak:ghTest">🔌 اختبار الاتصال</button>
              <button class="btn btn-gold" data-action="bak:ghPush">☁️ رفع نسخة</button>
              <button class="btn btn-soft" data-action="bak:ghPull">⬇️ تنزيل واستعادة</button>
            </div>
          </div>
        </div>

        <div class="card mb-16" style="border-color:var(--warn)">
          <div class="card-title" style="color:var(--warn)">🧪 البيانات التجريبية</div>
          <p class="muted mb-8">توليد مجموعة كاملة بضغطة واحدة: <b>500 طالب</b> و<b>60 موظفاً</b> و<b>باصات</b> و<b>درجات</b> و<b>أقساط وتحصيل</b> و<b>زي وكتب</b> و<b>رواتب</b> و<b>تعميمات</b> و<b>حركات مالية</b> — لاختبار كل أجزاء البرنامج بأرقام حقيقية.</p>
          ${demo.total ? `<div class="flex gap-8 wrap mb-8" style="flex-wrap:wrap">
            <span class="badge badge-info">👨‍🎓 طلاب: ${H.num(demo.counts.students)}</span>
            <span class="badge badge-success">👥 موظفون: ${H.num(demo.counts.employees)}</span>
            <span class="badge badge-warn">✍️ سجلات درجات: ${H.num(demo.counts.grades)}</span>
            <span class="badge badge-gold">💰 حركات مالية: ${H.num(demo.counts.transactions)}</span>
          </div>` : ''}
          <div class="flex gap-8 wrap">
            <button class="btn btn-primary btn-write" data-action="demo:gen">🧪 توليد البيانات التجريبية (500 طالب + 60 موظف)</button>
            <button class="btn btn-danger-soft" data-action="demo:clear">🗑 حذف البيانات التجريبية${demo.total ? ` (${H.num(demo.total)})` : ''}</button>
          </div>
          <small class="muted" style="display:block;margin-top:8px">تُوسم كل السجلات التجريبية بعلامة خاصة — الحذف ينزعها فقط ولا يمسّ بياناتك الحقيقية أبداً.</small>
        </div>

        <div class="card mb-16">
          <div class="card-title">📊 معلومات التخزين المحلي</div>
          <div class="kv-grid">
            <div class="kv"><small>المستخدم</small><b>${H.esc((AuthGuard.user || {}).name || '')}</b></div>
            <div class="kv"><small>حجم البيانات المشفرة</small><b>${info.usedKB} KB من ~${info.quotaKB} KB</b></div>
            <div class="kv"><small>عدد الطلاب</small><b>${H.num(Store.count('students'))}</b></div>
            <div class="kv"><small>عدد الحركات المالية</small><b>${H.num(Store.count('transactions'))}</b></div>
            <div class="kv"><small>سجلات الدرجات</small><b>${H.num(Store.count('grades'))}</b></div>
            <div class="kv"><small>آخر نسخة محفوظة</small><b>${s.lastBackup ? H.fmtDateTime(s.lastBackup) : '—'}</b></div>
          </div>
        </div>

        <div class="card" style="border-color:var(--danger)">
          <div class="card-title" style="color:var(--danger)">⚠️ منطقة الخطر</div>
          <p class="muted mb-8">مسح كل البيانات وإعادة النظام لحالة المصنع — لا يمكن التراجع!</p>
          <button class="btn btn-danger btn-write" data-action="bak:factory">💥 مسح كل البيانات</button>
        </div>
      </div>`;
    }
  };

  Actions.register('bak', {
    export() {
      const data = Store.export();
      H.download(`edupro-backup-${H.today()}.json`, data, 'application/json');
      Store.setSetting('lastBackup', new Date().toISOString());
      Audit.log('نسخ', 'تصدير نسخة احتياطية محلية');
      UI.toast('تم تصدير النسخة الاحتياطية ✓', 'success');
    },

    importPick() {
      const inp = document.getElementById('bak-file');
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = async () => {
          try {
            const data = JSON.parse(r.result);
            if (!data._app || !data.settings) throw new Error('ملف غير معروف');
            if (!await UI.confirm({ title: 'استعادة نسخة', msg: `نسخة صادرة ${H.fmtDateTime(data._exported)}<br>سيتم دمجها مع البيانات الحالية (الأحدث تُستبدل). متابعة؟`, okLabel: 'استعادة' })) return;
            UI.loading(true, 'جارٍ الاستعادة…');
            await Store.import(data);
            UI.loading(false);
            Audit.log('نسخ', 'استعادة نسخة احتياطية من ملف');
            UI.toast('تمت الاستعادة بنجاح ✓ — سيتم تحديث الواجهة', 'success');
            setTimeout(() => location.reload(), 900);
          } catch (e) {
            UI.loading(false);
            UI.toast('فشل الاستعادة: ' + e.message, 'error');
          }
        };
        r.readAsText(f);
      };
      inp.click();
    },

    ghSave() {
      Store.setSetting('ghToken', document.getElementById('gh-token').value.trim());
      Store.setSetting('ghRepo', document.getElementById('gh-repo').value.trim());
      Store.setSetting('ghBranch', document.getElementById('gh-branch').value.trim() || 'main');
      Store.setSetting('ghPath', document.getElementById('gh-path').value.trim() || 'backup/edupro-backup.json');
      UI.toast('تم حفظ إعدادات GitHub ✓', 'success');
    },

    async ghTest() {
      Actions.call('bak', 'ghSave', {});
      const r = await GitHubSync.test();
      UI.toast(r.msg, r.ok ? 'success' : 'error');
    },

    async ghPush() {
      Actions.call('bak', 'ghSave', {});
      if (!await UI.confirm({ title: 'رفع نسخة', msg: 'رفع نسخة كاملة من البيانات إلى GitHub؟', okLabel: 'رفع' })) return;
      const r = await GitHubSync.push(Store.export());
      if (r.ok) { Store.setSetting('lastBackup', new Date().toISOString()); Audit.log('نسخ', 'رفع نسخة احتياطية إلى GitHub'); }
      UI.toast(r.msg, r.ok ? 'success' : 'error');
    },

    async ghPull() {
      Actions.call('bak', 'ghSave', {});
      const r = await GitHubSync.pull();
      if (!r.ok) return UI.toast(r.msg, 'error');
      if (!await UI.confirm({ title: 'استعادة من GitHub', msg: 'سيتم دمج النسخة السحابية مع البيانات الحالية. متابعة؟', okLabel: 'استعادة' })) return;
      UI.loading(true, 'جارٍ الاستعادة…');
      await Store.import(r.data);
      UI.loading(false);
      Audit.log('نسخ', 'استعادة نسخة من GitHub');
      UI.toast('تمت الاستعادة ✓', 'success');
      setTimeout(() => location.reload(), 900);
    },

    async factory() {
      if (!AuthGuard.isAdmin()) return UI.toast('للمدير فقط', 'error');
      if (!await UI.confirm({ title: 'مسح شامل', msg: 'سيتم حذف <b>كل</b> البيانات نهائياً من هذا الجهاز. هل صدّرت نسخة احتياطية؟<br>اكتب كلمة <b>مسح</b> لتأكيد الإجراء النهائي.', okLabel: 'نعم، امسح الكل', danger: true })) return;
      const d = await UI.form('تأكيد نهائي', [{ name: 'word', label: 'اكتب كلمة: مسح', req: true }]);
      if (!d || d.word.trim() !== 'مسح') return UI.toast('لم يتم التأكيد — أُلغي المسح', 'warn');
      Object.keys(localStorage).filter((k) => k.startsWith('EP_')).forEach((k) => localStorage.removeItem(k));
      location.reload();
    }
  });

  window.Pages = window.Pages || {};
  Pages['backup-restore'] = P;
})();

/* =========================================================
   backup-restore.js — النسخ الاحتياطي والاستعادة — واجهة تطبيق المحطة بالضبط
   نسخة كاملة + نسخ حسب القسم (BackupPro بخيارات لكل قسم)
   + GitHub + استيراد خارجي + مراجعة تكامل + بيانات تجريبية + منطقة الخطر
   ========================================================= */
'use strict';

(function () {

  /* ==================== خيارات أقسام المدرسة (نمط BackupPro) ==================== */
  const BackupPro = {
    sections: {
      students: { label: 'الطلاب', icon: '👨‍🎓', color: 'var(--blue)', col: 'students',
        options: [
          { key: 'full', label: 'النسخة الكاملة (جميع البيانات)', desc: 'الاسم + الرقم + الصف + ولي الأمر + الهاتف + الحالة + الصورة' },
          { key: 'names', label: 'الأسماء فقط', desc: 'الأسماء وأرقام الطلاب فقط' },
          { key: 'contacts', label: 'بيانات الاتصال', desc: 'الاسم + ولي الأمر + الهاتف + العنوان' }
        ] },
      employees: { label: 'الموظفون', icon: '👥', color: 'var(--purple)', col: 'employees',
        options: [
          { key: 'full', label: 'النسخة الكاملة', desc: 'كل بيانات الموظفين والرواتب الأساسية' },
          { key: 'names', label: 'الأسماء والوظائف فقط', desc: 'بدون بيانات الرواتب' }
        ] },
      feeplans: { label: 'الأقساط والفواتير', icon: '🧾', color: 'var(--green)', col: 'feeplans',
        options: [
          { key: 'full', label: 'النسخة الكاملة', desc: 'كل خطط الأقساط بتفاصيل الدفعات' },
          { key: 'unpaid', label: 'غير المسددة فقط', desc: 'الأقساط المتأخرة فقط' },
          { key: 'paid', label: 'المسددة فقط', desc: 'الأقساط المكتملة' }
        ] },
      payments: { label: 'سندات القبض', icon: '💰', color: 'var(--green)', col: 'payments',
        options: [
          { key: 'full', label: 'النسخة الكاملة', desc: 'كل السندات والتحصيلات' },
          { key: 'summary', label: 'الإجماليات فقط', desc: 'إجمالي التحصيل لكل طالب' }
        ] },
      grades: { label: 'الدرجات والنتائج', icon: '✍️', color: 'var(--amber)', col: 'grades',
        options: [
          { key: 'full', label: 'النسخة الكاملة', desc: 'جميع سجلات الدرجات بكافة التفاصيل' },
          { key: 'summary', label: 'ملخص النتائج', desc: 'المجاميع والتقديرات فقط' }
        ] },
      bus: { label: 'الباصات والاشتراكات', icon: '🚌', color: 'var(--cyan)', col: 'busRoutes',
        options: [
          { key: 'full', label: 'النسخة الكاملة', desc: 'المسارات + الاشتراكات معاً' },
          { key: 'routes', label: 'المسارات فقط', desc: 'بدون اشتراكات الطلاب' },
          { key: 'subs', label: 'الاشتراكات فقط', desc: 'اشتراكات الطلاب في الباصات' }
        ] },
      inventory: { label: 'الزي والكتب', icon: '📦', color: 'var(--purple)', col: 'inventory',
        options: [
          { key: 'full', label: 'النسخة الكاملة', desc: 'كل الأصناف والكميات' },
          { key: 'stock', label: 'الكميات الحالية فقط', desc: 'الاسم + الكمية' },
          { key: 'names', label: 'الأسماء فقط', desc: 'أسماء الأصناف بدون كميات' }
        ] },
      transactions: { label: 'حركات الميزانية', icon: '📊', color: 'var(--orange)', col: 'transactions',
        options: [
          { key: 'full', label: 'النسخة الكاملة', desc: 'كل الإيرادات والمصروفات' },
          { key: 'summary', label: 'الإجماليات فقط', desc: 'إجمالي حسب التصنيف' }
        ] },
      users: { label: 'المستخدمون', icon: '👤', color: 'var(--indigo)', col: 'users',
        options: [
          { key: 'full', label: 'النسخة الكاملة', desc: 'كل المستخدمين والصلاحيات' },
          { key: 'names', label: 'الأسماء والصلاحيات فقط', desc: 'بدون كلمات المرور' }
        ] },
      settings: { label: 'الإعدادات', icon: '⚙️', color: 'var(--gray)', col: 'settings',
        options: [
          { key: 'full', label: 'النسخة الكاملة', desc: 'كل الإعدادات والهوية والثيمات' },
          { key: 'school', label: 'بيانات المدرسة فقط', desc: 'الاسم + الشعار + العام الدراسي' },
          { key: 'theme', label: 'الثيم والمظهر فقط', desc: 'إعدادات الثيمات فقط' }
        ] }
    },

    open(sectionKey) {
      const info = this.sections[sectionKey];
      if (!info) return UI.toast('قسم غير معروف', 'error');
      const opts = info.options.map((o, i) => `
        <label style="display:block;padding:14px;background:var(--bg-3);border:2px solid var(--border);border-radius:12px;cursor:pointer;transition:all .2s" onclick="BackupPro._highlight(this)">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <input type="radio" name="backupOpt" value="${o.key}" ${i === 0 ? 'checked' : ''} style="margin-top:4px;width:18px;height:18px;accent-color:var(--blue)">
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:4px">${o.label}</div>
              <div style="font-size:12px;color:var(--text-2);line-height:1.5">${o.desc}</div>
            </div>
          </div>
        </label>`).join('');
      const m = UI.modal({
        title: `💾 نسخ احتياطي — ${info.label}`,
        body: `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;padding:14px;background:linear-gradient(135deg,rgba(0,180,255,.1),rgba(0,255,136,.05));border-radius:12px;border:1px solid rgba(0,180,255,.2)">
            <div style="font-size:32px">${info.icon}</div>
            <div>
              <div style="font-size:17px;font-weight:800;color:${info.color}">${info.label}</div>
              <div style="font-size:12px;color:var(--text-2);margin-top:3px">اختر نوع البيانات المراد نسخها</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">${opts}</div>
          <div style="margin-top:14px;padding:10px;background:rgba(255,193,7,.08);border-right:3px solid var(--amber);border-radius:8px;font-size:12px;color:var(--text-2)">
            💡 سيتم حفظ الملف بصيغة JSON مع التاريخ والوقت
          </div>`,
        foot: [
          { label: 'إلغاء', cls: 'btn-ghost', onClick: (h) => h.close() },
          { label: '📥 إنشاء النسخة', cls: 'btn-primary', onClick: (h) => { h.close(); this._exec(sectionKey); } }
        ]
      });
      m._backupSection = sectionKey;
    },

    _highlight(label) {
      try {
        const parent = label.parentNode;
        parent.querySelectorAll('label').forEach((l) => { l.style.borderColor = 'var(--border)'; l.style.background = 'var(--bg-3)'; });
        label.style.borderColor = 'var(--blue)';
        label.style.background = 'rgba(0,180,255,.06)';
        const radio = label.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      } catch (e) {}
    },

    _exec(sectionKey) {
      try {
        const info = this.sections[sectionKey];
        let chosen = 'full';
        document.querySelectorAll('input[name="backupOpt"]').forEach((r) => { if (r.checked) chosen = r.value; });
        const data = this._extract(sectionKey, chosen);
        const ts = this._ts();
        const payload = {
          format: 'edupro-backup', version: 3, encrypted: false, type: 'section-pro',
          section: sectionKey, sectionLabel: info.label, variant: chosen,
          createdAt: new Date().toISOString(), count: Array.isArray(data) ? data.length : (data ? 1 : 0),
          data
        };
        const filename = `edupro_${sectionKey}_${chosen}_${ts.date}_${ts.time}.json`;
        H.download(filename, payload, 'application/json');
        UI.toast(`تم إنشاء نسخة «${info.label}» ✓ — ${ts.display}`, 'success');
        Audit.log('نسخ', `نسخة احتياطية: ${info.label} (${chosen})`);
      } catch (e) {
        console.error('BackupPro._exec:', e);
        UI.toast('خطأ في إنشاء النسخة: ' + e.message, 'error');
      }
    },

    _extract(sectionKey, variant) {
      const info = this.sections[sectionKey];
      let raw = info.col === 'settings' ? Store.settings() : Store.col(info.col);
      if (sectionKey === 'students') {
        if (variant === 'names') return raw.map((s) => ({ id: s.id, sid: s.sid, name: s.name }));
        if (variant === 'contacts') return raw.map((s) => ({ id: s.id, name: s.name, guardian: s.guardian, phone: s.phone, address: s.address }));
      }
      if (sectionKey === 'employees' && variant === 'names') {
        return raw.map((u) => ({ id: u.id, name: u.name, job: u.job || u.position || '' }));
      }
      if (sectionKey === 'feeplans') {
        if (variant === 'unpaid') return raw.map((p) => ({ ...p, items: (p.items || []).filter((i) => !i.paid) })).filter((p) => p.items.length);
        if (variant === 'paid') return raw.map((p) => ({ ...p, items: (p.items || []).filter((i) => i.paid) })).filter((p) => p.items.length);
      }
      if (sectionKey === 'payments' && variant === 'summary') {
        const byStu = {};
        raw.forEach((p) => { byStu[p.studentId] = (byStu[p.studentId] || 0) + (Number(p.amount) || 0); });
        return Object.entries(byStu).map(([sid, total]) => ({ studentId: sid, total }));
      }
      if (sectionKey === 'grades' && variant === 'summary') {
        return raw.map((g) => ({ id: g.id, studentId: g.studentId, classId: g.classId, subject: g.subject, total: g.total, estimate: g.estimate }));
      }
      if (sectionKey === 'bus') {
        if (variant === 'routes') return Store.col('busRoutes');
        if (variant === 'subs') return Store.col('busSubs');
        return { routes: Store.col('busRoutes'), subs: Store.col('busSubs') };
      }
      if (sectionKey === 'inventory' && variant === 'names') return raw.map((i) => ({ id: i.id, name: i.name }));
      if (sectionKey === 'inventory' && variant === 'stock') return raw.map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit }));
      if (sectionKey === 'transactions' && variant === 'summary') {
        const byCat = {};
        raw.forEach((t) => { const k = t.type + '/' + (t.cat || ''); byCat[k] = (byCat[k] || 0) + (Number(t.amount) || 0); });
        return Object.entries(byCat).map(([k, total]) => ({ key: k, total }));
      }
      if (sectionKey === 'users' && variant === 'names') {
        return raw.map((u) => ({ id: u.id, username: u.username, name: u.name, role: u.role || 'viewer' }));
      }
      if (sectionKey === 'settings') {
        const s = Store.settings();
        if (variant === 'school') return { schoolName: s.schoolName, schoolNameEn: s.schoolNameEn, year: s.year, phone: s.phone, address: s.address, logo: s.logo, slogan: s.slogan };
        if (variant === 'theme') return { theme: s.theme || {} };
      }
      return raw;
    },

    _ts() {
      const d = new Date;
      const pad = (n) => (n < 10 ? '0' + n : '' + n);
      return {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`,
        display: d.toLocaleString('ar-EG')
      };
    },

    /* ---------- استعادة قسم من ملف ---------- */
    async restore(sectionKey, file) {
      const info = this.sections[sectionKey];
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const data = payload.data !== undefined ? payload.data : payload;
        if (!await UI.confirm({ title: 'استعادة قسم', msg: `سيتم دمج بيانات «${info.label}» من الملف مع البيانات الحالية. متابعة؟`, okLabel: 'استعادة' })) return;
        if (info.col === 'settings') {
          const s = Store.settings();
          Object.assign(s, data);
          Store.flush();
        } else if (Array.isArray(data)) {
          const cur = Store.col(info.col).slice();
          data.forEach((rec) => {
            const i = cur.findIndex((x) => x.id && rec.id && x.id === rec.id);
            if (i >= 0) cur[i] = Object.assign({}, cur[i], rec);
            else cur.push(rec);
          });
          Store.setCol(info.col, cur);
          Store.flush();
        }
        Audit.log('نسخ', `استعادة قسم: ${info.label}`);
        UI.toast(`تمت استعادة «${info.label}» ✓`, 'success');
        setTimeout(() => location.reload(), 900);
      } catch (e) {
        UI.toast('فشل الاستعادة: ' + e.message, 'error');
      }
    }
  };
  window.BackupPro = BackupPro;

  /* ==================== الصفحة — بنية المحطة بالضبط ==================== */
  const P = {
    id: 'backup-restore',

    render(root) {
      const s = Store.settings();
      const info = Store.sizeInfo();
      const demo = window.DemoData ? DemoData.counts() : { total: 0, counts: {} };
      const gh = s;
      const sections = [
        ['students', 'الطلاب'], ['employees', 'الموظفون'], ['feeplans', 'الأقساط'], ['payments', 'السندات'],
        ['grades', 'الدرجات'], ['bus', 'الباصات'], ['inventory', 'الزي والكتب'], ['transactions', 'الميزانية'],
        ['users', 'المستخدمون'], ['settings', 'الإعدادات']
      ];

      root.innerHTML = `
      <div class="page">
        <div class="page-head">
          <h2 class="page-title-3d">
            <div class="title-icon-3d si-sky">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="22" height="22">
                <polyline points="21 8 21 21 3 21 3 8"/>
                <rect x="1" y="3" width="22" height="5"/>
              </svg>
            </div>
            النسخ الاحتياطي والاستعادة
          </h2>
        </div>

        <div class="summary-grid">
          <div class="summary-box">
            <div class="summary-lbl">حجم البيانات المشفرة</div>
            <div class="summary-val" style="color:var(--blue)">${info.usedKB} KB</div>
          </div>
          <div class="summary-box">
            <div class="summary-lbl">آخر نسخة محفوظة</div>
            <div class="summary-val" style="color:var(--green);font-size:14px">${s.lastBackup ? H.fmtDateTime(s.lastBackup) : '—'}</div>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>🏰 الحصن المحلي (نظام المحطة)</h3></div>
          <p style="font-size:13px;color:var(--text-2);margin-bottom:10px">مرآة SQLite داخل الأندرويد + نسخ تلقائية خارجية في التنزيلات + استعادة الإقلاع إذا فُقدت البيانات — بدون أي قائمة اختيار مجلد، مثل المحطة بالضبط</p>
          <div style="display:grid;gap:6px;margin-bottom:10px">
            <div id="vaultEngineLine" style="font-size:12.5px;color:var(--text-2);background:var(--bg-3);border-radius:8px;padding:8px 10px">المحرك: جارٍ التهيئة…</div>
            <div id="vaultBackupLine" style="font-size:12.5px;color:var(--text-2);background:var(--bg-3);border-radius:8px;padding:8px 10px">النسخ الاحتياطية: —</div>
            <div id="vaultMirrorLine" style="font-size:12.5px;color:var(--text-2);background:var(--bg-3);border-radius:8px;padding:8px 10px">مرآة SQLite: —</div>
            <div id="vaultModeLine" style="font-size:12.5px;color:var(--text-2);background:var(--bg-3);border-radius:8px;padding:8px 10px">النسخ الخارجية: —</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-primary" data-action="bak:vaultNow">🏰 إنشاء نسخة خارجية الآن</button>
            <button class="btn-secondary" data-action="bak:vaultMode">⏱️ تبديل النسخ التلقائية (${Store.settings().vaultMode === 'auto' || (window.StorageVault && StorageVault.mode() === 'auto') ? 'إيقاف' : 'تشغيل'})</button>
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>💾 نسخة احتياطية كاملة</h3></div>
          <p style="font-size:13px;color:var(--text-2);margin-bottom:12px">إنشاء نسخة احتياطية كاملة أو استعادتها — يتم حفظها بالتاريخ والوقت تلقائياً</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-primary" data-action="bak:export">📥 إنشاء نسخة كاملة</button>
            <button class="btn-secondary" data-action="bak:importPick">📤 استعادة نسخة كاملة</button>
            <input type="file" id="bak-file" accept=".json,application/json" style="display:none">
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>🧩 نسخ احتياطي حسب القسم</h3></div>
          <p style="font-size:13px;color:var(--text-2);margin-bottom:12px">نسخ واستعادة قسم محدد فقط — «خيارات النسخ» يفتح أنواع النسخ لكل قسم (نمط المحطة)</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${sections.map(([key, label]) => {
              const inf = BackupPro.sections[key];
              return `
              <div style="padding:12px;background:var(--bg-3);border-radius:var(--radius-s);border:1px solid var(--border)">
                <div style="font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:8px">${inf.icon} ${label}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <button class="btn-primary" style="padding:8px 12px;font-size:12px" data-action="bak:sectionBackup" data-sec="${key}">📥 خيارات النسخ</button>
                  <button class="btn-secondary" style="padding:8px 12px;font-size:12px" data-action="bak:sectionRestore" data-sec="${key}">📤 استعادة</button>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>🐙 المزامنة السحابية (GitHub)</h3></div>
          <p style="font-size:13px;color:var(--text-2);margin-bottom:12px">النسخ تُحفظ مرتبة بمسار ثابت في المستودع — استعادة على أي جهاز</p>
          <div class="form-grp"><label>GitHub Token</label><input type="password" id="gh-token" class="form-inp" value="${H.esc(gh.ghToken || '')}" placeholder="ghp_xxxx..." dir="ltr"></div>
          <div class="form-grp"><label>المستودع (user/repo)</label><input type="text" id="gh-repo" class="form-inp" value="${H.esc(gh.ghRepo || '')}" dir="ltr"></div>
          <div class="form-grp"><label>الفرع</label><input type="text" id="gh-branch" class="form-inp" value="${H.esc(gh.ghBranch || 'main')}" dir="ltr"></div>
          <div class="form-grp"><label>مسار ملف النسخة</label><input type="text" id="gh-path" class="form-inp" value="${H.esc(gh.ghPath || 'backup/edupro-backup.json')}" dir="ltr"></div>
          <button class="btn-primary" data-action="bak:ghSave" style="margin-bottom:12px">💾 حفظ إعدادات GitHub</button>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-secondary" data-action="bak:ghTest">🔌 اختبار الاتصال</button>
            <button class="btn-primary" data-action="bak:ghPush">📤 رفع إلى GitHub</button>
            <button class="btn-secondary" data-action="bak:ghPull">📥 استعادة من GitHub</button>
          </div>
        </div>

        <div class="card-3d" style="border:1px solid rgba(255,193,7,.35)">
          <div class="card-3d-head"><h3>🧪 البيانات التجريبية</h3></div>
          <p style="font-size:13px;color:var(--text-2);margin-bottom:10px">توليد مجموعة كاملة بضغطة واحدة: <b>500 طالب</b> و<b>60 موظفاً</b> و<b>باصات</b> و<b>درجات</b> و<b>أقساط وتحصيل</b> و<b>زي وكتب</b> و<b>رواتب</b> و<b>حركات مالية</b>.</p>
          ${demo.total ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <span class="sub-badge paid-up">👨‍🎓 طلاب: ${H.num(demo.counts.students)}</span>
            <span class="sub-badge paid-up">👥 موظفون: ${H.num(demo.counts.employees)}</span>
            <span class="sub-badge has-arrears">✍️ سجلات درجات: ${H.num(demo.counts.grades)}</span>
            <span class="sub-badge paid-up">💰 حركات مالية: ${H.num(demo.counts.transactions)}</span>
          </div>` : ''}
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-primary" data-action="demo:gen">🧪 توليد البيانات التجريبية (500 طالب + 60 موظف)</button>
            <button class="btn-danger" data-action="demo:clear">🗑 حذف البيانات التجريبية${demo.total ? ` (${H.num(demo.total)})` : ''}</button>
          </div>
          <small style="display:block;margin-top:8px;color:var(--text-3);font-size:12px">تُوسم كل السجلات التجريبية بعلامة خاصة — الحذف ينزعها فقط ولا يمسّ بياناتك الحقيقية أبداً.</small>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>📂 استيراد بيانات خارجية</h3></div>
          <p style="font-size:13px;color:var(--text-2);margin-bottom:10px">استيراد بيانات من أنظمة أخرى بصيغة JSON وتحليلها تلقائياً</p>
          <button class="btn-secondary" data-action="bak:importPick">📂 اختيار ملف JSON</button>
        </div>

        <div class="card-3d">
          <div class="card-3d-head"><h3>🛡️ مراجعة تكامل البيانات</h3></div>
          <p style="font-size:13px;color:var(--text-2);margin-bottom:10px">التحقق من سلامة القاعدة والترابط بين الأقسام</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn-primary" data-action="bak:integrity">✅ تشغيل المراجعة</button>
          </div>
        </div>

        <div class="card-3d" style="border:1px solid rgba(255,82,82,.4)">
          <div class="card-3d-head"><h3 style="color:var(--red)">⚠️ منطقة الخطر</h3></div>
          <p style="font-size:13px;color:var(--text-2);margin-bottom:10px">مسح كل البيانات وإعادة النظام لحالة المصنع — لا يمكن التراجع!</p>
          <button class="btn-danger" data-action="bak:factory">💥 مسح كل البيانات</button>
        </div>
      </div>`;
    }
  };

  /* ==================== الأفعال ==================== */
  Actions.register('bak', {
    export() {
      const data = Store.export();
      H.download(`edupro-backup-${H.today()}.json`, data, 'application/json');
      Store.setSetting('lastBackup', new Date().toISOString());
      Audit.log('نسخ', 'تصدير نسخة احتياطية كاملة');
      UI.toast('تم تصدير النسخة الاحتياطية الكاملة ✓', 'success');
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
            if (!data._app || !data.settings) throw new Error('ملف غير معروف — هذا ليس ملف نسخة كاملة');
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

    sectionBackup(ds) { BackupPro.open(ds.sec); },
    sectionRestore(ds) {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.onchange = () => { if (inp.files && inp.files[0]) BackupPro.restore(ds.sec, inp.files[0]); };
      inp.click();
    },

    ghSave() {
      const cur = Store.settings();
      const tok = document.getElementById('gh-token').value.trim();
      Store.setSetting('ghToken', tok || cur.ghToken || '');
      Store.setSetting('ghRepo', document.getElementById('gh-repo').value.trim() || cur.ghRepo || '');
      Store.setSetting('ghBranch', document.getElementById('gh-branch').value.trim() || cur.ghBranch || 'main');
      Store.setSetting('ghPath', document.getElementById('gh-path').value.trim() || cur.ghPath || 'backup/edupro-backup.json');
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
      /* فك غلاف الحصن الخارجي إن وُجد */
      let payload = r.data;
      if (payload && payload.format === 'edupro-backup' && payload.data) payload = payload.data;
      /* قبول مرن — نفس حارس الاستعادة الموسع */
      if (!GitHubSync.isRestorable(payload)) {
        return UI.toast('الملف السحابي لا يحتوي بيانات EduPro صالحة — تأكد من المسار', 'error');
      }
      if (!await UI.confirm({ title: 'استعادة من GitHub', msg: `سيتم استبدال البيانات الحالية بالنسخة السحابية.<br>إعدادات GitHub (التوكن والمستودع) لن تُمسّ. متابعة؟`, okLabel: 'استعادة' })) return;
      UI.loading(true, 'جارٍ الاستعادة…');
      try {
        /* حفظ إعدادات GitHub الحالية — لا تُطمس أبداً */
        const cur = Store.settings();
        const keep = { ghToken: cur.ghToken, ghRepo: cur.ghRepo, ghBranch: cur.ghBranch, ghPath: cur.ghPath };
        await Store.import(payload, { replace: true });
        Object.entries(keep).forEach(([k, v]) => { if (v) Store.setSetting(k, v); });
        await Store.flush();
        try { if (window.StorageVault) StorageVault.refreshStatus(); } catch (e) {}
        UI.loading(false);
        Audit.log('نسخ', 'استعادة نسخة من GitHub');
        UI.toast('تمت الاستعادة ✓ — سيتم تحديث الواجهة', 'success');
        setTimeout(() => location.reload(), 900);
      } catch (e) {
        UI.loading(false);
        UI.toast('فشل الاستعادة: ' + e.message, 'error');
      }
    },

    vaultNow() { if (window.StorageVault) StorageVault.backupNow(); },
    vaultMode() {
      if (!window.StorageVault) return;
      const m = StorageVault.mode() === 'auto' ? 'manual' : 'auto';
      StorageVault.setMode(m);
      UI.toast(m === 'auto' ? 'تم تشغيل النسخ التلقائية الخارجية ✓' : 'أُوقفت النسخ التلقائية — النسخ اليدوية فقط', 'success');
      const btn = document.querySelector('[data-action="bak:vaultMode"]');
      if (btn) btn.textContent = m === 'auto' ? '⏱️ تبديل النسخ التلقائية (إيقاف)' : '⏱️ تبديل النسخ التلقائية (تشغيل)';
    },

    integrity() {
      try {
        let issues = [];
        const orphanPlans = Store.col('feeplans').filter((p) => p.studentId && !Store.get('students', p.studentId)).length;
        if (orphanPlans) issues.push(`${orphanPlans} خطة أقساط بدون طالب مرتبط`);
        const orphanGrades = Store.col('grades').filter((g) => g.studentId && !Store.get('students', g.studentId)).length;
        if (orphanGrades) issues.push(`${orphanGrades} سجل درجات بدون طالب مرتبط`);
        const orphanSubs = Store.col('busSubs').filter((b) => b.studentId && !Store.get('students', b.studentId)).length;
        if (orphanSubs) issues.push(`${orphanSubs} اشتراك باص بدون طالب مرتبط`);
        let html = `<div class="summary-grid">
          <div class="summary-box"><div class="summary-lbl">الحالة العامة</div>
            <div class="summary-val" style="color:${issues.length ? 'var(--orange)' : 'var(--green)'}">${issues.length ? 'تحتاج مراجعة' : 'سليمة'}</div></div>
          <div class="summary-box"><div class="summary-lbl">الملاحظات</div><div class="summary-val">${issues.length}</div></div>
        </div>`;
        if (issues.length) {
          html += `<div class="card-3d"><div class="card-3d-head"><h3>الملاحظات المكتشفة</h3></div>
            ${issues.map((i) => `<div style="padding:8px 10px;background:var(--bg-3);border-radius:8px;margin-bottom:6px;font-size:13px;color:var(--text-2)">⚠️ ${H.esc(i)}</div>`).join('')}</div>`;
        } else {
          html += '<div class="empty-box"><div class="empty-icon">✅</div><p>لم يتم اكتشاف أخطاء ترابط</p></div>';
        }
        UI.modal({
          title: '🛡️ مراجعة التكامل',
          body: html,
          foot: [{ label: 'إغلاق', cls: 'btn-ghost', onClick: (h) => h.close() }]
        });
        Audit.log('فحص', 'مراجعة تكامل البيانات');
      } catch (e) {
        UI.toast('خطأ في المراجعة: ' + e.message, 'error');
      }
    },

    async factory() {
      if (!AuthGuard.isAdmin()) return UI.toast('للمدير فقط', 'error');
      if (!await UI.confirm({ title: 'مسح شامل', msg: 'سيتم حذف <b>كل</b> البيانات نهائياً من هذا الجهاز. هل صدّرت نسخة احتياطية؟<br>اكتب كلمة <b>مسح</b> لتأكيد الإجراء النهائي.', okLabel: 'نعم، امسح الكل', danger: true })) return;
      const d = await UI.form('تأكيد نهائي', [{ name: 'word', label: 'اكتب كلمة: مسح', req: true }]);
      if (!d || d.word.trim() !== 'مسح') return UI.toast('لم يتم التأكيد — أُلغي المسح', 'warn');
      try {
        if (window.EduproVault && EduproVault.clear) await EduproVault.clear();
      } catch (e) {}
      Object.keys(localStorage).filter((k) => k.startsWith(Config.PREFIX)).forEach((k) => localStorage.removeItem(k));
      try { indexedDB.deleteDatabase('edupro_school_vault'); } catch (e) {}
      location.reload();
    }
  });

  window.Pages = window.Pages || {};
  Pages['backup-restore'] = P;

  /* تهيئة الحصن المحلي بعد جاهزية الصفحة */
  if (window.StorageVault && !window.__EduproVaultBooted) {
    window.__EduproVaultBooted = true;
    setTimeout(() => { try { StorageVault.init(); } catch (e) {} }, 400);
  }
})();

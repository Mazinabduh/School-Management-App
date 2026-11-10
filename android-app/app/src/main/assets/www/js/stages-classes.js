/* =========================================================
   stages-classes.js — المراحل الدراسية والصفوف والمواد
   ========================================================= */
'use strict';

(function () {
  let tab = 'stages';

  const P = {
    id: 'stages-classes',

    render(root) {
      const stages = Store.sortBy(Store.col('stages'), 'order');
      const classes = Store.col('classes');
      const subjects = Store.col('subjects');

      const tabs = `
        <div class="tabs">
          <button class="tab ${tab === 'stages' ? 'active' : ''}" data-action="stg:tab" data-t="stages">🏫 المراحل (${stages.length})</button>
          <button class="tab ${tab === 'classes' ? 'active' : ''}" data-action="stg:tab" data-t="classes">📚 الصفوف (${classes.length})</button>
          <button class="tab ${tab === 'subjects' ? 'active' : ''}" data-action="stg:tab" data-t="subjects">📖 المواد (${subjects.length})</button>
        </div>`;

      let body = '';
      if (tab === 'stages') {
        body = `
          <div class="grid grid-4 stagger">
            ${stages.map((s) => `
              <div class="stage-card" style="--sc:${s.color}" data-action="stg:stageMenu" data-id="${s.id}">
                <span class="stg-color-dot" style="background:${s.color}"></span>
                <h4>${H.esc(s.name)}</h4>
                <div class="stg-count">${H.num(Store.count('classes', (c) => c.stageId === s.id))} صف • ${H.num(Store.count('students', (x) => x.stageId === s.id))} طالب</div>
              </div>`).join('')}
          </div>
          ${stages.length ? '' : UI.empty('🏫', 'لا توجد مراحل بعد')}
          <div class="text-center mt-16"><button class="btn btn-primary btn-write" data-action="stg:addStage">➕ إضافة مرحلة</button></div>`;
      } else if (tab === 'classes') {
        body = stages.map((st) => {
          const cs = classes.filter((c) => c.stageId === st.id);
          return `<div class="card mb-16">
            <div class="card-title"><span class="flex items-center gap-8"><span class="icon3d sm" style="--ic:${st.color}">🏫</span>${H.esc(st.name)}</span>
              <button class="btn btn-soft btn-sm btn-write" data-action="stg:addClass" data-stage="${st.id}">➕ صف</button></div>
            <div class="flex wrap gap-8">
              ${cs.length ? cs.map((c) => `<span class="class-chip" data-action="stg:classMenu" data-id="${c.id}">${H.esc(c.name)} <small class="muted">(${H.num(Store.count('students', (x) => x.classId === c.id))})</small></span>`).join('') : '<span class="muted">لا صفوف في هذه المرحلة</span>'}
            </div>
          </div>`;
        }).join('') + `<div class="text-center mt-16">${stages.length ? '' : '<span class="muted">أضف مراحل أولاً ثم الصفوف</span>'}</div>`;
      } else {
        body = `
          <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">
            ${subjects.map((s) => `
              <div class="subject-item">
                <span class="sub-ico">${s.icon || '📘'}</span>
                <div style="flex:1"><b>${H.esc(s.name)}</b></div>
                <div class="row-actions">
                  <button class="icon-btn btn-write" data-action="stg:editSubject" data-id="${s.id}" title="تعديل">✏️</button>
                  <button class="icon-btn btn-write" data-action="stg:delSubject" data-id="${s.id}" title="حذف">🗑️</button>
                </div>
              </div>`).join('')}
          </div>
          <div class="text-center mt-16"><button class="btn btn-primary btn-write" data-action="stg:addSubject">➕ إضافة مادة</button></div>`;
      }

      root.innerHTML = `<div class="page">
        ${UI.pageHead('🏫 المراحل والصفوف والمواد', '')}
        ${tabs}
        ${body}
      </div>`;
    },

    /* ---------- نماذج ---------- */
    async stageForm(v) {
      const data = await UI.form(v ? 'تعديل مرحلة' : 'مرحلة دراسية جديدة', [
        { name: 'name', label: 'اسم المرحلة', req: true, value: v && v.name },
        { name: 'color', label: 'لون المرحلة (يُستخدم في البطاقات والكشوف)', type: 'color', value: (v && v.color) || '#0091ea' },
        { name: 'order', label: 'الترتيب', type: 'number', value: (v && v.order) || Store.count('stages') + 1 }
      ]);
      if (!data) return;
      Store.put('stages', v ? Object.assign({}, v, data) : data);
      Audit.log(v ? 'تعديل' : 'إضافة', `مرحلة: ${data.name}`);
      Router.refresh();
    },
    async classForm(stageId, v) {
      const stages = Store.sortBy(Store.col('stages'), 'order');
      const data = await UI.form(v ? 'تعديل صف' : 'صف جديد', [
        { name: 'name', label: 'اسم الصف (مثال: الأول أ)', req: true, value: v && v.name },
        { name: 'stageId', label: 'المرحلة', type: 'select', req: true, options: stages.map((s) => ({ v: s.id, t: s.name })), value: stageId || (v && v.stageId) },
        { name: 'capacity', label: 'الطاقة الاستيعابية', type: 'number', value: (v && v.capacity) || 30 }
      ]);
      if (!data) return;
      Store.put('classes', v ? Object.assign({}, v, data) : data);
      Audit.log(v ? 'تعديل' : 'إضافة', `صف: ${data.name}`);
      Router.refresh();
    },
    async subjectForm(v) {
      const data = await UI.form(v ? 'تعديل مادة' : 'مادة جديدة', [
        { name: 'name', label: 'اسم المادة', req: true, value: v && v.name },
        { name: 'icon', label: 'أيقونة (إيموجي)', value: (v && v.icon) || '📘', hint: 'مثال: 📘 🔢 🔬 🌎' }
      ]);
      if (!data) return;
      Store.put('subjects', v ? Object.assign({}, v, data) : data);
      Audit.log(v ? 'تعديل' : 'إضافة', `مادة: ${data.name}`);
      Router.refresh();
    }
  };

  /* ================= الأفعال ================= */
  Actions.register('stg', {
    tab(ds) { tab = ds.t; P.render(document.getElementById('page-root')); },

    addStage() { if (RBAC.readOnly()) return; P.stageForm(null); },
    editStage(ds) { P.stageForm(Store.get('stages', ds.id)); },
    async delStage(ds) {
      const st = Store.get('stages', ds.id);
      const n = Store.count('classes', (c) => c.stageId === ds.id);
      if (!await UI.confirm({ title: 'حذف مرحلة', msg: `حذف «${H.esc(st.name)}»؟ ${n ? `تنبيه: بها ${n} صف مرتبط!` : ''}`, okLabel: 'حذف', danger: true })) return;
      Store.del('stages', ds.id);
      Audit.log('حذف', `حذف مرحلة: ${st.name}`);
      Router.refresh();
    },
    async stageMenu(ds) {
      const pick = await UI.sheet({
        title: 'المرحلة',
        items: [
          { ico: '➕', label: 'إضافة صف في هذه المرحلة', color: 'ic-green', id: 'ac' },
          { ico: '✏️', label: 'تعديل المرحلة', color: 'ic-blue', id: 'ed' },
          { ico: '🗑️', label: 'حذف المرحلة', color: 'ic-rose', id: 'dl' }
        ]
      });
      if (!pick) return;
      if (pick.id === 'ac') P.classForm(ds.id, null);
      if (pick.id === 'ed') P.stageForm(Store.get('stages', ds.id));
      if (pick.id === 'dl') Actions.call('stg', 'delStage', ds);
    },

    addClass(ds) { if (RBAC.readOnly()) return; P.classForm(ds.stage, null); },
    editClass(ds) { P.classForm(null, Store.get('classes', ds.id)); },
    async delClass(ds) {
      const c = Store.get('classes', ds.id);
      const n = Store.count('students', (x) => x.classId === ds.id);
      if (!await UI.confirm({ title: 'حذف صف', msg: `حذف «${H.esc(c.name)}»؟ ${n ? `تنبيه: يدرس فيه ${n} طالب!` : ''}`, okLabel: 'حذف', danger: true })) return;
      Store.del('classes', ds.id);
      Audit.log('حذف', `حذف صف: ${c.name}`);
      Router.refresh();
    },
    async classMenu(ds) {
      const pick = await UI.sheet({
        title: 'الصف',
        items: [
          { ico: '✏️', label: 'تعديل الصف', color: 'ic-blue', id: 'ed' },
          { ico: '🗑️', label: 'حذف الصف', color: 'ic-rose', id: 'dl' }
        ]
      });
      if (!pick) return;
      if (pick.id === 'ed') P.classForm(null, Store.get('classes', ds.id));
      if (pick.id === 'dl') Actions.call('stg', 'delClass', ds);
    },

    addSubject() { if (RBAC.readOnly()) return; P.subjectForm(null); },
    editSubject(ds) { P.subjectForm(Store.get('subjects', ds.id)); },
    async delSubject(ds) {
      const s = Store.get('subjects', ds.id);
      if (!await UI.confirm({ title: 'حذف مادة', msg: `حذف مادة «${H.esc(s.name)}» وكل درجاتها؟`, okLabel: 'حذف', danger: true })) return;
      Store.del('subjects', ds.id);
      Store.setCol('grades', Store.col('grades').filter((g) => g.subjectId !== ds.id));
      Audit.log('حذف', `حذف مادة: ${s.name}`);
      Router.refresh();
    }
  });

  window.Pages = window.Pages || {};
  Pages['stages-classes'] = P;
})();

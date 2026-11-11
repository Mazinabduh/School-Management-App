/* =========================================================
   ui.js — محرك واجهة المستخدم (Notify / Dialog / Modal / Form)
   - سجل الأفعال Actions: كل زر في التطبيق = data-action="ns:fn"
     يُنفَّذ عبر تفويض الأحداث — لا انقطاع مهما أعيد رسم الصفحة،
     وأي فعل مفقود يظهر تنبيه خطأ فورياً (لا فشل صامت أبداً)
   - UI.form: منشئ نماذج قياسي لكل الوحدات
   ========================================================= */
'use strict';

/* ================= سجل الأفعال الموحد ================= */
window.Actions = {
  reg: {},
  register(ns, map) { this.reg[ns] = Object.assign(this.reg[ns] || {}, map); },
  call(ns, fn, ds, el, e) {
    const m = this.reg[ns];
    const f = m && m[fn];
    if (typeof f !== 'function') {
      console.error(`[Actions] فعل مفقود: ${ns}:${fn}`);
      if (window.UI) UI.toast(`خطأ برمجي: الفعل ${ns}:${fn} غير مسجل — أبلغ المهندس`, 'error');
      return;
    }
    try { f(ds || {}, el, e); }
    catch (err) {
      console.error(`[Actions] خطأ في ${ns}:${fn}`, err);
      if (window.UI) UI.toast('حدث خطأ غير متوقع: ' + err.message, 'error');
    }
  }
};

/* ================= الواجهة ================= */
(function () {
  const modalStack = [];

  const UI = {
    /* ---------- Toast ---------- */
    toast(msg, type = 'info', ms = 3000) {
      const root = document.getElementById('toast-root');
      if (!root) return;
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      const ico = { info: 'ℹ️', success: '✅', error: '⛔', warn: '⚠️' }[type] || 'ℹ️';
      t.innerHTML = `<span>${ico}</span><span style="flex:1">${msg}</span>`;
      root.appendChild(t);
      setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
    },
    notify(msg, type) { this.toast(msg, type); },

    /* ---------- Modal ---------- */
    modal({ title = '', body = '', foot = [], wide = false, onMount = null, bare = false }) {
      const root = document.getElementById('modal-root');
      const back = document.createElement('div');
      back.className = 'modal-backdrop';
      const h = {
        el: back,
        closed: false,
        close: () => {
          if (h.closed) return;
          h.closed = true;
          back.remove();
          const i = modalStack.indexOf(h);
          if (i >= 0) modalStack.splice(i, 1);
          if (typeof h.onClose === 'function') h.onClose();
        },
        onClose: null,
        body: null
      };
      if (bare) {
        back.innerHTML = body;
        back.querySelector('[data-close]') && back.querySelector('[data-close]').addEventListener('click', () => h.close());
      } else {
        const footHtml = Array.isArray(foot)
          ? foot.map((b, i) => `<button class="btn ${b.cls || 'btn-ghost'}" data-mbtn="${i}">${b.icon ? b.icon + ' ' : ''}${b.label}</button>`).join('')
          : (foot || '');
        back.innerHTML = `
          <div class="modal" ${wide ? 'style="max-width:860px"' : ''} role="dialog" aria-modal="true">
            <div class="modal-head">
              <h3>${title}</h3>
              <button class="icon-btn" data-mclose aria-label="إغلاق">✕</button>
            </div>
            <div class="modal-body"></div>
            ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ''}
          </div>`;
        const bodyEl = back.querySelector('.modal-body');
        if (typeof body === 'string') bodyEl.innerHTML = body;
        else if (body instanceof HTMLElement) bodyEl.appendChild(body);
        h.body = bodyEl;
        back.querySelector('[data-mclose]').addEventListener('click', () => h.close());
        if (Array.isArray(foot)) back.querySelectorAll('[data-mbtn]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const f = foot[+btn.dataset.mbtn];
            if (f && typeof f.onClick === 'function') f.onClick(h);
          });
        });
      }
      back.addEventListener('click', (e) => { if (e.target === back) h.close(); });
      root.appendChild(back);
      modalStack.push(h);
      if (typeof onMount === 'function') onMount(h);
      return h;
    },

    /* ---------- تأكيد ---------- */
    confirm({ title = 'تأكيد', msg = 'هل أنت متأكد؟', okLabel = 'تأكيد', danger = false } = {}) {
      return new Promise((res) => {
        let settled = false;
        const done = (v) => { if (!settled) { settled = true; res(v); } };
        const m = this.modal({
          title,
          body: `<div class="confirm-box"><div class="cb-ico">${danger ? '⚠️' : '❓'}</div><p>${msg}</p></div>`,
          foot: [
            { label: 'إلغاء', cls: 'btn-ghost', onClick: (h) => { done(false); h.close(); } },
            { label: okLabel, cls: danger ? 'btn-danger' : 'btn-primary', onClick: (h) => { done(true); h.close(); } }
          ]
        });
        m.onClose = () => done(false);   /* إغلاق خارجي فقط (X/Esc/خلفية) */
      });
    },

    /* ---------- نموذج قياسي ---------- */
    form(title, fields, opts = {}) {
      return new Promise((res) => {
        let settled = false;
        const done = (v) => { if (!settled) { settled = true; res(v); } };
        const html = fields.map((f, i) => this._fieldHTML(f, i)).join('');
        const m = this.modal({
          title,
          body: `<form id="ui-form" novalidate>${html}</form>`,
          foot: [
            { label: 'إلغاء', cls: 'btn-ghost', onClick: (h) => { done(null); h.close(); } },
            { label: opts.saveLabel || '💾 حفظ', cls: 'btn-primary', onClick: (h) => {
                const data = this._readForm(h.body, fields);
                if (data === null) return;   // خطأ تحقق (ظهر toast)
                done(data);                  /* الحسم قبل الإغلاق — جوهري */
                h.close();
              } }
          ]
        });
        m.onClose = () => done(null);      /* إغلاق خارجي فقط */
        /* تركيز أول حقل */
        setTimeout(() => {
          const first = m.body.querySelector('input,select,textarea');
          if (first && first.type !== 'file' && !('ontouchstart' in window && window.innerWidth < 640)) first.focus();
        }, 60);
      });
    },

    _fieldHTML(f, i) {
      const req = f.req ? ' <span class="req">*</span>' : '';
      const span = f.span ? 'style="grid-column:span 2"' : '';
      const val = f.value === undefined || f.value === null ? '' : f.value;
      let inner = '';
      switch (f.type) {
        case 'select':
          inner = `<select name="${f.name}" ${f.req ? 'required' : ''}>
            <option value="">— اختر —</option>
            ${(f.options || []).map((o) => `<option value="${String(o.v).replace(/"/g, '&quot;')}" ${String(val) === String(o.v) ? 'selected' : ''}>${o.t}</option>`).join('')}
          </select>`;
          break;
        case 'textarea':
          inner = `<textarea name="${f.name}" rows="${f.rows || 3}" placeholder="${f.placeholder || ''}" ${f.req ? 'required' : ''}>${val}</textarea>`;
          break;
        case 'switch':
          return `<div class="field" ${span}><label class="switch"><input type="checkbox" name="${f.name}" ${val ? 'checked' : ''}><span class="track"></span><span>${f.label}</span></label>${f.hint ? `<small class="muted" style="display:block;margin-top:3px">${f.hint}</small>` : ''}</div>`;
        case 'photo':
          return `<div class="field" ${span}>
            <label>${f.label}${req}</label>
            <div class="flex items-center gap-12">
              <img class="photo-preview" data-photo-prev="${f.name}" src="${val || 'assets/images/default-avatar.png'}" alt="">
              <input type="file" accept="image/*" data-photo-input="${f.name}" style="flex:1">
              <input type="hidden" name="${f.name}" value="${val}">
            </div>${f.hint ? `<small class="muted">${f.hint}</small>` : ''}</div>`;
        case 'color':
          inner = `<input type="color" name="${f.name}" value="${val || '#0091ea'}" style="height:44px;padding:4px">`;
          break;
        case 'number':
          inner = `<input type="number" name="${f.name}" value="${val}" placeholder="${f.placeholder || ''}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} step="${f.step || 'any'}" ${f.req ? 'required' : ''}>`;
          break;
        case 'date':
          inner = `<input type="date" name="${f.name}" value="${val}" ${f.req ? 'required' : ''}>`;
          break;
        default:
          inner = `<input type="${f.type || 'text'}" name="${f.name}" value="${String(val).replace(/"/g, '&quot;')}" placeholder="${f.placeholder || ''}" ${f.req ? 'required' : ''}>`;
      }
      return `<div class="field" ${span}><label>${f.label}${req}</label>${inner}${f.hint ? `<small class="muted" style="display:block;margin-top:3px">${f.hint}</small>` : ''}</div>`;
    },

    _readForm(rootEl, fields) {
      const out = {};
      for (const f of fields) {
        const el = rootEl.querySelector(`[name="${f.name}"]`);
        if (!el) continue;
        let v;
        if (f.type === 'switch') v = el.checked;
        else if (f.type === 'photo') v = el.value || '';
        else v = el.value.trim();
        if (f.type === 'number') v = v === '' ? (f.allowEmpty ? '' : 0) : parseFloat(v);
        if (f.req && (v === '' || v === null || v === undefined)) {
          this.toast(`الحقل «${f.label}» مطلوب`, 'warn');
          el.focus();
          return null;
        }
        out[f.name] = v;
      }
      return out;
    },

    /* ---------- ورقة سفلية (قائمة خيارات) — أيقونات 3D بنمط المحطة ---------- */
    sheet({ title = 'خيارات', items = [] }) {
      return new Promise((res) => {
        const back = document.createElement('div');
        back.className = 'modal-backdrop';
        const itemHTML = (it, i) => {
          const isPng = typeof it.ico === 'string' && it.ico.startsWith('nav-');
          const icoInner = isPng
            ? `<span class="si-ico"><img src="assets/icons/${it.ico}.png" alt="" loading="lazy"></span>`
            : `<span class="si-ico"><span class="icon3d ${it.color || 'ic-blue'}">${it.ico || '•'}</span></span>`;
          return `
            <button class="sheet-item" data-i="${i}" style="width:100%">
              ${icoInner}
              <span class="ni-label"><b style="font-size:13.5px">${it.label}</b>${it.sub ? `<br><small class="muted">${it.sub}</small>` : ''}</span>
              <span class="si-arrow">◂</span>
            </button>`;
        };
        back.innerHTML = `
          <div class="modal" style="border-radius:22px 22px 0 0">
            <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-x aria-label="إغلاق">✕</button></div>
            <div class="modal-body" style="padding:8px">
              ${items.map(itemHTML).join('')}
            </div>
          </div>`;
        const done = (v) => { back.remove(); res(v); };
        back.addEventListener('click', (e) => {
          if (e.target === back || e.target.closest('[data-x]')) return done(null);
          const b = e.target.closest('[data-i]');
          if (b) done(items[+b.dataset.i]);
        });
        document.getElementById('modal-root').appendChild(back);
      });
    },

    /* ---------- شاشة تحميل ---------- */
    _loadEl: null,
    loading(show, text = 'جارٍ المعالجة…') {
      if (show) {
        if (!this._loadEl) {
          this._loadEl = document.createElement('div');
          this._loadEl.style.cssText = 'position:fixed;inset:0;z-index:160;background:rgba(3,11,26,.45);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#fff;font-weight:800';
          this._loadEl.innerHTML = '<div class="spinner" style="border-top-color:#00d4ff;width:38px;height:38px;border-width:4px"></div><span id="load-txt"></span>';
          document.body.appendChild(this._loadEl);
        }
        this._loadEl.querySelector('#load-txt').textContent = text;
        this._loadEl.style.display = 'flex';
      } else if (this._loadEl) this._loadEl.style.display = 'none';
    },

    /* ---------- عناصر HTML مساعدة ---------- */
    /* خريطة الرموز → أيقونات 3D حقيقية (بنمط المحطة) */
    ICO_MAP: {
      '🏠': 'nav-home', '👨‍🎓': 'nav-students', '🏫': 'nav-stages', '✍️': 'nav-grades',
      '🏅': 'nav-results', '💰': 'nav-finance', '🧾': 'nav-installments', '👕': 'nav-store',
      '🚌': 'nav-bus', '👥': 'nav-employees', '💵': 'nav-payroll', '🪪': 'nav-cards',
      '📣': 'nav-communications', '📊': 'nav-reports', '⚙️': 'nav-settings',
      '☁️': 'nav-backup', '🛡️': 'nav-audit', '🎓': 'nav-students', '🏆': 'nav-certificate',
      '🧪': 'nav-demo', '🎨': 'nav-themes', '🔑': 'nav-password', '👤': 'nav-user',
      'ℹ️': 'nav-about', '🚪': 'nav-logout', '💾': 'nav-backup', '🖨️': 'nav-print', '📁': 'nav-backup'
    },
    pageHead(title, actionsHTML = '', sub = '') {
      /* استخراج الرمز الأول من العنوان وتحويله لأيقونة 3D بنمط المحطة */
      let ico = '';
      const m = title.match(/^(\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]\uFE0F?|⚠️|ℹ️|✅|⛔)/);
      if (m) {
        ico = this.ICO_MAP[m[0]] || '';
        title = title.slice(m[0].length).trim();
      }
      return `<div class="page-head">
        <h2 class="page-title-3d">
          ${ico ? `<span class="title-icon-3d ti-blue"><img class="nav-icon-3d" src="assets/icons/${ico}.png" alt="" loading="lazy" style="width:60%;height:60%;object-fit:contain"></span>` : ''}
          <span>${title}</span>
        </h2>
        ${sub ? `<div class="page-date">${sub}</div>` : ''}
        ${actionsHTML ? `<div class="actions">${actionsHTML}</div>` : ''}
      </div>`;
    },
    icon(ico, color = 'ic-blue', size = '') {
      return `<span class="icon3d ${color} ${size}">${ico}</span>`;
    },
    badge(text, cls = 'badge-muted') { return `<span class="badge ${cls}">${text}</span>`; },
    empty(ico = '📭', text = 'لا توجد بيانات بعد', actionHTML = '') {
      return `<div class="empty-state"><div class="big">${ico}</div><p>${text}</p><div class="mt-8">${actionHTML}</div></div>`;
    },
    money(n) {
      const cur = (window.Store && Store.ready) ? Store.getSetting('currency', 'ريال') : 'ريال';
      return this.num(n) + ' ' + cur;
    },
    num(n, d = 0) {
      const v = parseFloat(n) || 0;
      return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d > 0 ? 2 : 0 });
    },

    /* اختيار صورة مضغوطة */
    pickPhoto(cb, maxPx = 500) {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.onchange = () => {
        const file = inp.files && inp.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            cb(c.toDataURL('image/jpeg', 0.86));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      };
      inp.click();
    }
  };

  /* ربط حقول الصورة بالمعاينة (تفويض عام) */
  document.addEventListener('change', (e) => {
    const inp = e.target.closest('[data-photo-input]');
    if (!inp || !inp.files || !inp.files[0]) return;
    const name = inp.dataset.photoInput;
    const hidden = inp.parentElement.querySelector(`input[type="hidden"][name="${name}"]`);
    const prev = inp.closest('.field').querySelector(`[data-photo-prev="${name}"]`);
    UI.pickPhoto((dataURL) => {
      if (hidden) hidden.value = dataURL;
      if (prev) prev.src = dataURL;
    }, 520);
  });

  window.UI = UI;
})();

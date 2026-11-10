/* =========================================================
   report-intl.js — محرك الكشوفات الدولية A4
   معاينة قبل الطباعة + طباعة iframe + قوالب جاهزة
   ========================================================= */
'use strict';

(function () {
  const ReportIntl = {

    /* ================= معاينة + خيارات ================= */
    preview(html, { title = 'مستند', orientation = 'portrait' } = {}) {
      const o = PrintSettingsEngine.opts();
      const m = UI.modal({
        title: `👁️ معاينة: ${title}`,
        wide: true,
        body: `<div style="background:var(--bg-2);padding:14px;border-radius:14px;overflow:auto;max-height:64vh">
                 <div style="max-width:${orientation === 'landscape' ? '1000px' : '760px'};margin:0 auto;box-shadow:var(--sh-3);border-radius:12px;overflow:hidden;background:#fff">
                 ${html}
                 </div></div>`,
        foot: [
          { label: 'إغلاق', cls: 'btn-ghost', onClick: (h) => h.close() },
          { label: '📄 تنزيل PDF', cls: 'btn-gold', onClick: (h) => { h.close(); PDFEnterprise.download(html, `${title}.pdf`, orientation); } },
          { label: '🖨️ طباعة', cls: 'btn-primary', onClick: (h) => { h.close(); ReportIntl.print(html, { orientation }); } }
        ]
      });
      return m;
    },

    /* ================= طباعة مباشرة ================= */
    print(html, { orientation = 'portrait' } = {}) {
      PrintSettingsEngine.print(html, { orientation });
    },

    /* ================= قالب جدول عام ================= */
    genericTableHTML(title, headers, rows, foot = '') {
      const o = PrintSettingsEngine.opts();
      const theme = o.theme === 'purple' ? 'purple' : o.theme;
      return `
      <div class="print-doc intl-doc doc-theme-${theme}">
        <div class="pd-page">
          ${ThemesKit.headerHTML(title)}
          <table>
            <thead><tr>${headers.map((h, i) => `<th ${i <= 1 ? 'style="text-align:right"' : ''}>${H.esc(h)}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.length ? rows.map((r) => `<tr>${r.map((c, i) => `<td ${i <= 1 ? 'style="text-align:right"' : ''}>${H.esc(c)}</td>`).join('')}</tr>`).join('')
                : `<tr><td colspan="${headers.length}" style="text-align:center;padding:18px">لا توجد بيانات</td></tr>`}
            </tbody>
            ${foot ? `<tfoot><tr><td colspan="${Math.max(1, headers.length - 1)}" style="text-align:left;font-weight:900">${H.esc(foot)}</td><td></td></tr></tfoot>` : ''}
          </table>
          ${ThemesKit.footerHTML()}
        </div>
      </div>`;
    },

    /* ================= كشف درجات مادة لصف ================= */
    gradeSheetHTML(d) {
      const o = PrintSettingsEngine.opts();
      const theme = o.theme === 'purple' ? 'purple' : o.theme;
      return `
      <div class="print-doc intl-doc doc-theme-${theme}">
        <div class="pd-page">
          ${ThemesKit.headerHTML(`كشف درجات: ${d.subject} — ${d.klass}`)}
          <table style="margin-bottom:9px"><tbody>
            <tr><th style="width:22%">المرحلة</th><td>${H.esc(d.stage)}</td><th style="width:18%">الصف</th><td>${H.esc(d.klass)}</td></tr>
            <tr><th>المادة</th><td>${H.esc(d.subject)}</td><th>${H.esc(d.termLabel)}</th><td>من ${d.mx} درجة</td></tr>
          </tbody></table>
          <table>
            <thead><tr><th>#</th><th style="text-align:right">الطالب</th><th>الرقم</th>
              ${d.ps.map((p) => `<th>${H.esc(p.label)}<br><small>من ${p.max || ''}</small></th>`).join('')}
              <th>المجموع</th><th>النسبة</th><th>التقدير</th></tr></thead>
            <tbody>
              ${d.rows.map((r, i) => `<tr>
                <td>${i + 1}</td><td style="text-align:right">${H.esc(r.name)}</td><td class="num">${H.esc(r.sid || '')}</td>
                ${r.vals.map((v) => `<td>${H.esc(v)}</td>`).join('')}
                <td><b>${H.num(r.total)}</b></td><td>${r.pct}%</td><td>${H.esc(r.grade)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="pd-foot">
            <span>معلم المادة: ..................</span>
            <span>مدير المدرسة: ..................</span>
          </div>
          ${ThemesKit.footerHTML()}
        </div>
      </div>`;
    },

    /* ================= سند قبض A4 رسمي ================= */
    receiptA4HTML(pay, student) {
      const o = PrintSettingsEngine.opts();
      const theme = o.theme === 'purple' ? 'purple' : o.theme;
      const s = Store.settings();
      let itemLabel = 'دفعة على الحساب';
      if (pay.itemId) {
        const p = Store.find('feeplans', (x) => x.studentId === pay.studentId);
        const it = p && (p.items || []).find((i) => i.id === pay.itemId);
        if (it) itemLabel = it.label;
      }
      return `
      <div class="print-doc intl-doc doc-theme-${theme}">
        <div class="pd-page">
          ${ThemesKit.headerHTML('سند قبض رسمي', pay.receiptNo)}
          <table style="margin-bottom:10px"><tbody>
            <tr><th style="width:24%">رقم السند</th><td><b class="num">${H.esc(pay.receiptNo)}</b></td><th style="width:20%">التاريخ</th><td>${H.fmtDate(pay.date)}</td></tr>
            <tr><th>استلمنا من</th><td colspan="3"><b>${H.esc(student.name)}</b> — رقم الطالب: <span class="num">${H.esc(student.sid || '')}</span></td></tr>
            <tr><th>مقابل</th><td colspan="3">${H.esc(itemLabel)}</td></tr>
            <tr><th>طريقة الدفع</th><td>${H.esc(pay.method || 'نقداً')}</td><th>المبلغ</th><td><b style="font-size:16px" class="num">${H.money(pay.amount)}</b></td></tr>
          </tbody></table>
          <div style="border:1.5px solid #9db1c9;border-radius:9px;padding:10px 13px;font-size:12.5px;background:#f8fafd">
            💬 المبلغ كتابةً: <b>${H.tafqitMoney(pay.amount)}</b>
            ${pay.note ? `<br>📝 ملاحظات: ${H.esc(pay.note)}` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:26px;gap:14px;flex-wrap:wrap">
            <div style="text-align:center"><div style="border-top:2px dotted #7c8fa5;width:150px;margin-bottom:4px"></div><small>توقيع المستلم</small></div>
            <div style="text-align:center">
              <img src="${H.qrcode(`RECEIPT|${pay.receiptNo}|${pay.amount}|${pay.date}`)}" style="width:70px;height:70px" alt="QR">
              <br><small>امسح للتحقق</small>
            </div>
            <div style="text-align:center"><div style="border-top:2px dotted #7c8fa5;width:150px;margin-bottom:4px"></div><small>${H.esc(s.issuedBy || 'إدارة المدرسة')}</small></div>
          </div>
          ${ThemesKit.footerHTML()}
        </div>
      </div>`;
    },

    /* ================= كشف حساب طالب ================= */
    statementHTML({ student, plan, payments }) {
      const o = PrintSettingsEngine.opts();
      const theme = o.theme === 'purple' ? 'purple' : o.theme;
      const items = (plan && plan.items) || [];
      const totalDue = H.sum(items, (i) => i.amount);
      const totalPaid = H.sum(payments, (p) => p.amount);
      const balance = totalDue - totalPaid;
      const cls = (Store.get('classes', student.classId) || {}).name || '';

      /* كشف حركة موحد: مستحقات + مدفوعات */
      const ledger = [
        ...items.map((i) => ({ date: i.due || student.created, desc: `استحقاق: ${i.label}`, debit: i.amount, credit: 0 })),
        ...payments.map((p) => ({ date: p.date, desc: `سند قبض ${p.receiptNo} (${p.method})`, debit: 0, credit: p.amount }))
      ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

      let run = 0;
      const rows = ledger.map((l) => {
        run += (l.debit || 0) - (l.credit || 0);
        return `<tr><td class="num">${H.fmtDate(l.date)}</td><td style="text-align:right">${H.esc(l.desc)}</td>
          <td>${l.debit ? H.num(l.debit) : '—'}</td><td>${l.credit ? H.num(l.credit) : '—'}</td><td><b class="num">${H.num(H.round2(run))}</b></td></tr>`;
      }).join('');

      return `
      <div class="print-doc intl-doc doc-theme-${theme}">
        <div class="pd-page">
          ${ThemesKit.headerHTML('كشف حساب طالب')}
          <table style="margin-bottom:9px"><tbody>
            <tr><th style="width:18%">الطالب</th><td><b>${H.esc(student.name)}</b></td><th style="width:14%">الرقم</th><td class="num">${H.esc(student.sid || '')}</td></tr>
            <tr><th>الصف</th><td>${H.esc(cls)}</td><th>التاريخ</th><td>${H.fmtDate(H.today())}</td></tr>
          </tbody></table>
          <table>
            <thead><tr><th>التاريخ</th><th style="text-align:right">البيان</th><th>مدين (مستحق)</th><th>دائن (مدفوع)</th><th>الرصيد</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:14px">لا حركات</td></tr>'}</tbody>
            <tfoot><tr>
              <td colspan="2" style="text-align:left"><b>إجمالي المستحق: ${H.money(totalDue)}</b> • <b>المسدد: ${H.money(totalPaid)}</b></td>
              <td colspan="3" style="color:${balance > 0 ? '#b91c1c' : '#15803d'}"><b>الرصيد المتبقي: ${H.money(balance)}</b></td>
            </tr></tfoot>
          </table>
          ${ThemesKit.footerHTML()}
        </div>
      </div>`;
    }
  };

  window.ReportIntl = ReportIntl;
})();

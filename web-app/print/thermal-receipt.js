/* =========================================================
   thermal-receipt.js — سندات الطباعة الحرارية:
   سند قبض الأقساط / سند تسليم زي وكتب / قسيمة راتب
   ========================================================= */
'use strict';

(function () {
  const Receipt = {
    /* ---------- سند قبض دفعة دراسية ---------- */
    payment({ pay, student }) {
      if (!pay) return;
      /* اسم البند المسدد */
      let itemLabel = 'دفعة على الحساب';
      if (pay.itemId) {
        const p = Store.find('feeplans', (x) => x.studentId === pay.studentId);
        const it = p && (p.items || []).find((i) => i.id === pay.itemId);
        if (it) itemLabel = it.label;
      }
      const html = ThermalPrint.receiptHTML({
        title: 'سند قبض',
        rows: [
          ['سند رقم', pay.receiptNo || '—'],
          ['التاريخ', H.fmtDate(pay.date)],
          ['الطالب', student ? student.name : ''],
          ['رقم الطالب', student ? (student.sid || '') : ''],
          ['البند', itemLabel],
          ['طريقة الدفع', pay.method || 'نقداً']
        ],
        totals: [['المبلغ المحصّل', H.money(pay.amount)]],
        note: pay.note || '',
        qrText: `RECEIPT|${pay.receiptNo}|${pay.amount}|${pay.date}|${(student || {}).sid || ''}`,
        footNote: `المستلم: ${pay.by || ''}`
      });
      this._offer(html, `سند-${pay.receiptNo}.pdf`);
    },

    /* ---------- سند تسليم زي/كتب ---------- */
    storeIssue(issue) {
      const html = ThermalPrint.receiptHTML({
        title: 'سند تسليم',
        rows: [
          ['سند رقم', issue.issueNo],
          ['التاريخ', H.fmtDate(issue.date)],
          ['الطالب', issue.studentName || ''],
          ['الصنف', `${issue.itemName} × ${issue.qty}`],
          ['سعر الوحدة', H.money(issue.unitPrice)]
        ],
        totals: [['الإجمالي', H.money(issue.total)]],
        note: 'يُضاف المبلغ لكشف حساب الطالب',
        qrText: `ISSUE|${issue.issueNo}|${issue.total}`,
        footNote: `المستلم: ${issue.by || ''}`
      });
      this._offer(html, `تسليم-${issue.issueNo}.pdf`);
    },

    /* ---------- قسيمة راتب ---------- */
    payslip({ run, ln, emp }) {
      const net = H.round2((ln.basic || 0) + (ln.allowances || 0) + (ln.bonus || 0) - (ln.deductions || 0) - (ln.advance || 0));
      const html = ThermalPrint.receiptHTML({
        title: 'قسيمة راتب',
        rows: [
          ['الشهر', `${H.arMonth(run.month)} ${run.month.slice(0, 4)}`],
          ['الموظف', ln.name],
          ['الوظيفة', (emp && emp.job) || ''],
          ['الراتب الأساسي', H.money(ln.basic)],
          ['البدلات', H.money(ln.allowances || 0)],
          ['مكافآت', H.money(ln.bonus || 0)],
          ['خصومات', H.money(ln.deductions || 0)],
          ['سلف', H.money(ln.advance || 0)]
        ],
        totals: [['صافي الراتب', H.money(net)]],
        qrText: `PAYSLIP|${run.month}|${ln.empId}|${net}`,
        footNote: ln.paid ? `صُرف بتاريخ ${H.fmtDate(ln.date)}` : 'غير مصروف بعد'
      });
      this._offer(html, `قسيمة-${ln.name}-${run.month}.pdf`);
    },

    /* ---------- خيار طباعة أو PDF ---------- */
    _offer(html, pdfName) {
      UI.sheet({
        title: 'الطباعة الحرارية',
        items: [
          { ico: '🖨️', label: 'طباعة حرارية الآن', sub: 'طابعة الفواتير الحرارية', color: 'ic-blue', id: 'print' },
          { ico: '📄', label: 'تنزيل PDF بمقاس اللفة', sub: 'أفضل خيار على الجوال', color: 'ic-gold', id: 'pdf' },
          { ico: '💰', label: 'فتح درج النقد', sub: 'إن كان متصلاً', color: 'ic-green', id: 'cash' }
        ]
      }).then((pick) => {
        if (!pick) return;
        if (pick.id === 'print') ThermalPrint.print(html);
        if (pick.id === 'pdf') ThermalPrint.pdf(html, pdfName);
        if (pick.id === 'cash') {
          UI.toast(ThermalPrint.openCashDrawer() ? 'تم إرسال إشارة فتح الدرج ✓' : 'لا يوجد درج نقد متصل', 'info');
        }
      });
    }
  };

  window.Receipt = Receipt;
  window.ThermalReceipt = Receipt;
})();

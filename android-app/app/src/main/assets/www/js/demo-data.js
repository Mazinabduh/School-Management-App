/* =========================================================
   demo-data.js — البيانات التجريبية (توليد / حذف) بنمط المحطة
   زر واحد يولّد: 500 طالب + 60 موظف + باصات + درجات + أقساط
   + زي وكتب + رواتب + تعميمات + حركات مالية — وكلها موسومة
   بـ _demo:true لحذفها بضغطة زر واحدة دون المساس ببياناتك الحقيقية
   ========================================================= */
'use strict';

(function () {
  const DEMO_COLS = ['stages', 'classes', 'subjects', 'students', 'feeplans', 'employees',
    'payrollRuns', 'busRoutes', 'busSubs', 'inventory', 'issues', 'transactions',
    'grades', 'notices', 'audit'];

  /* ---------- أسماء يمنية واقعية ---------- */
  const M_NAMES = ['محمد', 'أحمد', 'علي', 'حسن', 'حسين', 'عبدالله', 'عبدالرحمن', 'يحيى', 'إبراهيم', 'أسامة',
    'خالد', 'صالح', 'فهد', 'سامي', 'معاذ', 'أيوب', 'ماهر', 'مازن', 'تميم', 'مراد',
    'أيمن', 'وسيم', 'رائد', 'باسل', 'عمر', 'سيف', 'طارق', 'نبيل', 'أمجد', 'يزيد',
    'صفوان', 'أنس', 'بلال', 'حمزة', 'غازي', 'فارس', 'عدنان', 'وليد', 'ريان', 'زكريا'];
  const F_NAMES = ['فاطمة', 'عائشة', 'زينب', 'مريم', 'سارة', 'أميرة', 'هدى', 'رنا', 'سلمى', 'نور',
    'رهف', 'شهد', 'لمى', 'جنى', 'رقية', 'أسماء', 'بشرى', 'حنان', 'وفاء', 'إيمان',
    'سما', 'لينا', 'دانا', 'روان', 'غالية', 'فرح', 'براءه', 'شاثا', 'منى', 'خولة',
    'نجاة', 'سلوى', 'أروى', 'حسناء', 'لولوة', 'شجون', 'رنيم', 'غادة', 'عبير', 'سندس'];
  const FAMILY = ['العزي', 'الصلوي', 'الحميري', 'القباطي', 'الشعبي', 'المقطري', 'الزبيري', 'الحيمي', 'الجنيد', 'العبري',
    'المراني', 'النهمي', 'السامعي', 'الشيباني', 'الرعيني', 'الأهدل', 'الشامي', 'الجبري', 'الشرعبي', 'الحكيمي',
    'العنسي', 'المروني', 'العريقي', 'الرفاعي', 'الوصابي', 'المداني', 'العوبلي', 'الصلوي', 'الديماني', 'المطيري'];
  const AREAS = ['شعبة - شارع الستين', 'حدة - جولة النصر', 'المعسكر - شارع الأربعين', 'الروضة - شارع الأربعين',
    'السناع - جولة الشهيد', 'الثورة - شارع حدة', 'الصافية - جولة التحرير', 'بيت بوس - شارع التحرير'];
  const JOBS = {
    teacher: ['مدرس لغة عربية', 'مدرس رياضيات', 'مدرس علوم', 'مدرس لغة إنجليزية', 'مدرس اجتماعيات', 'مدرس حاسوب', 'مدرس تربية إسلامية', 'مدرس تربية فنية', 'مشرف تربوي'],
    admin: ['محاسب', 'سكرتير', 'أمين مكتبة', 'مسجل شؤون طلاب', 'مسؤول تسويق', 'كاهن إداري', 'منسق شؤون الطلاب'],
    worker: ['عامل نظافة', 'حارس', 'عامل صيانة', 'سائق'],
    bus: ['سائق باص', 'مشرفة باص']
  };
  const SPEC = ['بكالوريوس', 'دبلوم عالي', 'ماجستير', 'دبلوم متوسط'];

  /* ---------- عناوين التعليم ---------- */
  const DISTRICTS = ['الشهيد', 'السناع', 'الوحدة', 'الرمانة', 'النجمل', 'الحرية', 'النصر'];

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;

  /* ترحيل مالي موسوم تجريبياً — كل حركة التوليد تمر من هنا */
  const demoPost = (type, category, amount, opts = {}) => {
    const tx = Fin.post(type, category, amount, opts);
    if (tx) { tx._demo = true; Store.put('transactions', tx); }
    return tx;
  };

  const DemoData = {
    /* عدّاد السجلات التجريبية */
    counts() {
      const c = {};
      let total = 0;
      for (const col of ['students', 'employees', 'grades', 'feeplans', 'transactions', 'busSubs', 'payrollRuns']) {
        c[col] = (Store.col(col) || []).filter((r) => r._demo).length;
        total += c[col];
      }
      c.students = (Store.col('students') || []).filter((r) => r._demo).length;
      return { counts: c, total };
    },

    /* ---------- التوليد (مراحل مقسمة حتى لا يتجمد الجهاز) ---------- */
    async generate() {
      const ok = await UI.confirm({
        title: '🧪 توليد بيانات تجريبية',
        msg: 'سيتم توليد مجموعة كاملة من البيانات التجريبية:<br><b>500 طالب</b> + <b>60 موظفاً</b> + <b>4 باصات</b> + <b>درجات</b> + <b>أقساط وتحصيل</b> + <b>زي وكتب</b> + <b>رواتب</b> + <b>تعميمات</b> + <b>حركات مالية</b><br><small>كلها موسومة كبيانات تجريبية — يمكن حذفها بضغطة زر «حذف البيانات التجريبية» دون المساس بأي بيانات حقيقية.</small>',
        okLabel: 'توليد الآن'
      });
      if (!ok) return;
      if (RBAC.readOnly()) return UI.toast('ليست لديك صلاحية التعديل', 'error');

      UI.loading(true, 'جارٍ التجهيز…');
      const self = this;
      const steps = [
        ['🏫 بناء الهيكل الأكاديمي…', self._structure],
        ['👥 توليد 60 موظفاً…', self._employees],
        ['👨‍🎓 توليد 500 طالب (دفعات)…', self._students],
        ['🚌 الباصات والاشتراكات…', self._bus],
        ['🧾 الأقساط والتحصيل…', self._fees],
        ['👕 الزي والكتب والتسليمات…', self._store],
        ['✍️ رصد درجات كل الطلاب…', self._grades],
        ['💵 مسير الرواتب…', self._payroll],
        ['📣 التعميمات…', self._notices],
        ['💰 الحركات المالية…', self._finance],
        ['💾 الحفظ النهائي…', async () => { await Store.flush(); }]
      ];
      let i = 0;
      const runNext = async () => {
        if (i >= steps.length) {
          Audit.log('إضافة', 'توليد البيانات التجريبية الكاملة (500 طالب + 60 موظفاً + درجات + أقساط + باصات + رواتب)');
          Store.setSetting('demoSeeded', new Date().toISOString());
          UI.loading(false);
          UI.toast('تم توليد البيانات التجريبية كاملة ✓ — يمكنك حذفها من نفس الصفحة في أي وقت', 'success', 4500);
          Router.refresh();
          return;
        }
        UI.loading(true, steps[i][0]);
        try { await steps[i][1].call(self); }
        catch (e) {
          console.error('[DemoData]', e);
          UI.loading(false);
          return UI.toast('فشل التوليد: ' + e.message, 'error');
        }
        i++;
        setTimeout(runNext, 40);
      };
      setTimeout(runNext, 60);
    },

    /* ---------- الحذف ---------- */
    async clear() {
      const { total } = this.counts();
      if (!total) return UI.toast('لا توجد بيانات تجريبية لحذفها', 'warn');
      const ok = await UI.confirm({
        title: '🗑 حذف البيانات التجريبية',
        msg: `سيتم حذف <b>${H.num(total)}</b> سجل تجريبي (طلاب، موظفون، درجات، أقساط، حركات…) فقط.<br>بياناتك الحقيقية لن تُمس إطلاقاً.`,
        okLabel: 'حذف التجريبية', danger: true
      });
      if (!ok) return;
      UI.loading(true, 'جارٍ حذف البيانات التجريبية…');
      try {
        const removed = {};
        for (const col of DEMO_COLS) {
          const before = Store.col(col).length;
          Store.setCol(col, Store.col(col).filter((r) => !r._demo));
          removed[col] = before - Store.col(col).length;
        }
        Store.setSetting('demoSeeded', null);
        await Store.flush();
        Audit.log('حذف', `حذف البيانات التجريبية (${H.num(total)} سجل)`);
        UI.loading(false);
        UI.toast(`تم حذف كل البيانات التجريبية ✓ (${H.num(total)} سجل)`, 'success', 4000);
        Router.refresh();
      } catch (e) {
        UI.loading(false);
        UI.toast('فشل الحذف: ' + e.message, 'error');
      }
    },

    /* ═══════════ خطوات التوليد ═══════════ */

    _structure() {
      /* مراحل وصفوف ومواد — إن وُجد هيكل حقيقي يُبنى عليه، وإلا يُنشأ تجريبي */
      const haveStages = Store.col('stages').length > 0;
      const haveSubjects = Store.col('subjects').length > 0;
      if (!haveStages) {
        Store.setCol('stages', [
          { id: 'dst-kg', name: 'رياض الأطفال', color: '#ec4899', order: 1, _demo: true },
          { id: 'dst-pri', name: 'المرحلة الابتدائية', color: '#0091ea', order: 2, _demo: true },
          { id: 'dst-mid', name: 'المرحلة الإعدادية', color: '#16a34a', order: 3, _demo: true },
          { id: 'dst-high', name: 'المرحلة الثانوية', color: '#7c3aed', order: 4, _demo: true }
        ]);
      }
      if (!Store.col('classes').length) {
        const stages = Store.col('stages');
        const names = {
          'رياض الأطفال': ['التمهيدي أ', 'التمهيدي ب'],
          'المرحلة الابتدائية': ['الأول أ', 'الأول ب', 'الثاني أ', 'الثاني ب', 'الثالث أ', 'الثالث ب', 'الرابع أ', 'الرابع ب', 'الخامس أ', 'السادس أ'],
          'المرحلة الإعدادية': ['السابع أ', 'السابع ب', 'الثامن أ', 'الثامن ب', 'التاسع أ', 'التاسع ب'],
          'المرحلة الثانوية': ['العاشر أ', 'العاشر ب', 'الحادي عشر أ', 'الثاني عشر علمي', 'الثاني عشر أدبي']
        };
        const out = [];
        stages.forEach((st) => {
          (names[st.name] || [`صف ${st.name} أ`, `صف ${st.name} ب`]).forEach((n) => {
            out.push({ id: H.uid('dcls'), name: n, stageId: st.id, capacity: 40, _demo: true });
          });
        });
        Store.setCol('classes', out);
      }
      if (!haveSubjects) {
        Store.setCol('subjects', Config.DEFAULT_SUBJECTS.map((s) => ({ id: H.uid('dsub'), name: s.name, icon: s.icon, _demo: true })));
      }
    },

    _employees() {
      if (Store.col('employees').some((e) => e._demo)) return;
      const jobsBy = JOBS;
      const kinds = [
        { k: 'teacher', n: 38, base: [55000, 95000], allow: [5000, 15000] },
        { k: 'admin', n: 12, base: [45000, 85000], allow: [3000, 10000] },
        { k: 'worker', n: 6, base: [28000, 40000], allow: [0, 4000] },
        { k: 'bus', n: 4, base: [32000, 45000], allow: [0, 3000] }
      ];
      const out = [];
      for (const { k, n, base, allow } of kinds) {
        for (let i = 0; i < n; i++) {
          const male = k === 'worker' || k === 'bus' || chance(.5);
          const name = `${male ? pick(M_NAMES) : pick(F_NAMES)} ${pick(M_NAMES)} ${pick(FAMILY)}`;
          out.push({
            id: H.uid('demp'), _demo: true,
            name, empKind: k, job: pick(jobsBy[k]),
            specialization: k === 'teacher' ? `${pick(SPEC)} ${pick(['رياضيات', 'لغة عربية', 'علوم', 'لغة إنجليزية', 'حاسوب'])}` : '',
            phone: '7' + rnd(3, 8) + String(rnd(1000000, 9999999)),
            hireDate: `${rnd(2015, 2025)}-${String(rnd(1, 12)).padStart(2, '0')}-${String(rnd(1, 28)).padStart(2, '0')}`,
            basicSalary: rnd(base[0], base[1]), allowances: rnd(allow[0], allow[1]),
            status: chance(.96) ? 'active' : 'inactive',
            notes: ''
          });
        }
      }
      Store.setCol('employees', Store.col('employees').concat(out));
    },

    _students() {
      const classes = Store.col('classes');
      if (!classes.length) throw new Error('لا صفوف — أعد المحاولة');
      const target = 500;
      const existingDemo = Store.col('students').filter((s) => s._demo).length;
      const need = target - existingDemo;
      if (need <= 0) return;
      const per = Math.ceil(need / classes.length);
      const year = (Store.getSetting('year', '') || '').split('/')[0].trim() || '2025';
      let made = 0;
      const batch = () => {
        const out = [];
        while (made < need && out.length < 100) {
          /* توزيع متوازن على الصفوف */
          const cls = classes[made % classes.length];
          const stg = Store.get('stages', cls.stageId) || {};
          const male = chance(.52);
          const fname = male ? pick(M_NAMES) : pick(F_NAMES);
          const mid = male ? pick(M_NAMES) : pick(F_NAMES);
          const name = `${fname} ${mid} ${pick(M_NAMES)} ${pick(FAMILY)}`;
          const ageByStage = { 'رياض الأطفال': [4, 5], 'المرحلة الابتدائية': [6, 11], 'المرحلة الإعدادية': [12, 14], 'المرحلة الثانوية': [15, 18] };
          const ar = ageByStage[stg.name] || [6, 17];
          const by = new Date().getFullYear() - rnd(ar[0], ar[1]);
          const guardian = `${pick(M_NAMES)} ${pick(M_NAMES)} ${pick(FAMILY)}`;
          out.push({
            id: H.uid('dstu'), _demo: true,
            name, sid: 'STU-' + H.pad(Store.nextSeq('student'), 4),
            gender: male ? 'm' : 'f',
            birthdate: `${by}-${String(rnd(1, 12)).padStart(2, '0')}-${String(rnd(1, 28)).padStart(2, '0')}`,
            stageId: cls.stageId, classId: cls.id,
            guardian, phone: '7' + rnd(3, 8) + String(rnd(1000000, 9999999)),
            address: 'صنعاء — ' + pick(AREAS),
            status: chance(.97) ? 'active' : 'withdrawn',
            notes: '', created: `${year}-${String(rnd(8, 9)).padStart(2, '0')}-${String(rnd(1, 28)).padStart(2, '0')}`
          });
          made++;
        }
        Store.setCol('students', Store.col('students').concat(out));
      };
      return new Promise((res) => {
        const tick = () => {
          batch();
          if (made < need) setTimeout(tick, 30);
          else res();
        };
        tick();
      });
    },

    _bus() {
      if (Store.col('busRoutes').some((r) => r._demo)) return;
      const routes = [
        { id: 'drt-1', _demo: true, name: 'صنعاء — شعبة', monthlyFee: 8000, notes: 'الجولة الصباحية 6:30 — الظهرية 12:30' },
        { id: 'drt-2', _demo: true, name: 'صنعاء — حدة', monthlyFee: 7500, notes: 'الجولة الصباحية 6:15 — الظهرية 12:45' },
        { id: 'drt-3', _demo: true, name: 'صنعاء — المعسكر', monthlyFee: 7000, notes: 'الجولة الصباحية 6:45 — الظهرية 1:00' },
        { id: 'drt-4', _demo: true, name: 'صنعاء — الروضة', monthlyFee: 8500, notes: 'الجولة الصباحية 6:20 — الظهرية 12:40' }
      ];
      Store.setCol('busRoutes', Store.col('busRoutes').concat(routes));
      /* ~80 مشترك من الطلاب النشطين */
      const sts = Store.col('students').filter((s) => s._demo && s.status === 'active');
      const subs = [];
      const n = Math.min(80, Math.floor(sts.length * 0.18));
      const chosen = sts.filter(() => chance(n / Math.max(1, sts.length) / 0.18 * 0.18)).slice(0, n);
      for (const s of (chosen.length >= n ? chosen : sts.slice(0, n))) {
        const r = pick(routes);
        const months = rnd(2, 8);
        const total = r.monthlyFee * months;
        const subNo = 'BS-' + H.pad(Store.nextSeq('busSub'), 4);
        subs.push({ id: H.uid('dsub2'), _demo: true, subNo, studentId: s.id, routeId: r.id, monthlyFee: r.monthlyFee, months, start: H.today(), itemIds: [], status: 'active' });
        demoPost('income', 'bus', total, { ref: subNo, refId: subNo, note: `اشتراك باص ${months} شهر — ${s.name}`, date: H.today() });
      }
      Store.setCol('busSubs', Store.col('busSubs').concat(subs));
    },

    _fees() {
      const sts = Store.col('students').filter((s) => s._demo && s.status === 'active');
      const feeByStage = { 'رياض الأطفال': 120000, 'المرحلة الابتدائية': 180000, 'المرحلة الإعدادية': 240000, 'المرحلة الثانوية': 300000 };
      for (const s of sts) {
        const stg = (Store.get('stages', s.stageId) || {}).name || 'المرحلة الابتدائية';
        const total = feeByStage[stg] || 180000;
        const p = { id: H.uid('dplan'), _demo: true, studentId: s.id, items: [] };
        /* قسطان — الأولى مدفوعة لمعظم الطلاب */
        const per = Math.round(total / 2);
        const now = new Date();
        p.items.push({ id: H.uid('fi'), label: 'قسط دراسي (1/2)', amount: per, due: `${now.getFullYear()}-09-01`, paid: false, kind: 'tuition' });
        p.items.push({ id: H.uid('fi'), label: 'قسط دراسي (2/2)', amount: per, due: `${now.getFullYear() + 1}-01-15`, paid: false, kind: 'tuition' });
        if (chance(.62)) {
          const rNo = 'R-' + H.pad(Store.nextSeq('receipt'), 5);
          p.items[0].paid = true;
          p.items[0].paidDate = H.today();
          p.items[0].receiptNo = rNo;
          demoPost('income', 'tuition', per, { ref: rNo, refId: rNo, note: `تحصيل قسط (1/2) — ${s.name}`, date: H.today() });
        }
        Store.put('feeplans', p);
      }
    },

    _store() {
      if (Store.col('inventory').some((i) => i._demo)) return;
      const items = [
        { id: H.uid('dinv'), _demo: true, name: 'قميص مدرسي', kind: 'uniform', cost: 2800, price: 3500, qty: 180, unit: 'قطعة', icon: '👔' },
        { id: H.uid('dinv'), _demo: true, name: 'بنطال مدرسي', kind: 'uniform', cost: 3200, price: 4000, qty: 150, unit: 'قطعة', icon: '👖' },
        { id: H.uid('dinv'), _demo: true, name: 'حقيبة مدرسية', kind: 'uniform', cost: 6200, price: 8000, qty: 90, unit: 'قطعة', icon: '🎒' },
        { id: H.uid('dinv'), _demo: true, name: 'جاكيت مدرسي', kind: 'uniform', cost: 6500, price: 8500, qty: 70, unit: 'قطعة', icon: '🧥' },
        { id: H.uid('dinv'), _demo: true, name: 'كتاب اللغة العربية', kind: 'book', cost: 1800, price: 2500, qty: 300, unit: 'نسخة', icon: '📕' },
        { id: H.uid('dinv'), _demo: true, name: 'كتاب الرياضيات', kind: 'book', cost: 1600, price: 2200, qty: 280, unit: 'نسخة', icon: '📗' },
        { id: H.uid('dinv'), _demo: true, name: 'كتاب العلوم', kind: 'book', cost: 1500, price: 2100, qty: 250, unit: 'نسخة', icon: '📘' },
        { id: H.uid('dinv'), _demo: true, name: 'دفتر مئوي', kind: 'book', cost: 700, price: 1000, qty: 500, unit: 'نسخة', icon: '📓' }
      ];
      Store.setCol('inventory', Store.col('inventory').concat(items));
      /* تسليمات لعينة من الطلاب */
      const sts = Store.col('students').filter((s) => s._demo && s.status === 'active').slice(0, 120);
      for (const s of sts) {
        const it = pick(items);
        const qty = rnd(1, 2);
        if (it.qty < qty) continue;
        const total = it.price * qty;
        it.qty -= qty;
        const issueNo = 'IS-' + H.pad(Store.nextSeq('issue'), 5);
        Store.put('issues', { id: H.uid('dis'), _demo: true, issueNo, studentId: s.id, studentName: s.name, itemId: it.id, itemName: it.name, qty, unitPrice: it.price, total, date: H.today(), by: 'بيانات تجريبية' });
        let p = Store.find('feeplans', (x) => x.studentId === s.id);
        if (!p) { p = Store.put('feeplans', { id: H.uid('dplan'), _demo: true, studentId: s.id, items: [] }); }
        p.items.push({ id: H.uid('fi'), label: `${it.name} × ${qty}`, amount: total, due: H.today(), paid: chance(.5), paidDate: H.today(), kind: 'store', receiptNo: 'R-' + H.pad(Store.seqOf('receipt'), 5) });
        Store.put('feeplans', p);
        demoPost('income', it.kind === 'book' ? 'books' : 'uniform', total, { ref: issueNo, refId: issueNo, note: `${it.name} × ${qty} — ${s.name}`, date: H.today() });
      }
    },

    _grades() {
      const classes = Store.col('classes');
      const subjects = Store.col('subjects');
      const students = Store.col('students').filter((s) => s._demo);
      if (!classes.length || !subjects.length) return;
      /* توزيع تقديرات واقعي */
      const roll = () => {
        const r = Math.random();
        if (r < .20) return rnd(90, 100);
        if (r < .45) return rnd(80, 89);
        if (r < .70) return rnd(65, 79);
        if (r < .88) return rnd(50, 64);
        return rnd(28, 49);
      };
      for (const cls of classes) {
        const clsStudents = students.filter((s) => s.classId === cls.id && s.status === 'active');
        if (!clsStudents.length) continue;
        for (const sub of subjects) {
          for (const term of ['t1', 't2']) {
            const rec = { id: `${cls.id}|${sub.id}|${term}`, _demo: true, classId: cls.id, subjectId: sub.id, term, entries: {} };
            for (const s of clsStudents) {
              const target = roll();
              /* التقسيم: أعمال السنة 25 + الشهري 25 + النصفي/النهائي 50 */
              const y = Math.min(25, Math.max(6, Math.round(target * .25)));
              const m = Math.min(25, Math.max(5, Math.round(target * .25)));
              const big = Math.max(0, Math.min(50, target - y - m));
              rec.entries[s.id] = term === 't1'
                ? { year: y, monthly: m, midterm: big }
                : { year: y, monthly: m, final: big };
            }
            Store.put('grades', rec);
          }
        }
      }
    },

    _payroll() {
      const emps = Store.col('employees').filter((e) => e._demo && e.status !== 'inactive');
      if (!emps.length) return;
      const now = new Date();
      const months = [];
      const d1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      months.push(`${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}`);
      months.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      for (const month of months) {
        const run = { id: H.uid('drun'), _demo: true, month, lines: [], closed: true };
        for (const e of emps) {
          const line = { empId: e.id, name: e.name, basic: e.basicSalary || 0, allowances: e.allowances || 0, bonus: chance(.3) ? rnd(3000, 10000) : 0, deductions: 0, advance: 0, paid: true };
          line.net = line.basic + line.allowances + line.bonus - line.deductions - line.advance;
          run.lines.push(line);
        }
        Store.put('payrollRuns', run);
        const totalNet = H.sum(run.lines, (l) => l.net);
        demoPost('expense', 'salaries', totalNet, { ref: 'مسير ' + month, refId: run.id, note: `صرف رواتب ${month} (${emps.length} موظف)`, date: `${month}-28` });
      }
    },

    _notices() {
      const notices = [
        { id: H.uid('dntc'), _demo: true, title: 'تعميم بداية الاختبارات النصفية', date: H.today(), body: 'تنطلق الاختبارات النصفية يوم الأحد القادم لجميع الصفوف. نرجو من الطلاب الاستعداد الجيد وحضورهم في الوقت المحدد.\nإدارة المدرسة' },
        { id: H.uid('dntc'), _demo: true, title: 'اجتماع أولياء الأمور الشهري', date: H.today(), body: 'يسرّنا دعوتكم لحضور اجتماع أولياء الأمور نهاية هذا الأسبوع لمناقشة مستوى الأبناء.\nإدارة المدرسة' },
        { id: H.uid('dntc'), _demo: true, title: 'إطلاق نشاط القراءة الصباحي', date: H.today(), body: 'تبدأ فعالية القراءة الصباحية يومياً من 7:00 إلى 7:25. نرجو تشجيع الأبناء على المشاركة.\nإدارة المدرسة' }
      ];
      Store.setCol('notices', Store.col('notices').concat(notices));
    },

    _finance() {
      /* مصروفات تشغيلية واقعية لآخر 6 أشهر */
      const now = new Date();
      const cats = [
        ['maintenance', 'صيانة أجهزة التكييف والكهرباء', 25000, 90000],
        ['operations', 'مشتريات مستلزمات تعليمية', 40000, 120000],
        ['operations', 'أجور مياه وكهرباء', 30000, 75000],
        ['maintenance', 'صيانة باصات المدرسة', 15000, 60000],
        ['other-out', 'مصروفات نثرية متنوعة', 5000, 30000]
      ];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, rnd(2, 26));
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const picks = Math.random() < .5 ? 2 : 3;
        for (let k = 0; k < picks; k++) {
          const [cat, label, lo, hi] = pick(cats);
          demoPost('expense', cat, rnd(lo, hi), { ref: 'مصروف تشغيلي', note: label, date });
        }
      }
    }
  };

  window.DemoData = DemoData;

  Actions.register('demo', {
    gen() { DemoData.generate(); },
    clear() { DemoData.clear(); }
  });
})();

/* =========================================================
   config.js — إعدادات النظام والمدرسة | EduPro School ERP v3.0.0
   يُحمَّل أولاً — لا يعتمد على أي ملف آخر
   ========================================================= */
'use strict';

window.Config = {
  APP: 'EduPro School ERP',
  VERSION: '3.5.0',
  BUILD: '2026.11.12',

  /* ---------- التخزين (مستقل تماماً — لا يتعارض مع أي تطبيق آخر أو قديم) ---------- */
  PREFIX: 'EDU33_',              // بادئة مفاتيح localStorage الخاصة بهذا التطبيق فقط
  SESSION_KEY: 'EDU33_SESSION',
  SESSION_DAYS: 30,
  REMEMBER_KEY: 'EDU33_remember_user',       // «تذكرني» — اسم المستخدم المحفوظ
  SESSION_MIRROR_KEY: 'EDU33_session_mirror', // مرآة الجلسة في SharedPreferences الأصلية

  /* ---------- المجموعات (قاعدة البيانات) ---------- */
  COLS: [
    'settings', 'users', 'students', 'stages', 'classes', 'subjects', 'grades',
    'feeplans', 'payments', 'transactions', 'inventory', 'issues',
    'busRoutes', 'busSubs', 'employees', 'payrollRuns', 'idTemplates',
    'notices', 'audit', 'counters'
  ],

  /* ---------- الإعدادات الافتراضية للمدرسة ---------- */
  DEFAULT_SETTINGS: {
    schoolName: 'المدرسة الدولية الخاصة',
    schoolNameEn: 'International Private School',
    slogan: 'التميّز تعلّم — بناء جيل مبدع',
    year: '2025 / 2026',
    term1: 'الفصل الدراسي الأول',
    term2: 'الفصل الدراسي الثاني',
    currency: 'ريال',
    phone: '',
    address: '',
    logo: '',                        // dataURL يُرفع من إعدادات الهوية
    issuedBy: 'إدارة المدرسة',
    /* نظام الدرجات الافتراضي (قابل للتعديل من الإعدادات) */
    gradeMax: 100,
    passMark: 50,
    weights: {
      t1: { year: 25, monthly: 25, midterm: 50 },
      t2: { year: 25, monthly: 25, final: 50 }
    },
    /* التقديرات */
    estimates: [
      { min: 90, label: 'ممتاز',    cls: 'badge-success' },
      { min: 80, label: 'جيد جداً', cls: 'badge-info' },
      { min: 65, label: 'جيد',      cls: 'badge-warn' },
      { min: 50, label: 'مقبول',    cls: 'badge-gold' },
      { min: 0,  label: 'ضعيف',     cls: 'badge-danger' }
    ],
    /* ثيمات الطباعة */
    printTheme: 'royal',             // royal | emerald | gold | purple
    printMargins: 8,                 // مم
    printHeader: true,
    printWatermark: true,
    printZebra: true,
    thermalWidth: 80,                // مم
    /* مزامنة GitHub */
    ghToken: '', ghRepo: '', ghBranch: 'main', ghPath: 'backup/edupro-backup.json'
  },

  /* ---------- المراحل الافتراضية وألوانها ---------- */
  DEFAULT_STAGES: [
    { id: 'st-kg',    name: 'رياض الأطفال', color: '#ec4899', order: 1 },
    { id: 'st-pri',   name: 'المرحلة الابتدائية', color: '#0091ea', order: 2 },
    { id: 'st-mid',   name: 'المرحلة الإعدادية', color: '#16a34a', order: 3 },
    { id: 'st-high',  name: 'المرحلة الثانوية', color: '#7c3aed', order: 4 }
  ],

  DEFAULT_SUBJECTS: [
    { name: 'القرآن الكريم', icon: '📗' }, { name: 'اللغة العربية', icon: '📘' },
    { name: 'الرياضيات', icon: '🔢' },     { name: 'العلوم', icon: '🔬' },
    { name: 'اللغة الإنجليزية', icon: '🌎' }, { name: 'الاجتماعيات', icon: '🗺️' },
    { name: 'التربية الإسلامية', icon: '🕌' }, { name: 'الحاسوب', icon: '💻' },
    { name: 'التربية الفنية', icon: '🎨' }, { name: 'التربية الرياضية', icon: '⚽' }
  ],

  /* ألوان بطاقات كل مرحلة (يُعدَّل من استوديو البطاقات) */
  STAGE_CARD_COLORS: {
    'st-kg': '#ec4899', 'st-pri': '#0091ea', 'st-mid': '#16a34a', 'st-high': '#7c3aed'
  },

  /* أنواع البطاقات الوظيفية وأشكالها */
  CARD_TYPES: [
    { id: 'student', label: 'طالب',       ico: '🎓', color: '#0091ea', tpl: 'modern' },
    { id: 'teacher', label: 'مدرّس',      ico: '👨‍🏫', color: '#16a34a', tpl: 'classic' },
    { id: 'admin',   label: 'موظف إداري', ico: '🧑‍💼', color: '#d97706', tpl: 'luxury' },
    { id: 'worker',  label: 'عامل',       ico: '🧑‍🔧', color: '#475569', tpl: 'stripes' }
  ],

  /* قوالب تصميم البطاقة */
  CARD_TEMPLATES: [
    { id: 'modern',  label: 'مودرن — تدرج قطري' },
    { id: 'classic', label: 'كلاسيكي — شريط علوي' },
    { id: 'luxury',  label: 'فخم — إطار ذهبي' },
    { id: 'stripes', label: 'مخطط — خطوط مائلة' }
  ],

  /* عينات ألوان جاهزة للاستوديو */
  COLOR_SWATCHES: ['#0091ea', '#0b3d91', '#16a34a', '#065f46', '#7c3aed', '#5b21b6',
    '#e11d48', '#d97706', '#0f766e', '#475569', '#ec4899', '#8a6a1c'],

  /* عناصر المخزون الافتراضية */
  DEFAULT_INVENTORY: [
    { name: 'قميص مدرسي',   kind: 'uniform', cost: 0, price: 0, qty: 0, unit: 'قطعة', icon: '👔' },
    { name: 'بنطال مدرسي',   kind: 'uniform', cost: 0, price: 0, qty: 0, unit: 'قطعة', icon: '👖' },
    { name: 'حقيبة مدرسية', kind: 'uniform', cost: 0, price: 0, qty: 0, unit: 'قطعة', icon: '🎒' },
    { name: 'كتاب مدرسي',   kind: 'book',    cost: 0, price: 0, qty: 0, unit: 'نسخة', icon: '📕' }
  ],

  /* فئات الميزانية */
  BUDGET_CATEGORIES: {
    income: [
      { id: 'tuition', label: 'الأقساط الدراسية', ico: '🎓' },
      { id: 'bus',     label: 'اشتراكات الباص',   ico: '🚌' },
      { id: 'uniform', label: 'مبيعات الزي',      ico: '👕' },
      { id: 'books',   label: 'مبيعات الكتب',     ico: '📚' },
      { id: 'other-in', label: 'إيرادات أخرى',    ico: '💰' }
    ],
    expense: [
      { id: 'salaries',  label: 'الرواتب والأجور', ico: '💼' },
      { id: 'bus-sal',   label: 'رواتب الباصات',   ico: '🚌' },
      { id: 'maintenance', label: 'الصيانة',        ico: '🔧' },
      { id: 'operations',  label: 'تشغيل ومستلزمات', ico: '🧾' },
      { id: 'other-out',   label: 'مصروفات أخرى',    ico: '💸' }
    ]
  },

  /* الأدوار */
  ROLES: {
    admin:      { label: 'مدير النظام',   ico: '👑' },
    accountant: { label: 'محاسب',          ico: '🧮' },
    registrar:  { label: 'شؤون الطلاب',    ico: '🗂️' },
    teacher:    { label: 'مدرّس',          ico: '👨‍🏫' },
    viewer:     { label: 'مشاهد',          ico: '👁️' }
  },

  /* ثيمات الواجهة */
  ACCENTS: [
    { id: 'blue',    label: 'أزرق المحيط', dot: '#0091ea' },
    { id: 'emerald', label: 'زمردي',       dot: '#059669' },
    { id: 'royal',   label: 'بنفسجي ملكي', dot: '#7c3aed' },
    { id: 'rose',    label: 'وردي عنابي',  dot: '#e11d48' },
    { id: 'amber',   label: 'عنبري ذهبي',  dot: '#d97706' }
  ],

  /* متغيرات الثيم الحيّة القديمة (توافق فقط) */
  THEME_DEFAULTS: { accent: 'blue', dark: true, fontSize: 15, iconSize: 46, topbarH: 58, bottomnavH: 62, sidebarW: 288, density: 'normal' },

  /* ثيم المحطة الافتراضي (يُبذر في settings.theme عند أول تشغيل) */
  THEME_DEFAULTS_STATION: {
    mode: 'dark', preset: 'dark',
    topBarColor: '', topBarTextColor: '', topBarFontSize: 14, topBarIconSize: 22,
    bottomBarColor: '', bottomBarTextColor: '', bottomBarFontSize: 10, bottomBarIconSize: 28,
    sidebarColor: '', sidebarTextColor: '', sidebarFontSize: 14, sidebarIconSize: 22,
    mainBgColor: '', contentIconSize: 32,
    topbarHeight: 58, bottombarHeight: 68, sidebarWidth: 290,
    glassEnabled: true, glassOpacity: .85, glassBlur: 24,
    cylinderSpeed: 26, appFontSize: 1
  }
};

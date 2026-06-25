CONTRIBUTING
============

شكرًا لمساهمتك في المشروع — هذه إرشادات بسيطة لتسهيل العمل الجماعي وجودة الكود.

1) العملية العامة
- اعمل على فرع جديد من `main` مع اسم وصفي: `feature/<short-desc>`، `fix/<short-desc>` أو `chore/<short-desc>`.
- قدم PR إلى `main` عندما تكون التغييرات جاهزة للمراجعة.

2) قواعد التسمية للـ commits
- استخدم رسالة قصيرة واضحة تبدأ بـ `feat:`, `fix:`, `chore:`, `docs:`.
- مثال: `feat: add booking availability check`.

3) تشغيل الاختبارات والمحاكيات محليًا
- انتقل إلى مجلد الوظائف ثم ثبت التبعيات:

```powershell
cd C:\Users\fwfw9\devlopment\my_flutter_app\functions
npm install
```

- شغّل محاكيات Firebase (Functions + Firestore):

```powershell
npm run start
# أو:
# npx firebase emulators:start --only functions,firestore
```

- في نافذة ثانية شغّل سيناريوهات الاختبار:

```powershell
cd C:\Users\fwfw9\devlopment\my_flutter_app\functions
npm run test:booking:scenarios
```

4) قواعد الأمان والسرية
- لا تضع مفاتيح حقيقية في المستودع.
- استخدم `functions.config()` أو متغيرات بيئة لتخزين مفاتيح Stripe وبيانات الاعتماد.
- لا ترفع ملفات `serviceAccountKey.json` الحقيقية.

5) تنسيق الكود وفحص الجودة
- التزم بقواعد تنسيق Dart/Flutter (استخدم `flutter format` أو إعدادات الـIDE).
- عند إضافة كود backend (Functions) التزم بـ ESLint إذا أضفناه لاحقاً.

6) المراجعات والاختبارات
- كل PR يجب أن يتضمن وصفًا مختصرًا لما يفعله + كيفية اختباره محليًا.
- أضف أو حدّث اختبارات وحدوية/تكاملية عند إضافة منطق جديد (إن وُجد).

7) حقوق الصور/أصول التصميم
- أدرج فقط أصولًا تمتلكها أو مسموحٌ باستخدامها تجاريًا.
- ضع اسم المصدر أو الترخيص في التعليق عند الحاجة.

8) قنوات الدعم
- لمشكلات عاجلة: افتح Issue مع وسوم `bug` أو `security`.
- لطلبات ميزة: افتح Issue مع وسوم `feature`.

9) المساهمة بواجهات المستخدم
- ارسم أولاً شاشة مبسطة (wireframe) أو صورة للـ UI في الـIssue قبل تنفيذها.

10) CI
- لدينا GitHub Actions لتشغيل اختبارات `functions` على كل Push/PR. راجع `.github/workflows/ci.yml` للحصول على التفاصيل.

شكراً لمساهمتك! اذكر أي نقاط إضافية تريد تضمينها في هذا الدليل (قوالب PR، نمط الكوميت، أو إجراءات النشر).

---

## إدارة القوالب والتسميات

المستودع يتضمن قوالب PR/Issue وأدوات لمساعدة إدارة التسميات تلقائيًا أو محليًا.

إنشاء/تحديث التسميات (خياران):

- تشغيل محليًا باستخدام GitHub CLI (مستحسن للعمليات اليدوية):

```powershell
gh auth login
cd C:\Users\fwfw9\devlopment\my_flutter_app
.\scripts\create_labels.ps1
```

```bash
gh auth login
cd /path/to/my_flutter_app
bash scripts/create_labels.sh
```

- تشغيل الـGitHub Actions مرة واحدة من صفحة Actions:

1. افتح Actions → اختَر `Create Repository Labels` workflow.
2. اضغط "Run workflow" لإنشاء/تحديث التسميات من `.github/labels/labels.json`.

قوالب الـPR متوفرة في `.github/PULL_REQUEST_TEMPLATE/`، وقوالب الـIssue في `.github/ISSUE_TEMPLATE/`.

يفضل تشغيل الـworkflow أو السكربت بعد أي تغيير في ملف `.github/labels/labels.json` لضمان اتساق التسميات.
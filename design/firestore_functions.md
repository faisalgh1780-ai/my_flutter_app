Firestore security rules and Cloud Functions — شرح ونشر

الملفات:
- design/firestore.rules  -> قواعد أمان Firestore
- functions/index.js       -> Cloud Functions (checkAvailability, createBooking, handleStripeWebhook)
- functions/package.json   -> تبعيات الوظائف

نقاط مهمة قبل النشر:
1) تحتاج لتثبيت Firebase CLI وتهيئة المشروع في مجلد `functions`:

```bash
npm install
firebase login
firebase init functions
```

2) إعداد متغيرات البيئة السرية (Stripe keys) باستخدام:

```bash
firebase functions:config:set stripe.secret="sk_live_..." stripe.webhook_secret="whsec_..."
```

وبالوصول في الكود عبر `functions.config().stripe.secret` إذا استخدمت `firebase-functions` config، لكن في `index.js` الحالي نستخدم `process.env` — عند النشر استخدم `firebase functions:config:set` أو إعدادات البيئة في منصة النشر.

3) نشر الوظائف:

```bash
firebase deploy --only functions
```

4) قواعد Firestore: اختبرها محلياً عبر Firebase Emulator قبل النشر.

ملاحظات فنية:
- استعلامات التداخل في Firestore محدودة؛ للاستعلام الدقيق قد تحتاج إلى تقسيم الحجز إلى أيام منفردة أو استخدام قاعدة بيانات علائقية إذا كان الأداء مهماً.
- لا تحفظ بيانات البطاقات في Firestore أو في قاعدة بياناتك؛ استخدم Stripe وwebhooks.
- تأكد أن الحقول الحساسة (status, paid_amount) لا يمكن للمستخدم تغييرها مباشرة عبر قواعد الأمان.

التالي: أستطيع تعديل الكود لاستخدام `functions.config()` لقراءة مفاتيح Stripe بشكل آمن، أو أكتب سكربت نشر كامل مع إعداد Emulator وملف `env` للتطوير. ماذا تفضّل؟

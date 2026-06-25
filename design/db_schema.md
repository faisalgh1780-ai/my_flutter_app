تصميم قاعدة البيانات — نظرة عامة

الهدف: تخزين بيانات المستخدمين، التجار، القاعات/القصور/الاستراحات، الحجوزات، السلة، المدفوعات، التعليقات، والمميزات. نُقدّم هنا نموذجين: نموذج NoSQL (Firestore) لبناء MVP سريع، ونموذج SQL (PostgreSQL) لنظام معاملات أقوى.

1) نموذج Firestore (مجموعات ومستندات)

- users/{userId}
  - name: string
  - email: string
  - phone: string
  - role: "user" | "vendor" | "admin"
  - avatarUrl: string
  - createdAt: timestamp

- vendors/{vendorId}
  - name, contact, bio, createdAt, ownerUserId

- venues/{venueId}
  - vendorId: ref
  - type: "قصر" | "قاعة" | "استراحة"
  - title: string
  - description: string
  - coverImageUrl: string
  - images: array<string>
  - capacity: number
  - location: {lat, lng, address}
  - basePrice: number
  - features: array<string> (مثال: "كوشة", "سماعات")
  - amenities: array<string>
  - createdAt

- venueAvailability/{venueId} (مستندات منفصلة أو مجموعة فرعية)
  - blockedRanges: array<{start: date, end: date, reason}>
  - specialPrices: array<{start, end, price}>

- bookings/{bookingId}
  - userId, venueId, vendorId
  - startDate, endDate
  - status: "pending" | "confirmed" | "cancelled" | "completed"
  - totalAmount, depositAmount
  - items: array<{feature, price, qty}>
  - createdAt, updatedAt

- carts/{userId}
  - items: array<{venueId, dateFrom, dateTo, options, qty, price}>
  - updatedAt

- payments/{paymentId}
  - bookingId, userId, amount, method, status, stripeChargeId, createdAt

- reviews/{reviewId}
  - venueId, userId, rating, text, createdAt

ملاحظات Firestore:
- استخدم قواعد أمان للتحقق من الملكية (owners/vendors).
- حفظ تواريخ الحجز كـ timestamps وفرض قيود عند إنشاء الحجز عن طريق Cloud Function (للتحقق من التوافر) لتجنب التعارضات.
- للبحث/فرز، أضف حقول مركبة أو استخدم Algolia للبحث المتقدم.

2) نموذج PostgreSQL (مخطط علائقي)

الكائنات الأساسية: users, vendors, venues, venue_images, amenities, venue_amenities, bookings, booking_items, carts, cart_items, payments, reviews, admin_users

ملاحظات تصميمية:
- استخدم معاملات (transactions) عند حجز مقصورات/قاعات لحجز التوافر وتسجيل الدفعات الجزئية.
- جدول الحجز (`bookings`) يحوي حالات وحقل `hold_until` للعربون (مثلاً 3 أيام سياسة إلغاء).
- استخدم فهارس على `venues(location)`, `bookings(venue_id, start_date, end_date)`.

3) مؤشرات التوافر / تقويم
- في SQL: لحل مسألة التداخل استخدم قيد عدم التداخل (EXCLUDE USING GIST) أو تحقّق ضمني بالمعاملة:
  - أثناء إنشاء حجز: تحقق أن لايوجد حجز مؤكّد أو محجوز يتقاطع مع الفترة المطلوبة.

4) قياسات الدفع (عربون/كامل)
- الحقول: `total_amount`, `deposit_amount`, `paid_amount`, `payment_status`.
- سياسة: عند اختيار "عربون" يُنشأ حجز مع `status = pending` و`hold_until = created_at + 3 days`، والدفع يُسجّل في `payments`.

5) أمن ونسخ احتياطي
- تشفير بيانات حساسة (معلومات الدفع مخزنة عبر Stripe فقط، لا تحفظ أرقام البطاقات).
- نسخ احتياطي منتظم لقاعدة البيانات.

الملفات المرفقة: ملف SQL للتنصيب الأولي في `design/001_init.sql`.

---

إذا تفضل نموذجًا واحدًا (Firestore أو PostgreSQL) سأحسّن المخطط و أجهّز قواعد أمان/واجهات API المناسبة.

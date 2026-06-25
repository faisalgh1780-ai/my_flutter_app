تصميم قاعدة البيانات وواجهات API

هذا الملف يصف مخططين: توصية Firestore (لـ MVP سريع) ومخطط PostgreSQL علائقي (للنظام المعاملاتي). كما يشمل نقاط نهاية API الأساسية وسيناريو الحجز الآمن.

ألوان الهوية:
- خلفية الشعار: #5F182A
- ألوان الكتابة: #FFF1E7

كائنات رئيسية:
- Users: المستخدمون (عملاء، تجار، مدير).
- Venues: القصور / القاعات / الاستراحات.
- Images, Features, Amenities
- Bookings: الحجوزات (تاريخ/مدة/حالة/دفع/عربون).
- Availability: أيام محجوزة / متاحة.
- Reviews, Carts, Payments, MerchantOrders

1) Firestore (مقتطف)
- users/{userId}: name, email, phone, role, createdAt
- venues/{venueId}: ownerId, title, type, description, location{lat,lng,address}, basePrice, capacity, features[], imageUrls[]
- bookings/{bookingId}: userId, venueId, startDate, endDate, status, totalAmount, depositAmount
- carts/{userId}: items[]
- reviews/{reviewId}: userId, venueId, rating, comment

ملاحظات Firestore:
- تحقق من التوافر عبر Cloud Functions أو Firestore transactions لتفادي التعارضات.
- لا تخزن بيانات البطاقات؛ استخدم Stripe وwebhooks.

2) PostgreSQL (مقتطف SQL)
- جداول: users, vendors, venues, venue_images, features, venue_features, bookings, booking_items, payments, carts, cart_items, reviews, merchant_orders
- استخدام معاملات (transactions) وقفل صفوف عند إنشاء الحجز.
- اقتراح: استخدم حقل `hold_until` في `bookings` لدعم سياسة العربون (مثلاً 3 أيام).

نقاط نهاية API (REST) الأساسية:
- Auth: POST /api/auth/register, /login, /logout
- Venues: GET /api/venues, GET /api/venues/{id}
- Availability: GET /api/venues/{id}/availability
- Bookings: POST /api/bookings, GET /api/bookings/{id}, POST /api/bookings/{id}/cancel
- Payments: POST /api/payments/create-intent, POST /api/payments/webhook
- Merchant: GET /api/merchant/orders, POST /api/merchant/orders/{id}/accept|reject|update-price
- Admin: CRUD endpoints for venues

سيناريو الحجز مع عربون:
1. إنشاء طلب حجز مؤقت (pending) مع `hold_until` أو إنشاء PaymentIntent للعربون.
2. تحقق من التوافر ضمن TRANSACTION.
3. عند التأكيد عبر webhook، حدث حالة الحجز إلى `confirmed` وأرسل إشعار للتاجر.
4. سياسة الإلغاء: قبل N أيام يُسترد، بعد N يوم لا يُسترد (قابل للتعديل).

نصائح عملية:
- افصل منطق التحقق الحساس (التوافر/دفع) على backend أو Cloud Functions.
- ضع سجلات تفصيلية للمدفوعات (audit).
- خطط لفهرسة الحقول المستخدمة للبحث والفلاتر.

التالي: هل تفضل أن أجهز: 1) SQL مفصل + سكربتات إنشاء الجداول، أم 2) قواعد Firestore security وCloud Functions؟

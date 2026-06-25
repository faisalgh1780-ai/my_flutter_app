const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Stripe = require('stripe');

admin.initializeApp();
const db = admin.firestore();

// Read Stripe config from functions.config() (set via `firebase functions:config:set stripe.secret="..." stripe.webhook_secret="..."`)
const cfg = (functions.config && functions.config().stripe) || {};
const stripeSecret = cfg.secret || process.env.STRIPE_SECRET || '';
const stripeWebhookSecret = cfg.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = Stripe(stripeSecret);

// Helper: check availability for a venue between startDate and endDate (ISO strings)
exports.checkAvailability = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const { venueId, startDate, endDate } = data;
  if (!venueId || !startDate || !endDate) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const q = db.collection('bookings')
    .where('venueId', '==', venueId)
    .where('startDate', '<=', admin.firestore.Timestamp.fromDate(end));

  const snap = await q.get();
  for (const doc of snap.docs) {
    const b = doc.data();
    if (b.status === 'cancelled') continue;
    const bStart = b.startDate.toDate ? b.startDate.toDate() : new Date(b.startDate);
    const bEnd = b.endDate.toDate ? b.endDate.toDate() : new Date(b.endDate);
    if (!(bEnd < start || bStart > end)) {
      return { available: false, conflict: { bookingId: doc.id, start: bStart.toISOString(), end: bEnd.toISOString() } };
    }
  }
  return { available: true };
});

// Create booking: uses transaction to re-check availability and create booking doc
exports.createBooking = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const { venueId, startDate, endDate, items, deposit } = data;
  if (!venueId || !startDate || !endDate) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  return db.runTransaction(async (tx) => {
    const bookingsQ = db.collection('bookings')
      .where('venueId', '==', venueId)
      .where('startDate', '<=', admin.firestore.Timestamp.fromDate(end));

    const snap = await tx.get(bookingsQ);
    for (const doc of snap.docs) {
      const b = doc.data();
      if (b.status === 'cancelled') continue;
      const bStart = b.startDate.toDate ? b.startDate.toDate() : new Date(b.startDate);
      const bEnd = b.endDate.toDate ? b.endDate.toDate() : new Date(b.endDate);
      if (!(bEnd < start || bStart > end)) {
        throw new functions.https.HttpsError('already-exists', 'Selected dates are not available');
      }
    }

    const bookingRef = db.collection('bookings').doc();
    const bookingData = {
      userId: context.auth.uid,
      venueId,
      startDate: admin.firestore.Timestamp.fromDate(start),
      endDate: admin.firestore.Timestamp.fromDate(end),
      status: 'pending',
      items: items || [],
      totalAmount: 0,
      depositAmount: deposit || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    tx.set(bookingRef, bookingData);

    if (deposit && deposit > 0) {
      if (!stripeSecret) {
        throw new functions.https.HttpsError('failed-precondition', 'Stripe not configured');
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(deposit * 100),
        currency: 'usd',
        metadata: { bookingId: bookingRef.id, userId: context.auth.uid },
      });
      const paymentRef = db.collection('payments').doc();
      tx.set(paymentRef, {
        bookingId: bookingRef.id,
        userId: context.auth.uid,
        amount: deposit,
        method: 'card',
        status: 'pending',
        provider_id: paymentIntent.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { bookingId: bookingRef.id, clientSecret: paymentIntent.client_secret };
    }

    return { bookingId: bookingRef.id };
  });
});

// Stripe webhook handler (HTTP)
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = stripeWebhookSecret;
  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      const bookingId = pi.metadata && pi.metadata.bookingId;
      if (bookingId) {
        const paymentsRef = db.collection('payments').where('provider_id', '==', pi.id);
        const snap = await paymentsRef.get();
        const batch = db.batch();
        snap.forEach(doc => batch.update(doc.ref, { status: 'paid' }));
        const bookingRef = db.collection('bookings').doc(bookingId);
        batch.update(bookingRef, { status: 'confirmed', paid_amount: admin.firestore.FieldValue.increment(pi.amount_received / 100), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        await batch.commit();
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      // mark related payment records as failed
      try {
        const paymentsRef = db.collection('payments').where('provider_id', '==', pi.id);
        const snap = await paymentsRef.get();
        const batch = db.batch();
        snap.forEach(doc => batch.update(doc.ref, { status: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        await batch.commit();
      } catch (err) {
        console.error('Error marking payment failed:', err);
      }
      break;
    }
    case 'charge.refunded': {
      const ch = event.data.object;
      // ch.payment_intent links to the payment_intent id we stored in provider_id
      const paymentIntentId = ch.payment_intent;
      const amountRefunded = (ch.amount_refunded || ch.amount || 0) / 100.0;
      try {
        const paymentsRef = db.collection('payments').where('provider_id', '==', paymentIntentId);
        const snap = await paymentsRef.get();
        const batch = db.batch();
        let affectedBookingId = null;
        snap.forEach(doc => {
          affectedBookingId = doc.data().bookingId || affectedBookingId;
          batch.update(doc.ref, { status: 'refunded', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        });
        if (affectedBookingId) {
          const bookingRef = db.collection('bookings').doc(affectedBookingId);
          // decrement paid_amount
          batch.update(bookingRef, { paid_amount: admin.firestore.FieldValue.increment(-amountRefunded), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        await batch.commit();
      } catch (err) {
        console.error('Error processing refund webhook:', err);
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

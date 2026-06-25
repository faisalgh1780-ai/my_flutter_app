// Test scenarios: successful booking, conflicting booking, simulate Stripe webhook
// Run emulators first: `npm run start` in functions folder
// Then: `npm run test:booking:scenarios`

const fft = require('firebase-functions-test')({projectId: 'demo-project'}, './serviceAccountKey.json');
const functionsModule = require('../index_secure');
const admin = require('firebase-admin');

function makeReq(body, headers = {}) {
  return {
    headers,
    body,
    rawBody: JSON.stringify(body)
  };
}

function makeRes() {
  const res = {};
  res.status = (code) => { res._status = code; return res; };
  res.send = (body) => { res._body = body; return res; };
  res.json = (obj) => { res._json = obj; return res; };
  return res;
}

(async () => {
  try {
    const createBooking = fft.wrap(functionsModule.createBooking);
    const checkAvailability = fft.wrap(functionsModule.checkAvailability);
    // Initialize admin SDK for direct Firestore writes/reads (emulator/service account)
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')) });
    }
    const db = admin.firestore();

    // Scenario 1: successful booking
    const start1 = new Date(); start1.setDate(start1.getDate() + 10);
    const end1 = new Date(start1); end1.setDate(end1.getDate() + 1);
    const data1 = { venueId: 'venue-scn-1', startDate: start1.toISOString(), endDate: end1.toISOString(), deposit: 5.00 };
    const ctx = { auth: { uid: 'scenario-user' } };

    console.log('Scenario 1: checking availability...');
    const avail1 = await checkAvailability({ venueId: data1.venueId, startDate: data1.startDate, endDate: data1.endDate }, ctx);
    console.log('Availability result:', avail1);

    console.log('Scenario 1: creating booking...');
    const res1 = await createBooking(data1, ctx);
    console.log('CreateBooking result:', res1);

    // Ensure a payment record exists for the booking so webhook handlers can find it
    if (res1 && res1.bookingId) {
      await db.collection('payments').add({
        bookingId: res1.bookingId,
        userId: ctx.auth.uid,
        amount: data1.deposit,
        method: 'card',
        status: 'pending',
        provider_id: 'pi_fake_123',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Inserted fake payment record for booking', res1.bookingId);
    }

    // Scenario 2: conflicting booking (same dates) -> expect error
    console.log('Scenario 2: attempt conflicting booking (should fail)...');
    try {
      const res2 = await createBooking(data1, { auth: { uid: 'another-user' } });
      console.error('Conflicting booking unexpectedly succeeded:', res2);
      process.exitCode = 2;
    } catch (err) {
      console.log('Conflicting booking failed as expected:', err && err.message ? err.message : err);
    }

    // Scenario 3: simulate Stripe webhook for payment_intent.succeeded
    console.log('Scenario 3: simulate Stripe webhook (payment_intent.succeeded)...');
    // Create fake event matching expected shape
    const fakeEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_fake_123',
          metadata: { bookingId: (res1 && res1.bookingId) ? res1.bookingId : 'unknown-booking' },
          amount_received: 500
        }
      }
    };

    const req = makeReq(fakeEvent, {});
    const res = makeRes();

    // Call webhook handler directly
    await functionsModule.handleStripeWebhook(req, res);
    console.log('Webhook response status:', res._status, 'body:', res._json || res._body || res._status);

    // Verify booking doc updated in Firestore
    try {
      const bookingId = (res1 && res1.bookingId) ? res1.bookingId : (fakeEvent.data.object.metadata && fakeEvent.data.object.metadata.bookingId);
      if (bookingId) {
        const bookingSnap = await db.collection('bookings').doc(bookingId).get();
        if (bookingSnap.exists) {
          const bookingData = bookingSnap.data();
          console.log('Booking document after webhook:', bookingData);
          if (bookingData.status === 'confirmed') {
            console.log('Booking confirmed as expected.');
          } else {
            console.warn('Booking status is not confirmed:', bookingData.status);
            process.exitCode = 3;
          }
          if (bookingData.paid_amount && bookingData.paid_amount > 0) {
            console.log('Paid amount recorded:', bookingData.paid_amount);
          } else {
            console.warn('Paid amount not updated or zero.');
          }
        } else {
          console.warn('Booking document not found in Firestore for id', bookingId);
          process.exitCode = 4;
        }
      } else {
        console.warn('No bookingId available to verify.');
      }
    } catch (err) {
      console.error('Verification read failed:', err);
      process.exitCode = 5;
    }

    // Scenario 4: simulate payment failure for another booking
    console.log('Scenario 4: simulate payment failure...');
    const start2 = new Date(); start2.setDate(start2.getDate() + 20);
    const end2 = new Date(start2); end2.setDate(end2.getDate() + 1);
    const data2 = { venueId: 'venue-scn-2', startDate: start2.toISOString(), endDate: end2.toISOString(), deposit: 10.00 };
    const res2 = await createBooking(data2, { auth: { uid: 'user-fail' } });
    console.log('Created booking for failure test:', res2);
    if (res2 && res2.bookingId) {
      const payRef = await db.collection('payments').add({ bookingId: res2.bookingId, userId: 'user-fail', amount: data2.deposit, status: 'pending', provider_id: 'pi_fail_1', createdAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log('Inserted payment record for failure test, id:', payRef.id);

      const failEvent = { type: 'payment_intent.payment_failed', data: { object: { id: 'pi_fail_1' } } };
      const reqFail = makeReq(failEvent, {});
      const resFail = makeRes();
      await functionsModule.handleStripeWebhook(reqFail, resFail);
      console.log('Payment failed webhook handled, response:', resFail._status || resFail._json || resFail._body);

      // verify payment doc updated
      const paySnap = await db.collection('payments').where('provider_id', '==', 'pi_fail_1').get();
      paySnap.forEach(d => console.log('Payment doc after failure:', d.id, d.data()));
    }

    // Scenario 5: simulate refund
    console.log('Scenario 5: simulate refund...');
    const start3 = new Date(); start3.setDate(start3.getDate() + 30);
    const end3 = new Date(start3); end3.setDate(end3.getDate() + 1);
    const data3 = { venueId: 'venue-scn-3', startDate: start3.toISOString(), endDate: end3.toISOString(), deposit: 15.00 };
    const res3 = await createBooking(data3, { auth: { uid: 'user-refund' } });
    console.log('Created booking for refund test:', res3);
    if (res3 && res3.bookingId) {
      // create payment record and mark booking paid_amount so refund reduces it
      await db.collection('payments').add({ bookingId: res3.bookingId, userId: 'user-refund', amount: data3.deposit, status: 'paid', provider_id: 'pi_ref_1', createdAt: admin.firestore.FieldValue.serverTimestamp() });
      await db.collection('bookings').doc(res3.bookingId).set({ paid_amount: data3.deposit, status: 'confirmed' }, { merge: true });

      const refundEvent = { type: 'charge.refunded', data: { object: { payment_intent: 'pi_ref_1', amount_refunded: Math.round(data3.deposit * 100) } } };
      const reqRefund = makeReq(refundEvent, {});
      const resRefund = makeRes();
      await functionsModule.handleStripeWebhook(reqRefund, resRefund);
      console.log('Refund webhook handled, response:', resRefund._status || resRefund._json || resRefund._body);

      // verify payment and booking updated
      const paySnap2 = await db.collection('payments').where('provider_id', '==', 'pi_ref_1').get();
      paySnap2.forEach(d => console.log('Payment doc after refund:', d.id, d.data()));
      const bookingSnap3 = await db.collection('bookings').doc(res3.bookingId).get();
      console.log('Booking after refund:', bookingSnap3.exists ? bookingSnap3.data() : 'missing');
    }

    console.log('All scenarios done.');
  } catch (err) {
    console.error('Test scenarios failed:', err);
    process.exit(1);
  } finally {
    fft.cleanup();
  }
})();

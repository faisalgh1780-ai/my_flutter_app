Local testing and deployment for Cloud Functions

1) Install dependencies

```bash
cd functions
npm install
```

2) Set Stripe config (example)

```bash
firebase functions:config:set stripe.secret="sk_test_..." stripe.webhook_secret="whsec_..."
```

3) Run emulators (Functions + Firestore)

```bash
firebase emulators:start --only functions,firestore
```

4) Testing callable functions from client (Flutter web or Node):
- Initialize Firebase in your client app pointing to the emulator (use `useFunctionsEmulator` or `functions.useEmulator()` in JS).
- Call `createBooking` as a callable function.

5) Testing Stripe webhooks locally
- Use the Stripe CLI to forward webhook events to your emulator endpoint, e.g.:

```bash
stripe listen --forward-to localhost:5001/YOUR_PROJECT/us-central1/handleStripeWebhook
```

Notes:
- Current secure entrypoint is `index_secure.js`. To use it, set `main` in `functions/package.json` to `index_secure.js` or rename the file to `index.js` before deploying.
- Use `firebase emulators:exec "node test-scripts/test_booking.js"` to run scripted tests against emulators.

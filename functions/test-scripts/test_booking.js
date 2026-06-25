// Simple test script to call createBooking using firebase-functions-test
// Usage:
// 1) Run Firestore + Functions emulators:
//    npm run start
// 2) In another terminal, run this script:
//    npm run test:booking

const fft = require('firebase-functions-test')({projectId: 'demo-project'}, './serviceAccountKey.json');

const functionsModule = require('../index_secure');

(async () => {
  try {
    const wrapped = fft.wrap(functionsModule.createBooking);

    // Mock data
    const start = new Date();
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const data = {
      venueId: 'venue-test-1',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      items: [],
      deposit: 10.00
    };

    const context = {
      auth: {
        uid: 'test-user-1'
      }
    };

    const res = await wrapped(data, context);
    console.log('createBooking result:', res);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    fft.cleanup();
  }
})();

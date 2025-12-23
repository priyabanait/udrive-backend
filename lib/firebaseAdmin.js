import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK using (in order of preference):
// 1) FIREBASE_SERVICE_ACCOUNT_JSON env var (stringified JSON)
// 2) GOOGLE_APPLICATION_CREDENTIALS env var (ADC)
// 3) Local service account JSON file checked into backend/ (for local dev only)

function initFirebase() {
  try {
    if (admin.apps && admin.apps.length) {
      return admin;
    }

    // 1) FIREBASE_SERVICE_ACCOUNT_JSON
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(json) });
      console.log('✅ Firebase admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON');
      return admin;
    }

    // 2) GOOGLE_APPLICATION_CREDENTIALS - allow default behavior
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
      console.log('✅ Firebase admin initialized using GOOGLE_APPLICATION_CREDENTIALS');
      return admin;
    }

    // 3) Local JSON file (fallback for local development) - adjust filename if necessary
    const localPath = new URL('../udrive-fba78-firebase-adminsdk-fbsvc-eb39dc3bcf.json', import.meta.url).pathname;
    if (fs.existsSync(localPath)) {
      const json = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      admin.initializeApp({ credential: admin.credential.cert(json) });
      console.log('✅ Firebase admin initialized from local service account file');
      return admin;
    }

    console.warn('⚠️ No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.');
    return admin;
  } catch (err) {
    console.error('Failed to initialize Firebase admin:', err.message);
    return admin;
  }
}

initFirebase();

export function getAdmin() {
  return admin;
}

// Send push notification to multiple device tokens using FCM
export async function sendPushToTokens(tokens = [], { title = '', body = '', data = {} } = {}) {
  if (!tokens || !tokens.length) return { successCount: 0, failureCount: 0 };

  // Build the message payload for sendMulticast
  const message = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [String(k), String(v)])),
    tokens: tokens.slice(0, 500), // FCM sendMulticast supports up to 500 tokens per call
  };

  try {
    const res = await admin.messaging().sendMulticast(message);
    return { successCount: res.successCount, failureCount: res.failureCount, responses: res.responses };
  } catch (err) {
    console.error('FCM sendMulticast error:', err.message);
    throw err;
  }
}

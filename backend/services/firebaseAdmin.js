const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');

const firebaseClientConfig = require('../../database/firebase-client-config.json');

let initializedApp = null;
let initializationError = null;

function readServiceAccountFromEnv() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return null;
  }

  return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

function readLocalServiceAccount() {
  const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

  if (!fs.existsSync(serviceAccountPath)) {
    return null;
  }

  return require(serviceAccountPath);
}

function initializeFirebaseAdmin() {
  if (initializedApp || initializationError) {
    return;
  }

  try {
    const serviceAccount = readServiceAccountFromEnv() || readLocalServiceAccount();

    const options = {
      projectId: firebaseClientConfig.projectId,
    };

    if (serviceAccount) {
      options.credential = admin.credential.cert(serviceAccount);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      options.credential = admin.credential.applicationDefault();
    } else {
      throw new Error(
        'Firebase Admin credentials are missing. Add backend/serviceAccountKey.json or set FIREBASE_SERVICE_ACCOUNT_JSON.'
      );
    }

    initializedApp = admin.apps.length ? admin.app() : admin.initializeApp(options);
  } catch (error) {
    initializationError = error;
  }
}

function getFirebaseAdmin() {
  initializeFirebaseAdmin();

  if (initializationError) {
    throw initializationError;
  }

  return {
    admin,
    db: admin.firestore(initializedApp),
    auth: admin.auth(initializedApp),
    FieldValue: admin.firestore.FieldValue,
    firebaseWebApiKey: firebaseClientConfig.apiKey,
  };
}

module.exports = {
  getFirebaseAdmin,
};

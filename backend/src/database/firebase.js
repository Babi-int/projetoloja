/**
 * Inicialização do Firebase Admin (Firestore).
 * Prioriza credenciais do .env; em ambientes GCP pode usar Application Default Credentials.
 */
const admin = require("firebase-admin");

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

function getCredential() {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey()
    });
  }

  return admin.credential.applicationDefault();
}

let db = null;
let initError = null;

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: getCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
  db = admin.firestore();
} catch (err) {
  initError = err.message;
  console.error("[Firebase] Falha ao inicializar:", initError);
}

module.exports = {
  admin,
  db,
  get initError() { return initError; }
};

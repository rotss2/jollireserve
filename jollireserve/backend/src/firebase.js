const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize Firebase Admin SDK
let app;
let db;

function initFirebase() {
  if (app) return { app, db };

  // Check for service account or application default credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Use service account JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use credentials file path
    app = initializeApp({
      credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    });
  } else {
    // Application Default Credentials (for GCP environments)
    try {
      app = initializeApp();
    } catch (e) {
      console.error('Firebase initialization failed:', e.message);
      throw new Error(
        'Firebase not configured. Please set either:\n' +
        '1. FIREBASE_SERVICE_ACCOUNT (JSON string) in .env, or\n' +
        '2. GOOGLE_APPLICATION_CREDENTIALS (path to service account file) in .env'
      );
    }
  }

  db = getFirestore(app);
  console.log('✅ Firebase Firestore initialized');
  return { app, db };
}

function getDb() {
  if (!db) {
    initFirebase();
  }
  return db;
}

// Firestore wrapper compatible with existing db interface
const firestoreWrapper = {
  collection: (name) => {
    const db = getDb();
    const col = db.collection(name);
    
    return {
      // Get single document by ID
      get: async (id) => {
        const doc = await col.doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      },
      
      // Get all documents or query
      all: async (filters = {}) => {
        let query = col;
        
        // Apply filters
        for (const [field, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            query = query.where(field, '==', value);
          }
        }
        
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      
      // Insert new document
      insert: async (data, id = null) => {
        const docId = id || data.id || require('uuid').v4();
        await col.doc(docId).set(data);
        return { id: docId, ...data };
      },
      
      // Update document
      update: async (id, data) => {
        await col.doc(id).update(data);
        return { id, ...data };
      },
      
      // Delete document
      delete: async (id) => {
        await col.doc(id).delete();
        return { success: true };
      },
      
      // Count documents
      count: async (filters = {}) => {
        let query = col;
        for (const [field, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            query = query.where(field, '==', value);
          }
        }
        const snapshot = await query.count().get();
        return snapshot.data().count;
      }
    };
  }
};

module.exports = { initFirebase, getDb, firestoreWrapper };

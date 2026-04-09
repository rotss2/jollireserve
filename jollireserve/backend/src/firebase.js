const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize Firebase Admin SDK
let app;
let db;

function initFirebase() {
  if (app) return { app, db };

  // Try to load service account from file
  let serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  // If relative path, resolve to absolute
  if (serviceAccountPath && !path.isAbsolute(serviceAccountPath)) {
    serviceAccountPath = path.join(__dirname, '..', serviceAccountPath);
  }

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath);
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✅ Firebase initialized with service account file');
    } catch (e) {
      console.error('Failed to load service account file:', e.message);
      throw e;
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Fallback to inline JSON - handle newlines properly
    try {
      let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      // Check if it's base64 encoded
      if (jsonStr.startsWith('eyJ')) {
        // It's base64, decode it
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
      } else {
        // Replace literal \n with actual newlines for private key
        jsonStr = jsonStr.replace(/\\n/g, '\n');
      }
      
      const serviceAccount = JSON.parse(jsonStr);
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✅ Firebase initialized with env variable');
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
      throw e;
    }
  } else {
    throw new Error(
      'Firebase not configured. Please set GOOGLE_APPLICATION_CREDENTIALS in .env pointing to serviceAccountKey.json'
    );
  }

  db = getFirestore(app);
  console.log('✅ Firestore connected');
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

const { initFirebase, firestoreWrapper } = require('./firebase');
const { v4: uuid } = require('uuid');

// Firestore database wrapper compatible with existing SQL-like interface
const dbWrapper = {
  prepare: (collectionName) => ({
    // Get single document by ID
    get: async (id) => {
      const collection = firestoreWrapper.collection(collectionName);
      return await collection.get(id);
    },
    
    // Get all documents (with optional filters)
    all: async (...args) => {
      const collection = firestoreWrapper.collection(collectionName);
      // If first arg is object, treat as filters
      const filters = args.length === 1 && typeof args[0] === 'object' ? args[0] : {};
      return await collection.all(filters);
    },
    
    // Insert/update document
    run: async (...args) => {
      const collection = firestoreWrapper.collection(collectionName);
      const data = args[0] || {};
      const id = data.id || uuid();
      
      // Check if document exists
      const existing = await collection.get(id);
      if (existing) {
        await collection.update(id, data);
      } else {
        await collection.insert(data, id);
      }
      
      return { lastInsertRowid: id, changes: 1 };
    },
    
    // For compatibility - same as run
    insert: async (...args) => {
      return dbWrapper.prepare(collectionName).run(...args);
    }
  }),

  // Execute raw operations (no-op for Firestore, collections are created automatically)
  exec: async () => {
    // Firestore creates collections automatically
    return;
  },

  // Transaction support
  transaction: async (fn) => {
    const { getDb } = require('./firebase');
    const db = getDb();
    
    try {
      const result = await db.runTransaction(async (transaction) => {
        // Pass a transaction-aware wrapper to the callback
        const txWrapper = {
          prepare: (collectionName) => ({
            get: (id) => {
              const ref = db.collection(collectionName).doc(id);
              return transaction.get(ref).then(doc => 
                doc.exists ? { id: doc.id, ...doc.data() } : null
              );
            },
            set: (id, data) => {
              const ref = db.collection(collectionName).doc(id);
              transaction.set(ref, data);
              return { id, ...data };
            },
            update: (id, data) => {
              const ref = db.collection(collectionName).doc(id);
              transaction.update(ref, data);
              return { id, ...data };
            },
            delete: (id) => {
              const ref = db.collection(collectionName).doc(id);
              transaction.delete(ref);
              return { success: true };
            }
          })
        };
        return await fn(txWrapper);
      });
      return result;
    } catch (err) {
      throw err;
    }
  },
  
  // Direct collection access
  collection: (name) => firestoreWrapper.collection(name)
};

async function initDb() {
  // Initialize Firebase
  initFirebase();
  
  console.log("✅ Database initialized (Firestore)");
  console.log("📦 Collections: users, tables, reservations, queue_entries");
}

function dbConn() {
  return dbWrapper;
}

module.exports = { initDb, dbConn };
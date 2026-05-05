/**
 * Firebase Transaction Utilities
 * Phase 1: Emergency Security Lockdown
 * 
 * Implements atomic table locking to prevent race conditions
 * in reservation creation. Uses Firebase transactions with
 * pessimistic locking pattern.
 */

const { getDb } = require('../db');
const { v4: uuid } = require('uuid');
const { isoNow } = require('./time');

/**
 * Table lock duration in milliseconds (10 seconds)
 * Locks auto-expire to prevent deadlocks
 */
const LOCK_TTL = 10000;

/**
 * Error thrown when table is locked by another process
 */
class TableLockedError extends Error {
  constructor(tableId, lockedBy) {
    super(`Table ${tableId} is currently locked by another reservation process`);
    this.name = 'TableLockedError';
    this.tableId = tableId;
    this.lockedBy = lockedBy;
    this.code = 'TABLE_LOCKED';
  }
}

/**
 * Error thrown when no tables are available
 */
class NoAvailableTablesError extends Error {
  constructor(partySize, date, time) {
    super(`No tables available for ${partySize} guests on ${date} at ${time}`);
    this.name = 'NoAvailableTablesError';
    this.partySize = partySize;
    this.date = date;
    this.time = time;
    this.code = 'NO_TABLES_AVAILABLE';
  }
}

/**
 * Acquire a lock on a table
 * @param {string} tableId - Table ID to lock
 * @param {string} reservationId - Reservation process ID
 * @returns {Promise<boolean>} - True if lock acquired, false if already locked
 */
async function acquireTableLock(tableId, reservationId) {
  const db = getDb();
  const lockRef = db.collection('table_locks').doc(tableId);
  const now = Date.now();
  
  try {
    const result = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      
      if (lockDoc.exists) {
        const lockData = lockDoc.data();
        // Check if lock is expired
        if (lockData.expires_at > now) {
          // Lock is still valid
          return { acquired: false, lockedBy: lockData.reservation_id };
        }
        // Lock expired, we can steal it
      }
      
      // Acquire the lock
      transaction.set(lockRef, {
        table_id: tableId,
        reservation_id: reservationId,
        acquired_at: now,
        expires_at: now + LOCK_TTL,
        status: 'pending'
      });
      
      return { acquired: true };
    });
    
    return result.acquired;
  } catch (error) {
    console.error('[Transaction] Failed to acquire table lock:', error);
    throw error;
  }
}

/**
 * Release a table lock
 * @param {string} tableId - Table ID to unlock
 */
async function releaseTableLock(tableId) {
  const db = getDb();
  try {
    await db.collection('table_locks').doc(tableId).delete();
  } catch (error) {
    console.warn('[Transaction] Failed to release table lock:', error);
    // Don't throw - cleanup failures shouldn't break the flow
  }
}

/**
 * Confirm a table lock (after successful reservation)
 * @param {string} tableId - Table ID
 * @param {string} reservationId - Confirmed reservation ID
 */
async function confirmTableLock(tableId, reservationId) {
  const db = getDb();
  try {
    await db.collection('table_locks').doc(tableId).update({
      status: 'confirmed',
      reservation_id: reservationId,
      confirmed_at: Date.now()
    });
  } catch (error) {
    console.warn('[Transaction] Failed to confirm table lock:', error);
  }
}

/**
 * Find and lock an available table atomically
 * This is the core function that prevents race conditions
 * 
 * @param {number} partySize - Number of guests
 * @param {string} date - Reservation date
 * @param {string} time - Reservation time
 * @param {string} areaPref - Preferred area (optional)
 * @returns {Promise<Object>} - Locked table object
 */
async function findAndLockAvailableTable(partySize, date, time, areaPref = null) {
  const db = getDb();
  const reservationProcessId = uuid();
  
  try {
    // Step 1: Get all active tables with sufficient capacity
    const tablesQuery = db.collection('tables')
      .where('is_active', '==', true)
      .where('capacity', '>=', partySize)
      .orderBy('capacity');
    
    if (areaPref) {
      tablesQuery.where('area', '==', areaPref);
    }
    
    const tablesSnapshot = await tablesQuery.get();
    const candidateTables = tablesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    if (candidateTables.length === 0) {
      throw new NoAvailableTablesError(partySize, date, time);
    }
    
    // Step 2: Check which tables are already reserved for this time slot
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    
    const existingReservationsSnapshot = await db.collection('reservations')
      .where('date', '==', date)
      .where('time', '==', time)
      .where('status', 'in', ['pending', 'confirmed', 'checked_in'])
      .get();
    
    const reservedTableIds = new Set(
      existingReservationsSnapshot.docs.map(doc => doc.data().table_id)
    );
    
    // Step 3: Filter out reserved tables
    const availableTables = candidateTables.filter(
      table => !reservedTableIds.has(table.id)
    );
    
    if (availableTables.length === 0) {
      throw new NoAvailableTablesError(partySize, date, time);
    }
    
    // Step 4: Try to acquire lock on available tables (in order of preference)
    // Sort by: preferred area first, then smallest suitable capacity
    const sortedTables = availableTables.sort((a, b) => {
      if (areaPref) {
        const aInPrefArea = a.area === areaPref ? 1 : 0;
        const bInPrefArea = b.area === areaPref ? 1 : 0;
        if (aInPrefArea !== bInPrefArea) return bInPrefArea - aInPrefArea;
      }
      return a.capacity - b.capacity; // Prefer smaller tables (less waste)
    });
    
    // Try each table until we get a lock
    for (const table of sortedTables) {
      const acquired = await acquireTableLock(table.id, reservationProcessId);
      
      if (acquired) {
        // Double-check: verify table is still available (in transaction)
        const isStillAvailable = await db.runTransaction(async (transaction) => {
          const reservationsQuery = await transaction.get(
            db.collection('reservations')
              .where('table_id', '==', table.id)
              .where('date', '==', date)
              .where('time', '==', time)
              .where('status', 'in', ['pending', 'confirmed', 'checked_in'])
              .limit(1)
          );
          
          return reservationsQuery.empty;
        });
        
        if (isStillAvailable) {
          return {
            ...table,
            lock_id: reservationProcessId
          };
        } else {
          // Table became unavailable while we were checking, release lock
          await releaseTableLock(table.id);
        }
      }
    }
    
    // No tables could be locked
    throw new NoAvailableTablesError(partySize, date, time);
    
  } catch (error) {
    // Clean up any locks we might have acquired
    throw error;
  }
}

/**
 * Cleanup expired table locks (should be called by a scheduled job)
 */
async function cleanupExpiredLocks() {
  const db = getDb();
  const now = Date.now();
  
  try {
    const expiredLocksSnapshot = await db.collection('table_locks')
      .where('expires_at', '<', now)
      .get();
    
    const batch = db.batch();
    expiredLocksSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`[Transaction] Cleaned up ${expiredLocksSnapshot.size} expired table locks`);
    return expiredLocksSnapshot.size;
  } catch (error) {
    console.error('[Transaction] Failed to cleanup expired locks:', error);
    throw error;
  }
}

/**
 * Get current table lock status (for debugging/admin)
 */
async function getTableLockStatus(tableId) {
  const db = getDb();
  const lockDoc = await db.collection('table_locks').doc(tableId).get();
  
  if (!lockDoc.exists) {
    return null;
  }
  
  const lockData = lockDoc.data();
  const now = Date.now();
  
  return {
    ...lockData,
    is_expired: lockData.expires_at < now,
    expires_in_ms: Math.max(0, lockData.expires_at - now)
  };
}

module.exports = {
  // Core functions
  findAndLockAvailableTable,
  acquireTableLock,
  releaseTableLock,
  confirmTableLock,
  
  // Maintenance
  cleanupExpiredLocks,
  getTableLockStatus,
  
  // Error classes
  TableLockedError,
  NoAvailableTablesError,
  
  // Constants
  LOCK_TTL
};

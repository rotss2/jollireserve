// Network Resilience Manager - Handles offline operations and sync
export class NetworkResilienceManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingOperations = [];
    this.syncQueue = [];
    this.conflictResolver = new ConflictResolver();
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.syncInProgress = false;
    this.subscribers = new Map();
    this.storageKey = 'network_resilience_data';
    this.conflictKey = 'sync_conflicts';
    
    // Initialize
    this.initialize();
  }

  initialize() {
    // Load pending operations from storage
    this.loadPendingOperations();
    
    // Monitor network status
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Try to sync any pending operations
    if (this.isOnline) {
      this.syncPendingOperations();
    }
  }

  // Handle online status
  handleOnline() {
    console.log('Network connection restored');
    this.isOnline = true;
    this.emit('online');
    this.syncPendingOperations();
  }

  handleOffline() {
    console.log('Network connection lost');
    this.isOnline = false;
    this.emit('offline');
  }

  // Queue operation for execution
  async queueOperation(operation) {
    const queuedOp = {
      id: this.generateOperationId(),
      type: operation.type,
      data: operation.data,
      timestamp: Date.now(),
      retryCount: 0,
      priority: operation.priority || 'normal',
      optimisticData: operation.optimisticData
    };

    // Add to pending operations
    this.pendingOperations.push(queuedOp);
    this.savePendingOperations();

    // If online, try to execute immediately
    if (this.isOnline) {
      try {
        await this.executeOperation(queuedOp);
      } catch (error) {
        console.warn('Immediate execution failed, keeping in queue:', error);
      }
    }

    // Optimistic UI update
    if (queuedOp.optimisticData) {
      this.emit('operation:queued', queuedOp);
    }

    return queuedOp.id;
  }

  // Execute a single operation
  async executeOperation(operation) {
    try {
      let result;
      
      switch (operation.type) {
        case 'create_booking':
          result = await this.executeCreateBooking(operation.data);
          break;
        case 'update_booking':
          result = await this.executeUpdateBooking(operation.data);
          break;
        case 'cancel_booking':
          result = await this.executeCancelBooking(operation.data);
          break;
        case 'join_queue':
          result = await this.executeJoinQueue(operation.data);
          break;
        case 'leave_queue':
          result = await this.executeLeaveQueue(operation.data);
          break;
        case 'update_profile':
          result = await this.executeUpdateProfile(operation.data);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      // Remove from pending operations on success
      this.removePendingOperation(operation.id);
      
      // Notify success
      this.emit('operation:completed', { operation, result });
      
      return result;

    } catch (error) {
      operation.retryCount++;
      
      if (operation.retryCount < this.maxRetries) {
        // Schedule retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, operation.retryCount - 1);
        setTimeout(() => {
          if (this.isOnline) {
            this.executeOperation(operation);
          }
        }, delay);
        
        this.emit('operation:retry', { operation, error, delay });
      } else {
        // Max retries reached
        this.emit('operation:failed', { operation, error });
        
        // Move to failed operations
        this.moveToFailedOperations(operation, error);
      }
      
      throw error;
    }
  }

  // Operation execution methods
  async executeCreateBooking(data) {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Booking creation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async executeUpdateBooking(data) {
    const { bookingId, updateData } = data;
    
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`Booking update failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async executeCancelBooking(data) {
    const { bookingId, reason } = data;
    
    const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error(`Booking cancellation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async executeJoinQueue(data) {
    const response = await fetch('/api/queue/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Queue join failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async executeLeaveQueue(data) {
    const { queueId } = data;
    
    const response = await fetch(`/api/queue/${queueId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Queue leave failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async executeUpdateProfile(data) {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Profile update failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Sync all pending operations
  async syncPendingOperations() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    this.emit('sync:started');

    try {
      const operations = [...this.pendingOperations];
      
      // Sort by priority and timestamp
      operations.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      for (const operation of operations) {
        try {
          await this.executeOperation(operation);
        } catch (error) {
          console.warn(`Failed to sync operation ${operation.id}:`, error);
          // Continue with other operations
        }
      }

      this.emit('sync:completed', { synced: operations.length });

    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('sync:failed', { error });
    } finally {
      this.syncInProgress = false;
    }
  }

  // Handle concurrent booking conflicts
  async resolveBookingConflict(localBooking, serverBooking) {
    const conflict = this.conflictResolver.resolve(localBooking, serverBooking);
    
    switch (conflict.resolution) {
      case 'server_wins':
        return serverBooking;
      case 'local_wins':
        await this.forceUpdateBooking(localBooking);
        return localBooking;
      case 'merge':
        return this.mergeBookings(localBooking, serverBooking);
      case 'user_choice':
        return this.promptUserForResolution(localBooking, serverBooking);
      default:
        throw new Error('Unable to resolve booking conflict');
    }
  }

  async forceUpdateBooking(booking) {
    try {
      await fetch(`/api/bookings/${booking.id}/force-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(booking)
      });
    } catch (error) {
      console.error('Failed to force update booking:', error);
      throw error;
    }
  }

  mergeBookings(local, server) {
    // Simple merge strategy - prefer server data but keep local modifications
    return {
      ...server,
      ...local,
      id: server.id, // Keep server ID
      version: Math.max(local.version || 0, server.version || 0) + 1
    };
  }

  async promptUserForResolution(localBooking, serverBooking) {
    // Store conflict for later resolution
    const conflict = {
      id: this.generateOperationId(),
      type: 'booking_conflict',
      local: localBooking,
      server: serverBooking,
      timestamp: Date.now()
    };

    this.saveConflict(conflict);
    this.emit('conflict:detected', conflict);

    // Return server data for now
    return serverBooking;
  }

  // Storage methods
  savePendingOperations() {
    try {
      const data = {
        pendingOperations: this.pendingOperations,
        timestamp: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save pending operations:', error);
    }
  }

  loadPendingOperations() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.pendingOperations = data.pendingOperations || [];
        
        // Filter out operations older than 24 hours
        const maxAge = 24 * 60 * 60 * 1000;
        this.pendingOperations = this.pendingOperations.filter(
          op => Date.now() - op.timestamp < maxAge
        );
      }
    } catch (error) {
      console.warn('Failed to load pending operations:', error);
      this.pendingOperations = [];
    }
  }

  removePendingOperation(operationId) {
    this.pendingOperations = this.pendingOperations.filter(op => op.id !== operationId);
    this.savePendingOperations();
  }

  moveToFailedOperations(operation, error) {
    const failedOp = {
      ...operation,
      error: error.message,
      failedAt: Date.now()
    };

    try {
      const failedKey = 'failed_operations';
      const failed = JSON.parse(localStorage.getItem(failedKey) || '[]');
      failed.push(failedOp);
      localStorage.setItem(failedKey, JSON.stringify(failed));
    } catch (error) {
      console.warn('Failed to save failed operation:', error);
    }

    this.removePendingOperation(operation.id);
  }

  saveConflict(conflict) {
    try {
      const conflicts = JSON.parse(localStorage.getItem(this.conflictKey) || '[]');
      conflicts.push(conflict);
      localStorage.setItem(this.conflictKey, JSON.stringify(conflicts));
    } catch (error) {
      console.warn('Failed to save conflict:', error);
    }
  }

  // Periodic sync
  startPeriodicSync() {
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress && this.pendingOperations.length > 0) {
        this.syncPendingOperations();
      }
    }, 60000); // Sync every minute
  }

  // Utility methods
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAuthToken() {
    try {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    } catch (error) {
      return null;
    }
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
    
    return () => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  emit(event, data) {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  // Public API methods
  getStatus() {
    return {
      isOnline: this.isOnline,
      pendingOperations: this.pendingOperations.length,
      syncInProgress: this.syncInProgress,
      lastSync: this.lastSyncTime
    };
  }

  getPendingOperations() {
    return [...this.pendingOperations];
  }

  getConflicts() {
    try {
      return JSON.parse(localStorage.getItem(this.conflictKey) || '[]');
    } catch (error) {
      return [];
    }
  }

  resolveConflict(conflictId, resolution) {
    const conflicts = this.getConflicts();
    const conflictIndex = conflicts.findIndex(c => c.id === conflictId);
    
    if (conflictIndex !== -1) {
      conflicts.splice(conflictIndex, 1);
      localStorage.setItem(this.conflictKey, JSON.stringify(conflicts));
      this.emit('conflict:resolved', { conflictId, resolution });
    }
  }

  clearPendingOperations() {
    this.pendingOperations = [];
    this.savePendingOperations();
    this.emit('pending:cleared');
  }

  retryFailedOperation(operationId) {
    const operation = this.pendingOperations.find(op => op.id === operationId);
    if (operation) {
      operation.retryCount = 0;
      this.executeOperation(operation);
    }
  }
}

// Conflict resolution strategy
class ConflictResolver {
  resolve(local, server) {
    // Time-based conflict resolution
    if (local.timestamp && server.timestamp) {
      if (local.timestamp > server.timestamp) {
        return { resolution: 'local_wins', reason: 'local_is_newer' };
      }
      if (server.timestamp > local.timestamp) {
        return { resolution: 'server_wins', reason: 'server_is_newer' };
      }
    }
    
    // Status-based resolution
    if (local.status === 'confirmed' && server.status !== 'confirmed') {
      return { resolution: 'local_wins', reason: 'local_has_higher_status' };
    }
    
    if (server.status === 'confirmed' && local.status !== 'confirmed') {
      return { resolution: 'server_wins', reason: 'server_has_higher_status' };
    }
    
    // Version-based resolution
    if (local.version && server.version) {
      if (local.version > server.version) {
        return { resolution: 'local_wins', reason: 'local_has_higher_version' };
      }
      if (server.version > local.version) {
        return { resolution: 'server_wins', reason: 'server_has_higher_version' };
      }
    }
    
    // Default to user choice
    return { resolution: 'user_choice', reason: 'unable_to_auto_resolve' };
  }
}

// Singleton instance
export const networkResilienceManager = new NetworkResilienceManager();

export default networkResilienceManager;

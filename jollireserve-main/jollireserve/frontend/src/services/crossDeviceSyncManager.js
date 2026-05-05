// Cross-Device Synchronization Manager
export class CrossDeviceSyncManager {
  constructor() {
    this.syncChannel = null;
    this.deviceId = this.generateDeviceId();
    this.isPrimary = false;
    this.devices = new Map();
    this.syncQueue = [];
    this.conflictResolver = new ConflictResolver();
    this.lastSyncTime = 0;
    this.syncInterval = 30000; // 30 seconds
    this.maxRetries = 3;
    this.subscribers = new Map();
    this.isSupported = this.checkSupport();
    
    // Initialize
    this.initialize();
  }

  initialize() {
    if (!this.isSupported) {
      console.warn('Cross-device sync not supported in this browser');
      return;
    }

    // Initialize broadcast channel
    this.syncChannel = new BroadcastChannel('jollibee_sync');
    
    // Set up event listeners
    this.syncChannel.addEventListener('message', this.handleSyncMessage.bind(this));
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Handle online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start device discovery
    this.startDeviceDiscovery();
    
    // Elect primary device
    this.electPrimaryDevice();
    
    // Start periodic sync
    this.startPeriodicSync();
  }

  checkSupport() {
    return typeof BroadcastChannel !== 'undefined';
  }

  generateDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    
    return deviceId;
  }

  // Handle incoming sync messages
  handleSyncMessage(event) {
    const { type, data, deviceId, timestamp, messageId } = event.data;
    
    // Ignore messages from self
    if (deviceId === this.deviceId) return;
    
    // Ignore duplicate messages
    if (this.isDuplicateMessage(messageId)) return;
    
    // Update device last seen
    this.updateDevice(deviceId, { lastSeen: Date.now() });
    
    switch (type) {
      case 'device_discovery':
        this.handleDeviceDiscovery(deviceId, data);
        break;
      case 'device_heartbeat':
        this.handleDeviceHeartbeat(deviceId, data);
        break;
      case 'booking_update':
        this.handleBookingUpdate(data, deviceId, timestamp);
        break;
      case 'queue_update':
        this.handleQueueUpdate(data, deviceId, timestamp);
        break;
      case 'user_preference':
        this.handlePreferenceUpdate(data, deviceId, timestamp);
        break;
      case 'sync_request':
        this.handleSyncRequest(data, deviceId);
        break;
      case 'sync_response':
        this.handleSyncResponse(data, deviceId);
        break;
      case 'conflict_resolution':
        this.handleConflictResolution(data, deviceId);
        break;
      case 'primary_election':
        this.handlePrimaryElection(data, deviceId);
        break;
    }
  }

  // Device discovery
  startDeviceDiscovery() {
    // Announce this device
    this.broadcast({
      type: 'device_discovery',
      data: {
        deviceId: this.deviceId,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        capabilities: this.getDeviceCapabilities()
      }
    });
    
    // Send discovery heartbeat every 30 seconds
    setInterval(() => {
      this.broadcast({
        type: 'device_heartbeat',
        data: {
          deviceId: this.deviceId,
          timestamp: Date.now()
        }
      });
    }, 30000);
  }

  handleDeviceDiscovery(deviceId, data) {
    if (deviceId !== this.deviceId) {
      this.updateDevice(deviceId, {
        ...data,
        discovered: true
      });
      
      // Respond with our device info
      this.broadcast({
        type: 'device_discovery',
        data: {
          deviceId: this.deviceId,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          capabilities: this.getDeviceCapabilities(),
          respondingTo: deviceId
        }
      });
    }
  }

  handleDeviceHeartbeat(deviceId, data) {
    this.updateDevice(deviceId, {
      lastSeen: data.timestamp
    });
  }

  updateDevice(deviceId, updates) {
    const existing = this.devices.get(deviceId) || {};
    this.devices.set(deviceId, {
      ...existing,
      ...updates,
      deviceId
    });
    
    this.emit('deviceUpdated', { deviceId, device: this.devices.get(deviceId) });
  }

  getDeviceCapabilities() {
    return {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
      isDesktop: !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  // Primary device election
  async electPrimaryDevice() {
    const deviceList = Array.from(this.devices.values()).concat([{
      deviceId: this.deviceId,
      timestamp: Date.now(),
      capabilities: this.getDeviceCapabilities()
    }]);
    
    // Sort by device ID (consistent across devices)
    deviceList.sort((a, b) => a.deviceId.localeCompare(b.deviceId));
    
    // First device becomes primary
    const primaryDevice = deviceList[0];
    this.isPrimary = primaryDevice.deviceId === this.deviceId;
    
    // Announce election result
    this.broadcast({
      type: 'primary_election',
      data: {
        primaryDevice: primaryDevice.deviceId,
        timestamp: Date.now()
      }
    });
    
    this.emit('primaryElected', {
      isPrimary: this.isPrimary,
      primaryDevice: primaryDevice.deviceId
    });
  }

  handlePrimaryElection(data, deviceId) {
    if (data.primaryDevice === this.deviceId) {
      this.isPrimary = true;
    } else {
      this.isPrimary = false;
    }
    
    this.emit('primaryElected', {
      isPrimary: this.isPrimary,
      primaryDevice: data.primaryDevice,
      source: deviceId
    });
  }

  // Broadcast booking updates to other devices
  broadcastBookingUpdate(booking) {
    const message = {
      type: 'booking_update',
      data: booking,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };
    
    this.broadcast(message);
    this.addToSyncQueue(message);
  }

  // Handle booking updates from other devices
  async handleBookingUpdate(data, sourceDeviceId, timestamp) {
    try {
      // Check for conflicts
      const localData = await this.getLocalBookingData(data.id);
      
      if (localData && this.hasConflict(localData, data)) {
        const resolution = await this.resolveBookingConflict(localData, data, sourceDeviceId);
        
        if (resolution.requiresUserInput) {
          this.emit('conflictDetected', {
            type: 'booking',
            localData,
            remoteData: data,
            sourceDeviceId
          });
        } else {
          await this.applyConflictResolution(resolution);
        }
      } else {
        // No conflict, apply update
        await this.applyBookingUpdate(data);
        this.emit('bookingSynced', { booking: data, sourceDeviceId });
      }
      
    } catch (error) {
      console.error('Failed to handle booking update:', error);
      this.emit('syncError', { type: 'booking', error, data });
    }
  }

  // Handle queue updates
  async handleQueueUpdate(data, sourceDeviceId, timestamp) {
    try {
      const localData = await this.getLocalQueueData(data.id);
      
      if (localData && this.hasConflict(localData, data)) {
        const resolution = await this.resolveQueueConflict(localData, data, sourceDeviceId);
        
        if (resolution.requiresUserInput) {
          this.emit('conflictDetected', {
            type: 'queue',
            localData,
            remoteData: data,
            sourceDeviceId
          });
        } else {
          await this.applyConflictResolution(resolution);
        }
      } else {
        await this.applyQueueUpdate(data);
        this.emit('queueSynced', { queue: data, sourceDeviceId });
      }
      
    } catch (error) {
      console.error('Failed to handle queue update:', error);
      this.emit('syncError', { type: 'queue', error, data });
    }
  }

  // Handle preference updates
  async handlePreferenceUpdate(data, sourceDeviceId, timestamp) {
    try {
      await this.applyPreferenceUpdate(data);
      this.emit('preferenceSynced', { preference: data, sourceDeviceId });
    } catch (error) {
      console.error('Failed to handle preference update:', error);
      this.emit('syncError', { type: 'preference', error, data });
    }
  }

  // Conflict resolution
  async resolveBookingConflict(localData, remoteData, sourceDeviceId) {
    const conflict = this.conflictResolver.resolve(localData, remoteData);
    
    switch (conflict.resolution) {
      case 'local_wins':
        return { resolution: 'local_wins', data: localData };
      case 'remote_wins':
        return { resolution: 'remote_wins', data: remoteData };
      case 'merge':
        const merged = this.mergeBookings(localData, remoteData);
        return { resolution: 'merge', data: merged };
      case 'timestamp':
        const winner = localData.timestamp > remoteData.timestamp ? localData : remoteData;
        return { resolution: 'timestamp', data: winner };
      case 'user_choice':
        return { resolution: 'user_choice', requiresUserInput: true };
      default:
        return { resolution: 'remote_wins', data: remoteData };
    }
  }

  async resolveQueueConflict(localData, remoteData, sourceDeviceId) {
    const conflict = this.conflictResolver.resolve(localData, remoteData);
    
    switch (conflict.resolution) {
      case 'local_wins':
        return { resolution: 'local_wins', data: localData };
      case 'remote_wins':
        return { resolution: 'remote_wins', data: remoteData };
      case 'merge':
        const merged = this.mergeQueueEntries(localData, remoteData);
        return { resolution: 'merge', data: merged };
      case 'timestamp':
        const winner = localData.timestamp > remoteData.timestamp ? localData : remoteData;
        return { resolution: 'timestamp', data: winner };
      case 'user_choice':
        return { resolution: 'user_choice', requiresUserInput: true };
      default:
        return { resolution: 'remote_wins', data: remoteData };
    }
  }

  // Apply updates
  async applyBookingUpdate(data) {
    // This would integrate with your booking state manager
    localStorage.setItem(`booking_${data.id}`, JSON.stringify(data));
  }

  async applyQueueUpdate(data) {
    localStorage.setItem(`queue_${data.id}`, JSON.stringify(data));
  }

  async applyPreferenceUpdate(data) {
    const preferences = JSON.parse(localStorage.getItem('user_preferences') || '{}');
    const updated = { ...preferences, ...data };
    localStorage.setItem('user_preferences', JSON.stringify(updated));
  }

  async applyConflictResolution(resolution) {
    switch (resolution.resolution) {
      case 'local_wins':
        // Broadcast local data to other devices
        if (resolution.data.type === 'booking') {
          this.broadcastBookingUpdate(resolution.data);
        }
        break;
      case 'remote_wins':
      case 'merge':
        // Apply the resolved data
        if (resolution.data.type === 'booking') {
          await this.applyBookingUpdate(resolution.data);
        } else if (resolution.data.type === 'queue') {
          await this.applyQueueUpdate(resolution.data);
        }
        break;
    }
  }

  // Data retrieval methods
  async getLocalBookingData(bookingId) {
    try {
      const data = localStorage.getItem(`booking_${bookingId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  async getLocalQueueData(queueId) {
    try {
      const data = localStorage.getItem(`queue_${queueId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  // Conflict detection
  hasConflict(localData, remoteData) {
    if (!localData || !remoteData) return false;
    
    // Check version conflicts
    if (localData.version && remoteData.version) {
      return localData.version !== remoteData.version;
    }
    
    // Check timestamp conflicts
    if (localData.timestamp && remoteData.timestamp) {
      const timeDiff = Math.abs(localData.timestamp - remoteData.timestamp);
      return timeDiff > 5000; // 5 second threshold
    }
    
    // Check data differences
    return JSON.stringify(localData) !== JSON.stringify(remoteData);
  }

  // Merge data
  mergeBookings(local, remote) {
    return {
      ...remote,
      // Preserve local modifications
      specialRequests: local.specialRequests || remote.specialRequests,
      // Use most recent timestamps
      timestamp: Math.max(local.timestamp || 0, remote.timestamp || 0),
      // Increment version
      version: Math.max(local.version || 0, remote.version || 0) + 1,
      conflictResolved: true
    };
  }

  mergeQueueEntries(local, remote) {
    return {
      ...remote,
      // Preserve local preferences
      preferences: local.preferences || remote.preferences,
      // Use most recent timestamps
      timestamp: Math.max(local.timestamp || 0, remote.timestamp || 0),
      // Increment version
      version: Math.max(local.version || 0, remote.version || 0) + 1,
      conflictResolved: true
    };
  }

  // Sync request/response
  handleSyncRequest(data, sourceDeviceId) {
    // Send current state to requesting device
    const currentState = this.getCurrentState();
    
    this.broadcast({
      type: 'sync_response',
      data: {
        ...currentState,
        respondingTo: sourceDeviceId
      },
      deviceId: this.deviceId,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    });
  }

  handleSyncResponse(data, sourceDeviceId) {
    if (data.respondingTo === this.deviceId) {
      this.emit('syncResponse', { data, sourceDeviceId });
    }
  }

  requestSync() {
    this.broadcast({
      type: 'sync_request',
      data: {
        deviceId: this.deviceId,
        timestamp: Date.now()
      },
      deviceId: this.deviceId,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    });
  }

  getCurrentState() {
    return {
      bookings: this.getAllBookings(),
      queueEntries: this.getAllQueueEntries(),
      preferences: this.getUserPreferences(),
      timestamp: Date.now()
    };
  }

  getAllBookings() {
    const bookings = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('booking_')) {
        try {
          const booking = JSON.parse(localStorage.getItem(key));
          bookings.push(booking);
        } catch (error) {
          // Ignore invalid data
        }
      }
    }
    return bookings;
  }

  getAllQueueEntries() {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('queue_')) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          entries.push(entry);
        } catch (error) {
          // Ignore invalid data
        }
      }
    }
    return entries;
  }

  getUserPreferences() {
    try {
      return JSON.parse(localStorage.getItem('user_preferences') || '{}');
    } catch (error) {
      return {};
    }
  }

  // Periodic sync
  startPeriodicSync() {
    setInterval(() => {
      if (navigator.onLine && !document.hidden) {
        this.syncWithDevices();
      }
    }, this.syncInterval);
  }

  async syncWithDevices() {
    if (this.devices.size === 0) return;
    
    try {
      const currentState = this.getCurrentState();
      
      this.broadcast({
        type: 'sync_update',
        data: currentState,
        deviceId: this.deviceId,
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });
      
      this.lastSyncTime = Date.now();
      this.emit('syncCompleted', { timestamp: this.lastSyncTime });
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('syncError', { error });
    }
  }

  // Utility methods
  broadcast(message) {
    if (this.syncChannel) {
      try {
        this.syncChannel.postMessage(message);
      } catch (error) {
        console.error('Failed to broadcast message:', error);
      }
    }
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isDuplicateMessage(messageId) {
    const key = `msg_${messageId}`;
    if (localStorage.getItem(key)) {
      return true;
    }
    
    localStorage.setItem(key, '1');
    
    // Clean up old message IDs
    setTimeout(() => {
      localStorage.removeItem(key);
    }, 60000); // Keep for 1 minute
    
    return false;
  }

  addToSyncQueue(message) {
    this.syncQueue.push(message);
    
    // Limit queue size
    if (this.syncQueue.length > 100) {
      this.syncQueue.shift();
    }
  }

  // Event handlers
  handleVisibilityChange() {
    if (!document.hidden) {
      // Page became visible, request sync
      this.requestSync();
    }
  }

  handleOnline() {
    // Came back online, start sync
    this.syncWithDevices();
  }

  handleOffline() {
    // Went offline, pause sync
    this.emit('offline');
  }

  // User conflict resolution
  resolveConflictManually(conflictId, resolution) {
    this.broadcast({
      type: 'conflict_resolution',
      data: {
        conflictId,
        resolution,
        resolvedBy: this.deviceId
      },
      deviceId: this.deviceId,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    });
  }

  // Public API
  getStatus() {
    return {
      isSupported: this.isSupported,
      deviceId: this.deviceId,
      isPrimary: this.isPrimary,
      connectedDevices: this.devices.size,
      lastSyncTime: this.lastSyncTime,
      syncQueueSize: this.syncQueue.length
    };
  }

  getConnectedDevices() {
    return Array.from(this.devices.values());
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

  // Cleanup
  destroy() {
    if (this.syncChannel) {
      this.syncChannel.close();
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    // Clear subscribers
    this.subscribers.clear();
  }
}

// Conflict resolution strategy
class ConflictResolver {
  resolve(local, remote) {
    // Time-based resolution
    if (local.timestamp && remote.timestamp) {
      if (local.timestamp > remote.timestamp) {
        return { resolution: 'local_wins', reason: 'local_is_newer' };
      }
      if (remote.timestamp > local.timestamp) {
        return { resolution: 'remote_wins', reason: 'remote_is_newer' };
      }
    }
    
    // Version-based resolution
    if (local.version && remote.version) {
      if (local.version > remote.version) {
        return { resolution: 'local_wins', reason: 'local_has_higher_version' };
      }
      if (remote.version > local.version) {
        return { resolution: 'remote_wins', reason: 'remote_has_higher_version' };
      }
    }
    
    // Status-based resolution
    if (local.status === 'confirmed' && remote.status !== 'confirmed') {
      return { resolution: 'local_wins', reason: 'local_has_higher_status' };
    }
    
    if (remote.status === 'confirmed' && local.status !== 'confirmed') {
      return { resolution: 'remote_wins', reason: 'remote_has_higher_status' };
    }
    
    // Default to user choice
    return { resolution: 'user_choice', reason: 'unable_to_auto_resolve' };
  }
}

// Singleton instance
export const crossDeviceSyncManager = new CrossDeviceSyncManager();

export default crossDeviceSyncManager;

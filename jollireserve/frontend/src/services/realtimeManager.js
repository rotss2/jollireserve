// Real-time Connection Manager with WebSocket and HTTP polling fallback
export class RealtimeManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.messageQueue = [];
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionStatus = 'disconnected';
    this.subscribers = new Map();
    this.pollingInterval = null;
    this.lastMessageId = 0;
    this.connectionQuality = 'unknown';
    this.latency = 0;
    this.messageBuffer = [];
    this.bufferMaxSize = 100;
    
    // Bind methods
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  // Initialize connection
  async connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.isConnecting = true;
      this.connectionStatus = 'connecting';
      this.notifyStatusChange();

      const wsUrl = this.getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;

      // Set connection timeout
      setTimeout(() => {
        if (this.isConnecting) {
          console.warn('WebSocket connection timeout');
          this.handleConnectionTimeout();
        }
      }, 10000);

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleConnectionError(error);
    }
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    // Add auth token if available
    const token = this.getAuthToken();
    return token ? `${wsUrl}?token=${token}` : wsUrl;
  }

  getAuthToken() {
    try {
      return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    } catch (error) {
      return null;
    }
  }

  handleOpen() {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.isConnecting = false;
    this.connectionStatus = 'connected';
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Flush queued messages
    this.flushMessageQueue();
    
    // Notify subscribers
    this.notifyStatusChange();
    this.emit('connected');
  }

  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.lastMessageId = Math.max(this.lastMessageId, message.id || 0);
      
      // Update connection quality based on message timestamp
      if (message.timestamp) {
        const now = Date.now();
        this.latency = now - message.timestamp;
        this.updateConnectionQuality();
      }
      
      // Handle different message types
      switch (message.type) {
        case 'heartbeat':
          this.handleHeartbeat(message);
          break;
        case 'broadcast':
          this.handleBroadcast(message);
          break;
        case 'private':
          this.handlePrivateMessage(message);
          break;
        case 'queue_update':
          this.handleQueueUpdate(message);
          break;
        case 'booking_update':
          this.handleBookingUpdate(message);
          break;
        case 'system_status':
          this.handleSystemStatus(message);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
      
      this.emit('message', message);
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  handleClose(event) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionStatus = 'disconnected';
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Handle reconnection
    this.handleReconnect();
    
    // Notify subscribers
    this.notifyStatusChange();
    this.emit('disconnected', { code: event.code, reason: event.reason });
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    this.emit('error', error);
  }

  handleConnectionTimeout() {
    console.warn('WebSocket connection timeout');
    this.isConnecting = false;
    this.handleConnectionError(new Error('Connection timeout'));
  }

  handleConnectionError(error) {
    this.connectionStatus = 'disconnected';
    this.isConnecting = false;
    this.notifyStatusChange();
    
    // Start polling fallback
    this.startPollingFallback();
    
    this.emit('connectionFailed', error);
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.startPollingFallback();
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.send({
          type: 'heartbeat',
          timestamp: Date.now(),
          id: this.generateMessageId()
        });
      }
    }, 30000); // Every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  handleHeartbeat(message) {
    // Calculate round-trip time
    if (message.timestamp) {
      this.latency = Date.now() - message.timestamp;
      this.updateConnectionQuality();
    }
    
    // Send heartbeat response
    this.send({
      type: 'heartbeat_response',
      timestamp: Date.now(),
      originalTimestamp: message.timestamp,
      id: this.generateMessageId()
    });
  }

  updateConnectionQuality() {
    if (this.latency < 100) {
      this.connectionQuality = 'excellent';
    } else if (this.latency < 300) {
      this.connectionQuality = 'good';
    } else if (this.latency < 1000) {
      this.connectionQuality = 'poor';
    } else {
      this.connectionQuality = 'bad';
    }
    
    this.emit('qualityChange', this.connectionQuality);
  }

  // Send message with queuing
  send(message) {
    const messageWithId = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now()
    };

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(messageWithId));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(messageWithId);
        return false;
      }
    } else {
      this.queueMessage(messageWithId);
      return false;
    }
  }

  queueMessage(message) {
    this.messageQueue.push(message);
    
    // Limit queue size
    if (this.messageQueue.length > 50) {
      this.messageQueue.shift();
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  // Polling fallback for when WebSocket fails
  startPollingFallback() {
    if (this.pollingInterval) return;
    
    console.log('Starting HTTP polling fallback');
    this.connectionStatus = 'polling';
    this.notifyStatusChange();
    
    this.pollingInterval = setInterval(async () => {
      try {
        const updates = await this.fetchUpdates();
        if (updates && updates.length > 0) {
          updates.forEach(update => {
            this.handleMessage({ data: JSON.stringify(update) });
          });
        }
      } catch (error) {
        console.warn('Polling fallback failed:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  stopPollingFallback() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async fetchUpdates() {
    try {
      const token = this.getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/updates?since=${this.lastMessageId}`, {
        headers,
        timeout: 5000
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch updates:', error);
    }
    
    return [];
  }

  // Message handlers
  handleBroadcast(message) {
    this.emit('broadcast', message);
  }

  handlePrivateMessage(message) {
    this.emit('privateMessage', message);
  }

  handleQueueUpdate(message) {
    this.emit('queueUpdate', message);
  }

  handleBookingUpdate(message) {
    this.emit('bookingUpdate', message);
  }

  handleSystemStatus(message) {
    this.emit('systemStatus', message);
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
    
    // Return unsubscribe function
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

  notifyStatusChange() {
    this.emit('statusChange', {
      status: this.connectionStatus,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      quality: this.connectionQuality,
      latency: this.latency,
      reconnectAttempts: this.reconnectAttempts
    });
  }

  // Utility methods
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectionInfo() {
    return {
      status: this.connectionStatus,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      quality: this.connectionQuality,
      latency: this.latency,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      lastMessageId: this.lastMessageId
    };
  }

  // Manual reconnection
  reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  // Disconnect
  disconnect() {
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionStatus = 'disconnected';
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.stopHeartbeat();
    this.stopPollingFallback();
    
    this.notifyStatusChange();
    this.emit('disconnected');
  }

  // Subscribe to specific data types
  subscribeToBookingUpdates(callback) {
    return this.on('bookingUpdate', callback);
  }

  subscribeToQueueUpdates(callback) {
    return this.on('queueUpdate', callback);
  }

  subscribeToSystemStatus(callback) {
    return this.on('systemStatus', callback);
  }

  // Send specific message types
  sendBookingUpdate(bookingId, update) {
    return this.send({
      type: 'booking_update',
      bookingId,
      update,
      timestamp: Date.now()
    });
  }

  sendQueueUpdate(queueId, update) {
    return this.send({
      type: 'queue_update',
      queueId,
      update,
      timestamp: Date.now()
    });
  }

  requestSystemStatus() {
    return this.send({
      type: 'status_request',
      timestamp: Date.now()
    });
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager();

// Auto-connect when page loads
if (typeof window !== 'undefined') {
  // Wait for auth token to be available
  const initConnection = () => {
    if (localStorage.getItem('authToken') || sessionStorage.getItem('authToken')) {
      realtimeManager.connect();
    } else {
      // Try again after a short delay
      setTimeout(initConnection, 1000);
    }
  };
  
  // Initialize connection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConnection);
  } else {
    initConnection();
  }
  
  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page is hidden, reduce activity
      realtimeManager.stopHeartbeat();
    } else {
      // Page is visible, resume activity
      if (realtimeManager.isConnected) {
        realtimeManager.startHeartbeat();
      } else {
        realtimeManager.connect();
      }
    }
  });
  
  // Handle online/offline events
  window.addEventListener('online', () => {
    if (!realtimeManager.isConnected) {
      realtimeManager.connect();
    }
  });
  
  window.addEventListener('offline', () => {
    realtimeManager.startPollingFallback();
  });
}

export default realtimeManager;

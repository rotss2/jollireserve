/**
 * Socket Manager - Frontend WebSocket Client
 * Real-Time Queue System V2
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing when offline
 * - Connection state management
 * - Heartbeat/ping monitoring
 */

import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.reconnectionToken = null;
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    
    this.messageQueue = [];
    this.eventHandlers = new Map();
    this.heartbeatInterval = null;
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  /**
   * Connect to WebSocket server
   */
  connect(authToken, userId) {
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: false, // We'll handle reconnection manually for better control
      timeout: 10000
    });

    // Connection established
    this.socket.on('connect', () => {
      console.log('[SocketManager] Connected:', this.socket.id);
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      // Authenticate
      this.socket.emit('auth', {
        token: authToken,
        userId: userId,
        type: 'customer'
      });
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Deliver queued messages
      this.deliverQueuedMessages();
      
      // Notify listeners
      this.triggerEvent('connection:established', {
        socketId: this.socket.id,
        timestamp: Date.now()
      });
    });

    // Authentication successful
    this.socket.on('auth:success', (data) => {
      console.log('[SocketManager] Authenticated:', data.userId);
      this.connectionState = 'authenticated';
      this.triggerEvent('auth:success', data);
    });

    // Authentication failed
    this.socket.on('auth:failed', (error) => {
      console.error('[SocketManager] Auth failed:', error);
      this.connectionState = 'auth_failed';
      this.triggerEvent('auth:failed', error);
    });

    // Reconnection success
    this.socket.on('reconnect:success', (data) => {
      console.log('[SocketManager] Reconnected successfully');
      this.connectionState = 'connected';
      this.reconnectionToken = null;
      this.reconnectAttempts = 0;
      this.triggerEvent('reconnect:success', data);
    });

    // Reconnection failed
    this.socket.on('reconnect:failed', (error) => {
      console.error('[SocketManager] Reconnect failed:', error);
      this.reconnectionToken = null;
      this.triggerEvent('reconnect:failed', error);
      
      // Try normal reconnection
      this.attemptReconnect(authToken, userId);
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('[SocketManager] Disconnected:', reason);
      this.connectionState = 'disconnected';
      this.stopHeartbeat();
      
      this.triggerEvent('disconnect', { reason, timestamp: Date.now() });
      
      // Attempt reconnection unless intentionally disconnected
      if (reason !== 'io client disconnect') {
        this.attemptReconnect(authToken, userId);
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('[SocketManager] Connection error:', error.message);
      this.connectionState = 'error';
      this.triggerEvent('connect_error', error);
    });

    // Heartbeat response
    this.socket.on('pong', (data) => {
      this.triggerEvent('pong', data);
    });

    // Queue events
    this.setupQueueEventHandlers();

    return this.socket;
  }

  /**
   * Setup queue-specific event handlers
   */
  setupQueueEventHandlers() {
    // Queue joined
    this.socket?.on('queue:joined', (data) => {
      console.log('[SocketManager] Joined queue:', data);
      this.triggerEvent('queue:joined', data);
    });

    // Queue status update
    this.socket?.on('queue:update', (data) => {
      this.triggerEvent('queue:update', data);
    });

    // Table ready notification
    this.socket?.on('notification', (data) => {
      console.log('[SocketManager] Notification:', data);
      this.triggerEvent('notification', data);
      
      // Show browser notification if supported
      this.showBrowserNotification(data);
    });

    // Queue error
    this.socket?.on('queue:error', (error) => {
      console.error('[SocketManager] Queue error:', error);
      this.triggerEvent('queue:error', error);
    });
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  attemptReconnect(authToken, userId) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SocketManager] Max reconnection attempts reached');
      this.triggerEvent('reconnect:failed', {
        error: 'Max attempts reached',
        attempts: this.reconnectAttempts
      });
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;
    
    // Calculate delay with exponential backoff and jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    const jitter = Math.random() * 1000; // Add randomness
    const totalDelay = delay + jitter;
    
    console.log(`[SocketManager] Reconnecting in ${Math.round(totalDelay)}ms (attempt ${this.reconnectAttempts})`);
    
    this.triggerEvent('reconnecting', {
      attempt: this.reconnectAttempts,
      delay: totalDelay,
      maxAttempts: this.maxReconnectAttempts
    });

    setTimeout(() => {
      // Try with reconnection token if available
      if (this.reconnectionToken) {
        this.socket?.emit('reconnect:attempt', {
          token: this.reconnectionToken
        });
      } else {
        // Fresh connection
        this.connect(authToken, userId);
      }
    }, totalDelay);
  }

  /**
   * Manual reconnect
   */
  reconnect(authToken, userId) {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.connect(authToken, userId);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopHeartbeat();
    this.connectionState = 'disconnected';
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, 25000); // Send ping every 25 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Emit event to server (with queuing if offline)
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    } else {
      // Queue message for later
      this.messageQueue.push({ event, data, timestamp: Date.now() });
      console.log('[SocketManager] Message queued for later delivery:', event);
      return false;
    }
  }

  /**
   * Deliver queued messages when back online
   */
  deliverQueuedMessages() {
    if (this.messageQueue.length === 0) return;
    
    console.log(`[SocketManager] Delivering ${this.messageQueue.length} queued messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    queue.forEach(({ event, data }) => {
      this.emit(event, data);
    });
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
    
    // Also register with socket if connected
    this.socket?.on(event, handler);
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    
    // Also remove from socket
    this.socket?.off(event, handler);
  }

  /**
   * Trigger event on all registered handlers
   */
  triggerEvent(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('[SocketManager] Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Join queue
   */
  joinQueue(queueData) {
    return this.emit('queue:join', queueData);
  }

  /**
   * Leave queue
   */
  leaveQueue(queueId) {
    return this.emit('queue:leave', { queueId });
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return this.emit('queue:status');
  }

  /**
   * Respond to table ready notification
   */
  respondToTableReady(queueId, response) {
    return this.emit('queue:response', { queueId, response });
  }

  /**
   * Show browser notification
   */
  showBrowserNotification(data) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification('Jollibee Reserve', {
        body: data.message,
        icon: '/favicon.svg',
        tag: data.type,
        requireInteraction: data.type === 'table_ready'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showBrowserNotification(data);
        }
      });
    }
  }

  /**
   * Get current connection state
   */
  getState() {
    return {
      state: this.connectionState,
      connected: this.socket?.connected || false,
      id: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.messageQueue.length
    };
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false;
    }
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
}

// Export singleton
export const socketManager = new SocketManager();

export default socketManager;

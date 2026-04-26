// Real-time WebSocket Server - Production-ready with enterprise features
const WebSocket = require('ws');
const Redis = require('redis');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

class RealtimeServer {
  constructor(port = 8080) {
    this.port = port;
    this.wss = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.redis = null;
    this.messageQueue = [];
    this.processingQueue = false;
    this.stats = {
      connections: 0,
      messages: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    this.initializeRedis();
    this.setupMessageHandlers();
  }

  async initializeRedis() {
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('Redis connection refused');
          return new Error('Redis server unavailable');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected for WebSocket server');
      this.startRedisSubscriptions();
    });

    await this.redis.connect();
  }

  startRedisSubscriptions() {
    // Subscribe to booking updates
    this.redis.subscribe('booking_updates', (message) => {
      this.broadcastToType('booking', JSON.parse(message));
    });

    // Subscribe to queue updates
    this.redis.subscribe('queue_updates', (message) => {
      this.broadcastToType('queue', JSON.parse(message));
    });

    // Subscribe to system updates
    this.redis.subscribe('system_updates', (message) => {
      this.broadcastToAll(JSON.parse(message));
    });

    // Subscribe to notifications
    this.redis.subscribe('notifications', (message) => {
      this.handleNotification(JSON.parse(message));
    });
  }

  start() {
    this.wss = new WebSocket.Server({
      port: this.port,
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));

    // Start message queue processor
    this.startMessageProcessor();

    // Start stats reporting
    this.startStatsReporting();

    console.log(`WebSocket server started on port ${this.port}`);
  }

  async verifyClient(info) {
    try {
      // Extract token from query string or headers
      const url = new URL(info.req.url, 'http://localhost');
      const token = url.searchParams.get('token') || 
                   info.req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return false; // Reject connection without token
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Add user info to request
      info.req.user = decoded;
      
      // Rate limiting check
      const clientIP = info.req.socket.remoteAddress;
      const rateLimitKey = `ws_rate_limit:${clientIP}`;
      
      const currentConnections = await this.redis.get(rateLimitKey) || 0;
      if (currentConnections > 10) { // Max 10 connections per IP
        return false;
      }

      // Increment connection count
      await this.redis.incr(rateLimitKey);
      await this.redis.expire(rateLimitKey, 3600); // 1 hour expiry

      return true;
    } catch (error) {
      console.warn('WebSocket client verification failed:', error.message);
      return false;
    }
  }

  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const user = req.user;
    
    const client = {
      id: clientId,
      ws,
      user,
      rooms: new Set(),
      lastPing: Date.now(),
      messageCount: 0,
      connectedAt: Date.now(),
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    this.clients.set(clientId, client);
    this.stats.connections++;

    // Setup client event handlers
    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
    ws.on('error', (error) => this.handleClientError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId));

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      data: {
        clientId,
        serverTime: new Date().toISOString(),
        features: ['booking_updates', 'queue_updates', 'notifications']
      }
    });

    // Start heartbeat for this client
    this.startClientHeartbeat(clientId);

    // Log connection
    console.log(`Client connected: ${clientId} (User: ${user.id})`);
  }

  handleMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      client.messageCount++;
      this.stats.messages++;

      const message = JSON.parse(data.toString());
      
      // Validate message structure
      if (!this.validateMessage(message)) {
        this.sendError(clientId, 'Invalid message format');
        return;
      }

      // Rate limiting per client
      if (client.messageCount > 100) { // Max 100 messages per minute
        this.sendError(clientId, 'Rate limit exceeded');
        return;
      }

      // Route message to appropriate handler
      this.routeMessage(clientId, message);

    } catch (error) {
      console.error(`Message handling error for client ${clientId}:`, error);
      this.sendError(clientId, 'Message processing failed');
      this.stats.errors++;
    }
  }

  validateMessage(message) {
    return message && 
           typeof message === 'object' && 
           typeof message.type === 'string' &&
           message.data;
  }

  routeMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'join_room':
        this.handleJoinRoom(clientId, message.data);
        break;
      case 'leave_room':
        this.handleLeaveRoom(clientId, message.data);
        break;
      case 'heartbeat':
        this.handleHeartbeat(clientId, message.data);
        break;
      case 'booking_update':
        this.handleBookingUpdate(clientId, message.data);
        break;
      case 'queue_update':
        this.handleQueueUpdate(clientId, message.data);
        break;
      case 'get_status':
        this.handleGetStatus(clientId, message.data);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
        this.sendError(clientId, 'Unknown message type');
    }
  }

  handleJoinRoom(clientId, roomData) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { room, type = 'booking' } = roomData;
    
    // Validate room access
    if (!this.validateRoomAccess(client.user, room, type)) {
      this.sendError(clientId, 'Access denied to room');
      return;
    }

    client.rooms.add(room);
    
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(clientId);

    this.sendToClient(clientId, {
      type: 'room_joined',
      data: { room, type }
    });

    console.log(`Client ${clientId} joined room: ${room}`);
  }

  handleLeaveRoom(clientId, roomData) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { room } = roomData;
    
    client.rooms.delete(room);
    
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }

    this.sendToClient(clientId, {
      type: 'room_left',
      data: { room }
    });
  }

  handleHeartbeat(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastPing = Date.now();

    this.sendToClient(clientId, {
      type: 'heartbeat_response',
      data: {
        timestamp: new Date().toISOString(),
        serverTime: Date.now()
      }
    });
  }

  handleBookingUpdate(clientId, data) {
    // Queue booking update for processing
    this.queueMessage({
      type: 'booking_update',
      clientId,
      data,
      timestamp: Date.now()
    });
  }

  handleQueueUpdate(clientId, data) {
    // Queue queue update for processing
    this.queueMessage({
      type: 'queue_update',
      clientId,
      data,
      timestamp: Date.now()
    });
  }

  handleGetStatus(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.sendToClient(clientId, {
      type: 'status_response',
      data: {
        clientId: client.id,
        connectedAt: client.connectedAt,
        messageCount: client.messageCount,
        rooms: Array.from(client.rooms),
        serverStats: this.getServerStats()
      }
    });
  }

  validateRoomAccess(user, room, type) {
    // Implement room access validation logic
    // For example, users can only join their own booking rooms
    
    if (type === 'booking') {
      // Check if room belongs to user's booking
      return room.startsWith(`booking_${user.id}_`) || 
             room.startsWith('area_') || 
             room === 'global';
    }
    
    if (type === 'queue') {
      return room.startsWith(`queue_${user.id}_`) || 
             room.startsWith('area_') || 
             room === 'global';
    }
    
    return false;
  }

  handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove client from all rooms
    client.rooms.forEach(room => {
      const roomClients = this.rooms.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
        if (roomClients.size === 0) {
          this.rooms.delete(room);
        }
      }
    });

    // Remove client
    this.clients.delete(clientId);

    // Update rate limit
    this.redis.decr(`ws_rate_limit:${client.ip}`).catch(() => {});

    console.log(`Client disconnected: ${clientId} (${code}: ${reason})`);
  }

  handleClientError(clientId, error) {
    console.error(`Client error for ${clientId}:`, error);
    this.stats.errors++;
  }

  handlePong(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = Date.now();
    }
  }

  handleServerError(error) {
    console.error('WebSocket server error:', error);
    this.stats.errors++;
  }

  handleNotification(notification) {
    // Send notification to specific user
    const targetClient = Array.from(this.clients.values())
      .find(client => client.user.id === notification.userId);

    if (targetClient) {
      this.sendToClient(targetClient.id, {
        type: 'notification',
        data: notification
      });
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      this.handleDisconnection(clientId, 1006, 'Send error');
    }
  }

  sendError(clientId, error) {
    this.sendToClient(clientId, {
      type: 'error',
      data: { error, timestamp: new Date().toISOString() }
    });
  }

  broadcastToRoom(room, message, excludeClientId = null) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;

    roomClients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  broadcastToType(type, message) {
    this.clients.forEach((client, clientId) => {
      if (client.rooms.has(`type_${type}`) || client.rooms.has('global')) {
        this.sendToClient(clientId, message);
      }
    });
  }

  broadcastToAll(message) {
    this.clients.forEach((_, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  queueMessage(message) {
    this.messageQueue.push(message);
    
    // Limit queue size
    if (this.messageQueue.length > 1000) {
      this.messageQueue.shift();
    }

    if (!this.processingQueue) {
      this.processMessageQueue();
    }
  }

  async processMessageQueue() {
    this.processingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      
      try {
        await this.processQueuedMessage(message);
      } catch (error) {
        console.error('Failed to process queued message:', error);
        this.stats.errors++;
      }
    }

    this.processingQueue = false;
  }

  async processQueuedMessage(message) {
    switch (message.type) {
      case 'booking_update':
        await this.processBookingUpdate(message);
        break;
      case 'queue_update':
        await this.processQueueUpdate(message);
        break;
    }
  }

  async processBookingUpdate(message) {
    // Process booking update and broadcast to relevant clients
    const { clientId, data } = message;
    
    // Broadcast to room
    if (data.bookingId) {
      this.broadcastToRoom(`booking_${data.bookingId}`, {
        type: 'booking_update',
        data,
        timestamp: new Date().toISOString()
      }, clientId);
    }
  }

  async processQueueUpdate(message) {
    // Process queue update and broadcast to relevant clients
    const { clientId, data } = message;
    
    // Broadcast to room
    if (data.queueId) {
      this.broadcastToRoom(`queue_${data.queueId}`, {
        type: 'queue_update',
        data,
        timestamp: new Date().toISOString()
      }, clientId);
    }
  }

  startClientHeartbeat(clientId) {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client) {
        clearInterval(interval);
        return;
      }

      // Check if client is still alive
      if (Date.now() - client.lastPing > 60000) { // 1 minute timeout
        client.ws.terminate();
        this.handleDisconnection(clientId, 1000, 'Heartbeat timeout');
        clearInterval(interval);
      } else {
        // Send ping
        client.ws.ping();
      }
    }, 30000); // Every 30 seconds
  }

  startMessageProcessor() {
    // Process message queue every 100ms
    setInterval(() => {
      if (!this.processingQueue && this.messageQueue.length > 0) {
        this.processMessageQueue();
      }
    }, 100);
  }

  startStatsReporting() {
    // Report stats every 5 minutes
    setInterval(() => {
      const stats = this.getServerStats();
      
      // Store stats in Redis for monitoring
      this.redis.lpush('websocket_stats', JSON.stringify(stats));
      this.redis.ltrim('websocket_stats', 0, 287); // Keep last 24 hours (every 5 mins)

      console.log('WebSocket Server Stats:', stats);
    }, 5 * 60 * 1000);
  }

  getServerStats() {
    const uptime = Date.now() - this.stats.startTime;
    const avgMessagesPerConnection = this.stats.connections > 0 ? 
      this.stats.messages / this.stats.connections : 0;

    return {
      uptime,
      connections: this.stats.connections,
      activeConnections: this.clients.size,
      totalMessages: this.stats.messages,
      errors: this.stats.errors,
      avgMessagesPerConnection,
      roomsCount: this.rooms.size,
      queueSize: this.messageQueue.length,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('Shutting down WebSocket server...');
    
    // Close all connections
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, {
        type: 'server_shutdown',
        data: { message: 'Server is shutting down' }
      });
      client.ws.close(1001, 'Server shutdown');
    });

    // Close server
    if (this.wss) {
      this.wss.close();
    }

    // Close Redis connection
    if (this.redis) {
      await this.redis.quit();
    }

    console.log('WebSocket server shutdown complete');
  }
}

module.exports = RealtimeServer;

/**
 * Enhanced WebSocket Server
 * Real-Time Queue System V2
 * 
 * Features:
 * - Reconnection with tokens
 * - Heartbeat/ping-pong
 * - Message queuing
 * - Connection state tracking
 * - Automatic cleanup
 */

const { Server } = require('socket.io');
const queueManager = require('./services/QueueManager');

let io = null;
const connections = new Map(); // socketId -> connection info

/**
 * Initialize WebSocket server
 */
function initWebSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(',') || [
        "http://localhost:5173",
        "https://jollireserve-frontend.onrender.com"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 30000, // 30 seconds
    pingInterval: 25000, // 25 seconds
    transports: ['websocket', 'polling'] // Fallback to polling if websocket fails
  });

  console.log('✅ WebSocket server initialized');

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);
    
    // Store connection info
    connections.set(socket.id, {
      socket,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      userId: null,
      queueId: null,
      isAuthenticated: false
    });

    // Handle authentication
    socket.on('auth', handleAuth(socket));
    
    // Handle reconnection with token
    socket.on('reconnect:attempt', handleReconnect(socket));
    
    // Queue operations
    socket.on('queue:join', handleQueueJoin(socket));
    socket.on('queue:leave', handleQueueLeave(socket));
    socket.on('queue:status', handleQueueStatus(socket));
    socket.on('queue:response', handleQueueResponse(socket));
    
    // Heartbeat response
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      handleDisconnect(socket, reason);
    });

    // Send initial connection success
    socket.emit('connection:established', {
      socketId: socket.id,
      timestamp: Date.now(),
      serverTime: new Date().toISOString()
    });
  });

  // Start heartbeat monitor
  startHeartbeatMonitor();
  
  // Start cleanup interval
  setInterval(cleanupDeadConnections, 60000); // Every minute

  return io;
}

/**
 * Handle client authentication
 */
function handleAuth(socket) {
  return async (data) => {
    try {
      const { token, userId, type } = data;
      
      // TODO: Validate JWT token
      // For now, accept any token (implement proper JWT validation)
      
      const conn = connections.get(socket.id);
      if (conn) {
        conn.userId = userId;
        conn.isAuthenticated = true;
        conn.userType = type || 'customer';
      }

      socket.emit('auth:success', {
        userId,
        socketId: socket.id,
        authenticated: true
      });

      console.log(`[WebSocket] Client authenticated: ${userId}`);
    } catch (error) {
      console.error('[WebSocket] Auth failed:', error);
      socket.emit('auth:failed', {
        error: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }
  };
}

/**
 * Handle reconnection with token
 */
function handleReconnect(socket) {
  return async (data) => {
    const { token } = data;
    
    console.log(`[WebSocket] Reconnection attempt with token: ${token}`);
    
    const success = queueManager.reconnectWithToken(socket, token);
    
    if (!success) {
      socket.emit('reconnect:failed', {
        error: 'Invalid or expired reconnection token',
        code: 'RECONNECT_FAILED',
        suggestion: 'Please rejoin the queue'
      });
    }
  };
}

/**
 * Handle queue join
 */
function handleQueueJoin(socket) {
  return async (data) => {
    try {
      const conn = connections.get(socket.id);
      if (!conn || !conn.isAuthenticated) {
        socket.emit('queue:error', {
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const { name, phone, partySize, preferences } = data;
      
      const queueEntry = await queueManager.joinQueue({
        userId: conn.userId,
        name,
        phone,
        partySize,
        preferences
      });

      // Store queue association
      conn.queueId = 'main'; // Could be dynamic based on location
      queueManager.handleConnection(socket, conn.userId, 'main');

      socket.emit('queue:joined', {
        success: true,
        queueId: queueEntry.id,
        position: queueEntry.position,
        estimatedWait: queueEntry.estimated_wait_minutes,
        joinedAt: queueEntry.joined_at
      });

      console.log(`[WebSocket] ${name} joined queue at position ${queueEntry.position}`);
    } catch (error) {
      console.error('[WebSocket] Queue join failed:', error);
      socket.emit('queue:error', {
        error: error.message,
        code: 'QUEUE_JOIN_FAILED'
      });
    }
  };
}

/**
 * Handle queue leave
 */
function handleQueueLeave(socket) {
  return async (data) => {
    try {
      const conn = connections.get(socket.id);
      if (!conn || !conn.queueId) {
        socket.emit('queue:error', {
          error: 'Not in queue',
          code: 'NOT_IN_QUEUE'
        });
        return;
      }

      await queueManager.leaveQueue(data.queueId, conn.userId);

      socket.emit('queue:left', {
        success: true,
        queueId: data.queueId,
        leftAt: new Date().toISOString()
      });

      console.log(`[WebSocket] ${conn.userId} left queue`);
    } catch (error) {
      console.error('[WebSocket] Queue leave failed:', error);
      socket.emit('queue:error', {
        error: error.message,
        code: 'QUEUE_LEAVE_FAILED'
      });
    }
  };
}

/**
 * Handle queue status request
 */
function handleQueueStatus(socket) {
  return async () => {
    const conn = connections.get(socket.id);
    if (!conn || !conn.queueId) {
      socket.emit('queue:status', null);
      return;
    }

    const status = queueManager.getQueueStatus(conn.queueId, conn.userId);
    socket.emit('queue:status', status);
  };
}

/**
 * Handle customer response to table ready notification
 */
function handleQueueResponse(socket) {
  return async (data) => {
    try {
      const { queueId, response } = data; // response: 'accept' or 'decline'
      const conn = connections.get(socket.id);
      
      if (response === 'accept') {
        // Customer is coming to take the table
        await queueManager.confirmTableAcceptance(queueId, conn.userId);
        socket.emit('queue:response:confirmed', {
          message: 'Please proceed to the host stand',
          validUntil: Date.now() + (10 * 60 * 1000) // 10 minutes
        });
      } else if (response === 'decline') {
        // Customer is declining, move to next in queue
        await queueManager.leaveQueue(queueId, conn.userId);
        socket.emit('queue:response:declined', {
          message: 'You have been removed from the queue'
        });
      }
    } catch (error) {
      console.error('[WebSocket] Queue response failed:', error);
      socket.emit('queue:error', {
        error: error.message,
        code: 'RESPONSE_FAILED'
      });
    }
  };
}

/**
 * Handle disconnection
 */
function handleDisconnect(socket, reason) {
  console.log(`[WebSocket] Client disconnected: ${socket.id}, reason: ${reason}`);
  
  const conn = connections.get(socket.id);
  if (conn) {
    // Generate reconnection token
    const token = queueManager.handleDisconnection(socket.id);
    
    if (token) {
      // Give client 5 minutes to reconnect
      console.log(`[WebSocket] Reconnection token issued: ${token}`);
    }
    
    connections.delete(socket.id);
  }
}

/**
 * Start heartbeat monitoring
 */
function startHeartbeatMonitor() {
  setInterval(() => {
    const now = Date.now();
    
    connections.forEach((conn, socketId) => {
      // Check if client hasn't responded to pings
      if (now - conn.lastPing > 60000) { // 60 seconds
        console.warn(`[WebSocket] Client ${socketId} appears dead, disconnecting`);
        conn.socket.disconnect(true);
        connections.delete(socketId);
      }
    });
  }, 30000); // Check every 30 seconds
}

/**
 * Cleanup dead connections
 */
function cleanupDeadConnections() {
  const now = Date.now();
  let cleaned = 0;
  
  connections.forEach((conn, socketId) => {
    // Check if socket is actually connected
    if (!conn.socket.connected) {
      connections.delete(socketId);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    console.log(`[WebSocket] Cleaned up ${cleaned} dead connections`);
  }
}

/**
 * Broadcast to all connected clients
 */
function broadcast(type, data) {
  if (io) {
    io.emit(type, data);
  }
}

/**
 * Broadcast to specific room
 */
function broadcastToRoom(room, type, data) {
  if (io) {
    io.to(room).emit(type, data);
  }
}

/**
 * Get connection statistics
 */
function getStats() {
  return {
    totalConnections: connections.size,
    authenticatedConnections: Array.from(connections.values())
      .filter(c => c.isAuthenticated).length,
    inQueue: Array.from(connections.values())
      .filter(c => c.queueId).length
  };
}

module.exports = {
  initWebSocket,
  broadcast,
  broadcastToRoom,
  getStats
};

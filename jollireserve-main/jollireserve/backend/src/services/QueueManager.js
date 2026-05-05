/**
 * Queue Manager Service
 * Real-Time Queue System V2
 * 
 * Provides:
 * - Reliable WebSocket connections with reconnection
 * - Message queuing for offline clients
 * - Smart waitlist management
 * - SMS/WhatsApp notifications
 * - Queue position tracking
 */

const { getDb } = require('../firebase');
const { v4: uuid } = require('uuid');
const { isoNow } = require('../utils/time');

class QueueManager {
  constructor() {
    this.queues = new Map(); // queueId -> { customers, notified }
    this.connections = new Map(); // socketId -> { socket, userId, queueId }
    this.messageQueue = new Map(); // userId -> [pendingMessages]
    this.reconnectionTokens = new Map(); // token -> { userId, queueId, expiry }
    
    // Cleanup interval
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Join a queue
   */
  async joinQueue({ userId, name, phone, partySize, preferences = {} }) {
    const db = getDb();
    const queueEntry = {
      id: uuid(),
      user_id: userId,
      name,
      phone,
      party_size: partySize,
      preferences,
      position: await this.getNextPosition(),
      status: 'waiting',
      joined_at: isoNow(),
      estimated_wait_minutes: await this.calculateWaitTime(partySize),
      notifications_sent: [],
      socket_connected: false
    };

    // Save to database
    await db.collection('queue').doc(queueEntry.id).set(queueEntry);

    // Add to in-memory queue
    if (!this.queues.has('main')) {
      this.queues.set('main', { customers: [], notified: new Set() });
    }
    this.queues.get('main').customers.push(queueEntry);

    // Sort by position
    this.sortQueue('main');

    // Broadcast update to all connected clients
    this.broadcastQueueUpdate('main');

    console.log(`[QueueManager] ${name} joined queue at position ${queueEntry.position}`);

    return queueEntry;
  }

  /**
   * Leave queue
   */
  async leaveQueue(queueId, userId) {
    const db = getDb();
    
    // Update database
    await db.collection('queue').doc(queueId).update({
      status: 'cancelled',
      left_at: isoNow()
    });

    // Remove from in-memory queue
    const queue = this.queues.get('main');
    if (queue) {
      queue.customers = queue.customers.filter(c => c.id !== queueId);
      this.sortQueue('main');
      this.broadcastQueueUpdate('main');
    }

    console.log(`[QueueManager] ${userId} left queue`);
    return { success: true };
  }

  /**
   * Move to next in queue (when table becomes available)
   */
  async nextInQueue(partySize, tableArea = null) {
    const queue = this.queues.get('main');
    if (!queue || queue.customers.length === 0) {
      return null;
    }

    // Find best match
    const match = this.findBestMatch(queue.customers, partySize, tableArea);
    
    if (match) {
      // Update status
      match.status = 'called';
      match.called_at = isoNow();
      match.response_deadline = Date.now() + (10 * 60 * 1000); // 10 minutes to respond

      // Save to database
      const db = getDb();
      await db.collection('queue').doc(match.id).update({
        status: 'called',
        called_at: match.called_at,
        response_deadline: match.response_deadline
      });

      // Notify customer
      await this.notifyCustomer(match, 'table_ready');

      // Broadcast update
      this.broadcastQueueUpdate('main');

      console.log(`[QueueManager] Called ${match.name} to table`);
      return match;
    }

    return null;
  }

  /**
   * Find best matching customer for available table
   */
  findBestMatch(customers, tableCapacity, tableArea) {
    // Filter by capacity (table must fit party)
    const eligible = customers.filter(c => 
      c.party_size <= tableCapacity && 
      c.status === 'waiting'
    );

    if (eligible.length === 0) return null;

    // Sort by:
    // 1. Area preference match (if tableArea provided)
    // 2. Position in queue (FIFO)
    // 3. Wait time (longest waiting first)
    return eligible.sort((a, b) => {
      // Area preference
      if (tableArea && a.preferences?.area && b.preferences?.area) {
        const aMatch = a.preferences.area === tableArea ? 1 : 0;
        const bMatch = b.preferences.area === tableArea ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
      }
      
      // Position (lower is better)
      return a.position - b.position;
    })[0];
  }

  /**
   * Calculate estimated wait time based on current queue
   */
  async calculateWaitTime(partySize) {
    const queue = this.queues.get('main');
    if (!queue) return 0;

    // Count people ahead with similar party size
    const ahead = queue.customers.filter(c => 
      c.status === 'waiting' && 
      c.party_size <= partySize + 2 // Similar size tables
    ).length;

    // Average 15 minutes per table turn
    const baseWait = ahead * 15;
    
    // Add buffer for larger parties
    const sizeBuffer = partySize > 6 ? 10 : 0;

    return baseWait + sizeBuffer;
  }

  /**
   * Get next queue position number
   */
  async getNextPosition() {
    const queue = this.queues.get('main');
    if (!queue || queue.customers.length === 0) return 1;
    
    const maxPosition = Math.max(...queue.customers.map(c => c.position), 0);
    return maxPosition + 1;
  }

  /**
   * Sort queue by position
   */
  sortQueue(queueId) {
    const queue = this.queues.get(queueId);
    if (queue) {
      queue.customers.sort((a, b) => a.position - b.position);
    }
  }

  /**
   * WebSocket: Handle client connection
   */
  handleConnection(socket, userId, queueId) {
    // Store connection
    this.connections.set(socket.id, {
      socket,
      userId,
      queueId,
      connected_at: Date.now(),
      last_ping: Date.now()
    });

    // Update queue status
    const queue = this.queues.get(queueId);
    if (queue) {
      const customer = queue.customers.find(c => c.user_id === userId);
      if (customer) {
        customer.socket_connected = true;
      }
    }

    // Send any queued messages
    this.deliverQueuedMessages(userId, socket);

    // Send current queue status
    socket.emit('queue:status', this.getQueueStatus(queueId, userId));

    console.log(`[QueueManager] Client connected: ${userId}`);
  }

  /**
   * WebSocket: Handle disconnection
   */
  handleDisconnection(socketId) {
    const conn = this.connections.get(socketId);
    if (conn) {
      // Generate reconnection token
      const token = uuid();
      this.reconnectionTokens.set(token, {
        userId: conn.userId,
        queueId: conn.queueId,
        expiry: Date.now() + (5 * 60 * 1000) // 5 minutes
      });

      // Update queue status
      const queue = this.queues.get(conn.queueId);
      if (queue) {
        const customer = queue.customers.find(c => c.user_id === conn.userId);
        if (customer) {
          customer.socket_connected = false;
        }
      }

      this.connections.delete(socketId);
      
      console.log(`[QueueManager] Client disconnected: ${conn.userId}, token: ${token}`);
      return token;
    }
    return null;
  }

  /**
   * WebSocket: Reconnect with token
   */
  reconnectWithToken(socket, token) {
    const recon = this.reconnectionTokens.get(token);
    if (!recon) {
      socket.emit('reconnect:failed', { error: 'Invalid or expired token' });
      return false;
    }

    if (recon.expiry < Date.now()) {
      this.reconnectionTokens.delete(token);
      socket.emit('reconnect:failed', { error: 'Token expired' });
      return false;
    }

    // Reconnect successful
    this.handleConnection(socket, recon.userId, recon.queueId);
    this.reconnectionTokens.delete(token);
    
    socket.emit('reconnect:success', {
      userId: recon.userId,
      queueId: recon.queueId
    });

    return true;
  }

  /**
   * Queue message for offline delivery
   */
  queueMessage(userId, message) {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }
    this.messageQueue.get(userId).push({
      ...message,
      queued_at: Date.now()
    });
  }

  /**
   * Deliver queued messages to reconnected client
   */
  deliverQueuedMessages(userId, socket) {
    const messages = this.messageQueue.get(userId);
    if (messages && messages.length > 0) {
      messages.forEach(msg => {
        socket.emit(msg.type, msg.data);
      });
      this.messageQueue.delete(userId);
      console.log(`[QueueManager] Delivered ${messages.length} queued messages to ${userId}`);
    }
  }

  /**
   * Send notification to customer
   */
  async notifyCustomer(customer, type) {
    const db = getDb();
    const timestamp = isoNow();

    // Record notification
    await db.collection('queue').doc(customer.id).update({
      [`notifications_sent.${type}`]: timestamp
    });

    // Send via WebSocket if connected
    const conn = Array.from(this.connections.values())
      .find(c => c.userId === customer.user_id);
    
    if (conn) {
      conn.socket.emit('notification', {
        type,
        message: this.getNotificationMessage(type, customer),
        timestamp
      });
    } else {
      // Queue for later delivery
      this.queueMessage(customer.user_id, {
        type: 'notification',
        data: { type, message: this.getNotificationMessage(type, customer) }
      });
    }

    // TODO: Integrate SMS/WhatsApp service
    // await this.sendSMS(customer.phone, message);

    console.log(`[QueueManager] Sent ${type} notification to ${customer.name}`);
  }

  /**
   * Get notification message text
   */
  getNotificationMessage(type, customer) {
    const messages = {
      joined: `Hi ${customer.name}, you're #${customer.position} in line. Est. wait: ${customer.estimated_wait_minutes} mins.`,
      position_update: `Update: You're now #${customer.position} in line. Est. wait: ${customer.estimated_wait_minutes} mins.`,
      table_ready: `🎉 ${customer.name}, your table is ready! Please proceed to the host stand. Valid for 10 minutes.`,
      reminder: `Reminder: You're #${customer.position} in line at Jollibee. Don't go far!`,
      closing_soon: `Heads up: We're closing soon. Your table should be ready shortly.`
    };
    return messages[type] || 'Update from Jollibee';
  }

  /**
   * Broadcast queue update to all connected clients
   */
  broadcastQueueUpdate(queueId) {
    const queue = this.queues.get(queueId);
    if (!queue) return;

    const status = {
      total_waiting: queue.customers.filter(c => c.status === 'waiting').length,
      your_position: null,
      estimated_wait: null
    };

    // Send personalized update to each connected client
    this.connections.forEach((conn, socketId) => {
      if (conn.queueId === queueId) {
        const customer = queue.customers.find(c => c.user_id === conn.userId);
        if (customer) {
          conn.socket.emit('queue:update', {
            ...status,
            your_position: customer.position,
            your_status: customer.status,
            estimated_wait: customer.estimated_wait_minutes
          });
        }
      }
    });
  }

  /**
   * Get queue status for a specific user
   */
  getQueueStatus(queueId, userId) {
    const queue = this.queues.get(queueId);
    if (!queue) return null;

    const customer = queue.customers.find(c => c.user_id === userId);
    if (!customer) return null;

    return {
      position: customer.position,
      total_ahead: queue.customers.filter(c => 
        c.status === 'waiting' && c.position < customer.position
      ).length,
      estimated_wait: customer.estimated_wait_minutes,
      status: customer.status,
      joined_at: customer.joined_at
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();

    // Cleanup reconnection tokens
    for (const [token, data] of this.reconnectionTokens.entries()) {
      if (data.expiry < now) {
        this.reconnectionTokens.delete(token);
      }
    }

    // Check for expired response deadlines
    this.queues.forEach((queue, queueId) => {
      queue.customers.forEach(async (customer) => {
        if (customer.status === 'called' && customer.response_deadline < now) {
          // Customer didn't respond in time
          customer.status = 'expired';
          
          // Save to database
          const db = getDb();
          await db.collection('queue').doc(customer.id).update({
            status: 'expired',
            expired_at: isoNow()
          });

          // Move to next in queue
          await this.nextInQueue(customer.party_size);
        }
      });
    });

    console.log('[QueueManager] Cleanup completed');
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const db = getDb();
    
    const today = new Date().toISOString().split('T')[0];
    const queueSnapshot = await db.collection('queue')
      .where('joined_at', '>=', today)
      .get();

    const stats = {
      total_joined_today: queueSnapshot.size,
      currently_waiting: 0,
      average_wait_time: 0,
      no_shows: 0,
      served: 0
    };

    let totalWaitMinutes = 0;
    let countWithWaitTime = 0;

    queueSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (data.status === 'waiting') stats.currently_waiting++;
      if (data.status === 'no_show') stats.no_shows++;
      if (data.status === 'served') stats.served++;
      
      if (data.estimated_wait_minutes) {
        totalWaitMinutes += data.estimated_wait_minutes;
        countWithWaitTime++;
      }
    });

    if (countWithWaitTime > 0) {
      stats.average_wait_time = Math.round(totalWaitMinutes / countWithWaitTime);
    }

    return stats;
  }
}

// Export singleton instance
module.exports = new QueueManager();

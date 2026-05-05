// Enhanced Booking Service - Production-ready with enterprise features
const { createClient } = require('@supabase/supabase-js');
const Redis = require('redis');
const { CircuitBreaker } = require('opossum');
const crypto = require('crypto');

class EnhancedBookingService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis server connection refused');
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

    // Circuit breaker configuration
    this.bookingBreaker = new CircuitBreaker(
      this.executeBooking.bind(this),
      {
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
      }
    );

    this.queueBreaker = new CircuitBreaker(
      this.executeQueueOperation.bind(this),
      {
        timeout: 5000,
        errorThresholdPercentage: 60,
        resetTimeout: 20000
      }
    );

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.bookingBreaker.on('open', () => {
      console.warn('Booking circuit breaker opened - failing fast');
      this.broadcastSystemStatus('booking_service_degraded');
    });

    this.bookingBreaker.on('halfOpen', () => {
      console.info('Booking circuit breaker half-open - testing recovery');
    });

    this.bookingBreaker.on('close', () => {
      console.info('Booking circuit breaker closed - service recovered');
      this.broadcastSystemStatus('booking_service_operational');
    });
  }

  async createBooking(bookingData, userId, deviceId) {
    const bookingId = this.generateId('booking');
    const lockKey = `booking_lock:${bookingData.date}:${bookingData.time}:${bookingData.areaId}`;
    
    try {
      // Acquire distributed lock to prevent double bookings
      const lockAcquired = await this.acquireLock(lockKey, 30000);
      if (!lockAcquired) {
        throw new Error('Could not acquire booking lock - possible conflict');
      }

      // Validate availability with current data
      const availability = await this.checkAvailability(bookingData);
      if (!availability.available) {
        await this.releaseLock(lockKey);
        throw new Error(`No availability for requested time. Wait time: ${availability.waitTime} minutes`);
      }

      // Create booking record
      const booking = {
        id: bookingId,
        userId,
        deviceId,
        ...bookingData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        lockKey
      };

      // Execute booking through circuit breaker
      const result = await this.bookingBreaker.fire(booking);
      
      // Cache booking for quick access
      await this.cacheBooking(bookingId, result);
      
      // Broadcast real-time update
      await this.broadcastBookingUpdate(result);
      
      // Release lock
      await this.releaseLock(lockKey);
      
      return {
        success: true,
        booking: result,
        estimatedWaitTime: availability.waitTime
      };

    } catch (error) {
      // Ensure lock is released on error
      if (booking.lockKey) {
        await this.releaseLock(booking.lockKey);
      }
      
      // Log error for monitoring
      await this.logError('create_booking', error, { userId, bookingData });
      
      throw this.enhanceError(error, 'booking_creation_failed');
    }
  }

  async executeBooking(booking) {
    const { data, error } = await this.supabase
      .from('bookings')
      .insert([{
        id: booking.id,
        user_id: booking.userId,
        device_id: booking.deviceId,
        date: booking.date,
        time: booking.time,
        party_size: booking.partySize,
        area_id: booking.areaId,
        status: booking.status,
        special_requests: booking.specialRequests,
        payment_method: booking.paymentMethod,
        created_at: booking.createdAt,
        updated_at: booking.updatedAt,
        version: booking.version
      }])
      .select()
      .single();

    if (error) {
      // Check for constraint violations
      if (error.code === '23505') {
        throw new Error('Booking already exists for this time slot');
      }
      throw new Error(`Database error: ${error.message}`);
    }

    // Update availability cache
    await this.updateAvailabilityCache(booking);

    return data;
  }

  async joinQueue(queueData, userId, deviceId) {
    const queueId = this.generateId('queue');
    
    try {
      // Check current queue position
      const queueStats = await this.getQueueStats(queueData.areaId);
      
      const queueEntry = {
        id: queueId,
        userId,
        deviceId,
        areaId: queueData.areaId,
        partySize: queueData.partySize,
        name: queueData.name,
        phone: queueData.phone,
        status: 'waiting',
        position: queueStats.currentPosition + 1,
        estimatedWaitTime: queueStats.estimatedWaitTime,
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      // Execute queue operation through circuit breaker
      const result = await this.queueBreaker.fire(queueEntry);
      
      // Cache queue entry
      await this.cacheQueueEntry(queueId, result);
      
      // Broadcast queue update
      await this.broadcastQueueUpdate(result);
      
      return {
        success: true,
        queueEntry: result,
        position: result.position,
        estimatedWaitTime: result.estimatedWaitTime
      };

    } catch (error) {
      await this.logError('join_queue', error, { userId, queueData });
      throw this.enhanceError(error, 'queue_join_failed');
    }
  }

  async executeQueueOperation(queueEntry) {
    const { data, error } = await this.supabase
      .from('queue_entries')
      .insert([{
        id: queueEntry.id,
        user_id: queueEntry.userId,
        device_id: queueEntry.deviceId,
        area_id: queueEntry.areaId,
        party_size: queueEntry.partySize,
        name: queueEntry.name,
        phone: queueEntry.phone,
        status: queueEntry.status,
        position: queueEntry.position,
        estimated_wait_time: queueEntry.estimatedWaitTime,
        joined_at: queueEntry.joinedAt,
        updated_at: queueEntry.updatedAt,
        version: queueEntry.version
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Queue database error: ${error.message}`);
    }

    return data;
  }

  async updateBooking(bookingId, updateData, userId, deviceId) {
    try {
      // Get current booking with version
      const currentBooking = await this.getBookingWithVersion(bookingId, userId);
      
      if (!currentBooking) {
        throw new Error('Booking not found or access denied');
      }

      // Check for conflicts
      const conflict = await this.detectBookingConflict(currentBooking, updateData);
      if (conflict) {
        return await this.resolveBookingConflict(currentBooking, updateData, conflict);
      }

      // Optimistic concurrency control
      const updatedBooking = {
        ...currentBooking,
        ...updateData,
        version: currentBooking.version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      };

      // Update with version check
      const { data, error } = await this.supabase
        .from('bookings')
        .update({
          date: updatedBooking.date,
          time: updatedBooking.time,
          party_size: updatedBooking.partySize,
          area_id: updatedBooking.areaId,
          special_requests: updatedBooking.specialRequests,
          status: updatedBooking.status,
          updated_at: updatedBooking.updatedAt,
          version: updatedBooking.version,
          updated_by: updatedBooking.updatedBy
        })
        .eq('id', bookingId)
        .eq('version', currentBooking.version)
        .select()
        .single();

      if (error) {
        if (error.code === 'P0002') {
          throw new Error('Booking was modified by another process. Please refresh and try again.');
        }
        throw new Error(`Update failed: ${error.message}`);
      }

      // Update cache and broadcast
      await this.cacheBooking(bookingId, data);
      await this.broadcastBookingUpdate(data);

      return { success: true, booking: data };

    } catch (error) {
      await this.logError('update_booking', error, { bookingId, userId, updateData });
      throw this.enhanceError(error, 'booking_update_failed');
    }
  }

  async cancelBooking(bookingId, reason, userId) {
    try {
      const booking = await this.getBookingWithVersion(bookingId, userId);
      
      if (!booking) {
        throw new Error('Booking not found or access denied');
      }

      // Check cancellation policy
      const canCancel = await this.checkCancellationPolicy(booking);
      if (!canCancel.allowed) {
        throw new Error(`Cannot cancel: ${canCancel.reason}`);
      }

      // Update booking status
      const { data, error } = await this.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          version: booking.version + 1
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        throw new Error(`Cancellation failed: ${error.message}`);
      }

      // Update availability
      await this.updateAvailabilityCache(booking);

      // Broadcast update
      await this.broadcastBookingUpdate(data);

      // Send cancellation notification
      await this.sendCancellationNotification(data);

      return { success: true, booking: data };

    } catch (error) {
      await this.logError('cancel_booking', error, { bookingId, userId, reason });
      throw this.enhanceError(error, 'booking_cancellation_failed');
    }
  }

  // Helper methods
  async acquireLock(lockKey, ttl = 30000) {
    const lockValue = crypto.randomUUID();
    const result = await this.redis.set(
      lockKey,
      lockValue,
      'PX',
      ttl,
      'NX'
    );
    return result === 'OK';
  }

  async releaseLock(lockKey) {
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    return this.redis.eval(script, 1, lockKey, lockValue);
  }

  async checkAvailability(bookingData) {
    const cacheKey = `availability:${bookingData.date}:${bookingData.areaId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const availability = JSON.parse(cached);
      return this.checkTimeSlotAvailability(availability, bookingData.time, bookingData.partySize);
    }

    // Query database
    const { data, error } = await this.supabase
      .from('availability')
      .select('*')
      .eq('date', bookingData.date)
      .eq('area_id', bookingData.areaId)
      .single();

    if (error || !data) {
      // Return default availability
      return {
        available: true,
        waitTime: 0,
        capacity: 50,
        currentBookings: 0
      };
    }

    // Cache result for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(data));

    return this.checkTimeSlotAvailability(data, bookingData.time, bookingData.partySize);
  }

  checkTimeSlotAvailability(availability, requestedTime, partySize) {
    const timeSlot = availability.timeSlots?.find(slot => slot.time === requestedTime);
    
    if (!timeSlot) {
      return {
        available: false,
        waitTime: 30,
        reason: 'Time slot not available'
      };
    }

    const isAvailable = timeSlot.availableCapacity >= partySize;
    const waitTime = isAvailable ? 0 : Math.max(0, timeSlot.nextAvailableTime || 15);

    return {
      available: isAvailable,
      waitTime,
      capacity: timeSlot.capacity,
      currentBookings: timeSlot.currentBookings
    };
  }

  async getBookingWithVersion(bookingId, userId) {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    return error ? null : data;
  }

  async detectBookingConflict(current, update) {
    // Check if time or area changed
    if (current.date !== update.date || current.time !== update.time || current.areaId !== update.areaId) {
      const availability = await this.checkAvailability(update);
      if (!availability.available) {
        return {
          type: 'availability',
          reason: 'Requested time no longer available',
          alternatives: await this.getAlternativeSlots(update)
        };
      }
    }

    return null;
  }

  async resolveBookingConflict(current, update, conflict) {
    // For now, return conflict info for user to resolve
    return {
      success: false,
      conflict: {
        type: conflict.type,
        reason: conflict.reason,
        alternatives: conflict.alternatives,
        currentBooking: current,
        requestedUpdate: update
      }
    };
  }

  async getAlternativeSlots(bookingData) {
    // Get nearby available slots
    const alternatives = [];
    const requestedTime = new Date(`2000-01-01T${bookingData.time}`);
    
    for (let offset = -2; offset <= 2; offset++) {
      if (offset === 0) continue;
      
      const altTime = new Date(requestedTime.getTime() + offset * 30 * 60000);
      const timeStr = altTime.toTimeString().slice(0, 5);
      
      const availability = await this.checkAvailability({
        ...bookingData,
        time: timeStr
      });
      
      if (availability.available) {
        alternatives.push({
          time: timeStr,
          waitTime: availability.waitTime
        });
      }
    }
    
    return alternatives;
  }

  async broadcastBookingUpdate(booking) {
    const message = {
      type: 'booking_update',
      data: booking,
      timestamp: new Date().toISOString(),
      messageId: this.generateId('message')
    };

    // Publish to Redis for WebSocket broadcast
    await this.redis.publish('booking_updates', JSON.stringify(message));
  }

  async broadcastQueueUpdate(queueEntry) {
    const message = {
      type: 'queue_update',
      data: queueEntry,
      timestamp: new Date().toISOString(),
      messageId: this.generateId('message')
    };

    await this.redis.publish('queue_updates', JSON.stringify(message));
  }

  async broadcastSystemStatus(status) {
    const message = {
      type: 'system_status',
      data: { status, timestamp: new Date().toISOString() },
      messageId: this.generateId('message')
    };

    await this.redis.publish('system_updates', JSON.stringify(message));
  }

  async cacheBooking(bookingId, booking) {
    const cacheKey = `booking:${bookingId}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(booking));
  }

  async cacheQueueEntry(queueId, entry) {
    const cacheKey = `queue:${queueId}`;
    await this.redis.setex(cacheKey, 7200, JSON.stringify(entry));
  }

  async updateAvailabilityCache(booking) {
    const cacheKey = `availability:${booking.date}:${booking.areaId}`;
    await this.redis.del(cacheKey); // Force refresh
  }

  async getQueueStats(areaId) {
    const cacheKey = `queue_stats:${areaId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate from database
    const { data, error } = await this.supabase
      .from('queue_entries')
      .select('position, estimated_wait_time')
      .eq('area_id', areaId)
      .eq('status', 'waiting')
      .order('position', { ascending: false })
      .limit(1);

    const currentPosition = data?.[0]?.position || 0;
    const estimatedWaitTime = data?.[0]?.estimated_wait_time || 0;

    const stats = {
      currentPosition,
      estimatedWaitTime,
      totalWaiting: data?.length || 0
    };

    // Cache for 2 minutes
    await this.redis.setex(cacheKey, 120, JSON.stringify(stats));

    return stats;
  }

  async checkCancellationPolicy(booking) {
    const bookingTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();
    const timeDiff = bookingTime - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 2) {
      return {
        allowed: false,
        reason: 'Cancellation must be at least 2 hours before booking time'
      };
    }

    return { allowed: true };
  }

  async sendCancellationNotification(booking) {
    // Integration with notification service
    const notification = {
      type: 'booking_cancelled',
      userId: booking.user_id,
      bookingId: booking.id,
      timestamp: new Date().toISOString()
    };

    await this.redis.publish('notifications', JSON.stringify(notification));
  }

  async logError(operation, error, context) {
    const logEntry = {
      operation,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      level: 'error'
    };

    // Store error log for monitoring
    await this.redis.lpush('error_logs', JSON.stringify(logEntry));
    await this.redis.ltrim('error_logs', 0, 999); // Keep last 1000 errors
  }

  enhanceError(error, defaultType) {
    return {
      type: error.type || defaultType,
      message: error.message,
      timestamp: new Date().toISOString(),
      recoverable: this.isRecoverableError(error)
    };
  }

  isRecoverableError(error) {
    const recoverablePatterns = [
      /timeout/i,
      /connection/i,
      /network/i,
      /temporary/i
    ];
    
    return recoverablePatterns.some(pattern => 
      pattern.test(error.message)
    );
  }

  generateId(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Health check method
  async healthCheck() {
    try {
      // Test database connection
      const { error } = await this.supabase
        .from('health_check')
        .select('timestamp')
        .limit(1);

      // Test Redis connection
      await this.redis.ping();

      const bookingStats = this.bookingBreaker.stats;
      const queueStats = this.queueBreaker.stats;

      return {
        status: 'healthy',
        database: error ? 'degraded' : 'healthy',
        redis: 'healthy',
        bookingService: {
          status: bookingStats.state,
          failures: bookingStats.failures,
          successes: bookingStats.successes
        },
        queueService: {
          status: queueStats.state,
          failures: queueStats.failures,
          successes: queueStats.successes
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = EnhancedBookingService;

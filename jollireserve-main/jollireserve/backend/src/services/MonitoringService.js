/**
 * Monitoring & Alerting Service
 * 
 * Features:
 * - Application Performance Monitoring (APM)
 * - Error tracking and alerting
 * - Business metrics collection
 * - Health checks
 * - Alert thresholds
 */

const { getDb } = require('../firebase');
const { v4: uuid } = require('uuid');
const { isoNow } = require('../utils/time');

class MonitoringService {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.alertRules = [];
    this.isEnabled = process.env.ENABLE_MONITORING === 'true' || false;
    
    // Default alert rules
    this.setupDefaultAlertRules();
    
    // Start metric collection
    if (this.isEnabled) {
      this.startMetricCollection();
    }
  }

  /**
   * Setup default alert rules
   */
  setupDefaultAlertRules() {
    this.alertRules = [
      {
        id: 'error_rate_high',
        name: 'High Error Rate',
        condition: (metrics) => metrics.errorRate > 0.01, // > 1% error rate
        severity: 'warning',
        message: 'Error rate is above 1%',
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'response_time_slow',
        name: 'Slow Response Time',
        condition: (metrics) => metrics.avgResponseTime > 500, // > 500ms
        severity: 'warning',
        message: 'Average response time is above 500ms',
        cooldown: 300000
      },
      {
        id: 'booking_failure_spike',
        name: 'Booking Failure Spike',
        condition: (metrics) => metrics.bookingFailureRate > 0.05, // > 5%
        severity: 'critical',
        message: 'Booking failure rate is above 5%',
        cooldown: 60000 // 1 minute
      },
      {
        id: 'database_connection_lost',
        name: 'Database Connection Lost',
        condition: (metrics) => metrics.databaseConnected === false,
        severity: 'critical',
        message: 'Database connection lost',
        cooldown: 0 // Immediate
      },
      {
        id: 'queue_wait_time_high',
        name: 'High Queue Wait Time',
        condition: (metrics) => metrics.avgQueueWaitTime > 30, // > 30 minutes
        severity: 'warning',
        message: 'Average queue wait time is above 30 minutes',
        cooldown: 600000 // 10 minutes
      },
      {
        id: 'no_show_spike',
        name: 'No-Show Spike',
        condition: (metrics) => metrics.noShowRate > 0.1, // > 10%
        severity: 'warning',
        message: 'No-show rate is above 10%',
        cooldown: 3600000 // 1 hour
      }
    ];
  }

  /**
   * Start collecting metrics
   */
  startMetricCollection() {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60000);
    
    console.log('[MonitoringService] Metric collection started');
  }

  /**
   * Collect current metrics
   */
  async collectMetrics() {
    try {
      const timestamp = Date.now();
      const db = getDb();
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Collect booking metrics
      const bookingsSnapshot = await db.collection('reservations')
        .where('date', '==', today)
        .get();
      
      const totalBookings = bookingsSnapshot.size;
      const successfulBookings = bookingsSnapshot.docs.filter(
        d => ['confirmed', 'checked_in', 'completed'].includes(d.data().status)
      ).length;
      const failedBookings = bookingsSnapshot.docs.filter(
        d => ['cancelled', 'no_show'].includes(d.data().status)
      ).length;
      
      // Collect queue metrics
      const queueSnapshot = await db.collection('queue')
        .where('status', '==', 'waiting')
        .get();
      
      const queueLength = queueSnapshot.size;
      const avgWaitTime = queueSnapshot.docs.reduce((sum, d) => 
        sum + (d.data().estimated_wait_minutes || 0), 0
      ) / (queueSnapshot.size || 1);
      
      // Collect error metrics (from last hour)
      const oneHourAgo = Date.now() - 3600000;
      const errorsSnapshot = await db.collection('error_logs')
        .where('timestamp', '>=', oneHourAgo)
        .get();
      
      const errorCount = errorsSnapshot.size;
      
      // Calculate rates
      const errorRate = totalBookings > 0 ? errorCount / totalBookings : 0;
      const bookingFailureRate = totalBookings > 0 ? failedBookings / totalBookings : 0;
      const noShowRate = totalBookings > 0 ? 
        bookingsSnapshot.docs.filter(d => d.data().status === 'no_show').length / totalBookings : 0;
      
      // Store metrics
      const metrics = {
        timestamp,
        totalBookings,
        successfulBookings,
        failedBookings,
        bookingFailureRate,
        queueLength,
        avgQueueWaitTime: avgWaitTime,
        errorCount,
        errorRate,
        noShowRate,
        databaseConnected: true // Would check actual connection
      };
      
      this.metrics.set(timestamp, metrics);
      
      // Clean old metrics (keep last 24 hours)
      this.cleanOldMetrics();
      
      // Check alert rules
      this.checkAlerts(metrics);
      
      // Save to database for historical analysis
      await this.saveMetrics(metrics);
      
    } catch (error) {
      console.error('[MonitoringService] Failed to collect metrics:', error);
    }
  }

  /**
   * Clean metrics older than 24 hours
   */
  cleanOldMetrics() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    for (const [timestamp, _] of this.metrics) {
      if (timestamp < cutoff) {
        this.metrics.delete(timestamp);
      }
    }
  }

  /**
   * Save metrics to database
   */
  async saveMetrics(metrics) {
    try {
      const db = getDb();
      await db.collection('metrics').add({
        ...metrics,
        recorded_at: isoNow()
      });
    } catch (error) {
      console.error('[MonitoringService] Failed to save metrics:', error);
    }
  }

  /**
   * Check alert rules
   */
  checkAlerts(currentMetrics) {
    this.alertRules.forEach(rule => {
      // Check if rule is in cooldown
      const lastAlert = this.alerts.find(a => a.ruleId === rule.id && a.resolved === false);
      if (lastAlert) {
        const timeSinceLastAlert = Date.now() - lastAlert.timestamp;
        if (timeSinceLastAlert < rule.cooldown) {
          return; // Still in cooldown
        }
      }
      
      // Check condition
      if (rule.condition(currentMetrics)) {
        this.triggerAlert(rule, currentMetrics);
      }
    });
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(rule, metrics) {
    const alert = {
      id: uuid(),
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      message: rule.message,
      metrics: { ...metrics },
      timestamp: Date.now(),
      resolved: false,
      notified: false
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    // Log alert
    console.warn(`[ALERT] ${rule.severity.toUpperCase()}: ${rule.message}`, metrics);
    
    // Save to database
    try {
      const db = getDb();
      await db.collection('alerts').doc(alert.id).set({
        ...alert,
        created_at: isoNow()
      });
    } catch (error) {
      console.error('[MonitoringService] Failed to save alert:', error);
    }
    
    // Send notification (would integrate with email/SMS service)
    await this.sendAlertNotification(alert);
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(alert) {
    // TODO: Integrate with email/SMS service
    // For now, just log
    console.log(`[AlertNotification] Would send ${alert.severity} alert: ${alert.message}`);
    
    // Mark as notified
    alert.notified = true;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolved_at = Date.now();
      
      // Update in database
      try {
        const db = getDb();
        await db.collection('alerts').doc(alertId).update({
          resolved: true,
          resolved_at: isoNow()
        });
      } catch (error) {
        console.error('[MonitoringService] Failed to resolve alert:', error);
      }
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics() {
    const timestamps = Array.from(this.metrics.keys()).sort((a, b) => b - a);
    return timestamps.length > 0 ? this.metrics.get(timestamps[0]) : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(duration = 3600000) { // Default 1 hour
    const cutoff = Date.now() - duration;
    const history = [];
    
    for (const [timestamp, metrics] of this.metrics) {
      if (timestamp >= cutoff) {
        history.push({ timestamp, ...metrics });
      }
    }
    
    return history.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 50) {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Track API response time
   */
  trackResponseTime(endpoint, duration) {
    if (!this.metrics.has('response_times')) {
      this.metrics.set('response_times', []);
    }
    
    const times = this.metrics.get('response_times');
    times.push({ endpoint, duration, timestamp: Date.now() });
    
    // Keep last 1000 entries
    if (times.length > 1000) {
      times.shift();
    }
  }

  /**
   * Track error
   */
  async trackError(error, context = {}) {
    try {
      const db = getDb();
      await db.collection('error_logs').add({
        id: uuid(),
        message: error.message,
        stack: error.stack,
        code: error.code,
        context,
        timestamp: Date.now(),
        created_at: isoNow()
      });
    } catch (dbError) {
      console.error('[MonitoringService] Failed to track error:', dbError);
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData() {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const recentAlerts = this.getAlertHistory(10);
    const metricsHistory = this.getMetricsHistory(3600000); // Last hour
    
    return {
      currentMetrics,
      activeAlerts,
      recentAlerts,
      metricsHistory,
      systemHealth: this.calculateSystemHealth(currentMetrics, activeAlerts)
    };
  }

  /**
   * Calculate overall system health
   */
  calculateSystemHealth(metrics, alerts) {
    if (!metrics) return 'unknown';
    
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
    
    if (criticalAlerts > 0) return 'critical';
    if (warningAlerts > 2) return 'degraded';
    if (metrics.errorRate > 0.05) return 'degraded';
    if (metrics.avgResponseTime > 1000) return 'degraded';
    
    return 'healthy';
  }

  /**
   * Health check endpoint data
   */
  async getHealthCheckData() {
    const metrics = this.getCurrentMetrics();
    
    return {
      status: metrics ? 'healthy' : 'unknown',
      timestamp: Date.now(),
      checks: {
        database: metrics?.databaseConnected || false,
        api: true,
        websocket: true,
        queue: (metrics?.queueLength || 0) < 20 // Queue not overwhelmed
      },
      metrics: metrics || {}
    };
  }
}

// Export singleton
module.exports = new MonitoringService();

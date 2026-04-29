/**
 * SMS/Notification Service
 * 
 * Features:
 * - SMS notifications via Twilio
 * - WhatsApp messages
 * - Email notifications
 * - Template management
 * - Notification scheduling
 */

const { getDb } = require('../firebase');
const { v4: uuid } = require('uuid');
const { isoNow } = require('../utils/time');

class SMSService {
  constructor() {
    this.twilioClient = null;
    this.enabled = process.env.ENABLE_SMS === 'true' || false;
    this.templates = this.loadTemplates();
    
    // Initialize Twilio if enabled
    if (this.enabled && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = require('twilio');
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        console.log('[SMSService] Twilio initialized');
      } catch (error) {
        console.error('[SMSService] Failed to initialize Twilio:', error);
      }
    }
  }

  /**
   * Load message templates
   */
  loadTemplates() {
    return {
      // Queue notifications
      queue_joined: {
        sms: (data) => `Hi {{name}}, you're #{{position}} in line at Jollibee. Est. wait: {{waitTime}} mins. We'll text you when your table is ready.`,
        whatsapp: (data) => `🎉 *Jollibee Reserve*\n\nHi {{name}},\n\nYou've joined the queue!\n• Position: #{{position}}\n• Estimated wait: {{waitTime}} minutes\n• Party size: {{partySize}}\n\nWe'll notify you when your table is ready.`,
        email: {
          subject: 'You\'re in line at Jollibee',
          body: (data) => `Hi ${data.name},<br><br>You've joined the queue at Jollibee!<br><br><strong>Your Details:</strong><br>Position: #${data.position}<br>Estimated wait: ${data.waitTime} minutes<br>Party size: ${data.partySize}<br><br>We'll notify you when your table is ready.<br><br>Thank you,<br>Jollibee Team`
        }
      },

      queue_position_update: {
        sms: (data) => `Update: You're now #{{position}} in line at Jollibee. Est. wait: {{waitTime}} mins.`,
        whatsapp: (data) => `📊 *Queue Update*\n\nHi {{name}},\n\nYou're moving up in line!\n• New position: #{{position}}\n• Updated wait time: {{waitTime}} minutes\n\nAlmost there! 🎉`,
      },

      table_ready: {
        sms: (data) => `🎉 {{name}}, your table is ready at Jollibee! Please proceed to the host stand within 10 minutes or we'll give it to the next person in line.`,
        whatsapp: (data) => `🎉 *Your Table is Ready!*\n\nHi {{name}},\n\nGreat news - your table is ready!\n\n👉 Please proceed to the host stand immediately\n⏰ You have *10 minutes* to claim your table\n\nSee you soon! 🍽️`,
        email: {
          subject: '🎉 Your table is ready!',
          body: (data) => `<div style="text-align: center; padding: 20px;"><h1 style="color: #dc2626;">🎉 Your Table is Ready!</h1><p>Hi ${data.name},</p><p>Great news - your table at Jollibee is ready!</p><div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; font-size: 18px;"><strong>Please proceed to the host stand immediately</strong></p><p style="margin: 10px 0 0 0; color: #92400e;">⏰ You have 10 minutes to claim your table</p></div><p>See you soon!</p></div>`
        }
      },

      table_ready_reminder: {
        sms: (data) => `⏰ Reminder: Your table at Jollibee is waiting! Please arrive within 5 minutes or we'll need to give it to someone else.`,
        whatsapp: (data) => `⏰ *Final Reminder*\n\nHi {{name}},\n\nYour table is still waiting for you!\n\n👉 Please arrive within 5 minutes\n⚠️ After that, we'll need to give it to the next person\n\nWe're holding it just for you! 🍽️`,
      },

      reservation_confirmed: {
        sms: (data) => `Hi {{name}}, your reservation at Jollibee is confirmed! {{date}} at {{time}} for {{partySize}} guests. See you then!`,
        whatsapp: (data) => `✅ *Reservation Confirmed*\n\nHi {{name}},\n\nYour reservation is confirmed!\n\n📅 Date: {{date}}\n🕐 Time: {{time}}\n👥 Party size: {{partySize}}\n\n📍 Jollibee Location\n\nWe look forward to seeing you! 🎉`,
        email: {
          subject: 'Reservation Confirmed - Jollibee',
          body: (data) => `Hi ${data.name},<br><br>Your reservation at Jollibee has been confirmed!<br><br><strong>Reservation Details:</strong><br>Date: ${data.date}<br>Time: ${data.time}<br>Party size: ${data.partySize}<br>Table: ${data.tableName || 'To be assigned'}<br><br>Need to make changes? Reply to this email or call us.<br><br>Thank you,<br>Jollibee Team`
        }
      },

      reservation_reminder_24h: {
        sms: (data) => `Reminder: You have a reservation at Jollibee tomorrow {{date}} at {{time}} for {{partySize}} guests. See you then!`,
        whatsapp: (data) => `⏰ *24-Hour Reminder*\n\nHi {{name}},\n\nJust a friendly reminder about your reservation tomorrow!\n\n📅 Date: {{date}}\n🕐 Time: {{time}}\n👥 Party size: {{partySize}}\n\nNeed to reschedule? Let us know! 🎉`,
        email: {
          subject: 'Reminder: Your Jollibee reservation is tomorrow',
          body: (data) => `Hi ${data.name},<br><br>This is a friendly reminder about your reservation <strong>tomorrow</strong>!<br><br><strong>Reservation Details:</strong><br>Date: ${data.date}<br>Time: ${data.time}<br>Party size: ${data.partySize}<br><br>We look forward to seeing you!<br><br>Thank you,<br>Jollibee Team`
        }
      },

      reservation_reminder_2h: {
        sms: (data) => `Your Jollibee reservation is in 2 hours! {{time}} for {{partySize}} guests. See you soon!`,
        whatsapp: (data) => `⏰ *2-Hour Reminder*\n\nHi {{name}},\n\nYour reservation is coming up soon!\n\n🕐 Time: {{time}} (in 2 hours)\n👥 Party size: {{partySize}}\n\nDon't forget! 🎉`,
      },

      no_show_warning: {
        sms: (data) => `We missed you at Jollibee today. Your reservation was cancelled. To avoid fees, please cancel at least 2 hours in advance next time.`,
        email: {
          subject: 'Missed Reservation - Jollibee',
          body: (data) => `Hi ${data.name},<br><br>We missed you today! Your reservation was marked as a no-show.<br><br>To help us serve all our guests better, please cancel at least 2 hours in advance if you can't make it.<br><br>We hope to see you soon!<br><br>Jollibee Team`
        }
      },

      feedback_request: {
        sms: (data) => `Thanks for dining at Jollibee! How was your experience? Reply with a rating 1-5. Your feedback helps us improve!`,
        whatsapp: (data) => `🙏 *Thank You!*\n\nHi {{name}},\n\nThank you for dining at Jollibee!\n\nHow was your experience today?\n\nReply with a rating:\n⭐ 1 - Poor\n⭐⭐ 2 - Fair\n⭐⭐⭐ 3 - Good\n⭐⭐⭐⭐ 4 - Very Good\n⭐⭐⭐⭐⭐ 5 - Excellent\n\nYour feedback helps us improve! 🎉`,
        email: {
          subject: 'How was your visit to Jollibee?',
          body: (data) => `Hi ${data.name},<br><br>Thank you for dining at Jollibee!<br><br>We'd love to hear about your experience. Please take a moment to share your feedback:<br><br><a href="#" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Share Feedback</a><br><br>Thank you,<br>Jollibee Team`
        }
      },

      promotion: {
        sms: (data) => `🎉 Special offer from Jollibee! {{message}} Valid until {{expiryDate}}. Book now!`,
        whatsapp: (data) => `🎉 *Special Offer*\n\nHi {{name}},\n\n{{message}}\n\n✨ Valid until: {{expiryDate}}\n\n👉 Book now: {{bookingLink}}\n\nDon't miss out! 🍽️`,
      }
    };
  }

  /**
   * Render template with data
   */
  renderTemplate(template, data) {
    let result = template;
    
    // Replace all {{variable}} with actual values
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    return result;
  }

  /**
   * Send SMS
   */
  async sendSMS(to, templateName, data, options = {}) {
    if (!this.enabled || !this.twilioClient) {
      console.log('[SMSService] SMS disabled or not configured');
      return { success: false, error: 'SMS not configured' };
    }

    try {
      const template = this.templates[templateName]?.sms;
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      const message = this.renderTemplate(template(data), data);
      
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: this.formatPhoneNumber(to)
      });

      // Log notification
      await this.logNotification({
        type: 'sms',
        template: templateName,
        to,
        message,
        status: 'sent',
        externalId: result.sid
      });

      console.log(`[SMSService] SMS sent to ${to}: ${templateName}`);
      return { success: true, messageId: result.sid };

    } catch (error) {
      console.error('[SMSService] Failed to send SMS:', error);
      
      await this.logNotification({
        type: 'sms',
        template: templateName,
        to,
        status: 'failed',
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(to, templateName, data, options = {}) {
    if (!this.enabled || !this.twilioClient) {
      console.log('[SMSService] WhatsApp disabled or not configured');
      return { success: false, error: 'WhatsApp not configured' };
    }

    try {
      const template = this.templates[templateName]?.whatsapp;
      if (!template) {
        // Fall back to SMS template
        return this.sendSMS(to, templateName, data, options);
      }

      const message = this.renderTemplate(template(data), data);
      
      const result = await this.twilioClient.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${this.formatPhoneNumber(to)}`
      });

      await this.logNotification({
        type: 'whatsapp',
        template: templateName,
        to,
        message,
        status: 'sent',
        externalId: result.sid
      });

      console.log(`[SMSService] WhatsApp sent to ${to}: ${templateName}`);
      return { success: true, messageId: result.sid };

    } catch (error) {
      console.error('[SMSService] Failed to send WhatsApp:', error);
      
      await this.logNotification({
        type: 'whatsapp',
        template: templateName,
        to,
        status: 'failed',
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send email (via existing email service)
   */
  async sendEmail(to, templateName, data, options = {}) {
    const { sendMail } = require('../utils/email');
    
    try {
      const template = this.templates[templateName]?.email;
      if (!template) {
        throw new Error(`Email template not found: ${templateName}`);
      }

      const subject = template.subject;
      const html = template.body(data);

      await sendMail({
        to,
        subject,
        html
      });

      await this.logNotification({
        type: 'email',
        template: templateName,
        to,
        status: 'sent'
      });

      console.log(`[SMSService] Email sent to ${to}: ${templateName}`);
      return { success: true };

    } catch (error) {
      console.error('[SMSService] Failed to send email:', error);
      
      await this.logNotification({
        type: 'email',
        template: templateName,
        to,
        status: 'failed',
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send multi-channel notification (SMS + Email)
   */
  async sendNotification(channels, to, templateName, data, options = {}) {
    const results = {};

    if (channels.includes('sms')) {
      results.sms = await this.sendSMS(to.phone, templateName, data, options);
    }

    if (channels.includes('whatsapp')) {
      results.whatsapp = await this.sendWhatsApp(to.phone, templateName, data, options);
    }

    if (channels.includes('email') && to.email) {
      results.email = await this.sendEmail(to.email, templateName, data, options);
    }

    return results;
  }

  /**
   * Schedule a notification
   */
  async scheduleNotification(scheduleTime, channels, to, templateName, data, options = {}) {
    try {
      const db = getDb();
      const scheduledNotification = {
        id: uuid(),
        scheduleTime,
        channels,
        to,
        templateName,
        data,
        options,
        status: 'scheduled',
        createdAt: isoNow()
      };

      await db.collection('scheduled_notifications').doc(scheduledNotification.id).set(scheduledNotification);

      console.log(`[SMSService] Notification scheduled for ${new Date(scheduleTime).toISOString()}`);
      return { success: true, scheduledId: scheduledNotification.id };

    } catch (error) {
      console.error('[SMSService] Failed to schedule notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications() {
    try {
      const db = getDb();
      const now = Date.now();

      const scheduledSnapshot = await db.collection('scheduled_notifications')
        .where('scheduleTime', '<=', now)
        .where('status', '==', 'scheduled')
        .get();

      for (const doc of scheduledSnapshot.docs) {
        const notification = doc.data();
        
        // Send the notification
        await this.sendNotification(
          notification.channels,
          notification.to,
          notification.templateName,
          notification.data,
          notification.options
        );

        // Update status
        await db.collection('scheduled_notifications').doc(doc.id).update({
          status: 'sent',
          sentAt: isoNow()
        });
      }

      if (scheduledSnapshot.size > 0) {
        console.log(`[SMSService] Processed ${scheduledSnapshot.size} scheduled notifications`);
      }

    } catch (error) {
      console.error('[SMSService] Failed to process scheduled notifications:', error);
    }
  }

  /**
   * Log notification
   */
  async logNotification(logData) {
    try {
      const db = getDb();
      await db.collection('notification_logs').add({
        id: uuid(),
        ...logData,
        timestamp: Date.now(),
        createdAt: isoNow()
      });
    } catch (error) {
      console.error('[SMSService] Failed to log notification:', error);
    }
  }

  /**
   * Format phone number for international format
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with country code (Philippines: +63)
    if (cleaned.startsWith('0')) {
      cleaned = '63' + cleaned.substring(1);
    }
    
    // If doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(userId, limit = 50) {
    try {
      const db = getDb();
      const historySnapshot = await db.collection('notification_logs')
        .where('to.userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('[SMSService] Failed to get notification history:', error);
      return [];
    }
  }

  /**
   * Get notification stats
   */
  async getStats(duration = 86400000) { // Default 24 hours
    try {
      const db = getDb();
      const cutoff = Date.now() - duration;

      const logsSnapshot = await db.collection('notification_logs')
        .where('timestamp', '>=', cutoff)
        .get();

      const stats = {
        total: logsSnapshot.size,
        byType: {},
        byStatus: {},
        byTemplate: {}
      };

      logsSnapshot.docs.forEach(doc => {
        const log = doc.data();
        
        // By type
        stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
        
        // By status
        stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
        
        // By template
        stats.byTemplate[log.template] = (stats.byTemplate[log.template] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('[SMSService] Failed to get stats:', error);
      return null;
    }
  }
}

// Export singleton
module.exports = new SMSService();

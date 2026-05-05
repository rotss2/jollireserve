/**
 * Guest Profile Service
 * 
 * Features:
 * - Guest preference tracking
 * - Visit history
 * - Special occasions management
 * - VIP status
 * - Personalized recommendations
 */

const { getDb } = require('../firebase');
const { v4: uuid } = require('uuid');
const { isoNow } = require('../utils/time');

class GuestProfileService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get or create guest profile
   */
  async getProfile(userId, createIfMissing = true) {
    try {
      const db = getDb();
      
      // Check cache
      if (this.cache.has(userId)) {
        const cached = this.cache.get(userId);
        if (Date.now() - cached.cachedAt < 300000) { // 5 minutes
          return cached.profile;
        }
      }
      
      // Get from database
      const profileDoc = await db.collection('guest_profiles').doc(userId).get();
      
      if (profileDoc.exists) {
        const profile = { id: profileDoc.id, ...profileDoc.data() };
        
        // Cache it
        this.cache.set(userId, { profile, cachedAt: Date.now() });
        
        return profile;
      }
      
      // Create new profile if requested
      if (createIfMissing) {
        return this.createProfile(userId);
      }
      
      return null;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to get profile:', error);
      return null;
    }
  }

  /**
   * Create new guest profile
   */
  async createProfile(userId, initialData = {}) {
    try {
      const db = getDb();
      
      const profile = {
        id: userId,
        user_id: userId,
        ...initialData,
        visit_count: 0,
        total_spent: 0,
        average_party_size: 0,
        preferred_area: null,
        preferred_time: null,
        dietary_restrictions: [],
        special_occasions: [],
        vip_status: 'regular', // regular, silver, gold, platinum
        tags: [],
        notes: '',
        first_visit: null,
        last_visit: null,
        created_at: isoNow(),
        updated_at: isoNow()
      };
      
      await db.collection('guest_profiles').doc(userId).set(profile);
      
      // Cache it
      this.cache.set(userId, { profile, cachedAt: Date.now() });
      
      console.log(`[GuestProfileService] Created profile for ${userId}`);
      return profile;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to create profile:', error);
      return null;
    }
  }

  /**
   * Update guest profile
   */
  async updateProfile(userId, updates) {
    try {
      const db = getDb();
      
      const updateData = {
        ...updates,
        updated_at: isoNow()
      };
      
      await db.collection('guest_profiles').doc(userId).update(updateData);
      
      // Invalidate cache
      this.cache.delete(userId);
      
      console.log(`[GuestProfileService] Updated profile for ${userId}`);
      return true;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to update profile:', error);
      return false;
    }
  }

  /**
   * Record a visit
   */
  async recordVisit(userId, visitData) {
    try {
      const db = getDb();
      
      // Add visit record
      const visit = {
        id: uuid(),
        user_id: userId,
        reservation_id: visitData.reservationId,
        date: visitData.date,
        time: visitData.time,
        party_size: visitData.partySize,
        table_id: visitData.tableId,
        table_area: visitData.tableArea,
        total_amount: visitData.amount || 0,
        pre_order_items: visitData.preOrderItems || [],
        special_requests: visitData.specialRequests || '',
        feedback_rating: visitData.rating || null,
        feedback_comment: visitData.comment || '',
        arrived_at: visitData.arrivedAt || null,
        departed_at: visitData.departedAt || null,
        created_at: isoNow()
      };
      
      await db.collection('visit_history').add(visit);
      
      // Update profile stats
      const profile = await this.getProfile(userId);
      if (profile) {
        const updates = {
          visit_count: (profile.visit_count || 0) + 1,
          total_spent: (profile.total_spent || 0) + (visitData.amount || 0),
          last_visit: visitData.date,
          first_visit: profile.first_visit || visitData.date
        };
        
        // Calculate average party size
        const visitsSnapshot = await db.collection('visit_history')
          .where('user_id', '==', userId)
          .get();
        
        const totalPartySize = visitsSnapshot.docs.reduce((sum, doc) => 
          sum + (doc.data().party_size || 0), 0
        );
        updates.average_party_size = Math.round(totalPartySize / (visitsSnapshot.size + 1));
        
        // Update preferred area if this area is used frequently
        const areaCount = {};
        visitsSnapshot.docs.forEach(doc => {
          const area = doc.data().table_area;
          if (area) {
            areaCount[area] = (areaCount[area] || 0) + 1;
          }
        });
        
        const mostFrequentArea = Object.entries(areaCount)
          .sort((a, b) => b[1] - a[1])[0];
        
        if (mostFrequentArea) {
          updates.preferred_area = mostFrequentArea[0];
        }
        
        // Determine VIP status based on visit count and spending
        updates.vip_status = this.calculateVIPStatus(updates.visit_count, updates.total_spent);
        
        await this.updateProfile(userId, updates);
      }
      
      console.log(`[GuestProfileService] Recorded visit for ${userId}`);
      return visit;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to record visit:', error);
      return null;
    }
  }

  /**
   * Calculate VIP status
   */
  calculateVIPStatus(visitCount, totalSpent) {
    if (visitCount >= 20 || totalSpent >= 50000) return 'platinum';
    if (visitCount >= 10 || totalSpent >= 25000) return 'gold';
    if (visitCount >= 5 || totalSpent >= 10000) return 'silver';
    return 'regular';
  }

  /**
   * Get visit history
   */
  async getVisitHistory(userId, limit = 20) {
    try {
      const db = getDb();
      
      const visitsSnapshot = await db.collection('visit_history')
        .where('user_id', '==', userId)
        .orderBy('date', 'desc')
        .limit(limit)
        .get();
      
      return visitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to get visit history:', error);
      return [];
    }
  }

  /**
   * Add dietary restriction
   */
  async addDietaryRestriction(userId, restriction) {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return false;
      
      const restrictions = profile.dietary_restrictions || [];
      if (!restrictions.includes(restriction)) {
        restrictions.push(restriction);
        await this.updateProfile(userId, { dietary_restrictions: restrictions });
      }
      
      return true;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to add dietary restriction:', error);
      return false;
    }
  }

  /**
   * Add special occasion
   */
  async addSpecialOccasion(userId, occasion) {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return false;
      
      const occasions = profile.special_occasions || [];
      
      // Check if already exists
      const exists = occasions.some(o => 
        o.type === occasion.type && o.date === occasion.date
      );
      
      if (!exists) {
        occasions.push({
          ...occasion,
          id: uuid(),
          added_at: isoNow()
        });
        
        await this.updateProfile(userId, { special_occasions: occasions });
      }
      
      return true;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to add special occasion:', error);
      return false;
    }
  }

  /**
   * Get upcoming special occasions
   */
  async getUpcomingOccasions(userId, days = 30) {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return [];
      
      const today = new Date();
      const cutoff = new Date();
      cutoff.setDate(today.getDate() + days);
      
      return (profile.special_occasions || []).filter(occasion => {
        const occasionDate = new Date(occasion.date);
        return occasionDate >= today && occasionDate <= cutoff;
      });
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to get upcoming occasions:', error);
      return [];
    }
  }

  /**
   * Add tag to guest
   */
  async addTag(userId, tag) {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return false;
      
      const tags = profile.tags || [];
      if (!tags.includes(tag)) {
        tags.push(tag);
        await this.updateProfile(userId, { tags });
      }
      
      return true;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to add tag:', error);
      return false;
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId) {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return [];
      
      const recommendations = [];
      
      // Based on preferred area
      if (profile.preferred_area) {
        recommendations.push({
          type: 'area',
          message: `Based on your history, you seem to prefer the ${profile.preferred_area} area.`,
          priority: 'high'
        });
      }
      
      // Based on dietary restrictions
      if (profile.dietary_restrictions?.length > 0) {
        recommendations.push({
          type: 'dietary',
          message: `We have noted your dietary preferences: ${profile.dietary_restrictions.join(', ')}.`,
          priority: 'high'
        });
      }
      
      // Based on VIP status
      if (profile.vip_status !== 'regular') {
        recommendations.push({
          type: 'vip',
          message: `As a ${profile.vip_status} member, you have access to exclusive tables and priority seating.`,
          priority: 'medium'
        });
      }
      
      // Based on special occasions
      const upcoming = await this.getUpcomingOccasions(userId);
      if (upcoming.length > 0) {
        const nextOccasion = upcoming[0];
        recommendations.push({
          type: 'occasion',
          message: `We see you have ${nextOccasion.type} coming up on ${nextOccasion.date}. Would you like to make a reservation?`,
          priority: 'high'
        });
      }
      
      // Based on visit frequency
      if (profile.visit_count >= 5) {
        recommendations.push({
          type: 'loyalty',
          message: `Thank you for being a loyal customer! You've visited us ${profile.visit_count} times.`,
          priority: 'low'
        });
      }
      
      return recommendations;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Search guest profiles
   */
  async searchProfiles(query, limit = 20) {
    try {
      const db = getDb();
      
      // Search by name or phone
      const profilesSnapshot = await db.collection('guest_profiles')
        .where('name', '>=', query)
        .where('name', '<=', query + '\uf8ff')
        .limit(limit)
        .get();
      
      const results = profilesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Also search by phone if query looks like a number
      if (/^\d+$/.test(query.replace(/\D/g, ''))) {
        const phoneSnapshot = await db.collection('guest_profiles')
          .where('phone', '==', query)
          .limit(limit)
          .get();
        
        const phoneResults = phoneSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Merge results, avoiding duplicates
        const seen = new Set(results.map(r => r.id));
        phoneResults.forEach(r => {
          if (!seen.has(r.id)) {
            results.push(r);
          }
        });
      }
      
      return results;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to search profiles:', error);
      return [];
    }
  }

  /**
   * Get VIP guests
   */
  async getVIPGuests(status = null, limit = 50) {
    try {
      const db = getDb();
      
      let query = db.collection('guest_profiles');
      
      if (status) {
        query = query.where('vip_status', '==', status);
      } else {
        query = query.where('vip_status', 'in', ['silver', 'gold', 'platinum']);
      }
      
      const profilesSnapshot = await query
        .orderBy('total_spent', 'desc')
        .limit(limit)
        .get();
      
      return profilesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to get VIP guests:', error);
      return [];
    }
  }

  /**
   * Get guest analytics
   */
  async getAnalytics(userId) {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return null;
      
      const visits = await this.getVisitHistory(userId, 100);
      
      // Calculate analytics
      const analytics = {
        total_visits: profile.visit_count,
        total_spent: profile.total_spent,
        average_spend: profile.visit_count > 0 ? 
          Math.round(profile.total_spent / profile.visit_count) : 0,
        favorite_time: this.calculateFavoriteTime(visits),
        favorite_day: this.calculateFavoriteDay(visits),
        average_party_size: profile.average_party_size,
        preferred_area: profile.preferred_area,
        visit_frequency: this.calculateVisitFrequency(visits),
        last_visit_days_ago: profile.last_visit ? 
          Math.floor((Date.now() - new Date(profile.last_visit).getTime()) / 86400000) : null
      };
      
      return analytics;
      
    } catch (error) {
      console.error('[GuestProfileService] Failed to get analytics:', error);
      return null;
    }
  }

  /**
   * Calculate favorite time
   */
  calculateFavoriteTime(visits) {
    const timeSlots = {};
    
    visits.forEach(visit => {
      const hour = parseInt(visit.time?.split(':')[0] || 0);
      let slot;
      
      if (hour >= 6 && hour < 11) slot = 'breakfast';
      else if (hour >= 11 && hour < 15) slot = 'lunch';
      else if (hour >= 15 && hour < 18) slot = 'afternoon';
      else slot = 'dinner';
      
      timeSlots[slot] = (timeSlots[slot] || 0) + 1;
    });
    
    const favorite = Object.entries(timeSlots)
      .sort((a, b) => b[1] - a[1])[0];
    
    return favorite ? favorite[0] : null;
  }

  /**
   * Calculate favorite day
   */
  calculateFavoriteDay(visits) {
    const days = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    visits.forEach(visit => {
      const date = new Date(visit.date);
      const day = dayNames[date.getDay()];
      days[day] = (days[day] || 0) + 1;
    });
    
    const favorite = Object.entries(days)
      .sort((a, b) => b[1] - a[1])[0];
    
    return favorite ? favorite[0] : null;
  }

  /**
   * Calculate visit frequency (visits per month)
   */
  calculateVisitFrequency(visits) {
    if (visits.length < 2) return 0;
    
    const firstVisit = new Date(visits[visits.length - 1].date);
    const lastVisit = new Date(visits[0].date);
    const monthsDiff = (lastVisit - firstVisit) / (1000 * 60 * 60 * 24 * 30);
    
    return monthsDiff > 0 ? (visits.length / monthsDiff).toFixed(1) : visits.length;
  }
}

// Export singleton
module.exports = new GuestProfileService();

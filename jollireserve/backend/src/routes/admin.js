const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const { getDb } = require("../firebase");
const { requireAuth, requireRole } = require("../middleware/auth");
const { toDayISO, isoNow } = require("../utils/time");

const router = express.Router();

// ── Public: Get Active Announcement ───────────────────────
router.get("/announcements/active", async (req, res) => {
  try {
    const db = getDb();
    // Get the most recent announcement (assuming recent = active)
    const snapshot = await db.collection("announcements")
      .orderBy("created_at", "desc")
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.json({ announcement: null });
    }
    
    const announcement = snapshot.docs[0].data();
    res.json({ announcement });
  } catch (e) {
    console.error("Get active announcement error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Public: Get System Settings ─────────────────────────
router.get("/settings", async (req, res) => {
  try {
    const db = getDb();
    const settingsDoc = await db.collection("settings").doc("system").get();
    
    // Default settings
    const defaults = {
      max_party_size: 12,
      max_advance_days: 30,
      restaurant_name: "JolliReserve",
      contact_email: "",
      contact_phone: ""
    };
    
    if (settingsDoc.exists) {
      res.json({ settings: { ...defaults, ...settingsDoc.data() } });
    } else {
      res.json({ settings: defaults });
    }
  } catch (e) {
    console.error("Get settings error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Apply auth middleware - admin only for user management
router.use(requireAuth, requireRole(["admin"]));

// ── Users (admin only) ────────────────────────────────────

// Get all users
router.get("/users", async (req, res) => {
  try {
    const db = getDb();
    const usersCol = db.collection("users");
    const snapshot = await usersCol.orderBy("created_at", "desc").get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        is_verified: data.is_verified,
        created_at: data.created_at
      };
    });
    res.json({ users });
  } catch (e) {
    console.error("Get users error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Create new user (admin can create users directly)
router.post("/users", async (req, res) => {
  try {
    const { email, password, name, role = "customer" } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const db = getDb();
    const usersCol = db.collection("users");

    // Check if email already exists
    const existing = await usersCol.where("email", "==", email.toLowerCase()).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const id = uuid();
    const hash = bcrypt.hashSync(password, 10);

    const userData = {
      id,
      email: email.toLowerCase(),
      password_hash: hash,
      name: name || "",
      role: role,
      is_verified: 1, // Admin-created users are pre-verified
      verification_code_hash: null,
      verification_code_expires_at: null,
      created_at: isoNow()
    };

    await usersCol.doc(id).set(userData);

    res.json({ 
      ok: true, 
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        is_verified: userData.is_verified,
        created_at: userData.created_at
      }
    });
  } catch (e) {
    console.error("Create user error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update user role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["customer", "staff", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const db = getDb();
    await db.collection("users").doc(req.params.id).update({ role });
    res.json({ ok: true });
  } catch (e) {
    console.error("Update role error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Suspend/unsuspend user
router.patch("/users/:id/suspend", async (req, res) => {
  try {
    const { suspended } = req.body;
    const db = getDb();
    await db.collection("users").doc(req.params.id).update({
      is_verified: suspended ? 0 : 1
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Suspend user error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Reset user password
router.patch("/users/:id/password", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "password required" });

    const hash = bcrypt.hashSync(password, 10);
    const db = getDb();
    await db.collection("users").doc(req.params.id).update({
      password_hash: hash
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Reset password error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    const db = getDb();
    await db.collection("users").doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (e) {
    console.error("Delete user error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get user history (reservations and queue entries)
router.get("/users/:id/history", async (req, res) => {
  try {
    const db = getDb();

    // Get user's reservations
    const reservationsSnapshot = await db.collection("reservations")
      .where("user_id", "==", req.params.id)
      .orderBy("created_at", "desc")
      .get();
    const reservations = reservationsSnapshot.docs.map(doc => doc.data());

    // Get user's queue entries
    const queueSnapshot = await db.collection("queue_entries")
      .where("user_id", "==", req.params.id)
      .orderBy("created_at", "desc")
      .get();
    const queue = queueSnapshot.docs.map(doc => doc.data());

    res.json({ reservations, queue });
  } catch (e) {
    console.error("Get user history error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Analytics (admin only) ─────────────────────────────────

router.get("/analytics/summary", async (req, res) => {
  try {
    const db = getDb();
    const today = toDayISO();

    // Count today's reservations
    const reservationsSnapshot = await db.collection("reservations")
      .where("date", "==", today)
      .get();
    const reservationsToday = reservationsSnapshot.size;

    // Count active queue
    let activeQueue = 0;
    try {
      const queueSnapshot = await db.collection("queue_entries")
        .where("status", "in", ["waiting", "called"])
        .get();
      activeQueue = queueSnapshot.size;
    } catch (indexErr) {
      console.warn("[Analytics] Queue index missing, using fallback:", indexErr.message);
      // Fallback: get all and filter in memory
      const allQueueSnapshot = await db.collection("queue_entries").get();
      activeQueue = allQueueSnapshot.docs.filter(doc => {
        const status = doc.data().status;
        return status === "waiting" || status === "called";
      }).length;
    }

    // Count available tables
    const tablesSnapshot = await db.collection("tables")
      .where("is_active", "==", 1)
      .get();
    const availableTables = tablesSnapshot.size;

    res.json({ today, reservationsToday, activeQueue, availableTables });
  } catch (e) {
    console.error("Analytics summary error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Tables (admin only - full CRUD) ───────────────────────

// Get all tables
router.get("/tables", async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("tables").orderBy("name").get();
    const tables = snapshot.docs.map(doc => doc.data());
    res.json({ tables });
  } catch (e) {
    console.error("Get tables error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Create table
router.post("/tables", async (req, res) => {
  try {
    const { name, area, capacity } = req.body;
    if (!name || !area || !capacity) {
      return res.status(400).json({ error: "name, area, capacity required" });
    }

    const db = getDb();
    const id = uuid();
    const tableData = {
      id,
      name,
      area,
      capacity: Number(capacity),
      is_active: 1
    };

    await db.collection("tables").doc(id).set(tableData);
    res.json({ ok: true, id });
  } catch (e) {
    console.error("Create table error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update table
router.patch("/tables/:id", async (req, res) => {
  try {
    const { name, area, capacity, is_active } = req.body;
    const db = getDb();

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (area !== undefined) updates.area = area;
    if (capacity !== undefined) updates.capacity = Number(capacity);
    if (is_active !== undefined) updates.is_active = Number(is_active);

    await db.collection("tables").doc(req.params.id).update(updates);
    res.json({ ok: true });
  } catch (e) {
    console.error("Update table error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Delete table
router.delete("/tables/:id", async (req, res) => {
  try {
    const db = getDb();
    await db.collection("tables").doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (e) {
    console.error("Delete table error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Announcements (admin only) ──────────────────────────────

// Get all announcements
router.get("/announcements", async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("announcements")
      .orderBy("created_at", "desc")
      .limit(50)
      .get();
    const announcements = snapshot.docs.map(doc => doc.data());
    res.json({ announcements });
  } catch (e) {
    console.error("Get announcements error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Create announcement
router.post("/announcements", async (req, res) => {
  try {
    console.log("[Admin API] Create announcement - req.user:", req.user);
    const { title, message, type = "info", duration = 30 } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message required" });
    }

    if (!req.user || !req.user.id) {
      console.error("[Admin API] No user in request");
      return res.status(401).json({ error: "Unauthorized - no user" });
    }

    const db = getDb();
    const id = uuid();
    const announcementData = {
      id,
      title,
      message,
      type,
      duration: Number(duration),
      created_at: isoNow(),
      created_by: req.user.id
    };
    console.log("[Admin API] Saving announcement:", announcementData);

    await db.collection("announcements").doc(id).set(announcementData);

    // Broadcast to all connected clients via WebSocket
    const { broadcast } = require("../ws");
    broadcast({
      type: "announcement",
      announcement: announcementData
    });

    res.json({ ok: true, id, announcement: announcementData });
  } catch (e) {
    console.error("[Admin API] Create announcement error:", e.message);
    console.error("[Admin API] Stack trace:", e.stack);
    res.status(500).json({ error: "Server error: " + e.message });
  }
});

// Delete announcement
router.delete("/announcements/:id", async (req, res) => {
  try {
    const db = getDb();
    await db.collection("announcements").doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (e) {
    console.error("Delete announcement error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Admin Activity Feed ────────────────────────────────────
router.get("/activity", async (req, res) => {
  try {
    const db = getDb();
    const { limit = 50, userId } = req.query;
    
    let query = db.collection("activity_logs")
      .orderBy("created_at", "desc")
      .limit(Number(limit));
    
    if (userId) {
      query = query.where("user_id", "==", userId);
    }
    
    const snapshot = await query.get();
    const activity = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      // Get user info for each activity
      let userInfo = { email: "Unknown", name: "Unknown" };
      if (data.user_id) {
        const userDoc = await db.collection("users").doc(data.user_id).get();
        if (userDoc.exists) {
          const user = userDoc.data();
          userInfo = { email: user.email, name: user.name };
        }
      }
      return { ...data, user: userInfo };
    }));
    
    res.json({ activity });
  } catch (e) {
    console.error("Get activity error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Settings Management ─────────────────────────────────

// Get settings (admin)
router.get("/settings/admin", async (req, res) => {
  try {
    const db = getDb();
    const settingsDoc = await db.collection("settings").doc("system").get();
    
    const defaults = {
      max_party_size: 12,
      max_advance_days: 30,
      restaurant_name: "JolliReserve",
      contact_email: "",
      contact_phone: ""
    };
    
    res.json({ settings: settingsDoc.exists ? { ...defaults, ...settingsDoc.data() } : defaults });
  } catch (e) {
    console.error("Get settings error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update settings (admin)
router.post("/settings", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    const db = getDb();
    const { max_party_size, max_advance_days, restaurant_name, contact_email, contact_phone } = req.body || {};
    
    const updateData = {};
    if (max_party_size !== undefined) updateData.max_party_size = Number(max_party_size);
    if (max_advance_days !== undefined) updateData.max_advance_days = Number(max_advance_days);
    if (restaurant_name !== undefined) updateData.restaurant_name = restaurant_name;
    if (contact_email !== undefined) updateData.contact_email = contact_email;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    updateData.updated_at = isoNow();
    updateData.updated_by = req.user.id;
    
    await db.collection("settings").doc("system").set(updateData, { merge: true });
    
    // Broadcast settings change to all clients
    const { broadcast } = require("../ws");
    broadcast({
      type: "settings:changed",
      settings: updateData
    });
    
    res.json({ ok: true, settings: updateData });
  } catch (e) {
    console.error("Update settings error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: Get All Reservations ─────────────────────────
router.get("/reservations", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("reservations")
      .orderBy("created_at", "desc")
      .get();
    
    const reservations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ reservations });
  } catch (e) {
    console.error("Get reservations error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: Confirm Reservation ─────────────────────────
router.post("/reservations/:id/confirm", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const doc = await db.collection("reservations").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Reservation not found" });
    
    const reservation = doc.data();
    
    await db.collection("reservations").doc(id).update({
      status: "confirmed",
      confirmed_at: isoNow(),
      confirmed_by: req.user.id
    });
    
    // Log activity
    await db.collection("activity_logs").add({
      id: uuid(),
      user_id: reservation.user_id,
      action: "reservation_confirmed",
      details: { reservation_id: id, date: reservation.date, time: reservation.time },
      created_at: isoNow()
    });
    
    res.json({ ok: true, message: "Reservation confirmed" });
  } catch (e) {
    console.error("Confirm reservation error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: Cancel Reservation ─────────────────────────
router.post("/reservations/:id/cancel", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const doc = await db.collection("reservations").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Reservation not found" });
    
    const reservation = doc.data();
    
    await db.collection("reservations").doc(id).update({
      status: "cancelled",
      cancelled_at: isoNow(),
      cancelled_by: req.user.id
    });
    
    // Log activity
    await db.collection("activity_logs").add({
      id: uuid(),
      user_id: reservation.user_id,
      action: "reservation_cancelled",
      details: { reservation_id: id, date: reservation.date, time: reservation.time },
      created_at: isoNow()
    });
    
    res.json({ ok: true, message: "Reservation cancelled" });
  } catch (e) {
    console.error("Cancel reservation error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: Get All Queue Entries ─────────────────────────
router.get("/queue", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("queue_entries")
      .orderBy("joined_at", "desc")
      .get();
    
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ entries });
  } catch (e) {
    console.error("Get queue error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: Call Queue Entry ─────────────────────────
router.post("/queue/:id/call", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const doc = await db.collection("queue_entries").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Queue entry not found" });
    
    const entry = doc.data();
    
    await db.collection("queue_entries").doc(id).update({
      status: "called",
      called_at: isoNow(),
      called_by: req.user.id
    });
    
    // Log activity
    await db.collection("activity_logs").add({
      id: uuid(),
      user_id: entry.user_id,
      action: "queue_called",
      details: { queue_id: id, party_size: entry.party_size },
      created_at: isoNow()
    });
    
    res.json({ ok: true, message: "Customer called" });
  } catch (e) {
    console.error("Call queue error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: Seat Queue Entry ─────────────────────────
router.post("/queue/:id/seat", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const doc = await db.collection("queue_entries").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Queue entry not found" });
    
    const entry = doc.data();
    
    await db.collection("queue_entries").doc(id).update({
      status: "seated",
      seated_at: isoNow(),
      seated_by: req.user.id
    });
    
    // Log activity
    await db.collection("activity_logs").add({
      id: uuid(),
      user_id: entry.user_id,
      action: "queue_seated",
      details: { queue_id: id, party_size: entry.party_size },
      created_at: isoNow()
    });
    
    res.json({ ok: true, message: "Customer seated" });
  } catch (e) {
    console.error("Seat queue error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: Cancel Queue Entry ─────────────────────────
router.post("/queue/:id/cancel", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    
    const doc = await db.collection("queue_entries").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Queue entry not found" });
    
    const entry = doc.data();
    
    await db.collection("queue_entries").doc(id).update({
      status: "cancelled",
      cancelled_at: isoNow(),
      cancelled_by: req.user.id
    });
    
    // Log activity
    await db.collection("activity_logs").add({
      id: uuid(),
      user_id: entry.user_id,
      action: "queue_cancelled",
      details: { queue_id: id, party_size: entry.party_size },
      created_at: isoNow()
    });
    
    res.json({ ok: true, message: "Queue entry cancelled" });
  } catch (e) {
    console.error("Cancel queue error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

const express = require("express");
const { v4: uuid } = require("uuid");
const { getDb } = require("../firebase");
const { isoNow } = require("../utils/time");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendMail } = require("../utils/email");

const { broadcast } = require('../ws');

const router = express.Router();

// Helper to get system settings
async function getSettings() {
  try {
    const db = getDb();
    const settingsDoc = await db.collection("settings").doc("system").get();
    const defaults = { max_party_size: 12 };
    return settingsDoc.exists ? { ...defaults, ...settingsDoc.data() } : defaults;
  } catch (e) {
    return { max_party_size: 12 };
  }
}

// Activity logging helper
async function logActivity(userId, action, details = {}) {
  try {
    const db = getDb();
    await db.collection("activity_logs").add({
      id: uuid(),
      user_id: userId,
      action,
      details,
      created_at: isoNow()
    });
    
    // Broadcast to admin via WebSocket
    broadcast({
      type: "activity",
      activity: { user_id: userId, action, details, created_at: isoNow() }
    });
  } catch (e) {
    console.error("Activity log error:", e.message);
  }
}

// Join queue (auth optional: allow guests)
router.post("/join", async (req, res) => {
  try {
    const { party_size, name, user_id, email } = req.body || {};
    console.log("[Queue Join] Received:", { party_size, user_id, email, name });
    console.log("[Queue Join] Auth header:", req.headers.authorization ? "Present" : "Missing");
    console.log("[Queue Join] req.user:", req.user);
    
    if (!party_size) return res.status(400).json({ error: "party_size required" });

    // Check max party size
    const settings = await getSettings();
    const maxPartySize = settings.max_party_size || 12;
    if (Number(party_size) > maxPartySize) {
      return res.status(400).json({ 
        error: `Maximum party size is ${maxPartySize} people.`,
        max_party_size: maxPartySize
      });
    }

    const db = getDb();
    const queueCol = db.collection("queue_entries");
    const id = uuid();
    const createdAt = isoNow();
    
    const entryData = {
      id,
      user_id: user_id || null,
      name: name || "Guest",
      party_size: Number(party_size),
      status: "waiting",
      created_at: createdAt,
      joined_at: createdAt,  // For index compatibility
      called_at: null,
      seated_at: null
    };
    
    console.log("[Queue Join] Final user_id being saved:", entryData.user_id);
    await queueCol.doc(id).set(entryData);
    console.log("[Queue Join] Saved successfully with id:", id);

    // Log activity if user_id provided
    if (user_id) {
      await logActivity(user_id, "queue_joined", { party_size, name });
    }

    // Optional notify: "joined queue"
    if (email) {
      sendMail({
        to: email,
        subject: "JolliReserve: You joined the queue",
        text:
          `Hello ${name || "Guest"},

You have joined the queue.

Party size: ${entryData.party_size}
Status: waiting

We will notify you when you are called.

Thank you,
JolliReserve`
      }).catch(() => { });
    }

    broadcast({ type: 'queue:changed' });
    broadcast({ type: 'notify', level: 'info', message: 'Queue updated.' });
    res.json({ entry: entryData });
  } catch (err) {
    console.error("Queue join error:", err.message);
    res.status(500).json({ error: "Failed to join queue: " + err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const queueCol = db.collection("queue_entries");
    const snapshot = await queueCol
      .where("status", "in", ["waiting", "called"])
      .orderBy("created_at", "asc")
      .get();
    const rows = snapshot.docs.map(doc => doc.data());
    res.json({ entries: rows });
  } catch (err) {
    console.error("Queue list error:", err.message);
    res.status(500).json({ error: "Failed to fetch queue: " + err.message });
  }
});

router.get("/active", async (req, res) => {
  try {
    const db = getDb();
    const queueCol = db.collection("queue_entries");
    const snapshot = await queueCol
      .where("status", "in", ["waiting", "called"])
      .orderBy("created_at", "asc")
      .get();
    const rows = snapshot.docs.map(doc => doc.data());
    res.json({ entries: rows });
  } catch (err) {
    console.error("Queue active error:", err.message);
    res.status(500).json({ error: "Failed to fetch queue: " + err.message });
  }
});

// Get user's queue history (all statuses)
router.get("/history", requireAuth, async (req, res) => {
  try {
    console.log("[Queue History] User from token:", req.user);
    console.log("[Queue History] Querying for user_id:", req.user?.id);
    
    const db = getDb();
    const queueCol = db.collection("queue_entries");
    
    console.log("[Queue History] Looking up user_id:", req.user?.id);
    
    // Get all entries for this user (including seated, cancelled, etc.)
    const snapshot = await queueCol
      .where("user_id", "==", req.user.id)
      .orderBy("created_at", "desc")
      .limit(50)
      .get();
    
    const entries = snapshot.docs.map(doc => doc.data());
    console.log("[Queue History] Found", entries.length, "entries for user_id:", req.user?.id);
    
    // Debug: show first entry user_id if exists
    if (entries.length > 0) {
      console.log("[Queue History] First entry user_id:", entries[0].user_id);
    }
    
    res.json({ entries });
  } catch (err) {
    console.error("[Queue History] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch queue history: " + err.message });
  }
});

// Admin actions
router.post("/:id/call", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const queueCol = db.collection("queue_entries");
    
    const entryDoc = await queueCol.doc(req.params.id).get();
    if (!entryDoc.exists) return res.status(404).json({ error: "Not found" });
    
    const entry = entryDoc.data();
    
    await queueCol.doc(req.params.id).update({
      status: "called",
      called_at: isoNow()
    });
    
    const updated = { ...entry, status: "called", called_at: isoNow() };

    // If entry is tied to a user, email them (if possible)
    if (updated.user_id) {
      const userDoc = await db.collection("users").doc(updated.user_id).get();
      if (userDoc.exists) {
        const u = userDoc.data();
        if (u?.email) {
          await sendMail({
            to: u.email,
            subject: "JolliReserve: Your table is ready",
            text:
              `Hello ${u.name || "Guest"},

You are now CALLED in the queue.
Please proceed to the counter.

Party size: ${updated.party_size}

Thank you,
JolliReserve`
          });
        }
      }
    }

    broadcast({ type: 'queue:changed', entry: { id: updated.id, status: updated.status } });
    broadcast({ type: 'notify', level: 'info', message: 'Queue status changed.' });
    res.json({ entry: updated });
  } catch (err) {
    console.error("Queue call error:", err.message);
    res.status(500).json({ error: "Failed to call entry: " + err.message });
  }
});

router.post("/:id/seated", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const queueCol = db.collection("queue_entries");
    
    const entryDoc = await queueCol.doc(req.params.id).get();
    if (!entryDoc.exists) return res.status(404).json({ error: "Not found" });
    
    const entry = entryDoc.data();
    
    await queueCol.doc(req.params.id).update({
      status: "seated",
      seated_at: isoNow()
    });
    
    const updated = { ...entry, status: "seated", seated_at: isoNow() };
    broadcast({ type: 'queue:changed', entry: { id: updated.id, status: updated.status } });
    broadcast({ type: 'notify', level: 'info', message: 'Queue status changed.' });
    res.json({ entry: updated });
  } catch (err) {
    console.error("Queue seated error:", err.message);
    res.status(500).json({ error: "Failed to mark seated: " + err.message });
  }
});

router.post("/:id/cancel", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const queueCol = db.collection("queue_entries");
    
    const entryDoc = await queueCol.doc(req.params.id).get();
    if (!entryDoc.exists) return res.status(404).json({ error: "Not found" });
    
    const entry = entryDoc.data();
    
    await queueCol.doc(req.params.id).update({
      status: "cancelled"
    });
    
    const updated = { ...entry, status: "cancelled" };
    broadcast({ type: 'queue:changed', entry: { id: updated.id, status: updated.status } });
    broadcast({ type: 'notify', level: 'info', message: 'Queue status changed.' });
    res.json({ entry: updated });
  } catch (err) {
    console.error("Queue cancel error:", err.message);
    res.status(500).json({ error: "Failed to cancel entry: " + err.message });
  }
});

module.exports = router;

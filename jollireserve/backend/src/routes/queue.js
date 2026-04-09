const express = require("express");
const { v4: uuid } = require("uuid");
const { dbConn } = require("../db");
const { getDb } = require("../firebase");
const { isoNow } = require("../utils/time");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendMail } = require("../utils/email");

const { broadcast } = require('../ws');

const router = express.Router();

// Join queue (auth optional: allow guests)
router.post("/join", async (req, res) => {
  try {
    const { party_size, name, user_id, email } = req.body || {};
    if (!party_size) return res.status(400).json({ error: "party_size required" });

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
      called_at: null,
      seated_at: null
    };
    
    await queueCol.doc(id).set(entryData);

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

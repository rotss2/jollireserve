const express = require("express");
const { getDb } = require("../firebase");
const { requireAuth, requireRole } = require("../middleware/auth");
const { toDayISO, isoNow } = require("../utils/time");

const router = express.Router();

// Staff can manage queue and reservations
router.use(requireAuth, requireRole(["staff", "admin"]));

// ── Queue Management ──────────────────────────────────────

// Get active queue entries
router.get("/queue/active", async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("queue_entries")
      .where("status", "in", ["waiting", "called"])
      .orderBy("created_at", "asc")
      .get();

    const entries = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      // Get user info if available
      let userName = null;
      let userEmail = null;
      if (data.user_id) {
        const userDoc = await db.collection("users").doc(data.user_id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userName = userData.name;
          userEmail = userData.email;
        }
      }
      return { ...data, user_name: userName, user_email: userEmail };
    }));

    res.json({ entries });
  } catch (e) {
    console.error("Get queue error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Call next in queue
router.post("/queue/:id/call", async (req, res) => {
  try {
    const db = getDb();
    const entryDoc = await db.collection("queue_entries").doc(req.params.id).get();

    if (!entryDoc.exists) {
      return res.status(404).json({ error: "Not found" });
    }

    const entry = entryDoc.data();

    await db.collection("queue_entries").doc(req.params.id).update({
      status: "called",
      called_at: isoNow()
    });

    const updated = { ...entry, status: "called", called_at: isoNow() };

    // Notify user via email if they have user_id
    if (updated.user_id) {
      const userDoc = await db.collection("users").doc(updated.user_id).get();
      if (userDoc.exists) {
        const u = userDoc.data();
        if (u?.email) {
          // Email notification would go here
          console.log(`Would notify ${u.email} that they are called`);
        }
      }
    }

    res.json({ entry: updated });
  } catch (e) {
    console.error("Call queue error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Mark as seated
router.post("/queue/:id/seated", async (req, res) => {
  try {
    const db = getDb();
    const entryDoc = await db.collection("queue_entries").doc(req.params.id).get();

    if (!entryDoc.exists) {
      return res.status(404).json({ error: "Not found" });
    }

    const entry = entryDoc.data();

    await db.collection("queue_entries").doc(req.params.id).update({
      status: "seated",
      seated_at: isoNow()
    });

    const updated = { ...entry, status: "seated", seated_at: isoNow() };
    res.json({ entry: updated });
  } catch (e) {
    console.error("Seated queue error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Cancel queue entry
router.post("/queue/:id/cancel", async (req, res) => {
  try {
    const db = getDb();
    await db.collection("queue_entries").doc(req.params.id).update({
      status: "cancelled"
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Cancel queue error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Reservations Management ──────────────────────────────

// Get all reservations
router.get("/reservations", async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("reservations")
      .orderBy("date", "desc")
      .orderBy("time", "desc")
      .limit(100)
      .get();

    const reservations = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      // Get user info
      let userName = null;
      let userEmail = null;
      if (data.user_id) {
        const userDoc = await db.collection("users").doc(data.user_id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userName = userData.name;
          userEmail = userData.email;
        }
      }
      // Get table info
      let tableName = null;
      if (data.table_id) {
        const tableDoc = await db.collection("tables").doc(data.table_id).get();
        if (tableDoc.exists) {
          tableName = tableDoc.data().name;
        }
      }
      return { ...data, user_name: userName, user_email: userEmail, table_name: tableName };
    }));

    res.json({ reservations });
  } catch (e) {
    console.error("Get reservations error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Check in reservation
router.post("/reservations/:id/checkin", async (req, res) => {
  try {
    const db = getDb();
    await db.collection("reservations").doc(req.params.id).update({
      status: "checked_in"
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Checkin error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Complete reservation
router.post("/reservations/:id/complete", async (req, res) => {
  try {
    const db = getDb();
    await db.collection("reservations").doc(req.params.id).update({
      status: "completed"
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Complete error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Cancel reservation
router.post("/reservations/:id/cancel", async (req, res) => {
  try {
    const db = getDb();
    await db.collection("reservations").doc(req.params.id).update({
      status: "cancelled"
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Cancel reservation error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Analytics (staff can view) ────────────────────────────

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
      console.warn("[Staff] Queue index missing, using fallback:", indexErr.message);
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

module.exports = router;

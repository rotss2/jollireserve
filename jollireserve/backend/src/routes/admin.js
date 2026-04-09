const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const { getDb } = require("../firebase");
const { requireAuth, requireRole } = require("../middleware/auth");
const { toDayISO, isoNow } = require("../utils/time");

const router = express.Router();

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
    const queueSnapshot = await db.collection("queue_entries")
      .where("status", "in", ["waiting", "called"])
      .get();
    const activeQueue = queueSnapshot.size;

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

module.exports = router;

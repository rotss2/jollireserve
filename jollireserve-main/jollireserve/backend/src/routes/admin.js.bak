const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const { dbConn } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { toDayISO, isoNow } = require("../utils/time");

const router = express.Router();
router.use(requireAuth, requireRole(["admin", "staff"]));

// ── Analytics ─────────────────────────────────────────────

router.get("/analytics/summary", async (req, res) => {
  try {
    const db = dbConn();
    const today = toDayISO();
    const reservationsToday = (await db.prepare("SELECT COUNT(*) AS c FROM reservations WHERE date=?").get(today)).c;
    const activeQueue = (await db.prepare("SELECT COUNT(*) AS c FROM queue_entries WHERE status IN ('waiting','called')").get()).c;
    const availableTables = (await db.prepare("SELECT COUNT(*) AS c FROM tables WHERE is_active=1").get()).c;
    res.json({ today, reservationsToday, activeQueue, availableTables });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/analytics/reservations-by-day", async (req, res) => {
  try {
    const db = dbConn();
    const from = req.query.from || toDayISO(new Date(Date.now() - 6 * 24 * 3600 * 1000));
    const to = req.query.to || toDayISO();
    const rows = await db.prepare(`
      SELECT date, COUNT(*) AS count FROM reservations
      WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date ASC
    `).all(from, to);
    res.json({ from, to, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/analytics/peak-hours", async (req, res) => {
  try {
    const db = dbConn();
    const date = req.query.date || toDayISO();
    const rows = await db.prepare(`
      SELECT time, COUNT(*) AS count FROM reservations
      WHERE date=? GROUP BY time ORDER BY time ASC
    `).all(date);
    res.json({ date, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/analytics/table-utilization", async (req, res) => {
  try {
    const db = dbConn();
    const from = req.query.from || toDayISO(new Date(Date.now() - 6 * 24 * 3600 * 1000));
    const to = req.query.to || toDayISO();
    const assigned = (await db.prepare(`
      SELECT COUNT(*) AS c FROM reservations
      WHERE date BETWEEN ? AND ? AND table_id IS NOT NULL AND status IN ('confirmed','checked_in','completed')
    `).get(from, to)).c;
    const tables = (await db.prepare("SELECT COUNT(*) AS c FROM tables WHERE is_active=1").get()).c;
    res.json({ from, to, assigned, tables, utilization: tables ? assigned / tables : 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Tables ────────────────────────────────────────────────

router.get("/tables", async (req, res) => {
  try {
    const tables = await dbConn().prepare("SELECT * FROM tables ORDER BY name ASC").all();
    res.json({ tables });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/tables", requireRole(["admin"]), async (req, res) => {
  try {
    const { name, area, capacity } = req.body;
    if (!name || !area || !capacity) return res.status(400).json({ error: "name, area, capacity required" });
    const id = uuid();
    await dbConn().prepare("INSERT INTO tables (id, name, area, capacity, is_active) VALUES (?, ?, ?, ?, 1)")
      .run(id, name, area, Number(capacity));
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch("/tables/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { name, area, capacity, is_active } = req.body;
    const db = dbConn();
    if (name !== undefined) await db.prepare("UPDATE tables SET name=? WHERE id=?").run(name, req.params.id);
    if (area !== undefined) await db.prepare("UPDATE tables SET area=? WHERE id=?").run(area, req.params.id);
    if (capacity !== undefined) await db.prepare("UPDATE tables SET capacity=? WHERE id=?").run(Number(capacity), req.params.id);
    if (is_active !== undefined) await db.prepare("UPDATE tables SET is_active=? WHERE id=?").run(Number(is_active), req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/tables/:id", requireRole(["admin"]), async (req, res) => {
  try {
    await dbConn().prepare("DELETE FROM tables WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Queue ─────────────────────────────────────────────────

router.get("/queue/active", async (req, res) => {
  try {
    const entries = await dbConn().prepare(`
      SELECT q.*, u.name AS user_name, u.email AS user_email
      FROM queue_entries q LEFT JOIN users u ON q.user_id = u.id
      WHERE q.status IN ('waiting','called') ORDER BY q.created_at ASC
    `).all();
    res.json({ entries });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/queue/walk-in", async (req, res) => {
  try {
    const { name, party_size } = req.body;
    if (!party_size) return res.status(400).json({ error: "party_size required" });
    const id = uuid();
    await dbConn().prepare("INSERT INTO queue_entries (id, name, party_size, status, created_at) VALUES (?, ?, ?, 'waiting', ?)")
      .run(id, name || "Walk-in", Number(party_size), isoNow());
    res.json({ ok: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/queue/:id/call", async (req, res) => {
  try {
    await dbConn().prepare("UPDATE queue_entries SET status='called', called_at=? WHERE id=?").run(isoNow(), req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/queue/:id/seated", async (req, res) => {
  try {
    await dbConn().prepare("UPDATE queue_entries SET status='seated', seated_at=? WHERE id=?").run(isoNow(), req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/queue/:id/cancel", async (req, res) => {
  try {
    await dbConn().prepare("UPDATE queue_entries SET status='cancelled' WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reservations ──────────────────────────────────────────

router.get("/reservations", async (req, res) => {
  try {
    const reservations = await dbConn().prepare(`
      SELECT r.*, u.name AS user_name, u.email AS user_email, t.name AS table_name
      FROM reservations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN tables t ON r.table_id = t.id
      ORDER BY r.date DESC, r.time DESC LIMIT 100
    `).all();
    res.json({ reservations });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations/:id/checkin", async (req, res) => {
  try {
    await dbConn().prepare("UPDATE reservations SET status='checked_in' WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations/:id/complete", async (req, res) => {
  try {
    await dbConn().prepare("UPDATE reservations SET status='completed' WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/reservations/:id/cancel", async (req, res) => {
  try {
    await dbConn().prepare("UPDATE reservations SET status='cancelled' WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/reservations/:id", requireRole(["admin"]), async (req, res) => {
  try {
    await dbConn().prepare("DELETE FROM reservations WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Users (admin only) ────────────────────────────────────

router.get("/users", requireRole(["admin"]), async (req, res) => {
  try {
    const users = await dbConn().prepare(
      "SELECT id, email, name, role, is_verified, created_at FROM users ORDER BY created_at DESC"
    ).all();
    res.json({ users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch("/users/:id/role", requireRole(["admin"]), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["customer", "staff", "admin"].includes(role))
      return res.status(400).json({ error: "Invalid role" });
    await dbConn().prepare("UPDATE users SET role=? WHERE id=?").run(role, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch("/users/:id/suspend", requireRole(["admin"]), async (req, res) => {
  try {
    const { suspended } = req.body;
    await dbConn().prepare("UPDATE users SET is_verified=? WHERE id=?").run(suspended ? 0 : 1, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch("/users/:id/password", requireRole(["admin"]), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "password required" });
    const hash = bcrypt.hashSync(password, 10);
    await dbConn().prepare("UPDATE users SET password_hash=? WHERE id=?").run(hash, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/users/:id", requireRole(["admin"]), async (req, res) => {
  try {
    if (req.user.id === req.params.id)
      return res.status(400).json({ error: "Cannot delete yourself" });
    await dbConn().prepare("DELETE FROM users WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/users/:id/history", requireRole(["admin"]), async (req, res) => {
  try {
    const db = dbConn();
    const reservations = await db.prepare(`
      SELECT r.*, t.name AS table_name FROM reservations r
      LEFT JOIN tables t ON r.table_id = t.id
      WHERE r.user_id=? ORDER BY r.created_at DESC
    `).all(req.params.id);
    const queue = await db.prepare(
      "SELECT * FROM queue_entries WHERE user_id=? ORDER BY created_at DESC"
    ).all(req.params.id);
    res.json({ reservations, queue });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
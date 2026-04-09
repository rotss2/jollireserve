const express = require("express");
const { v4: uuid } = require("uuid");
const { dbConn } = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const { broadcast } = require('../ws');

const router = express.Router();

router.get("/", async (req, res) => {
  const db = dbConn();
  const rows = await db.prepare("SELECT * FROM tables WHERE is_active=1 ORDER BY area ASC, capacity ASC").all();
  res.json({ tables: rows });
});

router.get("/all", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const db = dbConn();
  const rows = await db.prepare("SELECT * FROM tables ORDER BY is_active DESC, area ASC, capacity ASC").all();
  res.json({ tables: rows });
});

router.post("/", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { name, area, capacity } = req.body || {};
  if (!name || !capacity) return res.status(400).json({ error: "name and capacity required" });
  const db = dbConn();
  const id = uuid();
  await db.prepare("INSERT INTO tables (id, name, area, capacity, is_active) VALUES (?, ?, ?, ?, 1)")
    .run(id, name, area || "indoor", Number(capacity));
  const row = await db.prepare("SELECT * FROM tables WHERE id=?").get(id);
  broadcast({ type: 'tables:changed', table: { id: row.id, status: row.status } });
  broadcast({ type: 'notify', level: 'info', message: 'Table updated.' });
  res.json({ table: row });
});

router.patch("/:id", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const db = dbConn();
  const t = await db.prepare("SELECT * FROM tables WHERE id=?").get(req.params.id);
  if (!t) return res.status(404).json({ error: "Not found" });
  const name = req.body.name ?? t.name;
  const area = req.body.area ?? t.area;
  const capacity = req.body.capacity ?? t.capacity;
  const is_active = (req.body.is_active ?? t.is_active) ? 1 : 0;

  await db.prepare("UPDATE tables SET name=?, area=?, capacity=?, is_active=? WHERE id=?")
    .run(name, area, Number(capacity), is_active, req.params.id);

  const updated = await db.prepare("SELECT * FROM tables WHERE id=?").get(req.params.id);
  broadcast({ type: 'tables:changed', table: { id: updated.id, status: updated.status } });
  broadcast({ type: 'notify', level: 'info', message: 'Table updated.' });
  res.json({ table: updated });
});

module.exports = router;

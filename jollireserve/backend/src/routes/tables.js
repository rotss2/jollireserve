const express = require("express");
const { v4: uuid } = require("uuid");
const { getDb } = require("../firebase");
const { requireAuth, requireRole } = require("../middleware/auth");

const { broadcast } = require('../ws');

const router = express.Router();

// Get active tables only (public endpoint)
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("tables")
      .where("is_active", "==", 1)
      .orderBy("area")
      .orderBy("capacity")
      .get();
    const tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ tables });
  } catch (e) {
    console.error("Get tables error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get all tables (admin only)
router.get("/all", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("tables")
      .orderBy("is_active", "desc")
      .orderBy("area")
      .orderBy("capacity")
      .get();
    const tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ tables });
  } catch (e) {
    console.error("Get all tables error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Create new table
router.post("/", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const { name, area, capacity } = req.body || {};
    if (!name || !capacity) return res.status(400).json({ error: "name and capacity required" });
    
    const db = getDb();
    const id = uuid();
    const tableData = {
      id,
      name,
      area: area || "indoor",
      capacity: Number(capacity),
      is_active: 1,
      created_at: new Date().toISOString()
    };
    
    await db.collection("tables").doc(id).set(tableData);
    
    broadcast({ type: 'tables:changed', table: tableData });
    broadcast({ type: 'notify', level: 'info', message: 'Table created.' });
    res.json({ table: tableData });
  } catch (e) {
    console.error("Create table error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update table
router.patch("/:id", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const tableDoc = await db.collection("tables").doc(req.params.id).get();
    if (!tableDoc.exists) return res.status(404).json({ error: "Not found" });
    
    const current = tableDoc.data();
    const updateData = {};
    
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.area !== undefined) updateData.area = req.body.area;
    if (req.body.capacity !== undefined) updateData.capacity = Number(req.body.capacity);
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active ? 1 : 0;
    updateData.updated_at = new Date().toISOString();
    
    await db.collection("tables").doc(req.params.id).update(updateData);
    
    const updatedDoc = await db.collection("tables").doc(req.params.id).get();
    const updated = { id: updatedDoc.id, ...updatedDoc.data() };
    
    broadcast({ type: 'tables:changed', table: updated });
    broadcast({ type: 'notify', level: 'info', message: 'Table updated.' });
    res.json({ table: updated });
  } catch (e) {
    console.error("Update table error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

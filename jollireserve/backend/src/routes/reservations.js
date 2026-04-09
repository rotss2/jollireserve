const express = require("express");
const { v4: uuid } = require("uuid");
const { getDb } = require("../firebase");
const { isoNow } = require("../utils/time");
const { requireAuth, requireRole } = require("../middleware/auth");
const { assignTable } = require("../utils/assignTable");
const { sendMail } = require("../utils/email");
const { buildReceiptPdf } = require("../utils/receiptPdf");

const { broadcast } = require('../ws');
const QRCode = require('qrcode');

const router = express.Router();

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

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("reservations")
      .where("user_id", "==", req.user.id)
      .orderBy("created_at", "desc")
      .get();
    
    const reservations = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      // Get table info if available
      let tableData = null;
      if (data.table_id) {
        const tableDoc = await db.collection("tables").doc(data.table_id).get();
        if (tableDoc.exists) tableData = tableDoc.data();
      }
      return {
        ...data,
        table_name: tableData?.name || null,
        table_area: tableData?.area || null,
        table_capacity: tableData?.capacity || null
      };
    }));

    res.json({ reservations });
  } catch (e) {
    console.error("Get reservations error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { date, time, party_size, area_pref, special_requests } = req.body || {};
    if (!date || !time || !party_size) return res.status(400).json({ error: "date, time, party_size required" });

    const db = getDb();
    const id = uuid();
    const createdAt = isoNow();

    // Get available tables
    const tablesSnapshot = await db.collection("tables").where("is_active", "==", 1).get();
    const availableTables = tablesSnapshot.docs.map(doc => doc.data());
    
    // Simple table assignment - pick first available
    const chosenTable = availableTables.length > 0 ? availableTables[0] : null;

    const reservationData = {
      id,
      user_id: req.user.id,
      date,
      time,
      party_size: Number(party_size),
      area_pref: area_pref || null,
      special_requests: special_requests || null,
      table_id: chosenTable ? chosenTable.id : null,
      status: "confirmed",
      created_at: createdAt
    };

    await db.collection("reservations").doc(id).set(reservationData);
    
    // Log activity
    await logActivity(req.user.id, "reservation_created", { 
      reservation_id: id, 
      date, 
      time, 
      party_size,
      table_name: chosenTable?.name || null
    });

    // Get user data for email
    const userDoc = await db.collection("users").doc(req.user.id).get();
    const userData = userDoc.exists ? userDoc.data() : { email: "", name: "" };
    
    const saved = { 
      ...reservationData, 
      table_name: chosenTable?.name || null,
      table_area: chosenTable?.area || null,
      table_capacity: chosenTable?.capacity || null,
      user_email: userData.email,
      user_name: userData.name
    };

    // Email notify (optional)
    const to = saved.user_email;
    const name = saved.user_name || "Guest";
    await sendMail({
      to,
      subject: "JolliReserve: Reservation Confirmed",
      text:
        `Hello ${name},

Your reservation is confirmed.

Date: ${saved.date}
Time: ${saved.time}
Guests: ${saved.party_size}
Table: ${saved.table_name || "Auto-assigned (pending)"}${saved.table_area ? " (" + saved.table_area + ")" : ""}

You can download your receipt in the app.

Thank you,
JolliReserve`
    });

    broadcast({ type: 'reservations:changed', reservation: { id: saved.id, status: saved.status, date: saved.date, time: saved.time } });
    broadcast({ type: 'notify', level: 'success', message: 'Reservation confirmed.' });
    res.json({ reservation: saved });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection("reservations").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    
    const r = doc.data();
    if (r.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    if (["cancelled", "completed"].includes(r.status)) return res.status(400).json({ error: "Already closed" });

    await db.collection("reservations").doc(req.params.id).update({ status: "cancelled" });
    
    // Log activity
    await logActivity(req.user.id, "reservation_cancelled", { 
      reservation_id: req.params.id, 
      date: r.date, 
      time: r.time 
    });
    
    broadcast({ type: 'reservations:changed', reservation: { id: req.params.id, status: "cancelled" } });
    broadcast({ type: 'notify', level: 'info', message: 'Reservation cancelled.' });
    res.json({ reservation: { ...r, id: req.params.id, status: "cancelled" } });
  } catch (e) {
    console.error("Cancel reservation error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id/receipt.pdf", requireAuth, async (req, res, next) => {
  try {
    const db = dbConn();
    const r = await db.prepare(`
      SELECT r.*, t.name AS table_name, t.area AS table_area, t.capacity AS table_capacity, u.email AS user_email, u.name AS user_name
      FROM reservations r
      LEFT JOIN tables t ON t.id = r.table_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.id=?
    `).get(req.params.id);

    if (!r) return res.status(404).json({ error: "Not found" });
    // Only owner or admin/staff can download
    const isOwner = r.user_id === req.user.id;
    const isAdmin = ["admin", "staff"].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reservation-${r.id}.pdf"`);

    await buildReceiptPdf(r, res);
  } catch (e) {
    next(e);
  }
});

// Admin list all reservations
router.get("/", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const db = dbConn();
  const rows = await db.prepare(`
    SELECT r.*, u.email AS user_email, u.name AS user_name, t.name AS table_name, t.area AS table_area, t.capacity AS table_capacity
    FROM reservations r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN tables t ON t.id = r.table_id
    ORDER BY r.created_at DESC
    LIMIT 200
  `).all();
  res.json({ reservations: rows });
});

router.post("/:id/checkin", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const db = dbConn();
  const r = await db.prepare("SELECT * FROM reservations WHERE id=?").get(req.params.id);
  if (!r) return res.status(404).json({ error: "Not found" });
  await db.prepare("UPDATE reservations SET status='checked_in' WHERE id=?").run(req.params.id);
  const updated = await db.prepare("SELECT * FROM reservations WHERE id=?").get(req.params.id);
  broadcast({ type: 'reservations:changed', reservation: { id: updated.id, status: updated.status } });
  broadcast({ type: 'notify', level: 'info', message: 'Reservation updated.' });
  res.json({ reservation: updated });
});

module.exports = router;

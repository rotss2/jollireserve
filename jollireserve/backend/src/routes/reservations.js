const express = require("express");
const { v4: uuid } = require("uuid");
const { dbConn } = require("../db");
const { isoNow } = require("../utils/time");
const { requireAuth, requireRole } = require("../middleware/auth");
const { assignTable } = require("../utils/assignTable");
const { sendMail } = require("../utils/email");
const { buildReceiptPdf } = require("../utils/receiptPdf");

const { broadcast } = require('../ws');
const QRCode = require('qrcode');

const router = express.Router();

router.get("/mine", requireAuth, async (req, res) => {
  const db = dbConn();
  const rows = await db.prepare(`
    SELECT r.*, t.name AS table_name, t.area AS table_area, t.capacity AS table_capacity
    FROM reservations r
    LEFT JOIN tables t ON t.id = r.table_id
    WHERE r.user_id=?
    ORDER BY r.created_at DESC
  `).all(req.user.id);

  res.json({ reservations: rows });
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { date, time, party_size, area_pref, special_requests } = req.body || {};
    if (!date || !time || !party_size) return res.status(400).json({ error: "date, time, party_size required" });

    const db = dbConn();
    const id = uuid();
    const createdAt = isoNow();

    const chosenTable = await assignTable({
      db,
      date,
      time,
      partySize: Number(party_size),
      areaPref: area_pref || ""
    });

    await db.prepare(`
      INSERT INTO reservations (id, user_id, date, time, party_size, area_pref, special_requests, table_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.user.id, date, time, Number(party_size),
      area_pref || null, special_requests || null,
      chosenTable ? chosenTable.id : null,
      "confirmed",
      createdAt
    );

    const saved = await db.prepare(`
      SELECT r.*, t.name AS table_name, t.area AS table_area, t.capacity AS table_capacity, u.email AS user_email, u.name AS user_name
      FROM reservations r
      LEFT JOIN tables t ON t.id = r.table_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.id=?
    `).get(id);

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
  const db = dbConn();
  const r = await db.prepare("SELECT * FROM reservations WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: "Not found" });
  if (["cancelled", "completed"].includes(r.status)) return res.status(400).json({ error: "Already closed" });

  await db.prepare("UPDATE reservations SET status='cancelled' WHERE id=?").run(req.params.id);
  const updated = await db.prepare("SELECT * FROM reservations WHERE id=?").get(req.params.id);
  broadcast({ type: 'reservations:changed', reservation: { id: updated.id, status: updated.status } });
  broadcast({ type: 'notify', level: 'info', message: 'Reservation updated.' });
  res.json({ reservation: updated });
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

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

// Helper to get system settings
async function getSettings() {
  try {
    const db = getDb();
    const settingsDoc = await db.collection("settings").doc("system").get();
    const defaults = { max_party_size: 12, max_advance_days: 30 };
    return settingsDoc.exists ? { ...defaults, ...settingsDoc.data() } : defaults;
  } catch (e) {
    return { max_party_size: 12, max_advance_days: 30 };
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
    const { date, time, party_size, area_pref, special_requests, pre_order_items } = req.body || {};
    if (!date || !time || !party_size) return res.status(400).json({ error: "date, time, party_size required" });

    // Check max party size
    const settings = await getSettings();
    const maxPartySize = settings.max_party_size || 12;
    if (Number(party_size) > maxPartySize) {
      return res.status(400).json({ 
        error: `Maximum party size is ${maxPartySize} people.`,
        max_party_size: maxPartySize
      });
    }

    // Get available tables for this party size
    const db = getDb();
    let availableTables = [];
    try {
      const tablesSnapshot = await db.collection("tables")
        .where("is_active", "==", true)
        .where("capacity", ">=", Number(party_size))
        .get();
      availableTables = tablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (indexErr) {
      console.warn("[Reservations] Tables index missing, using fallback:", indexErr.message);
      // Fallback: get all active tables and filter in memory
      const allTablesSnapshot = await db.collection("tables")
        .where("is_active", "==", true)
        .get();
      availableTables = allTablesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(table => table.capacity >= Number(party_size));
    }
    
    // Simple table assignment - pick first available
    const chosenTable = availableTables.length > 0 ? availableTables[0] : null;

    const id = uuid();
    const createdAt = isoNow();

    const reservationData = {
      id,
      user_id: req.user.id,
      date,
      time,
      party_size: Number(party_size),
      area_pref: area_pref || null,
      special_requests: special_requests || null,
      pre_order_items: pre_order_items || null,
      pre_order_total: pre_order_items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
      table_id: chosenTable ? chosenTable.id : null,
      table_name: chosenTable ? chosenTable.name : null,
      table_area: chosenTable ? chosenTable.area : null,
      status: "pending",
      created_at: createdAt,
      updated_at: createdAt
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
    const db = getDb();
    
    // Get reservation
    const reservationDoc = await db.collection("reservations").doc(req.params.id).get();
    if (!reservationDoc.exists) return res.status(404).json({ error: "Not found" });
    const reservation = reservationDoc.data();
    
    // Only owner or admin/staff can download
    const isOwner = reservation.user_id === req.user.id;
    const isAdmin = ["admin", "staff"].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });
    
    // Get table info if available
    let tableData = null;
    if (reservation.table_id) {
      const tableDoc = await db.collection("tables").doc(reservation.table_id).get();
      if (tableDoc.exists) tableData = tableDoc.data();
    }
    
    // Get user info
    const userDoc = await db.collection("users").doc(reservation.user_id).get();
    const userData = userDoc.exists ? userDoc.data() : { email: "", name: "" };
    
    const r = {
      ...reservation,
      table_name: tableData?.name || null,
      table_area: tableData?.area || null,
      table_capacity: tableData?.capacity || null,
      user_email: userData.email,
      user_name: userData.name
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reservation-${r.id}.pdf"`);

    await buildReceiptPdf(r, res);
  } catch (e) {
    next(e);
  }
});

// Admin list all reservations
router.get("/", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("reservations")
      .orderBy("created_at", "desc")
      .limit(200)
      .get();
    
    const reservations = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      
      // Get user info
      let userData = { email: "", name: "" };
      if (data.user_id) {
        const userDoc = await db.collection("users").doc(data.user_id).get();
        if (userDoc.exists) userData = userDoc.data();
      }
      
      // Get table info
      let tableData = null;
      if (data.table_id) {
        const tableDoc = await db.collection("tables").doc(data.table_id).get();
        if (tableDoc.exists) tableData = tableDoc.data();
      }
      
      return {
        ...data,
        user_email: userData.email,
        user_name: userData.name,
        table_name: tableData?.name || null,
        table_area: tableData?.area || null,
        table_capacity: tableData?.capacity || null
      };
    }));
    
    res.json({ reservations });
  } catch (e) {
    console.error("Admin reservations error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post("/:id/checkin", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const db = getDb();
    
    // Get reservation
    const reservationDoc = await db.collection("reservations").doc(req.params.id).get();
    if (!reservationDoc.exists) return res.status(404).json({ error: "Not found" });
    
    // Update status
    await db.collection("reservations").doc(req.params.id).update({
      status: "checked_in",
      updated_at: isoNow()
    });
    
    // Get updated data
    const updatedDoc = await db.collection("reservations").doc(req.params.id).get();
    const updated = updatedDoc.data();
    
    // Log activity
    await logActivity(req.user.id, "reservation_checkin", {
      reservation_id: req.params.id,
      user_id: updated.user_id
    });
    
    broadcast({ type: 'reservations:changed', reservation: { id: updated.id, status: updated.status } });
    broadcast({ type: 'notify', level: 'info', message: 'Reservation checked in.' });
    res.json({ reservation: updated });
  } catch (e) {
    console.error("Checkin error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

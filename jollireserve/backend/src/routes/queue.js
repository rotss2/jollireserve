const express = require("express");
const { v4: uuid } = require("uuid");
const { dbConn } = require("../db");
const { isoNow } = require("../utils/time");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendMail } = require("../utils/email");

const { broadcast } = require('../ws');

const router = express.Router();

// Join queue (auth optional: allow guests)
router.post("/join", async (req, res) => {
  const { party_size, name, user_id, email } = req.body || {};
  if (!party_size) return res.status(400).json({ error: "party_size required" });

  const db = dbConn();
  const id = uuid();
  const createdAt = isoNow();
  await db.prepare(`
    INSERT INTO queue_entries (id, user_id, name, party_size, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, user_id || null, name || null, Number(party_size), "waiting", createdAt);

  const entry = await db.prepare("SELECT * FROM queue_entries WHERE id=?").get(id);

  // Optional notify: "joined queue"
  if (email) {
    sendMail({
      to: email,
      subject: "JolliReserve: You joined the queue",
      text:
        `Hello ${name || "Guest"},

You have joined the queue.

Party size: ${entry.party_size}
Status: waiting

We will notify you when you are called.

Thank you,
JolliReserve`
    }).catch(() => { });
  }

  broadcast({ type: 'queue:changed' });
  broadcast({ type: 'notify', level: 'info', message: 'Queue updated.' });
  res.json({ entry });
});

router.get("/", async (req, res) => {
  const db = dbConn();
  const rows = await db.prepare(`
    SELECT * FROM queue_entries
    WHERE status IN ('waiting','called')
    ORDER BY created_at ASC
  `).all();
  res.json({ entries: rows });
});

router.get("/active", async (req, res) => {
  const db = dbConn();
  const rows = await db.prepare(`
    SELECT * FROM queue_entries
    WHERE status IN ('waiting','called')
    ORDER BY created_at ASC
  `).all();
  res.json({ entries: rows });
});

// Admin actions
router.post("/:id/call", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const db = dbConn();
  const e = await db.prepare("SELECT * FROM queue_entries WHERE id=?").get(req.params.id);
  if (!e) return res.status(404).json({ error: "Not found" });

  await db.prepare("UPDATE queue_entries SET status='called', called_at=? WHERE id=?").run(isoNow(), req.params.id);
  const updated = await db.prepare("SELECT * FROM queue_entries WHERE id=?").get(req.params.id);

  // If entry is tied to a user, email them (if possible)
  if (updated.user_id) {
    const u = await db.prepare("SELECT email, name FROM users WHERE id=?").get(updated.user_id);
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

  broadcast({ type: 'queue:changed', entry: { id: updated.id, status: updated.status } });
  broadcast({ type: 'notify', level: 'info', message: 'Queue status changed.' });
  res.json({ entry: updated });
});

router.post("/:id/seated", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const db = dbConn();
  const e = await db.prepare("SELECT * FROM queue_entries WHERE id=?").get(req.params.id);
  if (!e) return res.status(404).json({ error: "Not found" });

  await db.prepare("UPDATE queue_entries SET status='seated', seated_at=? WHERE id=?").run(isoNow(), req.params.id);
  const updated = await db.prepare("SELECT * FROM queue_entries WHERE id=?").get(req.params.id);
  broadcast({ type: 'queue:changed', entry: { id: updated.id, status: updated.status } });
  broadcast({ type: 'notify', level: 'info', message: 'Queue status changed.' });
  res.json({ entry: updated });
});

router.post("/:id/cancel", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const db = dbConn();
  const e = await db.prepare("SELECT * FROM queue_entries WHERE id=?").get(req.params.id);
  if (!e) return res.status(404).json({ error: "Not found" });

  await db.prepare("UPDATE queue_entries SET status='cancelled' WHERE id=?").run(req.params.id);
  const updated = await db.prepare("SELECT * FROM queue_entries WHERE id=?").get(req.params.id);
  broadcast({ type: 'queue:changed', entry: { id: updated.id, status: updated.status } });
  broadcast({ type: 'notify', level: 'info', message: 'Queue status changed.' });
  res.json({ entry: updated });
});

module.exports = router;

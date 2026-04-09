const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const { dbConn } = require("../db");
const { isoNow } = require("../utils/time");
const { sendMail } = require("../utils/email");
const { generateCode, hashCode, expiresAt, isExpired } = require("../utils/verify");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name || "" },
    process.env.JWT_SECRET || "dev_secret_change_me",
    { expiresIn: "7d" }
  );
}

// ── Register ──────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const db = dbConn();

    const existing = await db.prepare("SELECT id FROM users WHERE email=?").get(email.toLowerCase());
    if (existing)
      return res.status(409).json({ error: "Email already registered" });

    const id = uuid();
    const code = generateCode();
    const codeHash = hashCode(code);
    const codeExp = expiresAt(15);
    const hash = bcrypt.hashSync(password, 10);

    await db.prepare(`
      INSERT INTO users
        (id, email, password_hash, name, role, is_verified, verification_code_hash, verification_code_expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(id, email.toLowerCase(), hash, name || "", "customer", codeHash, codeExp, isoNow());

    const user = await db.prepare("SELECT id, email, name, role FROM users WHERE id=?").get(id);

    // Send OTP via Resend
    const mailResult = await sendMail({
      to: user.email,
      subject: "JolliReserve: Your verification code",
      text: `Hello ${user.name || "Guest"},\n\nYour verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nThanks,\nJolliReserve`,
    });

    console.log("✅ Register:", user.email, "| OTP:", code, "| Mail:", JSON.stringify(mailResult));
    res.json({ pendingVerification: true, email: user.email });

  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: "Signup failed: " + err.message });
  }
});

// ── Login ─────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const db = dbConn();
    const user = await db.prepare("SELECT * FROM users WHERE email=?").get(email.toLowerCase());

    console.log("LOGIN:", email, "| found:", user ? "yes" : "no");
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = bcrypt.compareSync(password, user.password_hash);
    console.log("PASSWORD OK:", ok, "| IS VERIFIED:", user.is_verified);

    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.is_verified) return res.status(403).json({ error: "EMAIL_NOT_VERIFIED" });

    const safe = { id: user.id, email: user.email, name: user.name, role: user.role, is_verified: user.is_verified, created_at: user.created_at };
    const token = signToken(safe);
    res.json({ token, user: safe });

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

// ── Me ────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const db = dbConn();
    const user = await db.prepare("SELECT id, email, name, role, is_verified, created_at FROM users WHERE id=?").get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Request Verification ──────────────────────────────────
router.post("/request-verification", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email required" });

    const db = dbConn();
    const user = await db.prepare("SELECT id, email, name, is_verified FROM users WHERE email=?").get(email.toLowerCase());
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.is_verified) return res.json({ ok: true, alreadyVerified: true });

    const code = generateCode();
    const codeHash = hashCode(code);
    const codeExp = expiresAt(15);

    await db.prepare("UPDATE users SET verification_code_hash=?, verification_code_expires_at=? WHERE id=?")
      .run(codeHash, codeExp, user.id);

    await sendMail({
      to: user.email,
      subject: "JolliReserve: Your verification code",
      text: `Hello ${user.name || "Guest"},\n\nYour verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nThanks,\nJolliReserve`,
    });

    console.log("OTP resent to:", user.email, "| code:", code);
    res.json({ ok: true });

  } catch (err) {
    console.error("Request verification error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Verify Email ──────────────────────────────────────────
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code)
      return res.status(400).json({ error: "Email and code required" });

    const db = dbConn();
    const user = await db.prepare("SELECT * FROM users WHERE email=?").get(email.toLowerCase());
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.is_verified) return res.json({ ok: true, alreadyVerified: true });

    if (!user.verification_code_hash || !user.verification_code_expires_at)
      return res.status(400).json({ error: "No verification request found. Please sign up again." });

    if (isExpired(user.verification_code_expires_at))
      return res.status(400).json({ error: "CODE_EXPIRED" });

    const codeHash = hashCode(String(code).trim());
    if (codeHash !== user.verification_code_hash)
      return res.status(400).json({ error: "INVALID_CODE" });

    await db.prepare("UPDATE users SET is_verified=1, verification_code_hash=NULL, verification_code_expires_at=NULL WHERE id=?")
      .run(user.id);

    const safe = { id: user.id, email: user.email, name: user.name, role: user.role, is_verified: 1, created_at: user.created_at };
    const token = signToken(safe);
    res.json({ ok: true, token, user: safe });

  } catch (err) {
    console.error("Verify email error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
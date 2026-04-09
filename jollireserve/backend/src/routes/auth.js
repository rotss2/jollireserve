const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");
const { dbConn } = require("../db");
const { getDb } = require("../firebase");
const { isoNow } = require("../utils/time");
const { sendMail } = require("../utils/email");
const { generateCode, hashCode, expiresAt, isExpired } = require("../utils/verify");
const { requireAuth } = require("../middleware/auth");

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
    const { broadcast } = require("../websocket");
    broadcast({
      type: "activity",
      activity: { user_id: userId, action, details, created_at: isoNow() }
    });
  } catch (e) {
    console.error("Activity log error:", e.message);
  }
}

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

    const db = getDb();
    const usersCol = db.collection("users");

    // Check if email already exists
    const existingQuery = await usersCol.where("email", "==", email.toLowerCase()).limit(1).get();
    
    let userId;
    let isReRegistration = false;
    
    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0];
      const existingUser = existingDoc.data();
      
      // If already verified, block registration
      if (existingUser.is_verified) {
        return res.status(409).json({ error: "Email already registered and verified. Please login instead." });
      }
      
      // If NOT verified, allow re-registration (update existing record)
      userId = existingUser.id;
      isReRegistration = true;
      console.log("🔄 Re-registration for unverified user:", email);
    } else {
      // New user
      userId = uuid();
    }

    const code = generateCode();
    const codeHash = hashCode(code);
    const codeExp = expiresAt(15);
    const hash = bcrypt.hashSync(password, 10);

    const userData = {
      id: userId,
      email: email.toLowerCase(),
      password_hash: hash,
      name: name || "",
      role: "customer",
      is_verified: 0,
      verification_code_hash: codeHash,
      verification_code_expires_at: codeExp,
      created_at: isReRegistration ? existingQuery.docs[0].data().created_at : isoNow(),
      updated_at: isoNow()
    };

    // Save to Firestore (create new or update existing)
    await usersCol.doc(userId).set(userData);
    console.log("✅ User saved to Firestore:", userData.email, "| ID:", userId, "| Verified:", userData.is_verified);

    // Send OTP via Brevo
    const mailResult = await sendMail({
      to: userData.email,
      subject: "JolliReserve: Your verification code",
      text: `Hello ${userData.name || "Guest"},\n\nYour verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nThanks,\nJolliReserve`,
    });

    console.log("📧 Email result:", userData.email, "| OTP:", code, "| Mail:", JSON.stringify(mailResult));
    
    // Check if email actually sent
    if (mailResult.skipped || mailResult.error) {
      console.error("❌ Email failed:", mailResult.error);
      return res.json({ 
        pendingVerification: true, 
        email: userData.email,
        warning: "Account saved but email failed to send. Please use 'Resend Code' or contact support.",
        emailError: mailResult.error,
        isReRegistration
      });
    }
    
    res.json({ 
      pendingVerification: true, 
      email: userData.email,
      message: isReRegistration ? "Account updated. New OTP sent!" : "Account created. OTP sent!"
    });

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

    const db = getDb();
    const usersCol = db.collection("users");
    
    const snapshot = await usersCol.where("email", "==", email.toLowerCase()).limit(1).get();
    
    console.log("LOGIN:", email, "| found:", !snapshot.empty ? "yes" : "no");
    if (snapshot.empty) return res.status(401).json({ error: "Invalid credentials" });

    const user = snapshot.docs[0].data();
    const ok = bcrypt.compareSync(password, user.password_hash);
    console.log("PASSWORD OK:", ok, "| IS VERIFIED:", user.is_verified);

    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.is_verified) return res.status(403).json({ error: "EMAIL_NOT_VERIFIED" });

    const safe = { id: user.id, email: user.email, name: user.name, role: user.role, is_verified: user.is_verified, created_at: user.created_at };
    const token = signToken(safe);
    
    // Log login activity
    await logActivity(user.id, "user_login", { email: user.email, role: user.role });
    
    res.json({ token, user: safe });

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

// ── Me ────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const userDoc = await db.collection("users").doc(req.user.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
    
    const user = userDoc.data();
    const safe = { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role, 
      is_verified: user.is_verified, 
      created_at: user.created_at 
    };
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Logout ─────────────────────────────────────────────────
router.post("/logout", requireAuth, async (req, res) => {
  try {
    await logActivity(req.user.id, "user_logout", { email: req.user.email });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User Activity History ─────────────────────────────────
router.get("/activity", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection("activity_logs")
      .where("user_id", "==", req.user.id)
      .orderBy("created_at", "desc")
      .limit(50)
      .get();
    
    const activity = snapshot.docs.map(doc => doc.data());
    res.json({ activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update Profile ────────────────────────────────────────
router.post("/profile", requireAuth, async (req, res) => {
  try {
    const { name, phone, preferences } = req.body || {};
    const db = getDb();
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (preferences !== undefined) updateData.preferences = preferences;
    
    await db.collection("users").doc(req.user.id).update(updateData);
    await logActivity(req.user.id, "profile_updated", { fields: Object.keys(updateData) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Change Password ─────────────────────────────────────
router.post("/password", requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: "Current and new password required" });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    
    const db = getDb();
    const userDoc = await db.collection("users").doc(req.user.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
    
    const user = userDoc.data();
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
    
    const hash = bcrypt.hashSync(new_password, 10);
    await db.collection("users").doc(req.user.id).update({ password_hash: hash });
    await logActivity(req.user.id, "password_changed", {});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Request Verification ──────────────────────────────────
router.post("/request-verification", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email required" });

    const db = getDb();
    const usersCol = db.collection("users");
    const snapshot = await usersCol.where("email", "==", email.toLowerCase()).limit(1).get();
    
    if (snapshot.empty) return res.status(404).json({ error: "User not found" });
    
    const user = snapshot.docs[0].data();
    const userId = snapshot.docs[0].id;
    
    if (user.is_verified) return res.json({ ok: true, alreadyVerified: true });

    const code = generateCode();
    const codeHash = hashCode(code);
    const codeExp = expiresAt(15);

    await usersCol.doc(userId).update({
      verification_code_hash: codeHash,
      verification_code_expires_at: codeExp
    });

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

    const db = getDb();
    const usersCol = db.collection("users");
    const snapshot = await usersCol.where("email", "==", email.toLowerCase()).limit(1).get();
    
    if (snapshot.empty) return res.status(404).json({ error: "User not found" });
    
    const user = snapshot.docs[0].data();
    const userId = snapshot.docs[0].id;
    
    if (user.is_verified) return res.json({ ok: true, alreadyVerified: true });

    if (!user.verification_code_hash || !user.verification_code_expires_at)
      return res.status(400).json({ error: "No verification request found. Please sign up again." });

    if (isExpired(user.verification_code_expires_at))
      return res.status(400).json({ error: "CODE_EXPIRED" });

    const codeHash = hashCode(String(code).trim());
    if (codeHash !== user.verification_code_hash)
      return res.status(400).json({ error: "INVALID_CODE" });

    await usersCol.doc(userId).update({
      is_verified: 1,
      verification_code_hash: null,
      verification_code_expires_at: null
    });

    const safe = { id: user.id, email: user.email, name: user.name, role: user.role, is_verified: 1, created_at: user.created_at };
    const token = signToken(safe);
    res.json({ ok: true, token, user: safe });

  } catch (err) {
    console.error("Verify email error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
const jwt = require("jsonwebtoken");
const { getDb } = require("../firebase");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_change_me");
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

async function attachUser(req, res, next) {
  // Optional middleware to attach full user from DB if needed
  if (!req.user) return next();
  try {
    const db = getDb();
    const userDoc = await db.collection("users").doc(req.user.id).get();
    req.fullUser = userDoc.exists ? userDoc.data() : null;
    return next();
  } catch (e) {
    console.error("Attach user error:", e.message);
    return next();
  }
}

module.exports = { requireAuth, requireRole, attachUser };

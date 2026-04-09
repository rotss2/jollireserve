const jwt = require("jsonwebtoken");
const { dbConn } = require("../db");

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

function attachUser(req, res, next) {
  // Optional middleware to attach full user from DB if needed
  if (!req.user) return next();
  const db = dbConn();
  const u = db.prepare("SELECT id, email, name, role, created_at FROM users WHERE id=?").get(req.user.id);
  req.fullUser = u || null;
  return next();
}

module.exports = { requireAuth, requireRole, attachUser };

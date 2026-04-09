const crypto = require("crypto");

function generateCode() {
  // 6-digit numeric
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function expiresAt(minutes = 15) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isExpired(iso) {
  if (!iso) return true;
  return Date.now() > new Date(iso).getTime();
}

module.exports = { generateCode, hashCode, expiresAt, isExpired };

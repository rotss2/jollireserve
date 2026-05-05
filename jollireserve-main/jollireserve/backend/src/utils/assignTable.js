/**
 * Auto table assignment:
 * - filter active tables by area preference (if provided)
 * - capacity >= party_size
 * - not already reserved at same date+time (simple timeslot model)
 * - choose smallest capacity that fits
 */
function assignTable({ db, date, time, partySize, areaPref }) {
  const params = [];
  let where = "is_active=1 AND capacity >= ?";
  params.push(partySize);

  if (areaPref && areaPref.trim()) {
    where += " AND area = ?";
    params.push(areaPref.trim());
  }

  const candidates = db.prepare(`SELECT * FROM tables WHERE ${where} ORDER BY capacity ASC`).all(...params);
  if (!candidates.length) return null;

  // find a candidate not reserved at the exact timeslot
  const reserved = db.prepare(`SELECT table_id FROM reservations WHERE date=? AND time=? AND status IN ('confirmed','checked_in') AND table_id IS NOT NULL`)
    .all(date, time)
    .map(r => r.table_id);

  const reservedSet = new Set(reserved);

  for (const t of candidates) {
    if (!reservedSet.has(t.id)) return t;
  }
  return null;
}

module.exports = { assignTable };

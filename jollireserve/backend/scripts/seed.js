const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { initDb } = require("../src/db");
const { getDb } = require("../src/firebase");
const { isoNow } = require("../src/utils/time");

async function upsertUser(db, { email, password, name, role }) {
  const usersCol = db.collection("users");
  
  // Check if user exists
  const existing = await usersCol.where("email", "==", email).limit(1).get();
  const hash = bcrypt.hashSync(password, 10);
  
  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.update({
      password_hash: hash,
      name,
      role,
      is_verified: 1
    });
    return doc.id;
  }
  
  const id = uuid();
  await usersCol.doc(id).set({
    id,
    email,
    password_hash: hash,
    name,
    role,
    is_verified: 1,
    created_at: isoNow()
  });
  return id;
}

async function seedTables(db) {
  const tablesCol = db.collection("tables");
  
  // Check if tables already exist
  const existing = await tablesCol.limit(1).get();
  if (!existing.empty) {
    console.log("📦 Tables already seeded, skipping...");
    return;
  }

  const tables = [
    { name: "T1", area: "indoor", capacity: 2 },
    { name: "T2", area: "indoor", capacity: 2 },
    { name: "T3", area: "indoor", capacity: 4 },
    { name: "T4", area: "indoor", capacity: 4 },
    { name: "T5", area: "outdoor", capacity: 4 },
    { name: "T6", area: "vip", capacity: 6 },
    { name: "T7", area: "vip", capacity: 8 }
  ];

  const batch = db.batch();
  for (const t of tables) {
    const id = uuid();
    const ref = tablesCol.doc(id);
    batch.set(ref, {
      id,
      name: t.name,
      area: t.area,
      capacity: t.capacity,
      is_active: 1
    });
  }
  await batch.commit();
}

async function main() {
  try {
    await initDb();
    const db = getDb();

    const adminId = await upsertUser(db, {
      email: "admin@jollireserve.local",
      password: "Admin123!",
      name: "Admin",
      role: "admin"
    });

    await upsertUser(db, {
      email: "staff@jollireserve.local",
      password: "Staff123!",
      name: "Staff",
      role: "staff"
    });

    await upsertUser(db, {
      email: "user@jollireserve.local",
      password: "User123!",
      name: "Guest User",
      role: "customer"
    });

    await seedTables(db);

    console.log("✅ Seed complete!");
    console.log("Admin:", "admin@jollireserve.local / Admin123!");
    console.log("Staff:", "staff@jollireserve.local / Staff123!");
    console.log("User:", "user@jollireserve.local / User123!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

main();

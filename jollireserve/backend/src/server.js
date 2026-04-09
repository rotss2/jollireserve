const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { initDb, dbConn } = require("./db");
const authRoutes = require("./routes/auth");
const reservationRoutes = require("./routes/reservations");
const queueRoutes = require("./routes/queue");
const tableRoutes = require("./routes/tables");
const adminRoutes = require("./routes/admin");
const http = require("http");
const { initWebSocket } = require("./ws");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const { isoNow } = require("./utils/time");

const app = express();
const PORT = process.env.PORT || 4000;

// Known frontend origins — always allowed regardless of env var
const knownOrigins = [
  "http://localhost:5173",
  "https://jollireserve-frontend.onrender.com",
];

const envOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim())
  : [];

const allowedOrigins = [...new Set([...knownOrigins, ...envOrigins])];
console.log("✅ CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check (available immediately, before DB is ready)
app.get("/api/health", (req, res) =>
  res.json({ ok: true, name: "JolliReserve API" })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/admin", adminRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error("API Error:", err);
  res.status(err.status || 500).json({ error: "Server error", details: err.message });
});

// ─── Async startup ────────────────────────────────────────────────────────────
async function autoSeed() {
  try {
    const db = dbConn();
    const existing = await db
      .prepare("SELECT id FROM users WHERE email=?")
      .get("admin@jollireserve.local");

    if (!existing) {
      await db
        .prepare(
          "INSERT INTO users (id, email, password_hash, name, role, is_verified, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)"
        )
        .run(uuid(), "admin@jollireserve.local", bcrypt.hashSync("Admin123!", 10), "Admin", "admin", isoNow());

      await db
        .prepare(
          "INSERT INTO users (id, email, password_hash, name, role, is_verified, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)"
        )
        .run(uuid(), "staff@jollireserve.local", bcrypt.hashSync("Staff123!", 10), "Staff", "staff", isoNow());

      await db
        .prepare(
          "INSERT INTO users (id, email, password_hash, name, role, is_verified, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)"
        )
        .run(uuid(), "user@jollireserve.local", bcrypt.hashSync("User123!", 10), "Guest User", "customer", isoNow());

      // Seed default tables
      const tables = [
        { name: "T1", area: "indoor", capacity: 2 },
        { name: "T2", area: "indoor", capacity: 2 },
        { name: "T3", area: "indoor", capacity: 4 },
        { name: "T4", area: "indoor", capacity: 4 },
        { name: "T5", area: "outdoor", capacity: 4 },
        { name: "T6", area: "vip", capacity: 6 },
        { name: "T7", area: "vip", capacity: 8 },
      ];

      for (const t of tables) {
        await db
          .prepare("INSERT INTO tables (id, name, area, capacity, is_active) VALUES (?, ?, ?, ?, 1)")
          .run(uuid(), t.name, t.area, t.capacity);
      }

      console.log("✅ Auto-seed complete!");
    } else {
      console.log("✅ Database already seeded.");
    }
  } catch (e) {
    console.error("Auto-seed error:", e.message);
  }
}

async function start() {
  // 1. Init DB schema (creates tables if they don't exist)
  await initDb();

  // 2. Seed default data (only runs once — skipped if admin already exists)
  await autoSeed();

  // 3. Start HTTP + WebSocket server
  const server = http.createServer(app);
  initWebSocket(server);

  server.listen(PORT, () =>
    console.log(`✅ Backend running on http://localhost:${PORT}`)
  );
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Fatal: Uncaught Exception", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Fatal: Unhandled Rejection", reason);
  process.exit(1);
});
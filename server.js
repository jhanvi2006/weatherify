const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// =======================
// PostgreSQL Setup
// =======================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Create feedback table if not exists
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ Feedback table ready");
  } catch (err) {
    console.error("❌ Error creating feedback table:", err);
  }
})();

// =======================
// Spotify Token Endpoint
// =======================
app.get("/spotify-token", async (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    const authResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    res.json({ access_token: authResponse.data.access_token });
  } catch (err) {
    console.error("Spotify token error:", err.message);
    res.status(500).json({ error: "Failed to get token" });
  }
});

// =======================
// Feedback Endpoints
// =======================

// Save feedback
app.post("/feedback", async (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: "Name and feedback are required" });
  }

  try {
    await pool.query("INSERT INTO feedback (name, message) VALUES ($1, $2)", [
      name,
      message
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving feedback:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

// View all feedback (for you as admin, not public)
app.get("/feedback", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM feedback ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching feedback:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// =======================
// Start Server
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

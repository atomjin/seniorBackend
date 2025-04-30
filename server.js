import Fastify from "fastify";
import cors from "@fastify/cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const fastify = Fastify({ logger: true });

let accessToken = null;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;

// CORS for frontend
await fastify.register(cors, {
  origin: [FRONTEND_URL, "http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true
});

// OAuth callback
fastify.get("/oauth_callback", async (req, reply) => {
  const { code } = req.query;

  if (!code) return reply.status(400).send("Missing authorization code");

  try {
    const res = await fetch("https://streamlabs.com/api/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code,
      }),
    });

    const data = await res.json();
    if (data.access_token) {
      accessToken = data.access_token;
      console.log("✅ Access token stored");
      reply.redirect(`${FRONTEND_URL}?login=success`);
    } else {
      console.error("❌ Token exchange failed", data);
      reply.status(500).send("Token exchange failed");
    }
  } catch (err) {
    console.error("❌ OAuth error:", err.message);
    reply.status(500).send("OAuth failed");
  }
});

// Access token endpoint (WebSocket server will call this)
fastify.get("/api/token", async (req, reply) => {
  if (accessToken) {
    reply.send({ access_token: accessToken });
  } else {
    reply.status(404).send("No token");
  }
});

// Start server
const PORT = process.env.PORT || 8000;
try {
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`🚀 Fastify backend running on http://0.0.0.0:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

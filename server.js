import Fastify from "fastify";
import cors from "@fastify/cors"; // CORS for frontend connection
import fetch from "node-fetch"; // For Streamlabs API requests
import dotenv from "dotenv"; // Load environment variables

dotenv.config();

const fastify = Fastify({ logger: true });

let accessToken = null; // Store the access token

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// ✅ Enable CORS for frontend (React)
await fastify.register(cors, {
  origin: "http://localhost:3000", // Allow requests from React frontend
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
});

// ✅ Streamlabs OAuth Callback
fastify.get("/oauth_callback", async (req, reply) => {
  const { code } = req.query;

  if (!code) {
    reply.status(400).send("Authorization code is missing.");
    return;
  }

  console.log(`Received authorization code: ${code}`);

  try {
    const response = await fetch("https://streamlabs.com/api/v2.0/token", {
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

    const data = await response.json();
    console.log("Response from Streamlabs:", data);

    if (data.access_token) {
      accessToken = data.access_token;
      console.log("✅ Access Token:", accessToken);

      // Redirect user back to React frontend
      reply.redirect(`http://localhost:3000?login=success`);
    } else {
      console.error("Streamlabs API Error:", data);
      reply.status(500).send("Failed to retrieve access token.");
    }
  } catch (error) {
    console.error("Error exchanging authorization code:", error.message);
    reply.status(500).send("Failed to retrieve access token.");
  }
});

// ✅ Provide stored access token
fastify.get("/api/token", async (req, reply) => {
  if (accessToken) {
    reply.send({ access_token: accessToken });
  } else {
    reply.status(404).send("Access token not available. Please authenticate first.");
  }
});

// ✅ Check if user is logged in
fastify.get("/api/status", async (req, reply) => {
  console.log("🔄 Checking if user is logged in...");
  if (accessToken) {
    console.log("✅ User is logged in!");
    return reply.send({ loggedIn: true });
  } else {
    console.log("❌ User is NOT logged in!");
    return reply.send({ loggedIn: false });
  }
});

// ✅ Generate WebSocket API Token
fastify.get("/api/socket_token", async (req, reply) => {
  if (!accessToken) {
    return reply.status(401).send({ error: "Not authenticated. Please log in first." });
  }

  try {
    const socketApiToken = accessToken;
    console.log("Generated WebSocket API Token:", socketApiToken);

    reply.send({ socket_token: socketApiToken });
  } catch (error) {
    console.error("Failed to retrieve WebSocket API token:", error);
    reply.status(500).send({ error: "Failed to generate WebSocket API token" });
  }
});

// ✅ Start Fastify Server
const PORT = process.env.PORT || 8000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
  console.log(`🚀 Fastify server running at ${address}`);
});

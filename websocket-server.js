import { createServer } from "http";
import { WebSocketServer } from "ws";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 8080;
const TOKEN_API = "https://down2depth-production.up.railway.app/api/token";
const DONATION_API = "https://streamlabs.com/api/v1.0/donations";

let accessToken = null;

// Create WebSocket server
const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  console.log("🔌 WebSocket client connected");
  ws.on("close", () => console.log("❎ WebSocket client disconnected"));
  ws.on("message", (msg) => console.log("📨 From client:", msg.toString()));
});

// Pull token from Fastify backend
async function refreshToken() {
  try {
    const res = await axios.get(TOKEN_API);
    accessToken = res.data.access_token;
    console.log("🔁 Refreshed token");
  } catch (err) {
    console.error("❌ Could not refresh token:", err.message);
  }
}

// Poll donations from Streamlabs
async function fetchDonations() {
  if (!accessToken) return;

  try {
    const res = await axios.get(DONATION_API, {
      params: { access_token: accessToken },
    });

    const donations = res.data.data || [];
    donations.forEach((donation) => {
      console.log("🎁 Donation:", donation);
      broadcast(donation);
    });
  } catch (err) {
    console.error("❌ Donation fetch failed:", err.message);
  }
}

// Send to all clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// Set intervals
setInterval(refreshToken, 30000);
setInterval(fetchDonations, 5000);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🌐 WebSocket server running at ws://0.0.0.0:${PORT}`);
});

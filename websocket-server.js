import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Config
const PORT = process.env.PORT || 8080;
const API_URL = 'https://streamlabs.com/api/v1.0/donations';
const TOKEN_API = 'http://down2depth-production.up.railway.app/api/token';

// Create an HTTP server to attach WebSocket
const server = createServer();
const wss = new WebSocketServer({ server });

let accessToken = null;

// Refresh the access token from your backend
async function refreshToken() {
  try {
    const res = await axios.get(TOKEN_API);
    accessToken = res.data.access_token;
    console.log('✅ Refreshed access token');
  } catch (err) {
    console.error('❌ Failed to refresh token:', err.message);
  }
}

// Poll Streamlabs for new donations
async function fetchDonations() {
  if (!accessToken) return;

  try {
    const res = await axios.get(API_URL, {
      params: { access_token: accessToken },
    });

    const donations = res.data.data;

    donations.forEach((donation) => {
      console.log('🎁 Donation received:', donation);
      broadcast(donation);
    });
  } catch (err) {
    console.error('❌ Donation fetch failed:', err.message);
  }
}

// Broadcast to all connected WebSocket clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  ws.on('message', (msg) => console.log('📨 Client said:', msg));
  ws.on('close', () => console.log('❎ Client disconnected'));
});

// Refresh token every 30s and poll donations every 5s
setInterval(refreshToken, 30000);
setInterval(fetchDonations, 5000);

// Start the server
server.listen(PORT, () => {
  console.log(`🌐 WebSocket server running on ws://0.0.0.0:${PORT}`);
});

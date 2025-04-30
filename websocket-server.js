const WebSocket = require('ws');
const axios = require('axios');

// WebSocket server configuration
const PORT = 8080; // Port for WebSocket server
const API_URL = 'https://streamlabs.com/api/v1.0/donations'; // Streamlabs API URL
const ACCESS_TOKEN = 'your_stored_access_token'; // Replace with your actual access token

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT }, () => {
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});

// Broadcast function to send messages to all connected clients
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Fetch donation data from Streamlabs API
async function fetchDonations() {
    try {
        const response = await axios.get(API_URL, { params: { access_token: ACCESS_TOKEN } });
        const donations = response.data.data;

        // Send each donation to connected clients
        donations.forEach((donation) => {
            console.log('Donation received:', donation);
            broadcast(donation); // Send donation to all clients
        });
    } catch (error) {
        console.error('Error fetching donations:', error.message);
    }
}

// Poll for new donations every 5 seconds
setInterval(fetchDonations, 5000);

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('A new client connected.');

    // Optional: Handle messages from the client (e.g., for debugging)
    ws.on('message', (message) => {
        console.log('Received message from client:', message);
    });

    // Optional: Handle client disconnection
    ws.on('close', () => {
        console.log('A client disconnected.');
    });
});

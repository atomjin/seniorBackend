import Fastify from "fastify";
import cors from "@fastify/cors"; 
import fetch from "node-fetch"; 
import dotenv from "dotenv";

dotenv.config();

const fastify = Fastify({ logger: true });
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;


await fastify.register(cors, {
  origin: "https://senior-frontend-cyut.vercel.app", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
});
fastify.get("/", async (req, reply) => {
  reply.send({ message: "Hello from Fastify!" });
}
);


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
      const accessToken = data.access_token;
      reply.redirect(`https://senior-frontend-cyut.vercel.app/?access_token=${accessToken}`);
    } else {
      console.error("Streamlabs API Error:", data);
      reply.status(500).send("Failed to retrieve access token.");
    }
  } catch (error) {
    console.error("Error exchanging authorization code:", error.message);
    reply.status(500).send("Failed to retrieve access token.");
  }
});


const PORT = process.env.PORT || 8000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
  console.log(`🚀 Fastify server running at ${address}`);
});

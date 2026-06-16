// StoryScribe signaling server for real-time collaboration.
//
// This implements the small y-webrtc signaling protocol (topic-based
// subscribe / publish) — it only relays WebRTC connection handshakes between
// peers. No manuscript or note data ever passes through here; that flows
// directly peer-to-peer (and is end-to-end encrypted when a passphrase is set).
//
// Run:   PORT=4444 node server/signaling.js
// Deploy behind TLS (the platform terminates HTTPS) and point the app at it
// with VITE_SIGNALING=wss://your-host
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT) || 4444;
const pingInterval = 30000;

const wss = new WebSocketServer({ port });
/** topic -> Set<WebSocket> */
const topics = new Map();

function send(conn, message) {
  if (conn.readyState !== 0 && conn.readyState !== 1) return conn.close();
  try {
    conn.send(JSON.stringify(message));
  } catch {
    conn.close();
  }
}

wss.on("connection", (conn) => {
  const subscribed = new Set();
  conn.isAlive = true;
  conn.on("pong", () => {
    conn.isAlive = true;
  });

  conn.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(typeof data === "string" ? data : data.toString());
    } catch {
      return;
    }
    if (!message || typeof message.type !== "string") return;

    switch (message.type) {
      case "subscribe":
        (message.topics || []).forEach((topic) => {
          if (typeof topic !== "string") return;
          let set = topics.get(topic);
          if (!set) topics.set(topic, (set = new Set()));
          set.add(conn);
          subscribed.add(topic);
        });
        break;
      case "unsubscribe":
        (message.topics || []).forEach((topic) => {
          topics.get(topic)?.delete(conn);
        });
        break;
      case "publish": {
        if (typeof message.topic !== "string") return;
        const receivers = topics.get(message.topic);
        if (!receivers) return;
        const payload = JSON.stringify(message);
        receivers.forEach((receiver) => {
          if (receiver.readyState === 1) receiver.send(payload);
        });
        break;
      }
      case "ping":
        send(conn, { type: "pong" });
        break;
      default:
        break;
    }
  });

  conn.on("close", () => {
    subscribed.forEach((topic) => {
      const set = topics.get(topic);
      set?.delete(conn);
      if (set && set.size === 0) topics.delete(topic);
    });
    subscribed.clear();
  });
});

// Drop dead connections.
const interval = setInterval(() => {
  wss.clients.forEach((conn) => {
    if (!conn.isAlive) return conn.terminate();
    conn.isAlive = false;
    try {
      conn.ping();
    } catch {
      conn.terminate();
    }
  });
}, pingInterval);
wss.on("close", () => clearInterval(interval));

console.log(`StoryScribe signaling server listening on :${port}`);

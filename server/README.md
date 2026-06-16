# StoryScribe signaling server

A tiny WebRTC **signaling** server for real-time collaboration. It only relays
connection handshakes between peers (the y-webrtc topic protocol) — your
manuscript and notes never pass through it; they flow directly peer-to-peer and
are end-to-end encrypted when a session passphrase is set.

## Run locally

```bash
cd server
npm install
PORT=4444 npm start
# then build the app pointed at it:
#   VITE_SIGNALING=ws://localhost:4444 npm run build
```

## Deploy (needs a public wss:// URL)

WebRTC requires the app on HTTPS to use a **wss://** signaling URL. Any Node host
works; the platform terminates TLS and proxies to the plain-ws server.

- **Docker** (Fly.io, Render, Railway, a VPS, …):
  ```bash
  docker build -t storyscribe-signaling ./server
  docker run -p 4444:4444 storyscribe-signaling
  ```
  - **Fly.io:** `fly launch --dockerfile server/Dockerfile` (set internal port 4444).
  - **Render:** New → Web Service → Docker → root `server/`.

Once deployed, set the app's build env (e.g. as a GitHub Actions repository
variable — see the deploy workflow):

```
VITE_SIGNALING=wss://your-signaling-host
```

## TURN (for strict NATs/firewalls)

STUN alone (the built-in default) covers most networks. For peers behind
symmetric NATs you also need a TURN relay. Provide it via `VITE_ICE_SERVERS`
(JSON array of RTCIceServer), e.g.:

```
VITE_ICE_SERVERS=[{"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]
```

Run your own with [coturn](https://github.com/coturn/coturn), or use a managed
TURN provider (Metered, Twilio, Cloudflare). The app already includes a public
STUN server by default.

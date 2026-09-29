# Lumo — Private Online E2E Chat

Lumo is a small two-person real-time chat app with browser-side end-to-end encryption.

## Features
- Create or join a two-person room with an encrypted invite token.
- The invite token contains a random 256-bit room key; the server receives only the room ID.
- Messages are encrypted in the browser with AES-256-GCM before they are sent over WebSocket.
- The server stores/relays ciphertext only; it does not receive plaintext message text or the encryption key.
- Existing room history is also stored only as ciphertext while the room is active.
- Back / leave and manual Delete chat clear the conversation for the room.
- No database: room data exists only in server memory and disappears when the room becomes empty or the server restarts.

## Run locally
Requires Node.js 18+.

```bash
npm install
npm start
```
Then open `http://localhost:3000` in two browser windows/devices on a network where the server is reachable.

### How to use
1. Person A opens Lumo and chooses **Create / join private space**.
2. Enter a display name and leave the invite field empty.
3. Lumo creates an invite token. Share the **entire token** with Person B.
4. Person B pastes the token into the invite field and joins.
5. Both browsers encrypt/decrypt messages locally.

**Important:** treat the invite token like a secret password. Anyone who gets the complete token can decrypt the room's messages while they have access to the room.

## Deploy online
Deploy this Node app on a host that supports a persistent WebSocket server (for example Render, Railway, Fly.io, or a VPS). The app uses the same host for HTTP and WebSocket.

For public deployment, use HTTPS/WSS. Also consider authentication, rate limiting, abuse controls, CSP, and a stronger audited protocol if this is intended for high-security use.

## Security note
This is application-level E2E encryption using Web Crypto AES-GCM with a random 256-bit room key. It protects message content from the chat server, but it is not a full Signal-style protocol: there is no forward secrecy, key rotation, identity verification, or protection against a malicious/modified server shipping altered JavaScript. Do not market this as equivalent to Signal/WhatsApp security without a professional security review.

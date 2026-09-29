const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const clients = new Map();

function room(code) {
  if (!rooms.has(code)) rooms.set(code, { clients: new Set(), messages: [] });
  return rooms.get(code);
}
function cleanName(name) {
  return String(name || 'Guest').replace(/[^\w .-]/g, '').trim().slice(0, 24) || 'Guest';
}
function broadcast(r, payload, except) {
  const data = JSON.stringify(payload);
  for (const ws of r.clients) if (ws !== except && ws.readyState === 1) ws.send(data);
}
function makeCode() { return crypto.randomBytes(3).toString('hex').toUpperCase(); }

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const file = path.join(__dirname, url);
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  const ext = path.extname(file);
  const type = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json' }[ext] || 'application/octet-stream';
  res.writeHead(200, {'Content-Type': type, 'Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server, maxPayload: 32 * 1024 });
wss.on('connection', ws => {
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.type === 'join') {
      const code = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
      if (!code) return ws.send(JSON.stringify({type:'error', message:'A room code is required.'}));
      const r = room(code);
      if (r.clients.size >= 2) return ws.send(JSON.stringify({type:'error', message:'This room already has 2 people.'}));
      ws.room = code; ws.name = cleanName(m.name); r.clients.add(ws); clients.set(ws, code);
      ws.send(JSON.stringify({type:'joined', room:code, messages:r.messages, peerCount:r.clients.size}));
      broadcast(r, {type:'presence', peerCount:r.clients.size}, ws);
      return;
    }
    const code = clients.get(ws); if (!code) return; const r = rooms.get(code); if (!r) return;
    if (m.type === 'message') {
      // The server deliberately treats message as opaque encrypted data.
      const ciphertext = typeof m.ciphertext === 'string' ? m.ciphertext : '';
      const iv = typeof m.iv === 'string' ? m.iv : '';
      if (!ciphertext || !iv || ciphertext.length > 30000 || iv.length > 100) return;
      const item = { id: crypto.randomUUID(), sender: ws.name, ciphertext, iv, time: Date.now() };
      r.messages.push(item); if (r.messages.length > 200) r.messages.shift();
      broadcast(r, {type:'message', message:item}, ws);
      ws.send(JSON.stringify({type:'message', message:item, self:true}));
    }
    if (m.type === 'delete_chat') {
      r.messages = [];
      broadcast(r, {type:'chat_deleted'}, ws);
      ws.send(JSON.stringify({type:'chat_deleted'}));
    }
    if (m.type === 'leave') {
      r.clients.delete(ws); clients.delete(ws); broadcast(r, {type:'presence', peerCount:r.clients.size});
      if (r.clients.size === 0) rooms.delete(code);
      ws.room = null;
    }
  });
  ws.on('close', () => {
    const code = clients.get(ws); if (!code) return; const r = rooms.get(code);
    clients.delete(ws); if (!r) return; r.clients.delete(ws);
    broadcast(r, {type:'presence', peerCount:r.clients.size});
    if (r.clients.size === 0) rooms.delete(code);
  });
});

server.listen(PORT, () => console.log(`Lumo encrypted online chat running on port ${PORT}`));

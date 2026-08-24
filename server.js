const http = require('http');
const https = require('https');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = 3443;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function requestHandler(req, res) {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'text/plain' });
    res.end(buf);
  });
}

function lanIps() {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

async function getOrCreateCert() {
  const keyFile = path.join(__dirname, 'key.pem');
  const certFile = path.join(__dirname, 'cert.pem');
  if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
  }
  const selfsigned = require('selfsigned');
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' }
  ];
  for (const ip of lanIps()) altNames.push({ type: 7, ip });
  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: 'SK Phone' }],
    { days: 3650, keySize: 2048, extensions: [{ name: 'subjectAltName', altNames }] }
  );
  fs.writeFileSync(keyFile, pems.private);
  fs.writeFileSync(certFile, pems.cert);
  return { key: pems.private, cert: pems.cert };
}

/* ---------- signaling ---------- */
const clients = new Map();
let nextId = 1;

function usersList() {
  return [...clients.values()].map(u => ({ id: u.id, name: u.name }));
}
function sendTo(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}
function broadcast(obj) {
  for (const [w] of clients) sendTo(w, obj);
}
function broadcastUsers() {
  broadcast({ type: 'users', users: usersList() });
}
function findById(id) {
  for (const [w, u] of clients) if (u.id === id) return w;
  return null;
}

const RELAY = new Set([
  'offer', 'answer', 'ice', 'end', 'reject', 'busy',
  'chat',
  'g-invite', 'g-join', 'g-offer', 'g-answer', 'g-ice', 'g-leave', 'g-end', 'g-reject'
]);

function attachSignaling(server) {
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let m;
      try { m = JSON.parse(raw.toString()); } catch { return; }

      if (m.type === 'login') {
        const base = String(m.name || '').trim().replace(/\s+/g, ' ').slice(0, 20) || 'User';
        const taken = new Set([...clients.values()].map(u => u.name.toLowerCase()));
        let name = base;
        let n = 2;
        while (taken.has(name.toLowerCase())) name = base + ' ' + n++;
        clients.set(ws, { id: nextId++, name });
        sendTo(ws, { type: 'welcome', user: { id: clients.get(ws).id, name } });
        broadcastUsers();
        return;
      }

      const me = clients.get(ws);
      if (!me) return;

      if (RELAY.has(m.type)) {
        const target = findById(Number(m.to));
        if (target) sendTo(target, { type: m.type, from: me.id, fromName: me.name, payload: m.payload });
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcastUsers();
    });
    ws.on('error', () => {});
  });
}

/* ---------- servers ---------- */
const IS_CLOUD = !!process.env.PORT;

const httpServer = http.createServer(requestHandler);
attachSignaling(httpServer);
httpServer.listen(HTTP_PORT, () => {
  console.log('HTTP : http://localhost:' + HTTP_PORT);
  if (IS_CLOUD) console.log('Cloud mode: TLS/WSS handled by hosting platform.');
});

if (!IS_CLOUD) {
  (async () => {
    let ssl = null;
    try { ssl = await getOrCreateCert(); } catch (e) {
      console.log('HTTPS unavailable:', e.message);
    }
    if (ssl) {
      const httpsServer = https.createServer(ssl, requestHandler);
      attachSignaling(httpsServer);
      httpsServer.listen(HTTPS_PORT, () => {
        console.log('HTTPS: https://localhost:' + HTTPS_PORT);
        const ips = lanIps();
        if (ips.length) {
          console.log('');
          console.log('Mobile ke liye (same WiFi):');
          for (const ip of ips) console.log('  https://' + ip + ':' + HTTPS_PORT);
        }
      });
    }
  })();
}

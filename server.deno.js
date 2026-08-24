/* SK Phone - cloud server (Deno Deploy version)
   Same kaam: static files + WebRTC signaling (login/users/relay)
   Card-free hosting ke liye. Local test:
   deno run --allow-net --allow-read --allow-env server.deno.js */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive'
};

/* ---------- signaling state ---------- */
const clients = new Map();
let nextId = 1;

function usersList() {
  return [...clients.values()].map((u) => ({ id: u.id, name: u.name }));
}
function isOpen(ws) {
  try {
    return ws.readyState === undefined || ws.readyState === 1;
  } catch {
    return true;
  }
}
function sendTo(ws, obj) {
  try {
    if (isOpen(ws)) ws.send(JSON.stringify(obj));
  } catch {}
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

function handleWs(req) {
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onmessage = (ev) => {
    let m;
    try { m = JSON.parse(ev.data); } catch { return; }

    if (m.type === 'login') {
      const base = String(m.name || '').trim().replace(/\s+/g, ' ').slice(0, 20) || 'User';
      const taken = new Set([...clients.values()].map((u) => u.name.toLowerCase()));
      let name = base;
      let n = 2;
      while (taken.has(name.toLowerCase())) name = base + ' ' + n++;
      clients.set(socket, { id: nextId++, name });
      sendTo(socket, { type: 'welcome', user: { id: clients.get(socket).id, name } });
      broadcastUsers();
      return;
    }

    const me = clients.get(socket);
    if (!me) return;

    if (RELAY.has(m.type)) {
      const target = findById(Number(m.to));
      if (target) sendTo(target, { type: m.type, from: me.id, fromName: me.name, payload: m.payload });
    }
  };

  socket.onclose = () => {
    clients.delete(socket);
    broadcastUsers();
  };
  socket.onerror = () => {};

  return response;
}

async function serveFile(pathname) {
  if (pathname === '/') pathname = '/index.html';
  const clean = '/' + pathname.split('/').filter((s) => s && s !== '.' && s !== '..').join('/');
  const base = new URL('./public/', import.meta.url);
  const fileUrl = new URL('./public' + clean, import.meta.url);
  if (!fileUrl.href.startsWith(base.href)) return new Response('Forbidden', { status: 403 });
  try {
    const buf = await Deno.readFile(fileUrl);
    const dot = clean.lastIndexOf('.');
    const ext = dot >= 0 ? clean.slice(dot).toLowerCase() : '';
    return new Response(buf, {
      headers: { 'Content-Type': MIME[ext] || 'text/plain' }
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

Deno.serve(
  { port: Number(Deno.env.get('PORT') || 8787) },
  async (req) => {
    const up = (req.headers.get('upgrade') || '').toLowerCase();
    if (up === 'websocket') {
      try {
        return handleWs(req);
      } catch {
        return new Response('WS error', { status: 500 });
      }
    }
    const url = new URL(req.url);
    if (url.pathname === '/healthz') {
      let kv = 'unknown';
      try {
        const db = await Deno.openKv();
        await db.set(['_probe', Date.now().toString()], 1);
        kv = 'OK';
      } catch (e) {
        kv = 'FAIL: ' + String(e && e.message ? e.message : e).slice(0, 120);
      }
      return Response.json({
        kv,
        iso: Math.random().toString(36).slice(2, 8),
        online: clients.size
      });
    }
    let pathname = '/';
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {}
    return serveFile(pathname);
  }
);

console.log('SK Phone (deno) chal raha hai');

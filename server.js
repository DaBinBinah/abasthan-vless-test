// Abasthan Node.js Web Service: static page on / + VLESS-WS on /577dd7e0
// Pure Node, no Xray binary: Abasthan has no Dockerfile/container deploy,
// only Node/Python/PHP/Static from Git, $PORT env, bind 0.0.0.0.
// VLESS UUID: fc8b6a71-8f59-4e41-9498-29f310a2795d (dedicated to this node)
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const UUID = 'fc8b6a71-8f59-4e41-9498-29f310a2795d';
const WS_PATH = '/577dd7e0';
const PORT = parseInt(process.env.PORT || '3000', 10);

function uuidBytes() {
  return Buffer.from(UUID.replace(/-/g, ''), 'hex');
}
const UUID_BUF = uuidBytes();

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); res.end('err'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  let pathname = '/';
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch (e) {}
  if (pathname !== WS_PATH) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws) => {
  let remote = null;
  let headerParsed = false;
  let version = 0;

  ws.on('message', (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (!headerParsed) {
      try {
        if (buf.length < 19) throw new Error('short header');
        version = buf[0];
        if (!buf.slice(1, 17).equals(UUID_BUF)) throw new Error('bad uuid');
        const addonLen = buf[17];
        let offset = 18 + addonLen;
        const command = buf[offset]; offset += 1;
        if (command !== 1) throw new Error('only TCP supported');
        const port = buf.readUInt16BE(offset); offset += 2;
        const addrType = buf[offset]; offset += 1;
        let address = '';
        if (addrType === 1) {
          address = Array.from(buf.slice(offset, offset + 4)).join('.');
          offset += 4;
        } else if (addrType === 2) {
          const len = buf[offset]; offset += 1;
          address = buf.slice(offset, offset + len).toString('utf8');
          offset += len;
        } else if (addrType === 3) {
          const parts = [];
          for (let i = 0; i < 8; i++) parts.push(buf.readUInt16BE(offset + i * 2).toString(16));
          address = parts.join(':');
          offset += 16;
        } else {
          throw new Error('bad addr type');
        }
        headerParsed = true;
        ws.send(Buffer.from([version, 0]));
        remote = net.connect(port, address, () => {
          const rest = buf.slice(offset);
          if (rest.length) remote.write(rest);
        });
        remote.on('data', (chunk) => {
          if (ws.readyState === 1) ws.send(chunk);
        });
        remote.on('error', () => { try { ws.close(); } catch (e) {} });
        remote.on('close', () => { try { ws.close(); } catch (e) {} });
      } catch (e) {
        try { ws.close(); } catch (_) {}
      }
      return;
    }
    if (remote && !remote.destroyed) remote.write(buf);
  });

  ws.on('close', () => { if (remote) remote.destroy(); });
  ws.on('error', () => { if (remote) remote.destroy(); });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('listening on ' + PORT);
});

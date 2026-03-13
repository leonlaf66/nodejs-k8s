'use strict';

const express = require('express');
const client = require('prom-client');
const os = require('os');

const PORT = 3000;
const HOST = '0.0.0.0';

const app = express();

// ─── Prometheus metrics ───────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

// Middleware: record metrics for every request (skip /metrics itself)
app.use((req, res, next) => {
  if (req.path === '/metrics') return next();

  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
    httpRequestDurationSeconds.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
  });

  next();
});

// ─── Original routes (unchanged) ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>nodejs-k8s</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0f1117;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;flex-direction:column}
    header{background:linear-gradient(135deg,#1e1b4b,#0f172a);border-bottom:1px solid #2a2d3e;padding:20px 32px;display:flex;align-items:center;gap:14px}
    .icon{width:42px;height:42px;background:#6366f1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px}
    h1{font-size:1.2rem;font-weight:700}
    p.sub{font-size:.75rem;color:#64748b;margin-top:2px}
    .live{background:rgba(99,102,241,.15);color:#6366f1;border:1px solid rgba(99,102,241,.3);padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:600;margin-left:auto}
    .dot{display:inline-block;width:7px;height:7px;background:#34d399;border-radius:50%;margin-right:5px;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    main{flex:1;padding:32px;max-width:1100px;margin:0 auto;width:100%}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
    @media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}
    .card{background:#1a1d27;border:1px solid #2a2d3e;border-radius:14px;padding:20px;position:relative;overflow:hidden}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--c,#6366f1)}
    .lbl{font-size:.72rem;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .val{font-size:1.9rem;font-weight:700;letter-spacing:-.03em}
    .hint{font-size:.75rem;color:#64748b;margin-top:4px}
    .ico{position:absolute;right:18px;top:18px;font-size:1.4rem;opacity:.25}
    .info-card{background:#1a1d27;border:1px solid #2a2d3e;border-radius:14px;padding:20px;margin-bottom:28px}
    .info-title{font-size:.8rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px}
    .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #2a2d3e}
    .row:last-child{border:none}
    .rk{color:#64748b;font-size:.82rem}
    .rv{font-size:.82rem;font-weight:500;font-family:monospace;color:#22d3ee}
    .ep-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    @media(max-width:700px){.ep-grid{grid-template-columns:1fr}}
    .ep{background:rgba(99,102,241,.05);border:1px solid #2a2d3e;border-radius:10px;padding:12px}
    .ep-path{font-family:monospace;font-size:.82rem;color:#22d3ee;margin-bottom:3px}
    .ep-desc{font-size:.73rem;color:#64748b}
  </style>
</head>
<body>
<header>
  <div class="icon">☸</div>
  <div><h1>CA</h1><p class="sub">CA is the best ED-tech company</p></div>
  <span class="live"><span class="dot"></span>Running</span>
</header>
<main>
  <div class="grid" id="stats">
    <div class="card" style="--c:#6366f1"><span class="ico">⏱</span><div class="lbl">Uptime</div><div class="val" id="up">—</div><div class="hint">seconds</div></div>
    <div class="card" style="--c:#22d3ee"><span class="ico">🧠</span><div class="lbl">Heap Used</div><div class="val" id="heap">—</div><div class="hint">MB</div></div>
    <div class="card" style="--c:#34d399"><span class="ico">📦</span><div class="lbl">CPU Load</div><div class="val" id="cpu">—</div><div class="hint">1-min avg</div></div>
    <div class="card" style="--c:#fbbf24"><span class="ico">🌐</span><div class="lbl">Hostname</div><div class="val" style="font-size:1rem;padding-top:6px" id="host">—</div><div class="hint">pod name</div></div>
  </div>
  <div class="info-card">
    <div class="info-title">Pod Info</div>
    <div id="podinfo"></div>
  </div>
  <div class="info-card">
    <div class="info-title">Endpoints</div>
    <div class="ep-grid">
      <div class="ep"><div class="ep-path">GET /</div><div class="ep-desc">This page</div></div>
      <div class="ep"><div class="ep-path">GET /health</div><div class="ep-desc">Liveness / readiness probe</div></div>
      <div class="ep"><div class="ep-path">GET /metrics</div><div class="ep-desc">Prometheus metrics (prom-client)</div></div>
      <div class="ep"><div class="ep-path">GET /api/stats</div><div class="ep-desc">Raw stats JSON</div></div>
    </div>
  </div>
</main>
<script>
  async function refresh(){
    try{
      const d=await fetch('/api/stats').then(r=>r.json());
      document.getElementById('up').textContent=Math.floor(d.uptime);
      document.getElementById('heap').textContent=(d.memory.heapUsed/1024/1024).toFixed(1);
      document.getElementById('cpu').textContent=d.cpuLoad[0].toFixed(2);
      document.getElementById('host').textContent=d.hostname;
      document.getElementById('podinfo').innerHTML=[
        ['Hostname',d.hostname],['Platform',d.platform],
        ['Node.js',d.nodeVersion],['PID',d.pid],
      ].map(([k,v])=>\`<div class="row"><span class="rk">\${k}</span><span class="rv">\${v}</span></div>\`).join('');
    }catch(e){}
  }
  refresh();setInterval(refresh,3000);
</script>
</body>
</html>`);
});

app.get('/health', (req, res) => {
  res.status(200).send({ status: 'UP' });
});

// ─── New routes ───────────────────────────────────────────────────────────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/api/stats', (req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    nodeVersion: process.version,
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpuLoad: os.loadavg(),
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});

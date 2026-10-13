const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const appName = process.env.APP_NAME || 'DevSprint Container';

// Database setup
let pool = null;
if (process.env.DATABASE_URL) {
  const isSupabase = process.env.DATABASE_URL.includes('supabase.com');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
    max: 5, // keep pool small for Cloud Run instances
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

app.use(express.json());

// UI dashboard
app.get('/', async (req, res) => {
  let dbStatus = {
    connected: false,
    user: 'N/A',
    schema: 'N/A',
    error: null,
  };

  if (pool) {
    try {
      const result = await pool.query('SELECT current_user, current_schema();');
      dbStatus.connected = true;
      dbStatus.user = result.rows[0].current_user;
      dbStatus.schema = result.rows[0].current_schema;
    } catch (err) {
      dbStatus.error = err.message;
    }
  } else {
    dbStatus.error = 'DATABASE_URL is not set';
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --success: #22c55e;
      --danger: #ef4444;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .badge-online { background: rgba(34, 197, 94, 0.15); color: var(--success); border: 1px solid var(--success); }
    .badge-error { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid var(--danger); }
    h1 { font-size: 1.75rem; margin-bottom: 8px; color: var(--text); }
    p.subtitle { color: var(--text-muted); margin-bottom: 24px; font-size: 0.95rem; }
    .status-box {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
      border: 1px solid var(--border);
    }
    .status-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 0.9rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .status-row:last-child { border-bottom: none; }
    .label { color: var(--text-muted); }
    .val { font-weight: 600; color: var(--accent); }
    .val-error { color: var(--danger); font-size: 0.85rem; word-break: break-all; }
    .footer {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-align: center;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge ${dbStatus.connected ? 'badge-online' : 'badge-error'}">
      ${dbStatus.connected ? '● Database Connected' : '✕ Database Not Ready'}
    </div>
    <h1>${appName}</h1>
    <p class="subtitle">Cloud Run Container &middot; Isolated Supabase Schema</p>

    <div class="status-box">
      <div class="status-row">
        <span class="label">Container Port</span>
        <span class="val">${port}</span>
      </div>
      <div class="status-row">
        <span class="label">Database User</span>
        <span class="val">${dbStatus.user}</span>
      </div>
      <div class="status-row">
        <span class="label">Isolated Schema</span>
        <span class="val">${dbStatus.schema}</span>
      </div>
      ${dbStatus.error ? `
      <div class="status-row">
        <span class="label">Error</span>
        <span class="val-error">${dbStatus.error}</span>
      </div>` : ''}
    </div>

    <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
      Every <code>git push</code> to this branch triggers an automated Google Cloud Build and redeploys this Cloud Run container.
    </p>

    <div class="footer">
      DevSprint Environment &middot; ${new Date().toUTCString()}
    </div>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// JSON Health check endpoint for Cloud Run
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    appName,
    port,
  });
});

// JSON DB status
app.get('/api/db-status', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ status: 'error', message: 'DATABASE_URL not configured' });
  }
  try {
    const result = await pool.query('SELECT current_user, current_schema(), now() as db_time;');
    res.json({
      status: 'connected',
      user: result.rows[0].current_user,
      schema: result.rows[0].current_schema,
      dbTime: result.rows[0].db_time,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.listen(port, () => {
  console.log(`[${appName}] Listening on port ${port}`);
});

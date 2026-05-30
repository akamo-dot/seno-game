const DB_BINDING = 'SENO_DB';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

async function all(db, sql, binds = []) {
  const stmt = db.prepare(sql);
  const result = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return result.results || [];
}

async function count(db, eventType) {
  const row = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM counter_events
    WHERE event_type = ?
  `).bind(eventType).first();
  return Number((row && row.count) || 0);
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function isAuthorized(request, env) {
  const token = env && env.ADMIN_TOKEN;
  if (!token) return { ok: false, status: 503, error: 'ADMIN_TOKEN is not configured' };

  const auth = request.headers.get('Authorization') || '';
  const prefix = 'Bearer ';
  if (!auth.startsWith(prefix)) {
    return { ok: false, status: 401, error: 'Admin token is required' };
  }

  const supplied = auth.slice(prefix.length).trim();
  if (!constantTimeEqual(supplied, token)) {
    return { ok: false, status: 401, error: 'Invalid admin token' };
  }

  return { ok: true };
}

// Admin stats are protected by a Bearer token stored as ADMIN_TOKEN.
// The admin HTML may be public, but this endpoint must not return data without the token.
export async function onRequestGet({ request, env }) {
  const auth = isAuthorized(request, env);
  if (!auth.ok) {
    const headers = auth.status === 401 ? { 'www-authenticate': 'Bearer realm="SENO admin stats"' } : {};
    return json({ error: auth.error }, auth.status, headers);
  }

  const db = env && env[DB_BINDING];
  if (!db) return json({ error: 'D1 binding SENO_DB is not configured' }, 503);

  const [
    visitsTotal,
    playsTotal,
    visitCountries,
    playCountries,
    dailyVisits,
    dailyPlays,
    outcomes,
    recentPlays
  ] = await Promise.all([
    count(db, 'visit'),
    count(db, 'play'),
    all(db, `
      SELECT country_code AS code, COUNT(*) AS count
      FROM counter_events
      WHERE event_type = 'visit'
      GROUP BY country_code
      ORDER BY count DESC, code ASC
      LIMIT 64
    `),
    all(db, `
      SELECT country_code AS code, COUNT(*) AS count
      FROM counter_events
      WHERE event_type = 'play'
      GROUP BY country_code
      ORDER BY count DESC, code ASC
      LIMIT 64
    `),
    all(db, `
      SELECT date(created_at) AS day, COUNT(*) AS count
      FROM counter_events
      WHERE event_type = 'visit'
        AND created_at >= datetime('now', '-30 days')
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `),
    all(db, `
      SELECT date(created_at) AS day, COUNT(*) AS count
      FROM counter_events
      WHERE event_type = 'play'
        AND created_at >= datetime('now', '-30 days')
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `),
    all(db, `
      SELECT outcome, COUNT(*) AS count
      FROM counter_events
      WHERE event_type = 'play'
      GROUP BY outcome
      ORDER BY outcome ASC
    `),
    all(db, `
      SELECT country_code AS code, created_at AS createdAt
      FROM counter_events
      WHERE event_type = 'play'
      ORDER BY created_at DESC
      LIMIT 20
    `)
  ]);

  return json({
    visitsTotal,
    playsTotal,
    visitCountries: visitCountries.map(row => ({ code: row.code, count: Number(row.count || 0) })),
    playCountries: playCountries.map(row => ({ code: row.code, count: Number(row.count || 0) })),
    dailyVisits: dailyVisits.map(row => ({ day: row.day, count: Number(row.count || 0) })),
    dailyPlays: dailyPlays.map(row => ({ day: row.day, count: Number(row.count || 0) })),
    outcomes: outcomes.map(row => ({ outcome: row.outcome, count: Number(row.count || 0) })),
    recentPlays: recentPlays.map(row => ({ code: row.code, createdAt: row.createdAt }))
  });
}

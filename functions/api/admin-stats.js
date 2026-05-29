const DB_BINDING = 'SENO_DB';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
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

// Protect /api/admin-stats with Cloudflare Access before production use.
// This endpoint is intended for the private admin screen only.
export async function onRequestGet({ env }) {
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

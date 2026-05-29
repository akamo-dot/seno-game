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

function getDb(env) {
  return env && env[DB_BINDING];
}

function getCountry(request) {
  const code = request.cf && request.cf.country;
  return /^[A-Z]{2}$/.test(code || '') ? code : 'XX';
}

async function readCounter(db) {
  const totalRow = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM counter_events
    WHERE event_type = 'play'
  `).first();

  const countries = await db.prepare(`
    SELECT country_code AS code, COUNT(*) AS count
    FROM counter_events
    WHERE event_type = 'play'
    GROUP BY country_code
    ORDER BY count DESC, code ASC
    LIMIT 64
  `).all();

  const recent = await db.prepare(`
    SELECT country_code AS code
    FROM counter_events
    WHERE event_type = 'play'
    ORDER BY created_at DESC
    LIMIT 12
  `).all();

  return {
    total: Number((totalRow && totalRow.count) || 0),
    countries: (countries.results || []).map(row => ({
      code: row.code,
      count: Number(row.count || 0)
    })),
    recent: (recent.results || []).map(row => ({ code: row.code }))
  };
}

export async function onRequestGet({ env }) {
  const db = getDb(env);
  if (!db) return json({ error: 'D1 binding SENO_DB is not configured' }, 503);
  return json(await readCounter(db));
}

export async function onRequestPost({ request, env }) {
  const db = getDb(env);
  if (!db) return json({ error: 'D1 binding SENO_DB is not configured' }, 503);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (body.mode !== 'over') {
    return json({ error: 'mode must be over' }, 400);
  }
  if (body.outcome !== 'win' && body.outcome !== 'draw') {
    return json({ error: 'outcome must be win or draw' }, 400);
  }

  await db.prepare(`
    INSERT INTO counter_events (event_type, country_code, mode, outcome, created_at)
    VALUES ('play', ?, 'over', ?, datetime('now'))
  `).bind(getCountry(request), body.outcome).run();

  return json(await readCounter(db));
}

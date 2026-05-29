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

function getCountry(request) {
  const code = request.cf && request.cf.country;
  return /^[A-Z]{2}$/.test(code || '') ? code : 'XX';
}

export async function onRequestPost({ request, env }) {
  const db = env && env[DB_BINDING];
  if (!db) return json({ error: 'D1 binding SENO_DB is not configured' }, 503);

  await db.prepare(`
    INSERT INTO counter_events (event_type, country_code, mode, outcome, created_at)
    VALUES ('visit', ?, NULL, NULL, datetime('now'))
  `).bind(getCountry(request)).run();

  return json({ ok: true });
}

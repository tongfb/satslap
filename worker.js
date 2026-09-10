const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function cleanName(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 20);
}

function validScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 50000 && value % 108 === 0;
}

function sameOrigin(request, url) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

async function getHallOfFame(env) {
  const { results = [] } = await env.DB
    .prepare('SELECT name, score FROM scores ORDER BY score DESC, rowid ASC LIMIT 10')
    .all();

  return json({ scores: results });
}

async function saveScore(request, env, url) {
  if (!sameOrigin(request, url)) return json({ error: 'forbidden' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const name = cleanName(body?.name);
  const score = Number(body?.score);

  if (!name || name.length > 20) return json({ error: 'invalid_name' }, 400);
  if (!validScore(score)) return json({ error: 'invalid_score' }, 400);

  await env.DB.prepare(`
    INSERT INTO scores (name, score)
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET
      score = CASE
        WHEN excluded.score > scores.score THEN excluded.score
        ELSE scores.score
      END
  `).bind(name, score).run();

  const saved = await env.DB
    .prepare('SELECT name, score FROM scores WHERE name = ? COLLATE NOCASE')
    .bind(name)
    .first();

  return json({ ok: true, entry: saved });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/hall-of-fame' && request.method === 'GET') {
        return await getHallOfFame(env);
      }

      if (url.pathname === '/api/score' && request.method === 'POST') {
        return await saveScore(request, env, url);
      }

      if (url.pathname.startsWith('/api/')) {
        return json({ error: 'not_found' }, 404);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: 'server_error' }, 500);
    }
  }
};

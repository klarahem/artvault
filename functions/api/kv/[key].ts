export async function onRequest(context: any) {
  const key = context.params?.key;
  if (!key) {
    return new Response('Missing key', { status: 400 });
  }

  const db = context.env?.DB;
  if (!db) {
    return new Response('Database not configured', { status: 500 });
  }

  const method = context.request.method.toUpperCase();

  if (method === 'GET') {
    const row = await db.prepare('SELECT value FROM kv WHERE key = ?').bind(key).first();
    if (!row) {
      return new Response('Not found', { status: 404 });
    }

    return new Response(row.value, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }

  if (method === 'PUT' || method === 'POST') {
    const bodyText = await context.request.text();
    if (!bodyText) {
      return new Response('Missing body', { status: 400 });
    }

    await db
      .prepare(
        'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
      )
      .bind(key, bodyText, new Date().toISOString())
      .run();

    return new Response('OK', { status: 200 });
  }

  if (method === 'DELETE') {
    await db.prepare('DELETE FROM kv WHERE key = ?').bind(key).run();
    return new Response('OK', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
}

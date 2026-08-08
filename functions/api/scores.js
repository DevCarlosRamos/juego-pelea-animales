'use strict';
// Pages Function: GET /api/scores y POST /api/scores
// Usa la base de datos D1 (SQLite serverless de Cloudflare) enlazada como `DB`.

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 10));

  const { results } = await context.env.DB
    .prepare('SELECT id, player_name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT ?')
    .bind(limit)
    .all();

  return Response.json({ scores: results });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (err) {
    return Response.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  let name = typeof body.playerName === 'string' ? body.playerName.trim() : '';
  name = name.slice(0, 20);
  if (!name) name = 'Anónimo';

  const score = parseInt(body.score, 10);
  if (Number.isNaN(score) || score < 0) {
    return Response.json({ error: 'El campo score debe ser un número >= 0' }, { status: 400 });
  }

  const info = await context.env.DB
    .prepare('INSERT INTO scores (player_name, score) VALUES (?, ?)')
    .bind(name, score)
    .run();

  const id = info.meta && info.meta.last_row_id;
  const { results } = await context.env.DB
    .prepare('SELECT id, player_name, score, created_at FROM scores WHERE id = ?')
    .bind(id)
    .all();

  return Response.json(results[0] || { id, player_name: name, score }, { status: 201 });
}

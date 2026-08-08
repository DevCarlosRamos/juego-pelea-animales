'use strict';
// Pages Function: GET /api/health
export async function onRequestGet(context) {
  return Response.json({
    status: 'ok',
    platform: 'cloudflare-pages',
    game: 'pelea-animales',
    time: new Date().toISOString()
  });
}

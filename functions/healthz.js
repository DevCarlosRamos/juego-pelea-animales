'use strict';
// Pages Function: GET /healthz (healthcheck de la app)
export function onRequestGet() {
  return new Response('ok\n', {
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

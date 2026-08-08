'use strict';
// Middleware de Pages Functions: cabeceras de seguridad en /api/* y /healthz
export async function onRequest(context) {
  const response = await context.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}

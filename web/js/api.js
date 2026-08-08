'use strict';
/* Cliente de la API de puntuaciones (Cloudflare Pages Functions + D1) */
(function () {
  const BASE = '/api';

  async function request(path, options) {
    const res = await fetch(BASE + path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  window.API = {
    async postScore(playerName, score) {
      return request('/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName, score: score })
      });
    },
    async getScores(limit) {
      return request('/scores?limit=' + (limit || 10));
    }
  };
})();

-- Esquema de la base de datos D1 de PELEA CON ANIMALES (SQLite serverless de Cloudflare)
-- Aplicado por: wrangler d1 execute pelea-animales-db --remote --file=d1/schema.sql

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_scores_score ON scores (score DESC, created_at ASC);

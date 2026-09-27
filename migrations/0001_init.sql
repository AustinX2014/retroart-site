CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  server_name TEXT NOT NULL,
  official_faction TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nick TEXT NOT NULL,
  player_class TEXT NOT NULL,
  rank TEXT NOT NULL,
  msg TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO settings (id, server_name, official_faction)
VALUES (1, 'ATHILA', 'elyos');

INSERT INTO players (nick, player_class, rank, msg)
SELECT 'Ares', 'Gladiador / Templario', 'Veterano AION', 'Tanque principal para Raids'
WHERE NOT EXISTS (SELECT 1 FROM players WHERE nick = 'Ares');

INSERT INTO players (nick, player_class, rank, msg)
SELECT 'Luna', 'Clérigo / Canto', 'Experiencia en MMOs', 'Main Healer'
WHERE NOT EXISTS (SELECT 1 FROM players WHERE nick = 'Luna');

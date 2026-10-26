-- Memorix — esquema do banco `banco_memorix` (PostgreSQL 13+)
-- Execute no pgAdmin 4 (Query Tool) conectado ao banco banco_memorix.

CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname    VARCHAR(16) NOT NULL CHECK (char_length(btrim(nickname)) BETWEEN 3 AND 16),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Apelido único sem diferenciar maiúsculas/minúsculas (reaproveita o jogador).
CREATE UNIQUE INDEX IF NOT EXISTS ux_players_nickname_lower ON players (lower(nickname));

CREATE TABLE IF NOT EXISTS games (
  id                  UUID PRIMARY KEY,
  player_id           UUID NOT NULL REFERENCES players(id),
  token_hash          CHAR(64) NOT NULL,                       -- SHA-256 do token (o token em si nunca é salvo)
  status              VARCHAR(12) NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress','completed','failed','abandoned')),
  current_level       SMALLINT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  highest_level       SMALLINT NOT NULL DEFAULT 1 CHECK (highest_level BETWEEN 1 AND 5),
  lives_remaining     SMALLINT NOT NULL DEFAULT 3 CHECK (lives_remaining BETWEEN 0 AND 3),
  lives_lost          SMALLINT NOT NULL DEFAULT 0 CHECK (lives_lost >= 0),
  score               INTEGER  NOT NULL DEFAULT 0 CHECK (score >= 0),
  attempt_count       INTEGER  NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  current_sequence    SMALLINT[] NOT NULL,
  sequence_issued_at  TIMESTAMPTZ NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at         TIMESTAMPTZ,
  elapsed_time_ms     INTEGER CHECK (elapsed_time_ms > 0),
  is_completed        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_finished_consistency CHECK (
    (status = 'in_progress' AND finished_at IS NULL AND elapsed_time_ms IS NULL)
    OR (status <> 'in_progress' AND finished_at IS NOT NULL AND elapsed_time_ms IS NOT NULL)
  ),
  CONSTRAINT ck_completed_only_if_status CHECK (is_completed = (status = 'completed'))
);

CREATE TABLE IF NOT EXISTS game_levels (
  id              BIGSERIAL PRIMARY KEY,
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  level_number    SMALLINT NOT NULL CHECK (level_number BETWEEN 1 AND 5),
  attempts        INTEGER NOT NULL DEFAULT 0,
  mistakes        SMALLINT NOT NULL DEFAULT 0 CHECK (mistakes BETWEEN 0 AND 3),
  lives_remaining SMALLINT NOT NULL DEFAULT 3 CHECK (lives_remaining BETWEEN 0 AND 3),
  score_earned    INTEGER NOT NULL DEFAULT 0,
  completed       BOOLEAN NOT NULL DEFAULT FALSE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  UNIQUE (game_id, level_number)
);

-- Histórico de eventos (auditoria da partida)
CREATE TABLE IF NOT EXISTS game_events (
  id           BIGSERIAL PRIMARY KEY,
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type   VARCHAR(16) NOT NULL
               CHECK (event_type IN ('start','wrong','level_up','victory','game_over','abandon')),
  level_number SMALLINT NOT NULL,
  detail       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice que espelha EXATAMENTE a ordenação do ranking (somente partidas finalizadas)
CREATE INDEX IF NOT EXISTS ix_games_ranking
  ON games (highest_level DESC, score DESC, elapsed_time_ms ASC, finished_at ASC, id ASC)
  WHERE status <> 'in_progress';
CREATE INDEX IF NOT EXISTS ix_games_player ON games (player_id);
CREATE INDEX IF NOT EXISTS ix_games_status ON games (status);
CREATE INDEX IF NOT EXISTS ix_game_events_game ON game_events (game_id, created_at);

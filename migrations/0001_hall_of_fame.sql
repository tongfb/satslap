CREATE TABLE IF NOT EXISTS scores (
  name TEXT PRIMARY KEY COLLATE NOCASE,
  score INTEGER NOT NULL CHECK (score >= 0)
);

CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC);

CREATE TABLE IF NOT EXISTS generated_questions (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS exam_blueprints (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS exam_sessions (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS exam_sessions_status_created_idx ON exam_sessions(status,created_at);
ALTER TABLE generated_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON generated_questions,exam_blueprints,exam_sessions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON generated_questions,exam_blueprints,exam_sessions TO service_role;

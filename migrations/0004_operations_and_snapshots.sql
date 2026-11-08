CREATE TABLE IF NOT EXISTS operational_alerts (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('attendance','followup')), entity_id TEXT NOT NULL,
 owner_id TEXT NOT NULL REFERENCES staff(id), due_date TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL,
 target TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('open','resolved')), updated_at TEXT NOT NULL, resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS operations_runs (
 id TEXT PRIMARY KEY, trigger TEXT NOT NULL CHECK(trigger IN ('manual','scheduled')), as_of TEXT NOT NULL,
 ran_at TEXT NOT NULL, counts TEXT NOT NULL, actor_id TEXT REFERENCES staff(id)
);
CREATE TABLE IF NOT EXISTS report_snapshots (
 id TEXT PRIMARY KEY, snapshot_key TEXT NOT NULL UNIQUE, quarter_start TEXT NOT NULL, quarter_end TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('provisional','issued','issued_with_gaps')), created_by TEXT NOT NULL REFERENCES staff(id),
 created_at TEXT NOT NULL, notes TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS report_snapshot_no_update BEFORE UPDATE ON report_snapshots BEGIN SELECT RAISE(ABORT,'Saved report snapshots cannot be changed'); END;
CREATE TRIGGER IF NOT EXISTS report_snapshot_no_delete BEFORE DELETE ON report_snapshots BEGIN SELECT RAISE(ABORT,'Saved report snapshots cannot be deleted'); END;

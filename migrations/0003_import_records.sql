CREATE TABLE IF NOT EXISTS import_records (
 source_system TEXT NOT NULL,
 source_id TEXT NOT NULL,
 student_id TEXT NOT NULL REFERENCES students(id),
 guardian_id TEXT NOT NULL REFERENCES guardians(id),
 fingerprint TEXT NOT NULL,
 imported_by TEXT NOT NULL REFERENCES staff(id),
 imported_at TEXT NOT NULL,
 PRIMARY KEY(source_system,source_id)
);

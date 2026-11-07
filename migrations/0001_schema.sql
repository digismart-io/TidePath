PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS staff (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('manager','teacher')), password_hash TEXT NOT NULL, password_salt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES staff(id), expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY, name TEXT NOT NULL, neighborhood TEXT NOT NULL CHECK(neighborhood IN ('Little Havana','West Little River')));
CREATE TABLE IF NOT EXISTS guardians (id TEXT PRIMARY KEY, household_id TEXT NOT NULL REFERENCES households(id), name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', preferred_language TEXT NOT NULL DEFAULT 'English' CHECK(preferred_language IN ('English','Spanish','Haitian Creole')));
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, age INTEGER NOT NULL CHECK(age BETWEEN 0 AND 18), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS student_guardians (student_id TEXT NOT NULL REFERENCES students(id), guardian_id TEXT NOT NULL REFERENCES guardians(id), PRIMARY KEY(student_id,guardian_id));
CREATE TABLE IF NOT EXISTS programs (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, outcome_label TEXT NOT NULL, min_age INTEGER NOT NULL DEFAULT 11, max_age INTEGER NOT NULL DEFAULT 14);
CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, program_id TEXT NOT NULL REFERENCES programs(id), name TEXT NOT NULL, school TEXT NOT NULL, neighborhood TEXT NOT NULL, weekday TEXT NOT NULL, time TEXT NOT NULL, capacity INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS staff_groups (staff_id TEXT NOT NULL REFERENCES staff(id), group_id TEXT NOT NULL REFERENCES groups(id), PRIMARY KEY(staff_id,group_id));
CREATE TABLE IF NOT EXISTS enrollments (id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id), group_id TEXT NOT NULL REFERENCES groups(id), start_date TEXT NOT NULL, end_date TEXT, CHECK(end_date IS NULL OR end_date>=start_date), UNIQUE(student_id,group_id,start_date));
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id), date TEXT NOT NULL, topic TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','submitted','cancelled')), version INTEGER NOT NULL DEFAULT 0, edit_token TEXT NOT NULL DEFAULT '', submitted_by TEXT REFERENCES staff(id), submitted_at TEXT, UNIQUE(group_id,date));
CREATE TABLE IF NOT EXISTS attendance (session_id TEXT NOT NULL REFERENCES sessions(id), student_id TEXT NOT NULL REFERENCES students(id), status TEXT CHECK(status IN ('present','late','absent','excused')), updated_by TEXT REFERENCES staff(id), updated_at TEXT, PRIMARY KEY(session_id,student_id));
CREATE TABLE IF NOT EXISTS volunteers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mentor_matches (id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id), volunteer_id TEXT NOT NULL REFERENCES volunteers(id), start_date TEXT NOT NULL, end_date TEXT);
CREATE TABLE IF NOT EXISTS volunteer_hours (id TEXT PRIMARY KEY, volunteer_id TEXT NOT NULL REFERENCES volunteers(id), session_id TEXT NOT NULL REFERENCES sessions(id), hours REAL NOT NULL CHECK(hours>0 AND hours<=24), status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')), note TEXT NOT NULL DEFAULT '', UNIQUE(volunteer_id,session_id));
CREATE TABLE IF NOT EXISTS assessments (student_id TEXT NOT NULL REFERENCES students(id), program_id TEXT NOT NULL REFERENCES programs(id), phase TEXT NOT NULL CHECK(phase IN ('start','end')), score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5), recorded_at TEXT NOT NULL, PRIMARY KEY(student_id,program_id,phase));
CREATE TABLE IF NOT EXISTS followups (id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id), program_id TEXT NOT NULL REFERENCES programs(id), reason TEXT NOT NULL, owner_id TEXT NOT NULL REFERENCES staff(id), due_date TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('open','awaiting_reply','resolved')), next_action TEXT NOT NULL DEFAULT '', draft TEXT NOT NULL DEFAULT '', draft_source TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, resolved_at TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_followup ON followups(student_id,program_id) WHERE status!='resolved';
CREATE TABLE IF NOT EXISTS contact_events (id TEXT PRIMARY KEY, followup_id TEXT NOT NULL REFERENCES followups(id), kind TEXT NOT NULL CHECK(kind IN ('note','simulated_send','reply','resolution','assignment')), body TEXT NOT NULL, staff_id TEXT NOT NULL REFERENCES staff(id), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES staff(id), action TEXT NOT NULL, entity_id TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS sessions_group_date ON sessions(group_id,date);
CREATE INDEX IF NOT EXISTS followups_due ON followups(status,due_date);

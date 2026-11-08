-- Optional profile details; existing volunteers, matches and hours are retained.
ALTER TABLE volunteers ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE volunteers ADD COLUMN program_ids TEXT NOT NULL DEFAULT '[]';

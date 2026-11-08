-- Existing languages are unknown until staff record them; never infer from a name.
ALTER TABLE volunteers ADD COLUMN languages TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(languages) AND json_type(languages)='array');

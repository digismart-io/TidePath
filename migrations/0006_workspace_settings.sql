-- Preserve household IDs and links while allowing each organization to define its own service areas.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE households_new (id TEXT PRIMARY KEY,name TEXT NOT NULL,neighborhood TEXT NOT NULL);
INSERT INTO households_new SELECT id,name,neighborhood FROM households;
DROP TABLE households;
ALTER TABLE households_new RENAME TO households;
PRAGMA defer_foreign_keys = OFF;
INSERT OR IGNORE INTO settings(key,value) VALUES ('organization_name','Tidepath Family Alliance'),('service_areas','["Little Havana","West Little River"]'),('admin_version','0'),('admin_edit_token','');

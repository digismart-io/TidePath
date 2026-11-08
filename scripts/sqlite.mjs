import { DatabaseSync } from 'node:sqlite';
// D1-compatible adapter: the same Worker handlers run locally and in Cloudflare.
export function openDatabase(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  const DB = {
    prepare(sql) {
      let params = [];
      const statement = {
        bind(...values) { params = values; return statement; },
        async all() { return { results: sqlite.prepare(sql).all(...params), success: true }; },
        async first(column) { const row = sqlite.prepare(sql).get(...params); return column ? row?.[column] ?? null : row ?? null; },
        async run() { const info = sqlite.prepare(sql).run(...params); return { success: true, meta: { changes: Number(info.changes) } }; },
        _run() { return sqlite.prepare(sql).run(...params); }
      };
      return statement;
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = statements.map(s => { const r = s._run(); return { success: true, meta: { changes: Number(r.changes) } }; }); sqlite.exec('COMMIT'); return results; }
      catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    }
  };
  return { DB, sqlite, close: () => sqlite.close() };
}

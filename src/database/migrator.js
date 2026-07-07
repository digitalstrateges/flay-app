const fs = require('fs');
const path = require('path');
const eventBus = require('../core/event-bus');

class Migrator {
  constructor(db) {
    this.db = db;
    this.migrations = [];
  }

  async load() {
    const dir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); return; }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
    this.migrations = files.map(f => ({ name: f.replace('.js', ''), fn: require(path.join(dir, f)) }));
  }

  async run() {
    await this.ensureMetaTable();
    const applied = this.getApplied();
    for (const m of this.migrations) {
      if (applied.includes(m.name)) continue;
      console.log(`  [Migration] ${m.name}...`);
      try {
        await m.fn(this.db);
        this.record(m.name);
        eventBus.emit('migration:applied', { name: m.name });
      } catch (e) {
        console.error(`  [Migration] FAILED ${m.name}: ${e.message}`);
        throw e;
      }
    }
  }

  ensureMetaTable() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, applied_at TEXT DEFAULT (datetime('now')))`);
  }

  getApplied() {
    try {
      return this.db.query("SELECT name FROM _migrations ORDER BY id").map(r => r.name);
    } catch { return []; }
  }

  record(name) {
    try { this.db.run("INSERT INTO _migrations (name) VALUES (?)", [name]); } catch {}
  }
}

module.exports = Migrator;

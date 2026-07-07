const fs = require('fs');
const path = require('path');
const config = require('../config');

class Backup {
  constructor(db) {
    this.db = db;
    this.backupDir = path.join(config.DATA_DIR, 'backups');
    if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
  }

  create() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `flay-backup-${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);
    const data = { version: config.VERSION, timestamp, tables: {} };
    if (this.db.db) {
      const tables = this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_migrations' AND name NOT LIKE 'sqlite_%'");
      for (const { name } of tables) {
        data.tables[name] = this.db.query(`SELECT * FROM ${name}`);
      }
    } else {
      for (const [table, store] of this.db.tables) {
        data.tables[table] = Array.from(store.values());
      }
    }
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    this.cleanup(10);
    console.log(`  [Backup] Cree: ${filename} (${(fs.statSync(filepath).size / 1024).toFixed(1)} KB)`);
    return filepath;
  }

  list() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json')).sort().reverse();
  }

  restore(filename) {
    const filepath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filepath)) throw new Error(`Backup not found: ${filename}`);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    for (const [table, records] of Object.entries(data.tables)) {
      if (this.db.db) {
        this.db.exec(`DELETE FROM ${table}`);
        for (const record of records) {
          const keys = Object.keys(record);
          const vals = keys.map(k => typeof record[k] === 'object' ? JSON.stringify(record[k]) : record[k]);
          this.db.run(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, vals);
        }
      } else {
        const store = new Map();
        records.forEach(r => store.set(r.id, r));
        this.db.tables.set(table, store);
      }
    }
    console.log(`  [Backup] Restaure: ${filename} (${data.timestamp})`);
  }

  cleanup(keep = 10) {
    const backups = this.list();
    while (backups.length > keep) {
      const old = backups.pop();
      fs.unlinkSync(path.join(this.backupDir, old));
      console.log(`  [Backup] Nettoie: ${old}`);
    }
  }

  autoBackup() {
    this.create();
    setInterval(() => this.create(), 6 * 60 * 60 * 1000);
  }
}

module.exports = Backup;

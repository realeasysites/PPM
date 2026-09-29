const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'leads.sqlite');
let db;

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'];

function initDb() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      contacted_at  TEXT,
      status        TEXT    NOT NULL DEFAULT 'new',
      name          TEXT    NOT NULL,
      phone         TEXT    NOT NULL,
      email         TEXT,
      zip           TEXT    NOT NULL,
      town          TEXT,
      building_type TEXT,
      width         TEXT,
      length        TEXT,
      height        TEXT,
      use_case      TEXT,
      doors         TEXT,
      insulation    TEXT,
      install       TEXT,
      timeline      TEXT,
      message       TEXT,
      notes         TEXT,
      source_page   TEXT,
      ip            TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
  `);
  return db;
}

function getDb() {
  if (!db) initDb();
  return db;
}

function createLead(lead) {
  const stmt = getDb().prepare(`
    INSERT INTO leads (name, phone, email, zip, town, building_type, width, length, height,
      use_case, doors, insulation, install, timeline, message, source_page, ip)
    VALUES (@name, @phone, @email, @zip, @town, @building_type, @width, @length, @height,
      @use_case, @doors, @insulation, @install, @timeline, @message, @source_page, @ip)
  `);
  const info = stmt.run(lead);
  return getLead(info.lastInsertRowid);
}

function getLead(id) {
  return getDb().prepare('SELECT * FROM leads WHERE id = ?').get(id);
}

function listLeads({ status } = {}) {
  if (status && STATUSES.includes(status)) {
    return getDb().prepare('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC').all(status);
  }
  return getDb().prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
}

function updateLead(id, { status, notes }) {
  const lead = getLead(id);
  if (!lead) return null;
  const nextStatus = STATUSES.includes(status) ? status : lead.status;
  const nextNotes = typeof notes === 'string' ? notes.slice(0, 5000) : lead.notes;
  // Stamp the first time a lead moves out of "new" so response time can be tracked.
  const contactedAt = lead.contacted_at || (lead.status === 'new' && nextStatus !== 'new' ? new Date().toISOString() : null);
  getDb().prepare(`
    UPDATE leads SET status = ?, notes = ?, contacted_at = ?, updated_at = datetime('now') WHERE id = ?
  `).run(nextStatus, nextNotes, contactedAt, id);
  return getLead(id);
}

function deleteLead(id) {
  return getDb().prepare('DELETE FROM leads WHERE id = ?').run(id).changes > 0;
}

module.exports = { initDb, getDb, createLead, getLead, listLeads, updateLead, deleteLead, STATUSES };

const fs = require('node:fs');
const path = require('node:path');

const files = {
  tickets: path.join(process.cwd(), 'storage', 'tickets.json'),
  claims: path.join(process.cwd(), 'storage', 'claims.json'),
  cooldowns: path.join(process.cwd(), 'storage', 'cooldowns.json'),
  antispam: path.join(process.cwd(), 'storage', 'antispam.json'),
  pending: path.join(process.cwd(), 'storage', 'pending.json'),
  staffStats: path.join(process.cwd(), 'storage', 'staffStats.json'),
  sequence: path.join(process.cwd(), 'storage', 'sequence.json'),
  blacklist: path.join(process.cwd(), 'storage', 'blacklist.json')
};

function ensureStorage() {
  for (const file of Object.values(files)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, '{}', 'utf8');
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function readStore(name) {
  ensureStorage();
  return safeParse(fs.readFileSync(files[name], 'utf8'));
}

function writeStore(name, data) {
  ensureStorage();
  fs.writeFileSync(files[name], JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { files, ensureStorage, readStore, writeStore };

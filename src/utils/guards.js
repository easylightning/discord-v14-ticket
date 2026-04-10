const { readStore, writeStore } = require('./storage');
const { getOpenTicketsForUser, getOpenTicketForUserCategory } = require('./ticketStore');

function validateTicketAttempt(config, userId, categoryValue) {
  const now = Date.now();

  if (config.cooldown?.enabled) {
    const cooldowns = readStore('cooldowns');
    const nextAllowedAt = cooldowns[userId] || 0;
    if (nextAllowedAt > now) {
      return { ok: false, type: 'cooldown', until: nextAllowedAt };
    }

    const openTickets = getOpenTicketsForUser(userId);
    if (openTickets.length >= (config.cooldown.maxOpenTicketsPerUser || 1)) {
      return { ok: false, type: 'open_limit', count: openTickets.length };
    }

    if (config.cooldown.sameCategoryBlock) {
      const existing = getOpenTicketForUserCategory(userId, categoryValue);
      if (existing) return { ok: false, type: 'same_category', ticket: existing };
    }
  }

  if (config.antiSpam?.enabled) {
    const anti = readStore('antispam');
    const state = anti[userId] || { attempts: [], blockedUntil: 0 };
    if (state.blockedUntil > now) return { ok: false, type: 'blocked', until: state.blockedUntil };
  }

  return { ok: true };
}

function registerTicketAttempt(config, userId) {
  const now = Date.now();

  if (config.cooldown?.enabled) {
    const cooldowns = readStore('cooldowns');
    cooldowns[userId] = now + ((config.cooldown.seconds || 60) * 1000);
    writeStore('cooldowns', cooldowns);
  }

  if (config.antiSpam?.enabled) {
    const anti = readStore('antispam');
    const state = anti[userId] || { attempts: [], blockedUntil: 0 };
    const windowMs = (config.antiSpam.windowSeconds || 300) * 1000;
    const blockMs = (config.antiSpam.blockSeconds || 1800) * 1000;

    state.attempts = (state.attempts || []).filter((timestamp) => now - timestamp < windowMs);
    state.attempts.push(now);

    if (state.attempts.length >= (config.antiSpam.maxAttempts || 4)) {
      state.blockedUntil = now + blockMs;
      state.attempts = [];
    }

    anti[userId] = state;
    writeStore('antispam', anti);
  }
}

function savePendingTicket(key, data) {
  const pending = readStore('pending');
  pending[key] = data;
  writeStore('pending', pending);
}

function getPendingTicket(key) {
  return readStore('pending')[key] || null;
}

function removePendingTicket(key) {
  const pending = readStore('pending');
  delete pending[key];
  writeStore('pending', pending);
}

module.exports = {
  validateTicketAttempt,
  registerTicketAttempt,
  savePendingTicket,
  getPendingTicket,
  removePendingTicket
};

const { readStore, writeStore } = require('./storage');

function getStore() {
  const store = readStore('staffStats');
  if (!store.users) store.users = {};
  if (!Array.isArray(store.recentActions)) store.recentActions = [];
  return store;
}

function saveStore(store) {
  writeStore('staffStats', store);
}

function ensureUser(store, userId, defaults = {}) {
  if (!store.users[userId]) {
    store.users[userId] = {
      userId,
      tag: defaults.tag || 'Unknown',
      displayName: defaults.displayName || defaults.tag || userId,
      claims: 0,
      unclaims: 0,
      closes: 0,
      ticketMessages: 0,
      addedMembers: 0,
      removedMembers: 0,
      firstResponseCount: 0,
      firstResponseTotalMs: 0,
      claimResponseCount: 0,
      claimResponseTotalMs: 0,
      lastActionAt: null,
      lastTicketId: null,
      history: []
    };
  }

  if (defaults.tag) store.users[userId].tag = defaults.tag;
  if (defaults.displayName) store.users[userId].displayName = defaults.displayName;

  return store.users[userId];
}

function pushHistory(target, entry, limit = 1000) {
  // Keep enough history for monthly and future leaderboard views.
  target.history.unshift(entry);
  if (target.history.length > limit) target.history.length = limit;
}

function pushRecent(store, entry, limit = 100) {
  store.recentActions.unshift(entry);
  if (store.recentActions.length > limit) store.recentActions.length = limit;
}

function getPeriodStart(period) {
  const now = new Date();
  const start = new Date(now);

  if (period === 'daily') {
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }

  if (period === 'weekly') {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }

  if (period === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }

  return 0;
}

function summarizeUserStats(stats, period = 'daily') {
  const startAt = getPeriodStart(period);
  const summary = {
    userId: stats.userId,
    tag: stats.tag,
    displayName: stats.displayName,
    claims: 0,
    unclaims: 0,
    closes: 0,
    ticketMessages: 0,
    addedMembers: 0,
    removedMembers: 0,
    firstResponseCount: 0,
    firstResponseTotalMs: 0,
    claimResponseCount: 0,
    claimResponseTotalMs: 0,
    averageFirstResponseMs: null,
    averageClaimResponseMs: null,
    lastActionAt: null,
    lastTicketId: null,
    history: []
  };

  for (const entry of stats.history || []) {
    if ((entry.at || 0) < startAt) continue;
    summary.history.push(entry);
    summary.lastActionAt = summary.lastActionAt || entry.at || null;
    summary.lastTicketId = summary.lastTicketId || entry.ticketId || null;

    switch (entry.action) {
      case 'claim':
        summary.claims += 1;
        break;
      case 'unclaim':
        summary.unclaims += 1;
        break;
      case 'close':
        summary.closes += 1;
        break;
      case 'ticket_message':
        summary.ticketMessages += 1;
        break;
      case 'member_add':
        summary.addedMembers += Number(entry.count || 1);
        break;
      case 'member_remove':
        summary.removedMembers += Number(entry.count || 1);
        break;
      case 'first_response':
        summary.firstResponseCount += 1;
        summary.firstResponseTotalMs += Number(entry.durationMs || 0);
        break;
      case 'claim_response':
        summary.claimResponseCount += 1;
        summary.claimResponseTotalMs += Number(entry.durationMs || 0);
        break;
      default:
        break;
    }
  }

  summary.averageFirstResponseMs = summary.firstResponseCount ? Math.round(summary.firstResponseTotalMs / summary.firstResponseCount) : null;
  summary.averageClaimResponseMs = summary.claimResponseCount ? Math.round(summary.claimResponseTotalMs / summary.claimResponseCount) : null;

  return summary;
}

function recordStaffAction(userId, meta, action, ticketId, extra = {}) {
  const store = getStore();
  const stats = ensureUser(store, userId, meta);
  const entry = {
    action,
    ticketId,
    at: Date.now(),
    ...extra
  };

  switch (action) {
    case 'claim':
      stats.claims += 1;
      break;
    case 'unclaim':
      stats.unclaims += 1;
      break;
    case 'close':
      stats.closes += 1;
      break;
    case 'ticket_message':
      stats.ticketMessages += 1;
      break;
    case 'member_add':
      stats.addedMembers += Number(extra.count || 1);
      break;
    case 'member_remove':
      stats.removedMembers += Number(extra.count || 1);
      break;
    case 'first_response':
      stats.firstResponseCount += 1;
      stats.firstResponseTotalMs += Number(extra.durationMs || 0);
      break;
    case 'claim_response':
      stats.claimResponseCount += 1;
      stats.claimResponseTotalMs += Number(extra.durationMs || 0);
      break;
    default:
      break;
  }

  stats.lastActionAt = entry.at;
  stats.lastTicketId = ticketId || stats.lastTicketId || null;
  pushHistory(stats, entry);
  pushRecent(store, { userId, tag: stats.tag, displayName: stats.displayName, ...entry });
  saveStore(store);
  return stats;
}

function getStaffStats(userId) {
  return getStore().users[userId] || null;
}

function getStaffStatsByPeriod(userId, period = 'daily') {
  const stats = getStaffStats(userId);
  return stats ? summarizeUserStats(stats, period) : null;
}

function getAllStaffStats() {
  return Object.values(getStore().users);
}

function getAllStaffStatsByPeriod(period = 'daily') {
  return getAllStaffStats().map((stats) => summarizeUserStats(stats, period));
}

function getRecentActions(limit = 10) {
  return getStore().recentActions.slice(0, limit);
}

function getRecentActionsByPeriod(period = 'daily', limit = 10) {
  const startAt = getPeriodStart(period);
  return getRecentActions(500).filter((entry) => (entry.at || 0) >= startAt).slice(0, limit);
}

function getLeaderboardByPeriod(period = 'daily') {
  return getAllStaffStatsByPeriod(period)
    .filter((stats) => stats.claims || stats.closes || stats.ticketMessages || stats.addedMembers || stats.removedMembers || stats.firstResponseCount || stats.claimResponseCount)
    .map((stats) => ({
      ...stats,
      score:
        (stats.claims * 5) +
        (stats.closes * 8) +
        (stats.ticketMessages * 1) +
        (stats.addedMembers * 2) +
        (stats.removedMembers * 2) +
        (stats.firstResponseCount * 4) +
        (stats.claimResponseCount * 3)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.closes !== a.closes) return b.closes - a.closes;
      if (b.claims !== a.claims) return b.claims - a.claims;
      return b.ticketMessages - a.ticketMessages;
    });
}

module.exports = {
  recordStaffAction,
  getStaffStats,
  getStaffStatsByPeriod,
  getAllStaffStats,
  getAllStaffStatsByPeriod,
  getRecentActions,
  getRecentActionsByPeriod,
  getLeaderboardByPeriod
};

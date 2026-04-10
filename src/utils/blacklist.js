const { readStore, writeStore } = require('./storage');

function getBlacklist() {
  return readStore('blacklist');
}

function getBlacklistEntry(userId) {
  return getBlacklist()[userId] || null;
}

function setBlacklistEntry(userId, data) {
  const store = getBlacklist();
  store[userId] = {
    userId,
    ...data,
    updatedAt: Date.now()
  };
  writeStore('blacklist', store);
  return store[userId];
}

function removeBlacklistEntry(userId) {
  const store = getBlacklist();
  delete store[userId];
  writeStore('blacklist', store);
}

function getBlacklistEntries() {
  return Object.values(getBlacklist());
}

module.exports = {
  getBlacklist,
  getBlacklistEntry,
  setBlacklistEntry,
  removeBlacklistEntry,
  getBlacklistEntries
};

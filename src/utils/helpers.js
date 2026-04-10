const { ButtonStyle } = require('discord.js');

function hexToNumber(hex) {
  return Number.parseInt(String(hex || '#5865F2').replace('#', ''), 16);
}

function styleFromName(name) {
  const map = {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger,
    Link: ButtonStyle.Link
  };
  return map[name] || ButtonStyle.Secondary;
}

function sanitizeForumName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 95) || `ticket-${Date.now()}`;
}

function relativeSeconds(ms) {
  return `<t:${Math.floor(ms / 1000)}:R>`;
}

function hasAnyRole(member, roleIds = []) {
  if (!Array.isArray(roleIds) || !roleIds.length) return false;
  return member?.roles?.cache?.some((role) => roleIds.includes(role.id)) || false;
}

function trimText(text, max = 4000) {
  const value = String(text || '');
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function chunkText(lines, max = 1900) {
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + line + '\n').length > max) {
      if (current) chunks.push(current);
      current = `${line}\n`;
    } else {
      current += `${line}\n`;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours) return `${hours}s ${minutes}d ${seconds}sn`;
  if (minutes) return `${minutes}d ${seconds}sn`;
  return `${seconds}sn`;
}

module.exports = {
  hexToNumber,
  styleFromName,
  sanitizeForumName,
  relativeSeconds,
  hasAnyRole,
  trimText,
  chunkText,
  formatDuration
};

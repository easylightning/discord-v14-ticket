const fs = require('node:fs');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const { trimText } = require('./helpers');

let settings = null;
let combinedFile = null;
let errorFile = null;

function init(config) {
  settings = config.logging || {};
  const folder = path.join(process.cwd(), settings.folder || 'logs');
  fs.mkdirSync(folder, { recursive: true });
  combinedFile = path.join(folder, settings.combinedFile || 'combined.txt');
  errorFile = path.join(folder, settings.errorFile || 'errors.txt');

  if (!fs.existsSync(combinedFile)) fs.writeFileSync(combinedFile, '', 'utf8');
  if (!fs.existsSync(errorFile)) fs.writeFileSync(errorFile, '', 'utf8');
}

function serialize(value) {
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function write(file, level, scope, payload) {
  const line = `[${new Date().toISOString()}] [${level}] [${scope}] ${serialize(payload)}\n\n`;
  fs.appendFileSync(file, line, 'utf8');
  if (combinedFile && file !== combinedFile) fs.appendFileSync(combinedFile, line, 'utf8');
}

async function sendToDiscord(client, title, content) {
  try {
    const channelId = client?.config?.errorLogChannelId;
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const text = trimText(content, client.config.logging?.maxConsoleStack || 4000);
    if (text.length <= 1800) {
      await channel.send(`⚠️ **${title}**\n\n${text}`);
      return;
    }

    const filePath = path.join(process.cwd(), client.config.logging?.folder || 'logs', `error-${Date.now()}.txt`);
    fs.writeFileSync(filePath, content, 'utf8');
    await channel.send({ content: `⚠️ **${title}**`, files: [new AttachmentBuilder(filePath)] });
  } catch {
    // noop
  }
}

async function info(scope, payload) {
  write(combinedFile, 'INFO', scope, payload);
}

async function warn(scope, payload, client) {
  write(errorFile, 'WARN', scope, payload);
  await sendToDiscord(client, scope, serialize(payload));
}

async function error(scope, payload, client) {
  const text = serialize(payload);
  write(errorFile, 'ERROR', scope, text);
  console.error(`[${scope}]`, text);
  await sendToDiscord(client, scope, text);
}

module.exports = { init, info, warn, error };

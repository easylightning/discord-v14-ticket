const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('../config.json');
const { loadEvents } = require('./handlers/loadEvents');
const { loadCommands } = require('./handlers/loadCommands');
const { ensureStorage } = require('./utils/storage');
const logger = require('./utils/logger');

const folders = [
  'storage',
  config.transcripts?.folder || 'transcripts',
  config.logging?.folder || 'logs'
];

for (const folder of folders) {
  fs.mkdirSync(path.join(process.cwd(), folder), { recursive: true });
}

ensureStorage();
logger.init(config);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

client.commands = new Collection();
client.config = config;
client.logger = logger;

process.on('unhandledRejection', async (reason) => {
  await logger.error('UNHANDLED_REJECTION', reason, client).catch(() => null);
});

process.on('uncaughtException', async (error) => {
  await logger.error('UNCAUGHT_EXCEPTION', error, client).catch(() => null);
});

process.on('warning', async (warning) => {
  await logger.warn('PROCESS_WARNING', warning?.stack || String(warning), client).catch(() => null);
});

loadCommands(client);
loadEvents(client);

client.login(config.token).catch(async (error) => {
  await logger.error('LOGIN_FAILED', error, client).catch(() => null);
});

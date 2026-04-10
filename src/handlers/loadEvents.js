const fs = require('node:fs');
const path = require('node:path');

function loadEvents(client) {
  const eventPath = path.join(__dirname, '..', 'events');
  for (const file of fs.readdirSync(eventPath).filter((f) => f.endsWith('.js'))) {
    const event = require(path.join(eventPath, file));
    const runner = async (...args) => {
      try {
        await event.execute(...args, client);
      } catch (error) {
        await client.logger.error(`EVENT_${event.name.toUpperCase()}`, error, client).catch(() => null);
      }
    };

    if (event.once) client.once(event.name, runner);
    else client.on(event.name, runner);
  }
}

module.exports = { loadEvents };

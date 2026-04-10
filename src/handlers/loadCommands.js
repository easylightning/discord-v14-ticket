const fs = require('node:fs');
const path = require('node:path');

function loadCommands(client) {
  const commandPath = path.join(__dirname, '..', 'commands');
  for (const file of fs.readdirSync(commandPath).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(commandPath, file));
    client.commands.set(command.data.name, command);
  }
}

module.exports = { loadCommands };

const { ActivityType, REST, Routes } = require('discord.js');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    const rest = new REST({ version: '10' }).setToken(client.config.token);
    const body = [...client.commands.values()].map((command) => command.data.toJSON());

    await rest.put(
      Routes.applicationGuildCommands(client.config.clientId, client.config.guildId),
      { body }
    );

    client.user.setPresence({
      activities: [
        {
          name: 'CheatGlobal Ticket Sistem',
          type: ActivityType.Playing
        }
      ],
      status: 'online'
    });

    await client.logger.info('READY', `${client.user.tag} aktif. ${body.length} komut yüklendi.`, client);
    console.log(`${client.user.tag} aktif. ${body.length} komut yüklendi.`);
  }
};

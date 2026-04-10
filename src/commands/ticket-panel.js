const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildPanelMessage } = require('../utils/panel');
const { canManageBot } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Gelişmiş ticket panelini gönderir.'),
  async execute(interaction) {
    if (!canManageBot(interaction.member, interaction.user.id, interaction.client.config)) {
      await interaction.reply({ content: 'Bu komutu kullanma yetkin yok.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply({ content: 'Panel gönderiliyor...', flags: MessageFlags.Ephemeral });
    await interaction.channel.send(buildPanelMessage(interaction.client.config));
    await interaction.editReply({ content: 'Ticket paneli gönderildi.' });
  }
};

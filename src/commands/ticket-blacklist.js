const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { canManageBot } = require('../utils/permissions');
const { getBlacklistEntries, getBlacklistEntry, removeBlacklistEntry, setBlacklistEntry } = require('../utils/blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-blacklist')
    .setDescription('Ticket blacklist yonetimi')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Bir kullaniciyi ticket blacklistine ekler')
        .addUserOption((option) => option.setName('kullanici').setDescription('Blacklist eklenecek kullanici').setRequired(true))
        .addStringOption((option) => option.setName('sebep').setDescription('Blacklist sebebi').setRequired(false))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Bir kullaniciyi ticket blacklistinden cikarir')
        .addUserOption((option) => option.setName('kullanici').setDescription('Blacklistten cikacak kullanici').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Ticket blacklist listesini gosterir')
    ),
  async execute(interaction) {
    if (!canManageBot(interaction.member, interaction.user.id, interaction.client.config)) {
      await interaction.reply({ content: 'Bu komutu kullanma yetkin yok.', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const user = interaction.options.getUser('kullanici', true);
      const reason = interaction.options.getString('sebep') || 'Belirtilmedi';
      const entry = setBlacklistEntry(user.id, {
        tag: user.tag,
        reason,
        addedBy: interaction.user.id,
        addedByTag: interaction.user.tag,
        createdAt: Date.now()
      });
      await interaction.reply({ content: `${user.tag} blacklist eklendi. Sebep: ${entry.reason}`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === 'remove') {
      const user = interaction.options.getUser('kullanici', true);
      const existing = getBlacklistEntry(user.id);
      if (!existing) {
        await interaction.reply({ content: `${user.tag} blacklistte degil.`, flags: MessageFlags.Ephemeral });
        return;
      }
      removeBlacklistEntry(user.id);
      await interaction.reply({ content: `${user.tag} blacklistten cikarildi.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const entries = getBlacklistEntries();
    if (!entries.length) {
      await interaction.reply({ content: 'Ticket blacklist bos.', flags: MessageFlags.Ephemeral });
      return;
    }

    const lines = entries.slice(0, 25).map((entry) => `- <@${entry.userId}> | ${entry.tag || entry.userId} | Sebep: ${entry.reason || 'Belirtilmedi'}`);
    await interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
  }
};

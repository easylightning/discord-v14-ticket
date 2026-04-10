const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { canManageBot } = require('../utils/permissions');
const { getLeaderboardByPeriod } = require('../utils/adminStats');
const { formatDuration } = require('../utils/helpers');

function getPeriodLabel(period) {
  if (period === 'weekly') return 'Haftalik';
  if (period === 'monthly') return 'Aylik';
  return 'Gunluk';
}

function buildPeriodButtons(period) {
  const periods = [
    ['daily', 'Gunluk'],
    ['weekly', 'Haftalik'],
    ['monthly', 'Aylik']
  ];

  return new ActionRowBuilder().addComponents(
    ...periods.map(([value, label]) =>
      new ButtonBuilder()
        .setCustomId(`leaderboard:period:${value}`)
        .setLabel(label)
        .setStyle(value === period ? ButtonStyle.Primary : ButtonStyle.Secondary)
    )
  );
}

function buildLeaderboardPayload(config, period = 'daily') {
  const leaderboard = getLeaderboardByPeriod(period);
  const container = new ContainerBuilder().setAccentColor(parseInt(String(config.color || '#5865F2').replace('#', ''), 16));
  const intro = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('## Yetkili Leaderboard'),
      new TextDisplayBuilder().setContent(`${getPeriodLabel(period)} performans siralamasi aktif.`)
    );

  if (config.branding?.logoUrl) {
    intro.setThumbnailAccessory(new ThumbnailBuilder({ media: { url: config.branding.logoUrl } }));
  }

  container.addSectionComponents(intro);
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  if (!leaderboard.length) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${getPeriodLabel(period)} icin leaderboard verisi bulunmuyor.`));
  } else {
    const lines = leaderboard.slice(0, 15).map((stats, index) =>
      `${index + 1}. **${stats.displayName || stats.tag || stats.userId}**\nSkor: **${stats.score}** | Claim: **${stats.claims}** | Kapatma: **${stats.closes}** | Mesaj: **${stats.ticketMessages}**\nOrtalama Ilk Cevap: **${stats.averageFirstResponseMs ? formatDuration(stats.averageFirstResponseMs) : '-'}** | Ortalama Claim: **${stats.averageClaimResponseMs ? formatDuration(stats.averageClaimResponseMs) : '-'}**`
    );
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n\n')));
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents(buildPeriodButtons(period));

  return {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [container]
  };
}

module.exports = {
  buildLeaderboardPayload,
  data: new SlashCommandBuilder()
    .setName('staff-leaderboard')
    .setDescription('Yetkililerin gunluk, haftalik ve aylik performans siralamasini gosterir.'),
  async execute(interaction) {
    if (!canManageBot(interaction.member, interaction.user.id, interaction.client.config)) {
      await interaction.reply({ content: 'Bu komutu kullanma yetkin yok.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply(buildLeaderboardPayload(interaction.client.config, 'daily'));
  }
};

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
const { getAllStaffStatsByPeriod, getRecentActionsByPeriod, getStaffStatsByPeriod } = require('../utils/adminStats');
const { formatDuration } = require('../utils/helpers');

function formatAction(entry) {
  switch (entry.action) {
    case 'claim':
      return 'Ticket Sahiplenme';
    case 'unclaim':
      return 'Ticket Birakma';
    case 'close':
      return 'Ticket Kapatma';
    case 'member_add':
      return 'Uye Ekleme';
    case 'member_remove':
      return 'Uye Cikarma';
    default:
      return null;
  }
}

function getPeriodLabel(period) {
  if (period === 'weekly') return 'Haftalik';
  if (period === 'monthly') return 'Aylik';
  return 'Gunluk';
}

function buildPeriodButtons(period, targetUserId = 'all') {
  const periods = [
    ['daily', 'Gunluk'],
    ['weekly', 'Haftalik'],
    ['monthly', 'Aylik']
  ];

  return new ActionRowBuilder().addComponents(
    ...periods.map(([value, label]) =>
      new ButtonBuilder()
        .setCustomId(`adminstatus:period:${value}:${targetUserId}`)
        .setLabel(label)
        .setStyle(value === period ? ButtonStyle.Primary : ButtonStyle.Secondary)
    )
  );
}

function buildAdminStatusPayload(config, options = {}) {
  const period = options.period || 'daily';
  const targetUserId = options.targetUserId || 'all';
  const targetStats = targetUserId !== 'all' ? getStaffStatsByPeriod(targetUserId, period) : null;
  const recent = getRecentActionsByPeriod(period, 20).filter((entry) => formatAction(entry));
  const statsList = targetStats
    ? [targetStats]
    : getAllStaffStatsByPeriod(period)
      .filter((stats) => stats.claims || stats.closes || stats.ticketMessages || stats.addedMembers || stats.removedMembers)
      .sort((a, b) => (b.claims + b.closes + b.ticketMessages) - (a.claims + a.closes + a.ticketMessages));

  const container = new ContainerBuilder().setAccentColor(parseInt(String(config.color || '#5865F2').replace('#', ''), 16));
  const intro = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${targetStats ? 'Yetkili Detayi' : 'Admin Status'}`),
      new TextDisplayBuilder().setContent(`${getPeriodLabel(period)} veri gorunumu aktif. ${targetStats ? 'Secilen yetkiliye ait performans ozeti.' : 'Tum yetkili ekibinin donemsel istatistikleri.'}`)
    );

  if (config.branding?.logoUrl) {
    intro.setThumbnailAccessory(new ThumbnailBuilder({ media: { url: config.branding.logoUrl } }));
  }

  container.addSectionComponents(intro);
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  if (!statsList.length) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${getPeriodLabel(period)} icin yetkili istatistigi bulunmuyor.`));
  } else {
    const lines = statsList.slice(0, 10).map((stats, index) =>
      `${index + 1}. **${stats.displayName || stats.tag || stats.userId}**\nClaim: **${stats.claims}** | Kapatma: **${stats.closes}** | Ticket Mesaji: **${stats.ticketMessages}** | Uye Ekleme: **${stats.addedMembers}** | Uye Cikarma: **${stats.removedMembers}**\nOrtalama Ilk Cevap: **${stats.averageFirstResponseMs ? formatDuration(stats.averageFirstResponseMs) : '-'}** | Ortalama Claim: **${stats.averageClaimResponseMs ? formatDuration(stats.averageClaimResponseMs) : '-'}**`
    );
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n\n')));
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents(buildPeriodButtons(period, targetUserId));

  if (recent.length) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    const recentLines = recent.slice(0, 8).map((entry) => {
      const label = entry.displayName || entry.tag || entry.userId;
      const actionLabel = formatAction(entry);
      return `- **${label}** - **${actionLabel}** - <#${entry.ticketId}> - <t:${Math.floor(entry.at / 1000)}:R>`;
    }).join('\n');
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Son Hareketler\n${recentLines}`));
  }

  return {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [container]
  };
}

module.exports = {
  buildAdminStatusPayload,
  data: new SlashCommandBuilder()
    .setName('admin-status')
    .setDescription('Yetkili istatistiklerini ve admin durum raporunu gosterir.')
    .addUserOption((option) =>
      option.setName('yetkili')
        .setDescription('Detay gormek istedigin yetkili')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (interaction.client.config.adminStatus?.enabled === false) {
      await interaction.reply({ content: 'Admin status sistemi config uzerinden kapali.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (!canManageBot(interaction.member, interaction.user.id, interaction.client.config)) {
      await interaction.reply({ content: 'Bu komutu kullanma yetkin yok.', flags: MessageFlags.Ephemeral });
      return;
    }

    const targetUser = interaction.options.getUser('yetkili');
    await interaction.reply(buildAdminStatusPayload(interaction.client.config, {
      period: 'daily',
      targetUserId: targetUser?.id || 'all'
    }));
  }
};

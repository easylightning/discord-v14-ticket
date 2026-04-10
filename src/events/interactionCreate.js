const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  PermissionsBitField,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  OverwriteType
} = require('discord.js');
const { buildCategoryButtons, buildMemberManageMenu, buildStaffLogMessage } = require('../utils/panel');
const { sanitizeForumName, relativeSeconds, hasAnyRole, chunkText } = require('../utils/helpers');
const {
  validateTicketAttempt,
  registerTicketAttempt,
  savePendingTicket,
  getPendingTicket,
  removePendingTicket
} = require('../utils/guards');
const { getTicket, saveTicket, appendTicketHistory, getOpenTicketsForUser, getNextTicketNumber } = require('../utils/ticketStore');
const { createTranscript } = require('../utils/transcript');
const { canHandleTickets, canManageBot } = require('../utils/permissions');
const { recordStaffAction } = require('../utils/adminStats');
const { buildAdminStatusPayload } = require('../commands/admin-status');
const { buildLeaderboardPayload } = require('../commands/staff-leaderboard');
const { getBlacklistEntry } = require('../utils/blacklist');

function getCategory(config, value) {
  return config.categories.find((category) => category.value === value) || null;
}

function getClaimButton(config, claimed, disabled = false) {
  return new ButtonBuilder()
    .setCustomId(claimed ? 'ticket:unclaim' : 'ticket:claim')
    .setLabel(claimed ? config.tickets.unclaimButtonLabel : config.tickets.claimButtonLabel)
    .setEmoji(claimed ? config.tickets.unclaimButtonEmoji : config.tickets.claimButtonEmoji)
    .setStyle(claimed ? ButtonStyle.Secondary : ButtonStyle.Success)
    .setDisabled(disabled);
}

function getTicketControlRows(config, ticket, disabled = false) {
  if (ticket.closed) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:reopen')
          .setLabel('Geri Ac')
          .setEmoji('🔓')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ticket:delete')
          .setLabel('Sil')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger)
      )
    ];
  }

  const firstRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel(config.tickets.closeButtonLabel)
      .setEmoji(config.tickets.closeButtonEmoji)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    getClaimButton(config, Boolean(ticket.claimedBy), disabled),
    new ButtonBuilder()
      .setCustomId('ticket:manage:add')
      .setLabel('Üye Ekle')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('ticket:manage:remove')
      .setLabel('Üye Çıkar')
      .setEmoji('➖')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );

  return [firstRow];
}

function renderTicketContainer(config, ticket, category, interactionUser, disabled = false) {
  const guidance = (category?.guidance || []).map((item) => `- ${item}`).join('\n') || 'Belirtilmedi';
  const container = new ContainerBuilder().setAccentColor(config.color ? parseInt(config.color.replace('#', ''), 16) : 0x5865F2);

  const intro = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${category?.icon || '🎫'} ${category?.label || ticket.categoryLabel || 'Talep'}`),
      new TextDisplayBuilder().setContent(`### Ticket No\n#${ticket.ticketNumber || '0000'}`),
      new TextDisplayBuilder().setContent(`### Açan\n<@${ticket.ownerId}>`)
    );

  if (config.branding?.logoUrl) {
    intro.setThumbnailAccessory(new ThumbnailBuilder({ media: { url: config.branding.logoUrl } }));
  } else if (interactionUser) {
    intro.setThumbnailAccessory(new ThumbnailBuilder({ media: { url: interactionUser.displayAvatarURL() } }));
  }

  container.addSectionComponents(intro);
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### Forum İsmi\n${ticket.forumName || 'Belirtilmedi'}`)
  );

  const mentions = (config.ticketMentionRoleIds || []).map((id) => `<@&${id}>`).join(' ');
  if (mentions) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(mentions)
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### Başlık\n${ticket.subject || 'Belirtilmedi'}`),
    new TextDisplayBuilder().setContent(`### Detaylar\n${ticket.details || 'Belirtilmedi'}`),
    new TextDisplayBuilder().setContent(`### İstenilen Bilgiler\n${guidance}`)
  );

  if (ticket.claimedBy || ticket.closed) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  }

  if (ticket.claimedBy) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### Sahiplenen Yetkili\n<@${ticket.claimedBy}>`)
    );
  }

  if (ticket.closed) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### Durum\nKapatıldı`)
    );
  }

  if (config.branding?.footerText) {
    const createdLabel = new Date(ticket.createdAt || Date.now()).toLocaleString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'long'
    });
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${config.branding.footerText} • ${createdLabel}`)
    );
  }

  const controlRows = getTicketControlRows(config, ticket, disabled);
  for (const row of controlRows) {
    container.addActionRowComponents(row);
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container]
  };
}

async function replySafe(interaction, payload) {
  if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => null);
  return interaction.reply(payload).catch(() => null);
}

async function closeTicketChannel(channel, ticket, config) {
  if (channel.isThread()) {
    await channel.setLocked(true).catch(() => null);
    await channel.setArchived(true).catch(() => null);
    return;
  }

  const memberOverwriteIds = channel.permissionOverwrites.cache
    .filter((overwrite) => overwrite.type === OverwriteType.Member && overwrite.id !== channel.guild.id)
    .map((overwrite) => overwrite.id);

  const roleOverwriteIds = new Set([
    ...(config.supportRoleIds || []),
    ...(config.allowedClaimRoleIds || [])
  ]);

  if (ticket.ownerId) memberOverwriteIds.push(ticket.ownerId);

  for (const memberId of new Set(memberOverwriteIds)) {
    await channel.permissionOverwrites.edit(memberId, {
      SendMessages: false,
      AddReactions: false
    }).catch(() => null);
  }

  for (const roleId of roleOverwriteIds) {
    await channel.permissionOverwrites.edit(roleId, {
      SendMessages: false,
      AddReactions: false,
      ViewChannel: true,
      ReadMessageHistory: true
    }).catch(() => null);
  }

  const closedName = channel.name.startsWith('closed-') ? channel.name : `closed-${channel.name}`.slice(0, 100);
  if (closedName !== channel.name) {
    await channel.setName(closedName).catch(() => null);
  }
}

async function reopenTicketChannel(channel, ticket, config) {
  if (channel.isThread()) {
    await channel.setArchived(false).catch(() => null);
    await channel.setLocked(false).catch(() => null);
    return;
  }

  const memberOverwriteIds = channel.permissionOverwrites.cache
    .filter((overwrite) => overwrite.type === OverwriteType.Member && overwrite.id !== channel.guild.id)
    .map((overwrite) => overwrite.id);

  if (ticket.ownerId) memberOverwriteIds.push(ticket.ownerId);

  for (const memberId of new Set(memberOverwriteIds)) {
    await channel.permissionOverwrites.edit(memberId, {
      SendMessages: true,
      AddReactions: true,
      ViewChannel: true,
      ReadMessageHistory: true
    }).catch(() => null);
  }

  for (const roleId of new Set([...(config.supportRoleIds || []), ...(config.allowedClaimRoleIds || [])])) {
    await channel.permissionOverwrites.edit(roleId, {
      SendMessages: true,
      AddReactions: true,
      ViewChannel: true,
      ReadMessageHistory: true
    }).catch(() => null);
  }

  const reopenedName = channel.name.replace(/^closed-/, '') || `ticket-${ticket.ticketNumber || '0000'}`;
  if (reopenedName !== channel.name) {
    await channel.setName(reopenedName.slice(0, 100)).catch(() => null);
  }
}

async function syncOpenTicketsForUser(client, guild, userId) {
  const openTickets = getOpenTicketsForUser(userId);

  for (const ticket of openTickets) {
    const channel = await client.channels.fetch(ticket.threadId).catch(() => null);

    if (!channel || channel.guild?.id !== guild.id) {
      saveTicket(ticket.threadId, {
        closed: true,
        closedAt: Date.now(),
        closedBy: client.user?.id || 'system',
        closedByTag: client.user?.tag || 'system',
        closeReason: 'auto_missing_channel'
      });
      continue;
    }

    if (channel.isThread()) {
      if (channel.archived || channel.locked) {
        saveTicket(ticket.threadId, {
          closed: true,
          closedAt: ticket.closedAt || Date.now(),
          closeReason: 'auto_archived_thread'
        });
      }
      continue;
    }

    if (channel.name?.startsWith('closed-')) {
      saveTicket(ticket.threadId, {
        closed: true,
        closedAt: ticket.closedAt || Date.now(),
        closeReason: 'auto_closed_channel_name'
      });
      continue;
    }

    const ownerOverwrite = channel.permissionOverwrites.cache.get(ticket.ownerId);
    const ownerDeniedSend = ownerOverwrite?.deny?.has(PermissionsBitField.Flags.SendMessages);

    if (ownerDeniedSend) {
      saveTicket(ticket.threadId, {
        closed: true,
        closedAt: ticket.closedAt || Date.now(),
        closeReason: 'auto_locked_channel'
      });
    }
  }
}

async function sendAdminStatusLog(client, payload) {
  if (client.config.adminStatus?.enabled === false) return;
  const channelId = client.config.adminStatus?.logChannelId;
  if (!channelId) return;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  const finalPayload = typeof payload === 'string'
    ? buildStaffLogMessage(client.config, {
        title: 'Yetkili Durum Kaydi',
        description: payload
      })
    : payload;
  await channel.send(finalPayload).catch(() => null);
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    const config = client.config;

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'ticket:create') {
      const modal = new ModalBuilder()
        .setCustomId('ticket:create:modal')
        .setTitle(config.modal.title);

      const forumName = new TextInputBuilder()
        .setCustomId('forumName')
        .setLabel(config.modal.forumNameLabel)
        .setPlaceholder(config.modal.forumNamePlaceholder)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32);

      const subject = new TextInputBuilder()
        .setCustomId('subject')
        .setLabel(config.modal.subjectLabel)
        .setPlaceholder(config.modal.subjectPlaceholder)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100);

      const detail = new TextInputBuilder()
        .setCustomId('details')
        .setLabel(config.modal.detailLabel)
        .setPlaceholder(config.modal.detailPlaceholder)
        .setRequired(true)
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(config.modal.minDetailLength || 20)
        .setMaxLength(config.modal.maxDetailLength || 1500);

      modal.addComponents(
        new ActionRowBuilder().addComponents(forumName),
        new ActionRowBuilder().addComponents(subject),
        new ActionRowBuilder().addComponents(detail)
      );

      await interaction.showModal(modal);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('adminstatus:period:')) {
      if (config.adminStatus?.enabled === false) {
        await replySafe(interaction, { content: 'Admin status sistemi kapali.', flags: MessageFlags.Ephemeral });
        return;
      }

      if (!canManageBot(interaction.member, interaction.user.id, config)) {
        await replySafe(interaction, { content: 'Bu islemi yapma yetkin yok.', flags: MessageFlags.Ephemeral });
        return;
      }

      const [, , period, targetUserId] = interaction.customId.split(':');
      await interaction.update(buildAdminStatusPayload(config, {
        period,
        targetUserId: targetUserId || 'all'
      })).catch(() => null);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('leaderboard:period:')) {
      if (!canManageBot(interaction.member, interaction.user.id, config)) {
        await replySafe(interaction, { content: 'Bu islemi yapma yetkin yok.', flags: MessageFlags.Ephemeral });
        return;
      }

      const [, , period] = interaction.customId.split(':');
      await interaction.update(buildLeaderboardPayload(config, period || 'daily')).catch(() => null);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ticket:create:modal') {
      const forumName = interaction.fields.getTextInputValue('forumName').trim();
      const subject = interaction.fields.getTextInputValue('subject').trim();
      const details = interaction.fields.getTextInputValue('details').trim();

      const blacklistEntry = getBlacklistEntry(interaction.user.id);
      if (blacklistEntry) {
        await replySafe(interaction, {
          content: `Ticket acamazsin. Sebep: **${blacklistEntry.reason || 'Belirtilmedi'}**`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const category = config.categories?.[0] || { value: 'ticket', label: 'Talep', icon: '🎫', prefix: 'ticket' };

      await syncOpenTicketsForUser(client, interaction.guild, interaction.user.id);

      const check = validateTicketAttempt(config, interaction.user.id, category.value);
      if (!check.ok) {
        let content = 'Ticket oluşturamadın.';
        if (check.type === 'cooldown' || check.type === 'blocked') {
          content = `${config[check.type === 'blocked' ? 'antiSpam' : 'cooldown'].message}\nTekrar deneyebileceğin zaman: ${relativeSeconds(check.until)}`;
        } else if (check.type === 'open_limit') {
          content = `Açık ticket limitine ulaştın. Maksimum: **${config.cooldown.maxOpenTicketsPerUser}**`;
        } else if (check.type === 'same_category') {
          content = `Zaten açık bir ticketın var: <#${check.ticket.threadId}>`;
        }
        await replySafe(interaction, { content, flags: MessageFlags.Ephemeral });
        return;
      }

      // We no longer need ticketPanelChannelId check here
      const categoryId = config.ticketCategoryId || "1491498602693001226";

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      registerTicketAttempt(config, interaction.user.id);
      
      const ticketNumber = getNextTicketNumber();
      const threadName = `ticket-${ticketNumber}`;

      const ticketData = {
        ownerId: interaction.user.id,
        ownerTag: interaction.user.tag,
        ticketNumber,
        forumName,
        subject,
        details,
        createdAt: Date.now(),
        category: category.value,
        categoryLabel: category.label,
        claimedBy: null,
        claimedByTag: null,
        firstStaffResponseAt: null,
        firstStaffResponseBy: null,
        firstClaimAt: null,
        firstClaimBy: null,
        closed: false,
        selectedAt: Date.now(),
        history: [
          {
            action: 'created',
            at: Date.now(),
            userId: interaction.user.id,
            tag: interaction.user.tag,
            details: 'Ticket olusturuldu.'
          }
        ]
      };

      const permissionOverwrites = [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
        }
      ];

      if (config.supportRoleIds && config.supportRoleIds.length) {
        for (const roleId of config.supportRoleIds) {
          permissionOverwrites.push({
            id: roleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
          });
        }
      }

      const channel = await interaction.guild.channels.create({
        name: threadName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites,
        reason: `Ticket açıldı: ${interaction.user.tag}`
      }).catch(e => null);

      if (!channel) {
        await interaction.editReply({ content: 'Ticket kanalı oluşturulurken bir hata meydana geldi.' });
        return;
      }

      saveTicket(channel.id, {
        ...ticketData,
        threadId: channel.id
      });

      const ticketMessageData = renderTicketContainer(config, ticketData, category, interaction.user, false);
      const starterMessage = await channel.send(ticketMessageData).catch(async (error) => {
        await client.logger.error('TICKET_STARTER_MESSAGE_FAILED', error, client).catch(() => null);
        return null;
      });

      if (starterMessage && config.tickets.defaultReaction) {
        await starterMessage.react(config.tickets.defaultReaction).catch(() => null);
      }

      if (config.logChannelId) {
        const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
        if (logChannel?.isTextBased()) {
          await logChannel.send(buildStaffLogMessage(config, {
            title: 'Ticket Acildi',
            description: `Yeni ticket olusturuldu: #${ticketNumber}`,
            lines: [
              `- Ticket: <#${channel.id}>`,
              `- Ticket No: **#${ticketNumber}**`,
              `- Kullanicı: <@${interaction.user.id}>`,
              `- Kategori: **${category.label}**`
            ]
          })).catch(() => null);
        }
      }

      await interaction.editReply({ content: `Ticket başarıyla oluşturuldu: ${channel.toString()}` });
      return;
    }

    if (interaction.isButton() && ['ticket:claim', 'ticket:unclaim', 'ticket:close', 'ticket:reopen', 'ticket:delete', 'ticket:manage:add', 'ticket:manage:remove'].includes(interaction.customId)) {
      const ticket = getTicket(interaction.channelId);
      if (!ticket) {
        await replySafe(interaction, { content: 'Bu konu ticket verisinde bulunamadı.', flags: MessageFlags.Ephemeral });
        return;
      }

      const isStaff = canHandleTickets(interaction.member, interaction.user.id, config);
      if (!isStaff) {
        await replySafe(interaction, { content: 'Bu işlem için yetkin yok.', flags: MessageFlags.Ephemeral });
        return;
      }

      if (interaction.customId === 'ticket:manage:add') {
        await interaction.reply({
          content: 'Eklenecek üyeleri seç. Menüde isim yazarak tüm sunucuda arama yapabilirsin.',
          components: buildMemberManageMenu('add', interaction.channelId),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (interaction.customId === 'ticket:manage:remove') {
        await interaction.reply({
          content: 'Çıkarılacak üyeleri seç. Menüde isim yazarak arama yapabilirsin.',
          components: buildMemberManageMenu('remove', interaction.channelId),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const category = getCategory(config, ticket.category);

      if (interaction.customId === 'ticket:reopen') {
        if (!ticket.closed) {
          await replySafe(interaction, { content: 'Bu ticket zaten acik.', flags: MessageFlags.Ephemeral });
          return;
        }

        const updated = saveTicket(interaction.channelId, {
          closed: false,
          reopenedAt: Date.now(),
          reopenedBy: interaction.user.id,
          reopenedByTag: interaction.user.tag
        });
        appendTicketHistory(interaction.channelId, {
          action: 'reopen',
          userId: interaction.user.id,
          tag: interaction.user.tag,
          details: 'Ticket yeniden acildi.'
        });
        await reopenTicketChannel(interaction.channel, ticket, config);
        const ticketMessageData = renderTicketContainer(config, updated, category, null, false);
        await interaction.update(ticketMessageData).catch(() => null);

        if (config.logChannelId) {
          const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
          if (logChannel?.isTextBased()) {
            await logChannel.send(buildStaffLogMessage(config, {
              title: 'Ticket Geri Acildi',
              description: `<@${interaction.user.id}> ticketi yeniden acti.`,
              lines: [
                `- Ticket: <#${interaction.channelId}>`,
                `- Ticket No: **#${ticket.ticketNumber || '0000'}**`,
                `- Yetkili: <@${interaction.user.id}>`
              ]
            })).catch(() => null);
          }
        }
        return;
      }

      if (interaction.customId === 'ticket:delete') {
        await interaction.reply({ content: 'Ticket kanali siliniyor...', flags: MessageFlags.Ephemeral }).catch(() => null);
        saveTicket(interaction.channelId, {
          deleted: true,
          deletedAt: Date.now(),
          deletedBy: interaction.user.id,
          deletedByTag: interaction.user.tag,
          closed: true
        });
        appendTicketHistory(interaction.channelId, {
          action: 'delete',
          userId: interaction.user.id,
          tag: interaction.user.tag,
          details: 'Ticket kanali silindi.'
        });

        if (config.logChannelId) {
          const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
          if (logChannel?.isTextBased()) {
            await logChannel.send(buildStaffLogMessage(config, {
              title: 'Ticket Silindi',
              description: `<@${interaction.user.id}> ticket kanalini sildi.`,
              lines: [
                `- Ticket No: **#${ticket.ticketNumber || '0000'}**`,
                `- Ticket Sahibi: <@${ticket.ownerId}>`,
                `- Silen Yetkili: <@${interaction.user.id}>`
              ]
            })).catch(() => null);
          }
        }

        await interaction.channel.delete(`Ticket silindi: ${interaction.user.tag}`).catch(() => null);
        return;
      }

      if (interaction.customId === 'ticket:claim') {
        if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id && !config.claims.allowReclaimByOthers) {
          await replySafe(interaction, { content: `Bu ticket zaten <@${ticket.claimedBy}> tarafından sahiplenilmiş.`, flags: MessageFlags.Ephemeral });
          return;
        }

        const updated = saveTicket(interaction.channelId, { claimedBy: interaction.user.id, claimedByTag: interaction.user.tag });
        appendTicketHistory(interaction.channelId, {
          action: 'claim',
          userId: interaction.user.id,
          tag: interaction.user.tag,
          details: 'Ticket sahiplenildi.'
        });
        const ticketMessageData = renderTicketContainer(config, updated, category, null, false);
        await interaction.update(ticketMessageData);
        const recorded = config.adminStatus?.enabled === false ? null : recordStaffAction(interaction.user.id, {
          tag: interaction.user.tag,
          displayName: interaction.member?.displayName || interaction.user.username
        }, 'claim', interaction.channelId, { ownerId: ticket.ownerId, category: ticket.category });
        if (!ticket.firstClaimAt) {
          const claimDurationMs = Date.now() - Number(ticket.createdAt || Date.now());
          saveTicket(interaction.channelId, {
            firstClaimAt: Date.now(),
            firstClaimBy: interaction.user.id
          });
          if (config.adminStatus?.enabled !== false) {
            recordStaffAction(interaction.user.id, {
              tag: interaction.user.tag,
              displayName: interaction.member?.displayName || interaction.user.username
            }, 'claim_response', interaction.channelId, {
              ownerId: ticket.ownerId,
              category: ticket.category,
              durationMs: claimDurationMs
            });
          }
        }

        if (config.claimLogChannelId) {
          const logChannel = await client.channels.fetch(config.claimLogChannelId).catch(() => null);
          if (logChannel?.isTextBased()) {
            await logChannel.send(buildStaffLogMessage(config, {
              title: 'Ticket Sahiplendi',
              description: `<@${interaction.user.id}> ticketi sahiplendi.`,
              lines: [
                `- Ticket: <#${interaction.channelId}>`,
                `- Ticket No: **#${ticket.ticketNumber || '0000'}**`,
                `- Sahiplenen Yetkili: <@${interaction.user.id}>`,
                `- Ticket Sahibi: <@${ticket.ownerId}>`
              ]
            })).catch(() => null);
          }
        }
        if (recorded) {
          await sendAdminStatusLog(
            client,
            buildStaffLogMessage(config, {
              title: 'Claim Kaydi',
              description: `<@${interaction.user.id}> ticketi sahiplendi.`,
              lines: [
                `- Ticket: <#${interaction.channelId}>`,
                `- Ticket No: **#${ticket.ticketNumber || '0000'}**`,
                `- Yetkili: <@${interaction.user.id}>`,
                `- Toplam Claim: **${recorded.claims}**`
              ]
            })
          );
        }
        return;
      }

      if (interaction.customId === 'ticket:unclaim') {
        if (!config.claims.allowUnclaim) {
          await replySafe(interaction, { content: 'Bırakma işlemi kapalı.', flags: MessageFlags.Ephemeral });
          return;
        }
        if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id && !config.claims.allowReclaimByOthers) {
          await replySafe(interaction, { content: 'Bu sahiplenmeyi yalnızca ilgili yetkili bırakabilir.', flags: MessageFlags.Ephemeral });
          return;
        }

        const updated = saveTicket(interaction.channelId, { claimedBy: null, claimedByTag: null });
        appendTicketHistory(interaction.channelId, {
          action: 'unclaim',
          userId: interaction.user.id,
          tag: interaction.user.tag,
          details: 'Ticket birakildi.'
        });
        const ticketMessageData = renderTicketContainer(config, updated, category, null, false);
        await interaction.update(ticketMessageData);
        if (config.adminStatus?.enabled !== false) {
          recordStaffAction(interaction.user.id, {
            tag: interaction.user.tag,
            displayName: interaction.member?.displayName || interaction.user.username
          }, 'unclaim', interaction.channelId, { ownerId: ticket.ownerId, category: ticket.category });
        }
        return;
      }

      if (interaction.customId === 'ticket:close') {
        await interaction.reply({ content: 'Ticket kapatılıyor, transcript hazırlanıyor...', flags: MessageFlags.Ephemeral });

        const updatedTicket = saveTicket(interaction.channelId, {
          closed: true,
          closedAt: Date.now(),
          closedBy: interaction.user.id,
          closedByTag: interaction.user.tag
        });
        appendTicketHistory(interaction.channelId, {
          action: 'close',
          userId: interaction.user.id,
          tag: interaction.user.tag,
          details: 'Ticket kapatildi.'
        });
        const recorded = config.adminStatus?.enabled === false ? null : recordStaffAction(interaction.user.id, {
          tag: interaction.user.tag,
          displayName: interaction.member?.displayName || interaction.user.username
        }, 'close', interaction.channelId, { ownerId: ticket.ownerId, category: ticket.category });

        let transcript = null;
        if (config.transcripts?.enabled) {
          transcript = await createTranscript(interaction.channel, {
            ...getTicket(interaction.channelId),
            brandingLogoUrl: config.branding?.logoUrl
          }, config.transcripts).catch(async (error) => {
            await client.logger.error('TRANSCRIPT_CREATE_FAILED', error, client);
            return null;
          });
        }
        if (config.logChannelId) {
          const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
          if (logChannel?.isTextBased()) {
            const closeLogPayload = buildStaffLogMessage(config, {
              title: 'Ticket Kapatildi',
              description: `<@${interaction.user.id}> ticketi kapatti.`,
              lines: [
                `- Ticket: <#${interaction.channelId}>`,
                `- Ticket No: **#${ticket.ticketNumber || '0000'}**`,
                `- Acan: <@${ticket.ownerId}>`,
                `- Kapatan: <@${interaction.user.id}>`
              ]
            });
            if (transcript) {
              closeLogPayload.files = [...(closeLogPayload.files || []), transcript.attachment];
            }
            await logChannel.send(closeLogPayload).catch(() => null);
          }
        }

        if (recorded) {
          await sendAdminStatusLog(
            client,
            buildStaffLogMessage(config, {
              title: 'Ticket Kapatma Kaydi',
              description: `<@${interaction.user.id}> bir ticket kapatti.`,
              lines: [
                `- Ticket: <#${interaction.channelId}>`,
                `- Ticket No: **#${ticket.ticketNumber || '0000'}**`,
                `- Yetkili: <@${interaction.user.id}>`,
                `- Toplam Kapatma: **${recorded.closes}**`,
                `- Toplam Ticket Mesaji: **${recorded.ticketMessages}**`
              ]
            })
          );
        }

        if (config.transcriptLogChannelId && transcript) {
          const transcriptChannel = await client.channels.fetch(config.transcriptLogChannelId).catch(() => null);
          if (transcriptChannel?.isTextBased()) {
            await transcriptChannel.send({
              content: `📄 Transcript hazırlandı: **${interaction.channel.name}**`,
              files: [transcript.attachment]
            }).catch(() => null);
          }
        }

        const ticketMessageData = renderTicketContainer(config, updatedTicket, category, null, true);
        await interaction.message.edit(ticketMessageData).catch(() => null);

        if (config.tickets.closeArchive !== false) {
          await closeTicketChannel(interaction.channel, ticket, config);
        }

        await interaction.editReply({ content: 'Ticket kapatıldı. Transcript oluşturuldu.' }).catch(() => null);
      }

      return;
    }

    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('ticket:add:users:')) {
      const threadId = interaction.customId.split(':')[3];
      const ticket = getTicket(threadId);
      if (!ticket) {
        await replySafe(interaction, { content: 'Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
        return;
      }

      const channel = await client.channels.fetch(threadId).catch(() => null);
      if (!channel) {
        await replySafe(interaction, { content: 'Kanal bulunamadı.', flags: MessageFlags.Ephemeral });
        return;
      }

      const added = [];
      for (const userId of interaction.values) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) continue;
        await channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => null);
        added.push(`<@${userId}>`);
      }

      const lines = added.length ? [`➕ ${interaction.user} şu üyeleri ekledi: ${added.join(', ')}`] : ['Hiç üye eklenemedi.'];
      if (added.length && config.adminStatus?.enabled !== false) {
        recordStaffAction(interaction.user.id, {
          tag: interaction.user.tag,
          displayName: interaction.member?.displayName || interaction.user.username
        }, 'member_add', threadId, { count: added.length, ownerId: ticket.ownerId, category: ticket.category });
      }
      if (added.length) {
        appendTicketHistory(threadId, {
          action: 'member_add',
          userId: interaction.user.id,
          tag: interaction.user.tag,
          details: `${added.length} uye eklendi.`
        });
      }
      await interaction.reply({ content: lines[0], flags: MessageFlags.Ephemeral }).catch(() => null);
      if (added.length) await channel.send(lines[0]).catch(() => null);
      return;
    }

    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('ticket:remove:users:')) {
      const threadId = interaction.customId.split(':')[3];
      const ticket = getTicket(threadId);
      if (!ticket) {
        await replySafe(interaction, { content: 'Ticket bulunamadı.', flags: MessageFlags.Ephemeral });
        return;
      }

      const channel = await client.channels.fetch(threadId).catch(() => null);
      if (!channel) {
        await replySafe(interaction, { content: 'Kanal bulunamadı.', flags: MessageFlags.Ephemeral });
        return;
      }

      const removed = [];
      for (const userId of interaction.values) {
        if (userId === ticket.ownerId) continue;
        await channel.permissionOverwrites.edit(userId, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false }).catch(() => null);
        removed.push(`<@${userId}>`);
      }

      const lines = removed.length ? [`➖ ${interaction.user} şu üyeleri çıkardı: ${removed.join(', ')}`] : ['Hiç üye çıkarılamadı.'];
      if (removed.length && config.adminStatus?.enabled !== false) {
        recordStaffAction(interaction.user.id, {
          tag: interaction.user.tag,
          displayName: interaction.member?.displayName || interaction.user.username
        }, 'member_remove', threadId, { count: removed.length, ownerId: ticket.ownerId, category: ticket.category });
      }
      if (removed.length) {
        appendTicketHistory(threadId, {
          action: 'member_remove',
          userId: interaction.user.id,
          tag: interaction.user.tag,
          details: `${removed.length} uye cikarildi.`
        });
      }
      await interaction.reply({ content: lines[0], flags: MessageFlags.Ephemeral }).catch(() => null);
      if (removed.length) {
        for (const part of chunkText(lines)) {
          await channel.send(part).catch(() => null);
        }
      }
    }
  }
};

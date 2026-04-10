const fs = require('node:fs');
const path = require('node:path');
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder
} = require('discord.js');
const { hexToNumber, styleFromName } = require('./helpers');

function buildPanelMessage(config) {
  const container = new ContainerBuilder().setAccentColor(hexToNumber(config.color));
  const files = [];
  const localBrandingPath = config.branding?.logoPath
    ? (path.isAbsolute(config.branding.logoPath)
        ? config.branding.logoPath
        : path.join(process.cwd(), config.branding.logoPath))
    : null;
  const hasLocalBranding = Boolean(localBrandingPath && fs.existsSync(localBrandingPath));
  const localBrandingName = hasLocalBranding ? path.basename(localBrandingPath) : null;

  if (hasLocalBranding) {
    files.push(new AttachmentBuilder(localBrandingPath, { name: localBrandingName }));
  }

  const intro = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${config.panel.title}`),
      new TextDisplayBuilder().setContent(config.panel.description)
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder({
        media: {
          url: hasLocalBranding ? `attachment://${localBrandingName}` : config.branding.logoUrl
        }
      })
    );

  container.addSectionComponents(intro);
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const rules = (config.panel.rules || []).map((rule) => `- ${rule}`).join('\n');
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`### ${config.panel.rulesTitle || 'Kurallar'}`),
    new TextDisplayBuilder().setContent(rules),
    new TextDisplayBuilder().setContent(config.panel.helperText || 'Butona basarak ticket açabilirsiniz.')
  );

  if (config.panel.bottomImagePath) {
    const filePath = path.isAbsolute(config.panel.bottomImagePath)
      ? config.panel.bottomImagePath
      : path.join(process.cwd(), config.panel.bottomImagePath);
    if (fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      if (!files.some((file) => file.name === fileName)) {
        files.push(new AttachmentBuilder(filePath, { name: fileName }));
      }
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder({ media: { url: `attachment://${fileName}` } })
        )
      );
    }
  } else if (config.panel.bottomImageUrl) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder({ media: { url: config.panel.bottomImageUrl } })
      )
    );
  }

  if (config.panel.footerLinkText && config.panel.footerLinkUrl) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`[${config.panel.footerLinkText}](${config.panel.footerLinkUrl})`)
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:create')
        .setLabel(config.panel.createButtonLabel)
        .setEmoji(config.panel.createButtonEmoji)
        .setStyle(styleFromName(config.panel.buttonStyle))
    )
  );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    files
  };
}

function buildCategoryButtons(config, pendingKey) {
  const rows = [];
  const row = new ActionRowBuilder();

  for (const category of config.categories) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:category:${pendingKey}:${category.value}`)
        .setLabel(category.label)
        .setEmoji(category.icon)
        .setStyle(styleFromName(category.buttonStyle || 'Secondary'))
    );
  }

  rows.push(row);
  return rows;
}

function buildMemberManageMenu(type, threadId) {
  const { UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
  return [
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`ticket:${type}:users:${threadId}`)
        .setPlaceholder(type === 'add' ? 'Eklenecek üyeleri ara ve seç...' : 'Çıkarılacak üyeleri ara ve seç...')
        .setMinValues(1)
        .setMaxValues(10)
    )
  ];
}

function buildStaffLogMessage(config, options) {
  const container = new ContainerBuilder().setAccentColor(hexToNumber(config.color));
  const files = [];
  const localBrandingPath = config.branding?.logoPath
    ? (path.isAbsolute(config.branding.logoPath)
        ? config.branding.logoPath
        : path.join(process.cwd(), config.branding.logoPath))
    : null;
  const hasLocalBranding = Boolean(localBrandingPath && fs.existsSync(localBrandingPath));
  const localBrandingName = hasLocalBranding ? path.basename(localBrandingPath) : null;

  if (hasLocalBranding) {
    files.push(new AttachmentBuilder(localBrandingPath, { name: localBrandingName }));
  }

  const intro = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${options.title}`),
      new TextDisplayBuilder().setContent(options.description || 'Islem kaydi olusturuldu.')
    );

  if (hasLocalBranding || config.branding?.logoUrl) {
    intro.setThumbnailAccessory(
      new ThumbnailBuilder({
        media: {
          url: hasLocalBranding ? `attachment://${localBrandingName}` : config.branding.logoUrl
        }
      })
    );
  }

  container.addSectionComponents(intro);
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  if (options.lines?.length) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(options.lines.join('\n'))
    );
  }

  if (config.branding?.footerText) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(config.branding.footerText)
    );
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    files
  };
}

module.exports = { buildPanelMessage, buildCategoryButtons, buildMemberManageMenu, buildStaffLogMessage };

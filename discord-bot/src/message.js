'use strict';
// Builds the rules/verify post as a Components V2 message (container with banner, rules, buttons).
const path = require('node:path');
const {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MediaGalleryBuilder,
  MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder,
} = require('discord.js');

const VERIFY_ID = 'h1t:verify';
const STYLES = { primary: ButtonStyle.Primary, secondary: ButtonStyle.Secondary, success: ButtonStyle.Success, danger: ButtonStyle.Danger };

// emojis: Map name → { id, name, animated } (application emojis). Missing names are left out instead of breaking the post.
function emojiText(emojis, name) {
  const e = name && emojis.get(name);
  return e ? `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>` : '';
}
function emojiObj(emojis, name) {
  const e = name && emojis.get(name);
  return e ? { id: e.id, name: e.name, animated: Boolean(e.animated) } : undefined;
}

function button(emojis, { label, emoji, url, style }, customId) {
  const b = new ButtonBuilder().setLabel(label);
  if (url) b.setStyle(ButtonStyle.Link).setURL(url);
  else b.setStyle(STYLES[style] ?? ButtonStyle.Success).setCustomId(customId);
  const e = emojiObj(emojis, emoji);
  if (e) b.setEmoji(e);
  return b;
}

function buildRulesMessage(config, emojis = new Map(), root = path.join(__dirname, '..')) {
  const container = new ContainerBuilder().setAccentColor(parseInt(config.accentColor.replace('#', ''), 16));
  const files = [];
  if (config.banner) {
    const name = path.basename(config.banner);
    files.push(new AttachmentBuilder(path.join(root, config.banner), { name }));
    container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems((item) => item.setURL(`attachment://${name}`)));
  }
  const head = [`# ${emojiText(emojis, 'h1t_rules')} ${config.title}`.replace('#  ', '# '), config.intro].filter(Boolean).join('\n');
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(head));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
  config.rules.forEach((r, i) => {
    const icon = emojiText(emojis, r.emoji);
    const text = `### ${icon ? `${icon} ` : ''}${i + 1}. ${r.title}\n> ${r.text.replace(/\n/g, '\n> ')}`;
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  });
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
  // verify first, then links; Discord allows 5 buttons per row
  const buttons = [button(emojis, config.verify, VERIFY_ID), ...config.links.map((l) => button(emojis, l))];
  for (let i = 0; i < buttons.length; i += 5) {
    container.addActionRowComponents(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  if (config.footer) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${config.footer}`));
  return { components: [container], files, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
}

module.exports = { buildRulesMessage, VERIFY_ID, emojiText };

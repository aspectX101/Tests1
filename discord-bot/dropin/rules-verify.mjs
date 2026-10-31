// H1T.CC Rules & Verify (Modul zum Einbinden in einen bestehenden discord.js-Bot, ab discord.js 14.19)
//
// In index.mjs:
//   import { setupRulesVerify } from './rules-verify.mjs';
//   setupRulesVerify(client);            // direkt nach `new Client(...)`, vor client.login(...)
//
// Bringt mit: /post-rules (Post senden oder aktualisieren), /sync-emojis, den Verify-Button (vergibt die Rolle)
// und die eigenen Emojis aus rules-assets/emojis (werden als App-Emojis hochgeladen). Reagiert nur auf die
// eigenen Befehle und den eigenen Button, alles andere bleibt bei deinem Bot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ActionRowBuilder, ApplicationCommandOptionType, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType,
  ContainerBuilder, Events, MediaGalleryBuilder, MessageFlags, PermissionFlagsBits, SeparatorBuilder,
  SeparatorSpacingSize, TextDisplayBuilder,
} from 'discord.js';
import config from './rules-config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const EMOJI_DIR = path.join(here, 'rules-assets', 'emojis');
export const VERIFY_ID = 'h1t:verify';
const STYLES = { primary: ButtonStyle.Primary, secondary: ButtonStyle.Secondary, success: ButtonStyle.Success, danger: ButtonStyle.Danger };

export const RULES_COMMANDS = [{
  name: 'post-rules',
  description: 'Posts the rules & verify message (or updates an existing one).',
  default_member_permissions: String(PermissionFlagsBits.Administrator),
  dm_permission: false,
  options: [
    { name: 'channel', description: 'Channel for the post (default: this channel)', type: ApplicationCommandOptionType.Channel,
      channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement] },
    { name: 'message', description: 'ID of an existing rules post to update', type: ApplicationCommandOptionType.String },
  ],
}, {
  name: 'sync-emojis',
  description: 'Uploads new or changed rules emojis.',
  default_member_permissions: String(PermissionFlagsBits.Administrator),
  dm_permission: false,
  options: [{ name: 'replace', description: 'Replace existing emojis with the same name', type: ApplicationCommandOptionType.Boolean }],
}];

// ---- emojis (application emojis: owned by the bot, usable on every server, no emoji slot needed) ----
export async function syncEmojis(application, { replace = false } = {}) {
  const existing = await application.emojis.fetch();
  const byName = new Map(existing.map((e) => [e.name, e]));
  const files = fs.existsSync(EMOJI_DIR) ? fs.readdirSync(EMOJI_DIR).filter((f) => /\.(png|gif|webp)$/i.test(f)) : [];
  for (const file of files) {
    const name = path.parse(file).name;
    if (!/^\w{2,32}$/.test(name)) { console.warn(`[rules] Emoji übersprungen (ungültiger Name): ${file}`); continue; }
    const old = byName.get(name);
    if (old && !replace) continue;
    if (old) await old.delete();
    byName.set(name, await application.emojis.create({ attachment: path.join(EMOJI_DIR, file), name }));
    console.log(`[rules] Emoji hochgeladen: ${name}`);
  }
  return byName;
}

// ---- the post (Components V2: container with banner, rules, separators, buttons) ----
const emojiText = (emojis, name) => {
  const e = name && emojis.get(name);
  return e ? `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>` : '';
};
function button(emojis, { label, emoji, url, style }, customId) {
  const b = new ButtonBuilder().setLabel(label);
  if (url) b.setStyle(ButtonStyle.Link).setURL(url);
  else b.setStyle(STYLES[style] ?? ButtonStyle.Success).setCustomId(customId);
  const e = emoji && emojis.get(emoji);
  if (e) b.setEmoji({ id: e.id, name: e.name, animated: Boolean(e.animated) });
  return b;
}

export function buildRulesMessage(emojis = new Map(), cfg = config) {
  const container = new ContainerBuilder().setAccentColor(parseInt(cfg.accentColor.replace('#', ''), 16));
  const files = [];
  if (cfg.banner) {
    const name = path.basename(cfg.banner);
    files.push(new AttachmentBuilder(path.join(here, cfg.banner), { name }));
    container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems((item) => item.setURL(`attachment://${name}`)));
  }
  const icon = emojiText(emojis, 'h1t_rules');
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent([`# ${icon ? `${icon} ` : ''}${cfg.title}`, cfg.intro].filter(Boolean).join('\n')));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
  cfg.rules.forEach((r, i) => {
    const e = emojiText(emojis, r.emoji);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${e ? `${e} ` : ''}${i + 1}. ${r.title}\n> ${r.text.replace(/\n/g, '\n> ')}`));
  });
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
  const buttons = [button(emojis, cfg.verify, VERIFY_ID), ...cfg.links.map((l) => button(emojis, l))];
  for (let i = 0; i < buttons.length; i += 5) container.addActionRowComponents(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  if (cfg.footer) container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${cfg.footer}`));
  return { components: [container], files, flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
}

// ---- wiring ----
export function setupRulesVerify(client, { guildId = process.env.GUILD_ID, registerCommands = true } = {}) {
  let emojis = new Map();
  const roleId = () => process.env.VERIFIED_ROLE_ID || config.verify.roleId;

  const init = async () => {
    await client.application.fetch();
    emojis = await syncEmojis(client.application);
    console.log(`[rules] ${emojis.size} Emojis bereit`);
    if (registerCommands) {
      // a few seconds later, so a commands.set(...) of the main bot at startup does not remove them again
      await new Promise((r) => setTimeout(r, 5000));
      for (const cmd of RULES_COMMANDS) await client.application.commands.create(cmd, guildId || undefined);
      console.log(`[rules] /post-rules und /sync-emojis registriert${guildId ? ` (Server ${guildId})` : ''}`);
    }
    if (!roleId()) console.warn('[rules] Achtung: keine Verified-Rolle gesetzt (verify.roleId in rules-config.mjs).');
  };
  if (client.isReady()) init().catch((e) => console.error('[rules]', e));
  else client.once(Events.ClientReady, () => init().catch((e) => console.error('[rules]', e)));

  async function postRules(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const messageId = interaction.options.getString('message');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const payload = buildRulesMessage(emojis);
    if (messageId) {
      const msg = await channel.messages.fetch(messageId);
      if (msg.author.id !== client.user.id) return interaction.editReply('That message was not sent by this bot, so it cannot be edited.');
      await msg.edit({ ...payload, attachments: [] });
      return interaction.editReply(`Rules post updated: ${msg.url}`);
    }
    const msg = await channel.send(payload);
    return interaction.editReply(`Rules post sent: ${msg.url}`);
  }

  async function verify(interaction) {
    const id = roleId();
    if (!id) return interaction.reply({ content: config.verify.notSetUpReply, flags: MessageFlags.Ephemeral });
    const member = interaction.member;
    if (member.roles.cache.has(id)) return interaction.reply({ content: config.verify.alreadyReply, flags: MessageFlags.Ephemeral });
    await member.roles.add(id, 'Accepted the rules (verify button)');
    const remove = process.env.UNVERIFIED_ROLE_ID || config.verify.removeRoleId;
    if (remove && member.roles.cache.has(remove)) await member.roles.remove(remove, 'Verified');
    return interaction.reply({ content: config.verify.reply, flags: MessageFlags.Ephemeral });
  }

  client.on(Events.InteractionCreate, async (interaction) => {
    const mine = (interaction.isButton() && interaction.customId === VERIFY_ID)
      || (interaction.isChatInputCommand() && RULES_COMMANDS.some((c) => c.name === interaction.commandName));
    if (!mine) return;
    try {
      if (interaction.isButton()) return await verify(interaction);
      if (interaction.commandName === 'post-rules') return await postRules(interaction);
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      emojis = await syncEmojis(client.application, { replace: interaction.options.getBoolean('replace') ?? false });
      return interaction.editReply(`${emojis.size} emojis ready.`);
    } catch (err) {
      console.error('[rules]', err);
      const staff = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      const hint = !staff ? config.verify.errorReply
        : err.code === 50013 ? 'Missing permissions: the bot role must be **above** the verified role and have "Manage Roles".'
          : `Error: ${err.message}`;
      if (interaction.deferred || interaction.replied) await interaction.editReply(hint).catch(() => {});
      else await interaction.reply({ content: hint, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  });
}

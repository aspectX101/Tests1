'use strict';
// H1T.CC rules/verify bot: /post-rules posts (or updates) the rules message, the Verify button hands out the role.
const fs = require('node:fs');
const path = require('node:path');
const {
  ApplicationCommandOptionType, ChannelType, Client, Events, GatewayIntentBits, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const { buildRulesMessage, VERIFY_ID } = require('./message');
const { syncEmojis } = require('./emojis');

const root = path.join(__dirname, '..');
// .env (works on any Node version, e.g. on hosting panels); variables already set in the panel win
try {
  for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* .env is optional when the variables are set elsewhere */ }
const loadConfig = () => JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const roleIdOf = (config) => process.env.VERIFIED_ROLE_ID || config.verify.roleId;

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN fehlt. Kopiere .env.example nach .env und trage den Bot-Token ein.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let emojis = new Map();

const COMMANDS = [{
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
  description: 'Uploads new or changed emojis from assets/emojis.',
  default_member_permissions: String(PermissionFlagsBits.Administrator),
  dm_permission: false,
  options: [{ name: 'replace', description: 'Replace existing emojis with the same name', type: ApplicationCommandOptionType.Boolean }],
}];

client.once(Events.ClientReady, async (c) => {
  console.log(`Eingeloggt als ${c.user.tag}`);
  await c.application.fetch();
  emojis = await syncEmojis(c.application);
  console.log(`${emojis.size} Emojis bereit`);
  const guildId = process.env.GUILD_ID;
  if (guildId) await c.application.commands.set(COMMANDS, guildId);
  else await c.application.commands.set(COMMANDS);
  console.log(`Slash-Commands registriert (${guildId ? `Server ${guildId}` : 'global, kann bis zu 1 h dauern'})`);
  if (!roleIdOf(loadConfig())) console.warn('Achtung: keine Verifiziert-Rolle gesetzt (VERIFIED_ROLE_ID in .env oder verify.roleId in config.json).');
});

async function postRules(interaction) {
  const config = loadConfig();
  const channel = interaction.options.getChannel('channel') ?? interaction.channel;
  const messageId = interaction.options.getString('message');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const payload = buildRulesMessage(config, emojis);
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
  const config = loadConfig();
  const roleId = roleIdOf(config);
  if (!roleId) return interaction.reply({ content: config.verify.notSetUpReply, flags: MessageFlags.Ephemeral });
  const member = interaction.member;
  if (member.roles.cache.has(roleId)) return interaction.reply({ content: config.verify.alreadyReply, flags: MessageFlags.Ephemeral });
  await member.roles.add(roleId, 'Accepted the rules (verify button)');
  const remove = process.env.UNVERIFIED_ROLE_ID || config.verify.removeRoleId;
  if (remove && member.roles.cache.has(remove)) await member.roles.remove(remove, 'Verified');
  return interaction.reply({ content: config.verify.reply, flags: MessageFlags.Ephemeral });
}

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId === VERIFY_ID) return await verify(interaction);
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'post-rules') return await postRules(interaction);
    if (interaction.commandName === 'sync-emojis') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      emojis = await syncEmojis(client.application, { replace: interaction.options.getBoolean('replace') ?? false });
      return interaction.editReply(`${emojis.size} emojis ready.`);
    }
  } catch (err) {
    console.error(err);
    // members only see a short English message; the details are for staff
    const staff = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    const hint = !staff ? loadConfig().verify.errorReply
      : err.code === 50013 ? 'Missing permissions: the bot role must be **above** the verified role and have "Manage Roles".'
        : `Error: ${err.message}`;
    const reply = { content: hint, flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.editReply(hint).catch(() => {});
    else await interaction.reply(reply).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [];

/* ===== /status ===== */
commands.push(
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Change bot status')
    .addStringOption(o =>
      o.setName('text')
        .setDescription('Status text')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON()
);

/* ===== /dm ===== */
commands.push(
  new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Send a DM via the bot')
    .addUserOption(o =>
      o.setName('user').setDescription('User to DM').setRequired(true))
    .addStringOption(o =>
      o.setName('message').setDescription('Message').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON()
);

/* ===== /rep ===== */
commands.push(
  new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Rep requests')
    .addSubcommand(sub =>
      sub.setName('request')
        .setDescription('Request new reps')
        .addIntegerOption(o =>
          o.setName('num_reps').setDescription('Number of reps').setRequired(true))
        .addStringOption(o =>
          o.setName('discord_link').setDescription('Discord link').setRequired(true))
        .addStringOption(o =>
          o.setName('roblox_link').setDescription('Roblox link').setRequired(true))
        .addStringOption(o =>
          o.setName('alliance_link').setDescription('Alliance link').setRequired(true))
    )
    .toJSON()
);

/* ===== /alliance ===== */
commands.push(
  new SlashCommandBuilder()
    .setName('alliance')
    .setDescription('Alliance management')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add an alliance')
        .addStringOption(o => o.setName('group').setDescription('Group name').setRequired(true))
        .addStringOption(o => o.setName('our_reps').setDescription('Our reps').setRequired(true))
        .addStringOption(o => o.setName('their_reps').setDescription('Their reps').setRequired(true))
        .addStringOption(o => o.setName('discord_link').setDescription('Discord link'))
        .addStringOption(o => o.setName('roblox_link').setDescription('Roblox link'))
        .addChannelOption(o => o.setName('public_channel').setDescription('Welcome channel'))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List alliances')
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove alliance')
        .addStringOption(o => o.setName('group').setDescription('Group name').setRequired(true))
    )
    .toJSON()
);

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
  console.log('✅ Commands deployed');
})();

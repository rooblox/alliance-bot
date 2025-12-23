require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [];

/* ===== /status ===== */
commands.push(
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Change bot status')
        .addStringOption(o =>
            o.setName('text').setDescription('Status text').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

/* ===== /dm ===== */
commands.push(
    new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a DM via the bot')
        .addUserOption(o => o.setName('user').setRequired(true))
        .addStringOption(o => o.setName('message').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

/* ===== /rep ===== */
commands.push(
    new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Rep commands')
        .addSubcommand(sub =>
            sub.setName('request')
                .setDescription('Request reps')
                .addIntegerOption(o => o.setName('num_reps').setRequired(true))
                .addStringOption(o => o.setName('discord_link').setRequired(true))
                .addStringOption(o => o.setName('roblox_link').setRequired(true))
                .addStringOption(o => o.setName('alliance_link').setRequired(true))
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
                .addStringOption(o => o.setName('group').setRequired(true))
                .addStringOption(o => o.setName('our_reps').setRequired(true))
                .addStringOption(o => o.setName('their_reps').setRequired(true))
                .addStringOption(o => o.setName('discord_link'))
                .addStringOption(o => o.setName('roblox_link'))
                .addChannelOption(o => o.setName('public_channel'))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .addStringOption(o => o.setName('group').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
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

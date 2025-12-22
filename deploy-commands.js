require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [];

/* =======================
   /status
======================= */
commands.push(
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Change the bot status')
        .addStringOption(opt =>
            opt.setName('type')
                .setDescription('Select the status type')
                .setRequired(true)
                .addChoices(
                    { name: 'Playing', value: 'PLAYING' },
                    { name: 'Watching', value: 'WATCHING' },
                    { name: 'Listening', value: 'LISTENING' },
                    { name: 'Competing', value: 'COMPETING' }
                ))
        .addStringOption(opt =>
            opt.setName('text')
                .setDescription('The status text to display')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

/* =======================
   /dm
======================= */
commands.push(
    new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a direct message to a user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The user to DM')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('message')
                .setDescription('The message content')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

/* =======================
   /alliance
======================= */
commands.push(
    new SlashCommandBuilder()
        .setName('alliance')
        .setDescription('Manage alliances')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a new alliance')
                .addStringOption(o => o.setName('group').setDescription('Name of the alliance group').setRequired(true))
                .addStringOption(o => o.setName('our_reps').setDescription('Our representatives in Discord').setRequired(true))
                .addStringOption(o => o.setName('their_reps').setDescription('Their representatives in Discord').setRequired(true))
                .addStringOption(o => o.setName('discord').setDescription('Discord invite link for the alliance').setRequired(true))
                .addStringOption(o => o.setName('roblox').setDescription('Roblox group link for the alliance').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all current alliances')
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove an existing alliance')
                .addStringOption(o => o.setName('group').setDescription('Name of the alliance to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Edit an existing alliance')
                .addStringOption(o => o.setName('group').setDescription('Name of the alliance to edit').setRequired(true))
                .addStringOption(o => o.setName('new_group').setDescription('New alliance name'))
                .addStringOption(o => o.setName('our_reps').setDescription('New our representatives'))
                .addStringOption(o => o.setName('their_reps').setDescription('New their representatives'))
                .addStringOption(o => o.setName('discord').setDescription('New Discord link'))
                .addStringOption(o => o.setName('roblox').setDescription('New Roblox link'))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

/* =======================
   /staff
======================= */
commands.push(
    new SlashCommandBuilder()
        .setName('staff')
        .setDescription('Staff management commands')
        .addSubcommand(sub =>
            sub.setName('discipline')
                .setDescription('Discipline a staff member (strike, kick, terminate)')
                .addUserOption(o => o.setName('member').setDescription('The staff member to discipline').setRequired(true))
                .addStringOption(o =>
                    o.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Strike', value: 'strike' },
                            { name: 'Kick', value: 'kick' },
                            { name: 'Terminate', value: 'terminate' }
                        ))
                .addStringOption(o => o.setName('reason').setDescription('Reason for the action').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('strikes')
                .setDescription('View all strikes for a staff member')
                .addUserOption(o => o.setName('member').setDescription('Staff member to view strikes for').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

/* =======================
   /rep
======================= */
commands.push(
    new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Rep management')
        .addSubcommand(sub =>
            sub.setName('request')
                .setDescription('Request a new rep for an alliance')
                .addIntegerOption(o => o.setName('num_reps').setDescription('Number of reps requested'))
                .addStringOption(o => o.setName('discord_link').setDescription('Discord link for the alliance'))
                .addStringOption(o => o.setName('roblox_link').setDescription('Roblox link for the alliance'))
                .addStringOption(o => o.setName('alliance_link').setDescription('Alliance website or group link'))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash commands deployed successfully');
    } catch (err) {
        console.error('❌ Error deploying commands:', err);
    }
})();

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
            opt.setName('status')
               .setDescription('Status text to show (Playing, Watching, etc.)')
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
        .setDescription('Send a DM via the bot')
        .addUserOption(opt =>
            opt.setName('user').setDescription('User to DM').setRequired(true))
        .addStringOption(opt =>
            opt.setName('message').setDescription('Message to send').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

/* =======================
   /alliance
======================= */
commands.push(
    new SlashCommandBuilder()
        .setName('alliance')
        .setDescription('Alliance management')
        .addSubcommand(sub =>
            sub.setName('add')
               .setDescription('Add a new alliance')
               .addStringOption(o => o.setName('group').setDescription('Alliance group name').setRequired(true))
               .addStringOption(o => o.setName('our_reps').setDescription('Our representatives').setRequired(true))
               .addStringOption(o => o.setName('their_reps').setDescription('Their representatives').setRequired(true))
               .addStringOption(o => o.setName('discord').setDescription('Discord link').setRequired(true))
               .addStringOption(o => o.setName('roblox').setDescription('Roblox link').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
               .setDescription('List all alliances')
        )
        .addSubcommand(sub =>
            sub.setName('remove')
               .setDescription('Remove an alliance')
               .addStringOption(o => o.setName('group').setDescription('Alliance group to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('edit')
               .setDescription('Edit an existing alliance')
               .addStringOption(o => o.setName('group').setDescription('Alliance group to edit').setRequired(true))
               .addStringOption(o => o.setName('new_group').setDescription('New group name'))
               .addStringOption(o => o.setName('our_reps').setDescription('New our reps'))
               .addStringOption(o => o.setName('their_reps').setDescription('New their reps'))
               .addStringOption(o => o.setName('discord').setDescription('New Discord link'))
               .addStringOption(o => o.setName('roblox').setDescription('New Roblox link'))
        )
        .toJSON()
);

/* =======================
   /staff
======================= */
commands.push(
    new SlashCommandBuilder()
        .setName('staff')
        .setDescription('Staff management')
        .addSubcommand(sub =>
            sub.setName('discipline')
               .setDescription('Strike, remove, or kick a member')
               .addUserOption(o => o.setName('member').setDescription('Member to act on').setRequired(true))
               .addStringOption(o =>
                   o.setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Add Strike', value: 'add' },
                        { name: 'Remove Strike', value: 'remove' },
                        { name: 'Kick', value: 'kick' }
                    ))
               .addStringOption(o => o.setName('reason').setDescription('Reason for action').setRequired(true))
               .addStringOption(o => o.setName('category').setDescription('Category: Strike/Termination/Blacklist').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('strikes')
               .setDescription('View strikes for a member')
               .addUserOption(o => o.setName('member').setDescription('Member to view').setRequired(true))
        )
        .toJSON()
);

/* =======================
   /rep
======================= */
commands.push(
    new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Rep requests')
        .addSubcommand(sub =>
            sub.setName('request')
               .setDescription('Request a new rep')
               .addIntegerOption(o => o.setName('num_reps').setDescription('Number of reps').setRequired(true))
               .addStringOption(o => o.setName('discord_link').setDescription('Discord link').setRequired(true))
               .addStringOption(o => o.setName('roblox_link').setDescription('Roblox link').setRequired(true))
               .addStringOption(o => o.setName('alliance_link').setDescription('Alliance link').setRequired(true))
        )
        .toJSON()
);

/* =======================
   DEPLOY
======================= */
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash commands deployed successfully.');
    } catch (err) {
        console.error('❌ Error deploying commands:', err);
    }
})();

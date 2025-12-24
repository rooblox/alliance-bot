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
             .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON()
);

/* ===== /dm ===== */
commands.push(
    new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a DM via the bot')
        .addUserOption(o =>
            o.setName('user')
             .setDescription('User to DM')
             .setRequired(true)
        )
        .addStringOption(o =>
            o.setName('message')
             .setDescription('Message to send')
             .setRequired(true)
        )
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
                .addIntegerOption(o =>
                    o.setName('num_reps')
                     .setDescription('Number of reps requested')
                     .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName('discord_link')
                     .setDescription('Discord server link')
                     .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName('roblox_link')
                     .setDescription('Roblox group link')
                     .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName('alliance_link')
                     .setDescription('Alliance information link')
                     .setRequired(true)
                )
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
                .setDescription('Add a new alliance')
                .addStringOption(o =>
                    o.setName('group')
                     .setDescription('Alliance group name')
                     .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName('our_reps')
                     .setDescription('Our representatives')
                     .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName('their_reps')
                     .setDescription('Their representatives')
                     .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName('discord_link')
                     .setDescription('Discord invite link')
                     .setRequired(false)
                )
                .addStringOption(o =>
                    o.setName('roblox_link')
                     .setDescription('Roblox group link')
                     .setRequired(false)
                )
                .addChannelOption(o =>
                    o.setName('public_channel')
                     .setDescription('Channel to announce the alliance')
                     .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove an alliance')
                .addStringOption(o =>
                    o.setName('group')
                     .setDescription('Alliance group name')
                     .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Update the alliance list')
        )
        .toJSON()
);

/* ===== /staff ===== */
commands.push(
  new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Staff management')
    .addSubcommand(sub =>
      sub.setName('discipline')
        .setDescription('Add or remove a strike from a staff member')
        .addStringOption(o =>
          o.setName('action')
            .setDescription('Add or remove a strike')
            .setRequired(true)
            .addChoices(
                 { name: 'Add', value: 'add' },
                 { name: 'Remove', value: 'remove' }
            )

        )
        .addUserOption(o =>
          o.setName('user')
            .setDescription('The staff member')
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName('reason')
            .setDescription('Reason (required for add; optional for remove)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('strikes')
        .setDescription('View strikes for a staff member')
        .addUserOption(o =>
          o.setName('user')
            .setDescription('The staff member to view')
            .setRequired(true)
        )
    )
    .toJSON()
);


const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );
        console.log('✅ Commands deployed');
    } catch (err) {
        console.error('❌ Error deploying commands:', err);
    }
})();

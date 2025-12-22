require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

/* =======================
   DATA FILES
======================= */
let alliances = fs.existsSync('./alliances.json')
    ? JSON.parse(fs.readFileSync('./alliances.json'))
    : [];

let strikes = fs.existsSync('./staffStrikes.json')
    ? JSON.parse(fs.readFileSync('./staffStrikes.json'))
    : [];

/* =======================
   READY EVENT
======================= */
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =======================
   INTERACTIONS
======================= */
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, member } = interaction;

    /* ===== /dm ===== */
    if (commandName === 'dm') {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        const user = options.getUser('user');
        const message = options.getString('message');

        const dmEmbed = new EmbedBuilder()
            .setTitle('📩 Staff Message')
            .setDescription(message)
            .setColor('Blue');

        try { await user.send({ embeds: [dmEmbed] }); } catch {}

        // Log DM to dm-logs channel
        if (guild) {
            const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📩 Staff Message')
                    .setColor('Blue')
                    .addFields(
                        { name: 'To', value: `<@${user.id}>` },
                        { name: 'Message', value: message },
                        { name: 'Sent By', value: `<@${member.user.id}>` },
                        { name: 'Sent At', value: new Date().toLocaleString() }
                    );
                logChannel.send({ embeds: [logEmbed] });
            }
        }

        return interaction.editReply('✅ DM sent').catch(() => {});
    }

    /* ===== /alliance ===== */
    if (commandName === 'alliance') {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
        const sub = options.getSubcommand();

        if (sub === 'add') {
            const group = options.getString('group');
            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');
            const dcLink = options.getString('discord');
            const robloxLink = options.getString('roblox');

            const newAlliance = { group, ourReps, theirReps, dcLink, robloxLink };
            alliances.push(newAlliance);
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            // Log to alliance-add channel
            if (guild) {
                const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('New Alliance Added')
                        .setColor('Green')
                        .addFields(
                            { name: 'Group', value: group },
                            { name: 'Our Reps', value: ourReps },
                            { name: 'Their Reps', value: theirReps },
                            { name: 'Discord Link', value: dcLink },
                            { name: 'Roblox Link', value: robloxLink }
                        );
                    logChannel.send({ embeds: [logEmbed] });
                }
            }

            return interaction.editReply('✅ Alliance added').catch(() => {});
        }

        if (sub === 'list') {
            if (!alliances.length) return interaction.editReply('No alliances found.').catch(() => {});

            const embed = new EmbedBuilder()
                .setTitle('🌐 Current Alliances')
                .setColor('Green');

            alliances.forEach(a => {
                embed.addFields({
                    name: a.group,
                    value:
                        `**Our Reps:** ${a.ourReps || 'N/A'}\n` +
                        `**Their Reps:** ${a.theirReps || 'N/A'}\n` +
                        `🔗 **Discord:** ${a.dcLink || 'N/A'}\n` +
                        `🔗 **Roblox:** ${a.robloxLink || 'N/A'}`
                });
            });

            return interaction.editReply({ embeds: [embed] }).catch(() => {});
        }

        if (sub === 'remove') {
            const group = options.getString('group');
            const index = alliances.findIndex(a => a.group.toLowerCase() === group.toLowerCase());
            if (index === -1) return interaction.editReply(`❌ Alliance "${group}" not found.`).catch(() => {});

            alliances.splice(index, 1);
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            if (guild) {
                const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Alliance Removed')
                        .setColor('Red')
                        .addFields(
                            { name: 'Group', value: group },
                            { name: 'Status', value: 'Removed' }
                        );
                    logChannel.send({ embeds: [logEmbed] });
                }
            }

            return interaction.editReply(`✅ Alliance "${group}" removed`).catch(() => {});
        }

        if (sub === 'edit') {
            const group = options.getString('group');
            const alliance = alliances.find(a => a.group.toLowerCase() === group.toLowerCase());
            if (!alliance) return interaction.editReply(`❌ Alliance "${group}" not found.`).catch(() => {});

            const newGroup = options.getString('new_group');
            const newOur = options.getString('our_reps');
            const newTheir = options.getString('their_reps');
            const newDiscord = options.getString('discord');
            const newRoblox = options.getString('roblox');

            if (newGroup) alliance.group = newGroup;
            if (newOur) alliance.ourReps = newOur;
            if (newTheir) alliance.theirReps = newTheir;
            if (newDiscord) alliance.dcLink = newDiscord;
            if (newRoblox) alliance.robloxLink = newRoblox;

            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            // Log edit
            if (guild) {
                const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Alliance Edited')
                        .setColor('Orange')
                        .addFields(
                            { name: 'Group', value: alliance.group },
                            { name: 'Our Reps', value: alliance.ourReps },
                            { name: 'Their Reps', value: alliance.theirReps },
                            { name: 'Discord Link', value: alliance.dcLink },
                            { name: 'Roblox Link', value: alliance.robloxLink }
                        );
                    logChannel.send({ embeds: [logEmbed] });
                }
            }

            return interaction.editReply(`✅ Alliance "${group}" updated`).catch(() => {});
        }
    }

    // ... Add /staff, /status, /rep commands with previous fixes here ...

});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

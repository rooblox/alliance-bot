require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// In-memory alliances and message ID
let alliances = [];
let masterMessageId = null;

// Update alliance list message
async function updateAllianceMessage(guild) {
    const channel = guild.channels.cache.find(c => c.name === 'alliances-list' && c.isTextBased());
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🌐 Alliances')
        .setColor('Green');

    if (alliances.length === 0) {
        embed.setDescription('No alliances currently.');
    } else {
        alliances.forEach(a => {
            embed.addFields({
                name: a.group,
                value:
                    `**Our Reps:** ${a.ourReps || 'N/A'}\n` +
                    `**Their Reps:** ${a.theirReps || 'N/A'}\n` +
                    `🔗 [Discord Link](${a.dcLink || '#'})\n` +
                    `🔗 [Roblox Link](${a.robloxLink || '#'})`
            });
        });
    }

    if (masterMessageId) {
        try {
            const msg = await channel.messages.fetch(masterMessageId);
            await msg.edit({ embeds: [embed] });
        } catch {
            const msg = await channel.send({ embeds: [embed] });
            masterMessageId = msg.id;
        }
    } else {
        const msg = await channel.send({ embeds: [embed] });
        masterMessageId = msg.id;
    }
}

// Ready event
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// DM logging
client.on('messageCreate', async message => {
    if (!message.guild && !message.author.bot) {
        const logChannel = client.channels.cache.find(c => c.name === 'dm-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📩 DM Received')
            .setColor('Blue')
            .addFields(
                { name: 'From', value: `<@${message.author.id}>` },
                { name: 'Message', value: message.content },
                { name: 'Received At', value: new Date().toLocaleString() }
            );

        logChannel.send({ embeds: [embed] });
    }
});

// Interaction handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild, member } = interaction;

    try {
        /* ===== /status ===== */
        if (commandName === 'status') {
            await interaction.deferReply({ ephemeral: true });
            const statusText = options.getString('text') || 'Kavi Café';
            await client.user.setPresence({
                activities: [{ name: statusText, type: 0 }]
            });
            return interaction.editReply(`✅ Status updated: Playing ${statusText}`);
        }

        /* ===== /dm ===== */
        if (commandName === 'dm') {
            await interaction.deferReply({ ephemeral: true });
            const user = options.getUser('user');
            const message = options.getString('message');

            const dmEmbed = new EmbedBuilder()
                .setTitle('📩 Staff Message')
                .setDescription(message)
                .setColor('Blue');

            try { await user.send({ embeds: [dmEmbed] }); } catch {}

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

            return interaction.editReply('✅ DM sent');
        }

        /* ===== /alliance ===== */
        if (commandName === 'alliance') {
            await interaction.deferReply({ ephemeral: true });
            const sub = options.getSubcommand();

            if (sub === 'add') {
                const group = options.getString('group');
                const ourReps = options.getString('our_reps');
                const theirReps = options.getString('their_reps');
                const dcLink = (options.getString('discord') || '').trim();
                const robloxLink = (options.getString('roblox') || '').trim();
                const publicChannel = options.getChannel('public_channel') || null;

                alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });
                await updateAllianceMessage(guild);

                // Optional welcome message
                if (publicChannel && publicChannel.isTextBased()) {
                    const welcome = `:tada: **Welcome New Alliance! | Kavi Café x ${group}** :tada:

We’re thrilled to officially welcome your community into an alliance with Kavi Café! :star2:

:busts_in_silhouette: Please meet your Kavi Café representatives:
${ourReps.split(/,| /).filter(Boolean).map(u => `**•** ${u}`).join('\n')}

:handshake: Looking forward to a great partnership with **${group}**!`;

                    publicChannel.send(welcome);
                }

                return interaction.editReply(`✅ Alliance **${group}** added.`);
            }

            if (sub === 'edit') {
                const groupName = options.getString('group');
                const alliance = alliances.find(a => a.group.toLowerCase() === groupName.toLowerCase());
                if (!alliance) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);

                const newGroup = options.getString('new_group');
                const newOur = options.getString('our_reps');
                const newTheir = options.getString('their_reps');
                const newDiscord = (options.getString('discord') || '').trim();
                const newRoblox = (options.getString('roblox') || '').trim();

                if (newGroup) alliance.group = newGroup;
                if (newOur) alliance.ourReps = newOur;
                if (newTheir) alliance.theirReps = newTheir;
                if (newDiscord) alliance.dcLink = newDiscord;
                if (newRoblox) alliance.robloxLink = newRoblox;

                await updateAllianceMessage(guild);
                return interaction.editReply(`✅ Alliance "${alliance.group}" updated.`);
            }

            if (sub === 'remove') {
                const groupName = options.getString('group');
                alliances = alliances.filter(a => a.group.toLowerCase() !== groupName.toLowerCase());
                await updateAllianceMessage(guild);
                return interaction.editReply(`✅ Alliance "${groupName}" removed.`);
            }

            if (sub === 'list') {
                await updateAllianceMessage(guild);
                return interaction.editReply('✅ Alliance list updated in #alliances-list.');
            }
        }

        /* ===== /rep request ===== */
        if (commandName === 'rep') {
            await interaction.deferReply({ ephemeral: true });
            const sub = options.getSubcommand();

            if (sub === 'request') {
                const numReps = options.getInteger('num_reps');
                const discordLink = options.getString('discord_link');
                const robloxLink = options.getString('roblox_link');
                const allianceLink = options.getString('alliance_link');

                const channel = guild.channels.cache.find(c => c.name === 'request-new-rep' && c.isTextBased());
                if (!channel) return interaction.editReply('❌ Channel #request-new-rep not found.');

                const embed = new EmbedBuilder()
                    .setTitle('📥 New Rep Request')
                    .setColor('Blue')
                    .addFields(
                        { name: 'Requested By', value: `<@${member.user.id}>` },
                        { name: 'Number of Reps', value: `${numReps}` },
                        { name: 'Discord Link', value: discordLink || 'N/A' },
                        { name: 'Roblox Link', value: robloxLink || 'N/A' },
                        { name: 'Alliance Link', value: allianceLink || 'N/A' },
                        { name: '📌 Instructions', value: 'When adding yourself to an alliance, make sure you give yourself the correct alliance roles. This is very important.' },
                        { name: 'Date', value: new Date().toLocaleString() }
                    );

                await channel.send({ embeds: [embed] });
                return interaction.editReply('✅ Rep request sent to #request-new-rep.');
            }
        }

    } catch (err) {
        console.error('❌ INTERACTION ERROR:', err);
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply('❌ An error occurred while running this command.');
        } else {
            return interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);

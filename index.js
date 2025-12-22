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

/* =======================
   IN-MEMORY ALLIANCES
======================= */
let alliances = [];
let alliancesListMessageId = null; // ID of the message in alliances-list

/* =======================
   HELPER: Update Alliances Message
======================= */
async function updateAlliancesMessage(channel) {
    if (!channel) return;
    let content = '**🌐 Alliances List**\n\n';
    if (!alliances.length) {
        content += 'No alliances currently.';
    } else {
        alliances.forEach(a => {
            content += `**Group:** ${a.group}\n`;
            content += `**Our Reps:** ${a.ourReps}\n`;
            content += `**Their Reps:** ${a.theirReps}\n`;
            content += `Discord Link: ${a.dcLink}\n`;
            content += `Roblox Link: ${a.robloxLink}\n`;
            content += '------------------------\n';
        });
    }

    try {
        if (alliancesListMessageId) {
            const msg = await channel.messages.fetch(alliancesListMessageId);
            await msg.edit({ content });
        } else {
            const msg = await channel.send({ content });
            alliancesListMessageId = msg.id;
        }
    } catch (err) {
        console.error('Error updating alliances message:', err);
    }
}

/* =======================
   READY EVENT
======================= */
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =======================
   DM LOGGING
======================= */
client.on('messageCreate', async (message) => {
    if (!message.guild && !message.author.bot) {
        const logChannel = client.channels.cache.find(c => c.name === 'dm-logs' && c.isTextBased());
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

/* =======================
   INTERACTIONS
======================= */
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, member, guild } = interaction;

    try {
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

            const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs' && c.isTextBased());
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

        /* ===== /status ===== */
        if (commandName === 'status') {
            await interaction.deferReply({ ephemeral: true });
            const statusText = options.getString('text') || 'Kavi Café';
            await client.user.setPresence({
                activities: [{ name: statusText, type: 0 }]
            });
            return interaction.editReply(`✅ Status updated: Playing ${statusText}`);
        }

        /* ===== /rep request ===== */
        if (commandName === 'rep') {
            const sub = options.getSubcommand();
            if (sub === 'request') {
                const numReps = options.getInteger('num_reps');
                const discordLink = options.getString('discord_link') || 'N/A';
                const robloxLink = options.getString('roblox_link') || 'N/A';
                const allianceLink = options.getString('alliance_link') || 'N/A';

                const requestChannel = guild.channels.cache.find(c => c.name === 'request-new-rep' && c.isTextBased());
                if (!requestChannel) return interaction.editReply('❌ Request channel not found.');

                const embed = new EmbedBuilder()
                    .setTitle('📥 New Rep Request')
                    .setColor('Green')
                    .addFields(
                        { name: 'Requested By', value: `<@${member.user.id}>` },
                        { name: 'Number of Reps', value: numReps.toString() },
                        { name: 'Discord Link', value: discordLink },
                        { name: 'Roblox Link', value: robloxLink },
                        { name: 'Alliance Link', value: allianceLink },
                        { name: '📌 Instructions', value: 'When adding yourself to an alliance, make sure you give yourself the correct alliance roles. This is very important.' },
                        { name: 'Date', value: new Date().toLocaleString() }
                    );

                requestChannel.send({ embeds: [embed] });
                return interaction.reply({ content: '✅ Rep request submitted.', ephemeral: true });
            }
        }

        /* ===== /alliance ===== */
        if (commandName === 'alliance') {
            await interaction.deferReply({ ephemeral: true });
            const sub = options.getSubcommand();

            if (sub === 'add') {
                const group = options.getString('group');
                const ourReps = options.getString('our_reps');
                const theirReps = options.getString('their_reps');
                const dcLink = options.getString('discord') || 'N/A';
                const robloxLink = options.getString('roblox') || 'N/A';
                const publicChannel = options.getChannel('public_channel') || null;

                alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });

                // Update the alliances-list message
                const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list' && c.isTextBased());
                await updateAlliancesMessage(listChannel);

                // Welcome message to public channel
                if (publicChannel && publicChannel.isTextBased()) {
                    const welcome = `:tada: **Welcome New Alliance! | Kavi Café x ${group}** :tada:

We’re thrilled to officially welcome your community into an alliance with Kavi Café! :star2:
This partnership is all about mutual growth, support, and fun — and we can’t wait to see what we’ll achieve together.

:speech_balloon: **Questions & Support**
If you have any questions, concerns, or suggestions, this is the perfect place to share them. We value communication and want to make sure both of our communities get the most out of this partnership.

:busts_in_silhouette: Please meet your Kavi Café representatives:
${ourReps.split(/,| /).filter(Boolean).map(u => `**•** ${u}`).join('\n')}

:handshake: **Looking Ahead**
We’re so excited to be working together and building a strong, positive relationship between our communities. Expect fun events, cross-community opportunities, and lasting connections.

:coffee::sparkles: Here’s to a successful partnership between **Kavi Café** and **${group}**! :sparkles::coffee:`;

                    publicChannel.send({ content: welcome });
                }

                return interaction.editReply(`✅ Alliance **${group}** added and message updated.`);
            }

            if (sub === 'list') {
                const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list' && c.isTextBased());
                await updateAlliancesMessage(listChannel);
                return interaction.editReply('✅ Alliances list updated.');
            }

            if (sub === 'remove') {
                const groupName = options.getString('group');
                const index = alliances.findIndex(a => a.group.toLowerCase() === groupName.toLowerCase());
                if (index === -1) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);
                alliances.splice(index, 1);

                const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list' && c.isTextBased());
                await updateAlliancesMessage(listChannel);

                return interaction.editReply(`✅ Alliance "${groupName}" removed and message updated.`);
            }

            if (sub === 'edit') {
                const groupName = options.getString('group');
                const alliance = alliances.find(a => a.group.toLowerCase() === groupName.toLowerCase());
                if (!alliance) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);

                const newGroup = options.getString('new_group');
                const newOur = options.getString('our_reps');
                const newTheir = options.getString('their_reps');
                const newDiscord = options.getString('discord');
                const newRoblox = options.getString('roblox');

                if (newGroup) alliance.group = newGroup;
                if (newOur) alliance.ourReps = newOur;
                if (newTheir) alliance.theirReps = newTheir;
                if (newDiscord) alliance.dcLink = newDiscord || 'N/A';
                if (newRoblox) alliance.robloxLink = newRoblox || 'N/A';

                const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list' && c.isTextBased());
                await updateAlliancesMessage(listChannel);

                return interaction.editReply(`✅ Alliance "${alliance.group}" updated and message edited.`);
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

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

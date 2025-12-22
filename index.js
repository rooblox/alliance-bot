require('dotenv').config();
const fs = require('fs');
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
   DM LOGGING
======================= */
client.on('messageCreate', async (message) => {
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
                fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

                // Log in alliance-add channel
                const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('New Alliance Added')
                        .setColor('Green')
                        .addFields(
                            { name: 'Group', value: group },
                            { name: 'Our Reps', value: ourReps },
                            { name: 'Their Reps', value: theirReps },
                            { name: 'Discord Link', value: dcLink || 'N/A' },
                            { name: 'Roblox Link', value: robloxLink || 'N/A' }
                        );
                    logChannel.send({ embeds: [logEmbed] });
                }

                // Send welcome message to public channel
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

                    publicChannel.send(welcome);
                }

                return interaction.editReply(`✅ Alliance **${group}** added successfully.`);
            }

            if (sub === 'list') {
                if (!alliances.length) return interaction.editReply('❌ No alliances found.');

                const embed = new EmbedBuilder()
                    .setTitle('🌐 Alliances')
                    .setColor('Green');

                alliances.forEach(a => {
                    const dcLink = a.dcLink?.trim() || null;
                    const robloxLink = a.robloxLink?.trim() || null;

                    embed.addFields({
                        name: a.group,
                        value:
                            `**Our Reps:** ${a.ourReps || 'N/A'}\n` +
                            `**Their Reps:** ${a.theirReps || 'N/A'}\n` +
                            `🔗 Discord: ${dcLink ? dcLink : 'N/A'}\n` +
                            `🔗 Roblox: ${robloxLink ? robloxLink : 'N/A'}`
                    });
                });

                return interaction.editReply({ embeds: [embed] });
            }

            if (sub === 'remove') {
                const groupName = options.getString('group');
                const index = alliances.findIndex(a => a.group.toLowerCase() === groupName.toLowerCase());
                if (index === -1) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);
                alliances.splice(index, 1);
                fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

                const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Alliance Removed')
                        .setColor('Red')
                        .addFields(
                            { name: 'Group', value: groupName },
                            { name: 'Status', value: 'Removed' }
                        );
                    logChannel.send({ embeds: [logEmbed] });
                }

                return interaction.editReply(`✅ Alliance "${groupName}" removed.`);
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

                fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

                const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Alliance Edited')
                        .setColor('Orange')
                        .addFields(
                            { name: 'Group', value: alliance.group },
                            { name: 'Our Reps', value: alliance.ourReps },
                            { name: 'Their Reps', value: alliance.theirReps },
                            { name: 'Discord Link', value: alliance.dcLink || 'N/A' },
                            { name: 'Roblox Link', value: alliance.robloxLink || 'N/A' }
                        );
                    logChannel.send({ embeds: [logEmbed] });
                }

                return interaction.editReply(`✅ Alliance "${alliance.group}" updated.`);
            }
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

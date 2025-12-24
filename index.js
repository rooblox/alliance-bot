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

// ===== Staff Strikes Data =====
let strikes = fs.existsSync('./staffStrikes.json')
    ? JSON.parse(fs.readFileSync('./staffStrikes.json'))
    : [];

// ===== Alliances In-Memory =====
let alliances = [];
let allianceListMessageId = null;

// ===== Ready =====
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===== DM Logging =====
client.on('messageCreate', async message => {
    if (!message.guild && !message.author.bot) {
        const logChannel = client.channels.cache.find(c => c.name === 'dm-logs');
        if (!logChannel) return;

        // Log incoming DM
        const embed = new EmbedBuilder()
            .setTitle('📩 DM Received')
            .setColor('Blue')
            .addFields(
                { name: 'From', value: `<@${message.author.id}>` },
                { name: 'Message', value: message.content || '(No text)' },
                { name: 'Date', value: new Date().toLocaleString() }
            );

        logChannel.send({ embeds: [embed] });
    }
});

// ===== Update Alliance List =====
async function updateAllianceList(channel) {
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🌐 Alliances')
        .setColor('Green')
        .setTimestamp();

    if (!alliances.length) {
        embed.setDescription('No alliances found.');
    } else {
        alliances.forEach(a => {
            embed.addFields({
                name: a.group,
                value:
                    `**Our Reps:** ${a.ourReps}\n` +
                    `**Their Reps:** ${a.theirReps}\n` +
                    `**Discord Link:** ${a.dcLink || 'None'}\n` +
                    `**Roblox Link:** ${a.robloxLink || 'None'}`
            });
        });
    }

    if (allianceListMessageId) {
        try {
            const msg = await channel.messages.fetch(allianceListMessageId);
            await msg.edit({ embeds: [embed] });
            return;
        } catch {}
    }

    const msg = await channel.send({ embeds: [embed] });
    allianceListMessageId = msg.id;
}

// ===== Interaction Handler =====
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, member, guild } = interaction;

    try {
        // ===== /status =====
        if (commandName === 'status') {
            await interaction.deferReply({ ephemeral: true });
            const text = options.getString('text');
            await client.user.setPresence({
                activities: [{ name: text, type: 0 }]
            });
            return interaction.editReply(`✅ Status set to **${text}**`);
        }

        // ===== /dm =====
        if (commandName === 'dm') {
            await interaction.deferReply({ ephemeral: true });
            const user = options.getUser('user');
            const msg = options.getString('message');

            const embed = new EmbedBuilder()
                .setTitle('📩 Staff Message')
                .setDescription(msg)
                .setColor('Blue');

            try { await user.send({ embeds: [embed] }); } catch {}

            const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
            if (logChannel) {
                logChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('📩 Staff DM Sent')
                            .setColor('Blue')
                            .addFields(
                                { name: 'To', value: `<@${user.id}>` },
                                { name: 'Message', value: msg },
                                { name: 'Sent By', value: `<@${member.user.id}>` },
                                { name: 'Date', value: new Date().toLocaleString() }
                            )
                    ]
                });
            }

            return interaction.editReply('✅ DM sent.');
        }

        // ===== /rep request =====
        if (commandName === 'rep') {
            await interaction.deferReply({ ephemeral: true });
            const numReps = options.getInteger('num_reps');
            const discordLink = options.getString('discord_link');
            const robloxLink = options.getString('roblox_link');
            const allianceLink = options.getString('alliance_link');

            const channel = guild.channels.cache.find(c => c.name === 'request-new-rep');
            if (!channel) return interaction.editReply('❌ Channel not found.');

            const embed = new EmbedBuilder()
                .setTitle('📥 New Rep Request')
                .setColor('Blue')
                .addFields(
                    { name: 'Requested By', value: `<@${member.user.id}>` },
                    { name: 'Number of Reps', value: String(numReps) },
                    { name: 'Discord Link', value: discordLink },
                    { name: 'Roblox Link', value: robloxLink },
                    { name: 'Alliance Link', value: allianceLink },
                    { name: '📌 Instructions', value: 'When adding yourself to an alliance, make sure you give yourself the correct alliance roles. This is very important.' },
                    { name: 'Date', value: new Date().toLocaleString() }
                );

            await channel.send({ embeds: [embed] });
            return interaction.editReply('✅ Rep request sent.');
        }

        // ===== /alliance =====
        if (commandName === 'alliance') {
            await interaction.deferReply({ ephemeral: true });
            const sub = options.getSubcommand();
            const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list');

            if (sub === 'add') {
                const group = options.getString('group');
                const ourReps = options.getString('our_reps');
                const theirReps = options.getString('their_reps');
                const dcLink = options.getString('discord_link') || 'None';
                const robloxLink = options.getString('roblox_link') || 'None';
                const publicChannel = options.getChannel('public_channel');

                alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });

                if (publicChannel?.isTextBased()) {
                    publicChannel.send(
                        `:tada: Welcome New Alliance! | Kavi Café x ${group} :tada:\n\n` +
                        `We’re thrilled to officially welcome your community into an alliance with Kavi Café! :star2:\n` +
                        `This partnership is all about mutual growth, support, and fun — and we can’t wait to see what we’ll achieve together.\n\n` +
                        `:speech_balloon: Questions & Support\n` +
                        `If you have any questions, concerns, or suggestions, this is the perfect place to share them. We value communication and want to make sure both of our communities get the most out of this partnership.\n\n` +
                        `:busts_in_silhouette: Please meet your Kavi Café representatives:\n` +
                        ourReps.split(/,| /).filter(Boolean).map(r => `• ${r}`).join('\n') + '\n\n' +
                        `:handshake: Looking Ahead\n` +
                        `We’re so excited to be working together and building a strong, positive relationship between our communities. Expect fun events, cross-community opportunities, and lasting connections.\n\n` +
                        `:coffee::sparkles: Here’s to a successful partnership between Kavi Café and ${group}! :sparkles::coffee:`
                    );
                }

                if (listChannel) await updateAllianceList(listChannel);
                return interaction.editReply(`✅ Alliance **${group}** added.`);
            }

            if (sub === 'remove') {
                const group = options.getString('group');
                alliances = alliances.filter(a => a.group.toLowerCase() !== group.toLowerCase());
                if (listChannel) await updateAllianceList(listChannel);
                return interaction.editReply(`✅ Alliance **${group}** removed.`);
            }

            if (sub === 'list') {
                if (listChannel) await updateAllianceList(listChannel);
                return interaction.editReply('✅ Alliance list updated.');
            }
        }

        // ===== /staff =====
        if (commandName === 'staff') {
            const sub = options.getSubcommand();

            // ---- Discipline ----
            if (sub === 'discipline') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const targetUser = options.getUser('user');
                    const reason = options.getString('reason');

                    if (!targetUser) return interaction.editReply('❌ User not found.');

                    let staffMember = null;
                    if (guild) staffMember = await guild.members.fetch(targetUser.id).catch(() => null);
                    const target = staffMember || targetUser;

                    let strikeData = strikes.find(s => s.id === target.id);
                    if (!strikeData) {
                        strikeData = { id: target.id, count: 0, history: [] };
                        strikes.push(strikeData);
                    }
                    strikeData.count += 1;
                    strikeData.history.push({ reason, date: new Date().toISOString() });
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 4));

                    try {
                        await target.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('Strike Notice')
                                    .setColor('Red')
                                    .setDescription(
                                        `Greetings, <@${target.id}>\n\n` +
                                        `I'm unfortunately saddened to inform you that you have received a strike for your actions at Kavià Cafe.\n` +
                                        `This is your ${strikeData.count}${strikeData.count === 1 ? 'st' : strikeData.count === 2 ? 'nd' : 'th'} strike.\n\n` +
                                        `🗒️ Reason: ${reason}\n\n` +
                                        `If you feel like this was false or inaccurate please open a ticket.\n\n` +
                                        `Regards,\nStaff Team\nKavià | Public Relations team`
                                    )
                            ]
                        });
                    } catch {}

                    const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');
                    if (logChannel) {
                        await logChannel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle('📌 Staff Discipline')
                                    .setColor('Red')
                                    .addFields(
                                        { name: 'Staff', value: `<@${target.id}>` },
                                        { name: 'Reason', value: reason },
                                        { name: 'Strike Number', value: String(strikeData.count) },
                                        { name: 'By', value: `<@${member.user.id}>` },
                                        { name: 'Date', value: new Date().toLocaleString() }
                                    )
                            ]
                        });
                    }

                    return interaction.editReply(`✅ Strike added to <@${target.id}>.`);
                } catch (err) {
                    console.error('Staff discipline error:', err);
                    return interaction.editReply('❌ An error occurred while adding the strike.');
                }
            }

            // ---- View Strikes ----
            if (sub === 'strikes') {
                const list = strikes.map(s => `<@${s.id}> - ${s.count} strike(s)`).join('\n') || 'No strikes recorded.';
                return interaction.reply({ content: list, ephemeral: true });
            }
        }

    } catch (err) {
        console.error(err);
        return interaction.editReply('❌ An error occurred while executing this command.');
    }
});

client.login(process.env.TOKEN);

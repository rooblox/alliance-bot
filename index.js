require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
});

// ===== Strikes data =====
let strikes = fs.existsSync('./staffStrikes.json')
    ? JSON.parse(fs.readFileSync('./staffStrikes.json'))
    : [];

// ===== In-memory alliances =====
let alliances = [];
let allianceListMessageId = null;

// ===== Helper: update alliance list message =====
async function updateAllianceList(channel) {
    if (!channel) return;
    let content = '';

    if (!alliances.length) {
        content = '🌐 No alliances found.';
    } else {
        alliances.forEach(a => {
            content += `---------------------------\n`;
            content += `Group: ${a.group}\n`;
            content += `Our Reps: ${a.ourReps}\n`;
            content += `Their Reps: ${a.theirReps}\n`;
            content += `Discord Link: ${a.dcLink || 'N/A'}\n`;
            content += `Roblox Link: ${a.robloxLink || 'N/A'}\n`;
            content += `---------------------------\n\n`;
        });
    }

    if (allianceListMessageId) {
        try {
            const msg = await channel.messages.fetch(allianceListMessageId);
            await msg.edit(content);
        } catch {
            const msg = await channel.send(content);
            allianceListMessageId = msg.id;
        }
    } else {
        const msg = await channel.send(content);
        allianceListMessageId = msg.id;
    }
}

// ===== Ready =====
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===== DM Logging =====
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

// ===== Interactions =====
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, member, guild } = interaction;

    try {
        // ===== /status =====
        if (commandName === 'status') {
            await interaction.deferReply({ ephemeral: true });
            const statusText = options.getString('text') || 'Kavi Café';
            await client.user.setPresence({
                activities: [{ name: statusText, type: 0 }]
            });
            return interaction.editReply(`✅ Status updated: Playing ${statusText}`);
        }

        // ===== /dm =====
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

        // ===== /rep request =====
        if (commandName === 'rep') {
            const sub = options.getSubcommand();
            if (sub === 'request') {
                await interaction.deferReply({ ephemeral: true });
                const numReps = options.getInteger('num_reps');
                const discordLink = options.getString('discord_link');
                const robloxLink = options.getString('roblox_link');
                const allianceLink = options.getString('alliance_link');

                const repChannel = guild.channels.cache.find(c => c.name === 'request-new-rep');
                if (repChannel && repChannel.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setTitle('📥 New Rep Request')
                        .setColor('Blue')
                        .addFields(
                            { name: 'Requested By', value: `<@${member.user.id}>` },
                            { name: 'Number of Reps', value: numReps.toString() },
                            { name: 'Discord Link', value: discordLink || 'N/A' },
                            { name: 'Roblox Link', value: robloxLink || 'N/A' },
                            { name: 'Alliance Link', value: allianceLink || 'N/A' },
                            { name: '📌 Instructions', value: 'When adding yourself to an alliance, make sure you give yourself the correct alliance roles. This is very important.' },
                            { name: 'Date', value: new Date().toLocaleString() }
                        );
                    await repChannel.send({ embeds: [embed] });
                }

                return interaction.editReply('✅ Rep request sent.');
            }
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
               const dcLink = options.getString('discord_link') || 'N/A';
               const robloxLink = options.getString('roblox_link') || 'N/A';
                const publicChannel = options.getChannel('public_channel') || null;

                alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });

                // Welcome message
                if (publicChannel && publicChannel.isTextBased()) {
                    const welcome = `:tada: **Welcome New Alliance! | Kavi Café x ${group}** :tada:

We’re thrilled to officially welcome your community into an alliance with Kavi Café! :star2:

:busts_in_silhouette: Kavi Café representatives:
${ourReps.split(/,| /).filter(Boolean).map(u => `• ${u}`).join('\n')}

:handshake: We look forward to a strong partnership!
`;
                    await publicChannel.send(welcome);
                }

                if (listChannel) await updateAllianceList(listChannel);

                return interaction.editReply(`✅ Alliance **${group}** added.`);
            }

            if (sub === 'remove') {
                const groupName = options.getString('group');
                const index = alliances.findIndex(a => a.group.toLowerCase() === groupName.toLowerCase());
                if (index === -1) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);
                alliances.splice(index, 1);

                if (listChannel) await updateAllianceList(listChannel);

                return interaction.editReply(`✅ Alliance "${groupName}" removed.`);
            }

            if (sub === 'edit') {
                const groupName = options.getString('group');
                const alliance = alliances.find(a => a.group.toLowerCase() === groupName.toLowerCase());
                if (!alliance) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);

                const newGroup = options.getString('new_group');
                const newOur = options.getString('our_reps');
                const newTheir = options.getString('their_reps');
                const newDiscord = options.getString('discord_link');
                const newRoblox = options.getString('roblox_link');
                if (newGroup) alliance.group = newGroup;
                if (newOur) alliance.ourReps = newOur;
                if (newTheir) alliance.theirReps = newTheir;
                if (newDiscord) alliance.dcLink = newDiscord || 'N/A';
                if (newRoblox) alliance.robloxLink = newRoblox || 'N/A';

                if (listChannel) await updateAllianceList(listChannel);

                return interaction.editReply(`✅ Alliance "${alliance.group}" updated.`);
            }

            if (sub === 'list') {
                if (!listChannel) return interaction.editReply('❌ No channel named "alliances-list" found.');
                await updateAllianceList(listChannel);
                return interaction.editReply('✅ Alliance list updated in #alliances-list.');
            }
        }

        // ===== /staff =====
        if (commandName === 'staff') {
            await interaction.deferReply({ ephemeral: true });
            const sub = options.getSubcommand();

            if (sub === 'discipline') {
                const target = options.getUser('member');
                const action = options.getString('action');
                const reason = options.getString('reason');
                const category = options.getString('category');

                if (action === 'add') {
                    strikes.push({ type: 'Strike', reason, staff: member.user.username, timestamp: new Date().toISOString() });
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                    return interaction.editReply(`✅ Strike added to ${target.username}`);
                }

                if (action === 'remove') {
                    const index = strikes.findIndex(s => s.staff === target.username && s.reason === reason);
                    if (index !== -1) strikes.splice(index, 1);
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                    return interaction.editReply(`✅ Strike removed from ${target.username}`);
                }

                if (action === 'kick') {
                    const memberObj = guild.members.cache.get(target.id);
                    if (memberObj) await memberObj.kick(reason);
                    return interaction.editReply(`✅ ${target.username} has been kicked.`);
                }
            }

            if (sub === 'strikes') {
                const target = options.getUser('member');
                const userStrikes = strikes.filter(s => s.staff === target.username);
                if (!userStrikes.length) return interaction.editReply(`${target.username} has no strikes.`);

                let desc = '';
                userStrikes.forEach((s, i) => {
                    desc += `Strike ${i + 1} - ${s.reason} by ${s.staff} on ${new Date(s.timestamp).toLocaleString()}\n`;
                });

                return interaction.editReply({ content: desc });
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

// ===== Login =====
client.login(process.env.TOKEN);
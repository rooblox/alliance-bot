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

/* =======================
   STAFF STRIKES
======================= */
let strikes = fs.existsSync('./staffStrikes.json')
    ? JSON.parse(fs.readFileSync('./staffStrikes.json'))
    : [];

/* =======================
   ALLIANCES (IN MEMORY)
======================= */
let alliances = [];
let allianceListMessageId = null;

/* =======================
   UPDATE ALLIANCE LIST (EMBED)
======================= */
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
                    `**Discord Link:** ${a.dcLink || 'N/A'}\n` +
                    `**Roblox Link:** ${a.robloxLink || 'N/A'}`
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

    const prRole = guild.roles.cache.find(r => r.name === '[PR] | Staff Role');
    if (!prRole) {
  console.warn('[WARN] PR role not found, skipping role ping');
}

    const msg = await channel.send({
        content: prRole ? `<@&${prRole.id}>` : null,
        embeds: [embed],
        allowedMentions: { roles: prRole ? [prRole.id] : [] }
});

allianceListMessageId = msg.id;


/* =======================
   READY
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
                { name: 'Message', value: message.content || '(No text)' },
                { name: 'Date', value: new Date().toLocaleString() }
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

        /* ===== /status ===== */
        if (commandName === 'status') {
            await interaction.deferReply({ ephemeral: true });
            const text = options.getString('text');
            await client.user.setPresence({
                activities: [{ name: text, type: 0 }]
            });
            return interaction.editReply(`✅ Status set to **${text}**`);
        }

        /* ===== /dm ===== */
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

        /* ===== /rep request (FIXED) ===== */
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
                    {
                        name: '📌 Instructions',
                        value: 'When adding yourself to an alliance, make sure you give yourself the correct alliance roles.'
                    },
                    { name: 'Date', value: new Date().toLocaleString() }
                );

            await channel.send({ embeds: [embed] });
            return interaction.editReply('✅ Rep request sent.');
        }

        /* ===== /alliance ===== */
        if (commandName === 'alliance') {
            await interaction.deferReply({ ephemeral: true });

            const sub = options.getSubcommand();
            const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list');

            /* === ADD === */
            if (sub === 'add') {
            const group = options.getString('group');
            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');

            const dcLinkRaw =
                options.getString('discord_link') ||
                options.getString('discord') ||
                options.getString('discord_invite');

            const dcLink = normalizeUrl(dcLinkRaw);

            const robloxLink = options.getString('roblox_link');
            const publicChannel = options.getChannel('public_channel');

            alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });
        }


                if (publicChannel?.isTextBased()) {
                    publicChannel.send(
`:tada: **Welcome New Alliance! | Kavi Café x ${group}** :tada:

:busts_in_silhouette: **Our Reps**
${ourReps.split(/,| /).filter(Boolean).map(r => `• ${r}`).join('\n')}

:handshake: We look forward to a strong partnership!`
                    );
                }

                if (listChannel) await updateAllianceList(listChannel);
                return interaction.editReply(`✅ Alliance **${group}** added.`);
            }

            /* === REMOVE === */
            if (sub === 'remove') {
                const group = options.getString('group');
                alliances = alliances.filter(a => a.group.toLowerCase() !== group.toLowerCase());
                if (listChannel) await updateAllianceList(listChannel);
                return interaction.editReply(`✅ Alliance **${group}** removed.`);
            }

            /* === LIST === */
            if (sub === 'list') {
                if (listChannel) await updateAllianceList(listChannel);
                return interaction.editReply('✅ Alliance list updated.');
            }
        }

    } catch (err) {
        console.error(err);
        return interaction.editReply('❌ An error occurred while running this command.');
    }
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);
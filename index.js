require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    PermissionFlagsBits,
    ActivityType
} = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

/* ================== READY ================== */
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================== ALLIANCE STORAGE ================== */
let alliances = [];
let staffStrikes = fs.existsSync('./staffStrikes.json')
    ? JSON.parse(fs.readFileSync('./staffStrikes.json'))
    : {};

/* ================== INTERACTIONS ================== */
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild } = interaction;

    /* ========= /STATUS ========= */
    if (commandName === 'status') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
        }
        const text = options.getString('text');
        client.user.setActivity(text, { type: ActivityType.Playing });
        return interaction.reply({ content: '✅ Status updated.', ephemeral: true });
    }

    /* ========= /DM ========= */
    if (commandName === 'dm') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
        }
        const user = options.getUser('user');
        const message = options.getString('message');
        const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
        await user.send(message).catch(() => null);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📩 DM Sent')
                .addFields(
                    { name: 'User', value: user.tag },
                    { name: 'Message', value: message }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] });
        }
        return interaction.reply({ content: '✅ DM sent.', ephemeral: true });
    }

    /* ========= /REP REQUEST ========= */
    if (commandName === 'rep' && options.getSubcommand() === 'request') {
        const num = options.getInteger('num_reps');
        const dc = options.getString('discord_link');
        const roblox = options.getString('roblox_link');
        const alliance = options.getString('alliance_link');

        const channel = guild.channels.cache.find(c => c.name === 'rep-requests');
        const prRole = guild.roles.cache.find(r => r.name === '[PR] | Staff Role');
        if (!channel) return interaction.reply({ content: '❌ rep-requests channel missing.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('📥 New Rep Request')
            .addFields(
                { name: 'Requested By', value: `<@${interaction.user.id}>` },
                { name: 'Number of Reps', value: `${num}` },
                { name: 'Discord Link', value: dc },
                { name: 'Roblox Link', value: roblox },
                { name: 'Alliance Link', value: alliance },
                { name: '📌 Instructions', value: 'When adding yourself to an alliance, make sure you give yourself the correct alliance roles. This is very important.' },
                { name: 'Date', value: new Date().toLocaleString() }
            )
            .setTimestamp();

        await channel.send({ content: prRole ? `<@&${prRole.id}>` : '', embeds: [embed] });
        return interaction.reply({ content: '✅ Rep request sent.', ephemeral: true });
    }

    /* ========= /STAFF DISCIPLINE ========= */
    if (commandName === 'staff') {
        const sub = options.getSubcommand();
        const staffUser = options.getUser('user');

        // ---- Add Strike ----
        if (sub === 'discipline') {
            if (!staffStrikes[staffUser.id]) staffStrikes[staffUser.id] = 0;
            staffStrikes[staffUser.id]++;
            fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));
            return interaction.reply({ content: `✅ Added 1 strike to ${staffUser.tag}. Total strikes: ${staffStrikes[staffUser.id]}`, ephemeral: true });
        }

        // ---- View Strikes ----
        if (sub === 'strikes') {
            const strikesText = Object.entries(staffStrikes)
                .map(([id, strikes]) => `<@${id}>: ${strikes}`)
                .join('\n') || 'No strikes recorded.';
            return interaction.reply({ content: strikesText, ephemeral: true });
        }
    }

    /* ========= /ALLIANCE ========= */
    if (commandName === 'alliance') {
        const sub = options.getSubcommand();

        /* ----- ADD ----- */
        if (sub === 'add') {
            const group = options.getString('group');
            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');

            const dcLink =
                options.getString('discord_link') ||
                options.getString('dc_link');
            const robloxLink =
                options.getString('roblox_link') ||
                options.getString('roblox');
            const publicChannel = options.getChannel('public_channel');

            alliances.push({
                group,
                ourReps,
                theirReps,
                dcLink,
                robloxLink
            });

            const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list');
            if (listChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🌐 New Alliance Added')
                    .addFields(
                        { name: 'Group', value: group },
                        { name: 'Our Reps', value: ourReps },
                        { name: 'Their Reps', value: theirReps },
                        { name: 'Discord Link', value: dcLink || 'None' },
                        { name: 'Roblox Link', value: robloxLink || 'None' }
                    )
                    .setTimestamp();

                await listChannel.send({ embeds: [embed] });
            }

            // ----- Send public channel message if picked -----
            if (publicChannel && publicChannel.isTextBased()) {
                const repsList = ourReps.split(/,| /).filter(Boolean).map(r => `• @${r}`).join('\n');
                const welcomeMessage = `:tada: Welcome New Alliance! | Kavi Café x ${group} :tada:

We’re thrilled to officially welcome your community into an alliance with Kavi Café! :star2:
This partnership is all about mutual growth, support, and fun — and we can’t wait to see what we’ll achieve together.

:speech_balloon: Questions & Support
If you have any questions, concerns, or suggestions, this is the perfect place to share them. We value communication and want to make sure both of our communities get the most out of this partnership.

:busts_in_silhouette: Please meet your Kavi Café representatives:
${repsList}

:handshake: Looking Ahead
We’re so excited to be working together and building a strong, positive relationship between our communities. Expect fun events, cross-community opportunities, and lasting connections.

:coffee::sparkles: Here’s to a successful partnership between Kavi Café and ${group}! :sparkles::coffee:`;

                await publicChannel.send(welcomeMessage);
            }

            return interaction.reply({ content: '✅ Alliance added.', ephemeral: true });
        }

        /* ----- REMOVE ----- */
        if (sub === 'remove') {
            const group = options.getString('group');
            alliances = alliances.filter(a => a.group !== group);
            return interaction.reply({ content: `✅ Alliance **${group}** removed.`, ephemeral: true });
        }

        /* ----- LIST ----- */
        if (sub === 'list') {
            const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list');
            if (!listChannel) return interaction.reply({ content: '❌ alliances-list channel missing.', ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle('🌐 Alliance List')
                .setTimestamp();

            if (!alliances.length) embed.setDescription('No alliances yet.');
            else {
                alliances.forEach(a => {
                    embed.addFields({
                        name: a.group,
                        value:
                            `Our Reps: ${a.ourReps}\n` +
                            `Their Reps: ${a.theirReps}\n` +
                            `Discord: ${a.dcLink || 'None'}\n` +
                            `Roblox: ${a.robloxLink || 'None'}`
                    });
                });
            }

            await listChannel.send({ embeds: [embed] });
            return interaction.reply({ content: '✅ Alliance list posted.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);

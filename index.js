require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionFlagsBits, ActivityType } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

/* ================== READY ================== */
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================== STORAGE ================== */
let alliances = [];
let staffStrikes = fs.existsSync('./staffStrikes.json') ? JSON.parse(fs.readFileSync('./staffStrikes.json')) : {};

/* ================== INTERACTIONS ================== */
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild } = interaction;

    /* ========= /STATUS ========= */
    if (commandName === 'status') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
            return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
        const text = options.getString('text');
        client.user.setActivity(text, { type: ActivityType.Playing });
        return interaction.reply({ content: '✅ Status updated.', ephemeral: true });
    }

    /* ========= /DM ========= */
    if (commandName === 'dm') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
            return interaction.reply({ content: '❌ Admin only.', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        const user = options.getUser('user');
        const messageText = options.getString('message');
        const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');

        // Send embed to user
        const dmEmbed = new EmbedBuilder()
            .setTitle('📩 Staff Message')
            .setDescription(messageText)
            .setColor('Blue')
            .setTimestamp();
        await user.send({ embeds: [dmEmbed] }).catch(() => null);

        // Log message to dm-logs
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📩 Staff DM Sent')
                .addFields(
                    { name: 'To', value: `<@${user.id}>` },
                    { name: 'Message', value: messageText },
                    { name: 'Sent By', value: `<@${interaction.user.id}>` },
                    { name: 'Date', value: new Date().toLocaleString() }
                )
                .setColor('Blue')
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }

        return interaction.editReply({ content: '✅ DM sent.' });
    }

    /* ========= /STAFF DISCIPLINE & STRIKES ========= */
    if (commandName === 'staff') {
        const sub = options.getSubcommand();

        if (sub === 'discipline') {
            await interaction.deferReply({ ephemeral: true });

            try {
                const staffUser = options.getUser('user');
                const reason = options.getString('reason') || 'No reason provided';

                if (!staffStrikes[staffUser.id]) staffStrikes[staffUser.id] = 0;
                staffStrikes[staffUser.id]++;
                fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

                const strikeCount = staffStrikes[staffUser.id];
                const ordinal = ['1st','2nd','3rd'][strikeCount-1] || `${strikeCount}th`;

                // DM staff member
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('Strike Notice')
                        .setDescription(`Greetings, <@${staffUser.id}>\n\nI'm unfortunately saddened to inform you that you have received a strike for your actions at Kavià Café.\nThis is your ${ordinal} strike.\n\n🗒️ Reason: ${reason}\n\nIf you feel like this was false or inaccurate please open a ticket.\n\nRegards,\nStaff Team\nKavià || Public Relations team`)
                        .setColor('Red')
                        .setTimestamp();
                    await staffUser.send({ embeds: [dmEmbed] });
                } catch (err) {
                    console.warn(`Could not DM ${staffUser.tag}`);
                }

                // Log to staff-discipline channel
                try {
                    const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('📌 Staff Discipline')
                            .addFields(
                                { name: 'Staff Member', value: `<@${staffUser.id}>` },
                                { name: 'Strike Number', value: `${strikeCount}` },
                                { name: 'Reason', value: reason },
                                { name: 'Given By', value: `<@${interaction.user.id}>` },
                                { name: 'Date', value: new Date().toLocaleString() }
                            )
                            .setColor('Red')
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                } catch(err) {
                    console.warn('Could not log staff discipline:', err);
                }

                return interaction.editReply({ content: `✅ Added strike to ${staffUser.tag} (${ordinal})` });

            } catch (err) {
                console.error('Staff discipline error:', err);
                return interaction.editReply({ content: '❌ An error occurred while adding strike.' });
            }
        }

        if (sub === 'strikes') {
            const strikesText = Object.entries(staffStrikes)
                .map(([id, strikes]) => `<@${id}>: ${strikes}`)
                .join('\n') || 'No strikes recorded.';
            return interaction.reply({ content: strikesText, ephemeral: true });
        }
    }

    /* ========= /REP REQUEST ========= */
    if (commandName === 'rep' && options.getSubcommand() === 'request') {
        await interaction.deferReply({ ephemeral: true });

        const num = options.getInteger('num_reps');
        const dc = options.getString('discord_link');
        const roblox = options.getString('roblox_link');
        const alliance = options.getString('alliance_link');

        const channel = guild.channels.cache.find(c => c.name === 'rep-requests');
        const prRole = guild.roles.cache.find(r => r.name === '[PR] | Staff Role');
        if (!channel) return interaction.editReply({ content: '❌ rep-requests channel missing.' });

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
        return interaction.editReply({ content: '✅ Rep request sent.' });
    }

    /* ========= /ALLIANCE ========= */
    if (commandName === 'alliance') {
        const sub = options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });

        if (sub === 'add') {
            const group = options.getString('group');
            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');
            const dcLink = options.getString('discord_link') || options.getString('dc_link');
            const robloxLink = options.getString('roblox_link') || options.getString('roblox');
            const publicChannel = options.getChannel('public_channel');

            alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });

            try {
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
            } catch(err) {
                console.error('Error sending alliance messages:', err);
            }

            return interaction.editReply({ content: '✅ Alliance added.' });
        }

        if (sub === 'remove') {
            const group = options.getString('group');
            alliances = alliances.filter(a => a.group !== group);
            return interaction.editReply({ content: `✅ Alliance **${group}** removed.` });
        }

        if (sub === 'list') {
            const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list');
            if (!listChannel) return interaction.editReply({ content: '❌ alliances-list channel missing.' });

            const embed = new EmbedBuilder().setTitle('🌐 Alliance List').setTimestamp();
            if (!alliances.length) embed.setDescription('No alliances yet.');
            else {
                alliances.forEach(a => {
                    embed.addFields({
                        name: a.group,
                        value: `Our Reps: ${a.ourReps}\nTheir Reps: ${a.theirReps}\nDiscord: ${a.dcLink || 'None'}\nRoblox: ${a.robloxLink || 'None'}`
                    });
                });
            }

            await listChannel.send({ embeds: [embed] });
            return interaction.editReply({ content: '✅ Alliance list posted.' });
        }
    }
});

/* ================== DM LOGGING ================== */
client.on('messageCreate', async message => {
    if (!message.guild && !message.author.bot) {
        const logChannel = client.channels.cache.find(c => c.name === 'dm-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📩 DM Received')
            .addFields(
                { name: 'From', value: `<@${message.author.id}>` },
                { name: 'Message', value: message.content || '(No text)' },
                { name: 'Date', value: new Date().toLocaleString() }
            )
            .setColor('Blue')
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);

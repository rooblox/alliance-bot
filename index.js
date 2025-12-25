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
    partials: [Partials.Channel, Partials.Message]
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
        const messageText = options.getString('message');
        const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');

        const dmEmbed = new EmbedBuilder()
            .setTitle('📩 Staff Message')
            .setDescription(messageText)
            .setColor('Blue')
            .setTimestamp();
        await user.send({ embeds: [dmEmbed] }).catch(() => null);

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

        return interaction.reply({ content: '✅ DM sent.', ephemeral: true });
    }

   /* ========= /STAFF ========= */
if (commandName === 'staff') {
    const sub = options.getSubcommand();
    const staffUser = options.getUser('user');
    const reason = options.getString('reason') || 'No reason provided';
    const action = options.getString('action');

    if (sub === 'discipline') {
        if (!staffUser) return interaction.reply({ content: '❌ No user specified.', ephemeral: true });
        if (!action) return interaction.reply({ content: '❌ No action specified.', ephemeral: true });

        const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');

        if (action === 'add') {
            if (!staffStrikes[staffUser.id]) staffStrikes[staffUser.id] = 0;
            staffStrikes[staffUser.id]++;
            fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

            const strikeCount = staffStrikes[staffUser.id];
            const ordinal = ['1st','2nd','3rd'][strikeCount-1] || `${strikeCount}th`;

            // DM user
            const dmEmbed = new EmbedBuilder()
                .setTitle('Strike Notice')
                .setDescription(
                    `Greetings, <@${staffUser.id}>\n\n` +
                    `I'm unfortunately saddened to inform you that you have received a strike for your actions at Kavià Café. This is your ${ordinal} strike.\n\n` +
                    `🗒️ Reason: ${reason}\n\n` +
                    `If you feel like this was false or inaccurate please open a ticket.\n\n` +
                    `Regards,\nStaff Team\nKavià || Public Relations team`
                )
                .setColor('Red')
                .setTimestamp();
            await staffUser.send({ embeds: [dmEmbed] }).catch(() => null);

            // Log to channel
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📌 Staff Discipline Log')
                    .addFields(
                        { name: 'Member', value: `<@${staffUser.id}>` },
                        { name: 'Action', value: 'Added Strike' },
                        { name: 'Reason', value: reason },
                        { name: 'Staff', value: `<@${interaction.user.id}>` }
                    )
                    .setColor('Red')
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.reply({ content: `✅ Added strike to ${staffUser.tag} (${ordinal})`, ephemeral: true });
        }

        if (action === 'remove') {
            if (!staffStrikes[staffUser.id] || staffStrikes[staffUser.id] === 0) {
                return interaction.reply({ content: `❌ ${staffUser.tag} has no strikes to remove.`, ephemeral: true });
            }
            staffStrikes[staffUser.id]--;
            fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

            // DM user
            const dmEmbed = new EmbedBuilder()
                .setTitle('Notice of Removal')
                .setDescription(
                    `Greetings, <@${staffUser.id}>\n\n` +
                    `Your Strike has been removed at Kavià Café.\n\n` +
                    `🗒️ Reason: ${reason}\n\n` +
                    `Regards,\nStaff Team\nKavià || Public Relations team`
                )
                .setColor('Green')
                .setTimestamp();
            await staffUser.send({ embeds: [dmEmbed] }).catch(() => null);

            // Log to channel
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📌 Staff Discipline Log')
                    .addFields(
                        { name: 'Member', value: `<@${staffUser.id}>` },
                        { name: 'Action', value: 'Removed Strike' },
                        { name: 'Reason', value: reason },
                        { name: 'Staff', value: `<@${interaction.user.id}>` }
                    )
                    .setColor('Green')
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.reply({ content: `✅ Removed a strike from ${staffUser.tag}`, ephemeral: true });
        }

        if (action === 'kick') {
            const memberObj = guild.members.cache.get(staffUser.id);
            if (memberObj) await memberObj.kick(reason);
            return interaction.reply({ content: `✅ ${staffUser.tag} has been kicked.`, ephemeral: true });
        }
    }

    if (sub === 'strikes') {
        const target = options.getUser('user');
        if (!target) return interaction.reply({ content: '❌ No user specified.', ephemeral: true });

        const strikeCount = staffStrikes[target.id] || 0;
        return interaction.reply({ content: `${target.tag} has ${strikeCount} strike(s).`, ephemeral: true });
    }
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
                { name: 'Date', value: new Date().toLocaleString() }
            )
            .setTimestamp();

        await channel.send({ content: prRole ? `<@&${prRole.id}>` : '', embeds: [embed] });
        return interaction.reply({ content: '✅ Rep request sent.', ephemeral: true });
    }

    /* ========= /ALLIANCE ========= */
    if (commandName === 'alliance') {
        const sub = options.getSubcommand();

        if (sub === 'add') {
            const group = options.getString('group');
            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');
            const dcLink = options.getString('discord_link') || options.getString('dc_link');
            const robloxLink = options.getString('roblox_link') || options.getString('roblox');
            const publicChannel = options.getChannel('public_channel');

            alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });

            // Optional welcome message
            if (publicChannel && publicChannel.isTextBased()) {
                const welcome = `:tada: Welcome New Alliance! | Kavi Café x ${group} :tada:

We’re thrilled to officially welcome your community into an alliance with Kavi Café! :star2:
This partnership is all about mutual growth, support, and fun — and we can’t wait to see what we’ll achieve together.

:speech_balloon: Questions & Support
If you have any questions, concerns, or suggestions, this is the perfect place to share them. We value communication and want to make sure both of our communities get the most out of this partnership.

:busts_in_silhouette: Please meet your Kavi Café representatives:
${ourReps.split(/,| /).filter(Boolean).map(u => `• ${u}`).join('\n')}

:handshake: Looking Ahead
We’re so excited to be working together and building a strong, positive relationship between our communities. Expect fun events, cross-community opportunities, and lasting connections.

:coffee::sparkles: Here’s to a successful partnership between Kavi Café and ${group}! :sparkles::coffee:`;

                await publicChannel.send(welcome);
            }

            // Logging to alliance-add channel
            const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
            if (logChannel && logChannel.isTextBased()) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📥 New Alliance Added')
                    .addFields(
                        { name: 'Group', value: group },
                        { name: 'Our Representatives', value: ourReps },
                        { name: 'Their Representatives', value: theirReps },
                        { name: 'Discord Link', value: dcLink || 'None' },
                        { name: 'Roblox Link', value: robloxLink || 'None' },
                        { name: 'Submitted by', value: `<@${interaction.user.id}> • ${new Date().toLocaleString()}` }
                    )
                    .setColor('Blue')
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.reply({ content: `✅ Alliance **${group}** added.`, ephemeral: true });
        }

        if (sub === 'edit') {
            const group = options.getString('group');
            const alliance = alliances.find(a => a.group === group);

            if (!alliance) {
                return interaction.reply({ content: `❌ Alliance **${group}** not found.`, ephemeral: true });
            }

            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');
            const dcLink = options.getString('discord_link') || options.getString('dc_link');
            const robloxLink = options.getString('roblox_link') || options.getString('roblox');

            if (ourReps !== null) alliance.ourReps = ourReps;
            if (theirReps !== null) alliance.theirReps = theirReps;
            if (dcLink !== null) alliance.dcLink = dcLink;
            if (robloxLink !== null) alliance.robloxLink = robloxLink;

            return interaction.reply({ content: `✅ Alliance **${group}** updated successfully.`, ephemeral: true });
        }

        if (sub === 'remove') {
            const group = options.getString('group');
            alliances = alliances.filter(a => a.group !== group);
            return interaction.reply({ content: `✅ Alliance **${group}** removed.`, ephemeral: true });
        }

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

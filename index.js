require('./deploy-commands');

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

/* ================== STORAGE ================== */
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
                    { name: 'Sent By', value: `<@${interaction.user.id}>` }
                )
                .setColor('Blue')
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] });
        }

        return interaction.reply({ content: '✅ DM sent.', ephemeral: true });
    }

    /* ========= /STAFF ========= */
    if (commandName === 'staff') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
        }

        const sub = options.getSubcommand();

        /* ----- /staff discipline ----- */
        if (sub === 'discipline') {
            const staffUser = options.getUser('user');
            const action = options.getString('action');
            const reason = options.getString('reason') || 'No reason provided';

            if (!staffUser) {
                return interaction.reply({ content: '❌ No user provided.', ephemeral: true });
            }

            if (!staffStrikes[staffUser.id]) staffStrikes[staffUser.id] = 0;

            if (action === 'add') {
                staffStrikes[staffUser.id]++;
            } else if (action === 'remove') {
                staffStrikes[staffUser.id] = Math.max(0, staffStrikes[staffUser.id] - 1);
            }

            fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

            const strikeCount = staffStrikes[staffUser.id];

            // DM user
            if (action === 'add') {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Strike Notice')
                    .setDescription(
                        `You have received a strike.\n\n🗒️ Reason: ${reason}\n📌 Total Strikes: ${strikeCount}`
                    )
                    .setColor('Red')
                    .setTimestamp();

                await staffUser.send({ embeds: [dmEmbed] }).catch(() => null);
            }

            // Log
            const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📌 Staff Discipline')
                    .addFields(
                        { name: 'Staff Member', value: `<@${staffUser.id}>` },
                        { name: 'Action', value: action.toUpperCase() },
                        { name: 'Strikes', value: `${strikeCount}` },
                        { name: 'Reason', value: reason },
                        { name: 'Given By', value: `<@${interaction.user.id}>` }
                    )
                    .setColor('Red')
                    .setTimestamp();

                logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.reply({
                content: `✅ ${action === 'add' ? 'Added' : 'Removed'} strike for ${staffUser.tag}. Total: ${strikeCount}`,
                ephemeral: true
            });
        }

        /* ----- /staff strikes ----- */
        if (sub === 'strikes') {
            const target = options.getUser('user');
            const strikes = staffStrikes[target.id] || 0;

            return interaction.reply({
                content: `📌 ${target.tag} has **${strikes}** strike(s).`,
                ephemeral: true
            });
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
                { name: 'Alliance Link', value: alliance }
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
            const dcLink = options.getString('discord_link');
            const robloxLink = options.getString('roblox_link');
            const publicChannel = options.getChannel('public_channel');

            alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });

            const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list');
            if (listChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🌐 New Alliance Added')
                    .addFields(
                        { name: 'Group', value: group },
                        { name: 'Our Reps', value: ourReps },
                        { name: 'Their Reps', value: theirReps }
                    )
                    .setTimestamp();

                listChannel.send({ embeds: [embed] });
            }

            if (publicChannel?.isTextBased()) {
                await publicChannel.send(`🎉 Welcome **${group}** to our alliance!`);
            }

            return interaction.reply({ content: '✅ Alliance added.', ephemeral: true });
        }

        if (sub === 'remove') {
            const group = options.getString('group');
            alliances = alliances.filter(a => a.group !== group);
            return interaction.reply({ content: `✅ Alliance **${group}** removed.`, ephemeral: true });
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
                { name: 'Message', value: message.content || '(No text)' }
            )
            .setColor('Blue')
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);

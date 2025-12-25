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
        const action = options.getString('action');
        const reason = options.getString('reason') || 'No reason provided';

        if (sub === 'discipline') {
            await interaction.deferReply({ ephemeral: true });

            if (!staffUser) return interaction.editReply('❌ No user specified.');

            if (!staffStrikes[staffUser.id]) staffStrikes[staffUser.id] = [];

            const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');

            const ordinal = n => {
                const s = ['th','st','nd','rd'];
                const v = n % 100;
                return n + (s[(v-20)%10] || s[v] || s[0]);
            };

            /* ===== ADD STRIKE ===== */
            if (action === 'add') {
                staffStrikes[staffUser.id].push({
                    reason,
                    staff: interaction.user.id,
                    time: Date.now()
                });
                fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

                const count = staffStrikes[staffUser.id].length;

                const dmEmbed = new EmbedBuilder()
                    .setTitle('Strike Notice')
                    .setDescription(
`Greetings, <@${staffUser.id}>

I'm unfortunately saddened to inform you that you have received a strike for your actions at Kavià Cafe. This is your ${ordinal(count)} strike.

🗒️ Reason: ${reason}

If you feel like this was false or inaccurate please open a ticket.

Regards,
Staff Team
Kavià || Public Relations team`
                    )
                    .setColor('Red')
                    .setTimestamp();

                await staffUser.send({ embeds: [dmEmbed] }).catch(() => null);

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📌 Staff Discipline Log')
                        .addFields(
                            { name: 'Member', value: `<@${staffUser.id}>` },
                            { name: 'Action', value: 'Added Strike' },
                            { name: 'Reason', value: reason },
                            { name: 'Staff', value: `<@${interaction.user.id}>` }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }

                return interaction.editReply(`✅ Added strike to ${staffUser.tag}`);
            }

            /* ===== REMOVE STRIKE ===== */
            if (action === 'remove') {
                if (!staffStrikes[staffUser.id].length) {
                    return interaction.editReply('❌ User has no strikes.');
                }

                staffStrikes[staffUser.id].pop();
                fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

                const dmEmbed = new EmbedBuilder()
                    .setTitle('Notice of Removal')
                    .setDescription(
`Greetings, <@${staffUser.id}>

Your Strike has been removed at Kavià Cafe.

🗒️ Reason: ${reason}

Regards,
Staff Team
Kavià || Public Relations team`
                    )
                    .setColor('Green')
                    .setTimestamp();

                await staffUser.send({ embeds: [dmEmbed] }).catch(() => null);

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📌 Staff Discipline Log')
                        .addFields(
                            { name: 'Member', value: `<@${staffUser.id}>` },
                            { name: 'Action', value: 'Removed Strike' },
                            { name: 'Reason', value: reason },
                            { name: 'Staff', value: `<@${interaction.user.id}>` }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }

                return interaction.editReply(`✅ Removed strike from ${staffUser.tag}`);
            }

            return interaction.editReply('❌ Invalid action.');
        }

        if (sub === 'strikes') {
            const strikesText = Object.entries(staffStrikes)
                .map(([id, strikes]) => `<@${id}>: ${strikes.length}`)
                .join('\n') || 'No strikes recorded.';
            return interaction.reply({ content: strikesText, ephemeral: true });
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

            return interaction.reply({ content: '✅ Alliance added.', ephemeral: true });
        }

        if (sub === 'edit') {
            const group = options.getString('group');
            const alliance = alliances.find(a => a.group === group);

            if (!alliance) return interaction.reply({ content: `❌ Alliance **${group}** not found.`, ephemeral: true });

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

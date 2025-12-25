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

    /* ========= /STAFF (FIXED) ========= */
    if (commandName === 'staff') {
        await interaction.deferReply({ ephemeral: true });

        const sub = options.getSubcommand();
        const target = options.getUser('user');
        const action = options.getString('action');
        const reason = options.getString('reason') || 'No reason provided';

        const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');

        if (!staffStrikes[target.id]) staffStrikes[target.id] = [];

        const getOrdinal = (n) => {
            const s = ["th","st","nd","rd"];
            const v = n % 100;
            return n + (s[(v-20)%10] || s[v] || s[0]);
        };

        /* ===== ADD STRIKE ===== */
        if (sub === 'discipline' && action === 'add') {
            staffStrikes[target.id].push({
                reason,
                staff: interaction.user.id,
                timestamp: Date.now()
            });

            fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

            const count = staffStrikes[target.id].length;
            const ordinal = getOrdinal(count);

            const dmEmbed = new EmbedBuilder()
                .setTitle('Strike Notice')
                .setDescription(
`Greetings, <@${target.id}>

I'm unfortunately saddened to inform you that you have received a strike for your actions at Kavià Cafe. This is your ${ordinal} strike.

🗒️ Reason: ${reason}

If you feel like this was false or inaccurate please open a ticket.

Regards,
Staff Team
Kavià || Public Relations team`
                )
                .setColor('Red')
                .setTimestamp();

            await target.send({ embeds: [dmEmbed] }).catch(() => null);

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📌 Staff Discipline Log')
                    .addFields(
                        { name: 'Member', value: `<@${target.id}>` },
                        { name: 'Action', value: 'Added Strike' },
                        { name: 'Reason', value: reason },
                        { name: 'Staff', value: `<@${interaction.user.id}>` }
                    )
                    .setColor('Red')
                    .setTimestamp();

                logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.editReply(`✅ Strike added to ${target.tag} (${ordinal})`);
        }

        /* ===== REMOVE STRIKE ===== */
        if (sub === 'discipline' && action === 'remove') {
            if (!staffStrikes[target.id].length) {
                return interaction.editReply('❌ That user has no strikes.');
            }

            staffStrikes[target.id].pop();
            fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

            const dmEmbed = new EmbedBuilder()
                .setTitle('Notice of Removal')
                .setDescription(
`Greetings, <@${target.id}>

Your Strike has been removed at Kavià Cafe.

🗒️ Reason: ${reason}

Regards,
Staff Team
Kavià || Public Relations team`
                )
                .setColor('Green')
                .setTimestamp();

            await target.send({ embeds: [dmEmbed] }).catch(() => null);

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📌 Staff Discipline Log')
                    .addFields(
                        { name: 'Member', value: `<@${target.id}>` },
                        { name: 'Action', value: 'Removed Strike' },
                        { name: 'Reason', value: reason },
                        { name: 'Staff', value: `<@${interaction.user.id}>` }
                    )
                    .setColor('Green')
                    .setTimestamp();

                logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.editReply(`✅ Strike removed from ${target.tag}`);
        }

        /* ===== VIEW STRIKES ===== */
        if (sub === 'strikes') {
            const strikes = staffStrikes[target.id] || [];
            if (!strikes.length) return interaction.editReply('No strikes found.');

            const text = strikes
                .map((s, i) =>
                    `**${i + 1}.** ${s.reason} — <@${s.staff}> (${new Date(s.timestamp).toLocaleString()})`
                )
                .join('\n');

            return interaction.editReply(text);
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

            alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });
            return interaction.reply({ content: '✅ Alliance added.', ephemeral: true });
        }

        if (sub === 'edit') {
            const group = options.getString('group');
            const alliance = alliances.find(a => a.group === group);
            if (!alliance) return interaction.reply({ content: '❌ Alliance not found.', ephemeral: true });

            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');
            const dcLink = options.getString('discord_link');
            const robloxLink = options.getString('roblox_link');

            if (ourReps !== null) alliance.ourReps = ourReps;
            if (theirReps !== null) alliance.theirReps = theirReps;
            if (dcLink !== null) alliance.dcLink = dcLink;
            if (robloxLink !== null) alliance.robloxLink = robloxLink;

            return interaction.reply({ content: '✅ Alliance updated.', ephemeral: true });
        }

        if (sub === 'remove') {
            const group = options.getString('group');
            alliances = alliances.filter(a => a.group !== group);
            return interaction.reply({ content: '✅ Alliance removed.', ephemeral: true });
        }

        if (sub === 'list') {
            const listChannel = guild.channels.cache.find(c => c.name === 'alliances-list');
            if (!listChannel) return interaction.reply({ content: '❌ alliances-list channel missing.', ephemeral: true });

            const embed = new EmbedBuilder().setTitle('🌐 Alliance List');
            alliances.forEach(a => {
                embed.addFields({
                    name: a.group,
                    value: `Our Reps: ${a.ourReps}\nTheir Reps: ${a.theirReps}\nDiscord: ${a.dcLink}\nRoblox: ${a.robloxLink}`
                });
            });

            listChannel.send({ embeds: [embed] });
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

require('dotenv').config();
const fs = require('fs');
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

/* =======================
   FILES
======================= */
const alliancesFile = './alliances.json';
const strikesFile = './staffStrikes.json';

let alliances = fs.existsSync(alliancesFile) ? JSON.parse(fs.readFileSync(alliancesFile)) : [];
let strikes = fs.existsSync(strikesFile) ? JSON.parse(fs.readFileSync(strikesFile)) : [];

/* =======================
   READY
======================= */
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =======================
   DM REPLY LOGGING
======================= */
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.guild) return;

    const guild = client.guilds.cache.first();
    if (!guild) return;

    const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle('📩 User Reply')
        .setColor('Blue')
        .addFields(
            { name: 'From', value: `<@${message.author.id}>` },
            { name: 'Message', value: message.content },
            { name: 'Sent At', value: new Date().toLocaleString() }
        );

    logChannel.send({ embeds: [embed] });
});

/* =======================
   INTERACTIONS
======================= */
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, member } = interaction;

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
                    { name: 'Sent By', value: `<@${member.id}>` },
                    { name: 'Sent At', value: new Date().toLocaleString() }
                );
            logChannel.send({ embeds: [logEmbed] });
        }

        return interaction.editReply('✅ DM sent');
    }

    /* ===== /status ===== */
    if (commandName === 'status') {
        await interaction.deferReply({ ephemeral: true });
        const text = options.getString('status');

        client.user.setPresence({
            activities: [{ name: text, type: 0 }]
        });

        return interaction.editReply(`✅ Status set to: Playing ${text}`);
    }

    /* ===== /alliance ===== */
    if (commandName === 'alliance') {
        await interaction.deferReply({ ephemeral: true });
        const sub = options.getSubcommand();

        const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');

        if (sub === 'add') {
            const data = {
                group: options.getString('group'),
                ourReps: options.getString('our_reps'),
                theirReps: options.getString('their_reps'),
                dcLink: options.getString('discord'),
                robloxLink: options.getString('roblox')
            };

            alliances.push(data);
            fs.writeFileSync(alliancesFile, JSON.stringify(alliances, null, 2));

            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🆕 New Alliance Added')
                    .setColor('Green')
                    .addFields(
                        { name: 'Group', value: data.group },
                        { name: 'Our Reps', value: data.ourReps },
                        { name: 'Their Reps', value: data.theirReps },
                        { name: 'Discord Link', value: data.dcLink },
                        { name: 'Roblox Link', value: data.robloxLink }
                    );
                logChannel.send({ embeds: [embed] });
            }

            return interaction.editReply('✅ Alliance added');
        }

        if (sub === 'list') {
            if (!alliances.length) return interaction.editReply('No alliances found.');

            const embed = new EmbedBuilder()
                .setTitle('🌐 Current Alliances')
                .setColor('Green');

            alliances.forEach(a => {
                embed.addFields({
                    name: a.group,
                    value:
                        `**Our Reps:** ${a.ourReps}\n` +
                        `**Their Reps:** ${a.theirReps}\n` +
                        `🔗 **Discord:** ${a.dcLink}\n` +
                        `🔗 **Roblox:** ${a.robloxLink}`
                });
            });

            return interaction.editReply({ embeds: [embed] });
        }
    }

    /* ===== /staff discipline ===== */
    if (commandName === 'staff') {
        await interaction.deferReply({ ephemeral: true });

        const target = options.getUser('member');
        const action = options.getString('action');
        const category = options.getString('category');
        const reason = options.getString('reason') || 'No reason provided';

        const disciplineChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');

        const isAdd = action === 'add';
        const typeText = category.charAt(0).toUpperCase() + category.slice(1);

        const dmEmbed = new EmbedBuilder()
            .setTitle(isAdd ? `${typeText} Notice` : `${typeText} Removed`)
            .setColor(isAdd ? 'Red' : 'Green')
            .setDescription(
                isAdd
                ? `> Greetings, <@${target.id}>\n\nYou have received a **${typeText}** at **Kavià Cafe**.\n\n> 🗒️ **Reason:** *${reason}*`
                : `> Greetings, <@${target.id}>\n\nYour **${typeText}** has been removed at **Kavià Cafe**.\n\n> 🗒️ **Reason:** *${reason}*`
            );

        try { await target.send({ embeds: [dmEmbed] }); } catch {}

        if (disciplineChannel) {
            disciplineChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📌 Staff Discipline Log')
                        .setColor('Orange')
                        .addFields(
                            { name: 'Member', value: `<@${target.id}>` },
                            { name: 'Category', value: typeText },
                            { name: 'Action', value: action },
                            { name: 'Reason', value: reason },
                            { name: 'Staff', value: `<@${member.id}>` },
                            { name: 'Date', value: new Date().toLocaleString() }
                        )
                ]
            });
        }

        return interaction.editReply('✅ Action completed');
    }

    /* ===== /rep request ===== */
    if (commandName === 'rep') {
        await interaction.deferReply({ ephemeral: true });

        const channel = guild.channels.cache.find(c => c.name === 'request-new-rep');
        const role = guild.roles.cache.find(r => r.name === '[PR] | Staff Role');

        const embed = new EmbedBuilder()
            .setTitle('📥 New Rep Request')
            .setColor('Blue')
            .addFields(
                { name: 'Requested By', value: `<@${member.id}>` },
                { name: 'Number of Reps', value: `${options.getInteger('num_reps')}` },
                { name: 'Discord Link', value: options.getString('discord_link') },
                { name: 'Roblox Link', value: options.getString('roblox_link') },
                { name: 'Alliance Link', value: options.getString('alliance_link') },
                { name: '📌 Instructions', value: 'Give yourself correct alliance roles.' },
                { name: 'Date', value: new Date().toLocaleString() }
            );

        channel.send({
            content: role ? `<@&${role.id}>` : null,
            embeds: [embed]
        });

        return interaction.editReply('✅ Rep request submitted');
    }
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

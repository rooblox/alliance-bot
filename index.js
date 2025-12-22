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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

/* =======================
   DATA FILES
======================= */
let alliances = fs.existsSync('./alliances.json')
    ? JSON.parse(fs.readFileSync('./alliances.json'))
    : [];

let strikes = fs.existsSync('./staffStrikes.json')
    ? JSON.parse(fs.readFileSync('./staffStrikes.json'))
    : [];

/* =======================
   READY EVENT
======================= */
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =======================
   DM REPLY LOGGING
======================= */
client.on('messageCreate', async message => {
    if (message.channel.type === 1 && !message.author.bot) { // DM channel
        // find the guild where bot logs DMs
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return;
        const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📩 Staff Message (DM Reply)')
            .setColor('Blue')
            .addFields(
                { name: 'From', value: `<@${message.author.id}>` },
                { name: 'Message', value: message.content },
                { name: 'Received At', value: new Date().toLocaleString() }
            );
        logChannel.send({ embeds: [embed] });
    }
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
                    { name: 'Sent By', value: `<@${member.user.id}>` },
                    { name: 'Sent At', value: new Date().toLocaleString() }
                );
            logChannel.send({ embeds: [logEmbed] });
        }

        return interaction.editReply('✅ DM sent');
    }

    /* ===== /alliance ===== */
    if (commandName === 'alliance') {
        await interaction.deferReply({ ephemeral: true });
        const sub = options.getSubcommand();

        /* --- ADD --- */
        if (sub === 'add') {
            const newAlliance = {
                group: options.getString('group'),
                ourReps: options.getString('our_reps'),
                theirReps: options.getString('their_reps'),
                dcLink: options.getString('discord'),
                robloxLink: options.getString('roblox')
            };
            alliances.push(newAlliance);
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            // Log in alliance-add channel
            const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('New Alliance Added')
                    .setColor('Green')
                    .addFields(
                        { name: 'Group', value: newAlliance.group },
                        { name: 'Our Reps', value: newAlliance.ourReps },
                        { name: 'Their Reps', value: newAlliance.theirReps },
                        { name: 'Discord Link', value: newAlliance.dcLink },
                        { name: 'Roblox Link', value: newAlliance.robloxLink }
                    );
                logChannel.send({ embeds: [embed] });
            }

            return interaction.editReply('✅ Alliance added');
        }

        /* --- LIST --- */
        if (sub === 'list') {
            if (!alliances.length) return interaction.editReply('No alliances found.');
            const embed = new EmbedBuilder()
                .setTitle('🌐 Current Alliances')
                .setColor('Green');

            alliances.forEach(a => {
                embed.addFields({
                    name: a.group,
                    value:
                        `**Our Reps:** ${a.ourReps || 'N/A'}\n` +
                        `**Their Reps:** ${a.theirReps || 'N/A'}\n` +
                        `🔗 **Discord:** ${a.dcLink || 'N/A'}\n` +
                        `🔗 **Roblox:** ${a.robloxLink || 'N/A'}`
                });
            });

            return interaction.editReply({ embeds: [embed] });
        }

        /* --- REMOVE --- */
        if (sub === 'remove') {
            const groupName = options.getString('group');
            const index = alliances.findIndex(a => a.group.toLowerCase() === groupName.toLowerCase());
            if (index === -1) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);
            const removed = alliances.splice(index, 1)[0];
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('Alliance Removed')
                    .setColor('Red')
                    .addFields(
                        { name: 'Group', value: removed.group },
                        { name: 'Status', value: 'Removed' }
                    );
                logChannel.send({ embeds: [embed] });
            }

            return interaction.editReply(`✅ Alliance "${groupName}" removed`);
        }
    }
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

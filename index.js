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
    if (message.channel.type === 1 && !message.author.bot) { // DM
        try {
            const guild = client.guilds.cache.get(process.env.GUILD_ID);
            if (!guild) return;

            const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle('📩 DM to Bot')
                .setColor('Blue')
                .addFields(
                    { name: 'From', value: `<@${message.author.id}>` },
                    { name: 'Message', value: message.content },
                    { name: 'Sent At', value: new Date().toLocaleString() }
                );

            logChannel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
        }
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
                    .setTitle('🎉 New Alliance Added')
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

        if (sub === 'remove') {
            const groupName = options.getString('group');
            const index = alliances.findIndex(a => a.group.toLowerCase() === groupName.toLowerCase());
            if (index === -1) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);

            const removed = alliances.splice(index, 1)[0];
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            // Log removal
            const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Alliance Removed')
                    .setColor('Red')
                    .addFields(
                        { name: 'Group', value: removed.group },
                        { name: 'Status', value: 'Removed' }
                    );
                logChannel.send({ embeds: [embed] });
            }

            return interaction.editReply(`✅ Alliance "${groupName}" removed`);
        }

        if (sub === 'edit') {
            const groupName = options.getString('group');
            const alliance = alliances.find(a => a.group.toLowerCase() === groupName.toLowerCase());
            if (!alliance) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);

            const newGroup = options.getString('new_group');
            const newOur = options.getString('our_reps');
            const newTheir = options.getString('their_reps');
            const newDiscord = options.getString('discord');
            const newRoblox = options.getString('roblox');

            if (newGroup) alliance.group = newGroup;
            if (newOur) alliance.ourReps = newOur;
            if (newTheir) alliance.theirReps = newTheir;
            if (newDiscord) alliance.dcLink = newDiscord;
            if (newRoblox) alliance.robloxLink = newRoblox;

            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            // Log edit
            const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('✏️ Alliance Updated')
                    .setColor('Orange')
                    .addFields(
                        { name: 'Group', value: alliance.group },
                        { name: 'Our Reps', value: alliance.ourReps },
                        { name: 'Their Reps', value: alliance.theirReps },
                        { name: 'Discord Link', value: alliance.dcLink },
                        { name: 'Roblox Link', value: alliance.robloxLink }
                    );
                logChannel.send({ embeds: [embed] });
            }

            return interaction.editReply(`✅ Alliance "${groupName}" updated`);
        }
    }

    /* ===== /staff ===== */
    // Add your previous staff commands here (discipline, strikes, kicks, etc.)
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

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
    if (message.guild) return; // Only DMs

    const guild = client.guilds.cache.first();
    if (!guild) return;

    const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle('📩 Staff Message Reply')
        .setColor('Blue')
        .addFields(
            { name: 'To', value: 'Bot' },
            { name: 'Message', value: message.content || '*No content*' },
            { name: 'Sent By', value: `<@${message.author.id}>` },
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
        const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');

        const log = (action, allianceName) => {
            if (!logChannel) return;
            const embed = new EmbedBuilder()
                .setTitle('🌐 Alliance Update')
                .setColor('Green')
                .addFields(
                    { name: 'Action', value: action },
                    { name: 'Alliance', value: allianceName },
                    { name: 'Staff', value: `<@${member.user.id}>` },
                    { name: 'Date', value: new Date().toLocaleString() }
                );
            logChannel.send({ embeds: [embed] });
        };

        if (sub === 'add') {
            const data = {
                group: options.getString('group'),
                ourReps: options.getString('our_reps'),
                theirReps: options.getString('their_reps'),
                dcLink: options.getString('discord'),
                robloxLink: options.getString('roblox')
            };

            alliances.push(data);
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));
            log('Added', data.group);
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
            const name = options.getString('group');
            const index = alliances.findIndex(a => a.group.toLowerCase() === name.toLowerCase());
            if (index === -1) return interaction.editReply('❌ Alliance not found.');

            alliances.splice(index, 1);
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));
            log('Removed', name);
            return interaction.editReply(`✅ Alliance "${name}" removed`);
        }

        if (sub === 'edit') {
            const name = options.getString('group');
            const a = alliances.find(x => x.group.toLowerCase() === name.toLowerCase());
            if (!a) return interaction.editReply('❌ Alliance not found.');

            if (options.getString('our_reps')) a.ourReps = options.getString('our_reps');
            if (options.getString('their_reps')) a.theirReps = options.getString('their_reps');
            if (options.getString('discord')) a.dcLink = options.getString('discord');
            if (options.getString('roblox')) a.robloxLink = options.getString('roblox');

            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));
            log('Edited', name);
            return interaction.editReply(`✅ Alliance "${name}" updated`);
        }
    }

    /* ===== /staff discipline ===== */
    if (commandName === 'staff') {
        await interaction.deferReply({ ephemeral: true });

        const target = options.getUser('member');
        const action = options.getString('action');
        const reason = options.getString('reason') || 'No reason provided';
        const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');

        if (action === 'add') {
            strikes.push({ user: target.id, reason, staff: member.user.tag, date: new Date().toLocaleString() });
            fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
        }

        const dmEmbed = new EmbedBuilder()
            .setTitle(action === 'remove' ? 'Notice of Removal' : 'Strike Notice')
            .setColor(action === 'remove' ? 'Green' : 'Red')
            .setDescription(
                action === 'remove'
                    ? `Your discipline has been removed at Kavià Cafe.\n\n**Reason:** ${reason}`
                    : `You have received a strike at Kavià Cafe.\n\n**Reason:** ${reason}`
            );

        try { await target.send({ embeds: [dmEmbed] }); } catch {}

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📌 Staff Discipline')
                .setColor('Orange')
                .addFields(
                    { name: 'Member', value: `<@${target.id}>` },
                    { name: 'Action', value: action },
                    { name: 'Reason', value: reason },
                    { name: 'Staff', value: `<@${member.user.id}>` },
                    { name: 'Date', value: new Date().toLocaleString() }
                );
            logChannel.send({ embeds: [embed] });
        }

        return interaction.editReply('✅ Action completed');
    }
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

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
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
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
    client.user.setPresence({
        activities: [{ name: 'Kavia Cafe', type: 0 }] // Example: Playing
    });
});

/* =======================
   DM REPLY LOGGING
======================= */
client.on('messageCreate', async message => {
    if (message.channel.type === 1 && !message.author.bot) {
        const guild = client.guilds.cache.first();
        if (!guild) return;

        const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📩 DM Reply')
            .setColor('Blue')
            .addFields(
                { name: 'From', value: `<@${message.author.id}>` },
                { name: 'Message', value: message.content },
                { name: 'Received At', value: new Date().toLocaleString() }
            );

        logChannel.send({ embeds: [embed] }).catch(() => {});
    }
});

/* =======================
   INTERACTIONS
======================= */
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, member } = interaction;

    /* =======================
       /dm
    ======================= */
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
            logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }

        return interaction.editReply('✅ DM sent');
    }

    /* =======================
       /alliance
    ======================= */
    if (commandName === 'alliance') {
        await interaction.deferReply({ ephemeral: true });
        const sub = options.getSubcommand();
        const allianceLogChannel = guild.channels.cache.find(c => c.name === 'alliance-add');

        if (sub === 'add') {
            const group = options.getString('group') || 'Unknown';
            const ourReps = options.getString('our_reps') || 'N/A';
            const theirReps = options.getString('their_reps') || 'N/A';
            const dcLink = options.getString('discord') || 'N/A';
            const robloxLink = options.getString('roblox') || 'N/A';

            const newAlliance = { group, ourReps, theirReps, dcLink, robloxLink };
            alliances.push(newAlliance);
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            if (allianceLogChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🎉 New Alliance Added')
                    .setColor('Green')
                    .addFields(
                        { name: 'Group', value: group },
                        { name: 'Our Reps', value: ourReps },
                        { name: 'Their Reps', value: theirReps },
                        { name: 'Discord Link', value: dcLink },
                        { name: 'Roblox Link', value: robloxLink }
                    );
                allianceLogChannel.send({ embeds: [embed] }).catch(() => {});
            }

            return interaction.editReply(`✅ Alliance "${group}" added`);
        }

        if (sub === 'list') {
            if (!alliances.length) return interaction.editReply('No alliances found.');
            const embed = new EmbedBuilder()
                .setTitle('🌐 Current Alliances')
                .setColor('Green');

            alliances.forEach(a => {
                embed.addFields({
                    name: a.group || 'Unknown',
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
            const groupName = options.getString('group') || '';
            const index = alliances.findIndex(a => a.group.toLowerCase() === groupName.toLowerCase());
            if (index === -1) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);

            const removed = alliances.splice(index, 1)[0];
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            if (allianceLogChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🗑️ Alliance Removed')
                    .setColor('Red')
                    .addFields(
                        { name: 'Group', value: removed.group || 'Unknown' },
                        { name: 'Status', value: 'Removed' }
                    );
                allianceLogChannel.send({ embeds: [embed] }).catch(() => {});
            }

            return interaction.editReply(`✅ Alliance "${groupName}" removed`);
        }

        if (sub === 'edit') {
            const groupName = options.getString('group') || '';
            const alliance = alliances.find(a => a.group.toLowerCase() === groupName.toLowerCase());
            if (!alliance) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);

            const newGroup = options.getString('new_group') || alliance.group;
            const newOur = options.getString('our_reps') || alliance.ourReps;
            const newTheir = options.getString('their_reps') || alliance.theirReps;
            const newDiscord = options.getString('discord') || alliance.dcLink;
            const newRoblox = options.getString('roblox') || alliance.robloxLink;

            alliance.group = newGroup;
            alliance.ourReps = newOur;
            alliance.theirReps = newTheir;
            alliance.dcLink = newDiscord;
            alliance.robloxLink = newRoblox;

            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            if (allianceLogChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('✏️ Alliance Edited')
                    .setColor('Orange')
                    .addFields(
                        { name: 'Group', value: newGroup },
                        { name: 'Our Reps', value: newOur },
                        { name: 'Their Reps', value: newTheir },
                        { name: 'Discord Link', value: newDiscord },
                        { name: 'Roblox Link', value: newRoblox }
                    );
                allianceLogChannel.send({ embeds: [embed] }).catch(() => {});
            }

            return interaction.editReply(`✅ Alliance "${groupName}" updated`);
        }
    }

    /* =======================
       /staff
    ======================= */
    if (commandName === 'staff') {
        await interaction.deferReply({ ephemeral: true });
        const sub = options.getSubcommand();
        const target = options.getUser('member');
        const action = options.getString('action');
        const reason = options.getString('reason') || 'No reason provided';
        const targetMember = await guild.members.fetch(target.id).catch(() => null);

        if (sub === 'discipline') {
            const userStrikes = strikes.filter(s => s.user === target.id);
            const strikeNumber = userStrikes.length + (action === 'strike' ? 1 : 0);

            const dmEmbed = new EmbedBuilder()
                .setTitle('**Strike Notice**')
                .setColor('Red')
                .setDescription(`> Greetings, <@${target.id}>\n\nI'm unfortunately saddened to inform you that you have received a strike for your actions at Kavià Cafe. This is your **${strikeNumber}${strikeNumber === 1 ? 'st' : strikeNumber === 2 ? 'nd' : 'th'} strike.**\n\n> 🗒️ **Reason:** *${reason}*\n\nIf you feel like this was false or inaccurate please *open a ticket*.\n\n**Regards,**\n**Staff Team**\n**Kavià || Public Relations team**`);

            try { await target.send({ embeds: [dmEmbed] }); } catch {}

            const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📌 Staff Discipline Log')
                    .setColor('Orange')
                    .addFields(
                        { name: 'Member', value: `<@${target.id}>`, inline: true },
                        { name: 'Action', value: action, inline: true },
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Staff', value: `<@${member.user.id}>`, inline: true },
                        { name: 'Strike #', value: `${strikeNumber}`, inline: true },
                        { name: 'Date', value: new Date().toLocaleString(), inline: false }
                    );
                logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }

            if (action === 'strike') {
                strikes.push({ user: target.id, reason, staff: member.user.tag, date: new Date().toLocaleString() });
                fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                return interaction.editReply(`⚠️ Strike added to ${target.tag}`);
            }

            if (action === 'kick') {
                if (!targetMember || !targetMember.kickable) return interaction.editReply('❌ Cannot kick this member.');
                await targetMember.kick(reason);
                return interaction.editReply(`❌ ${target.tag} has been kicked`);
            }

            if (action === 'remove') {
                const index = strikes.findIndex(s => s.user === target.id);
                if (index !== -1) {
                    strikes.splice(index, 1);
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                    return interaction.editReply(`✅ Strike removed from ${target.tag}`);
                } else {
                    return interaction.editReply(`❌ No strikes found for ${target.tag}`);
                }
            }
        }

        if (sub === 'strikes') {
            const userStrikes = strikes.filter(s => s.user === target.id);
            if (!userStrikes.length) return interaction.editReply('No strikes found.');
            const embed = new EmbedBuilder()
                .setTitle(`⚠️ Strikes for ${target.tag}`)
                .setColor('Red');
            userStrikes.forEach((s, i) => {
                embed.addFields({ name: `Strike ${i + 1}`, value: `Reason: ${s.reason}\nBy: ${s.staff}\nDate: ${s.date}` });
            });
            return interaction.editReply({ embeds: [embed] });
        }
    }

    /* =======================
       /status
    ======================= */
    if (commandName === 'status') {
        await interaction.deferReply({ ephemeral: true });
        const newStatus = options.getString('text') || 'Kavia Cafe';
        try {
            await client.user.setPresence({ activities: [{ name: newStatus, type: 0 }] }); // Playing
            await interaction.editReply(`✅ Status updated: Playing ${newStatus}`);
        } catch (err) {
            console.error('Failed to update status:', err);
            await interaction.editReply('❌ Failed to update status.');
        }
    }

    /* =======================
       /rep request
    ======================= */
    if (commandName === 'rep') {
        await interaction.deferReply({ ephemeral: true });
        const sub = options.getSubcommand();

        if (sub === 'request') {
            const numReps = options.getInteger('num_reps') || 1;
            const discordLink = options.getString('discord_link') || 'N/A';
            const robloxLink = options.getString('roblox_link') || 'N/A';
            const allianceLink = options.getString('alliance_link') || 'N/A';
            const staffRole = guild.roles.cache.find(r => r.name === '[PR] | Staff Role');
            const requestChannel = guild.channels.cache.find(c => c.name === 'request-new-rep');

            if (!requestChannel) return interaction.editReply('❌ Channel request-new-rep not found.');

            const embed = new EmbedBuilder()
                .setTitle('📥 New Rep Request')
                .setColor('Blue')
                .addFields(
                    { name: 'Requested By', value: `<@${member.user.id}>` },
                    { name: 'Number of Reps', value: `${numReps}` },
                    { name: 'Discord Link', value: discordLink },
                    { name: 'Roblox Link', value: robloxLink },
                    { name: 'Alliance Link', value: allianceLink },
                    { name: '📌 Instructions', value: 'When adding yourself to an alliance, make sure you give yourself the correct alliance roles. This is very important.' },
                    { name: 'Date', value: new Date().toLocaleString() }
                );

            if (staffRole) requestChannel.send({ content: `<@&${staffRole.id}>`, embeds: [embed] }).catch(() => {});
            else requestChannel.send({ embeds: [embed] }).catch(() => {});

            return interaction.editReply('✅ Your rep request has been sent!');
        }
    }
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

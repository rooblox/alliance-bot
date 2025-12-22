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
        GatewayIntentBits.DirectMessages
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
            alliances.push({
                group: options.getString('group'),
                ourReps: options.getString('our_reps'),
                theirReps: options.getString('their_reps'),
                dcLink: options.getString('discord'),
                robloxLink: options.getString('roblox')
            });
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));
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
            alliances.splice(index, 1);
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));
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
            return interaction.editReply(`✅ Alliance "${groupName}" updated`);
        }
    }

    /* ===== /staff ===== */
    if (commandName === 'staff') {
        await interaction.deferReply({ ephemeral: true });
        const sub = options.getSubcommand();
        const target = options.getUser('member');
        const category = options.getString('category');
        const action = options.getString('action');
        const reason = options.getString('reason') || 'No reason provided';
        const targetMember = await guild.members.fetch(target.id);

        if (sub === 'discipline') {
            const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');

            if (action === 'add') {
                const userStrikes = strikes.filter(s => s.user === target.id);
                const strikeNumber = userStrikes.length + 1;

                // DM Embed for strike
                const dmEmbed = new EmbedBuilder()
                    .setTitle('**Strike Notice**')
                    .setColor('Red')
                    .setDescription(`> Greetings, <@${target.id}>\n\nI'm unfortunately saddened to inform you that you have received a strike for your actions at Kavià Cafe. This is your **${strikeNumber}${strikeNumber === 1 ? 'st' : strikeNumber === 2 ? 'nd' : 'th'} strike.**\n\n> 🗒️ **Reason:** *${reason}*\n\nIf you feel like this was false or inaccurate please *open a ticket*.\n\n**Regards,**\n**Staff Team**\n**Kavià || Public Relations team**`);

                try { await target.send({ embeds: [dmEmbed] }); } catch {}

                // Log Embed
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
                    logChannel.send({ embeds: [logEmbed] });
                }

                strikes.push({
                    user: target.id,
                    reason,
                    staff: member.user.tag,
                    date: new Date().toLocaleString()
                });
                fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                return interaction.editReply(`⚠️ Strike added to ${target.tag}`);
            }

            if (action === 'remove') {
                const index = strikes.findIndex(s => s.user === target.id);
                if (index !== -1) {
                    const removed = strikes.splice(index, 1)[0];
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));

                    // DM Embed for removal
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('**Notice of Removal**')
                        .setColor('Green')
                        .setDescription(`> Greetings, <@${target.id}>\n\nYour ${category} has been removed at Kavià Cafe.\n\n> 🗒️ **Reason:** *${removed.reason}*\n\n**Regards,**\n**Staff Team**\n**Kavià || Public Relations team**`);

                    try { await target.send({ embeds: [dmEmbed] }); } catch {}

                    // Log Embed
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('📌 Staff Discipline Log')
                            .setColor('Orange')
                            .addFields(
                                { name: 'Member', value: `<@${target.id}>`, inline: true },
                                { name: 'Action', value: `Removed ${category}`, inline: true },
                                { name: 'Reason', value: removed.reason, inline: false },
                                { name: 'Staff', value: `<@${member.user.id}>`, inline: true },
                                { name: 'Date', value: new Date().toLocaleString(), inline: false }
                            );
                        logChannel.send({ embeds: [logEmbed] });
                    }

                    return interaction.editReply(`✅ ${category} removed from ${target.tag}`);
                } else {
                    return interaction.editReply(`❌ No ${category} found for ${target.tag}`);
                }
            }

            if (action === 'kick') {
                if (!targetMember.kickable) return interaction.editReply('❌ Cannot kick this member.');
                await targetMember.kick(reason);
                return interaction.editReply(`❌ ${target.tag} has been kicked`);
            }
        }

        if (sub === 'strikes') {
            const userStrikes = strikes.filter(s => s.user === target.id);
            if (!userStrikes.length) return interaction.editReply('No strikes found.');

            const embed = new EmbedBuilder()
                .setTitle(`⚠️ Strikes for ${target.tag}`)
                .setColor('Red');

            userStrikes.forEach((s, i) => {
                embed.addFields({
                    name: `Strike ${i + 1}`,
                    value: `Reason: ${s.reason}\nBy: ${s.staff}\nDate: ${s.date}`
                });
            });

            return interaction.editReply({ embeds: [embed] });
        }
    }

    /* ===== /status ===== */
    if (commandName === 'status') {
        await interaction.deferReply({ ephemeral: true });
        const newStatus = options.getString('status');
        try {
            await client.user.setPresence({
                activities: [{ name: newStatus, type: 0 }] // Playing
            });
            await interaction.editReply(`✅ Status updated: Playing ${newStatus}`);
        } catch (err) {
            console.error('Failed to update status:', err);
            await interaction.editReply('❌ Failed to update status.');
        }
    }

    /* ===== /rep ===== */
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

            if (staffRole) requestChannel.send({ content: `<@&${staffRole.id}>`, embeds: [embed] });
            else requestChannel.send({ embeds: [embed] });

            return interaction.editReply('✅ Your rep request has been sent!');
        }
    }
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

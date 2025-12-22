require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

/* =======================
   DATA FILES
======================= */
let alliances = fs.existsSync('./alliances.json') ? JSON.parse(fs.readFileSync('./alliances.json')) : [];
let strikes = fs.existsSync('./staffStrikes.json') ? JSON.parse(fs.readFileSync('./staffStrikes.json')) : [];

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
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        const logChannel = guild?.channels.cache.find(c => c.name === 'dm-logs');
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('📩 Staff Message')
                .setColor('Blue')
                .addFields(
                    { name: 'From', value: `<@${message.author.id}>` },
                    { name: 'Message', value: message.content },
                    { name: 'Received At', value: new Date().toLocaleString() }
                );
            logChannel.send({ embeds: [embed] });
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
        const messageContent = options.getString('message');

        const dmEmbed = new EmbedBuilder()
            .setTitle('📩 Staff Message')
            .setDescription(messageContent)
            .setColor('Blue');

        try { await user.send({ embeds: [dmEmbed] }); } catch {}

        const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📩 Staff Message')
                .setColor('Blue')
                .addFields(
                    { name: 'To', value: `<@${user.id}>` },
                    { name: 'Message', value: messageContent },
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
            const group = options.getString('group');
            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');
            const dcLink = options.getString('discord');
            const robloxLink = options.getString('roblox');
            const publicChannel = options.getChannel('public_channel');

            alliances.push({ group, ourReps, theirReps, dcLink, robloxLink });
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            // Log to alliance-add channel
            const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('New Alliance Added')
                    .setColor('Green')
                    .addFields(
                        { name: 'Group', value: group },
                        { name: 'Our Reps', value: ourReps },
                        { name: 'Their Reps', value: theirReps },
                        { name: 'Discord Link', value: dcLink },
                        { name: 'Roblox Link', value: robloxLink }
                    );
                logChannel.send({ embeds: [embed] });
            }

            // Send public welcome message if channel specified
            if (publicChannel && publicChannel.isTextBased()) {
                const repMentions = ourReps.split(/,| /).filter(x => x).map(r => `<@${r.replace(/[<@>]/g, '')}>`).join('\n');
                const welcomeMessage = `:tada: **Welcome New Alliance! | Kavi Café x ${group}** :tada:

We’re thrilled to officially welcome your community into an alliance with Kavi Café! :star2:

:busts_in_silhouette: Please meet your Kavi Café representatives:

${repMentions}

:handshake: **Looking Ahead**
We’re excited to be working together and building a strong, positive relationship.

:coffee::sparkles: Here’s to a successful partnership between **Kavi Café** and **${group}!** :sparkles::coffee:`;
                publicChannel.send({ content: welcomeMessage });
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
            const groupName = options.getString('group');
            const index = alliances.findIndex(a => a.group.toLowerCase() === groupName.toLowerCase());
            if (index === -1) return interaction.editReply(`❌ Alliance "${groupName}" not found.`);
            const removed = alliances.splice(index, 1)[0];
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            // Log removal
            const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('Alliance Removed')
                    .setColor('Red')
                    .addFields(
                        { name: 'Group', value: removed.group },
                        { name: 'Status', value: 'Removed' },
                        { name: 'Reason', value: 'N/A' }
                    );
                logChannel.send({ embeds: [embed] });
            }

            return interaction.editReply(`✅ Alliance "${removed.group}" removed`);
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
                    .setTitle('Alliance Updated')
                    .setColor('Yellow')
                    .addFields(
                        { name: 'Group', value: alliance.group },
                        { name: 'Our Reps', value: alliance.ourReps },
                        { name: 'Their Reps', value: alliance.theirReps },
                        { name: 'Discord Link', value: alliance.dcLink },
                        { name: 'Roblox Link', value: alliance.robloxLink }
                    );
                logChannel.send({ embeds: [embed] });
            }

            return interaction.editReply(`✅ Alliance "${alliance.group}" updated`);
        }
    }

    /* ===== /staff ===== */
    if (commandName === 'staff') {
        await interaction.deferReply({ ephemeral: true });
        const sub = options.getSubcommand();
        const target = options.getUser('member');
        const action = options.getString('action');
        const reason = options.getString('reason') || 'No reason provided';
        const targetMember = await guild.members.fetch(target.id);

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
                logChannel.send({ embeds: [logEmbed] });
            }

            if (action === 'strike') {
                strikes.push({ user: target.id, reason, staff: member.user.tag, date: new Date().toLocaleString() });
                fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                return interaction.editReply(`⚠️ Strike added to ${target.tag}`);
            }

            if (action === 'remove') {
                const index = strikes.findIndex(s => s.user === target.id);
                if (index !== -1) {
                    strikes.splice(index, 1);
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                    return interaction.editReply(`✅ Strike removed from ${target.tag}`);
                }
                return interaction.editReply(`❌ No strikes found for ${target.tag}`);
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
                embed.addFields({ name: `Strike ${i + 1}`, value: `Reason: ${s.reason}\nBy: ${s.staff}\nDate: ${s.date}` });
            });

            return interaction.editReply({ embeds: [embed] });
        }
    }

    /* ===== /status ===== */
    if (commandName === 'status') {
        await interaction.deferReply({ ephemeral: true });
        const newStatus = options.getString('text') || 'Kavi Café';
        await client.user.setPresence({ activities: [{ name: newStatus, type: 0 }] }); // Playing
        return interaction.editReply(`✅ Status updated: Playing ${newStatus}`);
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

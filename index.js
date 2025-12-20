require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// --------------------------
// Load data files
// --------------------------
let alliances = [];
try {
    alliances = JSON.parse(fs.readFileSync('./alliances.json', 'utf8')) || [];
    if (!Array.isArray(alliances)) alliances = [];
} catch (err) {
    alliances = [];
}

let staffStrikes = [];
try {
    staffStrikes = JSON.parse(fs.readFileSync('./staffStrikes.json', 'utf8')) || [];
    if (!Array.isArray(staffStrikes)) staffStrikes = [];
} catch (err) {
    staffStrikes = [];
}

// --------------------------
// Ready event
// --------------------------
client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// --------------------------
// Handle slash commands
// --------------------------
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, member } = interaction;

    // --------------------------
    // /status command
    // --------------------------
    if (commandName === 'status') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this.', ephemeral: true });
        }

        const type = options.getString('type');
        const text = options.getString('text');

        client.user.setActivity(text, { type });
        return interaction.reply({ content: `Status updated to: ${type} ${text}`, ephemeral: true });
    }

    // --------------------------
    // /dm command
    // --------------------------
    else if (commandName === 'dm') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this.', ephemeral: true });
        }

        const user = options.getUser('user');
        const message = options.getString('message');

        const dmEmbed = new EmbedBuilder()
            .setTitle('📩 Staff Message')
            .setColor('Blue')
            .setDescription(message);

        try {
            await user.send({ embeds: [dmEmbed] });
            await interaction.reply({ content: `✅ Message sent to ${user.tag}`, ephemeral: true });

            // Log in dm-logs
            const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
            if (logChannel) {
                await logChannel.send({ embeds: [new EmbedBuilder()
                    .setTitle('📩 Staff Message')
                    .setColor('Blue')
                    .addFields(
                        { name: 'To', value: `<@${user.id}>` },
                        { name: 'Message', value: message },
                        { name: 'Sent By', value: `<@${member.id}>` }
                    )
                    .setTimestamp()
                ]});
            }
        } catch (err) {
            return interaction.reply({ content: `❌ Failed to send DM: ${err.message}`, ephemeral: true });
        }
    }

    // --------------------------
    // /rep request
    // --------------------------
    else if (commandName === 'rep' && options.getSubcommand() === 'request') {
        const number = options.getInteger('number');
        const discordLink = options.getString('discord_link');
        const robloxLink = options.getString('roblox_link');
        const allianceLink = options.getString('alliance_link');

        const embed = new EmbedBuilder()
            .setTitle('New Rep Request')
            .setColor('Blue')
            .addFields(
                { name: 'Number', value: `${number}`, inline: true },
                { name: 'Discord Link', value: discordLink },
                { name: 'Roblox Link', value: robloxLink },
                { name: 'Alliance Link', value: allianceLink },
                { name: 'Instructions', value: 'When you are adding yourself to an alliance make sure to give yourself the correct roles for the alliance! This is very important!' }
            );

        const channel = guild.channels.cache.find(c => c.name === 'request-new-rep');
        if (!channel) return interaction.reply({ content: '❌ Channel "request-new-rep" not found.', ephemeral: true });

        const role = guild.roles.cache.find(r => r.name === '[PR] | Staff Role');
        await channel.send({ content: role ? `<@&${role.id}>` : null, embeds: [embed] });

        return interaction.reply({ content: '✅ Rep request submitted.', ephemeral: true });
    }

    // --------------------------
    // /alliance command
    // --------------------------
    else if (commandName === 'alliance') {
        const sub = options.getSubcommand();

        if (!member.roles.cache.some(r => r.name === '[PR] | Staff Role')) {
            return interaction.reply({ content: '❌ You do not have permission.', ephemeral: true });
        }

        const mainChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
        if (!mainChannel) return interaction.reply({ content: '❌ Main channel not found.', ephemeral: true });

        if (sub === 'add' || sub === 'edit') {
            const group = options.getString('group');
            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');
            const dcLink = options.getString('dc_link');
            const robloxLink = options.getString('roblox_link');
            const publicChannel = options.getChannel('public_channel');

            // Update or add
            let alliance = alliances.find(a => a.group === group);
            if (!alliance) {
                alliance = { group, ourReps, theirReps, dcLink, robloxLink };
                alliances.push(alliance);
            } else {
                alliance.ourReps = ourReps;
                alliance.theirReps = theirReps;
                alliance.dcLink = dcLink;
                alliance.robloxLink = robloxLink;
            }

            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            const embed = new EmbedBuilder()
                .setTitle(sub === 'add' ? 'New Alliance Added' : 'Alliance Updated')
                .setColor(sub === 'add' ? 'Green' : 'Yellow')
                .addFields(
                    { name: 'Group', value: group },
                    { name: 'Our Reps', value: ourReps },
                    { name: 'Their Reps', value: theirReps },
                    { name: 'Discord Link', value: dcLink },
                    { name: 'Roblox Link', value: robloxLink }
                );

            await mainChannel.send({ embeds: [embed] });
            if (publicChannel) await publicChannel.send({ embeds: [embed] });

            return interaction.reply({ content: '✅ Alliance processed.', ephemeral: true });
        }

        else if (sub === 'remove') {
            const group = options.getString('group');
            const status = options.getString('status');
            const reason = options.getString('reason');

            alliances = alliances.filter(a => a.group !== group);
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            const embed = new EmbedBuilder()
                .setTitle('Alliance Removed')
                .setColor('Red')
                .addFields(
                    { name: 'Group', value: group },
                    { name: 'Status', value: status },
                    { name: 'Reason', value: reason }
                );

            await mainChannel.send({ embeds: [embed] });

            return interaction.reply({ content: '✅ Alliance removed.', ephemeral: true });
        }

        else if (sub === 'list') {
            if (alliances.length === 0) return interaction.reply({ content: 'No alliances found.', ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle('Current Alliances')
                .setColor('Blue');

            alliances.forEach(a => {
                embed.addFields(
                    { name: a.group, value: `Our Reps: ${a.ourReps}\nTheir Reps: ${a.theirReps}`, inline: false }
                );
            });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    // --------------------------
    // /staff discipline
    // --------------------------
    else if (commandName === 'staff' && options.getSubcommand() === 'discipline') {
        if (!member.roles.cache.some(r => r.name === '[PR] | Staff Role')) {
            return interaction.reply({ content: '❌ You do not have permission.', ephemeral: true });
        }

        const category = options.getString('category');
        const target = options.getUser('member');
        const action = options.getString('action');
        const reason = options.getString('reason');
        const strikeNumber = options.getInteger('strike_number');

        if (action === 'add') {
            const strikes = staffStrikes.filter(s => s.userId === target.id);
            const newStrikeNum = strikes.length + 1;

            staffStrikes.push({
                userId: target.id,
                strike: newStrikeNum,
                category,
                reason,
                date: new Date().toISOString(),
                addedBy: member.id
            });

            fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

            const dmEmbed = new EmbedBuilder()
                .setTitle('Greetings, @user')
                .setDescription(`I'm unfortunately saddened to inform you that you have received a strike for your actions at Kavià Cafe.\nThis is your ${newStrikeNum}${newStrikeNum === 1 ? 'st' : newStrikeNum === 2 ? 'nd' : 'th'} strike.\n\n🗒️ Reason: ${reason}\n\nIf you feel like this was false or inaccurate please open a ticket.\n\nRegards,\nKavia Staff Team\nKavià || Public Relations team`)
                .setColor('Red');

            await target.send({ embeds: [dmEmbed] }).catch(() => {});

            // Log in staff-discipline channel
            const logChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Staff Discipline Applied')
                    .setColor('Red')
                    .addFields(
                        { name: 'Category', value: category },
                        { name: 'Action', value: 'Strike' },
                        { name: 'Reason', value: reason },
                        { name: 'Staff Member', value: `<@${target.id}>` },
                        { name: 'Applied By', value: `<@${member.id}>` }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.reply({ content: '✅ Discipline applied.', ephemeral: true });
        }

        else if (action === 'remove') {
            if (!strikeNumber) return interaction.reply({ content: '❌ You must provide strike_number to remove.', ephemeral: true });

            const index = staffStrikes.findIndex(s => s.userId === target.id && s.strike === strikeNumber);
            if (index === -1) return interaction.reply({ content: '❌ Strike not found.', ephemeral: true });

            staffStrikes.splice(index, 1);
            fs.writeFileSync('./staffStrikes.json', JSON.stringify(staffStrikes, null, 2));

            return interaction.reply({ content: '✅ Strike removed.', ephemeral: true });
        }

        else if (action === 'kick') {
            const guildMember = await guild.members.fetch(target.id);
            await guildMember.kick(reason);
            return interaction.reply({ content: `✅ ${target.tag} was kicked.`, ephemeral: true });
        }
    }
});

// --------------------------
// DM logging for messages sent to the bot
// --------------------------
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Only handle DMs
    if (message.channel.type === 1) { // 1 = DM
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return;

        const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('📩 Staff Message')
            .setColor('Blue')
            .addFields(
                { name: 'From', value: `<@${message.author.id}>` },
                { name: 'Message', value: message.content }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);

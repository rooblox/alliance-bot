require('dotenv').config();
const fs = require('fs');
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder
} = require('discord.js');

// Initialize client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// Load data safely
let alliances = [];
let strikes = [];

try { alliances = fs.existsSync('./alliances.json') ? JSON.parse(fs.readFileSync('./alliances.json')) : []; } 
catch { alliances = []; }
try { strikes = fs.existsSync('./staffStrikes.json') ? JSON.parse(fs.readFileSync('./staffStrikes.json')) : []; } 
catch { strikes = []; }

// Ready event
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity('Kavia Cafe', { type: 'PLAYING' }).catch(console.error);
});

// Interaction handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        await interaction.deferReply({ ephemeral: true });

        const { commandName, options, guild, member } = interaction;

        /* ===== /dm ===== */
        if (commandName === 'dm') {
            const target = options.getUser('user');
            const message = options.getString('message');

            const embed = new EmbedBuilder()
                .setTitle('📩 Staff Message')
                .setColor('Blue')
                .setDescription(message);

            await target.send({ embeds: [embed] }).catch(console.error);

            const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📩 Staff Message')
                    .setColor('Blue')
                    .setDescription(
                        `**To:** ${target}\n**Message:** ${message}\n\n**Sent By:** ${member}\n${new Date().toLocaleString()}`
                    );
                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
            }

            return interaction.editReply('✅ DM sent');
        }

        /* ===== /alliance ===== */
        if (commandName === 'alliance') {
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
                const index = alliances.findIndex(a => a.group === groupName);
                if (index === -1) return interaction.editReply('❌ Alliance not found.');
                alliances.splice(index, 1);
                fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));
                return interaction.editReply('✅ Alliance removed');
            }

            if (sub === 'edit') {
                const groupName = options.getString('group');
                const index = alliances.findIndex(a => a.group === groupName);
                if (index === -1) return interaction.editReply('❌ Alliance not found.');

                const alliance = alliances[index];
                if (options.getString('our_reps')) alliance.ourReps = options.getString('our_reps');
                if (options.getString('their_reps')) alliance.theirReps = options.getString('their_reps');
                if (options.getString('discord')) alliance.dcLink = options.getString('discord');
                if (options.getString('roblox')) alliance.robloxLink = options.getString('roblox');

                fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));
                return interaction.editReply('✅ Alliance updated');
            }
        }

        /* ===== /staff ===== */
        if (commandName === 'staff') {
            const sub = options.getSubcommand();
            const category = options.getString('category'); // Strike/Termination/Blacklisted
            const target = options.getUser('member');
            const action = options.getString('action');
            const reason = options.getString('reason') || 'No reason provided';
            const staffChannel = guild.channels.cache.find(c => c.name === 'staff-discipline');

            if (action === 'add') {
                let dmEmbed;
                if (category === 'Strike') {
                    const strikeNumber = strikes.filter(s => s.user === target.id).length + 1;
                    strikes.push({ user: target.id, reason, staff: member.user.tag, date: new Date().toLocaleString() });
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));

                    dmEmbed = new EmbedBuilder()
                        .setTitle('**Strike Notice**')
                        .setColor('Red')
                        .setDescription(`> Greetings, <@${target.id}>\n\nYou've received a strike. This is your **${strikeNumber}${strikeNumber === 1 ? 'st' : strikeNumber === 2 ? 'nd' : 'th'} strike.**\n\n> 🗒️ **Reason:** *${reason}*\n\nIf you feel this is false, please *open a ticket*.\n\n**Regards,**\n**Staff Team**\n**Kavià || Public Relations team**`);
                } else {
                    dmEmbed = new EmbedBuilder()
                        .setTitle(`**${category} Notice**`)
                        .setColor('Red')
                        .setDescription(`> Greetings, <@${target.id}>\n\nYou have been ${category.toLowerCase()} at Kavià Cafe.\n\n> 🗒️ **Reason:** *${reason}*\n\n**Regards,**\n**Staff Team**\n**Kavià || Public Relations team**`);

                    if (category === 'Termination') {
                        try {
                            const memberToKick = await guild.members.fetch(target.id);
                            await memberToKick.kick(reason);
                        } catch (err) { console.error(err); }
                    }
                }

                await target.send({ embeds: [dmEmbed] }).catch(console.error);
                if (staffChannel) staffChannel.send({ embeds: [dmEmbed] });

                return interaction.editReply(`✅ ${category} added and user notified`);
            }

            if (action === 'remove') {
                if (category === 'Strike') {
                    const index = strikes.findIndex(s => s.user === target.id);
                    if (index !== -1) {
                        strikes.splice(index, 1);
                        fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                    }
                }

                const dmEmbed = new EmbedBuilder()
                    .setTitle('**Notice**')
                    .setColor('Green')
                    .setDescription(`> Greetings, <@${target.id}>\n\nYour ${category} has been **removed** at Kavià Cafe.\n\n> 🗒️ **Reason:** *${reason}*\n\n**Regards,**\n**Staff Team**\n**Kavià || Public Relations team**`);

                await target.send({ embeds: [dmEmbed] }).catch(console.error);
                if (staffChannel) staffChannel.send({ embeds: [dmEmbed] });

                return interaction.editReply(`✅ ${category} removed and user notified`);
            }

            if (action === 'kick') {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('**Kick Notice**')
                    .setColor('Red')
                    .setDescription(`> Greetings, <@${target.id}>\n\nYou are being kicked from Kavià Cafe.\n\n> 🗒️ **Reason:** *${reason}*\n\n**Regards,**\n**Staff Team**\n**Kavià || Public Relations team**`);

                await target.send({ embeds: [dmEmbed] }).catch(console.error);
                try {
                    const memberToKick = await guild.members.fetch(target.id);
                    await memberToKick.kick(reason);
                } catch (err) { console.error(err); }

                if (staffChannel) staffChannel.send({ embeds: [dmEmbed] });

                return interaction.editReply(`✅ ${target.tag} has been kicked and notified`);
            }
        }

        /* ===== /rep request ===== */
        if (commandName === 'rep') {
            const sub = options.getSubcommand();
            if (sub === 'request') {
                const numReps = options.getNumber('number');
                const dcLink = options.getString('discord');
                const robloxLink = options.getString('roblox');
                const allianceLink = options.getString('alliance');

                const channel = guild.channels.cache.find(c => c.name === 'request-new-rep');
                const role = guild.roles.cache.find(r => r.name === '[PR] | Staff Role');

                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle('📥 New Rep Request')
                        .setColor('Blue')
                        .setDescription(`**Requested By:** ${member}\n**Number of Reps:** ${numReps}\n**Discord Link:** ${dcLink}\n**Roblox Link:** ${robloxLink}\n**Alliance Link:** ${allianceLink}\n\n📌 Instructions\nWhen adding yourself to an alliance, make sure you give yourself the correct alliance roles.\nThis is very important.\n${new Date().toLocaleString()}`);

                    channel.send({ content: role ? `${role}` : '', embeds: [embed] }).catch(console.error);
                }

                return interaction.editReply('✅ Rep request submitted');
            }
        }

        /* ===== /status ===== */
        if (commandName === 'status') {
            try {
                await client.user.setActivity('Kavia Cafe', { type: 'PLAYING' });
                return interaction.editReply('✅ Status updated to: Playing Kavia Cafe');
            } catch (err) {
                console.error(err);
                return interaction.editReply('❌ Failed to update status');
            }
        }

    } catch (err) {
        console.error(err);
        if (interaction.deferred || interaction.replied) {
            return interaction.followUp({ content: '❌ There was an error while executing this command.', ephemeral: true });
        } else {
            return interaction.editReply('❌ There was an error while executing this command.');
        }
    }
});

client.login(process.env.TOKEN).catch(console.error);

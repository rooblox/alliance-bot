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
            const newAlliance = {
                group: options.getString('group'),
                ourReps: options.getString('our_reps'),
                theirReps: options.getString('their_reps'),
                dcLink: options.getString('discord'),
                robloxLink: options.getString('roblox')
            };
            alliances.push(newAlliance);
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            // Log in channel 'alliance-add' if exists
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
                        `**Our Reps:** ${a.ourReps}\n` +
                        `**Their Reps:** ${a.theirReps}\n` +
                        `🔗 **Discord:** ${a.dcLink}\n` +
                        `🔗 **Roblox:** ${a.robloxLink}`
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

            const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Alliance Removed')
                    .setColor('Red')
                    .addFields(
                        { name: 'Group', value: groupName },
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
    if (commandName === 'staff') {
        await interaction.deferReply({ ephemeral: true });
        const sub = options.getSubcommand();
        const target = options.getUser('member');
        const action = options.getString('action');
        const reason = options.getString('reason') || 'No reason provided';

        if (sub === 'discipline') {
            // DM embed for strikes
            if (action === 'strike') {
                const userStrikes = strikes.filter(s => s.user === target.id);
                const strikeNumber = userStrikes.length + 1;
                const dmEmbed = new EmbedBuilder()
                    .setTitle('**Strike Notice**')
                    .setColor('Red')
                    .setDescription(`> Greetings, <@${target.id}>\n\nI'm unfortunately saddened to inform you that you have received a strike for your actions at Kavià Cafe. This is your **${strikeNumber}${strikeNumber === 1 ? 'st' : strikeNumber === 2 ? 'nd' : 'th'} strike.**\n\n> 🗒️ **Reason:** *${reason}*\n\nIf you feel like this was false or inaccurate please *open a ticket*.\n\n**Regards,**\n**Staff Team**\n**Kavià || Public Relations team**`);

                try { await target.send({ embeds: [dmEmbed] }); } catch {}

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
                    strikes.splice(index, 1);
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                    return interaction.editReply(`✅ Strike removed from ${target.tag}`);
                } else {
                    return interaction.editReply(`❌ No strikes found for ${target.tag}`);
                }
            }

            if (action === 'kick') {
                const guildMember = await guild.members.fetch(target.id);
                if (!guildMember.kickable) return interaction.editReply('❌ Cannot kick this member.');
                await guildMember.kick(reason);
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
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

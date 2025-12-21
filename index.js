require('dotenv').config();
const fs = require('fs');
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder
} = require('discord.js');

// Create client
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

    await interaction.deferReply({ ephemeral: true });

    const { commandName, options, guild, member } = interaction;

    /* ===== /dm ===== */
    if (commandName === 'dm') {
        const user = options.getUser('user');
        const message = options.getString('message');

        // DM to user
        const dmEmbed = new EmbedBuilder()
            .setTitle('📩 Staff Message')
            .setDescription(message)
            .setColor('Blue');

        try {
            await user.send({ embeds: [dmEmbed] });
        } catch {
            return interaction.editReply('❌ Could not send DM to that user.');
        }

        // Log to dm-logs channel
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
        const sub = options.getSubcommand();

        // Add alliance
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

        // List alliances
        if (sub === 'list') {
            if (alliances.length === 0)
                return interaction.editReply('No alliances found.');

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

        // Remove alliance
        if (sub === 'remove') {
            const groupName = options.getString('group'); // Name of the alliance to remove
            const index = alliances.findIndex(a => a.group.toLowerCase() === groupName.toLowerCase());

            if (index === -1) {
                return interaction.editReply(`❌ Alliance "${groupName}" not found.`);
            }

            alliances.splice(index, 1); // Remove the alliance
            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));

            return interaction.editReply(`✅ Alliance "${groupName}" has been removed.`);
        }
    }

    /* ===== /staff ===== */
    if (commandName === 'staff') {
        const sub = options.getSubcommand();
        const target = options.getUser('member');
        const category = options.getString('category');
        const action = options.getString('action');
        const reason = options.getString('reason') || 'No reason provided';
        const gm = await guild.members.fetch(target.id);

        if (sub === 'discipline') {
            // Only kick if action === 'kick'
            if (action === 'kick') {
                // DM the user before kicking
                const dmEmbed = new EmbedBuilder()
                    .setTitle('📩 You have been kicked')
                    .setColor('Red')
                    .addFields(
                        { name: 'Reason', value: reason },
                        { name: 'By', value: `<@${member.user.id}>` }
                    );

                try {
                    await target.send({ embeds: [dmEmbed] });
                } catch {
                    console.log(`Could not DM ${target.tag} before kick.`);
                }

                // Kick the user
                if (!gm.kickable) {
                    return interaction.editReply('❌ I cannot kick this member. Check my role and permissions.');
                }

                await gm.kick(reason);
                return interaction.editReply(`❌ ${target.tag} has been kicked`);
            }

            // Strike actions
            if (category === 'Strike') {
                if (action === 'add') {
                    strikes.push({
                        user: target.id,
                        reason,
                        staff: member.user.tag,
                        date: new Date().toLocaleString()
                    });
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                    return interaction.editReply('⚠️ Strike added');
                }
                if (action === 'remove') {
                    const index = strikes.findIndex(s => s.user === target.id);
                    if (index === -1) return interaction.editReply('❌ No strikes found to remove.');
                    strikes.splice(index, 1);
                    fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                    return interaction.editReply('✅ Strike removed');
                }
            }

            // Termination or Blacklisted logic
            if (category === 'Termination') {
                return interaction.editReply('❌ Terminate action executed (custom logic can go here)');
            }
            if (category === 'Blacklisted') {
                return interaction.editReply('❌ Blacklist action executed (custom logic can go here)');
            }
        }

        // View strikes
        if (sub === 'strikes') {
            const userStrikes = strikes.filter(s => s.user === target.id);

            if (userStrikes.length === 0)
                return interaction.editReply('No strikes found.');

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

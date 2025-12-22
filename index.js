require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

/* =======================
   CLIENT
======================= */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

/* =======================
   DATA
======================= */
const ALLIANCE_FILE = './alliances.json';
const STRIKE_FILE = './staffStrikes.json';

let alliances = fs.existsSync(ALLIANCE_FILE)
    ? JSON.parse(fs.readFileSync(ALLIANCE_FILE))
    : [];

let strikes = fs.existsSync(STRIKE_FILE)
    ? JSON.parse(fs.readFileSync(STRIKE_FILE))
    : [];

/* =======================
   READY
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

    try {

        /* =======================
           /ALLIANCE
        ======================= */
        if (commandName === 'alliance') {
            await interaction.deferReply({ ephemeral: true });
            const sub = options.getSubcommand();
            const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');

            /* ---- ADD ---- */
            if (sub === 'add') {
                const alliance = {
                    group: options.getString('group'),
                    ourReps: options.getString('our_reps'),
                    theirReps: options.getString('their_reps'),
                    dcLink: options.getString('discord'),
                    robloxLink: options.getString('roblox')
                };

                alliances.push(alliance);
                fs.writeFileSync(ALLIANCE_FILE, JSON.stringify(alliances, null, 2));

                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ New Alliance Added')
                        .setColor('Green')
                        .addFields(
                            { name: 'Group', value: alliance.group },
                            { name: 'Our Reps', value: alliance.ourReps },
                            { name: 'Their Reps', value: alliance.theirReps },
                            { name: 'Discord Link', value: alliance.dcLink },
                            { name: 'Roblox Link', value: alliance.robloxLink }
                        )
                        .setTimestamp();

                    logChannel.send({ embeds: [embed] });
                }

                return interaction.editReply('✅ Alliance added successfully.');
            }

            /* ---- LIST ---- */
            if (sub === 'list') {
                if (!alliances.length)
                    return interaction.editReply('No alliances found.');

                const embed = new EmbedBuilder()
                    .setTitle('🌐 Current Alliances')
                    .setColor('Blue');

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

            /* ---- REMOVE ---- */
            if (sub === 'remove') {
                const group = options.getString('group');
                const index = alliances.findIndex(a => a.group.toLowerCase() === group.toLowerCase());

                if (index === -1)
                    return interaction.editReply('❌ Alliance not found.');

                const removed = alliances.splice(index, 1)[0];
                fs.writeFileSync(ALLIANCE_FILE, JSON.stringify(alliances, null, 2));

                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Alliance Removed')
                        .setColor('Red')
                        .addFields(
                            { name: 'Group', value: removed.group },
                            { name: 'Removed By', value: `<@${member.user.id}>` }
                        )
                        .setTimestamp();

                    logChannel.send({ embeds: [embed] });
                }

                return interaction.editReply(`✅ Alliance **${removed.group}** removed.`);
            }
        }

    } catch (err) {
        console.error(err);
        if (interaction.deferred)
            interaction.editReply('❌ An error occurred.');
    }
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

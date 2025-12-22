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
   DATA
======================= */
const ALLIANCE_FILE = './alliances.json';

let alliances = fs.existsSync(ALLIANCE_FILE)
    ? JSON.parse(fs.readFileSync(ALLIANCE_FILE))
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

    /* ===== /alliance ===== */
    if (commandName === 'alliance') {
        await interaction.deferReply({ ephemeral: true });

        const sub = options.getSubcommand();
        const logChannel = guild.channels.cache.find(c => c.name === 'alliance-add');

        /* ===== ADD ===== */
        if (sub === 'add') {
            const group = options.getString('group');
            const ourReps = options.getString('our_reps');
            const theirReps = options.getString('their_reps');
            const dcLink = options.getString('discord');
            const robloxLink = options.getString('roblox');
            const publicChannel = options.getChannel('public_channel');

            const alliance = {
                group,
                ourReps,
                theirReps,
                dcLink,
                robloxLink
            };

            alliances.push(alliance);
            fs.writeFileSync(ALLIANCE_FILE, JSON.stringify(alliances, null, 2));

            /* LOG FORMAT */
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
                    )
                    .setFooter({ text: `Added by ${member.user.tag}` })
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }

            /* PUBLIC WELCOME MESSAGE */
            if (publicChannel) {
                const reps = ourReps
                    .split(/[\s,]+/)
                    .filter(r => r.startsWith('<@'));

                const welcomeMessage =
`:tada: **Welcome New Alliance! | Kavi Café x ${group}** :tada:

We’re thrilled to officially welcome your community into an alliance with Kavi Café! ⭐
This partnership is all about mutual growth, support, and fun — and we can’t wait to see what we’ll achieve together.

:speech_balloon: **Questions & Support**
If you have any questions, concerns, or suggestions, this is the perfect place to share them.

:busts_in_silhouette:
Please meet your Kavi Café representatives:

${reps.map(r => `**•** ${r}`).join('\n')}

:handshake: **Looking Ahead**
We’re excited to build a strong, positive relationship between our communities.

:coffee::sparkles: Here’s to a successful partnership between **Kavi Café** and **${group}!** :sparkles::coffee:`;

                publicChannel.send({ content: welcomeMessage });
            }

            return interaction.editReply('✅ Alliance added successfully.');
        }

        /* ===== LIST ===== */
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

        /* ===== REMOVE ===== */
        if (sub === 'remove') {
            const group = options.getString('group');
            const status = options.getString('status');
            const reason = options.getString('reason');

            const index = alliances.findIndex(a => a.group.toLowerCase() === group.toLowerCase());
            if (index === -1)
                return interaction.editReply('❌ Alliance not found.');

            alliances.splice(index, 1);
            fs.writeFileSync(ALLIANCE_FILE, JSON.stringify(alliances, null, 2));

            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('Alliance Removed')
                    .setColor('Red')
                    .addFields(
                        { name: 'Group', value: group },
                        { name: 'Status', value: status },
                        { name: 'Reason', value: reason }
                    )
                    .setFooter({ text: `Removed by ${member.user.tag}` })
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }

            return interaction.editReply(`✅ Alliance "${group}" removed.`);
        }
    }
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
});

function normalizeUrl(url) {
    if (!url) return 'N/A';
    if (!url.startsWith('http')) return `https://${url}`;
    return url;
}

let alliances = [];
let allianceListMessageId = null;

async function updateAllianceList(channel) {
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('🌐 Alliances')
        .setColor('Green')
        .setTimestamp();

    if (!alliances.length) {
        embed.setDescription('No alliances found.');
    } else {
        alliances.forEach(a => {
            embed.addFields({
                name: a.group,
                value:
                    `**Our Reps:** ${a.ourReps}\n` +
                    `**Their Reps:** ${a.theirReps}\n` +
                    `**Discord:** ${a.dcLink}\n` +
                    `**Roblox:** ${a.robloxLink}`
            });
        });
    }

    if (allianceListMessageId) {
        try {
            const msg = await channel.messages.fetch(allianceListMessageId);
            await msg.edit({ embeds: [embed] });
            return;
        } catch {}
    }

    const msg = await channel.send({ embeds: [embed] });
    allianceListMessageId = msg.id;
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild } = interaction;

    try {
        if (commandName === 'alliance') {
            await interaction.deferReply({ ephemeral: true });

            const sub = options.getSubcommand();
            const listChannel = guild.channels.cache.find(
                c => c.name === 'alliances-list'
            );

            if (sub === 'add') {
                const group = options.getString('group');
                const ourReps = options.getString('our_reps');
                const theirReps = options.getString('their_reps');
                const dcLink = normalizeUrl(options.getString('discord_link'));
                const robloxLink = normalizeUrl(options.getString('roblox_link'));
                const publicChannel = options.getChannel('public_channel');

                // 🔥 OVERWRITE EXISTING ALLIANCE
                alliances = alliances.filter(
                    a => a.group.toLowerCase() !== group.toLowerCase()
                );

                alliances.push({
                    group,
                    ourReps,
                    theirReps,
                    dcLink,
                    robloxLink
                });

                if (publicChannel?.isTextBased()) {
                    await publicChannel.send(
`:tada: **Welcome New Alliance! | Kavia Café x ${group}** :tada:`
                    );
                }

                if (listChannel) await updateAllianceList(listChannel);
                return interaction.editReply(`✅ Alliance **${group}** added.`);
            }

            if (sub === 'remove') {
                const group = options.getString('group');
                alliances = alliances.filter(
                    a => a.group.toLowerCase() !== group.toLowerCase()
                );
                if (listChannel) await updateAllianceList(listChannel);
                return interaction.editReply(`✅ Alliance **${group}** removed.`);
            }

            if (sub === 'list') {
                if (listChannel) await updateAllianceList(listChannel);
                return interaction.editReply('✅ Alliance list updated.');
            }
        }
    } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ Error occurred.', ephemeral: true });
    }
});

client.login(process.env.TOKEN);

require('dotenv').config();
const fs = require('fs');
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    PermissionsBitField
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

/* =======================
   DATA
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

        const embed = new EmbedBuilder()
            .setTitle('📩 Staff Message')
            .setDescription(message)
            .setColor('Blue');

        await user.send({ embeds: [embed] });

        const log = guild.channels.cache.find(c => c.name === 'dm-logs');
        if (log) log.send({ embeds: [embed] });

        return interaction.editReply('✅ DM sent');
    }

    /* ===== /alliance ===== */
    if (commandName === 'alliance') {
        if (options.getSubcommand() === 'add') {
            alliances.push({
                group: options.getString('group'),
                our: options.getString('our_reps'),
                their: options.getString('their_reps'),
                discord: options.getString('discord'),
                roblox: options.getString('roblox')
            });

            fs.writeFileSync('./alliances.json', JSON.stringify(alliances, null, 2));
            return interaction.editReply('✅ Alliance added');
        }

        if (options.getSubcommand() === 'list') {
            const embed = new EmbedBuilder()
                .setTitle('🌐 Current Alliances')
                .setColor('Green');

            alliances.forEach(a => {
                embed.addFields({
                    name: a.group,
                    value:
                        `**Our Reps:** ${a.our}\n` +
                        `**Their Reps:** ${a.their}\n` +
                        `🔗 **Discord:** ${a.discord}\n` +
                        `🔗 **Roblox:** ${a.roblox}`
                });
            });

            return interaction.editReply({ embeds: [embed] });
        }
    }

    /* ===== /staff ===== */
    if (commandName === 'staff') {
        const sub = options.getSubcommand();
        const target = options.getUser('member');

        if (sub === 'discipline') {
            const action = options.getString('action');
            const reason = options.getString('reason');

            if (action === 'strike') {
                strikes.push({
                    user: target.id,
                    reason,
                    staff: member.user.tag,
                    date: new Date().toLocaleString()
                });

                fs.writeFileSync('./staffStrikes.json', JSON.stringify(strikes, null, 2));
                return interaction.editReply('⚠️ Strike added');
            }

            if (action === 'terminate') {
                const gm = await guild.members.fetch(target.id);
                await gm.kick(reason);
                return interaction.editReply(`❌ ${target.tag} terminated`);
            }
        }

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

client.login(process.env.TOKEN);

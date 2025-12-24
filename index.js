require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (
        interaction.commandName === 'alliance' &&
        interaction.options.getSubcommand() === 'add'
    ) {
        // Role check
        const requiredRoleName = '[PR] | Staff Role';
        const member = interaction.member;

        if (!member.roles.cache.some(role => role.name === requiredRoleName)) {
            return interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        // Get options
        const group = interaction.options.getString('group');
        const ourReps = interaction.options.getString('our_reps');
        const theirReps = interaction.options.getString('their_reps');
        const dcLink = interaction.options.getString('dc_link');
        const robloxLink = interaction.options.getString('roblox_link');

        // Find channel
        const channel = interaction.guild.channels.cache.find(
            ch => ch.name === 'alliance-add'
        );

        if (!channel) {
            return interaction.reply({
                content: '❌ Channel #alliance-add not found.',
                ephemeral: true
            });
        }

        // Find role to ping
        const pingRole = interaction.guild.roles.cache.find(
            role => role.name === requiredRoleName
        );

        // Build embed
        const embed = new EmbedBuilder()
            .setTitle('📥 New Alliance Added')
            .setColor(0x2ECC71)
            .addFields(
                { name: 'Group', value: group, inline: false },
                { name: 'Our Representatives', value: ourReps, inline: false },
                { name: 'Their Representatives', value: theirReps, inline: false },
                { name: 'Discord Link', value: dcLink, inline: false },
                { name: 'Roblox Link', value: robloxLink, inline: false }
            )
            .setFooter({ text: `Submitted by ${interaction.user.tag}` })
            .setTimestamp();

        // Send message
        await channel.send({
            content: pingRole ? `<@&${pingRole.id}>` : '',
            embeds: [embed]
        });

        // Confirm to user
        await interaction.reply({
            content: '✅ Alliance submission sent successfully!',
            ephemeral: true
        });
    }
});

client.login(process.env.TOKEN);

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

/* =======================
   IN-MEMORY DATA
======================= */
let alliances = [];
let allianceListMessageId = null;
let staffStrikes = [];

/* =======================
   READY
======================= */
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =======================
   DM LOGGING
======================= */
client.on('messageCreate', async message => {
  if (!message.guild && !message.author.bot) {
    const logChannel = client.channels.cache.find(c => c.name === 'dm-logs');
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('📩 DM Received')
      .setColor('Blue')
      .addFields(
        { name: 'From', value: `<@${message.author.id}>` },
        { name: 'Message', value: message.content },
        { name: 'Date', value: new Date().toLocaleString() }
      );

    logChannel.send({ embeds: [embed] });
  }
});

/* =======================
   ALLIANCE LIST RENDER
======================= */
async function updateAllianceList(guild) {
  const channel = guild.channels.cache.find(c => c.name === 'alliances-list');
  if (!channel) return;

  let content = '🌐 **Current Alliances**\n\n';

  if (!alliances.length) {
    content += '_No alliances added yet._';
  } else {
    alliances.forEach(a => {
      content += `**${a.group}**\n`;
      content += `Our Reps\n${a.ourReps}\n`;
      content += `Their Reps\n${a.theirReps}\n`;
      content += `Discord Link\n${a.discord || 'N/A'}\n`;
      content += `Roblox Link\n${a.roblox || 'N/A'}\n\n`;
    });
  }

  if (allianceListMessageId) {
    try {
      const msg = await channel.messages.fetch(allianceListMessageId);
      await msg.edit(content);
      return;
    } catch {
      allianceListMessageId = null;
    }
  }

  const sent = await channel.send(content);
  allianceListMessageId = sent.id;
}

/* =======================
   INTERACTIONS
======================= */
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, member } = interaction;

  try {

    /* ===== /dm ===== */
    if (commandName === 'dm') {
      await interaction.deferReply({ ephemeral: true });

      const user = options.getUser('user');
      const message = options.getString('message');

      await user.send(message).catch(() => {});

      const logChannel = guild.channels.cache.find(c => c.name === 'dm-logs');
      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('📩 Staff DM Sent')
              .setColor('Blue')
              .addFields(
                { name: 'To', value: `<@${user.id}>` },
                { name: 'Message', value: message },
                { name: 'Staff', value: `<@${member.id}>` },
                { name: 'Date', value: new Date().toLocaleString() }
              )
          ]
        });
      }

      return interaction.editReply('✅ DM sent.');
    }

    /* ===== /status ===== */
    if (commandName === 'status') {
      await interaction.deferReply({ ephemeral: true });
      const text = options.getString('status');
      await client.user.setPresence({
        activities: [{ name: text, type: 0 }]
      });
      return interaction.editReply('✅ Status updated.');
    }

    /* ===== /rep request ===== */
    if (commandName === 'rep') {
      await interaction.deferReply({ ephemeral: true });

      const channel = guild.channels.cache.find(c => c.name === 'request-new-rep');
      if (!channel) return interaction.editReply('❌ Channel missing.');

      const msg =
`📥 **New Rep Request**

Requested By
<@${member.id}>

Number of Reps
${options.getInteger('num_reps')}

Discord Link
${options.getString('discord_link')}

Roblox Link
${options.getString('roblox_link')}

Alliance Link
${options.getString('alliance_link')}

📌 Instructions
When adding yourself to an alliance, make sure you give yourself the correct alliance roles. This is very important.

Date
${new Date().toLocaleString()}
`;

      channel.send(msg);
      return interaction.editReply('✅ Rep request sent.');
    }

    /* ===== /alliance ===== */
    if (commandName === 'alliance') {
      await interaction.deferReply({ ephemeral: true });
      const sub = options.getSubcommand();

      if (sub === 'add') {
        const data = {
          group: options.getString('group'),
          ourReps: options.getString('our_reps'),
          theirReps: options.getString('their_reps'),
          discord: options.getString('discord'),
          roblox: options.getString('roblox')
        };

        alliances.push(data);

        const log = guild.channels.cache.find(c => c.name === 'alliance-add');
        if (log) {
          log.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🤝 Alliance Added')
                .setColor('Green')
                .addFields(
                  { name: 'Group', value: data.group },
                  { name: 'Discord Link', value: data.discord },
                  { name: 'Roblox Link', value: data.roblox }
                )
            ]
          });
        }

        const publicChannel = options.getChannel('public_channel');
        if (publicChannel && publicChannel.type === ChannelType.GuildText) {
          publicChannel.send(
`:tada: **Welcome New Alliance! | Kavi Café x ${data.group}**

Our Reps
${data.ourReps}

Their Reps
${data.theirReps}

We’re excited to work together! ☕`
          );
        }

        await updateAllianceList(guild);
        return interaction.editReply('✅ Alliance added.');
      }

      if (sub === 'remove') {
        const group = options.getString('group');
        alliances = alliances.filter(a => a.group !== group);
        await updateAllianceList(guild);
        return interaction.editReply('✅ Alliance removed.');
      }

      if (sub === 'edit') {
        const group = options.getString('group');
        const a = alliances.find(x => x.group === group);
        if (!a) return interaction.editReply('❌ Not found.');

        a.group = options.getString('new_group') || a.group;
        a.ourReps = options.getString('our_reps') || a.ourReps;
        a.theirReps = options.getString('their_reps') || a.theirReps;
        a.discord = options.getString('discord') || a.discord;
        a.roblox = options.getString('roblox') || a.roblox;

        await updateAllianceList(guild);
        return interaction.editReply('✅ Alliance updated.');
      }

      if (sub === 'list') {
        await updateAllianceList(guild);
        return interaction.editReply('✅ Alliance list refreshed.');
      }
    }

  } catch (err) {
    console.error(err);
    return interaction.editReply('❌ Error running command.');
  }
});

/* =======================
   LOGIN
======================= */
client.login(process.env.TOKEN);

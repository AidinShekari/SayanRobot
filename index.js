const Discord = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS, 
    Discord.Intents.FLAGS.GUILD_MESSAGES, 
  ],
});
const TOKEN = 'Discord-Bot-Token';

let productsConfig = {};

try {
  const configData = fs.readFileSync('config.json');
  productsConfig = JSON.parse(configData);
} catch (error) {
  console.error('Error reading config.json:', error.message);
}

const updateInterval = 90000;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(updateProductEmbeds, updateInterval);
});

client.login(TOKEN);


async function updateProductEmbeds() {
  for (const product of productsConfig.products) {
    try {
      const response = await axios.get(`https://hangar.papermc.io/api/v1/projects/${product.product_name}`);
      
      const versionreleaseinfo = await axios.get(`https://hangar.papermc.io/api/v1/projects/${product.product_name}/versions?limit=1&offset=0&channel=Release`);
      const versionesnapshotinfo = await axios.get(`https://hangar.papermc.io/api/v1/projects/${product.product_name}/versions?limit=1&offset=0&channel=Snapshot`);
      
      const ReleaseVersion = versionreleaseinfo.data;
      const SnapshotVersion = versionesnapshotinfo.data;
      const projectData = response.data;

      const guildId = 'GUILD-ID';
      const guild = client.guilds.cache.get(guildId);
      const channel = guild.channels.cache.get(product.channel_id);

      try {
        const response = await axios.get(`https://hangar.papermc.io/api/v1/projects/${product.product_name}/versions?limit=2`);
        const latestVersion = response.data.result[0];
  
        const lastCheckedVersion = product.last_checked_version || '';
  
        if (latestVersion.name !== lastCheckedVersion) {
          product.last_checked_version = latestVersion.name;
          fs.writeFileSync('config.json', JSON.stringify(productsConfig, null, 2));
          const content = `<@&${product.role_id}>`;

          const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`📈 New [${latestVersion.channel.name}] Update ${latestVersion.name} | ${product.product_name}`)
            .setThumbnail(projectData.avatarUrl)
            .setURL(`https://hangar.papermc.io/${projectData.namespace.owner}/${product.product_name}/versions/${latestVersion.name}`)
            .setDescription(`${latestVersion.description}`)
            .setTimestamp()
            .setFooter(`🧑‍💻 ${projectData.namespace.owner}`);
  
          const updateChannel = client.channels.cache.get(product.update_id);
          if (updateChannel) {
            updateChannel.send({ content, embeds: [embed] });
          } else {
            console.error(`Invalid update_id channel for ${product.product_name}`);
          }
        }
      } catch (error) {
        console.error(`Error fetching data for ${product.product_name}: ${error.message}`);
      }

      function formatTimeDifference(lastUpdated) {
        const currentDate = new Date();
        const lastUpdatedDate = new Date(lastUpdated);
      
        const timeDifferenceInSeconds = Math.floor((currentDate - lastUpdatedDate) / 1000);
      
        const years = Math.floor(timeDifferenceInSeconds / (86400 * 365.25));
        const months = Math.floor(timeDifferenceInSeconds / (86400 * 30.44));
        const days = Math.floor(timeDifferenceInSeconds / 86400);
        const hours = Math.floor((timeDifferenceInSeconds % 86400) / 3600);
        const minutes = Math.floor((timeDifferenceInSeconds % 3600) / 60);
        const seconds = timeDifferenceInSeconds % 60;
      
        if (years > 0) {
          return `${years} year${years !== 1 ? 's' : ''} ago`;
        } else if (months > 0) {
          return `${months} month${months !== 1 ? 's' : ''} ago`;
        } else if (days > 0) {
          return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
          return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
          return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else {
          return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
        }
      }
      const lastUpdated = projectData.lastUpdated; 
      const formattedTimeAgo = formatTimeDifference(lastUpdated);
      const messageToUpdateId = product.message_id || null;
      const githubLink = projectData.settings.links.find(link => link.title === "top").links.find(link => link.name === "Homepage");
      const wikiLink = projectData.settings.links.find(link => link.title === "top").links.find(link => link.name === "Wiki");

      let informationValue = `📑 [Hangar](https://hangar.papermc.io/${projectData.namespace.owner}/${product.product_name})\n`;
      
      if (githubLink.url !== "null" || githubLink.url !== null) {
        informationValue += `<:github:1149392951391289445> [GitHub](${githubLink.url})`;
      }
      
      if (wikiLink.url !== "null" || wikiLink.url !== null) {
        if (informationValue !== "") {
          informationValue += " \n";
        }
        informationValue += `📖 [Wiki](${wikiLink.url})`;
      }
      
      if ((githubLink.url === "null" || githubLink.url === null) && (wikiLink.url === "null" || wikiLink.url === null)) {
        informationValue = `📑 [Hangar](https://hangar.papermc.io/${projectData.namespace.owner}/${product.product_name})\n`;
      }
      
      let row;
      
      if (product.product_name == 'VelocityVanish') {
  
        const PaperRUrl = ReleaseVersion.result[0].downloads.PAPER.downloadUrl;
        const PaperSUrl = SnapshotVersion.result[0].downloads.PAPER.downloadUrl;
        const latestPaperbutton = new Discord.MessageButton()
          .setLabel('Download Release (Paper)')
          .setURL(PaperRUrl)
          .setStyle('LINK');
      
        const snapshotPaperButton = new Discord.MessageButton()
          .setLabel('Download Snapshot (Paper)')
          .setURL(PaperSUrl)
          .setStyle('LINK');
      
        row = new Discord.MessageActionRow().addComponents(latestPaperbutton, snapshotPaperButton);
      } else {
        const hangarurl = new Discord.MessageButton()
          .setLabel('Download From (Hangar)')
          .setURL(`https://hangar.papermc.io/${projectData.namespace.owner}/${projectData.product_name}`)
          .setStyle('LINK');
      
        row = new Discord.MessageActionRow().addComponents(hangarurl);
      }

      const embed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`${product.product_name} - ${ReleaseVersion.result[0].name}`)
        .setDescription(`📒 ${projectData.description}\n♻️ Last Update : **${formattedTimeAgo}**`)
        .setURL(`https://hangar.papermc.io/${projectData.namespace.owner}/${product.product_name}`)
        .setThumbnail(projectData.avatarUrl)
        .addFields(
          { name: '\u200b\n🌐 Information', value: informationValue, inline: true },
          { name: '\u200b\n📈 Hangar Statistics', value: `📂 Downloads : ${projectData.stats.downloads.toString()}\n👀 Views: ${projectData.stats.views}\n⭐ Stars: ${projectData.stats.stars}`, inline: true }
          )
        .setTimestamp()
        .setFooter(`🧑‍💻 ${projectData.namespace.owner}`);

      if (!messageToUpdateId) {
        const sentMessage = await channel.send({ embeds: [embed], components: [row] });

        product.message_id = sentMessage.id;
        fs.writeFileSync('config.json', JSON.stringify(productsConfig, null, 2));
      } else {
        const existingMessage = await channel.messages.fetch(messageToUpdateId);
        existingMessage.edit({ embeds: [embed], components: [row] });
      }
    } catch (error) {
      console.error(`Error fetching data for ${product.product_name}: ${error.message}`);
    }
  }
}

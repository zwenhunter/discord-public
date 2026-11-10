'use strict';
const { RESTJSONErrorCodes } = require('discord.js');

// emoji yukleme icin light patch, discord.js'in dogrudan emoji upload yolu:
async function loadEmojiFromFileBuffer(guild, buffer, name, ext) {
  const attachment = `data:image/${ext};base64,${buffer.toString('base64')}`;
  const endpoint = guild.client.api.guilds(guild.id).emojis;
  try {
    const emoji = await endpoint.post({
      data: { name: name.slice(0, 32), image: attachment }
    });
    return emoji;
  } catch (err) {
    if (err.code === 30008) { // Maximum number of emojis reached for this guild
      throw new Error('Sunucudaki emoji limiti dolu! Tekrar yukleme icin yer yok.');
    }
    if (err.code === RESTJSONErrorCodes.MissingPermissions) {
      throw new Error('Sunucuda Manage Guild/Expressions yetkim yok, emoji yukleyemiyorum.');
    }
    throw err;
  }
}

module.exports = { loadEmojiFromFileBuffer };

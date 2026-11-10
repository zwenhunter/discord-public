'use strict';

/**
 * Prefix Command Handler.
 * - Komut dosyalarini scandir ile yukler
 * - Alias map olusturur
 * - cooldown/redundant tanimlar
 * - mesaj event'ini parse edip dogru botun komutunu calistirir
 */
const fs = require('fs');
const path = require('path');
const { CooldownManager } = require('./cooldown');
const { checkPermission } = require('../permissions');
const { ValidationError } = require('../utils/helpers');

function walkDir(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, file.name);
    if (file.isDirectory()) out.push(...walkDir(p));
    else if (file.name.endsWith('.js')) out.push(p);
  }
  return out;
}

class CommandHandler {
  constructor(bot) {
    this.bot = bot;
    this.client = bot.client;
    this.logger = bot.logger;
    this.cooldown = new CooldownManager();
    this.commands = new Map(); // name -> mod
    this.aliases = new Map(); // alias -> name
  }

  load() {
    const dirs = [path.join(this.bot.dir, 'commands')];
    // ortak shared komutlar (hucreyir numarasi)
    if (this.bot.config.sharedCommands) {
      dirs.push(path.resolve(process.cwd(), 'shared', 'commands'));
    }
    for (const dir of dirs) {
      for (const file of walkDir(dir)) {
        try {
          // cache temizle hot-reload icin
          delete require.cache[require.resolve(file)];
          const mod = require(file);
          if (!mod || !mod.name) {
            this.logger.error(`Komut dosyasi gecersiz: ${file}`);
            continue;
          }
          if (this.commands.has(mod.name)) {
            this.logger.warn(`Komut adi cakismasi: ${mod.name} (${file})`);
            continue;
          }
          mod.category = path.basename(path.dirname(file));
          mod.usage = mod.usage || `.${mod.name}`;
          if (!Array.isArray(mod.aliases)) mod.aliases = [];
          this.commands.set(mod.name, mod);
          for (const a of mod.aliases) {
            if (this.aliases.has(a)) this.logger.warn(`Alias cakismasi: ${a}`);
            this.aliases.set(a, mod.name);
          }
        } catch (err) {
          this.logger.error(`Komut yuklenemedi: ${file} - ${err.message}`);
        }
      }
    }
    this.logger.info(`${this.commands.size} komut, ${this.aliases.size} alias yuklendi`);
    return { count: this.commands.size, aliases: this.aliases.size };
  }

  reload(name) {
    if (name && !this.commands.has(name)) return false;
    this.commands.clear();
    this.aliases.clear();
    this.load();
    return true;
  }

  handle(message) {
    // 1) guard: only our own bots' prefix
    if (message.author.bot) return;
    if (message.webhookId) return;

    const globalCfg = this.client.ecosystem?.global || {};
    const defaultPrefix = globalCfg.prefix || '.';
    const prefix = this.bot.config.prefix || defaultPrefix;

    if (!message.content.startsWith(prefix)) return;

    const content = message.content.slice(prefix.length).trim();
    if (!content) return;

    const parts = content.split(/\s+/);
    const cmdName = parts.shift().toLowerCase();
    const args = parts;

    const name = this.commands.has(cmdName) ? cmdName : this.aliases.get(cmdName);
    if (!name) return;
    const command = this.commands.get(name);
    if (!command) return;

    // bot-unlu yazilim ortak komutlar guard etc: eger bu bot'ta yok ise komsu bot'un komutunu calistirmasini hafifstone yapyoruz (pas: sadece kendi komutunu calistir)
    (async () => {
      try {
        const member = message.guild ? message.guild.members.cache.get(message.author.id) || await this.client.ecosystem.safeMember(message.guild, message.author.id) : null;

        // DM icin guild gerektiren komutlar engelle
        if (!message.guild && (command.guildOnly !== false)) {
          return;
        }

        const ctx = {
          client: this.client,
          bot: this.bot,
          message,
          member,
          guild: message.guild,
          args,
          argString: args.join(' '),
          authorId: message.author.id,
          command
        };

        const perm = await checkPermission({ client: this.client, guild: message.guild, member, ownerIds: this.bot.config.ownerIds, command });
        if (!perm.ok) {
          await message.reply({ content: `${this.bot.emoji('guard')} Bu komutu kullanmak icin yetkiniz yok. (**${JSON.stringify(command.permission ?? 'staff')}** gerekli)`, allowedMentions: { repliedUser: false } });
          return;
        }

        const cdSec = (command.cooldown ?? this.bot.config?.limits?.commandCooldownDefault ?? 3);
        const cd = this.cooldown.check(command.name, message.author.id, cdSec, { count: 15, per: 60 });
        if (!cd.ok) {
          const type = cd.reason === 'rate-limit' ? 'Cok fazla komut deniyorsun' : `Komut cooldown suresi`;
          await message.reply({ content: `${this.bot.emoji('error')} ${type}, ${cd.remaining} sn sonra tekrar dene.`, allowedMentions: { repliedUser: false } });
          return;
        }

        // bind the original command modifier
        await command.run(ctx);
      } catch (err) {
        if (err instanceof ValidationError) {
          await message.reply({ content: `${this.bot.emoji('error')} ${err.message}${err.usage ? `\nKullanim: \`${err.usage}\`` : ''}`, allowedMentions: { repliedUser: false } });
        } else {
          this.logger.error(`Komut hatasi [${command.name}]: ${err.stack || err.message}`);
          await message.reply({ content: `${this.bot.emoji('error')} Komut islenirken hata olustu. Loglara bakıldi.` }).catch(() => {});
        }
      }
    })();
  }
}

module.exports = { CommandHandler };

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

// ===== OWNER =====
const OWNER_ID = "1321669868503957655";
const isOwner = (id) => id === OWNER_ID;

// ===== DATABASE =====
let db;
try {
  db = JSON.parse(fs.readFileSync("./database.json", "utf-8"));
} catch {
  db = {
    channels: [],
    vip: [],
    favorites: {},
    access: [],
    autopost: true,
    ps: {
      bf: "https://www.roblox.com/games/2753915549?privateServerLinkCode=11538954597931190236578830175408",
      fisch: "https://www.roblox.com/games/16732694052?privateServerLinkCode=19364623954829962758354802577209"
    }
  };
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2));
}

const saveDB = () =>
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2));

// ===== FETCH =====
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// ===== READY =====
client.on("ready", () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);

  // AUTO POST
  setInterval(async () => {
    if (!db.autopost) return;
    if (!db.channels.length) return;

    try {
      const res = await fetch("https://scriptblox.com/api/script/fetch");
      const data = await res.json();
      const s = data.result.scripts[0];

      for (const id of db.channels) {
        const ch = client.channels.cache.get(id);
        if (!ch) continue;

        ch.send(`📢 **AUTO SCRIPT**\n📌 ${s.title}\n🔗 https://scriptblox.com/script/${s.slug}`);
      }
    } catch {}
  }, 300000);
});

// ===== MESSAGE =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // CHANNEL LOCK
  if (db.channels.length > 0 && !db.channels.includes(message.channel.id)) return;

  // ACCESS SYSTEM
  if (db.access.length > 0 && !db.access.includes(message.author.id)) return;

  // PREFIX SUPPORT
  const prefixes = ["!", "?", "/"];
  const usedPrefix = prefixes.find(p => message.content.startsWith(p));
  if (!usedPrefix) return;

  const args = message.content.slice(usedPrefix.length).trim().split(" ");
  const cmd = args.shift().toLowerCase();

  // ================= HELP =================
  if (cmd === "help") {
    return message.reply(
      `📖 **SCRIPT HUB MENU**\n\n` +
      `🔎 search\n📦 home\n🔥 trending\n🆕 latest\n🎲 random\n\n` +
      `⭐ favorite\n💎 vip\n\n` +
      `🎮 ps\n📢 share\n\n` +
      `🔒 setchannel / removechannel\n🔐 addaccess\n\n` +
      `⚙️ ping update\n\n` +
      `👑 Owner:\nsetps\n autopost`
    );
  }

  // ================= PING =================
  if (cmd === "ping") return message.reply("🏓 Pong!");

  // ================= UPDATE =================
  if (cmd === "update") {
    return message.reply(
      `📢 **UPDATE v7**\n\n` +
      `👑 Owner system\n` +
      `🔤 Multi prefix (! ? /)\n` +
      `📢 Auto post toggle\n` +
      `🔒 2 channel system\n` +
      `🔎 Dropdown search\n` +
      `⭐ Favorite save\n`
    );
  }

  // ================= SET CHANNEL =================
  if (cmd === "setchannel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    if (db.channels.length >= 2)
      return message.reply("❌ Max 2 channel");

    if (!db.channels.includes(message.channel.id)) {
      db.channels.push(message.channel.id);
      saveDB();
    }

    return message.reply("✅ Channel ditambahkan");
  }

  if (cmd === "removechannel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    db.channels = db.channels.filter(id => id !== message.channel.id);
    saveDB();

    message.reply("🗑 Channel dihapus");
  }

  // ================= ACCESS =================
  if (cmd === "addaccess") {
    if (!isOwner(message.author.id)) return;

    if (message.mentions.everyone) {
      db.access = [];
      saveDB();
      return message.reply("🌍 Semua akses dibuka");
    }

    const user = message.mentions.users.first();
    if (!user) return;

    db.access.push(user.id);
    saveDB();

    message.reply("✅ Akses ditambah");
  }

  // ================= VIP =================
  if (cmd === "vip") {
    if (!db.vip.includes(message.author.id))
      return message.reply("❌ VIP only");

    message.reply("💎 Kamu VIP!");
  }

  // ================= PS =================
  if (cmd === "ps") {
    return message.reply(
      `🎮 PS\n\nBlox Fruits:\n${db.ps.bf}\n\nFisch:\n${db.ps.fisch}`
    );
  }

  if (cmd === "setps") {
    if (!isOwner(message.author.id)) return;

    const type = args[0];
    const link = args[1];

    db.ps[type] = link;
    saveDB();

    message.reply("✅ PS updated");
  }

  // ================= AUTPOST =================
  if (cmd === "autopost") {
    if (!isOwner(message.author.id)) return;

    const mode = args[0];
    db.autopost = mode === "on";
    saveDB();

    message.reply(`📢 AutoPost: ${db.autopost}`);
  }

  // ================= SEARCH =================
  if (cmd === "search") {
    const q = args.join(" ");
    if (!q) return;

    const res = await fetch(`https://scriptblox.com/api/script/search?q=${q}`);
    const data = await res.json();

    let page = 0;
    const scripts = data.result.scripts;

    const getPage = () => scripts.slice(page * 5, page * 5 + 5);

    const menu = () =>
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("menu")
          .setPlaceholder(`Page ${page + 1}`)
          .addOptions(
            getPage().map((s, i) => ({
              label: s.title.substring(0, 100),
              value: String(i)
            }))
          )
      );

    const nav = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary)
    );

    const msg = await message.reply({
      content: "🔎 Pilih script",
      components: [menu(), nav]
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) return;

      if (i.customId === "next") page++;
      if (i.customId === "prev") page--;

      if (page < 0) page = 0;

      if (i.customId === "menu") {
        const s = getPage()[parseInt(i.values[0])];

        if (!db.favorites[i.user.id]) db.favorites[i.user.id] = [];
        db.favorites[i.user.id].push(s);
        saveDB();

        return i.reply(`📜 ${s.title}\nhttps://scriptblox.com/script/${s.slug}`);
      }

      await i.update({ components: [menu(), nav] });
    });
  }

  // ================= FAVORITE =================
  if (cmd === "favorite") {
    const fav = db.favorites[message.author.id];
    if (!fav) return message.reply("❌ Kosong");

    let text = "⭐ FAVORITE\n\n";
    fav.forEach(s => {
      text += `${s.title}\nhttps://scriptblox.com/script/${s.slug}\n\n`;
    });

    message.reply(text);
  }

});

// ===== LOGIN =====
client.login(process.env.TOKEN);

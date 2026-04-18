const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

// ===== DATABASE SAFE LOAD =====
let db;
try {
  db = JSON.parse(fs.readFileSync("./database.json", "utf-8"));
} catch {
  db = { channels: [], vip: [], favorites: {} };
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

const PREFIX = "!";

// ===== READY =====
client.on("ready", () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);

  // ===== AUTO POST =====
  setInterval(async () => {
    if (!db.channels.length) return;

    try {
      const res = await fetch("https://scriptblox.com/api/script/fetch");
      const data = await res.json();
      const s = data.result.scripts[0];

      for (const id of db.channels) {
        const ch = client.channels.cache.get(id);
        if (!ch) continue;

        ch.send(
          `📢 **AUTO SCRIPT**\n📌 ${s.title}\n🔗 https://scriptblox.com/script/${s.slug}`
        );
      }
    } catch {}
  }, 300000);
});

// ===== MESSAGE =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ===== CHANNEL LOCK =====
  if (db.channels.length > 0 && !db.channels.includes(message.channel.id)) return;

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).split(" ");
  const cmd = args.shift().toLowerCase();

  // ================= 📖 HELP =================
  if (cmd === "help") {
    return message.reply(
      `📖 **SCRIPT HUB MENU**\n\n` +
      `🔎 !search <name>\n` +
      `📦 !home\n🔥 !trending\n🆕 !latest\n🎲 !random\n\n` +
      `⭐ !favorite\n💎 !vip\n\n` +
      `🎮 !ps\n📢 !share\n\n` +
      `🔒 !setchannel !removechannel\n\n` +
      `⚙️ !ping !update`
    );
  }

  // ================= 🏓 =================
  if (cmd === "ping") return message.reply("🏓 Pong!");

  // ================= 📢 UPDATE =================
  if (cmd === "update") {
    return message.reply(
      `📢 **UPDATE v6**\n\n` +
      `🔄 Dropdown + next page\n` +
      `💾 Database\n` +
      `📢 Auto post\n` +
      `💰 VIP\n` +
      `🔒 2 Channel support\n` +
      `⭐ Favorite`
    );
  }

  // ================= 🎮 PS =================
  if (cmd === "ps") {
    return message.reply(
      `🎮 **PRIVATE SERVER**\n\n` +
      `🥇 Blox Fruits:\nhttps://www.roblox.com/games/2753915549?privateServerLinkCode=11538954597931190236578830175408\n\n` +
      `🎣 Fisch:\nhttps://www.roblox.com/games/16732694052?privateServerLinkCode=19364623954829962758354802577209`
    );
  }

  // ================= 🔒 SET CHANNEL =================
  if (cmd === "setchannel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    if (db.channels.includes(message.channel.id))
      return message.reply("⚠️ Sudah diset");

    if (db.channels.length >= 2)
      return message.reply("❌ Max 2 channel");

    db.channels.push(message.channel.id);
    saveDB();

    return message.reply("✅ Channel ditambahkan");
  }

  // ================= ❌ REMOVE CHANNEL =================
  if (cmd === "removechannel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    db.channels = db.channels.filter(id => id !== message.channel.id);
    saveDB();

    message.reply("🗑 Channel dihapus");
  }

  // ================= 💰 VIP =================
  if (cmd === "addvip") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const user = message.mentions.users.first();
    db.vip.push(user.id);
    saveDB();

    message.reply("💰 VIP ditambahkan");
  }

  if (cmd === "vip") {
    if (!db.vip.includes(message.author.id))
      return message.reply("❌ VIP only");

    message.reply("💎 Kamu VIP!");
  }

  // ================= 🔎 SEARCH =================
  if (cmd === "search") {
    const q = args.join(" ");
    if (!q) return message.reply("❌ !search <name>");

    const res = await fetch(
      `https://scriptblox.com/api/script/search?q=${encodeURIComponent(q)}`
    );
    const data = await res.json();

    const scripts = data.result.scripts;
    if (!scripts) return;

    let page = 0;

    const getPage = () => scripts.slice(page * 5, page * 5 + 5);

    const menu = () =>
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("menu")
          .setPlaceholder(`📄 Page ${page + 1}`)
          .addOptions(
            getPage().map((s, i) => ({
              label: s.title.substring(0, 100),
              value: String(i),
            }))
          )
      );

    const nav = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary)
    );

    const msg = await message.reply({
      content: "🔎 Pilih script 👇",
      components: [menu(), nav],
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({ content: "❌ Bukan kamu", ephemeral: true });

      if (i.customId === "next") page++;
      if (i.customId === "prev") page--;

      if (page < 0) page = 0;

      if (i.customId === "menu") {
        const s = getPage()[parseInt(i.values[0])];

        if (!db.favorites[i.user.id]) db.favorites[i.user.id] = [];
        db.favorites[i.user.id].push(s);
        saveDB();

        return i.reply(
          `📜 ${s.title}\n🔗 https://scriptblox.com/script/${s.slug}`
        );
      }

      await i.update({ components: [menu(), nav] });
    });
  }

  // ================= ⭐ FAVORITE =================
  if (cmd === "favorite") {
    const fav = db.favorites[message.author.id];
    if (!fav) return message.reply("❌ Kosong");

    let text = "⭐ FAVORITE\n\n";
    fav.forEach((s) => {
      text += `${s.title}\nhttps://scriptblox.com/script/${s.slug}\n\n`;
    });

    message.reply(text);
  }

  // ================= 📢 SHARE =================
  if (cmd === "share") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    const ch = message.mentions.channels.first();
    if (!ch) return message.reply("❌ Tag channel");

    const text = args.slice(1).join(" ");
    ch.send(`📢 ${text}`);

    message.reply("✅ Terkirim");
  }

});

// ===== LOGIN =====
client.login(process.env.TOKEN);

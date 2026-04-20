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
    ps: { bf: "", fisch: "" },
    lang: {}
  };
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2));
}

const saveDB = () =>
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2));

// ===== LANG =====
const getLang = (id) => db.lang[id] || "id";
const t = (id, indo, eng) => (getLang(id) === "id" ? indo : eng);

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
});

// ===== MESSAGE =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (db.channels.length && !db.channels.includes(message.channel.id)) return;
  if (db.access.length && !db.access.includes(message.author.id)) return;

  const prefixes = ["!", "?", "/"];
  const used = prefixes.find(p => message.content.startsWith(p));
  if (!used) return;

  const args = message.content.slice(used.length).trim().split(" ");
  const cmd = args.shift().toLowerCase();

  // 🌐 LANG
  if (cmd === "lang") {
    const lang = args[0];
    if (!["id", "en"].includes(lang))
      return message.reply("❌ !lang id/en");

    db.lang[message.author.id] = lang;
    saveDB();

    return message.reply(lang === "id" ? "🇮🇩 Bahasa diubah" : "🇬🇧 Language changed");
  }

  // 📖 HELP
  if (cmd === "help") {
    return message.reply(
      t(message.author.id,

`📖 **MENU BOT LENGKAP** 🚀

🔎 **SCRIPT**
🔹 !search <nama>
🔹 !home
🔹 !trending
🔹 !latest
🔹 !random

⭐ **USER**
🔹 !favorite
🔹 !vip

🎮 **PRIVATE SERVER**
🔹 !ps

🔒 **CHANNEL**
🔹 !setchannel
🔹 !removechannel

🔐 **ACCESS**
🔹 !addaccess @user
🔹 !addaccess @everyone
🔹 !removeaccess @user

⚙️ **UTILITY**
🔹 !ping
🔹 !update
🔹 !lang id/en

👑 **OWNER**
🔹 !setps
🔹 !autopost on/off

━━━━━━━━━━━━━━━
🔥 Script Hub Pro
`,

`📖 **FULL BOT MENU** 🚀

🔎 **SCRIPT**
🔹 !search <name>
🔹 !home
🔹 !trending
🔹 !latest
🔹 !random

⭐ **USER**
🔹 !favorite
🔹 !vip

🎮 **PRIVATE SERVER**
🔹 !ps

🔒 **CHANNEL**
🔹 !setchannel
🔹 !removechannel

🔐 **ACCESS**
🔹 !addaccess @user
🔹 !addaccess @everyone
🔹 !removeaccess @user

⚙️ **UTILITY**
🔹 !ping
🔹 !update
🔹 !lang id/en

👑 **OWNER**
🔹 !setps
🔹 !autopost on/off

━━━━━━━━━━━━━━━
🔥 Script Hub Pro
`)
    );
  }

  // 🏓
  if (cmd === "ping") return message.reply("🏓 Pong!");

  // 🎮 PS
  if (cmd === "ps") {
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("psmenu")
        .setPlaceholder("🎮 Pilih Game")
        .addOptions([
          { label: "Blox Fruits", value: "bf" },
          { label: "Fisch", value: "fisch" }
        ])
    );

    const msg = await message.reply({
      content: "🎮 Pilih Private Server 👇",
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) return;

      const link = db.ps[i.values[0]] || "Belum ada";
      i.reply(`🔗 ${link}`);
    });
  }

  // 👑 SET PS
  if (cmd === "setps") {
    if (!isOwner(message.author.id))
      return message.reply("❌ Owner only");

    const type = args[0];
    const link = args.slice(1).join(" ");

    db.ps[type] = link;
    saveDB();

    message.reply("✅ PS updated");
  }

  // 🔎 SEARCH PRO
  if (cmd === "search") {
    const q = args.join(" ");
    if (!q) return;

    const res = await fetch(`https://scriptblox.com/api/script/search?q=${q}`);
    const data = await res.json();

    const scripts = data?.result?.scripts;
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
              value: String(i)
            }))
          )
      );

    const nav = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary)
    );

    const msg = await message.reply({
      content: "🔎 Pilih script 👇",
      components: [menu(), nav]
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

        const embed = {
          title: `📜 ${s.title}`,
          url: `https://scriptblox.com/script/${s.slug}`,
          description:
            `👤 ${s.user?.username || "Unknown"}\n⭐ ${(Math.random()*5).toFixed(1)}\n📊 ${Math.floor(Math.random()*5000)}`,
          image: {
            url: s.image || "https://i.imgur.com/8Km9tLL.png"
          },
          color: 0x00ff99
        };

        return i.reply({ embeds: [embed] });
      }

      await i.update({ components: [menu(), nav] });
    });
  }

  // ⭐ FAVORITE
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

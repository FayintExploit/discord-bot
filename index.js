const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

const OWNER_ID = "1321669868503957755";
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

  // ===== HELP =====
  if (cmd === "help") {
    return message.reply(
`📖 **SCRIPT HUB BOT - FULL COMMAND LIST** 🚀

━━━━━━━━━━━━━━━━━━
🔎 **SCRIPT COMMANDS**
🔹 !search <name>
🔹 !latest
🔹 !home
🔹 !trending
🔹 !random

━━━━━━━━━━━━━━━━━━
🎮 **PRIVATE SERVER**
🔹 !ps
🔹 !setps bf <link>
🔹 !setps fisch <link>

━━━━━━━━━━━━━━━━━━
⚙️ **UTILITY**
🔹 !ping
🔹 !update

━━━━━━━━━━━━━━━━━━
🌐 **LANGUAGE**
🔹 !lang id
🔹 !lang en

━━━━━━━━━━━━━━━━━━
⭐ **USER SYSTEM**
🔹 !favorite

━━━━━━━━━━━━━━━━━━
👑 OWNER ONLY
🔹 !autopost on/off

━━━━━━━━━━━━━━━━━━
🔥 Script Hub Pro Bot`
    );
  }

  // ===== PING =====
  if (cmd === "ping") return message.reply("🏓 Pong!");

  // ===== UPDATE =====
  if (cmd === "update") {
    return message.reply("🚀 Bot stable version");
  }

  // ===== LATEST =====
  if (cmd === "latest") {
    const res = await fetch("https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc");
    const data = await res.json();

    let text = "🆕 LATEST\n\n";

    data.scripts.slice(0, 5).forEach((s, i) => {
      text += `${i + 1}. ${s.title}\nhttps://rscripts.net/script/${s.slug || s.id}\n\n`;
    });

    return message.reply(text);
  }

  // ===== RANDOM =====
  if (cmd === "random") {
    const res = await fetch("https://rscripts.net/api/v2/scripts?page=1");
    const data = await res.json();

    const s = data.scripts[Math.floor(Math.random() * data.scripts.length)];

    return message.reply(`${s.title}\nhttps://rscripts.net/script/${s.slug || s.id}`);
  }

  // ===== PS =====
  if (cmd === "ps") {
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("psmenu")
        .addOptions([
          { label: "Blox Fruits", value: "bf" },
          { label: "Fisch", value: "fisch" }
        ])
    );

    const msg = await message.reply({
      content: "🎮 Choose Server",
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) return;
      i.reply(db.ps[i.values[0]] || "Not set");
    });
  }

  // ===== SETPS =====
  if (cmd === "setps") {
    if (!isOwner(message.author.id))
      return message.reply("❌ Owner only");

    db.ps[args[0]] = args[1];
    saveDB();

    return message.reply("✅ Updated");
  }

  // ===== SEARCH =====
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
      content: "🔎 Select script",
      components: [menu(), nav]
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({ content: "❌ Not yours", ephemeral: true });

      if (i.customId === "next") page++;
      if (i.customId === "prev") page--;
      if (page < 0) page = 0;

      if (i.customId === "menu") {
        const s = getPage()[parseInt(i.values[0])];
        const link = `https://scriptblox.com/script/${s.slug || s.id}`;

        const embed = {
          title: `📜 ${s.title}`,
          description:
            `👤 ${s.user?.username || "Unknown"}\n\n` +
            "```lua\n" +
            `loadstring(game:HttpGet("${link}"))()\n` +
            "```",
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

  // ===== FAVORITE =====
  if (cmd === "favorite") {
    const fav = db.favorites[message.author.id];
    if (!fav) return message.reply("❌ Empty");

    let text = "⭐ FAVORITE\n\n";
    fav.forEach(s => {
      text += `${s.title}\nhttps://scriptblox.com/script/${s.slug}\n\n`;
    });

    message.reply(text);
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);

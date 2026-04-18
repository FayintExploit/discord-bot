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

// ===== LOAD DB =====
let db = JSON.parse(fs.readFileSync("./database.json", "utf-8"));
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
  console.log(`✅ ${client.user.tag}`);

  // ===== AUTO POST LOOP =====
  setInterval(async () => {
    if (!db.channel) return;

    const ch = client.channels.cache.get(db.channel);
    if (!ch) return;

    try {
      const res = await fetch("https://scriptblox.com/api/script/fetch");
      const data = await res.json();
      const s = data.result.scripts[0];

      ch.send(
        `📢 **AUTO SCRIPT**\n📌 ${s.title}\n🔗 https://scriptblox.com/script/${s.slug}`
      );
    } catch {}
  }, 300000); // 5 menit
});

// ===== MESSAGE =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ===== CHANNEL LOCK =====
  if (db.channel && message.channel.id !== db.channel) return;

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).split(" ");
  const cmd = args.shift().toLowerCase();

  // ================= SET CHANNEL =================
  if (cmd === "setchannel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    db.channel = message.channel.id;
    saveDB();

    return message.reply("✅ Channel diset (bot hanya aktif di sini)");
  }

  // ================= VIP =================
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

    message.reply("💎 Kamu VIP");
  }

  // ================= SEARCH PAGINATION =================
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

    const makeMenu = () => {
      const list = getPage();

      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("menu")
          .setPlaceholder(`Page ${page + 1}`)
          .addOptions(
            list.map((s, i) => ({
              label: s.title.substring(0, 100),
              value: String(i),
            }))
          )
      );
    };

    const nav = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary)
    );

    const msg = await message.reply({
      content: "🔎 Pilih script",
      components: [makeMenu(), nav],
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

        // SAVE FAVORITE
        if (!db.favorites[i.user.id]) db.favorites[i.user.id] = [];
        db.favorites[i.user.id].push(s);
        saveDB();

        return i.reply(
          `📜 ${s.title}\n🔗 https://scriptblox.com/script/${s.slug}`
        );
      }

      await i.update({
        components: [makeMenu(), nav],
      });
    });
  }

  // ================= FAVORITE =================
  if (cmd === "favorite") {
    const fav = db.favorites[message.author.id];
    if (!fav) return message.reply("❌ Kosong");

    let text = "⭐ FAVORITE\n\n";

    fav.forEach((s) => {
      text += `${s.title}\nhttps://scriptblox.com/script/${s.slug}\n\n`;
    });

    message.reply(text);
  }

  // ================= BASIC =================
  if (cmd === "ping") return message.reply("🏓 Pong");
});

// ===== LOGIN =====
client.login(process.env.TOKEN);

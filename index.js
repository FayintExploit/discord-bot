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

// ===== FETCH FIX =====
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";
const startTime = Date.now();

// ===== STORAGE =====
const favorites = new Map();

// ===== READY =====
client.on("ready", () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);
});

// ===== MESSAGE =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  // ================= 📖 HELP =================
  if (command === "help") {
    return message.reply(
      `📖 **MENU**\n\n` +
      `🔎 !search <name>\n` +
      `📦 !home\n🔥 !trending\n🆕 !latest\n🎲 !random\n\n` +
      `⭐ !favorite\n\n` +
      `📦 !panel\n🔑 !getkey\n🎟️ !redeem\n\n` +
      `🎮 !ps\n📢 !share\n\n` +
      `⚙️ !ping !runtime`
    );
  }

  // ================= 🔎 SEARCH DROPDOWN =================
  if (command === "search") {
    const q = args.join(" ");
    if (!q) return message.reply("❌ !search <name>");

    const res = await fetch(
      `https://scriptblox.com/api/script/search?q=${encodeURIComponent(q)}`
    );
    const data = await res.json();

    const scripts = data?.result?.scripts?.slice(0, 10);
    if (!scripts || scripts.length === 0)
      return message.reply("❌ Tidak ditemukan");

    const options = scripts.map((s, i) => ({
      label: s.title.substring(0, 100),
      description: `Script ${i + 1}`,
      value: String(i),
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select_script")
      .setPlaceholder("🔽 Pilih script...")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    const msg = await message.reply({
      content: "🔎 Pilih script dari dropdown 👇",
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({ content: "❌ Bukan kamu", ephemeral: true });

      if (i.isStringSelectMenu()) {
        const s = scripts[parseInt(i.values[0])];

        const embed = new EmbedBuilder()
          .setTitle(`📜 ${s.title}`)
          .setDescription(`🔗 https://scriptblox.com/script/${s.slug}`)
          .setColor(0x00ffcc);

        const rowBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("fav")
            .setLabel("⭐ Favorite")
            .setStyle(ButtonStyle.Success)
        );

        await i.update({
          embeds: [embed],
          components: [rowBtn],
          content: "",
        });
      }

      if (i.customId === "fav") {
        const userFav = favorites.get(i.user.id) || [];
        userFav.push(i.message.embeds[0].title);
        favorites.set(i.user.id, userFav);

        i.reply({ content: "⭐ Disimpan", ephemeral: true });
      }
    });
  }

  // ================= 📦 HOME =================
  if (command === "home") {
    const res = await fetch("https://scriptblox.com/api/script/fetch");
    const data = await res.json();

    let text = "📦 **LATEST SCRIPT**\n\n";

    data.result.scripts.slice(0, 5).forEach((s) => {
      text += `📌 ${s.title}\n🔗 https://scriptblox.com/script/${s.slug}\n\n`;
    });

    message.reply(text);
  }

  // ================= 🔥 TRENDING =================
  if (command === "trending") {
    const res = await fetch("https://rscripts.net/api/v2/trending");
    const data = await res.json();

    let text = "🔥 **TRENDING**\n\n";

    data.data.slice(0, 5).forEach((s) => {
      text += `📌 ${s.title}\nID: ${s.id}\n\n`;
    });

    message.reply(text);
  }

  // ================= 🆕 LATEST =================
  if (command === "latest") {
    const res = await fetch(
      "https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc"
    );
    const data = await res.json();

    let text = "🆕 **LATEST**\n\n";

    data.scripts.slice(0, 5).forEach((s) => {
      text += `📌 ${s.title}\nID: ${s.id}\n\n`;
    });

    message.reply(text);
  }

  // ================= 🎲 RANDOM =================
  if (command === "random") {
    const res = await fetch("https://scriptblox.com/api/script/fetch");
    const data = await res.json();
    const s = data.result.scripts[0];

    message.reply(
      `🎲 RANDOM\n📌 ${s.title}\n🔗 https://scriptblox.com/script/${s.slug}`
    );
  }

  // ================= ⭐ FAVORITE =================
  if (command === "favorite") {
    const fav = favorites.get(message.author.id);
    if (!fav) return message.reply("❌ Kosong");

    let text = "⭐ FAVORITE\n\n";
    fav.forEach((f) => (text += `${f}\n\n`));

    message.reply(text);
  }

  // ================= 📢 SHARE =================
  if (command === "share") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    const ch = message.mentions.channels.first();
    if (!ch) return message.reply("❌ Tag channel");

    const text = args.slice(1).join(" ");
    ch.send(`📢 ${text}`);

    message.reply("✅ Terkirim");
  }

  // ================= 🎮 PS =================
  if (command === "ps") {
    return message.reply(
      `🎮 PS\n\n🥇 Blox Fruits:\nhttps://www.roblox.com/games/2753915549?privateServerLinkCode=11538954597931190236578830175408\n\n🎣 Fisch:\nhttps://www.roblox.com/games/16732694052?privateServerLinkCode=19364623954829962758354802577209`
    );
  }

  // ================= ⚙️ =================
  if (command === "ping") return message.reply("🏓 Pong");

  if (command === "runtime") {
    return message.reply(
      `⏱ ${Math.floor((Date.now() - startTime) / 1000)}s`
    );
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);

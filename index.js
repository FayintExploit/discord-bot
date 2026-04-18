const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

// ===== FETCH FIX (Railway aman) =====
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const PREFIX = "!";
const startTime = Date.now();

// ===== STORAGE =====
const keys = new Map();
const favorites = new Map();
const history = new Map();

// ===== READY =====
client.on("ready", () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);
});

// ===== MESSAGE =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).split(" ");
  const command = args.shift().toLowerCase();

  // ===== HELP =====
  if (command === "help") {
    return message.reply(
      `📖 COMMAND\n\n` +
      `!search !home !trending !latest\n` +
      `!favorite !history\n` +
      `!panel !getkey !redeem\n` +
      `!ps !game\n` +
      `!runtime !ping !stats`
    );
  }

  // ===== PANEL =====
  if (command === "panel") {
    return message.reply(
      `📦 PANEL\n\n` +
      `🔑 !getkey\n🎟️ !redeem <key>\n📜 !getscript`
    );
  }

  // ===== KEY =====
  if (command === "getkey") {
    const key = Math.random().toString(36).substring(2, 10);
    keys.set(message.author.id, key);
    return message.reply(`🔑 ${key}`);
  }

  if (command === "redeem") {
    const key = args[0];
    if (keys.get(message.author.id) !== key)
      return message.reply("❌ Wrong key");
    return message.reply("✅ Valid key");
  }

  // ===== SEARCH (EMBED + BUTTON) =====
  if (command === "search") {
    const q = args.join(" ");
    if (!q) return message.reply("❌ !search <name>");

    const res = await fetch(
      `https://scriptblox.com/api/script/search?q=${encodeURIComponent(q)}`
    );
    const data = await res.json();

    const scripts = data?.result?.scripts;
    if (!scripts || scripts.length === 0)
      return message.reply("❌ Not found");

    let page = 0;

    const embed = () => {
      const s = scripts[page];
      return new EmbedBuilder()
        .setTitle(s.title)
        .setDescription(`🔗 https://scriptblox.com/script/${s.slug}`)
        .setFooter({ text: `Page ${page + 1}/${scripts.length}` })
        .setColor(0x00ffcc);
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("fav").setLabel("⭐").setStyle(ButtonStyle.Success)
    );

    const msg = await message.reply({
      embeds: [embed()],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({ content: "❌ Not yours", ephemeral: true });

      if (i.customId === "next") page++;
      if (i.customId === "prev") page--;

      if (page < 0) page = scripts.length - 1;
      if (page >= scripts.length) page = 0;

      if (i.customId === "fav") {
        const userFav = favorites.get(i.user.id) || [];
        userFav.push(scripts[page]);
        favorites.set(i.user.id, userFav);
        return i.reply({ content: "⭐ Saved", ephemeral: true });
      }

      await i.update({ embeds: [embed()] });
    });

    history.set(message.author.id, scripts.slice(0, 5));
  }

  // ===== FAVORITE =====
  if (command === "favorite") {
    const fav = favorites.get(message.author.id);
    if (!fav) return message.reply("❌ No favorite");

    let text = "⭐ FAVORITE\n\n";
    fav.forEach((s) => {
      text += `${s.title}\nhttps://scriptblox.com/script/${s.slug}\n\n`;
    });

    message.reply(text);
  }

  // ===== HISTORY =====
  if (command === "history") {
    const hist = history.get(message.author.id);
    if (!hist) return message.reply("❌ No history");

    let text = "🧾 HISTORY\n\n";
    hist.forEach((s) => {
      text += `${s.title}\nhttps://scriptblox.com/script/${s.slug}\n\n`;
    });

    message.reply(text);
  }

  // ===== PS RANDOM =====
  if (command === "ps") {
    const type = args[0];

    const ps = {
      bf: [
        "https://www.roblox.com/games/2753915549?privateServerLinkCode=11538954597931190236578830175408"
      ],
      fisch: [
        "https://www.roblox.com/games/16732694052?privateServerLinkCode=19364623954829962758354802577209"
      ]
    };

    if (!type) return message.reply("!ps bf / !ps fisch");
    if (!ps[type]) return message.reply("❌ invalid");

    const link = ps[type][Math.floor(Math.random() * ps[type].length)];
    message.reply(`🔗 ${link}`);
  }

  // ===== BASIC =====
  if (command === "ping") return message.reply("🏓 Pong");

  if (command === "runtime") {
    return message.reply(`⏱ ${Math.floor((Date.now() - startTime)/1000)}s`);
  }

  if (command === "stats") {
    return message.reply(`📊 ${client.user.tag}`);
  }

  // ===== ADMIN =====
  if (command === "say") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    message.channel.send(args.join(" "));
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);

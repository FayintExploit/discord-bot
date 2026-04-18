const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";
const startTime = Date.now();

// ================= READY =================
client.on("ready", () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);
});

// ================= MESSAGE =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  // ================= HELP =================
  if (command === "help") {
    return message.reply(
      `📖 **SCRIPT HUB BOT**\n\n` +
      `🔥 !trending - Rscripts trending\n` +
      `🆕 !latest - Script terbaru\n` +
      `📦 !home - ScriptBlox latest\n` +
      `📜 !script <id> - Script by ID\n` +
      `🔎 !search <name> - Cari script\n` +
      `⏱ !runtime - Uptime bot\n` +
      `🏓 !ping - Test bot`
    );
  }

  // ================= RUNTIME =================
  if (command === "runtime") {
    const uptime = Date.now() - startTime;

    const sec = Math.floor(uptime / 1000) % 60;
    const min = Math.floor(uptime / (1000 * 60)) % 60;
    const hr = Math.floor(uptime / (1000 * 60 * 60));

    return message.reply(`⏱ **Runtime:** ${hr}h ${min}m ${sec}s`);
  }

  // ================= PING =================
  if (command === "ping") {
    return message.reply("🏓 Pong!");
  }

  // ================= TRENDING (RSCRIPTS) =================
  if (command === "trending") {
    try {
      const res = await fetch("https://rscripts.net/api/v2/trending");
      const data = await res.json();

      let text = "🔥 **Trending Scripts**\n\n";

      data.data.slice(0, 10).forEach((s, i) => {
        text += `**${i + 1}. ${s.title}**\nID: \`${s.id}\`\n\n`;
      });

      message.reply(text);
    } catch (err) {
      console.log(err);
      message.reply("❌ Error trending API");
    }
  }

  // ================= SCRIPT BY ID =================
  if (command === "script") {
    const id = args[0];
    if (!id) return message.reply("❌ !script <id>");

    try {
      const res = await fetch(
        `https://rscripts.net/api/v2/script?id=${id}`
      );
      const data = await res.json();

      if (!data.success) return message.reply("❌ Not found");

      const s = data.data;

      message.reply(
        `📜 **SCRIPT INFO**\n\n` +
        `Title: ${s.title}\n` +
        `ID: \`${s.id}\``
      );
    } catch (err) {
      console.log(err);
      message.reply("❌ Error script API");
    }
  }

  // ================= SEARCH =================
  if (command === "search") {
    const q = args.join(" ").toLowerCase();

    try {
      const res = await fetch("https://rscripts.net/api/v2/trending");
      const data = await res.json();

      const found = data.data.filter((s) =>
        s.title.toLowerCase().includes(q)
      );

      if (!found.length) return message.reply("❌ Not found");

      let text = "🔎 **Search Result**\n\n";

      found.slice(0, 5).forEach((s, i) => {
        text += `**${i + 1}. ${s.title}**\nID: \`${s.id}\`\n\n`;
      });

      message.reply(text);
    } catch (err) {
      console.log(err);
      message.reply("❌ Error search");
    }
  }

  // ================= LATEST =================
  if (command === "latest") {
    try {
      const res = await fetch(
        "https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc"
      );
      const data = await res.json();

      let text = "🆕 **Latest Scripts**\n\n";

      data.scripts.slice(0, 10).forEach((s, i) => {
        text += `**${i + 1}. ${s.title}**\nID: \`${s.id}\`\n\n`;
      });

      message.reply(text);
    } catch (err) {
      console.log(err);
      message.reply("❌ Error latest API");
    }
  }

  // ================= SCRIPTBLOX HOME =================
  if (command === "home") {
    try {
      const res = await fetch("https://scriptblox.com/api/script/fetch");
      const data = await res.json();

      const scripts = data.result?.scripts;

      if (!scripts) return message.reply("❌ No scripts found");

      let text = "📦 **ScriptBlox Latest**\n\n";

      scripts.slice(0, 10).forEach((s) => {
        text += `📌 **${s.title}**\nSlug: \`${s.slug}\`\n\n`;
      });

      message.reply(text);
    } catch (err) {
      console.log(err);
      message.reply("❌ Error ScriptBlox API");
    }
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);

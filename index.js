const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";

// ================= START TIME =================
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

  // 🆘 HELP COMMAND
  if (command === "help") {
    return message.reply(
      `📖 **BOT COMMANDS**\n\n` +
      `🔥 !trending - Script trending\n` +
      `🆕 !latest - Script terbaru\n` +
      `📜 !script <id> - Ambil script by ID\n` +
      `🔎 !search <nama> - Cari script\n` +
      `🏓 !ping - Test bot\n` +
      `⏱ !runtime - Uptime bot`
    );
  }

  // ⏱ RUNTIME COMMAND
  if (command === "runtime") {
    const uptime = Date.now() - startTime;

    const seconds = Math.floor(uptime / 1000) % 60;
    const minutes = Math.floor(uptime / (1000 * 60)) % 60;
    const hours = Math.floor(uptime / (1000 * 60 * 60));

    return message.reply(
      `⏱ **Bot Runtime**\n\n` +
      `🕒 ${hours}h ${minutes}m ${seconds}s`
    );
  }

  // 🏓 PING
  if (command === "ping") {
    return message.reply("🏓 Pong!");
  }

  // 🔥 TRENDING
  if (command === "trending") {
    const res = await fetch("https://rscripts.net/api/v2/trending");
    const data = await res.json();

    let text = "🔥 Trending Scripts\n\n";

    data.data.slice(0, 10).forEach((s, i) => {
      text += `${i + 1}. ${s.title}\nID: \`${s.id}\`\n\n`;
    });

    message.reply(text);
  }

  // 📜 SCRIPT BY ID
  if (command === "script") {
    const id = args[0];
    const res = await fetch(
      `https://rscripts.net/api/v2/script?id=${id}`
    );
    const data = await res.json();

    if (!data.success) return message.reply("❌ Not found");

    const s = data.data;

    message.reply(`📜 ${s.title}\nID: \`${s.id}\``);
  }

  // 🔎 SEARCH
  if (command === "search") {
    const q = args.join(" ").toLowerCase();

    const res = await fetch("https://rscripts.net/api/v2/trending");
    const data = await res.json();

    const found = data.data.filter((s) =>
      s.title.toLowerCase().includes(q)
    );

    let text = "🔎 Result\n\n";

    found.slice(0, 5).forEach((s, i) => {
      text += `${i + 1}. ${s.title}\nID: \`${s.id}\`\n\n`;
    });

    message.reply(text);
  }

  // 🆕 LATEST
  if (command === "latest") {
    const res = await fetch(
      "https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc"
    );
    const data = await res.json();

    let text = "🆕 Latest Scripts\n\n";

    data.scripts.slice(0, 10).forEach((s, i) => {
      text += `${i + 1}. ${s.title}\nID: \`${s.id}\`\n\n`;
    });

    message.reply(text);
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);

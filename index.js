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
      `🔥 !trending\n` +
      `🆕 !latest\n` +
      `📦 !home\n` +
      `🔎 !search <name>\n` +
      `📜 !script <id>\n` +
      `🎲 !random\n` +
      `🔥 !top\n` +
      `📊 !stats\n` +
      `📡 !api\n` +
      `📌 !info\n` +
      `⏱ !runtime\n` +
      `📢 !update\n` +
      `🏓 !ping`
    );
  }

  // ================= PING =================
  if (command === "ping") {
    return message.reply("🏓 Pong!");
  }

  // ================= RUNTIME =================
  if (command === "runtime") {
    const uptime = Date.now() - startTime;

    const sec = Math.floor(uptime / 1000) % 60;
    const min = Math.floor(uptime / (1000 * 60)) % 60;
    const hr = Math.floor(uptime / (1000 * 60 * 60));

    return message.reply(`⏱ Runtime: ${hr}h ${min}m ${sec}s`);
  }

  // ================= UPDATE =================
  if (command === "update") {
    return message.reply(
      `📢 **UPDATE LOG**\n\n` +
      `🆕 Script Hub Bot v1.1\n` +
      `🔥 ScriptBlox search fix\n` +
      `🔗 Auto link system\n` +
      `🎲 Random script\n` +
      `📊 Stats + API checker\n` +
      `⏱ Runtime tracker`
    );
  }

  // ================= STATS =================
  if (command === "stats") {
    return message.reply(
      `📊 **BOT STATS**\n\n` +
      `🤖 ${client.user.tag}\n` +
      `⏱ Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s\n` +
      `⚡ Platform: Railway\n` +
      `📡 APIs: ScriptBlox + Rscripts`
    );
  }

  // ================= API =================
  if (command === "api") {
    return message.reply(
      `📡 **API STATUS**\n\n` +
      `🔥 ScriptBlox: Online\n` +
      `🚀 Rscripts: Online`
    );
  }

  // ================= INFO =================
  if (command === "info") {
    return message.reply(
      `📌 **BOT INFO**\n\n` +
      `🤖 Script Hub Bot\n` +
      `📡 Multi Script Finder\n` +
      `⚙️ discord.js v14\n` +
      `🚀 Railway Hosted\n` +
      `📅 v1.1 Auto Link`
    );
  }

  // ================= RANDOM =================
  if (command === "random") {
    try {
      const res = await fetch("https://scriptblox.com/api/script/fetch");
      const data = await res.json();

      const scripts = data?.result?.scripts;
      if (!scripts || scripts.length === 0)
        return message.reply("❌ No scripts found");

      const s = scripts[Math.floor(Math.random() * scripts.length)];
      const url = `https://scriptblox.com/script/${s.slug}`;

      return message.reply(
        `🎲 **Random Script**\n\n` +
        `📌 ${s.title}\n` +
        `🔗 ${url}`
      );
    } catch {
      message.reply("❌ Error random script");
    }
  }

  // ================= TOP =================
  if (command === "top") {
    try {
      const res = await fetch("https://rscripts.net/api/v2/trending");
      const data = await res.json();

      const top = data?.data?.[0];
      if (!top) return message.reply("❌ No data");

      return message.reply(
        `🔥 **TOP SCRIPT**\n\n` +
        `📌 ${top.title}\n` +
        `ID: \`${top.id}\``
      );
    } catch {
      message.reply("❌ Error top script");
    }
  }

  // ================= TRENDING =================
  if (command === "trending") {
    try {
      const res = await fetch("https://rscripts.net/api/v2/trending");
      const data = await res.json();

      let text = "🔥 **Trending Scripts**\n\n";

      (data.data || []).slice(0, 10).forEach((s, i) => {
        text += `**${i + 1}. ${s.title}**\nID: \`${s.id}\`\n\n`;
      });

      message.reply(text);
    } catch {
      message.reply("❌ Error trending API");
    }
  }

  // ================= SCRIPT =================
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
    } catch {
      message.reply("❌ Error script API");
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

      (data.scripts || []).slice(0, 10).forEach((s, i) => {
        text += `**${i + 1}. ${s.title}**\nID: \`${s.id}\`\n\n`;
      });

      message.reply(text);
    } catch {
      message.reply("❌ Error latest API");
    }
  }

  // ================= HOME (AUTO LINK) =================
  if (command === "home") {
    try {
      const res = await fetch("https://scriptblox.com/api/script/fetch");
      const data = await res.json();

      const scripts = data?.result?.scripts;
      if (!scripts || scripts.length === 0)
        return message.reply("❌ No scripts found");

      let text = "📦 **ScriptBlox Latest Scripts**\n\n";

      scripts.slice(0, 10).forEach((s) => {
        const url = `https://scriptblox.com/script/${s.slug}`;

        text += `📌 **${s.title}**\n`;
        text += `🔗 ${url}\n\n`;
      });

      message.reply(text);
    } catch {
      message.reply("❌ Error ScriptBlox API");
    }
  }

  // ================= SEARCH (AUTO LINK) =================
  if (command === "search") {
    const q = args.join(" ").trim();
    if (!q) return message.reply("❌ !search <name>");

    try {
      const res = await fetch(
        `https://scriptblox.com/api/script/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();

      const scripts = data?.result?.scripts;
      if (!scripts || scripts.length === 0)
        return message.reply("❌ Not found");

      let text = "🔎 **Search Result**\n\n";

      scripts.slice(0, 5).forEach((s, i) => {
        const url = `https://scriptblox.com/script/${s.slug}`;

        text += `**${i + 1}. ${s.title}**\n`;
        text += `🔗 ${url}\n\n`;
      });

      message.reply(text);
    } catch {
      message.reply("❌ Error ScriptBlox search API");
    }
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);

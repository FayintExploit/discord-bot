const { Client, GatewayIntentBits } = require("discord.js");
const fetch = require("node-fetch");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  // ===================== TRENDING =====================
  if (command === "trending") {
    try {
      const res = await fetch("https://rscripts.net/api/v2/trending");
      const data = await res.json();

      if (!data.data) return message.reply("❌ No data found.");

      let text = "🔥 **Trending Scripts**\n\n";

      data.data.slice(0, 10).forEach((s, i) => {
        text += `**${i + 1}. ${s.title}**\nID: \`${s.id}\`\n\n`;
      });

      message.reply(text);
    } catch (err) {
      console.error(err);
      message.reply("❌ Error trending.");
    }
  }

  // ===================== SCRIPT BY ID =====================
  if (command === "script") {
    const id = args[0];
    if (!id) return message.reply("❌ Usage: !script <id>");

    try {
      const res = await fetch(
        `https://rscripts.net/api/v2/script?id=${id}`
      );
      const data = await res.json();

      if (!data.success || !data.data)
        return message.reply("❌ Script not found.");

      const s = data.data;

      message.reply(
        `📜 **Script Detail**\n\n` +
        `**Title:** ${s.title}\n` +
        `**ID:** \`${s.id}\`\n` +
        `**Desc:** ${s.description || "No description"}`
      );
    } catch (err) {
      console.error(err);
      message.reply("❌ Error fetching script.");
    }
  }

  // ===================== SEARCH (from trending) =====================
  if (command === "search") {
    const query = args.join(" ").toLowerCase();
    if (!query) return message.reply("❌ !search <nama script>");

    try {
      const res = await fetch("https://rscripts.net/api/v2/trending");
      const data = await res.json();

      if (!data.data) return message.reply("❌ No data.");

      const found = data.data.filter((s) =>
        (s.title || "").toLowerCase().includes(query)
      );

      if (found.length === 0)
        return message.reply("❌ Script tidak ditemukan.");

      let text = "🔎 **Search Result**\n\n";

      found.slice(0, 5).forEach((s, i) => {
        text += `**${i + 1}. ${s.title}**\nID: \`${s.id}\`\n\n`;
      });

      message.reply(text);
    } catch (err) {
      console.error(err);
      message.reply("❌ Error search.");
    }
  }

  // ===================== LATEST SCRIPTS =====================
  if (command === "latest") {
    try {
      const res = await fetch(
        "https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc"
      );
      const data = await res.json();

      if (!data.scripts) return message.reply("❌ No data found.");

      let text = `🆕 **Latest Scripts**\n`;
      text += `Page: ${data.info.currentPage}/${data.info.maxPages}\n\n`;

      data.scripts.slice(0, 10).forEach((s, i) => {
        text += `**${i + 1}. ${s.title}**\nID: \`${s.id}\`\n\n`;
      });

      message.reply(text);
    } catch (err) {
      console.error(err);
      message.reply("❌ Error fetching latest scripts.");
    }
  }
});

client.login(process.env.TOKEN)
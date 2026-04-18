const { Client, GatewayIntentBits } = require("discord.js");

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

// ================= KEY SYSTEM =================
const keys = new Map();
function generateKey() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

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
      `🔥 !trending\n🆕 !latest\n📦 !home\n🔎 !search\n📜 !script\n🎲 !random\n🔥 !top\n📊 !stats\n📡 !api\n📌 !info\n⏱ !runtime\n📢 !update\n📦 !panel\n🎮 !ps`
    );
  }

  // ================= PANEL =================
  if (command === "panel") {
    return message.reply(
      `📦 **SCRIPT HUB PANEL**\n\n` +
      `🔑 !getkey\n🎟️ !redeem <key>\n📜 !getscript\n👑 !getrole <name>`
    );
  }

  // ================= KEY =================
  if (command === "getkey") {
    const key = generateKey();
    keys.set(message.author.id, key);
    return message.reply(`🔑 KEY: ${key}`);
  }

  if (command === "redeem") {
    const input = args[0];
    const userKey = keys.get(message.author.id);

    if (!input) return message.reply("❌ !redeem <key>");
    if (!userKey) return message.reply("❌ No key");
    if (input !== userKey) return message.reply("❌ Wrong key");

    return message.reply("✅ Key valid");
  }

  // ================= SCRIPT =================
  if (command === "getscript") {
    try {
      const res = await fetch("https://scriptblox.com/api/script/fetch");
      const data = await res.json();

      const s = data?.result?.scripts?.[0];
      const url = `https://scriptblox.com/script/${s.slug}`;

      return message.reply(`📜 ${s.title}\n🔗 ${url}`);
    } catch {
      message.reply("❌ Error script");
    }
  }

  // ================= ROLE =================
  if (command === "getrole") {
    const roleName = args.join(" ");
    const role = message.guild.roles.cache.find(r => r.name === roleName);
    if (!role) return message.reply("❌ Role not found");

    const member = await message.guild.members.fetch(message.author.id);
    await member.roles.add(role);

    return message.reply(`👑 Got role: ${role.name}`);
  }

  // ================= PS RANDOM =================
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

    if (!type) {
      return message.reply(
        `🎮 PRIVATE SERVER\n\n!ps bf\n!ps fisch`
      );
    }

    if (!ps[type]) return message.reply("❌ bf / fisch only");

    const list = ps[type];
    const randomLink = list[Math.floor(Math.random() * list.length)];

    return message.reply(`🔗 ${randomLink}`);
  }

  // ================= BASIC =================
  if (command === "ping") return message.reply("🏓 Pong!");

  if (command === "runtime") {
    const t = Date.now() - startTime;
    return message.reply(`⏱ ${Math.floor(t / 1000)}s`);
  }

  if (command === "stats") {
    return message.reply(`📊 ${client.user.tag}`);
  }

  if (command === "info") {
    return message.reply(`🤖 Script Hub Bot v1.2`);
  }

  if (command === "update") {
    return message.reply(`📢 Panel + PS + Key added`);
  }

  // ================= SCRIPTBLOX =================
  if (command === "home") {
    try {
      const res = await fetch("https://scriptblox.com/api/script/fetch");
      const data = await res.json();

      let text = "📦 Scripts\n\n";
      data.result.scripts.slice(0, 5).forEach(s => {
        text += `${s.title}\nhttps://scriptblox.com/script/${s.slug}\n\n`;
      });

      message.reply(text);
    } catch {
      message.reply("❌ Error");
    }
  }

  if (command === "search") {
    const q = args.join(" ");
    if (!q) return message.reply("❌ !search");

    try {
      const res = await fetch(
        `https://scriptblox.com/api/script/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();

      let text = "🔎 Result\n\n";
      data.result.scripts.slice(0, 3).forEach(s => {
        text += `${s.title}\nhttps://scriptblox.com/script/${s.slug}\n\n`;
      });

      message.reply(text);
    } catch {
      message.reply("❌ Error");
    }
  }

  // ================= RSCRIPTS =================
  if (command === "trending") {
    try {
      const res = await fetch("https://rscripts.net/api/v2/trending");
      const data = await res.json();

      let text = "🔥 Trending\n\n";
      data.data.slice(0, 5).forEach(s => {
        text += `${s.title}\nID: ${s.id}\n\n`;
      });

      message.reply(text);
    } catch {
      message.reply("❌ Error");
    }
  }

  if (command === "latest") {
    try {
      const res = await fetch(
        "https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc"
      );
      const data = await res.json();

      let text = "🆕 Latest\n\n";
      data.scripts.slice(0, 5).forEach(s => {
        text += `${s.title}\nID: ${s.id}\n\n`;
      });

      message.reply(text);
    } catch {
      message.reply("❌ Error");
    }
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);

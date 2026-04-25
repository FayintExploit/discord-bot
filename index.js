const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");

// ===== CONFIG =====
const OWNER_ID = "1321669868503957755";
const isOwner = (id) => id === OWNER_ID;
const PREFIX = ["!", "?"];

// ===== DATABASE =====
let db;
const DB_PATH = "./database.json";

const defaultDB = {
  channels: [],
  vip: [],
  favorites: {},
  access: [],
  autopost: { enabled: false, channel: null, interval: 30 },
  ps: { bf: "", fisch: "" },
  lang: {},
  ratings: {},       // { scriptSlug: { userId: rating } }
  reviews: {},       // { scriptSlug: [{ userId, text, time }] }
  stats: {},         // { userId: { searches: 0, ratings: 0, reviews: 0 } }
  warns: {},         // { userId: [{ reason, time, by }] }
  banned: [],        // [userId]
  muted: {}          // { userId: unmuteTimestamp }
};

try {
  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  db = { ...defaultDB, ...raw };
} catch {
  db = defaultDB;
}

const saveDB = () => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

// ===== FETCH =====
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ],
});

// ===== HELPERS =====
const t = (userId, key) => {
  const lang = db.lang[userId] || "en";
  const strings = {
    en: {
      noPerms: "❌ No permission.",
      ownerOnly: "❌ Owner only.",
      notFound: "❌ Not found.",
      banned: "🚫 You are banned from using this bot.",
      muted: "🔇 You are muted.",
    },
    id: {
      noPerms: "❌ Kamu tidak punya izin.",
      ownerOnly: "❌ Owner only.",
      notFound: "❌ Tidak ditemukan.",
      banned: "🚫 Kamu di-ban dari bot ini.",
      muted: "🔇 Kamu sedang di-mute.",
    }
  };
  return strings[lang]?.[key] || strings.en[key] || key;
};

const addStat = (userId, key) => {
  if (!db.stats[userId]) db.stats[userId] = { searches: 0, ratings: 0, reviews: 0, commands: 0 };
  db.stats[userId][key] = (db.stats[userId][key] || 0) + 1;
  saveDB();
};

const isBanned = (id) => db.banned.includes(id);
const isMuted = (id) => db.muted[id] && db.muted[id] > Date.now();

const avgRating = (slug) => {
  const r = db.ratings[slug];
  if (!r || Object.keys(r).length === 0) return null;
  const vals = Object.values(r);
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
};

const stars = (n) => "⭐".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));

// ===== AUTOPOST =====
let autopostTimer = null;

const startAutopost = async () => {
  if (autopostTimer) clearInterval(autopostTimer);
  if (!db.autopost.enabled || !db.autopost.channel) return;

  autopostTimer = setInterval(async () => {
    try {
      const channel = await client.channels.fetch(db.autopost.channel);
      if (!channel) return;

      const res = await fetch("https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc");
      const data = await res.json();
      const s = data.scripts[Math.floor(Math.random() * 5)];
      if (!s) return;

      const embed = new EmbedBuilder()
        .setTitle(`🤖📢 Auto Post — ${s.title}`)
        .setDescription(`🔗 **Link:** https://rscripts.net/script/${s.slug || s.id}\n\n💡 *Use* \`/rate\` *to rate this script!*`)
        .setColor(0x00ff99)
        .setFooter({ text: "🚀 Script Hub Bot • Auto Post" })
        .setTimestamp();

      channel.send({ embeds: [embed] });
    } catch (e) {
      console.error("Autopost error:", e);
    }
  }, (db.autopost.interval || 30) * 60 * 1000);
};

// ===== SLASH COMMANDS =====
const slashCommands = [
  new SlashCommandBuilder().setName("ping").setDescription("Ping the bot"),
  new SlashCommandBuilder().setName("help").setDescription("Show all commands"),
  new SlashCommandBuilder().setName("latest").setDescription("Get latest scripts"),
  new SlashCommandBuilder().setName("random").setDescription("Get a random script"),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Show top users"),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show user stats")
    .addUserOption(o => o.setName("user").setDescription("User to check").setRequired(false)),
  new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search for a script")
    .addStringOption(o => o.setName("query").setDescription("Script name").setRequired(true)),
  new SlashCommandBuilder()
    .setName("rate")
    .setDescription("Rate a script (1-5)")
    .addStringOption(o => o.setName("slug").setDescription("Script slug").setRequired(true))
    .addIntegerOption(o => o.setName("stars").setDescription("1-5 stars").setRequired(true).setMinValue(1).setMaxValue(5)),
  new SlashCommandBuilder()
    .setName("review")
    .setDescription("Review a script")
    .addStringOption(o => o.setName("slug").setDescription("Script slug").setRequired(true))
    .addStringOption(o => o.setName("text").setDescription("Your review").setRequired(true)),
  new SlashCommandBuilder()
    .setName("reviews")
    .setDescription("See reviews of a script")
    .addStringOption(o => o.setName("slug").setDescription("Script slug").setRequired(true)),
  new SlashCommandBuilder()
    .setName("lang")
    .setDescription("Set language")
    .addStringOption(o => o.setName("lang").setDescription("id or en").setRequired(true).addChoices(
      { name: "Indonesia", value: "id" },
      { name: "English", value: "en" }
    )),
  // Moderation
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("[MOD] Ban a user from bot")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("[MOD] Unban a user from bot")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("[MOD] Kick a member from server")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("[MOD] Timeout a member")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Duration in minutes").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("[MOD] Warn a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true)),
  new SlashCommandBuilder()
    .setName("warns")
    .setDescription("[MOD] Check warns of a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("[MOD] Clear warns of a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("[MOD] Mute a user from bot commands")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Duration in minutes").setRequired(true)),
  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("[MOD] Unmute a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
  // Owner
  new SlashCommandBuilder()
    .setName("autopost")
    .setDescription("[OWNER] Toggle autopost")
    .addStringOption(o => o.setName("action").setDescription("on/off").setRequired(true).addChoices(
      { name: "on", value: "on" },
      { name: "off", value: "off" }
    ))
    .addStringOption(o => o.setName("channel").setDescription("Channel ID").setRequired(false))
    .addIntegerOption(o => o.setName("interval").setDescription("Interval in minutes").setRequired(false)),
].map(cmd => cmd.toJSON());

// ===== REGISTER SLASH =====
client.on("ready", async () => {
  console.log(`🚀✅ BOT ONLINE: ${client.user.tag} 🎉`);
  startAutopost();

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
    console.log("⚡✅ Slash commands registered globally 🌐");
  } catch (e) {
    console.error("💥 Slash register error:", e);
  }
});

// ===== CORE HANDLER =====
const handleCommand = async (cmd, args, reply, userId, member, guild, isSlash = false, interaction = null) => {

  // Ban/mute gate
  if (isBanned(userId)) return reply(t(userId, "banned"));
  if (isMuted(userId) && !["ban","unban","kick","timeout","warn","warns","clearwarns","mute","unmute","autopost"].includes(cmd))
    return reply(t(userId, "muted"));

  addStat(userId, "commands");

  // ===== PING =====
  if (cmd === "ping") return reply("🏓 **Pong!** 🟢 Bot is online and ready!");

  // ===== HELP =====
  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📖✨ Script Hub Bot — Command List")
      .setColor(0x00ff99)
      .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      .addFields(
        { name: "🔎 Scripts", value: "`search` `latest` `random`", inline: true },
        { name: "⭐ Rating", value: "`rate` `review` `reviews`", inline: true },
        { name: "🎮 Private Server", value: "`ps` `setps`", inline: true },
        { name: "📊 Stats", value: "`stats` `leaderboard`", inline: true },
        { name: "🌐 Language", value: "`lang id` / `lang en`", inline: true },
        { name: "⭐ Favorites", value: "`favorite`", inline: true },
        { name: "🛡️ Moderation", value: "`ban` `unban` `kick` `timeout` `warn` `warns` `clearwarns` `mute` `unmute`", inline: false },
        { name: "👑 Owner Only", value: "`autopost`", inline: true },
      )
      .setFooter({ text: "⚡ Prefix: ! or ? | 🔷 Also supports /slash commands" })
      .setTimestamp();
    return reply({ embeds: [embed] });
  }

  // ===== LANG =====
  if (cmd === "lang") {
    const l = args[0];
    if (!["id", "en"].includes(l)) return reply("⚠️ Usage: `lang id` / `lang en`");
    db.lang[userId] = l;
    saveDB();
    return reply(l === "id" ? "✅🇮🇩 Bahasa diset ke **Indonesia**!" : "✅🇺🇸 Language set to **English**!");
  }

  // ===== LATEST =====
  if (cmd === "latest") {
    const res = await fetch("https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc");
    const data = await res.json();
    const embed = new EmbedBuilder().setTitle("🆕🔥 Latest Scripts").setColor(0x00ff99).setFooter({ text: "📅 Freshly fetched from rscripts.net" }).setTimestamp();
    data.scripts.slice(0, 5).forEach((s, i) => {
      const avg = avgRating(s.slug || s.id);
      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
      embed.addFields({
        name: `${medals[i]} ${s.title}`,
        value: `${avg ? stars(avg) + ` **(${avg}/5)**` : "💤 No ratings yet"}\n🔗 https://rscripts.net/script/${s.slug || s.id}`
      });
    });
    return reply({ embeds: [embed] });
  }

  // ===== RANDOM =====
  if (cmd === "random") {
    const res = await fetch("https://rscripts.net/api/v2/scripts?page=1");
    const data = await res.json();
    const s = data.scripts[Math.floor(Math.random() * data.scripts.length)];
    const avg = avgRating(s.slug || s.id);
    const embed = new EmbedBuilder()
      .setTitle(`🎲✨ Random Script — ${s.title}`)
      .setDescription(`${avg ? `⭐ **Rating:** ${stars(avg)} **(${avg}/5)**\n` : "💤 No ratings yet\n"}\n🔗 https://rscripts.net/script/${s.slug || s.id}`)
      .setColor(0x9b59b6)
      .setFooter({ text: "🎰 Try again for another random script!" });
    return reply({ embeds: [embed] });
  }

  // ===== SEARCH =====
  if (cmd === "search") {
    const q = args.join(" ");
    if (!q) return reply("Usage: search <name>");

    addStat(userId, "searches");

    const res = await fetch(`https://scriptblox.com/api/script/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const scripts = data?.result?.scripts;
    if (!scripts || scripts.length === 0) return reply(t(userId, "notFound"));

    let page = 0;
    const getPage = () => scripts.slice(page * 5, page * 5 + 5);

    const buildMenu = () =>
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("searchmenu")
          .setPlaceholder(`Page ${page + 1} — Select script`)
          .addOptions(
            getPage().map((s, i) => {
              const avg = avgRating(s.slug || s.id);
              return {
                label: s.title.substring(0, 80),
                description: avg ? `Rating: ${avg}/5` : "No rating yet",
                value: String(page * 5 + i)
              };
            })
          )
      );

    const nav = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("s_prev").setLabel("⬅️ Prev").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("s_next").setLabel("Next ➡️").setStyle(ButtonStyle.Primary)
    );

    const sent = await reply({ content: `🔎 **Results for:** \`${q}\``, components: [buildMenu(), nav], fetchReply: true });

    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== userId)
        return i.reply({ content: "❌ Not yours", ephemeral: true });

      if (i.customId === "s_next") { page++; if (page * 5 >= scripts.length) page--; }
      if (i.customId === "s_prev") { page--; if (page < 0) page = 0; }

      if (i.customId === "searchmenu") {
        const idx = parseInt(i.values[0]);
        const s = scripts[idx];
        const slug = s.slug || s.id;
        const avg = avgRating(slug);
        const embed = new EmbedBuilder()
          .setTitle(`📜 ${s.title}`)
          .setDescription(
            `👤 **Creator:** ${s.user?.username || "Unknown"}\n` +
            `${avg ? `⭐ **Rating:** ${stars(avg)} (${avg}/5)\n` : ""}` +
            `\n\`\`\`lua\nloadstring(game:HttpGet("https://scriptblox.com/raw/${slug}"))()\n\`\`\``
          )
          .setColor(0x00ff99)
          .setFooter({ text: `Slug: ${slug} | Use /rate ${slug} to rate!` });

        if (s.image) embed.setThumbnail(s.image);
        return i.reply({ embeds: [embed] });
      }

      await i.update({ components: [buildMenu(), nav] });
    });
  }

  // ===== RATE =====
  if (cmd === "rate") {
    const slug = args[0];
    const rating = parseInt(args[1]);
    if (!slug || !rating || rating < 1 || rating > 5)
      return reply("Usage: rate <slug> <1-5>");

    if (!db.ratings[slug]) db.ratings[slug] = {};
    db.ratings[slug][userId] = rating;
    saveDB();
    addStat(userId, "ratings");

    const avg = avgRating(slug);
    return reply(`✅ Rated **${slug}** ${stars(rating)} (${rating}/5)\nAverage: ${stars(avg)} (${avg}/5)`);
  }

  // ===== REVIEW =====
  if (cmd === "review") {
    const slug = args[0];
    const text = args.slice(1).join(" ");
    if (!slug || !text) return reply("Usage: review <slug> <text>");

    if (!db.reviews[slug]) db.reviews[slug] = [];

    // Remove existing review from user
    db.reviews[slug] = db.reviews[slug].filter(r => r.userId !== userId);
    db.reviews[slug].push({ userId, text, time: Date.now() });
    saveDB();
    addStat(userId, "reviews");

    return reply(`✅ Review posted for **${slug}**!`);
  }

  // ===== REVIEWS =====
  if (cmd === "reviews") {
    const slug = args[0];
    if (!slug) return reply("Usage: reviews <slug>");

    const reviews = db.reviews[slug];
    const avg = avgRating(slug);

    if (!reviews || reviews.length === 0) return reply(`No reviews yet for **${slug}**`);

    const embed = new EmbedBuilder()
      .setTitle(`📝 Reviews: ${slug}`)
      .setColor(0xf1c40f)
      .setDescription(avg ? `⭐ Average: ${stars(avg)} (${avg}/5)` : "No ratings yet");

    reviews.slice(-5).forEach(r => {
      embed.addFields({ name: `<@${r.userId}>`, value: r.text.substring(0, 200) });
    });

    return reply({ embeds: [embed] });
  }

  // ===== STATS =====
  if (cmd === "stats") {
    const target = args[0]?.replace(/[<@!>]/g, "") || userId;
    const s = db.stats[target];

    const embed = new EmbedBuilder()
      .setTitle(`📊 Stats: <@${target}>`)
      .setColor(0x3498db)
      .addFields(
        { name: "🔎 Searches", value: String(s?.searches || 0), inline: true },
        { name: "⭐ Ratings", value: String(s?.ratings || 0), inline: true },
        { name: "📝 Reviews", value: String(s?.reviews || 0), inline: true },
        { name: "⌨️ Commands", value: String(s?.commands || 0), inline: true },
      );

    return reply({ embeds: [embed] });
  }

  // ===== LEADERBOARD =====
  if (cmd === "leaderboard") {
    const sorted = Object.entries(db.stats)
      .map(([id, s]) => ({ id, total: (s.searches || 0) + (s.ratings || 0) + (s.reviews || 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle("🏆 Leaderboard — Top Users")
      .setColor(0xf39c12)
      .setDescription(
        sorted.length === 0 ? "No data yet" :
        sorted.map((u, i) => `${["🥇","🥈","🥉"][i] || `${i+1}.`} <@${u.id}> — **${u.total}** actions`).join("\n")
      );

    return reply({ embeds: [embed] });
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

    const sent = await reply({ content: "🎮 Choose Server:", components: [row], fetchReply: true });
    const collector = sent.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== userId) return;
      const link = db.ps[i.values[0]];
      i.reply(link ? `🔗 ${link}` : "❌ Not set yet");
    });
  }

  // ===== SETPS =====
  if (cmd === "setps") {
    if (!isOwner(userId)) return reply(t(userId, "ownerOnly"));
    const game = args[0], link = args[1];
    if (!game || !link) return reply("Usage: setps <bf|fisch> <link>");
    db.ps[game] = link;
    saveDB();
    return reply(`✅ PS link for **${game}** updated!`);
  }

  // ===== FAVORITE =====
  if (cmd === "favorite") {
    const fav = db.favorites[userId];
    if (!fav || fav.length === 0) return reply("❌ Favorites empty");

    const embed = new EmbedBuilder().setTitle("⭐ Your Favorites").setColor(0xe74c3c);
    fav.forEach(s => {
      embed.addFields({ name: s.title, value: `https://scriptblox.com/script/${s.slug}` });
    });
    return reply({ embeds: [embed] });
  }

  // ===== MODERATION =====
  const hasMod = member?.permissions?.has(PermissionFlagsBits.ModerateMembers);

  if (cmd === "ban") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const reason = args.slice(1).join(" ") || "No reason";
    if (!targetId) return reply("Usage: ban <@user> [reason]");

    if (!db.banned.includes(targetId)) db.banned.push(targetId);
    saveDB();
    return reply(`🔨 <@${targetId}> has been **banned** from bot.\n📝 Reason: ${reason}`);
  }

  if (cmd === "unban") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) return reply("Usage: unban <@user>");
    db.banned = db.banned.filter(id => id !== targetId);
    saveDB();
    return reply(`✅ <@${targetId}> unbanned from bot.`);
  }

  if (cmd === "kick") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const reason = args.slice(1).join(" ") || "No reason";
    if (!targetId) return reply("Usage: kick <@user> [reason]");

    try {
      const guildMember = await guild.members.fetch(targetId);
      await guildMember.kick(reason);
      return reply(`👢 <@${targetId}> has been **kicked**.\n📝 Reason: ${reason}`);
    } catch {
      return reply("❌ Failed to kick. Check my permissions.");
    }
  }

  if (cmd === "timeout") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const minutes = parseInt(args[1]) || 5;
    const reason = args.slice(2).join(" ") || "No reason";
    if (!targetId) return reply("Usage: timeout <@user> <minutes> [reason]");

    try {
      const guildMember = await guild.members.fetch(targetId);
      await guildMember.timeout(minutes * 60 * 1000, reason);
      return reply(`⏳ <@${targetId}> timed out for **${minutes} min**.\n📝 Reason: ${reason}`);
    } catch {
      return reply("❌ Failed to timeout.");
    }
  }

  if (cmd === "warn") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const reason = args.slice(1).join(" ");
    if (!targetId || !reason) return reply("Usage: warn <@user> <reason>");

    if (!db.warns[targetId]) db.warns[targetId] = [];
    db.warns[targetId].push({ reason, time: Date.now(), by: userId });
    saveDB();

    const count = db.warns[targetId].length;
    return reply(`⚠️ <@${targetId}> warned. (**${count}** total warns)\n📝 Reason: ${reason}`);
  }

  if (cmd === "warns") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) return reply("Usage: warns <@user>");

    const warns = db.warns[targetId];
    if (!warns || warns.length === 0) return reply(`✅ <@${targetId}> has no warns.`);

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warns: <@${targetId}>`)
      .setColor(0xe67e22)
      .setDescription(warns.map((w, i) => `**${i+1}.** ${w.reason} — by <@${w.by}>`).join("\n"));

    return reply({ embeds: [embed] });
  }

  if (cmd === "clearwarns") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) return reply("Usage: clearwarns <@user>");

    db.warns[targetId] = [];
    saveDB();
    return reply(`✅ Warns cleared for <@${targetId}>.`);
  }

  if (cmd === "mute") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const minutes = parseInt(args[1]) || 10;
    if (!targetId) return reply("Usage: mute <@user> <minutes>");

    db.muted[targetId] = Date.now() + minutes * 60 * 1000;
    saveDB();
    return reply(`🔇 <@${targetId}> muted from bot for **${minutes} min**.`);
  }

  if (cmd === "unmute") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) return reply("Usage: unmute <@user>");

    delete db.muted[targetId];
    saveDB();
    return reply(`✅ <@${targetId}> unmuted.`);
  }

  // ===== AUTOPOST =====
  if (cmd === "autopost") {
    if (!isOwner(userId)) return reply(t(userId, "ownerOnly"));

    const action = args[0];
    if (action === "on") {
      const channelId = args[1];
      const interval = parseInt(args[2]) || 30;
      if (!channelId) return reply("Usage: autopost on <channelId> [intervalMinutes]");

      db.autopost = { enabled: true, channel: channelId, interval };
      saveDB();
      startAutopost();
      return reply(`✅ Autopost ON — Channel: <#${channelId}> — Every **${interval} min**`);
    }

    if (action === "off") {
      db.autopost.enabled = false;
      saveDB();
      if (autopostTimer) clearInterval(autopostTimer);
      return reply("✅ Autopost OFF");
    }

    return reply("Usage: autopost on <channelId> [intervalMinutes] | autopost off");
  }
};

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (db.channels.length && !db.channels.includes(message.channel.id)) return;

  const used = PREFIX.find(p => message.content.startsWith(p));
  if (!used) return;

  const args = message.content.slice(used.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  const reply = (content) => {
    if (typeof content === "string") return message.reply(content);
    return message.reply(content);
  };

  try {
    await handleCommand(cmd, args, reply, message.author.id, message.member, message.guild, false);
  } catch (e) {
    console.error("Prefix cmd error:", e);
    message.reply("❌ Error occurred.").catch(() => {});
  }
});

// ===== SLASH HANDLER =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;
  const userId = interaction.user.id;

  // Map slash options to args array
  const buildArgs = () => {
    const opts = interaction.options;
    switch (cmd) {
      case "search": return [opts.getString("query")];
      case "rate": return [opts.getString("slug"), String(opts.getInteger("stars"))];
      case "review": return [opts.getString("slug"), opts.getString("text")];
      case "reviews": return [opts.getString("slug")];
      case "lang": return [opts.getString("lang")];
      case "stats": return opts.getUser("user") ? [opts.getUser("user").id] : [];
      case "ban": return [opts.getUser("user").id, opts.getString("reason") || "No reason"];
      case "unban": return [opts.getUser("user").id];
      case "kick": return [opts.getUser("user").id, opts.getString("reason") || "No reason"];
      case "timeout": return [opts.getUser("user").id, String(opts.getInteger("minutes")), opts.getString("reason") || "No reason"];
      case "warn": return [opts.getUser("user").id, opts.getString("reason")];
      case "warns": return [opts.getUser("user").id];
      case "clearwarns": return [opts.getUser("user").id];
      case "mute": return [opts.getUser("user").id, String(opts.getInteger("minutes"))];
      case "unmute": return [opts.getUser("user").id];
      case "autopost": {
        const action = opts.getString("action");
        const ch = opts.getString("channel") || "";
        const interval = opts.getInteger("interval") || 30;
        return [action, ch, String(interval)];
      }
      default: return [];
    }
  };

  await interaction.deferReply();

  const reply = async (content) => {
    if (typeof content === "string") return interaction.editReply(content);
    return interaction.editReply(content);
  };

  try {
    await handleCommand(cmd, buildArgs(), reply, userId, interaction.member, interaction.guild, true, interaction);
  } catch (e) {
    console.error("Slash cmd error:", e);
    interaction.editReply("❌ Error occurred.").catch(() => {});
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
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

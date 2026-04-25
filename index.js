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

const OWNER_ID = "1321669868503957755";
const isOwner = (id) => id === OWNER_ID;
const PREFIX = ["!", "?"];

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
  ratings: {},
  reviews: {},
  stats: {},
  warns: {},
  banned: [],
  muted: {}
};

try {
  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  db = { ...defaultDB, ...raw };
} catch {
  db = defaultDB;
}

const saveDB = () => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ],
});

// emoji constants (unicode escape safe)
const E = {
  check:    "\u2705",
  cross:    "\u274C",
  warn:     "\u26A0\uFE0F",
  ban:      "\u{1F6AB}",
  mute:     "\u{1F507}",
  unmute:   "\u{1F50A}",
  hammer:   "\u{1F528}",
  kick:     "\u{1F462}",
  clock:    "\u23F3",
  bell:     "\u{1F514}",
  star:     "\u2B50",
  hollow:   "\u2606",
  fire:     "\u{1F525}",
  new_:     "\u{1F195}",
  dice:     "\u{1F3B2}",
  search:   "\u{1F50E}",
  scroll:   "\u{1F4DC}",
  book:     "\u{1F4D6}",
  chart:    "\u{1F4CA}",
  trophy:   "\u{1F3C6}",
  crown:    "\u{1F451}",
  globe:    "\u{1F310}",
  link:     "\u{1F517}",
  pen:      "\u{1F4DD}",
  chat:     "\u{1F4AC}",
  heart:    "\u2764\uFE0F",
  game:     "\u{1F3AE}",
  robot:    "\u{1F916}",
  mega:     "\u{1F4E2}",
  rocket:   "\u{1F680}",
  spark:    "\u2728",
  gold:     "\u{1F947}",
  silver:   "\u{1F948}",
  bronze:   "\u{1F949}",
  ping:     "\u{1F3D3}",
  green:    "\u{1F7E2}",
  pray:     "\u{1F64F}",
  broom:    "\u{1F9F9}",
  lock:     "\u{1F513}",
  sleep:    "\u{1F4A4}",
  apple:    "\u{1F34E}",
  fish:     "\u{1F3A3}",
  id_flag:  "\u{1F1EE}\u{1F1E9}",
  us_flag:  "\u{1F1FA}\u{1F1F8}",
  shield:   "\u{1F6E1}\uFE0F",
  cop:      "\u{1F46E}",
  silent:   "\u{1F636}",
  wind:     "\u{1F4A8}",
  stop:     "\u26D4",
  signal:   "\u{1F4E1}",
  timer:    "\u23F1\uFE0F",
  user:     "\u{1F464}",
  bars:     "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
};

const t = (userId, key) => {
  const lang = db.lang[userId] || "en";
  const strings = {
    en: {
      noPerms:  E.ban + " No permission for this command!",
      ownerOnly: E.crown + " Owner only!",
      notFound: E.cross + " No scripts found. Try another keyword.",
      banned:   E.hammer + E.ban + " You are banned from this bot!",
      muted:    E.mute + " You are muted from bot commands!",
    },
    id: {
      noPerms:  E.ban + " Kamu tidak punya izin!",
      ownerOnly: E.crown + " Owner only!",
      notFound: E.cross + " Script tidak ditemukan. Coba keyword lain.",
      banned:   E.hammer + E.ban + " Kamu di-ban dari bot ini!",
      muted:    E.mute + " Kamu sedang di-mute!",
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
const isMuted  = (id) => db.muted[id] && db.muted[id] > Date.now();

const avgRating = (slug) => {
  const r = db.ratings[slug];
  if (!r || Object.keys(r).length === 0) return null;
  const vals = Object.values(r);
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
};

const stars = (n) => E.star.repeat(Math.round(n)) + E.hollow.repeat(5 - Math.round(n));

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
        .setTitle(E.robot + E.mega + " Auto Post: " + s.title)
        .setDescription(
          E.link + " https://rscripts.net/script/" + (s.slug || s.id) + "\n\n" +
          E.star + " Use `/rate` to rate this script!"
        )
        .setColor(0x00ff99)
        .setFooter({ text: E.rocket + " Script Hub Bot | Auto Post" })
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
    .setName("stats").setDescription("Show user stats")
    .addUserOption(o => o.setName("user").setDescription("User to check").setRequired(false)),
  new SlashCommandBuilder()
    .setName("search").setDescription("Search for a script")
    .addStringOption(o => o.setName("query").setDescription("Script name").setRequired(true)),
  new SlashCommandBuilder()
    .setName("rate").setDescription("Rate a script 1-5")
    .addStringOption(o => o.setName("slug").setDescription("Script slug").setRequired(true))
    .addIntegerOption(o => o.setName("stars").setDescription("1 to 5 stars").setRequired(true).setMinValue(1).setMaxValue(5)),
  new SlashCommandBuilder()
    .setName("review").setDescription("Review a script")
    .addStringOption(o => o.setName("slug").setDescription("Script slug").setRequired(true))
    .addStringOption(o => o.setName("text").setDescription("Your review").setRequired(true)),
  new SlashCommandBuilder()
    .setName("reviews").setDescription("See reviews of a script")
    .addStringOption(o => o.setName("slug").setDescription("Script slug").setRequired(true)),
  new SlashCommandBuilder()
    .setName("lang").setDescription("Set language")
    .addStringOption(o => o.setName("lang").setDescription("id or en").setRequired(true).addChoices(
      { name: "Indonesia", value: "id" },
      { name: "English",   value: "en" }
    )),
  new SlashCommandBuilder()
    .setName("ban").setDescription("MOD Ban a user from bot")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("unban").setDescription("MOD Unban a user from bot")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("kick").setDescription("MOD Kick a member")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("timeout").setDescription("MOD Timeout a member")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Duration in minutes").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("warn").setDescription("MOD Warn a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true)),
  new SlashCommandBuilder()
    .setName("warns").setDescription("MOD Check warns of a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("clearwarns").setDescription("MOD Clear warns of a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("mute").setDescription("MOD Mute a user from bot commands")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Duration in minutes").setRequired(true)),
  new SlashCommandBuilder()
    .setName("unmute").setDescription("MOD Unmute a user")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("autopost").setDescription("OWNER Toggle autopost")
    .addStringOption(o => o.setName("action").setDescription("on or off").setRequired(true).addChoices(
      { name: "on",  value: "on"  },
      { name: "off", value: "off" }
    ))
    .addStringOption(o => o.setName("channel").setDescription("Channel ID").setRequired(false))
    .addIntegerOption(o => o.setName("interval").setDescription("Interval in minutes").setRequired(false)),
].map(cmd => cmd.toJSON());

// ===== READY =====
client.on("ready", async () => {
  console.log(E.rocket + " BOT ONLINE: " + client.user.tag);
  startAutopost();
  try {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
    console.log(E.check + " Slash commands registered globally");
  } catch (e) {
    console.error("Slash register error:", e);
  }
});

// ===== CORE HANDLER =====
const handleCommand = async (cmd, args, reply, userId, member, guild) => {
  if (isBanned(userId)) return reply(t(userId, "banned"));
  if (isMuted(userId) && !["ban","unban","kick","timeout","warn","warns","clearwarns","mute","unmute","autopost"].includes(cmd))
    return reply(t(userId, "muted"));

  addStat(userId, "commands");

  if (cmd === "ping") {
    return reply(E.ping + " **Pong!** " + E.green + " Bot is online and ready!");
  }

  if (cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle(E.book + E.spark + " Script Hub Bot | Commands")
      .setColor(0x00ff99)
      .setDescription(E.bars)
      .addFields(
        { name: E.search + " Scripts",        value: "`search` `latest` `random`",                                                    inline: true  },
        { name: E.star   + " Rating",         value: "`rate` `review` `reviews`",                                                    inline: true  },
        { name: E.game   + " Private Server", value: "`ps` `setps`",                                                                 inline: true  },
        { name: E.chart  + " Stats",          value: "`stats` `leaderboard`",                                                        inline: true  },
        { name: E.globe  + " Language",       value: "`lang id` / `lang en`",                                                        inline: true  },
        { name: E.heart  + " Favorites",      value: "`favorite`",                                                                   inline: true  },
        { name: E.shield + " Moderation",     value: "`ban` `unban` `kick` `timeout` `warn` `warns` `clearwarns` `mute` `unmute`",   inline: false },
        { name: E.crown  + " Owner Only",     value: "`autopost`",                                                                   inline: true  },
      )
      .setFooter({ text: "Prefix: ! or ? | Also supports /slash" })
      .setTimestamp();
    return reply({ embeds: [embed] });
  }

  if (cmd === "lang") {
    const l = args[0];
    if (!["id", "en"].includes(l)) return reply(E.warn + " Usage: `lang id` / `lang en`");
    db.lang[userId] = l;
    saveDB();
    return reply(l === "id"
      ? E.check + E.id_flag + " Bahasa diset ke **Indonesia**!"
      : E.check + E.us_flag + " Language set to **English**!"
    );
  }

  if (cmd === "latest") {
    const res = await fetch("https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc");
    const data = await res.json();
    const medals = [E.gold, E.silver, E.bronze, "4\uFE0F\u20E3", "5\uFE0F\u20E3"];
    const embed = new EmbedBuilder()
      .setTitle(E.new_ + E.fire + " Latest Scripts")
      .setColor(0x00ff99)
      .setFooter({ text: "Fetched from rscripts.net" })
      .setTimestamp();
    data.scripts.slice(0, 5).forEach((s, i) => {
      const avg = avgRating(s.slug || s.id);
      embed.addFields({
        name:  medals[i] + " " + s.title,
        value: (avg ? stars(avg) + " **(" + avg + "/5)**" : E.sleep + " No ratings yet") +
               "\n" + E.link + " https://rscripts.net/script/" + (s.slug || s.id)
      });
    });
    return reply({ embeds: [embed] });
  }

  if (cmd === "random") {
    const res = await fetch("https://rscripts.net/api/v2/scripts?page=1");
    const data = await res.json();
    const s = data.scripts[Math.floor(Math.random() * data.scripts.length)];
    const avg = avgRating(s.slug || s.id);
    const embed = new EmbedBuilder()
      .setTitle(E.dice + E.spark + " Random Script: " + s.title)
      .setDescription(
        (avg ? E.star + " **Rating:** " + stars(avg) + " **(" + avg + "/5)**\n" : E.sleep + " No ratings yet\n") +
        "\n" + E.link + " https://rscripts.net/script/" + (s.slug || s.id)
      )
      .setColor(0x9b59b6)
      .setFooter({ text: "Try again for another random script!" });
    return reply({ embeds: [embed] });
  }

  if (cmd === "search") {
    const q = args.join(" ");
    if (!q) return reply(E.warn + " Usage: `search <script name>`");
    addStat(userId, "searches");

    const res = await fetch("https://scriptblox.com/api/script/search?q=" + encodeURIComponent(q));
    const data = await res.json();
    const scripts = data?.result?.scripts;
    if (!scripts || scripts.length === 0) return reply(t(userId, "notFound"));

    let page = 0;
    const getPage = () => scripts.slice(page * 5, page * 5 + 5);

    const buildMenu = () =>
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("searchmenu")
          .setPlaceholder("Page " + (page + 1) + " | Select a script...")
          .addOptions(
            getPage().map((s, i) => {
              const avg = avgRating(s.slug || s.id);
              return {
                label:       s.title.substring(0, 100),
                description: avg ? "Rating: " + avg + "/5" : "No rating yet",
                value:       String(page * 5 + i)
              };
            })
          )
      );

    const nav = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("s_prev").setLabel("Prev").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("s_next").setLabel("Next").setStyle(ButtonStyle.Primary)
    );

    const sent = await reply({
      content:    E.search + " **Results for:** `" + q + "`",
      components: [buildMenu(), nav],
      fetchReply: true
    });

    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== userId)
        return i.reply({ content: E.ban + " Not yours!", ephemeral: true });

      if (i.customId === "s_next") { page++; if (page * 5 >= scripts.length) page--; }
      if (i.customId === "s_prev") { page--; if (page < 0) page = 0; }

      if (i.customId === "searchmenu") {
        const idx = parseInt(i.values[0]);
        const s   = scripts[idx];
        const slug = s.slug || s.id;
        const avg  = avgRating(slug);
        const embed = new EmbedBuilder()
          .setTitle(E.scroll + E.spark + " " + s.title)
          .setDescription(
            E.user + " **Creator:** " + (s.user?.username || "Unknown") + "\n" +
            (avg ? E.star + " **Rating:** " + stars(avg) + " **(" + avg + "/5)**\n" : E.sleep + " No ratings yet\n") +
            "\n```lua\nloadstring(game:HttpGet(\"https://scriptblox.com/raw/" + slug + "\"))()\n```"
          )
          .setColor(0x00ff99)
          .setFooter({ text: "Slug: " + slug + " | Use /rate " + slug + " to rate!" });
        if (s.image) embed.setThumbnail(s.image);
        return i.reply({ embeds: [embed] });
      }

      await i.update({ components: [buildMenu(), nav] });
    });
  }

  if (cmd === "rate") {
    const slug   = args[0];
    const rating = parseInt(args[1]);
    if (!slug || !rating || rating < 1 || rating > 5)
      return reply(E.warn + " Usage: `rate <slug> <1-5>`");
    if (!db.ratings[slug]) db.ratings[slug] = {};
    db.ratings[slug][userId] = rating;
    saveDB();
    addStat(userId, "ratings");
    const avg = avgRating(slug);
    return reply(
      E.check + E.star + " Rated **" + slug + "** " + stars(rating) + " **(" + rating + "/5)**!\n" +
      E.chart + " New average: " + stars(avg) + " **(" + avg + "/5)**"
    );
  }

  if (cmd === "review") {
    const slug = args[0];
    const text = args.slice(1).join(" ");
    if (!slug || !text) return reply(E.warn + " Usage: `review <slug> <text>`");
    if (!db.reviews[slug]) db.reviews[slug] = [];
    db.reviews[slug] = db.reviews[slug].filter(r => r.userId !== userId);
    db.reviews[slug].push({ userId, text, time: Date.now() });
    saveDB();
    addStat(userId, "reviews");
    return reply(E.check + E.pen + " Review posted for **" + slug + "**! Thanks " + E.pray);
  }

  if (cmd === "reviews") {
    const slug = args[0];
    if (!slug) return reply(E.warn + " Usage: `reviews <slug>`");
    const reviews = db.reviews[slug];
    const avg     = avgRating(slug);
    if (!reviews || reviews.length === 0)
      return reply(E.sleep + " No reviews yet for **" + slug + "**. Be the first!");
    const embed = new EmbedBuilder()
      .setTitle(E.pen + E.chat + " Reviews | " + slug)
      .setColor(0xf1c40f)
      .setDescription(avg ? E.star + " **Average:** " + stars(avg) + " **(" + avg + "/5)**" : E.sleep + " No ratings yet")
      .setFooter({ text: "Showing latest " + Math.min(reviews.length, 5) + " reviews" });
    reviews.slice(-5).forEach(r => {
      embed.addFields({ name: E.chat + " <@" + r.userId + ">", value: r.text.substring(0, 200) });
    });
    return reply({ embeds: [embed] });
  }

  if (cmd === "stats") {
    const target = args[0]?.replace(/[<@!>]/g, "") || userId;
    const s = db.stats[target];
    const embed = new EmbedBuilder()
      .setTitle(E.chart + E.spark + " Stats | <@" + target + ">")
      .setColor(0x3498db)
      .addFields(
        { name: E.search + " Searches", value: "`" + (s?.searches || 0) + "`", inline: true },
        { name: E.star   + " Ratings",  value: "`" + (s?.ratings  || 0) + "`", inline: true },
        { name: E.pen    + " Reviews",  value: "`" + (s?.reviews  || 0) + "`", inline: true },
        { name: "\u2328\uFE0F Commands",     value: "`" + (s?.commands || 0) + "`", inline: true },
      )
      .setFooter({ text: "Script Hub Bot Stats" })
      .setTimestamp();
    return reply({ embeds: [embed] });
  }

  if (cmd === "leaderboard") {
    const sorted = Object.entries(db.stats)
      .map(([id, s]) => ({ id, total: (s.searches || 0) + (s.ratings || 0) + (s.reviews || 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    const embed = new EmbedBuilder()
      .setTitle(E.trophy + E.fire + " Leaderboard | Top Users")
      .setColor(0xf39c12)
      .setDescription(
        sorted.length === 0
          ? E.sleep + " No data yet."
          : sorted.map((u, i) =>
              ([E.gold, E.silver, E.bronze][i] || "**" + (i + 1) + ".**") +
              " <@" + u.id + "> \u2014 " + E.spark + " **" + u.total + "** actions"
            ).join("\n")
      )
      .setFooter({ text: "Total = searches + ratings + reviews" })
      .setTimestamp();
    return reply({ embeds: [embed] });
  }

  if (cmd === "ps") {
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("psmenu")
        .setPlaceholder("Choose a game...")
        .addOptions([
          { label: "Blox Fruits", value: "bf"    },
          { label: "Fisch",       value: "fisch" }
        ])
    );
    const sent = await reply({
      content:    E.game + " **Private Server** | Choose your game:",
      components: [row],
      fetchReply: true
    });
    const collector = sent.createMessageComponentCollector({ time: 60000 });
    collector.on("collect", async (i) => {
      if (i.user.id !== userId) return;
      const link = db.ps[i.values[0]];
      i.reply(link ? E.link + E.check + " **PS Link:** " + link : E.cross + " Not set yet!");
    });
  }

  if (cmd === "setps") {
    if (!isOwner(userId)) return reply(t(userId, "ownerOnly"));
    const game = args[0], link = args[1];
    if (!game || !link) return reply(E.warn + " Usage: `setps <bf|fisch> <link>`");
    db.ps[game] = link;
    saveDB();
    return reply(E.check + E.link + " PS link for **" + game + "** updated!");
  }

  if (cmd === "favorite") {
    const fav = db.favorites[userId];
    if (!fav || fav.length === 0) return reply(E.sleep + E.cross + " Favorites list is empty!");
    const embed = new EmbedBuilder()
      .setTitle(E.heart + E.spark + " Your Favorites")
      .setColor(0xe74c3c)
      .setFooter({ text: fav.length + " favorite(s)" });
    fav.forEach(s => {
      embed.addFields({ name: E.scroll + " " + s.title, value: E.link + " https://scriptblox.com/script/" + s.slug });
    });
    return reply({ embeds: [embed] });
  }

  const hasMod = member?.permissions?.has(PermissionFlagsBits.ModerateMembers);

  if (cmd === "ban") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const reason   = args.slice(1).join(" ") || "No reason";
    if (!targetId) return reply(E.warn + " Usage: `ban <@user> [reason]`");
    if (!db.banned.includes(targetId)) db.banned.push(targetId);
    saveDB();
    return reply(E.hammer + E.ban + " <@" + targetId + "> **banned** from bot!\n" + E.pen + " **Reason:** " + reason);
  }

  if (cmd === "unban") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) return reply(E.warn + " Usage: `unban <@user>`");
    db.banned = db.banned.filter(id => id !== targetId);
    saveDB();
    return reply(E.check + E.lock + " <@" + targetId + "> **unbanned**!");
  }

  if (cmd === "kick") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const reason   = args.slice(1).join(" ") || "No reason";
    if (!targetId) return reply(E.warn + " Usage: `kick <@user> [reason]`");
    try {
      const guildMember = await guild.members.fetch(targetId);
      await guildMember.kick(reason);
      return reply(E.kick + E.wind + " <@" + targetId + "> **kicked**!\n" + E.pen + " **Reason:** " + reason);
    } catch {
      return reply(E.cross + " Failed to kick. Check my permissions.");
    }
  }

  if (cmd === "timeout") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const minutes  = parseInt(args[1]) || 5;
    const reason   = args.slice(2).join(" ") || "No reason";
    if (!targetId) return reply(E.warn + " Usage: `timeout <@user> <minutes> [reason]`");
    try {
      const guildMember = await guild.members.fetch(targetId);
      await guildMember.timeout(minutes * 60 * 1000, reason);
      return reply(E.clock + " <@" + targetId + "> timed out **" + minutes + " min**!\n" + E.pen + " **Reason:** " + reason);
    } catch {
      return reply(E.cross + " Failed to timeout. Check my permissions.");
    }
  }

  if (cmd === "warn") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const reason   = args.slice(1).join(" ");
    if (!targetId || !reason) return reply(E.warn + " Usage: `warn <@user> <reason>`");
    if (!db.warns[targetId]) db.warns[targetId] = [];
    db.warns[targetId].push({ reason, time: Date.now(), by: userId });
    saveDB();
    const count = db.warns[targetId].length;
    return reply(E.warn + E.bell + " <@" + targetId + "> warned! (**" + count + "** total)\n" + E.pen + " **Reason:** " + reason);
  }

  if (cmd === "warns") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) return reply(E.warn + " Usage: `warns <@user>`");
    const warns = db.warns[targetId];
    if (!warns || warns.length === 0) return reply(E.check + " <@" + targetId + "> has no warns!");
    const embed = new EmbedBuilder()
      .setTitle(E.warn + " Warns | <@" + targetId + ">")
      .setColor(0xe67e22)
      .setDescription(warns.map((w, i) => "**" + (i + 1) + ".** " + w.reason + "\n" + E.cop + " by <@" + w.by + ">").join("\n\n"))
      .setFooter({ text: "Total warns: " + warns.length });
    return reply({ embeds: [embed] });
  }

  if (cmd === "clearwarns") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) return reply(E.warn + " Usage: `clearwarns <@user>`");
    db.warns[targetId] = [];
    saveDB();
    return reply(E.broom + E.check + " All warns cleared for <@" + targetId + ">!");
  }

  if (cmd === "mute") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    const minutes  = parseInt(args[1]) || 10;
    if (!targetId) return reply(E.warn + " Usage: `mute <@user> <minutes>`");
    db.muted[targetId] = Date.now() + minutes * 60 * 1000;
    saveDB();
    return reply(E.mute + E.silent + " <@" + targetId + "> muted for **" + minutes + " min**!");
  }

  if (cmd === "unmute") {
    if (!hasMod && !isOwner(userId)) return reply(t(userId, "noPerms"));
    const targetId = args[0]?.replace(/[<@!>]/g, "");
    if (!targetId) return reply(E.warn + " Usage: `unmute <@user>`");
    delete db.muted[targetId];
    saveDB();
    return reply(E.unmute + E.check + " <@" + targetId + "> **unmuted**!");
  }

  if (cmd === "autopost") {
    if (!isOwner(userId)) return reply(t(userId, "ownerOnly"));
    const action = args[0];
    if (action === "on") {
      const channelId = args[1];
      const interval  = parseInt(args[2]) || 30;
      if (!channelId) return reply(E.warn + " Usage: `autopost on <channelId> [minutes]`");
      db.autopost = { enabled: true, channel: channelId, interval };
      saveDB();
      startAutopost();
      return reply(E.check + E.signal + " Autopost **ON**!\n" + E.mega + " Channel: <#" + channelId + ">\n" + E.timer + " Every **" + interval + " min**");
    }
    if (action === "off") {
      db.autopost.enabled = false;
      saveDB();
      if (autopostTimer) clearInterval(autopostTimer);
      return reply(E.stop + E.signal + " Autopost **OFF**!");
    }
    return reply(E.warn + " Usage: `autopost on <channelId> [minutes]` | `autopost off`");
  }
};

// ===== MESSAGE HANDLER =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (db.channels.length && !db.channels.includes(message.channel.id)) return;
  const used = PREFIX.find(p => message.content.startsWith(p));
  if (!used) return;
  const args = message.content.slice(used.length).trim().split(/\s+/);
  const cmd  = args.shift().toLowerCase();
  try {
    await handleCommand(cmd, args, (c) => message.reply(c), message.author.id, message.member, message.guild);
  } catch (e) {
    console.error("Prefix error:", e);
    message.reply(E.cross + " Error occurred.").catch(() => {});
  }
});

// ===== SLASH HANDLER =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd    = interaction.commandName;
  const userId = interaction.user.id;

  const buildArgs = () => {
    const opts = interaction.options;
    switch (cmd) {
      case "search":     return [opts.getString("query")];
      case "rate":       return [opts.getString("slug"), String(opts.getInteger("stars"))];
      case "review":     return [opts.getString("slug"), opts.getString("text")];
      case "reviews":    return [opts.getString("slug")];
      case "lang":       return [opts.getString("lang")];
      case "stats":      return opts.getUser("user") ? [opts.getUser("user").id] : [];
      case "ban":        return [opts.getUser("user").id, opts.getString("reason") || "No reason"];
      case "unban":      return [opts.getUser("user").id];
      case "kick":       return [opts.getUser("user").id, opts.getString("reason") || "No reason"];
      case "timeout":    return [opts.getUser("user").id, String(opts.getInteger("minutes")), opts.getString("reason") || "No reason"];
      case "warn":       return [opts.getUser("user").id, opts.getString("reason")];
      case "warns":      return [opts.getUser("user").id];
      case "clearwarns": return [opts.getUser("user").id];
      case "mute":       return [opts.getUser("user").id, String(opts.getInteger("minutes"))];
      case "unmute":     return [opts.getUser("user").id];
      case "autopost": {
        const action   = opts.getString("action");
        const ch       = opts.getString("channel") || "";
        const interval = opts.getInteger("interval") || 30;
        return [action, ch, String(interval)];
      }
      default: return [];
    }
  };

  await interaction.deferReply();
  try {
    await handleCommand(cmd, buildArgs(), (c) => interaction.editReply(c), userId, interaction.member, interaction.guild);
  } catch (e) {
    console.error("Slash error:", e);
    interaction.editReply(E.cross + " Error occurred.").catch(() => {});
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);

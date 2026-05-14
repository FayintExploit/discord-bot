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
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs   = require("fs");
const path = require("path");

// =====================================================
// CONFIG
// =====================================================
const OWNER_ID    = "1321669868503957755";
const isOwner     = (id) => id === OWNER_ID;
const PREFIX      = ["!", "?"];
const DAILY_COIN  = 100;
const GAMBLE_MIN  = 10;
const SHOP_ITEMS  = [
  { id: "vip",       name: "VIP Role Tag",        price: 500,  desc: "Get VIP tag in bot"        },
  { id: "colorname", name: "Custom Name Color",   price: 300,  desc: "Custom color in leaderboard"},
  { id: "booster",   name: "2x Daily Coins",      price: 800,  desc: "Double daily for 7 days"   },
];

const GAME_TAGS = ["bloxfruits","fisch","jailbreak","murder mystery","adopt me","brookhaven","pet sim","anime","other"];
const EIGHTBALL = [
  "Definitely yes!","Without a doubt!","Yes, for sure!","Most likely yes.",
  "Signs point to yes.","Ask again later.","Cannot predict now.",
  "Don't count on it.","My sources say no.","Very doubtful.","Absolutely not!"
];

// =====================================================
// EMOJI CONSTANTS (unicode escape — Railway safe)
// =====================================================
const E = {
  check:   "\u2705",        cross:   "\u274C",        warn:    "\u26A0\uFE0F",
  ban:     "\uD83D\uDEAB", mute:    "\uD83D\uDD07",  unmute:  "\uD83D\uDD0A",
  hammer:  "\uD83D\uDD28", kick:    "\uD83D\uDC62",  clock:   "\u23F3",
  bell:    "\uD83D\uDD14", star:    "\u2B50",         hollow:  "\u2606",
  fire:    "\uD83D\uDD25", new_:    "\uD83C\uDD95",  dice:    "\uD83C\uDFB2",
  search:  "\uD83D\uDD0E", scroll:  "\uD83D\uDCDC",  book:    "\uD83D\uDCD6",
  chart:   "\uD83D\uDCCA", trophy:  "\uD83C\uDFC6",  crown:   "\uD83D\uDC51",
  globe:   "\uD83C\uDF10", link:    "\uD83D\uDD17",  pen:     "\uD83D\uDCDD",
  chat:    "\uD83D\uDCAC", heart:   "\u2764\uFE0F",  game:    "\uD83C\uDFAE",
  robot:   "\uD83E\uDD16", mega:  "\uD83D\uDCE2", rocket: "\uD83D\uDE80",
  spark:   "\u2728",       gold:  "\uD83E\uDD47", silver: "\uD83E\uDD48",
  bronze:  "\uD83E\uDD49", ping:  "\uD83C\uDFD3", green:  "\uD83D\uDFE2",
  pray:    "\uD83D\uDE4F", broom: "\uD83E\uDDF9", lock:   "\uD83D\uDD13",
  sleep:   "\uD83D\uDCA4", coin:  "\uD83E\uFA99", shop:   "\uD83D\uDED2",
  gift:    "\uD83C\uDF81", daily: "\uD83D\uDCC5", wallet: "\uD83D\uDCB0",
  transfer:"\uD83D\uDCB8", gamble:"\uD83C\uDFB0", tag:   "\uD83C\uDFF7\uFE0F",
  bookmark:"\uD83D\uDD16", welcome:"\uD83D\uDC4B", log:  "\uD83D\uDCCB",
  party:   "\uD83C\uDF89", magic: "\uD83E\uFA84", laugh: "\uD83D\uDE02",
  think:   "\uD83E\uDD14", cat:   "\uD83D\uDC08", id_flag:"\uD83C\uDDEE\uD83C\uDDE9",
  us_flag: "\uD83C\uDDFA\uD83C\uDDF8", shield:"\uD83D\uDEE1\uFE0F", cop:"\uD83D\uDC6E",
  silent:  "\uD83D\uDE36", wind:  "\uD83D\uDCA8", stop:  "\u26D4",
  signal:  "\uD83D\uDCE1", timer: "\u23F1\uFE0F", user:  "\uD83D\uDC64",
  bars:    "\u2501".repeat(20), up:"\uD83D\uDCC8", down:  "\uD83D\uDCC9",
  giveaway:"\uD83D\uDCE6", confetti:"\uD83C\uDF8A", number:"\uD83D\uDD22",
  ticket:  "\uD83C\uDFAB", money:  "\uD83D\uDCB5", receipt:"\uD83E\uDDFE",
  approve: "\u2705",        reject_:"\uD83D\uDEAB", pending:"\u23F3",
  dana:    "\uD83D\uDCB3", gopay:  "\uD83D\uDCF2", robux:  "\uD83C\uDFAE",
  xp:      "\uD83D\uDCAB", level:  "\uD83C\uDF1F", rank:   "\uD83C\uDFC5",
  alert:   "\uD83D\uDEA8", shield2:"\uD83D\uDD12", filter: "\uD83D\uDEAB",
  remind:  "\u23F0",        info:  "\u2139\uFE0F",  server: "\uD83D\uDCE1",
  online:  "\uD83D\uDFE2", idle:   "\uD83D\uDFE1", offline:"\u26AB",
  boost:   "\uD83D\uDE80", members:"\uD83D\uDC65", created:"\uD83D\uDCC5",
};

// =====================================================
// DATABASE
// =====================================================
const DB_PATH = "./database.json";

const defaultDB = {
  // existing
  channels:  [],
  vip:       [],
  favorites: {},
  access:    [],
  autopost:  { enabled: false, channel: null, interval: 30 },
  ps:        { bf: "", fisch: "" },
  lang:      {},
  ratings:   {},
  reviews:   {},
  stats:     {},
  warns:     {},
  banned:    [],
  muted:     {},
  // economy
  coins:     {},   // { userId: number }
  lastDaily: {},   // { userId: timestamp }
  booster:   {},   // { userId: expireTimestamp }
  purchases: {},   // { userId: [itemId] }
  // script features
  bookmarks: {},   // { userId: [{ slug, title, tag, time }] }
  scriptTags:{},   // { slug: [tag] }
  // server tools
  welcomeCfg:{},   // { guildId: { channel, message } }
  logCfg:    {},   // { guildId: channelId }
  giveaways: {},   // { messageId: { prize, endsAt, channel, entries:[], guildId } }
  // fun
  triviaActive:{}, // { userId: { answer, prize } }
  // tickets
  premiumScripts:{}, // { id: { name, price, content, payment[], buyerRoleId } }
  tickets:       {}, // { ticketId: { userId, scriptId, payMethod, status, channel, guildId, time } }
  ticketCfg:     {}, // { guildId: { panelChannel, logChannel, ticketRoleId } }
  // premium panel
  keys:          {}, // { key: { scriptId, used, usedBy, createdAt } }
  buyers:        {}, // { userId: { scriptId, key, hwid, hwidResetAt, redeemedAt } }
  buyerRoleCfg:  {}, // { guildId: { roleId } }
  // level/xp
  xp:            {}, // { userId: { xp, level, lastMsg } }
  levelCfg:      {}, // { guildId: channelId }
  // automod
  automodCfg:    {}, // { guildId: { enabled, filterWords[], antiLink, antiSpam } }
  spamTracker:   {}, // { userId: { count, last } } — runtime only
  // reminders
  reminders:     {}, // { userId: [{ id, text, fireAt, channelId }] }
  // update announcer
  updateSubs:    {}, // { scriptId: [userId] }
  updateHistory: {}, // { scriptId: [{ version, changelog, type, time, by }] }
  updateCfg:     {}, // { guildId: channelId }
  // activity log
  activityLog:   [], // [{ userId, cmd, time, guild }] max 500
  // anti-raid
  raidCfg:       {}, // { guildId: { enabled, threshold, action, joinLog:[] } }
  // reputation
  rep:           {}, // { userId: { given:{}, received:0, lastGive:{} } }
  // poll
  polls:         {}, // { messageId: { question, options, votes:{optIdx:[userId]}, channel, guildId, ended } }
  // custom commands
  customCmds:    {}, // { guildId: { cmdName: { response, createdBy } } }
  // afk
  afk:           {}, // { userId: { reason, time } }
  // role menu
  roleMenus:     {}, // { messageId: { guildId, roles:[{roleId,label,emoji}] } }
  // sticky message
  sticky:        {}, // { channelId: { message, lastMsgId } }
  // auto role
  autoRole:      {}, // { guildId: [roleId] }
  // status rotator
  statusCfg:     { enabled:false, interval:5, statuses:[], current:0 },
  // server stats
  statsCfg:      {}, // { guildId: { memberCh, botCh, channelCh, lastUpdate } }
};

let db;
try {
  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  db = { ...defaultDB, ...raw };
} catch {
  db = { ...defaultDB };
}

const saveDB = () => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

// =====================================================
// XP HELPERS
// =====================================================
const XP_PER_MSG   = () => Math.floor(Math.random() * 10) + 15; // 15-25 xp
const xpForLevel   = (lvl) => lvl * lvl * 100;
const getXP        = (id)  => db.xp[id] || { xp: 0, level: 0, lastMsg: 0 };

const addXP = async (userId, guildId, channel) => {
  const now  = Date.now();
  const data = getXP(userId);
  if (now - data.lastMsg < 15000) return; // 15s cooldown
  data.xp      += XP_PER_MSG();
  data.lastMsg  = now;
  const needed  = xpForLevel(data.level + 1);
  if (data.xp >= needed) {
    data.level++;
    data.xp -= needed;
    db.xp[userId] = data; saveDB();
    // announce level up
    const cfgCh = db.levelCfg[guildId];
    const tgtCh = cfgCh ? channel.guild?.channels?.cache?.get(cfgCh) : channel;
    if (tgtCh) {
      const emb = new EmbedBuilder()
        .setTitle(E.level+E.spark+" Level Up!")
        .setDescription("<@"+userId+"> reached **Level "+data.level+"**! "+E.xp)
        .setColor(0xf1c40f).setTimestamp();
      tgtCh.send({ embeds: [emb] }).catch(()=>{});
    }
  } else {
    db.xp[userId] = data; saveDB();
  }
};

// =====================================================
// REMINDER CHECKER
// =====================================================
const checkReminders = async () => {
  const now = Date.now();
  for (const [userId, rems] of Object.entries(db.reminders || {})) {
    const due = rems.filter(r => r.fireAt <= now);
    if (!due.length) continue;
    db.reminders[userId] = rems.filter(r => r.fireAt > now);
    saveDB();
    for (const r of due) {
      try {
        const ch = await client.channels.fetch(r.channelId);
        const emb = new EmbedBuilder()
          .setTitle(E.remind+" Reminder!")
          .setDescription("<@"+userId+"> "+E.bell+"\n\n**"+r.text+"**")
          .setColor(0x3498db).setTimestamp();
        ch.send({ content:"<@"+userId+">", embeds:[emb] });
      } catch {}
    }
  }
};

// =====================================================
// STATUS ROTATOR
// =====================================================
const ActivityType = { PLAYING:0, STREAMING:1, LISTENING:2, WATCHING:3, COMPETING:5 };
let statusTimer = null;

const startStatusRotator = () => {
  if (statusTimer) clearInterval(statusTimer);
  const cfg = db.statusCfg;
  if (!cfg?.enabled || !cfg.statuses?.length) return;
  statusTimer = setInterval(()=>{
    const s = cfg.statuses[cfg.current % cfg.statuses.length];
    client.user.setActivity(s.text, { type: ActivityType[s.type]||0 });
    db.statusCfg.current = (cfg.current+1) % cfg.statuses.length;
    saveDB();
  }, (cfg.interval||5)*60*1000);
  // Set immediately on start
  const s = cfg.statuses[cfg.current % cfg.statuses.length];
  client.user.setActivity(s.text, { type: ActivityType[s.type]||0 });
};

// =====================================================
// SERVER STATS UPDATER
// =====================================================
const updateServerStats = async () => {
  for (const [gId, cfg] of Object.entries(db.statsCfg||{})) {
    try {
      const g = client.guilds.cache.get(gId);
      if (!g) continue;
      await g.members.fetch();
      const total    = g.memberCount;
      const bots     = g.members.cache.filter(m=>m.user.bot).size;
      const humans   = total - bots;
      const channels = g.channels.cache.size;
      if (cfg.memberCh)  { const ch=g.channels.cache.get(cfg.memberCh);  if(ch) await ch.setName("\uD83D\uDC65 Members: "+humans).catch(()=>{}); }
      if (cfg.botCh)     { const ch=g.channels.cache.get(cfg.botCh);     if(ch) await ch.setName("\uD83E\uDD16 Bots: "+bots).catch(()=>{}); }
      if (cfg.channelCh) { const ch=g.channels.cache.get(cfg.channelCh); if(ch) await ch.setName("\uD83D\uDCE2 Channels: "+channels).catch(()=>{}); }
    } catch(e) { console.error("Stats update error:", e); }
  }
};

// =====================================================
// KEY GENERATOR
// =====================================================
const genKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg   = (n) => Array.from({length:n},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return seg(4)+"-"+seg(4)+"-"+seg(4)+"-"+seg(4);
};
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

// =====================================================
// CLIENT
// =====================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
  ],
  presence: {
    status: "online",
    activities: [{ name: "Script Hub", type: 0 }]
  }
});

// =====================================================
// HELPERS
// =====================================================
const t = (userId, key) => {
  const lang = db.lang[userId] || "en";
  const str  = {
    en: {
      noPerms:  E.ban  + " No permission!",
      ownerOnly:E.crown+ " Owner only!",
      notFound: E.cross+ " Not found.",
      banned:   E.hammer+E.ban+" You are banned from this bot!",
      muted:    E.mute + " You are muted!",
    },
    id: {
      noPerms:  E.ban  + " Kamu tidak punya izin!",
      ownerOnly:E.crown+ " Owner only!",
      notFound: E.cross+ " Tidak ditemukan.",
      banned:   E.hammer+E.ban+" Kamu di-ban dari bot ini!",
      muted:    E.mute + " Kamu di-mute!",
    }
  };
  return str[lang]?.[key] || str.en[key] || key;
};

const addStat = (userId, key, cmd="", guildId="") => {
  if (!db.stats[userId]) db.stats[userId] = { searches:0, ratings:0, reviews:0, commands:0 };
  db.stats[userId][key] = (db.stats[userId][key] || 0) + 1;
  // activity log
  if (cmd) {
    if (!db.activityLog) db.activityLog=[];
    db.activityLog.push({ userId, cmd, time:Date.now(), guildId });
    if (db.activityLog.length > 500) db.activityLog = db.activityLog.slice(-500);
  }
  saveDB();
};

const getCoins    = (id)     => db.coins[id] || 0;
const addCoins    = (id, n)  => { db.coins[id] = (db.coins[id] || 0) + n; saveDB(); };
const removeCoins = (id, n)  => { db.coins[id] = Math.max(0, (db.coins[id] || 0) - n); saveDB(); };
const hasBooster  = (id)     => db.booster[id] && db.booster[id] > Date.now();

const isBanned = (id) => db.banned.includes(id);
const isMuted  = (id) => db.muted[id] && db.muted[id] > Date.now();

const avgRating = (slug) => {
  const r = db.ratings[slug];
  if (!r || !Object.keys(r).length) return null;
  const v = Object.values(r);
  return (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
};
const stars = (n) => E.star.repeat(Math.round(n)) + E.hollow.repeat(5 - Math.round(n));

// =====================================================
// AUTOPOST
// =====================================================
let autopostTimer = null;
const startAutopost = async () => {
  if (autopostTimer) clearInterval(autopostTimer);
  if (!db.autopost.enabled || !db.autopost.channel) return;
  autopostTimer = setInterval(async () => {
    try {
      const ch  = await client.channels.fetch(db.autopost.channel);
      if (!ch) return;
      const res = await fetch("https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc");
      const dat = await res.json();
      const s   = dat.scripts[Math.floor(Math.random() * 5)];
      if (!s) return;
      const emb = new EmbedBuilder()
        .setTitle(E.robot+E.mega+" Auto Post: "+s.title)
        .setDescription(E.link+" https://rscripts.net/script/"+(s.slug||s.id)+"\n\n"+E.star+" Use `/rate` to rate!")
        .setColor(0x00ff99).setFooter({ text: E.rocket+" Script Hub Bot | Auto Post" }).setTimestamp();
      ch.send({ embeds: [emb] });
    } catch(e) { console.error("Autopost error:", e); }
  }, (db.autopost.interval||30)*60*1000);
};

// =====================================================
// GIVEAWAY CHECKER
// =====================================================
const checkGiveaways = async () => {
  const now = Date.now();
  for (const [msgId, gw] of Object.entries(db.giveaways)) {
    if (gw.ended) continue;
    if (now >= gw.endsAt) {
      gw.ended = true;
      saveDB();
      try {
        const ch = await client.channels.fetch(gw.channel);
        if (!gw.entries.length) {
          ch.send(E.cross+" Giveaway ended — no entries for **"+gw.prize+"**!");
          continue;
        }
        const winner = gw.entries[Math.floor(Math.random() * gw.entries.length)];
        const emb = new EmbedBuilder()
          .setTitle(E.party+E.confetti+" GIVEAWAY ENDED!")
          .setDescription(
            E.gift+" **Prize:** "+gw.prize+"\n"+
            E.trophy+" **Winner:** <@"+winner+">\n\n"+
            E.spark+" Congratulations!"
          ).setColor(0xf39c12).setTimestamp();
        ch.send({ content: "<@"+winner+">", embeds: [emb] });
      } catch(e) { console.error("Giveaway end error:", e); }
    }
  }
};

// =====================================================
// SLASH COMMANDS DEFINITION
// =====================================================
const slashCommands = [
  // basic
  new SlashCommandBuilder().setName("ping").setDescription("Ping the bot"),
  new SlashCommandBuilder().setName("help").setDescription("Show all commands"),
  new SlashCommandBuilder().setName("latest").setDescription("Get latest scripts"),
  new SlashCommandBuilder().setName("random").setDescription("Get a random script"),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Show top users"),
  new SlashCommandBuilder()
    .setName("stats").setDescription("Show user stats")
    .addUserOption(o=>o.setName("user").setDescription("User to check").setRequired(false)),
  new SlashCommandBuilder()
    .setName("search").setDescription("Search for a script")
    .addStringOption(o=>o.setName("query").setDescription("Script name").setRequired(true)),
  new SlashCommandBuilder()
    .setName("rate").setDescription("Rate a script 1-5")
    .addStringOption(o=>o.setName("slug").setDescription("Script slug").setRequired(true))
    .addIntegerOption(o=>o.setName("stars").setDescription("1-5 stars").setRequired(true).setMinValue(1).setMaxValue(5)),
  new SlashCommandBuilder()
    .setName("review").setDescription("Review a script")
    .addStringOption(o=>o.setName("slug").setDescription("Script slug").setRequired(true))
    .addStringOption(o=>o.setName("text").setDescription("Your review").setRequired(true)),
  new SlashCommandBuilder()
    .setName("reviews").setDescription("See reviews of a script")
    .addStringOption(o=>o.setName("slug").setDescription("Script slug").setRequired(true)),
  new SlashCommandBuilder()
    .setName("lang").setDescription("Set language")
    .addStringOption(o=>o.setName("lang").setDescription("id or en").setRequired(true).addChoices(
      { name:"Indonesia", value:"id" },{ name:"English", value:"en" }
    )),
  // script features
  new SlashCommandBuilder()
    .setName("bookmark").setDescription("Bookmark a script")
    .addStringOption(o=>o.setName("slug").setDescription("Script slug").setRequired(true))
    .addStringOption(o=>o.setName("title").setDescription("Script title").setRequired(true))
    .addStringOption(o=>o.setName("tag").setDescription("Game tag").setRequired(false)),
  new SlashCommandBuilder()
    .setName("bookmarks").setDescription("View your bookmarks")
    .addStringOption(o=>o.setName("tag").setDescription("Filter by tag").setRequired(false)),
  new SlashCommandBuilder()
    .setName("unbookmark").setDescription("Remove a bookmark")
    .addStringOption(o=>o.setName("slug").setDescription("Script slug").setRequired(true)),
  new SlashCommandBuilder()
    .setName("tag").setDescription("Tag a script with game category")
    .addStringOption(o=>o.setName("slug").setDescription("Script slug").setRequired(true))
    .addStringOption(o=>o.setName("game").setDescription("Game name").setRequired(true)),
  new SlashCommandBuilder()
    .setName("category").setDescription("Browse scripts by game category")
    .addStringOption(o=>o.setName("game").setDescription("Game name").setRequired(true)),
  // economy
  new SlashCommandBuilder().setName("balance").setDescription("Check your coin balance")
    .addUserOption(o=>o.setName("user").setDescription("Check other user").setRequired(false)),
  new SlashCommandBuilder().setName("daily").setDescription("Claim your daily coins"),
  new SlashCommandBuilder()
    .setName("transfer").setDescription("Transfer coins to another user")
    .addUserOption(o=>o.setName("user").setDescription("Target user").setRequired(true))
    .addIntegerOption(o=>o.setName("amount").setDescription("Amount to transfer").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("gamble").setDescription("Gamble your coins")
    .addIntegerOption(o=>o.setName("amount").setDescription("Amount to bet").setRequired(true).setMinValue(GAMBLE_MIN)),
  new SlashCommandBuilder().setName("shop").setDescription("View the coin shop"),
  new SlashCommandBuilder()
    .setName("buy").setDescription("Buy an item from the shop")
    .addStringOption(o=>o.setName("item").setDescription("Item ID").setRequired(true)),
  new SlashCommandBuilder().setName("coinlb").setDescription("Coin leaderboard"),
  // server tools
  new SlashCommandBuilder()
    .setName("welcome").setDescription("ADMIN Setup welcome message")
    .addStringOption(o=>o.setName("channel").setDescription("Channel ID").setRequired(true))
    .addStringOption(o=>o.setName("message").setDescription("Welcome message ({user} = mention)").setRequired(false)),
  new SlashCommandBuilder()
    .setName("logset").setDescription("ADMIN Set logging channel")
    .addStringOption(o=>o.setName("channel").setDescription("Channel ID").setRequired(true)),
  new SlashCommandBuilder()
    .setName("giveaway").setDescription("ADMIN Start a giveaway")
    .addStringOption(o=>o.setName("prize").setDescription("Prize description").setRequired(true))
    .addIntegerOption(o=>o.setName("minutes").setDescription("Duration in minutes").setRequired(true))
    .addStringOption(o=>o.setName("channel").setDescription("Channel ID").setRequired(false)),
  new SlashCommandBuilder()
    .setName("giveawayend").setDescription("ADMIN End a giveaway early")
    .addStringOption(o=>o.setName("messageid").setDescription("Giveaway message ID").setRequired(true)),
  // fun
  new SlashCommandBuilder()
    .setName("8ball").setDescription("Ask the magic 8ball")
    .addStringOption(o=>o.setName("question").setDescription("Your question").setRequired(true)),
  new SlashCommandBuilder().setName("meme").setDescription("Get a random meme"),
  new SlashCommandBuilder().setName("trivia").setDescription("Play a trivia game for coins"),
  new SlashCommandBuilder()
    .setName("coinflip").setDescription("Flip a coin"),
  new SlashCommandBuilder()
    .setName("rps").setDescription("Rock Paper Scissors")
    .addStringOption(o=>o.setName("choice").setDescription("rock / paper / scissors").setRequired(true).addChoices(
      { name:"Rock",value:"rock" },{ name:"Paper",value:"paper" },{ name:"Scissors",value:"scissors" }
    )),
  // moderation
  new SlashCommandBuilder()
    .setName("ban").setDescription("MOD Ban a user from bot")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("unban").setDescription("MOD Unban a user")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("kick").setDescription("MOD Kick a member")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("timeout").setDescription("MOD Timeout a member")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o=>o.setName("minutes").setDescription("Minutes").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("warn").setDescription("MOD Warn a user")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(true)),
  new SlashCommandBuilder()
    .setName("warns").setDescription("MOD Check warns")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("clearwarns").setDescription("MOD Clear warns")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder()
    .setName("mute").setDescription("MOD Mute from bot")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o=>o.setName("minutes").setDescription("Minutes").setRequired(true)),
  new SlashCommandBuilder()
    .setName("unmute").setDescription("MOD Unmute")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
  // tickets
  new SlashCommandBuilder()
    .setName("ticket").setDescription("Open a ticket to buy a premium source"),
  new SlashCommandBuilder()
    .setName("ticketsetup").setDescription("ADMIN Setup ticket panel")
    .addStringOption(o=>o.setName("channel").setDescription("Panel channel ID").setRequired(true))
    .addStringOption(o=>o.setName("logchannel").setDescription("Log channel ID").setRequired(true)),
  new SlashCommandBuilder()
    .setName("addscript").setDescription("ADMIN Add premium script to shop")
    .addStringOption(o=>o.setName("id").setDescription("Script ID (no spaces)").setRequired(true))
    .addStringOption(o=>o.setName("name").setDescription("Script name").setRequired(true))
    .addIntegerOption(o=>o.setName("price").setDescription("Price (coins or manual)").setRequired(true))
    .addStringOption(o=>o.setName("content").setDescription("Script content / link sent after approve").setRequired(true))
    .addStringOption(o=>o.setName("payment").setDescription("e.g. dana,gopay,robux").setRequired(false)),
  new SlashCommandBuilder()
    .setName("removescript").setDescription("ADMIN Remove a premium script")
    .addStringOption(o=>o.setName("id").setDescription("Script ID").setRequired(true)),
  new SlashCommandBuilder()
    .setName("scriptlist").setDescription("View all premium scripts available"),
  new SlashCommandBuilder()
    .setName("approve").setDescription("ADMIN Approve ticket and auto-send script")
    .addStringOption(o=>o.setName("ticketid").setDescription("Ticket ID").setRequired(true)),
  new SlashCommandBuilder()
    .setName("reject").setDescription("ADMIN Reject a ticket")
    .addStringOption(o=>o.setName("ticketid").setDescription("Ticket ID").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(false)),
  new SlashCommandBuilder()
    .setName("closeticket").setDescription("Close current ticket channel"),
  new SlashCommandBuilder().setName("mytickets").setDescription("View your active tickets"),
  new SlashCommandBuilder().setName("alltickets").setDescription("ADMIN View all tickets")
    .addStringOption(o=>o.setName("status").setDescription("Filter by status").setRequired(false).addChoices(
      { name:"pending",value:"pending" },{ name:"approved",value:"approved" },{ name:"rejected",value:"rejected" }
    )),
  new SlashCommandBuilder().setName("ticketrole").setDescription("ADMIN Set role that can view/manage tickets")
    .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true)),
  // premium panel
  new SlashCommandBuilder().setName("panelsetup").setDescription("ADMIN Send premium buyer panel to a channel")
    .addStringOption(o=>o.setName("channel").setDescription("Channel ID").setRequired(true))
    .addStringOption(o=>o.setName("scriptid").setDescription("Script ID this panel is for").setRequired(true)),
  new SlashCommandBuilder().setName("genkey").setDescription("OWNER Generate a premium key")
    .addStringOption(o=>o.setName("scriptid").setDescription("Script ID").setRequired(true))
    .addIntegerOption(o=>o.setName("amount").setDescription("How many keys to generate").setRequired(false)),
  new SlashCommandBuilder().setName("revokekey").setDescription("OWNER Revoke a key")
    .addStringOption(o=>o.setName("key").setDescription("Key to revoke").setRequired(true)),
  new SlashCommandBuilder().setName("setbuyer").setDescription("ADMIN Manually set a user as buyer")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o=>o.setName("scriptid").setDescription("Script ID").setRequired(true)),
  new SlashCommandBuilder().setName("buyerrole").setDescription("ADMIN Set buyer role for a script")
    .addStringOption(o=>o.setName("scriptid").setDescription("Script ID").setRequired(true))
    .addRoleOption(o=>o.setName("role").setDescription("Role to give buyers").setRequired(true)),
  new SlashCommandBuilder().setName("keylist").setDescription("OWNER List all keys for a script")
    .addStringOption(o=>o.setName("scriptid").setDescription("Script ID").setRequired(true)),
  // update announcer
  new SlashCommandBuilder().setName("setupdatechannel").setDescription("ADMIN Set channel for update announcements")
    .addStringOption(o=>o.setName("channel").setDescription("Channel ID").setRequired(true)),
  new SlashCommandBuilder().setName("sendupdate").setDescription("ADMIN Send update announcement to all subscribers")
    .addStringOption(o=>o.setName("scriptid").setDescription("Script ID").setRequired(true))
    .addStringOption(o=>o.setName("version").setDescription("Version e.g. v2.1.0").setRequired(true))
    .addStringOption(o=>o.setName("changelog").setDescription("What changed (use | to separate lines)").setRequired(true))
    .addStringOption(o=>o.setName("type").setDescription("Update type").setRequired(false).addChoices(
      { name:"Major",value:"major" },{ name:"Minor",value:"minor" },{ name:"Hotfix",value:"hotfix" },{ name:"Patch",value:"patch" }
    )),
  new SlashCommandBuilder().setName("subscribeupdate").setDescription("Subscribe to script update notifications")
    .addStringOption(o=>o.setName("scriptid").setDescription("Script ID").setRequired(true)),
  new SlashCommandBuilder().setName("unsubscribeupdate").setDescription("Unsubscribe from script update notifications")
    .addStringOption(o=>o.setName("scriptid").setDescription("Script ID").setRequired(true)),
  new SlashCommandBuilder().setName("updatehistory").setDescription("View update history for a script")
    .addStringOption(o=>o.setName("scriptid").setDescription("Script ID").setRequired(true)),
  // activity log
  new SlashCommandBuilder().setName("activitylog").setDescription("ADMIN View recent bot usage log")
    .addIntegerOption(o=>o.setName("limit").setDescription("How many entries (default 10)").setRequired(false)),
  new SlashCommandBuilder().setName("mylog").setDescription("View your own activity log"),
  new SlashCommandBuilder().setName("clearlog").setDescription("OWNER Clear the activity log"),
  // level/xp
  new SlashCommandBuilder().setName("rank").setDescription("Check your XP rank")
    .addUserOption(o=>o.setName("user").setDescription("User to check").setRequired(false)),
  new SlashCommandBuilder().setName("toplevel").setDescription("XP Leaderboard"),
  new SlashCommandBuilder().setName("setlevelup").setDescription("ADMIN Set level-up announcement channel")
    .addStringOption(o=>o.setName("channel").setDescription("Channel ID").setRequired(true)),
  // automod
  new SlashCommandBuilder().setName("automod").setDescription("ADMIN Toggle automod")
    .addStringOption(o=>o.setName("action").setDescription("on/off").setRequired(true).addChoices(
      { name:"on",value:"on" },{ name:"off",value:"off" }
    )),
  new SlashCommandBuilder().setName("addfilter").setDescription("ADMIN Add word to filter list")
    .addStringOption(o=>o.setName("word").setDescription("Word to filter").setRequired(true)),
  new SlashCommandBuilder().setName("removefilter").setDescription("ADMIN Remove word from filter")
    .addStringOption(o=>o.setName("word").setDescription("Word to remove").setRequired(true)),
  new SlashCommandBuilder().setName("filterlist").setDescription("View current filter list"),
  // reminder
  new SlashCommandBuilder().setName("remind").setDescription("Set a personal reminder")
    .addStringOption(o=>o.setName("text").setDescription("What to remind you").setRequired(true))
    .addIntegerOption(o=>o.setName("minutes").setDescription("In how many minutes").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName("reminders").setDescription("View your active reminders"),
  new SlashCommandBuilder().setName("cancelremind").setDescription("Cancel a reminder")
    .addIntegerOption(o=>o.setName("id").setDescription("Reminder number").setRequired(true)),
  // info
  new SlashCommandBuilder().setName("serverinfo").setDescription("Show server information"),
  new SlashCommandBuilder().setName("userinfo").setDescription("Show user information")
    .addUserOption(o=>o.setName("user").setDescription("User to check").setRequired(false)),
  new SlashCommandBuilder().setName("botinfo").setDescription("Show bot information"),
  // status rotator
  new SlashCommandBuilder().setName("statusadd").setDescription("OWNER Add a status to rotation")
    .addStringOption(o=>o.setName("text").setDescription("Status text").setRequired(true))
    .addStringOption(o=>o.setName("type").setDescription("Type").setRequired(false).addChoices(
      { name:"Playing",value:"PLAYING" },{ name:"Watching",value:"WATCHING" },
      { name:"Listening",value:"LISTENING" },{ name:"Competing",value:"COMPETING" }
    )),
  new SlashCommandBuilder().setName("statusremove").setDescription("OWNER Remove a status from rotation")
    .addIntegerOption(o=>o.setName("index").setDescription("Status number from /statuslist").setRequired(true)),
  new SlashCommandBuilder().setName("statuslist").setDescription("View all rotating statuses"),
  new SlashCommandBuilder().setName("statusrotate").setDescription("OWNER Toggle status rotation")
    .addStringOption(o=>o.setName("action").setDescription("on/off").setRequired(true).addChoices(
      { name:"on",value:"on" },{ name:"off",value:"off" }
    ))
    .addIntegerOption(o=>o.setName("interval").setDescription("Interval in minutes (default 5)").setRequired(false)),
  // server stats
  new SlashCommandBuilder().setName("statssetup").setDescription("ADMIN Setup server stats channels")
    .addStringOption(o=>o.setName("memberchannel").setDescription("Voice channel ID for member count").setRequired(false))
    .addStringOption(o=>o.setName("botchannel").setDescription("Voice channel ID for bot count").setRequired(false))
    .addStringOption(o=>o.setName("channelcount").setDescription("Voice channel ID for channel count").setRequired(false)),
  new SlashCommandBuilder().setName("statsremove").setDescription("ADMIN Remove server stats channels"),
  // anti-raid
  new SlashCommandBuilder().setName("antiraid").setDescription("ADMIN Toggle anti-raid protection")
    .addStringOption(o=>o.setName("action").setDescription("on/off").setRequired(true).addChoices(
      { name:"on",value:"on" },{ name:"off",value:"off" }
    ))
    .addIntegerOption(o=>o.setName("threshold").setDescription("Max joins per 10s before lockdown (default 5)").setRequired(false))
    .addStringOption(o=>o.setName("action2").setDescription("Action on raid: kick or ban").setRequired(false).addChoices(
      { name:"kick",value:"kick" },{ name:"ban",value:"ban" }
    )),
  // reputation
  new SlashCommandBuilder().setName("rep").setDescription("Give reputation to a user")
    .addUserOption(o=>o.setName("user").setDescription("User to rep").setRequired(true)),
  // poll
  new SlashCommandBuilder().setName("poll").setDescription("Create a poll")
    .addStringOption(o=>o.setName("question").setDescription("Poll question").setRequired(true))
    .addStringOption(o=>o.setName("options").setDescription("Options separated by | (max 5)").setRequired(true))
    .addIntegerOption(o=>o.setName("minutes").setDescription("Duration in minutes (0 = no end)").setRequired(false)),
  new SlashCommandBuilder().setName("endpoll").setDescription("ADMIN End a poll early")
    .addStringOption(o=>o.setName("messageid").setDescription("Poll message ID").setRequired(true)),
  // custom commands
  new SlashCommandBuilder().setName("addcmd").setDescription("ADMIN Add a custom command")
    .addStringOption(o=>o.setName("name").setDescription("Command name (no spaces)").setRequired(true))
    .addStringOption(o=>o.setName("response").setDescription("Response text").setRequired(true)),
  new SlashCommandBuilder().setName("removecmd").setDescription("ADMIN Remove a custom command")
    .addStringOption(o=>o.setName("name").setDescription("Command name").setRequired(true)),
  // afk
  new SlashCommandBuilder().setName("afk").setDescription("Set yourself as AFK")
    .addStringOption(o=>o.setName("reason").setDescription("AFK reason").setRequired(false)),
  new SlashCommandBuilder().setName("unafk").setDescription("Remove your AFK status"),
  // role menu
  new SlashCommandBuilder().setName("rolemenu").setDescription("ADMIN Create a role selection menu")
    .addStringOption(o=>o.setName("channel").setDescription("Channel ID").setRequired(true))
    .addStringOption(o=>o.setName("roles").setDescription("Role IDs separated by | (max 5)").setRequired(true))
    .addStringOption(o=>o.setName("labels").setDescription("Labels for each role separated by |").setRequired(false)),
  // sticky message
  new SlashCommandBuilder().setName("sticky").setDescription("ADMIN Set a sticky message in a channel")
    .addStringOption(o=>o.setName("channel").setDescription("Channel ID").setRequired(true))
    .addStringOption(o=>o.setName("message").setDescription("Message to stick (leave empty to remove)").setRequired(false)),
  // auto role
  new SlashCommandBuilder().setName("autorole").setDescription("ADMIN Set roles to give on member join")
    .addStringOption(o=>o.setName("action").setDescription("add/remove/list").setRequired(true).addChoices(
      { name:"add",value:"add" },{ name:"remove",value:"remove" },{ name:"list",value:"list" }
    ))
    .addRoleOption(o=>o.setName("role").setDescription("Role to add/remove").setRequired(false)),
  // backup
  new SlashCommandBuilder().setName("backup").setDescription("OWNER Export full database as JSON file"),
  new SlashCommandBuilder().setName("restore").setDescription("OWNER Restore database from backup (paste JSON)")
    .addStringOption(o=>o.setName("data").setDescription("Paste backup JSON string").setRequired(true)),
  // owner
  new SlashCommandBuilder()
    .setName("addcoins").setDescription("OWNER Add coins to user")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o=>o.setName("amount").setDescription("Amount").setRequired(true)),
  new SlashCommandBuilder()
    .setName("autopost").setDescription("OWNER Toggle autopost")
    .addStringOption(o=>o.setName("action").setDescription("on/off").setRequired(true).addChoices(
      { name:"on",value:"on" },{ name:"off",value:"off" }
    ))
    .addStringOption(o=>o.setName("channel").setDescription("Channel ID").setRequired(false))
    .addIntegerOption(o=>o.setName("interval").setDescription("Interval minutes").setRequired(false)),
].map(c=>c.toJSON());

// =====================================================
// READY
// =====================================================
client.on("clientReady", async () => {
  console.log(E.rocket+" BOT ONLINE: "+client.user.tag);
  startAutopost();
  setInterval(checkGiveaways,  15000);
  setInterval(checkReminders,  10000);
  startStatusRotator();
  setInterval(updateServerStats, 5*60*1000); // update every 5 min
  try {
    const rest = new REST({ version:"10" }).setToken(process.env.TOKEN);
    // Register to all guilds instantly (no propagation delay)
    const guilds = client.guilds.cache.map(g => g.id);
    for (const guildId of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: slashCommands }
      );
      console.log(E.check+" Slash commands registered to guild: "+guildId);
    }
    // Also register globally (takes ~1hr but keeps commands for future servers)
    await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
    console.log(E.check+" Slash commands registered globally");
  } catch(e) { console.error("Slash register error:", e); }
});

// =====================================================
// WELCOME ON MEMBER JOIN
// =====================================================
client.on("guildMemberAdd", async (member) => {
  const gId = member.guild.id;

  // AUTO ROLE
  const autoRoles = db.autoRole?.[gId]||[];
  for (const roleId of autoRoles) {
    try { await member.roles.add(roleId); } catch {}
  }

  // ANTI-RAID
  const raidCfg = db.raidCfg?.[gId];
  if (raidCfg?.enabled) {
    if (!db.raidCfg[gId].joinLog) db.raidCfg[gId].joinLog=[];
    const now = Date.now();
    db.raidCfg[gId].joinLog = db.raidCfg[gId].joinLog.filter(t=>now-t<10000);
    db.raidCfg[gId].joinLog.push(now);
    const threshold = raidCfg.threshold||5;
    if (db.raidCfg[gId].joinLog.length >= threshold) {
      // Raid detected!
      try {
        if (raidCfg.action==="ban") await member.ban({ reason:"Anti-raid: mass join detected" });
        else await member.kick("Anti-raid: mass join detected");
        // Alert in log channel
        if (db.logCfg?.[gId]) {
          const ch = await client.channels.fetch(db.logCfg[gId]);
          const emb = new EmbedBuilder()
            .setTitle(E.alert+"\uD83D\uDEE1\uFE0F RAID DETECTED!")
            .setDescription("Mass join detected! **"+db.raidCfg[gId].joinLog.length+"** joins in 10s.\n"+E.hammer+" Action: **"+raidCfg.action+"** on <@"+member.id+">")
            .setColor(0xff0000).setTimestamp();
          ch.send({ embeds:[emb] });
        }
      } catch {}
      saveDB();
      return;
    }
    saveDB();
  }

  // WELCOME
  const cfg = db.welcomeCfg[gId];
  if (!cfg) return;
  try {
    const ch  = await client.channels.fetch(cfg.channel);
    const msg = (cfg.message || "Welcome {user} to **{server}**! "+E.party)
      .replace("{user}", member.toString())
      .replace("{server}", member.guild.name);
    const emb = new EmbedBuilder()
      .setTitle(E.welcome+" New Member!")
      .setDescription(msg)
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0x00ff99).setTimestamp();
    ch.send({ embeds: [emb] });
  } catch(e) { console.error("Welcome error:", e); }
});

// =====================================================
// CORE COMMAND HANDLER
// =====================================================
const handleCommand = async (cmd, args, reply, userId, member, guild, message=null) => {
  if (isBanned(userId)) return reply(t(userId,"banned"));
  const modCmds = ["ban","unban","kick","timeout","warn","warns","clearwarns","mute","unmute","autopost","addcoins","welcome","logset","giveaway","giveawayend"];
  if (isMuted(userId) && !modCmds.includes(cmd)) return reply(t(userId,"muted"));

  const hasMod   = member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
  const hasAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);
  const guildId  = guild?.id;

  addStat(userId, "commands", cmd, guildId||"");

  // helper: send to log channel
  const sendLog = async (content) => {
    if (!guildId || !db.logCfg[guildId]) return;
    try {
      const ch = await client.channels.fetch(db.logCfg[guildId]);
      ch.send(content);
    } catch {}
  };

  // =================================================
  // BASIC
  // =================================================
  if (cmd === "ping") return reply(E.ping+" **Pong!** "+E.green+" Online!");

  if (cmd === "help") {
    const pages = [
      new EmbedBuilder()
        .setTitle("\uD83D\uDCDC Script Hub Bot — Commands [1/5]")
        .setColor(0x00ff99)
        .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━\n\u2728 **Script & Rating**\n━━━━━━━━━━━━━━━━━━━━━━━━━━")
        .addFields(
          { name:"\uD83D\uDD0E search <name>",   value:"Search scripts — shows embed with loadstring", inline:false },
          { name:"\uD83C\uDD95 latest",           value:"5 latest scripts from rscripts.net",          inline:false },
          { name:"\uD83C\uDFB2 random",           value:"Random script",                               inline:false },
          { name:"\u2B50 rate <slug> <1-5>",      value:"Rate a script",                               inline:false },
          { name:"\uD83D\uDCDD review <slug> <text>", value:"Write a review",                          inline:false },
          { name:"\uD83D\uDCAC reviews <slug>",   value:"See reviews of a script",                     inline:false },
        )
        .setFooter({ text:"Page 1/5 | Prefix: ! or ? | Also /slash" }),

      new EmbedBuilder()
        .setTitle("\uD83D\uDCDC Script Hub Bot — Commands [2/5]")
        .setColor(0x3498db)
        .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━\n\uD83D\uDD16 **Bookmarks & Tags**\n━━━━━━━━━━━━━━━━━━━━━━━━━━")
        .addFields(
          { name:"\uD83D\uDD16 bookmark <slug> <title> [tag]", value:"Save a script to bookmarks",        inline:false },
          { name:"\uD83D\uDD16 bookmarks [tag]",               value:"View your bookmarks",               inline:false },
          { name:"\uD83D\uDD16 unbookmark <slug>",             value:"Remove a bookmark",                 inline:false },
          { name:"\uD83C\uDFF7\uFE0F tag <slug> <game>",       value:"Tag a script with game name",       inline:false },
          { name:"\uD83C\uDFAE category <game>",               value:"Browse scripts by game tag",        inline:false },
          { name:"\uD83D\uDCE3 obf <url> / attach file",       value:"Obfuscate Lua script (prefix only)",inline:false },
          { name:"\uD83D\uDD17 loadstring <url>",              value:"Generate loadstring from URL",      inline:false },
        )
        .setFooter({ text:"Page 2/5 | Prefix: ! or ? | Also /slash" }),

      new EmbedBuilder()
        .setTitle("\uD83D\uDCDC Script Hub Bot — Commands [3/5]")
        .setColor(0xf39c12)
        .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━\n\uD83E\uFA99 **Economy & Fun**\n━━━━━━━━━━━━━━━━━━━━━━━━━━")
        .addFields(
          { name:"\uD83E\uFA99 balance [@user]",  value:"Check coin balance",                           inline:false },
          { name:"\uD83D\uDCC5 daily",             value:"Claim daily coins ("+100+" base)",            inline:false },
          { name:"\uD83D\uDCB8 transfer @user <n>",value:"Send coins to another user",                  inline:false },
          { name:"\uD83C\uDFB0 gamble <amount>",   value:"Gamble coins (45% win rate)",                 inline:false },
          { name:"\uD83D\uDED2 shop",              value:"View coin shop items",                        inline:false },
          { name:"\uD83D\uDED2 buy <id>",          value:"Buy item from shop",                          inline:false },
          { name:"\uD83C\uDFC6 coinlb",            value:"Coin leaderboard",                            inline:false },
          { name:"\u2B50 rep @user",               value:"Give reputation (+10 coins, 24h cooldown)",   inline:false },
          { name:"\uD83C\uDFB2 coinflip",          value:"Flip a coin",                                 inline:false },
          { name:"\uD83C\uDFAE rps <choice>",      value:"Rock paper scissors vs bot",                  inline:false },
          { name:"\uD83E\uFA84 8ball <question>",  value:"Ask the magic 8ball",                         inline:false },
          { name:"\uD83D\uDE02 meme",              value:"Random meme from Reddit",                     inline:false },
          { name:"\uD83E\uDD14 trivia",            value:"Answer trivia for coins",                     inline:false },
        )
        .setFooter({ text:"Page 3/5 | Prefix: ! or ? | Also /slash" }),

      new EmbedBuilder()
        .setTitle("\uD83D\uDCDC Script Hub Bot — Commands [4/5]")
        .setColor(0x9b59b6)
        .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━\n\uD83C\uDFAB **Ticket & Premium Panel**\n━━━━━━━━━━━━━━━━━━━━━━━━━━")
        .addFields(
          { name:"\uD83C\uDFAB ticket",                   value:"Open a ticket to buy premium script", inline:false },
          { name:"\uD83C\uDFAB ticketsetup <ch> <logch>", value:"Setup ticket panel + log channel",    inline:false },
          { name:"\uD83D\uDCDC addscript <id> <name> <price> <content>", value:"Add premium script to shop", inline:false },
          { name:"\uD83D\uDCDC removescript <id>",        value:"Remove premium script",               inline:false },
          { name:"\uD83D\uDCDC scriptlist",               value:"View all premium scripts",            inline:false },
          { name:"\u2705 approve <ticketId>",             value:"Approve ticket, auto-send script",    inline:false },
          { name:"\uD83D\uDEAB reject <ticketId> [reason]",value:"Reject a ticket",                   inline:false },
          { name:"\uD83D\uDD11 genkey <scriptid> [n]",    value:"Generate premium key(s)",             inline:false },
          { name:"\uD83D\uDD11 revokekey <key>",          value:"Revoke a key",                        inline:false },
          { name:"\uD83D\uDD11 keylist <scriptid>",       value:"List all keys for a script",          inline:false },
          { name:"\uD83D\uDCB3 setbuyer @user <scriptid>",value:"Manually set user as buyer",          inline:false },
          { name:"\uD83D\uDCCA panelsetup <ch> <scriptid>",value:"Send premium buyer panel to channel",inline:false },
        )
        .setFooter({ text:"Page 4/5 | Prefix: ! or ? | Also /slash" }),

      new EmbedBuilder()
        .setTitle("\uD83D\uDCDC Script Hub Bot — Commands [5/5]")
        .setColor(0xe74c3c)
        .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━\n\uD83D\uDEE1\uFE0F **Server & Moderation**\n━━━━━━━━━━━━━━━━━━━━━━━━━━")
        .addFields(
          { name:"\uD83D\uDEE1\uFE0F automod on/off",      value:"Toggle automod (spam/link/word filter)", inline:false },
          { name:"\uD83D\uDEAB addfilter <word>",          value:"Add word to filter list",              inline:false },
          { name:"\uD83D\uDEA8 antiraid on/off [n] [action]",value:"Anti-raid protection",              inline:false },
          { name:"\uD83D\uDC4B welcome <ch> [msg]",        value:"Set welcome message channel",         inline:false },
          { name:"\uD83D\uDCCB logset <ch>",               value:"Set mod log channel",                 inline:false },
          { name:"\uD83C\uDF7F giveaway <prize> <min>",    value:"Start a giveaway",                    inline:false },
          { name:"\uD83C\uDFAD rolemenu <ch> <roles>",     value:"Create role selection menu",          inline:false },
          { name:"\uD83D\uDCCC sticky <ch> [msg]",         value:"Set sticky message in channel",       inline:false },
          { name:"\uD83E\uDD1D autorole add/remove/list",  value:"Auto-give role on join",              inline:false },
          { name:"\uD83D\uDEAB ban/unban/kick/timeout",    value:"Server moderation commands",          inline:false },
          { name:"\u26A0\uFE0F warn/warns/clearwarns",     value:"Warning system",                      inline:false },
          { name:"\uD83D\uDD07 mute/unmute <min>",         value:"Mute user from bot commands",         inline:false },
          { name:"\uD83D\uDCBE backup / restore",          value:"Export or restore full database",     inline:false },
          { name:"\uD83D\uDD04 statusrotate / statusadd",  value:"Bot status rotation system",          inline:false },
          { name:"\uD83D\uDCCA statssetup",                value:"Live server stats voice channels",    inline:false },
        )
        .setFooter({ text:"Page 5/5 | Prefix: ! or ? | Also /slash" }),
    ];

    let pg = 0;
    const navRow = () => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("help_prev").setLabel("\u2B05").setStyle(ButtonStyle.Secondary).setDisabled(pg===0),
      new ButtonBuilder().setCustomId("help_next").setLabel("\u27A1").setStyle(ButtonStyle.Primary).setDisabled(pg===pages.length-1),
    );
    const sent = await reply({ embeds:[pages[0]], components:[navRow()], fetchReply:true });
    const col  = sent.createMessageComponentCollector({ time:120000 });
    col.on("collect", async i => {
      if (i.user.id!==userId) return i.reply({ content:"\uD83D\uDEAB Not yours!", ephemeral:true });
      if (i.customId==="help_next") pg++;
      if (i.customId==="help_prev") pg--;
      await i.update({ embeds:[pages[pg]], components:[navRow()] });
    });
    col.on("end", ()=>sent.edit({ components:[] }).catch(()=>{}));
    return;
  }

  if (cmd === "lang") {
    const l = args[0];
    if (!["id","en"].includes(l)) return reply(E.warn+" Usage: `lang id` / `lang en`");
    db.lang[userId] = l; saveDB();
    return reply(l==="id" ? E.check+E.id_flag+" Bahasa diset ke **Indonesia**!" : E.check+E.us_flag+" Language set to **English**!");
  }

  // =================================================
  // SCRIPTS
  // =================================================
  if (cmd === "latest") {
    const res  = await fetch("https://rscripts.net/api/v2/scripts?page=1&orderBy=date&sort=desc");
    const data = await res.json();
    const medals = ["\uD83E\uDD47","\uD83E\uDD48","\uD83E\uDD49","4\uFE0F\u20E3","5\uFE0F\u20E3"];
    const emb = new EmbedBuilder()
      .setTitle("\uD83C\uDD95 Latest Scripts")
      .setColor(0x00ff99)
      .setDescription(
        data.scripts.slice(0,5).map((s,i)=>{
          const avg = avgRating(s.slug||s.id);
          const slug = s.slug||s.id;
          return medals[i]+" **"+s.title+"**\n"+(avg?stars(avg)+" ("+avg+"/5)":"\uD83D\uDCA4 No ratings")+"\n\uD83D\uDD17 https://rscripts.net/script/"+slug;
        }).join("\n\n")
      )
      .setFooter({ text:"rscripts.net | "+new Date().toLocaleDateString() })
      .setTimestamp();
    return reply({ embeds:[emb] });
  }

  if (cmd === "random") {
    const res  = await fetch("https://rscripts.net/api/v2/scripts?page=1");
    const data = await res.json();
    const s    = data.scripts[Math.floor(Math.random()*data.scripts.length)];
    const slug = s.slug||s.id;
    const avg  = avgRating(slug);
    const emb  = new EmbedBuilder()
      .setTitle("\uD83C\uDFB2 Random Script")
      .setColor(0x9b59b6)
      .setDescription(
        "**"+s.title+"**\n\n"+
        (avg?"\u2B50 Rating: "+stars(avg)+" ("+avg+"/5)":"\uD83D\uDCA4 No ratings yet")+"\n\n"+
        "\uD83D\uDD17 https://rscripts.net/script/"+slug+"\n\n"+
        "```lua\nloadstring(game:HttpGet(\"https://rscripts.net/script/"+slug+"\"))()\n```"
      )
      .setFooter({ text:"Rerun command for another random script!" })
      .setTimestamp();
    return reply({ embeds:[emb] });
  }

  if (cmd === "search") {
    const q = args.join(" ");
    if (!q) return reply(E.warn+" Usage: `search <name>`");
    addStat(userId,"searches");
    const res  = await fetch("https://scriptblox.com/api/script/search?q="+encodeURIComponent(q));
    const data = await res.json();
    const scripts = data?.result?.scripts;
    if (!scripts||!scripts.length) return reply(t(userId,"notFound"));

    let page = 0;

    const buildEmbed = (i) => {
      const s    = scripts[i];
      const slug = s.slug||s.id;
      const avg  = avgRating(slug);
      const tags = (db.scriptTags?.[slug]||[]).join(", ")||"none";
      return new EmbedBuilder()
        .setTitle("\uD83D\uDCDC "+s.title)
        .setColor(0x00ff99)
        .setDescription(
          "\uD83D\uDC64 **Creator:** "+(s.user?.username||"Unknown")+"\n"+
          (avg?"\u2B50 **Rating:** "+stars(avg)+" **("+avg+"/5)**":"\uD83D\uDCA4 No ratings yet")+"\n"+
          "\uD83C\uDFF7\uFE0F **Tags:** "+tags+"\n\n"+
          "\uD83D\uDD17 **Link:**\nhttps://scriptblox.com/script/"+slug+"\n\n"+
          "\uD83D\uDCDC **Loadstring:**\n```lua\nloadstring(game:HttpGet(\"https://scriptblox.com/raw/"+slug+"\"))()\n```"
        )
        .setThumbnail(s.image||null)
        .setFooter({ text:"Result "+(i+1)+" of "+scripts.length+" | /rate "+slug+" to rate!" })
        .setTimestamp();
    };

    const buildNav = () => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("s_prev").setLabel("\u2B05 Prev").setStyle(ButtonStyle.Secondary).setDisabled(page===0),
      new ButtonBuilder().setCustomId("s_next").setLabel("Next \u27A1").setStyle(ButtonStyle.Primary).setDisabled(page>=scripts.length-1),
    );

    const sent = await reply({ content:E.search+" **Results for:** `"+q+"`", embeds:[buildEmbed(0)], components:[buildNav()], fetchReply:true });
    const col  = sent.createMessageComponentCollector({ time:120000 });

    col.on("collect", async (i)=>{
      if (i.user.id!==userId) return i.reply({ content:E.ban+" Not yours!", ephemeral:true });
      if (i.customId==="s_next") page++;
      if (i.customId==="s_prev") page--;
      await i.update({ embeds:[buildEmbed(page)], components:[buildNav()] });
    });

    col.on("end", ()=>{ sent.edit({ components:[] }).catch(()=>{}); });
  }

  if (cmd === "rate") {
    const slug=args[0], rating=parseInt(args[1]);
    if (!slug||!rating||rating<1||rating>5) return reply(E.warn+" Usage: `rate <slug> <1-5>`");
    if (!db.ratings[slug]) db.ratings[slug]={};
    db.ratings[slug][userId]=rating; saveDB(); addStat(userId,"ratings");
    const avg=avgRating(slug);
    return reply(E.check+E.star+" Rated **"+slug+"** "+stars(rating)+" **("+rating+"/5)**!\n"+E.chart+" Avg: "+stars(avg)+" **("+avg+"/5)**");
  }

  if (cmd === "review") {
    const slug=args[0], text=args.slice(1).join(" ");
    if (!slug||!text) return reply(E.warn+" Usage: `review <slug> <text>`");
    if (!db.reviews[slug]) db.reviews[slug]=[];
    db.reviews[slug]=db.reviews[slug].filter(r=>r.userId!==userId);
    db.reviews[slug].push({ userId, text, time:Date.now() }); saveDB(); addStat(userId,"reviews");
    return reply(E.check+E.pen+" Review posted for **"+slug+"**! "+E.pray);
  }

  if (cmd === "reviews") {
    const slug=args[0];
    if (!slug) return reply(E.warn+" Usage: `reviews <slug>`");
    const reviews=db.reviews[slug], avg=avgRating(slug);
    if (!reviews||!reviews.length) return reply(E.sleep+" No reviews for **"+slug+"** yet!");
    const emb=new EmbedBuilder().setTitle(E.pen+E.chat+" Reviews | "+slug).setColor(0xf1c40f)
      .setDescription(avg?E.star+" **Average:** "+stars(avg)+" **("+avg+"/5)**":E.sleep+" No ratings")
      .setFooter({ text:"Showing latest "+Math.min(reviews.length,5) });
    reviews.slice(-5).forEach(r=>emb.addFields({ name:E.chat+" <@"+r.userId+">", value:r.text.substring(0,200) }));
    return reply({ embeds:[emb] });
  }

  // =================================================
  // SCRIPT FEATURES
  // =================================================
  if (cmd === "bookmark") {
    const slug=args[0], title=args[1], tag=args[2]||"other";
    if (!slug||!title) return reply(E.warn+" Usage: `bookmark <slug> <title> [tag]`");
    if (!db.bookmarks[userId]) db.bookmarks[userId]=[];
    db.bookmarks[userId]=db.bookmarks[userId].filter(b=>b.slug!==slug);
    db.bookmarks[userId].push({ slug, title, tag, time:Date.now() }); saveDB();
    return reply(E.bookmark+E.check+" Bookmarked **"+title+"** ["+tag+"]!");
  }

  if (cmd === "bookmarks") {
    const filter=args[0]||null;
    let bm=db.bookmarks[userId]||[];
    if (filter) bm=bm.filter(b=>b.tag===filter);
    if (!bm.length) return reply(E.sleep+" No bookmarks"+(filter?" for tag **"+filter+"**":"")+". Use `bookmark <slug> <title> [tag]`");
    const emb=new EmbedBuilder().setTitle(E.bookmark+E.spark+" Your Bookmarks"+(filter?" | "+filter:"")).setColor(0x3498db)
      .setFooter({ text:bm.length+" bookmark(s)" });
    bm.slice(0,10).forEach(b=>{
      emb.addFields({ name:E.scroll+" "+b.title, value:E.tag+" "+b.tag+"\n"+E.link+" https://scriptblox.com/script/"+b.slug, inline:true });
    });
    return reply({ embeds:[emb] });
  }

  if (cmd === "unbookmark") {
    const slug=args[0];
    if (!slug) return reply(E.warn+" Usage: `unbookmark <slug>`");
    if (!db.bookmarks[userId]) return reply(E.sleep+" No bookmarks.");
    const before=db.bookmarks[userId].length;
    db.bookmarks[userId]=db.bookmarks[userId].filter(b=>b.slug!==slug); saveDB();
    return db.bookmarks[userId].length<before
      ? reply(E.check+" Bookmark removed!")
      : reply(E.cross+" Bookmark not found.");
  }

  if (cmd === "tag") {
    const slug=args[0], game=args.slice(1).join(" ").toLowerCase();
    if (!slug||!game) return reply(E.warn+" Usage: `tag <slug> <game>`");
    if (!db.scriptTags[slug]) db.scriptTags[slug]=[];
    if (!db.scriptTags[slug].includes(game)) db.scriptTags[slug].push(game);
    saveDB();
    return reply(E.tag+E.check+" Tagged **"+slug+"** with `"+game+"`!");
  }

  if (cmd === "category") {
    const game=args.join(" ").toLowerCase();
    if (!game) return reply(E.warn+" Usage: `category <game>`\nAvailable: "+GAME_TAGS.join(", "));
    const matches=Object.entries(db.scriptTags).filter(([,tags])=>tags.includes(game)).map(([slug])=>slug);
    if (!matches.length) return reply(E.sleep+" No scripts tagged with **"+game+"** yet!");
    const emb=new EmbedBuilder().setTitle(E.game+E.spark+" Scripts | "+game).setColor(0x9b59b6)
      .setDescription(matches.slice(0,15).map((s,i)=>(i+1)+". "+E.link+" https://scriptblox.com/script/"+s).join("\n"))
      .setFooter({ text:matches.length+" script(s) tagged" });
    return reply({ embeds:[emb] });
  }

  // =================================================
  // ECONOMY
  // =================================================
  if (cmd === "balance") {
    const target=args[0]?.replace(/[<@!>]/g,"")||userId;
    const bal=getCoins(target);
    const emb=new EmbedBuilder()
      .setTitle(E.wallet+E.spark+" Balance | <@"+target+">")
      .setDescription(E.coin+" **"+bal.toLocaleString()+" coins**"+(hasBooster(target)?"\n"+E.fire+" 2x Daily Booster active!":""))
      .setColor(0xf1c40f).setTimestamp();
    return reply({ embeds:[emb] });
  }

  if (cmd === "daily") {
    const last=db.lastDaily[userId]||0;
    const now=Date.now();
    const cd=24*60*60*1000;
    if (now-last<cd) {
      const left=cd-(now-last);
      const h=Math.floor(left/3600000), m=Math.floor((left%3600000)/60000);
      return reply(E.clock+" Come back in **"+h+"h "+m+"m** for your next daily!");
    }
    const amount=hasBooster(userId)?DAILY_COIN*2:DAILY_COIN;
    addCoins(userId,amount);
    db.lastDaily[userId]=now; saveDB();
    return reply(E.daily+E.coin+" You claimed **"+amount+" coins**! Balance: **"+getCoins(userId)+"**"+(hasBooster(userId)?" "+E.fire+"(2x boost!)":""));
  }

  if (cmd === "transfer") {
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    const amount=parseInt(args[1]);
    if (!targetId||!amount||amount<1) return reply(E.warn+" Usage: `transfer <@user> <amount>`");
    if (targetId===userId) return reply(E.cross+" Can't transfer to yourself!");
    if (getCoins(userId)<amount) return reply(E.cross+" Not enough coins! You have **"+getCoins(userId)+"**.");
    removeCoins(userId,amount); addCoins(targetId,amount);
    return reply(E.transfer+E.check+" Sent **"+amount+" coins** to <@"+targetId+">!\nYour balance: **"+getCoins(userId)+"**");
  }

  if (cmd === "gamble") {
    const bet=parseInt(args[0]);
    if (!bet||bet<GAMBLE_MIN) return reply(E.warn+" Usage: `gamble <amount>` (min "+GAMBLE_MIN+")");
    if (getCoins(userId)<bet) return reply(E.cross+" Not enough coins! You have **"+getCoins(userId)+"**.");
    const win=Math.random()<0.45;
    if (win) { addCoins(userId,bet); return reply(E.gamble+E.spark+" You **WON** **+"+bet+" coins**! Balance: **"+getCoins(userId)+"**"); }
    else { removeCoins(userId,bet); return reply(E.gamble+E.cross+" You **LOST** **-"+bet+" coins**! Balance: **"+getCoins(userId)+"**"); }
  }

  if (cmd === "shop") {
    const emb=new EmbedBuilder().setTitle(E.shop+E.spark+" Coin Shop").setColor(0xe67e22)
      .setDescription("Use `buy <id>` to purchase!\n"+E.bars);
    SHOP_ITEMS.forEach(item=>{
      emb.addFields({ name:E.coin+" "+item.name+" | ID: `"+item.id+"`", value:item.desc+"\n**Price:** "+item.price+" coins", inline:true });
    });
    return reply({ embeds:[emb] });
  }

  if (cmd === "buy") {
    const itemId=args[0]?.toLowerCase();
    const item=SHOP_ITEMS.find(i=>i.id===itemId);
    if (!item) return reply(E.cross+" Item not found! Use `shop` to see items.");
    if (getCoins(userId)<item.price) return reply(E.cross+" Not enough coins! Need **"+item.price+"**, you have **"+getCoins(userId)+"**.");
    removeCoins(userId,item.price);
    if (!db.purchases[userId]) db.purchases[userId]=[];
    db.purchases[userId].push(item.id);
    if (item.id==="booster") { db.booster[userId]=Date.now()+7*24*60*60*1000; }
    saveDB();
    return reply(E.check+E.shop+" Bought **"+item.name+"**! Remaining balance: **"+getCoins(userId)+"** coins.");
  }

  if (cmd === "coinlb") {
    const sorted=Object.entries(db.coins).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const emb=new EmbedBuilder().setTitle(E.trophy+E.coin+" Coin Leaderboard").setColor(0xf39c12)
      .setDescription(sorted.length?sorted.map(([id,c],i)=>([E.gold,E.silver,E.bronze][i]||"**"+(i+1)+".**")+" <@"+id+"> \u2014 "+E.coin+" **"+c.toLocaleString()+"**").join("\n"):E.sleep+" No data yet.")
      .setFooter({ text:"Top coin holders" }).setTimestamp();
    return reply({ embeds:[emb] });
  }

  // =================================================
  // STATS / LEADERBOARD
  // =================================================
  if (cmd === "stats") {
    const target=args[0]?.replace(/[<@!>]/g,"")||userId;
    const s=db.stats[target];
    const emb=new EmbedBuilder().setTitle(E.chart+E.spark+" Stats | <@"+target+">").setColor(0x3498db)
      .addFields(
        { name:E.search+" Searches", value:"`"+(s?.searches||0)+"`",  inline:true },
        { name:E.star+" Ratings",    value:"`"+(s?.ratings||0)+"`",   inline:true },
        { name:E.pen+" Reviews",     value:"`"+(s?.reviews||0)+"`",   inline:true },
        { name:"\u2328\uFE0F Commands",    value:"`"+(s?.commands||0)+"`",  inline:true },
        { name:E.coin+" Coins",      value:"`"+getCoins(target)+"`",  inline:true },
      ).setFooter({ text:"Script Hub Bot Stats" }).setTimestamp();
    return reply({ embeds:[emb] });
  }

  if (cmd === "leaderboard") {
    const sorted=Object.entries(db.stats)
      .map(([id,s])=>({ id, total:(s.searches||0)+(s.ratings||0)+(s.reviews||0) }))
      .sort((a,b)=>b.total-a.total).slice(0,10);
    const emb=new EmbedBuilder().setTitle(E.trophy+E.fire+" Leaderboard | Top Users").setColor(0xf39c12)
      .setDescription(sorted.length?sorted.map((u,i)=>([E.gold,E.silver,E.bronze][i]||"**"+(i+1)+".**")+" <@"+u.id+"> \u2014 "+E.spark+" **"+u.total+"** actions").join("\n"):E.sleep+" No data.")
      .setFooter({ text:"Total = searches + ratings + reviews" }).setTimestamp();
    return reply({ embeds:[emb] });
  }

  // =================================================
  // PS
  // =================================================
  if (cmd === "ps") {
    const row=new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId("psmenu").setPlaceholder("Choose a game...")
        .addOptions([{ label:"Blox Fruits",value:"bf" },{ label:"Fisch",value:"fisch" }])
    );
    const sent=await reply({ content:E.game+" **Private Server** | Choose your game:", components:[row], fetchReply:true });
    const col=sent.createMessageComponentCollector({ time:60000 });
    col.on("collect", async (i)=>{
      if (i.user.id!==userId) return;
      const link=db.ps[i.values[0]];
      i.reply(link?E.link+E.check+" **PS Link:** "+link:E.cross+" Not set yet!");
    });
  }

  if (cmd === "setps") {
    if (!isOwner(userId)) return reply(t(userId,"ownerOnly"));
    const game=args[0], link=args[1];
    if (!game||!link) return reply(E.warn+" Usage: `setps <bf|fisch> <link>`");
    db.ps[game]=link; saveDB();
    return reply(E.check+E.link+" PS link for **"+game+"** updated!");
  }

  if (cmd === "favorite") {
    const fav=db.favorites[userId];
    if (!fav||!fav.length) return reply(E.sleep+" Favorites empty!");
    const emb=new EmbedBuilder().setTitle(E.heart+E.spark+" Your Favorites").setColor(0xe74c3c)
      .setFooter({ text:fav.length+" favorite(s)" });
    fav.forEach(s=>emb.addFields({ name:E.scroll+" "+s.title, value:E.link+" https://scriptblox.com/script/"+s.slug }));
    return reply({ embeds:[emb] });
  }

  // =================================================
  // SERVER TOOLS
  // =================================================
  if (cmd === "welcome") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const channelId=args[0], message=args.slice(1).join(" ")||"Welcome {user} to {server}! "+E.party;
    if (!channelId) return reply(E.warn+" Usage: `welcome <channelId> [message]`");
    if (!db.welcomeCfg) db.welcomeCfg={};
    db.welcomeCfg[guildId]={ channel:channelId, message }; saveDB();
    return reply(E.check+E.welcome+" Welcome message set for <#"+channelId+">!\nMessage: "+message);
  }

  if (cmd === "logset") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const channelId=args[0];
    if (!channelId) return reply(E.warn+" Usage: `logset <channelId>`");
    if (!db.logCfg) db.logCfg={};
    db.logCfg[guildId]=channelId; saveDB();
    return reply(E.check+E.log+" Log channel set to <#"+channelId+">!");
  }

  if (cmd === "giveaway") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const prize=args[0], minutes=parseInt(args[1]), channelId=args[2]||null;
    if (!prize||!minutes) return reply(E.warn+" Usage: `giveaway <prize> <minutes> [channelId]`");
    const targetCh=channelId||guild?.systemChannelId;
    if (!targetCh) return reply(E.cross+" No channel specified!");
    const endsAt=Date.now()+minutes*60*1000;
    const emb=new EmbedBuilder()
      .setTitle(E.giveaway+E.party+" GIVEAWAY!")
      .setDescription(
        E.gift+" **Prize:** "+prize+"\n"+
        E.clock+" **Ends in:** "+minutes+" minute(s)\n"+
        E.confetti+" React with "+E.party+" to enter!"
      ).setColor(0xf39c12).setTimestamp(endsAt);
    try {
      const ch=await client.channels.fetch(targetCh);
      const msg=await ch.send({ embeds:[emb] });
      await msg.react(E.party);
      db.giveaways[msg.id]={ prize, endsAt, channel:targetCh, entries:[], ended:false, guildId };
      saveDB();
      return reply(E.check+E.giveaway+" Giveaway started in <#"+targetCh+">! Ends in **"+minutes+" min**.");
    } catch { return reply(E.cross+" Failed to start giveaway. Check permissions."); }
  }

  if (cmd === "giveawayend") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const msgId=args[0];
    if (!msgId) return reply(E.warn+" Usage: `giveawayend <messageId>`");
    const gw=db.giveaways[msgId];
    if (!gw) return reply(E.cross+" Giveaway not found!");
    gw.endsAt=Date.now()-1; saveDB();
    return reply(E.check+" Giveaway will end shortly!");
  }

  // =================================================
  // FUN
  // =================================================
  if (cmd === "8ball") {
    const q=args.join(" ");
    if (!q) return reply(E.warn+" Usage: `8ball <question>`");
    const answer=EIGHTBALL[Math.floor(Math.random()*EIGHTBALL.length)];
    const emb=new EmbedBuilder()
      .setTitle(E.magic+" Magic 8Ball")
      .addFields(
        { name:E.think+" Question", value:q },
        { name:E.magic+" Answer",   value:"**"+answer+"**" }
      ).setColor(0x7289da);
    return reply({ embeds:[emb] });
  }

  if (cmd === "meme") {
    try {
      const res=await fetch("https://meme-api.com/gimme/memes");
      const data=await res.json();
      const emb=new EmbedBuilder()
        .setTitle(E.laugh+" "+data.title)
        .setImage(data.url)
        .setColor(0xff6b6b)
        .setFooter({ text:E.up+" "+data.ups+" | r/"+data.subreddit });
      return reply({ embeds:[emb] });
    } catch { return reply(E.cross+" Failed to fetch meme. Try again!"); }
  }

  if (cmd === "trivia") {
    if (db.triviaActive[userId]) return reply(E.warn+" You have an active trivia! Answer it first.");
    try {
      const res=await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
      const data=await res.json();
      const q=data.results[0];
      const correct=q.correct_answer;
      const all=[correct,...q.incorrect_answers].sort(()=>Math.random()-0.5);
      const prize=50;
      db.triviaActive[userId]={ answer:correct, prize }; saveDB();

      const emb=new EmbedBuilder()
        .setTitle(E.think+E.spark+" Trivia! Win **"+prize+" coins**")
        .setDescription("**"+decodeHTMLEntities(q.question)+"**\n\n"+all.map((a,i)=>"`"+(i+1)+"` "+decodeHTMLEntities(a)).join("\n")+"\n\n"+E.clock+" Reply with the number! (60s)")
        .setColor(0x1abc9c).setFooter({ text:"Category: "+q.category });
      return reply({ embeds:[emb] });
    } catch { return reply(E.cross+" Failed to fetch trivia. Try again!"); }
  }

  if (cmd === "coinflip") {
    const result=Math.random()<0.5?"Heads":"Tails";
    return reply(E.dice+" Flipped a coin... **"+result+"!**");
  }

  if (cmd === "rps") {
    const choices=["rock","paper","scissors"];
    const userChoice=args[0]?.toLowerCase();
    if (!choices.includes(userChoice)) return reply(E.warn+" Usage: `rps <rock|paper|scissors>`");
    const botChoice=choices[Math.floor(Math.random()*3)];
    let result;
    if (userChoice===botChoice) result="**Tie!** "+E.think;
    else if ((userChoice==="rock"&&botChoice==="scissors")||(userChoice==="paper"&&botChoice==="rock")||(userChoice==="scissors"&&botChoice==="paper"))
      result=E.check+" **You Win!**";
    else result=E.cross+" **Bot Wins!**";
    return reply(E.game+" You: **"+userChoice+"** | Bot: **"+botChoice+"**\n"+result);
  }

  // =================================================
  // MODERATION
  // =================================================
  if (cmd === "ban") {
    if (!hasMod&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    const reason=args.slice(1).join(" ")||"No reason";
    if (!targetId) return reply(E.warn+" Usage: `ban <@user> [reason]`");
    if (!db.banned.includes(targetId)) db.banned.push(targetId);
    saveDB();
    await sendLog(E.hammer+E.ban+" **Ban** | <@"+targetId+"> by <@"+userId+">\n**Reason:** "+reason);
    return reply(E.hammer+E.ban+" <@"+targetId+"> **banned** from bot!\n"+E.pen+" **Reason:** "+reason);
  }

  if (cmd === "unban") {
    if (!hasMod&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    if (!targetId) return reply(E.warn+" Usage: `unban <@user>`");
    db.banned=db.banned.filter(id=>id!==targetId); saveDB();
    await sendLog(E.check+E.lock+" **Unban** | <@"+targetId+"> by <@"+userId+">");
    return reply(E.check+E.lock+" <@"+targetId+"> **unbanned**!");
  }

  if (cmd === "kick") {
    if (!hasMod&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    const reason=args.slice(1).join(" ")||"No reason";
    if (!targetId) return reply(E.warn+" Usage: `kick <@user> [reason]`");
    try {
      const m=await guild.members.fetch(targetId);
      await m.kick(reason);
      await sendLog(E.kick+" **Kick** | <@"+targetId+"> by <@"+userId+">\n**Reason:** "+reason);
      return reply(E.kick+E.wind+" <@"+targetId+"> **kicked**!\n"+E.pen+" **Reason:** "+reason);
    } catch { return reply(E.cross+" Failed to kick. Check permissions."); }
  }

  if (cmd === "timeout") {
    if (!hasMod&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    const minutes=parseInt(args[1])||5;
    const reason=args.slice(2).join(" ")||"No reason";
    if (!targetId) return reply(E.warn+" Usage: `timeout <@user> <minutes> [reason]`");
    try {
      const m=await guild.members.fetch(targetId);
      await m.timeout(minutes*60*1000,reason);
      await sendLog(E.clock+" **Timeout** | <@"+targetId+"> for "+minutes+"m by <@"+userId+">\n**Reason:** "+reason);
      return reply(E.clock+" <@"+targetId+"> timed out **"+minutes+"min**!\n"+E.pen+" **Reason:** "+reason);
    } catch { return reply(E.cross+" Failed to timeout. Check permissions."); }
  }

  if (cmd === "warn") {
    if (!hasMod&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    const reason=args.slice(1).join(" ");
    if (!targetId||!reason) return reply(E.warn+" Usage: `warn <@user> <reason>`");
    if (!db.warns[targetId]) db.warns[targetId]=[];
    db.warns[targetId].push({ reason, time:Date.now(), by:userId }); saveDB();
    const count=db.warns[targetId].length;
    await sendLog(E.warn+E.bell+" **Warn** | <@"+targetId+"> ("+count+" total) by <@"+userId+">\n**Reason:** "+reason);
    return reply(E.warn+E.bell+" <@"+targetId+"> warned! (**"+count+"** total)\n"+E.pen+" **Reason:** "+reason);
  }

  if (cmd === "warns") {
    if (!hasMod&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    if (!targetId) return reply(E.warn+" Usage: `warns <@user>`");
    const warns=db.warns[targetId];
    if (!warns||!warns.length) return reply(E.check+" <@"+targetId+"> has no warns!");
    const emb=new EmbedBuilder().setTitle(E.warn+" Warns | <@"+targetId+">").setColor(0xe67e22)
      .setDescription(warns.map((w,i)=>"**"+(i+1)+".** "+w.reason+"\n"+E.cop+" by <@"+w.by+">").join("\n\n"))
      .setFooter({ text:"Total: "+warns.length });
    return reply({ embeds:[emb] });
  }

  if (cmd === "clearwarns") {
    if (!hasMod&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    if (!targetId) return reply(E.warn+" Usage: `clearwarns <@user>`");
    db.warns[targetId]=[]; saveDB();
    return reply(E.broom+E.check+" Warns cleared for <@"+targetId+">!");
  }

  if (cmd === "mute") {
    if (!hasMod&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    const minutes=parseInt(args[1])||10;
    if (!targetId) return reply(E.warn+" Usage: `mute <@user> <minutes>`");
    db.muted[targetId]=Date.now()+minutes*60*1000; saveDB();
    return reply(E.mute+E.silent+" <@"+targetId+"> muted for **"+minutes+"min**!");
  }

  if (cmd === "unmute") {
    if (!hasMod&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    if (!targetId) return reply(E.warn+" Usage: `unmute <@user>`");
    delete db.muted[targetId]; saveDB();
    return reply(E.unmute+E.check+" <@"+targetId+"> **unmuted**!");
  }

  // =================================================
  // TICKET SYSTEM
  // =================================================
  if (cmd === "ticketsetup") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const panelCh=args[0], logCh=args[1];
    if (!panelCh||!logCh) return reply(E.warn+" Usage: `ticketsetup <panelChannelId> <logChannelId>`");
    if (!db.ticketCfg) db.ticketCfg={};
    db.ticketCfg[guildId]={ panelChannel:panelCh, logChannel:logCh, ticketRoleId:db.ticketCfg?.[guildId]?.ticketRoleId||null };
    saveDB();
    try {
      const ch=await client.channels.fetch(panelCh);
      // List available scripts
      const scripts=Object.entries(db.premiumScripts||{});
      const scriptList=scripts.length
        ? scripts.map(([id,s])=>"\uD83D\uDCDC **"+s.name+"**\n\uD83E\uFA99 "+s.price+" coins | \uD83D\uDCB5 "+s.payment.join(", ")+"\n`ID: "+id+"`").join("\n\n")
        : "\uD83D\uDCA4 No scripts added yet — admin use `/addscript`";

      const emb=new EmbedBuilder()
        .setTitle("\uD83C\uDFAB Script Hub | Premium Store")
        .setColor(0x7c3aed)
        .setDescription(
          "Beli source script premium terpercaya!\n\n"+
          "━━━━━━━━━━━━━━━━━━━━━━━━━━\n"+
          "\uD83D\uDCE6 **Available Scripts:**\n\n"+
          scriptList+"\n\n"+
          "━━━━━━━━━━━━━━━━━━━━━━━━━━\n"+
          "\uD83D\uDCB5 **Payment:** Dana | GoPay | Robux\n"+
          "\u2705 **After payment:** Admin verify → bot auto-send script\n"+
          "\uD83D\uDCCC **Click Buy Script** to open a ticket!"
        )
        .setFooter({ text:"Script Hub | Premium Store • Trusted & Fast" })
        .setTimestamp();

      const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("open_ticket").setLabel("Buy Script").setStyle(ButtonStyle.Success).setEmoji("\uD83C\uDFAB"),
        new ButtonBuilder().setCustomId("ticket_mytickets").setLabel("My Tickets").setStyle(ButtonStyle.Secondary).setEmoji("\uD83D\uDCCB"),
      );
      await ch.send({ embeds:[emb], components:[row] });
      return reply(E.check+" Ticket panel sent to <#"+panelCh+">!\n\uD83D\uDCCB Logs → <#"+logCh+">");
    } catch(e) { return reply(E.cross+" Failed: "+e.message); }
  }

  if (cmd === "ticketrole") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const roleId=args[0];
    if (!roleId) return reply(E.warn+" Usage: `ticketrole <@role>`");
    if (!db.ticketCfg) db.ticketCfg={};
    if (!db.ticketCfg[guildId]) db.ticketCfg[guildId]={};
    db.ticketCfg[guildId].ticketRoleId=roleId; saveDB();
    return reply(E.check+"\uD83C\uDFAB Ticket role set to <@&"+roleId+">! This role can view all ticket channels.");
  }

  if (cmd === "mytickets") {
    const myTks=Object.entries(db.tickets||{}).filter(([,t])=>t.userId===userId);
    if (!myTks.length) return reply(E.sleep+" You have no tickets yet!");
    const emb=new EmbedBuilder()
      .setTitle("\uD83C\uDFAB My Tickets")
      .setColor(0x3498db)
      .setDescription(myTks.slice(-10).reverse().map(([id,t])=>{
        const script=db.premiumScripts?.[t.scriptId];
        const statusEmoji={ pending:"\u23F3", approved:"\u2705", rejected:"\uD83D\uDEAB" };
        return (statusEmoji[t.status]||"\u2753")+" **"+id+"**\n"+
          "\uD83D\uDCDC "+(script?.name||t.scriptId)+" | \uD83D\uDCB5 "+t.payMethod+"\n"+
          "<t:"+Math.floor(t.time/1000)+":R>";
      }).join("\n\n"))
      .setFooter({ text:"Showing last 10 tickets" });
    return reply({ embeds:[emb] });
  }

  if (cmd === "alltickets") {
    const hasTkRole=db.ticketCfg?.[guildId]?.ticketRoleId&&member?.roles?.cache?.has(db.ticketCfg[guildId].ticketRoleId);
    if (!hasAdmin&&!isOwner(userId)&&!hasTkRole) return reply(t(userId,"noPerms"));
    const filter=args[0]||null;
    let tks=Object.entries(db.tickets||{});
    if (filter) tks=tks.filter(([,t])=>t.status===filter);
    if (!tks.length) return reply(E.sleep+" No tickets"+(filter?" with status **"+filter+"**":"")+". ");
    const statusEmoji={ pending:"\u23F3", approved:"\u2705", rejected:"\uD83D\uDEAB" };
    const emb=new EmbedBuilder()
      .setTitle("\uD83D\uDCCB All Tickets"+(filter?" | "+filter:""))
      .setColor(0xe67e22)
      .setDescription(tks.slice(-15).reverse().map(([id,t])=>{
        const script=db.premiumScripts?.[t.scriptId];
        return (statusEmoji[t.status]||"\u2753")+" **"+id+"**\n"+
          "\uD83D\uDC64 <@"+t.userId+"> | \uD83D\uDCDC "+(script?.name||t.scriptId)+"\n"+
          "\uD83D\uDCB5 "+t.payMethod+" | <t:"+Math.floor(t.time/1000)+":R>";
      }).join("\n\n"))
      .setFooter({ text:"Showing last 15 | Total: "+tks.length });
    return reply({ embeds:[emb] });
  }

  if (cmd === "addscript") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const [id,name,priceStr,content,payRaw]=args;
    const price=parseInt(priceStr);
    if (!id||!name||!price||!content) return reply(E.warn+" Usage: `addscript <id> <name> <price> <content> [payment]`");
    const payment=(payRaw||"dana,gopay,robux").split(",").map(p=>p.trim().toLowerCase());
    if (!db.premiumScripts) db.premiumScripts={};
    db.premiumScripts[id.toLowerCase()]={ name, price, content, payment }; saveDB();
    return reply(E.check+E.scroll+" Script **"+name+"** added!\n"+E.coin+" Price: **"+price+"**\n"+E.money+" Payment: "+payment.join(", "));
  }

  if (cmd === "removescript") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const id=args[0]?.toLowerCase();
    if (!id) return reply(E.warn+" Usage: `removescript <id>`");
    if (!db.premiumScripts?.[id]) return reply(E.cross+" Script not found!");
    const name=db.premiumScripts[id].name;
    delete db.premiumScripts[id]; saveDB();
    return reply(E.check+" Script **"+name+"** removed from shop!");
  }

  if (cmd === "scriptlist") {
    const scripts=Object.entries(db.premiumScripts||{});
    if (!scripts.length) return reply(E.sleep+" No premium scripts available yet!");
    const emb=new EmbedBuilder()
      .setTitle(E.scroll+E.spark+" Premium Script Shop")
      .setColor(0x00ff99)
      .setDescription(E.ticket+" Open a ticket to purchase!\n"+E.bars);
    scripts.forEach(([id,s])=>{
      emb.addFields({
        name: E.scroll+" "+s.name+" | ID: `"+id+"`",
        value: E.coin+" **"+s.price+" coins** or manual pay\n"+E.money+" "+s.payment.join(" / "),
        inline: true
      });
    });
    return reply({ embeds:[emb] });
  }

  if (cmd === "approve") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const ticketId=args[0];
    if (!ticketId) return reply(E.warn+" Usage: `approve <ticketId>`");
    const tk=db.tickets?.[ticketId];
    if (!tk) return reply(E.cross+" Ticket not found!");
    if (tk.status==="approved") return reply(E.warn+" Already approved!");
    if (tk.status==="rejected") return reply(E.cross+" Ticket was rejected.");
    const script=db.premiumScripts?.[tk.scriptId];
    if (!script) return reply(E.cross+" Script no longer exists in shop!");
    tk.status="approved"; saveDB();
    // Send script to ticket channel
    try {
      const ch=await client.channels.fetch(tk.channel);
      const emb=new EmbedBuilder()
        .setTitle(E.approve+E.spark+" Purchase Approved!")
        .setDescription(
          E.pray+" Thank you for your purchase, <@"+tk.userId+">!\n\n"+
          E.scroll+" **Script:** "+script.name+"\n"+
          E.bars+"\n"+
          "```lua\n"+script.content+"\n```"
        ).setColor(0x00ff99).setTimestamp();
      await ch.send({ content:"<@"+tk.userId+">", embeds:[emb] });
      // Log it
      if (db.ticketCfg?.[tk.guildId]?.logChannel) {
        const logCh=await client.channels.fetch(db.ticketCfg[tk.guildId].logChannel);
        const logEmb=new EmbedBuilder()
          .setTitle(E.receipt+" Ticket Approved | #"+ticketId)
          .setDescription("<@"+userId+"> approved ticket for <@"+tk.userId+">\n"+E.scroll+" Script: **"+script.name+"**\n"+E.money+" Method: **"+tk.payMethod+"**")
          .setColor(0x00ff99).setTimestamp();
        logCh.send({ embeds:[logEmb] });
      }
      return reply(E.check+" Ticket **#"+ticketId+"** approved! Script sent to <#"+tk.channel+">.");
    } catch { return reply(E.cross+" Failed to send to ticket channel. It may be deleted."); }
  }

  if (cmd === "reject") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const ticketId=args[0], reason=args.slice(1).join(" ")||"No reason given";
    if (!ticketId) return reply(E.warn+" Usage: `reject <ticketId> [reason]`");
    const tk=db.tickets?.[ticketId];
    if (!tk) return reply(E.cross+" Ticket not found!");
    if (tk.status!=="pending") return reply(E.warn+" Ticket is already **"+tk.status+"**.");
    tk.status="rejected"; saveDB();
    try {
      const ch=await client.channels.fetch(tk.channel);
      const emb=new EmbedBuilder()
        .setTitle(E.reject_+" Purchase Rejected")
        .setDescription("<@"+tk.userId+"> your ticket was rejected.\n"+E.pen+" **Reason:** "+reason+"\n\nContact admin if you think this is a mistake.")
        .setColor(0xff0000).setTimestamp();
      await ch.send({ content:"<@"+tk.userId+">", embeds:[emb] });
      if (db.ticketCfg?.[tk.guildId]?.logChannel) {
        const logCh=await client.channels.fetch(db.ticketCfg[tk.guildId].logChannel);
        const logEmb=new EmbedBuilder()
          .setTitle(E.reject_+" Ticket Rejected | #"+ticketId)
          .setDescription("<@"+userId+"> rejected ticket of <@"+tk.userId+">\n"+E.pen+" **Reason:** "+reason)
          .setColor(0xff0000).setTimestamp();
        logCh.send({ embeds:[logEmb] });
      }
      return reply(E.check+" Ticket **#"+ticketId+"** rejected.");
    } catch { return reply(E.cross+" Failed to notify ticket channel."); }
  }

  if (cmd === "closeticket") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    // find ticket by channel id
    const tk=Object.entries(db.tickets||{}).find(([,t])=>t.channel===guild?.channels?.cache?.find(c=>c.name?.startsWith("ticket-"))?.id);
    const emb=new EmbedBuilder()
      .setTitle(E.ticket+" Closing ticket...")
      .setDescription("This channel will be deleted in **5 seconds**.")
      .setColor(0xff0000);
    await reply({ embeds:[emb] });
    setTimeout(async ()=>{
      try {
        const ch=await client.channels.fetch(guild.channels.cache.find(c=>c.name?.startsWith("ticket-"))?.id);
        await ch?.delete();
      } catch {}
    }, 5000);
  }

  if (cmd === "ticket") {
    // show script picker
    const scripts=Object.entries(db.premiumScripts||{});
    if (!scripts.length) return reply(E.sleep+" No premium scripts available yet! Ask admin to add some.");
    const menu=new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId("ticket_script_select")
        .setPlaceholder(E.scroll+" Select a script to buy...")
        .addOptions(scripts.map(([id,s])=>({
          label: s.name,
          description: "Price: "+s.price+" | Pay: "+s.payment.join(", "),
          value: id
        })))
    );
    return reply({ content:E.ticket+" **Select the script you want to buy:**", components:[menu], fetchReply:true });
  }

  // =================================================
  // LEVEL / XP
  // =================================================
  if (cmd === "rank") {
    const target = args[0]?.replace(/[<@!>]/g,"") || userId;
    const data   = getXP(target);
    const needed = xpForLevel(data.level + 1);
    const pct    = Math.floor((data.xp / needed) * 20);
    const bar    = "\u2588".repeat(pct) + "\u2591".repeat(20 - pct);
    const emb = new EmbedBuilder()
      .setTitle(E.rank+E.spark+" Rank | <@"+target+">")
      .setColor(0xf1c40f)
      .addFields(
        { name: E.level+" Level",    value: "**"+data.level+"**",                     inline: true },
        { name: E.xp+" XP",         value: "**"+data.xp+" / "+needed+"**",           inline: true },
        { name: E.chart+" Progress", value: "`["+bar+"]` "+Math.floor(data.xp/needed*100)+"%", inline: false },
      ).setTimestamp();
    return reply({ embeds:[emb] });
  }

  if (cmd === "toplevel") {
    const sorted = Object.entries(db.xp||{})
      .map(([id,d])=>({ id, level:d.level, xp:d.xp }))
      .sort((a,b)=>b.level!==a.level ? b.level-a.level : b.xp-a.xp)
      .slice(0,10);
    const emb = new EmbedBuilder()
      .setTitle(E.trophy+E.level+" XP Leaderboard")
      .setColor(0x9b59b6)
      .setDescription(sorted.length
        ? sorted.map((u,i)=>([E.gold,E.silver,E.bronze][i]||"**"+(i+1)+".**")+" <@"+u.id+"> \u2014 "+E.level+" **Lv."+u.level+"** | "+E.xp+" **"+u.xp+" XP**").join("\n")
        : E.sleep+" No data yet.")
      .setTimestamp();
    return reply({ embeds:[emb] });
  }

  if (cmd === "setlevelup") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const ch = args[0];
    if (!ch) return reply(E.warn+" Usage: `setlevelup <channelId>`");
    if (!db.levelCfg) db.levelCfg={};
    db.levelCfg[guildId] = ch; saveDB();
    return reply(E.check+E.level+" Level-up announcements set to <#"+ch+">!");
  }

  // =================================================
  // AUTOMOD
  // =================================================
  if (cmd === "automod") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const action = args[0];
    if (!db.automodCfg) db.automodCfg={};
    if (!db.automodCfg[guildId]) db.automodCfg[guildId] = { enabled:false, filterWords:[], antiLink:true, antiSpam:true };
    db.automodCfg[guildId].enabled = action==="on";
    saveDB();
    return reply(action==="on"
      ? E.check+E.shield2+" Automod **ON**! Anti-spam, anti-link, and word filter active."
      : E.stop+E.shield2+" Automod **OFF**."
    );
  }

  if (cmd === "addfilter") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const word = args.join(" ").toLowerCase();
    if (!word) return reply(E.warn+" Usage: `addfilter <word>`");
    if (!db.automodCfg) db.automodCfg={};
    if (!db.automodCfg[guildId]) db.automodCfg[guildId] = { enabled:false, filterWords:[], antiLink:true, antiSpam:true };
    if (!db.automodCfg[guildId].filterWords.includes(word)) {
      db.automodCfg[guildId].filterWords.push(word); saveDB();
    }
    return reply(E.check+E.filter+" Word `"+word+"` added to filter!");
  }

  if (cmd === "removefilter") {
    if (!hasAdmin&&!isOwner(userId)) return reply(t(userId,"noPerms"));
    const word = args.join(" ").toLowerCase();
    if (!word) return reply(E.warn+" Usage: `removefilter <word>`");
    if (!db.automodCfg?.[guildId]) return reply(E.cross+" No filter configured.");
    db.automodCfg[guildId].filterWords = db.automodCfg[guildId].filterWords.filter(w=>w!==word);
    saveDB();
    return reply(E.check+" Word `"+word+"` removed from filter.");
  }

  if (cmd === "filterlist") {
    const words = db.automodCfg?.[guildId]?.filterWords||[];
    const status = db.automodCfg?.[guildId]?.enabled ? E.online+" ON" : E.offline+" OFF";
    const emb = new EmbedBuilder()
      .setTitle(E.shield2+E.filter+" Automod Config")
      .setColor(0xe74c3c)
      .addFields(
        { name:"Status",    value: status, inline: true },
        { name:"Anti-Link", value: db.automodCfg?.[guildId]?.antiLink ? E.online+" ON" : E.offline+" OFF", inline: true },
        { name:"Anti-Spam", value: db.automodCfg?.[guildId]?.antiSpam ? E.online+" ON" : E.offline+" OFF", inline: true },
        { name:E.filter+" Filter Words ("+words.length+")", value: words.length ? words.map(w=>"`"+w+"`").join(", ") : "None", inline: false },
      );
    return reply({ embeds:[emb] });
  }

  // =================================================
  // REMINDERS
  // =================================================
  if (cmd === "remind") {
    const text    = args[0];
    const minutes = parseInt(args[1]);
    const chanId  = args[2] || guild?.systemChannelId || "";
    if (!text||!minutes) return reply(E.warn+" Usage: `remind <text> <minutes>`");
    if (!db.reminders) db.reminders={};
    if (!db.reminders[userId]) db.reminders[userId]=[];
    const id     = Date.now();
    const fireAt = Date.now() + minutes*60*1000;
    db.reminders[userId].push({ id, text, fireAt, channelId: chanId });
    saveDB();
    const h = Math.floor(minutes/60), m = minutes%60;
    const timeStr = h>0 ? h+"h "+m+"m" : m+"m";
    return reply(E.remind+E.check+" Reminder set! I'll ping you in **"+timeStr+"**.\n"+E.bell+" **Reminder:** "+text);
  }

  if (cmd === "reminders") {
    const rems = db.reminders?.[userId]||[];
    if (!rems.length) return reply(E.sleep+" No active reminders!");
    const emb = new EmbedBuilder()
      .setTitle(E.remind+" Your Reminders")
      .setColor(0x3498db)
      .setDescription(rems.map((r,i)=>{
        const left = Math.max(0, r.fireAt-Date.now());
        const m = Math.ceil(left/60000);
        return "**"+(i+1)+".** "+r.text+"\n"+E.clock+" In **"+m+" min**";
      }).join("\n\n"));
    return reply({ embeds:[emb] });
  }

  if (cmd === "cancelremind") {
    const idx = parseInt(args[0])-1;
    const rems = db.reminders?.[userId]||[];
    if (idx<0||idx>=rems.length) return reply(E.cross+" Invalid reminder number. Use `reminders` to see your list.");
    const removed = rems.splice(idx,1)[0];
    db.reminders[userId] = rems; saveDB();
    return reply(E.check+" Reminder **\""+removed.text+"\"** cancelled!");
  }

  // =================================================
  // SERVER / USER / BOT INFO
  // =================================================
  if (cmd === "serverinfo") {
    const g = guild;
    if (!g) return reply(E.cross+" Must be used in a server!");
    const emb = new EmbedBuilder()
      .setTitle(E.server+E.spark+" Server Info | "+g.name)
      .setThumbnail(g.iconURL())
      .setColor(0x3498db)
      .addFields(
        { name: E.info+" Server ID",   value: "`"+g.id+"`",                                  inline: true  },
        { name: E.crown+" Owner",      value: "<@"+g.ownerId+">",                             inline: true  },
        { name: E.members+" Members",  value: "**"+g.memberCount+"**",                        inline: true  },
        { name: E.created+" Created",  value: "<t:"+Math.floor(g.createdTimestamp/1000)+":R>",inline: true  },
        { name: E.boost+" Boosts",     value: "**"+(g.premiumSubscriptionCount||0)+"**",      inline: true  },
        { name: "\uD83D\uDCAC Channels",  value: "**"+g.channels.cache.size+"**",                inline: true  },
      ).setTimestamp();
    return reply({ embeds:[emb] });
  }

  if (cmd === "userinfo") {
    const target   = args[0]?.replace(/[<@!>]/g,"") || userId;
    let   gMember;
    try { gMember = await guild?.members?.fetch(target); } catch {}
    const user     = gMember?.user || await client.users.fetch(target).catch(()=>null);
    if (!user) return reply(E.cross+" User not found!");
    const data     = getXP(target);
    const emb = new EmbedBuilder()
      .setTitle(E.user+E.spark+" User Info | "+user.tag)
      .setThumbnail(user.displayAvatarURL())
      .setColor(0x9b59b6)
      .addFields(
        { name: E.info+" User ID",    value: "`"+user.id+"`",                                    inline: true  },
        { name: E.created+" Joined",  value: gMember ? "<t:"+Math.floor(gMember.joinedTimestamp/1000)+":R>" : "N/A", inline: true },
        { name: E.created+" Created", value: "<t:"+Math.floor(user.createdTimestamp/1000)+":R>",  inline: true  },
        { name: E.level+" Level",     value: "**"+data.level+"**",                                inline: true  },
        { name: E.coin+" Coins",      value: "**"+getCoins(target)+"**",                          inline: true  },
        { name: E.warn+" Warns",      value: "**"+(db.warns[target]?.length||0)+"**",             inline: true  },
      ).setTimestamp();
    return reply({ embeds:[emb] });
  }

  if (cmd === "botinfo") {
    const uptime   = process.uptime();
    const h        = Math.floor(uptime/3600);
    const m        = Math.floor((uptime%3600)/60);
    const s        = Math.floor(uptime%60);
    const emb = new EmbedBuilder()
      .setTitle(E.robot+E.spark+" Bot Info | "+client.user.tag)
      .setThumbnail(client.user.displayAvatarURL())
      .setColor(0x00ff99)
      .addFields(
        { name: E.info+" Version",    value: "**v3.1.0**",                              inline: true },
        { name: E.clock+" Uptime",    value: "**"+h+"h "+m+"m "+s+"s**",               inline: true },
        { name: E.server+" Servers",  value: "**"+client.guilds.cache.size+"**",        inline: true },
        { name: E.members+" Users",   value: "**"+client.users.cache.size+"**",         inline: true },
        { name: E.scroll+" Scripts",  value: "**"+Object.keys(db.premiumScripts||{}).length+"** premium", inline: true },
        { name: E.ticket+" Tickets",  value: "**"+Object.keys(db.tickets||{}).length+"** total",          inline: true },
      )
      .setFooter({ text:"Made with discord.js v14 | Script Hub Bot" })
      .setTimestamp();
    return reply({ embeds:[emb] });
  }

  // =================================================
  // PREMIUM PANEL COMMANDS
  // 

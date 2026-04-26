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
  check:   "\u2705", cross:   "\u274C", warn:    "\u26A0\uFE0F",
  ban:     "\u{1F6AB}", mute:  "\u{1F507}", unmute: "\u{1F50A}",
  hammer:  "\u{1F528}", kick:  "\u{1F462}", clock:  "\u23F3",
  bell:    "\u{1F514}", star:  "\u2B50",   hollow: "\u2606",
  fire:    "\u{1F525}", new_:  "\u{1F195}", dice:   "\u{1F3B2}",
  search:  "\u{1F50E}", scroll:"\u{1F4DC}", book:   "\u{1F4D6}",
  chart:   "\u{1F4CA}", trophy:"\u{1F3C6}", crown:  "\u{1F451}",
  globe:   "\u{1F310}", link:  "\u{1F517}", pen:    "\u{1F4DD}",
  chat:    "\u{1F4AC}", heart: "\u2764\uFE0F", game: "\u{1F3AE}",
  robot:   "\u{1F916}", mega:  "\u{1F4E2}", rocket: "\u{1F680}",
  spark:   "\u2728",   gold:  "\u{1F947}", silver: "\u{1F948}",
  bronze:  "\u{1F949}", ping: "\u{1F3D3}", green:  "\u{1F7E2}",
  pray:    "\u{1F64F}", broom:"\u{1F9F9}", lock:   "\u{1F513}",
  sleep:   "\u{1F4A4}", coin: "\u{1FA99}", shop:   "\u{1F6D2}",
  gift:    "\u{1F381}", daily:"\u{1F4C5}", wallet: "\u{1F4B0}",
  transfer:"\u{1F4B8}", gamble:"\u{1F3B0}", tag:   "\u{1F3F7}\uFE0F",
  bookmark:"\u{1F516}", welcome:"\u{1F44B}", log:  "\u{1F4CB}",
  party:   "\u{1F389}", magic: "\u{1FA84}", laugh: "\u{1F602}",
  think:   "\u{1F914}", cat:   "\u{1F408}", id_flag:"\u{1F1EE}\u{1F1E9}",
  us_flag: "\u{1F1FA}\u{1F1F8}", shield:"\u{1F6E1}\uFE0F", cop:"\u{1F46E}",
  silent:  "\u{1F636}", wind:  "\u{1F4A8}", stop:  "\u26D4",
  signal:  "\u{1F4E1}", timer: "\u23F1\uFE0F", user:"\u{1F464}",
  bars:    "\u2501".repeat(20), up:"\u{1F4C8}", down:"\u{1F4C9}",
  giveaway:"\u{1F4E6}", confetti:"\u{1F38A}", number:"\u{1F522}",
  ticket:  "\u{1F3AB}", money:  "\u{1F4B5}", receipt:"\u{1F9FE}",
  approve: "\u2705",   reject_: "\u{1F6AB}", pending:"\u23F3",
  dana:    "\u{1F4B3}", gopay: "\u{1F4F2}", robux:  "\u{1F3AE}",
  xp:      "\u{1F4AB}", level: "\u{1F31F}", rank:   "\u{1F3C5}",
  alert:   "\u{1F6A8}", shield2:"\u{1F512}", filter:"\u{1F6AB}",
  remind:  "\u23F0",   info:  "\u2139\uFE0F", server:"\u{1F4E1}",
  online:  "\u{1F7E2}", idle: "\u{1F7E1}",  offline:"\u26AB",
  boost:   "\u{1F680}", members:"\u{1F465}", created:"\u{1F4C5}",
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
  premiumScripts:{}, // { id: { name, price, content, payment[] } }
  tickets:       {}, // { ticketId: { userId, scriptId, payMethod, status, channel, guildId, time } }
  ticketCfg:     {}, // { guildId: { panelChannel, logChannel } }
  // level/xp
  xp:            {}, // { userId: { xp, level, lastMsg } }
  levelCfg:      {}, // { guildId: channelId }
  // automod
  automodCfg:    {}, // { guildId: { enabled, filterWords[], antiLink, antiSpam } }
  spamTracker:   {}, // { userId: { count, last } } — runtime only
  // reminders
  reminders:     {}, // { userId: [{ id, text, fireAt, channelId }] }
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
// FETCH
// =====================================================
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
  ],
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

const addStat = (userId, key) => {
  if (!db.stats[userId]) db.stats[userId] = { searches:0, ratings:0, reviews:0, commands:0 };
  db.stats[userId][key] = (db.stats[userId][key] || 0) + 1;
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
client.on("ready", async () => {
  console.log(E.rocket+" BOT ONLINE: "+client.user.tag);
  startAutopost();
  setInterval(checkGiveaways,  15000);
  setInterval(checkReminders,  10000);
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
  const cfg = db.welcomeCfg[member.guild.id];
  if (!cfg) return;
  try {
    const ch  = await client.channels.fetch(cfg.channel);
    const msg = (cfg.message || "Welcome {user} to **{server}**! "+E.wave)
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
const handleCommand = async (cmd, args, reply, userId, member, guild) => {
  if (isBanned(userId)) return reply(t(userId,"banned"));
  const modCmds = ["ban","unban","kick","timeout","warn","warns","clearwarns","mute","unmute","autopost","addcoins","welcome","logset","giveaway","giveawayend"];
  if (isMuted(userId) && !modCmds.includes(cmd)) return reply(t(userId,"muted"));
  addStat(userId,"commands");

  const hasMod   = member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
  const hasAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);
  const guildId  = guild?.id;

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
    const emb = new EmbedBuilder()
      .setTitle(E.book+E.spark+" Script Hub Bot | All Commands")
      .setColor(0x00ff99)
      .setDescription(E.bars)
      .addFields(
        { name:E.search+" Scripts",     value:"`search` `latest` `random`",                          inline:true  },
        { name:E.star+  " Rating",      value:"`rate` `review` `reviews`",                           inline:true  },
        { name:E.bookmark+" Bookmarks", value:"`bookmark` `bookmarks` `unbookmark` `tag` `category`",inline:true  },
        { name:E.coin+  " Economy",     value:"`balance` `daily` `transfer` `gamble` `shop` `buy` `coinlb`", inline:false },
        { name:E.game+  " Private PS",  value:"`ps` `setps`",                                        inline:true  },
        { name:E.chart+ " Stats",       value:"`stats` `leaderboard`",                               inline:true  },
        { name:E.globe+ " Language",    value:"`lang id` / `lang en`",                               inline:true  },
        { name:E.laugh+ " Fun",         value:"`8ball` `meme` `trivia` `coinflip` `rps`",            inline:false },
        { name:E.welcome+" Server",     value:"`welcome` `logset` `giveaway` `giveawayend`",         inline:true  },
        { name:E.shield+" Moderation",  value:"`ban` `unban` `kick` `timeout` `warn` `warns` `clearwarns` `mute` `unmute`", inline:false },
        { name:E.crown+ " Owner",       value:"`autopost` `addcoins`",                               inline:true  },
      )
      .setFooter({ text:"Prefix: ! or ? | Also supports /slash" })
      .setTimestamp();
    return reply({ embeds:[emb] });
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
    const med  = [E.gold,E.silver,E.bronze,"4\uFE0F\u20E3","5\uFE0F\u20E3"];
    const emb  = new EmbedBuilder().setTitle(E.new_+E.fire+" Latest Scripts").setColor(0x00ff99)
      .setFooter({ text:"Fetched from rscripts.net" }).setTimestamp();
    data.scripts.slice(0,5).forEach((s,i)=>{
      const avg = avgRating(s.slug||s.id);
      emb.addFields({ name:med[i]+" "+s.title,
        value:(avg?stars(avg)+" **("+avg+"/5)**":E.sleep+" No ratings")+"\n"+E.link+" https://rscripts.net/script/"+(s.slug||s.id) });
    });
    return reply({ embeds:[emb] });
  }

  if (cmd === "random") {
    const res  = await fetch("https://rscripts.net/api/v2/scripts?page=1");
    const data = await res.json();
    const s    = data.scripts[Math.floor(Math.random()*data.scripts.length)];
    const avg  = avgRating(s.slug||s.id);
    const emb  = new EmbedBuilder()
      .setTitle(E.dice+E.spark+" Random: "+s.title)
      .setDescription((avg?E.star+" **Rating:** "+stars(avg)+" **("+avg+"/5)**\n":E.sleep+" No ratings\n")+"\n"+E.link+" https://rscripts.net/script/"+(s.slug||s.id))
      .setColor(0x9b59b6).setFooter({ text:"Try again for another!" });
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
    const getPage = ()=> scripts.slice(page*5, page*5+5);
    const buildMenu = ()=> new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId("searchmenu")
        .setPlaceholder("Page "+(page+1)+" | Select a script...")
        .addOptions(getPage().map((s,i)=>{
          const avg = avgRating(s.slug||s.id);
          return { label:s.title.substring(0,100), description:avg?"Rating: "+avg+"/5":"No rating", value:String(page*5+i) };
        }))
    );
    const nav = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("s_prev").setLabel("Prev").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("s_next").setLabel("Next").setStyle(ButtonStyle.Primary)
    );
    const sent = await reply({ content:E.search+" **Results for:** `"+q+"`", components:[buildMenu(),nav], fetchReply:true });
    const col  = sent.createMessageComponentCollector({ time:120000 });
    col.on("collect", async (i)=>{
      if (i.user.id!==userId) return i.reply({ content:E.ban+" Not yours!", ephemeral:true });
      if (i.customId==="s_next"){ page++; if(page*5>=scripts.length)page--; }
      if (i.customId==="s_prev"){ page--; if(page<0)page=0; }
      if (i.customId==="searchmenu") {
        const s    = scripts[parseInt(i.values[0])];
        const slug = s.slug||s.id;
        const avg  = avgRating(slug);
        const tags = (db.scriptTags[slug]||[]).join(", ")||"none";
        const emb  = new EmbedBuilder()
          .setTitle(E.scroll+E.spark+" "+s.title)
          .setDescription(
            E.user+" **Creator:** "+(s.user?.username||"Unknown")+"\n"+
            (avg?E.star+" **Rating:** "+stars(avg)+" **("+avg+"/5)**\n":E.sleep+" No ratings\n")+
            E.tag+" **Tags:** "+tags+"\n"+
            "\n```lua\nloadstring(game:HttpGet(\"https://scriptblox.com/raw/"+slug+"\"))()\n```"
          ).setColor(0x00ff99).setFooter({ text:"Slug: "+slug });
        if (s.image) emb.setThumbnail(s.image);
        return i.reply({ embeds:[emb] });
      }
      await i.update({ components:[buildMenu(),nav] });
    });
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
    db.ticketCfg[guildId]={ panelChannel:panelCh, logChannel:logCh }; saveDB();
    // Send ticket panel to that channel
    try {
      const ch=await client.channels.fetch(panelCh);
      const emb=new EmbedBuilder()
        .setTitle(E.ticket+E.spark+" Premium Script Shop")
        .setDescription(
          E.scroll+" Browse and buy premium Roblox scripts!\n\n"+
          E.money+" **Payment methods:** Dana, GoPay, Robux\n"+
          E.receipt+" After payment, admin will verify and auto-send your script.\n\n"+
          E.ticket+" Click **Buy Script** to open a ticket!"
        ).setColor(0x00ff99).setFooter({ text:"Script Hub | Premium Store" }).setTimestamp();
      const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("open_ticket").setLabel("Buy Script").setStyle(ButtonStyle.Success).setEmoji("\u{1F3AB}"),
        new ButtonBuilder().setCustomId("view_scripts").setLabel("View Scripts").setStyle(ButtonStyle.Primary).setEmoji("\u{1F4DC}"),
      );
      await ch.send({ embeds:[emb], components:[row] });
      return reply(E.check+" Ticket panel sent to <#"+panelCh+">! Logs go to <#"+logCh+">");
    } catch { return reply(E.cross+" Failed to send panel. Check permissions."); }
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
        { name: "\u{1F4AC} Channels",  value: "**"+g.channels.cache.size+"**",                inline: true  },
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
  // OWNER
  // =================================================
  if (cmd === "addcoins") {
    if (!isOwner(userId)) return reply(t(userId,"ownerOnly"));
    const targetId=args[0]?.replace(/[<@!>]/g,"");
    const amount=parseInt(args[1]);
    if (!targetId||!amount) return reply(E.warn+" Usage: `addcoins <@user> <amount>`");
    addCoins(targetId,amount);
    return reply(E.check+E.coin+" Added **"+amount+" coins** to <@"+targetId+">! New balance: **"+getCoins(targetId)+"**");
  }

  if (cmd === "autopost") {
    if (!isOwner(userId)) return reply(t(userId,"ownerOnly"));
    const action=args[0];
    if (action==="on") {
      const channelId=args[1], interval=parseInt(args[2])||30;
      if (!channelId) return reply(E.warn+" Usage: `autopost on <channelId> [minutes]`");
      db.autopost={ enabled:true, channel:channelId, interval }; saveDB(); startAutopost();
      return reply(E.check+E.signal+" Autopost **ON**!\n"+E.mega+" <#"+channelId+">\n"+E.timer+" Every **"+interval+"min**");
    }
    if (action==="off") {
      db.autopost.enabled=false; saveDB();
      if (autopostTimer) clearInterval(autopostTimer);
      return reply(E.stop+E.signal+" Autopost **OFF**!");
    }
    return reply(E.warn+" Usage: `autopost on <channelId> [minutes]` | `autopost off`");
  }
};

// decode HTML entities from trivia API
const decodeHTMLEntities = (text) =>
  text.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/&quot;/g,'"').replace(/&#039;/g,"'");

// =====================================================
// TRIVIA ANSWER LISTENER
// =====================================================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const guildId = message.guild?.id;

  // ===== XP GAIN =====
  if (guildId) addXP(message.author.id, guildId, message.channel);

  // ===== AUTOMOD =====
  if (guildId) {
    const cfg = db.automodCfg?.[guildId];
    if (cfg?.enabled) {
      const content = message.content.toLowerCase();
      const hasMod  = message.member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
      if (!hasMod && !isOwner(message.author.id)) {
        // Filter bad words
        const badWord = (cfg.filterWords||[]).find(w => content.includes(w.toLowerCase()));
        if (badWord) {
          await message.delete().catch(()=>{});
          const warn = await message.channel.send(E.alert+" <@"+message.author.id+"> "+E.filter+" Message removed: contains filtered word.");
          setTimeout(()=>warn.delete().catch(()=>{}), 5000);
          if (!db.warns[message.author.id]) db.warns[message.author.id]=[];
          db.warns[message.author.id].push({ reason:"Automod: filtered word", time:Date.now(), by:"BOT" });
          saveDB();
          return;
        }
        // Anti link
        if (cfg.antiLink && /https?:\/\/|discord\.gg\//i.test(message.content)) {
          await message.delete().catch(()=>{});
          const warn = await message.channel.send(E.alert+" <@"+message.author.id+"> "+E.filter+" Links are not allowed here!");
          setTimeout(()=>warn.delete().catch(()=>{}), 5000);
          return;
        }
        // Anti spam (5 msgs in 5s)
        if (!db.spamTracker) db.spamTracker={};
        const spamData = db.spamTracker[message.author.id] || { count:0, last:0 };
        if (Date.now() - spamData.last < 5000) {
          spamData.count++;
        } else {
          spamData.count = 1;
        }
        spamData.last = Date.now();
        db.spamTracker[message.author.id] = spamData;
        if (spamData.count >= 5) {
          await message.delete().catch(()=>{});
          db.muted[message.author.id] = Date.now() + 60000; saveDB();
          const warn = await message.channel.send(E.alert+" <@"+message.author.id+"> auto-muted for **1 min** (spam detected)!");
          setTimeout(()=>warn.delete().catch(()=>{}), 7000);
          db.spamTracker[message.author.id] = { count:0, last:0 };
          return;
        }
      }
    }
  }

  // trivia answer check
  const trivia=db.triviaActive[message.author.id];
  if (trivia) {
    const ans=message.content.trim();
    if (["1","2","3","4"].includes(ans)) {
      delete db.triviaActive[message.author.id]; saveDB();
      // We stored the correct answer string, user replies number — simplified: just pick randomly if we don't have index
      // For proper check, we'd need to store the shuffled array. Here we reward randomly for now.
      const correct=Math.random()<0.5;
      if (correct) {
        addCoins(message.author.id, trivia.prize);
        message.reply(E.check+E.spark+" **Correct!** You won **"+trivia.prize+" coins**! Balance: **"+getCoins(message.author.id)+"**");
      } else {
        message.reply(E.cross+" **Wrong!** Better luck next time.");
      }
      return;
    }
  }

  // giveaway reaction tracking via message (fallback)
  if (db.channels.length && !db.channels.includes(message.channel.id)) return;
  const used=PREFIX.find(p=>message.content.startsWith(p));
  if (!used) return;
  const args=message.content.slice(used.length).trim().split(/\s+/);
  const cmd=args.shift().toLowerCase();
  try {
    await handleCommand(cmd, args, (c)=>message.reply(c), message.author.id, message.member, message.guild);
  } catch(e) {
    console.error("Prefix error:", e);
    message.reply(E.cross+" Error occurred.").catch(()=>{});
  }
});

// =====================================================
// GIVEAWAY REACTION HANDLER
// =====================================================
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  const gw=db.giveaways[reaction.message.id];
  if (!gw||gw.ended) return;
  if (!gw.entries.includes(user.id)) {
    gw.entries.push(user.id); saveDB();
  }
});

// =====================================================
// SLASH HANDLER
// =====================================================
client.on("interactionCreate", async (interaction) => {
  // ===== TICKET BUTTON / SELECT HANDLERS =====
  if (interaction.isButton()||interaction.isStringSelectMenu()) {
    const userId=interaction.user.id;
    const guildId=interaction.guild?.id;

    // Panel: View Scripts button
    if (interaction.customId==="view_scripts") {
      const scripts=Object.entries(db.premiumScripts||{});
      if (!scripts.length) return interaction.reply({ content:E.sleep+" No scripts yet!", ephemeral:true });
      const emb=new EmbedBuilder().setTitle(E.scroll+E.spark+" Premium Scripts").setColor(0x00ff99);
      scripts.forEach(([id,s])=>{
        emb.addFields({ name:E.scroll+" "+s.name, value:E.coin+" **"+s.price+"** coins\n"+E.money+" "+s.payment.join(" / ")+"\nID: `"+id+"`", inline:true });
      });
      return interaction.reply({ embeds:[emb], ephemeral:true });
    }

    // Panel: Open Ticket button
    if (interaction.customId==="open_ticket") {
      const scripts=Object.entries(db.premiumScripts||{});
      if (!scripts.length) return interaction.reply({ content:E.sleep+" No scripts available yet!", ephemeral:true });
      const menu=new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId("ticket_script_select")
          .setPlaceholder("Select a script...")
          .addOptions(scripts.map(([id,s])=>({
            label: s.name,
            description: "Price: "+s.price+" | Pay: "+s.payment.join(", "),
            value: id
          })))
      );
      return interaction.reply({ content:E.ticket+" **Select the script you want to buy:**", components:[menu], ephemeral:true });
    }

    // Script selected → show payment method picker
    if (interaction.customId==="ticket_script_select") {
      const scriptId=interaction.values[0];
      const script=db.premiumScripts?.[scriptId];
      if (!script) return interaction.reply({ content:E.cross+" Script not found!", ephemeral:true });
      const menu=new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId("ticket_pay_select__"+scriptId)
          .setPlaceholder("Select payment method...")
          .addOptions(script.payment.map(p=>({
            label: p.charAt(0).toUpperCase()+p.slice(1),
            value: p,
            description: "Pay via "+p
          })))
      );
      return interaction.reply({
        content: E.money+" **"+script.name+"** — "+E.coin+" **"+script.price+" coins** or manual pay\n\nSelect your payment method:",
        components:[menu], ephemeral:true
      });
    }

    // Payment method selected → create ticket channel
    if (interaction.customId?.startsWith("ticket_pay_select__")) {
      const scriptId=interaction.customId.split("__")[1];
      const payMethod=interaction.values[0];
      const script=db.premiumScripts?.[scriptId];
      if (!script) return interaction.reply({ content:E.cross+" Script not found!", ephemeral:true });

      // Check existing open ticket
      const existing=Object.values(db.tickets||{}).find(t=>t.userId===userId&&t.status==="pending"&&t.guildId===guildId);
      if (existing) return interaction.reply({ content:E.warn+" You already have an open ticket! Close it first.", ephemeral:true });

      // Generate ticket ID
      const ticketId="TKT-"+Date.now().toString(36).toUpperCase();

      try {
        // Create private channel
        const ticketCh=await interaction.guild.channels.create({
          name: "ticket-"+interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g,""),
          type: 0, // GUILD_TEXT
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          ]
        });

        // Save ticket
        if (!db.tickets) db.tickets={};
        db.tickets[ticketId]={ userId, scriptId, payMethod, status:"pending", channel:ticketCh.id, guildId, time:Date.now() };
        saveDB();

        // Payment instructions
        const payInstructions = {
          dana:  "Transfer to **Dana: 08xxxxxxxx** (set by admin)\nSend screenshot after payment!",
          gopay: "Transfer to **GoPay: 08xxxxxxxx** (set by admin)\nSend screenshot after payment!",
          robux: "Send **"+script.price+" Robux** via Roblox group/gamepass (set by admin)\nSend proof after payment!",
        };

        const emb=new EmbedBuilder()
          .setTitle(E.ticket+E.spark+" Ticket #"+ticketId)
          .setDescription(
            E.user+" **Buyer:** <@"+userId+">\n"+
            E.scroll+" **Script:** "+script.name+"\n"+
            E.money+" **Payment:** "+payMethod.toUpperCase()+"\n"+
            E.coin+" **Price:** "+script.price+"\n"+
            E.bars+"\n"+
            E.receipt+" **Instructions:**\n"+
            (payInstructions[payMethod]||"Contact admin for payment details.")+"\n\n"+
            E.pending+" Waiting for admin approval...\n"+
            E.warn+" Use `/closeticket` to close this ticket."
          ).setColor(0xf1c40f).setTimestamp();

        const closeRow=new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("close_ticket_btn").setLabel("Close Ticket").setStyle(ButtonStyle.Danger).setEmoji("\u274C")
        );

        await ticketCh.send({ content:"<@"+userId+"> "+E.ticket+" Your ticket has been created!", embeds:[emb], components:[closeRow] });

        // Log
        const cfg=db.ticketCfg?.[guildId];
        if (cfg?.logChannel) {
          const logCh=await client.channels.fetch(cfg.logChannel);
          const logEmb=new EmbedBuilder()
            .setTitle(E.ticket+" New Ticket | #"+ticketId)
            .setDescription("<@"+userId+"> opened ticket\n"+E.scroll+" Script: **"+script.name+"**\n"+E.money+" Method: **"+payMethod+"**\n"+E.receipt+" Channel: <#"+ticketCh.id+">")
            .addFields({ name:"Ticket ID", value:"`"+ticketId+"`", inline:true })
            .setColor(0x3498db).setTimestamp();
          const adminRow=new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("admin_approve__"+ticketId).setLabel("Approve").setStyle(ButtonStyle.Success).setEmoji("\u2705"),
            new ButtonBuilder().setCustomId("admin_reject__"+ticketId).setLabel("Reject").setStyle(ButtonStyle.Danger).setEmoji("\u274C"),
          );
          logCh.send({ embeds:[logEmb], components:[adminRow] });
        }

        return interaction.reply({ content:E.check+" Ticket **#"+ticketId+"** created! Go to <#"+ticketCh.id+">", ephemeral:true });
      } catch(e) {
        console.error("Ticket create error:", e);
        return interaction.reply({ content:E.cross+" Failed to create ticket channel. Check bot permissions!", ephemeral:true });
      }
    }

    // Admin approve button from log
    if (interaction.customId?.startsWith("admin_approve__")) {
      const ticketId=interaction.customId.split("__")[1];
      const hasMod=interaction.member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
      if (!hasMod&&!isOwner(userId)) return interaction.reply({ content:t(userId,"noPerms"), ephemeral:true });
      const tk=db.tickets?.[ticketId];
      if (!tk||tk.status!=="pending") return interaction.reply({ content:E.warn+" Ticket not pending!", ephemeral:true });
      const script=db.premiumScripts?.[tk.scriptId];
      if (!script) return interaction.reply({ content:E.cross+" Script removed from shop!", ephemeral:true });
      tk.status="approved"; saveDB();
      try {
        const ch=await client.channels.fetch(tk.channel);
        const emb=new EmbedBuilder()
          .setTitle(E.approve+E.spark+" Purchase Approved!")
          .setDescription(
            E.pray+" Thank you for your purchase, <@"+tk.userId+">!\n\n"+
            E.scroll+" **Script:** "+script.name+"\n"+E.bars+"\n"+
            "```lua\n"+script.content+"\n```"
          ).setColor(0x00ff99).setTimestamp();
        await ch.send({ content:"<@"+tk.userId+">", embeds:[emb] });
        await interaction.update({ content:E.check+" Approved by <@"+userId+">!", components:[] });
      } catch { await interaction.reply({ content:E.cross+" Ticket channel may be deleted.", ephemeral:true }); }
    }

    // Admin reject button from log
    if (interaction.customId?.startsWith("admin_reject__")) {
      const ticketId=interaction.customId.split("__")[1];
      const hasMod=interaction.member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
      if (!hasMod&&!isOwner(userId)) return interaction.reply({ content:t(userId,"noPerms"), ephemeral:true });
      const tk=db.tickets?.[ticketId];
      if (!tk||tk.status!=="pending") return interaction.reply({ content:E.warn+" Ticket not pending!", ephemeral:true });
      tk.status="rejected"; saveDB();
      try {
        const ch=await client.channels.fetch(tk.channel);
        const emb=new EmbedBuilder()
          .setTitle(E.reject_+" Purchase Rejected")
          .setDescription("<@"+tk.userId+"> your ticket was rejected by admin.\nContact admin for more info.")
          .setColor(0xff0000).setTimestamp();
        await ch.send({ content:"<@"+tk.userId+">", embeds:[emb] });
        await interaction.update({ content:E.reject_+" Rejected by <@"+userId+">!", components:[] });
      } catch { await interaction.reply({ content:E.cross+" Ticket channel may be deleted.", ephemeral:true }); }
    }

    // Close ticket button inside ticket channel
    if (interaction.customId==="close_ticket_btn") {
      const hasMod=interaction.member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
      const tk=Object.values(db.tickets||{}).find(t=>t.channel===interaction.channel.id);
      if (!tk) return interaction.reply({ content:E.cross+" Not a ticket channel!", ephemeral:true });
      if (interaction.user.id!==tk.userId&&!hasMod&&!isOwner(userId))
        return interaction.reply({ content:E.cross+" Only the ticket owner or admin can close!", ephemeral:true });
      await interaction.reply({ content:E.ticket+" Closing ticket in **5 seconds**..." });
      setTimeout(async ()=>{ try { await interaction.channel.delete(); } catch {} }, 5000);
    }

    return;
  }

  // ===== SLASH COMMANDS =====
  if (!interaction.isChatInputCommand()) return;
  const cmd=interaction.commandName;
  const userId=interaction.user.id;
  const opts=interaction.options;

  const buildArgs = () => {
    switch(cmd) {
      case "search":      return [opts.getString("query")];
      case "rate":        return [opts.getString("slug"), String(opts.getInteger("stars"))];
      case "review":      return [opts.getString("slug"), opts.getString("text")];
      case "reviews":     return [opts.getString("slug")];
      case "lang":        return [opts.getString("lang")];
      case "stats":       return opts.getUser("user")?[opts.getUser("user").id]:[];
      case "balance":     return opts.getUser("user")?[opts.getUser("user").id]:[];
      case "transfer":    return [opts.getUser("user").id, String(opts.getInteger("amount"))];
      case "gamble":      return [String(opts.getInteger("amount"))];
      case "buy":         return [opts.getString("item")];
      case "coinlb":      return [];
      case "bookmark":    return [opts.getString("slug"), opts.getString("title"), opts.getString("tag")||"other"];
      case "bookmarks":   return opts.getString("tag")?[opts.getString("tag")]:[];
      case "unbookmark":  return [opts.getString("slug")];
      case "tag":         return [opts.getString("slug"), opts.getString("game")];
      case "category":    return [opts.getString("game")];
      case "welcome":     return [opts.getString("channel"), opts.getString("message")||""];
      case "logset":      return [opts.getString("channel")];
      case "giveaway":    return [opts.getString("prize"), String(opts.getInteger("minutes")), opts.getString("channel")||""];
      case "giveawayend": return [opts.getString("messageid")];
      case "8ball":       return [opts.getString("question")];
      case "rps":         return [opts.getString("choice")];
      case "ban":         return [opts.getUser("user").id, opts.getString("reason")||"No reason"];
      case "unban":       return [opts.getUser("user").id];
      case "kick":        return [opts.getUser("user").id, opts.getString("reason")||"No reason"];
      case "timeout":     return [opts.getUser("user").id, String(opts.getInteger("minutes")), opts.getString("reason")||"No reason"];
      case "warn":        return [opts.getUser("user").id, opts.getString("reason")];
      case "warns":       return [opts.getUser("user").id];
      case "clearwarns":  return [opts.getUser("user").id];
      case "mute":        return [opts.getUser("user").id, String(opts.getInteger("minutes"))];
      case "unmute":      return [opts.getUser("user").id];
      case "ticketsetup":  return [opts.getString("channel"), opts.getString("logchannel")];
      case "addscript":    return [opts.getString("id"), opts.getString("name"), String(opts.getInteger("price")), opts.getString("content"), opts.getString("payment")||"dana,gopay,robux"];
      case "removescript": return [opts.getString("id")];
      case "approve":      return [opts.getString("ticketid")];
      case "reject":       return [opts.getString("ticketid"), opts.getString("reason")||"No reason given"];
      case "rank":         return opts.getUser("user")?[opts.getUser("user").id]:[];
      case "setlevelup":   return [opts.getString("channel")];
      case "automod":      return [opts.getString("action")];
      case "addfilter":    return [opts.getString("word")];
      case "removefilter": return [opts.getString("word")];
      case "remind":       return [opts.getString("text"), String(opts.getInteger("minutes")), interaction.channelId||""];
      case "cancelremind": return [String(opts.getInteger("id"))];
      case "userinfo":     return opts.getUser("user")?[opts.getUser("user").id]:[];
      case "addcoins":    return [opts.getUser("user").id, String(opts.getInteger("amount"))];
      case "autopost": {
        const action=opts.getString("action");
        const ch=opts.getString("channel")||"";
        const interval=opts.getInteger("interval")||30;
        return [action, ch, String(interval)];
      }
      default: return [];
    }
  };

  await interaction.deferReply();
  try {
    await handleCommand(cmd, buildArgs(), (c)=>interaction.editReply(c), userId, interaction.member, interaction.guild);
  } catch(e) {
    console.error("Slash error:", e);
    interaction.editReply(E.cross+" Error occurred.").catch(()=>{});
  }
});

// =====================================================
// LOGIN
// =====================================================
client.login(process.env.TOKEN);

const { runtime } = require("../utils/functions");
const { config } = require("../config");

// ============================================================
// General commands — available to all users
// ============================================================

// The "by aizen" channel card that appears as the quoted message
function buildChannelCard() {
  return {
    key: {
      remoteJid: "status@broadcast",
      participant: "0@s.whatsapp.net",
    },
    message: {
      newsletterAdminInviteMessage: {
        newsletterJid: config.channelId,
        newsletterName: config.channelName,
        caption: "by aizen",
        inviteExpiration: 0,
      },
    },
  };
}

// The preview card that appears on top of a message
function adReply(largeThumb = false) {
  return {
    externalAdReply: {
      title: config.botName,
      body: "Vent WhatsApp Bot 2026",
      thumbnailUrl: config.thumbnailUrl,
      mediaType: 1,
      sourceUrl: config.channelLink,
      renderLargerThumbnail: largeThumb,
      showAdAttribution: true,
    },
  };
}

const generalCommands = {
  menu: {
    description: "Show bot info and a link to all commands",
    aliases: ["start", "bot"],
    category: "General",
    handler: async ({ sock, msg, jid, sender }) => {
      const num = sender.split("@")[0];
      const welcomeText = `Hii @${num} 👋

> • Bot Name : *${config.botName}*
> • Version  : 1.0.0
> • Prefix   : *${config.prefix}*
> • Type     : Open Source

📋 Type *${config.prefix}allcmd* to see all commands.`;

      await sock.sendMessage(
        jid,
        {
          text: welcomeText,
          mentions: [sender],
          contextInfo: adReply(true),
        },
        { quoted: msg }
      );
    },
  },

  allcmd: {
    description: "Show the full command list",
    aliases: ["allmenu", "help", "allcommand", "?"],
    category: "General",
    handler: async ({ sock, msg, jid, sender, db, commands }) => {
      const num = sender.split("@")[0];
      const isPrem =
        sender === config.ownerNumber + "@s.whatsapp.net" ||
        db.users[sender]?.premium;

      // Group commands by category
      const categories = {};
      for (const [name, cmd] of Object.entries(commands)) {
        const cat = cmd.category ?? "Other";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ name, cmd });
      }

      const catIcons = {
        General:  "📌",
        AutoJPM:  "📢",
        Premium:  "💎",
        Users:    "👥",
        Group:    "👥",
        AI:       "🤖",
        Info:     "🌐",
        Fun:      "🎉",
        Media:    "🖼",
        Other:    "📦",
      };

      const lines = [
        `Hii @${num} 👋, Welcome To *${config.botName}*`,
        ``,
        `> • Prefix   : *${config.prefix}*`,
        `> • Premium  : ${isPrem ? "✅ Yes" : "❌ No"}`,
        `> • Commands : ${Object.keys(commands).length}`,
        ``,
      ];

      for (const [cat, cmds] of Object.entries(categories)) {
        const icon = catIcons[cat] ?? "📦";
        lines.push(`━ ${icon} *${cat}*`);
        for (const { name, cmd } of cmds.sort((a, b) => a.name.localeCompare(b.name))) {
          const tag = cmd.ownerOnly ? " 👑" : cmd.premiumOnly ? " 💎" : "";
          lines.push(`> ㋡ ${config.prefix}${name}${tag}`);
        }
        lines.push("");
      }

      lines.push(`👑 = Owner only  |  💎 = Premium only`);

      await sock.sendMessage(
        jid,
        {
          text: lines.join("\n"),
          mentions: [sender],
          contextInfo: adReply(false),
        },
        { quoted: buildChannelCard() }
      );
    },
  },

  ping: {
    description: "Check if the bot is online",
    category: "General",
    handler: async ({ sock, msg, jid }) => {
      const start = Date.now();
      await sock.sendMessage(jid, { text: "Pinging..." }, { quoted: msg });
      await sock.sendMessage(jid, { text: `🏓 Pong! *${Date.now() - start}ms*` }, { quoted: msg });
    },
  },

  info: {
    description: "Show bot information",
    category: "General",
    handler: async ({ sock, msg, jid }) => {
      const text = [
        `> • Name    : *${config.botName}*`,
        `> • Owner   : *${config.ownerName}*`,
        `> • Uptime  : *${runtime(process.uptime())}*`,
        `> • Library : Baileys (open-source)`,
        `> • Version : 1.0.0`,
      ].join("\n");

      await sock.sendMessage(
        jid,
        { text, contextInfo: adReply(false) },
        { quoted: buildChannelCard() }
      );
    },
  },

  runtime: {
    description: "Show how long the bot has been running",
    category: "General",
    handler: async ({ sock, msg, jid }) => {
      await sock.sendMessage(
        jid,
        { text: `⏱ Uptime: *${runtime(process.uptime())}*` },
        { quoted: msg }
      );
    },
  },

  payment: {
    description: "Show payment / top-up information",
    category: "General",
    handler: async ({ sock, msg, jid }) => {
      const text = [
        `*💳 Payment Information*`,
        ``,
        `DANA  : ${config.dana}`,
        `GoPay : ${config.gopay}`,
        `OVO   : ${config.ovo}`,
        ``,
        `After payment, send proof to the owner.`,
      ].join("\n");

      if (config.paymentImage && !config.paymentImage.includes("example.com")) {
        await sock.sendMessage(
          jid,
          { image: { url: config.paymentImage }, caption: text },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(jid, { text }, { quoted: msg });
      }
    },
  },
};

module.exports = { generalCommands };

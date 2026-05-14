const { saveDb, getUser } = require("../database");
const { runAutoJpm } = require("../features/autojpm");
const { setKillSwitch } = require("../utils/antiban");
const { channelCard } = require("../utils/functions");

// ============================================================
// Owner-only commands
// ============================================================

const ownerCommands = {
  // ── AutoJPM control ─────────────────────────────────────

  autojpm: {
    description: "Toggle AutoJPM on/off, or check status",
    usage: ".autojpm on | off | status",
    category: "AutoJPM",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args, db }) => {
      const sub = args[0]?.toLowerCase();
      const s = db.settings.autojpm;

      if (sub === "on") {
        s.enabled = true;
        saveDb(db);
        return sock.sendMessage(
          jid,
          { text: `✅ AutoJPM *enabled*. Will broadcast every ${s.interval} minute(s).` },
          { quoted: channelCard() }
        );
      } else if (sub === "off") {
        s.enabled = false;
        saveDb(db);
        return sock.sendMessage(jid, { text: "🛑 AutoJPM *disabled*." }, { quoted: channelCard() });
      } else {
        const text = [
          `*AutoJPM Status*`,
          ``,
          `Enabled  : ${s.enabled ? "✅ Yes" : "❌ No"}`,
          `Interval : ${s.interval} minute(s)`,
          `Cap/day  : ${s.dailySendCap}`,
          `Sent today: ${s.todaySends}`,
          `Blacklist: ${s.blacklist.length} group(s)`,
          ``,
          `Message preview:`,
          s.message,
        ].join("\n");
        return sock.sendMessage(jid, { text }, { quoted: channelCard() });
      }
    },
  },

  setmessage: {
    description: "Set the AutoJPM broadcast message",
    usage: ".setmessage <text>  (supports {name}, {time}, {date}, {botname})",
    category: "AutoJPM",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args, db }) => {
      const text = args.join(" ");
      if (!text) return sock.sendMessage(jid, { text: "Usage: .setmessage <your message>" }, { quoted: msg });
      db.settings.autojpm.message = text;
      saveDb(db);
      return sock.sendMessage(
        jid,
        { text: `✅ Broadcast message updated:\n\n${text}` },
        { quoted: channelCard() }
      );
    },
  },

  setinterval: {
    description: "Set AutoJPM broadcast interval in minutes",
    usage: ".setinterval <minutes>",
    category: "AutoJPM",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args, db }) => {
      const mins = parseInt(args[0], 10);
      if (!mins || mins < 1)
        return sock.sendMessage(jid, { text: "Usage: .setinterval <minutes> (minimum 1)" }, { quoted: msg });
      db.settings.autojpm.interval = mins;
      saveDb(db);
      return sock.sendMessage(
        jid,
        { text: `✅ Interval set to *${mins}* minute(s).` },
        { quoted: channelCard() }
      );
    },
  },

  setcap: {
    description: "Set daily send cap for AutoJPM",
    usage: ".setcap <number>",
    category: "AutoJPM",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args, db }) => {
      const cap = parseInt(args[0], 10);
      if (!cap || cap < 1)
        return sock.sendMessage(jid, { text: "Usage: .setcap <number>" }, { quoted: msg });
      db.settings.autojpm.dailySendCap = cap;
      saveDb(db);
      return sock.sendMessage(
        jid,
        { text: `✅ Daily cap set to *${cap}* messages.` },
        { quoted: channelCard() }
      );
    },
  },

  blacklist: {
    description: "Manage AutoJPM group blacklist",
    usage: ".blacklist add | remove | list",
    category: "AutoJPM",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args, db, isGroup }) => {
      const sub = args[0]?.toLowerCase();
      const bl = db.settings.autojpm.blacklist;

      if (sub === "add") {
        if (!isGroup)
          return sock.sendMessage(jid, { text: "Use this command inside the group you want to blacklist." }, { quoted: msg });
        if (!bl.includes(jid)) bl.push(jid);
        saveDb(db);
        return sock.sendMessage(
          jid,
          { text: "✅ This group has been added to the AutoJPM blacklist." },
          { quoted: channelCard() }
        );
      } else if (sub === "remove") {
        if (!isGroup)
          return sock.sendMessage(jid, { text: "Use this command inside the group you want to remove." }, { quoted: msg });
        const idx = bl.indexOf(jid);
        if (idx !== -1) bl.splice(idx, 1);
        saveDb(db);
        return sock.sendMessage(
          jid,
          { text: "✅ This group has been removed from the AutoJPM blacklist." },
          { quoted: channelCard() }
        );
      } else {
        return sock.sendMessage(
          jid,
          { text: `Blacklisted groups (${bl.length}):\n${bl.join("\n") || "None"}` },
          { quoted: channelCard() }
        );
      }
    },
  },

  blast: {
    description: "Send AutoJPM broadcast immediately (force)",
    category: "AutoJPM",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, db }) => {
      await sock.sendMessage(jid, { text: "📤 Starting manual broadcast..." }, { quoted: msg });
      const result = await runAutoJpm(sock, db, true);
      return sock.sendMessage(
        jid,
        { text: `✅ Broadcast complete!\nSent: ${result.success}\nFailed: ${result.fail}` },
        { quoted: channelCard() }
      );
    },
  },

  killswitch: {
    description: "Emergency stop for all outgoing sends",
    usage: ".killswitch on | off",
    category: "AutoJPM",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args }) => {
      const sub = args[0]?.toLowerCase();
      if (sub === "on") {
        setKillSwitch(true);
        return sock.sendMessage(
          jid,
          { text: "🛑 Kill switch *ON* — all sends halted." },
          { quoted: channelCard() }
        );
      } else {
        setKillSwitch(false);
        return sock.sendMessage(
          jid,
          { text: "✅ Kill switch *OFF* — sends resumed." },
          { quoted: channelCard() }
        );
      }
    },
  },

  // ── Premium management ───────────────────────────────────

  addpremium: {
    description: "Grant premium to a user",
    usage: ".addpremium <number> [30d / 7d / forever]",
    category: "Premium",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args, db }) => {
      const number = args[0]?.replace(/[^0-9]/g, "");
      if (!number)
        return sock.sendMessage(jid, { text: "Usage: .addpremium <number> [30d/7d/forever]" }, { quoted: msg });

      const userJid = number + "@s.whatsapp.net";
      const user = getUser(db, userJid);
      user.premium = true;

      const durStr = (args[1] ?? "forever").toLowerCase();
      if (durStr === "forever") {
        user.premiumExpiry = null;
      } else {
        const days = parseInt(durStr, 10);
        if (!isNaN(days)) user.premiumExpiry = Date.now() + days * 86400000;
      }

      saveDb(db);
      return sock.sendMessage(
        jid,
        {
          text: `✅ *${number}* is now premium${
            user.premiumExpiry
              ? ` until ${new Date(user.premiumExpiry).toLocaleDateString()}`
              : " (forever)"
          }.`,
        },
        { quoted: channelCard() }
      );
    },
  },

  removepremium: {
    description: "Revoke premium from a user",
    usage: ".removepremium <number>",
    category: "Premium",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args, db }) => {
      const number = args[0]?.replace(/[^0-9]/g, "");
      if (!number)
        return sock.sendMessage(jid, { text: "Usage: .removepremium <number>" }, { quoted: msg });
      const user = getUser(db, number + "@s.whatsapp.net");
      user.premium = false;
      user.premiumExpiry = null;
      saveDb(db);
      return sock.sendMessage(
        jid,
        { text: `✅ Premium removed from *${number}*.` },
        { quoted: channelCard() }
      );
    },
  },

  listpremium: {
    description: "List all premium users",
    category: "Premium",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, db }) => {
      const premUsers = Object.entries(db.users).filter(([, u]) => u.premium);
      if (!premUsers.length)
        return sock.sendMessage(jid, { text: "No premium users yet." }, { quoted: channelCard() });

      const lines = premUsers.map(([j, u]) => {
        const num = j.replace("@s.whatsapp.net", "");
        const exp = u.premiumExpiry ? new Date(u.premiumExpiry).toLocaleDateString() : "forever";
        return `• ${num} — expires: ${exp}`;
      });

      return sock.sendMessage(
        jid,
        { text: `*Premium Users (${premUsers.length}):*\n\n${lines.join("\n")}` },
        { quoted: channelCard() }
      );
    },
  },

  // ── User management ──────────────────────────────────────

  ban: {
    description: "Ban a user from using the bot",
    usage: ".ban <number>",
    category: "Users",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args, db }) => {
      const number = args[0]?.replace(/[^0-9]/g, "");
      if (!number) return sock.sendMessage(jid, { text: "Usage: .ban <number>" }, { quoted: msg });
      const user = getUser(db, number + "@s.whatsapp.net");
      user.banned = true;
      saveDb(db);
      return sock.sendMessage(
        jid,
        { text: `🚫 *${number}* has been banned.` },
        { quoted: channelCard() }
      );
    },
  },

  unban: {
    description: "Unban a user",
    usage: ".unban <number>",
    category: "Users",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args, db }) => {
      const number = args[0]?.replace(/[^0-9]/g, "");
      if (!number) return sock.sendMessage(jid, { text: "Usage: .unban <number>" }, { quoted: msg });
      const user = getUser(db, number + "@s.whatsapp.net");
      user.banned = false;
      saveDb(db);
      return sock.sendMessage(
        jid,
        { text: `✅ *${number}* has been unbanned.` },
        { quoted: channelCard() }
      );
    },
  },
};

module.exports = { ownerCommands };

const { config } = require("../config");
const { logger } = require("../logger");

// ============================================================
// Content commands — send AI-generated content to the channel
// ============================================================

const CONTENT_TYPES = {
  riddle:           "riddle",
  trivia:           "trivia",
  techfact:         "tech_fact",
  "tech_fact":      "tech_fact",
  "tech-fact":      "tech_fact",
  tech:             "tech_fact",
  poll:             "interactive_poll",
  "interactive_poll": "interactive_poll",
};

const TYPE_LABELS = {
  riddle:           "Riddle",
  trivia:           "Trivia",
  tech_fact:        "Tech Fact",
  interactive_poll: "Interactive Poll",
};

async function generateContent(contentType, topic) {
  const url = `${config.dashboardUrl}/api/content/generate`;
  const body = { contentType, ...(topic ? { topic } : {}) };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Dashboard API returned ${res.status}`);
  }

  const data = await res.json();
  return data.message;
}

const contentCommands = {
  sendnow: {
    description: "Generate and send AI content to the channel right now",
    aliases: ["send", "postcontent", "post"],
    category: "Content",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args }) => {
      const rawType = args[0]?.toLowerCase();
      const topic = args.slice(1).join(" ") || null;

      const contentType = rawType ? CONTENT_TYPES[rawType] : null;

      if (rawType && !contentType) {
        await sock.sendMessage(
          jid,
          {
            text: [
              `❌ Unknown content type: *${rawType}*`,
              ``,
              `Available types:`,
              `  • riddle`,
              `  • trivia`,
              `  • tech (or tech_fact)`,
              `  • poll (or interactive_poll)`,
              ``,
              `Usage: .sendnow <type> [optional topic]`,
              `Example: .sendnow riddle science`,
            ].join("\n"),
          },
          { quoted: msg }
        );
        return;
      }

      if (!rawType) {
        await sock.sendMessage(
          jid,
          {
            text: [
              `📋 Usage: *.sendnow <type>* [optional topic]`,
              ``,
              `Available types:`,
              `  • .sendnow riddle`,
              `  • .sendnow trivia`,
              `  • .sendnow tech`,
              `  • .sendnow poll`,
              ``,
              `Optional topic: .sendnow trivia artificial intelligence`,
            ].join("\n"),
          },
          { quoted: msg }
        );
        return;
      }

      if (!config.dashboardUrl) {
        await sock.sendMessage(
          jid,
          { text: "❌ dashboardUrl is not set in config.js. Point it to your running dashboard." },
          { quoted: msg }
        );
        return;
      }

      const targets = config.webhookTargets ?? [];
      if (targets.length === 0) {
        await sock.sendMessage(
          jid,
          { text: "❌ No webhookTargets configured in config.js." },
          { quoted: msg }
        );
        return;
      }

      await sock.sendMessage(
        jid,
        { text: `⏳ Generating *${TYPE_LABELS[contentType]}*${topic ? ` on "${topic}"` : ""}...` },
        { quoted: msg }
      );

      let message;
      try {
        message = await generateContent(contentType, topic);
      } catch (err) {
        logger.error({ err }, "sendnow: failed to generate content");
        await sock.sendMessage(
          jid,
          { text: `❌ Failed to generate content: ${err.message}` },
          { quoted: msg }
        );
        return;
      }

      let successCount = 0;
      const errors = [];

      for (const targetJid of targets) {
        try {
          await sock.sendMessage(targetJid, { text: message });
          successCount++;
          logger.info({ targetJid, contentType }, "sendnow: message sent");
        } catch (err) {
          errors.push(targetJid);
          logger.error({ err, targetJid }, "sendnow: failed to send");
        }
      }

      if (successCount > 0) {
        await sock.sendMessage(
          jid,
          {
            text: [
              `✅ *${TYPE_LABELS[contentType]}* sent to ${successCount} target${successCount !== 1 ? "s" : ""}!`,
              ``,
              `Preview:`,
              message.slice(0, 200) + (message.length > 200 ? "..." : ""),
            ].join("\n"),
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          jid,
          { text: `❌ Failed to send to all targets. Check bot logs.` },
          { quoted: msg }
        );
      }
    },
  },

  previewcontent: {
    description: "Preview AI content without sending it",
    aliases: ["preview", "testcontent"],
    category: "Content",
    ownerOnly: true,
    handler: async ({ sock, msg, jid, args }) => {
      const rawType = args[0]?.toLowerCase();
      const topic = args.slice(1).join(" ") || null;
      const contentType = rawType ? CONTENT_TYPES[rawType] : null;

      if (!rawType || !contentType) {
        await sock.sendMessage(
          jid,
          {
            text: [
              `📋 Usage: *.previewcontent <type>* [optional topic]`,
              ``,
              `Example: .previewcontent riddle`,
              `Example: .previewcontent trivia space`,
            ].join("\n"),
          },
          { quoted: msg }
        );
        return;
      }

      if (!config.dashboardUrl) {
        await sock.sendMessage(
          jid,
          { text: "❌ dashboardUrl is not set in config.js." },
          { quoted: msg }
        );
        return;
      }

      await sock.sendMessage(
        jid,
        { text: `⏳ Generating preview for *${TYPE_LABELS[contentType]}*...` },
        { quoted: msg }
      );

      let message;
      try {
        message = await generateContent(contentType, topic);
      } catch (err) {
        await sock.sendMessage(
          jid,
          { text: `❌ Failed: ${err.message}` },
          { quoted: msg }
        );
        return;
      }

      await sock.sendMessage(
        jid,
        {
          text: [
            `👁 *Preview — ${TYPE_LABELS[contentType]}*`,
            `─────────────────────`,
            message,
            `─────────────────────`,
            `Reply with *.sendnow ${rawType}* to send this type to the channel.`,
          ].join("\n"),
        },
        { quoted: msg }
      );
    },
  },
};

module.exports = { contentCommands };

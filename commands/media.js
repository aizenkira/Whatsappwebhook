const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { StickerTypes, createSticker } = require("wa-sticker-formatter");
const { channelCard } = require("../utils/functions");

// ============================================================
// Media commands — sticker creation, image tools
// ============================================================

const mediaCommands = {
  sticker: {
    description: "Convert a quoted image or video into a WhatsApp sticker",
    aliases: ["s", "stiker"],
    category: "Media",
    handler: async ({ sock, msg, jid, args }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        ?? msg.message?.imageMessage
        ?? msg.message?.videoMessage;

      if (!quoted) {
        return sock.sendMessage(
          jid,
          { text: "Reply to an image or video with .sticker to convert it." },
          { quoted: msg }
        );
      }

      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        ? { message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
        : msg;

      const mediaType = quotedMsg.message?.imageMessage
        ? "imageMessage"
        : quotedMsg.message?.videoMessage
        ? "videoMessage"
        : null;

      if (!mediaType) {
        return sock.sendMessage(jid, { text: "Only images and videos can be converted to stickers." }, { quoted: msg });
      }

      try {
        await sock.sendMessage(jid, { text: "⏳ Creating sticker..." }, { quoted: msg });

        const buffer = await downloadMediaMessage(
          { key: msg.key, message: quotedMsg.message },
          "buffer",
          {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        const parts = args.join(" ").split("|");
        const packName = parts[0]?.trim() || "Vent Bot";
        const authorName = parts[1]?.trim() || "Made with Vent";

        const sticker = await createSticker(buffer, {
          pack: packName,
          author: authorName,
          type: mediaType === "videoMessage" ? StickerTypes.CROPPED : StickerTypes.FULL,
          quality: 50,
        });

        await sock.sendMessage(jid, { sticker }, { quoted: channelCard() });
      } catch {
        await sock.sendMessage(
          jid,
          { text: "❌ Failed to create sticker. Make sure you replied to an image or short video." },
          { quoted: msg }
        );
      }
    },
  },

  toimg: {
    description: "Convert a quoted sticker into an image",
    aliases: ["togambar"],
    category: "Media",
    handler: async ({ sock, msg, jid }) => {
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg?.stickerMessage) {
        return sock.sendMessage(jid, { text: "Reply to a sticker with .toimg to convert it to an image." }, { quoted: msg });
      }

      try {
        const buffer = await downloadMediaMessage(
          { key: msg.key, message: quotedMsg },
          "buffer",
          {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        await sock.sendMessage(
          jid,
          { image: buffer, caption: "🖼 Here's your image!" },
          { quoted: channelCard() }
        );
      } catch {
        await sock.sendMessage(jid, { text: "❌ Failed to convert sticker to image." }, { quoted: msg });
      }
    },
  },
};

module.exports = { mediaCommands };

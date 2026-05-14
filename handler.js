const { getUser, isPremium, saveDb } = require("./database");
const { config } = require("./config");
const { commands, resolveCommand } = require("./commands/index");
const { logger } = require("./logger");

function extractText(msg) {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.buttonsResponseMessage?.selectedButtonId ??
    m.listResponseMessage?.singleSelectReply?.selectedRowId ??
    ""
  );
}

function extractMentions(msg) {
  const m = msg.message;
  if (!m) return [];
  return (
    m.extendedTextMessage?.contextInfo?.mentionedJid ??
    m.imageMessage?.contextInfo?.mentionedJid ??
    []
  );
}

async function handleMessage(sock, msg, db) {
  if (!msg.message) return;
  if (msg.key.remoteJid === "status@broadcast") return;
  if (msg.key.fromMe) return;

  const jid = msg.key.remoteJid;
  const isGroup = jid.endsWith("@g.us");
  const sender = isGroup ? msg.key.participant : jid;

  const user = getUser(db, sender);
  if (user.banned) return;
  user.messageCount++;
  user.lastSeen = Date.now();
  saveDb(db);

  const text = extractText(msg).trim();
  if (!text.startsWith(config.prefix)) return;

  const [rawCmd, ...args] = text.slice(config.prefix.length).trim().split(/\s+/);
  const cmdName = rawCmd.toLowerCase();
  const command = resolveCommand(cmdName);
  if (!command) return;

  logger.info({ sender: sender.replace("@s.whatsapp.net", ""), cmd: cmdName }, "Command received");

  let groupMetadata = null;
  let isSenderAdmin = false;
  let isBotAdmin = false;
  const botJid = sock.user?.id ?? "";

  if (isGroup) {
    try {
      groupMetadata = await sock.groupMetadata(jid);
      const admins = groupMetadata.participants.filter((p) => p.admin).map((p) => p.id);
      isSenderAdmin = admins.includes(sender);
      isBotAdmin = admins.includes(botJid);
    } catch {}
  }

  const isOwner = sender === config.ownerNumber + "@s.whatsapp.net";
  const userIsPremium = isOwner || isPremium(db, sender);
  const sendDeny = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

  if (command.ownerOnly && !isOwner)                      return sendDeny(config.messages.ownerOnly);
  if (command.premiumOnly && !userIsPremium)              return sendDeny(config.messages.premiumOnly);
  if (command.groupOnly && !isGroup)                      return sendDeny(config.messages.groupOnly);
  if (command.privateOnly && isGroup)                     return sendDeny(config.messages.privateOnly);
  if (command.adminOnly && !isSenderAdmin && !isOwner)    return sendDeny(config.messages.adminOnly);
  if (command.botAdminRequired && !isBotAdmin)            return sendDeny(config.messages.botAdminOnly);

  try {
    await command.handler({
      sock, msg, jid, sender, isGroup, isOwner,
      isPremium: userIsPremium, isSenderAdmin, isBotAdmin,
      args, text: args.join(" "),
      mentionedJids: extractMentions(msg),
      db, groupMetadata, commands,
    });
  } catch (err) {
    logger.error({ err, cmd: cmdName }, "Command execution failed");
    await sock.sendMessage(jid, { text: "❌ An error occurred while running this command." }, { quoted: msg });
  }
}

module.exports = { handleMessage };

const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
} = require("@whiskeysockets/baileys");
const path = require("path");
const qrcode = require("qrcode-terminal");
const { config } = require("./config");
const { loadDb } = require("./database");
const { handleMessage } = require("./handler");
const { scheduleAutoJpm } = require("./features/autojpm");
const { logger } = require("./logger");
const { createWebhookServer, setSock } = require("./webhook-server");

const SESSION_DIR = path.join(__dirname, "session");

// Start the webhook HTTP server immediately so it's ready when the bot connects
createWebhookServer();

// ============================================================
// Connect to WhatsApp and set up event listeners
// ============================================================

async function connect() {
  const db = loadDb();
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  logger.info({ version }, "Connecting to WhatsApp...");

  const sock = makeWASocket({
    version,
    logger: logger.child({ module: "baileys" }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    shouldIgnoreJid: (jid) => isJidBroadcast(jid),
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: false,
  });

  // ── Pairing code ─────────────────────────────────────────
  if (config.pairingNumber && !sock.authState.creds.registered) {
    const number = config.pairingNumber.replace(/[^0-9]/g, "");
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(number);
        const bar = "═".repeat(44);
        console.log(`\n╔${bar}╗`);
        console.log(`║  🔑  PAIRING CODE: ${code.padEnd(24)}║`);
        console.log(`╠${bar}╣`);
        console.log(`║  Open WhatsApp → Linked Devices            ║`);
        console.log(`║  → Link a Device → Link with phone number  ║`);
        console.log(`║  → Enter the code above                    ║`);
        console.log(`╚${bar}╝\n`);
      } catch (err) {
        logger.error({ err }, "Failed to request pairing code — check the number in config.js");
      }
    }, 3000);
  }

  // ── Connection events ────────────────────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !config.pairingNumber) {
      logger.info("Scan this QR code with WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn({ code }, "Connection closed");
      if (shouldReconnect) {
        logger.info("Reconnecting in 5 seconds...");
        setTimeout(() => connect(), 5000);
      } else {
        logger.error("Logged out — delete the session/ folder and restart.");
      }
    }

    if (connection === "open") {
      logger.info(`✅ Connected as ${sock.user?.name} (${sock.user?.id})`);
      // Hand the live socket to the webhook server so it can send messages
      setSock(sock);
      scheduleAutoJpm(sock, db);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // ── Incoming messages ────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      await handleMessage(sock, msg, db).catch((err) =>
        logger.error({ err }, "Unhandled error in handleMessage")
      );
    }
  });

  // ── Group join / leave events ────────────────────────────
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    const groupDb = db.groups[id];
    if (!groupDb?.welcome) return;
    for (const participant of participants) {
      const num = participant.replace("@s.whatsapp.net", "");
      if (action === "add") {
        await sock.sendMessage(id, { text: `👋 Welcome @${num}!`, mentions: [participant] }).catch(() => null);
      } else if (action === "remove") {
        await sock.sendMessage(id, { text: `👋 Goodbye @${num}.`, mentions: [participant] }).catch(() => null);
      }
    }
  });
}

connect().catch((err) => {
  logger.error({ err }, "Fatal error — could not start bot");
  process.exit(1);
});

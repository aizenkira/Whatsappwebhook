// ============================================================
// WEBHOOK SERVER — receives content from the dashboard and
// sends it to your WhatsApp channel automatically.
// ============================================================

const http = require("http");
const { config } = require("./config");
const { logger } = require("./logger");

let _sock = null;

/**
 * Call this once the WhatsApp socket is connected.
 * The webhook server will use it to send messages.
 */
function setSock(sock) {
  _sock = sock;
}

function createWebhookServer() {
  const port = config.webhookPort ?? 4000;
  const secret = config.webhookSecret ?? "";

  const server = http.createServer((req, res) => {
    // Only allow POST /webhook
    if (req.method !== "POST" || req.url !== "/webhook") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    // Verify secret token if configured
    if (secret) {
      const authHeader = req.headers["x-webhook-secret"] ?? "";
      if (authHeader !== secret) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        logger.warn("Webhook request rejected — invalid secret");
        return;
      }
    }

    // Read request body
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      const message = payload.message;
      if (!message || typeof message !== "string") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing or invalid 'message' field" }));
        return;
      }

      if (!_sock) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Bot not connected to WhatsApp yet" }));
        return;
      }

      const targets = config.webhookTargets ?? [];
      if (targets.length === 0) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No webhook targets configured. Set config.webhookTargets in config.js" }));
        return;
      }

      let successCount = 0;
      const errors = [];

      for (const jid of targets) {
        try {
          await _sock.sendMessage(jid, { text: message });
          successCount++;
          logger.info({ jid, contentType: payload.contentType }, "Webhook: message sent");
        } catch (err) {
          errors.push({ jid, error: err.message });
          logger.error({ jid, err }, "Webhook: failed to send message");
        }
      }

      if (successCount > 0) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: true,
          sent: successCount,
          failed: errors.length,
          targets: targets.length,
        }));
      } else {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, errors }));
      }
    });
  });

  server.listen(port, () => {
    logger.info({ port }, "Webhook server listening — point the dashboard to this URL");
    logger.info(`Webhook URL: http://<YOUR_SERVER_IP>:${port}/webhook`);
  });

  return server;
}

module.exports = { createWebhookServer, setSock };

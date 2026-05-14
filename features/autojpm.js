const { saveDb } = require("../database");
const { getKillSwitch, checkDailyCap, interGroupDelay, simulateTyping } = require("../utils/antiban");
const { personalizeMsg } = require("../utils/functions");
const { logger } = require("../logger");

let running = false;

async function runAutoJpm(sock, db, force = false) {
  const setting = db.settings.autojpm;

  if (!setting.enabled && !force) {
    return { success: 0, fail: 0, skipped: true };
  }

  const now = Date.now();
  const intervalMs = setting.interval * 60000;
  if (!force && now - setting.lastRun < intervalMs) {
    return { success: 0, fail: 0, skipped: true };
  }

  if (running) {
    logger.warn("AutoJPM is already running — skipping this cycle");
    return { success: 0, fail: 0, skipped: true };
  }

  running = true;
  setting.lastRun = now;
  saveDb(db);

  let success = 0;
  let fail = 0;

  try {
    const groups = await sock.groupFetchAllParticipating();
    const groupIds = Object.keys(groups).filter(
      (id) => !setting.blacklist.includes(id)
    );

    logger.info(`AutoJPM: broadcasting to ${groupIds.length} groups`);

    for (const id of groupIds) {
      if (getKillSwitch()) {
        logger.warn("AutoJPM: kill switch activated — stopping");
        break;
      }
      if (!checkDailyCap(db)) {
        logger.warn("AutoJPM: daily send cap reached — stopping");
        break;
      }

      const groupName = groups[id]?.subject ?? id;
      const text = personalizeMsg(setting.message, groupName);

      try {
        await simulateTyping(sock, id, 1200);

        if (setting.media) {
          const { type, data, mimetype } = setting.media;
          const mediaBuffer = Buffer.from(data, "base64");

          if (type === "image") {
            await sock.sendMessage(id, { image: mediaBuffer, caption: text, mimetype });
          } else if (type === "video") {
            await sock.sendMessage(id, { video: mediaBuffer, caption: text, mimetype });
          }
        } else {
          await sock.sendMessage(id, { text });
        }

        success++;
        logger.info(`AutoJPM: sent to "${groupName}"`);
      } catch (err) {
        fail++;
        logger.warn({ group: id, err }, "AutoJPM: failed to send");
      }

      await interGroupDelay();
      saveDb(db);
    }
  } finally {
    running = false;
  }

  logger.info(`AutoJPM done — success: ${success}, fail: ${fail}`);
  return { success, fail, skipped: false };
}

/** Schedule AutoJPM to run periodically (check every minute) */
function scheduleAutoJpm(sock, db) {
  setInterval(async () => {
    await runAutoJpm(sock, db);
  }, 60000);
}

module.exports = { runAutoJpm, scheduleAutoJpm };

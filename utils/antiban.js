// ============================================================
// Anti-ban utilities
// ============================================================

let killSwitch = false;

function setKillSwitch(val) {
  killSwitch = val;
}

function getKillSwitch() {
  return killSwitch;
}

/**
 * Check whether we're still under today's daily send cap.
 * Increments the counter if under cap and returns true.
 * Returns false (and does NOT increment) when cap is reached.
 */
function checkDailyCap(db) {
  const today = new Date().toISOString().split("T")[0];
  const s = db.settings.autojpm;
  if (s.lastSendDate !== today) {
    s.lastSendDate = today;
    s.todaySends = 0;
  }
  if (s.todaySends >= s.dailySendCap) return false;
  s.todaySends++;
  return true;
}

/** Random delay between messages sent to different groups (4–9 seconds) */
async function interGroupDelay() {
  const ms = Math.floor(Math.random() * (9000 - 4000 + 1)) + 4000;
  await new Promise((r) => setTimeout(r, ms));
}

/** Short delay between retries (2–5 seconds) */
async function retryDelay() {
  const ms = Math.floor(Math.random() * 3000) + 2000;
  await new Promise((r) => setTimeout(r, ms));
}

/** Simulate typing presence before sending a message */
async function simulateTyping(sock, jid, durationMs = 1500) {
  try {
    await sock.sendPresenceUpdate("composing", jid);
    await new Promise((r) => setTimeout(r, durationMs));
    await sock.sendPresenceUpdate("paused", jid);
  } catch {
    // Non-fatal — continue even if presence update fails
  }
}

module.exports = {
  getKillSwitch,
  setKillSwitch,
  checkDailyCap,
  interGroupDelay,
  retryDelay,
  simulateTyping,
};

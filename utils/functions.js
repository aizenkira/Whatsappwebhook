const moment = require("moment-timezone");
const axios = require("axios");
const FormData = require("form-data");
const { config } = require("../config");

const TIMEZONE = "Asia/Jakarta";

// ---- Channel card & ad reply (Vent-style) -------------------

/**
 * Returns a fake quoted message that renders as the
 * "by aizen" WhatsApp Channel invite card on the recipient's screen.
 */
function channelCard() {
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

/**
 * Returns a contextInfo object that renders as a link-preview card
 * on top of the message (the thumbnail card with bot name).
 */
function adReply(renderLargerThumbnail = false) {
  return {
    externalAdReply: {
      title: config.botName,
      body: "Vent WhatsApp Bot 2026",
      thumbnailUrl: config.thumbnailUrl,
      mediaType: 1,
      sourceUrl: config.channelLink,
      renderLargerThumbnail,
      showAdAttribution: true,
    },
  };
}

// ---- Time & greeting -------------------------------------------------------

function greeting() {
  const hour = moment().tz(TIMEZONE).hour();
  if (hour >= 5 && hour < 12) return "Good morning ☀️";
  if (hour >= 12 && hour < 15) return "Good afternoon 🌤";
  if (hour >= 15 && hour < 18) return "Good evening 🌅";
  return "Good night 🌙";
}

function getTime(format = "DD/MM/YYYY HH:mm:ss") {
  return moment().tz(TIMEZONE).format(format);
}

function runtime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    d ? `${d}d` : "",
    h ? `${h}h` : "",
    m ? `${m}m` : "",
    s ? `${s}s` : "",
  ]
    .filter(Boolean)
    .join(" ") || "0s";
}

// ---- Misc helpers ----------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSleep(minMs, maxMs) {
  return sleep(randomInt(minMs, maxMs));
}

function parseDuration(str) {
  const clean = str.toLowerCase().replace(/\s/g, "");
  const withUnit = clean.match(/^(\d+)(h|m|s|hours?|minutes?|seconds?)$/);
  if (withUnit) {
    const val = parseInt(withUnit[1], 10);
    const unit = withUnit[2];
    if (/^h/.test(unit)) return val * 60;
    if (/^m/.test(unit)) return val;
    if (/^s/.test(unit)) return Math.max(1, Math.round(val / 60));
  }
  const plain = clean.match(/^(\d+)$/);
  if (plain) {
    const val = parseInt(plain[1], 10);
    return val > 0 ? val : 1;
  }
  return null;
}

function personalizeMsg(template, groupName) {
  const now = new Date();
  return template
    .replace(/\{name\}/gi, groupName || "Friend")
    .replace(/\{time\}/gi, greeting())
    .replace(/\{date\}/gi, now.toLocaleDateString("en-US"))
    .replace(/\{botname\}/gi, "Vent Bot");
}

// ---- HTTP helpers ----------------------------------------------------------

async function fetchJson(url, options = {}) {
  const res = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    ...options,
  });
  return res.data;
}

async function getBuffer(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
}

// ---- File upload utilities -------------------------------------------------

async function uploadGofile(buffer, filename = "file") {
  try {
    const serverRes = await axios.get("https://api.gofile.io/servers");
    const server = serverRes.data?.data?.servers?.[0]?.name ?? "store1";
    const form = new FormData();
    form.append("file", buffer, filename);
    const uploadRes = await axios.post(
      `https://${server}.gofile.io/uploadFile`,
      form,
      { headers: form.getHeaders(), timeout: 60000 }
    );
    const data = uploadRes.data?.data;
    if (!data || data.status !== "ok") throw new Error("Upload failed");
    return data.downloadPage;
  } catch {
    return null;
  }
}

async function uploadPixelDrain(buffer, filename = "file") {
  try {
    const form = new FormData();
    form.append("file", buffer, filename);
    const res = await axios.post("https://pixeldrain.com/api/file", form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });
    const id = res.data?.id;
    if (!id) throw new Error("No file ID");
    return `https://pixeldrain.com/api/file/${id}`;
  } catch {
    return null;
  }
}

async function uploadLitterbox(buffer, filename = "file", expiry = "72h") {
  try {
    const form = new FormData();
    form.append("fileToUpload", buffer, filename);
    form.append("reqtype", "fileupload");
    form.append("time", expiry);
    const res = await axios.post(
      "https://litterbox.catbox.moe/resources/internals/api.php",
      form,
      { headers: form.getHeaders(), timeout: 30000 }
    );
    const url = res.data;
    return typeof url === "string" && url.startsWith("https://") ? url : null;
  } catch {
    return null;
  }
}

/** Try GoFile → PixelDrain → Litterbox in order */
async function uploadMedia(buffer, filename) {
  return (
    (await uploadGofile(buffer, filename)) ??
    (await uploadPixelDrain(buffer, filename)) ??
    (await uploadLitterbox(buffer, filename)) ??
    null
  );
}

module.exports = {
  channelCard,
  adReply,
  greeting,
  getTime,
  runtime,
  sleep,
  randomInt,
  randomSleep,
  parseDuration,
  personalizeMsg,
  fetchJson,
  getBuffer,
  uploadGofile,
  uploadPixelDrain,
  uploadLitterbox,
  uploadMedia,
};

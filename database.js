const fs = require("fs");
const path = require("path");

// ============================================================
// JSON database — stored in database/database.json
// ============================================================

const defaultDb = {
  users: {},
  groups: {},
  settings: {
    autojpm: {
      enabled: false,
      message: "Hello from {botname}! 👋",
      interval: 60,
      lastRun: 0,
      dailySendCap: 80,
      lastSendDate: "",
      todaySends: 0,
      blacklist: [],
      media: null,
    },
  },
};

const DB_PATH = path.join(__dirname, "database/database.json");

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadDb() {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
    return JSON.parse(JSON.stringify(defaultDb));
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    return {
      users: parsed.users ?? {},
      groups: parsed.groups ?? {},
      settings: {
        autojpm: { ...defaultDb.settings.autojpm, ...(parsed.settings?.autojpm ?? {}) },
      },
    };
  } catch {
    return JSON.parse(JSON.stringify(defaultDb));
  }
}

function saveDb(db) {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getUser(db, jid) {
  if (!db.users[jid]) {
    db.users[jid] = {
      premium: false,
      premiumExpiry: null,
      banned: false,
      messageCount: 0,
      lastSeen: Date.now(),
    };
  }
  return db.users[jid];
}

function isPremium(db, jid) {
  const user = getUser(db, jid);
  if (!user.premium) return false;
  if (user.premiumExpiry !== null && user.premiumExpiry < Date.now()) {
    user.premium = false;
    user.premiumExpiry = null;
    return false;
  }
  return true;
}

module.exports = { loadDb, saveDb, getUser, isPremium };

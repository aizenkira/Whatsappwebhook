const axios = require("axios");
const { channelCard } = require("../utils/functions");

// ============================================================
// Fun commands — all free APIs, no key required
// ============================================================

const funCommands = {
  joke: {
    description: "Get a random joke",
    category: "Fun",
    handler: async ({ sock, msg, jid }) => {
      try {
        const res = await axios.get(
          "https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist&type=twopart",
          { timeout: 8000 }
        );

        const { setup, delivery } = res.data;
        const text = `😂 *Joke of the moment:*\n\n${setup}\n\n_${delivery}_`;
        await sock.sendMessage(jid, { text }, { quoted: channelCard() });
      } catch {
        await sock.sendMessage(jid, { text: "❌ Could not fetch a joke right now." }, { quoted: msg });
      }
    },
  },

  quote: {
    description: "Get a random inspirational quote",
    aliases: ["kutipan"],
    category: "Fun",
    handler: async ({ sock, msg, jid }) => {
      try {
        const res = await axios.get("https://zenquotes.io/api/random", { timeout: 8000 });
        const { q, a } = res.data[0];
        const text = `💬 *"${q}"*\n\n— _${a}_`;
        await sock.sendMessage(jid, { text }, { quoted: channelCard() });
      } catch {
        await sock.sendMessage(jid, { text: "❌ Could not fetch a quote right now." }, { quoted: msg });
      }
    },
  },

  fact: {
    description: "Get a random fun fact",
    aliases: ["fakta"],
    category: "Fun",
    handler: async ({ sock, msg, jid }) => {
      try {
        const res = await axios.get("https://uselessfacts.jsph.pl/api/v2/facts/random", { timeout: 8000 });
        const text = `🧠 *Random Fact:*\n\n${res.data.text}`;
        await sock.sendMessage(jid, { text }, { quoted: channelCard() });
      } catch {
        await sock.sendMessage(jid, { text: "❌ Could not fetch a fact right now." }, { quoted: msg });
      }
    },
  },

  flip: {
    description: "Flip a coin",
    category: "Fun",
    handler: async ({ sock, msg, jid }) => {
      const result = Math.random() < 0.5 ? "🪙 *Heads!*" : "🪙 *Tails!*";
      await sock.sendMessage(jid, { text: result }, { quoted: channelCard() });
    },
  },

  roll: {
    description: "Roll a dice (or specify sides: .roll 20)",
    usage: ".roll [sides]",
    category: "Fun",
    handler: async ({ sock, msg, jid, args }) => {
      const sides = parseInt(args[0], 10) || 6;
      if (sides < 2 || sides > 1000)
        return sock.sendMessage(jid, { text: "Sides must be between 2 and 1000." }, { quoted: msg });
      const result = Math.floor(Math.random() * sides) + 1;
      await sock.sendMessage(
        jid,
        { text: `🎲 You rolled a *${sides}-sided dice* and got: *${result}*` },
        { quoted: channelCard() }
      );
    },
  },

  choose: {
    description: "Let the bot choose between options",
    usage: ".choose option1 | option2 | option3",
    aliases: ["pilih"],
    category: "Fun",
    handler: async ({ sock, msg, jid, args }) => {
      const text = args.join(" ");
      const options = text.split("|").map((o) => o.trim()).filter(Boolean);
      if (options.length < 2)
        return sock.sendMessage(jid, { text: "Usage: .choose option1 | option2 | option3" }, { quoted: msg });
      const chosen = options[Math.floor(Math.random() * options.length)];
      await sock.sendMessage(
        jid,
        { text: `🤔 I choose: *${chosen}*` },
        { quoted: channelCard() }
      );
    },
  },
};

module.exports = { funCommands };

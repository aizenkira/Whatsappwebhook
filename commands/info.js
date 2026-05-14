const axios = require("axios");
const { channelCard } = require("../utils/functions");

// ============================================================
// Info commands — all free APIs, no key required
// ============================================================

const infoCommands = {
  weather: {
    description: "Get current weather for a city",
    usage: ".weather <city>",
    aliases: ["cuaca"],
    category: "Info",
    handler: async ({ sock, msg, jid, args }) => {
      const city = args.join(" ");
      if (!city)
        return sock.sendMessage(jid, { text: "Usage: .weather <city name>" }, { quoted: msg });

      try {
        const res = await axios.get(
          `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
          { timeout: 10000 }
        );
        const data = res.data;
        const current = data.current_condition?.[0];
        const area = data.nearest_area?.[0];

        if (!current) throw new Error("No data");

        const location = area
          ? `${area.areaName?.[0]?.value}, ${area.country?.[0]?.value}`
          : city;

        const weatherDesc = current.weatherDesc?.[0]?.value ?? "-";
        const tempC = current.temp_C;
        const feelsC = current.FeelsLikeC;
        const humidity = current.humidity;
        const wind = current.windspeedKmph;
        const visibility = current.visibility;

        const text = [
          `🌤 *Weather in ${location}*`,
          ``,
          `🌡 Temperature: *${tempC}°C* (feels like ${feelsC}°C)`,
          `☁️ Condition: *${weatherDesc}*`,
          `💧 Humidity: *${humidity}%*`,
          `💨 Wind: *${wind} km/h*`,
          `👁 Visibility: *${visibility} km*`,
        ].join("\n");

        await sock.sendMessage(jid, { text }, { quoted: channelCard() });
      } catch {
        await sock.sendMessage(jid, { text: `❌ Could not get weather for *${city}*. Check the city name.` }, { quoted: msg });
      }
    },
  },

  wiki: {
    description: "Search Wikipedia for a summary",
    usage: ".wiki <topic>",
    category: "Info",
    handler: async ({ sock, msg, jid, args }) => {
      const query = args.join(" ");
      if (!query)
        return sock.sendMessage(jid, { text: "Usage: .wiki <topic>" }, { quoted: msg });

      try {
        const encoded = encodeURIComponent(query.replace(/ /g, "_"));
        const res = await axios.get(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
          { timeout: 10000 }
        );

        const { title, extract, content_urls } = res.data;
        if (!extract) throw new Error("Not found");

        const summary = extract.length > 800 ? extract.slice(0, 800) + "..." : extract;

        const text = [
          `📖 *${title}*`,
          ``,
          summary,
          ``,
          `🔗 ${content_urls?.desktop?.page ?? ""}`,
        ].join("\n");

        await sock.sendMessage(jid, { text }, { quoted: channelCard() });
      } catch {
        await sock.sendMessage(
          jid,
          { text: `❌ No Wikipedia article found for *${query}*.` },
          { quoted: msg }
        );
      }
    },
  },

  translate: {
    description: "Translate text to another language",
    usage: ".translate <lang code> <text>   e.g. .translate id Hello world",
    aliases: ["tl"],
    category: "Info",
    handler: async ({ sock, msg, jid, args }) => {
      if (args.length < 2)
        return sock.sendMessage(
          jid,
          { text: "Usage: .translate <lang> <text>\nExample: .translate id Hello world\nCodes: id=Indonesian, en=English, ar=Arabic, zh=Chinese, es=Spanish, fr=French, de=German, ko=Korean, ja=Japanese" },
          { quoted: msg }
        );

      const langTo = args[0].toLowerCase();
      const text = args.slice(1).join(" ");

      try {
        const res = await axios.get("https://api.mymemory.translated.net/get", {
          params: { q: text, langpair: `en|${langTo}` },
          timeout: 10000,
        });

        const translated = res.data?.responseData?.translatedText;
        if (!translated) throw new Error("Translation failed");

        await sock.sendMessage(
          jid,
          { text: `🌐 *Translation to ${langTo.toUpperCase()}:*\n\n${translated}` },
          { quoted: channelCard() }
        );
      } catch {
        await sock.sendMessage(
          jid,
          { text: "❌ Translation failed. Check the language code and try again." },
          { quoted: msg }
        );
      }
    },
  },

  dict: {
    description: "Look up a word in the dictionary",
    usage: ".dict <word>",
    category: "Info",
    handler: async ({ sock, msg, jid, args }) => {
      const word = args[0];
      if (!word)
        return sock.sendMessage(jid, { text: "Usage: .dict <word>" }, { quoted: msg });

      try {
        const res = await axios.get(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
          { timeout: 10000 }
        );

        const entry = res.data?.[0];
        if (!entry) throw new Error("Not found");

        const meanings = entry.meanings?.slice(0, 2).map((m) => {
          const defs = m.definitions?.slice(0, 2).map((d, i) => `  ${i + 1}. ${d.definition}`).join("\n");
          return `*${m.partOfSpeech}*\n${defs}`;
        }).join("\n\n");

        const phonetic = entry.phonetic ?? entry.phonetics?.[0]?.text ?? "";

        const text = [
          `📚 *${entry.word}* ${phonetic}`,
          ``,
          meanings,
        ].join("\n");

        await sock.sendMessage(jid, { text }, { quoted: channelCard() });
      } catch {
        await sock.sendMessage(
          jid,
          { text: `❌ No definition found for *${word}*.` },
          { quoted: msg }
        );
      }
    },
  },
};

module.exports = { infoCommands };

const { channelCard } = require("../utils/functions");

// ============================================================
// Group management commands — require bot to be admin
// ============================================================

const groupCommands = {
  kick: {
    description: "Kick a mentioned member from the group",
    usage: ".kick @mention",
    category: "Group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    handler: async ({ sock, msg, jid, mentionedJids }) => {
      if (!mentionedJids.length)
        return sock.sendMessage(jid, { text: "Mention someone to kick." }, { quoted: msg });
      for (const target of mentionedJids) {
        await sock.groupParticipantsUpdate(jid, [target], "remove");
      }
      return sock.sendMessage(
        jid,
        { text: `✅ Kicked ${mentionedJids.length} member(s).` },
        { quoted: channelCard() }
      );
    },
  },

  add: {
    description: "Add a number to the group",
    usage: ".add <number>",
    category: "Group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    handler: async ({ sock, msg, jid, args }) => {
      const number = args[0]?.replace(/[^0-9]/g, "");
      if (!number) return sock.sendMessage(jid, { text: "Usage: .add <number>" }, { quoted: msg });
      await sock.groupParticipantsUpdate(jid, [number + "@s.whatsapp.net"], "add");
      return sock.sendMessage(
        jid,
        { text: `✅ Added *${number}* to the group.` },
        { quoted: channelCard() }
      );
    },
  },

  promote: {
    description: "Promote a member to admin",
    usage: ".promote @mention",
    category: "Group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    handler: async ({ sock, msg, jid, mentionedJids }) => {
      if (!mentionedJids.length)
        return sock.sendMessage(jid, { text: "Mention someone to promote." }, { quoted: msg });
      await sock.groupParticipantsUpdate(jid, mentionedJids, "promote");
      return sock.sendMessage(
        jid,
        { text: `⬆️ Promoted ${mentionedJids.length} member(s) to admin.` },
        { quoted: channelCard() }
      );
    },
  },

  demote: {
    description: "Demote an admin to member",
    usage: ".demote @mention",
    category: "Group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    handler: async ({ sock, msg, jid, mentionedJids }) => {
      if (!mentionedJids.length)
        return sock.sendMessage(jid, { text: "Mention someone to demote." }, { quoted: msg });
      await sock.groupParticipantsUpdate(jid, mentionedJids, "demote");
      return sock.sendMessage(
        jid,
        { text: `⬇️ Demoted ${mentionedJids.length} member(s) to regular member.` },
        { quoted: channelCard() }
      );
    },
  },

  grouplink: {
    description: "Get the group's invite link",
    category: "Group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    handler: async ({ sock, msg, jid }) => {
      const code = await sock.groupInviteCode(jid);
      return sock.sendMessage(
        jid,
        { text: `🔗 Invite link:\nhttps://chat.whatsapp.com/${code}` },
        { quoted: channelCard() }
      );
    },
  },

  everyone: {
    description: "Tag all group members",
    usage: ".everyone [message]",
    category: "Group",
    groupOnly: true,
    adminOnly: true,
    handler: async ({ sock, msg, jid, args, groupMetadata }) => {
      if (!groupMetadata)
        return sock.sendMessage(jid, { text: "Could not fetch group data." }, { quoted: msg });
      const participants = groupMetadata.participants.map((p) => p.id);
      const tagLine = participants.map((p) => `@${p.split("@")[0]}`).join(" ");
      const text = args.join(" ") ? `${args.join(" ")}\n${tagLine}` : tagLine;
      return sock.sendMessage(jid, { text, mentions: participants }, { quoted: channelCard() });
    },
  },

  mute: {
    description: "Mute or unmute the group",
    usage: ".mute on | off",
    category: "Group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    handler: async ({ sock, msg, jid, args }) => {
      const sub = args[0]?.toLowerCase();
      if (sub === "on") {
        await sock.groupSettingUpdate(jid, "announcement");
        return sock.sendMessage(
          jid,
          { text: "🔇 Group muted — only admins can send messages." },
          { quoted: channelCard() }
        );
      } else if (sub === "off") {
        await sock.groupSettingUpdate(jid, "not_announcement");
        return sock.sendMessage(
          jid,
          { text: "🔊 Group unmuted — all members can send messages." },
          { quoted: channelCard() }
        );
      } else {
        return sock.sendMessage(jid, { text: "Usage: .mute on | off" }, { quoted: msg });
      }
    },
  },

  setname: {
    description: "Change the group name",
    usage: ".setname <new name>",
    category: "Group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    handler: async ({ sock, msg, jid, args }) => {
      const name = args.join(" ");
      if (!name) return sock.sendMessage(jid, { text: "Usage: .setname <new name>" }, { quoted: msg });
      await sock.groupUpdateSubject(jid, name);
      return sock.sendMessage(
        jid,
        { text: `✅ Group name changed to *${name}*.` },
        { quoted: channelCard() }
      );
    },
  },

  setdesc: {
    description: "Change the group description",
    usage: ".setdesc <description>",
    category: "Group",
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,
    handler: async ({ sock, msg, jid, args }) => {
      const desc = args.join(" ");
      if (!desc) return sock.sendMessage(jid, { text: "Usage: .setdesc <description>" }, { quoted: msg });
      await sock.groupUpdateDescription(jid, desc);
      return sock.sendMessage(
        jid,
        { text: `✅ Group description updated.` },
        { quoted: channelCard() }
      );
    },
  },
};

module.exports = { groupCommands };

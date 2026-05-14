// ============================================================
// BOT CONFIGURATION — edit freely
// ============================================================

const config = {
  // Your WhatsApp number (digits only, with country code, no +)
  // Example: "628123456789" for Indonesia +62 812-3456-789
  ownerNumber: "233533416608",

  // Display name used in messages
  ownerName: "Aizen",

  // Bot identity
  botName: "Vent Bot",
  prefix: ".",

  // Pairing code mode — set to your number to get an 8-digit code you enter in
  // WhatsApp > Linked Devices > Link a Device > Link with phone number.
  // Leave empty ("") to fall back to QR code in the terminal instead.
  pairingNumber: "233533416608",

  // WhatsApp Channel shown in the menu card (the "by aizen" card)
  channelId: "120363406397452589@newsletter",
  channelName: "Powered by Vent Bot",
  channelLink: "https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326",

  // Thumbnail image shown in the menu preview card
  // Replace with your own image URL for custom branding
  thumbnailUrl: "http://rahmad-elaina.my.id/file/22b1780a7a.jpg",

  // Payment info shown in .payment command
  paymentImage: "https://example.com/payment-qr.jpeg",
  dana: "08812345678",
  gopay: "08812345678",
  ovo: "-",

  // Error messages sent to users
  messages: {
    ownerOnly:    "⛔ This feature is only available to the *Bot Owner*.",
    premiumOnly:  "⛔ This feature is only available to *Premium Users*.",
    groupOnly:    "⛔ This feature can only be used inside a group.",
    privateOnly:  "⛔ This feature can only be used in private chat.",
    adminOnly:    "⛔ This feature is only available to group admins.",
    botAdminOnly: "⛔ The bot must be a group admin to use this feature.",
  },

  // ============================================================
  // CONTENT BOT — dashboard connection & channel targets
  // ============================================================

  // URL of your running dashboard API (no trailing slash).
  // Example: "https://your-replit-app.replit.app"
  // This is used by .sendnow and .previewcontent to generate AI content.
  dashboardUrl: "https://whats-app-bot-sender--nebraskan99.replit.app/",

  // ============================================================
  // WEBHOOK SERVER — for receiving content from the dashboard
  // ============================================================

  // Port the webhook server listens on.
  // Make sure this port is open/accessible on your panel/VPS.
  webhookPort: 4000,

  // Optional secret token for security.
  // If set, the dashboard must send this in the X-Webhook-Secret header.
  // Leave as "" to skip authentication (only do this on a private/trusted network).
  webhookSecret: "cd765f55df3886e45fa20493d77f12909929681271a6bccd",

  // WHERE to send messages when the webhook fires.
  // Add your channel JID and/or group JIDs here.
  //
  // WhatsApp Channel JID format:  "XXXXXXXXXXXXXXXXXX@newsletter"
  //   → Find it: open your channel in WhatsApp, copy the invite link,
  //     the ID is the long number in the URL.
  //
  // WhatsApp Group JID format:    "XXXXXXXXXXXXXXXXXX@g.us"
  //   → Find it: run the bot and type .id in the group.
  //
  // You can add multiple targets — content is sent to all of them.
  webhookTargets: [
    "120363406397452589@newsletter", // <-- replace with your actual channel JID
    // "1234567890-1234567890@g.us",  // <-- uncomment to also send to a group
  ],
};

module.exports = { config };

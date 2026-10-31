// Regeln & Verify: alles was im Post auf Discord steht (Englisch).
// roleId = ID der Rolle, die der Verify-Button vergibt (Rechtsklick auf Rolle -> Rollen-ID kopieren).
// Emojis = Dateinamen aus rules-assets/emojis (ohne .png). Nach Aenderungen: Bot neu starten, dann
// /post-rules message:<ID des alten Posts> aktualisiert den bestehenden Post.
export default {
  "accentColor": "#e4e4e7",
  "banner": "rules-assets/banner.png",
  "title": "H1T.CC — Server Rules",
  "intro": "Welcome to **H1T.CC**. Take a moment to read the rules, then click **Verify** below to unlock the server. By verifying you confirm that you accept these rules.",
  "rules": [
    {
      "emoji": "h1t_tos",
      "title": "Discord Terms of Service",
      "text": "Follow the [Discord Terms of Service](https://discord.com/terms) and the [Community Guidelines](https://discord.com/guidelines) at all times."
    },
    {
      "emoji": "h1t_respect",
      "title": "Respect",
      "text": "Treat everyone with respect. **No** insults, hate speech, discrimination or drama."
    },
    {
      "emoji": "h1t_noads",
      "title": "No Advertising & No Spam",
      "text": "No advertising for other servers, tools or shops — DMs included. No spam, no mass pings."
    },
    {
      "emoji": "h1t_content",
      "title": "Content",
      "text": "No NSFW, no gore, no leaks and no stolen or cracked content."
    },
    {
      "emoji": "h1t_scale",
      "title": "Purchases & Licences",
      "text": "Licences are bound to you. **Reselling, sharing or cracking** results in a ban without refund."
    },
    {
      "emoji": "h1t_users",
      "title": "Support",
      "text": "Ask questions and report problems in the support channel or via ticket — not in staff DMs."
    },
    {
      "emoji": "h1t_warning",
      "title": "Consequences",
      "text": "Violations lead to a warning, timeout or ban depending on severity. Staff decide case by case."
    }
  ],
  "verify": {
    "label": "Verify",
    "emoji": "h1t_verify",
    "style": "success",
    "roleId": "",
    "removeRoleId": "",
    "reply": "You are now verified. Welcome to **H1T.CC**!",
    "alreadyReply": "You are already verified.",
    "notSetUpReply": "Verification is not set up yet. Please contact the staff team.",
    "errorReply": "Something went wrong. Please contact the staff team."
  },
  "links": [
    {
      "label": "Discord ToS",
      "emoji": "h1t_tos",
      "url": "https://discord.com/terms"
    },
    {
      "label": "Guidelines",
      "emoji": "h1t_guidelines",
      "url": "https://discord.com/guidelines"
    },
    {
      "label": "Invite",
      "emoji": "h1t_link",
      "url": "https://discord.gg/h1tcc"
    }
  ],
  "footer": "H1T.CC · Performance. Redefined."
};

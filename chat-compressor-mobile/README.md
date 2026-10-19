# AniList Chat Compressor (Mobile, Firefox for Android)

by **YoruC**

Long AniList reply threads are slow on a phone: the site loads the **oldest** replies first and fetches more
every time you scroll, so you wait for every old page before you see the newest message.

This userscript shows the **newest messages straight away** in a compact chat view on **direct activity
links** (`anilist.co/activity/12345`), and checks for new ones by itself. Everything else on AniList stays
as it is.

> This is the phone version, made for **Firefox for Android**.
> On a PC, use **[the PC version](../chat-compressor-pc)** instead.

---

## Quick guide

### 1. Install (once, about two minutes)

1. Open **Firefox** on your phone.
2. Tap **⋮ menu → Add-ons → Find more add-ons** (or go to addons.mozilla.org), search for
   **Violentmonkey** (or **Tampermonkey**) and tap **Add to Firefox**.
3. In Firefox, open this link: **[Install AniList Chat Compressor (Mobile)](https://raw.githubusercontent.com/exosone1994-ui/Anilist/main/chat-compressor-mobile/anilist-chat-compressor-mobile.user.js)**
4. The add-on shows an install page. Tap **Install** (Violentmonkey: **Confirm installation**).

Done. Open any AniList chat link in Firefox and it loads fast.

> Tip: if the link only shows the code as text, open the add-on's menu (⋮ → Add-ons → Violentmonkey) →
> **+** → **Install from URL** and paste the link from step 3.

### 2. Using it

| What you see | What it does |
|---|---|
| **Newest 10 messages** | Shown in about a second, however long the chat is. |
| **Older (N)** | Loads 20 more older messages each tap. |
| **↻** | Check for new messages now (it also checks every 15 seconds by itself). |
| **↓ N new** | Tap to jump to new messages that arrived while you scrolled up. |
| **Quote** | Puts that message into your reply box as a quote. |
| **Edit / Delete** | On your own messages, with AniList's formatting toolbar and a preview. |
| **♥** | Like / unlike a message. |
| **Side buttons** (small icons) | ↑ top · ↓ latest · ✎ reply box · **All** = AniList's normal full view. |

### 3. Settings (optional)

In Violentmonkey / Tampermonkey, open **AniList Chat View** and change the numbers at the top:

```js
const SHOW_LAST = 10;    // messages shown when a chat opens
const POLL_MS = 15000;   // how often to check for new messages (ms). Don't go below ~8000.
const DEBUG = false;     // true = a small green status line at the top-left, for troubleshooting
```

---

## Good to know

- **Your login stays with AniList.** The script asks AniList for messages the same way the site does, with
  your normal session. Nothing is sent anywhere else.
- Works whether the add-on runs scripts inside the page or in Firefox's sandbox. In the sandbox, messages
  use AniList's plain formatting instead of its rich cards.
- The last 30 messages of your 20 most recent chats are saved on the phone, so reopening a chat is instant.

## Troubleshooting

- **Nothing changes:** check you're on an `anilist.co/activity/<number>` link and the script is switched on
  in the add-on. Reload the page.
- **Still nothing:** set `DEBUG = true` in the script. A green line at the top-left then says what it's
  waiting for.

## License

[MIT](LICENSE) - free to use, change and share.

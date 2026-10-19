# AniList Chat Compressor (PC)

by **YoruC**

Long AniList reply threads load slowly: the site loads the **oldest** replies first and fetches 25 more
every time you scroll, so a long chat makes you wait for every old page before you see the newest message.

This userscript fixes that on **direct activity links** (`anilist.co/activity/12345`). It shows the
**newest messages straight away** in a compact, chat-like view, and checks for new ones by itself.
Your home feed, profile and other pages are left exactly as they are.

> Made for desktop browsers (Chrome, Brave, Edge, Firefox) with Tampermonkey.
> On a phone with Firefox, use the mobile version instead:
> **[the mobile version](../chat-compressor-mobile)**

---

## Quick guide

### 1. Install (once, about a minute)

1. Install the **Tampermonkey** extension for your browser:
   [Chrome / Brave](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) ·
   [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) ·
   [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)
2. **Chrome / Brave / Edge only:** open the extensions page (`chrome://extensions`, `brave://extensions` or
   `edge://extensions`) and switch on **Developer mode** (top right). On the newest versions also open
   Tampermonkey's **Details** there and switch on **Allow User Scripts**. Without this, userscripts don't run.
3. Click this link: **[Install AniList Chat Compressor](https://raw.githubusercontent.com/exosone1994-ui/Anilist/main/chat-compressor-pc/anilist-chat-compressor.user.js)**
4. Tampermonkey opens an install page. Click **Install**.

That's it. Open any AniList chat (an `anilist.co/activity/...` link) and it loads fast.

### 2. Using it

| What you see | What it does |
|---|---|
| **Newest 10 messages** | Shown in about a second, however long the thread is. |
| **Older (N)** button | Loads 20 more older messages each click, without losing your place. |
| **↻** | Check for new messages now. It also checks every 15 seconds on its own. |
| **↓ N new** | Appears when new messages arrive while you're scrolled up. Click to jump down. |
| **Quote** | Puts that message into your reply box as a quote. |
| **Edit / Delete** | On your own messages. Edit has AniList's full toolbar (bold, spoiler, link, image, YouTube...) and a live preview. |
| **♥** | Like / unlike. Hover the heart to see the pictures of who liked it. |
| **Side buttons** | Top · Latest · Reply · **Full thread** (switches to AniList's normal view, which loads everything). |

Keyboard: **Ctrl+Enter** sends your reply, **Alt+R** jumps to the reply box.

Messages look exactly like normal AniList (anime cards, spoilers, @mentions, images and GIFs at full size),
because the script uses AniList's own formatter.

### 3. Settings (optional)

Open Tampermonkey's dashboard → **AniList Chat View** → edit the numbers at the top of the script:

```js
const SHOW_LAST = 10;          // messages shown when a chat opens
const OLDER_STEP = 20;         // how many more each "Older" click shows
const POLL_MS = 15000;         // how often to check for new messages (ms). Don't go below ~8000.
const GROUP_MESSAGES = false;  // true = hide picture + name on back-to-back messages
```

---

## Good to know

- **Your login stays with AniList.** The script asks AniList for messages the same way the site itself
  does, using your normal session. No passwords or tokens are stored or sent anywhere else.
- It saves the last 30 messages of your 20 most recent chats in your browser, so reopening a chat is instant.
- AniList limits how many requests an account can make per minute. If you hit it, the script waits a minute
  and tries again by itself.
- In Tampermonkey the script is listed as **AniList Chat View**.

## Troubleshooting

- **Nothing changes on the page:** make sure you're on a direct link (`anilist.co/activity/<number>`), the
  script is switched on in Tampermonkey, and (Chrome / Brave / Edge) Developer mode is on. Reload the page.
- **Something looks wrong:** click **Full thread** to use AniList's normal view, then open an issue on this repo describing what you saw.

## License

[MIT](LICENSE) - free to use, change and share.

# AniList GIF & Picture Picker

by **YoruC**

Adding a GIF to an AniList comment normally means: open another tab, search, open the GIF, copy its link,
come back and type `img(` + link + `)`. This userscript puts a **GIF** button in AniList's own comment
toolbar instead. Search, see the results as previews, tap one, and `img(link)` is in your comment.

- **GIF** search: [Tenor](https://tenor.com) GIFs + [Safebooru](https://safebooru.org) animated GIFs
- **Picture** search: Safebooru + [Konachan.net](https://konachan.net) anime art (safe ratings only)

> One file for both **PC** (Chrome, Brave, Edge, Firefox + Tampermonkey) and **phones**
> (Firefox for Android + Tampermonkey). On a phone the picker opens full screen with big buttons.

---

## Quick guide

### 1. Install (once, about a minute)

**PC**

1. Install the **Tampermonkey** extension for your browser:
   [Chrome / Brave](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) ·
   [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) ·
   [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)
2. **Chrome / Brave / Edge only:** open the extensions page (`chrome://extensions`, `brave://extensions` or
   `edge://extensions`) and switch on **Developer mode** (top right). On the newest versions also open
   Tampermonkey's **Details** there and switch on **Allow User Scripts**. Without this, userscripts don't run.
3. Click this link: **[Install AniList GIF Picker](https://raw.githubusercontent.com/YoruCAnime/Anilist/main/gif-picker/anilist-gif-picker.user.js)**
4. Tampermonkey opens an install page. Click **Install**.

**Phone (Android)**

1. Install **[Firefox for Android](https://play.google.com/store/apps/details?id=org.mozilla.firefox)**, then add
   **[Tampermonkey](https://addons.mozilla.org/android/addon/tampermonkey/)** from Firefox's add-ons menu.
2. In Firefox, open the **[install link](https://raw.githubusercontent.com/YoruCAnime/Anilist/main/gif-picker/anilist-gif-picker.user.js)** and tap **Install**.

**First search:** Tampermonkey asks once whether the script may reach `tenor.com`, `safebooru.org` and
`konachan.net` (that is where the search results come from). Choose **Always allow domain** for each.

Already had AniList open? Reload those tabs so the script starts there.

### 2. Using it

1. Click into any comment, reply or forum box. AniList shows its toolbar (Bold, Italic, Image ...) with a new
   **GIF** button at the end. Press it. (PC: **Alt+G** in a comment box does the same.)
2. Type what you want, e.g. `spice and wolf holo`, and press Enter.
3. Tap a preview: it goes into your comment as `img(link)`, where your cursor was.

| In the picker | What it does |
|---|---|
| **GIF / Picture** | Switch between moving GIFs and still pictures. |
| **Tenor · Safebooru · Konachan** | Tap to leave a site out. The number = how many it found. |
| **Scroll down** | Loads more. |
| **Magnifier** on a preview | Shows it big first, with a link to where it came from. |
| **Size** | Full size, or `img220(...)` / 300 / 400 px / half / full width. |
| **Spoiler** | Adds it as `~!img(...)!~`. |
| **Centre** | Adds it as `~~~img(...)~~~`. |
| **Keep open after adding** | Add several in a row. |
| **Empty search** | Shows your recently used picks. |
| **Paste a picture link** | Adds that link as it is. |

Esc or **×** closes the picker. Your choices are remembered.

---

## Good to know

- **Booru sites search by tags.** The script turns your words into tags itself (`spice and wolf holo` becomes
  `spice_and_wolf holo`) and shows them in the picker. You can also type tags yourself, with `_` in them
  (`holo_(spice_and_wolf) apple`).
- **No broken pictures:** before adding, the script checks that the full picture really loads. One that
  doesn't is greyed out and you get a message instead.
- Characters that would break AniList's code inside a link (`( ) ! ~ ' *` and spaces) are written
  percent-encoded, so the link always works.
- Tenor gives about 50 GIFs per search; scrolling on searches again with the tags those GIFs share
  (for example "... remake") for more.
- Nothing is sent to AniList except the text you choose to add. Searches go straight from your browser to
  Tenor / Safebooru / Konachan. No accounts, keys or logins needed.
- In Tampermonkey the script is listed as **AniList GIF & Picture Picker**.

## Troubleshooting

- **No GIF button:** click into the comment box first (AniList only shows its toolbar then). Check the script
  is switched on in Tampermonkey and (Chrome / Brave / Edge) Developer mode is on. Reload the page.
- **"error" next to a site name:** that site did not answer. Allow its domain in Tampermonkey
  (Dashboard → the script → Settings → XHR / "Allow domain"), or try again later.
- **"No booru tag matched":** try the character's or series' name, fewer words, or type tags with `_`.
- Something else: open an issue on this repo describing what you saw.

## License

[MIT](LICENSE) - free to use, change and share.

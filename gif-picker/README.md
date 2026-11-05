# AniList GIF & Picture Picker

by **YoruC**

Adding a GIF to an AniList comment normally means: open another tab, search, open the GIF, copy its link,
come back and type `img(` + link + `)`. This userscript puts a **GIF** button in AniList's own comment
toolbar instead. Search, see the results as previews, tap one, and `img(link)` is in your comment.

- **GIF** search: [Tenor](https://tenor.com) GIFs + [Safebooru](https://safebooru.org) animated GIFs
- **Picture** search: Safebooru + [Konachan.net](https://konachan.net) anime art (safe ratings only)
- **YouTube** search (no login): watch a video right in the picker first, then add it as `youtube(link)`
- **Pick several** at once and add them in one go, side by side or one per line
- **Any size**: original, 150 to 1000 px, quarter / half / full width, or your own number
- **Upload your own** GIFs, pictures and videos, one or several at a time: they go into your own public GitHub repos
  and the comment links to them there. **Your uploads** lists them all (from any device) to use again without
  uploading twice
- **Update notice**: when a new version is out, the picker tells you, and one click opens Tampermonkey's update page

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
`konachan.net` (that is where the search results come from), and `api.github.com` the first time you upload.
Choose **Always allow domain** for each.

Already had AniList open? Reload those tabs so the script starts there.

### 2. Using it

1. Click into any comment, reply or forum box. AniList shows its toolbar (Bold, Italic, Image ...) with a new
   **GIF** button at the end. Press it. (PC: **Alt+G** in a comment box does the same.)
2. Type what you want, e.g. `spice and wolf holo`, and press Enter.
3. Tap a preview: it goes into your comment as `img(link)`, where your cursor was.

| In the picker | What it does |
|---|---|
| **GIF / Picture / YouTube** | Switch between moving GIFs, still pictures and YouTube videos. In **YouTube** mode, tapping a video plays it right in the picker first; **Add to comment** then adds `youtube(link)` (AniList shows the player in your comment). Pasting a YouTube link into the search box works too. |
| **Tenor · Safebooru · Konachan** | Tap to leave a site out. The number = how many it found. |
| **Scroll down** | Loads more. |
| **Magnifier** on a preview | Shows it big first, with a link to where it came from. |
| **Size** | Original, 150 / 220 / 250 / 300 / 400 / 500 / 600 / 800 / 1000 px, quarter / half / full width, or **Custom px** (type any width). |
| **Spoiler** | Adds it as `~!img(...)!~`. |
| **Centre** | Adds it as `~~~img(...)~~~`. |
| **Pick several** | Taps number the pictures 1, 2, 3… instead of adding them. The bar at the bottom shows your picks (tap one there to unpick it); **Add N** puts them all in at once. Picks stay while you search for something else. On PC, Ctrl / Shift-click picks even with this off. |
| **Layout** (shows next to Pick several while it's ticked) | **Side by side**: the picks go in one row. GIFs too wide to sit next to each other are sized to share the row (2 or 3 per row), so they line up on PC and phone; with Spoiler on they share one spoiler. **Under each other**: each pick on its own line, at the size you chose; with Spoiler on they share one spoiler too. |
| **Keep open after adding** | Add more in a row. |
| **⬆ (next to Search)** | Upload your own GIF or video (see below). |
| **Empty search** | Shows your recently used picks. |
| **Paste a picture link** | Adds that link as it is. |

Esc or **×** closes the picker. Your choices are remembered.

### 3. Upload your own GIFs and videos (optional)

Your GIF is stored in a **public GitHub repo of your own**, and the comment links to it there
(`raw.githubusercontent.com`). Set it up once; the picker walks you through it:

1. Make a new **public** repo, for example `gifs`: [github.com/new](https://github.com/new).
2. Make a **fine-grained token**: [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
   - Repository access: **Only select repositories** → your gif repo
   - Permissions: **Contents → Read and write**
   - Pick an expiry, **Generate token**, copy it.
3. Press **⬆** in the picker, fill in the repo (`YourName/gifs`), branch (empty = main), folder (default `gifs`)
   and the token, then **Save and check**.

After that: **⬆** → **Choose GIFs / pictures** (on a phone: from your gallery). On PC you can also drag files
onto the picker or paste them (Ctrl+V). **Upload and add** uploads them and adds `img(link)` at your chosen size.
GIF, PNG, JPG, WebP or AVIF, up to 25 MB each.

**Several at once:** choose up to 20 files (**Add more** adds others, **×** on a preview leaves it out). A **Layout**
switch appears: **Side by side** (in a row, sized to fit) or **Under each other**. **Upload N and add** uploads them one
after another and adds them all to your comment in one go.

Uploads always go straight into your comment, even if you close the picker while they upload. If the comment box
is gone by then, the code is copied so you can paste it.

**Use an upload again (no new upload):** under the upload button, **Your uploads** shows everything already in your
repo folder, newest first, including what you uploaded from your phone or another PC. Tap one to add it to your
comment again. With **Pick several** on, tap several and press **Add N picked**. With lots of uploads, a **Find by name**
box appears. If you choose a file that is already in your repo, the picker spots it and reuses that link instead of
uploading a second copy. (Videos have their own **Your videos** list on the Video screen.)

**Videos:** the upload screen has a **GIF / picture | Video** switch. Video has its own setup, so videos can go to a
different repo (for example `YourName/videos`; the folder defaults to the top of the repo):

- Leave the video **Token** empty to use your GIF token. Then add the videos repo to that token on GitHub
  ([your tokens](https://github.com/settings/personal-access-tokens) → the token → **Edit** → Repository access →
  add the repo; Contents stays **Read and write**) → **Update**. Or paste a separate token for videos.
- **Choose a video** → **Upload and add** adds it as `webm(link)`, AniList's video code, which plays **MP4** too.
  MP4 (H.264) or WebM, up to 25 MB. Size doesn't apply to videos.
- Picked a video on the GIF screen (or a GIF on the Video screen)? It switches over by itself.

> **About the token:** it stays in Tampermonkey on your device and is only ever sent to `api.github.com`.
> It can only write to the repos you chose. **Change** on the upload screen edits the setup, **Forget token**
> removes it. A private repo is refused, because people reading your comment could not see what you uploaded.

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
  Tenor / Safebooru / Konachan. Searching needs no accounts, keys or logins (only uploading needs your GitHub token).
- In Tampermonkey the script is listed as **AniList GIF & Picture Picker**.

## Updates

When a new version is out, a small dot shows on the **GIF** button and the picker shows a bar at the top:
**New version …** with what's new, a glowing **Update** button and **Later**. **Update** opens the script's link and
Tampermonkey shows its own update page: press **Update** there, then reload your AniList tabs. Nothing updates by
itself. **Later** hides the notice until the next version.

The picker looks for a new version about once an hour, in the background (one tiny file, so nothing slows down).
To look right away: Tampermonkey icon → **AniList GIF & Picture Picker** → **Check for updates now**.

## Troubleshooting

- **No GIF button:** click into the comment box first (AniList only shows its toolbar then). Check the script
  is switched on in Tampermonkey and (Chrome / Brave / Edge) Developer mode is on. Reload the page.
- **"error" next to a site name:** that site did not answer. Allow its domain in Tampermonkey
  (Dashboard → the script → Settings → XHR / "Allow domain"), or try again later.
- **"No booru tag matched":** try the character's or series' name, fewer words, or type tags with `_`.
- **Upload says the token is not allowed to write:** edit the token on GitHub and give it **Contents: Read and write**
  for that repo (or make a new one), then **Change** → paste it → **Save and check**.
- Something else: open an issue on this repo describing what you saw.

## License

[MIT](LICENSE) - free to use, change and share.

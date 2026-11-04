# AniList Like Previews

by **YoruC**

AniList's notifications page puts everything in one long list: likes, messages, mentions, replies and follows all
mixed together. This userscript adds tabs to sort them, and shows what people liked at a glance.

- **Tabs** above the list: **All · Likes · Messages & mentions · Replies · Other**
  - each tab shows how many notifications are in it, and a small blue dot when some of them are unread
  - **Messages & mentions** = "sent you a message" + every "mentioned you" (activities and forum)
  - **Replies** = replies to your posts and to threads you follow; **Other** = follows, airing episodes, media changes
  - the tab you picked is remembered
- **Like previews**: a small cover square on every like, and a **What people liked** strip at the top
  (one square per post, with a number when several people liked it). Click a square to see the post and who liked it.

> Works with AniList's own filter on the left (Activity, Forum ...). The tabs sort what AniList has loaded so far:
> scroll down for older notifications.

---

## Install

1. Install the **Tampermonkey** extension for your browser (Chrome, Brave, Edge or Firefox).
2. Open **[anilist-like-previews.user.js](https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/like-previews/anilist-like-previews.user.js)**
   and click **Install** on Tampermonkey's page.
3. Reload your AniList tabs and open your notifications.

To update later: open the same link again and click **Update**.

## Light on your browser

- It only runs on anilist.co, and only does real work on the notifications page.
- On every other AniList page it doesn't watch the page at all.
- On the notifications page it only works while the tab is in front of you, and does nothing while idle.
- Covers it has already shown are remembered, so revisits need no requests. It asks AniList's API for at most
  20 lookups a minute and backs off on errors.

## License

MIT, see [LICENSE](LICENSE).

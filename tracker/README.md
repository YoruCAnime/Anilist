# AniList Tracker

by **YoruC**

A daily / weekly board of your **Watching** list, right under the banner of your AniList profile.

- **Today**: episodes airing today, with the time and a live countdown
- **Catch up**: shows with aired episodes you haven't watched yet
- **Week**: what airs in the next 7 days, day by day
- **All**: your whole Watching list, next episode first
- **+1** on a card marks the next episode watched; the **⋯** button edits status, episodes and score
- On **other people's profiles** you see what *they* are watching (Today / Week / All, read only)

It finds your account by itself: nothing to set up, just be logged in to AniList.

## Install

1. Install the **Tampermonkey** extension for your browser (Chrome, Brave, Edge or Firefox).
2. Open **[anilist-tracker.user.js](https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/tracker/anilist-tracker.user.js)**
   and click **Install** on Tampermonkey's page.
3. Reload your AniList tabs and open your profile.

Updates come by themselves through Tampermonkey.

> **Times: AniList | AC** switches the countdowns to the AnimeCountdown calendar. The first time, Tampermonkey asks
> about `data.simkl.in`: choose **Always allow**.

## Options

At the top of the script (`CONFIG`): `showOthers` (board on other people's profiles), `layout` (`cards` / `rows` /
`list`), `titleLanguage` (`english` / `romaji` / `preferred`).

## License

MIT, see [LICENSE](LICENSE).

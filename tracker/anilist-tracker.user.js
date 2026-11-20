// ==UserScript==
// @name         AniList Tracker
// @namespace    yoruc.anilist.tracker
// @version      5.3.0
// @description  Daily / weekly / watching board on your AniList profile: what airs today, this week, what you need to catch up on, one-click +1. Other people's profiles show what they are watching.
// @author       YoruC
// @license      MIT
// @homepageURL  https://github.com/YoruCAnime/Anilist/tree/main/tracker
// @updateURL    https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/tracker/anilist-tracker.user.js
// @downloadURL  https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/tracker/anilist-tracker.user.js
// @match        https://anilist.co/*
// @icon         https://anilist.co/img/icons/favicon-32x32.png
// @connect      graphql.anilist.co
// @connect      data.simkl.in
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @noframes
// @inject-into  page
// ==/UserScript==

/*
 * INSTALL
 *   Install Tampermonkey, then open the @downloadURL link above: Tampermonkey shows an Install button.
 *   It finds your AniList name by itself (the account you are logged in with); updates come by themselves.
 *
 * WHAT CHANGED IN 5.3
 *   - Every cover says "Watched" (green) or "Not yet watched" for the episode the card is about: today's episode
 *     on Today, that day's episode on Week, the newest aired one on Catch up / All. Red = it has aired and is
 *     not watched, grey = it has not aired yet. Works on your board and on other people's.
 *
 * WHAT CHANGED IN 5.2
 *   - Works for anyone: your own profile is found from your AniList login (CONFIG.username can still force a name).
 *   - Self-updates from GitHub (YoruCAnime/Anilist, folder tracker). New name: AniList Tracker.
 *
 * WHAT CHANGED IN 5.0 / 5.1
 *   - Your profile's Overview: the full board, right under the banner. Not on the anime list
 *     page, never on the home page.
 *   - Other people's profiles (5.1): a read-only "<name> is watching" board - Today / Week / All, no +1, no
 *     Catch up. CONFIG.showOthers = false turns it off.
 *   - About half the height: compact rows in two columns instead of big cards, one header line, the tabs
 *     carry the counts (no separate "watching / today / behind" chips), the schedule is a "Week" tab.
 *   - Less noise: no double progress bar, no score pill, no "AIRS TODAY" / "UP TO DATE" tags. A chip shows
 *     only when there is something to do (gold READY, red N BEHIND). Countdowns still tick every 30 s.
 *   - Fixed: switching Home <-> profile could leave the board stuck on the wrong page, duplicated, or gone.
 *     The board now only ever lives inside the Overview of the right profile, moves itself back if AniList
 *     re-renders the page, and is removed the moment you leave the profile.
 *   Same as before
 *   - +1 and the editor read your entry live first, send only what changed, check the answer, refresh a
 *     stale login token once, and show a red toast if AniList refused.
 *   - Auto refetch after midnight / when the data is older than cacheMinutes.
 *   - "Times: AniList | AC". Tampermonkey asks once to allow data.simkl.in: choose "Always allow".
 */

(function () {
  "use strict";

  const CONFIG = {
    // Your own profile (/user/<name>/ Overview): the full board with +1 and the editor.
    // Leave "" to use the AniList account you are logged in with (normal). Only set a name to force one.
    username: "",
    // Other people's profiles: a read-only board of what THEY are watching (Today / Week / All, no Catch up).
    // false = the board only ever shows on your own profile.
    showOthers: true,
    // "rows" = compact rows in two columns, "cards" = small cover cards, "list" = thin text lines, no covers.
    layout: "cards",
    // true = "Coming up" (tomorrow .. +6 days) as a column on the right; false = a "Week" tab instead.
    weekColumn: false,
    // Title language: "english" (falls back to romaji), "romaji", or "preferred" (your AniList setting).
    titleLanguage: "english",
    // How long fetched data is reused before the API is hit again (also triggers auto-refresh).
    cacheMinutes: 10,
    // Max pixel height of the list before it scrolls inside.
    boardHeight: 310,
    // Default countdown source: "anilist" or "animecountdown". The switch in the panel overrides this.
    countdownSource: "anilist",
    // How long the AnimeCountdown calendar is reused before it's downloaded again.
    animeCountdownCacheMinutes: 30,
  };

  // Page globals (al_token, history) live on the real window; with GM grants we run in a sandbox.
  const W = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const SIMKL_CAL = "https://data.simkl.in/calendar/anime.json";
  const SOURCE_KEY = "aca-source";
  const SIMKL_CACHE_KEY = "aca-simkl-v1";

  const API = "https://graphql.anilist.co";
  const SITE_API = "https://anilist.co/graphql";
  const ROOT = "aca-root";
  const STYLE_ID = "aca-style";
  const EDITOR_ID = "aca-editor";
  const TOAST_ID = "aca-toasts";
  const TAB_KEY = "aca-tab";
  const PREFIX = "[ACA-Tracker]";
  // After a save, trust our own result over the public API for this long (it can lag a little).
  const SAVE_HOLD_MS = 3 * 60 * 1000;

  const ICONS = {
    dots: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    refresh:
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
    wolf: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 3l4 4h8l4-4v8c0 5-3.6 9-8 9s-8-4-8-9V3zm5 8a1.4 1.4 0 1 0 0 2.8A1.4 1.4 0 0 0 9 11zm6 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm-3 4.2l-1.6 1.6c.5.4 1 .6 1.6.6s1.1-.2 1.6-.6L12 15.2z"/></svg>',
  };

  const STATUSES = [
    ["CURRENT", "Watching"],
    ["COMPLETED", "Completed"],
    ["PAUSED", "Paused"],
    ["DROPPED", "Dropped"],
    ["PLANNING", "Planning"],
    ["REPEATING", "Rewatching"],
  ];

  const LIST_QUERY = `
    query ($userName: String) {
      MediaListCollection(userName: $userName, type: ANIME, status: CURRENT) {
        lists {
          name
          status
          isCustomList
          entries {
            id
            status
            progress
            score
            media {
              id
              idMal
              status
              format
              episodes
              siteUrl
              coverImage { large medium color }
              title { userPreferred english romaji native }
              nextAiringEpisode { episode airingAt timeUntilAiring }
            }
          }
        }
      }
    }
  `;

  const SCHEDULE_QUERY = `
    query ($ids: [Int], $from: Int, $to: Int, $page: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage currentPage }
        airingSchedules(mediaId_in: $ids, airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
          mediaId
          episode
          airingAt
        }
      }
    }
  `;

  const VIEWER_QUERY = `query { Viewer { id name mediaListOptions { scoreFormat } } }`;

  const ENTRY_QUERY = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        episodes
        mediaListEntry { id status progress score }
      }
    }
  `;

  const SAVE_MUTATION = `
    mutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status, score: $score, progress: $progress) {
        id status progress score
      }
    }
  `;

  let lastPath = "";
  let lastUsername = "";
  let lastKind = "profile";
  let lastPayload = null;
  let lastAllowEdit = false;
  let tickTimer = null;
  let navTimer = null;
  let injecting = false;
  let failedUntil = 0;
  let loadedAt = 0;
  let loadedDay = "";
  let csrfOverride = "";
  let viewerPromise = null;
  let viewerRetryAt = 0;
  const recentSaves = new Map();
  const busy = new Set();
  let simklMap = null;
  let simklAt = 0;
  let simklState = "idle"; // idle | loading | ok | error
  let simklError = "";
  let simklPromise = null;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function readLS(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeLS(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  /* ---------- public data (read-only, no login needed) ---------- */

  // The logged-in AniList name: CONFIG.username if set, else the site's own login data (localStorage "auth"),
  // else the "profile" link in AniList's top bar, else the Viewer lookup once it has answered. "" = logged out.
  let viewerName = "";
  function myName() {
    if (CONFIG.username) return CONFIG.username;
    try {
      const a = JSON.parse(readLS("auth") || "null");
      const n = a && ((a.user && a.user.name) || a.name);
      if (typeof n === "string" && n) return n;
    } catch {
      /* ignore */
    }
    const link = document.querySelector('#nav .links a[href^="/user/"], .nav .links a[href^="/user/"]');
    if (link) {
      const m = (link.getAttribute("href") || "").match(/^\/user\/([^/]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return viewerName;
  }

  // Only a profile Overview: /user/<name> or /user/<name>/ (no sub-page). kind = "own" on your own
  // profile, "other" on anyone else's (only when CONFIG.showOthers).
  function pageInfo(pathname) {
    const m = pathname.match(/^\/user\/([^/]+)\/?$/);
    if (!m) return null;
    const username = decodeURIComponent(m[1]);
    const me = myName();
    const own = !!me && username.toLowerCase() === me.toLowerCase();
    if (!own && !CONFIG.showOthers) return null;
    return { username, kind: own ? "own" : "other" };
  }

  function cacheKey(user) {
    return "aca-cache-v4:" + user.toLowerCase();
  }

  function readCache(user) {
    try {
      const raw = sessionStorage.getItem(cacheKey(user));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.at || Date.now() - parsed.at > CONFIG.cacheMinutes * 60 * 1000) return null;
      // Never reuse data fetched on a previous day: "today" would be wrong.
      if (new Date(parsed.at).toDateString() !== new Date().toDateString()) return null;
      return parsed.data;
    } catch {
      return null;
    }
  }

  function writeCache(user, data) {
    try {
      sessionStorage.setItem(cacheKey(user), JSON.stringify({ at: Date.now(), data }));
    } catch {
      /* ignore quota */
    }
  }

  function clearCache(user) {
    try {
      sessionStorage.removeItem(cacheKey(user));
    } catch {
      /* ignore */
    }
  }

  async function gql(query, variables) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (!res.ok || json.errors) {
      const msg = (json.errors && json.errors[0] && json.errors[0].message) || res.statusText;
      if (res.status === 429) throw new Error("AniList is rate-limiting, try again in a minute");
      throw new Error(msg || "AniList API error");
    }
    return json.data;
  }

  function localDayStart(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async function loadWatching(user) {
    const cached = readCache(user);
    if (cached) return cached;

    const listData = await gql(LIST_QUERY, { userName: user });
    const lists = (listData.MediaListCollection && listData.MediaListCollection.lists) || [];
    const entries = [];
    const seen = new Set();
    for (const list of lists) {
      if (list.isCustomList) continue;
      if (list.status && list.status !== "CURRENT") continue;
      for (const entry of list.entries || []) {
        const id = entry.media && entry.media.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        entries.push(entry);
      }
    }

    const ids = entries.map((e) => e.media.id);
    const now = Math.floor(Date.now() / 1000);
    const startToday = Math.floor(localDayStart(new Date()).getTime() / 1000) - 60;
    const endWindow = now + 8 * 86400;
    const airings = [];

    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      let page = 1;
      let more = true;
      while (more) {
        const sched = await gql(SCHEDULE_QUERY, { ids: chunk, from: startToday, to: endWindow, page });
        const nodes = (sched.Page && sched.Page.airingSchedules) || [];
        airings.push(...nodes);
        more = !!(sched.Page && sched.Page.pageInfo && sched.Page.pageInfo.hasNextPage);
        page += 1;
        if (page > 6) break;
      }
    }

    const data = { entries, airings, fetchedAt: Date.now() };
    writeCache(user, data);
    return data;
  }

  /* ---------- AnimeCountdown (Simkl calendar) ---------- */

  function getSource() {
    const s = readLS(SOURCE_KEY) || CONFIG.countdownSource;
    return s === "animecountdown" ? "animecountdown" : "anilist";
  }

  // Cross-site GET: the GM request bypasses CORS; plain fetch is the fallback for managers without it.
  function httpGetJson(url) {
    const gm =
      typeof GM_xmlhttpRequest === "function"
        ? GM_xmlhttpRequest
        : typeof GM !== "undefined" && GM && typeof GM.xmlHttpRequest === "function"
        ? GM.xmlHttpRequest
        : null;
    if (!gm) {
      return fetch(url, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
    }
    return new Promise((resolve, reject) => {
      gm({
        method: "GET",
        url,
        timeout: 20000,
        headers: { Accept: "application/json" },
        onload: (r) => {
          if (r.status < 200 || r.status >= 300) return reject(new Error("HTTP " + r.status));
          try {
            resolve(JSON.parse(r.responseText));
          } catch {
            reject(new Error("unreadable reply"));
          }
        },
        onerror: () => reject(new Error("blocked or offline (allow data.simkl.in in Tampermonkey)")),
        ontimeout: () => reject(new Error("timed out")),
      });
    });
  }

  function acPageUrl(entry) {
    const ids = entry.ids || {};
    if (!ids.simkl_id) return "";
    return "https://animecountdown.com/" + ids.simkl_id + (ids.slug ? "/" + ids.slug : "");
  }

  // Returns { [malId]: [{ ep, at, url }] } or throws.
  async function loadSimkl(force) {
    const maxAge = CONFIG.animeCountdownCacheMinutes * 60 * 1000;
    if (!force && simklMap && Date.now() - simklAt < maxAge) return simklMap;
    if (!force) {
      try {
        const raw = sessionStorage.getItem(SIMKL_CACHE_KEY);
        const parsed = raw && JSON.parse(raw);
        if (parsed && parsed.at && Date.now() - parsed.at < maxAge && parsed.map) {
          simklMap = parsed.map;
          simklAt = parsed.at;
          simklState = "ok";
          return simklMap;
        }
      } catch {
        /* ignore */
      }
    }
    if (simklPromise) return simklPromise;

    simklState = "loading";
    simklPromise = httpGetJson(SIMKL_CAL)
      .then((list) => {
        if (!Array.isArray(list)) throw new Error("unexpected calendar format");
        const map = {};
        for (const e of list) {
          const mal = e && e.ids && e.ids.mal;
          if (!mal) continue;
          const at = Math.floor(Date.parse(e.date) / 1000);
          if (!at) continue;
          const ep = e.episode && Number(e.episode.episode);
          (map[String(mal)] = map[String(mal)] || []).push({ ep: ep || null, at, url: acPageUrl(e) });
        }
        simklMap = map;
        simklAt = Date.now();
        simklState = "ok";
        simklError = "";
        try {
          sessionStorage.setItem(SIMKL_CACHE_KEY, JSON.stringify({ at: simklAt, map }));
        } catch {
          /* ignore quota */
        }
        return map;
      })
      .catch((err) => {
        simklState = "error";
        simklError = err.message || "failed";
        console.warn(PREFIX, "AnimeCountdown calendar failed:", simklError);
        throw err;
      })
      .finally(() => {
        simklPromise = null;
      });
    return simklPromise;
  }

  // Swap AniList's air times for AnimeCountdown's where the show and episode can be matched.
  function applyAnimeCountdown(item, list) {
    const nowSec = Date.now() / 1000;
    const near = 2 * 86400;
    let used = false;
    for (const s of list) {
      let target = s.ep != null ? item.airings.find((a) => a.episode === s.ep) : null;
      if (!target && item.next && s.ep != null && item.next.episode === s.ep) target = item.next;
      if (!target) {
        // Season numbering can differ (Simkl ep 2 vs AniList ep 14): match the airing closest in time.
        let best = null;
        for (const a of item.airings) {
          const d = Math.abs(a.airingAt - s.at);
          if (d < near && (!best || d < best.d)) best = { a, d };
        }
        target = best ? best.a : null;
        if (!target && item.next && Math.abs(item.next.airingAt - s.at) < near) target = item.next;
      }
      if (target) {
        const ep = target.episode;
        for (const a of item.airings) {
          if (a.episode === ep) {
            a.airingAt = s.at;
            a.ac = s.url || "#";
          }
        }
        if (item.next && item.next.episode === ep) item.next = Object.assign({}, item.next, { airingAt: s.at, ac: s.url || "#" });
        used = true;
      } else if (s.ep != null && !item.airings.some((a) => a.airingAt > nowSec) && !(item.next && item.next.airingAt > nowSec)) {
        // AniList has no upcoming date at all: take AnimeCountdown's.
        item.airings.push({ mediaId: item.id, episode: s.ep, airingAt: s.at, ac: s.url || "#" });
        used = true;
      }
    }
    if (used) {
      item.airings.sort((a, b) => a.airingAt - b.airingAt);
      item.acUrl = (list.find((s) => s.url) || {}).url || "";
    }
    item.fromAC = used;
  }

  /* ---------- logged-in site API (edits) ---------- */

  function pageToken() {
    try {
      if (typeof W.al_token === "string" && W.al_token) return W.al_token;
    } catch {
      /* ignore */
    }
    for (const s of document.querySelectorAll("head script")) {
      const t = s.textContent || "";
      if (!t.includes("al_token")) continue;
      const m = t.match(/al_token\s*=\s*["']([^"']+)["']/);
      if (m) return m[1];
    }
    return "";
  }

  function getCsrf() {
    return csrfOverride || pageToken();
  }

  // A tab left open for a day can hold an expired token. Pull a fresh one from the site shell.
  async function refreshCsrf() {
    try {
      const res = await fetch("/", { credentials: "same-origin", cache: "no-store" });
      const html = await res.text();
      const m = html.match(/al_token\s*=\s*["']([^"']+)["']/);
      csrfOverride = m ? m[1] : "";
    } catch {
      csrfOverride = "";
    }
    return csrfOverride;
  }

  async function siteGql(query, variables, retried) {
    let token = getCsrf();
    if (!token && !retried) token = await refreshCsrf();
    if (!token) throw new Error("you're not logged in to AniList in this tab");

    let res = null;
    let json = null;
    try {
      res = await fetch(SITE_API, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Csrf-Token": token },
        body: JSON.stringify({ query, variables }),
      });
      json = await res.json();
    } catch {
      json = null;
    }

    const errText = json && json.errors ? json.errors.map((e) => e.message || "").join("; ") : "";
    const authFail =
      !res ||
      !json ||
      res.status === 401 ||
      res.status === 403 ||
      res.status === 419 ||
      /csrf|token|unauthori[sz]ed|invalid session|not authenticated/i.test(errText);

    if (authFail && !retried) {
      await refreshCsrf();
      return siteGql(query, variables, true);
    }
    if (res && res.status === 429) throw new Error("AniList is rate-limiting, wait a minute and try again");
    if (!res || !json) throw new Error("AniList didn't answer (" + (res ? "HTTP " + res.status : "network error") + ")");
    if (!res.ok || json.errors) throw new Error(errText || res.statusText || "AniList save failed");
    return json.data;
  }

  function getViewer() {
    if (viewerPromise) return viewerPromise;
    if (Date.now() < viewerRetryAt) return Promise.resolve(null);
    viewerPromise = siteGql(VIEWER_QUERY, {})
      .then((d) => {
        const v = (d && d.Viewer) || null;
        if (v && v.name) viewerName = v.name;
        return v;
      })
      .catch((err) => {
        console.warn(PREFIX, "viewer lookup failed:", err.message);
        viewerPromise = null;
        viewerRetryAt = Date.now() + 5 * 60 * 1000;
        return null;
      });
    return viewerPromise;
  }

  function scoreSpec(format) {
    switch (format) {
      case "POINT_100":
        return { max: 100, step: 1, label: "0–100" };
      case "POINT_10_DECIMAL":
        return { max: 10, step: 0.1, label: "0–10" };
      case "POINT_5":
        return { max: 5, step: 1, label: "0–5 stars" };
      case "POINT_3":
        return { max: 3, step: 1, label: "0–3 smileys" };
      default:
        return { max: 10, step: 1, label: "0–10" };
    }
  }

  async function fetchEntry(mediaId) {
    const data = await siteGql(ENTRY_QUERY, { id: mediaId });
    const media = data && data.Media;
    if (!media) throw new Error("AniList couldn't find this anime");
    return { entry: media.mediaListEntry || null, episodes: media.episodes || null };
  }

  async function saveEntry(item, changes) {
    const data = await siteGql(SAVE_MUTATION, Object.assign({ mediaId: item.id }, changes));
    const saved = data && data.SaveMediaListEntry;
    if (!saved) throw new Error("AniList returned nothing for the save");
    if (changes.progress != null && saved.progress !== changes.progress && saved.status !== "COMPLETED") {
      throw new Error("AniList kept progress at " + saved.progress);
    }
    if (changes.status && saved.status !== changes.status && !(changes.status === "CURRENT" && saved.status === "COMPLETED")) {
      throw new Error("AniList kept status as " + statusLabel(saved.status));
    }
    recentSaves.set(item.id, { progress: saved.progress, status: saved.status, score: saved.score, at: Date.now() });
    return saved;
  }

  function statusLabel(code) {
    const hit = STATUSES.find(([v]) => v === code);
    return hit ? hit[1] : code || "?";
  }

  /* ---------- model ---------- */

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function titleOf(media) {
    const t = media.title || {};
    if (CONFIG.titleLanguage === "english") return t.english || t.romaji || t.userPreferred || t.native || "Untitled";
    if (CONFIG.titleLanguage === "romaji") return t.romaji || t.english || t.userPreferred || t.native || "Untitled";
    return t.userPreferred || t.english || t.romaji || t.native || "Untitled";
  }

  function coverOf(media) {
    return (media.coverImage && (media.coverImage.medium || media.coverImage.large)) || "";
  }

  function bigCoverOf(media) {
    return (media.coverImage && (media.coverImage.large || media.coverImage.medium)) || "";
  }

  // toLocale*String(…, options) builds a new formatter on every call, which is slow when a
  // redraw formats hundreds of times. Build each formatter once and reuse it.
  const FMT = {};
  function fmt(key, options) {
    return FMT[key] || (FMT[key] = new Intl.DateTimeFormat([], options));
  }

  function formatTime(unix) {
    return fmt("time", { hour: "2-digit", minute: "2-digit" }).format(new Date(unix * 1000));
  }

  function formatDateLong(date) {
    return fmt("long", { weekday: "long", month: "short", day: "numeric" }).format(date);
  }

  function formatWeekday(date) {
    return fmt("wdLong", { weekday: "long" }).format(date);
  }

  function formatMonthDay(date) {
    return fmt("md", { month: "short", day: "numeric" }).format(date);
  }

  function relDay(unix) {
    const d = new Date(unix * 1000);
    const today = new Date();
    if (isSameDay(d, today)) return "Today";
    const tmr = new Date(today);
    tmr.setDate(tmr.getDate() + 1);
    if (isSameDay(d, tmr)) return "Tomorrow";
    return fmt("wdShort", { weekday: "short" }).format(d);
  }

  let tzCache = null;
  function tzLabel() {
    if (tzCache !== null) return tzCache;
    try {
      const parts = new Intl.DateTimeFormat([], { timeZoneName: "short" }).formatToParts(new Date());
      const tz = parts.find((p) => p.type === "timeZoneName");
      tzCache = tz ? tz.value : "";
    } catch {
      tzCache = "";
    }
    // BST/GMT can flip overnight; recheck hourly.
    setTimeout(() => {
      tzCache = null;
    }, 3600000);
    return tzCache;
  }

  function countdown(unix, now) {
    const diff = unix * 1000 - now;
    const mins = Math.round(Math.abs(diff) / 60000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    let label;
    if (d > 0) label = d + "d " + h + "h";
    else if (h > 0) label = h + "h " + m + "m";
    else label = m + "m";
    if (diff > 0) return { text: "in " + label, upcoming: true };
    return { text: label + " ago", upcoming: false };
  }

  function agoText(ms) {
    const mins = Math.round(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const h = Math.floor(mins / 60);
    return h + "h " + (mins % 60) + "m ago";
  }

  // simkl: AnimeCountdown map when that source is on, otherwise null.
  function buildModel(payload, simkl) {
    const now = Date.now();
    const today = new Date();
    const byId = new Map();

    for (const entry of payload.entries) {
      const media = entry.media;
      const held = recentSaves.get(media.id);
      const fresh = held && now - held.at < SAVE_HOLD_MS ? held : null;
      // Just moved off Watching (completed / dropped / paused): hide it right away.
      if (fresh && fresh.status && fresh.status !== "CURRENT") continue;
      byId.set(media.id, {
        id: media.id,
        entryId: entry.id,
        listStatus: entry.status || "CURRENT",
        score: (fresh ? fresh.score : entry.score) || 0,
        progress: (fresh ? fresh.progress : entry.progress) || 0,
        title: titleOf(media),
        cover: coverOf(media),
        bigCover: bigCoverOf(media),
        accent: (media.coverImage && media.coverImage.color) || "",
        url: media.siteUrl || "https://anilist.co/anime/" + media.id,
        episodes: media.episodes,
        format: media.format,
        status: media.status,
        idMal: media.idMal || null,
        // Copies, so switching countdown source never alters the cached AniList data.
        next: media.nextAiringEpisode ? Object.assign({}, media.nextAiringEpisode) : null,
        airings: [],
        todayEps: [],
        fromAC: false,
        acUrl: "",
      });
    }

    for (const air of payload.airings) {
      const item = byId.get(air.mediaId);
      if (item) item.airings.push(Object.assign({}, air));
    }
    for (const item of byId.values()) item.airings.sort((a, b) => a.airingAt - b.airingAt);

    let acMatched = 0;
    if (simkl) {
      for (const item of byId.values()) {
        const list = item.idMal && simkl[String(item.idMal)];
        if (!list || !list.length) continue;
        applyAnimeCountdown(item, list);
        if (item.fromAC) acMatched += 1;
      }
    }

    for (const item of byId.values()) {
      for (const air of item.airings) {
        if (isSameDay(new Date(air.airingAt * 1000), today)) {
          item.todayEps.push({ episode: air.episode, airingAt: air.airingAt, ac: air.ac || "" });
        }
      }
    }

    const items = [...byId.values()];
    // Work these out once per redraw; sorting and rendering ask for them many times.
    for (const item of items) {
      item._aired = airedCount(item);
      item._behind = item._aired == null ? 0 : Math.max(0, item._aired - (item.progress || 0));
    }

    const todayItems = items
      .filter((i) => i.todayEps.length)
      .sort((a, b) => todayEpisode(a).airingAt - todayEpisode(b).airingAt);

    const behindItems = items
      .filter((i) => behindOf(i) > 0)
      .sort((a, b) => behindOf(b) - behindOf(a) || a.title.localeCompare(b.title));

    const nextAt = (i) => {
      const up = upcomingOf(i);
      return up ? up.airingAt : Infinity;
    };
    const allItems = [...items].sort((a, b) => nextAt(a) - nextAt(b) || a.title.localeCompare(b.title));

    // Schedule column: real air dates for tomorrow .. +6 days (handles daily shows and breaks).
    const week = [];
    const start = localDayStart(today);
    for (let i = 1; i < 7; i++) {
      const dayStart = new Date(start);
      dayStart.setDate(start.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const from = dayStart.getTime() / 1000;
      const to = dayEnd.getTime() / 1000;
      const rows = [];
      for (const item of items) {
        for (const air of item.airings) {
          if (air.airingAt >= from && air.airingAt < to) rows.push({ item, air });
        }
      }
      rows.sort((a, b) => a.air.airingAt - b.air.airingAt);
      week.push({ offset: i, date: dayStart, rows });
    }
    const weekCount = week.reduce((n, d) => n + d.rows.length, 0);

    const readyCount = todayItems.filter((i) =>
      i.todayEps.some((e) => e.airingAt * 1000 <= now && e.episode > i.progress)
    ).length;

    let nextUp = null;
    for (const i of items) {
      const up = upcomingOf(i);
      if (up && (!nextUp || up.airingAt < nextUp.up.airingAt)) nextUp = { item: i, up };
    }

    return {
      items,
      todayItems,
      behindItems,
      allItems,
      week,
      weekCount,
      readyCount,
      nextUp,
      acMatched,
      now,
      today,
      fetchedAt: payload.fetchedAt,
    };
  }

  function todayEpisode(item) {
    return item.todayEps.find((e) => e.episode > item.progress) || item.todayEps[item.todayEps.length - 1];
  }

  function upcomingOf(item) {
    const now = Date.now() / 1000;
    const a = item.airings.find((x) => x.airingAt > now);
    if (a) return a;
    if (item.next && item.next.airingAt > now) return item.next;
    return null;
  }

  function airedCount(item) {
    if (item._aired !== undefined) return item._aired;
    const now = Date.now() / 1000;
    let aired = null;
    if (item.next) aired = item.next.airingAt <= now ? item.next.episode : item.next.episode - 1;
    for (const a of item.airings) if (a.airingAt <= now) aired = Math.max(aired || 0, a.episode);
    if (aired == null && item.status === "FINISHED" && item.episodes) aired = item.episodes;
    return aired;
  }

  function behindOf(item) {
    if (item._behind !== undefined) return item._behind;
    const aired = airedCount(item);
    if (aired == null) return 0;
    return Math.max(0, aired - (item.progress || 0));
  }

  function progressText(item) {
    const watched = item.progress || 0;
    const base = item.episodes ? watched + "/" + item.episodes : String(watched);
    const aired = airedCount(item);
    return aired != null && aired !== item.episodes ? base + " · " + aired + " aired" : base;
  }

  function progressPct(item) {
    const total = item.episodes || airedCount(item) || item.progress || 1;
    return Math.max(0, Math.min(100, ((item.progress || 0) / total) * 100));
  }

  function airedPct(item) {
    const aired = airedCount(item);
    if (aired == null) return 0;
    const total = item.episodes || aired || 1;
    return Math.max(0, Math.min(100, (aired / total) * 100));
  }

  function cardState(item, now) {
    const behind = behindOf(item);
    if (behind > 1) return { cls: "is-behind", tag: "behind", text: behind + " behind" };
    if (behind === 1) return { cls: "is-ready", tag: "ready", text: "Ready" };
    if (item.todayEps.some((e) => e.airingAt * 1000 > now)) return { cls: "is-soon", tag: "soon", text: "Airs today" };
    return { cls: "", tag: "done", text: "Up to date" };
  }

  /* ---------- dom helpers ---------- */

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
        else if (k === "style" && typeof v === "object") {
          for (const [sk, sv] of Object.entries(v)) {
            if (sv == null || sv === "") continue;
            if (sk.startsWith("--")) node.style.setProperty(sk, sv);
            else node.style[sk] = sv;
          }
        } else node.setAttribute(k, v === true ? "" : String(v));
      }
    }
    if (children) {
      for (const child of [].concat(children)) {
        if (child == null || child === false) continue;
        node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
      }
    }
    return node;
  }

  function span(cls, text) {
    return el("span", { class: cls || null, text });
  }

  function sep() {
    return span("aca-sep", "·");
  }

  function countNode(unix, now, ac) {
    const c = countdown(unix, now);
    const node = el("span", {
      class: "aca-count" + (c.upcoming ? "" : " is-past"),
      "data-airing": String(unix),
      "data-up": c.upcoming ? "1" : "0",
      text: c.text,
    });
    if (!ac) return node;
    return el("span", { class: "aca-count-wrap" }, [node, acChip(ac)]);
  }

  function acChip(ac) {
    const real = ac && ac !== "#";
    return el(real ? "a" : "span", {
      class: "aca-ac",
      href: real ? ac : null,
      target: real ? "_blank" : null,
      rel: real ? "noopener" : null,
      title: "Time from AnimeCountdown" + (real ? " (open page)" : ""),
      text: "AC",
      onclick: (e) => e.stopPropagation(),
    });
  }

  function clampNum(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  /* ---------- toasts ---------- */

  function toast(text, kind) {
    let wrap = document.getElementById(TOAST_ID);
    if (!wrap) {
      wrap = el("div", { id: TOAST_ID, "aria-live": "polite" });
      document.body.appendChild(wrap);
    }
    const t = el("div", { class: "aca-toast " + (kind || ""), role: "status", text });
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add("is-in"));
    setTimeout(
      () => {
        t.classList.remove("is-in");
        setTimeout(() => t.remove(), 250);
      },
      kind === "err" ? 7000 : 3200
    );
  }

  function savedText(item, saved, total) {
    let s = item.title + " → EP " + saved.progress + (total ? "/" + total : "");
    if (saved.status && saved.status !== "CURRENT") s += " · " + statusLabel(saved.status);
    return s + " · saved";
  }

  /* ---------- styles ---------- */

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      #${ROOT} {
        /* wheat gold / sunset / dusk: the Holo palette */
        --gold: #f2b544;
        --gold-hi: #ffd371;
        --gold-soft: rgba(242, 181, 68, 0.16);
        --gold-faint: rgba(242, 181, 68, 0.07);
        --gold-line: rgba(242, 181, 68, 0.42);
        --ember: #e8743f;
        --dusk: #9d8cf0;
        --dusk-soft: rgba(157, 140, 240, 0.18);
        --dusk-deep: rgba(76, 60, 140, 0.30);
        --red: #e85d75;
        --green: #7bc874;
        --red-soft: rgba(232, 93, 117, 0.16);
        /* the board's own dark card colours (AniList's dark theme), so it reads the same on the light theme too */
        --txt: #9fadbd;
        --hi: #edf1f5;
        --bg: #0b1622;
        --surface: #151f2e;
        --sunken: rgba(11, 22, 34, 0.5);
        --line: rgba(159, 173, 189, 0.18);
        --line-soft: rgba(159, 173, 189, 0.1);
        font-family: Overpass, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: var(--txt);
        display: block;
        width: 100%;
        margin: 0 0 22px;
        font-size: 12px;
        line-height: 1.3;
      }
      #${ROOT} * { box-sizing: border-box; }
      #${ROOT} a { text-decoration: none; color: inherit; }
      #${ROOT} button { font-family: inherit; }

      #${ROOT} .aca-panel {
        position: relative;
        border-radius: 12px;
        border: 1px solid var(--line-soft);
        background: var(--surface);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
        overflow: hidden;
      }
      /* the sunset line: dusk -> wheat gold -> ember */
      #${ROOT} .aca-panel::before {
        content: ""; position: absolute; left: 0; right: 0; top: 0; height: 3px; z-index: 1;
        background: linear-gradient(90deg, #5a4a9a 0%, #9d8cf0 18%, #f2b544 45%, #ffd371 62%, #e8743f 100%);
      }

      /* header: brand | tabs | tools, one line */
      #${ROOT} .aca-head {
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        padding: 11px 14px 9px;
        border-bottom: 1px solid var(--line-soft);
        background: linear-gradient(100deg, var(--dusk-deep) 0%, var(--gold-faint) 40%, transparent 75%);
      }
      #${ROOT} .aca-brand { display: flex; align-items: center; gap: 9px; min-width: 0; }
      #${ROOT} .aca-logo {
        width: 28px; height: 28px; flex-shrink: 0;
        display: grid; place-items: center;
        border-radius: 8px; background: var(--gold-soft); color: var(--gold);
        box-shadow: inset 0 0 0 1px var(--gold-line);
      }
      #${ROOT} .aca-logo svg { fill: currentColor; width: 16px; height: 16px; }
      #${ROOT} .aca-brand-text { min-width: 0; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
      #${ROOT} .aca-title { margin: 0; font-size: 14px; font-weight: 800; line-height: 1.1; color: var(--hi); letter-spacing: -0.01em; white-space: nowrap; }
      #${ROOT} .aca-date { font-size: 11px; color: var(--txt); white-space: nowrap; }
      #${ROOT}.is-other .aca-title { color: var(--dusk); }
      #${ROOT}.is-other .aca-logo { background: var(--dusk-soft); color: var(--dusk); box-shadow: inset 0 0 0 1px rgba(157, 140, 240, 0.45); }
      #${ROOT} .aca-date b { color: var(--hi); font-weight: 700; }

      #${ROOT} .aca-tabs {
        display: inline-flex; gap: 2px; padding: 3px; margin: 0 auto;
        border-radius: 999px; background: var(--sunken); border: 1px solid var(--line-soft);
      }
      #${ROOT} .aca-tab {
        display: inline-flex; align-items: center; gap: 6px;
        border: 0; background: transparent; color: var(--txt);
        padding: 4px 11px 4px 12px; border-radius: 999px;
        font-size: 12px; font-weight: 700; cursor: pointer; line-height: 1;
        transition: background 0.15s, color 0.15s;
      }
      #${ROOT} .aca-tab:hover { color: var(--hi); }
      #${ROOT} .aca-tab .n {
        min-width: 18px; padding: 2px 5px; border-radius: 999px;
        font-size: 10px; font-weight: 800; text-align: center; line-height: 1.1;
        background: rgba(159, 173, 189, 0.14); color: var(--hi);
      }
      #${ROOT} .aca-tab.has-today .n { background: var(--dusk-soft); color: var(--dusk); }
      #${ROOT} .aca-tab.has-behind .n { background: var(--red-soft); color: var(--red); }
      #${ROOT} .aca-tab.is-on { background: var(--gold-soft); color: var(--gold-hi); box-shadow: inset 0 0 0 1px var(--gold-line); }
      #${ROOT} .aca-tab.is-on .n { background: var(--gold); color: var(--bg); }

      #${ROOT} .aca-tools { display: flex; align-items: center; gap: 8px; margin-left: auto; }
      #${ROOT} .aca-src { display: inline-flex; align-items: center; gap: 6px; }
      #${ROOT} .aca-src-label { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--txt); }
      #${ROOT} .aca-src-group { display: inline-flex; padding: 2px; border-radius: 7px; background: var(--sunken); border: 1px solid var(--line-soft); }
      #${ROOT} .aca-src-btn {
        border: 0; background: transparent; color: var(--txt);
        padding: 3px 8px; border-radius: 5px;
        font-size: 11px; font-weight: 700; cursor: pointer; line-height: 1.2;
        transition: background 0.15s, color 0.15s;
      }
      #${ROOT} .aca-src-btn:hover { color: var(--hi); }
      #${ROOT} .aca-src-btn.is-on { background: var(--gold-soft); color: var(--gold-hi); box-shadow: inset 0 0 0 1px var(--gold-line); }
      #${ROOT} .aca-src-note { font-size: 10.5px; color: var(--txt); }
      #${ROOT} .aca-src-note.is-err { color: var(--red); font-weight: 700; }
      #${ROOT} .aca-icon-btn {
        width: 28px; height: 28px;
        display: inline-grid; place-items: center;
        border-radius: 8px; border: 1px solid var(--line-soft);
        background: transparent; color: var(--txt); cursor: pointer;
        transition: color 0.15s, border-color 0.15s, background 0.15s;
      }
      #${ROOT} .aca-icon-btn svg { fill: currentColor; }
      #${ROOT} .aca-icon-btn:hover { color: var(--gold-hi); border-color: var(--gold-line); background: var(--gold-soft); }
      #${ROOT} .aca-icon-btn.is-spinning svg { animation: aca-spin 0.8s linear infinite; }

      /* list */
      #${ROOT} .aca-scroll { overflow-y: auto; overscroll-behavior: contain; padding: 6px 10px 8px; }
      #${ROOT} .aca-scroll::-webkit-scrollbar { width: 8px; }
      #${ROOT} .aca-scroll::-webkit-scrollbar-thumb { background: var(--line); border-radius: 8px; }
      #${ROOT} .aca-scroll::-webkit-scrollbar-track { background: transparent; }
      #${ROOT} .aca-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 0 18px; }

      #${ROOT} .aca-row {
        position: relative;
        display: flex; align-items: center; gap: 10px;
        min-height: 50px; padding: 4px 6px 4px 10px;
        border-bottom: 1px solid var(--line-soft);
        border-radius: 8px;
        transition: background 0.12s;
      }
      #${ROOT} .aca-row:hover { background: var(--gold-faint); }
      #${ROOT} .aca-row::before {
        content: ""; position: absolute; left: 2px; top: 10px; bottom: 10px;
        width: 3px; border-radius: 3px; background: transparent;
      }
      #${ROOT} .aca-row.is-ready::before { background: var(--gold); }
      #${ROOT} .aca-row.is-behind::before { background: var(--red); }
      #${ROOT} .aca-row.is-soon::before { background: var(--dusk); }
      #${ROOT} .aca-thumb {
        flex-shrink: 0; width: 30px; height: 42px; border-radius: 5px; overflow: hidden;
        background: var(--sunken);
      }
      #${ROOT} .aca-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
      /* "Watched" / "Not yet watched": on the cover in the cards layout, a small chip in the other layouts */
      #${ROOT} .aca-seen {
        display: inline-flex; align-items: center; gap: 3px;
        padding: 2px 6px; border-radius: 999px;
        font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; line-height: 1.3;
        white-space: nowrap;
        background: rgba(11, 22, 34, 0.86); color: var(--txt);
        box-shadow: inset 0 0 0 1px var(--line);
      }
      #${ROOT} .aca-seen.is-yes { color: var(--green); box-shadow: inset 0 0 0 1px rgba(123, 200, 116, 0.55); }
      #${ROOT} .aca-seen.is-no { color: #ff8fa3; box-shadow: inset 0 0 0 1px rgba(232, 93, 117, 0.6); }
      #${ROOT} .aca-seen.is-wait { color: var(--txt); }
      #${ROOT} .aca-thumb .aca-seen { display: none; }
      #${ROOT}[data-layout="cards"] .aca-thumb { position: relative; }
      #${ROOT}[data-layout="cards"] .aca-thumb .aca-seen {
        display: inline-flex; position: absolute; left: 5px; top: 5px; max-width: calc(100% - 10px);
        box-shadow: inset 0 0 0 1px var(--line), 0 2px 6px rgba(0, 0, 0, 0.45);
      }
      #${ROOT}[data-layout="cards"] .aca-thumb .aca-seen.is-yes { box-shadow: inset 0 0 0 1px rgba(123, 200, 116, 0.55), 0 2px 6px rgba(0, 0, 0, 0.45); }
      #${ROOT}[data-layout="cards"] .aca-thumb .aca-seen.is-no { box-shadow: inset 0 0 0 1px rgba(232, 93, 117, 0.6), 0 2px 6px rgba(0, 0, 0, 0.45); }
      #${ROOT} .aca-side .aca-thumb .aca-seen { display: none; }
      #${ROOT} .aca-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
      #${ROOT} .aca-name {
        color: var(--hi); font-size: 12.5px; font-weight: 700; line-height: 1.25;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #${ROOT} .aca-name:hover { color: var(--gold-hi); }
      #${ROOT} .aca-sub { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; font-size: 11px; color: var(--txt); line-height: 1.2; }
      #${ROOT} .aca-ep { color: var(--gold-hi); font-weight: 800; }
      #${ROOT} .aca-sep { opacity: 0.45; }
      #${ROOT} .aca-muted { opacity: 0.7; }
      #${ROOT} .aca-count { color: var(--hi); font-weight: 700; }
      #${ROOT} .aca-count.is-past { color: var(--txt); font-weight: 600; }
      #${ROOT} .aca-count-wrap { display: inline-flex; align-items: center; gap: 4px; }
      #${ROOT} .aca-ac {
        display: inline-block;
        padding: 0 4px; border-radius: 4px;
        font-size: 8.5px; font-weight: 900; letter-spacing: 0.04em; line-height: 13px;
        color: var(--ember); background: rgba(232, 116, 63, 0.14);
        border: 1px solid rgba(232, 116, 63, 0.4);
        vertical-align: middle;
      }
      #${ROOT} a.aca-ac:hover { background: var(--ember); color: var(--bg); }

      #${ROOT} .aca-right { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
      #${ROOT} .aca-prog { font-size: 11.5px; font-weight: 700; color: var(--hi); font-variant-numeric: tabular-nums; }
      #${ROOT} .aca-prog small { font-size: 10px; font-weight: 600; color: var(--txt); }
      #${ROOT} .aca-chip {
        padding: 2px 7px; border-radius: 999px;
        font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1.2;
      }
      #${ROOT} .aca-chip.ready { background: var(--gold-soft); color: var(--gold-hi); }
      #${ROOT} .aca-chip.behind { background: var(--red-soft); color: var(--red); }
      #${ROOT} .aca-plus {
        height: 22px; padding: 0 8px;
        border-radius: 6px; border: 1px solid var(--line);
        background: transparent; color: var(--txt);
        font-size: 11px; font-weight: 800; cursor: pointer; line-height: 1;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      #${ROOT} .aca-row.is-ready .aca-plus, #${ROOT} .aca-row.is-behind .aca-plus { border-color: var(--gold-line); background: var(--gold-soft); color: var(--gold-hi); }
      #${ROOT} .aca-plus:hover { background: var(--gold); border-color: var(--gold); color: var(--bg); }
      #${ROOT} .aca-plus:disabled { opacity: 0.6; cursor: progress; }
      #${ROOT} .aca-dots {
        width: 22px; height: 22px;
        display: inline-flex; align-items: center; justify-content: center;
        padding: 0; border: 0; border-radius: 6px; cursor: pointer;
        background: transparent; color: var(--txt); opacity: 0;
        transition: opacity 0.15s, background 0.15s, color 0.15s;
      }
      #${ROOT} .aca-dots svg { fill: currentColor; }
      #${ROOT} .aca-row:hover .aca-dots, #${ROOT} .aca-dots:focus-visible { opacity: 0.8; }
      #${ROOT} .aca-dots:hover { background: var(--gold); color: var(--bg); opacity: 1; }

      /* week tab: day headers across both columns */
      #${ROOT} .aca-day-head {
        grid-column: 1 / -1;
        position: sticky; top: 0; z-index: 2;
        display: flex; align-items: baseline; gap: 8px;
        padding: 8px 4px 4px; margin-top: 2px;
        background: var(--surface);
      }
      #${ROOT} .aca-day-name { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--hi); }
      #${ROOT} .aca-day-head.is-next .aca-day-name { color: var(--gold-hi); }
      #${ROOT} .aca-day-date { font-size: 10.5px; color: var(--txt); }
      #${ROOT} .aca-day-count { margin-left: auto; font-size: 10.5px; color: var(--txt); }

      #${ROOT} .aca-empty { margin: 6px 4px; border: 1px dashed var(--line); border-radius: 10px; padding: 14px; font-size: 12px; line-height: 1.5; color: var(--txt); }
      #${ROOT} .aca-empty b { color: var(--hi); }
      #${ROOT} .aca-loading { display: flex; align-items: center; gap: 10px; padding: 14px 16px; font-size: 13px; font-weight: 700; color: var(--hi); }
      #${ROOT} .aca-err { padding: 12px 16px; }
      #${ROOT} .aca-err .aca-btn {
        margin-top: 10px; padding: 5px 12px; border-radius: 999px;
        border: 1px solid var(--line); background: transparent; color: var(--txt);
        font-size: 11.5px; font-weight: 700; cursor: pointer;
      }
      .aca-spin {
        display: inline-block; width: 14px; height: 14px; flex-shrink: 0;
        border-radius: 50%;
        border: 2px solid rgba(159, 173, 189, 0.2);
        border-top-color: #f2b544;
        animation: aca-spin 0.8s linear infinite;
      }
      @keyframes aca-spin { to { transform: rotate(360deg); } }
      @keyframes aca-fade { from { opacity: 0; } }
      @keyframes aca-pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } }


      /* layout: cards (small cover cards) */
      #${ROOT}[data-layout="cards"] .aca-list { grid-template-columns: repeat(auto-fill, minmax(126px, 1fr)); gap: 8px; }
      #${ROOT}[data-layout="cards"] .aca-row {
        flex-direction: column; align-items: stretch; gap: 6px;
        padding: 7px 7px 6px; border: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft);
        background: var(--sunken); border-radius: 10px;
      }
      #${ROOT}[data-layout="cards"] .aca-row::before { left: 0; top: 0; bottom: auto; right: 0; width: auto; height: 3px; border-radius: 10px 10px 0 0; }
      #${ROOT}[data-layout="cards"] .aca-row:hover { border-color: var(--gold-line); }
      /* the whole cover (AniList's 230 px "large" picture) in a 2:3 portrait box, never cropped or stretched */
      #${ROOT}[data-layout="cards"] .aca-thumb { width: 100%; height: auto; aspect-ratio: 2 / 3; border-radius: 7px; }
      #${ROOT}[data-layout="cards"] .aca-thumb img { object-fit: cover; }
      #${ROOT}[data-layout="cards"] .aca-sub { font-size: 10.5px; }
      #${ROOT}[data-layout="cards"] .aca-right { justify-content: space-between; }
      #${ROOT}[data-layout="cards"] .aca-chip { margin-right: auto; }
      #${ROOT}[data-layout="cards"] .aca-day-head { position: static; }

      /* layout: list (thin text lines, no covers) */
      #${ROOT}[data-layout="list"] .aca-list { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0 16px; }
      #${ROOT}[data-layout="list"] .aca-thumb { display: none; }
      #${ROOT}[data-layout="list"] .aca-row { min-height: 34px; padding: 3px 4px 3px 10px; gap: 8px; }
      #${ROOT}[data-layout="list"] .aca-row::before { top: 8px; bottom: 8px; }
      #${ROOT}[data-layout="list"] .aca-main { flex-direction: row; align-items: baseline; gap: 7px; }
      #${ROOT}[data-layout="list"] .aca-name { flex: 1 1 40%; font-size: 12px; }
      #${ROOT}[data-layout="list"] .aca-sub { flex: 0 0 auto; flex-wrap: nowrap; white-space: nowrap; }

      /* "Coming up" as a column on the right */
      #${ROOT} .aca-body { display: grid; grid-template-columns: minmax(0, 1fr) 270px; }
      #${ROOT} .aca-side { min-width: 0; border-left: 1px solid var(--line-soft); }
      #${ROOT} .aca-side .aca-list { grid-template-columns: minmax(0, 1fr); }
      #${ROOT} .aca-side .aca-row { min-height: 40px; gap: 8px; padding-left: 8px; }
      #${ROOT} .aca-side .aca-thumb { width: 24px; height: 34px; }
      #${ROOT} .aca-side .aca-name { font-size: 11.5px; }
      #${ROOT} .aca-side .aca-sub { font-size: 10.5px; }
      #${ROOT} .aca-side .aca-plus { display: none; }
      #${ROOT} .aca-side .aca-day-head { padding-top: 4px; }
      #${ROOT} .aca-side-title {
        display: flex; align-items: center; gap: 8px; padding: 9px 12px 2px;
        font-size: 10.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--hi);
      }
      #${ROOT} .aca-side-title i { flex: 1; height: 1px; background: var(--line-soft); }
      #${ROOT}.has-side .aca-main-col .aca-list { grid-template-columns: minmax(0, 1fr); }
      @media (max-width: 1000px) {
        #${ROOT} .aca-body { grid-template-columns: minmax(0, 1fr); }
        #${ROOT} .aca-side { border-left: 0; border-top: 1px solid var(--line-soft); }
      }

      @media (max-width: 760px) {
        #${ROOT} .aca-list { grid-template-columns: minmax(0, 1fr); }
        #${ROOT} .aca-tabs { margin: 0; order: 3; width: 100%; justify-content: space-between; }
        #${ROOT} .aca-tab { flex: 1; justify-content: center; padding-left: 6px; padding-right: 6px; }
      }

      /* editor */
      #${EDITOR_ID} {
        position: fixed; inset: 0; z-index: 100000;
        display: flex; align-items: center; justify-content: center; padding: 12px;
        background: rgba(6, 10, 18, 0.62);
        backdrop-filter: blur(3px);
        font-family: Overpass, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        animation: aca-fade 0.15s ease;
      }
      #${EDITOR_ID} * { box-sizing: border-box; }
      #${EDITOR_ID} .aca-ed {
        width: min(440px, 100%); max-height: calc(100vh - 24px); overflow: auto;
        border-radius: 16px;
        background: rgb(var(--color-foreground, 21, 31, 46));
        color: rgb(var(--color-text-bright, 237, 241, 245));
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
        animation: aca-pop 0.18s ease;
      }
      #${EDITOR_ID} .aca-ed-banner {
        position: relative; overflow: hidden;
        display: flex; align-items: flex-end; gap: 14px;
        min-height: 116px; padding: 18px 18px 14px;
      }
      #${EDITOR_ID} .aca-ed-bg {
        position: absolute; inset: -24px;
        width: calc(100% + 48px); height: calc(100% + 48px);
        object-fit: cover;
        filter: blur(18px) brightness(0.42) saturate(1.25);
      }
      #${EDITOR_ID} .aca-ed-cover {
        position: relative; width: 64px; height: 90px; flex-shrink: 0;
        border-radius: 8px; object-fit: cover;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
      }
      #${EDITOR_ID} .aca-ed-heading { position: relative; min-width: 0; }
      #${EDITOR_ID} .aca-ed-title { margin: 0; color: #fff; font-size: 16px; font-weight: 800; line-height: 1.25; }
      #${EDITOR_ID} .aca-ed-sub { margin: 5px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.85); }
      #${EDITOR_ID} .aca-ed-x {
        position: absolute; top: 10px; right: 10px;
        width: 28px; height: 28px; border: 0; border-radius: 8px;
        background: rgba(0, 0, 0, 0.35); color: #fff; font-size: 16px; cursor: pointer;
      }
      #${EDITOR_ID} .aca-ed-body { padding: 14px 18px 18px; }
      #${EDITOR_ID} .aca-ed-loading { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 13px; font-weight: 700; }
      #${EDITOR_ID} .aca-ed-label {
        display: block; margin: 12px 0 6px;
        font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
        color: rgb(var(--color-text, 159, 173, 189));
      }
      #${EDITOR_ID} .aca-ed-label:first-child { margin-top: 0; }
      #${EDITOR_ID} .aca-ed-status { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      #${EDITOR_ID} .aca-ed-chip {
        padding: 8px 6px; border: 0; border-radius: 8px; cursor: pointer;
        background: rgb(var(--color-foreground-grey, 31, 38, 49));
        color: rgb(var(--color-text-bright, 237, 241, 245));
        font: inherit; font-size: 12px; font-weight: 700;
        transition: background 0.15s, color 0.15s;
      }
      #${EDITOR_ID} .aca-ed-chip:hover { background: rgba(242, 181, 68, 0.25); }
      #${EDITOR_ID} .aca-ed-chip.is-on { background: #f2b544; color: #2a1d0b; }
      #${EDITOR_ID} .aca-ed-row { display: grid; grid-template-columns: 1.5fr 1fr; gap: 12px; }
      #${EDITOR_ID} .aca-ed-progress { display: flex; align-items: center; gap: 6px; }
      #${EDITOR_ID} input[type="number"] {
        width: 100%; min-width: 0; height: 36px;
        padding: 0 10px; border: 0; border-radius: 8px;
        background: rgb(var(--color-foreground-grey, 31, 38, 49));
        color: rgb(var(--color-text-bright, 237, 241, 245));
        font: inherit; font-size: 14px; font-weight: 700; text-align: center;
      }
      #${EDITOR_ID} input[type="number"]:focus { outline: 2px solid rgba(242, 181, 68, 0.6); }
      #${EDITOR_ID} .aca-ed-step {
        width: 36px; height: 36px; flex-shrink: 0;
        border: 0; border-radius: 8px; cursor: pointer;
        background: rgb(var(--color-foreground-grey, 31, 38, 49));
        color: rgb(var(--color-text-bright, 237, 241, 245));
        font-size: 18px; font-weight: 800;
      }
      #${EDITOR_ID} .aca-ed-step:hover { background: rgba(242, 181, 68, 0.3); }
      #${EDITOR_ID} .aca-ed-of { font-size: 12px; white-space: nowrap; }
      #${EDITOR_ID} .aca-ed-msg { margin: 10px 0 0; font-size: 12px; color: #e85d75; }
      #${EDITOR_ID} .aca-ed-msg:empty { display: none; }
      #${EDITOR_ID} .aca-ed-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
      #${EDITOR_ID} .aca-ed-actions button { border: 0; border-radius: 8px; padding: 9px 14px; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
      #${EDITOR_ID} .aca-ed-cancel { background: rgb(var(--color-foreground-grey, 31, 38, 49)); color: rgb(var(--color-text-bright, 237, 241, 245)); }
      #${EDITOR_ID} .aca-ed-save { min-width: 86px; background: #f2b544; color: #2a1d0b; }
      #${EDITOR_ID} .aca-ed-save:disabled { opacity: 0.65; cursor: progress; }

      /* toasts */
      #${TOAST_ID} {
        position: fixed; right: 16px; bottom: 16px; z-index: 100001;
        display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
        pointer-events: none;
        font-family: Overpass, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #${TOAST_ID} .aca-toast {
        max-width: 360px; padding: 10px 14px; border-radius: 10px;
        background: rgb(var(--color-foreground, 21, 31, 46));
        color: rgb(var(--color-text-bright, 237, 241, 245));
        font-size: 12.5px; font-weight: 600; line-height: 1.4;
        border-left: 3px solid #f2b544;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        opacity: 0; transform: translateY(8px);
        transition: opacity 0.2s, transform 0.2s;
      }
      #${TOAST_ID} .aca-toast.is-in { opacity: 1; transform: none; }
      #${TOAST_ID} .aca-toast.ok { border-left-color: #f2b544; }
      #${TOAST_ID} .aca-toast.err { border-left-color: #e85d75; }
    `;
    document.head.appendChild(el("style", { id: STYLE_ID, text: css }));
  }

  /* ---------- render ---------- */

  function dotsButton(item) {
    return el("button", {
      class: "aca-dots",
      type: "button",
      title: "Edit list entry",
      "aria-label": "Edit " + item.title,
      html: ICONS.dots,
      onmousedown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      onclick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        openListEditor(item);
      },
    });
  }

  function plusButton(item) {
    return el("button", {
      class: "aca-plus",
      type: "button",
      title: "Mark EP " + ((item.progress || 0) + 1) + " watched",
      text: "+1",
      onclick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        quickPlusOne(item, e.currentTarget);
      },
    });
  }

  function formatDateShort(date) {
    return fmt("short", { weekday: "short", day: "numeric", month: "short" }).format(date);
  }

  // "4/13" (+ a tooltip with the aired count); "4" when the episode count is unknown.
  function progressNode(item) {
    const watched = item.progress || 0;
    const aired = airedCount(item);
    const tip =
      watched + " watched" + (item.episodes ? " of " + item.episodes : "") + (aired != null ? " · " + aired + " aired" : "");
    return el("span", { class: "aca-prog", title: tip }, [
      String(watched),
      item.episodes ? el("small", { text: "/" + item.episodes }) : null,
    ]);
  }

  // "Watched" / "Not yet watched" for the episode this card is about: today's episode (Today), that day's
  // episode (Week), the newest aired episode (Catch up / All; the next one when nothing has aired yet).
  function seenNode(item, mode, now, air) {
    let ep = null;
    let at = 0;
    if (mode === "today") {
      const e = todayEpisode(item);
      ep = e.episode;
      at = e.airingAt;
    } else if (mode === "week") {
      ep = air.episode;
      at = air.airingAt;
    } else {
      const aired = airedCount(item);
      if (aired != null && aired >= 1) ep = aired;
      else {
        const up = upcomingOf(item);
        if (!up) return null;
        ep = up.episode;
        at = up.airingAt;
      }
    }
    if (ep == null) return null;
    const watched = (item.progress || 0) >= ep;
    const airedYet = at * 1000 <= now;
    const cls = watched ? "is-yes" : airedYet ? "is-no" : "is-wait";
    const tip = "EP " + ep + (watched ? " · watched" : airedYet ? " has aired · not watched yet" : " has not aired yet");
    return el("span", { class: "aca-seen " + cls, title: tip, text: watched ? "✓ Watched" : "Not yet watched" });
  }

  // One list row. mode: today | behind | week | all. air: the airing this row is about (week tab).
  function row(item, mode, now, allowEdit, air) {
    const st = cardState(item, now);
    const progress = item.progress || 0;
    const sub = [];
    let at = null;
    let ac = "";

    if (mode === "today") {
      const ep = todayEpisode(item);
      sub.push(span("aca-ep", "EP " + ep.episode), sep(), span("", formatTime(ep.airingAt)));
      at = ep.airingAt;
      ac = ep.ac;
    } else if (mode === "behind") {
      sub.push(span("aca-ep", "EP " + (progress + 1) + " next"));
      const up = upcomingOf(item);
      if (up) sub.push(sep(), span("", "EP " + up.episode + " " + relDay(up.airingAt) + " " + formatTime(up.airingAt)));
      else if (item.status === "FINISHED") sub.push(sep(), span("aca-muted", "finished airing"));
    } else if (mode === "week") {
      sub.push(span("aca-ep", "EP " + air.episode), sep(), span("", formatTime(air.airingAt)));
      at = air.airingAt;
      ac = air.ac || "";
    } else {
      const up = upcomingOf(item);
      if (up) {
        sub.push(span("aca-ep", "EP " + up.episode), sep(), span("", relDay(up.airingAt) + " " + formatTime(up.airingAt)));
        at = up.airingAt;
        ac = up.ac || "";
      } else {
        sub.push(span("aca-muted", item.status === "FINISHED" ? "Finished airing" : "No air date yet"));
      }
    }
    if (at) sub.push(sep(), countNode(at, now, ac));

    // READY / N BEHIND only on your own board; on someone else's the progress number is enough.
    const chip = allowEdit !== "other" && (st.tag === "ready" || st.tag === "behind") ? span("aca-chip " + st.tag, st.text) : null;
    const canPlus = allowEdit === true && (!item.episodes || progress < item.episodes);
    const onCover = CONFIG.layout === "cards";
    const seen = seenNode(item, mode, now, air);

    return el("div", { class: "aca-row " + st.cls }, [
      el("a", { class: "aca-thumb", href: item.url, title: item.title }, [
        el("img", {
          // cards show the big cover (sharp at card size); rows and the week column use the small one
          src: (CONFIG.layout === "cards" && mode !== "side" ? item.bigCover : item.cover) || item.cover,
          alt: "",
          loading: "lazy",
          decoding: "async",
        }),
        onCover ? seen : null,
      ]),
      el("div", { class: "aca-main" }, [
        el("a", { class: "aca-name", href: item.url, title: item.title, text: item.title }),
        el("div", { class: "aca-sub" }, sub),
      ]),
      el("div", { class: "aca-right" }, [
        onCover ? null : seen,
        progressNode(item),
        chip,
        canPlus ? plusButton(item) : null,
        allowEdit === true ? dotsButton(item) : null,
      ]),
    ]);
  }

  function weekList(model, allowEdit) {
    const nodes = [];
    for (const day of model.week) {
      if (!day.rows.length) continue;
      const name = day.offset === 1 ? "Tomorrow" : formatWeekday(day.date);
      nodes.push(
        el("div", { class: "aca-day-head" + (day.offset === 1 ? " is-next" : "") }, [
          span("aca-day-name", name),
          span("aca-day-date", formatMonthDay(day.date)),
          span("aca-day-count", day.rows.length + (day.rows.length === 1 ? " episode" : " episodes")),
        ])
      );
      for (const r of day.rows) nodes.push(row(r.item, "week", model.now, allowEdit, r.air));
    }
    return nodes;
  }

  function emptyFor(tab, model, whose) {
    const list = whose ? whose + "'s Watching list" : "your Watching list";
    if (tab === "today") {
      const box = el("div", { class: "aca-empty" }, ["Nothing on " + list + " airs today."]);
      if (model.nextUp) {
        box.append(
          " Next up: ",
          el("b", { text: model.nextUp.item.title }),
          " EP " + model.nextUp.up.episode + ", " + relDay(model.nextUp.up.airingAt) + " " + formatTime(model.nextUp.up.airingAt) + "."
        );
      }
      return box;
    }
    if (tab === "behind") return el("div", { class: "aca-empty", text: "You're caught up on everything that has aired." });
    if (tab === "week") return el("div", { class: "aca-empty", text: "Nothing on " + list + " airs in the next 6 days." });
    return el("div", { class: "aca-empty", text: (whose ? whose + "'s" : "Your") + " Watching list is empty." });
  }

  function render(root, model, username, kind, allowEdit) {
    const other = kind === "other";
    const whose = other ? username : "";
    const side = !!CONFIG.weekColumn && !other;
    // Someone else's profile: what they watch today / this week; their catch-up is not our business.
    const tabKeys = other ? ["today", "week", "all"] : side ? ["today", "behind", "all"] : ["today", "behind", "week", "all"];
    let tab = readLS(other ? TAB_KEY + "-other" : TAB_KEY) || "today";
    if (!tabKeys.includes(tab)) tab = "today";
    root.classList.toggle("is-other", other);
    root.dataset.layout = CONFIG.layout === "cards" || CONFIG.layout === "list" ? CONFIG.layout : "rows";
    root.classList.toggle("has-side", side);

    const refreshBtn = el("button", {
      class: "aca-icon-btn",
      type: "button",
      title: "Refresh from AniList",
      "aria-label": "Refresh",
      html: ICONS.refresh,
      onclick: () => {
        refreshBtn.classList.add("is-spinning");
        clearCache(username);
        if (getSource() === "animecountdown") {
          simklMap = null;
          try {
            sessionStorage.removeItem(SIMKL_CACHE_KEY);
          } catch {
            /* ignore */
          }
        }
        lastPath = "";
        route();
      },
    });

    const tabs = [
      ["today", "Today", model.todayItems.length, model.todayItems.length ? "has-today" : ""],
      ["behind", "Catch up", model.behindItems.length, model.behindItems.length ? "has-behind" : ""],
      ["week", "Week", model.weekCount, ""],
      ["all", "All", model.items.length, ""],
    ].filter(([key]) => tabKeys.includes(key));

    const head = el("div", { class: "aca-head" }, [
      el("div", { class: "aca-brand" }, [
        el("div", { class: "aca-logo", html: ICONS.wolf }),
        el("div", { class: "aca-brand-text" }, [
          el("h2", { class: "aca-title", text: other ? username + " is watching" : "Anime Tracker" }),
          el("div", { class: "aca-date" }, [
            el("b", { text: formatDateShort(model.today) }),
            tzLabel() ? " · " + tzLabel() : "",
            el("span", {
              "data-fetched": String(model.fetchedAt),
              title: "When the list was last read from AniList",
              text: " · updated " + agoText(model.now - model.fetchedAt),
            }),
          ]),
        ]),
      ]),
      el(
        "div",
        { class: "aca-tabs", role: "tablist" },
        tabs.map(([key, label, n, extra]) =>
          el("button", {
            class: "aca-tab " + extra + (key === tab ? " is-on" : ""),
            type: "button",
            role: "tab",
            "aria-selected": key === tab ? "true" : "false",
            title:
              key === "today"
                ? "Episodes airing today"
                : key === "behind"
                ? "Shows with aired episodes you haven't watched"
                : key === "week"
                ? "Tomorrow to +6 days"
                : "Everything on " + (other ? username + "'s" : "your") + " Watching list",
            onclick: () => {
              writeLS(other ? TAB_KEY + "-other" : TAB_KEY, key);
              renderNow(root);
            },
          }, [label, el("span", { class: "n", text: String(n) })])
        )
      ),
      el("div", { class: "aca-tools" }, [sourceSwitch(model), refreshBtn]),
    ]);

    const edit = other ? "other" : allowEdit; // "other" = read-only board without the catch-up chips
    let nodes;
    if (tab === "week") nodes = weekList(model, edit);
    else {
      const list = tab === "today" ? model.todayItems : tab === "behind" ? model.behindItems : model.allItems;
      nodes = list.map((item) => row(item, tab, model.now, edit));
    }
    const board = nodes.length
      ? el("div", { class: "aca-scroll", style: { maxHeight: CONFIG.boardHeight + "px" } }, [el("div", { class: "aca-list" }, nodes)])
      : emptyFor(tab, model, whose);

    let body = board;
    if (side) {
      const weekNodes = weekList(model, edit);
      body = el("div", { class: "aca-body" }, [
        el("div", { class: "aca-main-col" }, [board]),
        el("div", { class: "aca-side" }, [
          el("div", { class: "aca-side-title" }, [span("", "Coming up"), el("i")]),
          weekNodes.length
            ? el("div", { class: "aca-scroll", style: { maxHeight: CONFIG.boardHeight + "px" } }, [el("div", { class: "aca-list" }, weekNodes)])
            : emptyFor("week", model, whose),
        ]),
      ]);
    }
    root.replaceChildren(el("div", { class: "aca-panel" }, [head, body]));
  }

  function sourceSwitch(model) {
    const source = getSource();
    let note = "";
    let noteCls = "aca-src-note";
    let acTitle = "Air times from animecountdown.com (Simkl calendar)";
    if (source === "animecountdown") {
      if (simklState === "loading") note = "…";
      else if (simklState === "error") {
        note = "unavailable";
        noteCls += " is-err";
      } else if (simklMap) acTitle += " · " + model.acMatched + " of " + model.items.length + " shows matched, the rest keep AniList's time";
    }
    return el("div", { class: "aca-src" }, [
      span("aca-src-label", "Times"),
      el(
        "div",
        { class: "aca-src-group", role: "group", "aria-label": "Countdown source" },
        [
          ["anilist", "AniList", "Air times from AniList"],
          ["animecountdown", "AC", acTitle],
        ].map(([key, label, title]) =>
          el("button", {
            type: "button",
            class: "aca-src-btn" + (key === source ? " is-on" : ""),
            "aria-pressed": key === source ? "true" : "false",
            title,
            text: label,
            onclick: () => setSource(key),
          })
        )
      ),
      note ? el("span", { class: noteCls, title: simklState === "error" ? simklError + " (using AniList times)" : "", text: note }) : null,
    ]);
  }

  function setSource(key) {
    writeLS(SOURCE_KEY, key);
    if (key === "animecountdown") ensureAnimeCountdown(false, false);
    renderNow();
  }

  // Load (or reload) the AnimeCountdown calendar and re-render when it lands.
  function ensureAnimeCountdown(force, quiet) {
    if (getSource() !== "animecountdown") return Promise.resolve(null);
    return loadSimkl(force)
      .then((map) => {
        renderNow();
        return map;
      })
      .catch((err) => {
        renderNow();
        if (!quiet) toast("AnimeCountdown times unavailable (" + err.message + "). Showing AniList times.", "err");
        return null;
      });
  }

  function renderNow(root) {
    root = root || document.getElementById(ROOT);
    if (!root || !lastPayload) return;
    const simkl = getSource() === "animecountdown" && simklState !== "error" ? simklMap : null;
    render(root, buildModel(lastPayload, simkl), lastUsername, lastKind, lastAllowEdit);
  }

  function renderError(root, err, onRetry) {
    root.replaceChildren(
      el("div", { class: "aca-panel" }, [
        el("div", { class: "aca-err" }, [
          el("div", { class: "aca-empty", text: "Could not load airing data: " + err.message }),
          el("button", { class: "aca-btn", type: "button", text: "Retry", onclick: onRetry }),
        ]),
      ])
    );
  }

  /* ---------- editing ---------- */

  function refreshAfterEdit() {
    if (!lastUsername) return;
    clearCache(lastUsername);
    // Show the saved values immediately, then refetch in the background.
    renderNow();
    lastPath = "";
    route();
  }

  async function quickPlusOne(item, btn) {
    if (busy.has(item.id)) return;
    busy.add(item.id);
    btn.disabled = true;
    btn.textContent = "…";
    try {
      // Read the live entry first so an old tab can never write stale progress back.
      const fresh = await fetchEntry(item.id);
      if (!fresh.entry) throw new Error("it's no longer on your list");
      const total = fresh.episodes || item.episodes || null;
      const next = (fresh.entry.progress || 0) + 1;
      if (total && next > total) {
        toast(item.title + " is already at " + total + "/" + total + ".", "");
        refreshAfterEdit();
        return;
      }
      const changes = { progress: next };
      if (total && next === total && fresh.entry.status === "CURRENT") changes.status = "COMPLETED";
      const saved = await saveEntry(item, changes);
      toast(savedText(item, saved, total), "ok");
      refreshAfterEdit();
    } catch (err) {
      console.warn(PREFIX, "save failed", err);
      toast("Not saved: " + item.title + " (" + err.message + ")", "err");
      if (btn.isConnected) {
        btn.disabled = false;
        btn.textContent = "+1";
      }
    } finally {
      busy.delete(item.id);
    }
  }

  function closeEditor() {
    const existing = document.getElementById(EDITOR_ID);
    if (existing) existing.remove();
  }

  async function openListEditor(item) {
    closeEditor();

    const sub = el("p", { class: "aca-ed-sub", text: "Loading your entry from AniList…" });
    const body = el("div", { class: "aca-ed-body" }, [
      el("div", { class: "aca-ed-loading" }, [el("span", { class: "aca-spin" }), span("", "Reading live entry…")]),
    ]);
    const overlay = el("div", { id: EDITOR_ID, role: "dialog", "aria-modal": "true", "aria-label": "Edit " + item.title });
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) closeEditor();
    });
    overlay.appendChild(
      el("div", { class: "aca-ed" }, [
        el("div", { class: "aca-ed-banner" }, [
          el("img", { class: "aca-ed-bg", src: item.bigCover || item.cover, alt: "" }),
          el("img", { class: "aca-ed-cover", src: item.bigCover || item.cover, alt: "" }),
          el("div", { class: "aca-ed-heading" }, [el("h3", { class: "aca-ed-title", text: item.title }), sub]),
          el("button", { class: "aca-ed-x", type: "button", "aria-label": "Close", text: "✕", onclick: closeEditor }),
        ]),
        body,
      ])
    );
    document.body.appendChild(overlay);

    let fresh;
    let viewer;
    try {
      [fresh, viewer] = await Promise.all([fetchEntry(item.id), getViewer()]);
    } catch (err) {
      if (!overlay.isConnected) return;
      sub.textContent = "Couldn't reach AniList";
      body.replaceChildren(
        el("p", { class: "aca-ed-msg", text: "Couldn't load your entry: " + err.message }),
        el("div", { class: "aca-ed-actions" }, [el("button", { class: "aca-ed-cancel", type: "button", text: "Close", onclick: closeEditor })])
      );
      return;
    }
    if (!overlay.isConnected) return;

    const entry = fresh.entry;
    const total = fresh.episodes || item.episodes || null;
    const spec = scoreSpec(viewer && viewer.mediaListOptions && viewer.mediaListOptions.scoreFormat);
    const orig = {
      status: entry ? entry.status : null,
      progress: entry ? entry.progress || 0 : 0,
      score: entry ? entry.score || 0 : 0,
    };
    let status = orig.status || "CURRENT";

    sub.textContent = entry
      ? statusLabel(orig.status) + " · " + orig.progress + (total ? " / " + total : "") + " watched · live from AniList"
      : "Not on your list yet";

    const chips = el(
      "div",
      { class: "aca-ed-status" },
      STATUSES.map(([value, label]) =>
        el("button", {
          type: "button",
          class: "aca-ed-chip" + (value === status ? " is-on" : ""),
          "data-v": value,
          text: label,
          onclick: () => {
            status = value;
            chips.querySelectorAll(".aca-ed-chip").forEach((c) => c.classList.toggle("is-on", c.dataset.v === value));
          },
        })
      )
    );

    const maxProg = total || 100000;
    const progInput = el("input", { type: "number", min: "0", max: String(maxProg), step: "1", value: String(orig.progress) });
    const scoreInput = el("input", { type: "number", min: "0", max: String(spec.max), step: String(spec.step), value: String(orig.score) });
    const bump = (delta) => {
      progInput.value = String(clampNum(Math.round((Number(progInput.value) || 0) + delta), 0, maxProg));
    };
    const msg = el("p", { class: "aca-ed-msg" });

    const doSave = async () => {
      msg.textContent = "";
      const progress = Math.round(clampNum(progInput.value, 0, maxProg));
      const score = clampNum(scoreInput.value, 0, spec.max);
      const changes = {};
      if (status !== orig.status) changes.status = status;
      if (progress !== orig.progress) changes.progress = progress;
      if (Math.abs(score - orig.score) > 1e-6) changes.score = score;
      if (!Object.keys(changes).length) {
        closeEditor();
        return;
      }
      if (changes.progress != null && total && changes.progress === total && status === "CURRENT") changes.status = "COMPLETED";

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
      try {
        const saved = await saveEntry(item, changes);
        closeEditor();
        toast(savedText(item, saved, total), "ok");
        refreshAfterEdit();
      } catch (err) {
        console.warn(PREFIX, "save failed", err);
        msg.textContent = "Not saved: " + err.message;
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
    };

    const onEnter = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSave();
      }
    };
    progInput.addEventListener("keydown", onEnter);
    scoreInput.addEventListener("keydown", onEnter);

    const saveBtn = el("button", { class: "aca-ed-save", type: "button", text: "Save", onclick: doSave });

    body.replaceChildren(
      el("span", { class: "aca-ed-label", text: "Status" }),
      chips,
      el("div", { class: "aca-ed-row" }, [
        el("div", null, [
          el("span", { class: "aca-ed-label", text: "Episodes watched" }),
          el("div", { class: "aca-ed-progress" }, [
            el("button", { class: "aca-ed-step", type: "button", text: "−", "aria-label": "One less", onclick: () => bump(-1) }),
            progInput,
            el("button", { class: "aca-ed-step", type: "button", text: "+", "aria-label": "One more", onclick: () => bump(1) }),
            total ? span("aca-ed-of", "of " + total) : null,
          ]),
        ]),
        el("div", null, [el("span", { class: "aca-ed-label", text: "Score (" + spec.label + ")" }), scoreInput]),
      ]),
      msg,
      el("div", { class: "aca-ed-actions" }, [
        el("button", { class: "aca-ed-cancel", type: "button", text: "Cancel", onclick: closeEditor }),
        saveBtn,
      ])
    );
    progInput.focus();
    progInput.select();
  }

  /* ---------- mounting / routing ---------- */

  function startTicker(root) {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      if (document.hidden || !root.isConnected) return;
      const now = Date.now();
      let crossed = false;
      root.querySelectorAll("[data-airing]").forEach((node) => {
        const unix = Number(node.getAttribute("data-airing"));
        if (!unix) return;
        const c = countdown(unix, now);
        if (node.dataset.up === "1" && !c.upcoming) crossed = true;
        node.dataset.up = c.upcoming ? "1" : "0";
        node.classList.toggle("is-past", !c.upcoming);
        node.textContent = c.text;
      });
      root.querySelectorAll("[data-fetched]").forEach((node) => {
        const at = Number(node.getAttribute("data-fetched"));
        if (at) node.textContent = " · updated " + agoText(now - at);
      });
      // An episode just aired: re-render so it flips to "Ready" and the counts update.
      if (crossed && !document.getElementById(EDITOR_ID)) renderNow(root);
    }, 30000);
  }

  // The <div class="user"> page of this profile. AniList keeps the old page in the DOM for a moment while it
  // swaps pages, so the name is checked: the board must never land in the home feed or another profile.
  function profilePage(username) {
    const want = username.toLowerCase();
    for (const page of document.querySelectorAll(".user")) {
      const name = page.querySelector(".banner .name");
      if (name && name.textContent.trim().toLowerCase() === want) return page;
      const link = page.querySelector(".nav a.link[href]");
      const href = link ? decodeURIComponent(link.getAttribute("href") || "").toLowerCase() : "";
      if (href.startsWith("/user/" + want + "/") || href === "/user/" + want) return page;
    }
    return null;
  }

  // Where the board lives: the content box of this profile, and only while it shows the Overview.
  function findAnchor(username) {
    const page = profilePage(username);
    if (!page) return null;
    const content = page.querySelector(".content.container") || page.querySelector(":scope > .content");
    if (!content || !content.querySelector(":scope > .overview")) return null;
    return content;
  }

  // Put the board in its place. Moves the existing one (no re-render) if AniList rebuilt the page around it.
  function mount(username) {
    injectStyles();
    const anchor = findAnchor(username);
    let root = document.getElementById(ROOT);
    if (root && anchor && root.parentNode === anchor) return root;
    if (!anchor) return root;
    if (!root) root = el("div", { id: ROOT });
    anchor.insertBefore(root, anchor.firstChild);
    return root;
  }

  function unmount() {
    const existing = document.getElementById(ROOT);
    if (existing) existing.remove();
    closeEditor();
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  let rerouteAfter = false;

  async function inject() {
    const info = pageInfo(location.pathname);
    if (!info) {
      unmount();
      return;
    }
    if (injecting) {
      // A navigation happened while a load was running: route again once it finishes.
      rerouteAfter = true;
      return;
    }
    if (Date.now() < failedUntil && document.getElementById(ROOT)) return;
    injecting = true;
    if (info.username !== lastUsername) lastPayload = null;
    lastUsername = info.username;
    lastKind = info.kind;
    try {
      const root = mount(info.username);
      if (!root) return; // the Overview is not on screen yet; the heartbeat tries again
      if (!root.dataset.loaded || !lastPayload) {
        root.replaceChildren(
          el("div", { class: "aca-panel" }, [
            el("div", { class: "aca-loading" }, [el("span", { class: "aca-spin" }), span("", "Loading airing schedule…")]),
          ])
        );
      }
      const [payload, viewer] = await Promise.all([
        loadWatching(info.username),
        getViewer(),
        // A failed AnimeCountdown download must never block the panel; it just falls back to AniList.
        getSource() === "animecountdown" ? loadSimkl(false).catch(() => null) : null,
      ]);
      // The page may have changed while we waited.
      if (!pageInfo(location.pathname)) {
        unmount();
        return;
      }
      lastPayload = payload;
      lastAllowEdit = !!(viewer && viewer.name && viewer.name.toLowerCase() === info.username.toLowerCase());
      // Your name may only be known now (Viewer answer): your own profile gets the full board.
      if (lastAllowEdit) lastKind = "own";
      loadedAt = payload.fetchedAt;
      loadedDay = new Date(payload.fetchedAt).toDateString();
      renderNow(root);
      root.dataset.loaded = "1";
      startTicker(root);
    } catch (err) {
      // AniList rate-limits; wait a bit before trying again.
      failedUntil = Date.now() + 30000;
      console.warn(PREFIX, err);
      if (/private/i.test(err.message || "")) err = new Error(info.username + "'s list is private");
      const root = document.getElementById(ROOT) || mount(info.username);
      if (root)
        renderError(root, err, () => {
          clearCache(info.username);
          failedUntil = 0;
          lastPath = "";
          route();
        });
    } finally {
      injecting = false;
      if (rerouteAfter) {
        rerouteAfter = false;
        lastPath = "";
        route();
      }
    }
  }

  function waitAndInject() {
    const info = pageInfo(location.pathname);
    if (!info) {
      unmount();
      return;
    }
    const started = Date.now();
    const poll = () => {
      if (pageInfo(location.pathname) == null) {
        unmount();
        return;
      }
      if (findAnchor(info.username)) {
        inject();
        return;
      }
      // Up to 15 s for a slow profile load; after that the heartbeat keeps looking.
      if (Date.now() - started < 15000) setTimeout(poll, 300);
    };
    poll();
  }

  function route() {
    const path = location.pathname + location.search;
    const root = document.getElementById(ROOT);
    if (path === lastPath && root && root.isConnected) return;
    lastPath = path;
    waitAndInject();
  }

  // Refetch on its own when the day rolls over or the data is older than cacheMinutes,
  // so a tab left open overnight doesn't keep showing (or editing) yesterday's numbers.
  function staleCheck() {
    if (document.hidden || injecting || document.getElementById(EDITOR_ID)) return;
    if (!document.getElementById(ROOT) || !lastUsername || !loadedAt) return;
    if (Date.now() < failedUntil) return;
    const dayChanged = new Date().toDateString() !== loadedDay;
    const old = Date.now() - loadedAt > CONFIG.cacheMinutes * 60 * 1000;
    if (!dayChanged && !old) return;
    clearCache(lastUsername);
    lastPath = "";
    route();
  }

  function hookSpa() {
    // Hook the page's own history object; AniList's router calls it, not the sandbox's.
    const hist = W.history;
    const wrap = (type) => {
      const orig = hist[type];
      hist[type] = function () {
        const ret = orig.apply(this, arguments);
        clearTimeout(navTimer);
        navTimer = setTimeout(route, 250);
        return ret;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    W.addEventListener("popstate", () => {
      clearTimeout(navTimer);
      navTimer = setTimeout(route, 250);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeEditor();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) staleCheck();
  });

  hookSpa();
  route();

  // 1 s heartbeat instead of a MutationObserver (AniList re-renders thousands of nodes while a page loads).
  // Keeps the board in its place: removes it off the profile, moves it back if the page was rebuilt around it,
  // remounts it if AniList wiped it, and checks for stale data once a minute.
  let beat = 0;
  setInterval(() => {
    if (document.hidden) return;
    beat += 1;
    const info = pageInfo(location.pathname);
    const root = document.getElementById(ROOT);
    if (!info) {
      if (root) unmount();
      return;
    }
    const anchor = findAnchor(info.username);
    if (root && root.isConnected && anchor && root.parentNode === anchor) {
      // Your name can become known after the first draw (AniList still starting up): own <-> other board.
      if (!injecting && lastPayload && info.username === lastUsername && info.kind !== lastKind) {
        lastKind = info.kind;
        renderNow(root);
      }
      if (beat % 60 === 0) staleCheck();
      return;
    }
    if (!anchor || injecting) return;
    clearTimeout(navTimer);
    navTimer = setTimeout(route, 150);
  }, 1000);
})();

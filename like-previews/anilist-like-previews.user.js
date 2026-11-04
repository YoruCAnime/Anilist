// ==UserScript==
// @name         AniList Like Previews
// @namespace    exos.anilist.likepreviews
// @author       YoruC
// @version      1.5.0
// @description  Notifications tabs (Likes / Messages & mentions / Replies / Other) + what people liked as small cover squares, a grouped strip and a click-to-open popup
// @match        https://anilist.co/*
// @grant        none
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const API = 'https://graphql.anilist.co';
  const CACHE_KEY = 'alp-cache-v1';
  const TAB_KEY = 'alp-tab';
  const CACHE_MAX = 1500;
  const cache = new Map();      // activityId -> data | null
  const pending = new Set();    // activityIds being fetched

  const isNotifPage = () => location.pathname.startsWith('/notifications');

  // Persistent cache: liked activities don't change, so revisits are instant.
  // Read only once the notifications page is opened (other AniList pages pay nothing).
  let cacheLoaded = false;
  function loadCache() {
    if (cacheLoaded) return;
    cacheLoaded = true;
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      saved.forEach(([k, v]) => { if (!cache.has(k)) cache.set(k, v); });
    } catch (e) { /* ignore */ }
  }

  let saveTimer = null;
  function saveCache() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const entries = [...cache.entries()].filter(([, v]) => v).slice(-CACHE_MAX);
        localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
      } catch (e) { /* storage full or blocked */ }
    }, 500);
  }

  // ---------- tabs ----------
  const TABS = [
    { key: 'all', label: 'All' },
    { key: 'likes', label: 'Likes' },
    { key: 'msgs', label: 'Messages & mentions' },
    { key: 'replies', label: 'Replies' },
    { key: 'other', label: 'Other' }
  ];
  let tab = 'all';
  try { const t = localStorage.getItem(TAB_KEY); if (TABS.some(x => x.key === t)) tab = t; } catch (e) { /* ignore */ }

  // AniList keeps the exact type on each notification's Vue component
  // (ACTIVITY_MESSAGE, ACTIVITY_MENTION, ACTIVITY_LIKE, THREAD_COMMENT_REPLY ...);
  // the visible wording is the fallback when that is not reachable.
  function kindOf(n) {
    let t = '';
    try { t = (n.__vue__ && n.__vue__.notification && n.__vue__.notification.type) || ''; } catch (e) { /* ignore */ }
    if (t) {
      if (/LIKE/.test(t)) return 'likes';
      if (/MESSAGE|MENTION/.test(t)) return 'msgs';
      if (/REPLY|COMMENT|SUBSCRIBED/.test(t)) return 'replies';
      return 'other';
    }
    let c = '';
    n.querySelectorAll('.details .context').forEach(e => { c += ' ' + e.textContent; });
    if (!c) c = n.textContent;
    if (/\bliked\b/i.test(c)) return 'likes';
    if (/sent you a message|mentioned you/i.test(c)) return 'msgs';
    if (/\brepl(ied|y)\b|\bcommented\b/i.test(c)) return 'replies';
    return 'other';
  }

  // ---------- styles ----------
  const css = `
  .notification:has(> .alp-thumb){position:relative}
  .notification[data-alp-off]{display:none !important}
  .alp-tabs{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:12px}
  .alp-tab{border:0;cursor:pointer;font:inherit;font-size:1.2rem;font-weight:600;padding:5px 10px;border-radius:4px;
    background:rgb(var(--color-foreground,255,255,255));color:rgb(var(--color-text-light,146,153,161));
    display:inline-flex;align-items:center;gap:5px;transition:color .12s}
  .alp-tab:hover{color:rgb(var(--color-blue,61,180,242))}
  .alp-tab.alp-on{color:rgb(var(--color-blue,61,180,242));box-shadow:inset 0 -2px 0 rgb(var(--color-blue,61,180,242))}
  .alp-tab .alp-n{font-weight:400;opacity:.8}
  .alp-tab .alp-dot{width:6px;height:6px;border-radius:50%;background:rgb(var(--color-blue,61,180,242))}
  .alp-tab .alp-dot[hidden]{display:none}
  .alp-hint{width:100%;font-size:1.2rem;color:rgb(var(--color-text-light,146,153,161));padding:2px 2px 0}
  .alp-hint[hidden],.alp-strip[hidden]{display:none}
  .alp-thumb{position:absolute;right:120px;top:8px;bottom:8px;width:46px;z-index:2;
    border-radius:4px;background:rgb(var(--color-background,230,235,240)) center/cover no-repeat;cursor:pointer;
    display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 2px 8px rgba(0,0,0,.35);
    transition:transform .12s, box-shadow .12s}
  .alp-thumb:hover{transform:scale(1.06);box-shadow:0 4px 14px rgba(0,0,0,.5)}
  .alp-strip{display:flex;flex-wrap:wrap;gap:8px;padding:12px;margin-bottom:14px;border-radius:6px;
    background:rgb(var(--color-foreground,255,255,255))}
  .alp-strip-title{width:100%;font-size:1.2rem;font-weight:600;color:rgb(var(--color-text-light,146,153,161));margin-bottom:2px}
  .alp-item{position:relative;width:42px;height:60px;border-radius:4px;background:rgb(var(--color-background,230,235,240)) center/cover no-repeat;
    cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .12s}
  .alp-item:hover{transform:scale(1.08)}
  .alp-badge{position:absolute;right:-5px;top:-5px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;
    background:rgb(var(--color-blue,61,180,242));color:#fff;font-size:11px;font-weight:700;line-height:17px;text-align:center}
  .alp-pop-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center}
  .alp-pop{width:340px;max-width:92vw;max-height:80vh;overflow:auto;border-radius:8px;padding:16px;
    background:rgb(var(--color-foreground,255,255,255));color:rgb(var(--color-text,92,114,138));box-shadow:0 10px 40px rgba(0,0,0,.4)}
  .alp-pop-head{display:flex;gap:12px}
  .alp-pop-cover{width:70px;height:100px;flex:0 0 auto;border-radius:4px;background:#333 center/cover no-repeat;
    display:flex;align-items:center;justify-content:center;font-size:30px}
  .alp-pop-title{font-weight:700;font-size:1.4rem;color:rgb(var(--color-text,92,114,138))}
  .alp-pop-title a{color:rgb(var(--color-blue,61,180,242))}
  .alp-pop-sub{font-size:1.2rem;margin-top:6px;opacity:.85;white-space:pre-wrap;word-break:break-word}
  .alp-pop-likers{margin-top:14px;font-size:1.2rem;font-weight:600}
  .alp-liker{display:flex;align-items:center;gap:8px;margin-top:8px}
  .alp-liker img,.alp-liker span.alp-noav{width:28px;height:28px;border-radius:4px;object-fit:cover;background:#888}
  .alp-liker a{color:rgb(var(--color-blue,61,180,242))}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- API ----------
  const QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      activities(id_in: $ids) {
        __typename
        ... on ListActivity {
          id status progress siteUrl
          media { id type siteUrl title { userPreferred } coverImage { medium large } }
        }
        ... on TextActivity { id siteUrl text(asHtml: false) }
        ... on MessageActivity { id siteUrl message(asHtml: false) }
      }
    }
  }`;

  // ---- safety: hard request budget + backoff so failures can never loop ----
  const MAX_PER_MIN = 20;
  let reqTimes = [];
  let backoffUntil = 0;
  let backoffMs = 30000;

  function canRequest() {
    const now = Date.now();
    if (now < backoffUntil) return false;
    reqTimes = reqTimes.filter(t => now - t < 60000);
    return reqTimes.length < MAX_PER_MIN;
  }

  function fail(reason) {
    console.warn('[AniList Like Previews] backing off:', reason);
    backoffUntil = Date.now() + backoffMs;
    backoffMs = Math.min(backoffMs * 2, 10 * 60000); // 30s → 1m → 2m ... max 10m
  }

  async function fetchChunk(chunk) {
    if (!canRequest()) { chunk.forEach(id => pending.delete(id)); scheduleRetry(); return; }
    reqTimes.push(Date.now());
    let ok = false;
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: QUERY, variables: { ids: chunk } })
      });
      if (!res.ok) {
        if (res.status === 429) {
          backoffMs = Math.max(backoffMs, (+res.headers.get('Retry-After') || 60) * 1000);
        }
        fail('HTTP ' + res.status);
        return;
      }
      const json = await res.json();
      const acts = json?.data?.Page?.activities || [];
      acts.forEach(a => a && cache.set(a.id, a));
      chunk.forEach(id => { if (!cache.has(id)) cache.set(id, null); });
      saveCache();
      ok = true;
      backoffMs = 30000;
    } catch (e) {
      fail(e && e.message);
    } finally {
      chunk.forEach(id => pending.delete(id));
      if (ok) scheduleScan(); // paint this chunk right away
      else scheduleRetry();
    }
  }

  let retryTimer = null;
  function scheduleRetry() {
    if (retryTimer) return;
    const wait = Math.max(backoffUntil - Date.now(), 5000);
    retryTimer = setTimeout(() => { retryTimer = null; if (isNotifPage()) scheduleScan(); }, wait);
  }

  function fetchActivities(ids) {
    ids = ids.filter(id => !cache.has(id) && !pending.has(id));
    if (!ids.length) return;
    ids.forEach(id => pending.add(id));
    // Small first chunk = the notifications at the top of the page show up fast,
    // the rest load in parallel behind it
    const chunks = [ids.slice(0, 8)];
    for (let i = 8; i < ids.length; i += 25) chunks.push(ids.slice(i, i + 25));
    chunks.forEach(c => fetchChunk(c));
  }

  // ---------- helpers ----------
  function describe(act) {
    if (!act) return { title: 'Activity unavailable', sub: '', img: null, emoji: '❔', url: null };
    if (act.__typename === 'ListActivity' && act.media) {
      const m = act.media;
      const status = (act.status || '').replace(/^\w/, c => c.toUpperCase());
      return {
        title: m.title.userPreferred,
        sub: [status, act.progress].filter(Boolean).join(' '),
        img: m.coverImage.medium || m.coverImage.large,
        bigImg: m.coverImage.large || m.coverImage.medium,
        emoji: null,
        url: m.siteUrl,
        actUrl: act.siteUrl
      };
    }
    const raw = (act.text || act.message || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return {
      title: act.__typename === 'MessageActivity' ? 'Message' : 'Status post',
      sub: raw.length > 220 ? raw.slice(0, 220) + '…' : raw,
      img: null,
      emoji: act.__typename === 'MessageActivity' ? '✉️' : '💬',
      url: null,
      actUrl: act.siteUrl
    };
  }

  function getLiker(notif) {
    const userLink = notif.querySelector('a[href*="/user/"]');
    const name = userLink ? decodeURIComponent(userLink.getAttribute('href').split('/user/')[1].split('/')[0]) : 'Someone';
    let avatar = null;
    const img = notif.querySelector('img');
    if (img?.src) avatar = img.src;
    if (!avatar) {
      const bgEl = notif.querySelector('.avatar, [style*="background-image"]');
      const bg = bgEl ? (bgEl.style.backgroundImage || getComputedStyle(bgEl).backgroundImage) : '';
      const m = bg.match(/url\(["']?(.*?)["']?\)/);
      if (m) avatar = m[1];
    }
    return { name, avatar };
  }

  // Writes only when something changed (no needless repaints)
  function paintSquare(el, d) {
    const key = d.img ? 'i' + d.img : 'e' + (d.emoji || '💬');
    if (el.dataset.paint === key) return;
    el.dataset.paint = key;
    if (d.img) { el.style.backgroundImage = `url("${d.img}")`; el.textContent = ''; }
    else { el.style.backgroundImage = ''; el.textContent = d.emoji || '💬'; }
    el.title = d.title + (d.sub ? ' — ' + d.sub : '');
  }

  // ---------- popup ----------
  function openPopup(actId, groups) {
    const d = describe(cache.get(actId));
    const likers = groups.get(actId) || [];
    document.querySelector('.alp-pop-bg')?.remove();

    const bg = document.createElement('div');
    bg.className = 'alp-pop-bg';
    bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });

    const pop = document.createElement('div');
    pop.className = 'alp-pop';

    const head = document.createElement('div');
    head.className = 'alp-pop-head';
    const cover = document.createElement('div');
    cover.className = 'alp-pop-cover';
    if (d.bigImg || d.img) cover.style.backgroundImage = `url("${d.bigImg || d.img}")`;
    else cover.textContent = d.emoji;

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'alp-pop-title';
    if (d.url) {
      const a = document.createElement('a');
      a.href = d.url; a.textContent = d.title;
      title.appendChild(a);
    } else title.textContent = d.title;
    const sub = document.createElement('div');
    sub.className = 'alp-pop-sub';
    sub.textContent = d.sub;
    info.append(title, sub);
    if (d.actUrl) {
      const a = document.createElement('a');
      a.href = d.actUrl; a.textContent = 'Open activity →';
      a.style.cssText = 'display:inline-block;margin-top:8px;font-size:1.2rem;color:rgb(var(--color-blue,61,180,242))';
      info.appendChild(a);
    }
    head.append(cover, info);

    const lk = document.createElement('div');
    lk.className = 'alp-pop-likers';
    lk.textContent = `Liked by ${likers.length}`;

    pop.append(head, lk);
    likers.forEach(u => {
      const row = document.createElement('div');
      row.className = 'alp-liker';
      let av;
      if (u.avatar) { av = document.createElement('img'); av.src = u.avatar; }
      else { av = document.createElement('span'); av.className = 'alp-noav'; }
      const a = document.createElement('a');
      a.href = `/user/${encodeURIComponent(u.name)}/`;
      a.textContent = u.name;
      row.append(av, a);
      pop.appendChild(row);
    });

    bg.appendChild(pop);
    document.body.appendChild(bg);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelector('.alp-pop-bg')?.remove();
  });

  // ---------- tab bar ----------
  function setText(el, s) { if (el.textContent !== s) el.textContent = s; }

  function buildTabs(container) {
    let bar = container.querySelector(':scope > .alp-tabs');
    if (bar) return bar;
    document.querySelectorAll('.alp-tabs').forEach(b => b.remove());
    bar = document.createElement('div');
    bar.className = 'alp-tabs';
    TABS.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'alp-tab';
      b.dataset.tab = t.key;
      const label = document.createElement('span');
      label.textContent = t.label;
      const n = document.createElement('span');
      n.className = 'alp-n';
      const dot = document.createElement('span');
      dot.className = 'alp-dot';
      dot.hidden = true;
      dot.title = 'Unread';
      b.append(label, n, dot);
      b.addEventListener('click', () => {
        tab = t.key;
        try { localStorage.setItem(TAB_KEY, tab); } catch (e) { /* ignore */ }
        scan();
      });
      bar.appendChild(b);
    });
    const hint = document.createElement('div');
    hint.className = 'alp-hint';
    hint.hidden = true;
    bar.appendChild(hint);
    container.insertBefore(bar, container.firstChild);
    return bar;
  }

  function paintTabs(bar, counts, unread, shown) {
    bar.querySelectorAll('.alp-tab').forEach(b => {
      const k = b.dataset.tab;
      const on = k === tab;
      if (b.classList.contains('alp-on') !== on) b.classList.toggle('alp-on', on);
      setText(b.querySelector('.alp-n'), k === 'all' ? '' : String(counts[k] || 0));
      const dot = b.querySelector('.alp-dot');
      const u = k !== 'all' && unread[k] > 0;
      if (dot.hidden === u) dot.hidden = !u;
    });
    const hint = bar.querySelector('.alp-hint');
    const empty = tab !== 'all' && shown === 0;
    if (hint.hidden === empty) hint.hidden = !empty;
    if (empty) setText(hint, 'None in the notifications loaded so far. Scroll down or use Load More for older ones.');
  }

  // ---------- main scan ----------
  let currentGroups = new Map();

  function scan() {
    if (!isNotifPage()) return;
    loadCache();

    const notifs = [...document.querySelectorAll('.notification')];
    if (!notifs.length) return;
    const container = notifs[0].parentElement;

    const groups = new Map(); // actId -> [{name, avatar}]
    const order = [];
    const toFetch = [];
    const counts = { likes: 0, msgs: 0, replies: 0, other: 0 };
    const unread = { likes: 0, msgs: 0, replies: 0, other: 0 };
    let shown = 0;

    notifs.forEach(n => {
      const kind = kindOf(n);
      counts[kind]++;
      if (n.classList.contains('unread')) unread[kind]++;
      const off = tab !== 'all' && kind !== tab;
      if (n.hasAttribute('data-alp-off') !== off) n.toggleAttribute('data-alp-off', off);
      if (!off) shown++;

      let thumb = n.querySelector(':scope > .alp-thumb');
      // AniList reuses notification rows in place: drop a cover left on a row that is no longer a like
      const link = kind === 'likes' && n.querySelector('a[href*="/activity/"]');
      const m = link && link.getAttribute('href').match(/\/activity\/(\d+)/);
      if (!m) { thumb?.remove(); return; }
      const id = +m[1];

      if (!groups.has(id)) { groups.set(id, []); order.push(id); }
      const liker = getLiker(n);
      if (!groups.get(id).some(u => u.name === liker.name)) groups.get(id).push(liker);

      if (!cache.has(id)) toFetch.push(id);

      if (!thumb) {
        thumb = document.createElement('div');
        thumb.className = 'alp-thumb';
        thumb.textContent = '…';
        thumb.addEventListener('click', e => {
          e.preventDefault(); e.stopPropagation();
          openPopup(+thumb.dataset.act, currentGroups);
        });
        n.appendChild(thumb);
      }
      if (thumb.dataset.act !== String(id)) {
        thumb.dataset.act = id;
        delete thumb.dataset.paint;
        thumb.style.backgroundImage = '';
        thumb.textContent = '…';
      }
      if (cache.has(id)) paintSquare(thumb, describe(cache.get(id)));
    });

    currentGroups = groups;
    const bar = buildTabs(container);
    paintTabs(bar, counts, unread, shown);
    buildStrip(container, bar, order, groups);
    if (toFetch.length) fetchActivities([...new Set(toFetch)]);
  }

  function buildStrip(container, bar, order, groups) {
    let strip = document.querySelector('.alp-strip');
    if (!order.length) { strip?.remove(); return; }

    if (!strip || strip.parentElement !== container) {
      strip?.remove();
      strip = document.createElement('div');
      strip.className = 'alp-strip';
    }
    if (bar.nextSibling !== strip) container.insertBefore(strip, bar.nextSibling);

    // The likes strip belongs to All and Likes only
    const hide = tab !== 'all' && tab !== 'likes';
    if (strip.hidden !== hide) strip.hidden = hide;

    // Rebuild only if contents changed
    const sig = order.map(id => `${id}:${groups.get(id).length}:${cache.has(id) ? 1 : 0}`).join('|');
    if (strip.dataset.sig === sig) return;
    strip.dataset.sig = sig;
    strip.textContent = '';

    const t = document.createElement('div');
    t.className = 'alp-strip-title';
    t.textContent = `What people liked (${order.length})`;
    strip.appendChild(t);

    order.forEach(id => {
      const item = document.createElement('div');
      item.className = 'alp-item';
      if (cache.has(id)) paintSquare(item, describe(cache.get(id)));
      else item.textContent = '…';
      const n = groups.get(id).length;
      if (n > 1) {
        const b = document.createElement('span');
        b.className = 'alp-badge';
        b.textContent = n;
        item.appendChild(b);
      }
      item.addEventListener('click', () => openPopup(id, currentGroups));
      strip.appendChild(item);
    });
  }

  // Throttle (not debounce): runs at most every 120ms but never gets pushed back
  // indefinitely while AniList keeps rendering
  let scanQueued = false;
  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(() => { scanQueued = false; scan(); }, 120);
  }

  // ---------- watching (light) ----------
  // The DOM is only watched while the notifications page is open in a visible tab.
  // Everywhere else on AniList the script just checks the address once a second.
  const OURS = '.alp-thumb, .alp-strip, .alp-tabs, .alp-pop-bg';
  function ours(node) {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    return !!(el && el.closest(OURS));
  }
  function relevant(m) {
    if (ours(m.target)) return false;
    const el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
    if (el && el.closest('.notifications')) {
      if (m.type !== 'childList') return true;
      const nodes = [...m.addedNodes, ...m.removedNodes];
      return !nodes.length || nodes.some(x => x.nodeType !== 1 || !x.matches(OURS));
    }
    // the list itself appearing (page opened, feed switched)
    return [...m.addedNodes].some(x => x.nodeType === 1 && (x.classList.contains('notifications') || x.classList.contains('notification')));
  }

  let mo = null;
  function watch() {
    const on = isNotifPage() && !document.hidden;
    if (on && !mo) {
      mo = new MutationObserver(muts => { if (muts.some(relevant)) scheduleScan(); });
      mo.observe(document.body, { childList: true, subtree: true, characterData: true });
      scheduleScan();
    } else if (!on && mo) {
      mo.disconnect();
      mo = null;
      if (!isNotifPage()) document.querySelector('.alp-pop-bg')?.remove();
    } else if (on) {
      // safety net: list re-drawn without a mutation we noticed
      const first = document.querySelector('.notification');
      if (first && !first.parentElement.querySelector(':scope > .alp-tabs')) scheduleScan();
    }
  }
  setInterval(watch, 1000);
  document.addEventListener('visibilitychange', watch);
  window.addEventListener('popstate', watch);
  watch();
})();

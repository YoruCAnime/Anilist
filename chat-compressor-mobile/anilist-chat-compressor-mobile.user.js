// ==UserScript==
// @name         AniList Chat View
// @namespace    exos.anilist.chatview
// @author       YoruC
// @version      2.8
// @description  Fast, compact chat view for AniList activity threads, only on direct activity links (anilist.co/activity/ID). Loads just the newest replies instead of the whole thread. Home, profile overview and feeds are left untouched.
// @match        https://anilist.co/*
// @grant        none
// @inject-into  auto
// @noframes
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ---- settings ---------------------------------------------------------------
  const SHOW_LAST = 10;      // newest messages shown when a thread opens
  const OLDER_STEP = 20;     // how many more each "Older" click shows
  const PAGE = 10;           // replies per API page
  const POLL_MS = 15000;     // check for new messages this often while the tab is visible
  const CACHE_KEEP = 30;     // messages remembered per thread for instant opening
  const CACHE_THREADS = 20;  // threads remembered
  const GROUP_MESSAGES = false; // true = back-to-back messages from the same person hide the picture and name
  const DEBUG = false;       // true = small green status tag at the top-left (tap it to hide), for troubleshooting

  const VERSION = '2.8';
  // Firefox can run userscripts either inside the page or in a sandbox next to it. In the sandbox,
  // AniList's own variables are reached through wrappedJSObject, and requests go through
  // content.fetch so they count as AniList's own (with your login).
  const SANDBOX = typeof window.wrappedJSObject === 'object' && window.wrappedJSObject !== null && window.wrappedJSObject !== window;
  const PW = SANDBOX ? window.wrappedJSObject : window;

  let dbgEl = null, dbgText = '';
  function dbg(msg) {
    if (!DEBUG) return;
    dbgText = 'Chat View ' + VERSION + (SANDBOX ? ' (sandbox)' : ' (page)') + ': ' + msg;
    if (!document.body) return;
    if (!dbgEl) {
      dbgEl = document.createElement('div');
      dbgEl.className = 'acv-dbg';
      dbgEl.title = 'Tap to hide';
      dbgEl.addEventListener('click', () => { dbgEl.style.display = 'none'; });
    }
    if (!dbgEl.isConnected) document.body.appendChild(dbgEl);
    if (dbgEl.textContent !== dbgText) dbgEl.textContent = dbgText; // only on change, or the page observer loops
  }

  // ---- small helpers ----------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  // 'fast' = our own panel with the newest messages; 'full' = AniList's own list (loads every page)
  let mode = store.get('acv:mode', 'fast');

  const activityId = () => { const m = location.pathname.match(/^\/activity\/(\d+)\/?$/); return m ? +m[1] : 0; };
  const root = document.documentElement;

  function setRootClass() {
    const on = !!activityId();
    root.classList.toggle('acv-page', on);
    root.classList.toggle('acv-fast', on && mode === 'fast');
  }

  // ---- styles -----------------------------------------------------------------
  // html.acv-fast only exists on a direct activity page in fast mode. There AniList's own reply
  // list is hidden and its "load next page" trigger is parked far off screen, so AniList never
  // fetches the old pages at all. Everything else is scoped to classes this script adds.
  const css = `
    html.acv-fast .activity-replies > .scroller {
      position: fixed !important; top: 300000px !important; left: 0 !important;
      visibility: hidden !important; pointer-events: none !important;
    }
    html.acv-fast .activity-replies > .reply { display: none !important; }

    .acv-thread > .reply { padding: 8px 12px !important; margin-bottom: 6px !important; }
    .acv-thread > .reply .avatar { width: 28px !important; height: 28px !important; }
    .acv-thread > .reply.acv-hidden { display: none !important; }
    .acv-thread > .activity-edit {
      position: sticky; bottom: 0; z-index: 20;
      background: rgb(var(--color-background));
      padding: 8px 0 10px;
      box-shadow: 0 -8px 14px -6px rgba(0,0,0,.25);
    }
    .acv-thread > .activity-edit textarea { min-height: 96px; max-height: 45vh; font-size: 1.6rem !important; line-height: 1.45 !important; }
    .acv-thread > .activity-edit .preview { max-height: 22vh; overflow: auto; }

    .acv-panel { margin: 10px 0 8px; font-size: 1.55rem; }
    .acv-bar {
      display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
      font-size: 1.4rem; color: rgb(var(--color-text-lighter, var(--color-text)));
    }
    .acv-bar .acv-status { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .acv-bar button, .acv-fab button {
      background: rgb(var(--color-foreground)); color: rgb(var(--color-text));
      border: 1px solid rgba(var(--color-text), .15); border-radius: 6px;
      padding: 6px 12px; font-size: 1.35rem; cursor: pointer; font-family: inherit;
    }
    .acv-bar button:hover, .acv-fab button:hover { color: rgb(var(--color-blue)); }
    .acv-bar button[disabled] { opacity: .5; cursor: default; }
    .acv-list { display: flex; flex-direction: column; gap: 4px; }
    .acv-msg {
      display: flex; gap: 12px; padding: 10px 14px; border-radius: 10px;
      background: rgb(var(--color-foreground));
    }
    .acv-msg.acv-mine { background: rgba(var(--color-blue), .13); }
    .acv-msg.acv-cont { margin-top: -3px; padding-top: 2px; border-top-left-radius: 2px; border-top-right-radius: 2px; }
    .acv-av {
      flex: none; width: 42px; height: 42px; border-radius: 6px;
      background: rgba(var(--color-text), .1) center / cover no-repeat;
    }
    .acv-cont .acv-av { visibility: hidden; height: 0; }
    .acv-cont .acv-head { margin-bottom: 0; }
    .acv-body { flex: 1; min-width: 0; }
    .acv-head { display: flex; align-items: baseline; gap: 12px; font-size: 1.4rem; line-height: 1.7; margin-bottom: 2px; }
    .acv-name { font-weight: 600; color: rgb(var(--color-blue)); }
    .acv-time { opacity: .6; }
    .acv-cont .acv-name { display: none; }
    .acv-cont .acv-head { min-height: 0; }
    .acv-like { margin-left: auto; cursor: pointer; opacity: .5; user-select: none; white-space: nowrap; font-size: 1.5rem; padding: 0 4px; }
    .acv-like:hover { opacity: 1; }
    .acv-like.acv-on { opacity: 1; color: rgb(var(--color-red, 232,93,117)); }
    .acv-act { cursor: pointer; opacity: .55; font-size: 1.3rem; padding: 0 3px; user-select: none; }
    .acv-act:hover { opacity: 1; color: rgb(var(--color-blue)); }
    .acv-act.acv-own { display: none; }
    .acv-mine .acv-act.acv-own { display: inline; }
    .acv-tools { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
    .acv-tools button {
      min-width: 34px; padding: 4px 9px; font-size: 1.35rem; line-height: 1.5; cursor: pointer; font-family: inherit;
      background: rgb(var(--color-background)); color: rgb(var(--color-text));
      border: 1px solid rgba(var(--color-text), .12); border-radius: 4px;
    }
    .acv-tools button:hover { color: rgb(var(--color-blue)); }
    .acv-preview { margin-top: 6px; padding: 6px 8px; border-radius: 6px; border: 1px dashed rgba(var(--color-text), .2); max-height: 30vh; overflow: auto; }
    .acv-preview:empty { display: none; }
    .acv-preview::before { content: 'Preview'; display: block; font-size: 1.2rem; opacity: .5; margin-bottom: 2px; }
    .acv-edit textarea {
      display: block; width: 100%; box-sizing: border-box; min-height: 120px; max-height: 50vh; resize: vertical;
      font: inherit; font-size: 1.6rem; line-height: 1.45; padding: 10px 12px; border-radius: 6px;
      background: rgb(var(--color-background)); color: rgb(var(--color-text)); border: 1px solid rgba(var(--color-text), .2);
    }
    .acv-edit-bar { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 1.25rem; }
    .acv-edit-bar .acv-hint { flex: 1; opacity: .6; }
    .acv-edit-bar button {
      background: rgb(var(--color-background)); color: rgb(var(--color-text));
      border: 1px solid rgba(var(--color-text), .15); border-radius: 6px;
      padding: 6px 14px; font-size: 1.35rem; cursor: pointer; font-family: inherit;
    }
    .acv-edit-bar .acv-save { background: rgb(var(--color-blue)); color: #fff; border-color: transparent; }
    .acv-edit-bar button[disabled] { opacity: .6; cursor: default; }
    .acv-text { font-size: 1.6rem; line-height: 1.5; overflow-wrap: anywhere; color: rgb(var(--color-text)); }
    .acv-text p { margin: 0 0 4px; }
    .acv-text p:last-child { margin-bottom: 0; }
    /* images, GIFs and videos at their real size, only shrunk to fit the chat width */
    .acv-text img, .acv-text video { max-width: 100%; height: auto; }
    .acv-text .markdown { overflow-wrap: anywhere; }
    .acv-text blockquote { margin: 4px 0; padding-left: 8px; border-left: 3px solid rgba(var(--color-text), .25); }
    .acv-text .markdown_spoiler { cursor: pointer; }
    .acv-text .markdown_spoiler > span { display: none; }
    .acv-text .markdown_spoiler::before { content: 'Spoiler, tap to show'; font-size: 1.1rem; padding: 1px 6px; border-radius: 4px; background: rgba(var(--color-text), .12); }
    .acv-text .markdown_spoiler.acv-open > span { display: inline; }
    .acv-text .markdown_spoiler.acv-open::before { content: none; }
    .acv-yt { position: relative; display: inline-block; }
    .acv-yt::after {
      content: '\\25B6'; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,.65); color: #fff; border-radius: 8px; padding: 4px 12px; font-size: 1.6rem;
    }
    .acv-error { color: rgb(var(--color-red, 232,93,117)); }
    .acv-dbg {
      position: fixed; top: 4px; left: 4px; z-index: 99999; max-width: 92vw;
      padding: 3px 8px; border-radius: 6px; font: 12px/1.4 sans-serif;
      background: rgba(0,0,0,.85); color: #7cfc9a; overflow-wrap: anywhere;
    }

    .acv-fab {
      position: fixed; right: 18px; bottom: 150px; z-index: 50;
      display: none; flex-direction: column; gap: 6px;
    }
    .acv-fab button { box-shadow: 0 2px 8px rgba(0,0,0,.2); padding: 7px 12px; font-size: 1.35rem; }
    .acv-fab .acv-new { background: rgb(var(--color-blue)); color: #fff; border-color: transparent; }
    .acv-fab .acv-s { display: none; }
    @media (max-width: 760px) {
      .acv-fab { right: 4px; bottom: 110px; gap: 4px; opacity: .8; }
      .acv-fab button { padding: 5px 0; min-width: 36px; font-size: 1.4rem; }
      .acv-fab .acv-l { display: none; }
      .acv-fab .acv-s { display: inline; }
      .acv-fab .acv-new .acv-l { display: inline; }
      .acv-msg { padding: 7px 9px; gap: 8px; }
      .acv-av { width: 32px; height: 32px; }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || root).appendChild(style);
  setRootClass();

  // ---- AniList API (same endpoint and login the site itself uses) --------------
  function token() {
    try { if (PW.al_token) return String(PW.al_token); } catch (e) {}
    for (const s of document.scripts) {
      const m = !s.src && s.textContent.match(/al_token\s*=\s*"([^"]+)"/);
      if (m) return m[1];
    }
    return '';
  }

  async function doFetch(url, opts) {
    if (SANDBOX && typeof content === 'object' && content && typeof content.fetch === 'function') {
      try { return await content.fetch(url, opts); } catch (e) { /* fall back to the normal fetch */ }
    }
    return fetch(url, opts);
  }

  async function gql(query, variables) {
    const r = await doFetch(location.origin + '/graphql', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-csrf-token': token() },
      body: JSON.stringify({ query, variables }),
    });
    if (r.status === 429) {
      const e = new Error('AniList says slow down, retrying soon');
      e.retry = +(r.headers.get('Retry-After') || 60);
      throw e;
    }
    let j;
    try { j = JSON.parse(await r.text()); } catch (e) { throw new Error('HTTP ' + r.status); }
    if (!j.data || (j.errors && j.errors.length && !Object.values(j.data).some(Boolean))) {
      throw new Error((j.errors && j.errors[0] && j.errors[0].message) || 'HTTP ' + r.status);
    }
    return j.data;
  }

  // md = what you typed (drawn with AniList's own formatter); html = server copy, only used as a fallback.
  const F = 'id createdAt likeCount isLiked md:text html:text(asHtml:true) user{id name avatar{medium}}';
  const PAGES = `a:Page(page:$a,perPage:${PAGE}){activityReplies(activityId:$id){${F}}}
                 b:Page(page:$b,perPage:${PAGE}){activityReplies(activityId:$id){${F}}}`;
  const Q_LATEST = `query($id:Int,$a:Int,$b:Int){
    A:Activity(id:$id){... on TextActivity{replyCount} ... on ListActivity{replyCount} ... on MessageActivity{replyCount}}
    ${PAGES}}`;
  const Q_PAGES = `query($id:Int,$a:Int,$b:Int){${PAGES}}`;
  const Q_ME = 'query{Viewer{id}}';
  const Q_LIKE = 'mutation($id:Int){ToggleLikeV2(id:$id,type:ACTIVITY_REPLY){... on ActivityReply{id likeCount isLiked}}}';
  const Q_RAW = 'query($id:Int){ActivityReply(id:$id){id text}}';
  const Q_SAVE = 'mutation($id:Int,$activityId:Int,$text:String){SaveActivityReply(id:$id,activityId:$activityId,text:$text){id md:text html:text(asHtml:true)}}';
  const Q_DEL = 'mutation($id:Int){DeleteActivityReply(id:$id){deleted}}';

  let me = store.get('acv:me', 0);
  let meAsked = false;
  function askMe() {
    if (meAsked) return; meAsked = true;
    gql(Q_ME).then(d => {
      const id = d.Viewer && d.Viewer.id;
      if (id && id !== me) { me = id; store.set('acv:me', me); if (T) T.els.forEach((el, k) => el.classList.toggle('acv-mine', (T.byId.get(k) || {}).uid === me)); }
    }).catch(() => {});
  }

  // ---- message rendering ------------------------------------------------------
  function cleanHtml(html) {
    const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    const box = doc.body.firstElementChild;
    // YouTube: a light thumbnail link instead of a heavy player.
    box.querySelectorAll('span.youtube, iframe[src*="youtube"]').forEach(n => {
      const vid = (n.id || '') || ((n.getAttribute('src') || '').match(/embed\/([\w-]{6,})/) || [])[1];
      if (!vid || !/^[\w-]{6,}$/.test(vid)) { n.remove(); return; }
      const a = doc.createElement('a');
      a.className = 'acv-yt'; a.href = 'https://www.youtube.com/watch?v=' + vid; a.target = '_blank'; a.rel = 'noopener';
      const img = doc.createElement('img');
      img.src = 'https://i.ytimg.com/vi/' + vid + '/mqdefault.jpg'; img.alt = 'YouTube video';
      a.appendChild(img); n.replaceWith(a);
    });
    box.querySelectorAll('script,style,iframe,object,embed,form,link,meta,base').forEach(n => n.remove());
    box.querySelectorAll('*').forEach(n => {
      for (const at of [...n.attributes]) {
        const nm = at.name.toLowerCase();
        if (nm.startsWith('on') || (/^(href|src|xlink:href|action|formaction)$/.test(nm) && /^\s*(javascript|data:text)/i.test(at.value))) n.removeAttribute(at.name);
      }
    });
    box.querySelectorAll('img').forEach(i => {
      i.setAttribute('loading', 'lazy'); i.setAttribute('decoding', 'async');
      if (!/^\d+%?$/.test(i.getAttribute('width') || '')) i.removeAttribute('width');
    });
    box.querySelectorAll('video').forEach(v => { v.setAttribute('preload', 'none'); v.setAttribute('controls', ''); v.removeAttribute('autoplay'); });
    box.querySelectorAll('a[href^="http"]').forEach(a => { if (!/^https:\/\/anilist\.co\//.test(a.href)) { a.target = '_blank'; a.rel = 'noopener'; } });
    return box;
  }

  function ago(sec) {
    const d = Date.now() / 1000 - sec;
    if (d < 60) return 'now';
    if (d < 3600) return Math.floor(d / 60) + 'm';
    if (d < 86400) return Math.floor(d / 3600) + 'h';
    if (d < 7 * 86400) return Math.floor(d / 86400) + 'd';
    return new Date(sec * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d > 300 * 86400 ? 'numeric' : undefined });
  }

  // Keep only what the panel needs (also what goes into the cache).
  const slim = r => ({ id: r.id, t: r.createdAt, likes: r.likeCount, liked: !!r.isLiked, md: r.md, html: r.html,
                       uid: r.user ? r.user.id : 0, name: r.user ? r.user.name : '?', av: r.user && r.user.avatar ? r.user.avatar.medium : '' });

  // AniList's own text formatter (the "markdown" component the site uses for every post), so
  // messages look exactly like normal: anime/manga cards, @mentions, YouTube, webm, centre,
  // spoilers, quotes... Borrowed from the activity on the page; if it can't be found the
  // server's HTML copy is shown instead.
  let mdHost = null, MdCtor = null;
  function mdMount(md) {
    if (SANDBOX) return null; // AniList's formatter can't be called from the sandbox; the server's HTML is used instead
    try {
      if (!mdHost || mdHost._isDestroyed || !document.contains(mdHost.$el)) {
        mdHost = null; MdCtor = null;
        const entry = document.querySelector('.activity-entry');
        for (let v = entry && entry.__vue__; v; v = v.$parent) {
          const C = v.$options.components && v.$options.components.Markdown;
          if (C) { mdHost = v; MdCtor = typeof C === 'function' ? C : v.$options._base.extend(C); break; }
        }
      }
      if (!MdCtor) return null;
      return new MdCtor({ parent: mdHost, propsData: { markdown: md } }).$mount();
    } catch (e) { return null; }
  }

  function fillText(box, m) {
    if (box._vm) { try { box._vm.$destroy(); } catch (e) {} box._vm = null; }
    box.textContent = '';
    const vm = m.md != null ? mdMount(m.md) : null;
    if (vm) { box._vm = vm; box.appendChild(vm.$el); }
    else box.append(...cleanHtml(m.html).childNodes);
  }

  function dropEl(el) {
    el.querySelectorAll('.acv-text, .acv-preview').forEach(b => { if (b._vm) { try { b._vm.$destroy(); } catch (e) {} b._vm = null; } });
    el.remove();
  }

  function msgEl(m) {
    const el = document.createElement('div');
    el.className = 'acv-msg'; el.dataset.id = m.id;
    if (me && m.uid === me) el.classList.add('acv-mine');
    const av = document.createElement('a');
    av.className = 'acv-av'; av.href = '/user/' + encodeURIComponent(m.name) + '/';
    if (m.av) av.style.backgroundImage = 'url("' + m.av.replace(/"/g, '%22') + '")';
    const body = document.createElement('div'); body.className = 'acv-body';
    const head = document.createElement('div'); head.className = 'acv-head';
    const name = document.createElement('a'); name.className = 'acv-name'; name.href = av.href; name.textContent = m.name;
    const time = document.createElement('span'); time.className = 'acv-time';
    const like = document.createElement('span'); like.className = 'acv-like'; like.title = 'Like';
    const act = (key, label, title, own) => {
      const s = document.createElement('span');
      s.className = 'acv-act' + (own ? ' acv-own' : ''); s.dataset.act = key; s.textContent = label; s.title = title;
      return s;
    };
    // Edit / Delete only show on your own messages (CSS: .acv-mine .acv-own).
    head.append(name, time,
      act('quote', 'Quote', 'Quote this message in your reply'),
      act('edit', 'Edit', 'Edit your message', true),
      act('del', 'Delete', 'Delete your message', true),
      like);
    const text = document.createElement('div'); text.className = 'acv-text';
    body.append(head, text);
    el.append(av, body);
    updateEl(el, m);
    return el;
  }

  function updateEl(el, m) {
    const time = el.querySelector('.acv-time');
    time.textContent = ago(m.t);
    time.title = new Date(m.t * 1000).toLocaleString();
    const like = el.querySelector('.acv-like');
    like.textContent = m.likes ? '\u2665 ' + m.likes : '\u2661';
    like.classList.toggle('acv-on', m.liked);
    const key = (m.md != null ? m.md : '') + '\u0000' + (m.html || '');
    if (el._key !== key) { el._key = key; fillText(el.querySelector('.acv-text'), m); } // new or edited
  }

  // ---- thread state -----------------------------------------------------------
  let T = null; // the open thread

  function closeThread(t) {
    t.els.forEach(dropEl); t.els.clear();
    t.panel.remove();
  }

  function cacheKey(id) { return 'acv:t:' + id; }
  function saveCache(t) {
    store.set(cacheKey(t.id), { count: t.count, msgs: t.msgs.slice(-CACHE_KEEP) });
    const idx = store.get('acv:idx', []).filter(x => x !== t.id);
    idx.push(t.id);
    while (idx.length > CACHE_THREADS) store.del(cacheKey(idx.shift()));
    store.set('acv:idx', idx);
  }

  function buildPanel(t) {
    const panel = document.createElement('div');
    panel.className = 'acv-panel';
    const bar = document.createElement('div'); bar.className = 'acv-bar';
    const older = document.createElement('button'); older.type = 'button'; older.textContent = 'Older';
    older.addEventListener('click', () => loadOlder(t));
    const status = document.createElement('span'); status.className = 'acv-status';
    const refresh = document.createElement('button'); refresh.type = 'button'; refresh.textContent = '\u21BB'; refresh.title = 'Check for new messages';
    refresh.addEventListener('click', () => refreshLatest(t, true));
    bar.append(older, status, refresh);
    const list = document.createElement('div'); list.className = 'acv-list';
    list.addEventListener('click', e => {
      const sp = e.target.closest('.markdown_spoiler');
      if (sp && list.contains(sp)) { sp.classList.toggle('acv-open'); return; }
      const act = e.target.closest('.acv-act');
      if (act) {
        const id = +act.closest('.acv-msg').dataset.id;
        if (act.dataset.act === 'quote') quoteMsg(t, id);
        else if (act.dataset.act === 'edit') startEdit(t, id);
        else deleteMsg(t, id);
        return;
      }
      const lk = e.target.closest('.acv-like');
      if (lk) toggleLike(t, +lk.closest('.acv-msg').dataset.id);
    });
    panel.append(bar, list);
    Object.assign(t, { panel, list, olderBtn: older, statusEl: status });
  }

  function openThread(id) {
    const cached = store.get(cacheKey(id), null);
    const t = { id, msgs: [], byId: new Map(), els: new Map(), shown: SHOW_LAST, count: 0, minPage: 0,
                fresh: false, busy: false, again: false, inflight: null, scrolled: false, pauseUntil: 0, error: '', updated: 0,
                olderBusy: false, sendSeq: 0, sendNote: '', sendBad: false };
    buildPanel(t);
    if (cached && Array.isArray(cached.msgs)) {
      t.count = cached.count || 0;
      setMsgs(t, cached.msgs);
    }
    return t;
  }

  function setMsgs(t, list) {
    t.msgs = list.slice().sort((a, b) => a.id - b.id);
    t.byId = new Map(t.msgs.map(m => [m.id, m]));
  }

  function nearBottom() {
    return window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 400;
  }
  function scrollToLatest(smooth) {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    newPill(0);
  }

  function render(t) {
    const vis = t.msgs.slice(-t.shown);
    const keep = new Set(vis.map(m => m.id));
    for (const [id, el] of t.els) if (!keep.has(id)) { dropEl(el); t.els.delete(id); }
    let prevEl = null;
    vis.forEach((m, i) => {
      let el = t.els.get(m.id);
      if (!el) { el = msgEl(m); t.els.set(m.id, el); } else updateEl(el, m);
      const p = vis[i - 1];
      el.classList.toggle('acv-cont', GROUP_MESSAGES && !!p && p.uid === m.uid && m.t - p.t < 600);
      const want = prevEl ? prevEl.nextSibling : t.list.firstChild;
      if (el !== want) t.list.insertBefore(el, want);
      prevEl = el;
    });
    const hidden = Math.max(0, t.count - vis.length);
    t.olderBtn.style.display = hidden ? '' : 'none';
    t.olderBtn.textContent = t.olderBusy ? 'Loading\u2026' : 'Older (' + hidden.toLocaleString() + ')';
    t.olderBtn.disabled = t.olderBusy;
    const note = t.sendNote || t.error;
    t.statusEl.classList.toggle('acv-error', !!(t.sendBad || (!t.sendNote && t.error)));
    t.statusEl.textContent = note
      ? note
      : (t.count ? vis.length + ' of ' + t.count.toLocaleString() + ' messages' : (t.fresh ? 'No replies yet' : 'Loading\u2026'))
        + (t.updated ? ' \u00B7 checked ' + new Date(t.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
  }

  // A check that is asked for while another one is running is not dropped: it runs right
  // after (otherwise a message you just sent could wait for the next 15 s check).
  async function refreshLatest(t, manual) {
    if (T !== t) return;
    if (!manual && Date.now() < t.pauseUntil) return;
    if (t.busy) { t.again = true; return t.inflight; }
    t.busy = true;
    t.inflight = doRefresh(t);
    await t.inflight;
    if (t.again && T === t) { t.again = false; return refreshLatest(t, true); }
  }

  async function doRefresh(t) {
    try {
      const guess = Math.max(1, Math.ceil((t.count || 0) / PAGE));
      const d = await gql(Q_LATEST, { id: t.id, a: Math.max(1, guess - 1), b: guess });
      if (!d.A) throw new Error('This activity was not found (deleted or private?)');
      const count = d.A.replyCount || 0;
      const last = Math.max(1, Math.ceil(count / PAGE));
      let got = [...d.a.activityReplies, ...d.b.activityReplies];
      if (last !== guess) {
        const d2 = await gql(Q_PAGES, { id: t.id, a: Math.max(1, last - 1), b: last });
        got = [...d2.a.activityReplies, ...d2.b.activityReplies];
      }
      if (T !== t) return;
      got = got.filter(Boolean).map(slim);
      const wasNear = nearBottom();
      const before = new Set(t.byId.keys());
      if (!t.fresh) {
        // First live answer replaces the cached copy (keeps paging consistent).
        setMsgs(t, got); t.minPage = Math.max(1, last - 1); t.fresh = true;
      } else {
        // Replace everything from the oldest fetched message on (drops deleted, updates edits/likes).
        const from = got.length ? Math.min(...got.map(m => m.id)) : Infinity;
        setMsgs(t, [...t.msgs.filter(m => m.id < from), ...got]);
        if (!count) setMsgs(t, []);
      }
      const added = t.msgs.filter(m => !before.has(m.id)).length;
      if (t.scrolled && added) t.shown += added; // don't push what you're reading off the top
      t.count = count; t.error = ''; t.updated = Date.now();
      dbg('working, ' + count + ' replies');
      render(t);
      saveCache(t);
      if (!t.scrolled) { t.scrolled = true; scrollToLatest(false); }
      else if (added && before.size) {
        if (wasNear) setTimeout(() => scrollToLatest(true), 30);
        else newPill(added);
      }
    } catch (e) {
      if (T === t) {
        if (e.retry) t.pauseUntil = Date.now() + e.retry * 1000;
        t.error = 'Could not load: ' + e.message;
        dbg('API error: ' + e.message);
        render(t);
      }
    } finally {
      t.busy = false;
    }
  }

  // After you press Publish (or Ctrl+Enter) in AniList's reply box: keep checking until your
  // message shows up. AniList empties the box only when the send worked, so if the text is
  // still there after ~12 s it was not sent, and the status line says so.
  function afterPublish(box) {
    const t = T;
    if (!t || mode !== 'fast') return;
    const ta = box.querySelector('textarea');
    const sent = ta ? ta.value : '';
    if (!sent.trim()) return;
    // Done when a message newer than everything shown appears, written by you.
    const maxBefore = t.msgs.reduce((x, m) => Math.max(x, m.id), 0);
    const myId = ++t.sendSeq;
    t.sendNote = 'Sending\u2026'; t.sendBad = false; render(t);
    let tries = 0;
    const check = async () => {
      if (T !== t || t.sendSeq !== myId) return;
      tries++;
      await refreshLatest(t, true);
      if (T !== t || t.sendSeq !== myId) return;
      const cleared = !ta.isConnected || ta.value !== sent;
      if (t.msgs.some(m => m.id > maxBefore && (!me || m.uid === me))) {
        t.sendNote = ''; render(t); scrollToLatest(true); return;
      }
      if (tries < 7) { setTimeout(check, tries < 3 ? 1000 : 2500); return; }
      if (!cleared) {
        t.sendNote = 'Not sent: AniList did not accept it (your text is still in the box, press Publish again)';
        t.sendBad = true;
        setTimeout(() => { if (t.sendSeq === myId) { t.sendNote = ''; t.sendBad = false; render(t); } }, 30000);
      } else {
        t.sendNote = '';
      }
      render(t);
    };
    setTimeout(check, 700);
  }

  async function loadOlder(t) {
    if (t.olderBusy) return;
    const anchor = t.list.firstElementChild;
    const top0 = anchor ? anchor.getBoundingClientRect().top : 0;
    const keepPlace = () => { if (anchor && anchor.isConnected) window.scrollBy(0, anchor.getBoundingClientRect().top - top0); };
    // Show already-loaded ones first.
    if (t.msgs.length > t.shown) {
      t.shown = Math.min(t.msgs.length, t.shown + OLDER_STEP); render(t); keepPlace(); return;
    }
    if (!t.fresh || t.minPage <= 1) return;
    t.olderBusy = true; render(t);
    try {
      const b = t.minPage - 1, a = Math.max(1, b - 1);
      const d = await gql(Q_PAGES, { id: t.id, a, b });
      if (T !== t) return;
      const got = [...d.a.activityReplies, ...d.b.activityReplies].filter(Boolean).map(slim).filter(m => !t.byId.has(m.id));
      setMsgs(t, [...got, ...t.msgs]);
      t.minPage = a;
      t.shown = Math.min(t.msgs.length, t.shown + Math.max(got.length, 1));
      t.error = '';
    } catch (e) {
      t.error = 'Could not load older: ' + e.message;
    } finally {
      t.olderBusy = false;
      if (T === t) { render(t); keepPlace(); }
    }
  }

  async function toggleLike(t, id) {
    const m = t.byId.get(id);
    if (!m) return;
    try {
      const d = await gql(Q_LIKE, { id });
      const r = d.ToggleLikeV2;
      if (r) { m.likes = r.likeCount; m.liked = !!r.isLiked; const el = t.els.get(id); if (el) updateEl(el, m); }
    } catch (e) {
      t.error = 'Like failed: ' + e.message; render(t);
    }
  }

  // The same buttons, inserting the same codes, as AniList's own editor toolbar.
  function mdToolbar(ta, changed) {
    const bar = document.createElement('div'); bar.className = 'acv-tools';
    const put = (before, after, inner, lineStart) => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      // Header, lists and quote only work at the start of a line.
      if (lineStart && s > 0 && ta.value[s - 1] !== '\n') before = '\n' + before;
      const sel = inner != null ? inner : ta.value.slice(s, e);
      ta.setRangeText(before + sel + after, s, e, 'end');
      if (!sel) { const p = s + before.length; ta.setSelectionRange(p, p); }
      ta.focus(); changed();
    };
    const ask = (q, def) => { const v = prompt(q, def || ''); return v == null ? null : v.trim(); };
    const url = q => {
      const u = ask(q);
      if (!u) return null;
      if (!/^https?:\/\/\S+$/i.test(u)) { alert('That is not a link (it should start with http:// or https://).'); return null; }
      return u;
    };
    const selected = () => ta.value.slice(ta.selectionStart, ta.selectionEnd);
    const tools = [
      ['B', 'Bold (Ctrl+B)', () => put('__', '__'), 'font-weight:700'],
      ['I', 'Italic (Ctrl+I)', () => put('_', '_'), 'font-style:italic'],
      ['U', 'Underline (Ctrl+U)', () => put('<u>', '</u>'), 'text-decoration:underline'],
      ['S', 'Strikethrough', () => put('~~', '~~'), 'text-decoration:line-through'],
      ['Spoiler', 'Spoiler', () => put('~!', '!~')],
      ['H', 'Header', () => put('# ', '', null, true)],
      ['Link', 'Link', () => { const u = url('Link URL'); if (!u) return; const txt = ask('Link text (optional)', selected()); put('[', '](' + u + ')', txt || u); }],
      ['Img', 'Image', () => { const u = url('Image URL'); if (!u) return; const w = (ask('Width (optional, e.g. 220 or 50%)') || '').replace(/[^\d%]/g, ''); put('img' + w + '(', ')', u); }],
      ['YouTube', 'YouTube video', () => { const u = url('YouTube link'); if (u) put('youtube(', ')', u); }],
      ['WebM', 'WebM video', () => { const u = url('WebM video link'); if (u) put('webm(', ')', u); }],
      ['1.', 'Ordered list', () => put('1. ', '', null, true)],
      ['\u2022', 'Unordered list', () => put('- ', '', null, true)],
      ['Center', 'Center', () => put('~~~', '~~~')],
      ['\u201C', 'Quote', () => put('> ', '', null, true)],
      ['</>', 'Code', () => put('`', '`')],
    ];
    for (const [label, title, fn, st] of tools) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.title = title;
      if (st) b.style.cssText = st;
      b.addEventListener('mousedown', e => e.preventDefault()); // keep the text selection
      b.addEventListener('click', fn);
      bar.appendChild(b);
    }
    ta.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); put('__', '__'); }
      else if (k === 'i') { e.preventDefault(); put('_', '_'); }
      else if (k === 'u') { e.preventDefault(); put('<u>', '</u>'); }
    });
    return bar;
  }

  // Edit your own message in place (same AniList call the site's own Edit uses).
  async function startEdit(t, id) {
    const el = t.els.get(id);
    if (!el || el._editing) return;
    el._editing = true;
    const textEl = el.querySelector('.acv-text');
    const box = document.createElement('div'); box.className = 'acv-edit';
    const ta = document.createElement('textarea'); ta.value = 'Loading\u2026'; ta.disabled = true;
    const preview = document.createElement('div'); preview.className = 'acv-preview';
    let timer = 0;
    const showPreview = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (preview._vm) { try { preview._vm.$destroy(); } catch (e) {} preview._vm = null; }
        preview.textContent = '';
        if (!ta.value.trim()) return;
        const vm = mdMount(ta.value);
        if (vm) { preview._vm = vm; preview.appendChild(vm.$el); }
      }, 300);
    };
    const tools = mdToolbar(ta, showPreview);
    ta.addEventListener('input', showPreview);
    const bar = document.createElement('div'); bar.className = 'acv-edit-bar';
    const hint = document.createElement('span'); hint.className = 'acv-hint'; hint.textContent = 'Ctrl+Enter saves, Esc cancels';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
    const save = document.createElement('button'); save.type = 'button'; save.className = 'acv-save'; save.textContent = 'Save'; save.disabled = true;
    bar.append(hint, cancel, save);
    box.append(tools, ta, bar, preview);
    textEl.style.display = 'none';
    textEl.after(box);
    const close = () => {
      clearTimeout(timer);
      if (preview._vm) { try { preview._vm.$destroy(); } catch (e) {} preview._vm = null; }
      box.remove(); textEl.style.display = ''; el._editing = false;
    };
    cancel.addEventListener('click', close);
    const m0 = t.byId.get(id);
    let text = m0 && m0.md != null ? m0.md : null;
    if (text == null) {
      try {
        const d = await gql(Q_RAW, { id });
        text = (d.ActivityReply && d.ActivityReply.text) || '';
      } catch (e) {
        close(); t.error = 'Could not open for editing: ' + e.message; render(t); return;
      }
    }
    ta.value = text;
    ta.disabled = false; save.disabled = false;
    ta.style.height = Math.min(ta.scrollHeight + 4, window.innerHeight * 0.4) + 'px';
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    showPreview();
    const doSave = async () => {
      const text = ta.value;
      if (!text.trim() || save.disabled) return;
      save.disabled = true; save.textContent = 'Saving\u2026';
      try {
        const d = await gql(Q_SAVE, { id, activityId: t.id, text });
        const r = d.SaveActivityReply;
        const m = t.byId.get(id);
        if (r && m) { m.md = r.md; m.html = r.html; }
        close();
        if (m) updateEl(el, m);
        saveCache(t);
      } catch (e) {
        save.disabled = false; save.textContent = 'Save';
        hint.textContent = 'Save failed: ' + e.message;
      }
    };
    save.addEventListener('click', doSave);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); doSave(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  // Put a message into AniList's reply box as a quote ("> ..."), then a blank line for your answer.
  async function quoteMsg(t, id) {
    const m = t.byId.get(id);
    if (!m) return;
    const ta = document.querySelector('.acv-thread > .activity-edit textarea');
    if (!ta) { t.error = 'No reply box here (not logged in, or the thread is locked)'; render(t); return; }
    let md = m.md;
    if (md == null) {
      try { const d = await gql(Q_RAW, { id }); md = (d.ActivityReply && d.ActivityReply.text) || ''; }
      catch (e) { t.error = 'Could not quote: ' + e.message; render(t); return; }
    }
    const quote = md.trim().split('\n').map(l => '> ' + l).join('\n');
    const cur = ta.value;
    ta.value = (cur.trim() ? cur.replace(/\s*$/, '\n\n') : '') + quote + '\n\n';
    ta.dispatchEvent(new Event('input', { bubbles: true })); // tell AniList's box the text changed
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.scrollIntoView({ block: 'nearest' });
  }

  async function deleteMsg(t, id) {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    try {
      const d = await gql(Q_DEL, { id });
      if (d.DeleteActivityReply && d.DeleteActivityReply.deleted) {
        setMsgs(t, t.msgs.filter(m => m.id !== id));
        t.count = Math.max(0, t.count - 1);
        render(t); saveCache(t);
      }
    } catch (e) {
      t.error = 'Delete failed: ' + e.message; render(t);
    }
  }

  // ---- floating buttons -------------------------------------------------------
  let fab, newBtn, olderFullBtn, modeBtn;
  function buildFab() {
    fab = document.createElement('div');
    fab.className = 'acv-fab';
    const mk = (label, short, title, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.title = title; b.addEventListener('click', fn);
      setLabel(b, label, short);
      fab.appendChild(b); return b;
    };
    newBtn = mk('', '', 'Jump to the new messages', () => scrollToLatest(true));
    newBtn.className = 'acv-new'; newBtn.style.display = 'none';
    olderFullBtn = mk('Older', '\u22EF', 'Show or hide older replies', () => { showAllFull = !showAllFull; schedule(); });
    mk('Top', '\u2191', 'Jump to the original post', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    mk('Latest', '\u2193', 'Jump to the newest message', () => scrollToLatest(true));
    mk('Reply', '\u270E', 'Focus the reply box (Alt+R)', focusReply);
    modeBtn = mk('', '', '', () => setMode(mode === 'fast' ? 'full' : 'fast'));
    document.body.appendChild(fab);
  }
  // Full label on desktop, short icon on phones (switched by CSS).
  function setLabel(b, label, short) {
    if (b._l === label && b._s === short) return;
    b._l = label; b._s = short;
    b.textContent = '';
    const l = document.createElement('span'); l.className = 'acv-l'; l.textContent = label;
    const s = document.createElement('span'); s.className = 'acv-s'; s.textContent = short;
    b.append(l, s);
  }
  function newPill(n) {
    if (!newBtn) return;
    newBtn.style.display = n ? '' : 'none';
    setLabel(newBtn, '\u2193 ' + n + ' new', '');
  }

  function focusReply() {
    const ta = document.querySelector('.acv-thread > .activity-edit textarea');
    if (ta) { ta.focus(); ta.scrollIntoView({ block: 'nearest' }); }
  }

  function setMode(m) {
    mode = m; store.set('acv:mode', m);
    setRootClass();
    if (m === 'full') {
      // Let AniList's own list start loading: its loader only fires while it is on screen.
      setTimeout(() => {
        const sc = document.querySelector('.activity-replies > .scroller');
        if (sc) sc.scrollIntoView({ block: 'end' });
        window.dispatchEvent(new Event('scroll'));
      }, 100);
    }
    lastCount = 0; showAllFull = false;
    schedule();
  }

  // ---- AniList's own list ("Full thread" mode, the old behaviour) --------------
  let showAllFull = false;
  let lastCount = 0;
  function applyFull(thread) {
    const replies = [...thread.querySelectorAll(':scope > .reply')];
    const cut = showAllFull ? 0 : Math.max(0, replies.length - SHOW_LAST);
    replies.forEach((r, i) => r.classList.toggle('acv-hidden', i < cut));
    const hiddenTotal = Math.max(0, replies.length - SHOW_LAST);
    olderFullBtn.style.display = hiddenTotal ? '' : 'none';
    setLabel(olderFullBtn, showAllFull ? 'Hide older' : 'Older (' + hiddenTotal + ')', '\u22EF');
    if (replies.length && replies.length !== lastCount) {
      const firstLoad = lastCount === 0;
      const wasNear = nearBottom();
      lastCount = replies.length;
      if (firstLoad || wasNear) setTimeout(() => { if (activityId()) scrollToLatest(!firstLoad); }, firstLoad ? 300 : 50);
    }
  }

  // ---- main loop --------------------------------------------------------------
  let repliesObs = null, observedReplies = null;

  function teardown() {
    if (T) { closeThread(T); T = null; }
    if (repliesObs) { repliesObs.disconnect(); repliesObs = null; observedReplies = null; }
    document.querySelectorAll('.acv-thread').forEach(el => el.classList.remove('acv-thread'));
    document.querySelectorAll('.acv-hidden').forEach(el => el.classList.remove('acv-hidden'));
    if (fab) fab.style.display = 'none';
    newPill(0);
    lastCount = 0; showAllFull = false;
  }

  function apply() {
    setRootClass();
    const id = activityId();
    if (!id) {
      dbg('loaded, waiting for an /activity/ page');
      if (T || observedReplies || (fab && fab.style.display !== 'none')) teardown();
      return;
    }
    if (T && T.id !== id) teardown();
    if (!document.body) return;
    if (!fab) buildFab();

    const entries = document.querySelectorAll('.activity-entry');
    if (entries.length !== 1) { dbg('activity ' + id + ': waiting for the post (' + entries.length + ' found)'); return; } // a direct page has exactly one entry
    const wrap = entries[0].querySelector('.reply-wrap');
    if (!wrap) { dbg('activity ' + id + ': waiting for the replies area'); return; }
    if (!T || !T.fresh) dbg('activity ' + id + ': loading replies');
    const thread = wrap.querySelector('.activity-replies');

    document.querySelectorAll('.acv-thread').forEach(el => { if (el !== thread) el.classList.remove('acv-thread'); });
    if (thread) thread.classList.add('acv-thread');
    fab.style.display = 'flex';
    setLabel(modeBtn, mode === 'fast' ? 'Full thread' : 'Fast view', mode === 'fast' ? 'All' : 'Fast');
    modeBtn.title = mode === 'fast'
      ? 'Switch to AniList\'s own list (loads the whole thread)'
      : 'Back to the fast view (newest messages only)';

    if (mode === 'fast') {
      olderFullBtn.style.display = 'none';
      if (thread) thread.querySelectorAll(':scope > .acv-hidden').forEach(el => el.classList.remove('acv-hidden'));
      if (!T) {
        T = openThread(id);
        askMe();
        if (T.msgs.length) render(T);
        refreshLatest(T);
      }
      if (T.panel.parentNode !== wrap || wrap.firstChild !== T.panel) wrap.insertBefore(T.panel, wrap.firstChild);
      if (T.msgs.length && !T.scrolled) { T.scrolled = true; render(T); scrollToLatest(false); }
      // After you send with AniList's reply box it rebuilds its loader: fetch the new message.
      if (thread && thread !== observedReplies) {
        if (repliesObs) repliesObs.disconnect();
        observedReplies = thread;
        repliesObs = new MutationObserver(muts => {
          if (muts.some(mu => [...mu.addedNodes].some(n => n.classList && n.classList.contains('scroller')))) {
            setTimeout(() => { if (T) refreshLatest(T, true); }, 700);
          }
        });
        repliesObs.observe(thread, { childList: true });
      }
    } else {
      if (T) { closeThread(T); T = null; }
      newPill(0);
      if (thread) applyFull(thread);
    }
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    // setTimeout (not requestAnimationFrame) so it still runs in background tabs.
    setTimeout(() => { queued = false; safeApply(); }, 50);
  }
  function safeApply() {
    try { apply(); } catch (e) { dbg('error: ' + ((e && e.message) || e)); }
  }

  function start() {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    safeApply();
  }

  // React straight away when AniList switches pages without a reload (also sets the
  // "park the loader" class before AniList draws the new page). From the sandbox this hook
  // can't see AniList's page switches; the page observer above still catches them a moment later.
  if (!SANDBOX) {
    try {
      for (const fn of ['pushState', 'replaceState']) {
        const orig = history[fn];
        history[fn] = function () { const r = orig.apply(this, arguments); setRootClass(); schedule(); return r; };
      }
    } catch (e) {}
  }
  window.addEventListener('popstate', () => { setRootClass(); schedule(); });

  // Poll for new messages while the page is visible; check at once when you come back.
  setInterval(() => { if (T && mode === 'fast' && document.visibilityState === 'visible') refreshLatest(T); }, POLL_MS);
  document.addEventListener('visibilitychange', () => { if (T && document.visibilityState === 'visible') refreshLatest(T); });
  setInterval(() => { if (T) T.els.forEach((el, id) => { const m = T.byId.get(id); if (m) updateEl(el, m); }); }, 60000);

  // Publish in AniList's reply box (a mouse click, or the Ctrl+Enter below, which clicks it too).
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.acv-thread > .activity-edit .actions .button.save');
    if (btn && activityId()) afterPublish(btn.closest('.activity-edit'));
  }, true);

  document.addEventListener('keydown', (e) => {
    if (!activityId()) return;
    if (e.altKey && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); focusReply(); return; }
    // Ctrl+Enter (Cmd+Enter on Mac) in the reply box presses AniList's Publish button.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.closest && e.target.closest('.acv-thread > .activity-edit')) {
      const btn = e.target.closest('.activity-edit').querySelector('.actions .button.save');
      if (btn) { e.preventDefault(); btn.click(); }
    }
  }, true);

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();

// ==UserScript==
// @name         AniList DMs
// @namespace    exos.anilist.dms
// @author       YoruC
// @version      1.3.4
// @description  Your private AniList message conversations as DMs: a chat button bottom right, newest messages, a red number for new ones, live preview, emojis, likes, reply / edit / delete. Add conversations with +.
// @homepageURL  https://github.com/YoruCAnime/Anilist/tree/main/dms
// @updateURL    https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/dms/anilist-dms.user.js
// @downloadURL  https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/dms/anilist-dms.user.js
// @match        https://anilist.co/*
// @grant        none
// @inject-into  page
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  if (window.__admLoaded) return;
  window.__admLoaded = true;

  // ---- settings ---------------------------------------------------------------
  const SHOW_LAST = 10;        // newest messages shown when a conversation opens
  const OLDER_STEP = 20;       // how many more each "Show older" click shows
  const PER = 25;              // replies per AniList page
  const OPEN_POLL_MS = 12000;  // the open conversation checks for new messages this often (tab visible)
  const POLL_MS = 45000;       // every conversation's red dot is checked this often (one check shared by all AniList tabs)
  const CACHE_KEEP = 40;       // messages remembered per conversation for instant opening
  const GROUP_GAP = 600;       // seconds: back-to-back messages by the same person closer than this share one name / picture

  const VERSION = '1.3.4'; // the same as @version above
  // YoruC's conversations: on the first start they are added for whoever is IN them (the two people of each),
  // nobody else (AniList doesn't show private messages to others, and the script checks you are one of the two).
  const DEFAULT_THREADS = [1191588367, 1186054861];
  const REPO_RAW = 'https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/dms/'; // refs/heads: no 5-min CDN cache

  // ---- small helpers ----------------------------------------------------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const touch = matchMedia('(pointer: coarse)').matches;
  const ui = Object.assign({ open: false, thread: 0, big: false, enterSends: !touch, smartPaste: true, preview: true, min: false, sound: true, soundPick: 'new', volume: 0.15, textSize: 1 }, store.get('adm:ui', {}));
  const saveUi = () => store.set('adm:ui', ui);
  let info = store.get('adm:info', {});
  // your conversations (1.0 / 1.1 only saved the list once you changed it: take it from what they remembered)
  let threads = store.get('adm:threads', null) || Object.keys(info).map(Number).filter(Boolean);
  store.set('adm:threads', threads);   // id -> {kind, other{id,name,av}, count, lastT, lastUid, snip, locked, origin}
  let seen = store.get('adm:seen', {});   // id -> newest reply id you have seen
  let me = store.get('adm:me', 0);

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'style') n.style.cssText = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
    return n;
  }
  const avStyle = url => url ? 'background-image:url("' + String(url).replace(/"/g, '%22') + '")' : '';

  // Emojis are saved as &#NNNNN; codes (the way older AniList posts store them) and turned back for editing.
  const encEmoji = s => s.replace(/[\u{10000}-\u{10FFFF}]/gu, c => '&#' + c.codePointAt(0) + ';');
  const decEmoji = s => (s || '').replace(/&#(\d{5,7});/g, (m, n) => { const c = +n; return c > 0xFFFF && c <= 0x10FFFF ? String.fromCodePoint(c) : m; });

  function snip(md) {
    const s = decEmoji(md || '')
      .replace(/&#x?[0-9a-f]+;/gi, m => { try { return String.fromCodePoint(/x/i.test(m) ? parseInt(m.slice(3), 16) : +m.slice(2, -1)); } catch (e) { return m; } })
      .replace(/^\s*>.*$/gm, '')
      .replace(/img\d*%?\s*\([^)]*\)/gi, ' 🖼 picture ')
      .replace(/webm\s*\([^)]*\)/gi, ' 🎞 video ')
      .replace(/youtube\s*\([^)]*\)/gi, ' ▶ YouTube ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/~!|!~|~~~|__|\*\*|~~|`/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ').trim();
    return s.length > 90 ? s.slice(0, 88) + '…' : (s || '…');
  }

  function ago(sec) {
    const d = Date.now() / 1000 - sec;
    if (d < 60) return 'now';
    if (d < 3600) return Math.floor(d / 60) + 'm';
    if (d < 86400) return Math.floor(d / 3600) + 'h';
    if (d < 7 * 86400) return Math.floor(d / 86400) + 'd';
    return new Date(sec * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  const clock = sec => new Date(sec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  function dayLabel(sec) {
    const d = new Date(sec * 1000), t = new Date();
    const key = x => x.getFullYear() * 400 + x.getMonth() * 32 + x.getDate();
    const y = new Date(t); y.setDate(t.getDate() - 1);
    if (key(d) === key(t)) return 'Today';
    if (key(d) === key(y)) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() !== t.getFullYear() ? 'numeric' : undefined });
  }

  // ---- AniList API (the site's own endpoint and login, like Chat View) --------
  function token() {
    if (window.al_token) return window.al_token;
    for (const s of document.scripts) {
      const m = !s.src && s.textContent.match(/al_token\s*=\s*"([^"]+)"/);
      if (m) return m[1];
    }
    return '';
  }
  let pauseUntil = 0;
  async function gql(query, variables) {
    if (Date.now() < pauseUntil) throw new Error('AniList asked to slow down, trying again in a minute');
    const r = await fetch('/graphql', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-csrf-token': token() },
      body: JSON.stringify({ query, variables }),
    });
    if (r.status === 429) {
      pauseUntil = Date.now() + 1000 * +(r.headers.get('Retry-After') || 60);
      throw new Error('AniList asked to slow down, trying again in a minute');
    }
    const j = await r.json();
    if (!j.data || (j.errors && j.errors.length && !Object.values(j.data).some(Boolean))) {
      throw new Error((j.errors && j.errors[0] && j.errors[0].message) || 'HTTP ' + r.status);
    }
    return j.data;
  }

  const U = 'id name avatar{medium}';
  const F = `id createdAt likeCount isLiked md:text html:text(asHtml:true) user{${U}} likes{${U}}`;
  const ACT = `... on MessageActivity{id replyCount isLocked isPrivate createdAt likeCount isLiked md:message html:message(asHtml:true)
      messenger{${U}} recipient{${U}} likes{${U}}}
    ... on TextActivity{id replyCount isLocked createdAt likeCount isLiked md:text html:text(asHtml:true) user{${U}} likes{${U}}}`;
  const ACT_COUNT = '... on MessageActivity{id replyCount} ... on TextActivity{id replyCount} ... on ListActivity{id replyCount}';
  const Q_ME = 'query{Viewer{id}}';
  const Q_SEND = `mutation($a:Int,$t:String){SaveActivityReply(activityId:$a,text:$t){${F}}}`;
  const Q_SAVE = `mutation($id:Int,$a:Int,$t:String){SaveActivityReply(id:$id,activityId:$a,text:$t){${F}}}`;
  const Q_DEL = 'mutation($id:Int){DeleteActivityReply(id:$id){deleted}}';
  const Q_LIKE = `mutation($id:Int,$type:LikeableType){ToggleLikeV2(id:$id,type:$type){
    ... on ActivityReply{id likeCount isLiked likes{${U}}}
    ... on MessageActivity{id likeCount isLiked likes{${U}}}
    ... on TextActivity{id likeCount isLiked likes{${U}}}}}`;

  const likersOf = r => (r.likes || []).filter(Boolean).map(u => ({ id: u.id, name: u.name, av: u.avatar ? u.avatar.medium : '' }));
  const person = u => u ? { id: u.id, name: u.name, av: u.avatar ? u.avatar.medium : '' } : { id: 0, name: '?', av: '' };
  const slim = r => ({ id: r.id, t: r.createdAt, likes: r.likeCount, liked: !!r.isLiked, likers: likersOf(r), md: r.md, html: r.html,
                       uid: r.user ? r.user.id : 0, name: r.user ? r.user.name : '?', av: r.user && r.user.avatar ? r.user.avatar.medium : '' });

  // The conversation's first post and the other person.
  function metaOf(a) {
    if (!a) return null;
    const msg = !!a.messenger;
    const from = person(msg ? a.messenger : a.user);
    const to = msg ? person(a.recipient) : null;
    return {
      kind: msg ? 'message' : 'status', private: !!a.isPrivate, locked: !!a.isLocked, count: a.replyCount || 0, from, to,
      origin: { id: a.id, t: a.createdAt, likes: a.likeCount, liked: !!a.isLiked, likers: likersOf(a), md: a.md, html: a.html,
                uid: from.id, name: from.name, av: from.av, origin: true, type: msg ? 'MESSAGE' : 'TEXT' },
    };
  }

  // the person you talk with (worked out when shown, so it is right even before your own id is known)
  function otherOf(i) {
    if (!i || !i.from) return null;
    if (!i.to) return i.from;
    return i.from.id === me ? i.to : i.from;
  }

  async function askMe() {
    try {
      const d = await gql(Q_ME);
      if (d.Viewer && d.Viewer.id && d.Viewer.id !== me) { me = d.Viewer.id; store.set('adm:me', me); renderAll(); }
    } catch (e) {}
  }

  // ---- AniList's own text formatter --------------------------------------------
  // The site's "Markdown" component (anime cards, @mentions, spoilers, YouTube, webm, centre, img sizes...),
  // found through the router so it works on every page, not only on activity pages.
  let MdC = null, rootVm = null;
  function findMarkdown() {
    const app = document.querySelector('#app');
    rootVm = app && app.__vue__;
    if (!rootVm) return null;
    try {
      const start = rootVm.$router.getMatchedComponents('/activity/1')[0];
      const seenC = new Set(), q = [start];
      while (q.length) {
        const c = q.shift();
        if (!c || seenC.has(c)) continue;
        seenC.add(c);
        const o = c.options || c;
        for (const [k, s] of Object.entries(o.components || {})) {
          if (k === 'Markdown') return typeof s === 'function' ? s : rootVm.$options._base.extend(s);
          q.push(s);
        }
      }
    } catch (e) {}
    const any = document.querySelector('.markdown');
    return any && any.__vue__ && any.__vue__.$options.props && any.__vue__.$options.props.markdown ? any.__vue__.constructor : null;
  }
  function mdMount(md) {
    try {
      if (!MdC || !rootVm || rootVm._isDestroyed) MdC = findMarkdown();
      if (!MdC) return null;
      return new MdC({ parent: rootVm, propsData: { markdown: md } }).$mount();
    } catch (e) { return null; }
  }
  // Fallback when the formatter can't be found: AniList's server copy, cleaned.
  function cleanHtml(html) {
    const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    const box = doc.body.firstElementChild;
    box.querySelectorAll('script,style,iframe,object,embed,form,link,meta,base').forEach(n => n.remove());
    box.querySelectorAll('*').forEach(n => {
      for (const at of [...n.attributes]) {
        const nm = at.name.toLowerCase();
        if (nm.startsWith('on') || (/^(href|src|xlink:href|action|formaction)$/.test(nm) && /^\s*(javascript|data:text)/i.test(at.value))) n.removeAttribute(at.name);
      }
    });
    box.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    return box;
  }
  function fillText(box, md, html) {
    if (box._vm) { try { box._vm.$destroy(); } catch (e) {} box._vm = null; }
    box.querySelectorAll('video').forEach(unwatchVideo);
    box.textContent = '';
    const vm = md != null ? mdMount(md) : null;
    const node = vm ? vm.$el : cleanHtml(html);
    // In the chat a video is a quiet looping preview that only plays while you can see it (not scrolled away,
    // not minimized), so a long chat never keeps several videos running (a click opens it big with controls).
    node.querySelectorAll('video').forEach(v => {
      v.autoplay = false; v.removeAttribute('autoplay'); v.removeAttribute('controls');
      v.muted = true; v.loop = true; v.preload = 'metadata'; v.title = 'Click to watch big';
      watchVideo(v);
    });
    if (vm) { box._vm = vm; box.appendChild(node); }
    else box.append(...node.childNodes);
  }
  let vidIO = null;
  function watchVideo(v) {
    vidIO = vidIO || new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && document.visibilityState === 'visible') e.target.play().catch(() => {});
      else e.target.pause();
    }), { threshold: 0.2 });
    vidIO.observe(v);
  }
  function unwatchVideo(v) { if (vidIO) vidIO.unobserve(v); try { v.pause(); } catch (e) {} }
  function dropVms(root) {
    root.querySelectorAll('.adm-text, .adm-preview').forEach(b => { if (b._vm) { try { b._vm.$destroy(); } catch (e) {} b._vm = null; } });
    root.querySelectorAll('.adm-text video').forEach(unwatchVideo);
  }

  // ---- styles -------------------------------------------------------------------
  const Z = 2147482000; // under the GIF Picker (2147483000) and the Grammar Helper
  const css = `
  .adm-root { position: fixed; right: 18px; bottom: 18px; z-index: ${Z}; font-family: Overpass, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .adm-launch { position: relative; width: 46px; height: 46px; border-radius: 50%; border: 0; cursor: pointer; padding: 0;
    background: rgb(var(--color-foreground, 21,31,46)); color: rgb(var(--color-blue, 61,180,242));
    box-shadow: 0 4px 14px rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; transition: transform .15s; }
  .adm-launch:hover { transform: scale(1.07); }
  .adm-launch svg { width: 24px; height: 24px; }
  .adm-dot { position: absolute; top: -3px; right: -3px; min-width: 19px; height: 19px; padding: 0 5px; box-sizing: border-box; border-radius: 10px;
    background: rgb(var(--color-red, 232,93,117)); color: #fff; font: 700 11px/19px Overpass, sans-serif; text-align: center;
    box-shadow: 0 0 0 2px rgb(var(--color-background, 11,22,34)); }
  .adm-dot:empty, .adm-dot[hidden] { display: none; }
  .adm-launch.adm-has { animation: adm-pulse 2.2s ease-in-out 3; }
  @keyframes adm-pulse { 50% { box-shadow: 0 0 0 7px rgba(var(--color-red, 232,93,117), .25), 0 4px 14px rgba(0,0,0,.35); } }

  .adm-panel { position: absolute; right: 0; bottom: 58px; width: var(--adm-w, 390px); height: var(--adm-h, min(600px, calc(100vh - 100px)));
    max-width: calc(100vw - 16px); max-height: calc(100vh - 16px);
    display: flex; flex-direction: column; overflow: hidden; border-radius: 12px;
    background: rgb(var(--color-foreground, 21,31,46)); color: rgb(var(--color-text, 159,173,189));
    box-shadow: 0 10px 40px rgba(0,0,0,.45), 0 0 0 1px rgba(var(--color-text, 159,173,189), .08); font-size: 14px; }
  .adm-panel[hidden] { display: none; }
  .adm-big .adm-panel { width: min(760px, calc(100vw - 36px)); height: calc(100vh - 100px); }
  /* minimized: only the top bar stays (click it again to open) */
  .adm-head { cursor: pointer; user-select: none; }
  /* minimized = hidden completely; the round chat button brings it back exactly as it was */
  .adm-min .adm-panel { display: none !important; }
  /* moved by dragging the top bar: fixed where you put it */
  .adm-free .adm-panel { position: fixed; left: var(--adm-x, 0); top: var(--adm-y, 0); right: auto; bottom: auto; }
  .adm-dragging, .adm-dragging * { user-select: none !important; }
  .adm-dragging .adm-panel { box-shadow: 0 16px 50px rgba(0,0,0,.55), 0 0 0 1px rgba(var(--color-blue, 61,180,242), .5); }
  /* resize: every edge and corner; the top-left corner shows a small grip */
  .adm-rz { position: absolute; z-index: 6; }
  .adm-rz-n, .adm-rz-s { left: 12px; right: 12px; height: 6px; cursor: ns-resize; }
  .adm-rz-n { top: 0; } .adm-rz-s { bottom: 0; }
  .adm-rz-e, .adm-rz-w { top: 12px; bottom: 12px; width: 6px; cursor: ew-resize; }
  .adm-rz-e { right: 0; } .adm-rz-w { left: 0; }
  .adm-rz-nw, .adm-rz-ne, .adm-rz-sw, .adm-rz-se { width: 14px; height: 14px; }
  .adm-rz-nw { top: 0; left: 0; cursor: nwse-resize; } .adm-rz-se { bottom: 0; right: 0; cursor: nwse-resize; }
  .adm-rz-ne { top: 0; right: 0; cursor: nesw-resize; } .adm-rz-sw { bottom: 0; left: 0; cursor: nesw-resize; }
  .adm-rz-nw::after { content: ''; position: absolute; left: 4px; top: 4px; width: 7px; height: 7px; border-radius: 2px 0 0 0;
    border-left: 2px solid rgba(var(--color-text, 159,173,189), .45); border-top: 2px solid rgba(var(--color-text, 159,173,189), .45); }
  .adm-rz-nw:hover::after { border-color: rgb(var(--color-blue, 61,180,242)); }
  .adm-panel *, .adm-emoji * { scrollbar-width: thin; scrollbar-color: rgba(var(--color-text, 159,173,189), .35) transparent; }
  .adm-head { flex: none; display: flex; align-items: center; gap: 8px; padding: 9px 10px 9px 14px; min-height: 30px;
    background: rgb(var(--color-background, 11,22,34)); }
  .adm-title { flex: 1; min-width: 0; font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px; overflow: hidden; }
  .adm-title a { color: inherit; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .adm-title a:hover { color: rgb(var(--color-blue)); }
  .adm-hb { flex: none; border: 0; background: none; color: inherit; cursor: pointer; width: 28px; height: 28px; border-radius: 6px;
    font-size: 16px; line-height: 28px; padding: 0; text-align: center; text-decoration: none; opacity: .75; }
  .adm-hb:hover { opacity: 1; background: rgba(var(--color-text), .1); color: rgb(var(--color-blue)); }
  .adm-upd { opacity: 1; font-weight: 700; color: #fff !important; background: rgb(var(--color-green, 123,213,85)) !important;
    width: 24px; height: 24px; line-height: 24px; border-radius: 50%; font-size: 14px; animation: adm-upd 1.6s ease-in-out 4; }
  @keyframes adm-upd { 50% { box-shadow: 0 0 0 6px rgba(var(--color-green, 123,213,85), .3); } }
  .adm-av { flex: none; width: 34px; height: 34px; border-radius: 50%; background: rgba(var(--color-text), .12) center / cover no-repeat; display: block; }
  .adm-head .adm-av { width: 28px; height: 28px; }

  .adm-list { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
  .adm-row { display: flex; align-items: center; gap: 11px; padding: 10px 14px; cursor: pointer; position: relative; }
  .adm-row:hover { background: rgba(var(--color-text), .06); }
  .adm-row .adm-av { width: 42px; height: 42px; }
  .adm-rb { flex: 1; min-width: 0; }
  .adm-rt { display: flex; gap: 8px; align-items: baseline; }
  .adm-rn { flex: 1; font-size: calc(14px * var(--adm-fs, 1)); font-weight: 700; color: rgb(var(--color-text)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .adm-rtime { font-size: calc(12px * var(--adm-fs, 1)); opacity: .6; }
  .adm-rs { font-size: calc(13px * var(--adm-fs, 1)); opacity: .75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .adm-row.adm-unread .adm-rs { opacity: 1; color: rgb(var(--color-text)); font-weight: 600; }
  .adm-row .adm-dot { position: static; flex: none; }
  .adm-x { position: absolute; right: 6px; top: 4px; display: none; font-size: 13px; opacity: .6; border: 0; background: none; color: inherit; cursor: pointer; padding: 2px 6px; }
  .adm-row:hover .adm-x { display: block; }
  .adm-x:hover { opacity: 1; color: rgb(var(--color-red)); }
  .adm-ask { display: flex; gap: 6px; align-items: center; font-size: 13px; }
  .adm-empty { padding: 26px 18px; text-align: center; opacity: .7; line-height: 1.6; }
  .adm-form { padding: 10px 14px; display: flex; flex-direction: column; gap: 7px; background: rgba(var(--color-text), .05); }
  .adm-form input { font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(var(--color-text), .2);
    background: rgb(var(--color-background)); color: rgb(var(--color-text)); outline: none; }
  .adm-form input:focus { border-color: rgb(var(--color-blue)); }
  .adm-form .adm-note { font-size: 12px; opacity: .7; }
  .adm-form .adm-note.adm-bad { color: rgb(var(--color-red)); opacity: 1; }
  .adm-btns { display: flex; gap: 6px; justify-content: flex-end; }
  .adm-sug { margin: -2px -14px 4px; max-height: 300px; overflow-y: auto; }
  .adm-sug > .adm-note { padding: 0 14px 4px; }
  .adm-srow { padding: 7px 14px; }
  .adm-srow .adm-av { width: 34px; height: 34px; }
  .adm-plus { flex: none; font-size: 20px; font-weight: 700; color: rgb(var(--color-blue)); opacity: .7; padding: 0 4px; }
  .adm-srow:hover .adm-plus { opacity: 1; }
  .adm-btn { font: inherit; font-size: 13px; padding: 6px 13px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(var(--color-text), .18);
    background: rgb(var(--color-background)); color: rgb(var(--color-text)); }
  .adm-btn:hover { color: rgb(var(--color-blue)); }
  .adm-btn.adm-pri { background: rgb(var(--color-blue)); border-color: transparent; color: #fff; }
  .adm-btn.adm-pri:hover { filter: brightness(1.1); color: #fff; }
  .adm-btn[disabled] { opacity: .55; cursor: default; }
  .adm-menu { padding: 6px 14px 10px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; background: rgba(var(--color-text), .05); }
  .adm-menu label { display: flex; gap: 8px; align-items: center; cursor: pointer; }
  .adm-size { display: flex; align-items: center; gap: 6px; }
  .adm-size .adm-btn { min-width: 34px; height: 30px; padding: 0 8px; font-weight: 700; line-height: 1; }
  .adm-vol { display: flex; align-items: center; gap: 8px; margin: 4px 0 2px 22px; }
  .adm-vol input[type=range] { flex: 1; accent-color: rgb(var(--color-blue)); }
  .adm-vol .adm-btn { padding: 2px 9px; }
  .adm-pick { flex-wrap: wrap; }
  .adm-soundsel { flex: 1; min-width: 90px; font: inherit; font-size: 13px; padding: 2px 4px; border-radius: 6px; border: 1px solid rgba(var(--color-text), .18);
    background: rgb(var(--color-background)); color: rgb(var(--color-text)); }
  .adm-soundnote { font-size: 12px; }

  .adm-convo { flex: 1; min-height: 0; display: flex; flex-direction: column; position: relative; }
  .adm-scroll { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 8px 10px 6px; }
  .adm-older { display: flex; justify-content: center; gap: 6px; margin: 2px 0 8px; }
  .adm-older .adm-btn { font-size: 12px; padding: 4px 11px; border-radius: 14px; }
  .adm-status { text-align: center; font-size: 12px; opacity: .65; margin: 4px 0; }
  .adm-status.adm-bad { color: rgb(var(--color-red)); opacity: 1; }
  .adm-day { text-align: center; font-size: calc(11.5px * var(--adm-fs, 1)); opacity: .6; margin: 10px 0 6px; font-weight: 600; letter-spacing: .02em; }
  .adm-m { display: flex; gap: 8px; align-items: flex-end; margin-top: 8px; }
  .adm-m.adm-cont { margin-top: 2px; }
  .adm-m .adm-av { width: 30px; height: 30px; }
  .adm-m.adm-cont .adm-av { visibility: hidden; height: 0; }
  .adm-m.adm-mine { flex-direction: row-reverse; }
  .adm-m.adm-mine .adm-av { display: none; }
  .adm-b { position: relative; max-width: 82%; min-width: 60px; padding: 7px 11px 6px; border-radius: 14px;
    background: rgba(var(--color-text), .09); }
  .adm-m:not(.adm-mine) .adm-b { border-bottom-left-radius: 4px; }
  .adm-mine .adm-b { background: rgba(var(--color-blue), .2); border-bottom-right-radius: 4px; }
  .adm-m.adm-cont:not(.adm-mine) .adm-b { margin-left: 0; }
  .adm-origin .adm-b { border: 1px dashed rgba(var(--color-text), .25); }
  .adm-meta { display: flex; gap: 8px; align-items: baseline; font-size: calc(12px * var(--adm-fs, 1)); margin-bottom: 2px; }
  .adm-meta .adm-n { font-weight: 700; color: rgb(var(--color-blue)); text-decoration: none; }
  .adm-cont .adm-meta .adm-n, .adm-mine .adm-meta .adm-n { display: none; }
  .adm-meta .adm-tm { opacity: .55; margin-left: auto; }
  .adm-text { font-size: calc(14.5px * var(--adm-fs, 1)); line-height: 1.5; overflow-wrap: anywhere; color: rgb(var(--color-text)); }
  .adm-text .markdown { overflow-wrap: anywhere; }
  .adm-text .markdown, .adm-preview .markdown { font-size: inherit; } /* follows Text size */
  .adm-text p, .adm-preview p { margin: 0 0 4px; }
  .adm-text p:last-child { margin-bottom: 0; }
  .adm-text img, .adm-text video, .adm-preview img, .adm-preview video { max-width: 100%; height: auto; border-radius: 6px; }
  .adm-text lite-youtube, .adm-text .youtube, .adm-preview lite-youtube, .adm-preview .youtube {
    display: block; width: 340px; max-width: 100% !important; aspect-ratio: 16 / 9; height: auto; border-radius: 6px; overflow: hidden; }
  .adm-big .adm-text lite-youtube, .adm-big .adm-text .youtube { width: 480px; }
  .adm-text img, .adm-text video { cursor: zoom-in; }
  .adm-lb { position: fixed; inset: 0; z-index: ${Z + 50}; background: rgba(5, 8, 14, .88); display: flex; align-items: center; justify-content: center;
    animation: adm-fade .15s ease-out; }
  @keyframes adm-fade { from { opacity: 0; } }
  .adm-lb-media { max-width: 92vw; max-height: 88vh; object-fit: contain; border-radius: 6px; box-shadow: 0 10px 50px rgba(0,0,0,.6); background: #000; }
  img.adm-lb-media { background: none; }
  video.adm-lb-media { width: min(92vw, 1280px); height: auto; }
  .adm-lb-x { position: absolute; top: 16px; right: 16px; border: 0; cursor: pointer; color: #fff; background: rgba(255,255,255,.14); border-radius: 50%;
    width: 44px; height: 44px; font: 400 28px/44px Overpass, sans-serif; padding: 0; text-align: center; }
  .adm-lb-x:hover { background: rgba(255,255,255,.28); }
  @media (max-width: 760px) { .adm-lb-media { max-width: 100vw; max-height: 82vh; border-radius: 0; } video.adm-lb-media { width: 100vw; } }
  .adm-text blockquote { margin: 4px 0; padding-left: 8px; border-left: 3px solid rgba(var(--color-text), .3); opacity: .85; }
  .adm-acts { display: none; position: absolute; top: -13px; gap: 2px; padding: 2px 4px; border-radius: 12px; z-index: 2;
    background: rgb(var(--color-background)); box-shadow: 0 2px 8px rgba(0,0,0,.35); font-size: 12px; white-space: nowrap; }
  .adm-m:not(.adm-mine) .adm-acts { right: 6px; }
  .adm-mine .adm-acts { left: 6px; }
  .adm-b:hover .adm-acts, .adm-b.adm-tap .adm-acts { display: flex; }
  .adm-act { cursor: pointer; padding: 2px 6px; border-radius: 8px; opacity: .8; user-select: none; }
  .adm-act:hover { opacity: 1; color: rgb(var(--color-blue)); background: rgba(var(--color-text), .08); }
  .adm-act.adm-own { display: none; }
  .adm-mine .adm-act.adm-own { display: inline; }
  .adm-act.adm-del:hover { color: rgb(var(--color-red)); }
  .adm-heart { position: absolute; bottom: -9px; font-size: 11px; padding: 0 6px; border-radius: 10px; line-height: 17px; cursor: pointer;
    background: rgb(var(--color-background)); box-shadow: 0 1px 4px rgba(0,0,0,.3); color: rgb(var(--color-red)); white-space: nowrap; }
  .adm-m:not(.adm-mine) .adm-heart { right: 8px; }
  .adm-mine .adm-heart { left: 8px; }
  .adm-m.adm-liked-row { margin-bottom: 8px; }
  .adm-edit textarea { display: block; width: 100%; box-sizing: border-box; min-height: 80px; max-height: 40vh; resize: vertical; font: inherit; font-size: calc(14px * var(--adm-fs, 1));
    padding: 7px 9px; border-radius: 6px; border: 1px solid rgba(var(--color-text), .25); background: rgb(var(--color-background)); color: rgb(var(--color-text)); }
  .adm-edit .adm-btns { margin-top: 5px; }
  .adm-confirm { display: flex; gap: 6px; align-items: center; justify-content: flex-end; margin-top: 5px; font-size: 12.5px; }

  .adm-newpill { position: absolute; left: 50%; transform: translateX(-50%); bottom: 8px; z-index: 3; border: 0; border-radius: 14px; padding: 5px 13px;
    background: rgb(var(--color-blue)); color: #fff; font: 600 12.5px Overpass, sans-serif; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.35); }
  .adm-newpill[hidden] { display: none; }
  .adm-compose { flex: none; padding: 6px 10px 9px; background: rgb(var(--color-background)); position: relative; }
  .adm-tools.markdown-editor { display: flex !important; flex-wrap: wrap; gap: 3px; margin: 0 0 5px !important; padding: 0 !important; grid-template-columns: none !important; }
  .adm-tools > * { flex: none; }
  .adm-tb { min-width: 28px; height: 26px; padding: 0 6px; font: 600 12.5px/26px Overpass, sans-serif; cursor: pointer; border-radius: 5px;
    border: 1px solid rgba(var(--color-text), .14); background: rgb(var(--color-foreground)); color: rgb(var(--color-text)); }
  .adm-tb:hover, .adm-tb.adm-on { color: rgb(var(--color-blue)); border-color: rgba(var(--color-blue), .5); }
  .adm-tools > .gp-btn { height: 26px; min-width: 34px; padding: 0 6px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border-radius: 5px; cursor: pointer; }
  .adm-more[hidden] { display: none !important; }
  .adm-ta { display: block; width: 100%; box-sizing: border-box; min-height: 42px; max-height: 38vh; resize: none; font: inherit; font-size: calc(14.5px * var(--adm-fs, 1)); line-height: 1.45;
    padding: 9px 11px; border-radius: 10px; border: 1px solid rgba(var(--color-text), .18); outline: none;
    background: rgb(var(--color-foreground)); color: rgb(var(--color-text)); }
  .adm-ta:focus { border-color: rgba(var(--color-blue), .7); }
  .adm-send-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 12px; }
  .adm-hint { flex: 1; opacity: .55; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .adm-hint.adm-bad { color: rgb(var(--color-red)); opacity: 1; white-space: normal; }
  /* live preview under the box (like AniList's own comment box): pictures, GIFs, videos, YouTube, formatting */
  .adm-preview { max-height: min(34vh, 260px); overflow: auto; margin-top: 6px; padding: 6px 10px 8px; border-radius: 10px;
    border: 1px dashed rgba(var(--color-text), .25); font-size: calc(14px * var(--adm-fs, 1)); line-height: 1.5; color: rgb(var(--color-text)); overflow-wrap: anywhere; }
  .adm-big .adm-preview { max-height: 40vh; }
  .adm-preview::before { content: 'Preview'; display: block; font-size: 11px; font-weight: 600; opacity: .5; margin-bottom: 3px; letter-spacing: .03em; }
  .adm-preview:empty, .adm-preview[hidden] { display: none; }
  .adm-edit .adm-preview { max-height: 30vh; }
  .adm-emoji { position: absolute; left: 8px; right: 8px; bottom: calc(100% + 4px); height: 250px; display: flex; flex-direction: column; border-radius: 10px; overflow: hidden;
    background: rgb(var(--color-background)); box-shadow: 0 6px 24px rgba(0,0,0,.45), 0 0 0 1px rgba(var(--color-text), .1); z-index: 4; }
  .adm-emoji[hidden] { display: none; }
  .adm-etabs { flex: none; display: flex; overflow-x: auto; gap: 2px; padding: 4px; border-bottom: 1px solid rgba(var(--color-text), .1); }
  .adm-etab { flex: none; border: 0; background: none; cursor: pointer; font-size: 17px; padding: 3px 6px; border-radius: 6px; color: inherit; }
  .adm-etab.adm-on { background: rgba(var(--color-blue), .22); }
  .adm-egrid { flex: 1; overflow-y: auto; padding: 4px; display: grid; grid-template-columns: repeat(auto-fill, minmax(34px, 1fr)); gap: 1px; align-content: start; }
  .adm-egrid.adm-kao { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
  .adm-e { border: 0; background: none; cursor: pointer; font-size: 21px; height: 34px; border-radius: 6px; padding: 0; color: inherit;
    font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; }
  .adm-kao .adm-e { font-size: 13px; font-family: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .adm-e:hover { background: rgba(var(--color-text), .12); }

  /* phones: above AniList's own round menu button (bottom right) */
  @media (max-width: 760px) {
    .adm-root { right: 12px; bottom: 66px; }
    .adm-launch { width: 42px; height: 42px; }
    .adm-panel, .adm-big .adm-panel { position: fixed; left: 6px; right: 6px; top: 56px; bottom: 116px; width: auto; height: auto; }
    .adm-rz { display: none; }
    .adm-b { max-width: 88%; }
  }`;

  // ---- emoji lists ----------------------------------------------------------------
  const EMOJI = [
    ['😀', 'Smileys', '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾'],
    ['👋', 'Hands and people', '👋 🤚 🖐️ ✋ 🖖 🫱 🫲 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 👀 👁️ 👅 👄 🫦 🧠 🫀 🙇 🙋 🙆 🙅 🤷 🤦 💁 🙎 🙍 💃 🕺 🧍 🚶 🏃 🧎 🛌 🫂 👫 💑 👪'],
    ['❤️', 'Hearts and symbols', '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 🩷 🩵 💔 ❤️‍🔥 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💌 💋 💯 💢 💥 💫 💦 💨 🕳️ 💬 💭 🗯️ 💤 ✨ ⭐ 🌟 ⚡ 🔥 🎉 🎊 ✅ ❌ ❓ ❗ ‼️ ⁉️ 🆗 🆒 🆕 🔞 ♾️ ⚠️ 🚫 ➡️ ⬅️ ⬆️ ⬇️ 🔁 🎵 🎶 ➕ ➖ ✖️ 💲 ©️ ™️'],
    ['🐺', 'Animals and nature', '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🦎 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🦈 🐊 🦒 🐘 🦔 🐾 🐉 🌵 🎄 🌲 🌳 🌴 🌱 🌿 🍀 🍁 🍂 🍃 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌚 🌙 🌎 🪐 ⭐ ☀️ 🌤️ ⛅ 🌧️ ⛈️ 🌩️ ❄️ ☃️ ⛄ 🌈 ☔ 🌊'],
    ['🍎', 'Food and drink', '🍎 🍏 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🌽 🥕 🥔 🍠 🥐 🍞 🥖 🧀 🥚 🍳 🥓 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🍡 🍢 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🥛 🍼 ☕ 🍵 🧋 🥤 🍶 🍺 🍻 🥂 🍷 🍸 🍹 🧃'],
    ['⚽', 'Activities and travel', '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 🏸 🥊 🥋 ⛳ 🎣 🎿 🏂 🏋️ 🤸 🏆 🥇 🥈 🥉 🏅 🎖️ 🎫 🎟️ 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 ♟️ 🎯 🎳 🎮 🕹️ 🧩 🚗 🚕 🚌 🚓 🚑 🏎️ 🚲 🛵 ✈️ 🚀 🛸 🚂 🚢 ⛵ 🗼 🏯 🏰 ⛩️ 🗻 🏖️ 🏝️ 🎡 🎢 🎠 🌃 🌆 🌇 🌉 🎆 🎇 🏠 🏫 🏥'],
    ['💡', 'Objects', '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💾 💿 📷 📸 📹 🎥 📺 📻 🎙️ ⏰ ⌛ ⏳ 💡 🔦 🕯️ 💸 💵 💰 💳 💎 🔧 🔨 ⚙️ 🔫 💣 🔪 🗡️ ⚔️ 🛡️ 🔮 💊 💉 🩹 🧸 🎁 🎈 🎀 🪄 🎏 🏮 📦 ✉️ 📩 📝 📖 📚 📓 📒 📌 📎 ✂️ 🔒 🔓 🔑 🗝️ 🛏️ 🛋️ 🚪 🪞 🧹 🧼 🛁 🚽 👑 💍 👓 🕶️ 🎒 👗 👘 👙 👠 👟 🧢 🎩'],
  ];
  const KAOMOJI = '(◕‿◕) | (｡◕‿◕｡) | (≧◡≦) | (✿◠‿◠) | ヽ(•‿•)ノ | (*^▽^*) | (^_^) | (^_^;) | (^▽^) | ٩(◕‿◕｡)۶ | (づ｡◕‿‿◕｡)づ | (っ˘ω˘ς) | (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ | ✧*｡٩(ˊᗜˋ*)و✧*｡ | (⁄ ⁄•⁄ω⁄•⁄ ⁄) | (〃▽〃) | (*/ω＼) | (´,,•ω•,,)♡ | (♡˙︶˙♡) | (｡♥‿♥｡) | (´｡• ᵕ •｡`) ♡ | (˘³˘)♥ | (ಥ﹏ಥ) | (╥﹏╥) | (；﹏；) | (T_T) | (´；ω；`) | (・_・;) | (￣ー￣) | (¬‿¬) | (¬_¬) | (ಠ_ಠ) | (╯°□°)╯︵ ┻━┻ | ┬─┬ノ( º _ ºノ) | (ง •̀_•́)ง | ᕦ(ò_óˇ)ᕤ | (•̀ᴗ•́)و | (⌐■_■) | ¯\\_(ツ)_/¯ | (￣▽￣)ノ | (・ω・)ノ | (^・ω・^ ) | ฅ^•ﻌ•^ฅ | (=^･ω･^=) | U・ᴥ・U | ʕ•ᴥ•ʔ | (｡•́︿•̀｡) | (っ- ‸ – ς) | (－_－) zzZ | (o_O) | (⊙_⊙) | Σ(°△°|||) | (°ロ°) ! | (＞﹏＜) | (*≧ω≦*) | (っ╹ᆺ╹)っ | ( ˘▽˘)っ♨ | (*￣▽￣)b | (๑˃ᴗ˂)ﻭ | ヾ(＾∇＾) | (っ´ω`c)'.split(' | ');

  // ---- build the widget ---------------------------------------------------------------
  let rootEl, panel, launch, launchDot, headEl, bodyEl;
  let T = null; // the open conversation

  function build() {
    const style = el('style', {}, css);
    document.head.appendChild(style);
    launchDot = el('span', { class: 'adm-dot', hidden: true });
    launch = el('button', { class: 'adm-launch', type: 'button', title: 'Messages', onclick: () => { if (ui.open && ui.min) setMin(false); else setOpen(!ui.open); } },
      svgChat(), launchDot);
    headEl = el('div', { class: 'adm-head' });
    bodyEl = el('div', { class: 'adm-convo-host', style: 'flex:1;min-height:0;display:flex;flex-direction:column' });
    panel = el('div', { class: 'adm-panel', hidden: true }, headEl, bodyEl);
    rootEl = el('div', { class: 'adm-root' + (ui.big ? ' adm-big' : '') + (ui.min ? ' adm-min' : '') }, panel, launch);
    rootEl.style.setProperty('--adm-fs', ui.textSize || 1);
    // a click on the top bar (not on its buttons) folds the panel down to the bar / opens it again; dragging it moves it
    headEl.addEventListener('click', e => { if (!dragMoved && !e.target.closest('button, a, input')) setMin(!ui.min); });
    headEl.addEventListener('pointerdown', e => { if (!e.target.closest('button, a, input')) startDrag(e, 'move'); });
    // the bar's links / pictures would start the browser's own drag-and-drop, which cancels moving the chat
    headEl.addEventListener('dragstart', e => e.preventDefault());
    headEl.title = 'Click to hide (the chat button brings it back) · drag to move';
    for (const d of ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se']) {
      const h = el('div', { class: 'adm-rz adm-rz-' + d });
      h.addEventListener('pointerdown', e => startDrag(e, d));
      panel.appendChild(h);
    }
    const grip = panel.querySelector('.adm-rz-nw');
    grip.title = 'Drag to resize (double-click: normal size)';
    grip.addEventListener('dblclick', () => { delete ui.w; delete ui.h; ui.big = false; saveUi(); place(); renderHead(); });
    window.addEventListener('resize', () => place());
    place();
    document.body.appendChild(rootEl);
    // a click on the page outside the panel closes the emoji box (the panel itself stays: it's toggled by the button)
    document.addEventListener('pointerdown', e => {
      if (!T || !T.emoji || T.emoji.hidden) return;
      if (!e.target.closest || (!e.target.closest('.adm-emoji') && !e.target.closest('.adm-ebtn'))) T.emoji.hidden = true;
      if (e.target.closest && !e.target.closest('.adm-b')) bodyEl.querySelectorAll('.adm-tap').forEach(b => b.classList.remove('adm-tap'));
    }, true);
  }
  function svgChat() {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9.2 9.2 0 0 1-3.6-.7L3 21l1.8-4.6A8 8 0 0 1 3 11.5 8.6 8.6 0 0 1 12 3a8.6 8.6 0 0 1 9 8.5z');
    s.appendChild(p);
    return s;
  }

  function setOpen(open) {
    ui.open = open; saveUi();
    panel.hidden = !open;
    if (open) {
      place();
      if (ui.thread && threads.includes(ui.thread)) openThread(ui.thread);
      else showList();
      pollAll(true);
    } else {
      closeThread();
    }
    renderBadge();
  }
  function setMin(min) {
    if (min && T) T.savedTop = T.scroll.scrollTop; // a hidden box forgets where it was scrolled
    ui.min = min; saveUi();
    rootEl.classList.toggle('adm-min', min);
    place();
    if (!min && T) {
      const t = T;
      if (t.stick) stickBottom(t);
      else requestAnimationFrame(() => { if (T === t && t.savedTop != null) t.scroll.scrollTop = t.savedTop; });
      refreshOpen(t, true); // back at the newest = read
    }
    renderBadge();
  }
  function setBig(big) {
    ui.big = big; saveUi();
    place();
    if (T) stickBottom(T);
  }

  // ---- move (drag the top bar) and resize (drag an edge / corner); PC only, kept on screen ----
  let drag = null, dragMoved = false;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function place() {
    rootEl.classList.toggle('adm-big', !!ui.big);
    if (ui.w) rootEl.style.setProperty('--adm-w', ui.w + 'px'); else rootEl.style.removeProperty('--adm-w');
    if (ui.h) rootEl.style.setProperty('--adm-h', ui.h + 'px'); else rootEl.style.removeProperty('--adm-h');
    const free = !!ui.pos && innerWidth > 760;
    rootEl.classList.toggle('adm-free', free);
    if (!free) return;
    const setXY = () => { rootEl.style.setProperty('--adm-x', ui.pos.x + 'px'); rootEl.style.setProperty('--adm-y', ui.pos.y + 'px'); };
    setXY();
    if (panel.hidden) return;
    const r = panel.getBoundingClientRect();
    ui.pos = { x: Math.round(clamp(ui.pos.x, 8, Math.max(8, innerWidth - r.width - 8))), y: Math.round(clamp(ui.pos.y, 8, Math.max(8, innerHeight - r.height - 8))) };
    setXY();
  }
  function startDrag(e, dir) {
    if (e.button !== 0 || innerWidth <= 760 || panel.hidden) return;
    const r = panel.getBoundingClientRect();
    drag = { dir, sx: e.clientX, sy: e.clientY, x: r.left, y: r.top, w: r.width, h: r.height, on: false };
    if (dir !== 'move') { e.preventDefault(); begin(); }
    document.addEventListener('pointermove', onDrag, true);
    document.addEventListener('pointerup', endDrag, true);
  }
  function begin() {
    drag.on = true;
    ui.pos = { x: drag.x, y: drag.y };
    if (drag.dir !== 'move') { ui.big = false; ui.w = Math.round(drag.w); ui.h = Math.round(drag.h); }
    rootEl.classList.add('adm-dragging');
    place();
  }
  function onDrag(e) {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.on) { if (Math.abs(dx) + Math.abs(dy) < 5) return; begin(); }
    e.preventDefault();
    if (drag.dir === 'move') { ui.pos = { x: drag.x + dx, y: drag.y + dy }; place(); return; }
    let { x, y, w, h } = drag;
    const d = drag.dir, MINW = 300, MINH = 260;
    if (d.includes('w')) { w = drag.w - dx; x = drag.x + dx; }
    if (d.includes('e')) w = drag.w + dx;
    if (d.includes('n')) { h = drag.h - dy; y = drag.y + dy; }
    if (d.includes('s')) h = drag.h + dy;
    if (w < MINW) { if (d.includes('w')) x -= MINW - w; w = MINW; }
    if (h < MINH) { if (d.includes('n')) y -= MINH - h; h = MINH; }
    if (x < 8) { w -= 8 - x; x = 8; }
    if (y < 8) { h -= 8 - y; y = 8; }
    ui.w = Math.round(Math.min(w, innerWidth - 16)); ui.h = Math.round(Math.min(h, innerHeight - 16));
    ui.pos = { x: Math.round(x), y: Math.round(y) };
    place();
  }
  function endDrag() {
    document.removeEventListener('pointermove', onDrag, true);
    document.removeEventListener('pointerup', endDrag, true);
    if (drag && drag.on) {
      dragMoved = true; setTimeout(() => { dragMoved = false; }, 0); // the click that ends a drag is not a minimize
      rootEl.classList.remove('adm-dragging');
      saveUi(); renderHead();
      if (T) stickBottom(T);
    }
    drag = null;
  }
  const hb = (label, title, fn, extra) => el('button', Object.assign({ class: 'adm-hb', type: 'button', title, onclick: fn }, extra || {}), label);
  const bigBtn = () => hb(ui.big ? '⤡' : '⤢', ui.big ? 'Make smaller' : 'Make bigger', () => { setBig(!ui.big); (T ? convoHead : listHead)(); });

  async function addDefaults() {
    if (store.get('adm:defaults', false) || !me) return;
    try {
      const d = await gql('query{' + DEFAULT_THREADS.map((id, k) => `d${k}:Activity(id:${id}){${ACT}}`).join(' ') + '}');
      threads = store.get('adm:threads', threads);
      DEFAULT_THREADS.forEach((id, k) => {
        const meta = metaOf(d['d' + k]);
        if (!meta || threads.includes(id) || !(meta.from.id === me || (meta.to && meta.to.id === me))) return;
        info[id] = Object.assign(info[id] || {}, meta);
        threads.push(id);
      });
      store.set('adm:threads', threads); store.set('adm:info', info);
    } catch (e) {
      if (!/not found/i.test(e.message)) return; // try again next time (network, slow down)
    }
    store.set('adm:defaults', true);
    renderAll();
  }

  // ---- "nya" for new messages (Exos's clip with the silence cut, 0.46 s, quiet by default) ----
  const NYA = 'data:audio/mpeg;base64,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hdcax/gJB8xlXZbtMrnkO1cqco2T1mqLLVvYpi0GLzS+bSwMFCEDHeNWWKt8IhJLu1VtdntBjOBfJ8O6DokVZrIyppny1OX6ZH+Ttf6zV02Y00i7kvRzvF14IL/W4UYnAGjTh1kod8qgkoc+2CtiwQFBe7B87YPkMgf+XKAN///+Xf/2VBggAABGhWiHPKwrCq4SvUiq9yTEioAWGUpakbP4A4SB4QJMqiCpszwcTRMIOy5bYsRac4sfUFt1ZVQ3yhiRUghakTe2GBeDFivGGMkSlRXfba3s+nz6jQ5bYokatlKzSzXtvMaDuDO9wnnlAnTryfmy33Q1PWtQIeReCZI7UrLUqZ8kZXDOekfJLN7d38405fZJXF4L1hFz9fr34ZN73ACiR0rHea50BxGONICmR0QscAcAP+r/28iQYp///rJo5f1OSXMf///6eoJwEAIIAAtGjwFzFcFKJMnQBCEDDhRIYNDeEyM0ekAOj//7kmR0gNTtUsezTzRyKqKIoWcCBhAdKR2npNCAz5yiRYeImKAHraunN55CgFSGpIRDBDiKRzJGwS306O4b2PWaWjZFRpH22fkt7+RKtxRyM4/KBkp/1tnEmMlJ21HfZI3+Wq+9AxK2Sd8f5iVNP9f+ZrmogLc8itbq1SRIshoixp0s9GJIMnJ0T5ZqMmSFUPJPNiqc+vFf4L2KhkVUUrAR1l//////8xv/Vf9n5SiWb//kUf///+koIAhYEuA2lhkwpFAS7neh6JSKGYdvVlVkFk7UAULpIsVdLqylJE2SwmhTFKTUtihQ/KtImVxVqYVJSEMsERMsdDMP5aQEK1EhhXGOrxo3+0AiOqpQ1q9XXaGFElSn/7ZT//+6q1LJYKqv/78n6O9FeUV8I3pJ7Q1hyIKIAGksC7gyPUxihRlUGqIlKp/pBj9mZgwEKYCBU68O///9R7BoFYdWGsOtK/////90FApWAtpdkiuE+rHNxVSHHKbxQmYXc/D/RB7HykFOQI2H5lXDc3/JRlGrSTIREIRoPjA2IBs6cKnDpRdAjnn/+5JkdQADwE7BGwkcUjOiR+BhgygMFQR4x6RxSJAY0GQgDxSxZZYwOVHQ5LLLLGCgrHR5LLLLJZZZZLLLLGCgrDA6KqqqlQHYIDQFRUX+qKCBhE6f//0VGVllgMEGChgYIGEDwVFWVC3FakxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
  // the sound before 1.3.4 (the flat neko sound of AniList Reply Alerts, 0.24 s), still there to pick in the options
  const NYA_OLD = 'data:audio/mpeg;base64,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EAKZufHHBZhoOg+Fh0IATJD0MZkd0QDASAEIBr5aCkQwoAChqZKEmKh5sukCrQ0UjCouCpEwsvB2Qe8KiLrrWHBK1y9nTK5RhYrsmERkQHLU2UgX9fNSYoRINlDhMt99HWp6OBoxPfzu+h8OB0qxjILe/1eT//6gY4a8WQhRkOCw8eDv/jRqjA50qgAwSnBgEQnpuhKWbWHXsIBkyAoMSJGIjIsIif/7cMQNg5LZGzRN5PFKQyTkwaYfSERCRop8YeMgJhBAQYgEmBBhkoodU2nvQf2oPdOuYDfhDRd0EAqcLqaWzVeTzVIozV+WGuMwUs0SnoDgYCm0HHgwNOxeyaKhzqMGyeW45Tw0X6y/I5R0UiMpVhwbXqV+xdSbf66J1HTTi8aoVEpDi4PQlGyvb11NRx460/XpBiA8Kk/AtR1AABlQUOlKgvuCiIXBGNFnCgkQs5boUDmCYgRSa5CZOsZeaFixmwAVBg7oIQgoFfy+7KIBdprzK2Co3MOLvJppAsMYFD6JiaIoBMoLDiAjADQKUWGyruMxIbeGscfyh7OVhOVBKOesutuTU35R5//R72yoPRaYNupMuKjjzQckTkX1HkWy5vlKBBmBjShwtBmTalwJIFUuFBRkBZjSZcX/+3LEC4ORoPcgLW0PQmER44GXmlkQDw48Z56QLk2xwcKNzBRkwAwAAudCZGWBgGVzPg8xolGiRLwv9D6t0QmmYtZzaUXeqpVIIVMGEpDKrrCiIDUoHgtVJWNTzH2dQEBoOijqHrbNEA2Hmh8KmtND9t4n//i/+b9I7a9FsYHy/K9+OKAww9mlLU+VfEsiMpHGwiVMMCAJhrtA40RgCQQWFMgVTQxThJICGpBPyMEnRqcg8HJ7FoiXJ1QxYuT9LjEV1E87iwpzdCOoAnohJ4yoaqW5DmaCjLWChOU2zjaaRk8UNuKGihouYaKGhX/5xUVKKml8bPNLNLLNLNJLNLNNLNLPNLNLLNLNJLNLNNLNLPret71vUm9b1ret71vW963rW9bqAmqiE4RmBMKSI6QMHyUVCEaD4wRl0v/7cMQLA8z8gshEhNQIAAA0gAAABE0k0k1F14Tx+bXiRE4SBCgMQegtGpcotnYsossoMWK0VVVVUgapKu3aaaoixW3/VVTDVJV2+mmqZKVoq+qqmVESrp/tNUyUrRV/1UyoiVdP/9VMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
  // one noise of the 'anime cat girl' clip (_dev\dm tests\make_cat.py)
  const NYA_CAT = 'data:audio/mpeg;base64,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ZP8tug0WpXN5LoAAA0gAAAAAXyueYHjlTpRKCJvKyzDI2vUKYKljH3RXAxZf6nM0+4kErWo5C2+XZDbkJ4WVE5Ymw9zxLnjDrOsu5xqNcH59/+Ps16j5//9en78lnGuspY4872dt1ZTagVqE/L9vJAj2Pa3eddFgjqqOJiOY3mRCTEGZR1AAICB8VQGoIKNc5YhwceS0jT3WdAvOggRHMWOTKgsxkmAIyYoHmKC5jQMaeCCwgYOBEoGnCYqpnPJ6yTGB9KgyJTM2JjFK02N6N7KjLFkzoDKANBEaq6ARXNGMQoKmCjBnqQNPmEAeehAWqdACWiMQFYJ5WbuSg8l05TGWmpzMLcxdzXobUFZi7kvz7L49PwU12/+fcJKwW7QJfSJOZJJxZdn1r0YdFYsFpUqPKBIpmmgnMZZAOGclAKjc50SVysMw6G8Weq92wJu7IHhS2aWxAKhA4dAKNFIopqmKQsGhJVgV0sK7V/nqUpqutALKZFT/EYhf21l3//PEZPostg0QAHN5LoAAA0gAAAAAakYi6yk4ooy5ZTNosylciCzOmGwAlczJ5EqneZfROylVIlkr+YEwuWKHJkoBWWOtKqGHKN6V2w6qWGGGyy1+LcW9fr////////j/d+Zls1S8/9P1+4hNRqIyygl7+w070co6z/Pi12dtS3stTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVaZ9RGGJhyUAOFnK4j5w3sgoWmRFDgFkiToKEtZAAkFBVhnvLmoSDJjhweJFV8hQKZEcCD4GMBiIAAWcloQTMf9ghkOcpE4uMtYAPgMUyUhU8WSMA80B1bE+lUjLKUHZY8rtMCBIBb5iUPpylyW2fWdyq2efVppU/1rKUw7KYZjVezdpat6GredR2p+HZq3jecGGFhmJQM8K6X2iLIWeNfTpZ8uq3NU7/UMoh6hdmWSNdqhqvZdyNOkX+WOYQa21uMGazAN1//PEZMUmFgj8AGsvjoAAA0gAAAAAKvi3Or0fJ5RNatQ1XXqwstoR/HVELcdSihq05Wg5kNULU3tA+h/SoplRQhSFoS1mSpjdU6oVYXpiD1M7Yhz2qmOqO9iMy5jxbe3tnXz////bb3W/vP9rTsLK9akNZYMyeQ5XXqxM1/mL3ojSTEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
  // Your own sounds: the files stay in this browser (IndexedDB, too big for localStorage), their names in adm:sounds.
  const SOUND_MAX_MB = 2, SOUND_MAX_S = 10, SOUND_MAX_N = 20;
  const ownSounds = () => store.get('adm:sounds', []);
  function soundFiles(mode, job) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open('adm-sounds', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('files', { keyPath: 'id' });
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result, tx = db.transaction('files', mode), q = job(tx.objectStore('files'));
        tx.oncomplete = () => { db.close(); resolve(q.result); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  }
  const nyaAudio = {};
  async function soundAudio(pick) {
    if (nyaAudio[pick]) return nyaAudio[pick];
    let src = pick === 'old' ? NYA_OLD : pick === 'cat' ? NYA_CAT : NYA;
    if (pick.startsWith('u:')) {
      const f = await soundFiles('readonly', st => st.get(pick.slice(2)));
      if (f && f.blob) src = URL.createObjectURL(f.blob); else pick = 'new'; // removed in another tab: the default
      if (nyaAudio[pick]) return nyaAudio[pick];
    }
    return (nyaAudio[pick] = new Audio(src));
  }
  async function nya(force) {
    if (!force && !ui.sound) return;
    // only one AniList tab says it, and not twice for the same message
    if (!force) { if (Date.now() - store.get('adm:nyaAt', 0) < 2500) return; store.set('adm:nyaAt', Date.now()); }
    try {
      const a = await soundAudio(String(ui.soundPick || 'new'));
      a.volume = Math.max(0, Math.min(1, +ui.volume || 0));
      a.currentTime = 0;
      a.play().catch(() => {}); // the browser may refuse sound in a tab you never clicked in
    } catch (e) {}
  }
  // can this browser play it, and how long is it?
  function soundLength(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), a = new Audio(), done = (fn, v) => { clearTimeout(t); URL.revokeObjectURL(url); fn(v); };
      const t = setTimeout(() => done(reject), 8000);
      a.preload = 'metadata';
      a.onloadedmetadata = () => done(resolve, a.duration);
      a.onerror = () => done(reject);
      a.src = url;
    });
  }
  let soundNote = null; // { text, bad } under the sound list
  async function addOwnSound(file) {
    const say = (text, bad) => { soundNote = { text, bad }; if (ui.open && !T) renderList(); };
    if (ownSounds().length >= SOUND_MAX_N) return say('You have ' + SOUND_MAX_N + ' sounds: remove one first.', true);
    if (file.size > SOUND_MAX_MB * 1048576) return say('That file is too big (' + SOUND_MAX_MB + ' MB at most).', true);
    let secs;
    try { secs = await soundLength(file); } catch (e) { return say('This browser cannot play that file. Try an MP3.', true); }
    if (secs > SOUND_MAX_S) return say('That sound is ' + Math.round(secs) + ' s long (' + SOUND_MAX_S + ' s at most).', true);
    const id = Date.now().toString(36), name = String(file.name || 'My sound').replace(/\.[^.]+$/, '').trim().slice(0, 40) || 'My sound';
    try { await soundFiles('readwrite', st => st.put({ id, blob: file.slice(0, file.size, file.type) })); }
    catch (e) { return say('This browser would not save it (a private window?).', true); }
    store.set('adm:sounds', ownSounds().concat({ id, name }));
    ui.soundPick = 'u:' + id; saveUi();
    nya(true);
    say('Added "' + name + '". It stays in this browser.');
  }
  async function removeOwnSound(id) {
    try { await soundFiles('readwrite', st => st.delete(id)); } catch (e) {}
    store.set('adm:sounds', ownSounds().filter(x => x.id !== id));
    const a = nyaAudio['u:' + id];
    if (a) { if (a.src.startsWith('blob:')) URL.revokeObjectURL(a.src); delete nyaAudio['u:' + id]; }
    if (ui.soundPick === 'u:' + id) { ui.soundPick = 'new'; saveUi(); }
    soundNote = null;
    if (ui.open && !T) renderList();
  }
  // one input for good: the list redraws while the file window is open
  let soundInput = null;
  function chooseOwnSound() {
    if (!soundInput) {
      soundInput = el('input', { class: 'adm-soundfile', type: 'file', accept: 'audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac', style: 'display:none',
        onchange: () => { const f = soundInput.files[0]; soundInput.value = ''; if (f) addOwnSound(f); } });
      document.body.append(soundInput);
    }
    soundInput.click();
  }
  const unreadTotal = () => threads.reduce((n, id) => n + unreadOf(id), 0);
  // "...nya." only for a message from them that is NEWER than anything this browser already knew about (shared by
  // all AniList tabs in adm:heard), never for opening / scrolling a chat, and not in the first check after a page
  // load (what came while you were away just shows the red number).
  let soundReady = false;
  function announce(id, msgs) {
    const top = (msgs || []).filter(m => m.uid && m.uid !== me).reduce((x, m) => Math.max(x, m.id), 0);
    if (!top) return;
    const heard = store.get('adm:heard', {});
    const prev = heard[id];
    if (prev && top <= prev) return;
    heard[id] = top; store.set('adm:heard', heard);
    if (prev && soundReady) nya();
  }

  // ---- update notice ----------------------------------------------------------------------
  // GitHub's version.json is asked at most once an hour (shared by every AniList tab). A newer version puts an
  // update button in the top bar; it opens the script's link, where Tampermonkey shows its Update page.
  const newer = (a, b) => {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    return false;
  };
  let upd = store.get('adm:upd', null);
  async function checkUpdate() {
    const u = store.get('adm:upd', null) || {};
    if (u.at && Date.now() - u.at < 3600e3) { upd = u; return; }
    store.set('adm:upd', Object.assign(u, { at: Date.now() })); // the other tabs don't ask too
    try {
      const r = await fetch(REPO_RAW + 'version.json', { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      upd = { at: Date.now(), v: String(j.version || ''), notes: String(j.notes || '') };
      store.set('adm:upd', upd);
      renderHead();
    } catch (e) {}
  }
  function updBtn() {
    if (!upd || !upd.v || !newer(upd.v, VERSION)) return null;
    return el('a', { class: 'adm-hb adm-upd', href: REPO_RAW + 'anilist-dms.user.js', target: '_blank', rel: 'noopener',
      title: 'Update: version ' + upd.v + ' is out' + (upd.notes ? ' - ' + upd.notes : '') + '. Click it, press Update in Tampermonkey, then reload AniList.' }, '⬆');
  }
  function renderHead() { if (ui.open) (T ? convoHead : listHead)(); }

  // ---- unread counting ------------------------------------------------------------------
  function cacheOf(id) { return store.get('adm:m:' + id, { msgs: [] }); }
  // The badge and the list ask this for every conversation, often; the answer only changes when the
  // saved messages, what you have seen, or who you are changes, so it is remembered until then.
  const unreadMemo = new Map();
  function unreadOf(id) {
    const s = seen[id] || 0;
    let raw = null;
    try { raw = localStorage.getItem('adm:m:' + id); } catch (e) {}
    const hit = unreadMemo.get(id);
    if (hit && hit.raw === raw && hit.s === s && hit.me === me) return hit.n;
    const n = (cacheOf(id).msgs || []).filter(m => m.id > s && m.uid !== me).length;
    unreadMemo.set(id, { raw, s, me, n });
    return n;
  }
  function markSeen(id, msgs) {
    const top = msgs.reduce((x, m) => Math.max(x, m.id), 0);
    if (top > (seen[id] || 0)) {
      seen = Object.assign(store.get('adm:seen', {}), seen);
      seen[id] = Math.max(top, seen[id] || 0);
      store.set('adm:seen', seen);
      renderBadge(); if (!T) renderList();
    }
  }
  function renderBadge() {
    const total = threads.reduce((n, id) => n + unreadOf(id), 0);
    launchDot.hidden = !total;
    launchDot.textContent = total ? (total > 99 ? '99+' : total) : '';
    launch.title = total ? total + ' new message' + (total > 1 ? 's' : '') : 'Messages';
    launch.classList.toggle('adm-has', !!total && (!ui.open || ui.min));
  }

  // ---- list view -----------------------------------------------------------------------
  let listState = { adding: false, menu: false, removing: 0, note: '', bad: false, busy: false };
  function listHead() {
    headEl.textContent = '';
    headEl.append(...[
      el('div', { class: 'adm-title' }, 'Messages'),
      hb('+', 'Add a conversation', () => { listState.adding = !listState.adding; listState.menu = false; listState.note = ''; renderList(); }),
      hb('⋯', 'Options', () => { listState.menu = !listState.menu; listState.adding = false; renderList(); }),
      updBtn(),
      bigBtn(),
      hb('×', 'Close', () => setOpen(false))].filter(Boolean));
  }
  function showList() {
    closeThread();
    ui.thread = 0; saveUi();
    listHead();
    renderList();
  }
  function renderList() {
    if (T || !ui.open) return;
    bodyEl.textContent = '';
    const list = el('div', { class: 'adm-list' });
    if (listState.menu) {
      const tick = (key, label) => el('label', {}, el('input', { type: 'checkbox', checked: ui[key], onchange: e => { ui[key] = e.target.checked; saveUi(); } }), label);
      list.append(el('div', { class: 'adm-menu' },
        tick('enterSends', 'Enter sends (Shift+Enter = new line). Off: Ctrl+Enter sends'),
        tick('smartPaste', 'Pasting a GIF, picture, video or YouTube link adds it as a picture / player'),
        ui.pos || ui.w || ui.h ? el('button', { class: 'adm-btn', type: 'button', style: 'align-self:flex-start', onclick: () => {
          delete ui.pos; delete ui.w; delete ui.h; ui.big = false; saveUi(); place(); listHead(); renderList();
        } }, 'Put the chat back in the corner (normal size)') : null,
        el('div', { class: 'adm-size' }, 'Text size',
          ...[[1, 'Normal'], [1.15, 'Big'], [1.3, 'Bigger'], [1.5, 'Biggest']].map(([v, name]) =>
            el('button', { class: 'adm-btn' + ((ui.textSize || 1) === v ? ' adm-pri' : ''), type: 'button', title: name, style: 'font-size:' + (12 * v) + 'px',
              onclick: () => { ui.textSize = v; saveUi(); rootEl.style.setProperty('--adm-fs', v); renderList(); } }, 'A'))),
        el('div', { class: 'adm-sound' },
          el('label', {}, el('input', { type: 'checkbox', checked: ui.sound, onchange: e => { ui.sound = e.target.checked; saveUi(); if (ui.sound) nya(true); } }),
            'Sound for new messages ("…nya.")'),
          el('div', { class: 'adm-vol adm-pick' }, 'Sound',
            el('select', { class: 'adm-soundsel', title: 'The sound for new messages', onchange: e => { ui.soundPick = e.target.value; saveUi(); soundNote = null; nya(true); renderList(); } },
              [['new', 'Nya'], ['old', 'Nya (old)'], ['cat', 'Anime cat girl']].concat(ownSounds().map(x => ['u:' + x.id, x.name])).map(([v, name]) =>
                el('option', { value: v, selected: (ownSounds().some(x => 'u:' + x.id === ui.soundPick) || ui.soundPick === 'old' || ui.soundPick === 'cat' ? ui.soundPick : 'new') === v }, name))),
            el('button', { class: 'adm-btn adm-soundadd', type: 'button', title: 'Add a sound from this device (' + SOUND_MAX_S + ' s, ' + SOUND_MAX_MB + ' MB at most). It stays in this browser.', onclick: chooseOwnSound }, 'Add your own'),
            String(ui.soundPick).startsWith('u:') && ownSounds().some(x => 'u:' + x.id === ui.soundPick)
              ? el('button', { class: 'adm-btn adm-soundrem', type: 'button', title: 'Remove this sound', onclick: () => removeOwnSound(ui.soundPick.slice(2)) }, 'Remove') : null),
          soundNote ? el('div', { class: 'adm-note adm-soundnote' + (soundNote.bad ? ' adm-bad' : ''), style: 'margin-left:22px' }, soundNote.text) : null,
          el('div', { class: 'adm-vol' }, 'Volume',
            el('input', { type: 'range', min: '0', max: '100', step: '1', value: String(Math.round(ui.volume * 100)), title: 'Volume',
              oninput: e => { ui.volume = +e.target.value / 100; saveUi(); }, onchange: () => nya(true) }),
            el('button', { class: 'adm-btn', type: 'button', title: 'Play it', onclick: () => nya(true) }, '▶'))),
        el('div', { style: 'opacity:.6' }, 'Your conversations, drafts, sounds and what you have read are kept in this browser.')));
    }
    if (listState.adding) list.append(addForm());
    const order = threads.slice().sort((a, b) => ((info[b] || {}).lastT || 0) - ((info[a] || {}).lastT || 0));
    if (!order.length && !listState.adding) list.append(el('div', { class: 'adm-empty' }, 'No conversations yet.', el('br'),
      el('button', { class: 'adm-btn adm-pri', type: 'button', style: 'margin-top:10px', onclick: () => { listState.adding = true; renderList(); } }, '+ Add a conversation')));
    for (const id of order) {
      const i = info[id] || {};
      const o = otherOf(i) || { name: 'Loading…', av: '' };
      const n = unreadOf(id);
      const row = el('div', { class: 'adm-row' + (n ? ' adm-unread' : ''), title: 'Open the conversation with ' + o.name, onclick: e => {
        if (e.target.closest('.adm-x, .adm-ask')) return;
        openThread(id);
      } });
      if (listState.removing === id) {
        row.append(el('div', { class: 'adm-ask', style: 'flex:1' }, 'Remove ' + o.name + ' from this panel? (nothing is deleted on AniList)',
          el('button', { class: 'adm-btn', type: 'button', onclick: () => { listState.removing = 0; renderList(); } }, 'No'),
          el('button', { class: 'adm-btn adm-pri', type: 'button', onclick: () => removeThread(id) }, 'Remove')));
      } else {
        const mine = i.lastUid && i.lastUid === me;
        row.append(...[
          el('span', { class: 'adm-av', style: avStyle(o.av) }),
          el('div', { class: 'adm-rb' },
            el('div', { class: 'adm-rt' }, el('span', { class: 'adm-rn' }, o.name), el('span', { class: 'adm-rtime' }, i.lastT ? ago(i.lastT) : '')),
            el('div', { class: 'adm-rs' }, i.snip ? (mine ? 'You: ' : '') + i.snip : (i.error || ''))),
          n ? el('span', { class: 'adm-dot' }, n > 99 ? '99+' : n) : null,
          el('button', { class: 'adm-x', type: 'button', title: 'Remove from this panel', onclick: () => { listState.removing = id; renderList(); } }, '×')].filter(Boolean));
      }
      list.append(row);
    }
    bodyEl.append(list);
  }
  async function addThread(id) {
    const d = await gql(`query($id:Int){Activity(id:$id){${ACT}}}`, { id });
    const meta = metaOf(d.Activity);
    if (!meta || !meta.origin.id) throw new Error('Only message posts and status posts can be added.');
    info[id] = Object.assign(info[id] || {}, meta);
    threads = [...store.get('adm:threads', threads).filter(x => x !== id), id];
    store.set('adm:threads', threads); store.set('adm:info', info);
    listState = { adding: false, menu: false, removing: 0, note: '', bad: false };
    await refreshThread(id, true);
    markSeen(id, cacheOf(id).msgs); // what is there now counts as read
    renderList(); renderBadge();
  }

  // Your recent message posts (on your profile + the ones you sent), to add with one click.
  const MSG = `... on MessageActivity{id isPrivate replyCount createdAt messenger{${U}} recipient{${U}}}`;
  let suggest = null; // {at, list} - asked at most once per 2 minutes
  async function loadSuggestions() {
    if (suggest && Date.now() - suggest.at < 120000) return suggest.list;
    if (!me) await askMe();
    const d = await gql(`query($me:Int){a:Page(perPage:25){activities(userId:$me,type:MESSAGE,sort:ID_DESC){${MSG}}}
      b:Page(perPage:25){activities(messengerId:$me,type:MESSAGE,sort:ID_DESC){${MSG}}}}`, { me });
    const all = [...d.a.activities, ...d.b.activities].filter(a => a && a.messenger && a.recipient && a.messenger.id !== a.recipient.id);
    const byId = new Map(all.map(a => [a.id, a]));
    const list = [...byId.values()].sort((x, y) => y.createdAt - x.createdAt).map(a => {
      const o = person(a.messenger.id === me ? a.recipient : a.messenger);
      return { id: a.id, o, sent: a.messenger.id === me, priv: a.isPrivate, n: a.replyCount, t: a.createdAt };
    });
    suggest = { at: Date.now(), list };
    return list;
  }

  function addForm() {
    const cur = (location.pathname.match(/^\/activity\/(\d+)/) || [])[1];
    const input = el('input', { type: 'text', placeholder: 'or paste a message link (anilist.co/activity/…)', value: cur && !threads.includes(+cur) ? location.href : '' });
    const note = el('div', { class: 'adm-note' + (listState.bad ? ' adm-bad' : '') }, listState.note || '');
    if (!note.textContent) note.hidden = true;
    const sug = el('div', { class: 'adm-sug' }, el('div', { class: 'adm-note' }, 'Loading your message posts…'));
    const busy = msg => { note.hidden = false; note.textContent = msg; note.className = 'adm-note'; };
    const fail = e => { listState.note = 'Could not add it: ' + e.message; listState.bad = true; renderList(); };
    const go = async () => {
      const m = input.value.trim().match(/(?:activity\/)?(\d{4,})/);
      if (!m) { listState.note = 'That is not an activity link.'; listState.bad = true; renderList(); return; }
      const id = +m[1];
      if (threads.includes(id)) { listState.note = 'That one is already in your list.'; listState.bad = true; renderList(); return; }
      add.disabled = true; busy('Checking…');
      try { await addThread(id); } catch (e) { fail(e); }
    };
    const add = el('button', { class: 'adm-btn adm-pri', type: 'button', onclick: go }, 'Add');
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); if (e.key === 'Escape') { listState.adding = false; renderList(); } });
    loadSuggestions().then(list => {
      sug.textContent = '';
      const left = list.filter(x => !threads.includes(x.id)).slice(0, 15);
      sug.append(el('div', { class: 'adm-note' }, left.length ? 'Your message posts - click one to add it:' : 'No other message posts found on your profile.'));
      for (const x of left) {
        sug.append(el('div', { class: 'adm-row adm-srow', title: 'Add this conversation', onclick: async () => {
          busy('Adding ' + x.o.name + '…');
          try { await addThread(x.id); } catch (e) { fail(e); }
        } },
          el('span', { class: 'adm-av', style: avStyle(x.o.av) }),
          el('div', { class: 'adm-rb' },
            el('div', { class: 'adm-rt' }, el('span', { class: 'adm-rn' }, x.o.name), el('span', { class: 'adm-rtime' }, ago(x.t))),
            el('div', { class: 'adm-rs' }, (x.priv ? '🔒 ' : '') + (x.sent ? 'you wrote' : 'wrote to you') + ' · ' + x.n + (x.n === 1 ? ' reply' : ' replies'))),
          el('span', { class: 'adm-plus' }, '+')));
      }
    }).catch(e => { sug.textContent = ''; sug.append(el('div', { class: 'adm-note' }, 'Could not load your message posts: ' + e.message)); });
    return el('div', { class: 'adm-form' }, sug, input, note,
      el('div', { class: 'adm-btns' }, el('button', { class: 'adm-btn', type: 'button', onclick: () => { listState.adding = false; renderList(); } }, 'Cancel'), add));
  }

  function removeThread(id) {
    threads = store.get('adm:threads', threads).filter(x => x !== id);
    store.set('adm:threads', threads);
    delete info[id]; store.set('adm:info', info);
    store.del('adm:m:' + id); store.del('adm:draft:' + id);
    listState.removing = 0;
    renderList(); renderBadge();
  }

  // ---- fetching ----------------------------------------------------------------------------
  // Last two pages of replies of one or more conversations in ONE request.
  async function fetchLatest(ids, counts) {
    const parts = [];
    ids.forEach((id, k) => {
      const last = Math.max(1, Math.ceil((counts[k] || 0) / PER));
      parts.push(`a${k}:Page(page:${Math.max(1, last - 1)},perPage:${PER}){activityReplies(activityId:${id}){${F}}}`);
      if (last > 1) parts.push(`b${k}:Page(page:${last},perPage:${PER}){activityReplies(activityId:${id}){${F}}}`);
    });
    const d = await gql('query{' + parts.join(' ') + '}');
    return ids.map((id, k) => [...((d['a' + k] || {}).activityReplies || []), ...((d['b' + k] || {}).activityReplies || [])].filter(Boolean).map(slim));
  }

  // Remember the newest messages + the list line, shared by every AniList tab.
  function remember(id, count, msgs) {
    msgs = msgs.slice().sort((a, b) => a.id - b.id);
    const keep = msgs.slice(-CACHE_KEEP);
    store.set('adm:m:' + id, { count, msgs: keep });
    const last = keep[keep.length - 1];
    const i = info[id] = info[id] || {};
    i.count = count;
    if (last) { i.lastT = last.t; i.lastUid = last.uid; i.snip = snip(last.md != null ? last.md : (last.html || '').replace(/<[^>]+>/g, ' ')); }
    else if (i.origin) { i.lastT = i.origin.t; i.lastUid = i.origin.uid; i.snip = snip(i.origin.md); }
    delete i.error;
    store.set('adm:info', info);
  }

  async function refreshThread(id, withMeta) {
    const d = await gql(`query($id:Int){Activity(id:$id){${ACT}}}`, { id });
    const meta = metaOf(d.Activity);
    if (!meta) throw new Error('This conversation was not found (deleted?)');
    info[id] = Object.assign(info[id] || {}, meta);
    const [msgs] = await fetchLatest([id], [meta.count]);
    remember(id, meta.count, msgs);
    return { meta, msgs };
  }

  // The red dots: one cheap count check for every conversation; the newest pages only for the ones that changed.
  // Only one AniList tab checks at a time (the time of the last check is shared through localStorage).
  let polling = false;
  async function pollAll(force) {
    if (polling || !threads.length || !token()) return;
    const lastPoll = store.get('adm:poll', 0);
    if (!force && Date.now() - lastPoll < POLL_MS - 1500) return;
    polling = true;
    store.set('adm:poll', Date.now());
    try {
      if (!me) await askMe();
      const ids = threads.slice();
      const d = await gql('query{' + ids.map((id, k) => `t${k}:Activity(id:${id}){${ACT_COUNT}}`).join(' ') + '}');
      const changed = [], counts = [];
      ids.forEach((id, k) => {
        const a = d['t' + k];
        const i = info[id] = info[id] || {};
        if (!a) { i.error = 'Not found (deleted or private?)'; return; }
        if (!i.from || !i.origin || a.replyCount !== i.count || !(cacheOf(id).msgs || []).length) { changed.push(id); counts.push(a.replyCount || 0); }
      });
      const needMeta = changed.filter(id => !(info[id] || {}).origin || !(info[id] || {}).from);
      for (const id of needMeta) { try { await refreshThread(id); } catch (e) { info[id].error = e.message; } }
      const rest = changed.filter(id => !needMeta.includes(id));
      if (rest.length) {
        const got = await fetchLatest(rest, rest.map(id => counts[changed.indexOf(id)]));
        rest.forEach((id, k) => {
          const old = cacheOf(id).msgs || [];
          const from = got[k].length ? Math.min(...got[k].map(m => m.id)) : Infinity;
          remember(id, counts[changed.indexOf(id)], [...old.filter(m => m.id < from), ...got[k]]);
        });
      }
      store.set('adm:info', info);
      for (const id of ids) announce(id, cacheOf(id).msgs);
      // first run ever: what is already there counts as read
      if (!store.get('adm:seeded', false)) {
        for (const id of ids) markSeen(id, cacheOf(id).msgs || []);
        store.set('adm:seeded', true);
      }
    } catch (e) {
      // a failed check just waits for the next one
    } finally {
      polling = false;
      soundReady = true;
      renderBadge();
      if (!T) renderList();
      else if (T && changedOutside(T)) refreshOpen(T, true);
    }
  }
  // the background check saw a new message in the conversation that is open here
  function changedOutside(t) { const c = cacheOf(t.id); return (c.msgs || []).some(m => !t.byId.has(m.id)); }

  // ---- conversation view ----------------------------------------------------------------
  function closeThread() {
    if (!T) return;
    clearInterval(T.timer);
    if (T.ro) T.ro.disconnect();
    dropVms(T.box);
    T.box.remove();
    T = null;
  }

  function convoHead() {
    if (!T) return;
    const i = info[T.id] || {};
    const o = otherOf(i) || { name: '…', av: '' };
    headEl.textContent = '';
    const prof = o.name && o.name !== '…' ? '/user/' + encodeURIComponent(o.name) + '/' : null;
    headEl.append(...[
      hb('‹', 'All conversations', showList, { style: 'font-size:22px' }),
      el('div', { class: 'adm-title' },
        el('a', { class: 'adm-av', href: prof, style: avStyle(o.av) }),
        el('a', { href: prof, title: o.name + "'s profile" }, o.name),
        i.private ? el('span', { title: 'Private message', style: 'opacity:.5;font-size:12px' }, '🔒') : null),
      el('a', { class: 'adm-hb', href: '/activity/' + T.id, title: 'Open this conversation as a page' }, '↗'),
      updBtn(),
      bigBtn(),
      hb('×', 'Close', () => setOpen(false))].filter(Boolean));
  }

  function openThread(id) {
    closeThread();
    ui.thread = id; saveUi();
    const c = cacheOf(id);
    const t = T = { id, msgs: [], byId: new Map(), els: new Map(), shown: SHOW_LAST, count: c.count || 0, minPage: 0, fresh: false,
                    busy: false, again: false, olderBusy: false, error: '', stick: true, newCount: 0 };
    setMsgs(t, c.msgs || []);
    buildConvo(t);
    convoHead();
    render(t);
    stickBottom(t);
    refreshOpen(t, true);
    t.timer = setInterval(() => { if (document.visibilityState === 'visible' && ui.open) refreshOpen(t); }, OPEN_POLL_MS);
    if (!touch) setTimeout(() => { if (T === t) t.ta.focus({ preventScroll: true }); }, 50);
  }

  function setMsgs(t, list) {
    t.msgs = list.slice().sort((a, b) => a.id - b.id);
    t.byId = new Map(t.msgs.map(m => [m.id, m]));
  }

  function buildConvo(t) {
    const scroll = el('div', { class: 'adm-scroll' });
    const olderBar = el('div', { class: 'adm-older' });
    const msgsEl = el('div', { class: 'adm-msgs' });
    const status = el('div', { class: 'adm-status' });
    scroll.append(olderBar, msgsEl, status);
    const pill = el('button', { class: 'adm-newpill', type: 'button', hidden: true, onclick: () => { t.stick = true; stickBottom(t, true); } });

    // the box you type in, with AniList's toolbar (class markdown-editor, so the GIF Picker adds its GIF button too)
    const ta = el('textarea', { class: 'adm-ta', rows: 1, placeholder: 'Message ' + ((otherOf(info[t.id]) || {}).name || '') + '…' });
    ta.value = store.get('adm:draft:' + t.id, '');
    const preview = el('div', { class: 'adm-preview', hidden: true });
    const hint = el('span', { class: 'adm-hint' }, ui.enterSends ? 'Enter sends · Shift+Enter new line' : 'Ctrl+Enter sends');
    const send = el('button', { class: 'adm-btn adm-pri', type: 'button', onclick: () => sendMsg(t) }, 'Send');
    const emoji = buildEmoji(t);
    Object.assign(t, { scroll, olderBar, msgsEl, status, pill, ta, preview, hint, sendBtn: send, emoji });
    const tools = buildTools(t);
    const compose = el('div', { class: 'adm-compose' }, emoji, tools, ta, preview, el('div', { class: 'adm-send-row' }, hint, send));
    t.box = el('div', { class: 'adm-convo' }, scroll, pill, compose);
    bodyEl.textContent = '';
    bodyEl.append(t.box);

    let draftTimer = 0;
    ta.addEventListener('input', () => {
      grow(t); showPreview(t);
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => { if (ta.value.trim()) store.set('adm:draft:' + t.id, ta.value); else store.del('adm:draft:' + t.id); }, 400);
    });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) {
        if (e.ctrlKey || e.metaKey || (ui.enterSends && !e.shiftKey && !e.altKey)) { e.preventDefault(); sendMsg(t); }
      } else if (e.key === 'Escape' && !emoji.hidden) { e.preventDefault(); emoji.hidden = true; }
      else if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === 'b') { e.preventDefault(); wrap(t, '__', '__'); }
        else if (k === 'i') { e.preventDefault(); wrap(t, '_', '_'); }
      }
    });
    ta.addEventListener('paste', e => smartPaste(t, e));
    scroll.addEventListener('scroll', () => {
      if (ui.min || !scroll.clientHeight) return; // hidden: keep what it was
      t.stick = scroll.scrollTop + scroll.clientHeight > scroll.scrollHeight - 60;
      if (t.stick && !ui.min) { if (t.newCount) newPill(t, 0); markSeen(t.id, t.msgs); }
    }, { passive: true });
    // pictures that finish loading make the list taller: stay at the bottom if you were there
    t.ro = new ResizeObserver(() => { if (t.stick) scroll.scrollTop = scroll.scrollHeight; });
    t.ro.observe(msgsEl);
    t.ro.observe(scroll); // the box / preview growing makes the message area smaller
    msgsEl.addEventListener('click', e => onMsgClick(t, e));
    grow(t);
    if (ta.value) showPreview(t);
  }

  function grow(t) {
    const ta = t.ta;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight + 2, window.innerHeight * 0.38) + 'px';
  }
  function stickBottom(t, smooth) {
    requestAnimationFrame(() => { if (T === t) t.scroll.scrollTo({ top: t.scroll.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); });
    newPill(t, 0);
  }
  function newPill(t, n) {
    t.newCount = n;
    t.pill.hidden = !n;
    t.pill.textContent = '↓ ' + n + ' new message' + (n > 1 ? 's' : '');
  }

  // ---- toolbar ------------------------------------------------------------------------------
  function wrap(t, before, after, inner, lineStart) {
    const ta = t.ta, s = ta.selectionStart, e = ta.selectionEnd;
    if (lineStart && s > 0 && ta.value[s - 1] !== '\n') before = '\n' + before;
    const sel = inner != null ? inner : ta.value.slice(s, e);
    ta.focus();
    ta.setSelectionRange(s, e);
    const text = before + sel + after;
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (err) {}
    if (!ok) ta.setRangeText(text, s, e, 'end');
    if (!sel) { const p = s + before.length; ta.setSelectionRange(p, p); }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // Link / picture / video buttons: a selected link is wrapped; otherwise the code goes in with the cursor
  // between the brackets, ready for you to paste the link (no pop-up boxes).
  function mediaCode(t, code, what) {
    const ta = t.ta, sel = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
    if (/^https?:\/\/\S+$/i.test(sel)) wrap(t, code + '(', ')', sel);
    else { wrap(t, code + '(', ')', ''); flash(t, 'Paste the ' + what + ' link between the brackets'); }
  }
  function linkCode(t) {
    const ta = t.ta, sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    if (/^https?:\/\/\S+$/i.test(sel.trim())) wrap(t, '[', '](' + sel.trim() + ')', 'link text');
    else if (sel) { const s = ta.selectionStart; wrap(t, '[', ']()', sel); const p = s + sel.length + 3; ta.setSelectionRange(p, p); flash(t, 'Paste the link between the brackets'); }
    else { wrap(t, '[', '](https://)', 'link text'); }
  }
  function flash(t, msg) {
    t.hint.textContent = msg; t.hint.classList.remove('adm-bad');
    clearTimeout(t.hintTimer);
    t.hintTimer = setTimeout(() => { if (T === t) t.hint.textContent = ui.enterSends ? 'Enter sends · Shift+Enter new line' : 'Ctrl+Enter sends'; }, 4000);
  }

  function buildTools(t) {
    const bar = el('div', { class: 'adm-tools markdown-editor' });
    const more = [];
    const tb = (label, title, fn, styleCss, extraCls, inMore) => {
      const b = el('button', { class: 'adm-tb' + (extraCls ? ' ' + extraCls : ''), type: 'button', title, style: styleCss }, label);
      b.addEventListener('mousedown', e => e.preventDefault()); // keep the text selection in the box
      b.addEventListener('click', fn);
      if (inMore) { b.classList.add('adm-more'); b.hidden = true; more.push(b); }
      bar.appendChild(b);
      return b;
    };
    tb('B', 'Bold (Ctrl+B)', () => wrap(t, '__', '__'), 'font-weight:800');
    tb('I', 'Italic (Ctrl+I)', () => wrap(t, '_', '_'), 'font-style:italic');
    tb('S', 'Strikethrough', () => wrap(t, '~~', '~~'), 'text-decoration:line-through');
    tb('Spoiler', 'Spoiler ~! !~', () => wrap(t, '~!', '!~'));
    tb('Link', 'Link', () => linkCode(t));
    tb('Img', 'Picture or GIF by link: img(link)', () => mediaCode(t, 'img', 'picture'));
    tb('YT', 'YouTube video: youtube(link)', () => mediaCode(t, 'youtube', 'YouTube'));
    tb('Video', 'Video file (webm / mp4): webm(link)', () => mediaCode(t, 'webm', 'video'));
    const eb = tb('😊', 'Emojis', () => { t.emoji.hidden = !t.emoji.hidden; }, 'font-size:15px;font-family:"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif', 'adm-ebtn');
    eb.title = 'Emojis and kaomoji';
    const pv = tb('👁', 'Preview under the box (on / off)', () => {
      ui.preview = !ui.preview; saveUi(); pv.classList.toggle('adm-on', ui.preview); showPreview(t);
    }, 'font-family:"Segoe UI Emoji",sans-serif', ui.preview ? 'adm-on adm-pv' : 'adm-pv');
    tb('Center', 'Centre ~~~ ~~~', () => wrap(t, '~~~', '~~~'), null, null, true);
    tb('❝', 'Quote', () => wrap(t, '> ', '', null, true), null, null, true);
    tb('</>', 'Code', () => wrap(t, '`', '`'), null, null, true);
    tb('H', 'Header', () => wrap(t, '# ', '', null, true), null, null, true);
    tb('•', 'List', () => wrap(t, '- ', '', null, true), null, null, true);
    tb('1.', 'Numbered list', () => wrap(t, '1. ', '', null, true), null, null, true);
    const mb = tb('⋯', 'More tools', () => { const show = more[0].hidden; more.forEach(b => { b.hidden = !show; }); mb.classList.toggle('adm-on', show); });
    bar.appendChild(mb); // "more" stays before the GIF Picker's button, which is added at the end
    return bar;
  }

  // Draw the text into a preview box with AniList's own formatter (only when the text changed, so a playing
  // GIF / video in it is not restarted on every key).
  function drawPreview(p, text, on) {
    const want = on && text.trim() ? text : '';
    if (p._shown === want) return;
    p._shown = want;
    if (p._vm) { try { p._vm.$destroy(); } catch (e) {} p._vm = null; }
    p.textContent = '';
    p.hidden = !want;
    if (!want) return;
    const vm = mdMount(want);
    if (vm) { p._vm = vm; p.appendChild(vm.$el); } else p.textContent = want;
  }
  function showPreview(t) {
    clearTimeout(t.pvTimer);
    t.pvTimer = setTimeout(() => { if (T === t) drawPreview(t.preview, t.ta.value, ui.preview); }, 250);
  }

  function smartPaste(t, e) {
    if (!ui.smartPaste) return;
    const txt = (e.clipboardData && e.clipboardData.getData('text/plain') || '').trim();
    if (!/^https?:\/\/\S+$/i.test(txt)) return;
    const before = t.ta.value.slice(0, t.ta.selectionStart);
    if (/[(\[]\s*$/.test(before)) return; // already inside img( ... ) or [text]( ... )
    let code = null;
    if (/^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch|shorts|live)|youtu\.be\/)/i.test(txt)) code = 'youtube';
    else if (/\.(mp4|webm)(\?\S*)?$/i.test(txt) || /\/\/(media\d*\.giphy\.com|i\.imgur\.com)\/\S+\.gifv$/i.test(txt)) code = 'webm';
    else if (/\.(gif|png|jpe?g|webp|avif)(\?\S*)?$/i.test(txt) || /^https?:\/\/(media\d*\.tenor\.com|c\.tenor\.com|media\.giphy\.com|i\.giphy\.com|s4\.anilist\.co)\//i.test(txt)) code = 'img';
    if (!code) return;
    e.preventDefault();
    const sep = before && !/\s$/.test(before) ? '\n' : '';
    wrap(t, sep + code + '(', ')', txt.replace(/\.gifv$/i, '.mp4'));
    flash(t, 'Added as ' + (code === 'img' ? 'a picture' : code === 'webm' ? 'a video' : 'a YouTube player') + ' (turn this off under ⋯ in the list)');
  }

  // ---- emojis ------------------------------------------------------------------------------
  function buildEmoji(t) {
    const tabs = el('div', { class: 'adm-etabs' });
    const grid = el('div', { class: 'adm-egrid' });
    const box = el('div', { class: 'adm-emoji', hidden: true }, tabs, grid);
    const sets = [['🕘', 'Recently used', null], ...EMOJI.map(([icon, name, list]) => [icon, name, list.split(' ')]), ['(◕‿◕)', 'Kaomoji', KAOMOJI]];
    let cur = (store.get('adm:recentEmoji', []).length ? 0 : 1);
    const show = k => {
      cur = k;
      tabs.querySelectorAll('.adm-etab').forEach((b, i) => b.classList.toggle('adm-on', i === k));
      grid.textContent = '';
      const set = sets[k];
      const list = set[2] || store.get('adm:recentEmoji', []);
      grid.classList.toggle('adm-kao', set[1] === 'Kaomoji');
      if (!list.length) grid.append(el('div', { style: 'grid-column:1/-1;opacity:.6;padding:10px;font-size:13px' }, 'Emojis you use show up here.'));
      for (const e of list) {
        const b = el('button', { class: 'adm-e', type: 'button', title: e }, e);
        b.addEventListener('mousedown', ev => ev.preventDefault());
        b.addEventListener('click', () => {
          const ta = t.ta;
          const s = ta.selectionStart, before = ta.value.slice(0, s);
          wrap(t, (set[1] === 'Kaomoji' && before && !/\s$/.test(before) ? ' ' : '') + e, '', '');
          const rec = [e, ...store.get('adm:recentEmoji', []).filter(x => x !== e)].slice(0, 40);
          store.set('adm:recentEmoji', rec);
        });
        grid.append(b);
      }
    };
    sets.forEach(([icon, name], k) => {
      const b = el('button', { class: 'adm-etab', type: 'button', title: name, style: name === 'Kaomoji' ? 'font-size:11px' : '' }, icon);
      b.addEventListener('mousedown', ev => ev.preventDefault());
      b.addEventListener('click', () => show(k));
      tabs.append(b);
    });
    show(cur);
    return box;
  }

  // ---- messages ------------------------------------------------------------------------------
  function msgEl(t, m) {
    const prof = '/user/' + encodeURIComponent(m.name) + '/';
    const acts = el('div', { class: 'adm-acts' },
      el('span', { class: 'adm-act', 'data-act': 'like', title: 'Like' }, m.liked ? '♥' : '♡'),
      el('span', { class: 'adm-act', 'data-act': 'quote', title: 'Reply with a quote of this message' }, 'Reply'),
      m.origin ? null : el('span', { class: 'adm-act adm-own', 'data-act': 'edit', title: 'Edit your message' }, 'Edit'),
      m.origin ? null : el('span', { class: 'adm-act adm-own adm-del', 'data-act': 'del', title: 'Delete your message' }, 'Delete'));
    const text = el('div', { class: 'adm-text' });
    const b = el('div', { class: 'adm-b' },
      el('div', { class: 'adm-meta' }, el('a', { class: 'adm-n', href: prof }, m.name), el('span', { class: 'adm-tm' })),
      text, acts);
    const row = el('div', { class: 'adm-m' + (m.origin ? ' adm-origin' : ''), 'data-id': m.origin ? 'o' : m.id },
      el('a', { class: 'adm-av', href: prof, style: avStyle(m.av), title: m.name }), b);
    // phones: tap a bubble to show its buttons
    if (touch) b.addEventListener('click', e => { if (!e.target.closest('a, img, video, .adm-act, .markdown-spoiler, lite-youtube')) b.classList.toggle('adm-tap'); });
    updateEl(t, row, m);
    return row;
  }
  function updateEl(t, row, m) {
    row.classList.toggle('adm-mine', !!me && m.uid === me);
    const tm = row.querySelector('.adm-tm');
    tm.textContent = clock(m.t) + (m.origin ? ' · first message' : '');
    tm.title = new Date(m.t * 1000).toLocaleString();
    const like = row.querySelector('[data-act="like"]');
    like.textContent = m.liked ? '♥' : '♡';
    like.title = m.liked ? 'Unlike' : 'Like';
    let heart = row.querySelector('.adm-heart');
    if (m.likes) {
      if (!heart) { heart = el('span', { class: 'adm-heart', 'data-act': 'like' }); row.querySelector('.adm-b').append(heart); }
      heart.textContent = '♥' + (m.likes > 1 ? ' ' + m.likes : '');
      heart.title = 'Liked by ' + (m.likers || []).map(u => u.name).join(', ');
    } else if (heart) heart.remove();
    row.classList.toggle('adm-liked-row', !!m.likes);
    const key = (m.md != null ? m.md : '') + '\u0000' + (m.html || '');
    if (row._key !== key && !row._editing) { row._key = key; fillText(row.querySelector('.adm-text'), m.md, m.html); }
  }

  function render(t) {
    if (T !== t) return;
    const all = t.msgs;
    const vis = all.slice(-t.shown);
    const keep = new Set(vis.map(m => m.id));
    for (const [id, row] of t.els) if (id !== 'o' && !keep.has(id)) { dropVms(row); row.remove(); t.els.delete(id); }
    // the first message of the conversation, once you have scrolled back to the very start
    const i = info[t.id] || {};
    const atStart = t.fresh && t.minPage <= 1 && vis.length >= all.length && all.length >= t.count;
    const list = [];
    if (atStart && i.origin) list.push(i.origin);
    list.push(...vis);
    const frag = [];
    let prev = null, prevDay = '';
    for (const m of list) {
      const day = dayLabel(m.t);
      if (day !== prevDay) { frag.push(el('div', { class: 'adm-day' }, day)); prevDay = day; prev = null; }
      const id = m.origin ? 'o' : m.id;
      let row = t.els.get(id);
      if (!row) { row = msgEl(t, m); t.els.set(id, row); } else updateEl(t, row, m);
      row.classList.toggle('adm-cont', !!prev && !m.origin && !prev.origin && prev.uid === m.uid && m.t - prev.t < GROUP_GAP);
      frag.push(row);
      prev = m;
    }
    if (!atStart && t.els.has('o')) { const o = t.els.get('o'); dropVms(o); o.remove(); t.els.delete('o'); }
    // put rows in order without rebuilding them (keeps playing videos / open spoilers)
    const box = t.msgsEl;
    box.querySelectorAll(':scope > .adm-day').forEach(d => d.remove());
    let at = box.firstChild;
    for (const n of frag) {
      if (n === at) { at = at.nextSibling; continue; }
      box.insertBefore(n, at);
    }
    while (at) { const nx = at.nextSibling; if (!at._editing) { dropVms(at); at.remove(); } at = nx; }

    const hidden = Math.max(0, t.count - vis.length);
    t.olderBar.textContent = '';
    if (hidden || t.shown > SHOW_LAST) {
      if (hidden) t.olderBar.append(el('button', { class: 'adm-btn', type: 'button', disabled: t.olderBusy, onclick: () => loadOlder(t) },
        t.olderBusy ? 'Loading…' : 'Show older (' + hidden.toLocaleString() + ')'));
      if (t.shown > SHOW_LAST && vis.length > SHOW_LAST) t.olderBar.append(el('button', { class: 'adm-btn', type: 'button', onclick: () => hideOlder(t) }, 'Hide older'));
    }
    t.status.textContent = t.error || (!all.length ? (t.fresh ? 'No replies yet. Say hi!' : 'Loading…') : '');
    t.status.classList.toggle('adm-bad', !!t.error);
    if (i.locked) { t.ta.disabled = true; t.ta.placeholder = 'This conversation is locked'; }
  }

  function hideOlder(t) {
    t.shown = SHOW_LAST;
    render(t);
    t.stick = true; stickBottom(t);
  }

  async function loadOlder(t) {
    if (t.olderBusy) return;
    const sc = t.scroll, h0 = sc.scrollHeight, top0 = sc.scrollTop;
    const keepPlace = () => { sc.scrollTop = top0 + (sc.scrollHeight - h0); };
    t.stick = false;
    if (t.msgs.length > t.shown) { t.shown = Math.min(t.msgs.length, t.shown + OLDER_STEP); render(t); keepPlace(); return; }
    if (!t.fresh || t.minPage <= 1) return;
    t.olderBusy = true; render(t);
    try {
      const b = t.minPage - 1, a = Math.max(1, b - 1);
      const id = t.id;
      const d = await gql(`query{a:Page(page:${a},perPage:${PER}){activityReplies(activityId:${id}){${F}}} b:Page(page:${b},perPage:${PER}){activityReplies(activityId:${id}){${F}}}}`);
      if (T !== t) return;
      const got = [...d.a.activityReplies, ...(a !== b ? d.b.activityReplies : [])].filter(Boolean).map(slim).filter(m => !t.byId.has(m.id));
      setMsgs(t, [...got, ...t.msgs]);
      t.minPage = a;
      t.shown = Math.min(t.msgs.length, t.shown + Math.max(got.length, 1));
      t.error = '';
    } catch (e) {
      t.error = 'Could not load older messages: ' + e.message;
    } finally {
      t.olderBusy = false;
      if (T === t) { render(t); keepPlace(); }
    }
  }

  // A check asked for while another runs is not dropped: it runs right after.
  async function refreshOpen(t, manual) {
    if (T !== t) return;
    if (t.busy) { t.again = true; return t.inflight; }
    t.busy = true;
    t.inflight = (async () => {
      try {
        const id = t.id;
        const cnt = await gql(`query($id:Int){Activity(id:$id){${t.fresh && (info[id] || {}).origin ? ACT_COUNT : ACT}}}`, { id });
        if (!cnt.Activity) throw new Error('This conversation was not found (deleted?)');
        if (cnt.Activity.messenger || cnt.Activity.user) { info[id] = Object.assign(info[id] || {}, metaOf(cnt.Activity)); if (T === t) convoHead(); }
        const count = cnt.Activity.replyCount || 0;
        if (t.fresh && count === t.count && !manual) { t.error = ''; return; }
        const [got] = await fetchLatest([id], [count]);
        if (T !== t) return;
        const before = new Set(t.byId.keys());
        const newestBefore = t.msgs.reduce((x, m) => Math.max(x, m.id), 0);
        if (!t.fresh) { setMsgs(t, got); t.minPage = Math.max(1, Math.ceil(count / PER) - 1); t.fresh = true; }
        else {
          const from = got.length ? Math.min(...got.map(m => m.id)) : Infinity;
          setMsgs(t, [...t.msgs.filter(m => m.id < from), ...got]);
          if (!count) setMsgs(t, []);
        }
        // only messages newer than what was there count as new (opening a chat also loads OLDER ones)
        const added = newestBefore ? t.msgs.filter(m => m.id > newestBefore && !before.has(m.id)) : [];
        if (!t.stick && added.length) t.shown += added.length; // don't push what you're reading off the top
        t.count = count; t.error = '';
        remember(id, count, t.msgs);
        render(t);
        const theirs = added.filter(m => m.uid !== me).length;
        announce(id, t.msgs);
        if (t.stick) stickBottom(t, before.size > 0);
        else if (theirs && before.size) newPill(t, t.newCount + theirs);
      } catch (e) {
        if (T === t) { t.error = 'Could not load: ' + e.message; render(t); }
      } finally {
        t.busy = false;
        if (T === t && t.stick && document.visibilityState === 'visible' && ui.open && !ui.min) markSeen(t.id, t.msgs.slice(-Math.max(t.shown, SHOW_LAST)));
      }
    })();
    await t.inflight;
    if (t.again && T === t) { t.again = false; return refreshOpen(t, true); }
  }

  async function sendMsg(t) {
    const ta = t.ta;
    const raw = ta.value;
    if (!raw.trim() || t.sending) return;
    if (!token()) { t.hint.textContent = 'Log in to AniList first'; t.hint.classList.add('adm-bad'); return; }
    t.sending = true; t.sendBtn.disabled = true; t.sendBtn.textContent = 'Sending…';
    t.emoji.hidden = true;
    try {
      const d = await gql(Q_SEND, { a: t.id, t: encEmoji(raw) });
      const r = d.SaveActivityReply;
      if (!r) throw new Error('AniList did not accept it');
      if (ta.value === raw) { ta.value = ''; } // keep anything typed while it was sending
      store.del('adm:draft:' + t.id);
      grow(t); showPreview(t);
      if (T === t) {
        const m = slim(r);
        setMsgs(t, [...t.msgs.filter(x => x.id !== m.id), m]);
        t.count += 1; t.shown += 1;
        remember(t.id, t.count, t.msgs);
        markSeen(t.id, [m]);
        render(t);
        t.stick = true; stickBottom(t, true);
        flash(t, 'Sent');
        setTimeout(() => refreshOpen(t, true), 800);
      }
    } catch (e) {
      t.hint.textContent = 'Not sent: ' + e.message + ' (your text is still here, press Send again)';
      t.hint.classList.add('adm-bad');
    } finally {
      t.sending = false; t.sendBtn.disabled = false; t.sendBtn.textContent = 'Send';
      if (!touch) ta.focus({ preventScroll: true });
    }
  }

  // ---- pictures, GIFs and videos open big on top of the page (click outside / x / Esc closes) ----
  // They are the real <img> / <video>, so right-click > Save works as everywhere else.
  let LB = null;
  function openViewer(media) {
    closeViewer();
    let big;
    if (media.tagName === 'VIDEO') {
      const src = media.currentSrc || media.src || (media.querySelector('source') || {}).src || '';
      big = el('video', { class: 'adm-lb-media', src, controls: true, autoplay: true, loop: true, playsinline: true });
      big.muted = false; // opened by your click, so it may play with sound
      big.play().catch(() => { big.muted = true; big.play().catch(() => {}); });
    } else {
      big = el('img', { class: 'adm-lb-media', src: media.currentSrc || media.src, alt: '' });
    }
    const x = el('button', { class: 'adm-lb-x', type: 'button', title: 'Close (Esc)', onclick: closeViewer }, '×');
    const ov = el('div', { class: 'adm-lb' }, big, x);
    ov.addEventListener('click', e => { if (e.target === ov) closeViewer(); }); // outside the picture = close
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeViewer(); } };
    document.addEventListener('keydown', onKey, true);
    LB = { ov, onKey };
    document.body.appendChild(ov);
  }
  function closeViewer() {
    if (!LB) return;
    document.removeEventListener('keydown', LB.onKey, true);
    LB.ov.querySelectorAll('video').forEach(v => { try { v.pause(); } catch (e) {} });
    LB.ov.remove();
    LB = null;
  }

  function onMsgClick(t, e) {
    const media = e.target.closest('.adm-text img, .adm-text video');
    if (media && !e.target.closest('[data-act]')) { e.preventDefault(); e.stopPropagation(); openViewer(media); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const row = act.closest('.adm-m');
    const id = row.dataset.id === 'o' ? 'o' : +row.dataset.id;
    const m = id === 'o' ? (info[t.id] || {}).origin : t.byId.get(id);
    if (!m) return;
    const what = act.dataset.act;
    if (what === 'like') toggleLike(t, m, row);
    else if (what === 'quote') quoteMsg(t, m);
    else if (what === 'edit') startEdit(t, m, row);
    else if (what === 'del') askDelete(t, m, row);
  }

  async function toggleLike(t, m, row) {
    try {
      const d = await gql(Q_LIKE, { id: m.id, type: m.origin ? 'ACTIVITY' : 'ACTIVITY_REPLY' });
      const r = d.ToggleLikeV2;
      if (r) { m.likes = r.likeCount; m.liked = !!r.isLiked; m.likers = likersOf(r); updateEl(t, row, m); }
      if (!m.origin) remember(t.id, t.count, t.msgs);
    } catch (e) { t.error = 'Like failed: ' + e.message; render(t); }
  }

  function quoteMsg(t, m) {
    const q = decEmoji(m.md || '').trim().split('\n').filter(l => !/^\s*>/.test(l)).map(l => '> ' + l).join('\n');
    const ta = t.ta;
    const cur = ta.value;
    ta.value = (cur.trim() ? cur.replace(/\s*$/, '\n\n') : '') + (q || '> …') + '\n\n';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  function startEdit(t, m, row) {
    if (row._editing) return;
    row._editing = true;
    const text = row.querySelector('.adm-text');
    const ta = el('textarea', {});
    ta.value = decEmoji(m.md || '');
    const done = () => {
      clearTimeout(pvTimer);
      if (pv._vm) { try { pv._vm.$destroy(); } catch (e) {} pv._vm = null; }
      box.remove(); text.style.display = ''; row._editing = false;
    };
    const save = el('button', { class: 'adm-btn adm-pri', type: 'button' }, 'Save');
    const doSave = async () => {
      if (!ta.value.trim()) return;
      save.disabled = true; save.textContent = 'Saving…';
      try {
        const d = await gql(Q_SAVE, { id: m.id, a: t.id, t: encEmoji(ta.value) });
        const r = d.SaveActivityReply;
        if (r) { m.md = r.md; m.html = r.html; }
        done(); row._key = null; updateEl(t, row, m);
        remember(t.id, t.count, t.msgs);
      } catch (e) { save.disabled = false; save.textContent = 'Save'; save.title = e.message; }
    };
    save.addEventListener('click', doSave);
    const pv = el('div', { class: 'adm-preview', hidden: true });
    let pvTimer = 0;
    const redraw = () => { clearTimeout(pvTimer); pvTimer = setTimeout(() => drawPreview(pv, ta.value, ui.preview), 250); };
    ta.addEventListener('input', redraw);
    const box = el('div', { class: 'adm-edit' }, ta, pv,
      el('div', { class: 'adm-btns' }, el('span', { style: 'flex:1;font-size:11.5px;opacity:.6' }, 'Ctrl+Enter saves · Esc cancels'),
        el('button', { class: 'adm-btn', type: 'button', onclick: done }, 'Cancel'), save));
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doSave(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(); }
    });
    text.style.display = 'none';
    text.after(box);
    ta.style.height = Math.min(ta.scrollHeight + 6, window.innerHeight * 0.35) + 'px';
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    redraw();
  }

  function askDelete(t, m, row) {
    if (row.querySelector('.adm-confirm')) return;
    const box = el('div', { class: 'adm-confirm' }, 'Delete this message?',
      el('button', { class: 'adm-btn', type: 'button', onclick: () => box.remove() }, 'No'),
      el('button', { class: 'adm-btn adm-pri', type: 'button', style: 'background:rgb(var(--color-red))', onclick: async () => {
        try {
          const d = await gql(Q_DEL, { id: m.id });
          if (d.DeleteActivityReply && d.DeleteActivityReply.deleted) {
            setMsgs(t, t.msgs.filter(x => x.id !== m.id));
            t.count = Math.max(0, t.count - 1);
            remember(t.id, t.count, t.msgs);
            render(t);
          }
        } catch (e) { box.firstChild.textContent = 'Delete failed: ' + e.message + ' '; }
      } }, 'Delete'));
    row.querySelector('.adm-b').append(box);
  }

  // ---- everything in step -------------------------------------------------------------------
  function renderAll() {
    renderBadge();
    if (!ui.open) return;
    if (T) { render(T); convoHead(); } else { listHead(); renderList(); }
  }

  // other AniList tabs: new messages, read marks, added / removed conversations
  window.addEventListener('storage', e => {
    if (!e.key || !e.key.startsWith('adm:')) return;
    if (e.key === 'adm:seen') seen = store.get('adm:seen', {});
    else if (e.key === 'adm:threads') { threads = store.get('adm:threads', threads); if (T && !threads.includes(T.id)) showList(); }
    else if (e.key === 'adm:info') info = store.get('adm:info', info);
    else if (e.key === 'adm:upd') { upd = store.get('adm:upd', upd); renderHead(); return; }
    else if (e.key === 'adm:ui') { const u = store.get('adm:ui', {}); ui.sound = u.sound; ui.soundPick = u.soundPick; ui.volume = u.volume; return; }
    else if (e.key === 'adm:sounds') { /* the list below redraws with the new names */ }
    else if (e.key.startsWith('adm:m:')) { if (T && e.key === 'adm:m:' + T.id && changedOutside(T)) refreshOpen(T, true); }
    else return;
    renderBadge();
    if (ui.open && !T) { if (document.hidden) listStale = true; else renderList(); } // a hidden tab redraws when you come back
  });
  let listStale = false;

  function start() {
    if (!document.body || !document.head) return setTimeout(start, 200);
    // logged out: nothing to show (AniList keeps the logged-in user in localStorage "auth")
    if (!token() && !localStorage.getItem('auth')) { setTimeout(start, 5000); return; }
    build();
    if (ui.open) { panel.hidden = false; if (ui.thread && threads.includes(ui.thread)) openThread(ui.thread); else showList(); }
    renderBadge();
    askMe().then(addDefaults).then(() => pollAll(true));
    checkUpdate();
    setInterval(checkUpdate, 20 * 60e3);
    setInterval(() => pollAll(false), 5000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (ui.open && !T && listStale) { listStale = false; renderList(); }
      pollAll(false);
      if (T && ui.open) refreshOpen(T);
    });
    // times like "5m" stay current
    setInterval(() => { if (ui.open && !T && !document.hidden) renderList(); else if (ui.open && !T) listStale = true; }, 60000);
  }
  start();
})();

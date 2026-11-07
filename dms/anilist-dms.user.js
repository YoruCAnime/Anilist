// ==UserScript==
// @name         AniList DMs
// @namespace    exos.anilist.dms
// @author       YoruC
// @version      1.4.1
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

  const VERSION = '1.4.1'; // the same as @version above
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
  .adm-soundsel { flex: 1; min-width: 90px; max-width: 100%; font: inherit; font-size: 13px; padding: 2px 4px; border-radius: 6px; border: 1px solid rgba(var(--color-text), .18);
    background: rgb(var(--color-background)); color: rgb(var(--color-text)); }
  .adm-soundnote { font-size: 12px; }

  .adm-convo { flex: 1; min-height: 0; display: flex; flex-direction: column; position: relative; }
  .adm-scroll { flex: 1 1 0; min-height: 70px; overflow-y: auto; overscroll-behavior: contain; padding: 8px 10px 6px; }
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
  .adm-hb.adm-live { opacity: .55; }
  .adm-hb.adm-live.adm-on { opacity: 1; color: #f5c542; }
  .adm-livemsg .adm-b { box-shadow: inset 0 0 0 1px rgba(245, 197, 66, .35); }
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
  .adm-compose { flex: 0 1 auto; min-height: 0; display: flex; flex-direction: column; padding: 6px 10px 9px; background: rgb(var(--color-background)); position: relative; }
  .adm-compose > .adm-tools, .adm-compose > .adm-send-row { flex: none; }
  .adm-compose > .adm-ta { flex: 0 1 auto; }
  .adm-compose > .adm-preview { flex: 0 1 auto; min-height: 48px; }
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
    .adm-panel, .adm-big .adm-panel { position: fixed; left: 6px; right: 6px; top: 56px; bottom: max(116px, calc(var(--adm-kb, 0px) + 6px)); width: auto; height: auto; }
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
    // phones: the on-screen keyboard covers the page without resizing it, so the chat moves up by what it hides
    if (window.visualViewport && !rootEl._kbFit) {
      const vv = window.visualViewport;
      rootEl._kbFit = () => { const kb = Math.round(window.innerHeight - vv.height - vv.offsetTop); rootEl.style.setProperty('--adm-kb', (kb > 60 ? kb : 0) + 'px'); };
      vv.addEventListener('resize', rootEl._kbFit);
      vv.addEventListener('scroll', rootEl._kbFit);
      rootEl._kbFit();
    }
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

  // ---- "nya" for new messages (Exos's clip as it came, 1.07 s, quiet by default) ----
  const NYA = 'data:audio/mpeg;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAZGFzaABUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzbzZtcDQxAFRTU0UAAAAPAAADTGF2ZjYyLjEyLjEwMQAAAAAAAAAAAAAA//vgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAqAACvgQALCxERFxcXHR0jIykpKS8vNTU1OztBQUdHR01NU1NZWVlfX2VlZWtrcXF3d3d9fYKCiIiIjo6UlJSamqCgpqamrKyysrK4uL6+xMTEysrQ0NbW1tzc4uLi6Oju7vT09Pr6//8AAAAATGF2YzYyLjI4AAAAAAAAAAAAAAAAJALAAAAAAAAAr4GA26yIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vgZAAP8AAAaQAAAAgAAA0gAAABACQCAASAACAEgEAAkAAEEIiTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAABmcqXGJDhgwIaNNHeR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';
  // the sound before 1.3.4 (the flat neko sound of AniList Reply Alerts, 0.24 s), still there to pick in the options
  const NYA_OLD = 'data:audio/mpeg;base64,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EAKZufHHBZhoOg+Fh0IATJD0MZkd0QDASAEIBr5aCkQwoAChqZKEmKh5sukCrQ0UjCouCpEwsvB2Qe8KiLrrWHBK1y9nTK5RhYrsmERkQHLU2UgX9fNSYoRINlDhMt99HWp6OBoxPfzu+h8OB0qxjILe/1eT//6gY4a8WQhRkOCw8eDv/jRqjA50qgAwSnBgEQnpuhKWbWHXsIBkyAoMSJGIjIsIif/7cMQNg5LZGzRN5PFKQyTkwaYfSERCRop8YeMgJhBAQYgEmBBhkoodU2nvQf2oPdOuYDfhDRd0EAqcLqaWzVeTzVIozV+WGuMwUs0SnoDgYCm0HHgwNOxeyaKhzqMGyeW45Tw0X6y/I5R0UiMpVhwbXqV+xdSbf66J1HTTi8aoVEpDi4PQlGyvb11NRx460/XpBiA8Kk/AtR1AABlQUOlKgvuCiIXBGNFnCgkQs5boUDmCYgRSa5CZOsZeaFixmwAVBg7oIQgoFfy+7KIBdprzK2Co3MOLvJppAsMYFD6JiaIoBMoLDiAjADQKUWGyruMxIbeGscfyh7OVhOVBKOesutuTU35R5//R72yoPRaYNupMuKjjzQckTkX1HkWy5vlKBBmBjShwtBmTalwJIFUuFBRkBZjSZcX/+3LEC4ORoPcgLW0PQmER44GXmlkQDw48Z56QLk2xwcKNzBRkwAwAAudCZGWBgGVzPg8xolGiRLwv9D6t0QmmYtZzaUXeqpVIIVMGEpDKrrCiIDUoHgtVJWNTzH2dQEBoOijqHrbNEA2Hmh8KmtND9t4n//i/+b9I7a9FsYHy/K9+OKAww9mlLU+VfEsiMpHGwiVMMCAJhrtA40RgCQQWFMgVTQxThJICGpBPyMEnRqcg8HJ7FoiXJ1QxYuT9LjEV1E87iwpzdCOoAnohJ4yoaqW5DmaCjLWChOU2zjaaRk8UNuKGihouYaKGhX/5xUVKKml8bPNLNLLNLNJLNLNNLNLPNLNLLNLNJLNLNNLNLPret71vUm9b1ret71vW963rW9bqAmqiE4RmBMKSI6QMHyUVCEaD4wRl0v/7cMQLA8z8gshEhNQIAAA0gAAABE0k0k1F14Tx+bXiRE4SBCgMQegtGpcotnYsossoMWK0VVVVUgapKu3aaaoixW3/VVTDVJV2+mmqZKVoq+qqmVESrp/tNUyUrRV/1UyoiVdP/9VMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
  // one noise of the 'anime cat girl' clip (_dev\dm tests\make_cat.py)
  const NYA_CAT = 'data:audio/mpeg;base64,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';
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
  // Shared sounds: every sound file at the top of this public repo shows in everyone's list. The files are only ever
  // played as sound. Its list is asked for when the options open, at most once an hour (shared by every AniList tab).
  const DROPBOX = 'j35draaken-ui/Yoru_dropbox';
  // the two clips the built-in sounds were cut from: same sounds, not listed twice
  const DROP_SKIP = new Set(['3012e107acee2e535c374f16de8f8a2ca50b3bb3', '1211bc43ebbb36df550459212e38e53edcc67c02']);
  const dropSounds = () => (store.get('adm:drop', {}).list || []);
  const dropUrl = name => 'https://raw.githubusercontent.com/' + DROPBOX + '/HEAD/' + encodeURIComponent(name);
  async function checkDropbox() {
    const d = store.get('adm:drop', {});
    if (d.at && Date.now() - d.at < 3600e3) return;
    store.set('adm:drop', Object.assign(d, { at: Date.now() })); // the other tabs don't ask too
    try {
      const r = await fetch('https://api.github.com/repos/' + DROPBOX + '/contents', { cache: 'no-store', credentials: 'omit' });
      if (!r.ok) return;
      const files = await r.json();
      const list = files.filter(f => f && f.type === 'file' && /\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i.test(f.name) && f.size <= SOUND_MAX_MB * 1048576 && !DROP_SKIP.has(f.sha))
        .slice(0, 50).map(f => f.name);
      store.set('adm:drop', { at: d.at, list });
      if (ui.open && !T && listState.menu) renderList();
    } catch (e) {}
  }
  const dropTitle = name => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || name;
  // what is picked, if it is still there; otherwise the default
  function pickNow() {
    const p = String(ui.soundPick || 'new');
    if (p === 'old' || p === 'cat') return p;
    if (p.startsWith('u:') && ownSounds().some(x => x.id === p.slice(2))) return p;
    if (p.startsWith('d:') && dropSounds().includes(p.slice(2))) return p;
    return 'new';
  }
  const nyaAudio = {};
  let nyaStop = 0;
  async function soundAudio(pick) {
    if (nyaAudio[pick]) return nyaAudio[pick];
    let src = pick === 'old' ? NYA_OLD : pick === 'cat' ? NYA_CAT : NYA;
    if (pick.startsWith('d:')) src = dropUrl(pick.slice(2));
    if (pick.startsWith('u:')) {
      const f = await soundFiles('readonly', st => st.get(pick.slice(2)));
      if (f && f.blob) src = URL.createObjectURL(f.blob); else pick = 'new'; // removed in another tab: the default
      if (nyaAudio[pick]) return nyaAudio[pick];
    }
    return (nyaAudio[pick] = new Audio(src));
  }
  async function nya(force) {
    if (!force && !ui.sound) return;
    // only one AniList tab says it, not twice for the same message, and a sound still playing is never cut off
    if (!force) {
      const now = Date.now();
      if (now - store.get('adm:nyaAt', 0) < 2500 || now < store.get('adm:nyaEnd', 0)) return;
      store.set('adm:nyaAt', now);
    }
    try {
      const pick = pickNow(), a = await soundAudio(pick);
      if (!force && !a.paused && !a.ended) return;
      for (const k in nyaAudio) if (nyaAudio[k] !== a) nyaAudio[k].pause(); // trying another sound in the options
      a.volume = Math.max(0, Math.min(1, +ui.volume || 0));
      a.currentTime = 0;
      const until = () => { if (isFinite(a.duration)) store.set('adm:nyaEnd', Date.now() + Math.min(a.duration, SOUND_MAX_S) * 1000); };
      if (a.readyState >= 1) until(); else a.addEventListener('loadedmetadata', until, { once: true });
      clearTimeout(nyaStop); nyaStop = setTimeout(() => a.pause(), SOUND_MAX_S * 1000); // a long shared sound stops here
      a.play().catch(() => { // the browser may refuse sound in a tab you never clicked in
        if (!a.error || pick === 'new') return;
        delete nyaAudio[pick]; // could not load it (no connection, removed): the default this time
        soundAudio('new').then(d => { d.volume = a.volume; d.currentTime = 0; d.play().catch(() => {}); });
      });
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
    const top = (msgs || []).filter(m => m.uid && m.uid !== me && !isKeyMsg(m)).reduce((x, m) => Math.max(x, m.id), 0); // the hidden live key makes no sound
    if (!top) return;
    const heard = store.get('adm:heard', {});
    const prev = heard[id];
    if (prev && top <= prev) return;
    heard[id] = top; store.set('adm:heard', heard);
    if (prev && soundReady) nya();
  }

  // ---- live chat (1.4.0) -------------------------------------------------------------------
  // A private chat can go live: messages travel through Firebase at once (no AniList cooldown), scrambled with a key
  // that only exists inside the private AniList chat itself (one reply holding "dmslive:<key>", hidden here), so
  // Firebase only ever holds scrambled text under a room name made from that key. Once a day one of the two plugins
  // copies the live messages into the AniList chat as one reply and deletes them from Firebase.
  const FB = { key: 'AIzaSyAY7BQxQuq3PiglS475Qj3Oqwv1NOHzCLU', db: 'https://yoru-dms-default-rtdb.europe-west1.firebasedatabase.app' };
  const LIVE_RE = /dmslive:([A-Za-z0-9_-]{43})/;
  const LIVE_CHUNK = 3000, LIVE_MAX = 20000;
  const liveDay = () => +store.get('adm:testCopyMs', 0) || 24 * 3600e3; // a day between copies (tests shorten it)
  const isKeyMsg = m => !!(m && typeof m.md === 'string' && LIVE_RE.test(m.md));
  const liveWait = ms => new Promise(r => setTimeout(r, ms));
  function b64e(u8) { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(str) { const s = str.replace(/-/g, '+').replace(/_/g, '/'); const b = atob(s + '='.repeat((4 - s.length % 4) % 4)); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  const liveKeyRaw = id => store.get('adm:lk:' + id, '');
  const LP = 'live2'; // 1.4.1 (writer-owned messages); 1.4.0 wrote to /live, still read and copied
  const fbUid = () => (store.get('adm:fb', null) || {}).uid || '';
  const liveMine = m => !!(m && m.live && m.p === LP && m.w && m.w === fbUid());
  const liveOn = id => !!liveKeyRaw(id) && !store.get('adm:liveoff:' + id, false);

  // an anonymous Firebase sign-in for this browser (no account; kept and refreshed here)
  let fbBusy = null;
  async function fbToken() {
    const a = store.get('adm:fb', null);
    if (a && a.tok && a.exp - Date.now() > 120e3) return a;
    if (fbBusy) return fbBusy;
    fbBusy = (async () => {
      let r, j;
      if (a && a.ref) {
        r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + FB.key, { method: 'POST', credentials: 'omit',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(a.ref) });
        if (r.ok) { j = await r.json(); const n = { uid: j.user_id, tok: j.id_token, ref: j.refresh_token, exp: Date.now() + (+j.expires_in || 3600) * 1000 }; store.set('adm:fb', n); return n; }
      }
      r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + FB.key, { method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' });
      if (!r.ok) throw new Error('live chat sign-in failed (' + r.status + ')');
      j = await r.json();
      const n = { uid: j.localId, tok: j.idToken, ref: j.refreshToken, exp: Date.now() + (+j.expiresIn || 3600) * 1000 };
      store.set('adm:fb', n);
      return n;
    })();
    try { return await fbBusy; } finally { fbBusy = null; }
  }
  async function fbReq(path, method, body) {
    const a = await fbToken();
    return fetch(FB.db + path + '.json?auth=' + encodeURIComponent(a.tok), { method: method || 'GET', credentials: 'omit', cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
  }

  // the key, the scrambling and the room name
  const liveKeys = {};
  async function liveKeyOf(id) {
    const raw = liveKeyRaw(id);
    if (!raw) return null;
    if (liveKeys[id] && liveKeys[id].raw === raw) return liveKeys[id];
    const key = await crypto.subtle.importKey('raw', b64d(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dms-room:' + raw)));
    const room = Array.from(h.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
    return (liveKeys[id] = { raw, key, room });
  }
  async function liveSeal(k, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k.key, new TextEncoder().encode(JSON.stringify(obj))));
    return { c: b64e(c), v: b64e(iv) };
  }
  const liveOpened = new Map(); // firebase key -> { c, o } (no second unscrambling of the same message)
  async function liveOpen(k, key, rec) {
    const hit = liveOpened.get(key);
    if (hit && hit.c === rec.c) return hit.o;
    try {
      const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(rec.v) }, k.key, b64d(rec.c));
      const o = JSON.parse(new TextDecoder().decode(p));
      liveOpened.set(key, { c: rec.c, o });
      return o;
    } catch (e) { return null; }
  }
  const liveMsg = (key, tms, o, w, p) => ({ id: 'L' + key, live: true, tms, t: Math.floor(tms / 1000), uid: +o.u || 0, name: String(o.n || '?'),
    av: String(o.a || ''), md: String(o.x || ''), html: '', likes: 0, liked: false, likers: [], w: String(w || ''), p: p || LP, edited: !!o.ed });
  async function liveDecode(k, data, p) {
    const out = [];
    for (const [key, rec] of Object.entries(data || {})) {
      if (!rec || typeof rec.c !== 'string' || typeof rec.v !== 'string') continue;
      const o = await liveOpen(k, key, rec);
      if (o) out.push(liveMsg(key, +rec.t || Date.now(), o, rec.w, p || LP));
    }
    return out.sort((a, b) => a.tms - b.tms || (a.id < b.id ? -1 : 1));
  }
  // the live messages of a chat, shared by every AniList tab
  function liveMsgsOf(id) {
    const c = store.get('adm:lm:' + id, null);
    return c && c.k === liveKeyRaw(id) ? (c.msgs || []) : [];
  }
  function liveStore(id, msgs) {
    msgs = msgs.slice(-200);
    store.set('adm:lm:' + id, { k: liveKeyRaw(id), msgs });
    const last = msgs[msgs.length - 1], i = info[id];
    if (last && i && (!i.lastT || last.t >= i.lastT)) { i.lastT = last.t; i.lastUid = last.uid; i.snip = '⚡ ' + snip(last.md); store.set('adm:info', info); }
  }
  // seen / heard (red number and sound), by Firebase time
  function liveSeenNow(id) {
    const top = liveMsgsOf(id).reduce((x, m) => Math.max(x, m.tms), 0);
    const ls = store.get('adm:lseen', {});
    if (top > (ls[id] || 0)) { ls[id] = top; store.set('adm:lseen', ls); }
  }
  function liveUnread(id) {
    const s = store.get('adm:lseen', {})[id] || 0;
    return liveMsgsOf(id).filter(m => m.uid !== me && m.tms > s).length;
  }
  function liveAnnounce(id) {
    const top = liveMsgsOf(id).filter(m => m.uid !== me).reduce((x, m) => Math.max(x, m.tms), 0);
    if (!top) return;
    const heard = store.get('adm:lheard', {});
    const prev = heard[id];
    if (prev !== undefined && top <= prev) return;
    heard[id] = top; store.set('adm:lheard', heard);
    if (prev !== undefined && soundReady) nya();
  }
  // the newest key reply of the chat wins (both plugins end up on the same one)
  function liveFindKey(id, msgs) {
    const k = (msgs || []).filter(isKeyMsg).sort((a, b) => a.id - b.id).pop();
    if (!k || k.id <= store.get('adm:lkid:' + id, 0)) return;
    store.set('adm:lk:' + id, k.md.match(LIVE_RE)[1]);
    store.set('adm:lkid:' + id, k.id);
    store.del('adm:liveoff:' + id);
    const heard = store.get('adm:lheard', {});
    if (heard[id] === undefined) { heard[id] = Date.now() - 60e3; store.set('adm:lheard', heard); }
    if (T && T.id === id) { convoHead(); liveStream(T); }
  }
  async function liveFetch(id) {
    const k = await liveKeyOf(id);
    if (!k) return [];
    const r = await fbReq('/' + LP + '/' + k.room + '/m');
    if (!r.ok) throw new Error('live chat: ' + r.status);
    const msgs = await liveDecode(k, await r.json(), LP);
    const o = await fbReq('/live/' + k.room + '/m'); // sent with 1.4.0
    if (o.ok) { msgs.push(...await liveDecode(k, await o.json(), 'live')); msgs.sort((a, b) => a.tms - b.tms || (a.id < b.id ? -1 : 1)); }
    liveStore(id, msgs);
    return msgs;
  }
  async function liveSend(t, raw) {
    if (raw.length > LIVE_MAX) throw new Error('too long for live chat (' + LIVE_MAX.toLocaleString() + ' characters at most)');
    const k = await liveKeyOf(t.id);
    if (!k) throw new Error('live chat is not on');
    const i = info[t.id] || {};
    const mine = [i.from, i.to].find(x => x && x.id === me) || { id: me, name: 'You', av: '' };
    const o = { u: me, n: mine.name, a: mine.av, x: raw };
    const sealed = await liveSeal(k, o);
    const a = await fbToken();
    const r = await fbReq('/' + LP + '/' + k.room + '/m', 'POST', Object.assign(sealed, { t: { '.sv': 'timestamp' }, w: a.uid }));
    if (!r.ok) throw new Error('live chat refused it (' + r.status + ')');
    const j = await r.json();
    liveOpened.set(j.name, { c: sealed.c, o });
    if (!liveMsgsOf(t.id).some(m => m.id === 'L' + j.name)) liveStore(t.id, liveMsgsOf(t.id).concat(liveMsg(j.name, Date.now(), o, a.uid, LP)));
  }
  // your own live message: change it (keeps its time) or take it away
  async function liveEdit(t, m, text) {
    if (!liveMine(m)) throw new Error('only the browser that sent it can change it');
    if (text.length > LIVE_MAX) throw new Error('too long (' + LIVE_MAX.toLocaleString() + ' characters at most)');
    const k = await liveKeyOf(t.id);
    const key = m.id.slice(1), path = '/' + LP + '/' + k.room + '/m/' + key;
    const cur = await fbReq(path);
    const rec = cur.ok ? await cur.json() : null;
    if (!rec) throw new Error('it is not there any more (copied into AniList?)');
    const o = { u: me, n: m.name, a: m.av, x: text, ed: 1 };
    const sealed = await liveSeal(k, o);
    const r = await fbReq(path, 'PUT', Object.assign(sealed, { t: rec.t, w: fbUid() }));
    if (!r.ok) throw new Error('live chat refused it (' + r.status + ')');
    liveOpened.set(key, { c: sealed.c, o });
    liveStore(t.id, liveMsgsOf(t.id).map(x => x.id === m.id ? liveMsg(key, +rec.t, o, fbUid(), LP) : x));
  }
  async function liveDelete(t, m) {
    if (!liveMine(m)) throw new Error('only the browser that sent it can delete it');
    const k = await liveKeyOf(t.id);
    const r = await fbReq('/' + LP + '/' + k.room + '/m/' + m.id.slice(1), 'DELETE');
    if (!r.ok) throw new Error('live chat refused it (' + r.status + ')');
    liveStore(t.id, liveMsgsOf(t.id).filter(x => x.id !== m.id));
  }
  // the open chat listens to Firebase (a live stream, no checking every few seconds)
  function liveStop(t) { if (t && t.es) { t.es.close(); t.es = null; } }
  async function liveStream(t) {
    liveStop(t);
    const k = await liveKeyOf(t.id);
    if (!k || T !== t) return;
    let a;
    try { a = await fbToken(); } catch (e) { return; }
    if (T !== t) return;
    liveStop(t);
    const es = t.es = new EventSource(FB.db + '/' + LP + '/' + k.room + '/m.json?auth=' + encodeURIComponent(a.tok));
    let data = {}, n = 0;
    const changed = async () => {
      const my = ++n;
      const msgs = (await liveDecode(k, data, LP)).concat(liveMsgsOf(t.id).filter(m => m.p === 'live')).sort((a, b) => a.tms - b.tms || (a.id < b.id ? -1 : 1));
      if (my !== n || T !== t || t.es !== es) return;
      liveStore(t.id, msgs);
      liveUpdated(t);
    };
    const onPut = (ev, patch) => {
      let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (!d) return;
      const parts = String(d.path || '/').split('/').filter(Boolean);
      if (!parts.length) data = patch ? Object.assign(data, d.data || {}) : Object.assign({}, d.data || {});
      else if (parts.length === 1) {
        if (d.data === null) delete data[parts[0]];
        else data[parts[0]] = patch ? Object.assign({}, data[parts[0]], d.data) : d.data;
      } else { liveFetch(t.id).then(() => liveUpdated(t)).catch(() => {}); return; }
      if (patch) for (const key of Object.keys(data)) if (data[key] === null) delete data[key];
      changed();
    };
    es.addEventListener('put', ev => onPut(ev, false));
    es.addEventListener('patch', ev => onPut(ev, true));
    es.addEventListener('auth_revoked', () => { liveStop(t); setTimeout(() => { if (T === t) liveStream(t); }, 500); });
    es.addEventListener('cancel', () => liveStop(t));
  }
  function liveUpdated(t) {
    if (T !== t) return;
    render(t);
    liveAnnounce(t.id);
    if (t.stick) { stickBottom(t, true); if (document.visibilityState === 'visible' && ui.open && !ui.min) markSeen(t.id, t.msgs); }
    renderBadge();
  }
  async function liveStart(t) {
    if (t.liveBusy) return;
    t.liveBusy = true;
    flash(t, 'Turning on live chat…');
    try {
      const raw = b64e(crypto.getRandomValues(new Uint8Array(32)));
      const d = await gql(Q_SEND, { a: t.id, t: '⚡ Live chat on (AniList DMs plugin) `dmslive:' + raw + '`' });
      if (!d.SaveActivityReply) throw new Error('AniList did not accept it');
      liveFindKey(t.id, [slim(d.SaveActivityReply)]);
      flash(t, 'Live chat is on');
      refreshOpen(t, true);
    } catch (e) {
      t.hint.textContent = 'Live chat not turned on: ' + e.message; t.hint.classList.add('adm-bad');
    } finally { t.liveBusy = false; }
  }
  function liveToggle(t) {
    if (!liveKeyRaw(t.id)) return liveStart(t);
    if (liveOn(t.id)) store.set('adm:liveoff:' + t.id, true); else store.del('adm:liveoff:' + t.id);
    convoHead();
    flash(t, liveOn(t.id) ? 'Live chat is on' : 'Sending through AniList again (live messages still arrive)');
  }
  function liveBtn(i) {
    if (!T || !(i.private && i.kind === 'message') || i.locked) return null;
    const has = !!liveKeyRaw(T.id), on = liveOn(T.id);
    return hb('⚡', !has ? 'Turn on live chat: no waiting between messages; they are copied into this AniList chat once a day'
      : on ? 'Live chat is on (copied into this AniList chat once a day). Click to send through AniList instead'
        : 'Live chat is off for you. Click to turn it back on', () => liveToggle(T), { class: 'adm-hb adm-live' + (on ? ' adm-on' : '') });
  }
  function liveHint(t) {
    if (!t || !t.hint || t.hint.classList.contains('adm-bad')) return;
    t.hint.textContent = liveOn(t.id) ? '⚡ Live · copied to AniList once a day' : (ui.enterSends ? 'Enter sends · Shift+Enter new line' : 'Ctrl+Enter sends');
  }
  // once a day: one plugin claims the copy, posts the live messages as one reply (more parts on the next checks if
  // they are long) and deletes what it posted from Firebase
  function liveText(msgs) {
    const when = tms => { const d = new Date(tms); return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    return '⚡ __Live chat__\n\n' + msgs.map(m => '__' + m.name + '__ · ' + when(m.tms) + '\n' + m.md).join('\n\n');
  }
  async function liveCopy(id) {
    const k = await liveKeyOf(id);
    if (!k) return;
    const msgs = liveMsgsOf(id);
    const a = await fbToken();
    let claim = store.get('adm:lcopy:' + id, 0);
    if (!claim) {
      if (!msgs.length) return;
      const sr = await fbReq('/' + LP + '/' + k.room + '/s');
      const old = sr.ok ? await sr.json() : null;
      const now = Date.now();
      if (old && old.at && now - old.at < liveDay()) return;
      if (!old && now - msgs[0].tms < liveDay()) return; // the first copy: a day after the first live message
      const w = await fbReq('/' + LP + '/' + k.room + '/s', 'PUT', { at: now, by: a.uid });
      if (!w.ok) return;
      await liveWait(3000);
      const chk = await (await fbReq('/' + LP + '/' + k.room + '/s')).json();
      if (!chk || chk.by !== a.uid || chk.at !== now) return; // the other plugin got there first
      claim = now;
      store.set('adm:lcopy:' + id, claim);
      store.set('adm:lcopyold:' + id, old);
    }
    const due = msgs.filter(m => m.tms <= claim);
    if (!due.length) { store.del('adm:lcopy:' + id); store.del('adm:lcopyold:' + id); return; }
    const part = [];
    for (const m of due) { part.push(m); if (part.length > 1 && liveText(part).length > LIVE_CHUNK) { part.pop(); break; } }
    try {
      const d = await gql(Q_SEND, { a: id, t: encEmoji(liveText(part)) });
      if (!d.SaveActivityReply) throw new Error('not accepted');
    } catch (e) {
      // AniList said no (too fast?): give the claim back so the next check can try again
      const old = store.get('adm:lcopyold:' + id, null);
      try { await fbReq('/' + LP + '/' + k.room + '/s', old ? 'PUT' : 'DELETE', old || undefined); } catch (e2) {}
      store.del('adm:lcopy:' + id); store.del('adm:lcopyold:' + id);
      return;
    }
    const gone = { [LP]: {}, live: {} };
    for (const m of part) gone[m.p === 'live' ? 'live' : LP][m.id.slice(1)] = null;
    for (const path of [LP, 'live']) if (Object.keys(gone[path]).length) await fbReq('/' + path + '/' + k.room + '/m', 'PATCH', gone[path]);
    const ids = new Set(part.map(m => m.id));
    liveStore(id, liveMsgsOf(id).filter(m => !ids.has(m.id)));
    if (part.length === due.length) { store.del('adm:lcopy:' + id); store.del('adm:lcopyold:' + id); }
    if (T && T.id === id) refreshOpen(T, true);
  }
  const byTime = (a, b) => (a.origin ? -1 : b.origin ? 1 : (a.t - b.t) || ((a.live ? 1 : 0) - (b.live ? 1 : 0)) || (a.live ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.id - b.id));

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
    try { raw = localStorage.getItem('adm:m:' + id) + '|' + localStorage.getItem('adm:lm:' + id) + '|' + localStorage.getItem('adm:lseen'); } catch (e) {}
    const hit = unreadMemo.get(id);
    if (hit && hit.raw === raw && hit.s === s && hit.me === me) return hit.n;
    const n = (cacheOf(id).msgs || []).filter(m => m.id > s && m.uid !== me && !isKeyMsg(m)).length + liveUnread(id);
    unreadMemo.set(id, { raw, s, me, n });
    return n;
  }
  function markSeen(id, msgs) {
    liveSeenNow(id);
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
      checkDropbox();
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
              [['Built in', [['new', 'Nya (Cute Anime Girl Noise)'], ['old', 'Nya (old)'], ['cat', 'Anime cat girl']]],
               ['Shared', dropSounds().map(n => ['d:' + n, dropTitle(n)])],
               ['Yours', ownSounds().map(x => ['u:' + x.id, x.name])]].filter(g => g[1].length).map(([label, opts]) =>
                el('optgroup', { label }, opts.map(([v, name]) => el('option', { value: v, selected: pickNow() === v }, name))))),
            el('button', { class: 'adm-btn adm-soundadd', type: 'button', title: 'Add a sound from this device (' + SOUND_MAX_S + ' s, ' + SOUND_MAX_MB + ' MB at most). It stays in this browser.', onclick: chooseOwnSound }, 'Add your own'),
            pickNow().startsWith('u:')
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
    liveFindKey(id, msgs);
    const keep = msgs.slice(-CACHE_KEEP);
    store.set('adm:m:' + id, { count, msgs: keep });
    const last = keep.filter(m => !isKeyMsg(m)).pop();
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
      for (const id of ids) if (liveKeyRaw(id)) { try { await liveFetch(id); liveAnnounce(id); await liveCopy(id); } catch (e) {} }
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
    liveStop(T);
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
      liveBtn(i),
      el('a', { class: 'adm-hb', href: '/activity/' + T.id, title: 'Open this conversation as a page' }, '↗'),
      updBtn(),
      bigBtn(),
      hb('×', 'Close', () => setOpen(false))].filter(Boolean));
    liveHint(T);
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
    liveStream(t);
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
      m.live ? null : el('span', { class: 'adm-act', 'data-act': 'like', title: 'Like' }, m.liked ? '♥' : '♡'),
      el('span', { class: 'adm-act', 'data-act': 'quote', title: 'Reply with a quote of this message' }, 'Reply'),
      m.origin || (m.live && !liveMine(m)) ? null : el('span', { class: 'adm-act adm-own', 'data-act': 'edit', title: 'Edit your message' }, 'Edit'),
      m.origin || (m.live && !liveMine(m)) ? null : el('span', { class: 'adm-act adm-own adm-del', 'data-act': 'del', title: 'Delete your message' }, 'Delete'));
    const text = el('div', { class: 'adm-text' });
    const b = el('div', { class: 'adm-b' },
      el('div', { class: 'adm-meta' }, el('a', { class: 'adm-n', href: prof }, m.name), el('span', { class: 'adm-tm' })),
      text, acts);
    const row = el('div', { class: 'adm-m' + (m.origin ? ' adm-origin' : '') + (m.live ? ' adm-livemsg' : ''), 'data-id': m.origin ? 'o' : m.id },
      el('a', { class: 'adm-av', href: prof, style: avStyle(m.av), title: m.name }), b);
    // phones: tap a bubble to show its buttons
    if (touch) b.addEventListener('click', e => { if (!e.target.closest('a, img, video, .adm-act, .markdown-spoiler, lite-youtube')) b.classList.toggle('adm-tap'); });
    updateEl(t, row, m);
    return row;
  }
  function updateEl(t, row, m) {
    row.classList.toggle('adm-mine', !!me && m.uid === me);
    const tm = row.querySelector('.adm-tm');
    tm.textContent = clock(m.t) + (m.origin ? ' · first message' : '') + (m.edited ? ' · edited' : '') + (m.live ? ' ⚡' : '');
    if (m.live) tm.title = 'Live message (copied into the AniList chat once a day) · ' + new Date(m.t * 1000).toLocaleString();
    else tm.title = new Date(m.t * 1000).toLocaleString();
    const like = row.querySelector('[data-act="like"]');
    if (like) { like.textContent = m.liked ? '♥' : '♡'; like.title = m.liked ? 'Unlike' : 'Like'; }
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
    const live = liveMsgsOf(t.id);
    const keep = new Set([...vis.map(m => m.id), ...live.map(m => m.id)]);
    for (const [id, row] of t.els) if (id !== 'o' && !keep.has(id)) { dropVms(row); row.remove(); t.els.delete(id); }
    // the first message of the conversation, once you have scrolled back to the very start
    const i = info[t.id] || {};
    const atStart = t.fresh && t.minPage <= 1 && vis.length >= all.length && all.length >= t.count;
    const list = [];
    if (atStart && i.origin) list.push(i.origin);
    list.push(...vis.filter(m => !isKeyMsg(m)), ...live);
    list.sort(byTime);
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
    t.status.textContent = t.error || (!all.length && !live.length ? (t.fresh ? 'No replies yet. Say hi!' : 'Loading…') : '');
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
      if (liveOn(t.id)) {
        await liveSend(t, raw);
        if (ta.value === raw) ta.value = '';
        store.del('adm:draft:' + t.id);
        grow(t); showPreview(t);
        if (T === t) { liveSeenNow(t.id); render(t); t.stick = true; stickBottom(t, true); flash(t, 'Sent live'); }
        return;
      }
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
    if (String(row.dataset.id).startsWith('L')) { const lm = liveMsgsOf(t.id).find(x => x.id === row.dataset.id); if (!lm) return; if (act.dataset.act === 'quote') quoteMsg(t, lm); else if (act.dataset.act === 'edit') startEdit(t, lm, row); else if (act.dataset.act === 'del') askDelete(t, lm, row); return; }
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
        if (m.live) { await liveEdit(t, m, ta.value); done(); row._key = null; render(t); return; }
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
          if (m.live) { await liveDelete(t, m); render(t); return; }
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
    else if (e.key === 'adm:sounds' || e.key === 'adm:drop') { /* the list below redraws with the new names */ }
    else if (e.key.startsWith('adm:lm:')) { if (T && e.key === 'adm:lm:' + T.id) liveUpdated(T); }
    else if (e.key.startsWith('adm:lk:')) { if (T && e.key === 'adm:lk:' + T.id) { convoHead(); liveStream(T); } }
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

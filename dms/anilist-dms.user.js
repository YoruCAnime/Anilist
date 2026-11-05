// ==UserScript==
// @name         AniList DMs
// @namespace    exos.anilist.dms
// @author       YoruC
// @version      1.3.3
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

  const VERSION = '1.3.3'; // the same as @version above
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
  const ui = Object.assign({ open: false, thread: 0, big: false, enterSends: !touch, smartPaste: true, preview: true, min: false, sound: true, volume: 0.15, textSize: 1 }, store.get('adm:ui', {}));
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

  // ---- "...nya." for new messages (the flat neko sound of AniList Reply Alerts, 0.24 s, quiet by default) ----
  const NYA = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYyLjEzLjEwMAAAAAAAAAAAAAAA//twwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAALAAAOsQAqKioqKioqKio/Pz8/Pz8/Pz9VVVVVVVVVVVVqampqampqamp/f39/f39/f3+VlZWVlZWVlZWqqqqqqqqqqqrAwMDAwMDAwMDV1dXV1dXV1dXq6urq6urq6ur///////////8AAAAATGF2YzYyLjI5AAAAAAAAAAAAAAAAJAYxAAAAAAAADrF6oMG/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/7cMQAAw84ZyoMsMcKA5Zkid0weC94xIfkAFjA2bhuO4YDyYCAiCQJB4YHiwzMzM/JkyZMmEECBAgQIEECZNOzyaZ6cREEEAADDw8PDwAAAAADDw8PDwAAAAADDw8PDwAAAAADDw8PDwAAAAADDw8PDwAAAAADDw8PHgAAAACMPDw8eAAAAAIw8PD/d//sAUOEQdmKYJnZfzmiYxAaKDKhF9MQEGgim4OPvQVATFYaYErhhSx46qRmjMWXwzOE0qMLnlwoEjlZQQz9ayodhhPBDBuO3jwWLfjN3azXdfexrr2ggZbdrta16aZa2NLHHQV1f1hg/6nBb/+LcReLcRCXBUFgaBoGgaBX//1e3UDSMBsLgwKDOzQ/ikMI8OMxnCvTBRDhMHcNwiHQMBgAYwTwDEExgXBamzD/+3LEFIPT7RMYD2VrylmjJEHtJXiO8NEAAy6BIA0EVliFY0lC2qHAuIhNT7UwKgRcSbjKw6KaZBd6G23Zsul+ZU2KlXyXvTGCxCQpACkYxDGH765GMjEQaxYXGoNuIQwEYdmeWPV//Ombm4JZYwv9M/vje26Td/m77ZN8GJLVH5hpV76/KjRZRkHI46AiYHQghttG3mDAC8YMwpBg1gIAQBgwtAAVFAUDaXyQ4ANunIY8S14VAMMQ5AJGvIxouKqJrdhtpDIn7Zo+qVkEsodNFxuzcGLQ5ajEqrWHSZonu2R46WH3glNKgRsMmJiInFAPRaEZODCEPmB7////oLUEkkz/qKO0e9RdtyjEG/R+xVje+ccXhJmafL5/6JsZTqPLQiIBEwNQBTaNCoMG0DMwMxPjBsAWCi46cP/7cMQMA9MhGSYPaeVKJiOmQdeluNa47aTaBoMPNMnQEV1FAgSwYgCM1EAED+T8TVpLgnUSnWJVoyAcbkGbHbgyDAJS1vIrmQlOMqZsTs/2JSL5Y3cVvMNVsK9MdyoYJaKOnY7f///21FYleyT40xzzup4b6LI8cIinn+MZhXev49JvOf7lt5SJnWoGob50zSZU7TDji1RkATnZAPDwNiAZAMYDMBQMmWI3EwGMBMEgCjqBSMZCHrg6iISIti4PRL6ZVVIj3jp/AgxDuSp7GguRlJQwDGNoAVqtCTLLuSdTJ4kh2G+glRE2vtbIpjEBAuOFjzMv////f/+fmzoNvOGLUe0CaMjn//yhiUG0mcibXNyJ3f87zpOmK3WlGSNG+iYLAgHH31IEEwKlQqh9eRg0DDQkUMJhJi7/+3LEDICR/R82DmFtwkQj513MLXg7HX+TDpyADyXm3wj0ioIM5DUzzCcvv/bXgr9tFcWBlbH4ZZq6wokBb2IOCWFbwi7vJOKFuE3jvP/boOx+jjGb7h6BONHNNv////TXg+aIk1d53IE3MATkA2X/82VgoQHgzXcbGJm4dKJutalKrKnay2R+IY4ULBCAMpEFhkPnBJyY5AIXBRoMGtsVSCt1LwtfA7SRIGK+LTSkLLb0tPk03RwZINQRYoZBWpo3BjSH8XMhzZWqVp0kZcYT2TuN7AI0eGXRJhtcaMA/AWFaZlGgjJNHWQo/FxZDf////IDQcfZP3yTGjwwdl/+ieTQOFBGLRvDwYEhdhibyWkHVRM8E+dqROMrP/zUFC8RjAC/wUDggBZiIrQ4FjCYsBzWiYMpNtcCgBv/7cMQOg9ItHzgOZS3CZqMmwcwtuNJ+U2Cz4FjajlLH8rbD5Q6Du0BIApZEUynMHQmAw6VAgE20xCYuvQlcXZICwV3BqIosEIgzgAZe57Q3rXa3//S/ekcSgwKDO/+Wf////1BAZT///6tNBJbP/4ImS5YbBsYFAleUICuJ8OkQl1JV7O2bf4dDhEVgMCTgL1CLiAg0Y2PKSRhQUm3hcYNAQ4IIxEjB4QXo0pOvMgSv+6FDpxuwnxSpovTKlC1V1BkG1oBZocRWR/nMcoKkDACMiCdexZ1TBBkYkhmI0E9jEobGEWTERacZRpi34ZfWm4eFpIJIbxeoX///+4rJiA/X/8VZubnv9Qmj5BYuCSOh7RAHgHqZrygTUF9QbrJXKK9m6Q4XDIVMmZkyuGxkAGES4uEhDxlQysj/+3LECwPRZRs6DmFtwlujZsHMLbhLLIB4sIRPD9xmTsv6CoTMKK02Eqm1iiY6fc0IGPKpga0vWw21RzkUeJU7MFdMQQoCwxckGNSgJgrhK7VVWEfeDpFSTWO72eE+kIZCEHoJwbn+b//l0suv//VPsI/29R5umO9MmBgXlChom3+GObw6kY06lQ4LCsOBxWnA0tjQlMFn9IVYI2Ofken/MbghexAOygCw2/itj3p2tNcQ6eL4NaDDjSALETHGwCgmrCDIBM+ZTqno8k27qHqRjqM8VYrcXmVgrl53UZymIxNlQOHPsJWEiD953aSLTAwIcQtEqLD48F71r//VvK///9pcSylbGxVM2VDMEhAPhkOwMxokPhKKq4/9Pa9JZGcrAAIAAIMDgEKgQQTI1GBlimBgSRD8cA5jZf/7cMQMgpKRGzsuZW3CUSMmxc0d+gkRhTBMKCtEoWBAkuBGExQFfquUtAYhewCmHgEghCtQOdS9AxLnSFbMHtsuqkltjUZbSMXUoXvwfmUigs+4LxutDb2w2wx1Hyjrkudu1lafth4Oqk0ab2mzDy//83////HEra7SciPpgS2WPWdYdQRVW//54PtzlnjjIcgv5P4VyBjcEQEFiETHIOAxi5WGRASDQIYCOAFABgoNGUy8PFRIwxUKmHoKmxcmFBphmnzuWX8M+VVwrOgCikOo+WWwvZAX5VX2cOQSRFBpY6FaQydPWVOG199okrcumRR+kgaXc/GrMuRKqByIlIXrzxtz1Nf//N/+aytNZSpAXjKCUKiIWFhgjAgK2M/0U802OvctAADFQgYAGF5sEHAEgMKlASBzJTH/+3LECgOSDR82TmjryjQiZsm8FmH6+AwbC4DMdg41yQzz44ncMomCNCUdQ80rU/XI4zoQRzd2DNMEKDgkkIXkRpZypU0CA2HNpJcf0no6DPUu2cLDpgsLVOjstKClsKYSUdHRMGxucJNXKjgwLxUJxggRJIXO/////UfEYaF41B+Iw2Q08kOkl/7uRGhUayuysCN2EAKZufHHBZhoOg+Fh0IATJD0MZkd0QDASAEIBr5aCkQwoAChqZKEmKh5sukCrQ0UjCouCpEwsvB2Qe8KiLrrWHBK1y9nTK5RhYrsmERkQHLU2UgX9fNSYoRINlDhMt99HWp6OBoxPfzu+h8OB0qxjILe/1eT//6gY4a8WQhRkOCw8eDv/jRqjA50qgAwSnBgEQnpuhKWbWHXsIBkyAoMSJGIjIsIif/7cMQNg5LZGzRN5PFKQyTkwaYfSERCRop8YeMgJhBAQYgEmBBhkoodU2nvQf2oPdOuYDfhDRd0EAqcLqaWzVeTzVIozV+WGuMwUs0SnoDgYCm0HHgwNOxeyaKhzqMGyeW45Tw0X6y/I5R0UiMpVhwbXqV+xdSbf66J1HTTi8aoVEpDi4PQlGyvb11NRx460/XpBiA8Kk/AtR1AABlQUOlKgvuCiIXBGNFnCgkQs5boUDmCYgRSa5CZOsZeaFixmwAVBg7oIQgoFfy+7KIBdprzK2Co3MOLvJppAsMYFD6JiaIoBMoLDiAjADQKUWGyruMxIbeGscfyh7OVhOVBKOesutuTU35R5//R72yoPRaYNupMuKjjzQckTkX1HkWy5vlKBBmBjShwtBmTalwJIFUuFBRkBZjSZcX/+3LEC4ORoPcgLW0PQmER44GXmlkQDw48Z56QLk2xwcKNzBRkwAwAAudCZGWBgGVzPg8xolGiRLwv9D6t0QmmYtZzaUXeqpVIIVMGEpDKrrCiIDUoHgtVJWNTzH2dQEBoOijqHrbNEA2Hmh8KmtND9t4n//i/+b9I7a9FsYHy/K9+OKAww9mlLU+VfEsiMpHGwiVMMCAJhrtA40RgCQQWFMgVTQxThJICGpBPyMEnRqcg8HJ7FoiXJ1QxYuT9LjEV1E87iwpzdCOoAnohJ4yoaqW5DmaCjLWChOU2zjaaRk8UNuKGihouYaKGhX/5xUVKKml8bPNLNLLNLNJLNLNNLNLPNLNLLNLNJLNLNNLNLPret71vUm9b1ret71vW963rW9bqAmqiE4RmBMKSI6QMHyUVCEaD4wRl0v/7cMQLA8z8gshEhNQIAAA0gAAABE0k0k1F14Tx+bXiRE4SBCgMQegtGpcotnYsossoMWK0VVVVUgapKu3aaaoixW3/VVTDVJV2+mmqZKVoq+qqmVESrp/tNUyUrRV/1UyoiVdP/9VMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';
  let nyaAudio = null;
  function nya(force) {
    if (!force && !ui.sound) return;
    // only one AniList tab says it, and not twice for the same message
    if (!force) { if (Date.now() - store.get('adm:nyaAt', 0) < 2500) return; store.set('adm:nyaAt', Date.now()); }
    try {
      nyaAudio = nyaAudio || new Audio(NYA);
      nyaAudio.volume = Math.max(0, Math.min(1, +ui.volume || 0));
      nyaAudio.currentTime = 0;
      nyaAudio.play().catch(() => {}); // the browser may refuse sound in a tab you never clicked in
    } catch (e) {}
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
          el('div', { class: 'adm-vol' }, 'Volume',
            el('input', { type: 'range', min: '0', max: '100', step: '1', value: String(Math.round(ui.volume * 100)), title: 'Volume',
              oninput: e => { ui.volume = +e.target.value / 100; saveUi(); }, onchange: () => nya(true) }),
            el('button', { class: 'adm-btn', type: 'button', title: 'Play it', onclick: () => nya(true) }, '▶'))),
        el('div', { style: 'opacity:.6' }, 'Your conversations, drafts and what you have read are kept in this browser.')));
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

// ==UserScript==
// @name         AniList Hide Media
// @namespace    yoruc-anilist
// @version      1.1.1
// @author       YoruC
// @license      MIT
// @homepageURL  https://github.com/YoruCAnime/Anilist/tree/main/hide-media
// @updateURL    https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/hide-media/anilist-hide-media.user.js
// @downloadURL  https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/hide-media/anilist-hide-media.user.js
// @description  Every picture, GIF, video and YouTube clip other people post on AniList is folded away like a spoiler until you click it.
// @match        https://anilist.co/*
// @run-at       document-start
// @noframes
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  // What counts as media inside a post. AniList's own spoilers are left alone (already hidden).
  const MEDIA = 'img, video, .youtube, lite-youtube, iframe';
  const SCOPE = ':is(.markdown, .adm-text)';   // .adm-text = chat bubbles of the AniList DMs plugin
  const BOXES = '.reply, .activity-entry, .comment-wrap, .comment, .review, .message';
  const MINE = '.activity-edit, .markdown-editor, .preview, .el-dialog, .adm-preview';

  const store = {
    get(k, d) { try { return GM_getValue(k, d); } catch (e) { return d; } },
    set(k, v) { try { GM_setValue(k, v); } catch (e) { /* no storage */ } },
  };
  let on = store.get('on', true);
  let ownToo = store.get('ownToo', false);

  const css = `
html:not(.ash-off) ${SCOPE} :is(${MEDIA}):not(.ash-show):not(.markdown-spoiler *) { display: none !important; }
.ash-pill {
  display: inline-block; margin: 2px 4px 2px 0; padding: 3px 9px; border-radius: 4px;
  font: 600 12px/1.5 Overpass, -apple-system, "Segoe UI", sans-serif; cursor: pointer; user-select: none;
  background: rgba(var(--color-blue, 61,180,242), .14); color: rgb(var(--color-blue, 61,180,242));
  vertical-align: middle; white-space: nowrap;
}
.ash-pill:hover { background: rgba(var(--color-blue, 61,180,242), .26); }
.ash-pill.ash-open { padding: 0 6px; font-size: 10px; opacity: .55; }
.ash-pill.ash-open:hover { opacity: 1; }
html.ash-off .ash-pill { display: none !important; }
`;
  function addCss() {
    if (typeof GM_addStyle === 'function') { GM_addStyle(css); return; }
    const st = document.createElement('style');
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  function applyOn() {
    document.documentElement.classList.toggle('ash-off', !on);
  }

  // ---- whose post is it ---------------------------------------------------
  let me = null;
  function myName() {
    if (me) return me;
    try {
      const a = JSON.parse(localStorage.getItem('auth') || 'null');
      if (a && a.name) me = String(a.name).toLowerCase();
    } catch (e) { /* not logged in */ }
    if (!me) {
      const l = document.querySelector('#nav .links a[href^="/user/"]');
      if (l) me = nameFromHref(l.getAttribute('href'));
    }
    return me;
  }
  function nameFromHref(h) {
    const m = /^\/user\/([^/?#]+)/.exec(h || '');
    return m ? decodeURIComponent(m[1]).toLowerCase() : null;
  }
  function authorOf(el) {
    const dm = el.closest('.adm-m');                        // AniList DMs plugin: own bubbles carry adm-mine
    if (dm) return dm.classList.contains('adm-mine') ? '*me' : '*them';
    const box = el.closest(BOXES);
    if (box) {
      const a = box.querySelector('a.name[href^="/user/"], .header a[href^="/user/"], a[href^="/user/"]');
      return a ? nameFromHref(a.getAttribute('href')) : null;
    }
    if (el.closest(MINE)) return myName() || '*me';
    const thread = el.closest('.forum-thread');
    if (thread) {                                           // a thread's opening post: its author is in the thread header
      for (const a of thread.querySelectorAll('a[href^="/user/"]')) {
        if (!a.closest('.comments, .markdown')) return nameFromHref(a.getAttribute('href'));
      }
      return null;
    }
    if (el.closest('.about, .user')) return nameFromHref(location.pathname);
    return null;
  }
  function isMine(el) {
    if (ownToo) return false;
    const a = authorOf(el);
    if (a === '*me') return true;
    const m = myName();
    return !!(a && m && a === m);
  }

  // ---- the cover ----------------------------------------------------------
  function kindOf(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'video') return 'Video';
    if (tag === 'img') {
      const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
      return /\.gif(\?|#|$)|tenor\.com|giphy\.com/i.test(src) ? 'GIF' : 'Image';
    }
    return 'YouTube';
  }
  function setPill(pill, el, open) {
    pill.classList.toggle('ash-open', open);
    pill.textContent = open ? 'hide' : kindOf(el) + ' hidden, click to view';
    pill.title = open ? 'Hide it again' : 'Hidden by AniList Hide Media';
  }
  function cover(el) {
    el.setAttribute('data-ash', '1');
    if (el.closest('.markdown-spoiler')) return;            // AniList's own spoiler does the job
    if (el.parentElement && el.parentElement.closest(MEDIA) && el.parentElement.closest(SCOPE)) {
      el.classList.add('ash-show');                         // part of a bigger covered thing (iframe in .youtube)
      return;
    }
    if (isMine(el)) { el.classList.add('ash-show'); return; }
    const pill = document.createElement('span');
    pill.className = 'ash-pill';
    pill.setAttribute('role', 'button');
    pill.tabIndex = 0;
    setPill(pill, el, false);
    const flip = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const open = !el.classList.contains('ash-show');
      el.classList.toggle('ash-show', open);
      if (!open && el.tagName === 'VIDEO') { try { el.pause(); } catch (e) { /* not playing */ } }
      setPill(pill, el, open);
    };
    pill.addEventListener('click', flip);
    pill.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') flip(ev); });
    el.parentNode.insertBefore(pill, el);
  }

  function scan() {
    queued = false;
    if (!on) return;
    const list = document.querySelectorAll(`${SCOPE} :is(${MEDIA}):not([data-ash])`);
    for (const el of list) cover(el);
  }
  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || setTimeout)(scan);
    setTimeout(() => { if (queued) scan(); }, 400);        // hidden tabs get no animation frames
  }

  function start() {
    addCss();
    applyOn();
    new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
    queue();
  }
  if (document.documentElement) start();
  else {
    new MutationObserver((m, ob) => {
      if (document.documentElement) { ob.disconnect(); start(); }
    }).observe(document, { childList: true });
  }

  // ---- menu ---------------------------------------------------------------
  function resetAll() {
    document.querySelectorAll('.ash-pill').forEach((p) => p.remove());
    document.querySelectorAll('[data-ash]').forEach((el) => {
      el.removeAttribute('data-ash');
      el.classList.remove('ash-show');
    });
    queue();
  }
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Hiding on / off', () => {
      on = !on; store.set('on', on); applyOn(); resetAll();
    });
    GM_registerMenuCommand('Hide my own posts too: on / off', () => {
      ownToo = !ownToo; store.set('ownToo', ownToo); resetAll();
    });
  }
})();

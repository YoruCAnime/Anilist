// ==UserScript==
// @name         ifviewer
// @namespace    ifs
// @version      1.1.0
// @description  Viewer for IF: the whole gallery as one scroller of the originals. Loads ahead, remembers where you were, long-press / right-click saves the original.
// @match        https://www.imagefap.com/*
// @updateURL    https://raw.githubusercontent.com/YoruCAnime/Anilist/ccr-dead577e-viwlwo/ifviewer/ifviewer.user.js
// @downloadURL  https://raw.githubusercontent.com/YoruCAnime/Anilist/ccr-dead577e-viwlwo/ifviewer/ifviewer.user.js
// @run-at       document-start
// @grant        GM_download
// @grant        unsafeWindow
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // ---------- ad / popup blocker (whole site) ----------
  (function blocker() {
    if (/verif|captcha/i.test(location.pathname)) return; // never touch the captcha page
    const base = location.hostname.split('.').slice(-2).join('.');
    const ALLOW = [base, 'googleapis.com', 'gstatic.com', 'google.com', 'recaptcha.net', 'hcaptcha.com',
      'cloudflare.com', 'jquery.com', 'jsdelivr.net'];
    const allowed = (url) => {
      if (!url) return true;
      try {
        const u = new URL(url, location.href);
        if (!/^https?:$/.test(u.protocol)) return true;
        return ALLOW.some((d) => u.hostname === d || u.hostname.endsWith('.' + d));
      } catch (e) { return true; }
    };

    // 1. no script may open a new tab or window
    const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const noop = function () { return null; };
    try { page.open = typeof exportFunction === 'function' ? exportFunction(noop, page) : noop; } catch (e) {}
    try {
      const sc = document.createElement('script');
      sc.textContent = 'try{window.open=function(){return null}}catch(e){}';
      (document.head || document.documentElement).appendChild(sc);
      sc.remove();
    } catch (e) {}

    // 2. scripts and frames from other sites never run
    const kill = (n) => {
      if (n.nodeType !== 1) return;
      if (n.tagName === 'SCRIPT') {
        if (n.src && !allowed(n.src)) { n.type = 'javascript/blocked'; n.remove(); }
      } else if (n.tagName === 'IFRAME' || n.tagName === 'EMBED' || n.tagName === 'OBJECT') {
        const src = n.src || n.data || '';
        if (!src || !allowed(src)) n.remove();
      } else if (n.querySelectorAll) {
        n.querySelectorAll('script[src],iframe,embed,object').forEach(kill);
      }
    };
    new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) kill(n);
    }).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('beforescriptexecute', (e) => {
      const n = e.target;
      if (n && n.src && !allowed(n.src)) { e.preventDefault(); n.remove(); }
    }, true);

    // 3. taps on links that lead to other sites and open a new tab are ads
    window.addEventListener('click', (e) => {
      const a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || a.closest('#ifs-root')) return;
      if (!allowed(a.href) && (a.target === '_blank' || a.querySelector('img'))) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    }, true);

    // 4. hide what is left
    const st = document.createElement('style');
    st.textContent = 'iframe,embed,object,ins,[id^="exo"],[class^="exo"],[class*="adsby"],[id*="banner" i],[class*="banner" i],[class*="popunder" i]{display:none!important}';
    (document.head || document.documentElement).appendChild(st);
  })();

  // the viewer itself only runs on gallery pages
  if (!/^\/(pictures|gallery)\/|^\/gallery\.php/.test(location.pathname)) return;

  const PER_BATCH = 24;          // the site hands out original links 24 at a time
  const REQUEST_GAP = 250;       // ms between requests to the site (avoids the captcha)
  const ORIGIN = location.origin;

  // ---------- which gallery ----------
  const qs = new URLSearchParams(location.search);
  const gid = (location.pathname.match(/\/(?:pictures|gallery)\/(\d+)/) || [])[1] || qs.get('gid');
  if (!gid || !/^\d+$/.test(gid)) return;
  const POS_KEY = 'ifs:pos:' + gid;

  // ---------- helpers ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  let queue = Promise.resolve();
  let captcha = false;
  function getText(url) {
    const run = async () => {
      const res = await fetch(url, {
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      const text = await res.text();
      if (/human-verification|captcha/i.test(res.url) || /human-verification/i.test(text.slice(0, 4000))) {
        captcha = true;
        showNotice('The site wants a captcha. Tap here, solve it, then come back and reload.', ORIGIN + '/human-verification');
        throw new Error('captcha');
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await sleep(REQUEST_GAP);
      return text;
    };
    const p = queue.then(run, run);
    queue = p.catch(() => {});
    return p;
  }

  // thumbnails in gallery order: [{id, thumb}]
  function parseThumbs(doc) {
    const out = [];
    const seen = new Set();
    let links = [...doc.querySelectorAll('a[href*="/photo/"]')].filter((a) => a.querySelector('img'));
    const own = links.filter((a) => (a.getAttribute('href') || '').includes('gid=' + gid));
    if (own.length) links = own;
    for (const a of links) {
      const m = (a.getAttribute('href') || '').match(/\/photo\/(\d+)/);
      if (!m || seen.has(m[1])) continue;
      seen.add(m[1]);
      const img = a.querySelector('img');
      const thumb = img.getAttribute('data-src') || img.getAttribute('src') || '';
      out.push({ id: m[1], thumb: thumb ? new URL(thumb, ORIGIN).href : '' });
    }
    return out;
  }

  // every original-image link found in a chunk of HTML: Map(id -> url)
  function parseFull(html) {
    const map = new Map();
    const re = /https?:\/\/[^"'\s<>\\]+\/(\d+)\.(?:jpe?g|png|gif|webp|bmp)(?:\?[^"'\s<>\\]*)?/gi;
    let m;
    while ((m = re.exec(html))) {
      if (/\/(thumb|mini)\//i.test(m[0])) continue;
      if (!map.has(m[1])) map.set(m[1], m[0].replace(/&amp;/g, '&'));
    }
    return map;
  }

  // ---------- state ----------
  let items = [];                 // {id, thumb, url, node, img, state}
  const byId = new Map();
  const batches = new Map();      // batch start -> promise
  let root, list, counter, notice, fab;
  let open = false;
  let userMoved = false;

  function ensureBatch(start, force) {
    if (start < 0 || start >= items.length) return Promise.resolve();
    if (!force && batches.has(start)) return batches.get(start);
    const url = `${ORIGIN}/photo/${items[0].id}/?gid=${gid}&idx=${start}&partial=true`;
    const p = getText(url).then((html) => {
      for (const [id, full] of parseFull(html)) {
        const it = byId.get(id);
        if (it) it.url = full;
      }
    }).catch(() => { if (!captcha) batches.delete(start); });
    batches.set(start, p);
    return p;
  }

  async function resolveUrl(it, i, force) {
    if (force) it.url = '';
    if (it.url) return it.url;
    const start = Math.floor(i / PER_BATCH) * PER_BATCH;
    await ensureBatch(start, force);
    if (!it.url && !captcha) {
      // fall back to that picture's own page
      try {
        const html = await getText(`${ORIGIN}/photo/${it.id}/?gid=${gid}`);
        const map = parseFull(html);
        it.url = map.get(it.id) || '';
        for (const [id, full] of map) { const o = byId.get(id); if (o && !o.url) o.url = full; }
      } catch (e) { /* shown as retry */ }
    }
    return it.url;
  }

  function preload(src) {
    return new Promise((ok, bad) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = bad;
      im.src = src;
    });
  }

  async function loadItem(it, i) {
    if (it.state === 'loading' || it.state === 'full') return;
    it.state = 'loading';
    it.node.classList.add('ifs-loading');
    it.node.classList.remove('ifs-error');
    ensureBatch((Math.floor(i / PER_BATCH) + 1) * PER_BATCH); // warm up the next batch
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = await resolveUrl(it, i, attempt > 0);
        if (!url) break;
        const im = await preload(url);
        if (im.naturalWidth) it.img.style.aspectRatio = im.naturalWidth + ' / ' + im.naturalHeight;
        it.img.src = url;
        it.state = 'full';
        it.node.classList.remove('ifs-loading');
        it.node.classList.add('ifs-full');
        return;
      } catch (e) { if (captcha) break; }
    }
    it.state = 'error';
    it.node.classList.remove('ifs-loading');
    it.node.classList.add('ifs-error');
  }

  function unloadItem(it) {
    if (it.state !== 'full') return;
    it.state = '';
    it.node.classList.remove('ifs-full');
    it.img.src = it.thumb || '';
  }

  // ---------- position ----------
  function currentIndex() {
    const y = window.scrollY + window.innerHeight * 0.3;
    let lo = 0, hi = items.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (items[mid].node.offsetTop <= y) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  function goTo(i) {
    i = Math.max(0, Math.min(items.length - 1, i));
    userMoved = false;
    const jump = () => { if (!userMoved && open) items[i].node.scrollIntoView({ block: 'start' }); };
    jump();
    [120, 400, 900, 1600].forEach((t) => setTimeout(jump, t)); // hold the spot while the layout settles
  }

  let saveTimer = 0;
  function onScroll() {
    if (!open || saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = 0;
      if (!open) return;
      const i = currentIndex();
      counter.textContent = (i + 1) + ' / ' + items.length;
      const id = items[i].id;
      try { localStorage.setItem(POS_KEY, id); } catch (e) {}
      try { history.replaceState(Object.assign({}, history.state, { ifsId: id }), ''); } catch (e) {}
    }, 200);
  }

  // ---------- UI ----------
  function showNotice(text, href) {
    if (!notice) return;
    notice.textContent = text;
    notice.onclick = href ? () => { location.href = href; } : () => { notice.hidden = true; };
    notice.hidden = false;
  }

  function setOpen(on) {
    open = on;
    document.documentElement.classList.toggle('ifs-on', on);
    fab.hidden = on;
  }

  function openTab(url) {
    const a = el('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
    root.appendChild(a); a.click(); a.remove();
  }

  function save(it) {
    if (!it.url) return;
    const name = (it.url.split('?')[0].split('/').pop()) || (it.id + '.jpg');
    try {
      GM_download({ url: it.url, name, headers: { Referer: ORIGIN + '/' }, onerror: () => openTab(it.url) });
    } catch (e) { openTab(it.url); }
  }

  const CSS = `
    html.ifs-on, html.ifs-on body { background:#000 !important; margin:0 !important; padding:0 !important; overflow-anchor:auto; }
    html.ifs-on body > *:not(#ifs-root):not(#ifs-fab) { display:none !important; }
    #ifs-root { display:none; }
    html.ifs-on #ifs-root { display:block; }
    #ifs-list { max-width:1000px; margin:0 auto; }
    .ifs-item { position:relative; margin:0 0 6px; min-height:40vw; background:#111; }
    .ifs-item.ifs-full { min-height:0; background:none; }
    .ifs-item img { display:block; width:100%; height:auto; border:0; -webkit-touch-callout:default; user-select:auto; }
    .ifs-item:not(.ifs-full) img { filter:blur(6px); opacity:.6; }
    .ifs-loading::after { content:''; position:absolute; left:50%; top:50%; width:34px; height:34px; margin:-17px;
      border:3px solid #fff5; border-top-color:#fff; border-radius:50%; animation:ifs-spin .8s linear infinite; }
    .ifs-error::after { content:'Tap to retry'; position:absolute; left:0; right:0; top:50%; text-align:center;
      color:#fff; font:16px sans-serif; transform:translateY(-50%); }
    @keyframes ifs-spin { to { transform:rotate(360deg); } }
    .ifs-save { position:absolute; right:6px; bottom:6px; width:38px; height:38px; border:0; border-radius:50%;
      background:#000a; color:#fff; font:18px sans-serif; opacity:.55; display:none; }
    .ifs-full .ifs-save { display:block; }
    #ifs-bar { position:fixed; right:8px; top:8px; z-index:2147483646; display:flex; gap:6px; opacity:.75; }
    #ifs-bar button, #ifs-fab, #ifs-resume { border:0; border-radius:18px; background:#000c; color:#fff;
      font:14px sans-serif; padding:8px 12px; min-height:36px; }
    #ifs-fab { position:fixed; right:10px; bottom:14px; z-index:2147483646; background:#c2185b; }
    #ifs-resume { position:fixed; left:50%; bottom:18px; transform:translateX(-50%); z-index:2147483646; background:#c2185b; }
    #ifs-notice { position:fixed; left:8px; right:8px; top:52px; z-index:2147483647; background:#b71c1c; color:#fff;
      font:14px sans-serif; padding:10px 12px; border-radius:8px; }
    [hidden] { display:none !important; }
  `;

  function build(startIndex, resumeIndex) {
    document.head.appendChild(el('style')).textContent = CSS;
    for (const origin of [...new Set(items.slice(0, 3).map((t) => { try { return new URL(t.thumb).origin; } catch (e) { return ''; } }))]) {
      if (!origin) continue;
      const l = el('link'); l.rel = 'preconnect'; l.href = origin; document.head.appendChild(l);
    }

    root = el('div'); root.id = 'ifs-root';
    list = el('div'); list.id = 'ifs-list';
    const frag = document.createDocumentFragment();
    items.forEach((it, i) => {
      const node = el('div', 'ifs-item');
      node.dataset.i = i;
      const img = el('img');
      img.decoding = 'async';
      img.loading = 'lazy';
      img.alt = '';
      if (it.thumb) img.src = it.thumb;
      const btn = el('button', 'ifs-save', '⬇');
      btn.title = 'Save original';
      node.append(img, btn);
      it.node = node; it.img = img; it.state = '';
      frag.appendChild(node);
    });
    list.appendChild(frag);

    const bar = el('div'); bar.id = 'ifs-bar';
    counter = el('button', '', '1 / ' + items.length);
    counter.title = 'Jump to picture';
    counter.onclick = () => {
      const n = parseInt(prompt('Go to picture (1–' + items.length + ')', String(currentIndex() + 1)), 10);
      if (n) goTo(n - 1);
    };
    const close = el('button', '', '✕');
    close.title = 'Back to the normal page';
    close.onclick = () => setOpen(false);
    bar.append(counter, close);

    notice = el('div'); notice.id = 'ifs-notice'; notice.hidden = true;
    root.append(list, bar, notice);

    fab = el('button', '', '▦ Scroller'); fab.id = 'ifs-fab'; fab.hidden = true;
    fab.onclick = () => { setOpen(true); goTo(savedIndex() >= 0 ? savedIndex() : startIndex); };
    document.body.append(root, fab);

    list.addEventListener('click', (e) => {
      const node = e.target.closest('.ifs-item');
      if (!node) return;
      const it = items[+node.dataset.i];
      if (e.target.classList.contains('ifs-save')) save(it);
      else if (it.state === 'error') loadItem(it, +node.dataset.i);
    });

    // load a few screens ahead, drop full-size pictures that are far away (GIFs eat memory)
    const loader = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { const i = +en.target.dataset.i; loadItem(items[i], i); }
    }, { rootMargin: '150% 0px 350% 0px' });
    const unloader = new IntersectionObserver((entries) => {
      for (const en of entries) if (!en.isIntersecting) unloadItem(items[+en.target.dataset.i]);
    }, { rootMargin: '900% 0px 900% 0px' });
    for (const it of items) { loader.observe(it.node); unloader.observe(it.node); }

    for (const ev of ['touchstart', 'wheel', 'keydown']) {
      window.addEventListener(ev, () => { userMoved = true; }, { passive: true });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    try { history.scrollRestoration = 'manual'; } catch (e) {}
    setOpen(true);
    goTo(startIndex);
    counter.textContent = (startIndex + 1) + ' / ' + items.length;

    if (resumeIndex >= 0 && resumeIndex !== startIndex) {
      const chip = el('button', '', 'Resume at ' + (resumeIndex + 1)); chip.id = 'ifs-resume';
      chip.onclick = () => { chip.remove(); goTo(resumeIndex); };
      root.appendChild(chip);
      setTimeout(() => chip.remove(), 10000);
    }
  }

  function savedIndex() {
    let id = '';
    try { id = localStorage.getItem(POS_KEY) || ''; } catch (e) {}
    const it = byId.get(id);
    return it ? items.indexOf(it) : -1;
  }

  // ---------- start ----------
  const ready = () => (async function init() {
    const here = parseThumbs(document);
    let all = [];
    try {
      const html = await getText(`${ORIGIN}/gallery.php?gid=${gid}&view=2`);
      all = parseThumbs(new DOMParser().parseFromString(html, 'text/html'));
    } catch (e) { /* use what this page shows */ }
    if (all.length < here.length) all = here;
    if (!all.length) return;

    items = all.map((t) => ({ id: t.id, thumb: t.thumb, url: '' }));
    items.forEach((it) => byId.set(it.id, it));

    // where to start: back/forward/reload -> exactly where you were; otherwise the page you opened
    let start = -1;
    const histId = history.state && history.state.ifsId;
    if (histId && byId.has(histId)) start = items.indexOf(byId.get(histId));
    if (start < 0 && here.length && byId.has(here[0].id)) start = items.indexOf(byId.get(here[0].id));
    if (start < 0) start = Math.min(items.length - 1, (parseInt(qs.get('page'), 10) || 0) * PER_BATCH);

    build(start, savedIndex());
  })();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();

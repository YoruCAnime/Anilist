// ==UserScript==
// @name         AniList GIF & Picture Picker
// @namespace    exos.anilist.gifpicker
// @author       YoruC
// @version      1.3.1
// @description  A GIF button in AniList's comment toolbar: search Tenor GIFs and SFW booru pictures (Safebooru, Konachan.net), or upload your own GIFs and videos to your GitHub repos, see previews and tap one (or pick several) to put img(link) into your comment, at the size you choose. Works in Tampermonkey on PC and on Firefox for Android.
// @match        https://anilist.co/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      tenor.com
// @connect      safebooru.org
// @connect      konachan.net
// @connect      api.github.com
// @run-at       document-idle
// @noframes
// ==/UserScript==
// How it finds things:
// - Tenor: its own search page (tenor.com/search/<words>-gifs) carries the results as JSON, no API key needed.
//   That page gives 50 GIFs; "more" searches again with the words plus the tags those GIFs carry.
// - Boorus search by tags, so the typed words are turned into Safebooru tags first: the longest run of words that
//   is a real tag wins ("spice and wolf holo" -> spice_and_wolf + holo). Typing tags yourself (with _ ) also works.
// 1.1.0: more sizes (150 ... 1000 px, quarter width, Original, a custom px box) and Pick several (numbered picks, added
//        side by side or one per line in one go; Ctrl / Shift-click picks on PC).
// 1.2.0: Upload your own: a GIF / picture from the PC or phone goes into YOUR public GitHub repo (contents API, a
//        token that can write to that one repo, kept in Tampermonkey's storage and only ever sent to api.github.com),
//        then img(raw.githubusercontent.com link) is added like any other pick.
// 1.3.0: Upload your own VIDEO too (MP4 / WebM, its own repo + folder; token empty = the GIF one) -> webm(link),
//        which AniList plays for MP4 as well. Videos show in the grid / tray / big view as videos.
// 1.3.1: Side by side really is side by side: one spoiler around the group, and pictures too wide to fit next to
//        each other are sized to share the row (2 or 3 per row, percent of the comment width).
// - AniList's img( ) ends at the first ")", and ~! !~ is its spoiler, so ( ) ! ~ ' * and spaces in a link are
//   written percent-encoded (same picture, spelled safely).
(function () {
  'use strict';

  const TEST = typeof __GP_TEST__ !== 'undefined' ? __GP_TEST__ : null;

  // ---------- storage + requests (Tampermonkey on PC and Android) ----------
  const store = {
    get(k, d) {
      try { if (typeof GM_getValue === 'function') { const v = GM_getValue(k); return v === undefined ? d : v; } } catch (e) {}
      try { const v = localStorage.getItem('gp-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { if (typeof GM_setValue === 'function') { GM_setValue(k, v); return; } } catch (e) {}
      try { localStorage.setItem('gp-' + k, JSON.stringify(v)); } catch (e) {}
    },
  };

  // any answer -> { status, text }; only a dead connection rejects
  function requestFull(url, o = {}) {
    return new Promise((resolve, reject) => {
      const xhr = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest
        : (typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function' ? GM.xmlHttpRequest : null);
      if (!xhr) { reject(new Error('Tampermonkey cross-site requests are not allowed')); return; }
      xhr({
        method: o.method || 'GET', url, headers: o.headers, data: o.data, timeout: o.timeout || 20000,
        onload: r => resolve({ status: r.status, text: r.responseText || '' }),
        onerror: () => reject(new Error('no answer')),
        ontimeout: () => reject(new Error('timed out')),
      });
    });
  }

  // the boorus sometimes answer 404 / 429 / 5xx for a moment when busy: one more try before giving up
  async function request(url) {
    let r;
    for (let tries = 0; tries < 2; tries++) {
      if (tries) await new Promise(res => setTimeout(res, 1500));
      try { r = await requestFull(url); } catch (e) { if (tries) throw e; continue; }
      if (r.status >= 200 && r.status < 300) return r.text;
      if (![404, 408, 429, 500, 502, 503, 504].includes(r.status)) break;
    }
    throw new Error('HTTP ' + r.status);
  }

  // ---------- your own uploads: a file -> your public GitHub repo -> raw link ----------
  // two setups: 'gif' (GIFs / pictures) and 'video' (its own repo; an empty video token means "use the GIF one")
  const GH_KEY = { gif: 'github', video: 'github_video' };
  const ghSaved = kind => Object.assign({ repo: '', branch: '', folder: kind === 'video' ? '' : 'gifs', token: '' }, store.get(GH_KEY[kind], {}) || {});
  function ghConf(kind = 'gif') {
    const c = ghSaved(kind);
    if (kind === 'video' && !c.token) { c.token = ghSaved('gif').token; c.shared = !!c.token; }
    return c;
  }
  const ghReady = c => /^[\w.-]+\/[\w.-]+$/.test(c.repo) && !!c.token;
  const ghHeaders = c => ({ Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' });
  const ghJson = t => { try { return JSON.parse(t); } catch (e) { return {}; } };
  const ghPath = c => String(c.folder || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/[^\w\/.-]+/g, '-');
  const UP_TYPES = { 'image/gif': 'gif', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/x-m4v': 'm4v' };
  const UP_MAX = 25 * 1048576;
  const PIC_EXT = /\.(gif|png|jpe?g|webp)$/i, VID_EXT = /\.(mp4|webm|m4v)$/i;
  // AniList plays videos with webm( ), which takes mp4 too; browsers play mp4 (H.264) and webm
  const isVideoFile = f => /^video\/(mp4|webm|x-m4v)$/.test(f.type || '') || (!/^image\//.test(f.type || '') && VID_EXT.test(f.name || ''));
  const isPicFile = f => /^image\/(gif|png|jpeg|webp)$/.test(f.type || '') || (!/^video\//.test(f.type || '') && PIC_EXT.test(f.name || ''));

  // checks the repo + token; fills in the branch; returns '' when fine, else what is wrong in plain words
  async function ghCheck(c) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(c.repo)) return 'Repo must look like name/repo, e.g. YourName/gifs';
    if (!c.token) return 'Paste a token first';
    const r = await requestFull('https://api.github.com/repos/' + c.repo, { headers: ghHeaders(c) });
    const j = ghJson(r.text);
    if (r.status === 401) return 'GitHub did not accept the token (wrong, expired or deleted)';
    if (r.status === 404 || r.status === 403) return 'Repo not found, or the token is not allowed to see it';
    if (r.status !== 200) return 'GitHub answered ' + r.status + (j.message ? ': ' + j.message : '');
    if (j.private) return 'That repo is private: people reading your comment could not see what you upload. Make it public (repo Settings > Change visibility).';
    if (!c.branch) c.branch = j.default_branch || 'main';
    return '';
  }

  function fileName(file) {
    const ext = UP_TYPES[file.type] || (String(file.name).match(/\.(gif|png|jpe?g|webp|mp4|webm|m4v)$/i) || [, 'gif'])[1].toLowerCase().replace('jpeg', 'jpg');
    const base = String(file.name || 'gif').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'gif';
    return base + '-' + Date.now().toString(36) + '.' + ext;
  }

  // base64 of a file -> its raw.githubusercontent.com link
  async function ghUpload(c, name, b64) {
    const dir = ghPath(c);
    for (let tries = 0; tries < 2; tries++) {
      const path = (dir ? dir + '/' : '') + (tries ? name.replace(/(\.\w+)$/, '-' + Math.random().toString(36).slice(2, 6) + '$1') : name);
      const r = await requestFull('https://api.github.com/repos/' + c.repo + '/contents/' + path.split('/').map(encodeURIComponent).join('/'), {
        method: 'PUT', headers: ghHeaders(c), timeout: 180000,
        data: JSON.stringify({ message: 'Add ' + path.split('/').pop() + ' (AniList GIF Picker)', content: b64, branch: c.branch || undefined }),
      });
      const j = ghJson(r.text);
      if (r.status === 201 || r.status === 200) {
        const branch = c.branch || 'main';
        return 'https://raw.githubusercontent.com/' + c.repo + '/' + branch.split('/').map(encodeURIComponent).join('/') + '/' + path.split('/').map(encodeURIComponent).join('/');
      }
      if (r.status === 422 && !tries) continue; // that name exists already: once more with a new name
      if (r.status === 401) throw new Error('GitHub did not accept the token (wrong, expired or deleted)');
      if (r.status === 403 || r.status === 404) throw new Error('The token is not allowed to write to ' + c.repo + ' (give it Contents: Read and write)');
      if (r.status === 413) throw new Error('Too big for GitHub');
      throw new Error('GitHub answered ' + r.status + (j.message ? ': ' + j.message : ''));
    }
    throw new Error('Could not find a free file name');
  }

  const readB64 = file => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] || '');
    fr.onerror = () => rej(new Error('Could not read the file'));
    fr.readAsDataURL(file);
  });

  // ---------- helpers ----------
  const STOP = new Set(['a', 'an', 'and', 'the', 'of', 'to', 'in', 'on', 'with', 'from', 'for', 'x', 'vs', 'is', 'at', 'by']);
  const NOISE = new Set(['gif', 'gifs', 'image', 'images', 'picture', 'pictures', 'pic', 'pics', 'photo', 'photos', 'anime', 'art', 'fanart', 'wallpaper', 'wallpapers']);
  const decodeEnt = s => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // ( ) ! ~ ' * and white space would end img( ) early or open a spoiler
  const safeUrl = u => String(u).trim().replace(/[()!~'*\s]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
  const httpsOnly = u => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : (typeof u === 'string' && /^\/\//.test(u) ? 'https:' + u : ''));

  // size 'img' = original size, 'img220' = 220 px wide, 'img50%' = half the comment width, 'custom' = o.px px
  function sizeTag(o) {
    if (o.size !== 'custom') return o.size || 'img';
    const px = Math.round(+o.px);
    return px >= 10 && px <= 5000 ? 'img' + px : 'img';
  }

  // several pictures: side by side (one line) or one per line; Centre wraps them all once.
  // AniList turns ~~~ ~~~ into centre BEFORE it looks for ~! !~ and ends the centre at the first ~~~, so
  // "~~~~!img()!~~~~" lost a ~ of the spoiler: Centre + Spoiler needs a space between them.
  // A video is { url, video: true } and becomes webm(link) (AniList has no width for videos).
  // Side by side (measured with AniList's own formatter, comments 300-700 px wide):
  // - each ~! !~ becomes its own paragraph, so a group shares ONE spoiler, or every picture sat on its own line;
  // - pictures too wide to sit next to each other (Original GIFs are ~500 px, a comment ~620) get a share of the
  //   row instead: 2 per row (also for 4), else 3 per row, at 49 % / 32 % (46 % / 30 % inside a spoiler's padding).
  function aniCode(urls, o) {
    const items = [].concat(urls).map(u => (typeof u === 'object' ? u : { url: u }));
    const side = o.side !== false && items.length > 1;
    const pics = items.filter(it => !it.video).length;
    let tag = sizeTag(o);
    if (side && pics > 1) {
      const per = pics <= 3 ? pics : pics === 4 ? 2 : 3;
      const fit = Math.floor(100 / per) - (o.spoiler ? 3 : 1);
      const m = tag.match(/^img(\d+)(%?)$/);
      const fits = m && (m[2] ? +m[1] <= fit : per * +m[1] + 6 * (per - 1) <= 560);
      if (!fits) tag = 'img' + fit + '%';
    }
    const one = it => (it.video ? 'webm(' : tag + '(') + safeUrl(it.url) + ')';
    let all;
    if (side) { all = items.map(one).join(' '); if (o.spoiler) all = '~!' + all + '!~'; }
    else all = items.map(it => (o.spoiler ? '~!' + one(it) + '!~' : one(it))).join('\n');
    return o.center ? (o.spoiler ? '~~~ ' + all + ' ~~~' : '~~~' + all + '~~~') : all;
  }

  // Every JSON object in a page that starts at index i (string-aware brace matching)
  function objectAt(text, i) {
    let depth = 0, inStr = false, esc = false;
    for (let j = i; j < text.length && j < i + 60000; j++) {
      const c = text[j];
      if (inStr) {
        if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') { if (--depth === 0) { try { return JSON.parse(text.slice(i, j + 1)); } catch (e) { return null; } } }
    }
    return null;
  }

  function wordsOf(q) {
    return q.toLowerCase().replace(/[^\p{L}\p{N}_()'.:\-\s]+/gu, ' ').split(/\s+/).filter(w => w && !NOISE.has(w));
  }

  // ---------- Tenor ----------
  function tenorSlug(q) {
    return encodeURIComponent(q.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''));
  }

  function parseTenor(html) {
    const out = [], seen = new Set();
    const re = /\{"id":"(\d+)","legacy_info"/g;
    let m;
    while ((m = re.exec(html))) {
      if (seen.has(m[1])) continue;
      const o = objectAt(html, m.index);
      if (!o || !o.media_formats) continue;
      const f = o.media_formats;
      const gif = f.gif || f.mediumgif;
      const url = gif && httpsOnly(gif.url);
      if (!url) continue;
      seen.add(m[1]);
      const thumb = httpsOnly((f.tinygif || f.nanogif || f.gifpreview || gif).url);
      out.push({
        key: 'tenor:' + m[1], src: 'tenor', url, full: url, thumb,
        w: (gif.dims || [])[0] || 0, h: (gif.dims || [])[1] || 0, bytes: gif.size || 0,
        title: o.content_description || o.title || '', page: o.itemurl || '', tags: Array.isArray(o.tags) ? o.tags : [],
        gif: true,
      });
    }
    return out;
  }

  // More Tenor = the query plus tags its first GIFs share (most common first)
  function tenorMoreTerms(q, items) {
    const qw = new Set(wordsOf(q));
    const count = new Map();
    for (const it of items) {
      for (const t of new Set(it.tags.map(t => String(t).toLowerCase().trim()))) {
        if (!t || t.length > 40) continue;
        const extra = wordsOf(t).filter(w => !qw.has(w) && !STOP.has(w));
        if (!extra.length) continue;
        const k = extra.join(' ');
        count.set(k, (count.get(k) || 0) + 1);
      }
    }
    return [...count.entries()].filter(e => e[1] >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => q.trim() + ' ' + e[0]);
  }

  const tenor = {
    id: 'tenor', name: 'Tenor', short: 'T', gif: true, picture: false,
    async fetch(st, s) {
      for (let tries = 0; tries < 3; tries++) {
        const term = s.page === 0 ? st.q : s.terms && s.terms[s.page - 1];
        if (!term) { s.more = false; return []; }
        s.page++;
        const items = parseTenor(await request('https://tenor.com/search/' + tenorSlug(term) + '-gifs'));
        if (s.page === 1) { s.terms = tenorMoreTerms(st.q, items); if (!items.length) s.more = false; }
        const fresh = items.filter(it => !st.seen.has(it.url));
        if (fresh.length || s.page === 1) return fresh;
      }
      return [];
    },
  };

  // ---------- Safebooru tags (shared by every booru) ----------
  const tagCache = new Map(Object.entries(store.get('tagcache', {}) || {}));
  function saveTagCache() {
    const e = [...tagCache.entries()];
    store.set('tagcache', Object.fromEntries(e.slice(-400)));
  }

  async function tagCount(name) {
    if (tagCache.has(name)) return tagCache.get(name);
    const xml = await request('https://safebooru.org/index.php?page=dapi&s=tag&q=index&name=' + encodeURIComponent(name));
    let n = 0;
    for (const m of xml.matchAll(/<tag\b[^>]*>/g)) {
      const nm = (m[0].match(/\bname="([^"]*)"/) || [])[1];
      const ct = (m[0].match(/\bcount="(\d+)"/) || [])[1];
      if (nm != null && decodeEnt(nm).toLowerCase() === name) { n = +ct || 0; break; }
    }
    tagCache.set(name, n);
    return n;
  }

  // "spice and wolf holo" -> [{name:'spice_and_wolf'}, {name:'holo'}]; words with "_" are taken as tags as typed
  async function resolveTags(q) {
    const raw = q.trim().replace(/^tags?:\s*/i, '');
    if (/^tags?:/i.test(q.trim()) || /_/.test(raw)) {
      const tags = raw.toLowerCase().split(/\s+/).filter(Boolean).map(name => ({ name, count: 0 }));
      return { tags, unknown: [], typed: true };
    }
    const w = wordsOf(raw).slice(0, 8);
    const tags = [], unknown = [];
    let i = 0;
    while (i < w.length) {
      const lens = [];
      for (let len = Math.min(5, w.length - i); len >= 1; len--) {
        if (len === 1 && (STOP.has(w[i]) || w[i].length < 2)) continue;
        lens.push(len);
      }
      const counts = await Promise.all(lens.map(len => tagCount(w.slice(i, i + len).join('_')).catch(() => 0)));
      const k = counts.findIndex(c => c > 0);
      if (k >= 0) { tags.push({ name: w.slice(i, i + lens[k]).join('_'), count: counts[k] }); i += lens[k]; }
      else { if (!STOP.has(w[i])) unknown.push(w[i]); i++; }
    }
    saveTagCache();
    return { tags, unknown, typed: false };
  }

  // ---------- Safebooru posts ----------
  const safebooru = {
    id: 'safebooru', name: 'Safebooru', short: 'SB', gif: true, picture: true,
    async fetch(st, s) {
      const r = await st.tags;
      if (!r.tags.length) { s.more = false; s.note = 'no tag matched'; return []; }
      const tags = r.tags.map(t => t.name).concat(st.mode === 'gif' ? ['animated_gif'] : ['-animated_gif', '-animated'], ['-rating:questionable', '-rating:explicit']);
      const txt = await request('https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=40&pid=' + s.page + '&tags=' + encodeURIComponent(tags.join(' ')));
      s.page++;
      let a = [];
      try { a = txt.trim() ? JSON.parse(txt) : []; } catch (e) { a = []; }
      if (!Array.isArray(a) || a.length < 40) s.more = false;
      return (Array.isArray(a) ? a : []).map(p => {
        const file = httpsOnly(p.file_url) || ('https://safebooru.org/images/' + p.directory + '/' + p.image);
        const isGif = /\.gif$/i.test(p.image || file);
        const sample = p.sample && p.sample_url ? httpsOnly(p.sample_url) : '';
        const thumb = httpsOnly(p.preview_url) || ('https://safebooru.org/thumbnails/' + p.directory + '/thumbnail_' + String(p.image).replace(/\.\w+$/, '.jpg'));
        // Safebooru has no small moving version: small GIFs play in the grid, big ones (phone data) show still until zoomed
        const smallGif = isGif && (+p.width || 0) * (+p.height || 0) <= 640 * 640;
        return {
          key: 'sb:' + p.id, src: 'safebooru', gif: isGif, md5: p.hash || '',
          url: isGif ? file : (sample || file), full: file, thumb: smallGif ? file : thumb, still: thumb,
          w: isGif || !sample ? +p.width : +p.sample_width || +p.width, h: isGif || !sample ? +p.height : +p.sample_height || +p.height,
          title: String(p.tags || '').trim().split(/\s+/).slice(0, 12).join(' '),
          page: 'https://safebooru.org/index.php?page=post&s=view&id=' + p.id, rating: p.rating,
        };
      }).filter(it => it.url && (st.mode === 'gif' ? it.gif : !it.gif) && !/^(questionable|explicit|q|e)$/i.test(it.rating || ''));
    },
  };

  // ---------- Konachan.net (Moebooru, the safe-only Konachan, pictures) ----------
  // (yande.re was tried: its full-size pictures refuse to show on other sites, so every pick was a broken picture)
  function moebooru(id, name, short, host, postPage) {
    return {
      id, name, short, gif: false, picture: true,
      async fetch(st, s) {
        const r = await st.tags;
        if (!r.tags.length) { s.more = false; s.note = 'no tag matched'; return []; }
        if (!s.tagList) s.tagList = r.tags.map(t => t.name);
        const ask = () => request(host + '/post.json?limit=40&page=' + (s.page + 1) + '&tags=' + encodeURIComponent(s.tagList.concat('rating:s').join(' ')));
        let a = JSON.parse((await ask()) || '[]');
        // a tag this site does not know (another name for the series) gives nothing: try the rarest tag alone (usually the character)
        if (!a.length && s.page === 0 && s.tagList.length > 1 && !r.typed) {
          const rare = r.tags.slice().sort((x, y) => x.count - y.count)[0];
          s.tagList = [rare.name];
          s.note = 'only ' + rare.name;
          a = JSON.parse((await ask()) || '[]');
        }
        s.page++;
        if (!Array.isArray(a) || a.length < 40) s.more = false;
        return (Array.isArray(a) ? a : []).filter(p => p.rating === 's' && p.status !== 'deleted').map(p => {
          const sample = httpsOnly(p.sample_url) || httpsOnly(p.jpeg_url) || httpsOnly(p.file_url);
          return {
            key: id + ':' + p.id, src: id, gif: false, md5: p.md5 || '',
            url: sample, full: httpsOnly(p.file_url) || sample, thumb: httpsOnly(p.preview_url) || sample,
            w: +p.sample_width || +p.width, h: +p.sample_height || +p.height,
            title: String(p.tags || '').split(/\s+/).slice(0, 12).join(' '), page: postPage + p.id,
          };
        }).filter(it => it.url && !/\.(mp4|webm|swf)$/i.test(it.url));
      },
    };
  }
  const konachan = moebooru('konachan', 'Konachan', 'KC', 'https://konachan.net', 'https://konachan.net/post/show/');

  const SOURCES = [tenor, safebooru, konachan];

  if (TEST) { TEST.api = { request, requestFull, ghCheck, ghUpload, fileName, ghConf, isVideoFile, isPicFile, parseTenor, tenorMoreTerms, resolveTags, tagCount, SOURCES, aniCode, sizeTag, safeUrl, wordsOf, objectAt }; return; }

  // ---------- settings ----------
  const S = Object.assign({
    mode: 'gif', size: 'img', px: 350, spoiler: false, center: false, keepOpen: false, multi: false, side: true, lastQ: '',
    on: { tenor: true, safebooru: true, konachan: true },
  }, store.get('settings', {}) || {});
  S.on = Object.assign({ tenor: true, safebooru: true, konachan: true }, S.on || {});
  const saveSettings = () => store.set('settings', S);
  let recent = store.get('recent', []) || [];

  // ---------- styles ----------
  const css = `
  .markdown-editor.gp-has { grid-template-columns: repeat(16, 1fr); }
  @media (max-width: 500px) { .markdown-editor.gp-has { grid-template-columns: repeat(8, 1fr); } }
  .markdown-editor > .gp-btn { font: 700 1.05rem/1 Overpass, -apple-system, sans-serif; letter-spacing: .02em; border: 1.5px solid currentColor;
    border-radius: 3px; padding: 1px 3px 0; align-self: center; user-select: none; }
  .gp-ov { position: fixed; inset: 0; z-index: 2147483000; background: rgba(10, 14, 22, .55); display: flex; align-items: center; justify-content: center;
    font-family: Overpass, -apple-system, 'Segoe UI', sans-serif; -webkit-tap-highlight-color: transparent; }
  .gp-panel { --fg: var(--color-foreground, 250,250,250); --bg: var(--color-background, 237,241,245); --tx: var(--color-text, 92,114,138);
    --bl: var(--color-blue, 61,180,242); background: rgb(var(--fg)); color: rgb(var(--tx)); width: min(900px, calc(100vw - 32px));
    height: min(800px, calc(100vh - 48px)); border-radius: 8px; box-shadow: 0 14px 40px rgba(0,0,0,.35); display: flex; flex-direction: column;
    overflow: hidden; position: relative; font-size: 13px; }
  .gp-top { padding: 12px 12px 8px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid rgba(var(--tx), .15); }
  .gp-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .gp-q { flex: 1 1 220px; min-width: 0; height: 38px; border: 0; border-radius: 4px; background: rgb(var(--bg)); color: rgb(var(--tx));
    padding: 0 12px; font: inherit; font-size: 15px; outline: none; }
  .gp-q:focus { box-shadow: 0 0 0 2px rgba(var(--bl), .6); }
  .gp-b { height: 34px; border: 0; border-radius: 4px; padding: 0 12px; font: inherit; font-weight: 700; cursor: pointer; background: rgb(var(--bg));
    color: rgb(var(--tx)); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
  .gp-b.gp-go { background: rgb(var(--bl)); color: #fff; height: 38px; }
  .gp-x { width: 38px; height: 38px; padding: 0; justify-content: center; font-size: 20px; }
  .gp-seg { display: inline-flex; border-radius: 4px; overflow: hidden; background: rgb(var(--bg)); }
  .gp-seg button { border: 0; background: none; color: inherit; font: inherit; font-weight: 700; padding: 0 14px; height: 32px; cursor: pointer; }
  .gp-seg button.on { background: rgb(var(--bl)); color: #fff; }
  .gp-chip { height: 28px; border-radius: 14px; padding: 0 11px; border: 1.5px solid rgba(var(--tx), .3); background: none; color: inherit;
    font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
  .gp-chip.on { border-color: rgb(var(--bl)); color: rgb(var(--bl)); background: rgba(var(--bl), .1); }
  .gp-chip:disabled { opacity: .35; cursor: default; }
  .gp-chip .n { font-weight: 400; opacity: .8; }
  .gp-opts { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 12px; }
  .gp-opts label { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
  .gp-opts select { background: rgb(var(--bg)); color: rgb(var(--tx)); border: 0; border-radius: 4px; height: 28px; padding: 0 6px; font: inherit; }
  .gp-opts .gp-px { width: 70px; background: rgb(var(--bg)); color: rgb(var(--tx)); border: 0; border-radius: 4px; height: 28px; padding: 0 6px; font: inherit; }
  .gp-tile.picked::before { content: ''; position: absolute; inset: 0; border: 3px solid rgb(var(--bl)); border-radius: 4px; z-index: 1; pointer-events: none; }
  .gp-tile.picked img { filter: brightness(.82); }
  .gp-tile .num, .gp-tile .tag, .gp-tile .zoom { z-index: 2; }
  .gp-tile .num { position: absolute; right: 4px; top: 4px; min-width: 24px; height: 24px; border-radius: 12px; background: rgb(var(--bl)); color: #fff;
    font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; padding: 0 6px; pointer-events: none;
    box-shadow: 0 1px 4px rgba(0,0,0,.4); }
  .gp-tray { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 8px 12px; border-top: 1px solid rgba(var(--tx), .15);
    background: rgb(var(--fg)); padding-bottom: max(8px, env(safe-area-inset-bottom)); }
  .gp-tray[hidden] { display: none; }
  .gp-tray .thumbs { display: flex; gap: 4px; flex: 1 1 120px; min-width: 0; overflow-x: auto; }
  .gp-tray .thumbs img { width: 34px; height: 34px; object-fit: cover; border-radius: 3px; flex: none; }
  .gp-tray label { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; cursor: pointer; }
  .gp-up { overflow-y: auto; }
  .gp-up .box { max-width: 560px; width: 100%; margin: 0 auto; padding: 16px 14px 24px; display: flex; flex-direction: column; gap: 12px; }
  .gp-up h3 { margin: 0; font-size: 16px; }
  .gp-up p { margin: 0; font-size: 12.5px; line-height: 1.55; opacity: .9; }
  .gp-up a { color: rgb(var(--bl)); }
  .gp-up .f { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 700; }
  .gp-up .f input { height: 36px; border: 0; border-radius: 4px; background: rgb(var(--bg)); color: rgb(var(--tx)); padding: 0 10px; font: inherit; font-weight: 400; font-size: 14px; }
  .gp-up .drop { border: 2px dashed rgba(var(--tx), .35); border-radius: 8px; min-height: 180px; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 10px; padding: 14px; text-align: center; }
  .gp-up .drop.over { border-color: rgb(var(--bl)); background: rgba(var(--bl), .08); }
  .gp-up .drop img { max-width: 100%; max-height: 260px; border-radius: 4px; }
  .gp-up .msg { font-size: 12.5px; font-weight: 700; min-height: 18px; }
  .gp-up .msg.bad { color: rgb(232, 93, 117); }
  .gp-up .msg.good { color: rgb(var(--bl)); }
  .gp-up .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .gp-status { font-size: 12px; opacity: .85; min-height: 16px; overflow-wrap: anywhere; }
  .gp-status b { color: rgb(var(--bl)); font-weight: 700; }
  .gp-grid-wrap { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 10px 12px 16px; -webkit-overflow-scrolling: touch; }
  .gp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .gp-h { grid-column: 1 / -1; font-weight: 700; font-size: 12px; opacity: .8; margin: 2px 0; }
  .gp-tile { position: relative; aspect-ratio: 1; border-radius: 4px; overflow: hidden; background: rgb(var(--bg)); cursor: pointer; border: 0; padding: 0; }
  .gp-tile img, .gp-tile video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gp-tray .thumbs video { width: 34px; height: 34px; object-fit: cover; border-radius: 3px; flex: none; }
  .gp-view .pic video { max-width: 100%; max-height: 100%; border-radius: 4px; background: #000; }
  .gp-up .drop video { max-width: 100%; max-height: 260px; border-radius: 4px; background: #000; }
  .gp-up .gp-kind { align-self: flex-start; }
  .gp-tile:hover img, .gp-tile:focus-visible img { filter: brightness(1.08); }
  .gp-tile:focus-visible { outline: 3px solid rgb(var(--bl)); }
  .gp-tile .tag { position: absolute; left: 4px; top: 4px; font-size: 10px; font-weight: 700; background: rgba(0,0,0,.6); color: #fff;
    border-radius: 3px; padding: 2px 4px; pointer-events: none; }
  .gp-tile .zoom { position: absolute; right: 4px; bottom: 4px; width: 32px; height: 32px; border-radius: 50%; border: 0; background: rgba(0,0,0,.6);
    color: #fff; font-size: 16px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .15s; cursor: pointer; padding: 0; }
  .gp-tile:hover .zoom, .gp-tile:focus-within .zoom { opacity: 1; }
  .gp-tile.busy::after { content: 'Checking…'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,.55); color: #fff; font-weight: 700; }
  .gp-tile.bad { opacity: .35; }
  .gp-more { text-align: center; padding: 14px; font-size: 12px; opacity: .8; }
  .gp-empty { padding: 30px 10px; text-align: center; opacity: .8; line-height: 1.6; }
  .gp-view { position: absolute; inset: 0; background: rgb(var(--fg)); display: flex; flex-direction: column; z-index: 2; }
  .gp-view .pic { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 12px; }
  .gp-view .pic img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; }
  .gp-view .bar { display: flex; gap: 8px; padding: 10px 12px; flex-wrap: wrap; align-items: center; border-top: 1px solid rgba(var(--tx), .15); }
  .gp-view .info { flex: 1 1 200px; font-size: 12px; opacity: .85; overflow-wrap: anywhere; }
  .gp-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 2147483001; background: rgba(20,24,32,.92); color: #fff;
    padding: 9px 16px; border-radius: 6px; font: 600 13px Overpass, -apple-system, sans-serif; pointer-events: none; max-width: calc(100vw - 32px); }
  @media (hover: none) { .gp-tile .zoom { opacity: 1; } }
  @media (max-width: 600px) {
    .gp-ov { align-items: stretch; }
    .gp-panel { width: 100vw; height: 100%; border-radius: 0; }
    .gp-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .gp-grid-wrap { padding: 8px 8px 24px; }
    .gp-top { padding: 10px 10px 8px; padding-top: max(10px, env(safe-area-inset-top)); }
    .gp-q { font-size: 16px; flex-basis: 120px; }
  }
  @media (max-width: 360px) { .gp-grid { grid-template-columns: repeat(2, 1fr); } }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  const mb = n => (n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
  const SEP = ' · ';
  // drawn, not an emoji: Firefox on some phones has no emoji font for it
  const UP_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M6.5 9.5 12 4l5.5 5.5M4 20h16"/></svg>';
  const ZOOM_ICON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>';

  const el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
    return e;
  };

  function toast(msg) {
    const t = el('div', { class: 'gp-toast' }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------- writing into AniList's box ----------
  function insertText(ta, text) {
    if (!ta || !ta.isConnected) return false;
    const v = ta.value;
    let s = ta.selectionStart, e = ta.selectionEnd;
    // never clicked into: add at the end, not at the start
    if (s == null || !ta.dataset.gpTouched) { s = e = v.length; }
    const before = v.slice(0, s), after = v.slice(e);
    const ins = (before && !/\s$/.test(before) ? '\n' : '') + text + (after && !/^\s/.test(after) ? '\n' : '');
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(s, e);
    let ok = false;
    try { ok = document.execCommand('insertText', false, ins); } catch (err) { ok = false; }
    if (!ok || ta.value !== before + ins + after) {
      ta.value = before + ins + after;
      ta.setSelectionRange(s + ins.length, s + ins.length);
      ta.dispatchEvent(new Event('input', { bubbles: true })); // tell AniList's box the text changed
    }
    ta.dataset.gpTouched = '1';
    return true;
  }

  // a picture that does not load here would be a broken picture in the comment too
  // (a video only needs its first bytes: the browser reading its size and length is enough)
  function loads(url, video) {
    return new Promise(res => {
      const m = video ? document.createElement('video') : new Image();
      const done = ok => { clearTimeout(t); m.onload = m.onerror = m.onloadedmetadata = null; if (video) { m.removeAttribute('src'); m.load(); } res(ok); };
      const t = setTimeout(() => done(false), video ? 25000 : 15000);
      if (video) { m.muted = true; m.preload = 'metadata'; m.onloadedmetadata = () => done(m.videoWidth > 0 || m.duration > 0); }
      else m.onload = () => done(m.naturalWidth > 0);
      m.onerror = () => done(false);
      m.src = url;
    });
  }

  // ---------- the picker ----------
  let P = null; // the open picker

  function openPicker(ta) {
    if (P) closePicker();
    const st = {
      ta, q: '', mode: S.mode, gen: 0, seen: new Set(), loading: false, src: {}, tags: null, count: 0,
      picked: [], // several at once: kept across searches until added or the picker closes
    };
    const q = el('input', { class: 'gp-q', type: 'search', placeholder: 'Search GIFs / pictures, e.g. spice and wolf holo', enterkeyhint: 'search', autocomplete: 'off' });
    q.value = S.lastQ || '';
    const go = el('button', { class: 'gp-b gp-go', type: 'button', onclick: () => search(q.value) }, 'Search');
    const x = el('button', { class: 'gp-b gp-x', type: 'button', title: 'Close (Esc)', 'aria-label': 'Close', onclick: closePicker }, '×');
    const upBtn = el('button', { class: 'gp-b gp-x gp-upbtn', type: 'button', title: 'Upload your own GIF / picture / video', 'aria-label': 'Upload your own', onclick: () => uploadView() });
    upBtn.innerHTML = UP_ICON;
    const segGif = el('button', { type: 'button' }, 'GIF');
    const segPic = el('button', { type: 'button' }, 'Picture');
    const seg = el('div', { class: 'gp-seg' }, segGif, segPic);
    const chips = {};
    for (const s of SOURCES) {
      chips[s.id] = el('button', { class: 'gp-chip', type: 'button', onclick: () => { S.on[s.id] = !S.on[s.id]; saveSettings(); paintTop(); if (st.q) search(st.q); } },
        s.name, el('span', { class: 'n' }));
    }
    const SIZES = [['img', 'Original'], ['img150', '150 px'], ['img220', '220 px'], ['img250', '250 px'], ['img300', '300 px'],
      ['img400', '400 px'], ['img500', '500 px'], ['img600', '600 px'], ['img800', '800 px'], ['img1000', '1000 px'],
      ['img25%', 'Quarter width'], ['img50%', 'Half width'], ['img100%', 'Full width'], ['custom', 'Custom px…']];
    const size = el('select', { title: 'Picture width in the comment' }, ...SIZES.map(([v, t]) => el('option', { value: v }, t)));
    size.value = SIZES.some(s => s[0] === S.size) ? S.size : 'img';
    const px = el('input', { class: 'gp-px', type: 'number', min: '10', max: '5000', step: '10', inputmode: 'numeric', title: 'Width in pixels', 'aria-label': 'Width in pixels' });
    px.value = S.px || 350;
    const showPx = () => { px.hidden = size.value !== 'custom'; };
    size.addEventListener('change', () => { S.size = size.value; saveSettings(); showPx(); if (!px.hidden) px.focus(); });
    px.addEventListener('input', () => { S.px = Math.round(+px.value) || 0; saveSettings(); });
    px.addEventListener('keydown', e => e.stopPropagation());
    showPx();
    const box = (k, label, after) => {
      const c = el('input', { type: 'checkbox' });
      c.checked = !!S[k];
      c.addEventListener('change', () => { S[k] = c.checked; saveSettings(); if (after) after(); });
      return el('label', {}, c, label);
    };
    const multiBox = box('multi', 'Pick several', () => paintTray());
    const trayThumbs = el('div', { class: 'thumbs' });
    const trayAdd = el('button', { class: 'gp-b gp-go', type: 'button', onclick: () => addPicked() });
    const tray = el('div', { class: 'gp-tray', hidden: true },
      trayThumbs,
      el('span', { title: 'Too wide to sit next to each other? They are sized to fit: 2 or 3 per row, on PC and phone' }, box('side', 'Side by side')),
      el('button', { class: 'gp-b', type: 'button', onclick: () => { st.picked = []; markPicked(); paintTray(); } }, 'Clear'),
      trayAdd);
    const status = el('div', { class: 'gp-status' });
    const grid = el('div', { class: 'gp-grid' });
    const more = el('div', { class: 'gp-more' });
    const wrap = el('div', { class: 'gp-grid-wrap' }, grid, more);
    const panel = el('div', { class: 'gp-panel', role: 'dialog', 'aria-label': 'GIF and picture search' },
      el('div', { class: 'gp-top' },
        el('div', { class: 'gp-row' }, q, go, upBtn, x),
        el('div', { class: 'gp-row' }, seg, ...SOURCES.map(s => chips[s.id])),
        el('div', { class: 'gp-opts' }, el('label', {}, 'Size ', size, px), box('spoiler', 'Spoiler'), box('center', 'Centre'), multiBox, box('keepOpen', 'Keep open after adding')),
        status),
      wrap, tray);
    const ov = el('div', { class: 'gp-ov', onclick: e => { if (e.target === ov) closePicker(); } }, panel);

    const setMode = m => { if (st.mode === m) return; st.mode = S.mode = m; saveSettings(); paintTop(); if (st.q) search(st.q); };
    segGif.addEventListener('click', () => setMode('gif'));
    segPic.addEventListener('click', () => setMode('picture'));
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); search(q.value); } });

    function usable(s) { return st.mode === 'gif' ? s.gif : s.picture; }
    function paintTop() {
      segGif.classList.toggle('on', st.mode === 'gif');
      segPic.classList.toggle('on', st.mode === 'picture');
      for (const s of SOURCES) {
        const c = chips[s.id], ok = usable(s);
        c.disabled = !ok;
        c.classList.toggle('on', ok && !!S.on[s.id]);
        c.title = ok ? (S.on[s.id] ? 'Searching ' + s.name + ' (tap to leave it out)' : 'Left out (tap to search it)') : s.name + (s.gif ? ' has GIFs only' : ' has pictures only');
        const x = st.src[s.id];
        c.lastChild.textContent = x && ok && S.on[s.id] ? (x.err ? ' !' : ' ' + x.count) : '';
      }
    }

    function paintStatus() {
      status.textContent = '';
      if (!st.q) { status.append('Type what you want and press Enter. Tap a picture to add it (or turn on Pick several); the magnifier shows it big first.'); return; }
      const parts = [];
      const on = SOURCES.filter(s => usable(s) && S.on[s.id]);
      if (!on.length) { status.append('Turn on a source above.'); return; }
      if (st.tagInfo && on.some(s => s.id !== 'tenor')) {
        if (st.tagInfo.tags.length) {
          status.append('Booru tags: ', el('b', {}, st.tagInfo.tags.map(t => t.name).join(' ')));
          if (st.tagInfo.unknown.length) status.append(' (no tag for: ' + st.tagInfo.unknown.join(', ') + ')');
          status.append(SEP);
        } else status.append('No booru tag matched (try a character or series name, or type tags with _ )' + SEP);
      }
      for (const s of on) {
        const x = st.src[s.id];
        if (!x) continue;
        parts.push(s.name + ': ' + (x.err ? 'error (' + x.err + ')' : x.count + (x.note && x.note !== 'no tag matched' ? ' (' + x.note + ')' : '')));
      }
      status.append(parts.join(SEP));
    }

    // a video (your uploads) shows its first frame, plays muted while hovered
    const media = it => {
      if (!it.video) return el('img', { src: it.thumb, loading: 'lazy', alt: it.title || '', draggable: 'false' });
      const m = el('video', { src: it.url + '#t=0.1', preload: 'metadata', playsinline: true, loop: true });
      m.muted = true;
      return m;
    };

    function tile(it) {
      const img = media(it);
      img.addEventListener('error', () => {
        if (it.still && img.src !== it.still) { img.src = it.still; return; }
        t.remove();
      });
      if (it.video) {
        img.addEventListener('mouseenter', () => img.play().catch(() => {}));
        img.addEventListener('mouseleave', () => img.pause());
      }
      const zoom = el('button', { class: 'zoom', type: 'button', title: 'See it big', 'aria-label': 'See it big', onclick: e => { e.stopPropagation(); view(it); } });
      zoom.innerHTML = ZOOM_ICON;
      const src = SOURCES.find(s => s.id === it.src);
      const mine = it.src === 'upload';
      const t = el('div', { class: 'gp-tile', tabindex: '0', title: (it.title ? it.title + '\n' : '') + (it.w ? it.w + '×' + it.h + ' · ' : '') + (src ? src.name : mine ? 'your upload' : 'recent') },
        img, el('span', { class: 'tag' }, src ? src.short : mine ? (it.video ? 'UP ▶' : 'UP') : '↺'), zoom);
      t.gpUrl = it.url;
      // Pick several on (or Ctrl / Shift / Cmd-click on PC): tap = pick / unpick; otherwise tap = add straight away
      const act = e => { if (S.multi || e.ctrlKey || e.shiftKey || e.metaKey) togglePick(it); else pick(it, t); };
      t.addEventListener('click', act);
      t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(e); } });
      markTile(t);
      return t;
    }

    function markTile(t) {
      const i = st.picked.findIndex(p => p.url === t.gpUrl);
      t.classList.toggle('picked', i >= 0);
      let n = t.querySelector('.num');
      if (i < 0) { if (n) n.remove(); return; }
      if (!n) { n = el('span', { class: 'num' }); t.appendChild(n); }
      n.textContent = i + 1;
    }
    function markPicked() { for (const t of panel.querySelectorAll('.gp-tile')) markTile(t); }

    function togglePick(it) {
      const i = st.picked.findIndex(p => p.url === it.url);
      if (i >= 0) st.picked.splice(i, 1); else st.picked.push(it);
      markPicked(); paintTray();
    }

    function paintTray() {
      const n = st.picked.length;
      tray.hidden = !n;
      trayThumbs.textContent = '';
      trayThumbs.append(...st.picked.map(p => {
        const m = p.video ? media(p) : el('img', { src: p.still || p.thumb, alt: '' });
        m.title = 'Tap to unpick';
        m.addEventListener('click', () => togglePick(p));
        return m;
      }));
      trayAdd.textContent = 'Add ' + n;
    }

    // records what was added, closes (unless Keep open)
    function added(items) {
      for (const it of items.slice().reverse()) recent = [Object.assign({}, it, { tags: undefined })].concat(recent.filter(r => r.url !== it.url));
      recent = recent.slice(0, 36);
      store.set('recent', recent);
      const what = items.length > 1 ? items.length + ' added' : 'Added ' + (items[0].video ? 'video' : items[0].gif ? 'GIF' : 'picture');
      if (S.keepOpen) toast(what); else { closePicker(); toast(what + ' to your comment'); }
    }

    async function pick(it, t) {
      if (t && t.classList.contains('busy')) return;
      if (t) t.classList.add('busy');
      const ok = await loads(it.url, it.video);
      if (t) t.classList.remove('busy');
      if (!P || P.st !== st) return;
      if (!ok) { if (t) t.classList.add('bad'); toast('That one will not load from its site, pick another'); return; }
      if (!insertText(st.ta, aniCode([it], S))) { toast('The comment box is gone, open the picker from the box again'); return; }
      added([it]);
    }

    async function addPicked() {
      const list = st.picked.slice();
      if (!list.length || trayAdd.disabled) return;
      trayAdd.disabled = true; trayAdd.textContent = 'Checking…';
      const ok = await Promise.all(list.map(it => loads(it.url, it.video)));
      if (!P || P.st !== st) return;
      trayAdd.disabled = false;
      const good = list.filter((it, i) => ok[i]);
      const bad = list.length - good.length;
      for (const t of panel.querySelectorAll('.gp-tile')) if (list.some((it, i) => !ok[i] && it.url === t.gpUrl)) t.classList.add('bad');
      if (!good.length) { st.picked = []; markPicked(); paintTray(); toast('None of those load from their sites, pick others'); return; }
      if (!insertText(st.ta, aniCode(good, S))) { paintTray(); toast('The comment box is gone, open the picker from the box again'); return; }
      st.picked = []; markPicked(); paintTray();
      if (bad) toast(bad + ' did not load from their site and were left out');
      if (bad && !S.keepOpen) { setTimeout(() => added(good), 1200); return; }
      added(good);
    }

    function view(it) {
      const big = it.video ? el('video', { src: it.url, controls: true, loop: true, playsinline: true, autoplay: true }) : el('img', { src: it.url, alt: it.title || '' });
      if (it.video) big.muted = true;
      const src = SOURCES.find(s => s.id === it.src);
      const isPicked = () => st.picked.some(p => p.url === it.url);
      const pickBtn = el('button', { class: 'gp-b', type: 'button', onclick: () => { togglePick(it); pickBtn.textContent = isPicked() ? 'Unpick' : 'Pick'; } }, isPicked() ? 'Unpick' : 'Pick');
      const v = el('div', { class: 'gp-view' },
        el('div', { class: 'pic', onclick: e => { if (e.target === e.currentTarget) v.remove(); } }, big),
        el('div', { class: 'bar' },
          el('div', { class: 'info' }, (src ? src.name : 'Recent') + (it.w ? ' · ' + it.w + '×' + it.h : '') + (it.bytes ? ' · ' + mb(it.bytes) : '') + (it.title ? ' · ' + it.title : '')),
          it.page ? el('a', { class: 'gp-b', href: it.page, target: '_blank', rel: 'noopener noreferrer' }, 'Source ↗') : null,
          el('button', { class: 'gp-b', type: 'button', onclick: () => v.remove() }, 'Back'),
          S.multi || st.picked.length ? pickBtn : null,
          el('button', { class: 'gp-b gp-go', type: 'button', onclick: () => { v.remove(); pick(it, null); } }, 'Add to comment')));
      panel.appendChild(v);
    }

    // Upload your own: GIF / picture or Video (each its own repo). The GitHub setup the first time (or via Change),
    // then choose / drop / paste a file
    function uploadView(file, setup, kind) {
      for (const old of panel.querySelectorAll('.gp-view')) old.remove();
      kind = kind || (file ? (isVideoFile(file) ? 'video' : 'gif') : (S.upKind === 'video' ? 'video' : 'gif'));
      if (S.upKind !== kind) { S.upKind = kind; saveSettings(); }
      const vid = kind === 'video';
      const c = ghConf(kind);
      const v = el('div', { class: 'gp-view gp-up' });
      const body = el('div', { class: 'box' });
      v.appendChild(body);
      const back = el('button', { class: 'gp-b', type: 'button', onclick: () => v.remove() }, 'Back');
      const msg = el('div', { class: 'msg' });
      const say = (t, k) => { msg.textContent = t; msg.className = 'msg' + (k ? ' ' + k : ''); };
      const kGif = el('button', { type: 'button', class: vid ? '' : 'on', onclick: () => { if (vid) uploadView(null, false, 'gif'); } }, 'GIF / picture');
      const kVid = el('button', { type: 'button', class: vid ? 'on' : '', onclick: () => { if (!vid) uploadView(null, false, 'video'); } }, 'Video');
      body.append(el('div', { class: 'gp-seg gp-kind' }, kGif, kVid));

      if (setup || !ghReady(c)) {
        const saved = ghSaved(kind);
        const gifTok = ghSaved('gif').token;
        const field = (label, attrs, value) => { const i = el('input', Object.assign({ autocomplete: 'off', spellcheck: 'false' }, attrs)); i.value = value || ''; i.addEventListener('keydown', e => e.stopPropagation()); return [el('label', { class: 'f' }, label, i), i]; };
        const [fRepo, iRepo] = field(vid ? 'Your public GitHub repo for videos (name/repo)' : 'Your public GitHub repo (name/repo)', { placeholder: vid ? 'YourName/videos' : 'YourName/gifs' }, saved.repo);
        const [fBranch, iBranch] = field('Branch (empty = the repo\'s main one)', { placeholder: 'main' }, saved.branch);
        const [fFolder, iFolder] = field('Folder in the repo (empty = top)', { placeholder: vid ? '' : 'gifs' }, saved.folder);
        const [fTok, iTok] = field(vid && gifTok ? 'Token (empty = use your GIF token)' : 'Token',
          { type: 'password', placeholder: saved.token ? 'saved (paste a new one to replace it)' : vid && gifTok ? 'using your GIF token' : 'github_pat_…' }, '');
        const save = el('button', { class: 'gp-b gp-go', type: 'button' }, 'Save and check');
        save.addEventListener('click', async () => {
          const n = { repo: iRepo.value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '').replace(/\.git$/, ''), branch: iBranch.value.trim(),
            folder: iFolder.value.trim(), token: iTok.value.trim() || saved.token };
          const test = Object.assign({}, n, { token: n.token || (vid ? gifTok : '') });
          save.disabled = true; say('Checking with GitHub…');
          let bad;
          try { bad = await ghCheck(test); } catch (e) { bad = 'GitHub did not answer (' + e.message + ')'; }
          save.disabled = false;
          if (bad) { say(bad, 'bad'); return; }
          n.branch = test.branch;
          store.set(GH_KEY[kind], n);
          say('Saved. ' + (vid ? 'Videos' : 'Uploads') + ' go to ' + n.repo + (ghPath(n) ? '/' + ghPath(n) : '') + ' (' + n.branch + ')', 'good');
          setTimeout(() => { if (v.isConnected) uploadView(file, false, kind); }, 900);
        });
        const what = vid ? 'videos' : 'GIFs';
        body.append(
          el('h3', {}, vid ? 'Upload your own videos: set up once' : 'Upload your own: set up once'),
          el('p', {}, 'Your ' + what + ' are stored in a GitHub repo of yours, and the comment links to them there. The repo must be public so everyone can see them.' +
            (vid ? ' It can be a different repo from your GIF one.' : '')),
          el('p', {}, '1. Make a new public repo on GitHub, e.g. "' + (vid ? 'videos' : 'gifs') + '" (', el('a', { href: 'https://github.com/new', target: '_blank', rel: 'noopener' }, 'github.com/new'), '), or use one you have.'),
          vid && gifTok
            ? el('p', {}, '2. Token: leave it empty to use your GIF token, but then add this repo to that token on GitHub (', el('a', { href: 'https://github.com/settings/personal-access-tokens', target: '_blank', rel: 'noopener' }, 'your tokens'),
              ' > the token > Edit > Repository access > add it; Contents stays Read and write). Or paste a separate token for it.')
            : el('p', {}, '2. Make a token (', el('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'fine-grained token'),
              '): Repository access > Only select repositories > that repo; Permissions > Contents > Read and write. Pick an expiry you like, then Generate and copy it.'),
          el('p', {}, '3. Fill in below. The token is kept in Tampermonkey on this device and only ever sent to GitHub.'),
          fRepo, fBranch, fFolder, fTok,
          el('div', { class: 'row' }, save, back, saved.token ? el('button', { class: 'gp-b', type: 'button', onclick: () => { store.set(GH_KEY[kind], Object.assign(saved, { token: '' })); say('Token removed from this device', 'good'); } }, 'Forget token') : null),
          msg);
        panel.appendChild(v);
        if (!matchMedia('(hover: none)').matches) (saved.repo ? iTok : iRepo).focus();
        return;
      }

      const input = el('input', { type: 'file', accept: vid ? 'video/mp4,video/webm,video/x-m4v,.mp4,.webm,.m4v' : 'image/gif,image/png,image/jpeg,image/webp', hidden: true });
      const choose = el('button', { class: 'gp-b gp-go', type: 'button', onclick: () => input.click() }, vid ? 'Choose a video' : 'Choose a GIF / picture');
      const drop = el('div', { class: 'drop' });
      const go = el('button', { class: 'gp-b gp-go', type: 'button', hidden: true }, 'Upload and add');
      let cur = null, curUrl = '';
      const setFile = f => {
        if (curUrl) URL.revokeObjectURL(curUrl);
        cur = null; curUrl = ''; go.hidden = true;
        drop.textContent = '';
        if (!f) { drop.append(choose, el('p', {}, matchMedia('(hover: none)').matches ? 'From your gallery or files' : 'or drag one here, or paste it (Ctrl+V)')); return; }
        if (vid ? !isVideoFile(f) : !isPicFile(f)) {
          if (vid ? isPicFile(f) : isVideoFile(f)) { uploadView(f, false, vid ? 'gif' : 'video'); return; } // the other kind: switch over
          say(vid ? 'That is not an MP4 / WebM video' : 'That is not a GIF / PNG / JPG / WebP picture', 'bad'); setFile(null); return;
        }
        if (f.size > UP_MAX) { say('That file is ' + mb(f.size) + '; the limit is 25 MB (make it smaller first)', 'bad'); setFile(null); return; }
        cur = f; curUrl = URL.createObjectURL(f);
        const prev = vid ? el('video', { src: curUrl, controls: true, loop: true, playsinline: true }) : el('img', { src: curUrl, alt: '' });
        if (vid) { prev.muted = true; prev.play().catch(() => {}); }
        drop.append(prev, el('p', {}, (f.name || 'pasted file') + ' · ' + mb(f.size)),
          el('button', { class: 'gp-b', type: 'button', onclick: () => input.click() }, 'Choose another'));
        go.hidden = false;
        say('');
      };
      input.addEventListener('change', () => setFile(input.files && input.files[0]));
      drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) setFile(f); });
      go.addEventListener('click', async () => {
        if (!cur) return;
        const f = cur;
        go.disabled = true; choose.disabled = true;
        say('Uploading ' + mb(f.size) + ' to GitHub…' + (f.size > 8 * 1048576 ? ' (big files take a little while)' : ''));
        const conf = ghConf(kind);
        try {
          const url = await ghUpload(conf, fileName(f), await readB64(f));
          if (!v.isConnected || !P || P.st !== st) return;
          const it = { key: 'up:' + url, src: 'upload', url, full: url, thumb: url, title: f.name || '', gif: /\.gif$/i.test(url), video: vid, page: '' };
          // GitHub's raw links answer within seconds of the upload; wait for it so the comment never gets a dead link
          let ok = false;
          for (let i = 0; i < 6 && !ok; i++) { ok = await loads(url + (i ? '?t=' + i : ''), vid); if (!ok) await new Promise(r => setTimeout(r, 2000)); }
          if (!P || P.st !== st) return;
          v.remove();
          if (S.multi) { st.picked.push(it); markPicked(); paintTray(); toast('Uploaded and picked'); return; }
          if (!insertText(st.ta, aniCode([it], S))) { toast('Uploaded, but the comment box is gone'); return; }
          if (!ok) toast('Uploaded; GitHub may take a minute before it shows');
          added([it]);
        } catch (e) {
          go.disabled = false; choose.disabled = false;
          let m = e.message || 'Upload failed';
          if (conf.shared && /not allowed to write/.test(m)) m += '. It is your GIF token: add ' + conf.repo + ' to it on GitHub, or paste a separate token (Change)';
          say(m, 'bad');
        }
      });
      body.append(
        el('h3', {}, vid ? 'Upload your own video' : 'Upload your own'),
        drop, input,
        el('div', { class: 'row' }, go, back),
        msg,
        vid ? el('p', {}, 'Added as webm(link): AniList plays MP4 and WebM with it (the Size option is for pictures only). Up to 25 MB.') : null,
        el('p', {}, 'Goes to ', el('b', {}, c.repo + (ghPath(c) ? '/' + ghPath(c) : '')), ' on GitHub (public). ',
          el('a', { href: '#', onclick: e => { e.preventDefault(); uploadView(null, true, kind); } }, 'Change'), ' · ',
          el('a', { href: 'https://github.com/' + c.repo + (ghPath(c) ? '/tree/' + (c.branch || 'main') + '/' + ghPath(c) : ''), target: '_blank', rel: 'noopener' }, 'Open the repo')));
      panel.appendChild(v);
      setFile(file || null);
    }

    // PC: paste or drop a picture / video anywhere on the picker = upload it
    panel.addEventListener('paste', e => {
      const f = [...((e.clipboardData && e.clipboardData.files) || [])].find(f => isPicFile(f) || isVideoFile(f));
      if (f) { e.preventDefault(); uploadView(f); }
    });
    panel.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    panel.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files[0];
      if (f && !e.defaultPrevented) { e.preventDefault(); uploadView(f); }
    });

    function showRecent() {
      grid.textContent = '';
      more.textContent = '';
      if (!recent.length) { grid.append(el('div', { class: 'gp-empty' }, 'Search for something, for example "spice and wolf holo", "frieren", "anime hug".', el('br'), 'GIF finds Tenor + Safebooru GIFs, Picture finds booru art.')); return; }
      grid.append(el('div', { class: 'gp-h' }, 'Recently used'), ...recent.map(tile));
    }

    function addItems(lists) {
      // one from each source in turn, so every source shows near the top
      const out = [];
      for (let i = 0; lists.some(l => i < l.length); i++) {
        for (const l of lists) {
          const it = l[i];
          if (it && !st.seen.has(it.url) && !(it.md5 && st.seen.has(it.md5))) { st.seen.add(it.url); if (it.md5) st.seen.add(it.md5); out.push(it); }
        }
      }
      if (out.length) grid.append(...out.map(tile));
      st.count += out.length;
      return out.length;
    }

    async function round() {
      if (st.loading) return;
      const gen = st.gen;
      const act = SOURCES.filter(s => usable(s) && S.on[s.id] && st.src[s.id] && st.src[s.id].more);
      if (!act.length) { more.textContent = st.count ? 'That is everything.' : ''; return; }
      st.loading = true;
      more.textContent = 'Loading…';
      const lists = await Promise.all(act.map(async s => {
        const x = st.src[s.id];
        try { const items = await s.fetch(st, x); x.count += items.length; return items; }
        catch (e) { x.err = e.message || 'failed'; x.more = false; return []; }
      }));
      if (gen !== st.gen || !P || P.st !== st) return;
      st.loading = false;
      const n = addItems(lists);
      paintTop(); paintStatus();
      const left = SOURCES.some(s => usable(s) && S.on[s.id] && st.src[s.id] && st.src[s.id].more);
      if (!st.count) {
        more.textContent = '';
        grid.append(el('div', { class: 'gp-empty' }, 'Nothing found. Try fewer words, the character\'s name, or switch GIF / Picture.'));
      } else more.textContent = left ? (n ? 'Scroll for more' : 'Loading…') : 'That is everything.';
      if (left && (!n || wrap.scrollHeight <= wrap.clientHeight + 300)) setTimeout(round, 0);
    }

    function search(text) {
      text = (text || '').trim();
      S.lastQ = text; saveSettings();
      st.gen++;
      st.q = text; st.seen = new Set(); st.count = 0; st.loading = false; st.src = {}; st.tagInfo = null;
      grid.textContent = '';
      wrap.scrollTop = 0;
      if (!text) { paintTop(); paintStatus(); showRecent(); return; }
      // a link pasted in: add that picture as it is
      if (/^https?:\/\/\S+$/i.test(text)) {
        const it = { key: 'url', src: '', url: text, full: text, thumb: text, title: '', gif: /\.gif(\?|$)/i.test(text) };
        grid.append(el('div', { class: 'gp-h' }, 'Your link'), tile(it));
        paintTop(); status.textContent = 'Tap it to add it as it is.'; more.textContent = '';
        return;
      }
      for (const s of SOURCES) if (usable(s) && S.on[s.id]) st.src[s.id] = { page: 0, more: true, count: 0 };
      const gen = st.gen;
      const needTags = SOURCES.some(s => s.id !== 'tenor' && st.src[s.id]);
      st.tags = (needTags ? resolveTags(text) : Promise.resolve({ tags: [], unknown: [] })).catch(() => ({ tags: [], unknown: [] }));
      st.tags.then(r => { if (gen === st.gen && needTags) { st.tagInfo = r; paintStatus(); } });
      paintTop(); paintStatus();
      round();
    }

    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && st.q && !st.loading) round(); }, { root: wrap, rootMargin: '400px' });
    io.observe(more);

    const onKey = e => {
      if (e.key !== 'Escape') return;
      const v = panel.querySelector('.gp-view');
      if (v) v.remove(); else closePicker();
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(ov);
    const oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    P = { st, ov, io, onKey, oldOverflow };
    paintTop();
    if (q.value) search(q.value); else { paintStatus(); showRecent(); }
    // the phone keyboard would cover half the results, so only focus the box straight away on PC
    if (!matchMedia('(hover: none)').matches) { q.focus(); q.select(); }
  }

  function closePicker() {
    if (!P) return;
    P.st.gen++;
    P.io.disconnect();
    document.removeEventListener('keydown', P.onKey, true);
    P.ov.remove();
    document.documentElement.style.overflow = P.oldOverflow;
    P = null;
  }

  // ---------- the GIF button in every AniList comment toolbar ----------
  let lastTa = null;
  document.addEventListener('focusin', e => {
    if (e.target && e.target.tagName === 'TEXTAREA') { lastTa = e.target; e.target.dataset.gpTouched = '1'; }
  }, true);

  function editorTextarea(me) {
    for (let n = me.nextElementSibling; n; n = n.nextElementSibling) {
      const ta = n.matches('textarea') ? n : n.querySelector('textarea');
      if (ta) return ta;
    }
    return me.parentElement ? me.parentElement.querySelector('textarea') : null;
  }

  function addButtons() {
    for (const me of document.querySelectorAll('.markdown-editor:not([data-gp])')) {
      me.setAttribute('data-gp', '1');
      me.classList.add('gp-has');
      const b = el('div', { class: 'gp-btn', title: 'GIF / picture search', role: 'button', tabindex: '0' }, 'GIF');
      const open = e => {
        e.preventDefault(); e.stopPropagation();
        const ta = editorTextarea(me);
        if (!ta) { toast('No comment box found next to this toolbar'); return; }
        openPicker(ta);
      };
      // mousedown is stopped so the comment box keeps its place (AniList hides the toolbar when the box loses focus)
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', open);
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(e); });
      me.appendChild(b);
    }
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; addButtons(); });
  }).observe(document.body, { childList: true, subtree: true });
  addButtons();

  // Alt+G in a comment box opens the picker too (PC)
  document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'g' || e.key === 'G') && e.target && e.target.tagName === 'TEXTAREA') {
      e.preventDefault();
      openPicker(e.target);
    }
  }, true);

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('GIF / picture search', () => {
      const ta = lastTa && lastTa.isConnected ? lastTa : document.querySelector('textarea');
      if (!ta) { toast('Click into a comment box first'); return; }
      openPicker(ta);
    });
  }
})();

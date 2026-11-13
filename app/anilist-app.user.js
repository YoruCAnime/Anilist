// ==UserScript==
// @name         AniList App
// @namespace    yoruc.anilist.app
// @author       YoruC
// @version      1.1.0
// @description  Turns AniList on your phone into an app: bottom tabs (Home, Watching, Search, Alerts, Me), a fast feed with double-tap likes and Like all, easy follow buttons, +1 episode tracking with this week's airing, one-tap Plan / Watch from search, notifications with pictures, nice profiles. Comes with AniList DMs (live chat), the GIF & Picture Picker, Like Previews and Chat View.
// @match        https://anilist.co/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @connect      tenor.com
// @connect      safebooru.org
// @connect      konachan.net
// @connect      api.github.com
// @connect      www.youtube.com
// @connect      raw.githubusercontent.com
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/app/anilist-app.user.js
// @downloadURL  https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/app/anilist-app.user.js
// ==/UserScript==
// AniList App by YoruC. Built from separate files by build.py - edit those, not this file.
// Inside: AniList DMs 1.5.2, GIF & Picture Picker 1.5.8, Like Previews 1.5.0, Chat View (mobile) 2.9.
// If you also have one of those as its own script, the app sees it and leaves that tool to it (no doubles).
(function () {
  'use strict';

  // ---------- the app, DMs, Like Previews and Chat View run inside AniList's own page (its login, its router) ----------
  function PAGE_PART() {
    // ===== AniList App: the app part. Runs INSIDE AniList's page (its login, its router), put there by the userscript. =====
    'use strict';
    if (window.__alaApp) return;
    window.__alaApp = "1.1.0";
    const VERSION = "1.1.0";
    const CSS = "#ala { --a-bar: 62px; --a-acc: #3db4f2; --a-acc-rgb: 61,180,242; --a-heart: #ff4f79; --a-ok: #4cca51; --a-warn: #f5a524;\n  --a-bg: #0b1220; --a-surf: #121b2c; --a-surf2: #192439; --a-surf3: #223049; --a-line: rgba(255,255,255,.07);\n  --a-text: #e7eef8; --a-mute: #8d9cb4; --a-glass: rgba(14,21,35,.93); --a-shadow: 0 6px 24px rgba(0,0,0,.35);\n  font-family: Overpass, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; color: var(--a-text);\n  -webkit-tap-highlight-color: transparent; font-size: 14px; line-height: 1.4; }\n#ala.ala-light { --a-bg: #eef2f8; --a-surf: #ffffff; --a-surf2: #f2f5fa; --a-surf3: #e5eaf2; --a-line: rgba(15,35,70,.09);\n  --a-text: #1a2537; --a-mute: #66748c; --a-glass: rgba(255,255,255,.94); --a-shadow: 0 6px 24px rgba(30,50,90,.14); }\n#ala *, #ala *::before, #ala *::after { box-sizing: border-box; }\n:where(#ala) button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }\n:where(#ala) a { color: inherit; text-decoration: none; }\n:where(#ala) img { max-width: 100%; }\n#ala [hidden] { display: none !important; }\nhtml.ala-on body { padding-bottom: calc(var(--ala-bar, 62px) + env(safe-area-inset-bottom)); }\nhtml.ala-on .mobile-nav { display: none !important; }\nhtml.ala-scr-open, html.ala-scr-open body { overflow: hidden !important; overscroll-behavior: none; }\nhtml.ala-on .adm-root { bottom: calc(var(--ala-bar, 62px) + 12px + env(safe-area-inset-bottom)) !important; }\n@media (max-width: 760px) {\n  html.ala-on .adm-panel, html.ala-on .adm-big .adm-panel { top: 10px !important;\n    bottom: max(calc(var(--ala-bar, 62px) + 8px + env(safe-area-inset-bottom)), calc(var(--adm-kb, 0px) + 6px)) !important; }\n}\nhtml.ala-on .acv-fab { bottom: calc(var(--ala-bar, 62px) + 64px) !important; }\n.ala-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147481500; display: flex; justify-content: space-around; align-items: stretch;\n  height: calc(var(--a-bar) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);\n  background: var(--a-glass); -webkit-backdrop-filter: blur(16px) saturate(1.4); backdrop-filter: blur(16px) saturate(1.4);\n  border-top: 1px solid var(--a-line); }\n.ala-tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: var(--a-mute);\n  font-size: 10.5px; font-weight: 700; letter-spacing: .02em; position: relative; touch-action: manipulation; }\n.ala-tab svg { width: 24px; height: 24px; transition: transform .18s; }\n.ala-tab.on { color: var(--a-acc); }\n.ala-tab.on svg { transform: translateY(-1px) scale(1.08); }\n.ala-tab:active svg { transform: scale(.88); }\n.ala-tab .ala-av { width: 25px; height: 25px; border-radius: 50%; background: var(--a-surf3) center/cover; border: 2px solid transparent; }\n.ala-tab.on .ala-av { border-color: var(--a-acc); }\n.ala-badge { position: absolute; top: 6px; left: calc(50% + 6px); min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px;\n  background: var(--a-heart); color: #fff; font-size: 10.5px; font-weight: 800; line-height: 17px; text-align: center;\n  box-shadow: 0 0 0 2px var(--a-bg); }\n.ala-screens { position: fixed; left: 0; right: 0; top: 0; bottom: calc(var(--a-bar) + env(safe-area-inset-bottom)); z-index: 2147481000;\n  background: var(--a-bg); overflow: hidden; }\n.ala-scr { position: absolute; inset: 0; z-index: 0; background: var(--a-bg); display: flex; flex-direction: column; }\n.ala-scr.ala-layer { z-index: 1; }\n.ala-scr.ala-layer { animation: ala-in .22s cubic-bezier(.2,.8,.2,1); box-shadow: -10px 0 30px rgba(0,0,0,.35); }\n@keyframes ala-in { from { transform: translateX(40%); opacity: .4; } to { transform: none; opacity: 1; } }\n.ala-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; position: relative; }\n.ala-head { position: sticky; top: 0; z-index: 5; background: var(--a-glass); -webkit-backdrop-filter: blur(16px) saturate(1.4);\n  backdrop-filter: blur(16px) saturate(1.4); border-bottom: 1px solid var(--a-line); padding: 10px 14px 8px; padding-top: max(10px, env(safe-area-inset-top)); }\n.ala-hrow { display: flex; align-items: center; gap: 10px; min-height: 36px; }\n.ala-title { font-size: 21px; font-weight: 800; letter-spacing: -.01em; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.ala-ib { width: 36px; height: 36px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex: none;\n  background: var(--a-surf2); color: var(--a-text); touch-action: manipulation; transition: transform .12s; }\n.ala-ib:active { transform: scale(.9); }\n.ala-ib svg { width: 19px; height: 19px; }\n.ala-ib.ala-acc { background: var(--a-acc); color: #fff; }\n.ala-seg { display: flex; background: var(--a-surf2); border-radius: 12px; padding: 3px; gap: 2px; margin-top: 9px; }\n.ala-seg button { flex: 1; height: 32px; border-radius: 9px; font-weight: 700; font-size: 13.5px; color: var(--a-mute); transition: background .15s, color .15s; }\n.ala-seg button.on { background: var(--a-surf); color: var(--a-text); box-shadow: 0 1px 4px rgba(0,0,0,.18); }\n#ala.ala-light .ala-seg button.on { background: #fff; }\n.ala-chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-top: 8px; padding-bottom: 1px; }\n.ala-chips::-webkit-scrollbar { display: none; }\n.ala-chip { flex: none; height: 28px; padding: 0 12px; border-radius: 14px; background: var(--a-surf2); color: var(--a-mute); font-size: 12.5px; font-weight: 700; }\n.ala-chip.on { background: rgba(var(--a-acc-rgb), .18); color: var(--a-acc); }\n.ala-pad { padding: 10px 10px 24px; }\n.ala-empty { text-align: center; color: var(--a-mute); padding: 40px 24px; font-size: 14px; }\n.ala-empty b { display: block; color: var(--a-text); font-size: 16px; margin-bottom: 6px; }\n.ala-btn { height: 38px; padding: 0 16px; border-radius: 12px; background: var(--a-surf2); font-weight: 700; font-size: 13.5px;\n  display: inline-flex; align-items: center; justify-content: center; gap: 6px; touch-action: manipulation; transition: transform .12s, filter .12s; }\n.ala-btn:active { transform: scale(.96); }\n.ala-btn.ala-pri { background: var(--a-acc); color: #fff; }\n.ala-btn.ala-ghost { background: transparent; border: 1px solid var(--a-line); }\n.ala-btn.ala-danger { color: #ff6b81; }\n.ala-btn[disabled] { opacity: .5; }\n.ala-btn svg { width: 17px; height: 17px; }\n.ala-sec { margin: 18px 4px 8px; display: flex; align-items: baseline; gap: 8px; }\n.ala-sec h3 { margin: 0; font-size: 15.5px; font-weight: 800; flex: 1; }\n.ala-sec small { color: var(--a-mute); font-weight: 700; font-size: 12px; }\n.ala-spin { width: 26px; height: 26px; margin: 26px auto; border-radius: 50%; border: 3px solid var(--a-surf3); border-top-color: var(--a-acc); animation: ala-rot .8s linear infinite; }\n@keyframes ala-rot { to { transform: rotate(360deg); } }\n.ala-more { height: 1px; }\n.ala-ptr { position: absolute; left: 50%; top: 6px; width: 34px; height: 34px; margin-left: -17px; border-radius: 50%; background: var(--a-surf);\n  box-shadow: var(--a-shadow); display: flex; align-items: center; justify-content: center; color: var(--a-acc); z-index: 6;\n  transform: translateY(-60px); pointer-events: none; }\n.ala-ptr svg { width: 18px; height: 18px; }\n.ala-ptr.go svg { animation: ala-rot .7s linear infinite; }\n.ala-newpill { position: sticky; top: 112px; z-index: 4; display: flex; justify-content: center; height: 0; overflow: visible; }\n.ala-newpill button { height: 32px; padding: 0 14px; border-radius: 16px; background: var(--a-acc); color: #fff; font-weight: 800; font-size: 12.5px;\n  box-shadow: 0 6px 18px rgba(var(--a-acc-rgb), .45); animation: ala-drop .25s ease-out; }\n@keyframes ala-drop { from { transform: translateY(-14px); opacity: 0; } }\n.ala-card { background: var(--a-surf); border-radius: 18px; margin: 0 0 10px; padding: 12px 12px 6px; position: relative;\n  content-visibility: auto; contain-intrinsic-size: auto 170px; touch-action: manipulation; border: 1px solid var(--a-line); }\n.ala-card.ala-pinned { border-color: rgba(var(--a-acc-rgb), .45); }\n.ala-ch { display: flex; align-items: center; gap: 10px; }\n.ala-avatar { display: block; width: 40px; height: 40px; border-radius: 50%; flex: none; background: var(--a-surf3) center/cover; }\n.ala-who { flex: 1; min-width: 0; line-height: 1.25; }\n.ala-name { font-weight: 800; font-size: 14.5px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.ala-time { color: var(--a-mute); font-size: 12px; font-weight: 600; }\n.ala-follow { height: 28px; padding: 0 12px; border-radius: 14px; background: rgba(var(--a-acc-rgb), .16); color: var(--a-acc);\n  font-weight: 800; font-size: 12px; flex: none; transition: background .15s, color .15s; touch-action: manipulation; }\n.ala-follow.on { background: var(--a-surf2); color: var(--a-mute); }\n.ala-follow.big { height: 38px; padding: 0 22px; border-radius: 12px; font-size: 14px; background: var(--a-acc); color: #fff; }\n.ala-follow.big.on { background: var(--a-surf2); color: var(--a-text); }\n.ala-body { margin: 9px 0 4px; overflow-wrap: anywhere; }\n.ala-text { position: relative; max-height: 440px; overflow: hidden; font-size: 14.5px; line-height: 1.5; }\n.ala-text.open { max-height: none; }\n.ala-text.over:not(.open)::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 70px; background: linear-gradient(transparent, var(--a-surf)); pointer-events: none; }\n.ala-readmore { color: var(--a-acc); font-weight: 800; font-size: 13px; padding: 4px 0; display: none; }\n.ala-text.over + .ala-readmore { display: inline-block; }\n.ala-text.open + .ala-readmore { display: none; }\n.ala-md p { margin: 0 0 .55em; }\n.ala-md p:last-child { margin-bottom: 0; }\n.ala-md img, .ala-md video { max-width: 100%; height: auto; border-radius: 10px; vertical-align: middle; }\n.ala-md video { background: #000; }\n.ala-md a { color: var(--a-acc); }\n.ala-md h1, .ala-md h2, .ala-md h3, .ala-md h4, .ala-md h5 { margin: .3em 0 .4em; line-height: 1.25; }\n.ala-md h1 { font-size: 20px; } .ala-md h2 { font-size: 18px; } .ala-md h3, .ala-md h4, .ala-md h5 { font-size: 16px; }\n.ala-md blockquote { margin: .4em 0; padding: 4px 12px; border-left: 3px solid rgba(var(--a-acc-rgb), .6); background: var(--a-surf2); border-radius: 0 10px 10px 0; }\n.ala-md pre, .ala-md code { background: var(--a-surf2); border-radius: 6px; font-size: 12.5px; padding: 1px 5px; white-space: pre-wrap; }\n.ala-md hr { border: 0; border-top: 1px solid var(--a-line); }\n.ala-md center, .ala-md .center { display: block; text-align: center; }\n.ala-md ul, .ala-md ol { padding-left: 1.3em; margin: .3em 0; }\n.ala-spoiler { background: var(--a-surf3); border-radius: 8px; padding: 2px 8px; cursor: pointer; display: inline-block; }\n.ala-spoiler:not(.open) > * { display: none; }\n.ala-spoiler:not(.open)::before { content: 'Spoiler, tap to see'; font-size: 12.5px; font-weight: 800; color: var(--a-mute); }\n.ala-spoiler.open { background: transparent; padding: 0; display: block; }\n.ala-yt { display: block; position: relative; border-radius: 12px; overflow: hidden; max-width: 420px; aspect-ratio: 16/9; background: #000 center/cover; margin: 4px 0; }\n.ala-yt::after { content: ''; position: absolute; left: 50%; top: 50%; width: 58px; height: 40px; margin: -20px 0 0 -29px; border-radius: 12px;\n  background: rgba(230,30,30,.92) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='white' d='M9 7v10l8-5z'/%3E%3C/svg%3E\") center/26px no-repeat; }\n.ala-list { display: flex; gap: 12px; align-items: center; padding: 8px; margin: 2px -4px 2px; border-radius: 14px;\n  background: linear-gradient(90deg, rgba(var(--m-rgb, 61,180,242), .16), transparent 75%); }\n.ala-cover { width: 54px; height: 76px; border-radius: 9px; flex: none; background: var(--a-surf3) center/cover; position: relative; box-shadow: 0 3px 10px rgba(0,0,0,.25); }\n.ala-cover .ala-plus { position: absolute; right: -6px; bottom: -6px; width: 24px; height: 24px; border-radius: 50%; background: var(--a-acc); color: #fff;\n  display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px var(--a-surf); }\n.ala-cover .ala-plus svg { width: 14px; height: 14px; }\n.ala-ltxt { flex: 1; min-width: 0; font-size: 14px; }\n.ala-ltxt b { font-weight: 800; color: var(--a-text); }\n.ala-ltxt .ala-st { color: var(--a-mute); font-weight: 600; }\n.ala-cf { display: flex; align-items: center; gap: 2px; margin-top: 4px; }\n.ala-act { height: 36px; min-width: 44px; padding: 0 10px; border-radius: 18px; display: inline-flex; align-items: center; gap: 6px; color: var(--a-mute);\n  font-weight: 800; font-size: 13px; touch-action: manipulation; transition: background .15s, color .15s; }\n.ala-act:active { background: var(--a-surf2); }\n.ala-act svg { width: 20px; height: 20px; }\n.ala-act.liked { color: var(--a-heart); }\n.ala-act.liked svg { animation: ala-pop .35s; }\n@keyframes ala-pop { 40% { transform: scale(1.35); } }\n.ala-sp { flex: 1; }\n.ala-burst { position: absolute; width: 90px; height: 90px; margin: -45px 0 0 -45px; pointer-events: none; color: var(--a-heart); z-index: 3;\n  animation: ala-burst .7s ease-out forwards; filter: drop-shadow(0 4px 12px rgba(255,79,121,.55)); }\n@keyframes ala-burst { 0% { transform: scale(.2); opacity: 0; } 20% { transform: scale(1.1); opacity: 1; } 40% { transform: scale(.95); } 100% { transform: scale(1.25) translateY(-20px); opacity: 0; } }\n.ala-replies { border-top: 1px solid var(--a-line); margin: 6px -12px 0; padding: 8px 12px 10px; }\n.ala-reply { display: flex; gap: 9px; padding: 7px 0; }\n.ala-reply .ala-avatar { width: 30px; height: 30px; }\n.ala-rb { flex: 1; min-width: 0; background: var(--a-surf2); border-radius: 4px 14px 14px 14px; padding: 7px 10px 6px; }\n.ala-rb .ala-name { font-size: 13px; display: inline; }\n.ala-rb .ala-time { margin-left: 6px; }\n.ala-rb .ala-md { font-size: 14px; margin-top: 2px; }\n.ala-rlike { align-self: center; color: var(--a-mute); font-size: 11.5px; font-weight: 800; display: flex; flex-direction: column; align-items: center; min-width: 30px; }\n.ala-rlike svg { width: 17px; height: 17px; }\n.ala-rlike.liked { color: var(--a-heart); }\n.ala-compose { margin-top: 8px; }\n#ala .ala-compose .markdown-editor { display: flex; gap: 5px; align-items: center; min-height: 0; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;\n  background: none; border: 0; padding: 0 0 7px; margin: 0; box-shadow: none; grid-template-columns: none; }\n#ala .ala-compose .markdown-editor::-webkit-scrollbar { display: none; }\n#ala .ala-tb { flex: none; height: 32px; min-width: 34px; padding: 0 9px; border-radius: 9px; background: var(--a-surf2); color: var(--a-text);\n  font-size: 13px; font-weight: 800; line-height: 1; touch-action: manipulation; border: 1px solid var(--a-line); }\n#ala .ala-tb:active { background: var(--a-surf3); transform: scale(.94); }\n#ala .ala-tb.ala-pvb { font-family: \"Segoe UI Emoji\", \"Noto Color Emoji\", sans-serif; opacity: .55; }\n#ala .ala-tb.ala-pvb.on { opacity: 1; background: rgba(var(--a-acc-rgb), .18); border-color: rgba(var(--a-acc-rgb), .45); }\n#ala .ala-compose .markdown-editor > .gp-btn { order: -1; flex: none; height: 32px; min-width: 42px; padding: 0 8px; border-radius: 9px; display: inline-flex;\n  align-items: center; justify-content: center; color: var(--a-acc); border: 1.5px solid currentColor; background: rgba(var(--a-acc-rgb), .1); font-size: 13px; }\n.ala-preview { margin-top: 6px; padding: 8px 12px 10px; border-radius: 14px; background: var(--a-surf2); border: 1px dashed var(--a-line);\n  max-height: 260px; overflow: auto; overflow-wrap: anywhere; font-size: 14.5px; line-height: 1.5; }\n.ala-preview::before { content: 'Preview'; display: block; font-size: 11px; font-weight: 800; color: var(--a-mute); letter-spacing: .05em; text-transform: uppercase; margin-bottom: 4px; }\n#ala .ala-preview .markdown { color: var(--a-text); font-size: inherit; }\n#ala .ala-preview img, #ala .ala-preview video { max-width: 100%; height: auto; border-radius: 8px; }\n#ala .ala-preview p { margin: 0 0 .5em; }\n#ala .ala-preview .youtube, #ala .ala-preview lite-youtube { max-width: 100%; }\n#ala { --color-text: 231,238,248; --color-text-light: 141,156,180; --color-foreground: 25,36,57; --color-foreground-grey: 34,48,73; --color-background: 11,18,32; }\n#ala.ala-light { --color-text: 26,37,55; --color-text-light: 102,116,140; --color-foreground: 242,245,250; --color-foreground-grey: 229,234,242; --color-background: 238,242,248; }\n.ala-ta { width: 100%; min-height: 44px; max-height: 40vh; resize: none; border-radius: 14px; border: 1px solid var(--a-line); background: var(--a-surf2);\n  color: var(--a-text); font: inherit; font-size: 15px; padding: 10px 12px; outline: none; }\n.ala-ta:focus { border-color: rgba(var(--a-acc-rgb), .6); }\n.ala-crow { display: flex; gap: 8px; align-items: center; margin-top: 6px; }\n.ala-emo { display: flex; gap: 2px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; flex: 1; }\n.ala-emo button { font-size: 19px; width: 34px; height: 34px; border-radius: 10px; flex: none; }\n.ala-emo button:active { background: var(--a-surf3); }\n.ala-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin: 6px 0 4px; }\n.ala-day { background: var(--a-surf); border-radius: 12px; padding: 6px 3px 5px; text-align: center; min-height: 64px; border: 1px solid var(--a-line); }\n.ala-day.today { border-color: rgba(var(--a-acc-rgb), .7); background: rgba(var(--a-acc-rgb), .1); }\n.ala-day > span { font-size: 10.5px; font-weight: 800; color: var(--a-mute); display: block; margin-bottom: 4px; text-transform: uppercase; }\n.ala-day.today > span { color: var(--a-acc); }\n.ala-dc { display: flex; flex-direction: column; align-items: center; gap: 3px; }\n.ala-dc i { width: 30px; height: 42px; border-radius: 6px; background: var(--a-surf3) center/cover; display: block; position: relative; }\n.ala-dc i b { position: absolute; left: -3px; bottom: -3px; background: var(--a-acc); color: #fff; font: 800 9px/14px Overpass, sans-serif; font-style: normal; padding: 0 4px; border-radius: 7px; }\n.ala-dc em { font-style: normal; font-size: 10px; color: var(--a-mute); font-weight: 800; }\n.ala-wc { display: flex; gap: 12px; align-items: center; background: var(--a-surf); border-radius: 16px; padding: 9px; margin-bottom: 8px; border: 1px solid var(--a-line);\n  content-visibility: auto; contain-intrinsic-size: auto 96px; }\n.ala-wc .ala-cover { width: 56px; height: 80px; }\n.ala-wi { flex: 1; min-width: 0; }\n.ala-wt { font-weight: 800; font-size: 14.5px; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n.ala-wm { color: var(--a-mute); font-size: 12.5px; font-weight: 700; margin-top: 3px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }\n.ala-tag { height: 20px; padding: 0 8px; border-radius: 10px; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; background: var(--a-surf3); color: var(--a-text); }\n.ala-tag.new { background: rgba(255,79,121,.16); color: var(--a-heart); }\n.ala-tag.soon { background: rgba(var(--a-acc-rgb), .16); color: var(--a-acc); }\n.ala-tag.ok { background: rgba(76,202,81,.15); color: var(--a-ok); }\n.ala-bar2 { height: 5px; border-radius: 3px; background: var(--a-surf3); margin-top: 7px; overflow: hidden; position: relative; }\n.ala-bar2 i { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(var(--a-acc-rgb), .35); border-radius: 3px; }\n.ala-bar2 b { position: absolute; left: 0; top: 0; bottom: 0; background: var(--a-acc); border-radius: 3px; }\n.ala-plus1 { width: 50px; height: 50px; border-radius: 16px; background: var(--a-acc); color: #fff; font-weight: 900; font-size: 16px; flex: none;\n  box-shadow: 0 5px 14px rgba(var(--a-acc-rgb), .35); touch-action: manipulation; transition: transform .12s; }\n.ala-plus1:active { transform: scale(.88); }\n.ala-plus1.soft { background: var(--a-surf2); color: var(--a-text); box-shadow: none; font-size: 13px; }\n.ala-plus1[disabled] { opacity: .5; }\n.ala-search { display: flex; align-items: center; gap: 8px; background: var(--a-surf2); border-radius: 14px; padding: 0 12px; height: 44px; }\n.ala-search svg { width: 19px; height: 19px; color: var(--a-mute); flex: none; }\n.ala-search input { flex: 1; min-width: 0; background: none; border: 0; outline: none; color: var(--a-text); font: inherit; font-size: 16px; height: 100%; }\n.ala-mr { display: flex; gap: 12px; align-items: center; padding: 8px; border-radius: 14px; background: var(--a-surf); margin-bottom: 7px; border: 1px solid var(--a-line);\n  content-visibility: auto; contain-intrinsic-size: auto 84px; }\n.ala-mr .ala-cover { width: 48px; height: 68px; }\n.ala-mbtns { display: flex; flex-direction: column; gap: 5px; flex: none; }\n.ala-mbtns .ala-btn { height: 30px; padding: 0 11px; font-size: 12px; border-radius: 10px; }\n.ala-stchip { height: 30px; padding: 0 11px; border-radius: 10px; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; }\n.ala-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }\n.ala-gi { position: relative; }\n.ala-gi .ala-cover { width: 100%; height: auto; aspect-ratio: 2/3; border-radius: 12px; }\n.ala-gi span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 12px; font-weight: 700; margin-top: 5px; line-height: 1.25; }\n.ala-gi .ala-gst { position: absolute; left: 6px; top: 6px; height: 18px; padding: 0 6px; border-radius: 9px; font-size: 10px; font-weight: 800; line-height: 18px; color: #fff; }\n.ala-ur { display: flex; align-items: center; gap: 11px; padding: 8px 6px; border-radius: 14px; }\n.ala-ur .ala-who { cursor: pointer; }\n.ala-ur + .ala-ur { border-top: 1px solid var(--a-line); border-radius: 0; }\n.ala-nr { display: flex; gap: 11px; align-items: center; padding: 10px; border-radius: 16px; margin-bottom: 6px; background: var(--a-surf); position: relative;\n  content-visibility: auto; contain-intrinsic-size: auto 70px; border: 1px solid var(--a-line); }\n.ala-nr.unread { background: linear-gradient(90deg, rgba(var(--a-acc-rgb), .14), var(--a-surf) 70%); border-color: rgba(var(--a-acc-rgb), .3); }\n.ala-nr.unread::before { content: ''; position: absolute; left: 4px; top: 50%; width: 5px; height: 5px; margin-top: -2.5px; border-radius: 50%; background: var(--a-acc); }\n.ala-nav { position: relative; width: 44px; height: 44px; flex: none; }\n.ala-nav .ala-avatar { width: 44px; height: 44px; }\n.ala-nav .ala-stack { position: absolute; width: 26px; height: 26px; border-radius: 50%; right: -4px; bottom: -4px; background: var(--a-surf3) center/cover; box-shadow: 0 0 0 2px var(--a-surf); }\n.ala-nav .ala-kind { position: absolute; right: -4px; bottom: -4px; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center;\n  color: #fff; box-shadow: 0 0 0 2px var(--a-surf); }\n.ala-nav .ala-kind svg { width: 12px; height: 12px; }\n.ala-nt { flex: 1; min-width: 0; font-size: 13.5px; line-height: 1.35; }\n.ala-nt b { font-weight: 800; }\n.ala-nt .ala-snip { color: var(--a-mute); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 2px; font-size: 12.5px; }\n.ala-nt .ala-time { display: block; margin-top: 2px; }\n.ala-nthumb { width: 44px; height: 58px; border-radius: 8px; flex: none; background: var(--a-surf3) center/cover; }\n.ala-ngroup { color: var(--a-mute); font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; margin: 14px 6px 7px; }\n.ala-banner { height: 150px; background: var(--a-surf3) center/cover; position: relative; flex: none; }\n.ala-banner::after { content: ''; position: absolute; inset: 0; background: linear-gradient(rgba(0,0,0,.15), transparent 40%, var(--a-bg)); }\n.ala-pbtns { position: absolute; top: max(10px, env(safe-area-inset-top)); left: 12px; right: 12px; display: flex; justify-content: space-between; z-index: 2; }\n.ala-pbtns .ala-ib { background: rgba(0,0,0,.45); color: #fff; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }\n.ala-phead { padding: 0 16px; margin-top: -48px; position: relative; z-index: 1; }\n.ala-bigav { width: 92px; height: 92px; border-radius: 26px; background: var(--a-surf3) center/cover; border: 3px solid var(--a-bg); box-shadow: var(--a-shadow); }\n.ala-prow { display: flex; align-items: flex-end; gap: 12px; }\n.ala-prow .ala-sp { flex: 1; }\n.ala-pname { font-size: 24px; font-weight: 900; margin: 8px 0 2px; letter-spacing: -.01em; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n.ala-fy { font-size: 11px; font-weight: 800; background: var(--a-surf2); color: var(--a-mute); padding: 3px 8px; border-radius: 8px; }\n.ala-counts { display: flex; gap: 16px; color: var(--a-mute); font-size: 13.5px; margin: 4px 0 2px; }\n.ala-counts button b { color: var(--a-text); font-weight: 900; margin-right: 3px; }\n.ala-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0 4px; }\n.ala-stat { background: var(--a-surf); border-radius: 14px; padding: 10px; text-align: center; border: 1px solid var(--a-line); }\n.ala-stat b { display: block; font-size: 19px; font-weight: 900; color: var(--a-acc); }\n.ala-stat span { font-size: 11.5px; color: var(--a-mute); font-weight: 700; }\n.ala-car { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; padding: 2px 2px 6px; scroll-snap-type: x proximity; }\n.ala-car::-webkit-scrollbar { display: none; }\n.ala-ci { width: 92px; flex: none; scroll-snap-align: start; }\n.ala-ci .ala-cover { width: 92px; height: 130px; border-radius: 12px; }\n.ala-ci span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 11.5px; font-weight: 700; margin-top: 5px; line-height: 1.25; }\n.ala-ci .ala-cp { position: absolute; left: 6px; right: 6px; bottom: 6px; height: 4px; border-radius: 2px; background: rgba(0,0,0,.5); overflow: hidden; }\n.ala-ci .ala-cp b { position: absolute; left: 0; top: 0; bottom: 0; background: var(--a-acc); }\n.ala-ci .ala-ce { position: absolute; right: 5px; top: 5px; background: rgba(0,0,0,.7); color: #fff; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 7px; }\n.ala-links { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 6px; }\n.ala-link { background: var(--a-surf); border-radius: 14px; padding: 10px 4px 8px; display: flex; flex-direction: column; align-items: center; gap: 5px;\n  font-size: 11px; font-weight: 800; color: var(--a-mute); border: 1px solid var(--a-line); text-align: center; }\n.ala-link svg { width: 22px; height: 22px; color: var(--a-acc); }\n.ala-about { background: var(--a-surf); border-radius: 16px; padding: 12px; border: 1px solid var(--a-line); }\n.ala-sheets { position: fixed; inset: 0; z-index: 2147482500; }\n.ala-back { position: absolute; inset: 0; background: rgba(4,8,16,.55); animation: ala-fade .2s; }\n@keyframes ala-fade { from { opacity: 0; } }\n.ala-sheet { position: absolute; left: 0; right: 0; bottom: 0; max-height: 90vh; max-height: 90dvh; background: var(--a-bg); border-radius: 22px 22px 0 0;\n  box-shadow: 0 -10px 40px rgba(0,0,0,.4); display: flex; flex-direction: column; animation: ala-up .26s cubic-bezier(.2,.8,.2,1);\n  padding-bottom: env(safe-area-inset-bottom); max-width: 640px; margin: 0 auto; }\n@keyframes ala-up { from { transform: translateY(100%); } }\n.ala-grab { width: 40px; height: 5px; border-radius: 3px; background: var(--a-surf3); margin: 8px auto 2px; flex: none; }\n.ala-sbody { overflow-y: auto; padding: 8px 16px 18px; overscroll-behavior: contain; }\n.ala-shead { display: flex; gap: 14px; align-items: flex-end; margin-bottom: 12px; }\n.ala-shead .ala-cover { width: 74px; height: 104px; border-radius: 12px; }\n.ala-stitle { font-size: 18px; font-weight: 900; line-height: 1.25; }\n.ala-pills { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }\n.ala-pill { height: 40px; border-radius: 12px; background: var(--a-surf); border: 1px solid var(--a-line); font-weight: 800; font-size: 13px; color: var(--a-mute); }\n.ala-pill.on { color: #fff; border-color: transparent; }\n.ala-lab { font-size: 12px; font-weight: 800; color: var(--a-mute); text-transform: uppercase; letter-spacing: .05em; margin: 16px 2px 7px; }\n.ala-step { display: flex; align-items: center; gap: 10px; }\n.ala-step button { width: 46px; height: 46px; border-radius: 14px; background: var(--a-surf); border: 1px solid var(--a-line); font-size: 22px; font-weight: 800; }\n.ala-step input { width: 84px; height: 46px; text-align: center; font: inherit; font-size: 20px; font-weight: 900; background: var(--a-surf2); color: var(--a-text);\n  border: 0; border-radius: 14px; outline: none; -moz-appearance: textfield; }\n.ala-step input::-webkit-inner-spin-button { -webkit-appearance: none; }\n.ala-step span { color: var(--a-mute); font-weight: 800; }\n.ala-score { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }\n.ala-score button { height: 38px; border-radius: 10px; background: var(--a-surf); border: 1px solid var(--a-line); font-weight: 800; font-size: 13px; color: var(--a-mute); }\n.ala-score button.on { background: var(--a-warn); color: #1a1200; border-color: transparent; }\n.ala-sfoot { display: flex; gap: 8px; margin-top: 18px; }\n.ala-sfoot .ala-btn { flex: 1; height: 46px; border-radius: 14px; font-size: 15px; }\n.ala-menu button { width: 100%; height: 50px; display: flex; align-items: center; gap: 12px; padding: 0 6px; font-weight: 700; font-size: 15px; border-radius: 12px; }\n.ala-menu button:active { background: var(--a-surf2); }\n.ala-menu svg { width: 21px; height: 21px; color: var(--a-mute); }\n.ala-set { display: flex; align-items: center; gap: 10px; padding: 11px 2px; border-bottom: 1px solid var(--a-line); }\n.ala-set > div { flex: 1; min-width: 0; }\n.ala-set b { display: block; font-size: 14.5px; }\n.ala-set small { color: var(--a-mute); font-size: 12px; }\n.ala-sw { width: 46px; height: 28px; border-radius: 14px; background: var(--a-surf3); position: relative; flex: none; transition: background .2s; }\n.ala-sw::after { content: ''; position: absolute; left: 3px; top: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }\n.ala-sw.on { background: var(--a-acc); }\n.ala-sw.on::after { transform: translateX(18px); }\n.ala-opts { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }\n.ala-opts button { height: 30px; padding: 0 10px; border-radius: 10px; background: var(--a-surf2); font-size: 12.5px; font-weight: 800; color: var(--a-mute); }\n.ala-opts button.on { background: var(--a-acc); color: #fff; }\n.ala-swatch { width: 28px; height: 28px; border-radius: 50%; border: 3px solid transparent; }\n.ala-swatch.on { border-color: var(--a-text); }\n.ala-toasts { position: fixed; left: 12px; right: 12px; bottom: calc(var(--a-bar) + 14px + env(safe-area-inset-bottom)); z-index: 2147482800;\n  display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; }\n.ala-toast { background: #1d2940; color: #fff; padding: 10px 14px; border-radius: 14px; font-weight: 700; font-size: 13.5px; box-shadow: 0 8px 26px rgba(0,0,0,.4);\n  display: flex; align-items: center; gap: 12px; pointer-events: auto; animation: ala-drop .22s ease-out; max-width: 520px; }\n.ala-toast button { color: #7fd0ff; font-weight: 900; }\n.ala-fab { position: fixed; left: 14px; bottom: calc(var(--a-bar) + 14px + env(safe-area-inset-bottom)); z-index: 2147481400; height: 46px; padding: 0 18px 0 14px;\n  border-radius: 23px; background: var(--a-acc); color: #fff; font-weight: 900; font-size: 14px; display: flex; align-items: center; gap: 7px;\n  box-shadow: 0 8px 22px rgba(var(--a-acc-rgb), .45); animation: ala-drop .25s ease-out; }\n.ala-fab svg { width: 20px; height: 20px; }\n.ala-fab.has { background: var(--a-surf); color: var(--a-text); border: 1px solid var(--a-line); box-shadow: var(--a-shadow); }\n.ala-progress { position: sticky; top: 0; }\n.ala-likeall { display: flex; align-items: center; gap: 10px; background: rgba(255,79,121,.13); color: var(--a-heart); border-radius: 12px; padding: 7px 12px;\n  margin-top: 8px; font-weight: 800; font-size: 13px; }\n.ala-likeall .ala-sp { flex: 1; }\n.ala-likeall button { color: var(--a-text); font-weight: 900; }\n@media (min-width: 700px) {\n  .ala-scroll > .ala-pad, .ala-scroll > .ala-head > * , .ala-scroll > .ala-phead, .ala-scroll > .ala-prof { max-width: 680px; margin-left: auto; margin-right: auto; }\n  .ala-grid { grid-template-columns: repeat(5, 1fr); }\n}\n@media (prefers-reduced-motion: reduce) { #ala *, #ala *::before, #ala *::after { animation: none !important; transition: none !important; } }";
    const MODS = {
      // ======== dms (AniList DMs 1.5.2, from github.com/YoruCAnime/Anilist) ========
      dms: function () {
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

          const VERSION = '1.5.2'; // the same as @version above
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
          .adm-scroll { flex: 1 1 0; min-height: 70px; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; padding: 8px 10px 6px; }
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
          /* the buttons grow from the bubble's outer edge towards the middle, so a short message never pushes them out of the chat */
          .adm-m:not(.adm-mine) .adm-acts { left: 6px; }
          .adm-mine .adm-acts { right: 6px; }
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

          /* ---- 1.5: new messages pop in ---- */
          @keyframes adm-pop { from { opacity: 0; transform: translateY(14px) scale(.88); } }
          .adm-m.adm-pop .adm-b { animation: adm-pop .34s cubic-bezier(.2, .9, .3, 1.35); transform-origin: left bottom; }
          .adm-m.adm-mine.adm-pop .adm-b { transform-origin: right bottom; }
          @media (prefers-reduced-motion: reduce) { .adm-m.adm-pop .adm-b { animation: none; } }
          /* the messages + the buttons floating over them */
          .adm-sw { flex: 1 1 0; min-height: 70px; display: flex; flex-direction: column; position: relative; }
          .adm-jump { position: absolute; right: 12px; bottom: 10px; z-index: 3; width: 34px; height: 34px; border-radius: 50%; border: 0; padding: 0; cursor: pointer;
            background: rgb(var(--color-background)); color: rgb(var(--color-blue)); font: 700 17px/34px Overpass, sans-serif;
            box-shadow: 0 3px 10px rgba(0,0,0,.4), 0 0 0 1px rgba(var(--color-text), .18); animation: adm-fade .15s ease-out; }
          .adm-jump:hover { filter: brightness(1.25); }
          .adm-jump[hidden] { display: none; }
          /* search in the open conversation */
          .adm-find { flex: none; display: flex; align-items: center; gap: 5px; padding: 6px 10px; background: rgba(var(--color-text), .07); font-size: 12.5px; }
          .adm-find[hidden] { display: none; }
          .adm-find input { flex: 1; min-width: 0; font: inherit; font-size: 13.5px; padding: 5px 9px; border-radius: 6px; border: 1px solid rgba(var(--color-text), .2);
            background: rgb(var(--color-background)); color: rgb(var(--color-text)); outline: none; }
          .adm-find input:focus { border-color: rgb(var(--color-blue)); }
          .adm-find-n { opacity: .75; white-space: nowrap; min-width: 40px; text-align: center; }
          .adm-find .adm-btn { padding: 3px 8px; }
          .adm-find .adm-btn[hidden] { display: none; }
          .adm-m.adm-hit-cur .adm-b { outline: 2px solid #ffd54a; outline-offset: 2px; }
          mark.adm-mark { background: #ffd54a; color: #1a1400; border-radius: 3px; padding: 0 1px; }
          /* pinned conversations */
          .adm-pinb { position: absolute; right: 28px; top: 4px; display: none; font-size: 11.5px; opacity: .6; border: 0; background: none; color: inherit; cursor: pointer; padding: 2px 5px; }
          .adm-row:hover .adm-pinb { display: block; }
          .adm-pinb:hover { opacity: 1; }
          .adm-pinmark { flex: none; font-size: 11px; }

          /* ---- 1.5.1: your own picture behind the chat (Options > Background) ---- */
          /* behind the messages / the list (not the bars): the whole picture, the space around it in the picture's own edge colour */
          .adm-root.adm-bgpic .adm-sw, .adm-root.adm-bgpic .adm-list {
            background-image: linear-gradient(rgba(8,10,26,var(--adm-dim,.45)), rgba(8,10,26,var(--adm-dim,.45))), var(--adm-bgimg);
            background-size: auto, contain; background-position: center; background-repeat: no-repeat; background-color: var(--adm-bgcol, #0b0e22); }
          .adm-root.adm-bgpic.adm-bgfill .adm-sw, .adm-root.adm-bgpic.adm-bgfill .adm-list { background-size: auto, cover; }
          /* plain backgrounds: dark, light, or the colour of AniList's own theme */
          .adm-root.adm-bg-dark .adm-sw, .adm-root.adm-bg-dark .adm-list { background: #0a0d1a; }
          .adm-root.adm-bg-light .adm-sw, .adm-root.adm-bg-light .adm-list { background: #eef1f6; }
          .adm-root.adm-bg-anilist .adm-sw, .adm-root.adm-bg-anilist .adm-list { background: rgb(var(--adm-site-bg, 11,22,34)); }
          .adm-root.adm-hasbg .adm-scroll { background-image: none; }
          .adm-hasbg .adm-day, .adm-hasbg .adm-status, .adm-hasbg .adm-empty { opacity: 1; text-shadow: 0 1px 3px #000, 0 0 8px #000; }
          .adm-root.adm-bg-light .adm-day, .adm-root.adm-bg-light .adm-status, .adm-root.adm-bg-light .adm-empty { color: #39456a; text-shadow: none; }
          .adm-root.adm-bg-anilist .adm-day, .adm-root.adm-bg-anilist .adm-status, .adm-root.adm-bg-anilist .adm-empty { color: rgb(var(--adm-site-text, 159,173,189)); text-shadow: none; }
          .adm-root.adm-bg-dark .adm-day, .adm-root.adm-bg-dark .adm-status { text-shadow: none; }
          .adm-hasbg.adm-look-classic .adm-b { background: rgba(var(--color-foreground, 21,31,46), .9); }
          .adm-hasbg.adm-look-classic .adm-mine .adm-b { background: linear-gradient(rgba(var(--color-blue), .25), rgba(var(--color-blue), .25)), rgb(var(--color-foreground, 21,31,46)); }
          .adm-hasbg.adm-look-classic .adm-row { background: rgba(var(--color-foreground, 21,31,46), .82); }
          .adm-hasbg.adm-look-classic .adm-row:hover { background: rgb(var(--color-foreground, 21,31,46)); }

          /* ---- 1.5.2: a newer version is out ---- */
          .adm-launch.adm-newver::after { content: '⬆'; position: absolute; left: -4px; top: -4px; width: 19px; height: 19px; border-radius: 50%; box-sizing: border-box;
            background: rgb(var(--color-green, 123,213,85)); color: #fff; font: 700 12px/19px Overpass, sans-serif; text-align: center; box-shadow: 0 0 0 2px rgb(var(--color-background, 11,22,34)); }
          .adm-updrow { flex-wrap: wrap; }
          .adm-updrow .adm-updgo { text-decoration: none; display: inline-flex; align-items: center; height: 30px; padding: 0 10px; box-sizing: border-box; }
          .adm-updrow .adm-updnote { opacity: .85; }

          /* phones: above AniList's own round menu button (bottom right) */
          @media (max-width: 760px) {
            .adm-root { right: 12px; bottom: 66px; }
            .adm-launch { width: 42px; height: 42px; }
            .adm-panel, .adm-big .adm-panel { position: fixed; left: 6px; right: 6px; top: 56px; bottom: max(116px, calc(var(--adm-kb, 0px) + 6px)); width: auto; height: auto; }
            .adm-rz { display: none; }
            .adm-b { max-width: 88%; }
            /* 1.5: one more button in the top bar (search): a little tighter, so the name keeps its room */
            .adm-head { gap: 4px; padding-left: 10px; padding-right: 6px; }
            .adm-hb { width: 26px; }
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
            applyLook();
            loadBg();
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
          // 1.5: the look of the chat (Options > Look)
          const LOOKS = [['classic', 'Classic']]; // 1.5.0 / 1.5.1 also had a 'vn' look (taken out in 1.5.2); a saved 'vn' counts as classic
          const lookNow = () => (LOOKS.some(l => l[0] === ui.look) ? ui.look : 'classic');
          function applyLook() { for (const [k] of LOOKS) rootEl.classList.toggle('adm-look-' + k, lookNow() === k); }
          // 1.5.1: your own picture behind the chat. It stays in this browser (made smaller, saved next to your own sounds).
          let bgUrl = '', bgCol = '', bgNote = '', bgInput = null;
          const bgDim = () => (ui.bgDim == null ? 0.45 : ui.bgDim);
          const BG_MODES = [['look', 'Default'], ['dark', 'Dark'], ['light', 'Light'], ['anilist', 'AniList'], ['pic', 'Picture']];
          const bgMode = () => (BG_MODES.some(m => m[0] === ui.bgMode) ? ui.bgMode : (ui.bg ? 'pic' : 'look'));
          function applyBg() {
            const mode = bgMode(), pic = mode === 'pic' && !!(ui.bg && bgUrl);
            rootEl.classList.toggle('adm-hasbg', pic || mode === 'dark' || mode === 'light' || mode === 'anilist');
            rootEl.classList.toggle('adm-bgpic', pic);
            for (const k of ['dark', 'light', 'anilist']) rootEl.classList.toggle('adm-bg-' + k, mode === k);
            rootEl.classList.toggle('adm-bgfill', pic && ui.bgFit === 'fill');
            if (mode === 'anilist') {
              // the site theme's own colours (read from the page itself)
              try {
                const cs = getComputedStyle(document.body);
                for (const [from, to] of [['--color-background', '--adm-site-bg'], ['--color-text', '--adm-site-text']]) {
                  const v = cs.getPropertyValue(from).trim();
                  if (v) rootEl.style.setProperty(to, v);
                }
              } catch (e) {}
            }
            if (pic) {
              rootEl.style.setProperty('--adm-bgimg', 'url("' + bgUrl + '")');
              rootEl.style.setProperty('--adm-dim', String(bgDim()));
              if (bgCol) rootEl.style.setProperty('--adm-bgcol', bgCol); else rootEl.style.removeProperty('--adm-bgcol');
            } else { rootEl.style.removeProperty('--adm-bgimg'); rootEl.style.removeProperty('--adm-bgcol'); }
          }
          // the colour of the picture's own edges (its left and right columns): it fills the space beside the whole picture,
          // so a picture on white gives a fully white background (worked out once per page load on a 48 px copy)
          async function edgeColour(blob) {
            try {
              const bmp = await createImageBitmap(blob);
              const c = document.createElement('canvas');
              const S = 160;
              c.width = S; c.height = S;
              const g = c.getContext('2d');
              g.imageSmoothingEnabled = false; // real pixels, not a blend with what is next to the edge
              g.drawImage(bmp, 0, 0, S, S);
              if (bmp.close) bmp.close();
              const d = g.getImageData(0, 0, S, S).data;
              // the MOST COMMON colour on the outer ring (a foot or a strand of hair touching the edge must not tint it)
              const groups = new Map();
              const take = (x, y) => {
                const i = (y * S + x) * 4, key = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3);
                const q = groups.get(key) || [0, 0, 0, 0];
                q[0] += d[i]; q[1] += d[i + 1]; q[2] += d[i + 2]; q[3]++;
                groups.set(key, q);
              };
              for (let k = 0; k < S; k++) { take(0, k); take(S - 1, k); take(k, 0); take(k, S - 1); }
              let best = null;
              for (const q of groups.values()) if (!best || q[3] > best[3]) best = q;
              bgCol = 'rgb(' + [0, 1, 2].map(k => Math.round(best[k] / best[3])).join(',') + ')';
            } catch (e) { bgCol = ''; }
          }
          async function loadBg() {
            if (!ui.bg) { applyBg(); return; }
            try {
              const r = await soundFiles('readonly', st => st.get('bg'));
              if (r && r.blob) { bgUrl = URL.createObjectURL(r.blob); await edgeColour(r.blob); }
            } catch (e) {}
            applyBg();
          }
          async function setBg(file) {
            try {
              const bmp = await createImageBitmap(file);
              const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
              const c = document.createElement('canvas');
              c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
              c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
              if (bmp.close) bmp.close();
              const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.88));
              if (!blob) throw new Error('no picture');
              await soundFiles('readwrite', st => st.put({ id: 'bg', blob }));
              if (bgUrl) URL.revokeObjectURL(bgUrl);
              bgUrl = URL.createObjectURL(blob);
              await edgeColour(blob);
              ui.bg = Date.now(); ui.bgMode = 'pic'; saveUi(); bgNote = '';
            } catch (e) {
              bgNote = 'That file is not a picture this browser can open.';
            }
            applyBg();
            if (ui.open && !T) renderList();
          }
          function removeBg() {
            ui.bg = 0; ui.bgMode = 'look'; saveUi(); bgNote = '';
            soundFiles('readwrite', st => st.delete('bg')).catch(() => {});
            if (bgUrl) URL.revokeObjectURL(bgUrl);
            bgUrl = bgCol = '';
            applyBg();
            if (ui.open && !T) renderList();
          }
          function chooseBg() {
            if (!bgInput) {
              bgInput = el('input', { class: 'adm-bgfile', type: 'file', accept: 'image/*', style: 'display:none',
                onchange: () => { const f = bgInput.files[0]; bgInput.value = ''; if (f) setBg(f); } });
              document.body.append(bgInput);
            }
            bgInput.click();
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
              checkUpdate();
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
            const top = (msgs || []).filter(m => m.uid && m.uid !== me && !isKeyMsg(m) && !isCopyMsg(m)).reduce((x, m) => Math.max(x, m.id), 0); // the hidden live key makes no sound
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
          // 1.4.3: the daily copy stays in the AniList chat, but in the plugin it is shown as the ordinary live bubbles it came from
          const COPY_RE = /^\s*(?:⚡|&#9889;)\uFE0F?\s*__Live chat__\s*\n+__[^\n]+?__ · /;
          const isCopyMsg = m => !!(m && typeof m.md === 'string' && COPY_RE.test(m.md));
          // copies made before 1.4.3 only hold the writer's clock ("7 Nov 21:18", "Nov 7 09:18 PM"), without a year
          function copyWhen(s, ref) {
            const x = s.replace(/[\u00A0\u202F]/g, ' ').match(/^(\d{1,2}\.?) ([^\d\s]+) (.+)$/) || s.replace(/[\u00A0\u202F]/g, ' ').match(/^([^\d\s]+) (\d{1,2}),? (.+)$/);
            if (!x) return 0;
            const y = new Date(ref * 1000).getFullYear();
            for (const year of [y, y - 1]) {
              const v = Date.parse(x[1] + ' ' + x[2] + ' ' + year + ' ' + x[3]);
              if (!isNaN(v) && v <= ref * 1000 + 864e5) return v;
            }
            return 0;
          }
          const copyMemo = new Map(); // reply id -> { md, list }
          function liveCopyMsgs(id, m) {
            const hit = copyMemo.get(m.id);
            if (hit && hit.md === m.md) return hit.list;
            let md = decEmoji(m.md).replace(/\r\n/g, '\n').replace(/^\s*(?:⚡|&#9889;)\uFE0F?\s*__Live chat__\s*/, '');
            let times = null;
            const tail = md.match(/\n+`dmst:([0-9a-z,]+)`\s*$/);
            if (tail) { times = tail[1].split(',').map(x => parseInt(x, 36)); md = md.slice(0, tail.index); }
            const heads = [...md.matchAll(/(?:^|\n\n)__([^\n]+?)__ · ([^\n]*)\n/g)];
            if (times && times.length !== heads.length) times = null;
            const i = info[id] || {};
            let known = true;
            const list = heads.map((h, n) => {
              const who = [i.from, i.to].find(x => x && x.name === h[1]) || (m.name === h[1] ? { id: m.uid, av: m.av } : null);
              if (!who) known = false;
              const tms = (times && times[n]) || copyWhen(h[2], m.t) || (m.t * 1000 - (heads.length - n));
              const x = md.slice(h.index + h[0].length, n + 1 < heads.length ? heads[n + 1].index : md.length).replace(/\s+$/, '');
              return liveMsg('c' + m.id + '_' + String(n).padStart(4, '0'), tms, { u: who ? who.id : 0, n: h[1], a: who ? who.av : '', x }, '', 'copy');
            });
            if (known) copyMemo.set(m.id, { md: m.md, list });
            return list;
          }
          function copyUnread(id, msgs, s) {
            const lseen = store.get('adm:lseen', {})[id] || 0;
            const live = new Set(liveMsgsOf(id).map(m => m.tms));
            return msgs.filter(m => m.id > s && isCopyMsg(m)).flatMap(m => liveCopyMsgs(id, m)).filter(b => b.uid !== me && b.tms > lseen && !live.has(b.tms)).length;
          }
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
            liveOwnGone.add(m.id);
            const r = await fbReq('/' + LP + '/' + k.room + '/m/' + m.id.slice(1), 'DELETE');
            if (!r.ok) throw new Error('live chat refused it (' + r.status + ')');
            liveStore(t.id, liveMsgsOf(t.id).filter(x => x.id !== m.id));
          }
          // the open chat listens to Firebase (a live stream, no checking every few seconds)
          const liveOwnGone = new Set(); // live ids we removed ourselves (nothing to look for in AniList)
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
              // a message that left Firebase may be in a new daily copy: load that first, so its bubble never blinks away
              if (liveMsgsOf(t.id).some(m => m.p === LP && !data[m.id.slice(1)] && !liveOwnGone.has(m.id) && Date.now() - m.tms > 15e3)) {
                try { await refreshOpen(t); } catch (e) {}
                if (my !== n || T !== t || t.es !== es) return;
              }
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
            return '⚡ __Live chat__\n\n' + msgs.map(m => '__' + m.name + '__ · ' + when(m.tms) + '\n' + m.md).join('\n\n') + '\n\n`dmst:' + msgs.map(m => m.tms.toString(36)).join(',') + '`';
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
            for (const m of part) liveOwnGone.add(m.id);
            if (T && T.id === id) { try { await refreshOpen(T, true); } catch (e) {} }
            const gone = { [LP]: {}, live: {} };
            for (const m of part) gone[m.p === 'live' ? 'live' : LP][m.id.slice(1)] = null;
            for (const path of [LP, 'live']) if (Object.keys(gone[path]).length) await fbReq('/' + path + '/' + k.room + '/m', 'PATCH', gone[path]);
            const ids = new Set(part.map(m => m.id));
            liveStore(id, liveMsgsOf(id).filter(m => !ids.has(m.id)));
            if (part.length === due.length) { store.del('adm:lcopy:' + id); store.del('adm:lcopyold:' + id); }
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
          // force = the "Check for updates" button (asks GitHub now). Returns true when GitHub answered.
          async function checkUpdate(force) {
            return false; // inside AniList App: no separate update check
            const u = store.get('adm:upd', null) || {};
            if (!force && u.at && Date.now() - u.at < 3600e3) { upd = u; showNewVer(); return true; }
            store.set('adm:upd', Object.assign(u, { at: Date.now() })); // the other tabs don't ask too
            try {
              const r = await fetch(REPO_RAW + 'version.json?t=' + Date.now(), { cache: 'no-store' });
              if (!r.ok) return false;
              const j = await r.json();
              upd = { at: Date.now(), v: String(j.version || ''), notes: String(j.notes || '') };
              store.set('adm:upd', upd);
              renderHead(); showNewVer();
              return true;
            } catch (e) { return false; }
          }
          const hasNewVer = () => false; // inside AniList App: updates come with the app
          // 1.5.2: a newer version also puts a small green arrow on the round chat button (seen without opening the chat)
          function showNewVer() { if (launch) { launch.classList.toggle('adm-newver', hasNewVer()); launch.title = hasNewVer() ? 'Messages - version ' + upd.v + ' is out (open the chat, press the green arrow)' : 'Messages'; } }
          const updLink = (cls, text) => el('a', { class: cls, href: REPO_RAW + 'anilist-dms.user.js', target: '_blank', rel: 'noopener',
            title: 'Opens the script: press Update in Tampermonkey, then reload AniList.' }, text);
          let updNote = '', updBusy = false;
          async function checkNow() {
            if (updBusy) return;
            updBusy = true; updNote = 'Checking…';
            if (ui.open && !T) renderList();
            const ok = await checkUpdate(true);
            updBusy = false;
            updNote = !ok ? 'Could not reach GitHub. Try again in a moment.' : hasNewVer() ? '' : 'You have the newest version.';
            if (ui.open && !T) renderList();
          }
          function updRow() {
            return el('div', { class: 'adm-size adm-looks adm-updrow' }, 'Version ' + VERSION + ' - part of AniList App (updates with the app)');
          }
          function updBtn() {
            return null; // inside AniList App
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
            const n = (cacheOf(id).msgs || []).filter(m => m.id > s && m.uid !== me && !isKeyMsg(m) && !isCopyMsg(m)).length + liveUnread(id) + copyUnread(id, cacheOf(id).msgs || [], s);
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
                updRow(),
                tick('enterSends', 'Enter sends (Shift+Enter = new line). Off: Ctrl+Enter sends'),
                tick('smartPaste', 'Pasting a GIF, picture, video or YouTube link adds it as a picture / player'),
                ui.pos || ui.w || ui.h ? el('button', { class: 'adm-btn', type: 'button', style: 'align-self:flex-start', onclick: () => {
                  delete ui.pos; delete ui.w; delete ui.h; ui.big = false; saveUi(); place(); listHead(); renderList();
                } }, 'Put the chat back in the corner (normal size)') : null,
                el('div', { class: 'adm-size' }, 'Text size',
                  ...[[1, 'Normal'], [1.15, 'Big'], [1.3, 'Bigger'], [1.5, 'Biggest']].map(([v, name]) =>
                    el('button', { class: 'adm-btn' + ((ui.textSize || 1) === v ? ' adm-pri' : ''), type: 'button', title: name, style: 'font-size:' + (12 * v) + 'px',
                      onclick: () => { ui.textSize = v; saveUi(); rootEl.style.setProperty('--adm-fs', v); renderList(); } }, 'A'))),
                el('div', { class: 'adm-size adm-looks adm-bgmodes' }, 'Background',
                  ...BG_MODES.filter(m => m[0] !== 'pic').map(([k, name]) => el('button', { class: 'adm-btn' + (bgMode() === k ? ' adm-pri' : ''), type: 'button',
                    title: { look: 'The normal background', dark: 'A plain dark background', light: 'A plain light background', anilist: "The background colour of AniList's own theme" }[k],
                    onclick: () => { ui.bgMode = k; saveUi(); applyBg(); renderList(); } }, name))),
                el('div', { class: 'adm-size adm-looks adm-bgopt', style: 'margin-left:22px' },
                  el('button', { class: 'adm-btn adm-bgpick' + (bgMode() === 'pic' ? ' adm-pri' : ''), type: 'button', title: 'A picture from this device behind the chat. It stays in this browser.',
                    onclick: () => { if (ui.bg && bgMode() !== 'pic') { ui.bgMode = 'pic'; saveUi(); applyBg(); renderList(); } else chooseBg(); } },
                    ui.bg ? (bgMode() === 'pic' ? 'Change picture' : 'Your picture') : 'Your own picture'),
                  ui.bg ? el('button', { class: 'adm-btn adm-bgrem', type: 'button', title: 'Take your picture out of this browser', onclick: removeBg }, 'Remove') : null),
                ui.bg && bgMode() === 'pic' ? el('div', { class: 'adm-size adm-looks adm-bgfit', style: 'margin-left:22px' },
                  ...[['fit', 'Whole picture'], ['fill', 'Fill the chat']].map(([k, name]) => el('button', { class: 'adm-btn' + ((ui.bgFit || 'fit') === k ? ' adm-pri' : ''), type: 'button',
                    title: k === 'fit' ? 'The whole picture is shown, nothing cut off' : 'The picture fills the chat, its edges may be cut off',
                    onclick: () => { ui.bgFit = k; saveUi(); applyBg(); renderList(); } }, name))) : null,
                ui.bg && bgMode() === 'pic' ? el('div', { class: 'adm-vol adm-bgdim' }, 'Darken',
                  el('input', { type: 'range', min: '0', max: '85', step: '1', value: String(Math.round(bgDim() * 100)), title: 'How dark the picture is behind the messages',
                    oninput: e => { ui.bgDim = +e.target.value / 100; saveUi(); applyBg(); } })) : null,
                bgNote ? el('div', { class: 'adm-note adm-bad' }, bgNote) : null,
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
            const pins = pinsNow();
            const order = threads.slice().sort((a, b) => (pins.includes(b) - pins.includes(a)) || (((info[b] || {}).lastT || 0) - ((info[a] || {}).lastT || 0)));
            if (!order.length && !listState.adding) list.append(el('div', { class: 'adm-empty' }, 'No conversations yet.', el('br'),
              el('button', { class: 'adm-btn adm-pri', type: 'button', style: 'margin-top:10px', onclick: () => { listState.adding = true; renderList(); } }, '+ Add a conversation')));
            for (const id of order) {
              const i = info[id] || {};
              const o = otherOf(i) || { name: 'Loading…', av: '' };
              const n = unreadOf(id);
              const pinned = pins.includes(id);
              const row = el('div', { class: 'adm-row' + (n ? ' adm-unread' : '') + (pinned ? ' adm-pinned' : ''), title: 'Open the conversation with ' + o.name, onclick: e => {
                if (e.target.closest('.adm-x, .adm-ask, .adm-pinb')) return;
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
                    el('div', { class: 'adm-rt' }, pinned ? el('span', { class: 'adm-pinmark', title: 'Pinned to the top' }, '📌') : null,
                      el('span', { class: 'adm-rn' }, o.name), el('span', { class: 'adm-rtime' }, i.lastT ? ago(i.lastT) : '')),
                    el('div', { class: 'adm-rs' }, i.snip ? (mine ? 'You: ' : '') + i.snip : (i.error || ''))),
                  n ? el('span', { class: 'adm-dot' }, n > 99 ? '99+' : n) : null,
                  el('button', { class: 'adm-pinb', type: 'button', title: pinned ? 'Unpin' : 'Pin to the top of the list', onclick: () => togglePin(id) }, pinned ? 'Unpin' : '📌'),
                  el('button', { class: 'adm-x', type: 'button', title: 'Remove from this panel', onclick: () => { listState.removing = id; renderList(); } }, '×')].filter(Boolean));
              }
              list.append(row);
            }
            bodyEl.append(list);
          }
          // 1.5: pinned conversations stay at the top of the list
          const pinsNow = () => store.get('adm:pins', []);
          function togglePin(id) {
            const p = pinsNow();
            store.set('adm:pins', p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
            renderList();
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
            store.set('adm:pins', pinsNow().filter(x => x !== id));
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
            let last = keep.filter(m => !isKeyMsg(m)).pop();
            if (isCopyMsg(last)) last = Object.assign({}, last, liveCopyMsgs(id, last).slice(-1)[0]);
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
              hb('🔍', 'Search this conversation (Ctrl+F)', () => toggleFind(T), { style: 'font-size:13px' }),
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
                            busy: false, again: false, olderBusy: false, error: '', stick: true, newCount: 0, popT: 0, popSeen: new Set() };
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
            const jump = el('button', { class: 'adm-jump', type: 'button', hidden: true, title: 'Jump to the newest message', onclick: () => { t.stick = true; stickBottom(t, true); } }, '↓');
            t.jump = jump;
            const find = buildFind(t);

            // the box you type in, with AniList's toolbar (class markdown-editor, so the GIF Picker adds its GIF button too)
            const ta = el('textarea', { class: 'adm-ta', rows: 1, placeholder: 'Message ' + ((otherOf(info[t.id]) || {}).name || '') + '…' });
            ta.value = store.get('adm:draft:' + t.id, '');
            const preview = el('div', { class: 'adm-preview', hidden: true });
            const hint = el('span', { class: 'adm-hint' }, ui.enterSends ? 'Enter sends · Shift+Enter new line' : 'Ctrl+Enter sends');
            const send = el('button', { class: 'adm-btn adm-pri adm-sendbtn', type: 'button', onclick: () => sendMsg(t) }, 'Send');
            const emoji = buildEmoji(t);
            Object.assign(t, { scroll, olderBar, msgsEl, status, pill, ta, preview, hint, sendBtn: send, emoji });
            const tools = buildTools(t);
            const compose = el('div', { class: 'adm-compose' }, emoji, tools, ta, preview, el('div', { class: 'adm-send-row' }, hint, send));
            t.box = el('div', { class: 'adm-convo' }, find, el('div', { class: 'adm-sw' }, scroll, pill, jump), compose);
            t.box.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFind(t, true); } });
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
              jump.hidden = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 180;
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

          // ---- 1.5: search in the open conversation (the messages loaded so far; "Older" loads more) ----
          const findText = m => decEmoji(m.md != null ? String(m.md) : String(m.html || '').replace(/<[^>]+>/g, ' '))
            .replace(/(?:img\d*%?|webm|youtube)\s*\([^)]*\)/gi, ' ').toLowerCase();
          function buildFind(t) {
            const input = el('input', { type: 'text', placeholder: 'Search this conversation…' });
            const n = el('span', { class: 'adm-find-n' });
            const more = el('button', { class: 'adm-btn', type: 'button', hidden: true, title: 'Load older messages and search them too', onclick: async () => {
              more.disabled = true; more.textContent = 'Loading…';
              const had = t.find.hits.length;
              await findOlder(t);
              if (T !== t) return;
              more.disabled = false; more.textContent = 'Older';
              runFind(t, false);
              const f = t.find;
              if (f.hits.length > had) { f.at = f.hits.length - had - 1; showFind(t, true); } // on to the newest of the matches just found
              f.input.focus();
            } }, 'Older');
            const box = el('div', { class: 'adm-find', hidden: true }, input, n,
              el('button', { class: 'adm-btn', type: 'button', title: 'Older match (Enter)', onclick: () => findStep(t, -1) }, '↑'),
              el('button', { class: 'adm-btn', type: 'button', title: 'Newer match (Shift+Enter)', onclick: () => findStep(t, 1) }, '↓'),
              more,
              el('button', { class: 'adm-btn', type: 'button', title: 'Close the search (Esc)', onclick: () => toggleFind(t, false) }, '×'));
            let timer = 0;
            input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => runFind(t, true), 150); });
            input.addEventListener('keydown', e => {
              if (e.key === 'Enter') { e.preventDefault(); findStep(t, e.shiftKey ? 1 : -1); }
            });
            box.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); toggleFind(t, false); } });
            t.find = { box, input, n, more, hits: [], at: -1, q: '' };
            return box;
          }
          // two more pages of older messages for the search (they stay folded away under "Show older" until a match is opened)
          async function findOlder(t) {
            if (!t.fresh || t.minPage <= 1 || t.olderBusy) return;
            t.olderBusy = true;
            try {
              const b = t.minPage - 1, a = Math.max(1, b - 1), id = t.id;
              const d = await gql(`query{a:Page(page:${a},perPage:${PER}){activityReplies(activityId:${id}){${F}}} b:Page(page:${b},perPage:${PER}){activityReplies(activityId:${id}){${F}}}}`);
              if (T !== t) return;
              const got = [...d.a.activityReplies, ...(a !== b ? d.b.activityReplies : [])].filter(Boolean).map(slim).filter(m => !t.byId.has(m.id));
              setMsgs(t, [...got, ...t.msgs]);
              t.minPage = a;
            } catch (e) {
              if (T === t) t.find.n.textContent = 'could not load';
            } finally {
              t.olderBusy = false;
            }
          }
          function toggleFind(t, on) {
            const f = t && t.find;
            if (!f) return;
            on = on == null ? f.box.hidden : on;
            f.box.hidden = !on;
            if (on) { f.input.focus(); f.input.select(); runFind(t, true); }
            else { f.input.value = ''; runFind(t, false); if (!touch) t.ta.focus({ preventScroll: true }); }
          }
          function runFind(t, jumpTo) {
            const f = t.find;
            if (!f) return;
            const q = f.box.hidden ? '' : f.input.value.trim().toLowerCase();
            const cur = f.hits[f.at];
            f.q = q;
            const pool = [...t.msgs.filter(m => !isKeyMsg(m) && !isCopyMsg(m)), ...liveMsgsOf(t.id)].sort(byTime);
            f.hits = q ? pool.filter(m => findText(m).includes(q)).map(m => m.id) : [];
            f.at = f.hits.length ? (!jumpTo && f.hits.includes(cur) ? f.hits.indexOf(cur) : f.hits.length - 1) : -1;
            showFind(t, jumpTo);
          }
          function findStep(t, d) {
            const f = t.find;
            if (!f.hits.length) return;
            f.at = (f.at + d + f.hits.length) % f.hits.length;
            showFind(t, true);
          }
          function showFind(t, scrollTo) {
            const f = t.find;
            f.n.textContent = f.q ? (f.hits.length ? (f.at + 1) + ' / ' + f.hits.length : 'none') : '';
            f.more.hidden = !(f.q && t.fresh && t.minPage > 1);
            const id = f.hits[f.at];
            if (id != null && scrollTo) {
              const idx = t.msgs.findIndex(m => m.id === id);
              if (idx >= 0 && t.msgs.length - idx > t.shown) { t.shown = t.msgs.length - idx; t.stick = false; render(t); } // a match further back: show up to it
            }
            markFind(t, scrollTo);
          }
          function unmark(root) {
            root.querySelectorAll('mark.adm-mark').forEach(k => { const p = k.parentNode; k.replaceWith(document.createTextNode(k.textContent)); p.normalize(); });
          }
          function markText(root, q) {
            const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (w.nextNode()) nodes.push(w.currentNode);
            for (const node of nodes) {
              let n = node, i;
              while (n && (i = n.data.toLowerCase().indexOf(q)) >= 0) {
                const hit = n.splitText(i);
                n = hit.data.length > q.length ? hit.splitText(q.length) : null;
                const k = document.createElement('mark');
                k.className = 'adm-mark';
                hit.replaceWith(k); k.append(hit);
              }
            }
          }
          function markFind(t, scrollTo) {
            const f = t.find;
            if (!f) return;
            const set = new Set(f.hits), cur = f.hits[f.at];
            for (const [id, row] of t.els) {
              const hit = !!f.q && set.has(id);
              row.classList.toggle('adm-hit-cur', hit && id === cur);
              const key = hit ? f.q + '\u0001' + row._key : '';
              if ((row._markKey || '') === key || row._editing) continue;
              row._markKey = key;
              const text = row.querySelector('.adm-text');
              unmark(text);
              if (hit) markText(text, f.q);
            }
            const row = scrollTo && cur != null ? t.els.get(cur) : null;
            if (row) {
              t.stick = false;
              requestAnimationFrame(() => {
                if (T !== t) return;
                const r = row.getBoundingClientRect(), s = t.scroll.getBoundingClientRect();
                t.scroll.scrollBy({ top: r.top - s.top - (s.height - r.height) / 2, behavior: 'smooth' });
              });
            }
          }

          function grow(t) {
            const ta = t.ta;
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight + 2, window.innerHeight * 0.38) + 'px';
          }
          function stickBottom(t, smooth) {
            requestAnimationFrame(() => { if (T === t) t.scroll.scrollTo({ top: t.scroll.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); });
            if (t.jump && !smooth) t.jump.hidden = true;
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
            if (m.live) tm.title = (m.p === 'copy' ? 'Live message (saved in the AniList chat) · ' : 'Live message (copied into the AniList chat once a day) · ') + new Date(m.t * 1000).toLocaleString();
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
            const liveAt = new Set(live.map(m => m.tms));
            const copied = vis.filter(isCopyMsg).flatMap(m => liveCopyMsgs(t.id, m)).filter(m => !liveAt.has(m.tms));
            const keep = new Set([...vis.map(m => m.id), ...live.map(m => m.id), ...copied.map(m => m.id)]);
            for (const [id, row] of t.els) if (id !== 'o' && !keep.has(id)) { dropVms(row); row.remove(); t.els.delete(id); }
            // the first message of the conversation, once you have scrolled back to the very start
            const i = info[t.id] || {};
            const atStart = t.fresh && t.minPage <= 1 && vis.length >= all.length && all.length >= t.count;
            const list = [];
            if (atStart && i.origin) list.push(i.origin);
            list.push(...vis.filter(m => !isKeyMsg(m) && !isCopyMsg(m)), ...live, ...copied);
            list.sort(byTime);
            const frag = [];
            let prev = null, prevDay = '';
            for (const m of list) {
              const day = dayLabel(m.t);
              if (day !== prevDay) { frag.push(el('div', { class: 'adm-day' }, day)); prevDay = day; prev = null; }
              const id = m.origin ? 'o' : m.id;
              let row = t.els.get(id);
              if (!row) {
                row = msgEl(t, m); t.els.set(id, row);
                // 1.5: a message newer than everything shown before pops in (not what opening / "Show older" brings)
                if (t.popT && !m.origin && m.t >= t.popT && !t.popSeen.has(id)) {
                  const r = row;
                  r.classList.add('adm-pop');
                  r.addEventListener('animationend', e => { if (e.animationName === 'adm-pop') r.classList.remove('adm-pop'); });
                }
              } else updateEl(t, row, m);
              t.popSeen.add(id);
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
            const lastT = list.length ? list[list.length - 1].t : 0;
            if (lastT || t.fresh) t.popT = Math.max(t.popT || 0, lastT, 1);
            if (t.find) { if (t.find.q) runFind(t, false); else markFind(t); }
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
                const theirs = added.filter(m => m.uid !== me && !isCopyMsg(m)).length;
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
            if (String(row.dataset.id).startsWith('L')) { const lm = liveMsgsOf(t.id).concat(t.msgs.filter(isCopyMsg).flatMap(x => liveCopyMsgs(t.id, x))).find(x => x.id === row.dataset.id); if (!lm) return; if (act.dataset.act === 'quote') quoteMsg(t, lm); else if (act.dataset.act === 'edit') startEdit(t, lm, row); else if (act.dataset.act === 'del') askDelete(t, lm, row); return; }
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
            setInterval(() => checkUpdate(), 20 * 60e3); // itself at most once an hour, shared by every tab
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

      },
      // ======== previews (AniList Like Previews 1.5.0, from github.com/YoruCAnime/Anilist) ========
      previews: function () {
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

      },
      // ======== chat (AniList Chat View (mobile) 2.9, from github.com/YoruCAnime/Anilist) ========
      chat: function () {
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

          const VERSION = '2.9';
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
            setTimeout(() => { if (box.isConnected) warmPics(box); }, 50);
          }

          // ---- pictures: fetch spoiler pictures early, ask again for broken ones --------
          // AniList keeps a spoiler's content in data-content until you open it, so its pictures only
          // start downloading on the tap. Image hosts like imgbb can take ~30 s for a picture nobody
          // opened lately (and then often answer 503). So the shown messages' spoiler pictures are fetched
          // in the background (the tap then shows them from the browser cache), and a picture that
          // fails is asked for again a few times.
          const warmed = new Set();
          function picsIn(root, out) {
            root.querySelectorAll('img[src]').forEach(i => out.push(i.getAttribute('src')));
            root.querySelectorAll('[data-content]').forEach(n => {
              picsIn(new DOMParser().parseFromString(n.getAttribute('data-content') || '', 'text/html'), out);
            });
            return out;
          }
          function warmPics(box) {
            for (const src of picsIn(box, [])) if (!warmed.has(src)) warm(src, 0);
          }
          function warm(src, tries) {
            if (!/^https?:\/\//i.test(src)) return;
            warmed.add(src);
            const im = new Image();
            im.decoding = 'async';
            im.onerror = () => { if (tries < 2) setTimeout(() => warm(src, tries + 1), 3000 * (tries + 1)); };
            im.src = src;
          }
          const RETRY_MS = [1500, 4000, 9000];
          document.addEventListener('error', e => {
            const i = e.target;
            if (!i || i.tagName !== 'IMG' || !i.closest('.acv-list, .acv-thread')) return; // tagName: works in Firefox's sandbox too
            const n = +(i.dataset.acvRetry || 0);
            if (n >= RETRY_MS.length) return;
            i.dataset.acvRetry = n + 1;
            const src = i.getAttribute('src');
            setTimeout(() => { if (i.isConnected && src) { i.removeAttribute('src'); i.setAttribute('src', src); } }, RETRY_MS[n]);
          }, true);

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

      },
    };

    // ---------------------------------------------------------------- settings
    const LS = {
      get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    };
    const DEF = { mode: 'auto', start: 'home', theme: 'dark', accent: '', haptics: true, dbl: true, feed: 'following', filter: 'all',
      alerts: 'all', wtype: 'ANIME', stype: 'ANIME', mods: { dms: true, gif: true, previews: true, chat: true } };
    const cfg = Object.assign({}, DEF, LS.get('alapp:cfg', {}));
    cfg.mods = Object.assign({}, DEF.mods, cfg.mods || {});
    const saveCfg = () => LS.set('alapp:cfg', cfg);

    // ---------------------------------------------------------------- the tools that come with the app (DMs, Like Previews, Chat View)
    // Each one starts unless it is switched off, or the separate userscript of the same tool already runs on this page
    // (its style is already there): then the separate one is left alone and the app's copy stays off.
    const SIG = { dms: '.adm-launch', previews: '.alp-tabs', chat: '.acv-msg' };
    const hasStyle = sig => { for (const s of document.querySelectorAll('style')) if (s.textContent.indexOf(sig) >= 0) return true; return false; };
    function runMod(k) {
      if (!MODS[k] || !cfg.mods[k]) return;
      if (hasStyle(SIG[k])) { document.documentElement.setAttribute('data-ala-' + k, 'separate'); return; }
      try { MODS[k](); document.documentElement.setAttribute('data-ala-' + k, 'app'); } catch (e) { console.warn('[AniList App] ' + k, e); }
    }
    const onReady = fn => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn());
    const onLoad = fn => (document.readyState === 'complete' ? fn() : window.addEventListener('load', fn, { once: true }));
    onReady(() => runMod('chat'));
    onLoad(() => setTimeout(() => { runMod('dms'); runMod('previews'); }, 1200));

    // ---------------------------------------------------------------- small helpers
    function h(tag, attrs, ...kids) {
      const n = document.createElement(tag);
      if (attrs) for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'style') n.style.cssText = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
      for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
      return n;
    }
    const P = {
      home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
      tv: 'M4 7h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm4-4 4 4 4-4M10 10.5v5l4-2.5z',
      search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 21 21',
      bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
      heart: 'M12 20.5s-7.5-4.6-9.2-9.3C1.7 8 3.6 4.5 7.1 4.5c2 0 3.6 1.2 4.9 3 1.3-1.8 2.9-3 4.9-3 3.5 0 5.4 3.5 4.3 6.7-1.7 4.7-9.2 9.3-9.2 9.3z',
      chat: 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z',
      plus: 'M12 5v14M5 12h14', back: 'M15 5l-7 7 7 7', more: 'M5 12h.01M12 12h.01M19 12h.01', check: 'M5 12.5l4.5 4.5L19 7',
      refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7', pen: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', gear: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.6a7 7 0 0 1-1.7 1L15 20.5h-4l-.4-2a7 7 0 0 1-1.7-1l-1.9.6-2-3.4 1.6-1.2a7 7 0 0 1 0-3L5 9.3l2-3.4 1.9.6a7 7 0 0 1 1.7-1l.4-2h4l.4 2a7 7 0 0 1 1.7 1l1.9-.6 2 3.4-1.6 1.2a7 7 0 0 1 0 3z',
      out: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5', link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
      trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5',
      star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z', users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
      forum: 'M4 4h12v9H8l-4 3zM9 16v2h7l4 3V9h-3', user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM3.5 21a8.5 8.5 0 0 1 17 0', play: 'M7 4.5v15l12-7.5z',
      film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4', at: 'M16 12a4 4 0 1 1-1.2-2.8M16 8v5a2.5 2.5 0 0 0 5 0v-1a9 9 0 1 0-3.5 7.1',
      bookmark: 'M6 3h12v18l-6-4-6 4z', close: 'M6 6l12 12M18 6 6 18', heartf: '',
    };
    function ic(name, fill) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24');
      s.setAttribute('fill', fill ? 'currentColor' : 'none');
      s.setAttribute('stroke', 'currentColor');
      s.setAttribute('stroke-width', fill ? '1.2' : '2.1');
      s.setAttribute('stroke-linecap', 'round');
      s.setAttribute('stroke-linejoin', 'round');
      s.setAttribute('aria-hidden', 'true');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', P[name] || P.more);
      s.appendChild(p);
      return s;
    }
    const bg = url => (url ? 'background-image:url("' + String(url).replace(/["\\]/g, encodeURIComponent) + '")' : '');
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const now = () => Math.floor(Date.now() / 1000);
    function ago(sec) {
      const d = now() - sec;
      if (d < 45) return 'now';
      if (d < 3600) return Math.max(1, Math.round(d / 60)) + 'm';
      if (d < 86400) return Math.round(d / 3600) + 'h';
      if (d < 7 * 86400) return Math.round(d / 86400) + 'd';
      return new Date(sec * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d > 300 * 86400 ? 'numeric' : undefined });
    }
    function left(sec) {
      const d = Math.max(0, sec - now());
      if (d < 60) return 'now';
      const dd = Math.floor(d / 86400), hh = Math.floor((d % 86400) / 3600), mm = Math.floor((d % 3600) / 60);
      return dd ? dd + 'd ' + hh + 'h' : hh ? hh + 'h ' + mm + 'm' : mm + 'm';
    }
    const num = n => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n || 0));
    const buzz = () => { if (cfg.haptics && navigator.vibrate) try { navigator.vibrate(9); } catch (e) {} };
    // emojis are sent as &#N; (the way AniList stores them; the raw 4-byte ones can break on its side)
    const encEmoji = s => s.replace(/[\u{10000}-\u{10FFFF}]/gu, c => '&#' + c.codePointAt(0) + ';');
    const COLORS = { blue: '#3db4f2', purple: '#c063ff', pink: '#fc9dd6', orange: '#ef881a', red: '#e13333', green: '#4cca51', gray: '#677b94' };
    const hexRgb = hx => { const m = /^#?([0-9a-f]{6})$/i.exec(hx || ''); if (!m) return null; const v = parseInt(m[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
    const ST = { CURRENT: ['Watching', 'Reading', '#3db4f2'], PLANNING: ['Planning', 'Planning', '#9b7bff'], COMPLETED: ['Completed', 'Completed', '#4cca51'],
      PAUSED: ['Paused', 'Paused', '#f5a524'], DROPPED: ['Dropped', 'Dropped', '#e85d75'], REPEATING: ['Rewatching', 'Rereading', '#26c6da'] };
    const stName = (s, type) => (ST[s] ? ST[s][type === 'MANGA' ? 1 : 0] : s);

    // ---------------------------------------------------------------- AniList (the site's own endpoint and login)
    function token() {
      if (window.al_token) return window.al_token;
      for (const s of document.scripts) { const m = !s.src && s.textContent.match(/al_token\s*=\s*"([^"]+)"/); if (m) return m[1]; }
      return '';
    }
    let pauseUntil = 0;
    async function gql(query, variables) {
      if (Date.now() < pauseUntil) throw new Error('AniList asked to slow down for a minute');
      let r;
      try {
        r = await fetch('/graphql', { method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-csrf-token': token() },
          body: JSON.stringify({ query, variables: variables || {} }) });
      } catch (e) { throw new Error('No connection'); }
      if (r.status === 429) { pauseUntil = Date.now() + 1000 * (+r.headers.get('Retry-After') || 60); throw new Error('AniList asked to slow down for a minute'); }
      let j;
      try { j = await r.json(); } catch (e) { throw new Error('AniList answered ' + r.status); }
      if (j.errors && j.errors.length && (!j.data || !Object.values(j.data).some(v => v != null))) {
        const e0 = j.errors[0];
        let m = e0.message || 'AniList error';
        if (m === 'validation' && e0.validation) m = Object.values(e0.validation).flat().join(' ') || m;
        throw Object.assign(new Error(/unauthori[sz]ed|invalid token/i.test(m) ? 'Sign in to AniList first' : m), { auth: /unauthori[sz]ed|invalid token/i.test(m) });
      }
      return j.data || {};
    }
    const U = 'id name avatar{medium} isFollowing';
    const MF = 'id type title{userPreferred} coverImage{medium large color} format episodes chapters status averageScore seasonYear nextAiringEpisode{episode airingAt} mediaListEntry{id status progress}';

    let me = LS.get('alapp:me', null); // {id, name, av, banner, color, unread}
    const signedIn = () => !!(me && me.id);
    const likelySignedIn = () => signedIn() || !!localStorage.getItem('auth');
    async function loadMe() {
      try {
        const d = await gql('query AlaViewer{Viewer{id name avatar{medium large} bannerImage unreadNotificationCount options{profileColor}}}');
        const v = d.Viewer;
        if (!v) throw new Error('none');
        me = { id: v.id, name: v.name, av: (v.avatar && (v.avatar.large || v.avatar.medium)) || '', banner: v.bannerImage || '', color: v.options && v.options.profileColor || '' };
        LS.set('alapp:me', me);
        setUnread(v.unreadNotificationCount || 0, true);
      } catch (e) {
        if (e.auth) { me = null; LS.set('alapp:me', null); }
      }
      paintMe();
    }

    // ---------------------------------------------------------------- posts as HTML (from AniList, cleaned before they are shown)
    const OK_TAGS = new Set('P BR B STRONG I EM U DEL S STRIKE A IMG VIDEO SOURCE SPAN DIV CENTER H1 H2 H3 H4 H5 BLOCKQUOTE CODE PRE UL OL LI HR SUB SUP SMALL'.split(' '));
    const DROP_TAGS = new Set('SCRIPT STYLE IFRAME OBJECT EMBED FORM INPUT BUTTON TEXTAREA SELECT LINK META BASE SVG MATH TEMPLATE NOSCRIPT'.split(' '));
    const ytId = u => { const m = /(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/.exec(u || ''); return m ? m[1] : (/^[\w-]{11}$/.test(u || '') ? u : ''); };
    function inPath(href) {
      try { const u = new URL(href, location.origin); if (u.origin === location.origin) return u.pathname + u.search + u.hash; } catch (e) {}
      return '';
    }
    function cleanHtml(html) {
      const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
      const root = doc.body.firstElementChild || doc.createElement('div');
      for (const n of [...root.querySelectorAll('*')]) {
        if (!n.isConnected && !root.contains(n)) continue;
        const tag = n.tagName;
        if (DROP_TAGS.has(tag)) { n.remove(); continue; }
        if (n.classList.contains('youtube')) {
          const id = ytId(n.id || n.getAttribute('data-id') || '');
          if (!id) { n.remove(); continue; }
          const a = doc.createElement('a');
          a.className = 'ala-yt'; a.href = 'https://youtu.be/' + id; a.target = '_blank'; a.rel = 'noopener nofollow';
          a.setAttribute('style', 'background-image:url("https://i.ytimg.com/vi/' + id + '/hqdefault.jpg")');
          n.replaceWith(a); continue;
        }
        if (!OK_TAGS.has(tag)) { n.replaceWith(...n.childNodes); continue; }
        const spoiler = n.classList.contains('markdown_spoiler') || n.classList.contains('markdown-spoiler');
        const center = tag === 'CENTER' || n.getAttribute('align') === 'center';
        for (const at of [...n.attributes]) {
          const k = at.name.toLowerCase(), v = at.value;
          if (k === 'href' && tag === 'A' && /^(https?:|\/)/i.test(v)) continue;
          if (k === 'src' && /^https:\/\//i.test(v) && (tag === 'IMG' || tag === 'VIDEO' || tag === 'SOURCE')) continue;
          if ((k === 'width' || k === 'height') && /^\d+%?$/.test(v)) continue;
          if (k === 'alt' || k === 'title') continue;
          if (k === 'data-content' && spoiler) continue;
          n.removeAttribute(at.name);
        }
        if (spoiler) {
          n.className = 'ala-spoiler';
          // AniList's newer formatter keeps the hidden part in data-content until it is opened
          const dc = n.getAttribute('data-content');
          if (dc && !n.textContent.trim()) { n.removeAttribute('data-content'); n.append(cleanHtml(dc)); }
        }
        if (center) n.classList.add('center');
        if (tag === 'A') {
          const p = inPath(n.getAttribute('href') || '');
          if (p) { n.setAttribute('data-go', p); } else { n.target = '_blank'; n.rel = 'noopener nofollow'; }
        } else if (tag === 'IMG') { n.loading = 'lazy'; n.decoding = 'async'; }
        else if (tag === 'VIDEO') { n.muted = true; n.loop = true; n.setAttribute('playsinline', ''); n.setAttribute('preload', 'none'); n.setAttribute('data-auto', ''); n.controls = true; }
      }
      return root;
    }
    // videos in posts play while they are on screen and stop when they leave (one watcher for all of them)
    const vidObs = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
      for (const e of es) { const v = e.target; if (e.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else if (!v.paused) v.pause(); }
    }, { threshold: 0.5 }) : null;
    // long posts are cut at ~440px with "Show more" (one watcher measures them all)
    const sizeObs = 'ResizeObserver' in window ? new ResizeObserver(es => {
      for (const e of es) { const box = e.target.parentElement; if (box) box.classList.toggle('over', e.target.offsetHeight > 450); }
    }) : null;
    function mdBox(html) {
      const inner = cleanHtml(html);
      inner.className = 'ala-md';
      const box = h('div', { class: 'ala-text' }, inner);
      if (sizeObs) sizeObs.observe(inner);
      for (const v of inner.querySelectorAll('video')) { v.muted = true; if (vidObs) vidObs.observe(v); }
      return [box, h('button', { class: 'ala-readmore', 'data-a': 'more' }, 'Show more')];
    }

    // ---------------------------------------------------------------- shell: bottom bar, screens, sheets, toasts
    let root, screensEl, barEl, sheetsEl, toastsEl, fabEl;
    const TABS = [['home', 'Home', 'home'], ['watch', 'Watching', 'tv'], ['search', 'Search', 'search'], ['alerts', 'Alerts', 'bell'], ['me', 'Me', 'user']];
    const S = { open: false, tab: null, screens: {}, layers: [], built: false };

    function appWanted() {
      if (cfg.mode === 'on') return true;
      if (cfg.mode === 'off') return false;
      return matchMedia('(max-width: 820px)').matches || (matchMedia('(pointer: coarse)').matches && !matchMedia('(hover: hover)').matches);
    }
    function applyTheme() {
      if (!root) return;
      let light = cfg.theme === 'light';
      if (cfg.theme === 'site') light = !(document.body && /site-theme-dark|site-theme-contrast/.test(document.body.className)) && !(LS.get('site-theme', '') === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) && LS.get('site-theme', '') !== 'dark';
      root.classList.toggle('ala-light', light);
      const hex = cfg.accent || COLORS[me && me.color] || (/^#/.test(me && me.color || '') ? me.color : '') || '#3db4f2';
      const rgb = hexRgb(hex) || [61, 180, 242];
      root.style.setProperty('--a-acc', hex);
      root.style.setProperty('--a-acc-rgb', rgb.join(','));
    }

    function build() {
      if (S.built) return;
      S.built = true;
      document.head.appendChild(h('style', { id: 'ala-css' }, CSS));
      root = h('div', { id: 'ala' });
      screensEl = h('div', { class: 'ala-screens', hidden: true });
      barEl = h('nav', { class: 'ala-bar' });
      for (const [k, label, icon] of TABS) {
        const b = h('button', { class: 'ala-tab', 'data-tab': k, 'aria-label': label },
          k === 'me' ? h('i', { class: 'ala-av' }) : ic(icon), h('span', {}, label), k === 'alerts' ? h('b', { class: 'ala-badge', hidden: true }) : null);
        b.addEventListener('click', () => tabTap(k));
        barEl.appendChild(b);
      }
      sheetsEl = h('div', { class: 'ala-sheets', hidden: true });
      toastsEl = h('div', { class: 'ala-toasts' });
      root.append(screensEl, barEl, sheetsEl, toastsEl);
      document.body.appendChild(root);
      root.addEventListener('click', onClick);
      root.addEventListener('pointerup', onTapUp, true);
      applyTheme();
      paintMe();
      setUnread(LS.get('alapp:unread', {}).n || 0);
    }
    function setMode() {
      const on = appWanted();
      document.documentElement.classList.toggle('ala-on', on);
      if (!on) { if (S.built) { closeScreens(); root.hidden = true; } return; }
      build();
      root.hidden = false;
      onRoute();
    }
    function paintMe() {
      if (!barEl) return;
      const av = barEl.querySelector('.ala-av');
      if (av) av.setAttribute('style', bg(me && me.av));
      applyTheme();
    }
    let unread = 0;
    function setUnread(n, write) {
      unread = n || 0;
      if (write) LS.set('alapp:unread', { at: Date.now(), n: unread });
      const b = barEl && barEl.querySelector('.ala-badge');
      if (b) { b.hidden = !unread; b.textContent = unread > 99 ? '99+' : String(unread); }
    }
    async function pollUnread() {
      if (!signedIn() || document.hidden) return;
      const c = LS.get('alapp:unread', {});
      if (c.at && Date.now() - c.at < 55e3) { setUnread(c.n); return; } // another AniList tab asked a moment ago
      LS.set('alapp:unread', { at: Date.now(), n: c.n || 0 });
      try { const d = await gql('query AlaUnread{Viewer{unreadNotificationCount}}'); setUnread(d.Viewer ? d.Viewer.unreadNotificationCount : 0, true); } catch (e) {}
    }
    window.addEventListener('storage', e => { if (e.key === 'alapp:unread') setUnread((LS.get('alapp:unread', {}) || {}).n || 0); });

    function toast(msg, action, fn, ms) {
      if (!toastsEl) return;
      const t = h('div', { class: 'ala-toast' }, h('span', {}, msg));
      if (action) t.appendChild(h('button', { onclick: () => { t.remove(); fn(); } }, action));
      toastsEl.appendChild(t);
      while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
      setTimeout(() => t.remove(), ms || (action ? 6000 : 2600));
    }

    // ---- history: the phone's Back button closes sheets, then profile pages, then the app screens ----
    const st = extra => Object.assign({}, history.state || {}, extra);
    let afterPop = null;
    function tabTap(k) {
      buzz();
      if (S.open && S.tab === k && !S.layers.length) { const sc = S.screens[k] && S.screens[k].scroll; if (sc) { if (sc.scrollTop > 10) sc.scrollTo({ top: 0, behavior: 'smooth' }); else if (S.screens[k].refresh) S.screens[k].refresh(); } return; }
      showTab(k, { push: !S.open });
    }
    function showTab(k, o) {
      o = o || {};
      if (sheetOpen()) closeSheet(true);
      if (!o.fromPop) {
        if (o.push) history.pushState(st({ ala: k, alaL: 0, alaSheet: null }), '');
        else history.replaceState(st({ ala: k, alaL: 0, alaSheet: null }), '');
      }
      if (!o.keepLayers) dropLayers(0);
      S.tab = k;
      let scr = S.screens[k];
      if (!scr) { scr = S.screens[k] = SCREENS[k](); screensEl.appendChild(scr.el); }
      for (const key in S.screens) S.screens[key].el.hidden = key !== k;
      openScreens();
      for (const b of barEl.children) b.classList.toggle('on', b.dataset.tab === k);
      if (scr.show) scr.show();
    }
    function openScreens() {
      if (S.open) return;
      S.open = true;
      screensEl.hidden = false;
      document.documentElement.classList.add('ala-scr-open');
      showFab();
    }
    function closeScreens() {
      if (!S.open) return;
      S.open = false;
      if (screensEl) screensEl.hidden = true;
      document.documentElement.classList.remove('ala-scr-open');
      if (barEl) for (const b of barEl.children) b.classList.remove('on');
      showFab();
    }
    function pushLayer(scr) {
      history.pushState(st({ ala: S.tab, alaL: S.layers.length + 1, alaSheet: null }), '');
      scr.el.classList.add('ala-layer');
      S.layers.push(scr);
      screensEl.appendChild(scr.el);
    }
    function dropLayers(n) {
      while (S.layers.length > n) { const l = S.layers.pop(); if (l.destroy) l.destroy(); l.el.remove(); }
    }
    window.addEventListener('popstate', () => {
      if (!S.built) return;
      const s = history.state || {};
      if (sheetOpen() && !s.alaSheet) closeSheet(true);
      if (s.ala && TABS.some(t => t[0] === s.ala) && appWanted()) {
        if (!S.open || S.tab !== s.ala) showTab(s.ala, { fromPop: true, keepLayers: true });
        dropLayers(s.alaL || 0);
      } else if (S.open) closeScreens();
      if (afterPop) { const f = afterPop; afterPop = null; setTimeout(f, 0); }
      onRoute();
    });
    // open an AniList page (its own router: no reload). Back comes back to the app screen you were on.
    function go(path) {
      if (sheetOpen() && history.state && history.state.alaSheet) { closeSheet(true); afterPop = () => go(path); history.back(); return; }
      closeSheet(true);
      if (S.open) history.replaceState(st({ ala: S.tab, alaL: S.layers.length }), '');
      closeScreens();
      const app = document.getElementById('app');
      const r = app && app.__vue__ && app.__vue__.$router;
      if (r) { const p = r.push(path); if (p && p.catch) p.catch(() => {}); } else location.href = path;
    }
    // the URL changed (AniList's own links, our go(), Back): the floating "add to list" button on anime / manga pages
    let routeT = 0;
    function onRoute() { clearTimeout(routeT); routeT = setTimeout(showFab, 60); }
    for (const fn of ['pushState', 'replaceState']) {
      const orig = history[fn];
      history[fn] = function () { const r = orig.apply(this, arguments); onRoute(); return r; };
    }
    function mediaFromPath() { const m = /^\/(anime|manga)\/(\d+)/.exec(location.pathname); return m ? +m[2] : 0; }
    let fabFor = 0;
    async function showFab() {
      if (!S.built) return;
      const id = (!S.open && document.documentElement.classList.contains('ala-on') && signedIn()) ? mediaFromPath() : 0;
      if (!id) { if (fabEl) fabEl.remove(); fabEl = null; fabFor = 0; return; }
      if (fabFor === id && fabEl && fabEl.isConnected) return;
      fabFor = id;
      if (fabEl) fabEl.remove();
      fabEl = h('button', { class: 'ala-fab', onclick: () => mediaSheet(id) }, ic('plus'), h('span', {}, 'Add to list'));
      root.appendChild(fabEl);
      try {
        const d = await gql('query AlaFab($id:Int){Media(id:$id){id type mediaListEntry{id status progress}}}', { id });
        const m = d.Media, e = m && m.mediaListEntry;
        if (fabFor === id && fabEl && e) { fabEl.classList.add('has'); fabEl.replaceChildren(ic('check'), h('span', {}, stName(e.status, m.type) + (e.progress ? ' · ' + e.progress : ''))); }
      } catch (e) {}
    }

    // ---- one click handler for everything inside the app ----
    function onClick(e) {
      const t = e.target;
      const sp = t.closest('.ala-spoiler');
      if (sp && !sp.classList.contains('open')) { e.preventDefault(); sp.classList.add('open'); return; }
      const a = t.closest('a[data-go]');
      if (a) { e.preventDefault(); const p = a.getAttribute('data-go'); const um = /^\/user\/([^/]+)\/?$/.exec(p); if (um) openProfile({ name: decodeURIComponent(um[1]) }); else go(p); return; }
      const u = t.closest('[data-user]');
      if (u && !t.closest('button.ala-follow')) { e.preventDefault(); openProfile({ id: +u.getAttribute('data-user'), name: u.getAttribute('data-name') || '' }); return; }
      const f = t.closest('button.ala-follow');
      if (f) { e.preventDefault(); toggleFollow(+f.getAttribute('data-uid'), f); return; }
      const m = t.closest('[data-media]');
      if (m && !t.closest('button:not([data-media])')) { e.preventDefault(); mediaSheet(+m.getAttribute('data-media')); return; }
    }

    // ---- double tap a post = like (with a heart) ----
    let lastTap = null;
    function onTapUp(e) {
      if (!cfg.dbl || e.pointerType === 'mouse') return;
      const card = e.target.closest('.ala-card');
      if (!card || e.target.closest('button, a, video, input, textarea, .ala-replies')) { lastTap = null; return; }
      const tnow = Date.now();
      if (lastTap && lastTap.card === card && tnow - lastTap.t < 320 && Math.abs(e.clientX - lastTap.x) < 40 && Math.abs(e.clientY - lastTap.y) < 40) {
        lastTap = null;
        const r = card.getBoundingClientRect();
        const heart = h('div', { class: 'ala-burst', style: 'left:' + (e.clientX - r.left) + 'px;top:' + (e.clientY - r.top) + 'px' }, ic('heart', true));
        card.appendChild(heart);
        setTimeout(() => heart.remove(), 750);
        if (card._item && !card._item.isLiked) likeItem(card._item, card);
        else buzz();
        return;
      }
      lastTap = { card, t: tnow, x: e.clientX, y: e.clientY };
    }

    // ---------------------------------------------------------------- sheets (slide up from the bottom)
    let sheetEl = null;
    const sheetOpen = () => !!(sheetEl && sheetEl.isConnected);
    function openSheet(content, o) {
      closeSheet(true);
      const back = h('div', { class: 'ala-back', onclick: () => hideSheet() });
      const body = h('div', { class: 'ala-sbody' }, content);
      const sh = h('div', { class: 'ala-sheet', role: 'dialog' }, h('div', { class: 'ala-grab' }), body);
      // swipe the sheet down to close it
      let y0 = null;
      sh.addEventListener('touchstart', ev => { y0 = body.scrollTop <= 0 ? ev.touches[0].clientY : null; }, { passive: true });
      sh.addEventListener('touchmove', ev => { if (y0 == null) return; const dy = ev.touches[0].clientY - y0; if (dy > 0) sh.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
      sh.addEventListener('touchend', ev => { if (y0 == null) return; const dy = (ev.changedTouches[0].clientY - y0); y0 = null; if (dy > 110) hideSheet(); else sh.style.transform = ''; });
      sheetsEl.replaceChildren(back, sh);
      sheetsEl.hidden = false;
      sheetEl = sh;
      sh._onClose = o && o.onClose;
      history.pushState(st({ alaSheet: 1 }), '');
      return sh;
    }
    function hideSheet(after) {
      if (!sheetOpen()) { if (after) after(); return; }
      if (history.state && history.state.alaSheet) { afterPop = after || null; history.back(); } else { closeSheet(true); if (after) after(); }
    }
    function closeSheet() {
      if (!sheetEl) return;
      const f = sheetEl._onClose;
      sheetEl = null;
      sheetsEl.hidden = true;
      sheetsEl.replaceChildren();
      if (f) try { f(); } catch (e) {}
    }
    function menu(items) {
      openSheet(h('div', { class: 'ala-menu' }, items.map(([icon, label, fn]) => h('button', { onclick: () => hideSheet(fn) }, ic(icon), label))));
    }

    // ---------------------------------------------------------------- actions: like, follow, reply, post
    const LIKE_Q = `mutation AlaLike($id:Int,$type:LikeableType){ToggleLikeV2(id:$id,type:$type){
      ... on ListActivity{id likeCount isLiked} ... on TextActivity{id likeCount isLiked} ... on MessageActivity{id likeCount isLiked} ... on ActivityReply{id likeCount isLiked}}}`;
    function paintLike(btn, item) {
      if (!btn) return;
      btn.classList.toggle('liked', !!item.isLiked);
      btn.replaceChildren(ic('heart', !!item.isLiked), h('span', {}, item.likeCount ? num(item.likeCount) : ''));
    }
    async function likeItem(item, card, type) {
      if (!signedIn()) { toast('Sign in to AniList to like posts', 'Sign in', () => go('/login')); return false; }
      if (item._busy) return false;
      item._busy = true;
      const was = item.isLiked;
      item.isLiked = !was; item.likeCount = Math.max(0, (item.likeCount || 0) + (was ? -1 : 1));
      const btn = card && card.querySelector(':scope > .ala-cf .ala-like');
      paintLike(btn, item);
      if (!was) buzz();
      try {
        const d = await gql(LIKE_Q, { id: item.id, type: type || 'ACTIVITY' });
        const r = d.ToggleLikeV2;
        if (r) { item.isLiked = r.isLiked; item.likeCount = r.likeCount; paintLike(btn, item); }
        return true;
      } catch (e) {
        item.isLiked = was; item.likeCount = Math.max(0, item.likeCount + (was ? 1 : -1)); paintLike(btn, item);
        toast(e.message); return false;
      } finally { item._busy = false; }
    }
    const following = new Map(); // user id -> true / false (what we last heard), so every button for that person agrees
    function followBtn(user, big) {
      if (!user || !signedIn() || user.id === me.id) return null;
      const on = following.has(user.id) ? following.get(user.id) : !!user.isFollowing;
      return h('button', { class: 'ala-follow' + (big ? ' big' : '') + (on ? ' on' : ''), 'data-uid': user.id }, on ? 'Following' : (user.isFollower ? 'Follow back' : 'Follow'));
    }
    async function toggleFollow(id, btn) {
      if (!signedIn()) return;
      if (btn.classList.contains('on')) {
        // unfollowing asks first (a tap by mistake is easy); following is one tap
        const name = btn.closest('[data-name]') ? btn.closest('[data-name]').getAttribute('data-name') : '';
        menu([['close', 'Unfollow' + (name ? ' ' + name : ''), () => doFollow(id, false)], ['back', 'Keep following', () => {}]]);
        return;
      }
      doFollow(id, true);
    }
    async function doFollow(id, want) {
      paintFollow(id, want);
      buzz();
      try {
        const d = await gql('mutation AlaFollow($id:Int){ToggleFollow(userId:$id){id isFollowing}}', { id });
        const r = d.ToggleFollow;
        if (r) paintFollow(id, !!r.isFollowing);
        if (r && r.isFollowing !== want) { // it was already the other way round: ask once more
          const d2 = await gql('mutation AlaFollow($id:Int){ToggleFollow(userId:$id){id isFollowing}}', { id });
          if (d2.ToggleFollow) paintFollow(id, !!d2.ToggleFollow.isFollowing);
        }
      } catch (e) { paintFollow(id, !want); toast(e.message); }
    }
    function paintFollow(id, on) {
      following.set(id, on);
      if (!root) return;
      for (const b of root.querySelectorAll('button.ala-follow[data-uid="' + id + '"]')) {
        b.classList.toggle('on', on);
        b.textContent = on ? 'Following' : 'Follow';
      }
    }
    const EMOJI = ['😂', '😭', '🥺', '❤️', '😍', '🔥', '👀', '💀', '😳', '🤣', '😊', '👍', '🙏', '✨', '💯', '😤', '🥰', '😎'];
    // ---- AniList's own formatter (the Markdown component of its app): the preview looks exactly like the posted text ----
    let MdC = null, rootVm = null;
    function findMarkdown() {
      const app = document.getElementById('app');
      rootVm = app && app.__vue__;
      if (!rootVm) return null;
      try {
        const start = rootVm.$router.getMatchedComponents('/activity/1')[0];
        const seenC = new Set(), q = [start];
        while (q.length) {
          const c = q.shift();
          if (!c || seenC.has(c)) continue;
          seenC.add(c);
          const opt = c.options || c;
          for (const k in (opt.components || {})) {
            const s = opt.components[k];
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

    // ---- the toolbar: the same codes AniList's own box writes ----
    function wrapSel(ta, before, after, inner, lineStart) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      if (lineStart && s > 0 && ta.value[s - 1] !== '\n') before = '\n' + before;
      const sel = inner != null ? inner : ta.value.slice(s, e);
      ta.focus();
      ta.setSelectionRange(s, e);
      const text = before + sel + after;
      let ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch (err) {}
      if (!ok) ta.setRangeText(text, s, e, 'end');
      if (!sel) { const p = s + before.length; ta.setSelectionRange(p, p); }
      else if (inner == null) ta.setSelectionRange(s + before.length, s + before.length + sel.length);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // picture / YouTube / video: a selected link is wrapped; otherwise the code goes in with the cursor between the
    // brackets, ready to paste the link (no pop-up boxes)
    function mediaCode(ta, code, what) {
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
      if (/^https?:\/\/\S+$/i.test(sel)) wrapSel(ta, code + '(', ')', sel);
      else { wrapSel(ta, code + '(', ')', ''); toast('Paste the ' + what + ' link between the brackets'); }
    }
    function linkCode(ta) {
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      if (/^https?:\/\/\S+$/i.test(sel.trim())) { wrapSel(ta, '[', '](' + sel.trim() + ')', 'link text'); return; }
      const s = ta.selectionStart, txt = sel || 'link text';
      wrapSel(ta, '[', '](https://)', txt);
      const p = s + txt.length + 3; ta.setSelectionRange(p, p + 8); // "https://" selected: paste over it
      toast('Paste the link where https:// is selected');
    }
    // pasting a picture / GIF / YouTube / video link on its own turns it into AniList's code for it
    function smartPaste(ta, e) {
      const txt = ((e.clipboardData && e.clipboardData.getData('text/plain')) || '').trim();
      if (!/^https?:\/\/\S+$/i.test(txt)) return;
      const before = ta.value.slice(0, ta.selectionStart);
      if (/[(\[]\s*$/.test(before) || /\]\(\s*$/.test(before)) return; // already inside img( ... ) or [text]( ... )
      let code = null;
      if (/^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch|shorts|live)|youtu\.be\/)/i.test(txt)) code = 'youtube';
      else if (/\.(mp4|webm)(\?\S*)?$/i.test(txt) || /\.gifv$/i.test(txt)) code = 'webm';
      else if (/\.(gif|png|jpe?g|webp|avif)(\?\S*)?$/i.test(txt) || /^https?:\/\/(media\d*\.tenor\.com|c\.tenor\.com|media\.giphy\.com|i\.giphy\.com|s4\.anilist\.co)\//i.test(txt)) code = 'img';
      if (!code) return;
      e.preventDefault();
      wrapSel(ta, (before && !/\s$/.test(before) ? '\n' : '') + code + '(', ')', txt.replace(/\.gifv$/i, '.mp4'));
    }
    const TOOLS = [
      ['B', 'Bold', ta => wrapSel(ta, '__', '__'), 'font-weight:900'],
      ['I', 'Italic', ta => wrapSel(ta, '_', '_'), 'font-style:italic;font-family:Georgia,serif'],
      ['S', 'Strikethrough', ta => wrapSel(ta, '~~', '~~'), 'text-decoration:line-through'],
      ['Spoiler', 'Spoiler', ta => wrapSel(ta, '~!', '!~')],
      ['Link', 'Link', ta => linkCode(ta)],
      ['Img', 'Picture or GIF by link', ta => mediaCode(ta, 'img', 'picture')],
      ['YT', 'YouTube video', ta => mediaCode(ta, 'youtube', 'YouTube')],
      ['Video', 'Video file (webm / mp4)', ta => mediaCode(ta, 'webm', 'video')],
      ['❝', 'Quote', ta => wrapSel(ta, '> ', '', null, true), 'font-size:17px'],
      ['Center', 'Centre', ta => wrapSel(ta, '~~~', '~~~')],
      ['H', 'Header', ta => wrapSel(ta, '# ', '', null, true), 'font-weight:900'],
      ['•', 'List', ta => wrapSel(ta, '- ', '', null, true), 'font-size:18px'],
      ['1.', 'Numbered list', ta => wrapSel(ta, '1. ', '', null, true)],
      ['</>', 'Code', ta => wrapSel(ta, '`', '`'), 'font-family:monospace'],
    ];
    function composer(o) {
      // a .markdown-editor toolbar with the text box after it: the GIF picker puts its GIF button there too
      const ta = h('textarea', { class: 'ala-ta', placeholder: o.placeholder || 'Write a reply…', rows: 1 });
      const tools = h('div', { class: 'markdown-editor ala-tools' });
      const tb = (label, title, fn, css, cls) => {
        const b = h('button', { type: 'button', class: 'ala-tb' + (cls ? ' ' + cls : ''), title, 'aria-label': title, style: css || null }, label);
        b.addEventListener('mousedown', e => e.preventDefault()); // keeps the text selected and the keyboard up
        b.addEventListener('click', () => fn(ta));
        tools.appendChild(b);
        return b;
      };
      for (const [label, title, fn, css] of TOOLS) tb(label, title, fn, css);
      const preview = h('div', { class: 'ala-preview', hidden: true });
      const pv = tb('👁', 'Preview', () => { cfg.preview = cfg.preview === false; saveCfg(); pv.classList.toggle('on', cfg.preview !== false); drawPreview(true); }, null, 'ala-pvb' + (cfg.preview !== false ? ' on' : ''));
      const send = h('button', { class: 'ala-btn ala-pri', disabled: true }, o.button || 'Send');
      const emo = h('div', { class: 'ala-emo' }, EMOJI.map(x => h('button', { type: 'button', onclick: () => { insertAt(ta, x); } }, x)));
      // the preview is drawn by AniList's own formatter, only when the text changed (a playing GIF is not restarted)
      let pvT = 0;
      function drawPreview(now) {
        clearTimeout(pvT);
        pvT = setTimeout(() => {
          const want = cfg.preview !== false && ta.value.trim() ? ta.value : '';
          if (preview._shown === want) return;
          preview._shown = want;
          if (preview._vm) { try { preview._vm.$destroy(); } catch (e) {} preview._vm = null; }
          preview.replaceChildren();
          preview.hidden = !want;
          if (!want) return;
          const vm = mdMount(want);
          if (vm) { preview._vm = vm; preview.appendChild(vm.$el); } else preview.textContent = want;
        }, now ? 0 : 300);
      }
      const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, innerHeight * 0.4) + 'px'; send.disabled = !ta.value.trim(); };
      ta.addEventListener('input', () => { fit(); drawPreview(); });
      ta.addEventListener('paste', e => smartPaste(ta, e));
      ta.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); send.click(); }
        else if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'b' || ev.key === 'i')) { ev.preventDefault(); wrapSel(ta, ev.key === 'b' ? '__' : '_', ev.key === 'b' ? '__' : '_'); }
      });
      send.addEventListener('click', async () => {
        const text = ta.value.trim();
        if (!text || send.disabled) return;
        send.disabled = true;
        try { await o.onSend(encEmoji(text)); ta.value = ''; fit(); drawPreview(true); } catch (e) { toast(e.message); } finally { send.disabled = !ta.value.trim(); }
      });
      const el = h('div', { class: 'ala-compose' }, tools, h('div', { class: 'ala-tawrap' }, ta), preview, h('div', { class: 'ala-crow' }, emo, send));
      el._ta = ta;
      return el;
    }
    function insertAt(ta, text) {
      const s = ta.selectionStart == null ? ta.value.length : ta.selectionStart, e = ta.selectionEnd == null ? s : ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
      ta.selectionStart = ta.selectionEnd = s + text.length;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // ---------------------------------------------------------------- the feed (home, profiles)
    const ACT_Q = `id type createdAt likeCount replyCount isLiked isPinned`;
    const FEED_FIELDS = `
      ... on TextActivity{${ACT_Q} siteUrl html:text(asHtml:true) user{${U}}}
      ... on ListActivity{${ACT_Q} siteUrl status progress user{${U}} media{id type title{userPreferred} coverImage{medium color} format}}
      ... on MessageActivity{${ACT_Q} siteUrl isPrivate html:message(asHtml:true) messenger{${U}} recipient{id name}}`;
    function feedQuery(kind) {
      const args = kind === 'user' ? 'userId:$uid,type_in:[TEXT,MEDIA_LIST,MESSAGE],sort:[PINNED,ID_DESC]'
        : kind === 'global' ? 'isFollowing:false,hasRepliesOrTypeText:true,type_in:[TEXT,MEDIA_LIST],sort:ID_DESC'
          : 'isFollowing:true,type_in:[TEXT,MEDIA_LIST],sort:ID_DESC';
      return `query AlaFeed($page:Int${kind === 'user' ? ',$uid:Int' : ''}){Page(page:$page,perPage:20){pageInfo{hasNextPage} activities(${args}){${FEED_FIELDS}}}}`;
    }
    const passFilter = (it, f) => f === 'all' || (f === 'text' ? it.type === 'TEXT' || it.type === 'MESSAGE' : f === 'list' ? !!it.media : true);
    function author(it) { return it.user || it.messenger || {}; }

    function cardFor(it) {
      const u = author(it);
      const head = h('div', { class: 'ala-ch' },
        h('a', { class: 'ala-avatar', href: '/user/' + encodeURIComponent(u.name || '') + '/', 'data-user': u.id, 'data-name': u.name, style: bg(u.avatar && u.avatar.medium) }),
        h('div', { class: 'ala-who', 'data-name': u.name || '' },
          h('a', { class: 'ala-name', href: '/user/' + encodeURIComponent(u.name || '') + '/', 'data-user': u.id, 'data-name': u.name }, u.name || '?',
            it.recipient ? h('span', { class: 'ala-time' }, ' → ' + it.recipient.name) : null),
          h('span', { class: 'ala-time' }, ago(it.createdAt) + (it.isPinned ? ' · pinned' : '') + (it.isPrivate ? ' · private' : ''))),
        u.isFollowing === false && !following.get(u.id) ? followBtn(u) : null,
        h('button', { class: 'ala-ib', style: 'background:transparent', 'data-a': 'menu', 'aria-label': 'More' }, ic('more')));
      let body;
      if (it.media) {
        const m = it.media;
        const rgb = hexRgb(m.coverImage && m.coverImage.color);
        const status = String(it.status || '').replace(/^./, c => c.toUpperCase());
        body = h('div', { class: 'ala-list', style: rgb ? '--m-rgb:' + rgb.join(',') : '' },
          h('div', { class: 'ala-cover', 'data-media': m.id, style: bg(m.coverImage && m.coverImage.medium) }, signedIn() ? h('i', { class: 'ala-plus' }, ic('plus')) : null),
          h('div', { class: 'ala-ltxt' }, h('span', { class: 'ala-st' }, status + (it.progress ? ' ' + it.progress + ' of' : '') + ' '),
            h('a', { href: '/' + String(m.type || 'anime').toLowerCase() + '/' + m.id + '/', 'data-go': '/' + String(m.type || 'anime').toLowerCase() + '/' + m.id + '/' }, h('b', {}, m.title.userPreferred))));
      } else body = h('div', {}, mdBox(it.html));
      const like = h('button', { class: 'ala-act ala-like', 'data-a': 'like', 'aria-label': 'Like' });
      const card = h('article', { class: 'ala-card' + (it.isPinned ? ' ala-pinned' : ''), 'data-id': it.id },
        head, h('div', { class: 'ala-body' }, body),
        h('div', { class: 'ala-cf' }, like,
          h('button', { class: 'ala-act', 'data-a': 'replies', 'aria-label': 'Replies' }, ic('chat'), h('span', {}, it.replyCount ? num(it.replyCount) : '')),
          h('span', { class: 'ala-sp' }),
          h('button', { class: 'ala-act', 'data-a': 'open', 'aria-label': 'Open the post' }, ic('out'))));
      paintLike(like, it);
      card._item = it;
      return card;
    }

    function makeFeed(o) {
      // o: {kind: 'following'|'global'|'user', uid, filter(): 'all'|'text'|'list', scroll (element), cacheKey}
      const list = h('div', { class: 'ala-feed' });
      const status = h('div', {});
      const more = h('div', { class: 'ala-more' });
      const el = h('div', {}, list, status, more);
      const F = { el, items: [], page: 0, next: true, busy: false, kind: o.kind, gen: 0 };
      const seen = new Set();
      function add(items, top) {
        const frag = document.createDocumentFragment();
        const f = o.filter ? o.filter() : 'all';
        for (const it of items) {
          if (!it || seen.has(it.id)) continue;
          seen.add(it.id);
          if (top) F.items.unshift(it); else F.items.push(it);
          const c = cardFor(it);
          if (!passFilter(it, f)) c.hidden = true;
          frag.appendChild(c);
        }
        if (top) list.prepend(frag); else list.appendChild(frag);
      }
      F.applyFilter = () => { const f = o.filter ? o.filter() : 'all'; for (const c of list.children) c.hidden = !passFilter(c._item, f); fill(); };
      const shown = () => { let n = 0; for (const c of list.children) if (!c.hidden) n++; return n; };
      async function load() {
        if (F.busy || !F.next) return;
        F.busy = true;
        const gen = F.gen;
        if (!list.children.length) status.replaceChildren(h('div', { class: 'ala-spin' }));
        try {
          const d = await gql(feedQuery(o.kind), o.kind === 'user' ? { page: F.page + 1, uid: o.uid } : { page: F.page + 1 });
          if (gen !== F.gen) return;
          const pg = d.Page || {};
          F.page++;
          F.next = !!(pg.pageInfo && pg.pageInfo.hasNextPage) && F.page < 250;
          add((pg.activities || []).filter(Boolean));
          if (o.cacheKey && F.page === 1) LS.set(o.cacheKey, { at: Date.now(), items: F.items.slice(0, 15) });
          status.replaceChildren(!shown() && !F.next ? h('div', { class: 'ala-empty' }, h('b', {}, 'Nothing here yet'), o.kind === 'following' ? 'Follow people to fill your feed: try the Global tab.' : '') : '');
        } catch (e) {
          if (gen !== F.gen) return;
          status.replaceChildren(h('div', { class: 'ala-empty' }, h('b', {}, e.auth ? 'Sign in to see this' : 'Could not load'), e.message, h('br'), h('br'),
            h('button', { class: 'ala-btn ala-pri', onclick: () => (e.auth ? go('/login') : load()) }, e.auth ? 'Sign in' : 'Try again')));
        } finally { if (gen === F.gen) { F.busy = false; fill(); } }
      }
      // a filter can hide most of a page: keep loading (a few pages at most) until there is something to read
      let extra = 0;
      function fill() { if (F.next && !F.busy && shown() < 6 && extra < 4) { extra++; load(); } else if (shown() >= 6) extra = 0; }
      F.load = load;
      F.reset = async () => {
        F.gen++; F.busy = false; F.page = 0; F.next = true; F.items = []; seen.clear(); extra = 0;
        list.replaceChildren(); status.replaceChildren();
        await load();
      };
      // instant start: the last first page from this phone, replaced as soon as the fresh one is in
      F.start = () => {
        const c = o.cacheKey && LS.get(o.cacheKey, null);
        if (c && c.items && c.items.length && Date.now() - c.at < 6 * 3600e3) {
          add(c.items);
          F.page = 0;
          const gen = ++F.gen;
          gql(feedQuery(o.kind), o.kind === 'user' ? { page: 1, uid: o.uid } : { page: 1 }).then(d => {
            if (gen !== F.gen) return;
            const pg = d.Page || {};
            list.replaceChildren(); seen.clear(); F.items = [];
            F.page = 1; F.next = !!(pg.pageInfo && pg.pageInfo.hasNextPage);
            add((pg.activities || []).filter(Boolean));
            LS.set(o.cacheKey, { at: Date.now(), items: F.items.slice(0, 15) });
            fill();
          }).catch(() => {});
        } else load();
      };
      // new posts at the top (checked while you look at the feed)
      F.newer = async () => {
        if (!F.items.length || F.busy) return 0;
        const top = F.items.reduce((m, x) => Math.max(m, x.id), 0);
        const d = await gql(`query AlaFeedNew{Page(page:1,perPage:20){activities(${o.kind === 'global' ? 'isFollowing:false,hasRepliesOrTypeText:true' : 'isFollowing:true'},type_in:[TEXT,MEDIA_LIST],sort:ID_DESC){... on TextActivity{id} ... on ListActivity{id}}}}`);
        return ((d.Page && d.Page.activities) || []).filter(a => a && a.id > top && !seen.has(a.id)).length;
      };
      // infinite scroll
      if ('IntersectionObserver' in window) {
        F.io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) load(); }, { root: o.scroll, rootMargin: '900px 0px' });
        F.io.observe(more);
      }
      // the buttons on the cards
      list.addEventListener('click', ev => {
        const b = ev.target.closest('[data-a]');
        if (!b) return;
        const card = b.closest('.ala-card');
        const it = card && card._item;
        if (!it) return;
        const a = b.getAttribute('data-a');
        if (a === 'like') likeItem(it, card);
        else if (a === 'replies') toggleReplies(card, it);
        else if (a === 'open') go('/activity/' + it.id);
        else if (a === 'more') { const box = b.previousElementSibling; if (box) box.classList.add('open'); }
        else if (a === 'menu') cardMenu(card, it, F);
      });
      // "Like all": every post loaded here that you have not liked yet, one after another (gently, AniList has limits)
      F.likeAll = () => F.items.filter(x => !x.isLiked && author(x).id !== (me && me.id) && passFilter(x, o.filter ? o.filter() : 'all'));
      F.cardOf = id => list.querySelector('.ala-card[data-id="' + id + '"]');
      F.prepend = it => add([it], true);
      return F;
    }
    function cardMenu(card, it, F) {
      const mine = signedIn() && author(it).id === me.id;
      const items = [['out', 'Open on AniList', () => go('/activity/' + it.id)],
        ['link', 'Copy link', () => { const u = 'https://anilist.co/activity/' + it.id; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Link copied'), () => toast(u)); }]];
      if (it.media) items.push(['plus', 'Add ' + it.media.title.userPreferred + ' to my list', () => mediaSheet(it.media.id)]);
      if (author(it).name) items.push(['user', 'View ' + author(it).name, () => openProfile({ id: author(it).id, name: author(it).name })]);
      if (mine) items.push(['trash', 'Delete this post', () => menu([['trash', 'Yes, delete it', async () => {
        try { await gql('mutation AlaDelAct($id:Int){DeleteActivity(id:$id){deleted}}', { id: it.id }); card.remove(); toast('Deleted'); } catch (e) { toast(e.message); }
      }], ['back', 'Keep it', () => {}]])]);
      menu(items);
    }
    async function toggleReplies(card, it) {
      let box = card.querySelector(':scope > .ala-replies');
      if (box) { box.hidden = !box.hidden; return; }
      box = h('div', { class: 'ala-replies' }, h('div', { class: 'ala-spin' }));
      card.appendChild(box);
      const listEl = h('div', {});
      const addReply = r => {
        const u = r.user || {};
        const lk = h('button', { class: 'ala-rlike' + (r.isLiked ? ' liked' : ''), 'aria-label': 'Like reply' }, ic('heart', !!r.isLiked), h('span', {}, r.likeCount ? num(r.likeCount) : ''));
        lk.addEventListener('click', async () => {
          if (!signedIn() || r._busy) return;
          r._busy = true; const was = r.isLiked;
          r.isLiked = !was; r.likeCount += was ? -1 : 1; lk.classList.toggle('liked', r.isLiked); lk.replaceChildren(ic('heart', r.isLiked), h('span', {}, r.likeCount ? num(r.likeCount) : ''));
          if (!was) buzz();
          try { const d = await gql(LIKE_Q, { id: r.id, type: 'ACTIVITY_REPLY' }); const x = d.ToggleLikeV2; if (x) { r.isLiked = x.isLiked; r.likeCount = x.likeCount; } }
          catch (e) { r.isLiked = was; r.likeCount += was ? 1 : -1; toast(e.message); }
          lk.classList.toggle('liked', r.isLiked); lk.replaceChildren(ic('heart', r.isLiked), h('span', {}, r.likeCount ? num(r.likeCount) : '')); r._busy = false;
        });
        const inner = cleanHtml(r.html); inner.className = 'ala-md';
        for (const v of inner.querySelectorAll('video')) { v.muted = true; if (vidObs) vidObs.observe(v); }
        listEl.appendChild(h('div', { class: 'ala-reply' },
          h('a', { class: 'ala-avatar', href: '/user/' + encodeURIComponent(u.name || '') + '/', 'data-user': u.id, 'data-name': u.name, style: bg(u.avatar && u.avatar.medium) }),
          h('div', { class: 'ala-rb' }, h('a', { class: 'ala-name', href: '/user/' + encodeURIComponent(u.name || '') + '/', 'data-user': u.id, 'data-name': u.name }, u.name),
            h('span', { class: 'ala-time' }, ago(r.createdAt)), inner), lk));
      };
      try {
        const per = 50, last = Math.max(1, Math.ceil((it.replyCount || 0) / per));
        const d = await gql(`query AlaReplies($id:Int,$page:Int){Page(page:$page,perPage:${per}){pageInfo{total} activityReplies(activityId:$id){id createdAt likeCount isLiked html:text(asHtml:true) user{${U}}}}}`, { id: it.id, page: last });
        const reps = (d.Page && d.Page.activityReplies) || [];
        box.replaceChildren();
        if ((it.replyCount || 0) > reps.length) box.appendChild(h('button', { class: 'ala-readmore', style: 'display:inline-block', onclick: () => go('/activity/' + it.id) }, 'See all ' + it.replyCount + ' replies'));
        reps.forEach(addReply);
        box.appendChild(listEl);
        if (!reps.length) box.insertBefore(h('div', { class: 'ala-time', style: 'padding:4px 0 2px' }, 'No replies yet. Say something nice!'), listEl);
      } catch (e) { box.replaceChildren(h('div', { class: 'ala-time' }, e.message)); }
      if (signedIn() && !it.isLocked) {
        box.appendChild(composer({ onSend: async text => {
          const d = await gql(`mutation AlaReply($a:Int,$t:String){SaveActivityReply(activityId:$a,text:$t){id createdAt likeCount isLiked html:text(asHtml:true) user{${U}}}}`, { a: it.id, t: text });
          if (d.SaveActivityReply) { addReply(d.SaveActivityReply); it.replyCount = (it.replyCount || 0) + 1; const b = card.querySelector('[data-a="replies"] span'); if (b) b.textContent = num(it.replyCount); }
          const empty = box.querySelector(':scope > .ala-time'); if (empty) empty.remove();
        } }));
      }
    }

    // pull down at the top of a screen to refresh it
    function pullToRefresh(scroll, fn) {
      const ind = h('div', { class: 'ala-ptr' }, ic('refresh'));
      (scroll.parentElement || scroll).appendChild(ind);
      let y0 = null, dy = 0, busy = false;
      scroll.addEventListener('touchstart', e => {
        y0 = scroll.scrollTop <= 0 && !busy ? e.touches[0].clientY : null; dy = 0;
        if (y0 != null) { const hd = scroll.querySelector(':scope > .ala-head'); ind.style.top = (hd ? hd.offsetHeight : 0) + 'px'; }
      }, { passive: true });
      scroll.addEventListener('touchmove', e => {
        if (y0 == null) return;
        dy = e.touches[0].clientY - y0;
        if (dy <= 0) { ind.style.transform = ''; return; }
        const p = Math.min(dy, 140);
        ind.style.transform = 'translateY(' + (p * 0.6 - 40) + 'px) rotate(' + p * 2.5 + 'deg)';
      }, { passive: true });
      scroll.addEventListener('touchend', async () => {
        if (y0 == null) return;
        y0 = null;
        if (dy > 85 && !busy) {
          busy = true; ind.classList.add('go'); ind.style.transform = 'translateY(42px)'; buzz();
          try { await fn(); } catch (e) {}
          busy = false; ind.classList.remove('go');
        }
        ind.style.transform = '';
      });
    }
    function screenShell(title, extra) {
      const scroll = h('div', { class: 'ala-scroll' });
      const head = h('div', { class: 'ala-head' }, h('div', { class: 'ala-hrow' }, h('div', { class: 'ala-title' }, title), extra || null));
      scroll.appendChild(head);
      const el = h('section', { class: 'ala-scr' }, scroll);
      return { el, scroll, head };
    }
    function signInBox(what) {
      return h('div', { class: 'ala-empty' }, h('b', {}, 'Sign in to see ' + what), 'Your AniList login works here.', h('br'), h('br'),
        h('button', { class: 'ala-btn ala-pri', onclick: () => go('/login') }, 'Sign in'));
    }

    // ---------------------------------------------------------------- screens
    const SCREENS = {};

    // ---- Home: Following / Global, filters, like all, write a post ----
    SCREENS.home = function () {
      const write = h('button', { class: 'ala-ib ala-acc', 'aria-label': 'Write a post' }, ic('pen'));
      const likeAll = h('button', { class: 'ala-ib', 'aria-label': 'Like every post shown', style: 'color:var(--a-heart)' }, ic('heart', true));
      const sh = screenShell('Feed', h('div', { style: 'display:flex;gap:8px' }, likeAll, write));
      const seg = h('div', { class: 'ala-seg' });
      const chips = h('div', { class: 'ala-chips' });
      const prog = h('div', {});
      sh.head.append(seg, chips, prog);
      const pill = h('div', { class: 'ala-newpill', hidden: true });
      const pad = h('div', { class: 'ala-pad' });
      sh.scroll.append(pill, pad);
      const feeds = {};
      const filter = () => cfg.filter;
      function feed() {
        if (!feeds[cfg.feed]) {
          feeds[cfg.feed] = makeFeed({ kind: cfg.feed, filter, scroll: sh.scroll, cacheKey: 'alapp:c:feed:' + cfg.feed });
          pad.appendChild(feeds[cfg.feed].el);
          feeds[cfg.feed].start();
        }
        for (const k in feeds) feeds[k].el.hidden = k !== cfg.feed;
        return feeds[cfg.feed];
      }
      const segs = [['following', 'Following'], ['global', 'Global']];
      function paint() {
        seg.replaceChildren(...segs.map(([k, l]) => h('button', { class: cfg.feed === k ? 'on' : '', onclick: () => { if (cfg.feed === k) return; cfg.feed = k; saveCfg(); paint(); feed(); pill.hidden = true; sh.scroll.scrollTop = 0; } }, l)));
        chips.replaceChildren(...[['all', 'Everything'], ['text', 'Posts'], ['list', 'List updates']].map(([k, l]) =>
          h('button', { class: 'ala-chip' + (cfg.filter === k ? ' on' : ''), onclick: () => { cfg.filter = k; saveCfg(); paint(); for (const f in feeds) feeds[f].applyFilter(); } }, l)));
      }
      if (!likelySignedIn() && cfg.feed === 'following') cfg.feed = 'global';
      paint();
      // like all: one at a time, ~1 a second, with a stop button; stops on the first refusal
      let liking = null;
      likeAll.addEventListener('click', () => {
        if (!signedIn()) { toast('Sign in to AniList to like posts', 'Sign in', () => go('/login')); return; }
        if (liking) return;
        const F = feed(), todo = F.likeAll();
        if (!todo.length) { toast('You already liked everything shown here 💖'); return; }
        menu([['heart', 'Like all ' + todo.length + ' posts shown', () => runLikeAll(F, todo)], ['back', 'Cancel', () => {}]]);
      });
      async function runLikeAll(F, todo) {
        liking = { stop: false };
        const txt = h('span', {}, '');
        const bar = h('div', { class: 'ala-likeall' }, ic('heart', true), txt, h('span', { class: 'ala-sp' }), h('button', { onclick: () => { liking.stop = true; } }, 'Stop'));
        prog.replaceChildren(bar);
        let done = 0;
        for (const it of todo) {
          if (liking.stop) break;
          txt.textContent = 'Liking ' + (done + 1) + ' of ' + todo.length;
          if (it.isLiked) { done++; continue; }
          const ok = await likeItem(it, F.cardOf(it.id));
          if (!ok) break;
          done++;
          await new Promise(r => setTimeout(r, 1100));
        }
        prog.replaceChildren();
        toast('Liked ' + done + ' post' + (done === 1 ? '' : 's') + ' 💖');
        liking = null;
      }
      write.addEventListener('click', () => {
        if (!signedIn()) { toast('Sign in to AniList to post', 'Sign in', () => go('/login')); return; }
        const c = composer({ placeholder: 'What are you watching? Say something…', button: 'Post', onSend: async text => {
          const d = await gql(`mutation AlaPost($t:String){SaveTextActivity(text:$t){${ACT_Q} siteUrl html:text(asHtml:true) user{${U}}}}`, { t: text });
          hideSheet();
          if (d.SaveTextActivity) { cfg.feed = 'following'; saveCfg(); paint(); feed().prepend(d.SaveTextActivity); sh.scroll.scrollTop = 0; toast('Posted ✨'); }
        } });
        openSheet(h('div', {}, h('div', { class: 'ala-stitle', style: 'margin-bottom:10px' }, 'New post'), c));
        setTimeout(() => c._ta.focus(), 250);
      });
      pullToRefresh(sh.scroll, () => { pill.hidden = true; return feed().reset(); });
      pill.addEventListener('click', () => { pill.hidden = true; sh.scroll.scrollTo({ top: 0 }); feed().reset(); });
      // new posts: asked every 90 s while you look at the feed
      let newT = 0;
      const checkNew = async () => {
        if (!S.open || S.tab !== 'home' || S.layers.length || document.hidden) return;
        try { const n = await feed().newer(); if (n) { pill.hidden = false; pill.replaceChildren(h('button', {}, '↑ ' + n + (n >= 20 ? '+' : '') + ' new post' + (n === 1 ? '' : 's'))); } } catch (e) {}
      };
      return { el: sh.el, scroll: sh.scroll,
        show() { feed(); clearInterval(newT); newT = setInterval(checkNew, 90e3); },
        refresh() { pill.hidden = true; return feed().reset(); } };
    };

    // ---- Watching: what's new for you today, +1 episode, this week's airing ----
    const LIST_Q = `query AlaList($uid:Int,$type:MediaType){MediaListCollection(userId:$uid,type:$type,status_in:[CURRENT,REPEATING,PLANNING],sort:UPDATED_TIME_DESC){
      lists{status entries{id status progress updatedAt score(format:POINT_100) media{id type title{userPreferred} coverImage{medium large color} episodes chapters format status nextAiringEpisode{episode airingAt}}}}}}`;
    const lists = {}; // type -> {at, entries}
    async function loadList(type, force) {
      const key = 'alapp:c:list:' + type;
      if (!lists[type]) { const c = LS.get(key, null); if (c && c.uid === (me && me.id)) lists[type] = c; }
      if (!force && lists[type] && Date.now() - lists[type].at < 120e3) return lists[type];
      const d = await gql(LIST_Q, { uid: me.id, type });
      const entries = [];
      for (const l of (d.MediaListCollection && d.MediaListCollection.lists) || []) for (const e of l.entries || []) if (e && e.media && !entries.some(x => x.id === e.id)) entries.push(e);
      lists[type] = { at: Date.now(), uid: me.id, entries };
      LS.set(key, lists[type]);
      return lists[type];
    }
    const aired = m => (m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : (m.status === 'FINISHED' ? (m.episodes || m.chapters || null) : null));
    async function saveProgress(entry, p, o) {
      o = o || {};
      const m = entry.media;
      const total = m.type === 'MANGA' ? m.chapters : m.episodes;
      const before = { progress: entry.progress, status: entry.status };
      let status = entry.status === 'PLANNING' ? 'CURRENT' : entry.status;
      if (total && p >= total) { p = total; status = 'COMPLETED'; }
      entry.progress = p; entry.status = status;
      buzz();
      const d = await gql('mutation AlaProgress($id:Int,$p:Int,$s:MediaListStatus){SaveMediaListEntry(id:$id,progress:$p,status:$s){id status progress}}', { id: entry.id, p, s: status });
      const r = d.SaveMediaListEntry;
      if (r) { entry.progress = r.progress; entry.status = r.status; }
      listChanged(m.type);
      if (status === 'COMPLETED' && before.status !== 'COMPLETED') toast('Completed ' + m.title.userPreferred + ' 🎉', 'Rate it', () => mediaSheet(m.id), 7000);
      else if (!o.quiet) toast((m.type === 'MANGA' ? 'Chapter ' : 'Episode ') + p + ' · ' + m.title.userPreferred, 'Undo', async () => {
        try { await gql('mutation AlaProgress($id:Int,$p:Int,$s:MediaListStatus){SaveMediaListEntry(id:$id,progress:$p,status:$s){id status progress}}', { id: entry.id, p: before.progress, s: before.status });
          entry.progress = before.progress; entry.status = before.status; listChanged(m.type); } catch (e) { toast(e.message); }
      });
    }
    const listListeners = new Set();
    function listChanged(type, stale) {
      const L = type && lists[type];
      if (L) { if (stale) L.at = 0; LS.set('alapp:c:list:' + type, L); }
      for (const f of listListeners) try { f(type, stale); } catch (e) {}
      if (fabEl) { fabFor = 0; showFab(); }
    }

    SCREENS.watch = function () {
      const refresh = h('button', { class: 'ala-ib', 'aria-label': 'Refresh' }, ic('refresh'));
      const sh = screenShell('Watching', refresh);
      const seg = h('div', { class: 'ala-seg' });
      sh.head.appendChild(seg);
      const pad = h('div', { class: 'ala-pad' });
      sh.scroll.appendChild(pad);
      let showPlan = false;
      function paintSeg() {
        sh.head.querySelector('.ala-title').textContent = cfg.wtype === 'MANGA' ? 'Reading' : 'Watching';
        seg.replaceChildren(...[['ANIME', 'Anime'], ['MANGA', 'Manga']].map(([k, l]) => h('button', { class: cfg.wtype === k ? 'on' : '', onclick: () => { cfg.wtype = k; saveCfg(); paintSeg(); load(); } }, l)));
      }
      paintSeg();
      function wcard(e, kind) {
        const m = e.media, isM = m.type === 'MANGA';
        const total = isM ? m.chapters : m.episodes;
        const out = aired(m);
        const behind = out != null ? out - e.progress : 0;
        const tags = [];
        if (kind === 'plan') tags.push(h('span', { class: 'ala-tag' }, m.format ? m.format.replace(/_/g, ' ') : 'Planning'));
        else if (behind > 0 && m.nextAiringEpisode) tags.push(h('span', { class: 'ala-tag new' }, behind === 1 ? 'New episode' : behind + ' new'));
        else if (behind > 0) tags.push(h('span', { class: 'ala-tag new' }, behind + ' left'));
        if (m.nextAiringEpisode && kind !== 'plan') {
          const soon = m.nextAiringEpisode.airingAt - now() < 86400;
          tags.push(h('span', { class: 'ala-tag ' + (soon ? 'soon' : ''), 'data-air': m.nextAiringEpisode.airingAt }, 'Ep ' + m.nextAiringEpisode.episode + ' in ' + left(m.nextAiringEpisode.airingAt)));
        }
        const pTxt = kind === 'plan' ? (total ? total + (isM ? ' chapters' : ' episodes') : '') : (isM ? 'Ch ' : 'Ep ') + e.progress + (total ? ' / ' + total : out ? ' · ' + out + ' out' : '');
        const pct = total ? Math.min(100, e.progress / total * 100) : out ? Math.min(100, e.progress / Math.max(out, 1) * 100) : 0;
        const outPct = total && out ? Math.min(100, out / total * 100) : 0;
        const btn = kind === 'plan'
          ? h('button', { class: 'ala-plus1 soft', 'data-start': e.id }, 'Start')
          : h('button', { class: 'ala-plus1', 'data-plus': e.id, disabled: total && e.progress >= total }, '+1');
        return h('div', { class: 'ala-wc', 'data-media': m.id },
          h('div', { class: 'ala-cover', style: bg(m.coverImage && (m.coverImage.large || m.coverImage.medium)) }),
          h('div', { class: 'ala-wi' }, h('div', { class: 'ala-wt' }, m.title.userPreferred),
            h('div', { class: 'ala-wm' }, h('span', {}, pTxt), ...tags),
            kind !== 'plan' ? h('div', { class: 'ala-bar2' }, outPct ? h('i', { style: 'width:' + outPct + '%' }) : null, h('b', { style: 'width:' + pct + '%' })) : null),
          btn);
      }
      function weekStrip(entries) {
        const days = [], t0 = new Date(); t0.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i++) { const d = new Date(t0); d.setDate(t0.getDate() + i); days.push({ d, items: [] }); }
        for (const e of entries) {
          const n = e.media.nextAiringEpisode;
          if (!n || (e.status !== 'CURRENT' && e.status !== 'REPEATING')) continue;
          const i = Math.floor((n.airingAt * 1000 - t0.getTime()) / 86400e3);
          if (i >= 0 && i < 7) days[i].items.push(e);
        }
        if (!days.some(d => d.items.length)) return null;
        return h('div', { class: 'ala-week' }, days.map((d, i) => h('div', { class: 'ala-day' + (i === 0 ? ' today' : '') },
          h('span', {}, i === 0 ? 'Today' : d.d.toLocaleDateString(undefined, { weekday: 'short' })),
          h('div', { class: 'ala-dc' }, d.items.slice(0, 3).map(e => h('i', { 'data-media': e.media.id, style: bg(e.media.coverImage && e.media.coverImage.medium), title: e.media.title.userPreferred },
            h('b', {}, String(e.media.nextAiringEpisode.episode)))),
          d.items.length > 3 ? h('em', {}, '+' + (d.items.length - 3)) : null))));
      }
      let entriesById = new Map();
      function render(L) {
        entriesById = new Map(L.entries.map(e => [e.id, e]));
        const cur = L.entries.filter(e => e.status === 'CURRENT' || e.status === 'REPEATING');
        const plan = L.entries.filter(e => e.status === 'PLANNING');
        const isM = cfg.wtype === 'MANGA';
        const behind = e => { const o = aired(e.media); return o != null ? o - e.progress : 0; };
        const fresh = cur.filter(e => behind(e) > 0 && e.media.nextAiringEpisode).sort((a, b) => a.media.nextAiringEpisode.airingAt - b.media.nextAiringEpisode.airingAt);
        const soon = cur.filter(e => !(behind(e) > 0) && e.media.nextAiringEpisode).sort((a, b) => a.media.nextAiringEpisode.airingAt - b.media.nextAiringEpisode.airingAt);
        const rest = cur.filter(e => !fresh.includes(e) && !soon.includes(e));
        const sec = (title, count, items, kind) => items.length ? [h('div', { class: 'ala-sec' }, h('h3', {}, title), h('small', {}, String(count))), ...items.map(e => wcard(e, kind))] : [];
        const parts = [];
        if (!isM) { const w = weekStrip(cur); if (w) parts.push(h('div', { class: 'ala-sec' }, h('h3', {}, 'This week')), w); }
        parts.push(...sec(isM ? 'Keep reading' : 'New for you', fresh.length, fresh));
        parts.push(...sec(isM ? 'Reading' : 'Airing next', soon.length, soon));
        parts.push(...sec(isM ? 'Your list' : 'Continue watching', rest.length, rest));
        if (!cur.length) parts.push(h('div', { class: 'ala-empty' }, h('b', {}, isM ? 'Nothing being read' : 'Nothing being watched'), 'Find something in Search and tap Watch.', h('br'), h('br'),
          h('button', { class: 'ala-btn ala-pri', onclick: () => showTab('search') }, ic('search'), 'Search')));
        if (plan.length) {
          parts.push(h('div', { class: 'ala-sec' }, h('h3', {}, 'Planning'), h('small', {}, String(plan.length)),
            h('button', { class: 'ala-chip on', onclick: () => { showPlan = !showPlan; render(L); } }, showPlan ? 'Hide' : 'Show')));
          if (showPlan) parts.push(...plan.slice(0, 60).map(e => wcard(e, 'plan')));
        }
        pad.replaceChildren(...parts);
      }
      pad.addEventListener('click', async ev => {
        const p = ev.target.closest('[data-plus],[data-start]');
        if (!p) return;
        ev.stopPropagation();
        const e = entriesById.get(+(p.getAttribute('data-plus') || p.getAttribute('data-start')));
        if (!e) return;
        p.disabled = true;
        try { await saveProgress(e, p.hasAttribute('data-start') ? 0 : e.progress + 1, { quiet: p.hasAttribute('data-start') }); if (p.hasAttribute('data-start')) toast('Moved to ' + stName('CURRENT', e.media.type) + ' ▶'); }
        catch (err) { toast(err.message); }
        render(lists[cfg.wtype]);
      }, true);
      async function load(force) {
        if (!signedIn()) { pad.replaceChildren(signInBox('your list')); return; }
        const t = cfg.wtype;
        if (lists[t]) render(lists[t]); else pad.replaceChildren(h('div', { class: 'ala-spin' }));
        try { const L = await loadList(t, force); if (t === cfg.wtype) render(L); }
        catch (e) { if (!lists[t]) pad.replaceChildren(h('div', { class: 'ala-empty' }, h('b', {}, 'Could not load your list'), e.message)); else toast(e.message); }
      }
      refresh.addEventListener('click', () => load(true));
      pullToRefresh(sh.scroll, () => load(true));
      listListeners.add((t, stale) => {
        if (t !== cfg.wtype || !lists[t]) return;
        if (stale) { if (S.open && S.tab === 'watch') load(true); } else render(lists[t]);
      });
      // countdowns stay current while you look (one timer, every 30 s)
      setInterval(() => {
        if (!S.open || S.tab !== 'watch' || document.hidden) return;
        for (const x of pad.querySelectorAll('[data-air]')) x.textContent = x.textContent.replace(/in .*$/, 'in ' + left(+x.getAttribute('data-air')));
      }, 30e3);
      return { el: sh.el, scroll: sh.scroll, show() { load(false); }, refresh() { return load(true); } };
    };

    // ---- Search: anime / manga / people, add to Planning or Watching in one tap ----
    SCREENS.search = function () {
      const sh = screenShell('Search');
      const input = h('input', { type: 'search', placeholder: 'Anime, manga or people…', enterkeyhint: 'search', autocomplete: 'off' });
      const clear = h('button', { class: 'ala-ib', style: 'width:28px;height:28px;background:transparent', hidden: true, 'aria-label': 'Clear' }, ic('close'));
      sh.head.querySelector('.ala-hrow').replaceWith(h('div', { class: 'ala-search' }, ic('search'), input, clear));
      const seg = h('div', { class: 'ala-seg' });
      sh.head.appendChild(seg);
      const pad = h('div', { class: 'ala-pad' });
      sh.scroll.appendChild(pad);
      const types = [['ANIME', 'Anime'], ['MANGA', 'Manga'], ['USERS', 'People']];
      function paintSeg() { seg.replaceChildren(...types.map(([k, l]) => h('button', { class: cfg.stype === k ? 'on' : '', onclick: () => { cfg.stype = k; saveCfg(); paintSeg(); run(); } }, l))); }
      paintSeg();
      let gen = 0, timer = 0;
      input.addEventListener('input', () => { clear.hidden = !input.value; clearTimeout(timer); timer = setTimeout(run, 380); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(timer); run(); input.blur(); } });
      clear.addEventListener('click', () => { input.value = ''; clear.hidden = true; run(); input.focus(); });
      const byMedia = new Map();
      function statusChip(m) {
        const e = m.mediaListEntry;
        if (!signedIn()) return null;
        if (e) {
          const c = ST[e.status] ? ST[e.status][2] : '#888';
          return h('div', { class: 'ala-mbtns' }, h('button', { class: 'ala-stchip', 'data-media': m.id, style: 'background:' + c + '26;color:' + c }, ic('check'), stName(e.status, m.type)));
        }
        return h('div', { class: 'ala-mbtns' },
          h('button', { class: 'ala-btn ala-pri', 'data-add': m.id, 'data-st': 'CURRENT' }, m.type === 'MANGA' ? '▶ Read' : '▶ Watch'),
          h('button', { class: 'ala-btn', 'data-add': m.id, 'data-st': 'PLANNING' }, '+ Plan'));
      }
      function mrow(m) {
        byMedia.set(m.id, m);
        const meta = [m.format && m.format.replace(/_/g, ' '), m.seasonYear, m.episodes ? m.episodes + ' eps' : m.chapters ? m.chapters + ' ch' : '', m.averageScore ? '★ ' + (m.averageScore / 10).toFixed(1) : ''].filter(Boolean).join(' · ');
        return h('div', { class: 'ala-mr', 'data-media': m.id, 'data-row': m.id },
          h('div', { class: 'ala-cover', style: bg(m.coverImage && m.coverImage.medium) }),
          h('div', { class: 'ala-wi' }, h('div', { class: 'ala-wt' }, m.title.userPreferred), h('div', { class: 'ala-wm' }, meta),
            m.nextAiringEpisode ? h('div', { class: 'ala-wm' }, h('span', { class: 'ala-tag soon' }, 'Ep ' + m.nextAiringEpisode.episode + ' in ' + left(m.nextAiringEpisode.airingAt))) : null),
          statusChip(m));
      }
      function gtile(m) {
        byMedia.set(m.id, m);
        const e = m.mediaListEntry;
        return h('div', { class: 'ala-gi', 'data-media': m.id },
          h('div', { class: 'ala-cover', style: bg(m.coverImage && (m.coverImage.large || m.coverImage.medium)) }),
          e ? h('b', { class: 'ala-gst', style: 'background:' + (ST[e.status] ? ST[e.status][2] : '#888') }, stName(e.status, m.type)) : null,
          h('span', {}, m.title.userPreferred));
      }
      pad.addEventListener('click', async ev => {
        const b = ev.target.closest('[data-add]');
        if (!b) return;
        ev.stopPropagation();
        const id = +b.getAttribute('data-add'), s = b.getAttribute('data-st');
        b.disabled = true;
        try {
          const d = await gql('mutation AlaSave($mid:Int,$s:MediaListStatus){SaveMediaListEntry(mediaId:$mid,status:$s){id status progress}}', { mid: id, s });
          const m = byMedia.get(id);
          if (m) { m.mediaListEntry = d.SaveMediaListEntry; const row = pad.querySelector('[data-row="' + id + '"]'); if (row) row.replaceWith(mrow(m)); }
          buzz(); toast((s === 'PLANNING' ? 'Added to Planning' : 'Now ' + stName('CURRENT', m && m.type).toLowerCase()) + ' ✓', 'Edit', () => mediaSheet(id));
          listChanged(m && m.type, true);
        } catch (e) { b.disabled = false; toast(e.message); }
      }, true);
      async function discover(g) {
        const type = cfg.stype;
        const month = new Date().getMonth();
        const season = ['WINTER', 'WINTER', 'SPRING', 'SPRING', 'SPRING', 'SUMMER', 'SUMMER', 'SUMMER', 'FALL', 'FALL', 'FALL', 'WINTER'][month];
        const year = new Date().getFullYear() + (month === 11 ? 1 : 0);
        const q = type === 'ANIME'
          ? `query AlaDiscover($s:MediaSeason,$y:Int){a:Page(perPage:12){media(type:ANIME,sort:TRENDING_DESC,isAdult:false){${MF}}} b:Page(perPage:12){media(type:ANIME,season:$s,seasonYear:$y,sort:POPULARITY_DESC,isAdult:false){${MF}}}}`
          : `query AlaDiscover{a:Page(perPage:12){media(type:MANGA,sort:TRENDING_DESC,isAdult:false){${MF}}} b:Page(perPage:12){media(type:MANGA,status:RELEASING,sort:POPULARITY_DESC,isAdult:false){${MF}}}}`;
        pad.replaceChildren(h('div', { class: 'ala-spin' }));
        const d = await gql(q, type === 'ANIME' ? { s: season, y: year } : {});
        if (g !== gen) return;
        pad.replaceChildren(
          h('div', { class: 'ala-sec' }, h('h3', {}, 'Trending now')), h('div', { class: 'ala-grid' }, ((d.a && d.a.media) || []).map(gtile)),
          h('div', { class: 'ala-sec' }, h('h3', {}, type === 'ANIME' ? 'Popular this season' : 'Popular releasing')), h('div', { class: 'ala-grid' }, ((d.b && d.b.media) || []).map(gtile)));
      }
      async function run() {
        const g = ++gen;
        const q = input.value.trim();
        try {
          if (cfg.stype === 'USERS') {
            if (q.length < 2) { pad.replaceChildren(h('div', { class: 'ala-empty' }, h('b', {}, 'Find people'), 'Type a name to follow someone.')); return; }
            pad.replaceChildren(h('div', { class: 'ala-spin' }));
            const d = await gql(`query AlaUsers($q:String){Page(perPage:25){users(search:$q){${U} isFollower}}}`, { q });
            if (g !== gen) return;
            const us = (d.Page && d.Page.users) || [];
            pad.replaceChildren(us.length ? h('div', { class: 'ala-about', style: 'padding:4px 8px' }, us.map(userRow)) : h('div', { class: 'ala-empty' }, 'Nobody found.'));
            return;
          }
          if (q.length < 2) return discover(g);
          pad.replaceChildren(h('div', { class: 'ala-spin' }));
          const d = await gql(`query AlaSearch($q:String,$t:MediaType){Page(perPage:25){media(search:$q,type:$t,sort:[SEARCH_MATCH,POPULARITY_DESC],isAdult:false){${MF}}}}`, { q, t: cfg.stype });
          if (g !== gen) return;
          const ms = (d.Page && d.Page.media) || [];
          pad.replaceChildren(...(ms.length ? ms.map(mrow) : [h('div', { class: 'ala-empty' }, 'Nothing found for “' + q + '”.')]));
        } catch (e) { if (g === gen) pad.replaceChildren(h('div', { class: 'ala-empty' }, h('b', {}, 'Could not search'), e.message)); }
      }
      listListeners.add(() => { if (!(S.open && S.tab === 'search')) stale = true; });
      let first = true, stale = false;
      return { el: sh.el, scroll: sh.scroll, show() { if (first || stale) { first = false; stale = false; run(); } if (!input.value) return; }, refresh: run };
    };
    function userRow(u) {
      return h('div', { class: 'ala-ur', 'data-name': u.name },
        h('a', { class: 'ala-avatar', href: '/user/' + encodeURIComponent(u.name) + '/', 'data-user': u.id, 'data-name': u.name, style: bg(u.avatar && u.avatar.medium) }),
        h('div', { class: 'ala-who', 'data-user': u.id, 'data-name': u.name }, h('span', { class: 'ala-name' }, u.name), u.isFollower ? h('span', { class: 'ala-time' }, 'Follows you') : null),
        followBtn(u));
    }

    // ---- Alerts: notifications with pictures, grouped likes, follow back ----
    const NOTE_Q = `query AlaAlerts($page:Int,$types:[NotificationType],$reset:Boolean){Page(page:$page,perPage:30){pageInfo{hasNextPage} notifications(type_in:$types,resetNotificationCount:$reset){
      ... on AiringNotification{id type createdAt episode media{id type title{userPreferred} coverImage{medium}}}
      ... on FollowingNotification{id type createdAt user{${U}}}
      ... on ActivityMessageNotification{id type createdAt activityId user{${U}}}
      ... on ActivityMentionNotification{id type createdAt activityId user{${U}}}
      ... on ActivityReplyNotification{id type createdAt activityId user{${U}}}
      ... on ActivityReplySubscribedNotification{id type createdAt activityId user{${U}}}
      ... on ActivityLikeNotification{id type createdAt activityId user{${U}}}
      ... on ActivityReplyLikeNotification{id type createdAt activityId user{${U}}}
      ... on ThreadCommentMentionNotification{id type createdAt commentId thread{id title} user{${U}}}
      ... on ThreadCommentReplyNotification{id type createdAt commentId thread{id title} user{${U}}}
      ... on ThreadCommentSubscribedNotification{id type createdAt commentId thread{id title} user{${U}}}
      ... on ThreadCommentLikeNotification{id type createdAt commentId thread{id title} user{${U}}}
      ... on ThreadLikeNotification{id type createdAt thread{id title} user{${U}}}
      ... on RelatedMediaAdditionNotification{id type createdAt media{id type title{userPreferred} coverImage{medium}}}
      ... on MediaDataChangeNotification{id type createdAt reason media{id type title{userPreferred} coverImage{medium}}}
      ... on MediaMergeNotification{id type createdAt deletedMediaTitles media{id type title{userPreferred} coverImage{medium}}}
      ... on MediaDeletionNotification{id type createdAt deletedMediaTitle}}}}`;
    const NOTE_KINDS = {
      all: null,
      likes: ['ACTIVITY_LIKE', 'ACTIVITY_REPLY_LIKE', 'THREAD_LIKE', 'THREAD_COMMENT_LIKE'],
      replies: ['ACTIVITY_REPLY', 'ACTIVITY_REPLY_SUBSCRIBED', 'THREAD_COMMENT_REPLY', 'THREAD_SUBSCRIBED'],
      msgs: ['ACTIVITY_MESSAGE', 'ACTIVITY_MENTION', 'THREAD_COMMENT_MENTION'],
      follows: ['FOLLOWING'],
      airing: ['AIRING', 'RELATED_MEDIA_ADDITION', 'MEDIA_DATA_CHANGE', 'MEDIA_MERGE', 'MEDIA_DELETION'],
    };
    const KIND_LOOK = { ACTIVITY_LIKE: ['heart', '#ff4f79', 'liked your post'], ACTIVITY_REPLY_LIKE: ['heart', '#ff4f79', 'liked your reply'],
      THREAD_LIKE: ['heart', '#ff4f79', 'liked your forum thread'], THREAD_COMMENT_LIKE: ['heart', '#ff4f79', 'liked your comment'],
      ACTIVITY_REPLY: ['chat', '#3db4f2', 'replied to your post'], ACTIVITY_REPLY_SUBSCRIBED: ['chat', '#3db4f2', 'replied to a post you follow'],
      THREAD_COMMENT_REPLY: ['chat', '#3db4f2', 'replied to your comment'], THREAD_SUBSCRIBED: ['forum', '#3db4f2', 'commented in a thread you follow'],
      ACTIVITY_MESSAGE: ['chat', '#c063ff', 'sent you a message'], ACTIVITY_MENTION: ['at', '#c063ff', 'mentioned you'], THREAD_COMMENT_MENTION: ['at', '#c063ff', 'mentioned you in'],
      FOLLOWING: ['user', '#4cca51', 'started following you'], AIRING: ['play', '#f5a524', ''], RELATED_MEDIA_ADDITION: ['plus', '#f5a524', ''],
      MEDIA_DATA_CHANGE: ['film', '#677b94', ''], MEDIA_MERGE: ['film', '#677b94', ''], MEDIA_DELETION: ['trash', '#677b94', ''] };
    function snipMd(md) {
      return String(md || '').replace(/img\d*%?\s*\([^)]*\)/gi, ' 🖼 ').replace(/webm\s*\([^)]*\)/gi, ' 🎞 ').replace(/youtube\s*\([^)]*\)/gi, ' ▶ ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/~!|!~|~~~|__|\*\*|~~|`|#+ /g, '').replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (m, n) => { try { return String.fromCodePoint(+n); } catch (e) { return m; } }).replace(/\s+/g, ' ').trim().slice(0, 140);
    }
    const firstImg = md => { const m = /img\d*%?\s*\(\s*(https:[^)\s]+)\)/i.exec(md || ''); return m ? m[1] : ''; };

    SCREENS.alerts = function () {
      const readAll = h('button', { class: 'ala-ib', 'aria-label': 'Refresh' }, ic('refresh'));
      const sh = screenShell('Notifications', readAll);
      const chips = h('div', { class: 'ala-chips' });
      sh.head.appendChild(chips);
      const pad = h('div', { class: 'ala-pad' });
      const more = h('div', { class: 'ala-more' });
      sh.scroll.append(pad, more);
      const labels = [['all', 'All'], ['likes', 'Likes'], ['replies', 'Replies'], ['msgs', 'Messages & mentions'], ['follows', 'Follows'], ['airing', 'Airing']];
      function paintChips() { chips.replaceChildren(...labels.map(([k, l]) => h('button', { class: 'ala-chip' + (cfg.alerts === k ? ' on' : ''), onclick: () => { cfg.alerts = k; saveCfg(); paintChips(); reset(); } }, l))); }
      paintChips();
      let page = 0, next = true, busy = false, gen = 0, unreadLeft = 0, lastDay = '';
      const groups = new Map(); // activity id -> like row (likes on the same post become one row)
      const acts = new Map();
      async function previews(ns) {
        const ids = [...new Set(ns.filter(n => n.activityId && !acts.has(n.activityId)).map(n => n.activityId))].slice(0, 50);
        if (!ids.length) return;
        try {
          const d = await gql(`query AlaActs($ids:[Int]){Page(perPage:50){activities(id_in:$ids){
            ... on TextActivity{id text} ... on ListActivity{id status progress media{id title{userPreferred} coverImage{medium}}} ... on MessageActivity{id message}}}}`, { ids });
          for (const a of (d.Page && d.Page.activities) || []) if (a) acts.set(a.id, a);
        } catch (e) {}
      }
      function dayOf(sec) {
        const d = now() - sec;
        return d < 86400 ? 'Today' : d < 2 * 86400 ? 'Yesterday' : d < 7 * 86400 ? 'This week' : 'Earlier';
      }
      function row(n, isUnread) {
        const look = KIND_LOOK[n.type] || ['bell', '#677b94', ''];
        const u = n.user;
        const a = n.activityId && acts.get(n.activityId);
        let thumb = null, snip = '', target = null, title = null;
        if (a && a.media) { thumb = a.media.coverImage && a.media.coverImage.medium; snip = String(a.status || '').replace(/^./, c => c.toUpperCase()) + (a.progress ? ' ' + a.progress : '') + ' · ' + a.media.title.userPreferred; }
        else if (a) { const md = a.text || a.message || ''; thumb = firstImg(md); snip = snipMd(md); }
        if (n.activityId) target = '/activity/' + n.activityId;
        if (n.thread) { title = n.thread.title; target = '/forum/thread/' + n.thread.id + (n.commentId ? '/comment/' + n.commentId : ''); }
        if (n.media) { thumb = n.media.coverImage && n.media.coverImage.medium; }
        let text;
        if (n.type === 'AIRING') text = [h('span', {}, 'Episode ' + n.episode + ' of '), h('b', {}, n.media.title.userPreferred), h('span', {}, ' is out')];
        else if (n.type === 'RELATED_MEDIA_ADDITION') text = [h('b', {}, n.media.title.userPreferred), h('span', {}, ' was added to AniList')];
        else if (n.type === 'MEDIA_DATA_CHANGE') text = [h('b', {}, n.media.title.userPreferred), h('span', {}, ' was updated' + (n.reason ? ': ' + n.reason : ''))];
        else if (n.type === 'MEDIA_MERGE') text = [h('b', {}, n.media.title.userPreferred), h('span', {}, ' was merged with ' + (n.deletedMediaTitles || []).join(', '))];
        else if (n.type === 'MEDIA_DELETION') text = [h('b', {}, n.deletedMediaTitle || 'A title'), h('span', {}, ' was removed from AniList')];
        else text = [h('b', { class: 'ala-who-n' }, u ? u.name : 'Someone'), h('span', { class: 'ala-who-x' }, ''), h('span', {}, ' ' + look[2] + (title ? ' ' + title : ''))];
        const av = n.media && !u ? h('div', { class: 'ala-avatar', style: bg(thumb) + ';border-radius:10px' }) : h('a', { class: 'ala-avatar', 'data-user': u && u.id, 'data-name': u && u.name, href: u ? '/user/' + encodeURIComponent(u.name) + '/' : '#', style: bg(u && u.avatar && u.avatar.medium) });
        const el = h('div', { class: 'ala-nr' + (isUnread ? ' unread' : ''), 'data-name': u ? u.name : '' },
          h('div', { class: 'ala-nav' }, av, h('i', { class: 'ala-kind', style: 'background:' + look[1] }, ic(look[0], look[0] === 'heart'))),
          h('div', { class: 'ala-nt' }, ...text, snip ? h('div', { class: 'ala-snip' }, snip) : null, h('span', { class: 'ala-time' }, ago(n.createdAt))),
          n.type === 'FOLLOWING' ? followBtn(Object.assign({ isFollower: true }, u)) : (thumb && !(n.media && !u) ? h('div', { class: 'ala-nthumb', style: bg(thumb) }) : null));
        el._n = n; el._users = u ? [u] : [];
        el.addEventListener('click', ev => {
          if (ev.target.closest('button, [data-user]')) return;
          if (n.media && n.type !== 'MEDIA_DELETION') { if (n.type === 'AIRING') mediaSheet(n.media.id); else go('/' + String(n.media.type).toLowerCase() + '/' + n.media.id + '/'); }
          else if (target) go(target);
          else if (u) openProfile({ id: u.id, name: u.name });
        });
        return el;
      }
      function addToGroup(g, n) {
        if (!n.user || g._users.some(x => x.id === n.user.id)) return;
        g._users.push(n.user);
        const us = g._users;
        const who = g.querySelector('.ala-who-x');
        if (who) who.textContent = us.length === 2 ? ' and ' + us[1].name : ' and ' + (us.length - 1) + ' others';
        const nav = g.querySelector('.ala-nav');
        if (nav && !nav.querySelector('.ala-stack')) { const k = nav.querySelector('.ala-kind'); if (k) k.remove(); nav.appendChild(h('i', { class: 'ala-stack', style: bg(us[1].avatar && us[1].avatar.medium) })); }
      }
      async function load() {
        if (busy || !next) return;
        if (!signedIn()) { pad.replaceChildren(signInBox('your notifications')); next = false; return; }
        busy = true;
        const g = gen;
        if (!pad.children.length) pad.appendChild(h('div', { class: 'ala-spin' }));
        try {
          const reset = page === 0;
          if (reset) unreadLeft = unread;
          const d = await gql(NOTE_Q, { page: page + 1, types: NOTE_KINDS[cfg.alerts] || undefined, reset: reset || undefined });
          if (g !== gen) return;
          const pg = d.Page || {};
          const ns = (pg.notifications || []).filter(x => x && x.type);
          await previews(ns);
          if (g !== gen) return;
          if (page === 0) { pad.replaceChildren(); setUnread(0, true); }
          page++; next = !!(pg.pageInfo && pg.pageInfo.hasNextPage) && page < 40;
          const frag = document.createDocumentFragment();
          for (const n of ns) {
            const isUnread = unreadLeft > 0;
            if (unreadLeft > 0) unreadLeft--;
            const likeKey = (n.type === 'ACTIVITY_LIKE' || n.type === 'ACTIVITY_REPLY_LIKE') && n.activityId ? n.type + n.activityId : '';
            if (likeKey && groups.has(likeKey) && now() - n.createdAt < 7 * 86400) { addToGroup(groups.get(likeKey), n); continue; }
            const day = dayOf(n.createdAt);
            if (day !== lastDay) { lastDay = day; frag.appendChild(h('div', { class: 'ala-ngroup' }, day)); }
            const r = row(n, isUnread);
            if (likeKey) groups.set(likeKey, r);
            frag.appendChild(r);
          }
          pad.appendChild(frag);
          if (!pad.children.length) pad.appendChild(h('div', { class: 'ala-empty' }, h('b', {}, 'All quiet'), 'Nothing here yet.'));
        } catch (e) {
          if (g === gen) { if (!page) pad.replaceChildren(h('div', { class: 'ala-empty' }, h('b', {}, 'Could not load'), e.message)); else toast(e.message); }
        } finally { if (g === gen) busy = false; }
      }
      function reset() { gen++; busy = false; page = 0; next = true; lastDay = ''; groups.clear(); pad.replaceChildren(); sh.scroll.scrollTop = 0; return load(); }
      if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) load(); }, { root: sh.scroll, rootMargin: '700px 0px' }).observe(more);
      readAll.addEventListener('click', () => reset());
      pullToRefresh(sh.scroll, reset);
      let loaded = false;
      return { el: sh.el, scroll: sh.scroll, show() { if (!loaded || unread) { loaded = true; reset(); } }, refresh: reset };
    };

    // ---- Profiles (yours = the Me tab; anyone else's opens on top) ----
    function openProfile(u) {
      if (!u || (!u.id && !u.name)) return;
      if (signedIn() && (u.id === me.id || u.name === me.name)) { if (sheetOpen()) closeSheet(true); showTab('me', { push: !S.open }); return; }
      if (sheetOpen()) { if (history.state && history.state.alaSheet) { afterPop = () => openProfile(u); history.back(); return; } closeSheet(true); }
      if (!S.open) showTab(S.tab || 'home', { push: true });
      const p = profileScreen(u, true);
      pushLayer(p);
      p.load();
    }
    const PROFILE_Q = `query AlaUser($id:Int,$name:String){User(id:$id,name:$name){id name avatar{large medium} bannerImage isFollowing isFollower siteUrl options{profileColor}
      statistics{anime{count episodesWatched minutesWatched meanScore} manga{count chaptersRead meanScore}}
      favourites{anime(perPage:12){nodes{id type title{userPreferred} coverImage{medium large}}} characters(perPage:12){nodes{id name{userPreferred} image{medium}}}}}}`;
    function profileScreen(given, layer) {
      let u0 = given;
      const scroll = h('div', { class: 'ala-scroll' });
      const el = h('section', { class: 'ala-scr' }, scroll);
      let feed = null, user = null;
      async function load(force) {
        if (!layer && !signedIn()) { scroll.replaceChildren(h('div', { class: 'ala-pad' }, signInBox('your profile'), settingsLinks())); return; }
        if (!layer) u0 = { id: me.id, name: me.name };
        const cacheKey = 'alapp:c:user:' + (u0.id || u0.name);
        const cached = !force && LS.get(cacheKey, null);
        if (cached && cached.user) render(cached.user, cached.extra, true); else scroll.replaceChildren(h('div', { class: 'ala-banner' }), h('div', { class: 'ala-spin' }));
        try {
          const d = await gql(PROFILE_Q, u0.id ? { id: u0.id } : { name: u0.name });
          const usr = d.User;
          if (!usr) throw new Error('No such user');
          const d2 = await gql(`query AlaUser2($id:Int!){fr:Page(perPage:1){pageInfo{total} followers(userId:$id){id}} fg:Page(perPage:1){pageInfo{total} following(userId:$id){id}}
            w:Page(perPage:15){mediaList(userId:$id,type:ANIME,status_in:[CURRENT,REPEATING],sort:UPDATED_TIME_DESC){progress media{id type title{userPreferred} coverImage{medium large} episodes nextAiringEpisode{episode}}}}
            r:Page(perPage:15){mediaList(userId:$id,type:MANGA,status_in:[CURRENT,REPEATING],sort:UPDATED_TIME_DESC){progress media{id type title{userPreferred} coverImage{medium large} chapters}}}}`, { id: usr.id });
          const extra = { followers: d2.fr && d2.fr.pageInfo && d2.fr.pageInfo.total, following: d2.fg && d2.fg.pageInfo && d2.fg.pageInfo.total,
            watching: (d2.w && d2.w.mediaList) || [], reading: (d2.r && d2.r.mediaList) || [] };
          LS.set(cacheKey, { at: Date.now(), user: usr, extra });
          render(usr, extra, false);
        } catch (e) { if (!cached) scroll.replaceChildren(h('div', { class: 'ala-banner' }, backBtns()), h('div', { class: 'ala-empty' }, h('b', {}, 'Could not load this profile'), e.message)); else toast(e.message); }
      }
      function backBtns() {
        return h('div', { class: 'ala-pbtns' },
          layer ? h('button', { class: 'ala-ib', 'aria-label': 'Back', onclick: () => history.back() }, ic('back')) : h('span'),
          h('div', { style: 'display:flex;gap:8px' },
            h('button', { class: 'ala-ib', 'aria-label': 'Open on AniList', onclick: () => go('/user/' + encodeURIComponent(user ? user.name : u0.name) + '/') }, ic('out')),
            !layer ? h('button', { class: 'ala-ib', 'aria-label': 'App settings', onclick: settingsSheet }, ic('gear')) : null));
      }
      function stat(v, l) { return h('div', { class: 'ala-stat' }, h('b', {}, v), h('span', {}, l)); }
      function carousel(items, kind) {
        return h('div', { class: 'ala-car' }, items.map(x => {
          const m = x.media || x;
          if (kind === 'char') return h('a', { class: 'ala-ci', href: '/character/' + x.id + '/', 'data-go': '/character/' + x.id + '/' }, h('div', { class: 'ala-cover', style: bg(x.image && x.image.medium) }), h('span', {}, x.name.userPreferred));
          const total = m.episodes || m.chapters;
          return h('div', { class: 'ala-ci', 'data-media': m.id }, h('div', { class: 'ala-cover', style: bg(m.coverImage && (m.coverImage.large || m.coverImage.medium)) },
            x.progress != null ? h('b', { class: 'ala-ce' }, (m.type === 'MANGA' ? 'Ch ' : 'Ep ') + x.progress) : null,
            x.progress != null && total ? h('i', { class: 'ala-cp' }, h('b', { style: 'width:' + Math.min(100, x.progress / total * 100) + '%' })) : null),
          h('span', {}, m.title.userPreferred));
        }));
      }
      function render(usr, extra, fromCache) {
        user = usr;
        const self = signedIn() && usr.id === me.id;
        if (!self && usr.isFollowing != null && !following.has(usr.id)) following.set(usr.id, usr.isFollowing);
        const rgb = hexRgb(COLORS[usr.options && usr.options.profileColor] || (usr.options && usr.options.profileColor));
        const a = usr.statistics && usr.statistics.anime || {}, mg = usr.statistics && usr.statistics.manga || {};
        const days = a.minutesWatched ? (a.minutesWatched / 1440).toFixed(1) : '0';
        const parts = [
          h('div', { class: 'ala-banner', style: bg(usr.bannerImage) + (rgb && !usr.bannerImage ? ';background:linear-gradient(135deg,rgb(' + rgb.join(',') + '),var(--a-surf))' : '') }, backBtns()),
          h('div', { class: 'ala-phead', 'data-name': usr.name },
            h('div', { class: 'ala-prow' }, h('div', { class: 'ala-bigav', style: bg(usr.avatar && (usr.avatar.large || usr.avatar.medium)) }), h('span', { class: 'ala-sp' }),
              self ? h('button', { class: 'ala-btn ala-ghost', onclick: () => go('/settings') }, ic('pen'), 'Edit') : followBtn(usr, true)),
            h('div', { class: 'ala-pname' }, usr.name, !self && usr.isFollower ? h('span', { class: 'ala-fy' }, 'Follows you') : null),
            h('div', { class: 'ala-counts' },
              h('button', { onclick: () => followList(usr, 'followers') }, h('b', {}, extra.followers != null ? num(extra.followers) : '–'), 'Followers'),
              h('button', { onclick: () => followList(usr, 'following') }, h('b', {}, extra.following != null ? num(extra.following) : '–'), 'Following')),
            h('div', { class: 'ala-stats' }, stat(num(a.count || 0), 'Anime'), stat(days, 'Days watched'), stat(a.meanScore ? (a.meanScore / 10).toFixed(1) : '–', 'Mean score'),
              stat(num(a.episodesWatched || 0), 'Episodes'), stat(num(mg.count || 0), 'Manga'), stat(num(mg.chaptersRead || 0), 'Chapters')),
            extra.watching.length ? [h('div', { class: 'ala-sec' }, h('h3', {}, 'Watching now'), h('small', {}, String(extra.watching.length))), carousel(extra.watching)] : null,
            extra.reading.length ? [h('div', { class: 'ala-sec' }, h('h3', {}, 'Reading now'), h('small', {}, String(extra.reading.length))), carousel(extra.reading)] : null,
            usr.favourites && usr.favourites.anime && usr.favourites.anime.nodes.length ? [h('div', { class: 'ala-sec' }, h('h3', {}, 'Favourite anime')), carousel(usr.favourites.anime.nodes)] : null,
            usr.favourites && usr.favourites.characters && usr.favourites.characters.nodes.length ? [h('div', { class: 'ala-sec' }, h('h3', {}, 'Favourite characters')), carousel(usr.favourites.characters.nodes, 'char')] : null,
            self ? [h('div', { class: 'ala-sec' }, h('h3', {}, 'Shortcuts')), settingsLinks()] : null,
            !self ? h('div', { style: 'display:flex;gap:8px;margin-top:12px' },
              h('button', { class: 'ala-btn', style: 'flex:1', onclick: () => go('/user/' + encodeURIComponent(usr.name) + '/animelist') }, ic('list'), 'Anime list'),
              h('button', { class: 'ala-btn', style: 'flex:1', onclick: () => go('/user/' + encodeURIComponent(usr.name) + '/mangalist') }, ic('book'), 'Manga list'),
              h('button', { class: 'ala-btn', style: 'flex:1', onclick: () => aboutSheet(usr) }, 'About')) : null,
            h('div', { class: 'ala-sec' }, h('h3', {}, self ? 'Your activity' : 'Activity'))),
        ];
        const keep = feed;
        const pad = h('div', { class: 'ala-pad', style: 'padding-top:0' });
        scroll.replaceChildren(...parts.flat(), pad);
        if (keep) { pad.appendChild(keep.el); return; }
        feed = makeFeed({ kind: 'user', uid: usr.id, scroll, filter: () => 'all' });
        pad.appendChild(feed.el);
        feed.load();
      }
      if (!layer) pullToRefresh(scroll, () => { feed = null; return load(true); });
      return { el, scroll, load, show() { if (!user) load(false); }, refresh() { feed = null; return load(true); } };
    }
    SCREENS.me = function () {
      const p = profileScreen({ id: me && me.id, name: me && me.name }, false);
      return p;
    };
    function settingsLinks() {
      const L = (icon, label, fn) => h('button', { class: 'ala-link', onclick: fn }, ic(icon), label);
      const n = me ? encodeURIComponent(me.name) : '';
      return h('div', { class: 'ala-links' },
        L('list', 'Anime list', () => go('/user/' + n + '/animelist')), L('book', 'Manga list', () => go('/user/' + n + '/mangalist')),
        L('star', 'Favourites', () => go('/user/' + n + '/favorites')), L('users', 'Social', () => go('/user/' + n + '/social')),
        L('forum', 'Forum', () => go('/forum/overview')), L('film', 'Browse', () => go('/search/anime')),
        L('chat', 'Chats', openChats), L('gear', 'App settings', settingsSheet));
    }
    function openChats() {
      const b = document.querySelector('.adm-launch');
      if (b) { if (S.open) { closeScreens(); history.replaceState(st({ ala: null }), ''); } b.click(); return; }
      toast(cfg.mods.dms ? 'Chats start a few seconds after the page loads' : 'Chats are switched off in App settings', cfg.mods.dms ? null : 'Settings', settingsSheet);
    }
    async function aboutSheet(usr) {
      const box = h('div', { class: 'ala-about' }, h('div', { class: 'ala-spin' }));
      openSheet(h('div', {}, h('div', { class: 'ala-stitle', style: 'margin-bottom:10px' }, 'About ' + usr.name), box));
      try {
        const d = await gql('query AlaAbout($id:Int){User(id:$id){about(asHtml:true)}}', { id: usr.id });
        const html = d.User && d.User.about;
        box.replaceChildren(html ? (() => { const x = cleanHtml(html); x.className = 'ala-md'; return x; })() : h('div', { class: 'ala-time' }, 'Nothing written here.'));
      } catch (e) { box.replaceChildren(e.message); }
    }
    async function followList(usr, which) {
      const listEl = h('div', {}, h('div', { class: 'ala-spin' }));
      let page = 0, next = true, busy = false;
      const more = h('button', { class: 'ala-btn', style: 'width:100%;margin-top:8px', hidden: true, onclick: () => load() }, 'Show more');
      openSheet(h('div', {}, h('div', { class: 'ala-stitle', style: 'margin-bottom:6px' }, (which === 'followers' ? 'Followers of ' : 'Followed by ') + usr.name), listEl, more));
      async function load() {
        if (busy || !next) return;
        busy = true;
        try {
          const d = await gql(`query AlaFollows($id:Int!,$page:Int){Page(page:$page,perPage:40){pageInfo{hasNextPage} ${which}(userId:$id,sort:ID_DESC){${U} isFollower}}}`, { id: usr.id, page: page + 1 });
          const pg = d.Page || {};
          if (!page) listEl.replaceChildren();
          page++; next = !!(pg.pageInfo && pg.pageInfo.hasNextPage);
          for (const u of pg[which] || []) listEl.appendChild(userRow(u));
          if (!listEl.children.length) listEl.appendChild(h('div', { class: 'ala-empty' }, 'Nobody yet.'));
          more.hidden = !next;
        } catch (e) { listEl.replaceChildren(h('div', { class: 'ala-empty' }, e.message)); }
        busy = false;
      }
      load();
    }

    // ---------------------------------------------------------------- the list sheet (status, progress, score) for any anime / manga
    async function mediaSheet(id) {
      if (!signedIn()) { toast('Sign in to AniList to keep a list', 'Sign in', () => go('/login')); return; }
      const body = h('div', {}, h('div', { class: 'ala-spin' }));
      openSheet(body);
      let m;
      try {
        const d = await gql(`query AlaMedia($id:Int){Media(id:$id){id type title{userPreferred} coverImage{large medium color} format episodes chapters status averageScore seasonYear
          nextAiringEpisode{episode airingAt} mediaListEntry{id status progress score(format:POINT_100)}}}`, { id });
        m = d.Media;
        if (!m) throw new Error('Not found');
      } catch (e) { body.replaceChildren(h('div', { class: 'ala-empty' }, e.message)); return; }
      const isM = m.type === 'MANGA';
      const total = isM ? m.chapters : m.episodes;
      const e = m.mediaListEntry;
      const st0 = { status: e ? e.status : null, progress: e ? e.progress : 0, score: e ? Math.round((e.score || 0) / 10) : 0 };
      const cur = Object.assign({}, st0);
      const pills = h('div', { class: 'ala-pills' });
      const inp = h('input', { type: 'number', inputmode: 'numeric', min: 0, value: cur.progress });
      const score = h('div', { class: 'ala-score' });
      const save = h('button', { class: 'ala-btn ala-pri' }, e ? 'Save' : 'Add to list');
      function paint() {
        pills.replaceChildren(...['CURRENT', 'PLANNING', 'COMPLETED', 'PAUSED', 'DROPPED', 'REPEATING'].map(s => h('button', { class: 'ala-pill' + (cur.status === s ? ' on' : ''),
          style: cur.status === s ? 'background:' + ST[s][2] : '', onclick: () => { cur.status = s; if (s === 'COMPLETED' && total) { cur.progress = total; inp.value = total; } paint(); } }, stName(s, m.type))));
        score.replaceChildren(...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => h('button', { class: cur.score >= n ? 'on' : '', onclick: () => { cur.score = cur.score === n ? 0 : n; paint(); } }, String(n))));
        save.disabled = !cur.status;
      }
      const setP = v => { v = Math.max(0, total ? Math.min(total, v) : v); cur.progress = v; inp.value = v; if (!cur.status) { cur.status = 'CURRENT'; paint(); } if (total && v === total && cur.status === 'CURRENT') { cur.status = 'COMPLETED'; paint(); } };
      inp.addEventListener('change', () => setP(parseInt(inp.value, 10) || 0));
      const out = aired(m);
      body.replaceChildren(
        h('div', { class: 'ala-shead' }, h('div', { class: 'ala-cover', style: bg(m.coverImage && (m.coverImage.large || m.coverImage.medium)) }),
          h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 'ala-stitle' }, m.title.userPreferred),
            h('div', { class: 'ala-wm' }, [m.format && m.format.replace(/_/g, ' '), m.seasonYear, total ? total + (isM ? ' ch' : ' eps') : '', m.averageScore ? '★ ' + (m.averageScore / 10).toFixed(1) : ''].filter(Boolean).join(' · ')),
            m.nextAiringEpisode ? h('div', { class: 'ala-wm' }, h('span', { class: 'ala-tag soon' }, 'Ep ' + m.nextAiringEpisode.episode + ' in ' + left(m.nextAiringEpisode.airingAt))) : null,
            h('button', { class: 'ala-readmore', style: 'display:inline-block', onclick: () => go('/' + m.type.toLowerCase() + '/' + m.id + '/') }, 'Open page ›'))),
        h('div', { class: 'ala-lab' }, 'Status'), pills,
        h('div', { class: 'ala-lab' }, isM ? 'Chapters read' : 'Episodes watched'),
        h('div', { class: 'ala-step' }, h('button', { onclick: () => setP(cur.progress - 1) }, '−'), inp, h('button', { onclick: () => setP(cur.progress + 1) }, '+'),
          h('span', {}, total ? 'of ' + total : out ? out + ' out' : ''), out && out > cur.progress ? h('button', { style: 'width:auto;padding:0 12px;font-size:13px', onclick: () => setP(out) }, 'All out') : null),
        h('div', { class: 'ala-lab' }, 'Score'), score,
        h('div', { class: 'ala-sfoot' }, e ? h('button', { class: 'ala-btn ala-danger', style: 'flex:0 0 auto', onclick: () => menu([['trash', 'Remove from my list', async () => {
          try { await gql('mutation AlaDelete($id:Int){DeleteMediaListEntry(id:$id){deleted}}', { id: e.id }); toast('Removed from your list'); listChanged(m.type, true); } catch (er) { toast(er.message); }
        }], ['back', 'Keep it', () => {}]]) }, ic('trash')) : null, save));
      paint();
      save.addEventListener('click', async () => {
        save.disabled = true;
        try {
          await gql('mutation AlaSave($mid:Int,$s:MediaListStatus,$p:Int,$sc:Int){SaveMediaListEntry(mediaId:$mid,status:$s,progress:$p,scoreRaw:$sc){id status progress}}',
            { mid: m.id, s: cur.status, p: cur.progress, sc: cur.score * 10 });
          buzz(); hideSheet(); toast(e ? 'Saved ✓' : 'Added to ' + stName(cur.status, m.type) + ' ✓'); listChanged(m.type, true);
        } catch (er) { save.disabled = false; toast(er.message); }
      });
    }

    // ---------------------------------------------------------------- app settings
    function settingsSheet() {
      const body = h('div', {});
      const sw = (on, fn) => h('button', { class: 'ala-sw' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', onclick: fn });
      const opts = (list, val, fn) => h('div', { class: 'ala-opts' }, list.map(([k, l]) => h('button', { class: val === k ? 'on' : '', onclick: () => fn(k) }, l)));
      const row = (title, sub, ctl) => h('div', { class: 'ala-set' }, h('div', {}, h('b', {}, title), sub ? h('small', {}, sub) : null), ctl);
      const MOD = [['dms', 'Chats (AniList DMs)', 'Private message chats with live messages, GIFs and sounds'], ['gif', 'GIF & Picture Picker', 'A GIF button in every comment box, also in the app'],
        ['previews', 'Like Previews', 'Tabs and pictures on AniList\'s own notifications page'], ['chat', 'Chat View', 'Long reply threads open fast, newest first']];
      function paint() {
        const sep = k => document.documentElement.getAttribute('data-ala-' + k) === 'separate';
        body.replaceChildren(
          h('div', { class: 'ala-stitle' }, 'AniList App'), h('div', { class: 'ala-time', style: 'margin-bottom:8px' }, 'Version ' + VERSION + ' · by YoruC'),
          row('App mode', 'Auto = on phones and small windows', opts([['auto', 'Auto'], ['on', 'Always'], ['off', 'Off']], cfg.mode, k => { cfg.mode = k; saveCfg(); paint(); setMode(); })),
          row('Theme', null, opts([['dark', 'Dark'], ['light', 'Light'], ['site', 'Like AniList']], cfg.theme, k => { cfg.theme = k; saveCfg(); paint(); applyTheme(); })),
          row('Colour', 'Empty = your AniList profile colour', h('div', { class: 'ala-opts' }, ['', '#3db4f2', '#c063ff', '#fc9dd6', '#ef881a', '#e13333', '#4cca51', '#f5c542'].map(c =>
            h('button', { class: 'ala-swatch' + (cfg.accent === c ? ' on' : ''), style: 'background:' + (c || 'conic-gradient(#3db4f2,#c063ff,#fc9dd6,#ef881a,#4cca51,#3db4f2)'), 'aria-label': c || 'Profile colour',
              onclick: () => { cfg.accent = c; saveCfg(); paint(); applyTheme(); } })))),
          row('Open the feed when AniList starts', 'Otherwise AniList\'s own home page shows first', sw(cfg.start === 'home', () => { cfg.start = cfg.start === 'home' ? 'site' : 'home'; saveCfg(); paint(); })),
          row('Double-tap a post to like it', null, sw(cfg.dbl, () => { cfg.dbl = !cfg.dbl; saveCfg(); paint(); })),
          row('Vibrate on taps', 'Small buzz on likes and +1', sw(cfg.haptics, () => { cfg.haptics = !cfg.haptics; saveCfg(); paint(); })),
          h('div', { class: 'ala-lab' }, 'Tools inside the app (changes need a page reload)'),
          ...MOD.map(([k, t, s]) => row(t, sep(k) ? 'Your separate ' + t + ' script is running, so the app leaves it to that one' : s, sw(cfg.mods[k], () => { cfg.mods[k] = !cfg.mods[k]; saveCfg(); paint(); }))),
          h('div', { class: 'ala-sfoot' }, h('button', { class: 'ala-btn', onclick: () => location.reload() }, ic('refresh'), 'Reload page'),
            h('button', { class: 'ala-btn ala-pri', onclick: () => hideSheet() }, 'Done')));
      }
      paint();
      openSheet(body);
    }

    // ---------------------------------------------------------------- start
    function start() {
      if (!document.body) return setTimeout(start, 50);
      setMode();
      const mq = [matchMedia('(max-width: 820px)'), matchMedia('(pointer: coarse)')];
      for (const q of mq) (q.addEventListener ? q.addEventListener('change', setMode) : q.addListener(setMode));
      if (!document.documentElement.classList.contains('ala-on')) return;
      loadMe().then(() => {
        if (S.open && S.tab === 'home' && !signedIn()) { /* logged out: the feed falls back to Global */ }
        // warm the Watching list a little later, so that tab opens at once
        if (signedIn()) setTimeout(() => { if (!document.hidden) loadList(cfg.wtype).catch(() => {}); }, 4000);
      });
      // start on the feed (when AniList opens on its home page)
      const s = history.state || {};
      if (s.ala && TABS.some(t => t[0] === s.ala)) showTab(s.ala, { push: false });
      else if (cfg.start === 'home' && /^\/(home\/?)?$/.test(location.pathname) && (signedIn() || localStorage.getItem('auth'))) showTab('home', { push: false });
      setInterval(pollUnread, 60e3);
      setTimeout(pollUnread, 2500);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) pollUnread(); });
    }
    onReady(start);

  }
  function inject() {
    try {
      const s = document.createElement('script');
      s.textContent = '(' + PAGE_PART.toString() + ')();';
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    } catch (e) { console.warn('[AniList App] could not start inside the page', e); }
  }
  // at document-start the page can still be empty: wait for its first element
  if (document.documentElement) inject();
  else {
    const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); inject(); } });
    mo.observe(document, { childList: true });
  }

  // ---------- GIF & Picture Picker (AniList GIF & Picture Picker 1.5.8): stays here, it needs Tampermonkey to reach Tenor / Safebooru / GitHub ----------
  function GIF_PICKER() {
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
    // 1.3.2: Layout switch next to Pick several (shown only while it is ticked): Side by side | Under each other
    //        (was a small tick box in the bottom bar).
    // 1.4.0: YouTube mode (its search page, no login: ~20 videos + Shorts; tap = watch it in the real player first, then
    //        Add to comment -> youtube(link)). Upload several files at once (Layout switch for them). Uploads ALWAYS go
    //        into the comment now: 1.3.x only picked them with Pick several on, and a picker closed during the upload
    //        dropped the link without a word; no comment box left -> the code is copied (GM_setClipboard).
    //        Update notice: when version.json in the repo names a newer version, a dot on the GIF button and a bar in the
    //        picker (glowing Update -> the raw script link -> Tampermonkey's own update page; Later = quiet until the page is reloaded).
    // 1.5.0: Your uploads on the upload screen: everything already in your upload folder (read from the repo, so uploads
    //        from other devices show too), newest first, a name filter; tap = add it again, no new upload. Choosing a file
    //        that is already in the repo (same bytes = same git blob sha) reuses that link instead of uploading a copy.
    // 1.5.1: looks for a new version once an hour (was 6 h) and when the picker opens after that; Tampermonkey menu
    //        "Check for updates now"; version.json + the Update link read refs/heads/main (plain /main/ lags ~5 min).
    // 1.5.2: uploads are signed with the GitHub account's no-reply address (GitHub put its main email on API commits).
    // 1.5.7: AVIF pictures can be uploaded too (GitHub serves .avif as image/avif; Brave / Chrome / Firefox show them).
    // 1.5.8: Spoiler with Under each other: all of them share ONE spoiler, still one per line (it was one spoiler each).
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
      const UP_TYPES = { 'image/gif': 'gif', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/x-m4v': 'm4v' };
      const UP_MAX = 25 * 1048576;
      const PIC_EXT = /\.(gif|png|jpe?g|webp|avif)$/i, VID_EXT = /\.(mp4|webm|m4v)$/i;
      // AniList plays videos with webm( ), which takes mp4 too; browsers play mp4 (H.264) and webm
      const isVideoFile = f => /^video\/(mp4|webm|x-m4v)$/.test(f.type || '') || (!/^image\//.test(f.type || '') && VID_EXT.test(f.name || ''));
      const isPicFile = f => /^image\/(gif|png|jpeg|webp|avif)$/.test(f.type || '') || (!/^video\//.test(f.type || '') && PIC_EXT.test(f.name || ''));

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
        const ext = UP_TYPES[file.type] || (String(file.name).match(/\.(gif|png|jpe?g|webp|avif|mp4|webm|m4v)$/i) || [, 'gif'])[1].toLowerCase().replace('jpeg', 'jpg');
        const base = String(file.name || 'gif').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'gif';
        return base + '-' + Date.now().toString(36) + '.' + ext;
      }

      const encPath = p => p.split('/').map(encodeURIComponent).join('/');
      const rawUrl = (c, path) => 'https://raw.githubusercontent.com/' + c.repo + '/' + encPath(c.branch || 'main') + '/' + encPath(path);

      // the time fileName() put in a name (base 36 ms, maybe followed by a -xxxx retry part); 0 for other names
      function upTime(name) {
        const m = String(name).match(/-([0-9a-z]{8,9})(?:-[0-9a-z]{4})?\.\w+$/);
        const t = m ? parseInt(m[1], 36) : 0;
        return t > 1.5e12 && t < Date.now() + 864e5 ? t : 0;
      }
      // a readable title from a file name: "holo-wink-lzx8k2ab.gif" -> "holo wink"
      const upTitle = name => (upTime(name) ? String(name).replace(/-[0-9a-z]{8,9}(?:-[0-9a-z]{4})?\.\w+$/, '') : String(name).replace(/\.\w+$/, '')).replace(/[-_]+/g, ' ').trim() || name;

      // everything already in the upload folder (whatever device uploaded it), newest first: GIFs / pictures, or videos
      async function ghList(c, video) {
        const dir = ghPath(c);
        const r = await requestFull('https://api.github.com/repos/' + c.repo + '/contents' + (dir ? '/' + encPath(dir) : '') + '?ref=' + encodeURIComponent(c.branch || 'main'), { headers: ghHeaders(c) });
        if (r.status === 404) return []; // the folder is made by the first upload
        if (r.status === 401) throw new Error('GitHub did not accept the token');
        if (r.status !== 200) throw new Error('GitHub answered ' + r.status);
        const j = ghJson(r.text);
        if (!Array.isArray(j)) return [];
        return j.filter(f => f && f.type === 'file' && (video ? VID_EXT : PIC_EXT).test(f.name))
          .map((f, i) => {
            const url = rawUrl(c, f.path);
            return { key: 'up:' + url, src: 'upload', url, full: url, thumb: url, title: upTitle(f.name), gif: /\.gif$/i.test(f.name), video: !!video,
              page: f.html_url || '', bytes: f.size, sha: f.sha, t: upTime(f.name), i };
          })
          .sort((a, b) => b.t - a.t || a.i - b.i);
      }

      // git's blob sha of a file: the same bytes already in the repo have the same sha (so no second upload)
      async function blobSha(file) {
        const body = new Uint8Array(await file.arrayBuffer());
        const head = new TextEncoder().encode('blob ' + body.length + '\0');
        const all = new Uint8Array(head.length + body.length);
        all.set(head); all.set(body, head.length);
        const d = new Uint8Array(await crypto.subtle.digest('SHA-1', all));
        return [...d].map(b => b.toString(16).padStart(2, '0')).join('');
      }

      // GitHub signs API commits with the account's main email, public on every commit: use its no-reply address
      const ghWho = {};
      async function ghCommitter(c) {
        if (!ghWho[c.token]) {
          const r = await requestFull('https://api.github.com/user', { headers: ghHeaders(c) }).catch(() => ({}));
          const j = r.status === 200 ? ghJson(r.text) : {};
          if (j.id && j.login) ghWho[c.token] = { name: j.login, email: j.id + '+' + j.login + '@users.noreply.github.com' };
        }
        return ghWho[c.token];
      }

      // Big uploads go straight from the page to api.github.com (GitHub allows that from any site), not through
      // Tampermonkey: in Brave its cross-site request crawled with big files (3.7 MB: 40 s+, while the same send from
      // the PC took 2.7 s - 2026-11-04). If the browser refuses the direct send, Tampermonkey's request is used as before.
      async function ghSend(url, o) {
        if (typeof fetch === 'function' && typeof AbortController === 'function') {
          const ac = new AbortController();
          const timer = setTimeout(() => ac.abort(), o.timeout || 20000);
          let res;
          const t0 = Date.now();
          try {
            res = await fetch(url, { method: o.method || 'GET', headers: o.headers, body: o.data, signal: ac.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
          } catch (e) {
            clearTimeout(timer);
            if (e && e.name === 'AbortError') throw new Error('timed out');
            res = null; // blocked (CORS / site rules / extension): Tampermonkey's way below
            upLog.directFail = (e && (e.name + ': ' + e.message)) || 'failed';
            upLog.directFailMs = Date.now() - t0;
          }
          if (res) {
            try { const text = await res.text(); upLog.via = 'direct'; return { status: res.status, text }; } finally { clearTimeout(timer); }
          }
        }
        upLog.via = 'tampermonkey';
        return requestFull(url, o);
      }
      // how long each step of the last upload took (Exos: "find it"): kept in this site's storage as gp-lastUpload
      let upLog = {};
      const upMark = (k, t0) => { upLog[k] = (upLog[k] || 0) + (Date.now() - t0); };
      function upLogSave(extra) {
        try {
          const all = JSON.parse(localStorage.getItem('gp-lastUploads') || '[]');
          all.unshift(Object.assign({ at: new Date().toISOString(), version: typeof GM_info !== 'undefined' && GM_info && GM_info.script ? GM_info.script.version : '' }, upLog, extra));
          localStorage.setItem('gp-lastUploads', JSON.stringify(all.slice(0, 10)));
        } catch (e) { /* storage full / off: only the console line */ }
        try { console.info('[GIF Picker] upload timing (ms)', Object.assign({}, upLog, extra)); } catch (e) {}
      }

      // base64 of a file -> its raw.githubusercontent.com link
      async function ghUpload(c, name, b64) {
        const dir = ghPath(c);
        let t0 = Date.now();
        const who = await ghCommitter(c);
        upMark('lookupMs', t0);
        for (let tries = 0; tries < 2; tries++) {
          t0 = Date.now();
          const path = (dir ? dir + '/' : '') + (tries ? name.replace(/(\.\w+)$/, '-' + Math.random().toString(36).slice(2, 6) + '$1') : name);
          const r = await ghSend('https://api.github.com/repos/' + c.repo + '/contents/' + path.split('/').map(encodeURIComponent).join('/'), {
            // 3 min, + 10 s per MB: a slow GitHub can take minutes and still save the file
            method: 'PUT', headers: ghHeaders(c), timeout: 180000 + Math.round(b64.length * 0.75 / 1048576) * 10000,
            data: JSON.stringify({ message: 'Add ' + path.split('/').pop() + ' (AniList GIF Picker)', content: b64, branch: c.branch || undefined, committer: who }),
          });
          upMark('sendMs', t0);
          upLog.status = r.status;
          const j = ghJson(r.text);
          if (r.status === 201 || r.status === 200) return rawUrl(c, path);
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
      // - Under each other shares one spoiler too: a line break inside it stays a <br> (AniList: p(img br img), 2026-11-05);
      // - pictures too wide to sit next to each other (Original GIFs are ~500 px, a comment ~620) get a share of the
      //   row instead: 2 per row (also for 4), else 3 per row, at 49 % / 32 % (46 % / 30 % inside a spoiler's padding).
      function aniCode(urls, o) {
        const items = [].concat(urls).map(u => (typeof u === 'object' ? u : { url: u }));
        const side = o.side !== false && items.length > 1;
        const pics = items.filter(it => !it.video && !it.yt).length;
        let tag = sizeTag(o);
        if (side && pics > 1) {
          const per = pics <= 3 ? pics : pics === 4 ? 2 : 3;
          const fit = Math.floor(100 / per) - (o.spoiler ? 3 : 1);
          const m = tag.match(/^img(\d+)(%?)$/);
          const fits = m && (m[2] ? +m[1] <= fit : per * +m[1] + 6 * (per - 1) <= 560);
          if (!fits) tag = 'img' + fit + '%';
        }
        // a YouTube video is youtube(link): a full-width player, so it always gets a line of its own
        const one = it => (it.yt ? 'youtube(' : it.video ? 'webm(' : tag + '(') + safeUrl(it.url) + ')';
        let all;
        if (side) {
          all = items.map((it, i) => (i ? (it.yt || items[i - 1].yt ? '\n' : ' ') : '') + one(it)).join('');
        }
        else all = items.map(one).join('\n');
        if (o.spoiler) all = '~!' + all + '!~';
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

      // ---------- YouTube (no login: its normal search page carries the results as JSON, ytInitialData) ----------
      const ytUrl = (id, short) => (short ? 'https://www.youtube.com/shorts/' : 'https://www.youtube.com/watch?v=') + id;
      const ytText = x => (x && (x.simpleText || (x.runs || []).map(r => r.text).join(''))) || '';
      function parseYouTube(html) {
        const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s) || html.match(/ytInitialData"\]\s*=\s*(\{.*?\});/s);
        if (!m) return [];
        let d;
        try { d = JSON.parse(m[1]); } catch (e) { return []; }
        const out = [], seen = new Set();
        const add = it => { if (it.id && /^[\w-]{11}$/.test(it.id) && !seen.has(it.id)) { seen.add(it.id); out.push(it); } };
        (function walk(o) {
          if (!o || typeof o !== 'object') return;
          if (o.videoRenderer) {
            const v = o.videoRenderer;
            add({ id: v.videoId, title: ytText(v.title), len: ytText(v.lengthText), by: ytText(v.ownerText), views: ytText(v.shortViewCountText || v.viewCountText), when: ytText(v.publishedTimeText) });
          } else if (o.shortsLockupViewModel) {
            const s = o.shortsLockupViewModel;
            const ep = s.onTap && s.onTap.innertubeCommand && s.onTap.innertubeCommand.reelWatchEndpoint;
            const title = (s.overlayMetadata && s.overlayMetadata.primaryText && s.overlayMetadata.primaryText.content) || String(s.accessibilityText || '').replace(/, [\d.,]+\s*\w* views.*$/, '');
            if (ep) add({ id: ep.videoId, title, short: true, len: 'Short' });
          }
          for (const k in o) if (k !== 'videoRenderer' && k !== 'shortsLockupViewModel') walk(o[k]);
        })(d);
        return out.map(v => ({
          key: 'yt:' + v.id, src: 'youtube', yt: true, ytId: v.id, url: ytUrl(v.id, v.short), full: ytUrl(v.id, v.short), page: ytUrl(v.id, v.short),
          thumb: 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg', title: v.title, len: v.len, short: !!v.short,
          by: [v.by, v.views, v.when].filter(Boolean).join(' · '),
        }));
      }
      const youtube = {
        id: 'youtube', name: 'YouTube', short: 'YT', gif: false, picture: false, yt: true,
        async fetch(st, s) {
          s.more = false; // the page holds ~20 videos + Shorts; YouTube loads more only through its own app
          return parseYouTube(await request('https://www.youtube.com/results?search_query=' + encodeURIComponent(st.q)));
        },
      };
      // a YouTube link (watch / youtu.be / shorts / embed) -> its 11-character id
      const ytIdOf = u => (String(u).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/) || [])[1] || '';

      tenor.booru = false; safebooru.booru = true; konachan.booru = true;
      const SOURCES = [tenor, safebooru, konachan, youtube];

      if (TEST) { TEST.api = { parseYouTube, ytIdOf, request, requestFull, ghCheck, ghUpload, ghList, blobSha, upTime, upTitle, fileName, ghConf, isVideoFile, isPicFile, parseTenor, tenorMoreTerms, resolveTags, tagCount, SOURCES, aniCode, sizeTag, safeUrl, wordsOf, objectAt }; return; }

      // ---------- settings ----------
      const S = Object.assign({
        mode: 'gif', size: 'img', px: 350, spoiler: false, center: false, keepOpen: false, multi: false, side: true, lastQ: '',
        on: { tenor: true, safebooru: true, konachan: true, youtube: true },
      }, store.get('settings', {}) || {});
      S.on = Object.assign({ tenor: true, safebooru: true, konachan: true, youtube: true }, S.on || {});
      const saveSettings = () => store.set('settings', S);
      let recent = store.get('recent', []) || [];
      // Your uploads, as last read from GitHub (per repo / branch / folder / kind; read again after a minute or an upload)
      const upCache = {};
      const upKey = (c, video) => [c.repo, c.branch, ghPath(c), video ? 'v' : 'p'].join('|');
      function upList(c, video) {
        const k = upKey(c, video), x = upCache[k];
        if (x && Date.now() - x.at < 60000) return x.list;
        const list = ghList(c, video);
        upCache[k] = { at: Date.now(), list };
        list.catch(() => { if (upCache[k] && upCache[k].list === list) delete upCache[k]; });
        return list;
      }

      // ---------- styles ----------
      const css = `
      .markdown-editor.gp-has { grid-template-columns: repeat(16, 1fr); }
      @media (max-width: 500px) { .markdown-editor.gp-has { grid-template-columns: repeat(8, 1fr); } }
      .markdown-editor > .gp-btn.gp-new { position: relative; }
      .markdown-editor > .gp-btn.gp-new::after { content: ''; position: absolute; right: -5px; top: -5px; width: 8px; height: 8px; border-radius: 50%;
        background: rgb(232, 93, 117); box-shadow: 0 0 0 2px rgb(var(--color-foreground, 250,250,250)); }
      .gp-upd { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 10px; border-radius: 6px; font-size: 12.5px;
        background: rgba(var(--bl), .12); border: 1px solid rgba(var(--bl), .35); }
      .gp-upd .txt { flex: 1 1 200px; min-width: 0; }
      .gp-upd .gp-b { height: 30px; }
      .gp-glow { animation: gp-glow 1.1s ease-in-out infinite; }
      @keyframes gp-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(var(--bl), .7); filter: brightness(1); }
        50% { box-shadow: 0 0 14px 4px rgba(var(--bl), .75); filter: brightness(1.18); } }
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
      .gp-lay { display: inline-flex; align-items: center; gap: 6px; }
      /* hidden must win over the display: flex of buttons / chips (Upload and add showed with no file chosen) */
      .gp-ov [hidden] { display: none !important; }
      .gp-lay .gp-seg button { height: 28px; padding: 0 10px; font-size: 12px; }
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
      .gp-up .drop .one { display: flex; justify-content: center; max-width: 100%; }
      .gp-up .drop .thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 6px; width: 100%; }
      .gp-up .up-t { position: relative; aspect-ratio: 1; border-radius: 4px; overflow: hidden; background: rgb(var(--bg)); }
      .gp-up .up-t img, .gp-up .up-t video { width: 100%; height: 100%; max-height: none; object-fit: cover; display: block; border-radius: 0; }
      .gp-up .up-t .rm { position: absolute; right: 3px; top: 3px; width: 26px; height: 26px; border-radius: 50%; border: 0; background: rgba(0,0,0,.65);
        color: #fff; font-size: 16px; line-height: 1; cursor: pointer; padding: 0; }
      .gp-up .gp-lay { align-self: flex-start; font-size: 12px; }
      .gp-grid.gp-ytgrid { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
      .gp-tile.yt { aspect-ratio: 16 / 9; }
      .gp-tile .ytlen { position: absolute; right: 4px; top: 4px; font-size: 11px; font-weight: 700; background: rgba(0,0,0,.75); color: #fff;
        border-radius: 3px; padding: 2px 5px; pointer-events: none; z-index: 2; }
      .gp-tile .yttitle { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 44px 6px 8px; font-size: 12px; font-weight: 700; line-height: 1.3;
        color: #fff; background: linear-gradient(transparent, rgba(0,0,0,.85)); pointer-events: none; z-index: 1; display: -webkit-box;
        -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .gp-view .pic iframe { width: min(100%, 960px); aspect-ratio: 16 / 9; height: auto; max-height: 100%; border: 0; border-radius: 6px; background: #000; }
      .gp-view .pic iframe.short { aspect-ratio: 9 / 16; width: auto; height: 100%; }
      .gp-up .gp-kind { align-self: flex-start; }
      .gp-up .gp-mine { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 6px; }
      .gp-up .mine-h { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; padding-top: 14px; border-top: 1px solid rgba(var(--tx), .15); }
      .gp-up .mine-h h3 { flex: 1 1 auto; }
      .gp-up .mine-h .n { font-weight: 400; opacity: .7; font-size: 13px; }
      .gp-up .gp-q.find { flex: 1 1 100%; height: 34px; font-size: 14px; }
      .gp-up .upbar { position: sticky; bottom: 0; display: flex; justify-content: flex-end; padding: 8px 0 max(4px, env(safe-area-inset-bottom)); background: rgb(var(--fg)); }
      .gp-up .upbar[hidden] { display: none; }
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
      .gp-empty { grid-column: 1 / -1; padding: 30px 10px; text-align: center; opacity: .8; line-height: 1.6; }
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

      function toast(msg, ms) {
        const t = el('div', { class: 'gp-toast' }, msg);
        document.body.appendChild(t);
        setTimeout(() => t.remove(), ms || 2600);
      }

      function copyText(text) {
        try { if (typeof GM_setClipboard === 'function') { GM_setClipboard(text, 'text'); return; } } catch (e) {}
        try { navigator.clipboard.writeText(text); } catch (e) {}
      }

      // ---------- update notice: a bar in the picker + a dot on the GIF button; nothing installs by itself ----------
      // version.json in the repo says the newest version; Update opens the script's raw link, which Tampermonkey turns
      // into its own Update page (one more click). Later = quiet until the page is reloaded.
      // refs/heads/main = the newest commit; plain /main/ can hand out a copy up to 5 minutes old (1.4.0 after a release)
      const RAW = 'https://raw.githubusercontent.com/YoruCAnime/Anilist/refs/heads/main/gif-picker/';
      const MY_VERSION = ''; // inside AniList App: updates come with the app
      const newer = (a, b) => {
        const x = String(a).split('.').map(n => +n || 0), y = String(b).split('.').map(n => +n || 0);
        for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
        return false;
      };
      // Later = quiet on THIS page only: a refresh / new page shows the notice again (1.5.4, Exos: "show after refresh
      // again"; it used to stay quiet until the next version, saved as skipVersion - no longer read)
      let laterFor = '';
      const pendingUpdate = () => {
        const u = store.get('update', {}) || {};
        return MY_VERSION && u.version && newer(u.version, MY_VERSION) && laterFor !== u.version ? u : null;
      };
      function markUpdate() {
        const u = pendingUpdate();
        for (const b of document.querySelectorAll('.gp-btn')) { b.classList.toggle('gp-new', !!u); b.title = u ? 'GIF / picture search (version ' + u.version + ' is out)' : 'GIF / picture search'; }
      }
      // one tiny file at most once an hour (shared by all tabs), in the background: the picker never waits for it.
      // force = the menu's "Check for updates now". Returns the pending update, null, or false (GitHub not reached).
      async function checkUpdate(force) {
        if (!MY_VERSION) return null;
        const u = store.get('update', {}) || {};
        if (force || !(u.at && Date.now() - u.at < 3600e3)) {
          try {
            const j = JSON.parse(await request(RAW + 'version.json'));
            store.set('update', { at: Date.now(), version: String(j.version || ''), notes: String(j.notes || '').slice(0, 300) });
          } catch (e) { store.set('update', Object.assign(u, { at: Date.now() })); if (force) return false; }
        }
        markUpdate();
        return pendingUpdate();
      }
      function showUpdateBar() { // into the open picker, once
        const top = P && P.ov.isConnected && P.ov.querySelector('.gp-top');
        if (!top || top.querySelector('.gp-upd')) return;
        const bar = updateBar();
        if (bar) top.prepend(bar);
      }
      function updateBar() {
        const u = pendingUpdate();
        if (!u) return null;
        const go = el('button', { class: 'gp-b gp-go gp-glow', type: 'button', onclick: () => {
          window.open(RAW + 'anilist-gif-picker.user.js', '_blank', 'noopener');
          toast('Tampermonkey opens its update page: press Update there, then reload your AniList tabs', 9000);
        } }, 'Update');
        setTimeout(() => go.classList.remove('gp-glow'), 6000); // glows for a few seconds, then stays plain
        const bar = el('div', { class: 'gp-upd' },
          el('span', { class: 'txt' }, el('b', {}, 'New version ' + u.version), u.notes ? ': ' + u.notes : ''),
          go,
          el('button', { class: 'gp-b', type: 'button', onclick: () => { laterFor = u.version; bar.remove(); markUpdate(); } }, 'Later'));
        return bar;
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
        const segYt = el('button', { type: 'button' }, 'YouTube');
        const seg = el('div', { class: 'gp-seg' }, segGif, segPic, segYt);
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
        const sizeLabel = el('label', {}, 'Size ', size, px);
        const box = (k, label, after) => {
          const c = el('input', { type: 'checkbox' });
          c.checked = !!S[k];
          c.addEventListener('change', () => { S[k] = c.checked; saveSettings(); if (after) after(); });
          return el('label', {}, c, label);
        };
        // Pick several -> Layout: Side by side (one row, too-wide ones sized to fit 2 or 3 per row) or Under each other
        const laySide = el('button', { type: 'button', title: 'In a row; too-wide ones are sized to fit 2 or 3 per row' }, 'Side by side');
        const layDown = el('button', { type: 'button', title: 'Each on its own line, at the size you picked' }, 'Under each other');
        const layout = el('span', { class: 'gp-lay' }, 'Layout ', el('span', { class: 'gp-seg' }, laySide, layDown));
        const paintLayout = () => {
          layout.hidden = !S.multi;
          laySide.classList.toggle('on', S.side !== false);
          layDown.classList.toggle('on', S.side === false);
        };
        laySide.addEventListener('click', () => { S.side = true; saveSettings(); paintLayout(); });
        layDown.addEventListener('click', () => { S.side = false; saveSettings(); paintLayout(); });
        const multiBox = box('multi', 'Pick several', () => { paintTray(); paintLayout(); });
        paintLayout();
        const trayThumbs = el('div', { class: 'thumbs' });
        const trayAdd = el('button', { class: 'gp-b gp-go', type: 'button', onclick: () => addPicked() });
        const tray = el('div', { class: 'gp-tray', hidden: true },
          trayThumbs,
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
            el('div', { class: 'gp-opts' }, sizeLabel, box('spoiler', 'Spoiler'), box('center', 'Centre'), multiBox, layout, box('keepOpen', 'Keep open after adding')),
            status),
          wrap, tray);
        const ov = el('div', { class: 'gp-ov', onclick: e => { if (e.target === ov) closePicker(); } }, panel);

        const setMode = m => { if (st.mode === m) return; st.mode = S.mode = m; saveSettings(); paintTop(); if (st.q) search(st.q); };
        segGif.addEventListener('click', () => setMode('gif'));
        segPic.addEventListener('click', () => setMode('picture'));
        segYt.addEventListener('click', () => setMode('youtube'));
        q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); search(q.value); } });

        function usable(s) { return st.mode === 'youtube' ? !!s.yt : st.mode === 'gif' ? s.gif : s.picture; }
        function paintTop() {
          segGif.classList.toggle('on', st.mode === 'gif');
          segPic.classList.toggle('on', st.mode === 'picture');
          segYt.classList.toggle('on', st.mode === 'youtube');
          sizeLabel.hidden = st.mode === 'youtube'; // a YouTube player has no width setting
          q.placeholder = st.mode === 'youtube' ? 'Search YouTube, e.g. spice and wolf opening' : 'Search GIFs / pictures, e.g. spice and wolf holo';
          grid.classList.toggle('gp-ytgrid', st.mode === 'youtube');
          for (const s of SOURCES) {
            const c = chips[s.id], ok = usable(s);
            c.hidden = st.mode === 'youtube' ? !s.yt : !!s.yt; // YouTube mode shows only its own chip
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
          if (st.tagInfo && on.some(s => s.booru)) {
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
          const t = el('div', { class: 'gp-tile' + (it.yt ? ' yt' : ''), tabindex: '0', title: (it.title ? it.title + '\n' : '') + (it.by ? it.by + '\n' : '') + (it.w ? it.w + '×' + it.h + ' · ' : '') + (src ? src.name : mine ? 'your upload' : 'recent') },
            img, el('span', { class: 'tag' }, src ? src.short : mine ? (it.video ? 'UP ▶' : 'UP') : it.yt ? 'YT' : '↺'), zoom,
            it.yt && it.len ? el('span', { class: 'ytlen' }, it.len) : null,
            it.yt && it.title ? el('span', { class: 'yttitle' }, it.title) : null);
          t.gpUrl = it.url;
          // Pick several on (or Ctrl / Shift / Cmd-click on PC): tap = pick / unpick; otherwise tap = add straight away.
          // A YouTube video opens its preview first (you watch it, then Add to comment there).
          const act = e => { if (S.multi || e.ctrlKey || e.shiftKey || e.metaKey) togglePick(it); else if (it.yt) view(it); else pick(it, t); };
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
          // the upload screen covers the tray, so it has its own Add button (Your uploads with Pick several on)
          for (const b of panel.querySelectorAll('.gp-upadd')) { b.parentNode.hidden = !n; b.textContent = 'Add ' + n + ' picked'; }
        }

        // records what was added, closes (unless Keep open)
        function added(items) {
          for (const it of items.slice().reverse()) recent = [Object.assign({}, it, { tags: undefined })].concat(recent.filter(r => r.url !== it.url));
          recent = recent.slice(0, 36);
          store.set('recent', recent);
          const what = items.length > 1 ? items.length + ' added' : 'Added ' + (items[0].yt ? 'YouTube video' : items[0].video ? 'video' : items[0].gif ? 'GIF' : 'picture');
          if (S.keepOpen) toast(what); else { closePicker(); toast(what + ' to your comment'); }
        }

        async function pick(it, t) {
          if (t && t.classList.contains('busy')) return;
          if (t) t.classList.add('busy');
          const ok = it.yt ? true : await loads(it.url, it.video); // (a YouTube link is checked by its preview)
          if (t) t.classList.remove('busy');
          if (!P || P.st !== st) return;
          if (!ok) { if (t) t.classList.add('bad'); toast('That one will not load from its site, pick another'); return; }
          if (!insertText(st.ta, aniCode([it], S))) { toast('The comment box is gone, open the picker from the box again'); return; }
          added([it]);
        }

        async function addPicked() {
          const list = st.picked.slice();
          if (!list.length || trayAdd.disabled) return;
          const btns = [trayAdd, ...panel.querySelectorAll('.gp-upadd')];
          for (const b of btns) { b.disabled = true; b.textContent = 'Checking…'; }
          const ok = await Promise.all(list.map(it => (it.yt ? true : loads(it.url, it.video))));
          if (!P || P.st !== st) return;
          for (const b of btns) b.disabled = false;
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
          // YouTube: the real player (as AniList will show it), so you can watch before adding; it stops when you go back
          const big = it.yt ? el('iframe', { src: 'https://www.youtube.com/embed/' + (it.ytId || ytIdOf(it.url)) + '?autoplay=1&rel=0&playsinline=1', class: it.short ? 'short' : '',
              allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: true, title: it.title || 'YouTube video' })
            : it.video ? el('video', { src: it.url, controls: true, loop: true, playsinline: true, autoplay: true }) : el('img', { src: it.url, alt: it.title || '' });
          if (it.video) big.muted = true;
          const src = SOURCES.find(s => s.id === it.src);
          const isPicked = () => st.picked.some(p => p.url === it.url);
          const pickBtn = el('button', { class: 'gp-b', type: 'button', onclick: () => { togglePick(it); pickBtn.textContent = isPicked() ? 'Unpick' : 'Pick'; } }, isPicked() ? 'Unpick' : 'Pick');
          const v = el('div', { class: 'gp-view' },
            el('div', { class: 'pic', onclick: e => { if (e.target === e.currentTarget) v.remove(); } }, big),
            el('div', { class: 'bar' },
              el('div', { class: 'info' }, (src ? src.name : it.src === 'upload' ? 'Your upload' : 'Recent') + (it.len ? ' · ' + it.len : '') + (it.w ? ' · ' + it.w + '×' + it.h : '') + (it.bytes ? ' · ' + mb(it.bytes) : '') + (it.title ? ' · ' + it.title : '') + (it.by ? ' · ' + it.by : '')),
              it.page ? el('a', { class: 'gp-b', href: it.page, target: '_blank', rel: 'noopener noreferrer' }, it.yt ? 'On YouTube ↗' : 'Source ↗') : null,
              el('button', { class: 'gp-b', type: 'button', onclick: () => v.remove() }, 'Back'),
              S.multi || st.picked.length ? pickBtn : null,
              el('button', { class: 'gp-b gp-go', type: 'button', onclick: () => { v.remove(); pick(it, null); } }, 'Add to comment')));
          panel.appendChild(v);
        }

        // Upload your own: GIF / picture or Video (each its own repo). The GitHub setup the first time (or via Change),
        // then choose / drop / paste one file or several (file = a File or a list of them)
        function uploadView(file, setup, kind) {
          for (const old of panel.querySelectorAll('.gp-view')) old.remove();
          const first = file && (file instanceof Blob ? file : file[0]);
          kind = kind || (first ? (isVideoFile(first) ? 'video' : 'gif') : (S.upKind === 'video' ? 'video' : 'gif'));
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

          // one or several files (up to 20); several get the Layout switch (the same setting as Pick several's)
          const input = el('input', { type: 'file', multiple: true, accept: vid ? 'video/mp4,video/webm,video/x-m4v,.mp4,.webm,.m4v' : 'image/gif,image/png,image/jpeg,image/webp,image/avif,.avif', hidden: true });
          const choose = el('button', { class: 'gp-b gp-go', type: 'button', onclick: () => input.click() }, vid ? 'Choose videos' : 'Choose GIFs / pictures');
          const drop = el('div', { class: 'drop' });
          const go = el('button', { class: 'gp-b gp-go', type: 'button', hidden: true }, 'Upload and add');
          const upSide = el('button', { type: 'button', title: 'In a row; too-wide ones are sized to fit 2 or 3 per row' }, 'Side by side');
          const upDown = el('button', { type: 'button', title: 'Each on its own line, at the size you picked' }, 'Under each other');
          const upLay = el('span', { class: 'gp-lay' }, 'Layout ', el('span', { class: 'gp-seg' }, upSide, upDown));
          const MAX_FILES = 20;
          let files = [], urls = [];
          const paintUpLay = () => {
            upLay.hidden = files.length < 2;
            upSide.classList.toggle('on', S.side !== false);
            upDown.classList.toggle('on', S.side === false);
          };
          upSide.addEventListener('click', () => { S.side = true; saveSettings(); paintUpLay(); paintLayout(); });
          upDown.addEventListener('click', () => { S.side = false; saveSettings(); paintUpLay(); paintLayout(); });
          const setFiles = list => {
            urls.forEach(u => URL.revokeObjectURL(u));
            urls = [];
            const all = [...(list || [])];
            const mine = all.filter(f => (vid ? isVideoFile(f) : isPicFile(f)));
            const other = all.filter(f => (vid ? isPicFile(f) : isVideoFile(f)));
            if (!mine.length && other.length && !files.length) { uploadView(other, false, vid ? 'gif' : 'video'); return; } // all of the other kind: switch over
            const big = mine.filter(f => f.size > UP_MAX);
            const fit = mine.filter(f => f.size <= UP_MAX);
            files = fit.slice(0, MAX_FILES);
            const notes = [];
            if (other.length) notes.push(other.length + (vid ? ' picture(s) left out: switch to GIF / picture for them' : ' video(s) left out: switch to Video for them'));
            if (big.length) notes.push(big.length === 1 ? big[0].name + ' is ' + mb(big[0].size) + ', over the 25 MB limit (make it smaller first)' : big.length + ' files over the 25 MB limit left out');
            if (fit.length > MAX_FILES) notes.push('only ' + MAX_FILES + ' at once');
            if (all.length && !mine.length && !other.length) notes.push(vid ? 'That is not an MP4 / WebM video' : 'That is not a GIF / PNG / JPG / WebP / AVIF picture');
            say(notes.join(' · '), notes.length ? 'bad' : '');
            drop.textContent = '';
            go.hidden = !files.length;
            paintUpLay();
            if (!files.length) { drop.append(choose, el('p', {}, matchMedia('(hover: none)').matches ? 'From your gallery or files (several at once is fine)' : 'or drag them here, or paste (Ctrl+V)')); return; }
            const shown = el('div', { class: files.length > 1 ? 'thumbs' : 'one' });
            files.forEach((f, i) => {
              const u = URL.createObjectURL(f);
              urls.push(u);
              const m = vid ? el('video', { src: u, controls: files.length === 1, loop: true, playsinline: true }) : el('img', { src: u, alt: '' });
              if (vid) { m.muted = true; if (files.length === 1) m.play().catch(() => {}); }
              shown.append(files.length > 1 ? el('div', { class: 'up-t', title: f.name + ' · ' + mb(f.size) }, m,
                el('button', { class: 'rm', type: 'button', title: 'Leave this one out', 'aria-label': 'Leave this one out', onclick: () => setFiles(files.filter((x, j) => j !== i)) }, '×')) : m);
            });
            const total = files.reduce((a, f) => a + f.size, 0);
            drop.append(shown, el('p', {}, files.length === 1 ? (files[0].name || 'pasted file') + ' · ' + mb(total) : files.length + ' files · ' + mb(total)),
              el('div', { class: 'row' },
                el('button', { class: 'gp-b', type: 'button', onclick: () => { input.dataset.add = '1'; input.click(); } }, 'Add more'),
                el('button', { class: 'gp-b', type: 'button', onclick: () => setFiles([]) }, 'Clear')));
            go.textContent = files.length > 1 ? 'Upload ' + files.length + ' and add' : 'Upload and add';
          };
          input.addEventListener('change', () => {
            const picked = [...(input.files || [])];
            setFiles(input.dataset.add ? files.concat(picked) : picked);
            delete input.dataset.add;
            input.value = '';
          });
          drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
          drop.addEventListener('dragleave', () => drop.classList.remove('over'));
          drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); const fl = e.dataTransfer && e.dataTransfer.files; if (fl && fl.length) setFiles(files.concat([...fl])); });
          go.addEventListener('click', async () => {
            if (!files.length || go.disabled) return;
            const list = files.slice(), conf = ghConf(kind);
            go.disabled = true; choose.disabled = true;
            const done = [], failed = [];
            upLog = { files: list.length, bytes: list.reduce((a, f) => a + f.size, 0) };
            const T = Date.now();
            // the same file already in the repo (from any device) is reused, not uploaded again
            say('Checking your repo…');
            let have = [];
            let tl = Date.now();
            try { have = await upList(conf, vid); } catch (e) { /* cannot list: just upload */ }
            upMark('listMs', tl);
            let reused = 0;
            for (let i = 0; i < list.length; i++) {
              const f = list[i];
              let sha = null;
              tl = Date.now();
              try { if (have.length) sha = await blobSha(f); } catch (e) { /* no crypto here: upload */ }
              upMark('shaMs', tl);
              const same = sha && have.find(h => h.sha === sha);
              if (same) { done.push(Object.assign({}, same, { title: f.name || same.title })); reused++; continue; }
              // a running count of seconds, so a slow GitHub (it took ~2 min for 1.5 MB on 2026-11-04) never looks stuck
              const label = 'Uploading ' + (list.length > 1 ? (i + 1) + ' of ' + list.length + ' (' + mb(f.size) + ')' : mb(f.size)) + ' to GitHub…';
              const t0 = Date.now();
              const tick = () => {
                const s = Math.round((Date.now() - t0) / 1000);
                say(label + (s >= 3 ? ' ' + s + ' s' : '') + (s >= 20 ? ' (GitHub is slow right now, still going)' : f.size > 8 * 1048576 ? ' big files take a little while' : ''));
              };
              tick();
              const ticker = setInterval(tick, 1000);
              try {
                const fname = fileName(f);
                tl = Date.now();
                const b64 = await readB64(f);
                upMark('readMs', tl);
                const url = await ghUpload(conf, fname, b64);
                done.push({ key: 'up:' + url, src: 'upload', url, full: url, thumb: url, title: f.name || '', gif: /\.gif$/i.test(url), video: vid, page: '', fresh: true });
              } catch (e) {
                let m = e.message || 'Upload failed';
                if (conf.shared && /not allowed to write/.test(m)) m += '. It is your GIF token: add ' + conf.repo + ' to it on GitHub, or paste a separate token (Change)';
                failed.push({ name: f.name || 'file', msg: m });
                if (/token|credentials|not allowed/i.test(m)) break; // a token problem would fail every one of them
              } finally { clearInterval(ticker); }
            }
            go.disabled = false; choose.disabled = false;
            upLog.totalMs = Date.now() - T;
            if (done.length > reused) delete upCache[upKey(conf, vid)];
            if (!done.length) { upLogSave({ error: failed.length ? failed[0].msg : 'Upload failed' }); say(failed.length ? failed[0].msg : 'Upload failed', 'bad'); return; }
            upLogSave({});
            say((done.length > reused ? 'Uploaded ' + (done.length - reused) + ' in ' + Math.max(1, Math.round(upLog.totalMs / 1000)) + ' s' : 'Already in your repo') + '. Adding to your comment…', 'good');
            // GitHub's raw links answer within seconds of the upload: wait briefly so the comment never gets a dead link
            await Promise.all(done.filter(it => it.fresh).map(async it => {
              for (let i = 0; i < 4; i++) { if (await loads(it.url + (i ? '?t=' + i : ''), vid)) return; await new Promise(r => setTimeout(r, 1500)); }
            }));
            deliverUploads(done.map(it => Object.assign({}, it, { fresh: undefined, sha: undefined, i: undefined, t: undefined })), failed, v, reused);
          });
          body.append(
            el('h3', {}, vid ? 'Upload your own videos' : 'Upload your own'),
            drop, input,
            upLay,
            el('div', { class: 'row' }, go, back),
            msg,
            el('p', { hidden: !vid }, 'Added as webm(link): AniList plays MP4 and WebM with it (the Size option is for pictures only). Up to 25 MB each.'),
            el('p', {}, 'Goes to ', el('b', {}, c.repo + (ghPath(c) ? '/' + ghPath(c) : '')), ' on GitHub (public). ',
              el('a', { href: '#', onclick: e => { e.preventDefault(); uploadView(null, true, kind); } }, 'Change'), ' · ',
              el('a', { href: 'https://github.com/' + c.repo + (ghPath(c) ? '/tree/' + (c.branch || 'main') + '/' + ghPath(c) : ''), target: '_blank', rel: 'noopener' }, 'Open the repo')));

          // Your uploads: what is already in that folder (any device), newest first; tap = add it again, no new upload
          const mineN = el('span', { class: 'n' });
          const find = el('input', { class: 'gp-q find', type: 'search', placeholder: 'Find by name', autocomplete: 'off', hidden: true, 'aria-label': 'Find your uploads by name' });
          const mineGrid = el('div', { class: 'gp-grid gp-mine' });
          const mineNote = el('div', { class: 'gp-status' }, 'Loading your uploads…');
          const mineMore = el('button', { class: 'gp-b', type: 'button', hidden: true }, 'Show more');
          const upAdd = el('button', { class: 'gp-b gp-go gp-upadd', type: 'button', onclick: () => addPicked() });
          const upBar = el('div', { class: 'upbar', hidden: true }, upAdd);
          const PAGE = 24;
          let mine = [], shownN = 0;
          const paintMine = more => {
            const words = find.value.toLowerCase().split(/\s+/).filter(Boolean);
            const list = words.length ? mine.filter(it => words.every(w => (it.title + ' ' + it.url).toLowerCase().includes(w))) : mine;
            if (!more) { mineGrid.textContent = ''; shownN = 0; }
            const next = list.slice(shownN, shownN + PAGE);
            shownN += next.length;
            mineGrid.append(...next.map(tile));
            mineMore.hidden = shownN >= list.length;
            if (!more) mineNote.textContent = !mine.length ? (vid ? 'No videos uploaded yet.' : 'Nothing uploaded yet.')
              : !list.length ? 'None of your uploads match.'
              : S.multi ? 'Pick several is on: tap to pick them, then Add.' : 'Tap one to add it to your comment again (no new upload). The magnifier shows it big.';
          };
          mineMore.addEventListener('click', () => paintMine(true));
          find.addEventListener('input', () => paintMine());
          find.addEventListener('keydown', e => { if (e.key !== 'Escape') e.stopPropagation(); });
          body.append(el('div', { class: 'mine-h' }, el('h3', {}, vid ? 'Your videos ' : 'Your uploads ', mineN), find), mineNote, mineGrid, mineMore, upBar);
          Promise.resolve(upList(c, vid)).then(list => {
            if (!v.isConnected) return;
            mine = list;
            mineN.textContent = list.length ? '(' + list.length + ')' : '';
            find.hidden = list.length < 9;
            paintMine();
          }, e => {
            if (!v.isConnected) return;
            // cannot read the repo: at least the uploads used on this device
            mine = recent.filter(r => r.src === 'upload' && !!r.video === vid);
            paintMine();
            mineNote.textContent = 'Could not read your repo (' + (e.message || 'failed') + ')' + (mine.length ? '; showing the ones used on this device.' : '.');
          });
          panel.appendChild(v);
          paintTray();
          setFiles(file ? [].concat(file.length !== undefined && !(file instanceof Blob) ? [...file] : [file]) : []);
        }

        // Uploads ALWAYS end up in the comment, even when the picker was closed meanwhile; Pick several does not hold
        // them back (1.3.2 only picked them, and a closed picker dropped them without a word). No comment box left: the
        // code is copied to paste in.
        function deliverUploads(items, failed, v, reused) {
          for (const it of items.slice().reverse()) recent = [it].concat(recent.filter(r => r.url !== it.url));
          recent = recent.slice(0, 36);
          store.set('recent', recent);
          const code = aniCode(items, S);
          const ta = st.ta && st.ta.isConnected ? st.ta : lastTa && lastTa.isConnected ? lastTa : null;
          const fresh = items.length - (reused || 0);
          const what = (!reused ? (items.length > 1 ? items.length + ' uploaded' : 'Uploaded')
            : !fresh ? (reused > 1 ? reused + ' were already in your repo: reused them' : 'Already in your repo: reused it')
            : fresh + ' uploaded, ' + reused + ' already in your repo (reused)') + (failed.length ? ' (' + failed.length + ' failed: ' + failed.map(f => f.name + ': ' + f.msg).join('; ') + ')' : '');
          const open = P && P.st === st;
          if (ta && insertText(ta, code)) {
            if (open && !S.keepOpen) closePicker(); else if (open) v.remove();
            toast(what + ' and added to your comment', failed.length ? 9000 : 0);
          } else {
            copyText(code);
            toast(what + '. The comment box was gone, so the code is copied: paste it into the comment', 9000);
          }
        }

        // PC: paste or drop pictures / videos anywhere on the picker = upload them
        panel.addEventListener('paste', e => {
          const fl = [...((e.clipboardData && e.clipboardData.files) || [])].filter(f => isPicFile(f) || isVideoFile(f));
          if (fl.length) { e.preventDefault(); uploadView(fl); }
        });
        panel.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
        panel.addEventListener('drop', e => {
          const fl = e.dataTransfer && [...e.dataTransfer.files];
          if (fl && fl.length && !e.defaultPrevented) { e.preventDefault(); uploadView(fl); }
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
          // a link pasted in: add that picture as it is (a YouTube link becomes a YouTube video with its preview)
          if (/^https?:\/\/\S+$/i.test(text)) {
            const yid = ytIdOf(text), short = /\/shorts\//.test(text);
            const it = yid ? { key: 'yt:' + yid, src: '', yt: true, ytId: yid, short, url: ytUrl(yid, short), full: ytUrl(yid, short), page: ytUrl(yid, short), thumb: 'https://i.ytimg.com/vi/' + yid + '/mqdefault.jpg', title: '' }
              : { key: 'url', src: '', url: text, full: text, thumb: text, title: '', gif: /\.gif(\?|$)/i.test(text) };
            grid.append(el('div', { class: 'gp-h' }, 'Your link'), tile(it));
            paintTop(); status.textContent = yid ? 'Tap it to watch it, then Add to comment.' : 'Tap it to add it as it is.'; more.textContent = '';
            return;
          }
          for (const s of SOURCES) if (usable(s) && S.on[s.id]) st.src[s.id] = { page: 0, more: true, count: 0 };
          const gen = st.gen;
          const needTags = SOURCES.some(s => s.booru && st.src[s.id]);
          st.tags = (needTags ? resolveTags(text) : Promise.resolve({ tags: [], unknown: [] })).catch(() => ({ tags: [], unknown: [] }));
          st.tags.then(r => { if (gen === st.gen && needTags) { st.tagInfo = r; paintStatus(); } });
          paintTop(); paintStatus();
          round();
        }

        const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && st.q && !st.loading) round(); }, { root: wrap, rootMargin: '400px' });
        io.observe(more);

        const onKey = e => {
          if (e.key !== 'Escape') return;
          const vs = panel.querySelectorAll('.gp-view'); // the top one (a big view opened from the upload screen sits over it)
          if (vs.length) vs[vs.length - 1].remove(); else closePicker();
          e.stopPropagation();
        };
        document.addEventListener('keydown', onKey, true);

        const upd = updateBar();
        if (upd) panel.querySelector('.gp-top').prepend(upd);
        document.body.appendChild(ov);
        const oldOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        P = { st, ov, io, onKey, oldOverflow };
        if (!upd) checkUpdate().then(showUpdateBar, () => {}); // over an hour since the last look: ask now (the bar comes in when it answers)
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
        const fresh = document.querySelectorAll('.markdown-editor:not([data-gp])');
        if (fresh.length) setTimeout(markUpdate, 0); // the update dot on the new GIF buttons too
        for (const me of fresh) {
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
      checkUpdate();
      setInterval(checkUpdate, 20 * 60e3); // tabs left open hear about it too (it still asks GitHub at most once an hour)

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

  }
  const gifOn = () => { try { const c = JSON.parse(localStorage.getItem('alapp:cfg') || '{}'); return !(c.mods && c.mods.gif === false); } catch (e) { return true; } };
  const startGif = () => setTimeout(() => {
    if (!gifOn()) return;
    for (const st of document.querySelectorAll('style')) if (st.textContent.indexOf('.gp-grid') >= 0) { document.documentElement.setAttribute('data-ala-gif', 'separate'); return; }
    try { GIF_PICKER(); document.documentElement.setAttribute('data-ala-gif', 'app'); } catch (e) { console.warn('[AniList App] gif', e); }
  }, 1200);
  if (document.readyState === 'complete') startGif(); else window.addEventListener('load', startGif, { once: true });
})();

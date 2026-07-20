/* ASE-Lab. Reboot 共通シェル・状態管理
   各ページは <script src="assets/data.js"> と本ファイルを読み込み、
   Shell.init({ page: 'dashboard' }) を呼ぶとヘッダー/サブナビ/フッターが描画される。 */
"use strict";

/* ============ 状態 (localStorage) ============ */
const STORE_KEY = "ase_reboot_user_v2";

const Store = {
  load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  },
  save(u) { localStorage.setItem(STORE_KEY, JSON.stringify(u)); },
  clear() { localStorage.removeItem(STORE_KEY); },
};

function dkey(d) { return d.toISOString().slice(0, 10); }

function newUser(name, handle, role) {
  return {
    name, handle, role,
    score: 0,
    joinedAt: dkey(new Date()),
    activity: {},          // { 'YYYY-MM-DD': score獲得量 }
    badges: [],
    progress: {},          // { courseId: {done:[], quiz:{}, completed} }
    bookmarks: [],
    seminars: [],          // 参加中ゼミid
    seminarsTaken: 0,      // 履修ゼミ数(過去含む)
  };
}

/* 構想PDFのデモユーザー: Maya Abe @abema_astro / 履修13ゼミ / SCORE 274 */
function demoUser() {
  const u = newUser("Maya Abe", "@abema_astro", "大学生");
  u.avatar = "img/avatar-abe.jpg";
  u.joinedAt = "2023-04-10";
  u.seminars = [59, 61, 51, 69];
  u.seminarsTaken = 13;
  // 直近15週の学習アクティビティ(GitHub風カレンダー用)
  const today = new Date();
  for (let i = 104; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const w = d.getDay();
    // 月・水・土に学習しがち + ランダム風の決定的パターン
    const p = (d.getDate() * 7 + w * 13) % 10;
    if ((w === 1 || w === 3 || w === 6) && p > 2) u.activity[dkey(d)] = 5 + (p % 4) * 5;
    else if (p === 9) u.activity[dkey(d)] = 5;
  }
  u.activity[dkey(today)] = (u.activity[dkey(today)] || 0) + 10;
  // コース進捗: 軌道力学修了 + 概論2枚
  const om = COURSES.find((c) => c.id === "orbital-mechanics");
  if (om) u.progress["orbital-mechanics"] = { done: om.slides.map(() => true), quiz: {}, completed: true };
  const ie = COURSES.find((c) => c.id === "intro-space-engineering");
  if (ie) u.progress["intro-space-engineering"] = { done: ie.slides.map((s, i) => i < 2), quiz: {}, completed: false };
  u.badges = ["first-slide", "quiz-first", "first-lesson", "streak-3", "seminar-3"];
  u.bookmarks = ["b001", "b020"];
  u.score = 274;
  return u;
}

let user = Store.load();

/* 移行: アバター導入前に保存されたデモアカウントに画像を補完 */
if (user && user.handle === "@abema_astro" && !user.avatar) {
  user.avatar = "img/avatar-abe.jpg";
  Store.save(user);
}

/* ============ ゲーミフィケーション ============ */
const SCORE_SLIDE = 2, SCORE_QUIZ = 5, SCORE_QUIZ_RETRY = 2, SCORE_LESSON = 10;

const BADGES = [
  { id: "first-slide",  icon: "📡", name: "ファーストコンタクト", desc: "はじめて教材スライドを読んだ" },
  { id: "quiz-first",   icon: "🎯", name: "一発正解",             desc: "クイズに一発で正解した" },
  { id: "first-lesson", icon: "🚀", name: "リフトオフ",           desc: "はじめてレッスンを完走した" },
  { id: "streak-3",     icon: "🔥", name: "連続学習",             desc: "3週連続で学習した" },
  { id: "seminar-3",    icon: "🎓", name: "ゼミ常連",             desc: "3つ以上のゼミを履修した" },
  { id: "bookmark",     icon: "📚", name: "ライブラリアン",       desc: "読みたい本をブックマークした" },
];

/* 現行サイトの News セクション(お知らせ=緑 / note更新=青のタグ)を踏襲 */
const NEWS_ITEMS = [
  { date: "2026-07-10", tag: "お知らせ", title: "ASE-Lab. Reboot β版を公開しました" },
  { date: "2026-07-03", tag: "お知らせ", title: "アストロキャンプ2026 参加申込受付中" },
  { date: "2026-06-24", tag: "アップデート", title: "教材コースに「宇宙法・宇宙政策入門」を追加しました" },
  { date: "2026-06-15", tag: "お知らせ", title: "新ゼミ「宇宙医学ゼミ」メンバー募集開始" },
  { date: "2026-06-05", tag: "アップデート", title: "書籍ライブラリに10冊を追加しました" },
  { date: "2026-05-28", tag: "お知らせ", title: "5周年記念イベント開催のお知らせ" },
  { date: "2026-05-18", tag: "アップデート", title: "学習ロードマップに新トラック「ミッション設計・解析」を追加" },
  { date: "2026-05-08", tag: "アップデート", title: "メンバー向けバッジ制度を新設しました" },
];
const NEWS_TAG_COLOR = { "お知らせ": "#00c853", "アップデート": "#2979ff" };
function newsRowHTML(n) {
  return `<div class="news-row" data-news>
    <span class="n-date">${esc(n.date.replace(/-/g, "."))}</span>
    <span class="n-tag" style="background:${NEWS_TAG_COLOR[n.tag]}">${esc(n.tag)}</span>
    <span class="n-title">${esc(n.title)}</span>
  </div>`;
}

/* 連続学習週数 (streak) → 焚き火アイコン数 (PDF準拠で3段階) */
function streakWeeks(u) {
  let weeks = 0;
  const d = new Date();
  for (let w = 0; w < 60; w++) {
    let hit = false;
    for (let i = 0; i < 7; i++) {
      if (u.activity[dkey(d)]) hit = true;
      d.setDate(d.getDate() - 1);
    }
    if (hit) weeks++; else break;
  }
  return weeks;
}
function flameCount(weeks) { return weeks >= 12 ? 3 : weeks >= 4 ? 2 : weeks >= 1 ? 1 : 0; }

function addScore(pts) {
  if (!user) return;
  user.score += pts;
  const k = dkey(new Date());
  user.activity[k] = (user.activity[k] || 0) + pts;
  Store.save(user);
  Shell.renderAccountArea();
  toast(`+${pts} SCORE`);
}

function grantBadge(id) {
  if (!user || user.badges.includes(id)) return;
  user.badges.push(id);
  Store.save(user);
  const b = BADGES.find((x) => x.id === id);
  if (b) toast(`${b.icon} バッジ獲得: ${b.name}`);
}

let toastTimer = null;
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* アバター: 画像があれば表示、なければ頭文字 */
function avatarHTML(u, cls) {
  if (u.avatar) return `<img class="${cls}" src="${esc(u.avatar)}" alt="${esc(u.name)}">`;
  return `<span class="${cls}">${esc(u.name.slice(0, 1))}</span>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* コースの総ステップ数(実スライドデッキ頁 + クイズ等) */
function courseSteps(c) {
  return (c.deckPages || 0) + c.slides.length;
}

function courseProgress(c) {
  const p = user && user.progress[c.id];
  if (!p) return { pct: 0, started: false, completed: false };
  const done = p.done.filter(Boolean).length;
  return { pct: Math.min(100, Math.round((done / courseSteps(c)) * 100)), started: done > 0, completed: !!p.completed };
}

/* ============ 共通シェル ============ */
const Shell = {
  page: "",
  mode: "campus",

  /* 本体サイトのナビ(About Usのみモック内、他は本番サイトへリンクして温存) */
  SITE_LINKS: [
    { text: "About Us",  href: "about.html" },
    { text: "Activities", href: "https://ase-lab.space/activities", ext: true },
    { text: "News",      href: "https://ase-lab.space/news", ext: true },
    { text: "Articles",  href: "https://ase-lab.space/articles", ext: true },
    { text: "Contact",   href: "https://ase-lab.space/contact", ext: true },
  ],

  /* 学習サービス「Campus」のナビ(お知らせはベル通知に移行) */
  CAMPUS_LINKS: [
    { key: "dashboard", text: "ダッシュボード", href: "dashboard.html" },
    { key: "seminars",  text: "ゼミ",           href: "seminars.html" },
    { key: "courses",   text: "コース",         href: "courses.html" },
    { key: "library",   text: "ライブラリ",     href: "library.html" },
    { key: "roadmap",   text: "ロードマップ",   href: "roadmap.html" },
    { key: "members",   text: "ランキング",     href: "members.html" },
  ],

  init(opts) {
    this.page = opts.page || "";
    this.mode = opts.mode || "campus";
    // 認証ガード: Campus は独立サービスなので、未ログインでは全ページ入れない。
    // init は各 campus ページ <script> の先頭で呼ばれるため、ここで throw すると
    // 以降のページ本体スクリプト(user.* 参照)の実行が止まり、login.html へ遷移する。
    if (this.mode === "campus" && !user) {
      location.replace("login.html");
      throw new Error("auth required: redirecting to login");
    }
    if (this.mode === "campus") this.applyCtheme();
    this.renderHeader();
    this.renderFooter();
    document.title = (opts.title ? opts.title + " | " : "") + (this.mode === "campus" ? "ASE-Lab. Campus" : "ASE-Lab.");
  },

  /* Campusカラーパレット(検討用の複数案)。右下ピッカーで切替、localStorageに保存 */
  CTHEME_KEY: "ase_campus_ctheme",
  CTHEMES: [
    { key: "cosmos", label: "A 紫",     sw: "linear-gradient(135deg,#5b2fd4,#8e6ae6)" },
    { key: "nebula", label: "B ピンク", sw: "linear-gradient(135deg,#c02e88,#e79cd2)" },
    { key: "aurora", label: "C 赤",     sw: "linear-gradient(135deg,#cf2f5f,#ef8aa5)" },
  ],
  applyCtheme() {
    const saved = localStorage.getItem(this.CTHEME_KEY) || "cosmos";
    if (saved === "cosmos") delete document.body.dataset.ctheme;
    else document.body.dataset.ctheme = saved;
    // マイページメニュー内のスウォッチの選択状態を更新
    document.querySelectorAll(".mm-theme [data-ct]").forEach(b =>
      b.classList.toggle("on", b.dataset.ct === saved));
  },

  /* テーマ設定UI(マイページメニュー内) */
  themeRowHTML() {
    const saved = localStorage.getItem(this.CTHEME_KEY) || "cosmos";
    return `<div class="mm-theme">
      <div class="t">🎨 テーマ設定</div>
      <div class="row">${this.CTHEMES.map(t => `<button data-ct="${t.key}" class="${t.key === saved ? "on" : ""}">
        <span class="sw" style="background:${t.sw}"></span>${t.label}</button>`).join("")}</div>
    </div>`;
  },

  renderHeader() {
    const host = document.getElementById("app-header");
    if (!host) return;
    if (this.mode === "auth") {
      // ログイン画面用の軽量ヘッダー: ロゴのみ(本体サイトのナビは出さない)
      host.innerHTML = `
      <header class="site-header">
        <h2 class="ase-lab-title">
          <a href="index.html"><img src="img/logo.webp" alt="ASE-Lab. Campus"><span class="logo-word">ASE-Lab.</span></a>
          <span class="reboot-mark">CAMPUS β</span>
        </h2>
      </header>`;
      return;
    }
    if (this.mode === "site") {
      const links = this.SITE_LINKS.map(
        (l) => `<a class="nav-link" href="${l.href}"${l.ext ? ' target="_blank" rel="noopener"' : ""}>${l.text}<span class="nav-border"></span></a>`
      ).join("");
      host.innerHTML = `
      <header class="site-header">
        <h2 class="ase-lab-title">
          <a href="index.html"><img src="img/logo.webp" alt="ASE-Lab. Logo"><span class="logo-word">ASE-Lab.</span></a>
          <span class="reboot-mark">REBOOT β</span>
        </h2>
        <nav class="navbar">
          ${links}
          <a class="lab-button campus-cta" href="${user ? "dashboard.html" : "login.html"}">Campus</a>
          <span id="account-area"></span>
        </nav>
      </header>`;
    } else {
      host.innerHTML = `
      <header class="campus-header">
        <a class="c-logo" href="dashboard.html" title="Campus トップ">
          <img src="img/logo.webp" alt="ASE-Lab. Campus"><span class="logo-word">ASE-Lab.</span>
          <span class="reboot-mark">CAMPUS β</span>
        </a>
        <nav class="c-nav">
          ${this.CAMPUS_LINKS.map(
            (l) => `<a href="${l.href}" class="${l.key === this.page ? "active" : ""}">${l.text}</a>`
          ).join("")}
        </nav>
        <div class="c-right">
          <button class="bell-btn" id="bell-btn" title="お知らせ" aria-label="お知らせ">🔔<i class="bell-dot" id="bell-dot"></i></button>
          <div class="bell-drop" id="bell-drop">
            <div class="bd-head">お知らせ <span>Campusの更新情報</span></div>
            ${NEWS_ITEMS.slice(0, 6).map((n) => `<a class="bd-row" href="news.html">
              <span class="bd-date">${esc(n.date.replace(/-/g, "."))}</span>
              <span class="n-tag" style="background:${NEWS_TAG_COLOR[n.tag]}">${esc(n.tag)}</span>
              <span class="bd-title">${esc(n.title)}</span></a>`).join("")}
            <a class="bd-all" href="news.html">すべて見る →</a>
          </div>
          <span id="account-area"></span>
        </div>
      </header>`;
      this.initBell();
    }
    this.renderAccountArea();
  },

  /* ベル通知: 未読ドットは localStorage の最終閲覧日と最新記事日付の比較 */
  BELL_SEEN_KEY: "ase_campus_news_seen",
  initBell() {
    const btn = document.getElementById("bell-btn");
    const drop = document.getElementById("bell-drop");
    const dot = document.getElementById("bell-dot");
    if (!btn || !drop) return;
    const newest = NEWS_ITEMS[0] ? NEWS_ITEMS[0].date : "";
    const seen = localStorage.getItem(this.BELL_SEEN_KEY) || "";
    if (dot && seen >= newest) dot.style.display = "none";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      drop.classList.toggle("open");
      localStorage.setItem(this.BELL_SEEN_KEY, newest);
      if (dot) dot.style.display = "none";
    });
    document.addEventListener("click", (e) => {
      if (!drop.contains(e.target) && e.target !== btn) drop.classList.remove("open");
    });
  },

  renderAccountArea() {
    const el = document.getElementById("account-area");
    if (!el) return;
    if (!user) {
      el.innerHTML = `<a class="lab-button" href="login.html">ログイン</a>`;
      return;
    }
    if (this.mode !== "campus") {
      el.innerHTML = `<a class="account-chip" href="dashboard.html">
        ${avatarHTML(user, "avatar-s")}
        <span>${esc(user.name)}</span>
        <span class="score-s">SCORE ${user.score}</span></a>`;
      return;
    }
    // Campus: アイコンクリックで「マイページ」メニュー(テーマ設定を含む)
    el.innerHTML = `<span class="mp-wrap">
      <button class="account-chip" id="mp-btn" title="マイページ">
        ${avatarHTML(user, "avatar-s")}
        <span>${esc(user.name)}</span>
        <span class="score-s">SCORE ${user.score}</span>
      </button>
      <div class="mp-menu" id="mp-menu">
        <div class="mm-user">
          ${avatarHTML(user, "avatar-s")}
          <div><div class="n">${esc(user.name)}</div><div class="h">${esc(user.handle || "")} ・ SCORE ${user.score}</div></div>
        </div>
        <a class="mm-item" href="dashboard.html">📊 ダッシュボード</a>
        <a class="mm-item" href="scoresheet.html">📄 スコアシートを発行</a>
        ${this.themeRowHTML()}
        <button class="mm-item" id="mp-logout">ログアウト</button>
      </div>
    </span>`;
    const btn = document.getElementById("mp-btn");
    const menu = document.getElementById("mp-menu");
    btn.addEventListener("click", (e) => { e.stopPropagation(); menu.classList.toggle("open"); });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== btn) menu.classList.remove("open");
    });
    menu.querySelectorAll("[data-ct]").forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        localStorage.setItem(this.CTHEME_KEY, b.dataset.ct);
        this.applyCtheme();
      });
    });
    document.getElementById("mp-logout").addEventListener("click", () => {
      if (confirm("ログアウトしますか？(学習データはこのブラウザに残ります)")) {
        Store.clear();
        location.href = "login.html";
      }
    });
  },

  renderFooter() {
    const host = document.getElementById("app-footer");
    if (!host) return;
    if (this.mode === "auth") {
      // ログイン画面はミニマルなコピーライトのみ
      host.innerHTML = `
      <footer class="site-footer" style="text-align:center;padding:24px 0">
        <span>© ${new Date().getFullYear()} ASE-Lab. — Project Reboot / Campus β</span>
      </footer>`;
      return;
    }
    if (this.mode === "campus") {
      // Campusは独立プラットフォームなので、本体サイト等への導線はフッターに集約する
      host.innerHTML = `
      <footer class="campus-footer">
        <div class="cf-grid">
          <div class="cf-brand">
            <div><span class="logo-word">ASE-Lab.</span> <span class="reboot-mark" style="color:#fff;border-color:rgba(255,255,255,.7)">CAMPUS β</span></div>
            <p class="cf-tag">人・知識・情報 — 宇宙を学ぶためのすべてが集まる場所。</p>
            <div class="cf-sns">
              <a href="https://x.com/ASE_lab_" target="_blank" rel="noopener" title="X">𝕏</a>
              <a href="https://www.instagram.com/ase__lab/" target="_blank" rel="noopener" title="Instagram">◎</a>
              <a href="https://www.facebook.com/ASE.lab.community" target="_blank" rel="noopener" title="Facebook">f</a>
              <a href="https://github.com/ase-lab-space/ase-lab" target="_blank" rel="noopener" title="GitHub">⌥</a>
            </div>
          </div>
          <div class="cf-col">
            <h4>CAMPUS</h4>
            <ul>
              <li><a href="dashboard.html">ダッシュボード</a></li>
              <li><a href="seminars.html">ゼミ</a></li>
              <li><a href="courses.html">コース教材</a></li>
              <li><a href="library.html">書籍ライブラリ</a></li>
              <li><a href="roadmap.html">学習ロードマップ</a></li>
              <li><a href="members.html">ランキング</a></li>
              <li><a href="news.html">お知らせ</a></li>
              <li><a href="scoresheet.html">スコアシート発行</a></li>
            </ul>
          </div>
          <div class="cf-col">
            <h4>ASE-Lab.</h4>
            <ul>
              <li><a href="https://ase-lab.space" target="_blank" rel="noopener">公式サイト(トップ)</a></li>
              <li><a href="https://ase-lab.space/about" target="_blank" rel="noopener">About Us / 運営メンバー</a></li>
              <li><a href="https://ase-lab.space/activities" target="_blank" rel="noopener">Activities</a></li>
              <li><a href="https://ase-lab.space/news" target="_blank" rel="noopener">News</a></li>
              <li><a href="https://ase-lab.space/articles" target="_blank" rel="noopener">Articles (note)</a></li>
              <li><a href="https://ase-lab.space/contact" target="_blank" rel="noopener">Contact</a></li>
            </ul>
          </div>
          <div class="cf-col">
            <h4>プロジェクト・参加</h4>
            <ul>
              <li><a href="https://ase-lab.space/activities" target="_blank" rel="noopener">アストロキャンプ</a></li>
              <li><a href="https://docs.google.com/forms/d/e/1FAIpQLSeLGWm5rdl1MFwwIkWf5s_LBXlqpbVhInfbSb7PCsAAjS9yaA/viewform?usp=dialog" target="_blank" rel="noopener">メンバー参加申込</a></li>
              <li><a href="seminars.html">ゼミを立ち上げる</a></li>
              <li><a href="login.html">Campusにログイン</a></li>
            </ul>
          </div>
        </div>
        <div class="cf-bottom">
          <span>© ${new Date().getFullYear()} ASE-Lab. — Project Reboot / Campus β</span>
          <span>※ 構想モック: アカウント・学習記録はブラウザ内(localStorage)にのみ保存されます</span>
        </div>
      </footer>`;
      return;
    }
    host.innerHTML = `
      <div class="footer-hr"></div>
      <footer class="site-footer">
        <div class="social">
          <a href="https://x.com/ASE_lab_" target="_blank" rel="noopener" title="X">𝕏</a>
          <a href="https://www.instagram.com/ase__lab/" target="_blank" rel="noopener" title="Instagram">◎</a>
          <a href="https://www.facebook.com/ASE.lab.community" target="_blank" rel="noopener" title="Facebook">f</a>
          <a href="https://github.com/ase-lab-space/ase-lab" target="_blank" rel="noopener" title="GitHub">⌥</a>
        </div>
        <div class="copy">© ${new Date().getFullYear()} – ASE-Lab.</div>
        <div class="mock-note">※ このサイトは ASE-Lab. 5周年 Reboot プロジェクト — 学習プラットフォーム「Campus」の構想モックです。アカウント・学習記録はブラウザ内(localStorage)にのみ保存されます。</div>
      </footer>`;
  },
};

/* ============ 共通部品 ============ */

/* SVGドーナツ(進捗円グラフ、構想PDFの円グラフ表現) */
function donutSVG(pct, color, size) {
  size = size || 44;
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return `<svg class="pie" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="進捗 ${pct}%">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff" stroke="rgba(255,255,255,.6)" stroke-width="8"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="butt"/>
  </svg>`;
}

/* ゼミカード(現行 SeminarCard 踏襲) */
const SPAN_COLORS = ["red", "green", "blue", "orange", "purple"];
const STYLE_META = { zoom: ["Zoom", "red"], hybrid: ["Hybrid", "orange"], "face-to-face": ["対面", "green"] };

/* ゼミのビジュアル: 実アイコン画像(本番サイトの素材) or フィールド色のフォールバックタイル */
const FIELD_COLORS = {
  "理学": ["#2a1070", "#6d47d9"],
  "工学": ["#083a4a", "#1c7a8c"],
  "情報": ["#0c2f63", "#2f6fbd"],
  "数学": ["#3f1d63", "#8e44ad"],
  "医学": ["#5c1a33", "#c2557f"],
  "法・政策": ["#463607", "#a08322"],
  "ビジネス": ["#5a3407", "#b87317"],
  "生活・文化": ["#1f4a22", "#4e9e57"],
  "共通スキル": ["#37474f", "#78909c"],
};
function seminarVisualHTML(s) {
  if (s.image) return `<img src="${esc(s.image)}" alt="${esc(s.name)}のアイコン" loading="lazy">`;
  const [c1, c2] = FIELD_COLORS[s.field] || ["#37474f", "#78909c"];
  return `<div class="sem-fallback" style="background:linear-gradient(135deg,${c1},${c2})">
    <span class="fnum">#${String(s.id).padStart(2, "0")}</span><span class="ffield">${esc(s.field)}</span></div>`;
}

function seminarChipsHTML(s) {
  const style = STYLE_META[s.style] || [s.style, "grey"];
  const spanColor = SPAN_COLORS[s.id % SPAN_COLORS.length];
  const joined = user && user.seminars.includes(s.id);
  return `<span class="chip ${spanColor}">${esc(s.span)}</span>
    <span class="chip ${style[1]}">${style[0]}</span>
    ${s.status === "企画中" ? '<span class="chip outline">企画中</span>' : ""}
    ${s.status === "終了" ? '<span class="chip grey">終了</span>' : ""}
    ${joined ? '<span class="chip purple">参加中</span>' : ""}`;
}

/* 横型メディアカード(トップ・ダッシュボードのリスト用): 画像左 + 本文右 */
function seminarCardHTML(s, extraHTML) {
  const href = `seminar.html?id=${s.id}`;
  return `<div class="seminar-card" data-seminar="${s.id}">
    <a class="sem-media" href="${href}" style="display:block">${seminarVisualHTML(s)}</a>
    <div class="sem-body">
      <div class="head">
        <a class="title" href="${href}" style="color:inherit;text-decoration:none">#${String(s.id).padStart(2, "0")}-${esc(s.name)}</a>
        ${seminarChipsHTML(s)}
      </div>
      <div class="description">${esc(s.description)}</div>
      <div class="meta"><span>👥 ${s.members}名</span><span>🗓 ${esc(s.schedule)}</span><span>${esc(s.field)}</span></div>
      ${extraHTML ? `<div style="margin-top:10px">${extraHTML}</div>` : ""}
    </div>
  </div>`;
}

/* 縦型タイル(ゼミ一覧ページ用): 大きな画像 + ステータスバッジ(本番 SeminarCard.vue 踏襲) */
const STATUS_BADGE = { "進行中": "#2e7d32", "企画中": "#b26e0e", "終了": "#9e9e9e" };
function seminarTileHTML(s, extraHTML) {
  const href = `seminar.html?id=${s.id}`;
  return `<div class="seminar-tile" data-seminar="${s.id}">
    <a class="tile-media" href="${href}" style="display:block">
      ${seminarVisualHTML(s)}
      <span class="tile-badge" style="background:${STATUS_BADGE[s.status] || "#9e9e9e"}">${esc(s.status)}</span>
    </a>
    <div class="tile-body">
      <div class="head">
        <a class="title" href="${href}" style="color:inherit;text-decoration:none">#${String(s.id).padStart(2, "0")}-${esc(s.name)}</a>
        ${seminarChipsHTML(s)}
      </div>
      <div class="description">${esc(s.description)}</div>
      <div class="meta"><span>👥 ${s.members}名</span><span>🗓 ${esc(s.schedule)}</span><span>${esc(s.field)}</span></div>
      ${extraHTML ? `<div style="margin-top:auto;padding-top:10px">${extraHTML}</div>` : ""}
    </div>
  </div>`;
}

/* GitHub風学習カレンダー(直近weeks週) */
function calendarHTML(u, weeks) {
  weeks = weeks || 15;
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1) - today.getDay());
  let cells = "";
  const d = new Date(start);
  while (d <= today) {
    const v = u ? u.activity[dkey(d)] || 0 : 0;
    const lv = v >= 15 ? 3 : v >= 8 ? 2 : v >= 1 ? 1 : 0;
    cells += `<i class="${lv ? "l" + lv : ""}" title="${dkey(d)}: ${v} SCORE"></i>`;
    d.setDate(d.getDate() + 1);
  }
  return `<div class="cal-grid">${cells}</div>
    <div class="cal-legend">少 <i></i><i class="l1"></i><i class="l2"></i><i class="l3"></i> 多</div>`;
}

/* 未ログイン時にログインページへ誘導するガード */
function requireLogin() {
  if (!user) { location.href = "login.html"; return false; }
  return true;
}

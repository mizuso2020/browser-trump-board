/**
 * ゲームカタログ画面の描画
 */

const GamesCatalog = {
  renderGameIcon: function (game) {
    const cat = GAME_CATEGORIES[game.category];
    const src = game.iconImage || (cat && cat.iconImage);
    if (src) {
      return '<img class="play-tile-icon-img" src="' + src + '" alt="" width="40" height="40" loading="lazy" decoding="async">';
    }
    return '<span class="play-tile-icon">' + (cat ? cat.icon : "🎮") + '</span>';
  },

  renderPlayAction: function (game) {
    if (game.status !== "live") {
      return '<span class="btn btn-ghost" style="pointer-events:none">準備中</span>';
    }
    let html = '<div class="play-tile-foot">';
    html += '<a href="./play.html?v=20260712&game=' + encodeURIComponent(game.id) + '" class="btn btn-primary">遊ぶ</a>';
    if (game.playCaution) {
      html += '<span class="play-tile-caution">' + escapeHtml(game.playCaution) + "</span>";
    }
    html += "</div>";
    return html;
  },

  renderPlayTile: function (game) {
    const cat = GAME_CATEGORIES[game.category];
    const badge = game.status === "soon"
      ? '<span class="badge badge-soon">準備中</span>'
      : "";
    const players = GameRegistry.formatPlayers(game.minPlayers, game.maxPlayers);

    let html = '<article class="play-tile' + (game.status === "soon" ? " is-soon" : "") + '">';
    html += '<div class="play-tile-top">' + this.renderGameIcon(game) + badge + '</div>';
    html += '<h3>' + escapeHtml(game.name) + '</h3>';
    html += '<p class="play-tile-desc">' + escapeHtml(game.description) + '</p>';
    html += '<span class="play-tile-meta">' + (cat ? cat.name : "") + ' · ' + players + '</span>';
    html += this.renderPlayAction(game);
    html += '</article>';
    return html;
  },

  renderPlayGrid: function (games) {
    if (!games.length) return '<p class="note">まだゲームがありません</p>';
    return '<div class="play-grid">' + games.map(function (g) {
      return GamesCatalog.renderPlayTile(g);
    }).join("") + '</div>';
  },

  renderCard: function (game) {
    const badge = game.status === "live"
      ? '<span class="badge badge-live">遊ぶ</span>'
      : '<span class="badge badge-soon">準備中</span>';
    const players = GameRegistry.formatPlayers(game.minPlayers, game.maxPlayers);
    const cat = GAME_CATEGORIES[game.category];

    return (
      '<article class="catalog-card' + (game.status === "soon" ? " is-soon" : "") + '" data-category="' + game.category + '">' +
        '<div class="catalog-card-head">' +
          '<span class="catalog-cat">' + (cat ? cat.icon + " " + cat.name : "") + '</span>' +
          badge +
        '</div>' +
        '<h3>' + escapeHtml(game.name) + '</h3>' +
        '<div class="catalog-card-foot">' +
          '<span class="catalog-players">👥 ' + players + '</span>' +
          '<a href="guide.html#' + escapeHtml(game.id) + '" class="catalog-action">説明を見る</a>' +
          (game.status === "live"
            ? ' · <a href="./play.html?v=20260712&game=' + encodeURIComponent(game.id) + '" class="catalog-action">遊ぶ →</a>' +
              (game.playCaution ? ' <span class="play-tile-caution">' + escapeHtml(game.playCaution) + "</span>" : "")
            : '') +
        '</div>' +
      '</article>'
    );
  },

  renderCategorySection: function (categoryId, games, showEmpty) {
    if (!games.length && !showEmpty) return "";
    const cat = GAME_CATEGORIES[categoryId];
    if (!cat) return "";

    const cards = games.map(function (g) { return GamesCatalog.renderCard(g); }).join("");

    return (
      '<section class="catalog-section" data-cat-section="' + categoryId + '">' +
        '<h2 class="catalog-section-title">' + cat.icon + ' ' + cat.name +
          ' <span class="catalog-count">(' + games.length + ')</span></h2>' +
        '<div class="catalog-grid">' + (cards || '<p class="note">まだゲームがありません</p>') + '</div>' +
      '</section>'
    );
  },

  renderCategoryIcon: function (cat) {
    if (!cat) return '<span class="category-hub-icon">🎮</span>';
    if (cat.iconImage) {
      return '<img class="category-hub-icon-img" src="' + cat.iconImage + '" alt="" width="48" height="48" loading="lazy" decoding="async">';
    }
    return '<span class="category-hub-icon">' + cat.icon + "</span>";
  },

  renderCategoryPlaySection: function (categoryId, games) {
    if (!games.length) return "";
    const cat = GAME_CATEGORIES[categoryId];
    if (!cat) return "";

    return (
      '<section class="catalog-section" id="cat-' + categoryId + '" data-cat-section="' + categoryId + '">' +
        '<h2 class="catalog-section-title">' + cat.icon + " " + escapeHtml(cat.name) +
          ' <span class="catalog-count">(' + games.length + ")</span></h2>" +
        (cat.description ? '<p class="section-lead">' + escapeHtml(cat.description) + "</p>" : "") +
        this.renderPlayGrid(games) +
      "</section>"
    );
  },

  renderCategoriesPage: function () {
    let html = '<section class="guide-intro">';
    html += "<h1>カテゴリ</h1>";
    html += '<p class="section-lead">ジャンル別にゲームを探せます。タップで各カテゴリへ移動します。</p>';
    html += "</section>";

    html += '<section class="card"><div class="category-hub">';
    const self = this;
    Object.keys(GAME_CATEGORIES).forEach(function (key) {
      const cat = GAME_CATEGORIES[key];
      const games = GameRegistry.catalogByCategory(key);
      const live = games.filter(function (g) { return g.status === "live"; }).length;
      html += '<a href="#cat-' + key + '" class="category-hub-card">';
      html += self.renderCategoryIcon(cat);
      html += "<h3>" + escapeHtml(cat.name) + "</h3>";
      html += "<p>" + escapeHtml(cat.description || "") + "</p>";
      html += '<span class="category-hub-count">' + games.length + "タイトル";
      if (live) html += " · 遊べる " + live;
      html += "</span></a>";
    });
    html += "</div></section>";

    Object.keys(GAME_CATEGORIES).forEach(function (key) {
      html += self.renderCategoryPlaySection(key, GameRegistry.catalogByCategory(key));
    });

    return html;
  },

  renderHomeCatalog: function () {
    const counts = GameRegistry.countByStatus();
    const games = GameRegistry.catalogGames().slice().sort(function (a, b) {
      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;
      const ao = a.priorityOrder || 999;
      const bo = b.priorityOrder || 999;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name, "ja");
    });

    let html = '<section class="guide-intro">';
    html += '<h1>ゲーム一覧</h1>';
    html += '<p class="section-lead">遊べる <strong>' + counts.live + '</strong> タイトル · 準備中 <strong>' + counts.soon + '</strong> タイトル</p>';
    html += '<p class="section-lead">ゲームを選んで遊んでください。ジャンル別は<a href="categories.html" class="text-link">カテゴリ</a>、遊び方は<a href="guide.html" class="text-link">ガイド</a>をご覧ください。</p>';
    html += '</section>';
    html += '<section class="card">';
    html += this.renderPlayGrid(games);
    html += '</section>';
    return html;
  },

  renderFeatured: function () {
    const games = GameRegistry.featured();
    if (!games.length) return "";

    let html = '<section class="card">';
    html += '<h2>今すぐ遊べる</h2>';
    html += '<p class="section-lead">タップしてルーム作成。説明は<a href="guide.html" class="text-link">遊び方ガイド</a>へ</p>';
    html += this.renderPlayGrid(games);
    html += '</section>';
    return html;
  },

  renderFullPage: function (filterCategory) {
    const counts = GameRegistry.countByStatus();
    let html = '';

    html += '<section class="guide-intro">';
    html += '<h1>ゲーム一覧</h1>';
    html += '<p class="section-lead">遊べるのは<strong>' + counts.live + '</strong>タイトル · 準備中<strong>' + counts.soon + '</strong>タイトル</p>';
    html += '</section>';

    html += this.renderFeatured();

    html += '<section class="card">';
    html += '<div class="filter-bar">';
    html += '<button class="filter-btn is-active" data-filter="all">すべて</button>';
    Object.keys(GAME_CATEGORIES).forEach(function (key) {
      const c = GAME_CATEGORIES[key];
      const n = GameRegistry.catalogByCategory(key).length;
      html += '<button class="filter-btn" data-filter="' + key + '">' + c.icon + ' ' + c.name + ' (' + n + ')</button>';
    });
    html += '</div></section>';

    Object.keys(GAME_CATEGORIES).forEach(function (key) {
      if (filterCategory && filterCategory !== key) return;
      const games = GameRegistry.catalogByCategory(key);
      html += GamesCatalog.renderCategorySection(key, games);
    });

    return html;
  },

  renderGameRulesPanel: function (g) {
    if (g.id === "werewolf" && typeof WerewolfGame !== "undefined" && WerewolfGame.renderGameGuide) {
      return WerewolfGame.renderGameGuide();
    }
    const rules = typeof GameRegistry.getRules === "function" ? GameRegistry.getRules(g.id) : null;
    if (!rules || (Array.isArray(rules) && !rules.length)) return "";

    let html = '<div class="guide-toggle-wrap">';
    html += '<button type="button" class="btn btn-primary guide-toggle-btn" data-guide-toggle="' +
      escapeHtml(g.id) + '" aria-expanded="false">ルールを見る</button>';
    html += '<div class="guide-toggle-panel hidden" id="guide-' + escapeHtml(g.id) + '">';

    if (Array.isArray(rules)) {
      html += '<ul class="clue-list guide-rules-list">';
      rules.forEach(function (line) {
        html += "<li>" + escapeHtml(line) + "</li>";
      });
      html += "</ul>";
    } else {
      if (rules.summary) {
        html += '<p class="guide-rules-summary">' + escapeHtml(rules.summary) + "</p>";
      }
      (rules.sections || []).forEach(function (sec) {
        html += '<section class="guide-rules-section">';
        if (sec.title) html += '<h4 class="guide-rules-heading">' + escapeHtml(sec.title) + "</h4>";
        if (sec.body) html += '<p class="guide-rules-body">' + escapeHtml(sec.body) + "</p>";
        if (sec.items && sec.items.length) {
          html += '<ul class="clue-list guide-rules-list">';
          sec.items.forEach(function (line) {
            html += "<li>" + escapeHtml(line) + "</li>";
          });
          html += "</ul>";
        }
        html += "</section>";
      });
    }

    html += "</div></div>";
    return html;
  },

  renderGuidePage: function () {
    const counts = GameRegistry.countByStatus();
    let html = '<section class="guide-intro">';
    html += "<h1>遊び方ガイド</h1>";
    html += '<p class="section-lead">各ゲームのルールです。遊べるタイトルは<strong>' + counts.live +
      "</strong>、準備中は<strong>" + counts.soon + "</strong>あります。</p>";
    html += "</section>";

    Object.keys(GAME_CATEGORIES).forEach(function (key) {
      const cat = GAME_CATEGORIES[key];
      const games = GameRegistry.catalogByCategory(key);
      if (!games.length) return;

      html += '<section class="guide-block">';
      html += '<h2 class="guide-block-title">' + cat.icon + " " + cat.name + "</h2>";

      games.forEach(function (g) {
        const badge = g.status === "live"
          ? '<span class="badge badge-live">遊ぶ</span>'
          : '<span class="badge badge-soon">準備中</span>';

        html += '<article class="guide-item" id="' + escapeHtml(g.id) + '">';
        html += '<div class="guide-item-head"><h3>' + escapeHtml(g.name) + "</h3>" + badge + "</div>";
        html += "<p>" + escapeHtml(g.description) + "</p>";
        html += GamesCatalog.renderGameRulesPanel(g);
        html += '<div class="guide-item-foot">';
        html += '<span class="play-tile-meta">👥 ' + GameRegistry.formatPlayers(g.minPlayers, g.maxPlayers) + "</span>";
        if (g.status === "live") {
          html += '<div class="guide-item-play">';
          html += '<a href="play.html?v=20260715&game=' + encodeURIComponent(g.id) + '" class="btn btn-primary">このゲームで遊ぶ</a>';
          if (g.playCaution) {
            html += '<span class="play-tile-caution">' + escapeHtml(g.playCaution) + "</span>";
          }
          html += "</div>";
        }
        html += "</div></article>";
      });

      html += "</section>";
    });

    return html;
  },

  renderPreview: function (limit) {
    const live = GameRegistry.live().slice(0, limit || 1);
    if (live.length && live[0].id === "werewolf" && typeof WerewolfGame !== "undefined") {
      return WerewolfGame.renderRoleCatalogGrid();
    }
    return this.renderPlayGrid(live);
  },

  renderPriority: function () {
    return "";
  },

  bindGuideToggles: function (container) {
    if (!container) return;
    container.querySelectorAll("[data-guide-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const targetId = "guide-" + btn.dataset.guideToggle;
        const panel = document.getElementById(targetId);
        if (!panel) return;
        const open = panel.classList.toggle("hidden");
        const isOpen = !open;
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        btn.textContent = isOpen ? "説明を閉じる" : "説明を見る";
      });
    });
  },

  bindFilters: function (container) {
    const sections = container.querySelectorAll("[data-cat-section]");
    container.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        container.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        const filter = btn.dataset.filter;
        sections.forEach(function (sec) {
          if (filter === "all") {
            sec.classList.remove("hidden");
          } else {
            sec.classList.toggle("hidden", sec.dataset.catSection !== filter);
          }
        });
      });
    });
  }
};

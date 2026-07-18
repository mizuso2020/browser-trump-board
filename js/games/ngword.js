/**
 * NGワードゲーム
 * 各自に「言っちゃダメなワード」が割り当てられる。
 * 自分のNGワードは見えず、他の人のNGワードだけ分かる。
 */

const NgWordGame = {
  id: "ngword",
  name: "NGワードゲーム",
  minPlayers: 3,
  maxPlayers: 8,

  /**
   * 同じテーマ内の関連ワード。会話がその話題に寄ると自然と言いやすい。
   */
  THEME_SETS: [
    {
      id: "pet",
      name: "ペット・動物",
      hint: "ペットや動物の話になると「犬」「猫」「散歩」などが出やすい",
      words: ["犬", "猫", "うさぎ", "散歩", "ペット", "動物", "かわいい", "餌"]
    },
    {
      id: "food",
      name: "ごはん・食べ物",
      hint: "食事の話になると「ラーメン」「美味しい」「お腹」などが出やすい",
      words: ["ラーメン", "寿司", "カレー", "ごはん", "美味しい", "食べる", "お腹", "コンビニ"]
    },
    {
      id: "summer",
      name: "夏・レジャー",
      hint: "季節や遊びの話になると「夏」「海」「暑い」などが出やすい",
      words: ["夏", "海", "暑い", "プール", "休み", "旅行", "泳ぐ", "アイス"]
    },
    {
      id: "school",
      name: "学校・勉強",
      hint: "学生あるあるの話になると「宿題」「テスト」「先生」などが出やすい",
      words: ["学校", "宿題", "テスト", "先生", "授業", "勉強", "クラス", "休み時間"]
    },
    {
      id: "entertainment",
      name: "映画・エンタメ",
      hint: "暇つぶしの話になると「映画」「面白い」「YouTube」などが出やすい",
      words: ["映画", "ドラマ", "音楽", "YouTube", "面白い", "見る", "芸能人", "ネタ"]
    },
    {
      id: "mobile",
      name: "スマホ・ゲーム",
      hint: "スマホやゲームの話になると「アプリ」「友達」「動画」などが出やすい",
      words: ["スマホ", "ゲーム", "アプリ", "動画", "友達", "通話", "充電", "暇"]
    },
    {
      id: "commute",
      name: "通勤・移動",
      hint: "出かけ方の話になると「電車」「駅」「遅刻」などが出やすい",
      words: ["電車", "バス", "駅", "遅刻", "通勤", "乗る", "満員", "帰り"]
    },
    {
      id: "shopping",
      name: "買い物・お金",
      hint: "買い物の話になると「服」「高い」「セール」などが出やすい",
      words: ["買い物", "服", "お金", "セール", "店", "欲しい", "高い", "カバン"]
    },
    {
      id: "romance",
      name: "恋愛・人間関係",
      hint: "恋や友達の話になると「好き」「付き合う」「タイプ」などが出やすい",
      words: ["好き", "恋人", "付き合う", "タイプ", "告白", "友達", "モテる", "デート"]
    },
    {
      id: "daily",
      name: "朝・生活リズム",
      hint: "生活の話になると「朝」「眠い」「起きる」などが出やすい",
      words: ["朝", "眠い", "起きる", "寝る", "アラーム", "遅刻", "疲れた", "休日"]
    }
  ],

  RANDOM_THEME_ID: "random",

  LOBBY_THEMES: [
    { id: "random", name: "おまかせ", hint: "ジャンルをランダムで決めます" }
  ],

  isRemoteRoom: function (room) {
    return room.mode === "room" || room.mode === "online";
  },

  canManage: function (ctx) {
    return ctx.isHost || ctx.room.mode === "local";
  },

  ensureLobbySetup: function (room) {
    if (!room.lobbyNgword) {
      room.lobbyNgword = { themeId: this.RANDOM_THEME_ID };
    }
    return room.lobbyNgword;
  },

  selectLobbyTheme: function (room, themeId) {
    const lobby = this.ensureLobbySetup(room);
    lobby.themeId = themeId || this.RANDOM_THEME_ID;
    return room;
  },

  getLobbyThemeOptions: function () {
    return this.LOBBY_THEMES.concat(this.THEME_SETS);
  },

  getLobbyThemeMeta: function (themeId) {
    const options = this.getLobbyThemeOptions();
    return options.find(function (t) { return t.id === themeId; }) || options[0];
  },

  isThemeAvailable: function (theme, playerCount) {
    if (!theme || theme.id === this.RANDOM_THEME_ID) return true;
    return theme.words && theme.words.length >= playerCount;
  },

  canStartWithLobby: function (room) {
    const lobby = this.ensureLobbySetup(room);
    const meta = this.getLobbyThemeMeta(lobby.themeId);
    return this.isThemeAvailable(meta, room.players.length);
  },

  pickRandomTheme: function (playerCount) {
    const eligible = this.THEME_SETS.filter(function (theme) {
      return theme.words.length >= playerCount;
    });
    const pool = eligible.length ? eligible : this.THEME_SETS.slice();
    return shuffle(pool)[0];
  },

  resolveTheme: function (themeId, playerCount) {
    if (!themeId || themeId === this.RANDOM_THEME_ID) {
      return this.pickRandomTheme(playerCount);
    }
    const theme = this.THEME_SETS.find(function (t) { return t.id === themeId; });
    if (!theme || !this.isThemeAvailable(theme, playerCount)) {
      return this.pickRandomTheme(playerCount);
    }
    return theme;
  },

  assignWords: function (room) {
    const lobby = this.ensureLobbySetup(room);
    const theme = this.resolveTheme(lobby.themeId, room.players.length);
    const words = shuffle(theme.words.slice()).slice(0, room.players.length);
    const ngWords = {};
    room.players.forEach(function (p, i) {
      ngWords[p.id] = words[i];
    });
    return {
      ngWords: ngWords,
      themeId: theme.id,
      themeName: theme.name,
      themeHint: theme.hint
    };
  },

  renderLobbySetup: function (room, canManage) {
    const lobby = this.ensureLobbySetup(room);
    const count = room.players.length;
    const html = ['<section class="card setup-panel lobby-setup-panel">'];
    const self = this;

    html.push('<h2>ジャンル選択</h2>');
    html.push('<p class="section-lead">お題のジャンルを選んでください（全員同じジャンルの関連ワードが配られます）</p>');
    html.push('<div class="setup-options ngword-theme-options">');

    this.getLobbyThemeOptions().forEach(function (theme) {
      const selected = lobby.themeId === theme.id;
      const available = self.isThemeAvailable(theme, count);
      const hint = theme.hint + (available ? "" : "（この人数では選べません）");

      if (canManage) {
        html.push(
          '<button type="button" class="setup-option' + (selected ? " is-selected" : "") + (!available ? " is-disabled" : "") + '" data-action="ng-lobby-theme" data-theme="' + escapeHtml(theme.id) + '" ' + (!available ? "disabled" : "") + '>' +
            '<span class="setup-option-name">' + escapeHtml(theme.name) + '</span>' +
            '<span class="setup-option-hint">' + escapeHtml(hint) + '</span>' +
          '</button>'
        );
      } else if (selected) {
        html.push(
          '<div class="setup-option setup-option--readonly is-selected">' +
            '<span class="setup-option-name">' + escapeHtml(theme.name) + '</span>' +
            '<span class="setup-option-hint">' + escapeHtml(theme.hint) + '</span>' +
          '</div>'
        );
      }
    });

    html.push('</div>');

    if (!canManage) {
      html.push('<p class="note">ホストがジャンルを選びます</p>');
    } else if (!this.canStartWithLobby(room)) {
      html.push('<p class="note custom-role-error">選択中のジャンルは現在の人数では使えません</p>');
    }

    html.push('</section>');
    return html.join("");
  },

  init: function (room) {
    const assignment = this.assignWords(room);
    const scores = {};
    room.players.forEach(function (p) {
      scores[p.id] = 0;
    });
    room.gameState = {
      ngWords: assignment.ngWords,
      themeId: assignment.themeId,
      themeName: assignment.themeName,
      themeHint: assignment.themeHint,
      eliminated: [],
      scores: scores,
      openViolations: {},
      viewIndex: 0,
      winnerId: null
    };
    room.phase = "ngword_play";
    return room;
  },

  getActivePlayers: function (room) {
    const gs = room.gameState;
    return room.players.filter(function (p) {
      return gs.eliminated.indexOf(p.id) < 0;
    });
  },

  isEliminated: function (room, playerId) {
    return room.gameState.eliminated.indexOf(playerId) >= 0;
  },

  ensureOpenViolations: function (gs) {
    if (!gs.openViolations) gs.openViolations = {};
  },

  getViolation: function (gs, targetId) {
    this.ensureOpenViolations(gs);
    return gs.openViolations[targetId] || null;
  },

  getNextBuzzPoints: function (room, targetId) {
    const gs = room.gameState;
    const violation = this.getViolation(gs, targetId);
    const n = violation ? violation.n : this.getActivePlayers(room).length;
    const buzzCount = violation ? violation.buzzers.length : 0;
    return n - buzzCount - 1;
  },

  canBuzzTarget: function (room, targetId, actorId) {
    if (!targetId) return false;
    if (actorId && actorId === targetId) return false;
    if (actorId && this.isEliminated(room, actorId)) return false;
    if (this.getNextBuzzPoints(room, targetId) <= 0) return false;

    const violation = this.getViolation(room.gameState, targetId);
    if (!violation) return !this.isEliminated(room, targetId);
    if (actorId && violation.buzzers.indexOf(actorId) >= 0) return false;
    return true;
  },

  shouldShowViolationButton: function (ctx, targetId) {
    const actorId = ctx.me ? ctx.me.id : null;
    return this.canBuzzTarget(ctx.room, targetId, actorId);
  },

  getViewPlayer: function (room) {
    return room.players[room.gameState.viewIndex] || room.players[0];
  },

  cycleViewPlayer: function (room) {
    if (room.players.length < 2) return room;
    room.gameState.viewIndex = (room.gameState.viewIndex + 1) % room.players.length;
    return room;
  },

  getAllNgWords: function (ctx) {
    const gs = ctx.room.gameState;
    if (!ctx.isOnline) {
      return gs.ngWords || {};
    }
    if (ctx.room.phase === "ngword_end" && gs.revealedNgWords) {
      return gs.revealedNgWords;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.ngWords) {
      return ctx.hostSecrets.ngWords;
    }
    return null;
  },

  getOthersWords: function (ctx) {
    const me = ctx.me;
    if (!me) return {};

    if (!ctx.isOnline) {
      const all = ctx.room.gameState.ngWords || {};
      const viewId = this.getViewPlayer(ctx.room).id;
      const others = {};
      Object.keys(all).forEach(function (pid) {
        if (pid !== viewId) others[pid] = all[pid];
      });
      return others;
    }

    if (ctx.secrets && ctx.secrets.ngOthers) {
      return ctx.secrets.ngOthers;
    }

    const all = this.getAllNgWords(ctx);
    if (!all) return {};
    const others = {};
    Object.keys(all).forEach(function (pid) {
      if (pid !== me.id) others[pid] = all[pid];
    });
    return others;
  },

  getMyWord: function (ctx) {
    if (ctx.room.phase === "ngword_end") {
      const revealed = ctx.room.gameState.revealedNgWords;
      return revealed && ctx.me ? revealed[ctx.me.id] : null;
    }
    if (!ctx.isOnline && ctx.me) {
      return ctx.room.gameState.ngWords[ctx.me.id];
    }
    return null;
  },

  markPlayerViolation: function (room, targetId, actorId) {
    const gs = room.gameState;
    const result = {
      points: 0,
      rank: 0,
      targetEliminated: false,
      duplicate: false,
      closed: false,
      noPoints: false
    };

    if (!targetId) return { room: room, result: result };

    this.ensureOpenViolations(gs);
    let violation = this.getViolation(gs, targetId);
    const targetAlreadyOut = this.isEliminated(room, targetId);

    if (!violation && targetAlreadyOut) {
      result.noPoints = true;
      return { room: room, result: result };
    }

    if (!violation) {
      const n = this.getActivePlayers(room).length;
      violation = { n: n, buzzers: [] };
      gs.openViolations[targetId] = violation;
      gs.eliminated.push(targetId);
      result.targetEliminated = true;
    }

    if (actorId) {
      if (this.isEliminated(room, actorId)) return { room: room, result: result };
      if (violation.buzzers.indexOf(actorId) >= 0) {
        result.duplicate = true;
        return { room: room, result: result };
      }
    }

    const points = violation.n - violation.buzzers.length - 1;
    if (points <= 0) {
      result.noPoints = true;
      result.closed = true;
      return { room: room, result: result };
    }

    if (actorId) {
      violation.buzzers.push(actorId);
      gs.scores[actorId] = (gs.scores[actorId] || 0) + points;
      result.rank = violation.buzzers.length;
    }
    result.points = points;

    if (violation.buzzers.length >= violation.n - 1) {
      result.closed = true;
    }

    const active = this.getActivePlayers(room);
    if (active.length <= 1) {
      this.resolveWinner(room);
      gs.finished = true;
      room.phase = "ngword_end";
    }

    return { room: room, result: result };
  },

  resolveWinner: function (room) {
    const gs = room.gameState;
    let bestId = null;
    let bestScore = -1;
    room.players.forEach(function (p) {
      const score = gs.scores[p.id] || 0;
      if (score > bestScore) {
        bestScore = score;
        bestId = p.id;
      }
    });
    gs.winnerId = bestId;
  },

  finishSession: function (room) {
    this.resolveWinner(room);
    room.gameState.finished = true;
    room.phase = "ngword_end";
    return room;
  },

  prepareEndReveal: function (room, ctx) {
    const gs = room.gameState;
    if (gs.revealedNgWords) return room;
    if (!ctx.isOnline && gs.ngWords) {
      gs.revealedNgWords = Object.assign({}, gs.ngWords);
    } else if (ctx.hostSecrets && ctx.hostSecrets.ngWords) {
      gs.revealedNgWords = Object.assign({}, ctx.hostSecrets.ngWords);
    }
    return room;
  },

  getPlayerName: function (room, playerId) {
    const p = room.players.find(function (pl) { return pl.id === playerId; });
    return p ? p.name : "？";
  },

  renderOthersPanel: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const others = this.getOthersWords(ctx);
    const remote = this.isRemoteRoom(room);
    const html = ['<section class="card secret-panel"><h2>みんなのNGワード</h2>'];

    if (remote) {
      html.push('<p class="note">他の人のNGワードだけ見えます。<strong>自分のは表示されません。</strong></p>');
    } else {
      const viewer = this.getViewPlayer(room);
      html.push('<p class="note"><strong>' + escapeHtml(viewer.name) + '</strong> さんは自分のNGワードを見ないでください。</p>');
    }

    html.push('<ul class="player-list ngword-word-list">');
    room.players.forEach(function (p) {
      const out = gs.eliminated.indexOf(p.id) >= 0;
      const isSelfHidden = remote
        ? (ctx.me && p.id === ctx.me.id)
        : (p.id === NgWordGame.getViewPlayer(room).id);

      html.push('<li class="' + (out ? "is-eliminated" : "") + '">');
      html.push('<span>' + escapeHtml(p.name) + (out ? "（脱落）" : "") + '</span>');

      if (isSelfHidden && !out && room.phase !== "ngword_end") {
        html.push('<span class="ngword-hidden-word">❓ ？？？</span>');
      } else if (others[p.id]) {
        html.push('<span class="ngword-forbidden-word">' + escapeHtml(others[p.id]) + '</span>');
      } else if (room.phase === "ngword_end" && gs.revealedNgWords && gs.revealedNgWords[p.id]) {
        html.push('<span class="ngword-forbidden-word">' + escapeHtml(gs.revealedNgWords[p.id]) + '</span>');
      } else {
        html.push('<span class="ngword-hidden-word">—</span>');
      }
      html.push('</li>');
    });
    html.push('</ul></section>');
    return html.join("");
  },

  renderViolationButtons: function (ctx) {
    const room = ctx.room;
    const html = ['<section class="card ngword-buzz-panel"><h2>⚡ 早押しで点ゲット！</h2>'];

    if (ctx.me && this.isEliminated(room, ctx.me.id)) {
      html.push('<p class="note">脱落したため、早押しボタンは使えません</p>');
      html.push('</section>');
      return html.join("");
    }

    html.push('<p class="note">誰かがNGワードを言ったら早押しで「○○が言った！」のボタンを押そう</p>');
    html.push('<div class="btn-row ngword-violation-row">');

    let hasTarget = false;
    const self = this;
    room.players.forEach(function (p) {
      if (!self.shouldShowViolationButton(ctx, p.id)) return;
      hasTarget = true;
      html.push(
        '<button type="button" class="btn btn-danger ngword-buzz-btn" data-action="ng-violation" data-player="' +
        escapeHtml(p.id) + '">⚡ ' + escapeHtml(p.name) + 'が言った！</button>'
      );
    });

    if (!hasTarget) {
      html.push('<p class="note">今押せる早押しボタンはありません</p>');
    }
    html.push('</div></section>');
    return html.join("");
  },

  renderScoreList: function (room, title) {
    const gs = room.gameState;
    const html = ['<section class="card"><h2>' + (title || "スコア") + '</h2><ul class="player-list">'];
    room.players.forEach(function (p) {
      const out = gs.eliminated.indexOf(p.id) >= 0;
      const points = gs.scores[p.id] || 0;
      let status = out ? "脱落" : "生存";
      if (gs.winnerId === p.id) status = "勝利";
      html.push('<li><span>' + escapeHtml(p.name) + ' <small>(' + status + ')</small></span><span><strong>' + points + '点</strong></span></li>');
    });
    html.push('</ul></section>');
    return html.join("");
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const canManage = this.canManage(ctx);
    const remote = this.isRemoteRoom(room);
    const activeCount = this.getActivePlayers(room).length;

    if (room.phase === "ngword_end") {
      html.push('<div class="phase-banner"><h2>ゲーム終了</h2>');
      if (gs.winnerId) {
        html.push('<p><strong>' + escapeHtml(this.getPlayerName(room, gs.winnerId)) + '</strong> さんの勝利！（' + (gs.scores[gs.winnerId] || 0) + '点）</p>');
      } else {
        html.push('<p>お疲れさまでした</p>');
      }
      html.push('</div>');
      html.push(this.renderOthersPanel(ctx));
      html.push(this.renderScoreList(room, "結果"));
      return html.join("");
    }

    html.push('<div class="phase-banner"><h2>NGワードゲーム</h2>');
    html.push('<p>自由に会話しながら、<strong>自分のNGワードを言わない</strong>ように！</p>');
    html.push('<p class="note" style="margin-top:0.35rem">⚡ 相手がNGワードを言ったら<strong>早押し</strong>。早い順に点が入ります</p>');
    if (gs.themeName) {
      html.push('<p class="note" style="margin-top:0.5rem">今回のテーマ: <strong>' + escapeHtml(gs.themeName) + '</strong></p>');
    }
    if (gs.themeHint) {
      html.push('<p class="note">' + escapeHtml(gs.themeHint) + '</p>');
    }
    html.push('<p class="note">生存 ' + activeCount + '人</p></div>');

    if (remote && ctx.me) {
      html.push('<section class="card"><p class="note">あなたのNGワード: <strong>❓ 自分では分かりません</strong>（他の人だけが知っています）</p></section>');
    } else if (!remote) {
      html.push('<section class="card">');
      html.push('<p class="note">📱 端末を回して、<strong>' + escapeHtml(this.getViewPlayer(room).name) + '</strong> さん以外が画面を見てください。</p>');
      html.push('<button type="button" class="btn btn-secondary btn-block" data-action="ng-next-view">次の人に渡す</button>');
      html.push('</section>');
    }

    html.push(this.renderOthersPanel(ctx));
    html.push(this.renderViolationButtons(ctx));
    html.push(this.renderScoreList(room, "スコア"));

    html.push('<section class="card"><h2>ルール</h2><ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">');
    html.push('<li>全員に1つずつ <strong>言っちゃダメなワード</strong> が割り当てられます</li>');
    html.push('<li><strong>自分のNGワードは見えません。</strong>他の人のNGワードだけ分かります</li>');
    html.push('<li>会話の中で相手にNGワードを言わせて自分のNGワードは言わないように気を付けよう</li>');
    html.push('<li>誰かがNGワードを言ったら早押しで「○○が言った！」のボタンを押そう早い順で点が入るよ</li>');
    html.push('<li>最終的に<strong>点数が一番多い人</strong>が勝ち</li>');
    html.push('</ul></section>');

    if (canManage && remote) {
      html.push('<button type="button" class="btn btn-secondary btn-block" data-action="ng-finish">ゲームを終了</button>');
    }

    return html.join("");
  }
};

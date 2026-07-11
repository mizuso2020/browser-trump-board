/**
 * NGワードゲーム（タブー型）
 * お題を説明するが、NGワードは言ってはいけない
 */

const NgWordGame = {
  id: "ngword",
  name: "NGワードゲーム",
  minPlayers: 3,
  maxPlayers: 8,

  CARDS: [
    { word: "りんご", ng: ["赤", "果物", "甘い", "木"] },
    { word: "寿司", ng: ["魚", "シャリ", "ネタ", "回転"] },
    { word: "夏休み", ng: ["海", "宿題", "プール", "暑い"] },
    { word: "ラーメン", ng: ["麺", "スープ", "チャーシュー", "博多"] },
    { word: "映画", ng: ["俳優", "映画館", "ポップコーン", "監督"] },
    { word: "犬", ng: ["ペット", "ワンワン", "散歩", "猫"] },
    { word: "学校", ng: ["先生", "宿題", "教室", "生徒"] },
    { word: "スマホ", ng: ["電話", "アプリ", "画面", "iPhone"] },
    { word: "旅行", ng: ["飛行機", "ホテル", "観光", "温泉"] },
    { word: "誕生日", ng: ["ケーキ", "プレゼント", "年", "パーティー"] },
    { word: "野球", ng: ["バット", "ホームラン", "グローブ", "球場"] },
    { word: "雪", ng: ["白", "寒い", "スキー", "冬"] }
  ],

  init: function (room) {
    const card = shuffle(this.CARDS)[0];
    room.gameState = {
      card: card,
      explainerIndex: 0,
      explainerId: room.players[0].id,
      round: 1,
      scores: {},
      phase: "explain",
      revealed: false
    };
    room.players.forEach(function (p) {
      room.gameState.scores[p.id] = 0;
    });
    room.phase = "ngword_play";
    return room;
  },

  getExplainer: function (room) {
    return room.players.find(function (p) { return p.id === room.gameState.explainerId; });
  },

  isExplainer: function (ctx) {
    return ctx.room.gameState.explainerId === ctx.me.id;
  },

  _actingExplainer: function (ctx) {
    if (!ctx.isOnline) return ctx.room.gameState.explainerId;
    return ctx.me.id;
  },

  revealCard: function (room) {
    room.gameState.revealed = true;
    return room;
  },

  markCorrect: function (room) {
    const gs = room.gameState;
    gs.scores[gs.explainerId] = (gs.scores[gs.explainerId] || 0) + 1;
    return this._nextRound(room);
  },

  markNgViolation: function (room) {
    return this._nextRound(room);
  },

  skipCard: function (room) {
    return this._nextRound(room, true);
  },

  _nextRound: function (room, newCardOnly) {
    const gs = room.gameState;
    if (!newCardOnly) {
      gs.explainerIndex = (gs.explainerIndex + 1) % room.players.length;
      gs.explainerId = room.players[gs.explainerIndex].id;
    }
    gs.card = shuffle(this.CARDS)[0];
    gs.round += 1;
    gs.revealed = false;
    gs.phase = "explain";
    room.phase = "ngword_play";
    return room;
  },

  getSecretCard: function (ctx) {
    if (!ctx.isOnline) {
      return ctx.room.gameState.card;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.ngCard) {
      return ctx.hostSecrets.ngCard;
    }
    if (ctx.secrets && ctx.secrets.ngCard) {
      return ctx.secrets.ngCard;
    }
    return null;
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const explainer = this.getExplainer(room);
    const isExp = this.isExplainer(ctx);
    const card = ctx.isOnline && isExp ? this.getSecretCard(ctx) : (!ctx.isOnline ? gs.card : null);

    html.push('<div class="phase-banner"><h2>NGワードゲーム</h2>');
    html.push('<p>説明者：<strong>' + escapeHtml(explainer.name) + '</strong>　ラウンド ' + gs.round + '</p></div>');

    if (!ctx.isOnline) {
      html.push('<section class="card"><p class="note">📱 <strong>' + escapeHtml(explainer.name) + '</strong> さんが説明者。端末を渡してください。</p></section>');
    }

    html.push('<section class="card"><h2>スコア</h2><ul class="player-list">');
    room.players.forEach(function (p) {
      html.push('<li><span>' + escapeHtml(p.name) + '</span><span>' + (gs.scores[p.id] || 0) + '点</span></li>');
    });
    html.push('</ul></section>');

    if (ctx.isOnline && isExp) {
      html.push('<section class="card secret-panel">');
      if (!gs.revealed) {
        html.push('<button class="btn btn-primary" data-action="ng-reveal">お題を見る</button>');
      }
      if (gs.revealed && card) {
        html.push('<p class="note">お題（言っちゃダメ）</p>');
        html.push('<p class="big" style="color:var(--accent-2)">' + escapeHtml(card.word) + '</p>');
        html.push('<p class="note" style="margin-top:1rem">NGワード</p>');
        html.push('<div class="ng-tags">');
        card.ng.forEach(function (w) {
          html.push('<span class="ng-tag">' + escapeHtml(w) + '</span>');
        });
        html.push('</div>');
      }
      html.push('<p class="note" style="margin-top:1rem">音声で説明し、当ててもらいましょう</p></section>');
    } else if (!ctx.isOnline) {
      html.push('<section class="card secret-panel">');
      if (!gs.revealed) {
        html.push('<button class="btn btn-primary" data-action="ng-reveal">お題を見る（' + escapeHtml(explainer.name) + '）</button>');
      }
      if (gs.revealed) {
        html.push('<p class="note">お題（言っちゃダメ）</p>');
        html.push('<p class="big" style="color:var(--accent-2)">' + escapeHtml(gs.card.word) + '</p>');
        html.push('<p class="note" style="margin-top:1rem">NGワード</p>');
        html.push('<div class="ng-tags">');
        gs.card.ng.forEach(function (w) {
          html.push('<span class="ng-tag">' + escapeHtml(w) + '</span>');
        });
        html.push('</div>');
      }
      html.push('</section>');
    } else {
      html.push('<section class="card"><p>説明者がお題を見て説明しています。口頭で当ててください！</p></section>');
    }

    html.push('<section class="card"><h2>進行（説明者 or ホスト）</h2>');
    html.push('<div class="btn-row">');
    html.push('<button class="btn btn-success" data-action="ng-correct">正解！</button>');
    html.push('<button class="btn btn-danger" data-action="ng-violation">NGワード言った</button>');
    html.push('<button class="btn btn-secondary" data-action="ng-skip">パス（次のカード）</button>');
    html.push('</div>');
    html.push('<p class="note" style="margin-top:0.5rem">正解→次の説明者へ。NG→次の説明者へ（加点なし）</p></section>');

    html.push('<section class="card"><h2>ルール</h2><ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">');
    html.push('<li>説明者だけが <strong>お題</strong> と <strong>NGワード</strong> を見る</li>');
    html.push('<li>お題そのものも NGワード も言わずに説明する</li>');
    html.push('<li>他の人が口頭で当てたら「正解！」</li>');
    html.push('<li>NGワードを言ったら「NGワード言った」で次へ</li>');
    html.push('</ul></section>');

    if (ctx.isHost) {
      html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
    }

    return html.join("");
  }
};

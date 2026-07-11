/**
 * 大富豪（Daifugo）
 * 基本ルール：シングル・ペア・スリーカード・階段、革命、パス
 */

const DaifugoGame = {
  id: "daifugo",
  name: "大富豪",
  minPlayers: 3,
  maxPlayers: 6,

  SUITS: ["spade", "heart", "diamond", "club"],
  SUIT_LABEL: { spade: "♠", heart: "♥", diamond: "♦", club: "♣" },
  SUIT_POWER: { spade: 1, heart: 2, diamond: 3, club: 4 },
  RANK_LABEL: { 11: "J", 12: "Q", 13: "K", 14: "A", 15: "2" },

  RANK_TITLES: {
    3: ["大富豪", "貧民", "大貧民"],
    4: ["大富豪", "富豪", "貧民", "大貧民"],
    5: ["大富豪", "富豪", "平民", "貧民", "大貧民"],
    6: ["大富豪", "富豪", "平民", "平民", "貧民", "大貧民"]
  },

  init: function (room) {
    const deck = shuffle(this._createDeck());
    const hands = this._deal(room.players, deck);
    const starter = this._findStarter(room.players, hands);

    Object.keys(hands).forEach(function (pid) {
      hands[pid].sort(function (a, b) {
        return DaifugoGame._compareCards(a, b, false);
      });
    });

    room.gameState = {
      hands: hands,
      turnPlayerId: starter,
      table: null,
      passes: [],
      finished: [],
      revolution: false,
      lastPlayerId: null
    };
    room.phase = "daifugo_play";
    return room;
  },

  _createDeck: function () {
    const deck = [];
    this.SUITS.forEach(function (suit) {
      for (let rank = 3; rank <= 15; rank++) {
        deck.push({ id: suit + rank, suit: suit, rank: rank });
      }
    });
    return deck;
  },

  _deal: function (players, deck) {
    const hands = {};
    const n = players.length;
    const base = Math.floor(52 / n);
    const extra = 52 % n;
    let idx = 0;

    players.forEach(function (p, i) {
      const count = base + (i < extra ? 1 : 0);
      hands[p.id] = deck.slice(idx, idx + count);
      idx += count;
    });
    return hands;
  },

  _findStarter: function (players, hands) {
    for (let i = 0; i < players.length; i++) {
      const pid = players[i].id;
      if (hands[pid].some(function (c) { return c.suit === "spade" && c.rank === 3; })) {
        return pid;
      }
    }
    return players[0].id;
  },

  _rankPower: function (rank, revolution) {
    if (!revolution) return rank;
    return 18 - rank;
  },

  _compareCards: function (a, b, revolution) {
    const pa = this._rankPower(a.rank, revolution);
    const pb = this._rankPower(b.rank, revolution);
    if (pa !== pb) return pa - pb;
    return this.SUIT_POWER[a.suit] - this.SUIT_POWER[b.suit];
  },

  _label: function (card) {
    const r = this.RANK_LABEL[card.rank] || String(card.rank);
    return this.SUIT_LABEL[card.suit] + r;
  },

  analyzePlay: function (cards) {
    if (!cards || !cards.length) return null;

    const sorted = cards.slice().sort(function (a, b) { return a.rank - b.rank; });
    const len = sorted.length;
    const ranks = sorted.map(function (c) { return c.rank; });

    if (len === 1) {
      return { type: "single", cards: sorted, power: sorted[0].rank, suit: sorted[0].suit };
    }

    if (len === 2 && ranks[0] === ranks[1]) {
      return { type: "pair", cards: sorted, power: ranks[0] };
    }

    if (len === 3 && ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
      return { type: "triple", cards: sorted, power: ranks[0] };
    }

    if (len === 4 && ranks.every(function (r) { return r === ranks[0]; })) {
      return { type: "four", cards: sorted, power: ranks[0] };
    }

    if (len >= 3 && ranks[ranks.length - 1] <= 14) {
      let consecutive = true;
      for (let i = 1; i < ranks.length; i++) {
        if (ranks[i] !== ranks[i - 1] + 1) consecutive = false;
      }
      if (consecutive) {
        return { type: "straight", cards: sorted, power: ranks[ranks.length - 1], length: len };
      }
    }

    return null;
  },

  _playPower: function (play, revolution) {
    if (play.type === "single") {
      return {
        main: this._rankPower(play.power, revolution),
        sub: this.SUIT_POWER[play.suit]
      };
    }
    return { main: this._rankPower(play.power, revolution), sub: 0 };
  },

  canBeat: function (table, play, revolution) {
    if (!table) return true;
    if (play.type !== table.type) return false;
    if (play.type === "straight" && play.length !== table.length) return false;

    const a = this._playPower(play, revolution);
    const b = this._playPower(table, revolution);

    if (a.main !== b.main) return a.main > b.main;
    if (play.type === "single") return a.sub > b.sub;
    return false;
  },

  getHand: function (ctx, playerId) {
    if (!ctx.isOnline) {
      return ctx.room.gameState.hands[playerId] || [];
    }
    if (playerId === ctx.me.id && ctx.secrets && ctx.secrets.hand) {
      return ctx.secrets.hand;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.hands) {
      return ctx.hostSecrets.hands[playerId] || [];
    }
    return [];
  },

  getActivePlayers: function (room) {
    const finished = room.gameState.finished;
    return room.players.filter(function (p) { return !finished.includes(p.id); });
  },

  isMyTurn: function (ctx) {
    const pid = this._actingPlayer(ctx);
    return ctx.room.gameState.turnPlayerId === pid &&
      !ctx.room.gameState.finished.includes(pid);
  },

  _actingPlayer: function (ctx) {
    if (!ctx.isOnline) {
      return ctx.room.gameState.turnPlayerId;
    }
    return ctx.me.id;
  },

  playCards: function (room, playerId, cardIds, handsOverride) {
    const gs = room.gameState;
    if (gs.turnPlayerId !== playerId || gs.finished.includes(playerId)) return { room: room, ok: false };

    const allHands = handsOverride || gs.hands;
    if (!allHands) return { room: room, ok: false };
    const hand = allHands[playerId];
    if (!hand) return { room: room, ok: false };
    const selected = hand.filter(function (c) { return cardIds.includes(c.id); });
    const play = this.analyzePlay(selected);
    if (!play) return { room: room, ok: false, error: "出せる組み合わせではありません" };

    if (gs.table && !this.canBeat(gs.table, play, gs.revolution)) {
      return { room: room, ok: false, error: "場のカードより強くありません" };
    }
    if (!gs.table && gs.lastPlayerId !== playerId) {
      /* 場が流れて自分がリードのときは出す必要あり — パス不可はUI側 */
    }

    const newHand = hand.filter(function (c) { return !cardIds.includes(c.id); });
    allHands[playerId] = newHand;
    if (gs.hands) {
      gs.hands[playerId] = newHand;
    }

    gs.table = {
      type: play.type,
      cards: play.cards,
      power: play.power,
      suit: play.suit || null,
      length: play.length || play.cards.length,
      playerId: playerId
    };
    gs.passes = [];
    gs.lastPlayerId = playerId;

    if (play.type === "four") {
      gs.revolution = !gs.revolution;
    }

    if (newHand.length === 0) {
      gs.finished.push(playerId);
    }

    if (this._checkGameEnd(room)) {
      room.phase = "daifugo_result";
      return { room: room, ok: true, hand: newHand };
    }

    gs.turnPlayerId = this._nextPlayer(room, playerId);
    return { room: room, ok: true, hand: newHand };
  },

  pass: function (room, playerId) {
    const gs = room.gameState;
    if (gs.turnPlayerId !== playerId || gs.finished.includes(playerId)) return { room: room, ok: false };
    if (!gs.table) return { room: room, ok: false, error: "場が空のときはパスできません" };
    if (gs.passes.includes(playerId)) return { room: room, ok: false };

    gs.passes.push(playerId);

    const active = this.getActivePlayers(room).map(function (p) { return p.id; });
    const others = active.filter(function (id) { return id !== gs.lastPlayerId; });

    if (gs.passes.length >= others.length) {
      gs.table = null;
      gs.passes = [];
      gs.turnPlayerId = gs.lastPlayerId;
    } else {
      gs.turnPlayerId = this._nextPlayer(room, playerId);
    }

    return { room: room, ok: true };
  },

  _nextPlayer: function (room, fromId) {
    const players = room.players;
    const finished = room.gameState.finished;
    let idx = players.findIndex(function (p) { return p.id === fromId; });

    for (let i = 1; i <= players.length; i++) {
      const next = players[(idx + i) % players.length];
      if (!finished.includes(next.id)) return next.id;
    }
    return fromId;
  },

  _checkGameEnd: function (room) {
    const gs = room.gameState;
    const active = this.getActivePlayers(room);
    if (active.length <= 1) {
      active.forEach(function (p) {
        if (!gs.finished.includes(p.id)) gs.finished.push(p.id);
      });
      return true;
    }
    return false;
  },

  _cardHtml: function (card, selected, selectable) {
    const suitClass = "card-suit-" + card.suit;
    const sel = selected ? " is-selected" : "";
    const dis = selectable ? "" : " is-disabled";
    const r = this.RANK_LABEL[card.rank] || card.rank;
    return (
      '<button type="button" class="playing-card ' + suitClass + sel + dis + '" ' +
      'data-action="daifugo-toggle" data-card="' + card.id + '" ' +
      (selectable ? "" : "disabled") + '>' +
      '<span class="card-rank">' + r + '</span>' +
      '<span class="card-suit">' + this.SUIT_LABEL[card.suit] + '</span>' +
      '</button>'
    );
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];

    if (room.phase === "daifugo_result") {
      const titles = this.RANK_TITLES[room.players.length] || [];
      html.push('<div class="phase-banner"><h2>ゲーム終了</h2><p>順位が決まりました</p></div>');
      if (gs.revolution) {
        html.push('<p class="note" style="text-align:center">🔥 革命が発生した試合でした</p>');
      }
      html.push('<section class="card"><h2>順位</h2><ul class="player-list">');
      gs.finished.forEach(function (pid, i) {
        const p = room.players.find(function (x) { return x.id === pid; });
        html.push('<li><span>' + (i + 1) + '位 ' + escapeHtml(p.name) + '</span><span>' + escapeHtml(titles[i] || "—") + '</span></li>');
      });
      html.push('</ul></section>');
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    const turnPlayer = room.players.find(function (p) { return p.id === gs.turnPlayerId; });
    const actingId = this._actingPlayer(ctx);
    const viewHand = this.getHand(ctx, actingId);
    const isTurn = this.isMyTurn(ctx);
    const mustLead = !gs.table;

    html.push('<div class="phase-banner"><h2>大富豪</h2>');
    html.push('<p>' + (gs.revolution ? '🔥 革命中！　' : '') + 'ターン：<strong>' + escapeHtml(turnPlayer.name) + '</strong></p></div>');

    if (!ctx.isOnline) {
      html.push('<section class="card"><p class="note">📱 <strong>' + escapeHtml(turnPlayer.name) + '</strong> さんの番です。端末を渡して操作してください。</p></section>');
    }

    if (gs.finished.length) {
      html.push('<section class="card"><p class="note">上がり：');
      gs.finished.forEach(function (pid, i) {
        const p = room.players.find(function (x) { return x.id === pid; });
        html.push((i + 1) + '位 ' + escapeHtml(p.name) + '　');
      });
      html.push('</p></section>');
    }

    html.push('<section class="card table-area"><h2>場</h2><div class="table-cards">');
    if (gs.table) {
      const who = room.players.find(function (p) { return p.id === gs.table.playerId; });
      html.push('<p class="note">' + escapeHtml(who.name) + ' の ' + this._typeLabel(gs.table.type) + '</p>');
      gs.table.cards.forEach(function (c) {
        html.push(DaifugoGame._cardHtml(c, false, false));
      });
    } else {
      html.push('<p class="table-empty">場は空です。リードしてください。</p>');
    }
    html.push('</div></section>');

    html.push('<section class="card"><h2>手札（' + escapeHtml(turnPlayer.name) + '）');
    html.push(' <small>' + viewHand.length + '枚</small></h2>');

    if (ctx.isOnline && !isTurn && !gs.finished.includes(ctx.me.id)) {
      html.push('<p class="note">' + escapeHtml(turnPlayer.name) + ' さんの番です</p>');
    }

    if (gs.finished.includes(actingId)) {
      html.push('<p class="note">' + escapeHtml(turnPlayer.name) + ' は上がりました 🎉</p>');
    } else if (isTurn) {
      html.push('<div class="hand-row" id="handRow">');
      viewHand.forEach(function (c) {
        html.push(DaifugoGame._cardHtml(c, false, true));
      });
      html.push('</div>');
      html.push('<div class="btn-row" style="margin-top:0.75rem">');
      html.push('<button class="btn btn-primary" data-action="daifugo-play">出す</button>');
      if (!mustLead) {
        html.push('<button class="btn btn-secondary" data-action="daifugo-pass">パス</button>');
      }
      html.push('<button class="btn btn-secondary" data-action="daifugo-clear">選択解除</button>');
      html.push('</div>');
      if (mustLead) html.push('<p class="note">場が空なので、カードを出してください。</p>');
    } else if (ctx.isOnline) {
      html.push('<div class="hand-row">');
      viewHand.forEach(function (c) {
        html.push(DaifugoGame._cardHtml(c, DaifugoGame._selected.includes(c.id), false));
      });
      html.push('</div>');
      html.push('<p class="note">自分の手札（待機中）</p>');
    } else {
      html.push('<div class="hand-row">');
      viewHand.forEach(function (c) {
        html.push(DaifugoGame._cardHtml(c, false, false));
      });
      html.push('</div>');
    }

    html.push('</section>');

    html.push('<section class="card"><h2>ルール（簡易）</h2><ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">');
    html.push('<li>最初は <strong>♠3</strong> 持ちの人から</li>');
    html.push('<li>出せる形：シングル / ペア / スリーカード / 階段(3枚〜)</li>');
    html.push('<li>同じ形で、前より強いカードだけ出せる</li>');
    html.push('<li>4枚出し（フォーカード）で <strong>革命</strong> — 強弱が逆転</li>');
    html.push('<li>全員パスで場が流れ、最後に出した人がリード</li>');
    html.push('</ul></section>');

    return html.join("");
  },

  _typeLabel: function (type) {
    return { single: "シングル", pair: "ペア", triple: "スリーカード", straight: "階段", four: "フォーカード" }[type] || type;
  }
};

// 選択状態（再描画でリセットされるので data 属性で管理）
DaifugoGame._selected = [];

DaifugoGame.getSelected = function () {
  return DaifugoGame._selected.slice();
};

DaifugoGame.toggleCard = function (cardId) {
  const idx = DaifugoGame._selected.indexOf(cardId);
  if (idx >= 0) {
    DaifugoGame._selected.splice(idx, 1);
  } else {
    DaifugoGame._selected.push(cardId);
  }
  document.querySelectorAll("[data-card]").forEach(function (el) {
    el.classList.toggle("is-selected", DaifugoGame._selected.includes(el.dataset.card));
  });
};

DaifugoGame.clearSelected = function () {
  DaifugoGame._selected = [];
  document.querySelectorAll(".playing-card.is-selected").forEach(function (el) {
    el.classList.remove("is-selected");
  });
};

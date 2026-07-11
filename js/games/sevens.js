/**
 * 七並べ（Sevens / 7渡し）
 * 7を中心にスートごとに並べていく。先に手札を出し切った人が勝ち
 */

const SevensGame = {
  id: "sevens",
  name: "七並べ",
  minPlayers: 2,
  maxPlayers: 4,

  SUITS: ["spade", "heart", "diamond", "club"],
  SUIT_LABEL: { spade: "♠", heart: "♥", diamond: "♦", club: "♣" },
  RANK_LABEL: { 11: "J", 12: "Q", 13: "K", 14: "A" },

  init: function (room) {
    const deck = shuffle(this._createDeck());
    const hands = this._deal(room.players, deck);
    const starter = this._findSevenDiamond(hands, room.players);

    Object.keys(hands).forEach(function (pid) {
      hands[pid].sort(function (a, b) {
        if (a.suit !== b.suit) return SevensGame.SUITS.indexOf(a.suit) - SevensGame.SUITS.indexOf(b.suit);
        return a.rank - b.rank;
      });
    });

    room.gameState = {
      hands: hands,
      lanes: { spade: null, heart: null, diamond: null, club: null },
      turnPlayerId: starter,
      passesInRow: 0,
      lastPlayId: null,
      finished: [],
      winnerId: null
    };
    room.phase = "sevens_play";
    return room;
  },

  _createDeck: function () {
    const deck = [];
    this.SUITS.forEach(function (suit) {
      for (let rank = 1; rank <= 13; rank++) {
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

  _findSevenDiamond: function (hands, players) {
    for (let i = 0; i < players.length; i++) {
      const pid = players[i].id;
      if (hands[pid].some(function (c) { return c.suit === "diamond" && c.rank === 7; })) {
        return pid;
      }
    }
    return players[0].id;
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

  _actingPlayer: function (ctx) {
    if (!ctx.isOnline) return ctx.room.gameState.turnPlayerId;
    return ctx.me.id;
  },

  isMyTurn: function (ctx) {
    return ctx.room.gameState.turnPlayerId === this._actingPlayer(ctx) &&
      !ctx.room.gameState.finished.includes(this._actingPlayer(ctx)) &&
      ctx.room.phase === "sevens_play";
  },

  _activeCount: function (room) {
    return room.players.filter(function (p) {
      return !room.gameState.finished.includes(p.id);
    }).length;
  },

  _nextPlayer: function (room, fromId) {
    const finished = room.gameState.finished;
    const players = room.players;
    let idx = players.findIndex(function (p) { return p.id === fromId; });
    for (let i = 1; i <= players.length; i++) {
      const next = players[(idx + i) % players.length];
      if (!finished.includes(next.id)) return next.id;
    }
    return fromId;
  },

  canPlay: function (card, lanes) {
    const lane = lanes[card.suit];
    if (!lane) {
      return card.rank === 7;
    }
    return card.rank === lane.min - 1 || card.rank === lane.max + 1;
  },

  getPlayableCards: function (hand, lanes) {
    return hand.filter(function (c) { return SevensGame.canPlay(c, lanes); });
  },

  playCard: function (room, playerId, cardId, handsOverride) {
    const gs = room.gameState;
    if (room.phase !== "sevens_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }

    const allHands = handsOverride || gs.hands;
    if (!allHands || !allHands[playerId]) return { room: room, ok: false };

    const hand = allHands[playerId];
    const card = hand.find(function (c) { return c.id === cardId; });
    if (!card) return { room: room, ok: false, error: "カードがありません" };
    if (!this.canPlay(card, gs.lanes)) {
      return { room: room, ok: false, error: "今は出せません" };
    }

    const newHand = hand.filter(function (c) { return c.id !== cardId; });
    allHands[playerId] = newHand;
    if (gs.hands) gs.hands[playerId] = newHand;

    const lane = gs.lanes[card.suit];
    if (!lane) {
      gs.lanes[card.suit] = { min: 7, max: 7, cards: [7] };
    } else {
      if (card.rank < lane.min) lane.min = card.rank;
      if (card.rank > lane.max) lane.max = card.rank;
      lane.cards.push(card.rank);
      lane.cards.sort(function (a, b) { return a - b; });
    }

    gs.passesInRow = 0;
    gs.lastPlayId = playerId;

    if (!newHand.length) {
      gs.finished.push(playerId);
      if (gs.finished.length === room.players.length - 1 || gs.finished.length === room.players.length) {
        gs.winnerId = playerId;
        room.phase = "sevens_result";
        return { room: room, ok: true, hand: newHand };
      }
    }

    gs.turnPlayerId = this._nextPlayer(room, playerId);
    return { room: room, ok: true, hand: newHand };
  },

  pass: function (room, playerId) {
    const gs = room.gameState;
    if (room.phase !== "sevens_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }

    const hand = (gs.hands && gs.hands[playerId]) || [];
    const playable = this.getPlayableCards(hand, gs.lanes);
    if (playable.length) {
      return { room: room, ok: false, error: "出せるカードがあります" };
    }

    gs.passesInRow += 1;
    const active = this._activeCount(room);

    if (gs.passesInRow >= active && gs.lastPlayId) {
      gs.passesInRow = 0;
      gs.turnPlayerId = gs.lastPlayId;
    } else {
      gs.turnPlayerId = this._nextPlayer(room, playerId);
    }

    return { room: room, ok: true };
  },

  _label: function (card) {
    const r = this.RANK_LABEL[card.rank] || card.rank;
    return this.SUIT_LABEL[card.suit] + r;
  },

  _cardHtml: function (card, selected, selectable) {
    const suitClass = "card-suit-" + card.suit;
    const sel = selected ? " is-selected" : "";
    const r = this.RANK_LABEL[card.rank] || card.rank;
    if (selectable) {
      return (
        '<button type="button" class="playing-card ' + suitClass + sel + '" ' +
        'data-action="sv-toggle" data-card="' + card.id + '">' +
        '<span class="card-rank">' + r + '</span>' +
        '<span class="card-suit">' + this.SUIT_LABEL[card.suit] + '</span>' +
        '</button>'
      );
    }
    return (
      '<div class="playing-card ' + suitClass + '">' +
      '<span class="card-rank">' + r + '</span>' +
      '<span class="card-suit">' + this.SUIT_LABEL[card.suit] + '</span>' +
      '</div>'
    );
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const actingId = this._actingPlayer(ctx);
    const turnPlayer = room.players.find(function (p) { return p.id === gs.turnPlayerId; });
    const viewHand = this.getHand(ctx, actingId);
    const playable = this.getPlayableCards(viewHand, gs.lanes);

    if (room.phase === "sevens_result") {
      const winner = room.players.find(function (p) { return p.id === gs.winnerId; });
      html.push('<div class="phase-banner"><h2>ゲーム終了 🎉</h2>');
      html.push('<p>勝者：<strong>' + escapeHtml(winner.name) + '</strong></p></div>');
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    html.push('<div class="phase-banner"><h2>七並べ</h2>');
    html.push('<p>ターン：<strong>' + escapeHtml(turnPlayer.name) + '</strong></p></div>');

    if (!ctx.isOnline) {
      html.push('<section class="card"><p class="note">📱 <strong>' + escapeHtml(turnPlayer.name) + '</strong> さんの番。端末を渡してください。</p></section>');
    }

    html.push('<section class="card table-area"><h2>場</h2><div class="sv-lanes">');
    this.SUITS.forEach(function (suit) {
      const lane = gs.lanes[suit];
      html.push('<div class="sv-lane"><div class="sv-lane-suit">' + SevensGame.SUIT_LABEL[suit] + '</div><div class="sv-lane-cards">');
      if (!lane) {
        html.push('<span class="note">7待ち</span>');
      } else {
        for (let rank = lane.min; rank <= lane.max; rank++) {
          const r = SevensGame.RANK_LABEL[rank] || rank;
          html.push('<span class="sv-chip card-suit-' + suit + '">' + r + '</span>');
        }
      }
      html.push('</div></div>');
    });
    html.push('</div></section>');

    if (!gs.finished.includes(actingId)) {
      html.push('<section class="card"><h2>手札（' + escapeHtml(turnPlayer.name) + '）<small> ' + viewHand.length + '枚</small></h2>');

      if (this.isMyTurn(ctx)) {
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          const can = playable.some(function (p) { return p.id === c.id; });
          html.push(SevensGame._cardHtml(c, SevensGame._selected === c.id, can));
        });
        html.push('</div>');
        html.push('<div class="btn-row" style="margin-top:0.75rem">');
        html.push('<button class="btn btn-primary" data-action="sv-play">出す</button>');
        html.push('<button class="btn btn-secondary" data-action="sv-pass">パス</button>');
        html.push('</div>');
        if (!playable.length) {
          html.push('<p class="note">出せるカードがないのでパスできます</p>');
        }
      } else if (ctx.isOnline) {
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) { html.push(SevensGame._cardHtml(c, false, false)); });
        html.push('</div>');
      } else {
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) { html.push(SevensGame._cardHtml(c, false, false)); });
        html.push('</div>');
      }
      html.push('</section>');
    }

    html.push('<section class="card"><h2>ルール</h2><ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">');
    html.push('<li>♦7 持ちの人から開始。各スートは <strong>7</strong> から上下に並べる</li>');
    html.push('<li>場の端（±1）か、新スートの7だけ出せる</li>');
    html.push('<li>出せないときはパス。全員パスで最後に出した人の番に戻る</li>');
    html.push('<li>手札を先に出し切った人が勝ち</li>');
    html.push('</ul></section>');

    return html.join("");
  }
};

SevensGame._selected = null;

SevensGame.toggleCard = function (cardId) {
  SevensGame._selected = SevensGame._selected === cardId ? null : cardId;
  document.querySelectorAll("[data-card]").forEach(function (el) {
    el.classList.toggle("is-selected", el.dataset.card === SevensGame._selected);
  });
};

SevensGame.clearSelected = function () {
  SevensGame._selected = null;
  document.querySelectorAll(".playing-card.is-selected").forEach(function (el) {
    el.classList.remove("is-selected");
  });
};

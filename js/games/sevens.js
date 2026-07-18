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
  RANK_LABEL: { 11: "J", 12: "Q", 13: "K" },

  init: function (room) {
    const deck = shuffle(PlayingCards.createDeck54());
    const hands = PlayingCards.dealEvenly(room.players, deck);
    const starter = this._findSevenDiamond(hands, room.players);

    Object.keys(hands).forEach(function (pid) {
      PlayingCards.sortHandByRank(hands[pid]);
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
    return Secrets.getTrumpHand(ctx, playerId);
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
    if (card.isJoker || !card.suit) return false;
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
    return PlayingCards.cardHtml(card, {
      selected: selected,
      asButton: selectable,
      action: selectable ? "sv-toggle" : undefined,
      data: { card: card.id }
    });
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
    html.push('<p>ターン：<strong>' + escapeHtml(turnPlayer.name) + '</strong></p>');
    html.push(TrumpUi.renderTurnOrderBlock(room, gs));
    html.push('</div>');

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
      html.push('<section class="card"><h2>手札 <small>' + viewHand.length + '枚</small></h2>');

      if (this.isMyTurn(ctx)) {
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          const can = playable.some(function (p) { return p.id === c.id; });
          html.push(SevensGame._cardHtml(c, SevensGame._selected === c.id, can));
        });
        html.push('</div>');
        html.push('<div class="btn-row" style="margin-top:0.75rem">');
        html.push('<button class="btn btn-primary" data-action="sv-play">出す</button>');
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

    const isTurn = this.isMyTurn(ctx);
    html.push(TrumpUi.renderFooter({
      passAction: "sv-pass",
      canPass: isTurn && !gs.finished.includes(actingId),
      rulesAction: "sv-rules-toggle"
    }));
    html.push(TrumpUi.renderRulesPanel(
      "svRulesPanel",
      "ルール",
      '<ul class="clue-list trump-rules-list">' +
      "<li>♦7 持ちの人から開始。各スートは <strong>7</strong> から上下に並べる</li>" +
      "<li>場の端（±1）か、新スートの7だけ出せる</li>" +
      "<li>出せないときはパス。全員パスで最後に出した人の番に戻る</li>" +
      "<li>手札を先に出し切った人が勝ち</li>" +
      "</ul>"
    ));

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

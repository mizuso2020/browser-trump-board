/**
 * テキサスホールデム ⭐
 * 手札2枚＋場札5枚から最強の5枚を作る
 */

const TexasHoldemGame = {
  id: "texas_holdem",
  name: "テキサスホールデム",
  minPlayers: 2,
  maxPlayers: 9,

  init: function (room) {
    return this._newHand(room, 0);
  },

  _newHand: function (room, dealerIndex) {
    const deck = shuffle(PokerUtils.createDeck());
    const chips = room.gameState && room.gameState.chips
      ? room.gameState.chips
      : PokerUtils.initChips(room.players);

    const eligible = room.players.filter(function (p) { return chips[p.id] > 0; });
    if (eligible.length < 2) {
      room.gameState = { chips: chips, gameOver: true, winnerId: null };
      room.phase = "poker_result";
      return room;
    }

    const dealer = eligible[dealerIndex % eligible.length];
    const dealerIdx = room.players.findIndex(function (p) { return p.id === dealer.id; });
    const sbPlayer = this._nextEligible(room, dealerIdx, chips, 1);
    const bbPlayer = this._nextEligible(room, dealerIdx, chips, 2);

    const holeCards = {};
    const inHand = eligible.map(function (p) { return p.id; });

    inHand.forEach(function (pid) {
      holeCards[pid] = [deck.pop(), deck.pop()];
    });

    const gs = {
      variant: "holdem",
      chips: chips,
      pot: 0,
      streetBets: {},
      currentBet: 0,
      lastRaise: PokerUtils.BIG_BLIND,
      holeCards: holeCards,
      community: [],
      deck: deck,
      dealerId: dealer.id,
      sbId: sbPlayer.id,
      bbId: bbPlayer.id,
      inHand: inHand,
      folded: [],
      allIn: [],
      actedThisStreet: {},
      turnPlayerId: null,
      street: "preflop",
      lastAction: null,
      showdown: null,
      handNumber: (room.gameState && room.gameState.handNumber || 0) + 1,
      smallBlind: PokerUtils.SMALL_BLIND,
      bigBlind: PokerUtils.BIG_BLIND
    };

    PokerUtils.placeBet(gs, sbPlayer.id, gs.smallBlind);
    PokerUtils.placeBet(gs, bbPlayer.id, gs.bigBlind);
    gs.currentBet = gs.bigBlind;
    gs.actedThisStreet[sbPlayer.id] = true;
    gs.actedThisStreet[bbPlayer.id] = true;

    const first = this._nextEligible(room, room.players.findIndex(function (p) { return p.id === bbPlayer.id; }), chips, 1);
    gs.turnPlayerId = first.id;

    room.gameState = gs;
    room.phase = "poker_bet";
    return room;
  },

  _nextEligible: function (room, fromIdx, chips, step) {
    const n = room.players.length;
    for (let i = 1; i <= n; i++) {
      const p = room.players[(fromIdx + step * i + n * 10) % n];
      if ((chips[p.id] || 0) > 0) return p;
    }
    return room.players[fromIdx];
  },

  _actingPlayer: function (ctx) {
    if (!ctx.isOnline) return ctx.room.gameState.turnPlayerId;
    return ctx.me.id;
  },

  isMyTurn: function (ctx) {
    return ctx.room.phase === "poker_bet" &&
      ctx.room.gameState.turnPlayerId === this._actingPlayer(ctx) &&
      ctx.room.gameState.folded.indexOf(this._actingPlayer(ctx)) < 0;
  },

  doAction: function (room, playerId, action, amount) {
    const gs = room.gameState;
    if (room.phase !== "poker_bet" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }

    const result = PokerUtils.applyAction(gs, playerId, action, amount);
    if (!result.ok) return { room: room, ok: false, error: result.error };

    const alive = gs.inHand.filter(function (pid) { return gs.folded.indexOf(pid) < 0; });
    if (alive.length === 1) {
      return this._endHand(room, [alive[0]], "fold");
    }

    if (PokerUtils.bettingComplete(room, gs)) {
      return this._advanceStreet(room);
    }

    const next = PokerUtils.nextPlayer(room, gs, playerId);
    if (next) {
      gs.turnPlayerId = next;
      return { room: room, ok: true };
    }
    return this._advanceStreet(room);
  },

  _advanceStreet: function (room) {
    const gs = room.gameState;
    PokerUtils.resetStreetBets(gs);
    gs.actedThisStreet = {};
    gs.allIn = gs.allIn.filter(function (pid) { return (gs.chips[pid] || 0) === 0; });

    const alive = gs.inHand.filter(function (pid) { return gs.folded.indexOf(pid) < 0; });
    if (alive.length === 1) {
      return this._endHand(room, [alive[0]], "fold");
    }

    if (gs.street === "preflop") {
      gs.community = gs.community.concat([gs.deck.pop(), gs.deck.pop(), gs.deck.pop()]);
      gs.street = "flop";
    } else if (gs.street === "flop") {
      gs.community.push(gs.deck.pop());
      gs.street = "turn";
    } else if (gs.street === "turn") {
      gs.community.push(gs.deck.pop());
      gs.street = "river";
    } else {
      return this._showdown(room);
    }

    gs.turnPlayerId = this._firstToAct(room, gs);
    room.phase = "poker_bet";
    return { room: room, ok: true };
  },

  _firstToAct: function (room, gs) {
    const dealerIdx = room.players.findIndex(function (p) { return p.id === gs.dealerId; });
    const p = this._nextEligible(room, dealerIdx, gs.chips, 1);
    if (gs.folded.indexOf(p.id) >= 0 || gs.allIn.indexOf(p.id) >= 0) {
      const next = PokerUtils.nextPlayer(room, gs, p.id);
      return next || p.id;
    }
    return p.id;
  },

  _showdown: function (room) {
    const gs = room.gameState;
    const result = PokerUtils.resolveShowdown(room, gs, function (pid) {
      return (gs.holeCards[pid] || []).concat(gs.community);
    });
    gs.showdown = result;
    gs.lastPotAwarded = gs.pot;
    PokerUtils.awardPot(gs, result.winners);
    room.phase = "poker_showdown";
    return { room: room, ok: true };
  },

  _endHand: function (room, winners, reason) {
    const gs = room.gameState;
    gs.showdown = { winners: winners, reason: reason, hands: {} };
    gs.lastPotAwarded = gs.pot;
    PokerUtils.awardPot(gs, winners);
    room.phase = "poker_showdown";
    return { room: room, ok: true };
  },

  nextHand: function (room) {
    const gs = room.gameState;
    const dealerIdx = room.players.findIndex(function (p) { return p.id === gs.dealerId; });
    return this._newHand(room, dealerIdx + 1);
  },

  _streetLabel: function (street) {
    return { preflop: "プリフロップ", flop: "フロップ", turn: "ターン", river: "リバー" }[street] || street;
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];

    if (room.phase === "poker_result" || gs.gameOver) {
      html.push('<div class="phase-banner"><h2>ゲーム終了</h2></div>');
      if (ctx.isHost) html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      return html.join("");
    }

    if (room.phase === "poker_showdown") {
      const sd = gs.showdown;
      html.push('<div class="phase-banner"><h2>ハンド終了</h2></div>');
      if (sd && sd.winners) {
        sd.winners.forEach(function (wid) {
          const p = room.players.find(function (x) { return x.id === wid; });
          html.push('<p>🏆 <strong>' + escapeHtml(p.name) + '</strong> が ' + (gs.lastPotAwarded || 0) + ' チップ獲得！');
          if (sd.hands && sd.hands[wid]) html.push('（' + sd.hands[wid].name + '）');
          html.push('</p>');
        });
      }
      html.push(PokerUtils.renderChipTable(room, gs));
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="pk-next-hand">次のハンド</button>');
        html.push('<button class="btn btn-secondary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    html.push('<div class="phase-banner"><h2>テキサスホールデム ⭐</h2>');
    html.push('<p>' + this._streetLabel(gs.street) + '　ハンド #' + gs.handNumber + '</p></div>');

    html.push(PokerUtils.renderChipTable(room, gs));

    html.push('<section class="card"><h2>場札（コミュニティ）</h2><div class="hand-row">');
    if (gs.community.length) {
      gs.community.forEach(function (c) { html.push(PokerUtils.cardHtml(c, false, false)); });
    } else {
      html.push('<span class="note">まだ場にカードはありません</span>');
    }
    html.push('</div></section>');

    const actingId = this._actingPlayer(ctx);
    const myCards = PokerUtils.getHoleCards(ctx, actingId);
    const allMy = myCards.concat(gs.community);

    html.push('<section class="card"><h2>手札</h2><div class="hand-row">');
    if (myCards.length) {
      myCards.forEach(function (c) { html.push(PokerUtils.cardHtml(c, false, false)); });
      html.push(PokerUtils.renderHint(allMy));
    } else {
      html.push('<span class="note">自分の手札</span>');
    }
    html.push('</div></section>');

    if (gs.lastAction) {
      const la = gs.lastAction;
      const p = room.players.find(function (x) { return x.id === la.playerId; });
      html.push('<p class="note">最後のアクション：' + escapeHtml(p.name) + ' → ' + la.action + '</p>');
    }

    if (this.isMyTurn(ctx)) {
      const toCall = PokerUtils.amountToCall(gs, actingId);
      html.push('<section class="card poker-actions"><h2>あなたの番</h2>');
      html.push('<button class="btn btn-danger" data-action="pk-fold">フォールド</button>');
      if (toCall === 0) {
        html.push('<button class="btn btn-secondary" data-action="pk-check">チェック</button>');
      } else {
        html.push('<button class="btn btn-secondary" data-action="pk-call">コール（' + toCall + '）</button>');
      }
      html.push('<button class="btn btn-primary" data-action="pk-raise" data-amount="' + gs.bigBlind + '">レイズ +' + gs.bigBlind + '</button>');
      html.push('<button class="btn btn-primary" data-action="pk-raise" data-amount="' + (gs.bigBlind * 2) + '">レイズ +' + (gs.bigBlind * 2) + '</button>');
      html.push('<button class="btn btn-warning" data-action="pk-allin">オールイン（' + (gs.chips[actingId] || 0) + '）</button>');
      html.push('<p class="note">💡 コール＝今のベットに合わせる　レイズ＝さらに賭ける</p></section>');
    } else if (!ctx.isOnline) {
      const tp = room.players.find(function (p) { return p.id === gs.turnPlayerId; });
      html.push('<section class="card"><p class="note">📱 ' + escapeHtml(tp.name) + ' さんの番</p></section>');
    }

    html.push(PokerUtils.renderGuide("holdem"));
    return html.join("");
  }
};

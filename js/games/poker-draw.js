/**
 * ファイブカード・ドロー
 * 5枚配られ、交換して役を作る
 */

const FiveDrawGame = {
  id: "five_draw",
  name: "ファイブカード・ドロー",
  minPlayers: 2,
  maxPlayers: 6,

  init: function (room) {
    return this._newHand(room);
  },

  _newHand: function (room) {
    const deck = shuffle(PokerUtils.createDeck());
    const chips = room.gameState && room.gameState.chips
      ? room.gameState.chips
      : PokerUtils.initChips(room.players);

    const eligible = room.players.filter(function (p) { return chips[p.id] > 0; });
    if (eligible.length < 2) {
      room.gameState = { chips: chips, gameOver: true };
      room.phase = "poker_result";
      return room;
    }

    const holeCards = {};
    const inHand = eligible.map(function (p) { return p.id; });

    inHand.forEach(function (pid) {
      const hand = [];
      for (let i = 0; i < 5; i++) hand.push(deck.pop());
      holeCards[pid] = hand;
    });

    room.gameState = {
      variant: "draw",
      chips: chips,
      pot: 0,
      ante: 10,
      streetBets: {},
      currentBet: 0,
      lastRaise: PokerUtils.BIG_BLIND,
      holeCards: holeCards,
      deck: deck,
      inHand: inHand,
      folded: [],
      allIn: [],
      actedThisStreet: {},
      turnPlayerId: inHand[0],
      street: "bet1",
      discardPending: {},
      lastAction: null,
      showdown: null,
      handNumber: (room.gameState && room.gameState.handNumber || 0) + 1
    };

    const gs = room.gameState;
    inHand.forEach(function (pid) { PokerUtils.placeBet(gs, pid, gs.ante); });

    room.phase = "poker_bet";
    return room;
  },

  _actingPlayer: function (ctx) {
    if (!ctx.isOnline) return ctx.room.gameState.turnPlayerId;
    return ctx.me.id;
  },

  getPendingDrawPlayer: function (gs) {
    return gs.inHand.find(function (pid) {
      return gs.folded.indexOf(pid) < 0 && gs.discardPending[pid] === undefined;
    });
  },

  isMyTurn: function (ctx) {
    const gs = ctx.room.gameState;
    const id = this._actingPlayer(ctx);
    if (ctx.room.phase === "poker_bet") {
      return gs.turnPlayerId === id && gs.folded.indexOf(id) < 0;
    }
    if (ctx.room.phase === "poker_draw") {
      if (ctx.isOnline) {
        return gs.discardPending[ctx.me.id] === undefined && gs.folded.indexOf(ctx.me.id) < 0;
      }
      return !!this.getPendingDrawPlayer(gs);
    }
    return false;
  },

  doAction: function (room, playerId, action, amount) {
    const gs = room.gameState;
    if (room.phase !== "poker_bet" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }

    const result = PokerUtils.applyAction(gs, playerId, action, amount);
    if (!result.ok) return { room: room, ok: false, error: result.error };

    const alive = gs.inHand.filter(function (pid) { return gs.folded.indexOf(pid) < 0; });
    if (alive.length === 1) return this._endHand(room, [alive[0]]);

    if (PokerUtils.bettingComplete(room, gs)) {
      if (gs.street === "bet1") {
        PokerUtils.resetStreetBets(gs);
        gs.actedThisStreet = {};
        gs.street = "draw";
        gs.discardPending = {};
        room.phase = "poker_draw";
        return { room: room, ok: true };
      }
      return this._showdown(room);
    }

    const next = PokerUtils.nextPlayer(room, gs, playerId);
    gs.turnPlayerId = next || playerId;
    return { room: room, ok: true };
  },

  confirmDraw: function (room, playerId, discardIds) {
    const gs = room.gameState;
    if (room.phase !== "poker_draw" || gs.folded.indexOf(playerId) >= 0) {
      return { room: room, ok: false, error: "交換できません" };
    }
    if (gs.discardPending[playerId] !== undefined) {
      return { room: room, ok: false, error: "すでに交換済みです" };
    }

    const hand = gs.holeCards[playerId] || [];
    const ids = discardIds || [];
    const keep = hand.filter(function (c) { return ids.indexOf(c.id) < 0; });
    const drawCount = ids.length;
    const newCards = [];
    for (let i = 0; i < drawCount; i++) {
      if (gs.deck.length) newCards.push(gs.deck.pop());
    }
    gs.holeCards[playerId] = keep.concat(newCards);
    gs.discardPending[playerId] = drawCount;

    const alive = gs.inHand.filter(function (pid) { return gs.folded.indexOf(pid) < 0; });
    const allDone = alive.every(function (pid) { return gs.discardPending[pid] !== undefined; });

    if (allDone) {
      gs.street = "bet2";
      gs.turnPlayerId = alive[0];
      room.phase = "poker_bet";
    }

    return { room: room, ok: true, hand: gs.holeCards[playerId] };
  },

  _showdown: function (room) {
    const gs = room.gameState;
    const result = PokerUtils.resolveShowdown(room, gs, function (pid) {
      return gs.holeCards[pid] || [];
    });
    gs.showdown = result;
    gs.lastPotAwarded = gs.pot;
    PokerUtils.awardPot(gs, result.winners);
    room.phase = "poker_showdown";
    return { room: room, ok: true };
  },

  _endHand: function (room, winners) {
    const gs = room.gameState;
    gs.showdown = { winners: winners, reason: "fold", hands: {} };
    gs.lastPotAwarded = gs.pot;
    PokerUtils.awardPot(gs, winners);
    room.phase = "poker_showdown";
    return { room: room, ok: true };
  },

  nextHand: function (room) {
    return this._newHand(room);
  },

  _selected: [],

  toggleDiscard: function (cardId) {
    const idx = this._selected.indexOf(cardId);
    if (idx >= 0) this._selected.splice(idx, 1);
    else if (this._selected.length < 5) this._selected.push(cardId);
    document.querySelectorAll("[data-discard]").forEach(function (el) {
      el.classList.toggle("is-selected", FiveDrawGame._selected.indexOf(el.dataset.discard) >= 0);
    });
  },

  clearSelected: function () {
    this._selected = [];
    document.querySelectorAll(".playing-card.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
    });
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const actingId = this._actingPlayer(ctx);
    const drawPlayerId = room.phase === "poker_draw"
      ? (ctx.isOnline ? ctx.me.id : this.getPendingDrawPlayer(gs))
      : actingId;
    const myCards = drawPlayerId ? (gs.holeCards && gs.holeCards[drawPlayerId]) || PokerUtils.getHoleCards(ctx, drawPlayerId) : [];

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
          const showCards = gs.holeCards && gs.holeCards[wid];
          if (sd.hands && sd.hands[wid] && showCards) {
            html.push('<div class="hand-row">');
            showCards.forEach(function (c) { html.push(PokerUtils.cardHtml(c, false, true)); });
            html.push('</div>');
          }
        });
      }
      html.push(PokerUtils.renderChipTable(room, gs));
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="pk-next-hand">次のハンド</button>');
        html.push('<button class="btn btn-secondary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    html.push('<div class="phase-banner"><h2>ファイブカード・ドロー</h2>');
    html.push('<p>' + (gs.street === "draw" ? "カード交換" : gs.street === "bet1" ? "1回目ベット" : "2回目ベット") + '　ハンド #' + gs.handNumber + '</p>');
    if (gs.turnPlayerId && (room.phase === "poker_bet" || room.phase === "poker_draw")) {
      html.push(TrumpUi.renderTurnOrderBlock(room, gs, { folded: gs.folded || [] }));
    }
    html.push('</div>');

    html.push(PokerUtils.renderChipTable(room, gs));

    html.push('<section class="card"><h2>手札</h2><div class="hand-row">');
    if (room.phase === "poker_draw" && this.isMyTurn(ctx) && drawPlayerId) {
      if (!ctx.isOnline) {
        const dp = room.players.find(function (p) { return p.id === drawPlayerId; });
        html.push('<p class="note">📱 <strong>' + escapeHtml(dp.name) + '</strong> さんの交換番</p>');
      }
      myCards.forEach(function (c) {
        const sel = FiveDrawGame._selected.indexOf(c.id) >= 0;
        html.push(PlayingCards.cardHtml(c, {
          selected: sel,
          action: "pd-toggle",
          data: { discard: c.id }
        }));
      });
      html.push('</div><p class="note">交換したいカードを選んで「交換する」（0枚でもOK）</p>');
      html.push('<button class="btn btn-primary" data-action="pd-draw">交換する（' + FiveDrawGame._selected.length + '枚）</button>');
      html.push(FiveDrawGame._selected.length ? '<button class="btn btn-secondary" data-action="pd-clear">選択解除</button>' : '');
    } else if (myCards.length) {
      myCards.forEach(function (c) { html.push(PokerUtils.cardHtml(c, false, false)); });
      html.push(PokerUtils.renderHint(myCards));
    } else {
      html.push('<span class="note">手札</span>');
    }
    html.push('</div></section>');

    if (room.phase === "poker_draw" && !this.isMyTurn(ctx)) {
      if (gs.discardPending[actingId] !== undefined) {
        html.push('<p class="note">交換完了。他のプレイヤーを待っています…</p>');
      } else if (!ctx.isOnline) {
        html.push('<section class="card"><p class="note">📱 各プレイヤーがカード交換中</p></section>');
      }
    }

    if (room.phase === "poker_bet" && this.isMyTurn(ctx)) {
      const toCall = PokerUtils.amountToCall(gs, actingId);
      html.push('<section class="card poker-actions"><h2>あなたの番</h2>');
      html.push('<button class="btn btn-danger" data-action="pk-fold">フォールド</button>');
      if (toCall === 0) html.push('<button class="btn btn-secondary" data-action="pk-check">チェック</button>');
      else html.push('<button class="btn btn-secondary" data-action="pk-call">コール（' + toCall + '）</button>');
      html.push('<button class="btn btn-primary" data-action="pk-raise" data-amount="' + PokerUtils.BIG_BLIND + '">レイズ +' + PokerUtils.BIG_BLIND + '</button>');
      html.push('<button class="btn btn-warning" data-action="pk-allin">オールイン</button></section>');
    } else if (room.phase === "poker_bet" && !ctx.isOnline) {
      const tp = room.players.find(function (p) { return p.id === gs.turnPlayerId; });
      html.push('<section class="card"><p class="note">📱 ' + escapeHtml(tp.name) + ' さんの番</p></section>');
    }

    html.push(PokerUtils.renderGuide("draw"));
    return html.join("");
  }
};

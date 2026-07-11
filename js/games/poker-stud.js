/**
 * セブンカード・スタッド
 * 場札なし。最大7枚から5枚で役を作る
 */

const SevenStudGame = {
  id: "seven_stud",
  name: "セブンカード・スタッド",
  minPlayers: 2,
  maxPlayers: 8,

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
    const upCards = {};
    const inHand = eligible.map(function (p) { return p.id; });

    inHand.forEach(function (pid) {
      holeCards[pid] = [deck.pop(), deck.pop()];
      upCards[pid] = [deck.pop()];
    });

    room.gameState = {
      variant: "stud",
      chips: chips,
      pot: 0,
      ante: 10,
      streetBets: {},
      currentBet: 0,
      lastRaise: PokerUtils.BIG_BLIND,
      holeCards: holeCards,
      upCards: upCards,
      deck: deck,
      inHand: inHand,
      folded: [],
      allIn: [],
      actedThisStreet: {},
      turnPlayerId: inHand[0],
      street: "third",
      dealStep: 0,
      lastAction: null,
      showdown: null,
      handNumber: (room.gameState && room.gameState.handNumber || 0) + 1
    };

    const gs = room.gameState;
    inHand.forEach(function (pid) {
      PokerUtils.placeBet(gs, pid, gs.ante);
    });

    room.phase = "poker_bet";
    return room;
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
    gs.turnPlayerId = next || playerId;
    return { room: room, ok: true };
  },

  _advanceStreet: function (room) {
    const gs = room.gameState;
    PokerUtils.resetStreetBets(gs);
    gs.actedThisStreet = {};

    const alive = gs.inHand.filter(function (pid) { return gs.folded.indexOf(pid) < 0; });
    if (alive.length === 1) return this._endHand(room, [alive[0]], "fold");

    if (gs.street === "third") {
      alive.forEach(function (pid) { gs.upCards[pid].push(gs.deck.pop()); });
      gs.street = "fourth";
    } else if (gs.street === "fourth") {
      alive.forEach(function (pid) { gs.upCards[pid].push(gs.deck.pop()); });
      gs.street = "fifth";
    } else if (gs.street === "fifth") {
      alive.forEach(function (pid) { gs.upCards[pid].push(gs.deck.pop()); });
      gs.street = "sixth";
    } else if (gs.street === "sixth") {
      alive.forEach(function (pid) { gs.holeCards[pid].push(gs.deck.pop()); });
      gs.street = "river";
    } else {
      return this._showdown(room);
    }

    gs.turnPlayerId = alive[0];
    return { room: room, ok: true };
  },

  _showdown: function (room) {
    const gs = room.gameState;
    const result = PokerUtils.resolveShowdown(room, gs, function (pid) {
      const hole = gs.holeCards && gs.holeCards[pid] ? gs.holeCards[pid] : [];
      return hole.concat(gs.upCards[pid] || []);
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

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const actingId = this._actingPlayer(ctx);

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

    const streetNames = { third: "3rdストリート", fourth: "4th", fifth: "5th", sixth: "6th", river: "7th（リバー）" };
    html.push('<div class="phase-banner"><h2>セブンカード・スタッド</h2>');
    html.push('<p>' + (streetNames[gs.street] || gs.street) + '　ハンド #' + gs.handNumber + '</p></div>');

    html.push(PokerUtils.renderChipTable(room, gs));

    html.push('<section class="card"><h2>プレイヤーのカード</h2>');
    room.players.forEach(function (p) {
      if (gs.inHand.indexOf(p.id) < 0) return;
      const folded = gs.folded.indexOf(p.id) >= 0;
      const up = gs.upCards[p.id] || [];
      const hole = PokerUtils.getHoleCards(ctx, p.id);
      const holeCount = gs.holeCounts ? (gs.holeCounts[p.id] || 0) : hole.length;

      const isMe = p.id === ctx.me.id || (!ctx.isOnline && p.id === actingId);

      html.push('<div class="poker-stud-row' + (folded ? " is-folded" : "") + '">');
      html.push('<strong>' + escapeHtml(p.name) + '</strong> ');
      if (gs.turnPlayerId === p.id) html.push('<span class="badge badge-live">番</span>');
      html.push('<div class="hand-row">');
      if (isMe && hole.length) {
        hole.forEach(function (c) { html.push(PokerUtils.cardHtml(c, true, true)); });
      } else if (holeCount > 0) {
        for (let i = 0; i < holeCount; i++) html.push(PokerUtils.cardHtml(null, true, true));
      }
      up.forEach(function (c) { html.push(PokerUtils.cardHtml(c, false, true)); });
      html.push('</div></div>');
    });
    html.push('</section>');

    const myAll = PokerUtils.getHoleCards(ctx, actingId).concat(gs.upCards[actingId] || []);
    html.push(PokerUtils.renderHint(myAll));

    if (this.isMyTurn(ctx)) {
      const toCall = PokerUtils.amountToCall(gs, actingId);
      html.push('<section class="card poker-actions"><h2>あなたの番</h2>');
      html.push('<button class="btn btn-danger" data-action="pk-fold">フォールド</button>');
      if (toCall === 0) html.push('<button class="btn btn-secondary" data-action="pk-check">チェック</button>');
      else html.push('<button class="btn btn-secondary" data-action="pk-call">コール（' + toCall + '）</button>');
      html.push('<button class="btn btn-primary" data-action="pk-raise" data-amount="' + PokerUtils.BIG_BLIND + '">レイズ +' + PokerUtils.BIG_BLIND + '</button>');
      html.push('<button class="btn btn-warning" data-action="pk-allin">オールイン</button></section>');
    } else if (!ctx.isOnline) {
      const tp = room.players.find(function (p) { return p.id === gs.turnPlayerId; });
      html.push('<section class="card"><p class="note">📱 ' + escapeHtml(tp.name) + ' さんの番</p></section>');
    }

    html.push(PokerUtils.renderGuide("stud"));
    return html.join("");
  }
};

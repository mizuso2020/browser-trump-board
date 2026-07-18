/**
 * ブラックジャック — 各自のスマホでディーラーに挑戦
 */

const BlackjackGame = {
  id: "blackjack",
  name: "ブラックジャック",
  minPlayers: 2,
  maxPlayers: 7,

  STARTING_CHIPS: 1000,
  MIN_BET: 10,
  BET_OPTIONS: [10, 20, 50, 100],

  _setPhase: function (room, phase) {
    room.gameState.phase = phase;
    room.phase = phase;
  },

  init: function (room) {
    const chips = {};
    const bj = {};
    room.players.forEach(function (p) {
      chips[p.id] = this.STARTING_CHIPS;
      bj[p.id] = this._emptyPlayerState();
    }, this);

    room.gameState = {
      chips: chips,
      deck: this._createDeck(),
      dealer: [],
      dealerHidden: true,
      bj: bj,
      turnPlayerId: null,
      phase: "bj_bet",
      round: 1,
      minBet: this.MIN_BET,
      results: null,
      pendingDeal: false,
      pendingDealer: false,
      bjPendingAction: null,
      lastMessage: null
    };
    this._setPhase(room, "bj_bet");
    return room;
  },

  _emptyPlayerState: function () {
    return {
      groups: [],
      activeGroup: 0,
      insurance: 0,
      betAmount: 0,
      betConfirmed: false,
      insuranceDone: false
    };
  },

  _createDeck: function () {
    const deck = PokerUtils.createDeck();
    return shuffle(deck);
  },

  _cardValue: function (rank) {
    if (rank === 14) return 11;
    if (rank >= 10) return 10;
    return rank;
  },

  handValue: function (cards) {
    if (!cards || !cards.length) {
      return { total: 0, soft: false, isBlackjack: false, isBust: false };
    }
    let total = 0;
    let aces = 0;
    cards.forEach(function (c) {
      if (c.rank === 14) {
        aces++;
        total += 11;
      } else {
        total += this._cardValue(c.rank);
      }
    }, this);
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return {
      total: total,
      soft: aces > 0,
      isBlackjack: cards.length === 2 && total === 21,
      isBust: total > 21
    };
  },

  _attachDeck: function (room, hostSecrets) {
    if (hostSecrets && hostSecrets.deck) {
      room.gameState.deck = hostSecrets.deck.slice();
    }
  },

  _syncDeck: function (gs, hostSecrets) {
    if (hostSecrets && gs.deck) {
      hostSecrets.deck = gs.deck.slice();
    }
  },

  getPlayerState: function (ctx, playerId) {
    const gs = ctx.room.gameState;
    if (!ctx.isOnline) {
      return gs.bj[playerId];
    }
    if (playerId === ctx.me.id && ctx.secrets && ctx.secrets.bjState) {
      return ctx.secrets.bjState;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.bjStates) {
      return ctx.hostSecrets.bjStates[playerId];
    }
    return gs.bj[playerId] || null;
  },

  _publicPlayer: function (gs, pid) {
    return gs.bj[pid] || null;
  },

  _allBetConfirmed: function (room) {
    const gs = room.gameState;
    return room.players.every(function (p) {
      const st = gs.bj[p.id];
      return st && st.betConfirmed && st.betAmount > 0;
    });
  },

  _allInsuranceDone: function (room) {
    const gs = room.gameState;
    return room.players.every(function (p) {
      return gs.bj[p.id] && gs.bj[p.id].insuranceDone;
    });
  },

  placeBet: function (room, playerId, amount) {
    const gs = room.gameState;
    if (gs.phase !== "bj_bet") {
      return { room: room, ok: false, error: "ベットのタイミングではありません" };
    }
    const bet = parseInt(amount, 10);
    if (isNaN(bet) || bet < gs.minBet) {
      return { room: room, ok: false, error: "最低ベットは " + gs.minBet + " です" };
    }
    if ((gs.chips[playerId] || 0) < bet) {
      return { room: room, ok: false, error: "チップが足りません" };
    }

    const st = gs.bj[playerId];
    st.betAmount = bet;
    st.betConfirmed = true;
    st.groups = [{ cards: [], bet: bet, status: "waiting", doubled: false, surrendered: false }];
    st.activeGroup = 0;
    st.insurance = 0;
    st.insuranceDone = false;

    if (this._allBetConfirmed(room)) {
      gs.pendingDeal = true;
    }
    return { room: room, ok: true };
  },

  dealRound: function (room, hostSecrets) {
    const gs = room.gameState;
    if (!gs.pendingDeal) {
      return { room: room, ok: false, error: "配布待ちではありません" };
    }
    this._attachDeck(room, hostSecrets);
    if (!gs.deck || gs.deck.length < room.players.length * 2 + 2) {
      gs.deck = this._createDeck();
    }

    gs.dealer = [gs.deck.pop(), gs.deck.pop()];
    gs.dealerHidden = true;

    room.players.forEach(function (p) {
      const st = gs.bj[p.id];
      const g = st.groups[0];
      g.cards = [gs.deck.pop(), gs.deck.pop()];
      g.status = "playing";
      gs.chips[p.id] -= g.bet;
      const val = BlackjackGame.handValue(g.cards);
      if (val.isBlackjack) g.status = "blackjack";
    });

    gs.pendingDeal = false;
    gs.results = null;

    const dealerUp = gs.dealer[0];
    if (dealerUp.rank === 14) {
      this._setPhase(room, "bj_insurance");
      room.players.forEach(function (p) {
        gs.bj[p.id].insuranceDone = false;
      });
    } else {
      this._setPhase(room, "bj_play");
      gs.turnPlayerId = this._nextTurnPlayer(room, null);
    }

    this._syncDeck(gs, hostSecrets);
    this._syncBjSecrets(room, hostSecrets);
    return { room: room, ok: true };
  },

  setInsurance: function (room, playerId, take) {
    const gs = room.gameState;
    if (gs.phase !== "bj_insurance") {
      return { room: room, ok: false, error: "インシュアランスのタイミングではありません" };
    }
    const st = gs.bj[playerId];
    if (st.insuranceDone) {
      return { room: room, ok: false, error: "すでに選択済みです" };
    }

    if (take) {
      const maxIns = Math.floor(st.betAmount / 2);
      if (maxIns <= 0 || (gs.chips[playerId] || 0) < maxIns) {
        return { room: room, ok: false, error: "保険料が足りません" };
      }
      st.insurance = maxIns;
      gs.chips[playerId] -= maxIns;
    } else {
      st.insurance = 0;
    }
    st.insuranceDone = true;

    if (this._allInsuranceDone(room)) {
      this._setPhase(room, "bj_play");
      gs.turnPlayerId = this._nextTurnPlayer(room, null);
    }
    return { room: room, ok: true };
  },

  _activeGroup: function (st) {
    return st.groups[st.activeGroup];
  },

  _nextTurnPlayer: function (room, fromId) {
    const gs = room.gameState;
    const players = room.players;
    let start = 0;
    if (fromId) {
      start = players.findIndex(function (p) { return p.id === fromId; }) + 1;
    }
    for (let i = 0; i < players.length; i++) {
      const p = players[(start + i) % players.length];
      const st = gs.bj[p.id];
      if (!st || !st.groups.length) continue;
      for (let g = 0; g < st.groups.length; g++) {
        if (st.groups[g].status === "playing") {
          st.activeGroup = g;
          return p.id;
        }
      }
    }
    return null;
  },

  _advanceTurn: function (room, playerId) {
    const gs = room.gameState;
    const next = this._nextTurnPlayer(room, playerId);
    if (next) {
      gs.turnPlayerId = next;
      return false;
    }
    gs.turnPlayerId = null;
    gs.pendingDealer = true;
    this._setPhase(room, "bj_dealer_pending");
    return true;
  },

  _drawCard: function (gs, hostSecrets) {
    if (!gs.deck.length) gs.deck = this._createDeck();
    const card = gs.deck.pop();
    this._syncDeck(gs, hostSecrets);
    return card;
  },

  hit: function (room, playerId, hostSecrets) {
    const gs = room.gameState;
    if (gs.phase !== "bj_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    this._attachDeck(room, hostSecrets);
    const st = gs.bj[playerId];
    const g = this._activeGroup(st);
    if (!g || g.status !== "playing") {
      return { room: room, ok: false, error: "アクションできません" };
    }

    g.cards.push(this._drawCard(gs, hostSecrets));
    const val = this.handValue(g.cards);
    if (val.isBust) {
      g.status = "bust";
      this._advanceTurn(room, playerId);
    } else if (val.total === 21) {
      g.status = "stand";
      this._advanceTurn(room, playerId);
    }
    this._syncBjSecrets(room, hostSecrets);
    return { room: room, ok: true };
  },

  stand: function (room, playerId) {
    const gs = room.gameState;
    if (gs.phase !== "bj_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    const st = gs.bj[playerId];
    const g = this._activeGroup(st);
    if (!g || g.status !== "playing") {
      return { room: room, ok: false, error: "アクションできません" };
    }
    g.status = "stand";
    this._advanceTurn(room, playerId);
    return { room: room, ok: true };
  },

  surrender: function (room, playerId) {
    const gs = room.gameState;
    if (gs.phase !== "bj_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    const st = gs.bj[playerId];
    const g = this._activeGroup(st);
    if (!g || g.status !== "playing" || g.cards.length !== 2 || g.doubled) {
      return { room: room, ok: false, error: "サレンダーできません" };
    }
    g.status = "surrender";
    gs.chips[playerId] += Math.floor(g.bet / 2);
    this._advanceTurn(room, playerId);
    return { room: room, ok: true };
  },

  doubleDown: function (room, playerId, hostSecrets) {
    const gs = room.gameState;
    if (gs.phase !== "bj_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    const st = gs.bj[playerId];
    const g = this._activeGroup(st);
    if (!g || g.status !== "playing" || g.cards.length !== 2) {
      return { room: room, ok: false, error: "ダブルダウンできません" };
    }
    if ((gs.chips[playerId] || 0) < g.bet) {
      return { room: room, ok: false, error: "チップが足りません" };
    }
    gs.chips[playerId] -= g.bet;
    g.bet *= 2;
    g.doubled = true;
    this._attachDeck(room, hostSecrets);
    g.cards.push(this._drawCard(gs, hostSecrets));
    const val = this.handValue(g.cards);
    g.status = val.isBust ? "bust" : "stand";
    this._advanceTurn(room, playerId);
    this._syncBjSecrets(room, hostSecrets);
    return { room: room, ok: true };
  },

  split: function (room, playerId, hostSecrets) {
    const gs = room.gameState;
    if (gs.phase !== "bj_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    const st = gs.bj[playerId];
    const g = this._activeGroup(st);
    if (!g || g.status !== "playing" || g.cards.length !== 2) {
      return { room: room, ok: false, error: "スプリットできません" };
    }
    if (g.cards[0].rank !== g.cards[1].rank) {
      return { room: room, ok: false, error: "同じ数字のペアのみスプリットできます" };
    }
    if ((gs.chips[playerId] || 0) < g.bet) {
      return { room: room, ok: false, error: "チップが足りません" };
    }
    gs.chips[playerId] -= g.bet;

    const cardB = g.cards.pop();
    const cardA = g.cards[0];
    g.cards = [cardA];
    g.status = "playing";

    const g2 = {
      cards: [cardB],
      bet: g.bet,
      status: "playing",
      doubled: false,
      surrendered: false
    };
    st.groups.push(g2);

    this._attachDeck(room, hostSecrets);
    g.cards.push(this._drawCard(gs, hostSecrets));
    g2.cards.push(this._drawCard(gs, hostSecrets));

    [g, g2].forEach(function (grp) {
      const val = BlackjackGame.handValue(grp.cards);
      if (val.isBlackjack) grp.status = "blackjack";
      if (val.isBust) grp.status = "bust";
      if (val.total === 21) grp.status = "stand";
    });

    this._syncBjSecrets(room, hostSecrets);
    return { room: room, ok: true };
  },

  dealerPlay: function (room, hostSecrets) {
    const gs = room.gameState;
    if (!gs.pendingDealer && gs.phase !== "bj_dealer_pending") {
      return { room: room, ok: false, error: "ディーラーの番ではありません" };
    }
    this._attachDeck(room, hostSecrets);
    gs.dealerHidden = false;

    let dVal = this.handValue(gs.dealer);
    while (dVal.total < 17) {
      gs.dealer.push(this._drawCard(gs, hostSecrets));
      dVal = this.handValue(gs.dealer);
    }

    gs.pendingDealer = false;
    this._resolveRound(room);
    this._setPhase(room, "bj_result");
    this._syncDeck(gs, hostSecrets);
    this._syncBjSecrets(room, hostSecrets);
    return { room: room, ok: true };
  },

  _resolveRound: function (room) {
    const gs = room.gameState;
    const dVal = this.handValue(gs.dealer);
    const dBJ = dVal.isBlackjack;
    const results = {};

    room.players.forEach(function (p) {
      const pid = p.id;
      const st = gs.bj[pid];
      results[pid] = { groups: [], insurance: 0, net: 0 };

      if (st.insurance > 0) {
        if (dBJ) {
          gs.chips[pid] += st.insurance * 3;
          results[pid].insurance = st.insurance * 2;
          results[pid].net += st.insurance * 2;
        } else {
          results[pid].insurance = -st.insurance;
          results[pid].net -= st.insurance;
        }
      }

      st.groups.forEach(function (g) {
        const val = BlackjackGame.handValue(g.cards);
        let payout = 0;
        let outcome = "";

        if (g.status === "surrender") {
          outcome = "サレンダー";
          payout = -Math.floor(g.bet / 2);
        } else if (g.status === "bust" || val.isBust) {
          outcome = "バースト";
          payout = -g.bet;
        } else if (g.status === "blackjack" && !dBJ) {
          outcome = "ブラックジャック";
          const win = Math.floor(g.bet * 1.5);
          gs.chips[pid] += g.bet + win;
          payout = win;
        } else if (dBJ && val.total !== 21) {
          outcome = "ディーラーBJ";
          payout = -g.bet;
        } else if (val.total > dVal.total) {
          outcome = "勝ち";
          gs.chips[pid] += g.bet * 2;
          payout = g.bet;
        } else if (val.total < dVal.total) {
          outcome = "負け";
          payout = -g.bet;
        } else {
          outcome = "引き分け";
          gs.chips[pid] += g.bet;
          payout = 0;
        }

        results[pid].groups.push({ outcome: outcome, payout: payout, bet: g.bet });
        results[pid].net += payout;
      });
    });

    gs.results = results;
    gs.lastMessage = "ラウンド " + gs.round + " 終了";
  },

  nextRound: function (room) {
    const gs = room.gameState;
    if (gs.phase !== "bj_result") {
      return { room: room, ok: false, error: "次のラウンドに進めません" };
    }

    const broke = room.players.filter(function (p) {
      return (gs.chips[p.id] || 0) < gs.minBet;
    });

    if (broke.length === room.players.length) {
      this._setPhase(room, "bj_game_over");
      return { room: room, ok: true, gameOver: true };
    }

    gs.round += 1;
    gs.dealer = [];
    gs.dealerHidden = true;
    gs.results = null;
    gs.turnPlayerId = null;
    gs.pendingDeal = false;
    gs.pendingDealer = false;
    gs.bjPendingAction = null;
    this._setPhase(room, "bj_bet");

    room.players.forEach(function (p) {
      const st = gs.bj[p.id];
      st.groups = [];
      st.activeGroup = 0;
      st.insurance = 0;
      st.betAmount = 0;
      st.betConfirmed = false;
      st.insuranceDone = false;
    });

    return { room: room, ok: true };
  },

  _syncBjSecrets: function (room, hostSecrets) {
    if (!hostSecrets || !room.gameState) return;
    hostSecrets.bjStates = JSON.parse(JSON.stringify(room.gameState.bj));
  },

  syncBjSecrets: function (room, hostSecrets) {
    this._syncBjSecrets(room, hostSecrets);
  },

  queuePlayerAction: function (room, playerId, action) {
    const gs = room.gameState;
    if (gs.bjPendingAction) {
      return { room: room, ok: false, error: "前のアクションを処理中です" };
    }
    if (gs.phase !== "bj_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    gs.bjPendingAction = { playerId: playerId, action: action };
    return { room: room, ok: true };
  },

  processPendingAction: function (room, hostSecrets) {
    const gs = room.gameState;
    const pending = gs.bjPendingAction;
    if (!pending) {
      return { room: room, ok: false };
    }
    this.attachBjSecrets(room, hostSecrets);
    let result;
    switch (pending.action) {
      case "hit":
        result = this.hit(room, pending.playerId, hostSecrets);
        break;
      case "stand":
        result = this.stand(room, pending.playerId);
        break;
      case "surrender":
        result = this.surrender(room, pending.playerId);
        break;
      case "double":
        result = this.doubleDown(room, pending.playerId, hostSecrets);
        break;
      case "split":
        result = this.split(room, pending.playerId, hostSecrets);
        break;
      default:
        gs.bjPendingAction = null;
        return { room: room, ok: false, error: "不明なアクション" };
    }
    if (result.ok) {
      gs.bjPendingAction = null;
      this._syncBjSecrets(room, hostSecrets);
    }
    return result;
  },

  attachBjSecrets: function (room, hostSecrets) {
    if (!hostSecrets || !room.gameState) return;
    if (hostSecrets.deck) room.gameState.deck = hostSecrets.deck.slice();
    if (hostSecrets.bjStates) room.gameState.bj = JSON.parse(JSON.stringify(hostSecrets.bjStates));
  },

  stripPublicPlayer: function (st) {
    if (!st) return st;
    return {
      betConfirmed: st.betConfirmed,
      betAmount: st.betAmount,
      insurance: st.insurance,
      insuranceDone: st.insuranceDone,
      activeGroup: st.activeGroup,
      groups: (st.groups || []).map(function (g) {
        return {
          bet: g.bet,
          status: g.status,
          doubled: g.doubled,
          surrendered: g.surrendered,
          cardCount: g.cards ? g.cards.length : 0
        };
      })
    };
  },

  isMyTurn: function (ctx) {
    const gs = ctx.room.gameState;
    return gs.phase === "bj_play" && gs.turnPlayerId === ctx.me.id;
  },

  _canSplit: function (g) {
    return g && g.cards.length === 2 && g.cards[0].rank === g.cards[1].rank;
  },

  _renderCards: function (cards, hideAll) {
    if (hideAll) {
      return cards.map(function () {
        return PlayingCards.cardHtml(null, { faceDown: true, asButton: false, small: true });
      }).join("");
    }
    return cards.map(function (c) {
      return PokerUtils.cardHtml(c, false, true);
    }).join("");
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];

    if (gs.phase === "bj_game_over") {
      html.push('<div class="phase-banner"><h2>ゲーム終了</h2></div>');
      html.push(this._renderChips(room, gs));
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    html.push('<div class="phase-banner"><h2>ブラックジャック</h2>');
    html.push('<p>ラウンド ' + gs.round + '　最低ベット ' + gs.minBet + '</p>');
    if (gs.phase === "bj_play" && gs.turnPlayerId) {
      html.push(TrumpUi.renderTurnOrderBlock(room, gs, { turnPlayerId: gs.turnPlayerId }));
    }
    html.push('</div>');
    html.push(this._renderChips(room, gs));

    html.push('<section class="card"><h2>ディーラー</h2><div class="hand-row">');
    if (gs.dealer.length) {
      gs.dealer.forEach(function (c, i) {
        const hide = gs.dealerHidden && i === 1;
        html.push(PokerUtils.cardHtml(c, hide, true));
      });
      if (!gs.dealerHidden) {
        const dv = this.handValue(gs.dealer);
        html.push('<p class="note">合計：<strong>' + dv.total + '</strong></p>');
      }
    } else {
      html.push('<span class="note">カードはまだありません</span>');
    }
    html.push('</div></section>');

    if (gs.phase === "bj_bet") {
      html.push('<section class="card"><h2>ベット</h2>');
      const mySt = this.getPlayerState(ctx, ctx.me.id) || gs.bj[ctx.me.id];
      if (mySt && mySt.betConfirmed) {
        html.push('<p class="note">ベット済み：<strong>' + mySt.betAmount + '</strong> チップ</p>');
      } else {
        html.push('<p class="note">ベット額を選んでください</p><div class="btn-row">');
        this.BET_OPTIONS.forEach(function (amt) {
          if ((gs.chips[ctx.me.id] || 0) >= amt) {
            html.push('<button class="btn btn-primary" data-action="bj-bet" data-amount="' + amt + '">' + amt + '</button>');
          }
        });
        html.push('</div>');
      }
      html.push('<p class="note">全員のベットが揃うと配札されます</p></section>');
    }

    if (gs.phase === "bj_insurance") {
      const mySt = gs.bj[ctx.me.id];
      html.push('<section class="card"><h2>インシュアランス</h2>');
      html.push('<p class="note">ディーラーの表カードがエースです。保険（ベットの半分まで）を掛けますか？</p>');
      if (mySt && !mySt.insuranceDone) {
        html.push('<div class="btn-row">');
        html.push('<button class="btn btn-warning" data-action="bj-insurance" data-take="1">保険を掛ける（最大' + Math.floor(mySt.betAmount / 2) + '）</button>');
        html.push('<button class="btn btn-secondary" data-action="bj-insurance" data-take="0">掛けない</button>');
        html.push('</div>');
      } else {
        html.push('<p class="note">選択済み。他のプレイヤーを待っています…</p>');
      }
      html.push('</section>');
    }

    const myState = this.getPlayerState(ctx, ctx.me.id);
    if (myState && myState.groups && myState.groups.length) {
      html.push('<section class="card"><h2>あなたの手札</h2>');
      myState.groups.forEach(function (g, idx) {
        const val = BlackjackGame.handValue(g.cards);
        html.push('<div class="bj-hand-group">');
        if (myState.groups.length > 1) {
          html.push('<p><strong>ハンド' + (idx + 1) + '</strong>（ベット ' + g.bet + '）</p>');
        }
        html.push('<div class="hand-row">' + BlackjackGame._renderCards(g.cards, false) + '</div>');
        html.push('<p class="note">合計 ' + val.total);
        if (val.isBlackjack) html.push('　ブラックジャック！');
        if (val.isBust) html.push('　バースト');
        html.push('　[' + g.status + ']</p></div>');
      });
      html.push('</section>');
    }

    if (this.isMyTurn(ctx) && myState) {
      const g = this._activeGroup(myState);
      if (g && g.status === "playing") {
        html.push('<section class="card bj-actions"><h2>あなたの番</h2><div class="btn-row">');
        html.push('<button class="btn btn-primary" data-action="bj-hit">ヒット</button>');
        html.push('<button class="btn btn-secondary" data-action="bj-stand">ステイ</button>');
        if (g.cards.length === 2) {
          html.push('<button class="btn btn-warning" data-action="bj-surrender">サレンダー</button>');
          if ((gs.chips[ctx.me.id] || 0) >= g.bet) {
            html.push('<button class="btn btn-primary" data-action="bj-double">ダブルダウン</button>');
          }
          if (this._canSplit(g) && (gs.chips[ctx.me.id] || 0) >= g.bet) {
            html.push('<button class="btn btn-primary" data-action="bj-split">スプリット</button>');
          }
        }
        html.push('</div></section>');
      }
    } else if (gs.phase === "bj_play" && gs.turnPlayerId) {
      const tp = room.players.find(function (p) { return p.id === gs.turnPlayerId; });
      const waiting = gs.bjPendingAction ? "（アクション処理中…）" : "";
      html.push('<section class="card"><p class="note">📱 ' + escapeHtml(tp ? tp.name : "—") + ' さんの番' + waiting + '</p></section>');
    }

    if (gs.phase === "bj_dealer_pending") {
      html.push('<section class="card"><p class="note">ディーラーがカードを引いています…</p></section>');
    }

    if (gs.phase === "bj_result" && gs.results) {
      html.push('<section class="card result-box"><h2>結果</h2>');
      const myRes = gs.results[ctx.me.id];
      if (myRes) {
        if (myRes.insurance) {
          html.push('<p>保険：' + (myRes.insurance > 0 ? "+" : "") + myRes.insurance + '</p>');
        }
        myRes.groups.forEach(function (gr, i) {
          html.push('<p>ハンド' + (myRes.groups.length > 1 ? (i + 1) : "") + '：' +
            escapeHtml(gr.outcome) + '（' + (gr.payout >= 0 ? "+" : "") + gr.payout + '）</p>');
        });
      }
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="bj-next-round">次のラウンド</button>');
      }
      html.push('</section>');
    }

    html.push('<section class="card"><h2>ルール</h2><ul class="clue-list trump-rules-list" style="font-size:0.85rem">');
    html.push('<li>21に近い方が勝ち。21超えはバースト</li>');
    html.push('<li>初手21はブラックジャック（1.5倍配当）</li>');
    html.push('<li>ディーラーは17以上でスタンド</li>');
    html.push('<li>ヒット／ステイ／ダブル／スプリット／サレンダー／保険に対応</li>');
    html.push('</ul></section>');

    return html.join("");
  },

  _renderChips: function (room, gs) {
    let h = '<section class="card bj-chips"><h2>チップ</h2><ul class="turn-order-list">';
    room.players.forEach(function (p) {
      h += '<li class="turn-order-item">' + escapeHtml(p.name) + "：" + (gs.chips[p.id] || 0) + "</li>";
    });
    h += "</ul></section>";
    return h;
  }
};

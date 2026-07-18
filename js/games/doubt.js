/**
 * ダウト（Doubt）
 * 裏向きでカードを出し、宣言のランクか嘘かを見破る心理戦トランプ
 */

const DoubtGame = {
  id: "doubt",
  name: "ダウト",
  minPlayers: 2,
  maxPlayers: 4,

  SUITS: ["spade", "heart", "diamond", "club"],
  SUIT_LABEL: { spade: "♠", heart: "♥", diamond: "♦", club: "♣" },
  RANK_LABEL: { 11: "J", 12: "Q", 13: "K" },
  RANK_SEQUENCE: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],

  init: function (room) {
    const deck = shuffle(PlayingCards.createDeck54());
    const hands = PlayingCards.dealEvenly(room.players, deck);

    Object.keys(hands).forEach(function (pid) {
      PlayingCards.sortHandByRank(hands[pid]);
    });

    room.gameState = {
      hands: hands,
      turnPlayerId: room.players[0].id,
      rankIndex: 0,
      pile: [],
      lastPlay: null,
      lastReveal: null,
      finished: []
    };
    room.phase = "doubt_play";
    return room;
  },

  _rankName: function (rank) {
    return this.RANK_LABEL[rank] || String(rank);
  },

  currentRank: function (gs) {
    return this.RANK_SEQUENCE[gs.rankIndex % this.RANK_SEQUENCE.length];
  },

  getHand: function (ctx, playerId) {
    if (!ctx.isOnline) {
      return ctx.room.gameState.hands[playerId] || [];
    }
    return Secrets.getTrumpHand(ctx, playerId);
  },

  _actingPlayer: function (ctx) {
    if (!ctx.isOnline) {
      return ctx.room.gameState.turnPlayerId;
    }
    return ctx.me.id;
  },

  isMyTurn: function (ctx) {
    return ctx.room.gameState.turnPlayerId === this._actingPlayer(ctx) &&
      !ctx.room.gameState.finished.includes(this._actingPlayer(ctx)) &&
      ctx.room.phase === "doubt_play";
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

  _nextPlayerAfterLast: function (room) {
    if (!room.gameState.lastPlay) return null;
    return this._nextPlayer(room, room.gameState.lastPlay.playerId);
  },

  playCards: function (room, playerId, cardIds, handsOverride) {
    const gs = room.gameState;
    if (room.phase !== "doubt_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false };
    }
    if (cardIds.length < 1 || cardIds.length > 4) {
      return { room: room, ok: false, error: "1〜4枚出してください" };
    }

    const allHands = handsOverride || gs.hands;
    if (!allHands || !allHands[playerId]) return { room: room, ok: false };

    const hand = allHands[playerId];
    const selected = hand.filter(function (c) { return cardIds.includes(c.id); });
    if (selected.length !== cardIds.length) return { room: room, ok: false };

    const claimedRank = this.currentRank(gs);
    const newHand = hand.filter(function (c) { return !cardIds.includes(c.id); });
    allHands[playerId] = newHand;
    if (gs.hands) gs.hands[playerId] = newHand;

    gs.lastPlay = {
      playerId: playerId,
      cards: selected,
      claimedRank: claimedRank,
      count: selected.length
    };
    gs.lastReveal = null;
    gs.rankIndex += 1;
    room.phase = "doubt_wait";

    if (newHand.length === 0) {
      /* 手札0でもダウトされるまで勝利確定しない */
    }

    return { room: room, ok: true, hand: newHand };
  },

  proceed: function (room, playerId, handsOverride) {
    const gs = room.gameState;
    if (room.phase !== "doubt_wait" || !gs.lastPlay) {
      return { room: room, ok: false };
    }

    const nextId = this._nextPlayerAfterLast(room);
    if (playerId !== nextId) {
      return { room: room, ok: false, error: "次のプレイヤーだけが進められます" };
    }

    gs.pile = gs.pile.concat(gs.lastPlay.cards);
    const playedId = gs.lastPlay.playerId;
    gs.lastPlay = null;
    gs.turnPlayerId = nextId;
    room.phase = "doubt_play";

    const allHands = handsOverride || gs.hands;
    if (allHands && allHands[playedId] && allHands[playedId].length === 0) {
      gs.finished = [playedId];
      room.phase = "doubt_result";
    }

    return { room: room, ok: true };
  },

  callDoubt: function (room, doubterId, handsOverride) {
    const gs = room.gameState;
    if (room.phase !== "doubt_wait" || !gs.lastPlay) {
      return { room: room, ok: false };
    }
    if (doubterId === gs.lastPlay.playerId) {
      return { room: room, ok: false, error: "自分のプレイにはダウトできません" };
    }

    const play = gs.lastPlay;
    const wasTruth = play.cards.every(function (c) { return !c.isJoker && c.rank === play.claimedRank; });
    const wasLie = !wasTruth;
    const loserId = wasLie ? play.playerId : doubterId;

    const allHands = handsOverride || gs.hands;
    if (!allHands) return { room: room, ok: false };

    const pickup = gs.pile.concat(play.cards);
    allHands[loserId] = (allHands[loserId] || []).concat(pickup);
    if (gs.hands) gs.hands[loserId] = allHands[loserId];

    gs.lastReveal = {
      cards: play.cards,
      claimedRank: play.claimedRank,
      wasLie: wasLie,
      doubterId: doubterId,
      loserId: loserId,
      playerId: play.playerId
    };

    gs.pile = [];
    gs.lastPlay = null;
    gs.turnPlayerId = loserId;
    room.phase = "doubt_play";

    gs.turnPlayerId = loserId;
    room.phase = "doubt_play";

    if (allHands[loserId].length === 0) {
      /* 引き取っても0枚のことはない */
    }

    const winner = this._findWinner(room, allHands);
    if (winner) {
      gs.finished = [winner];
      room.phase = "doubt_result";
    }

    return { room: room, ok: true, hand: allHands[loserId], reveal: gs.lastReveal };
  },

  _findWinner: function (room, allHands) {
    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i];
      const h = allHands[p.id];
      if (h && h.length === 0) return p.id;
    }
    return null;
  },

  _checkGameEnd: function (room) {
    return room.phase === "doubt_result";
  },

  _cardHtml: function (card, selected, selectable, faceDown) {
    return PlayingCards.cardHtml(card, {
      faceDown: faceDown,
      selected: selected,
      disabled: !selectable,
      action: "doubt-toggle",
      data: { card: card.id }
    });
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];

    if (room.phase === "doubt_result") {
      const winner = gs.finished[gs.finished.length - 1] || gs.finished[0];
      const w = room.players.find(function (p) { return p.id === winner; });
      html.push('<div class="phase-banner"><h2>ゲーム終了 🎉</h2><p>勝者：<strong>' + escapeHtml(w.name) + '</strong></p></div>');
      html.push('<section class="card"><h2>順位</h2><ul class="player-list">');
      gs.finished.slice().reverse().forEach(function (pid, i) {
        const p = room.players.find(function (x) { return x.id === pid; });
        html.push('<li><span>' + (i + 1) + '位 ' + escapeHtml(p.name) + '</span></li>');
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
    const claimRank = this.currentRank(gs);

    html.push('<div class="phase-banner"><h2>ダウト</h2>');
    if (room.phase === "doubt_play") {
      html.push('<p>宣言ランク：<strong class="rank-big">' + this._rankName(claimRank) + '</strong>　ターン：' + escapeHtml(turnPlayer.name) + '</p>');
    } else {
      html.push('<p>ダウトできますか？</p>');
    }
    if (room.phase === "doubt_play") {
      html.push(TrumpUi.renderTurnOrderBlock(room, gs));
    }
    html.push('</div>');

    if (!ctx.isOnline && room.phase === "doubt_play") {
      html.push('<section class="card"><p class="note">📱 <strong>' + escapeHtml(turnPlayer.name) + '</strong> さんの番。端末を渡してください。</p></section>');
    }

    html.push('<section class="card table-area"><h2>場（' + (gs.pile.length + (gs.lastPlay ? gs.lastPlay.count : 0)) + '枚）</h2>');
    if (gs.lastReveal) {
      const lp = room.players.find(function (p) { return p.id === gs.lastReveal.playerId; });
      const db = room.players.find(function (p) { return p.id === gs.lastReveal.doubterId; });
      const lo = room.players.find(function (p) { return p.id === gs.lastReveal.loserId; });
      html.push('<div class="result-box ' + (gs.lastReveal.wasLie ? "success" : "fail") + '" style="margin-bottom:1rem">');
      html.push('<p><strong>' + escapeHtml(db.name) + '</strong> がダウト！</p>');
      html.push('<p>宣言：' + this._rankName(gs.lastReveal.claimedRank) + ' × ' + gs.lastReveal.cards.length + '枚</p>');
      html.push('<div class="table-cards">');
      gs.lastReveal.cards.forEach(function (c) {
        html.push(DoubtGame._cardHtml(c, false, false, false));
      });
      html.push('</div>');
      html.push('<p>' + (gs.lastReveal.wasLie ? escapeHtml(lp.name) + ' の嘘がバレた！' : '本当だった！') + '</p>');
      html.push('<p>' + escapeHtml(lo.name) + ' が場のカードを引き取ります</p></div>');
    }

    if (gs.lastPlay && room.phase === "doubt_wait") {
      const lp = room.players.find(function (p) { return p.id === gs.lastPlay.playerId; });
      html.push('<p class="note">' + escapeHtml(lp.name) + ' が <strong>' + gs.lastPlay.count + '枚</strong> を【' + this._rankName(gs.lastPlay.claimedRank) + '】として出しました</p>');
      html.push('<div class="table-cards">');
      for (let i = 0; i < gs.lastPlay.count; i++) {
        html.push(PlayingCards.cardHtml(null, { faceDown: true, asButton: false }));
      }
      html.push('</div>');
    } else if (gs.pile.length) {
      html.push('<p class="note">場に ' + gs.pile.length + ' 枚</p>');
      html.push('<div class="table-cards">');
      for (let i = 0; i < Math.min(gs.pile.length, 8); i++) {
        html.push(PlayingCards.cardHtml(null, { faceDown: true, asButton: false }));
      }
      if (gs.pile.length > 8) html.push('<span class="note">…他 ' + (gs.pile.length - 8) + '枚</span>');
      html.push('</div>');
    } else if (!gs.lastReveal) {
      html.push('<p class="table-empty">まだカードは出ていません</p>');
    }
    html.push('</section>');

    if (room.phase === "doubt_wait") {
      html.push('<section class="card"><h2>ダウト？</h2>');
      const nextId = this._nextPlayerAfterLast(room);
      const nextP = room.players.find(function (p) { return p.id === nextId; });

      if (ctx.me.id !== gs.lastPlay.playerId && !gs.finished.includes(ctx.me.id)) {
        html.push('<button class="btn btn-danger" data-action="doubt-call" data-doubter="' + ctx.me.id + '">ダウトする！</button>');
      } else if (!ctx.isOnline) {
        room.players.forEach(function (p) {
          if (p.id !== gs.lastPlay.playerId) {
            html.push('<button class="btn btn-danger" style="margin-bottom:0.4rem" data-action="doubt-call" data-doubter="' + p.id + '">' + escapeHtml(p.name) + ' がダウト</button>');
          }
        });
      }

      if (ctx.me.id === nextId || (!ctx.isOnline && nextId === actingId)) {
        html.push('<button class="btn btn-primary" style="margin-top:0.5rem" data-action="doubt-proceed">疑わずに次へ（' + escapeHtml(nextP.name) + 'の番）</button>');
      } else {
        html.push('<p class="note" style="margin-top:0.5rem">' + escapeHtml(nextP.name) + ' さんが「次へ」を押すか、誰かがダウトします</p>');
      }
      html.push('</section>');
    }

    if (room.phase === "doubt_play" && !gs.finished.includes(actingId)) {
      html.push('<section class="card"><h2>手札 <small>' + viewHand.length + '枚</small></h2>');

      if (this.isMyTurn(ctx)) {
        html.push('<p class="note">【' + this._rankName(claimRank) + '】として 1〜4枚選んで出す（嘘でもOK）</p>');
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          html.push(DoubtGame._cardHtml(c, DoubtGame._selected.includes(c.id), true, false));
        });
        html.push('</div>');
        html.push('<div class="btn-row" style="margin-top:0.75rem">');
        html.push('<button class="btn btn-primary" data-action="doubt-play">【' + DoubtGame._rankName(claimRank) + '】として出す</button>');
        html.push('<button class="btn btn-secondary" data-action="doubt-clear">選択解除</button>');
        html.push('</div>');
      } else if (ctx.isOnline) {
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          html.push(DoubtGame._cardHtml(c, false, false, false));
        });
        html.push('</div>');
        html.push('<p class="note">あなたの手札（待機中）</p>');
      } else {
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          html.push(DoubtGame._cardHtml(c, false, false, false));
        });
        html.push('</div>');
      }
      html.push('</section>');
    }

    html.push(TrumpUi.renderFooter({
      rulesAction: "doubt-rules-toggle"
    }));
    html.push(TrumpUi.renderRulesPanel(
      "doubtRulesPanel",
      "ルール",
      '<ul class="clue-list trump-rules-list">' +
      "<li>順番に <strong>1〜4枚</strong> を裏向きで出し、宣言ランク（A→2→3…K）を名乗る</li>" +
      "<li>嘘でもOK。他の人が <strong>ダウト</strong> できる</li>" +
      "<li>嘘がバレたら出した人が場を引き取る。本当ならダウトした人が引き取る</li>" +
      "<li>手札を全てなくした人の勝ち</li>" +
      "</ul>"
    ));

    return html.join("");
  }
};

DoubtGame._selected = [];

DoubtGame.getSelected = function () {
  return DoubtGame._selected.slice();
};

DoubtGame.toggleCard = function (cardId) {
  const idx = DoubtGame._selected.indexOf(cardId);
  if (idx >= 0) {
    DoubtGame._selected.splice(idx, 1);
  } else if (DoubtGame._selected.length < 4) {
    DoubtGame._selected.push(cardId);
  }
  document.querySelectorAll("[data-card]").forEach(function (el) {
    el.classList.toggle("is-selected", DoubtGame._selected.includes(el.dataset.card));
  });
};

DoubtGame.clearSelected = function () {
  DoubtGame._selected = [];
  document.querySelectorAll(".playing-card.is-selected").forEach(function (el) {
    el.classList.remove("is-selected");
  });
};

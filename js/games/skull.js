/**
 * 爆弾（Skull）
 * 宝石💎と爆弾💣のブレンドゲーム。かけて裏返し、2勝で優勝
 */

const SkullGame = {
  id: "skull",
  name: "爆弾",
  minPlayers: 3,
  maxPlayers: 6,
  WIN_POINTS: 2,

  init: function (room) {
    const hands = {};
    room.players.forEach(function (p) {
      const tokens = [
        { id: p.id + "-r1", type: "rose" },
        { id: p.id + "-r2", type: "rose" },
        { id: p.id + "-r3", type: "rose" },
        { id: p.id + "-s1", type: "skull" }
      ];
      hands[p.id] = shuffle(tokens);
    });

    const wins = {};
    room.players.forEach(function (p) { wins[p.id] = 0; });

    room.gameState = {
      hands: hands,
      handCounts: {},
      mats: {},
      revealed: {},
      turnPlayerId: room.players[0].id,
      roundStarterId: room.players[0].id,
      wins: wins,
      eliminated: [],
      winnerId: null,
      bid: null,
      flip: null,
      pendingFlip: null,
      pickLoss: null,
      lastResult: null
    };
    room.players.forEach(function (p) {
      room.gameState.mats[p.id] = [];
      room.gameState.handCounts[p.id] = 4;
    });
    room.phase = "skull_play";
    return room;
  },

  getHand: function (ctx, playerId) {
    if (!ctx.isOnline) {
      return (ctx.room.gameState.hands && ctx.room.gameState.hands[playerId]) || [];
    }
    if (playerId === ctx.me.id && ctx.secrets && ctx.secrets.hand) {
      return ctx.secrets.hand;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.hands) {
      return ctx.hostSecrets.hands[playerId] || [];
    }
    return [];
  },

  getCardType: function (ctx, cardId) {
    if (!ctx.isOnline && ctx.room.gameState.hands) {
      const gs = ctx.room.gameState;
      let found = null;
      Object.keys(gs.hands || {}).forEach(function (pid) {
        (gs.hands[pid] || []).forEach(function (c) {
          if (c.id === cardId) found = c.type;
        });
      });
      if (found) return found;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.skullTypes) {
      return ctx.hostSecrets.skullTypes[cardId] || null;
    }
    if (ctx.room.gameState.revealed && ctx.room.gameState.revealed[cardId]) {
      return ctx.room.gameState.revealed[cardId];
    }
    return null;
  },

  _actingPlayer: function (ctx) {
    if (!ctx.isOnline) return ctx.room.gameState.turnPlayerId;
    return ctx.me.id;
  },

  _activePlayers: function (room) {
    const gs = room.gameState;
    return room.players.filter(function (p) {
      if (gs.eliminated.indexOf(p.id) >= 0) return false;
      const hand = (gs.hands && gs.hands[p.id]) || [];
      return hand.length > 0 || SkullGame._matCount(gs, p.id) > 0;
    });
  },

  _playersWithCards: function (room) {
    const gs = room.gameState;
    return room.players.filter(function (p) {
      if (gs.eliminated.indexOf(p.id) >= 0) return false;
      const handLen = SkullGame.getHandCount(gs, p.id);
      return handLen > 0;
    });
  },

  getHandCount: function (gs, playerId) {
    if (gs.hands && gs.hands[playerId]) return gs.hands[playerId].length;
    if (gs.handCounts && gs.handCounts[playerId] !== undefined) return gs.handCounts[playerId];
    return 0;
  },

  _matCount: function (gs, playerId) {
    return (gs.mats[playerId] || []).length;
  },

  _totalMatCards: function (gs) {
    let n = 0;
    Object.keys(gs.mats || {}).forEach(function (pid) {
      n += (gs.mats[pid] || []).length;
    });
    return n;
  },

  _nextPlayer: function (room, fromId, options) {
    options = options || {};
    const gs = room.gameState;
    const players = room.players;
    let idx = players.findIndex(function (p) { return p.id === fromId; });
    for (let i = 1; i <= players.length; i++) {
      const p = players[(idx + i) % players.length];
      if (gs.eliminated.indexOf(p.id) >= 0) continue;
      if (SkullGame.getHandCount(gs, p.id) <= 0 && SkullGame._matCount(gs, p.id) <= 0) continue;
      if (options.skipPassed && gs.bid && gs.bid.passed.indexOf(p.id) >= 0) continue;
      return p.id;
    }
    return fromId;
  },

  isMyTurn: function (ctx) {
    const gs = ctx.room.gameState;
    return ctx.room.phase === "skull_play" &&
      gs.turnPlayerId === this._actingPlayer(ctx) &&
      gs.eliminated.indexOf(this._actingPlayer(ctx)) < 0;
  },

  isFlipper: function (ctx) {
    const gs = ctx.room.gameState;
    return ctx.room.phase === "skull_flip" &&
      gs.flip && gs.flip.bidderId === ctx.me.id;
  },

  _challengeReady: function (room) {
    const gs = room.gameState;
    if (!gs.bid) return false;
    const active = this._playersWithCards(room);
    return active.every(function (p) {
      return p.id === gs.bid.bidderId || gs.bid.passed.indexOf(p.id) >= 0;
    });
  },

  playCard: function (room, playerId, cardId, handsOverride) {
    const gs = room.gameState;
    if (room.phase !== "skull_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }

    const allHands = handsOverride || gs.hands;
    const hand = (allHands && allHands[playerId]) || [];
    const card = hand.find(function (c) { return c.id === cardId; });
    if (!card) return { room: room, ok: false, error: "カードがありません" };

    allHands[playerId] = hand.filter(function (c) { return c.id !== cardId; });
    if (gs.hands) gs.hands[playerId] = allHands[playerId];
    if (gs.handCounts) gs.handCounts[playerId] = allHands[playerId].length;

    if (!gs.mats[playerId]) gs.mats[playerId] = [];
    gs.mats[playerId].push({ id: card.id });

    gs.turnPlayerId = this._nextPlayer(room, playerId, { skipPassed: !!gs.bid });
    if (gs.bid && this._challengeReady(room)) {
      return this._beginFlip(room);
    }
    return { room: room, ok: true, hand: allHands[playerId], card: card };
  },

  startBid: function (room, playerId, amount) {
    const gs = room.gameState;
    if (room.phase !== "skull_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    const total = this._totalMatCards(gs);
    if (total < 1) {
      return { room: room, ok: false, error: "場にカードがないとビッドできません" };
    }

    const bidAmount = amount || 1;
    if (bidAmount < 1 || bidAmount > total) {
      return { room: room, ok: false, error: "1〜" + total + " でビッドしてください" };
    }

    if (gs.bid) {
      if (gs.bid.passed.indexOf(playerId) >= 0) {
        return { room: room, ok: false, error: "パス済みです" };
      }
      if (bidAmount <= gs.bid.amount) {
        return { room: room, ok: false, error: "現在のビッド（" + gs.bid.amount + "）より大きくしてください" };
      }
      gs.bid.amount = bidAmount;
      gs.bid.bidderId = playerId;
    } else {
      gs.bid = { amount: bidAmount, bidderId: playerId, passed: [] };
    }

    gs.turnPlayerId = this._nextPlayer(room, playerId, { skipPassed: true });
    if (this._challengeReady(room)) {
      return this._beginFlip(room);
    }
    return { room: room, ok: true };
  },

  passBid: function (room, playerId) {
    const gs = room.gameState;
    if (room.phase !== "skull_play" || !gs.bid) {
      return { room: room, ok: false, error: "ビッド中ではありません" };
    }
    if (gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    if (gs.bid.passed.indexOf(playerId) >= 0) {
      return { room: room, ok: false, error: "すでにパスしています" };
    }
    const othersActive = this._playersWithCards(room).filter(function (p) {
      return p.id !== playerId && gs.bid.passed.indexOf(p.id) < 0;
    });
    if (gs.bid.bidderId === playerId && othersActive.length === 0) {
      return { room: room, ok: false, error: "全員がパスするまで待ってください" };
    }

    gs.bid.passed.push(playerId);
    gs.turnPlayerId = this._nextPlayer(room, playerId, { skipPassed: true });
    if (this._challengeReady(room)) {
      return this._beginFlip(room);
    }
    return { room: room, ok: true };
  },

  _beginFlip: function (room) {
    const gs = room.gameState;
    room.phase = "skull_flip";
    gs.flip = {
      bidderId: gs.bid.bidderId,
      need: gs.bid.amount,
      roses: 0,
      flipped: [],
      skullOwner: null
    };
    gs.bid = null;
    return { room: room, ok: true, beginFlip: true };
  },

  _ownMatUnrevealed: function (gs, playerId) {
    return (gs.mats[playerId] || []).filter(function (c) {
      return !gs.revealed[c.id];
    });
  },

  _canFlipCard: function (room, flipperId, matOwnerId, cardId) {
    const gs = room.gameState;
    const mat = gs.mats[matOwnerId] || [];
    const card = mat.find(function (c) { return c.id === cardId; });
    if (!card || gs.revealed[cardId]) return false;

    const ownLeft = this._ownMatUnrevealed(gs, flipperId);
    if (ownLeft.length && matOwnerId !== flipperId) return false;
    return true;
  },

  requestFlip: function (room, flipperId, matOwnerId, cardId) {
    const gs = room.gameState;
    if (room.phase !== "skull_flip" || !gs.flip || gs.flip.bidderId !== flipperId) {
      return { room: room, ok: false, error: "裏返しの番ではありません" };
    }
    if (!this._canFlipCard(room, flipperId, matOwnerId, cardId)) {
      return { room: room, ok: false, error: "今はそのカードを裏返せません（自分のカードを先に）" };
    }
    gs.pendingFlip = { cardId: cardId, matOwnerId: matOwnerId, flipperId: flipperId };
    return { room: room, ok: true, pending: true };
  },

  resolveFlip: function (room, cardType, hostSecrets) {
    const gs = room.gameState;
    const pending = gs.pendingFlip;
    if (!pending || room.phase !== "skull_flip" || !gs.flip) {
      return { room: room, ok: false, error: "裏返し待ちがありません" };
    }

    const cardId = pending.cardId;
    gs.revealed[cardId] = cardType;
    gs.flip.flipped.push(cardId);
    gs.pendingFlip = null;

    if (cardType === "skull") {
      gs.flip.skullOwner = pending.matOwnerId;
      gs.lastResult = {
        success: false,
        flipperId: gs.flip.bidderId,
        skullOwnerId: pending.matOwnerId,
        roses: gs.flip.roses
      };
      room.phase = "skull_pick";
      const loserId = gs.flip.bidderId;
      const loserCards = this._loserCardIds(gs, hostSecrets, loserId);
      gs.pickLoss = {
        pickerId: pending.matOwnerId,
        loserId: loserId,
        loserCardIds: loserCards
      };
      return { room: room, ok: true, skull: true };
    }

    gs.flip.roses += 1;
    if (gs.flip.roses >= gs.flip.need) {
      const winner = gs.flip.bidderId;
      gs.wins[winner] = (gs.wins[winner] || 0) + 1;
      gs.lastResult = {
        success: true,
        flipperId: winner,
        roses: gs.flip.roses
      };
      if (gs.wins[winner] >= this.WIN_POINTS) {
        gs.winnerId = winner;
        room.phase = "skull_result";
        return { room: room, ok: true, win: true };
      }
      return this._endRound(room, winner, hostSecrets);
    }

    return { room: room, ok: true };
  },

  _loserCardIds: function (gs, hostSecrets, loserId) {
    const hand = (gs.hands && gs.hands[loserId]) ||
      (hostSecrets && hostSecrets.hands && hostSecrets.hands[loserId]) || [];
    return hand.map(function (c) { return c.id; });
  },

  requestPickLoss: function (room, pickerId, cardId) {
    const gs = room.gameState;
    if (room.phase !== "skull_pick" || !gs.pickLoss) {
      return { room: room, ok: false, error: "カードを選べる状態ではありません" };
    }
    if (gs.pickLoss.pickerId !== pickerId) {
      return { room: room, ok: false, error: "爆弾を出した人だけが選べます" };
    }
    if ((gs.pickLoss.loserCardIds || []).indexOf(cardId) < 0) {
      return { room: room, ok: false, error: "カードがありません" };
    }
    gs.pendingPickLoss = { pickerId: pickerId, cardId: cardId };
    return { room: room, ok: true, pending: true };
  },

  pickLossCard: function (room, pickerId, cardId, handsOverride, hostSecrets) {
    const gs = room.gameState;
    if (room.phase !== "skull_pick" || !gs.pickLoss) {
      return { room: room, ok: false, error: "カードを選べる状態ではありません" };
    }
    if (gs.pickLoss.pickerId !== pickerId) {
      return { room: room, ok: false, error: "爆弾を出した人だけが選べます" };
    }

    const loserId = gs.pickLoss.loserId;
    let allHands = handsOverride || gs.hands;
    if (!allHands || !allHands[loserId]) {
      allHands = hostSecrets && hostSecrets.hands ? JSON.parse(JSON.stringify(hostSecrets.hands)) : {};
    }
    const hand = (allHands && allHands[loserId]) || [];
    const card = hand.find(function (c) { return c.id === cardId; });
    if (!card) return { room: room, ok: false, error: "カードがありません" };

    const cardType = card.type || (hostSecrets && hostSecrets.skullTypes && hostSecrets.skullTypes[cardId]);
    allHands[loserId] = hand.filter(function (c) { return c.id !== cardId; });
    if (gs.hands) gs.hands[loserId] = allHands[loserId];
    if (gs.handCounts) gs.handCounts[loserId] = allHands[loserId].length;

    if (!gs.removed) gs.removed = {};
    if (!gs.removed[loserId]) gs.removed[loserId] = [];
    gs.removed[loserId].push({ type: cardType || "rose" });

    if (allHands[loserId].length === 0) {
      if (gs.eliminated.indexOf(loserId) < 0) gs.eliminated.push(loserId);
    }

    const survivors = this._playersWithCards(room);
    if (survivors.length <= 1) {
      gs.winnerId = survivors[0] ? survivors[0].id : null;
      room.phase = "skull_result";
      return { room: room, ok: true, loserHand: allHands[loserId] };
    }

    return this._endRound(room, this._nextPlayer(room, loserId), hostSecrets);
  },

  _endRound: function (room, nextStarterId, hostSecrets) {
    const gs = room.gameState;
    this._returnMatsToHands(gs, hostSecrets);
    if (hostSecrets) this.rebuildHandsAfterRound(room, hostSecrets);
    Object.keys(gs.handCounts || {}).forEach(function (pid) {
      const count = hostSecrets && hostSecrets.hands && hostSecrets.hands[pid]
        ? hostSecrets.hands[pid].length
        : (gs.hands && gs.hands[pid] ? gs.hands[pid].length : gs.handCounts[pid]);
      gs.handCounts[pid] = count;
    });
    gs.revealed = {};
    gs.flip = null;
    gs.pickLoss = null;
    gs.pendingPickLoss = null;
    gs.bid = null;
    gs.roundStarterId = nextStarterId;
    gs.turnPlayerId = nextStarterId;
    room.phase = "skull_play";
    return { room: room, ok: true, roundEnd: true };
  },

  _returnMatsToHands: function (gs, hostSecrets) {
    Object.keys(gs.mats || {}).forEach(function (pid) {
      const mat = gs.mats[pid] || [];
      if (!gs.hands) gs.hands = {};
      if (!gs.hands[pid]) gs.hands[pid] = [];
      mat.forEach(function (c) {
        const type = gs.revealed[c.id] ||
          (hostSecrets && hostSecrets.skullTypes && hostSecrets.skullTypes[c.id]) || null;
        gs.hands[pid].push(type ? { id: c.id, type: type } : { id: c.id });
      });
      gs.mats[pid] = [];
    });
  },

  dismissResult: function (room) {
    if (!room.gameState.lastResult) return { room: room, ok: false };
    room.gameState.lastResult = null;
    return { room: room, ok: true };
  },

  _tokenHtml: function (card, revealed, selectable, matOwner) {
    const type = revealed || null;
    const faceDown = !type;
    const sel = selectable ? " skull-selectable" : "";
    const cls = type === "skull" ? "skull-token skull-skull" : (type === "rose" ? "skull-token skull-rose" : "skull-token skull-back");

    if (selectable && faceDown) {
      return (
        '<button type="button" class="playing-card ' + cls + sel + '" ' +
        'data-action="sk-flip" data-card="' + card.id + '" data-owner="' + matOwner + '">' +
        '<span class="skull-icon">' + (faceDown ? "?" : (type === "rose" ? "💎" : "💣")) + '</span></button>'
      );
    }
    return (
      '<div class="playing-card ' + cls + '">' +
      '<span class="skull-icon">' + (faceDown ? "?" : (type === "rose" ? "💎" : "💣")) + '</span></div>'
    );
  },

  _handTokenHtml: function (card, selected, selectable) {
    const icon = card.type === "skull" ? "💣" : "💎";
    const cls = card.type === "skull" ? "skull-token skull-skull" : "skull-token skull-rose";
    const sel = selected ? " is-selected" : "";
    if (selectable) {
      return (
        '<button type="button" class="playing-card ' + cls + sel + '" ' +
        'data-action="sk-toggle" data-card="' + card.id + '">' +
        '<span class="skull-icon">' + icon + '</span></button>'
      );
    }
    return '<div class="playing-card skull-token skull-back"><span class="skull-icon">?</span></div>';
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const actingId = this._actingPlayer(ctx);
    const myHand = this.getHand(ctx, ctx.me.id);

    if (room.phase === "skull_result") {
      const winner = room.players.find(function (p) { return p.id === gs.winnerId; });
      html.push('<div class="phase-banner"><h2>ゲーム終了 🎉</h2>');
      html.push('<p>勝者：<strong>' + escapeHtml(winner ? winner.name : "—") + '</strong></p></div>');
      html.push(this._renderScoreboard(room, gs));
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    html.push('<div class="phase-banner"><h2>爆弾</h2>');
    html.push('<p>先に <strong>' + this.WIN_POINTS + '勝</strong> した人が優勝</p>');
    if (room.phase === "skull_play" && gs.turnPlayerId) {
      var skullOpts = { eliminated: gs.eliminated };
      if (gs.bid && gs.bid.passed) skullOpts.extraSkip = gs.bid.passed;
      html.push(TrumpUi.renderTurnOrderBlock(room, gs, skullOpts));
    }
    html.push('</div>');
    html.push(this._renderScoreboard(room, gs));

    if (gs.lastResult && room.phase === "skull_play") {
      const flipper = room.players.find(function (p) { return p.id === gs.lastResult.flipperId; });
      html.push('<section class="card result-box">');
      if (gs.lastResult.success) {
        html.push('<h2>💎 成功！</h2><p><strong>' + escapeHtml(flipper.name) + '</strong> が ' + gs.lastResult.roses + ' 枚の宝石を裏返しました</p>');
      } else {
        const skullOwner = room.players.find(function (p) { return p.id === gs.lastResult.skullOwnerId; });
        html.push('<h2>💣 爆弾！</h2><p><strong>' + escapeHtml(flipper.name) + '</strong> が爆弾を引いてしまいました</p>');
        if (skullOwner) html.push('<p>' + escapeHtml(skullOwner.name) + ' が1枚選んで脱落させます</p>');
      }
      html.push('<button class="btn btn-primary" data-action="sk-continue">次のラウンドへ</button></section>');
    }

    if (room.phase === "skull_pick" && gs.pickLoss) {
      const picker = room.players.find(function (p) { return p.id === gs.pickLoss.pickerId; });
      const loser = room.players.find(function (p) { return p.id === gs.pickLoss.loserId; });
      html.push('<section class="card"><h2>💣 カードを1枚失う</h2>');
      html.push('<p><strong>' + escapeHtml(loser.name) + '</strong> が1枚失います。<strong>' + escapeHtml(picker.name) + '</strong> が選んでください</p>');

      if (ctx.me.id === gs.pickLoss.pickerId) {
        html.push('<div class="hand-row">');
        (gs.pickLoss.loserCardIds || []).forEach(function (cid) {
          html.push(
            '<button type="button" class="playing-card skull-token skull-back skull-selectable" ' +
            'data-action="sk-pick-loss" data-card="' + cid + '"><span class="skull-icon">?</span></button>'
          );
        });
        html.push('</div>');
      } else {
        html.push('<p class="note">📱 ' + escapeHtml(picker.name) + ' さんが選んでいます…</p>');
      }
      html.push('</section>');
    }

    if (room.phase === "skull_flip" && gs.flip) {
      const flipper = room.players.find(function (p) { return p.id === gs.flip.bidderId; });
      html.push('<section class="card"><h2>裏返しフェーズ</h2>');
      html.push('<p><strong>' + escapeHtml(flipper.name) + '</strong> が <strong>' + gs.flip.need + '</strong> 枚の宝石を目指す（現在 💎' + gs.flip.roses + '）</p>');
      if (gs.pendingFlip) {
        html.push('<p class="note">カードを裏返し中…</p>');
      }
      html.push('</section>');
    }

    html.push('<section class="card"><h2>場（マット）</h2>');
    room.players.forEach(function (p) {
      if (gs.eliminated.indexOf(p.id) >= 0) return;
      const mat = gs.mats[p.id] || [];
      html.push('<div class="skull-mat-row"><strong>' + escapeHtml(p.name) + '</strong> ');
      html.push('<small>(' + mat.length + '枚)</small><div class="hand-row">');
      if (!mat.length) {
        html.push('<span class="note">なし</span>');
      } else {
        mat.forEach(function (c) {
          const revealed = gs.revealed[c.id] || null;
          const canFlip = room.phase === "skull_flip" &&
            SkullGame.isFlipper(ctx) &&
            !gs.pendingFlip &&
            SkullGame._canFlipCard(room, ctx.me.id, p.id, c.id);
          html.push(SkullGame._tokenHtml(c, revealed, canFlip, p.id));
        });
      }
      html.push('</div></div>');
    });
    html.push('</section>');

    if (gs.bid && room.phase === "skull_play") {
      const bidder = room.players.find(function (p) { return p.id === gs.bid.bidderId; });
      html.push('<section class="card"><h2>ビッド中</h2>');
      html.push('<p><strong>' + escapeHtml(bidder.name) + '</strong> が <strong>' + gs.bid.amount + '</strong> 枚宣言</p>');
      html.push('<p class="note">パスした人：');
      if (gs.bid.passed.length) {
        gs.bid.passed.forEach(function (pid, i) {
          const pl = room.players.find(function (x) { return x.id === pid; });
          html.push((i ? "、" : "") + escapeHtml(pl ? pl.name : "—"));
        });
      } else {
        html.push('なし');
      }
      html.push('</p></section>');
    }

    if (room.phase === "skull_play" && gs.eliminated.indexOf(ctx.me.id) < 0) {
      html.push('<section class="card"><h2>あなたの手札 <small>' + myHand.length + '枚</small></h2>');
      if (this.isMyTurn(ctx)) {
        html.push('<div class="hand-row">');
        myHand.forEach(function (c) {
          html.push(SkullGame._handTokenHtml(c, SkullGame._selected === c.id, true));
        });
        html.push('</div>');
        html.push('<div class="btn-row" style="margin-top:0.75rem">');
        html.push('<button class="btn btn-primary" data-action="sk-play">場に出す</button>');
        const total = this._totalMatCards(gs);
        if (total > 0) {
          const minBid = gs.bid ? gs.bid.amount + 1 : 1;
          if (!gs.bid || gs.bid.passed.indexOf(ctx.me.id) < 0) {
            html.push('<button class="btn btn-secondary" data-action="sk-bid" data-amount="' + minBid + '">ビッド ' + minBid + '</button>');
          }
        }
        if (gs.bid && gs.bid.passed.indexOf(ctx.me.id) < 0 && gs.bid.bidderId !== ctx.me.id) {
          html.push('<button class="btn btn-warning" data-action="sk-pass">パス</button>');
        }
        html.push('</div>');
      } else {
        const tp = room.players.find(function (p) { return p.id === gs.turnPlayerId; });
        html.push('<p class="note">📱 ' + escapeHtml(tp ? tp.name : "—") + ' さんの番</p>');
        html.push('<div class="hand-row">');
        myHand.forEach(function (c) {
          html.push(SkullGame._handTokenHtml(c, false, false));
        });
        html.push('</div>');
      }
      html.push('</section>');
    }

    html.push(TrumpUi.renderFooter({ rulesAction: "sk-rules-toggle" }));
    html.push(TrumpUi.renderRulesPanel(
      "skRulesPanel",
      "ルール",
      '<ul class="clue-list trump-rules-list">' +
      "<li>手札4枚（💎×3 ＋ 💣×1）。自分だけが中身を知っています</li>" +
      "<li>順番に1枚ずつ場に裏向きで出す</li>" +
      "<li>場にカードがあれば「ビッド」開始可。数字を上げ合い、最後まで残った人が裏返し</li>" +
      "<li>裏返しは<strong>自分のカードを全部</strong>先に。その後ほかの人のカードを選んで裏返す</li>" +
      "<li>目標枚数の宝石💎だけ裏返せば1勝。爆弾💣を引いたら負けで1枚失う</li>" +
      "<li>爆弾を出した人が、失敗した人の手札から1枚選んで永久に失わせる</li>" +
      "<li><strong>2勝</strong>で優勝</li>" +
      "</ul>"
    ));

    return html.join("");
  },

  _renderScoreboard: function (room, gs) {
    const html = ['<section class="card skull-scoreboard"><h2>スコア</h2><ul class="turn-order-list">'];
    room.players.forEach(function (p) {
      const wins = gs.wins[p.id] || 0;
      const out = gs.eliminated.indexOf(p.id) >= 0;
      html.push('<li class="turn-order-item' + (out ? " is-finished" : "") + '">');
      html.push(escapeHtml(p.name) + "：💎 " + wins + " 勝");
      if (out) html.push(' <small>（脱落）</small>');
      html.push('</li>');
    });
    html.push('</ul></section>');
    return html.join("");
  }
};

SkullGame._selected = null;

SkullGame.toggleCard = function (cardId) {
  SkullGame._selected = SkullGame._selected === cardId ? null : cardId;
  document.querySelectorAll("[data-action=sk-toggle]").forEach(function (el) {
    el.classList.toggle("is-selected", el.dataset.card === SkullGame._selected);
  });
};

SkullGame.clearSelected = function () {
  SkullGame._selected = null;
  document.querySelectorAll(".playing-card.is-selected").forEach(function (el) {
    el.classList.remove("is-selected");
  });
};

SkullGame.syncHandsToSecrets = function (room, hostSecrets) {
  if (!room.gameState || !room.gameState.hands || !hostSecrets) return;
  hostSecrets.hands = JSON.parse(JSON.stringify(room.gameState.hands));
  hostSecrets.skullTypes = hostSecrets.skullTypes || {};
  Object.keys(room.gameState.hands).forEach(function (pid) {
    (room.gameState.hands[pid] || []).forEach(function (c) {
      if (c.type) hostSecrets.skullTypes[c.id] = c.type;
    });
  });
};

SkullGame.rebuildHandsAfterRound = function (room, hostSecrets) {
  const gs = room.gameState;
  if (!gs.hands || !hostSecrets || !hostSecrets.skullTypes) return;
  Object.keys(gs.mats || {}).forEach(function (pid) {
    if (!gs.hands[pid]) gs.hands[pid] = [];
  });
  Object.keys(gs.hands).forEach(function (pid) {
    gs.hands[pid] = gs.hands[pid].map(function (c) {
      const type = c.type || hostSecrets.skullTypes[c.id];
      return type ? { id: c.id, type: type } : c;
    });
  });
  SkullGame.syncHandsToSecrets(room, hostSecrets);
};

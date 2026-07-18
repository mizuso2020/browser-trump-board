/**
 * ババ抜き（Old Maid）
 * ペアを捨てて手札を減らす。最後にジョーカー（ババ）が残った人の負け
 */

const OldMaidGame = {
  id: "oldmaid",
  name: "ババ抜き",
  minPlayers: 2,
  maxPlayers: 6,

  SUITS: ["spade", "heart", "diamond", "club"],
  SUIT_LABEL: { spade: "♠", heart: "♥", diamond: "♦", club: "♣" },
  RANK_LABEL: { 11: "J", 12: "Q", 13: "K" },

  init: function (room) {
    const deck = shuffle(PlayingCards.createDeck54());
    const hands = PlayingCards.dealEvenly(room.players, deck);

    Object.keys(hands).forEach(function (pid) {
      hands[pid] = OldMaidGame._removeAllPairs(hands[pid]);
      PlayingCards.sortHandByRank(hands[pid]);
    });

    room.gameState = {
      hands: hands,
      turnPlayerId: room.players[0].id,
      lastDraw: null,
      finished: [],
      loserId: null
    };
    room.phase = "oldmaid_play";
    return room;
  },

  _removeAllPairs: function (hand) {
    const byRank = {};
    const jokers = [];
    hand.forEach(function (c) {
      if (c.isJoker) jokers.push(c);
      else {
        byRank[c.rank] = byRank[c.rank] || [];
        byRank[c.rank].push(c);
      }
    });

    const kept = jokers.slice();
    Object.keys(byRank).forEach(function (rank) {
      const cards = byRank[rank];
      const odd = cards.length % 2;
      for (let i = cards.length - odd; i < cards.length; i++) {
        kept.push(cards[i]);
      }
    });
    return kept;
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

  _activePlayers: function (room) {
    const finished = room.gameState.finished;
    return room.players.filter(function (p) { return !finished.includes(p.id); });
  },

  _nextPlayer: function (room, fromId) {
    const active = this._activePlayers(room);
    const idx = active.findIndex(function (p) { return p.id === fromId; });
    if (idx < 0) return active[0] ? active[0].id : fromId;
    return active[(idx + 1) % active.length].id;
  },

  _drawTarget: function (room, pickerId) {
    return this._nextPlayer(room, pickerId);
  },

  isMyTurn: function (ctx) {
    return ctx.room.gameState.turnPlayerId === this._actingPlayer(ctx) &&
      !ctx.room.gameState.finished.includes(this._actingPlayer(ctx)) &&
      ctx.room.phase === "oldmaid_play";
  },

  drawCard: function (room, pickerId, cardIndex, handsOverride) {
    const gs = room.gameState;
    if (room.phase !== "oldmaid_play" || gs.turnPlayerId !== pickerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }

    const targetId = this._drawTarget(room, pickerId);
    const allHands = handsOverride || gs.hands;
    if (!allHands || !allHands[targetId] || !allHands[targetId].length) {
      return { room: room, ok: false, error: "引ける相手がいません" };
    }

    const targetHand = allHands[targetId].slice();
    const idx = parseInt(cardIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= targetHand.length) {
      return { room: room, ok: false, error: "カードを選んでください" };
    }

    const drawn = targetHand.splice(idx, 1)[0];
    allHands[targetId] = targetHand;
    if (gs.hands) gs.hands[targetId] = targetHand;

    let pickerHand = (allHands[pickerId] || []).concat([drawn]);
    pickerHand = this._removeAllPairs(pickerHand);
    allHands[pickerId] = pickerHand;
    if (gs.hands) gs.hands[pickerId] = pickerHand;

    gs.lastDraw = { pickerId: pickerId, targetId: targetId, card: drawn };

    if (!pickerHand.length) {
      if (!gs.finished.includes(pickerId)) gs.finished.push(pickerId);
    }
    if (!targetHand.length) {
      if (!gs.finished.includes(targetId)) gs.finished.push(targetId);
    }

    const active = room.players.filter(function (p) {
      return (allHands[p.id] || []).length > 0;
    });

    if (active.length <= 1) {
      gs.loserId = active[0] ? active[0].id : pickerId;
      room.phase = "oldmaid_result";
      return { room: room, ok: true, drawn: drawn, hand: pickerHand };
    }

    gs.turnPlayerId = this._nextPlayer(room, pickerId);
    return { room: room, ok: true, drawn: drawn, hand: pickerHand };
  },

  _cardHtml: function (card, faceDown) {
    return PlayingCards.cardHtml(card, {
      faceDown: faceDown,
      asButton: false,
      joker: "red"
    });
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const actingId = this._actingPlayer(ctx);
    const turnPlayer = room.players.find(function (p) { return p.id === gs.turnPlayerId; });

    if (room.phase === "oldmaid_result") {
      const loser = room.players.find(function (p) { return p.id === gs.loserId; });
      html.push('<div class="phase-banner"><h2>ゲーム終了</h2>');
      html.push('<p>💀 ババ抜き：<strong>' + escapeHtml(loser.name) + '</strong> さんの負け！</p></div>');
      html.push('<section class="card"><h2>結果</h2><ul class="player-list">');
      gs.finished.forEach(function (pid, i) {
        const p = room.players.find(function (x) { return x.id === pid; });
        html.push('<li><span>🎉 ' + escapeHtml(p.name) + '（' + (i + 1) + '位に手札ゼロ）</span></li>');
      });
      html.push('<li><span>💀 ' + escapeHtml(loser.name) + '（ババ）</span></li></ul></section>');
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    const targetId = this._drawTarget(room, gs.turnPlayerId);
    const target = room.players.find(function (p) { return p.id === targetId; });
    const targetHand = this.getHand(ctx, targetId);
    const myHand = this.getHand(ctx, actingId);

    html.push('<div class="phase-banner"><h2>ババ抜き</h2>');
    html.push('<p>ターン：<strong>' + escapeHtml(turnPlayer.name) + '</strong></p>');
    html.push(TrumpUi.renderTurnOrderBlock(room, gs));
    html.push('</div>');

    if (!ctx.isOnline) {
      html.push('<section class="card"><p class="note">📱 <strong>' + escapeHtml(turnPlayer.name) + '</strong> さんの番。端末を渡してください。</p></section>');
    }

    if (gs.lastDraw) {
      const picker = room.players.find(function (p) { return p.id === gs.lastDraw.pickerId; });
      const tgt = room.players.find(function (p) { return p.id === gs.lastDraw.targetId; });
      html.push('<section class="card result-box"><p><strong>' + escapeHtml(picker.name) + '</strong> が ');
      html.push('<strong>' + escapeHtml(tgt.name) + '</strong> から1枚引きました → ');
      html.push(OldMaidGame._cardHtml(gs.lastDraw.card, false));
      html.push('</p></section>');
    }

    if (this.isMyTurn(ctx)) {
      html.push('<section class="card"><h2>' + escapeHtml(target.name) + ' から1枚引く</h2>');
      html.push('<p class="note">裏向きのカードを1枚選んでください</p><div class="hand-row">');
      targetHand.forEach(function (c, i) {
        html.push(PlayingCards.cardHtml(c, {
          faceDown: true,
          action: "om-draw",
          data: { index: i }
        }));
      });
      html.push('</div></section>');
    } else if (ctx.isOnline) {
      html.push('<section class="card"><p class="note">' + escapeHtml(turnPlayer.name) + ' さんが ' + escapeHtml(target.name) + ' から引いています…</p></section>');
    }

    html.push('<section class="card"><h2>手札</h2>');
    room.players.forEach(function (p) {
      const hand = OldMaidGame.getHand(ctx, p.id);
      if (!hand.length && gs.finished.includes(p.id)) return;
      const show = p.id === ctx.me.id || (!ctx.isOnline && p.id === actingId);
      html.push('<p><strong>' + escapeHtml(p.name) + '</strong> <small>' + hand.length + '枚</small></p>');
      if (show && hand.length) {
        html.push('<div class="hand-row">');
        hand.forEach(function (c) { html.push(OldMaidGame._cardHtml(c, false)); });
        html.push('</div>');
      } else if (hand.length) {
        html.push('<div class="hand-row">');
        for (let i = 0; i < hand.length; i++) {
          html.push(PlayingCards.cardHtml(null, { faceDown: true, asButton: false }));
        }
        html.push('</div>');
      }
    });
    html.push('</section>');

    html.push(TrumpUi.renderFooter({
      rulesAction: "om-rules-toggle"
    }));
    html.push(TrumpUi.renderRulesPanel(
      "omRulesPanel",
      "ルール",
      '<ul class="clue-list trump-rules-list">' +
      "<li>最初にペア（同じ数字2枚）を自動で捨てる</li>" +
      "<li>順番に隣の人の手札から1枚引く（ジョーカー＝ババはペアにならない）</li>" +
      "<li>引いたらペアができたら捨てる。手札ゼロになった人は抜け</li>" +
      "<li>最後にババが残った人の負け</li>" +
      "</ul>"
    ));

    return html.join("");
  }
};

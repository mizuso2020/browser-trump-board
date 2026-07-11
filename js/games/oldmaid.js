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
  RANK_LABEL: { 11: "J", 12: "Q", 13: "K", 14: "A" },

  init: function (room) {
    const deck = shuffle(this._createDeck());
    const hands = this._deal(room.players, deck);

    Object.keys(hands).forEach(function (pid) {
      hands[pid] = OldMaidGame._removeAllPairs(hands[pid]);
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

  _createDeck: function () {
    const deck = [{ id: "joker", isJoker: true, suit: null, rank: null }];
    this.SUITS.forEach(function (suit) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({ id: suit + rank, suit: suit, rank: rank, isJoker: false });
      }
    });
    return deck;
  },

  _deal: function (players, deck) {
    const hands = {};
    players.forEach(function (p) { hands[p.id] = []; });
    let i = 0;
    deck.forEach(function (card) {
      hands[players[i % players.length].id].push(card);
      i += 1;
    });
    return hands;
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
    if (faceDown) {
      return '<div class="playing-card card-back">🂠</div>';
    }
    if (card.isJoker) {
      return '<div class="playing-card card-joker">🃏<span class="card-rank">ババ</span></div>';
    }
    const suitClass = "card-suit-" + card.suit;
    const r = this.RANK_LABEL[card.rank] || card.rank;
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
    html.push('<p>ターン：<strong>' + escapeHtml(turnPlayer.name) + '</strong></p></div>');

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
        html.push('<button type="button" class="playing-card card-back" data-action="om-draw" data-index="' + i + '">🂠</button>');
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
          html.push('<div class="playing-card card-back">🂠</div>');
        }
        html.push('</div>');
      }
    });
    html.push('</section>');

    html.push('<section class="card"><h2>ルール</h2><ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">');
    html.push('<li>最初にペア（同じ数字2枚）を自動で捨てる</li>');
    html.push('<li>順番に隣の人の手札から1枚引く（ジョーカー＝ババはペアにならない）</li>');
    html.push('<li>引いたらペアができたら捨てる。手札ゼロになった人は抜け</li>');
    html.push('<li>最後にババが残った人の負け</li>');
    html.push('</ul></section>');

    return html.join("");
  }
};

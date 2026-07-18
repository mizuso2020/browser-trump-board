/**
 * 99（ナインティナイン）
 * 合計が99を超えたら負け。特殊カードあり
 */

const NinetyNineGame = {
  id: "ninetyNine",
  name: "99",
  minPlayers: 2,
  maxPlayers: 6,

  SUITS: ["spade", "heart", "diamond", "club"],
  SUIT_LABEL: { spade: "♠", heart: "♥", diamond: "♦", club: "♣" },
  RANK_LABEL: { 1: "A", 11: "J", 12: "Q", 13: "K" },

  CARD_EFFECTS_HTML:
    '<table class="nn-effects-table">' +
    "<thead><tr><th>カード</th><th>効果</th></tr></thead><tbody>" +
    "<tr><td>A</td><td>+1 または +11</td></tr>" +
    "<tr><td>2</td><td>+2</td></tr>" +
    "<tr><td>3</td><td>+3</td></tr>" +
    "<tr><td>4</td><td>順番を逆回り</td></tr>" +
    "<tr><td>5</td><td>次の人をスキップ</td></tr>" +
    "<tr><td>6</td><td>+6</td></tr>" +
    "<tr><td>7</td><td>+7</td></tr>" +
    "<tr><td>8</td><td>何もしない（パス）または +8</td></tr>" +
    "<tr><td>9</td><td>+0（合計は変わらない）</td></tr>" +
    "<tr><td>10</td><td>+10 または -10</td></tr>" +
    "<tr><td>J / Q</td><td>+10</td></tr>" +
    "<tr><td>K</td><td>合計を99にする</td></tr>" +
    "<tr><td>ジョーカー</td><td>99にする / 好きな加算（下のボタン）</td></tr>" +
    "</tbody></table>",

  init: function (room) {
    const deck = shuffle(PlayingCards.createDeck54());
    const hands = PlayingCards.dealEvenly(room.players, deck);

    Object.keys(hands).forEach(function (pid) {
      PlayingCards.sortHandByRank(hands[pid]);
    });

    room.gameState = {
      hands: hands,
      total: 0,
      turnPlayerId: room.players[0].id,
      reverseOrder: false,
      skipNext: false,
      eliminated: [],
      winnerId: null,
      lastPlay: null,
      pendingChoice: null
    };
    room.phase = "ninety_nine_play";
    return room;
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
    const gs = ctx.room.gameState;
    return ctx.room.phase === "ninety_nine_play" &&
      gs.turnPlayerId === this._actingPlayer(ctx) &&
      gs.eliminated.indexOf(this._actingPlayer(ctx)) < 0 &&
      !gs.pendingChoice;
  },

  _activePlayers: function (room) {
    const eliminated = room.gameState.eliminated;
    return room.players.filter(function (p) {
      return eliminated.indexOf(p.id) < 0;
    });
  },

  _nextActivePlayer: function (room, fromId, steps) {
    const active = this._activePlayers(room);
    if (!active.length) return fromId;
    let idx = active.findIndex(function (p) { return p.id === fromId; });
    if (idx < 0) idx = 0;
    const dir = room.gameState.reverseOrder ? -1 : 1;
    const n = active.length;
    let pos = idx;
    for (let i = 0; i < steps; i++) {
      pos = (pos + dir + n * 10) % n;
    }
    return active[pos].id;
  },

  _advanceTurn: function (room, fromId, extraSteps) {
    const gs = room.gameState;
    let steps = 1 + (extraSteps || 0);
    if (gs.skipNext) {
      gs.skipNext = false;
      steps += 1;
    }
    const active = this._activePlayers(room);
    if (active.length <= 1) {
      gs.winnerId = active[0] ? active[0].id : null;
      room.phase = "ninety_nine_result";
      return;
    }
    gs.turnPlayerId = this._nextActivePlayer(room, fromId, steps);
  },

  _needsChoice: function (card) {
    if (card.isJoker) return "joker";
    if (card.rank === 1) return "ace";
    if (card.rank === 8) return "eight";
    if (card.rank === 10) return "ten";
    return null;
  },

  _removeCard: function (allHands, playerId, cardId, gs) {
    const hand = allHands[playerId] || [];
    const card = hand.find(function (c) { return c.id === cardId; });
    if (!card) return null;
    const newHand = hand.filter(function (c) { return c.id !== cardId; });
    allHands[playerId] = newHand;
    if (gs.hands) gs.hands[playerId] = newHand;
    return card;
  },

  playCard: function (room, playerId, cardId, handsOverride) {
    const gs = room.gameState;
    if (room.phase !== "ninety_nine_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    if (gs.pendingChoice) {
      return { room: room, ok: false, error: "効果を選んでください" };
    }

    const allHands = handsOverride || gs.hands;
    if (!allHands || !allHands[playerId]) {
      return { room: room, ok: false, error: "手札がありません" };
    }

    const card = this._removeCard(allHands, playerId, cardId, gs);
    if (!card) return { room: room, ok: false, error: "カードがありません" };

    const choiceType = this._needsChoice(card);
    if (choiceType) {
      gs.pendingChoice = {
        playerId: playerId,
        cardId: card.id,
        type: choiceType,
        card: card
      };
      return { room: room, ok: true, hand: allHands[playerId], needsChoice: true };
    }

    const effect = this._applyCardEffect(gs, card, null);
    gs.lastPlay = { playerId: playerId, card: card, effect: effect };
    return this._finishTurn(room, playerId, effect, allHands[playerId]);
  },

  applyChoice: function (room, playerId, choice, value) {
    const gs = room.gameState;
    const pending = gs.pendingChoice;
    if (!pending || pending.playerId !== playerId) {
      return { room: room, ok: false, error: "選べる効果がありません" };
    }

    const card = pending.card;
    const effect = this._applyCardEffect(gs, card, { choice: choice, value: value });
    if (effect && effect.error) {
      return { room: room, ok: false, error: effect.error };
    }
    gs.lastPlay = { playerId: playerId, card: card, effect: effect };
    gs.pendingChoice = null;
    return this._finishTurn(room, playerId, effect, (gs.hands && gs.hands[playerId]) || []);
  },

  _applyCardEffect: function (gs, card, options) {
    options = options || {};
    const effect = { type: "add", delta: 0, message: "" };

    if (card.isJoker) {
      if (options.choice === "set99") {
        gs.total = 99;
        effect.type = "set99";
        effect.message = "ジョーカー → 99に設定";
        return effect;
      }
      const delta = parseInt(options.value, 10);
      if (isNaN(delta)) {
        effect.error = "数字を選んでください";
        return effect;
      }
      gs.total += delta;
      effect.type = "add";
      effect.delta = delta;
      effect.message = "ジョーカー → " + (delta >= 0 ? "+" : "") + delta;
      return effect;
    }

    switch (card.rank) {
      case 1:
        if (options.choice === "11") {
          gs.total += 11;
          effect.delta = 11;
          effect.message = "A → +11";
        } else {
          gs.total += 1;
          effect.delta = 1;
          effect.message = "A → +1";
        }
        return effect;
      case 4:
        gs.reverseOrder = !gs.reverseOrder;
        effect.type = "reverse";
        effect.message = "4 → 順番を逆回り";
        return effect;
      case 5:
        gs.skipNext = true;
        effect.type = "skip";
        effect.message = "5 → 次の人をスキップ";
        return effect;
      case 8:
        if (options.choice === "add8") {
          gs.total += 8;
          effect.delta = 8;
          effect.message = "8 → +8";
        } else {
          effect.type = "pass";
          effect.message = "8 → 何もしない";
        }
        return effect;
      case 9:
        effect.type = "freeze";
        effect.message = "9 → 合計は変わらない";
        return effect;
      case 10:
        if (options.choice === "minus") {
          gs.total -= 10;
          effect.delta = -10;
          effect.message = "10 → -10";
        } else {
          gs.total += 10;
          effect.delta = 10;
          effect.message = "10 → +10";
        }
        return effect;
      case 11:
      case 12:
        gs.total += 10;
        effect.delta = 10;
        effect.message = (card.rank === 11 ? "J" : "Q") + " → +10";
        return effect;
      case 13:
        gs.total = 99;
        effect.type = "set99";
        effect.message = "K → 99に設定";
        return effect;
      default:
        gs.total += card.rank;
        effect.delta = card.rank;
        effect.message = card.rank + " → +" + card.rank;
        return effect;
    }
  },

  _finishTurn: function (room, playerId, effect, newHand) {
    if (effect && effect.error) {
      return { room: room, ok: false, error: effect.error };
    }

    const gs = room.gameState;
    let extraSteps = 0;

    if (gs.total > 99) {
      if (gs.eliminated.indexOf(playerId) < 0) {
        gs.eliminated.push(playerId);
      }
      const active = this._activePlayers(room);
      if (active.length <= 1) {
        gs.winnerId = active[0] ? active[0].id : null;
        room.phase = "ninety_nine_result";
        return { room: room, ok: true, hand: newHand, bust: true, winner: gs.winnerId };
      }
      gs.turnPlayerId = this._nextActivePlayer(room, playerId, 1);
      return { room: room, ok: true, hand: newHand, bust: true };
    }

    this._advanceTurn(room, playerId, extraSteps);
    return { room: room, ok: true, hand: newHand };
  },

  _label: function (card) {
    if (card.isJoker) return "🃏";
    const r = this.RANK_LABEL[card.rank] || String(card.rank);
    return this.SUIT_LABEL[card.suit] + r;
  },

  _cardHtml: function (card, selected, selectable) {
    return PlayingCards.cardHtml(card, {
      selected: selected,
      asButton: selectable,
      action: selectable ? "nn-toggle" : undefined,
      data: { card: card.id }
    });
  },

  _renderChoicePanel: function (ctx, pending) {
    const html = [];
    html.push('<section class="card nn-choice-panel"><h2>効果を選んでください</h2>');
    html.push('<p class="note">出したカード：' + this._label(pending.card) + '</p>');

    if (pending.type === "ace") {
      html.push('<div class="btn-row">');
      html.push('<button class="btn btn-primary" data-action="nn-effect" data-choice="1">+1</button>');
      html.push('<button class="btn btn-primary" data-action="nn-effect" data-choice="11">+11</button>');
      html.push('</div>');
    } else if (pending.type === "ten") {
      html.push('<div class="btn-row">');
      html.push('<button class="btn btn-primary" data-action="nn-effect" data-choice="plus">+10</button>');
      html.push('<button class="btn btn-warning" data-action="nn-effect" data-choice="minus">-10</button>');
      html.push('</div>');
    } else if (pending.type === "eight") {
      html.push('<div class="btn-row">');
      html.push('<button class="btn btn-secondary" data-action="nn-effect" data-choice="pass">何もしない</button>');
      html.push('<button class="btn btn-primary" data-action="nn-effect" data-choice="add8">+8</button>');
      html.push('</div>');
    } else if (pending.type === "joker") {
      html.push('<div class="btn-row">');
      html.push('<button class="btn btn-warning" data-action="nn-effect" data-choice="set99">99にする</button>');
      html.push('</div>');
      html.push('<p class="note">または加算する数字：</p><div class="btn-row nn-joker-grid">');
      [-10, -5, 0, 1, 2, 3, 5, 6, 7, 10, 11].forEach(function (v) {
        const label = v > 0 ? "+" + v : String(v);
        html.push('<button class="btn btn-secondary" data-action="nn-effect" data-choice="add" data-value="' + v + '">' + label + '</button>');
      });
      html.push('</div>');
    }
    html.push('</section>');
    return html.join("");
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const actingId = this._actingPlayer(ctx);
    const turnPlayer = room.players.find(function (p) { return p.id === gs.turnPlayerId; });
    const viewHand = this.getHand(ctx, actingId);

    if (room.phase === "ninety_nine_result") {
      const winner = room.players.find(function (p) { return p.id === gs.winnerId; });
      html.push('<div class="phase-banner"><h2>ゲーム終了</h2>');
      if (winner) {
        html.push('<p>勝者：<strong>' + escapeHtml(winner.name) + '</strong></p>');
      }
      if (gs.eliminated.length) {
        html.push('<p class="note">脱落：');
        gs.eliminated.forEach(function (pid, i) {
          const p = room.players.find(function (x) { return x.id === pid; });
          if (p) html.push((i ? "、" : "") + escapeHtml(p.name));
        });
        html.push('</p>');
      }
      html.push('</div>');
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    html.push('<div class="phase-banner"><h2>99</h2>');
    html.push('<p>合計：<strong class="nn-total">' + gs.total + '</strong> / 99');
    if (gs.reverseOrder) html.push('　<span class="note">↩ 逆回り</span>');
    html.push('</p>');
    if (turnPlayer) {
      html.push('<p>ターン：<strong>' + escapeHtml(turnPlayer.name) + '</strong></p>');
    }
    html.push(TrumpUi.renderTurnOrderBlock(room, gs, { eliminated: gs.eliminated }));
    html.push('</div>');

    if (gs.lastPlay && gs.lastPlay.effect) {
      const lp = gs.lastPlay;
      const p = room.players.find(function (x) { return x.id === lp.playerId; });
      html.push('<p class="note">直前：' + escapeHtml(p ? p.name : "—") + ' → ' +
        this._label(lp.card) + '（' + escapeHtml(lp.effect.message || "") + '）</p>');
    }

    if (gs.pendingChoice && gs.pendingChoice.playerId === actingId) {
      html.push(this._renderChoicePanel(ctx, gs.pendingChoice));
    } else if (gs.pendingChoice) {
      const pp = room.players.find(function (p) { return p.id === gs.pendingChoice.playerId; });
      html.push('<section class="card"><p class="note">📱 ' + escapeHtml(pp ? pp.name : "—") + ' さんが効果を選択中…</p></section>');
    }

    if (gs.eliminated.indexOf(actingId) < 0 && !gs.pendingChoice) {
      html.push('<section class="card"><h2>手札 <small>' + viewHand.length + '枚</small></h2>');
      if (this.isMyTurn(ctx)) {
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          html.push(NinetyNineGame._cardHtml(c, NinetyNineGame._selected === c.id, true));
        });
        html.push('</div>');
        html.push('<div class="btn-row" style="margin-top:0.75rem">');
        html.push('<button class="btn btn-primary" data-action="nn-play">出す</button>');
        html.push('</div>');
      } else if (ctx.isOnline && actingId === ctx.me.id) {
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) { html.push(NinetyNineGame._cardHtml(c, false, false)); });
        html.push('</div>');
      } else if (!ctx.isOnline) {
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) { html.push(NinetyNineGame._cardHtml(c, false, false)); });
        html.push('</div>');
      }
      html.push('</section>');
    }

    html.push(TrumpUi.renderFooter({ rulesAction: "nn-rules-toggle" });
    html.push(TrumpUi.renderRulesPanel(
      "nnRulesPanel",
      "ルール・カード効果",
      '<ul class="clue-list trump-rules-list">' +
      "<li>1枚ずつ出して <strong>合計を99以下</strong> に保つ。超えた人が脱落</li>" +
      "<li>最後まで残った人が勝ち</li>" +
      "</ul>" + this.CARD_EFFECTS_HTML
    ));

    return html.join("");
  }
};

NinetyNineGame._selected = null;

NinetyNineGame.toggleCard = function (cardId) {
  NinetyNineGame._selected = NinetyNineGame._selected === cardId ? null : cardId;
  document.querySelectorAll("[data-card]").forEach(function (el) {
    el.classList.toggle("is-selected", el.dataset.card === NinetyNineGame._selected);
  });
};

NinetyNineGame.clearSelected = function () {
  NinetyNineGame._selected = null;
  document.querySelectorAll(".playing-card.is-selected").forEach(function (el) {
    el.classList.remove("is-selected");
  });
};

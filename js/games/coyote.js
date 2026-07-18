/**
 * コヨーテ（Coyote）
 * 自分のカードは見えない。他人のカードだけ見て合計を宣言し、コヨーテで嘘を見破る
 */

const CoyoteGame = {
  id: "coyote",
  name: "コヨーテ",
  minPlayers: 3,
  maxPlayers: 6,

  MAX_CARDS: 4,

  init: function (room) {
    const deck = shuffle(this._createDeck());
    const stacks = {};
    const active = this._activePlayers(room, []);

    active.forEach(function (p) {
      stacks[p.id] = [deck.pop()];
    });

    room.gameState = {
      stacks: stacks,
      deck: deck,
      turnPlayerId: active[0].id,
      lastClaim: null,
      lastResult: null,
      eliminated: [],
      roundStarterId: active[0].id
    };
    room.phase = "coyote_play";
    return room;
  },

  _createDeck: function () {
    const deck = [];
    let id = 0;

    for (let v = -5; v <= 10; v++) {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({ id: "n" + (id++), type: "number", value: v });
      }
    }
    for (let copy = 0; copy < 2; copy++) {
      deck.push({ id: "x2-" + copy, type: "double", value: null });
    }
    return deck;
  },

  _activePlayers: function (room, eliminated) {
    const out = eliminated || [];
    return room.players.filter(function (p) { return !out.includes(p.id); });
  },

  _nextPlayer: function (room, fromId) {
    const active = this._activePlayers(room, room.gameState.eliminated);
    const idx = active.findIndex(function (p) { return p.id === fromId; });
    if (idx < 0) return active[0] ? active[0].id : fromId;
    return active[(idx + 1) % active.length].id;
  },

  _actingPlayer: function (ctx) {
    if (!ctx.isOnline) return ctx.room.gameState.turnPlayerId;
    return ctx.me.id;
  },

  isMyTurn: function (ctx) {
    return ctx.room.gameState.turnPlayerId === this._actingPlayer(ctx) &&
      ctx.room.phase === "coyote_play" &&
      !ctx.room.gameState.eliminated.includes(this._actingPlayer(ctx));
  },

  getStacks: function (ctx) {
    if (!ctx.isOnline) {
      return ctx.room.gameState.stacks || {};
    }
    if (ctx.hostSecrets && ctx.hostSecrets.coyoteStacks) {
      return ctx.hostSecrets.coyoteStacks;
    }
    return ctx.room.gameState.stacks || {};
  },

  calcSum: function (stacks, playerIds) {
    const cards = [];
    playerIds.forEach(function (pid) {
      (stacks[pid] || []).forEach(function (c) { cards.push(c); });
    });

    let sum = 0;
    let maxVal = null;

    cards.forEach(function (c) {
      if (c.type === "number") {
        sum += c.value;
        if (maxVal === null || c.value > maxVal) maxVal = c.value;
      }
    });

    const hasDouble = cards.some(function (c) { return c.type === "double"; });
    if (hasDouble && maxVal !== null) {
      sum += maxVal;
    }

    return sum;
  },

  _cardLabel: function (card) {
    if (card.type === "double") return "×2";
    if (card.value > 0) return "+" + card.value;
    return String(card.value);
  },

  _cardHtml: function (card, hidden) {
    if (hidden) {
      return '<div class="playing-card card-back coyote-card">🂠</div>';
    }
    const cls = card.type === "double"
      ? "coyote-card coyote-double"
      : "coyote-card coyote-number" + (card.value < 0 ? " is-negative" : "");
    return (
      '<div class="playing-card ' + cls + '">' +
      '<span class="coyote-value">' + this._cardLabel(card) + '</span>' +
      '</div>'
    );
  },

  declare: function (room, playerId, value, stacksOverride) {
    const gs = room.gameState;
    if (room.phase !== "coyote_play" || gs.turnPlayerId !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return { room: room, ok: false, error: "数字を入力してください" };
    }

    if (gs.lastClaim && num <= gs.lastClaim.value) {
      return { room: room, ok: false, error: "前の宣言（" + gs.lastClaim.value + "）より大きい数を言ってください" };
    }

    gs.lastClaim = { playerId: playerId, value: num };
    gs.lastResult = null;
    gs.turnPlayerId = this._nextPlayer(room, playerId);
    return { room: room, ok: true };
  },

  callCoyote: function (room, callerId, stacksOverride) {
    const gs = room.gameState;
    if (room.phase !== "coyote_play" || gs.turnPlayerId !== callerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    if (!gs.lastClaim) {
      return { room: room, ok: false, error: "まだ宣言がありません" };
    }

    const stacks = stacksOverride || gs.stacks;
    const active = this._activePlayers(room, gs.eliminated);
    const actualSum = this.calcSum(stacks, active.map(function (p) { return p.id; }));
    const claim = gs.lastClaim;
    const overclaimed = claim.value > actualSum;
    const loserId = overclaimed ? claim.playerId : callerId;

    gs.lastResult = {
      actualSum: actualSum,
      claimValue: claim.value,
      claimantId: claim.playerId,
      coyoteCallerId: callerId,
      loserId: loserId,
      overclaimed: overclaimed
    };

    const drawn = this._drawCard(gs, loserId);
    gs.lastClaim = null;

    if ((stacks[loserId] || []).length >= this.MAX_CARDS) {
      if (!gs.eliminated.includes(loserId)) {
        gs.eliminated.push(loserId);
      }
    }

    const survivors = this._activePlayers(room, gs.eliminated);
    if (survivors.length <= 1) {
      room.phase = "coyote_result";
      gs.winnerId = survivors[0] ? survivors[0].id : null;
      return { room: room, ok: true, drawn: drawn, result: gs.lastResult };
    }

    gs.turnPlayerId = loserId;
    gs.roundStarterId = loserId;
    return { room: room, ok: true, drawn: drawn, result: gs.lastResult };
  },

  _drawCard: function (gs, playerId) {
    if (!gs.deck.length) return null;
    const card = gs.deck.pop();
    if (!gs.stacks[playerId]) gs.stacks[playerId] = [];
    gs.stacks[playerId].push(card);
    return card;
  },

  dismissResult: function (room, playerId) {
    const gs = room.gameState;
    if (!gs.lastResult) return { room: room, ok: false };
    if (gs.turnPlayerId !== playerId && playerId !== gs.lastResult.loserId) {
      return { room: room, ok: false };
    }
    gs.lastResult = null;
    return { room: room, ok: true };
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const stacks = this.getStacks(ctx);
    const html = [];
    const actingId = this._actingPlayer(ctx);
    const active = this._activePlayers(room, gs.eliminated);

    if (room.phase === "coyote_result") {
      const winner = room.players.find(function (p) { return p.id === gs.winnerId; });
      html.push('<div class="phase-banner"><h2>ゲーム終了 🎉</h2>');
      html.push('<p>勝者：<strong>' + escapeHtml(winner ? winner.name : "—") + '</strong></p></div>');
      html.push('<section class="card"><h2>最終手札</h2>');
      active.concat(gs.eliminated.map(function (pid) {
        return room.players.find(function (p) { return p.id === pid; });
      }).filter(Boolean)).forEach(function (p) {
        html.push('<p><strong>' + escapeHtml(p.name) + '</strong></p><div class="hand-row">');
        (stacks[p.id] || []).forEach(function (c) {
          html.push(CoyoteGame._cardHtml(c, false));
        });
        html.push('</div>');
      });
      html.push('</section>');
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    const turnPlayer = room.players.find(function (p) { return p.id === gs.turnPlayerId; });

    html.push('<div class="phase-banner"><h2>コヨーテ</h2>');
    if (gs.lastClaim) {
      const claimer = room.players.find(function (p) { return p.id === gs.lastClaim.playerId; });
      html.push('<p>宣言：<strong class="rank-big">' + gs.lastClaim.value + '</strong>（' + escapeHtml(claimer.name) + '）</p>');
    } else {
      html.push('<p>合計の宣言を始めてください</p>');
    }
    html.push('<p>ターン：<strong>' + escapeHtml(turnPlayer ? turnPlayer.name : "—") + '</strong></p>');
    html.push(TrumpUi.renderTurnOrderBlock(room, gs, { eliminated: gs.eliminated }));
    html.push('</div>');

    if (!ctx.isOnline && room.phase === "coyote_play") {
      html.push('<section class="card"><p class="note">📱 <strong>' + escapeHtml(turnPlayer.name) + '</strong> さんの番。端末を渡してください。</p></section>');
    }

    if (gs.lastResult) {
      const claimant = room.players.find(function (p) { return p.id === gs.lastResult.claimantId; });
      const caller = room.players.find(function (p) { return p.id === gs.lastResult.coyoteCallerId; });
      const loser = room.players.find(function (p) { return p.id === gs.lastResult.loserId; });
      html.push('<section class="card result-box ' + (gs.lastResult.overclaimed ? "success" : "fail") + '">');
      html.push('<h2>コヨーテ！</h2>');
      html.push('<p><strong>' + escapeHtml(caller.name) + '</strong> がコヨーテを宣言</p>');
      html.push('<p>宣言値：<strong>' + gs.lastResult.claimValue + '</strong>　実際の合計：<strong>' + gs.lastResult.actualSum + '</strong></p>');
      html.push('<p>' + (gs.lastResult.overclaimed
        ? escapeHtml(claimant.name) + ' の宣言が高すぎた！'
        : '宣言は正しかった（または低かった）') + '</p>');
      html.push('<p><strong>' + escapeHtml(loser.name) + '</strong> がカードを1枚引きます</p>');
      if (gs.eliminated.includes(gs.lastResult.loserId)) {
        html.push('<p class="note">💀 ' + escapeHtml(loser.name) + ' は ' + this.MAX_CARDS + ' 枚で脱落</p>');
      }
      if (this.isMyTurn(ctx) || (!ctx.isOnline && gs.turnPlayerId === actingId)) {
        html.push('<button class="btn btn-primary" data-action="coyote-continue">次へ</button>');
      }
      html.push('</section>');
    }

    html.push('<section class="card"><h2>場のカード <small>残り山札 ' + (gs.deck ? gs.deck.length : 0) + ' 枚</small></h2>');
    html.push('<p class="note">自分のカードは見えません。他人のカードだけ確認して合計を推測しましょう。</p>');

    room.players.forEach(function (p) {
      const isOut = gs.eliminated.includes(p.id);
      const stack = stacks[p.id] || [];
      const hideOwn = ctx.isOnline ? p.id === ctx.me.id : p.id === actingId;

      html.push('<div class="coyote-player-row' + (isOut ? " is-out" : "") + '">');
      html.push('<div class="coyote-player-name">');
      html.push(escapeHtml(p.name));
      if (p.id === gs.turnPlayerId && !isOut) html.push(' <span class="badge badge-live">番</span>');
      if (isOut) html.push(' <span class="badge badge-soon">脱落</span>');
      html.push(' <small>(' + stack.length + '枚)</small></div>');
      html.push('<div class="hand-row">');
      if (!stack.length) {
        html.push('<span class="note">なし</span>');
      } else {
        stack.forEach(function (c) {
          html.push(CoyoteGame._cardHtml(c, hideOwn));
        });
      }
      html.push('</div></div>');
    });
    html.push('</section>');

    if (room.phase === "coyote_play" && !gs.lastResult && this.isMyTurn(ctx)) {
      html.push('<section class="card"><h2>あなたの番</h2>');

      if (gs.lastClaim) {
        html.push('<button class="btn btn-danger" data-action="coyote-call" style="margin-bottom:0.75rem">コヨーテ！（嘘だと思う）</button>');
        html.push('<p class="note" style="margin-bottom:0.5rem">または、より大きい合計を宣言：</p>');
      } else {
        html.push('<p class="note" style="margin-bottom:0.5rem">全員のカードの合計だと思う数を宣言：</p>');
      }

      html.push('<div class="btn-row">');
      html.push('<input type="number" id="coyoteDeclare" class="coyote-input" placeholder="例: 12" min="-20" max="99">');
      html.push('<button class="btn btn-primary" data-action="coyote-declare">宣言する</button>');
      html.push('</div></section>');
    } else if (room.phase === "coyote_play" && !gs.lastResult && ctx.isOnline) {
      html.push('<section class="card"><p class="note">' + escapeHtml(turnPlayer.name) + ' さんの番です…</p></section>');
    } else if (room.phase === "coyote_play" && !gs.lastResult && !ctx.isOnline) {
      html.push('<section class="card"><p class="note">' + escapeHtml(turnPlayer.name) + ' さんが宣言するかコヨーテを押してください。</p></section>');
    }

    html.push('<section class="card"><h2>ルール（簡易）</h2><ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">');
    html.push('<li>自分のカードは見えない。他人のカードだけ見える</li>');
    html.push('<li>順番に「全員の合計は ○○ だ」と宣言（前より大きい数）</li>');
    html.push('<li>嘘だと思ったら <strong>コヨーテ</strong>。宣言が実際より大きければ宣言者の負け、そうでなければコヨーテした人の負け</li>');
    html.push('<li>負けた人はカードを1枚引く。<strong>' + this.MAX_CARDS + '枚</strong>になったら脱落</li>');
    html.push('<li>×2 カードがあると、一番大きい数字カードがもう1枚分加算される</li>');
    html.push('<li>最後まで残った人が勝ち</li>');
    html.push('</ul></section>');

    return html.join("");
  }
};

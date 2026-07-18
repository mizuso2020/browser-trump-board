/**
 * 大富豪（Daifugo）
 * 54枚（ジョーカー2枚）/ 4〜8人
 * ローカルルール: 革命・8切り・スペ3返し・スート縛り・5スキップ・7渡し・10捨て・9リバース・11バック・都落ち
 */

const DaifugoGame = {
  id: "daifugo",
  name: "大富豪",
  minPlayers: 4,
  maxPlayers: 8,

  SUITS: ["spade", "heart", "diamond", "club"],
  SUIT_LABEL: { spade: "♠", heart: "♥", diamond: "♦", club: "♣" },
  SUIT_POWER: { spade: 1, heart: 2, diamond: 3, club: 4 },
  RANK_LABEL: { 11: "J", 12: "Q", 13: "K" },
  NORMAL_POWER: { 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 1: 14, 2: 15 },

  RANK_TITLES: {
    4: ["大富豪", "富豪", "貧民", "大貧民"],
    5: ["大富豪", "富豪", "平民", "貧民", "大貧民"],
    6: ["大富豪", "富豪", "平民", "平民", "貧民", "大貧民"],
    7: ["大富豪", "富豪", "平民", "平民", "平民", "貧民", "大貧民"],
    8: ["大富豪", "富豪", "平民", "平民", "平民", "平民", "貧民", "大貧民"]
  },

  DEFAULT_ROUNDS: 5,

  LOCAL_RULES: {
    revolution: true,
    straightRevolution: true,
    elevenBack: true,
    elevenBackWild: true,
    eightCut: true,
    sevenPass: true,
    tenDiscard: true,
    nineReverse: true,
    fiveJump: true
  },

  _ruleFlash: null,
  _ruleFlashSeenId: null,
  _ruleFlashTimer: null,
  _autoPassTimer: null,
  _autoPassKey: null,
  _autoPassNotice: false,
  _autoPassNoticeTimer: null,
  AUTO_PASS_MS: 5000,

  /** 手札並び: 3→13→1→2、ジョーカーは末尾 */
  sortHand: function (hand) {
    if (!hand || !hand.length) return hand;
    const self = this;
    hand.sort(function (a, b) {
      if (a.isJoker && b.isJoker) {
        const order = { red: 0, black: 1 };
        return (order[a.jokerColor] || 0) - (order[b.jokerColor] || 0);
      }
      if (a.isJoker) return 1;
      if (b.isJoker) return -1;
      const pa = self.NORMAL_POWER[a.rank] || 0;
      const pb = self.NORMAL_POWER[b.rank] || 0;
      if (pa !== pb) return pa - pb;
      return (self.SUIT_POWER[a.suit] || 0) - (self.SUIT_POWER[b.suit] || 0);
    });
    return hand;
  },

  hasLegalPlay: function (hand, table, revolution) {
    if (!table) return true;
    if (!hand || !hand.length) return false;
    const normTable = this._normalizeTable(table);
    const need = normTable.length || (normTable.cards && normTable.cards.length) || 0;
    if (!need || hand.length < need) return false;

    if (need === 1) {
      for (let i = 0; i < hand.length; i++) {
        const play = this.analyzePlay([hand[i]]);
        if (play && this.canBeat(normTable, play, revolution)) return true;
      }
      return false;
    }

    const self = this;
    let found = false;
    function dfs(start, chosen) {
      if (found) return;
      if (chosen.length === need) {
        const play = self.analyzePlay(chosen);
        if (play && self.canBeat(normTable, play, revolution)) found = true;
        return;
      }
      for (let i = start; i <= hand.length - (need - chosen.length); i++) {
        chosen.push(hand[i]);
        dfs(i + 1, chosen);
        chosen.pop();
        if (found) return;
      }
    }
    dfs(0, []);
    return found;
  },

  _normalizeTable: function (table) {
    if (!table) return null;
    const cards = table.cards || [];
    const hasJoker = !!(table.hasJoker || cards.some(function (c) { return c.isJoker; }));
    return {
      type: table.type,
      cards: cards,
      power: table.power,
      suit: table.suit || null,
      length: table.length || cards.length,
      hasJoker: hasJoker,
      playerId: table.playerId
    };
  },

  cancelAutoPass: function () {
    if (this._autoPassTimer) {
      clearTimeout(this._autoPassTimer);
      this._autoPassTimer = null;
    }
    this._autoPassKey = null;
  },

  showAutoPassNotice: function () {
    const self = this;
    this._autoPassNotice = true;
    if (this._autoPassNoticeTimer) clearTimeout(this._autoPassNoticeTimer);
    this._autoPassNoticeTimer = setTimeout(function () {
      self._autoPassNotice = false;
      self._autoPassNoticeTimer = null;
      const el = document.querySelector(".daifugo-auto-pass-done");
      if (el) el.remove();
    }, 4000);
    if (typeof showToast === "function") {
      showToast("場のカードより強いカードがないためスキップしました");
    }
  },

  shouldAutoPass: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    if (!gs || room.phase !== "daifugo_play") return false;
    if (gs.pending) return false;
    if (!gs.table) return false;
    if (!this.isMyTurn(ctx)) return false;
    const actingId = this._actingPlayer(ctx);
    if (!actingId || gs.finished.indexOf(actingId) >= 0) return false;
    const hand = this.getHand(ctx, actingId);
    if (!hand || !hand.length) return true;
    return !this.hasLegalPlay(hand, gs.table, this._isRevolutionActive(gs));
  },

  _autoPassStateKey: function (gs) {
    const table = gs.table || {};
    const cardsKey = (table.cards || []).map(function (c) { return c.id || (c.suit + c.rank); }).join(",");
    return [
      gs.turnPlayerId,
      table.playerId || "",
      table.type || "",
      table.power || "",
      table.length || "",
      cardsKey,
      (gs.passes || []).join(",")
    ].join("|");
  },

  scheduleAutoPassIfNeeded: function (ctx) {
    if (!this.shouldAutoPass(ctx)) {
      this.cancelAutoPass();
      return;
    }
    const gs = ctx.room.gameState;
    const key = this._autoPassStateKey(gs);
    if (this._autoPassKey === key && this._autoPassTimer) return;

    this.cancelAutoPass();
    this._autoPassKey = key;
    const self = this;
    const delay = this.AUTO_PASS_MS || 5000;
    this._autoPassTimer = setTimeout(function () {
      self._autoPassTimer = null;
      if (typeof window.__daifugoRunAutoPass === "function") {
        window.__daifugoRunAutoPass(key);
        return;
      }
      const btn = document.querySelector('[data-action="daifugo-pass"]');
      if (btn && !btn.disabled) {
        self.showAutoPassNotice();
        btn.click();
      }
    }, delay);
  },

  _labelsFromEffects: function (effects, play, gs) {
    const labels = [];
    if (!effects) return labels;
    const rules = (gs && gs.localRules) || this.LOCAL_RULES;
    if (effects.revolution) {
      labels.push(play && play.type === "straight" ? "階段革命" : "革命");
    }
    if (effects.fieldRevolution) {
      const wild = !!(rules.elevenBackWild && play && this._cardsContainRank(play.cards, 11));
      labels.push(wild ? "激Jバック" : "Jバック");
    }
    if (effects.eightCut) labels.push("8切り");
    if (effects.reverse) labels.push("9リバース");
    if (effects.skip) labels.push("5飛び");
    if (effects.sevenPass) labels.push("7渡し");
    if (effects.tenDiscard) labels.push("10捨て");
    return labels;
  },

  _armRuleFlash: function (gs, effects, play) {
    const labels = this._labelsFromEffects(effects, play, gs);
    if (!labels.length) return;
    const prevId = (gs.ruleFlash && gs.ruleFlash.id) || 0;
    gs.ruleFlash = { id: prevId + 1, labels: labels };
  },

  _syncRuleFlash: function (gs) {
    const flash = gs && gs.ruleFlash;
    if (!flash || !flash.labels || !flash.labels.length) return;
    if (flash.id === this._ruleFlashSeenId) return;
    this._ruleFlashSeenId = flash.id;
    this._ruleFlash = flash.labels.slice();
    this._scheduleRuleFlashClear();
  },

  _scheduleRuleFlashClear: function () {
    const self = this;
    if (this._ruleFlashTimer) clearTimeout(this._ruleFlashTimer);
    this._ruleFlashTimer = setTimeout(function () {
      self._ruleFlash = null;
      self._ruleFlashTimer = null;
      const el = document.querySelector(".daifugo-rule-flash");
      if (el) el.remove();
    }, 1600);
  },

  _renderRuleFlash: function () {
    if (!this._ruleFlash || !this._ruleFlash.length) return "";
    let html = '<div class="daifugo-rule-flash" aria-live="assertive">';
    html += '<div class="daifugo-rule-flash-inner">';
    this._ruleFlash.forEach(function (label) {
      html += '<span class="daifugo-rule-flash-text">' + escapeHtml(label) + "</span>";
    });
    html += "</div></div>";
    return html;
  },

  init: function (room, options) {
    options = options || {};
    const prev = room.gameState || {};
    const round = options.round || 1;
    const maxRounds = options.maxRounds || prev.maxRounds || this.DEFAULT_ROUNDS;
    const lastRanks = options.lastRanks || null;

    const deck = shuffle(PlayingCards.createDeck54());
    const hands = PlayingCards.dealEvenly(room.players, deck);
    const starter = this._findStarter(room.players, hands, round, lastRanks);

    Object.keys(hands).forEach(function (pid) {
      DaifugoGame.sortHand(hands[pid]);
    });

    room.gameState = {
      hands: hands,
      turnPlayerId: starter,
      table: null,
      passes: [],
      finished: [],
      revolution: false,
      fieldRevolution: false,
      reverseOrder: false,
      lastPlayerId: null,
      round: round,
      maxRounds: maxRounds,
      roundHistory: options.roundHistory || [],
      lastRanks: lastRanks,
      exchange: null,
      pending: null,
      ruleFlash: null,
      localRules: Object.assign({}, this.LOCAL_RULES)
    };
    this._ruleFlash = null;
    this._ruleFlashSeenId = null;
    if (this._ruleFlashTimer) {
      clearTimeout(this._ruleFlashTimer);
      this._ruleFlashTimer = null;
    }
    this.cancelAutoPass();
    room.phase = "daifugo_play";
    return room;
  },

  _findStarter: function (players, hands, round, lastRanks) {
    if (round > 1 && lastRanks && lastRanks.daihinmin) {
      return lastRanks.daihinmin;
    }
    for (let i = 0; i < players.length; i++) {
      const pid = players[i].id;
      if (hands[pid].some(function (c) { return c.suit === "diamond" && c.rank === 3; })) {
        return pid;
      }
    }
    return players[0].id;
  },

  _rankPower: function (rank, revolution, isJoker) {
    if (isJoker) return revolution ? 3 : 100;
    const normal = this.NORMAL_POWER[rank];
    if (!normal) return 0;
    return revolution ? (18 - normal) : normal;
  },

  _compareCards: function (a, b, revolution) {
    const pa = this._rankPower(a.rank, revolution, a.isJoker);
    const pb = this._rankPower(b.rank, revolution, b.isJoker);
    if (pa !== pb) return pa - pb;
    const sa = a.isJoker ? 5 : this.SUIT_POWER[a.suit] || 0;
    const sb = b.isJoker ? 5 : this.SUIT_POWER[b.suit] || 0;
    return sa - sb;
  },

  _label: function (card) {
    if (card.isJoker) return "🃏";
    const r = this.RANK_LABEL[card.rank] || String(card.rank);
    return this.SUIT_LABEL[card.suit] + r;
  },

  _cardsContainRank: function (cards, rank) {
    return cards.some(function (c) { return c.rank === rank; });
  },

  _cardsContainSuit: function (cards, suit) {
    return cards.some(function (c) { return !c.isJoker && c.suit === suit; });
  },

  _allSameSuit: function (cards) {
    const suits = cards.filter(function (c) { return !c.isJoker; }).map(function (c) { return c.suit; });
    if (!suits.length) return false;
    return suits.every(function (s) { return s === suits[0]; });
  },

  _tableSuit: function (table) {
    if (!table || !table.cards) return null;
    const normals = table.cards.filter(function (c) { return !c.isJoker; });
    if (!normals.length) return null;
    const suit = normals[0].suit;
    return normals.every(function (c) { return c.suit === suit; }) ? suit : null;
  },

  analyzePlay: function (cards) {
    if (!cards || !cards.length) return null;
    const jokers = cards.filter(function (c) { return c.isJoker; });
    if (jokers.length > 1) return null;
    if (cards.length === 1 && jokers.length === 1) {
      return { type: "single", cards: cards, power: 2, suit: null, length: 1, hasJoker: true };
    }
    if (!jokers.length) return this._analyzeFixed(cards);
    return this._analyzeWithJoker(cards, jokers[0]);
  },

  _analyzeFixed: function (cards) {
    const sorted = cards.slice().sort(function (a, b) { return a.rank - b.rank; });
    const len = sorted.length;
    const ranks = sorted.map(function (c) { return c.rank; });

    if (len === 1) {
      return { type: "single", cards: sorted, power: sorted[0].rank, suit: sorted[0].suit, length: 1 };
    }
    if (len === 2 && ranks[0] === ranks[1]) {
      return { type: "pair", cards: sorted, power: ranks[0], length: 2 };
    }
    if (len === 3 && ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
      return { type: "triple", cards: sorted, power: ranks[0], length: 3 };
    }
    if (len >= 4 && ranks.every(function (r) { return r === ranks[0]; })) {
      return { type: "four", cards: sorted, power: ranks[0], length: len };
    }
    if (len >= 3 && ranks[0] >= 3 && ranks[ranks.length - 1] <= 13) {
      let consecutive = true;
      for (let i = 1; i < ranks.length; i++) {
        if (ranks[i] !== ranks[i - 1] + 1) consecutive = false;
      }
      if (consecutive) {
        return { type: "straight", cards: sorted, power: ranks[ranks.length - 1], length: len };
      }
    }
    return null;
  },

  _analyzeWithJoker: function (cards, joker) {
    const normals = cards.filter(function (c) { return !c.isJoker; });
    for (let rank = 1; rank <= 13; rank++) {
      const fake = { id: "wild", suit: normals[0] ? normals[0].suit : "spade", rank: rank, isJoker: false };
      const attempt = this._analyzeFixed(normals.concat([fake]));
      if (attempt) {
        attempt.cards = cards;
        attempt.hasJoker = true;
        if (attempt.type === "single") {
          attempt.power = rank;
          attempt.suit = fake.suit;
        }
        return attempt;
      }
    }
    return null;
  },

  _playPower: function (play, revolution) {
    if (play.type === "single") {
      return {
        main: play.hasJoker
          ? this._rankPower(0, revolution, true)
          : this._rankPower(play.power, revolution, false),
        sub: play.suit ? this.SUIT_POWER[play.suit] : (play.hasJoker ? 5 : 0)
      };
    }
    return { main: this._rankPower(play.power, revolution, false), sub: 0 };
  },

  _countRank: function (cards, rank) {
    return cards.filter(function (c) { return !c.isJoker && c.rank === rank; }).length;
  },

  _isRevolutionActive: function (gs) {
    return !!(gs.revolution || gs.fieldRevolution);
  },

  canBeat: function (table, play, revolution) {
    if (!table) return true;
    if (play.type !== table.type) return false;
    if ((play.length || play.cards.length) !== (table.length || table.cards.length)) return false;

    const a = this._playPower(play, revolution);
    const b = this._playPower(table, revolution);
    if (a.main !== b.main) return a.main > b.main;
    if (play.type === "single") return a.sub > b.sub;
    return false;
  },

  _playMatchesSuitLock: function () {
    return true;
  },

  getHand: function (ctx, playerId) {
    if (!ctx.isOnline) {
      return ctx.room.gameState.hands[playerId] || [];
    }
    return Secrets.getTrumpHand(ctx, playerId);
  },

  getActivePlayers: function (room) {
    const finished = room.gameState.finished;
    return room.players.filter(function (p) { return finished.indexOf(p.id) < 0; });
  },

  isMyTurn: function (ctx) {
    const gs = ctx.room.gameState;
    const pid = this._actingPlayer(ctx);
    if (ctx.room.phase === "daifugo_exchange") {
      return gs.exchange && gs.exchange.fromId === pid;
    }
    if (ctx.room.phase !== "daifugo_play") return false;
    if (gs.pending && gs.pending.type === "ten_discard") {
      return gs.pending.playerId === pid;
    }
    if (gs.pending && gs.pending.type === "seven_pass") {
      if (gs.pending.step === "choose_target") return gs.pending.playerId === pid;
      if (gs.pending.step === "give") return gs.pending.playerId === pid;
      if (gs.pending.step === "return") return gs.pending.fromId === pid;
    }
    return gs.turnPlayerId === pid && gs.finished.indexOf(pid) < 0;
  },

  _actingPlayer: function (ctx) {
    if (!ctx.isOnline) {
      const gs = ctx.room.gameState;
      if (ctx.room.phase === "daifugo_exchange") {
        const step = this.getCurrentExchangeStep(ctx.room);
        if (step) return step.fromId;
      }
      if (gs.pending && gs.pending.type === "seven_pass") {
        if (gs.pending.step === "choose_target") return gs.pending.playerId;
        if (gs.pending.step === "give") return gs.pending.playerId;
        if (gs.pending.step === "return") return gs.pending.fromId;
      }
      if (gs.pending && gs.pending.type === "ten_discard") return gs.pending.playerId;
      return gs.turnPlayerId;
    }
    return ctx.me.id;
  },

  _clearTable: function (gs) {
    gs.table = null;
    gs.passes = [];
    gs.fieldRevolution = false;
  },

  _shouldPermanentRevolution: function (rules, play) {
    if (rules.revolution && play.type === "four") return true;
    if (rules.straightRevolution && play.type === "straight" && play.length >= 4 && this._allSameSuit(play.cards)) {
      return true;
    }
    return false;
  },

  _shouldFieldRevolution: function (rules, play) {
    if (rules.elevenBackWild && this._cardsContainRank(play.cards, 11)) return true;
    if (rules.elevenBack && play.type === "single" && play.power === 11) return true;
    return false;
  },

  _applyLocalEffects: function (room, playerId, play) {
    const gs = room.gameState;
    const cards = play.cards;
    const rules = gs.localRules;
    const result = {
      eightCut: false,
      revolution: false,
      fieldRevolution: false,
      skip: 0,
      reverse: false,
      sevenPass: false,
      tenDiscard: false,
      sevenCount: 0
    };

    if (this._shouldPermanentRevolution(rules, play)) {
      gs.revolution = !gs.revolution;
      result.revolution = true;
    }
    if (this._shouldFieldRevolution(rules, play)) {
      gs.fieldRevolution = true;
      result.fieldRevolution = true;
    }
    if (rules.eightCut && this._cardsContainRank(cards, 8)) {
      result.eightCut = true;
    }
    if (rules.fiveJump && this._cardsContainRank(cards, 5)) {
      result.skip = 1;
    }
    if (rules.nineReverse && this._cardsContainRank(cards, 9)) {
      gs.reverseOrder = !gs.reverseOrder;
      result.reverse = true;
    }
    if (rules.sevenPass) {
      result.sevenCount = this._countRank(cards, 7);
      if (result.sevenCount > 0) result.sevenPass = true;
    }
    if (rules.tenDiscard) {
      const tenCount = this._countRank(cards, 10);
      if (tenCount > 0) {
        result.tenDiscard = true;
        result.tenCount = tenCount;
      }
    }

    return result;
  },

  playCards: function (room, playerId, cardIds, handsOverride) {
    const gs = room.gameState;
    if (gs.turnPlayerId !== playerId || gs.finished.indexOf(playerId) >= 0) {
      return { room: room, ok: false };
    }

    const allHands = handsOverride || gs.hands;
    if (!allHands) return { room: room, ok: false };
    const hand = allHands[playerId];
    if (!hand) return { room: room, ok: false };

    const selected = hand.filter(function (c) { return cardIds.indexOf(c.id) >= 0; });
    const play = this.analyzePlay(selected);
    if (!play) return { room: room, ok: false, error: "出せる組み合わせではありません" };
    const revolution = this._isRevolutionActive(gs);
    if (gs.table && !this.canBeat(gs.table, play, revolution)) {
      return { room: room, ok: false, error: "場のカードより強くありません" };
    }

    const newHand = hand.filter(function (c) { return cardIds.indexOf(c.id) < 0; });
    this.sortHand(newHand);
    allHands[playerId] = newHand;
    if (gs.hands) gs.hands[playerId] = newHand;

    gs.table = {
      type: play.type,
      cards: play.cards,
      power: play.power,
      suit: play.suit || null,
      length: play.length || play.cards.length,
      playerId: playerId,
      hasJoker: !!play.hasJoker
    };
    gs.passes = [];
    gs.lastPlayerId = playerId;

    const effects = this._applyLocalEffects(room, playerId, play);
    this._armRuleFlash(gs, effects, play);
    let finishedNow = false;

    if (newHand.length === 0) {
      gs.finished.push(playerId);
      finishedNow = true;
    }

    if (effects.eightCut) {
      this._clearTable(gs);
      gs.turnPlayerId = playerId;
      return {
        room: room,
        ok: true,
        hand: newHand,
        effects: effects,
        finishedNow: finishedNow
      };
    }

    if (this._checkRoundEnd(room)) {
      return this._finishRound(room, { ok: true, hand: newHand, effects: effects });
    }

    if (effects.tenDiscard && newHand.length > 0) {
      gs.pending = {
        type: "ten_discard",
        playerId: playerId,
        count: effects.tenCount,
        max: newHand.length
      };
      gs.turnPlayerId = playerId;
      return { room: room, ok: true, hand: newHand, effects: effects, pendingTen: true };
    }

    if (effects.sevenPass && effects.sevenCount > 0) {
      gs.pending = {
        type: "seven_pass",
        step: "choose_target",
        playerId: playerId,
        count: effects.sevenCount,
        targetId: null
      };
      gs.turnPlayerId = playerId;
      return { room: room, ok: true, hand: newHand, effects: effects, pendingSeven: true };
    }

    const step = 1 + (effects.skip || 0);
    gs.turnPlayerId = this._nextPlayer(room, playerId, step);

    return { room: room, ok: true, hand: newHand, effects: effects, finishedNow: finishedNow };
  },

  discardTenExtra: function (room, playerId, cardIds, handsOverride) {
    const gs = room.gameState;
    const pending = gs.pending;
    if (!pending || pending.type !== "ten_discard" || pending.playerId !== playerId) {
      return { room: room, ok: false };
    }
    if (!cardIds || !cardIds.length || cardIds.length > pending.count) {
      return { room: room, ok: false, error: "捨てる枚数が不正です" };
    }

    const allHands = handsOverride || gs.hands;
    const hand = allHands[playerId] || [];
    const newHand = hand.filter(function (c) { return cardIds.indexOf(c.id) < 0; });
    this.sortHand(newHand);
    if (hand.length - newHand.length !== cardIds.length) {
      return { room: room, ok: false, error: "カードを選んでください" };
    }

    allHands[playerId] = newHand;
    if (gs.hands) gs.hands[playerId] = newHand;
    gs.pending = null;

    if (newHand.length === 0) {
      gs.finished.push(playerId);
      if (this._checkRoundEnd(room)) return this._finishRound(room, { ok: true, hand: newHand });
    }

    gs.turnPlayerId = this._nextPlayer(room, playerId, 1);
    return { room: room, ok: true, hand: newHand };
  },

  skipTenDiscard: function (room, playerId) {
    const gs = room.gameState;
    if (!gs.pending || gs.pending.type !== "ten_discard" || gs.pending.playerId !== playerId) {
      return { room: room, ok: false };
    }
    gs.pending = null;
    gs.turnPlayerId = this._nextPlayer(room, playerId, 1);
    return { room: room, ok: true };
  },

  _transferCards: function (allHands, fromId, toId, cardIds) {
    const fromHand = allHands[fromId] || [];
    const moving = fromHand.filter(function (c) { return cardIds.indexOf(c.id) >= 0; });
    if (moving.length !== cardIds.length) return null;
    const newFrom = fromHand.filter(function (c) { return cardIds.indexOf(c.id) < 0; });
    const newTo = (allHands[toId] || []).concat(moving);
    this.sortHand(newFrom);
    this.sortHand(newTo);
    allHands[fromId] = newFrom;
    allHands[toId] = newTo;
    return { fromHand: newFrom, toHand: newTo };
  },

  chooseSevenTarget: function (room, playerId, targetId) {
    const gs = room.gameState;
    const pending = gs.pending;
    if (!pending || pending.type !== "seven_pass" || pending.step !== "choose_target") {
      return { room: room, ok: false };
    }
    if (pending.playerId !== playerId || !targetId || targetId === playerId) {
      return { room: room, ok: false, error: "渡す相手を選んでください" };
    }
    if (gs.finished.indexOf(targetId) >= 0) {
      return { room: room, ok: false, error: "そのプレイヤーには渡せません" };
    }
    pending.targetId = targetId;
    pending.step = "give";
    return { room: room, ok: true };
  },

  submitSevenGive: function (room, playerId, cardIds, handsOverride) {
    const gs = room.gameState;
    const pending = gs.pending;
    if (!pending || pending.type !== "seven_pass" || pending.step !== "give") {
      return { room: room, ok: false };
    }
    if (pending.playerId !== playerId || !pending.targetId) return { room: room, ok: false };
    if (!cardIds || cardIds.length !== pending.count) {
      return { room: room, ok: false, error: pending.count + "枚選んでください" };
    }

    const allHands = handsOverride || gs.hands;
    const moved = this._transferCards(allHands, playerId, pending.targetId, cardIds);
    if (!moved) return { room: room, ok: false, error: "カードを選んでください" };
    if (gs.hands) {
      gs.hands[playerId] = moved.fromHand;
      gs.hands[pending.targetId] = moved.toHand;
    }

    pending.step = "return";
    pending.fromId = pending.targetId;
    pending.toId = playerId;
    gs.turnPlayerId = pending.fromId;
    return {
      room: room,
      ok: true,
      hand: moved.fromHand,
      toHand: moved.toHand,
      targetId: pending.targetId
    };
  },

  submitSevenReturn: function (room, fromId, cardIds, handsOverride) {
    const gs = room.gameState;
    const pending = gs.pending;
    if (!pending || pending.type !== "seven_pass" || pending.step !== "return") {
      return { room: room, ok: false };
    }
    if (pending.fromId !== fromId || !pending.toId) return { room: room, ok: false };
    if (!cardIds || cardIds.length !== pending.count) {
      return { room: room, ok: false, error: pending.count + "枚選んでください" };
    }

    const allHands = handsOverride || gs.hands;
    const moved = this._transferCards(allHands, fromId, pending.toId, cardIds);
    if (!moved) return { room: room, ok: false, error: "カードを選んでください" };
    if (gs.hands) {
      gs.hands[fromId] = moved.fromHand;
      gs.hands[pending.toId] = moved.toHand;
    }

    const resumeFrom = pending.toId;
    gs.pending = null;
    gs.turnPlayerId = this._nextPlayer(room, resumeFrom, 1);
    return {
      room: room,
      ok: true,
      fromHand: moved.fromHand,
      toHand: moved.toHand
    };
  },

  pass: function (room, playerId) {
    const gs = room.gameState;
    if (gs.turnPlayerId !== playerId || gs.finished.indexOf(playerId) >= 0) {
      return { room: room, ok: false };
    }
    if (!gs.table) return { room: room, ok: false, error: "場が空のときはパスできません" };
    if (gs.passes.indexOf(playerId) >= 0) return { room: room, ok: false };

    gs.passes.push(playerId);
    const active = this.getActivePlayers(room).map(function (p) { return p.id; });
    const others = active.filter(function (id) { return id !== gs.lastPlayerId; });

    if (gs.passes.length >= others.length) {
      this._clearTable(gs);
      gs.turnPlayerId = gs.lastPlayerId;
    } else {
      gs.turnPlayerId = this._nextPlayer(room, playerId, 1);
    }

    return { room: room, ok: true };
  },

  _nextPlayer: function (room, fromId, step) {
    step = step || 1;
    const players = room.players;
    const finished = room.gameState.finished;
    const reverse = room.gameState.reverseOrder;
    let idx = players.findIndex(function (p) { return p.id === fromId; });
    const dir = reverse ? -1 : 1;

    for (let i = 1; i <= players.length * step; i++) {
      const next = players[(idx + dir * i + players.length * 100) % players.length];
      if (finished.indexOf(next.id) < 0) {
        step -= 1;
        if (step <= 0) return next.id;
      }
    }
    return fromId;
  },

  _prevPlayer: function (room, fromId) {
    const players = room.players;
    const finished = room.gameState.finished;
    const reverse = room.gameState.reverseOrder;
    let idx = players.findIndex(function (p) { return p.id === fromId; });
    const dir = reverse ? 1 : -1;

    for (let i = 1; i <= players.length; i++) {
      const next = players[(idx + dir * i + players.length * 100) % players.length];
      if (finished.indexOf(next.id) < 0) return next.id;
    }
    return fromId;
  },

  _checkRoundEnd: function (room) {
    return this.getActivePlayers(room).length <= 1;
  },

  _applyTochiReorder: function (room) {
    const gs = room.gameState;
    if (!gs.tochiFlags.length) return;
    const tochiId = gs.tochiFlags[gs.tochiFlags.length - 1];
    const idx = gs.finished.indexOf(tochiId);
    if (idx < 0) return;
    gs.finished.splice(idx, 1);
    gs.finished.push(tochiId);
  },

  _buildRanks: function (room) {
    const gs = room.gameState;
    const titles = this.RANK_TITLES[room.players.length] || [];
    const ranks = {
      order: gs.finished.slice(),
      titles: {},
      daifugo: null,
      fugo: null,
      hinmin: null,
      daihinmin: null
    };
    gs.finished.forEach(function (pid, i) {
      ranks.titles[pid] = titles[i] || (i + 1) + "位";
      if (titles[i] === "大富豪") ranks.daifugo = pid;
      if (titles[i] === "富豪") ranks.fugo = pid;
      if (titles[i] === "貧民") ranks.hinmin = pid;
      if (titles[i] === "大貧民") ranks.daihinmin = pid;
    });
    return ranks;
  },

  _finishRound: function (room, baseResult) {
    const gs = room.gameState;
    const active = this.getActivePlayers(room);
    active.forEach(function (p) {
      if (gs.finished.indexOf(p.id) < 0) gs.finished.push(p.id);
    });

    const ranks = this._buildRanks(room);
    gs.roundHistory.push({ round: gs.round, ranks: ranks });
    gs.lastRanks = ranks;

    if (gs.round >= gs.maxRounds) {
      room.phase = "daifugo_result";
      return Object.assign({ room: room }, baseResult, { roundEnd: true, gameEnd: true, ranks: ranks });
    }

    room.phase = "daifugo_exchange";
    gs.exchange = this._buildExchange(room, ranks);
    return Object.assign({ room: room }, baseResult, { roundEnd: true, ranks: ranks });
  },

  _buildExchange: function (room, ranks) {
    const steps = [];
    if (ranks.daihinmin && ranks.daifugo) {
      steps.push({ fromId: ranks.daihinmin, toId: ranks.daifugo, count: 2, label: "大貧民→大富豪（2枚）" });
    }
    if (ranks.hinmin && ranks.fugo) {
      steps.push({ fromId: ranks.hinmin, toId: ranks.fugo, count: 1, label: "貧民→富豪（1枚）" });
    }
    if (ranks.fugo && ranks.hinmin) {
      steps.push({ fromId: ranks.fugo, toId: ranks.hinmin, count: 1, label: "富豪→貧民（1枚）" });
    }
    return { steps: steps, index: 0, selected: [] };
  },

  getCurrentExchangeStep: function (room) {
    const ex = room.gameState.exchange;
    if (!ex || !ex.steps.length) return null;
    return ex.steps[ex.index] || null;
  },

  submitExchangeCards: function (room, playerId, cardIds, handsOverride) {
    const gs = room.gameState;
    const step = this.getCurrentExchangeStep(room);
    if (!step || step.fromId !== playerId) return { room: room, ok: false };

    const allHands = handsOverride || gs.hands;
    const hand = allHands[playerId] || [];
    if (cardIds.length !== step.count) {
      return { room: room, ok: false, error: step.count + "枚選んでください" };
    }

    const selected = hand.filter(function (c) { return cardIds.indexOf(c.id) >= 0; });
    if (selected.length !== step.count) {
      return { room: room, ok: false, error: "カードを選んでください" };
    }

    const fromHand = hand.filter(function (c) { return cardIds.indexOf(c.id) < 0; });
    const toHand = (allHands[step.toId] || []).concat(selected);
    allHands[playerId] = fromHand;
    allHands[step.toId] = toHand;
    if (gs.hands) {
      gs.hands[playerId] = fromHand;
      gs.hands[step.toId] = toHand;
    }

    gs.exchange.index += 1;
    if (gs.exchange.index >= gs.exchange.steps.length) {
      gs.exchange = null;
      return { room: room, ok: true, hand: fromHand, exchangeDone: true };
    }

    return { room: room, ok: true, hand: fromHand };
  },

  startNextRound: function (room) {
    const gs = room.gameState;
    return this.init(room, {
      round: gs.round + 1,
      maxRounds: gs.maxRounds,
      roundHistory: gs.roundHistory,
      lastRanks: gs.lastRanks
    });
  },

  _applyExchangeAuto: function (room, hands) {
    const gs = room.gameState;
    const ex = gs.exchange;
    if (!ex) return hands;

    while (ex.index < ex.steps.length) {
      const step = ex.steps[ex.index];
      const fromHand = (hands[step.fromId] || []).slice();
      fromHand.sort(function (a, b) {
        return DaifugoGame._compareCards(b, a, false);
      });
      const picked = fromHand.slice(0, step.count);
      const remain = fromHand.slice(step.count);
      hands[step.fromId] = remain;
      hands[step.toId] = (hands[step.toId] || []).concat(picked);
      DaifugoGame.sortHand(hands[step.fromId]);
      DaifugoGame.sortHand(hands[step.toId]);
      ex.index += 1;
    }
    gs.exchange = null;
    return hands;
  },

  _cardHtml: function (card, selected, selectable) {
    return PlayingCards.cardHtml(card, {
      selected: selected,
      disabled: !selectable,
      action: "daifugo-toggle",
      data: { card: card.id }
    });
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    this._syncRuleFlash(gs);
    const html = [];

    if (room.phase === "daifugo_result") {
      this.cancelAutoPass();
      html.push('<div class="phase-banner"><h2>ゲーム終了</h2><p>' + gs.maxRounds + 'ラウンド終了</p></div>');
      html.push('<section class="card"><h2>最終順位（最終ラウンド）</h2><ul class="player-list">');
      const last = gs.roundHistory[gs.roundHistory.length - 1];
      if (last && last.ranks) {
        last.ranks.order.forEach(function (pid, i) {
          const p = room.players.find(function (x) { return x.id === pid; });
          html.push('<li><span>' + (i + 1) + '位 ' + escapeHtml(p.name) + '</span><span>' + escapeHtml(last.ranks.titles[pid] || "") + '</span></li>');
        });
      }
      html.push('</ul></section>');
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    if (room.phase === "daifugo_exchange") {
      this.cancelAutoPass();
      const step = this.getCurrentExchangeStep(room);
      html.push('<div class="phase-banner"><h2>カード交換</h2><p>ラウンド ' + gs.round + ' 終了 → 次ラウンド前</p></div>');
      if (!step) {
        html.push('<p class="note">交換完了。ホストが次ラウンドを開始します。</p>');
        if (ctx.isHost) {
          html.push('<button class="btn btn-primary" data-action="daifugo-next-round">次のラウンドを開始</button>');
        }
        return html.join("");
      }
      const fromP = room.players.find(function (p) { return p.id === step.fromId; });
      const toP = room.players.find(function (p) { return p.id === step.toId; });
      html.push('<section class="card"><p class="note"><strong>' + escapeHtml(step.label) + '</strong></p>');
      html.push('<p class="note">' + escapeHtml(fromP.name) + ' → ' + escapeHtml(toP.name) + ' へ <strong>' + step.count + '枚</strong></p></section>');

      const actingId = this._actingPlayer(ctx);
      const isActor = step.fromId === actingId || (!ctx.isOnline && step.fromId === gs.turnPlayerId);
      if (ctx.isOnline && step.fromId === ctx.me.id) {
        const hand = this.getHand(ctx, ctx.me.id);
        html.push('<div class="hand-row">');
        hand.forEach(function (c) {
          html.push(DaifugoGame._cardHtml(c, DaifugoGame._selected.indexOf(c.id) >= 0, true));
        });
        html.push('</div>');
        html.push('<button class="btn btn-primary" data-action="daifugo-exchange">交換する（' + step.count + '枚選択）</button>');
      } else if (!ctx.isOnline) {
        const hand = gs.hands[step.fromId] || [];
        html.push('<div class="hand-row">');
        hand.forEach(function (c) {
          html.push(DaifugoGame._cardHtml(c, DaifugoGame._selected.indexOf(c.id) >= 0, true));
        });
        html.push('</div>');
        html.push('<button class="btn btn-primary" data-action="daifugo-exchange">交換する</button>');
      } else {
        html.push('<p class="note">' + escapeHtml(fromP.name) + ' さんの選択待ち</p>');
        if (ctx.isHost && ctx.isOnline) {
          html.push('<button class="btn btn-secondary" data-action="daifugo-exchange-auto">自動交換（ホスト）</button>');
        }
      }
      return html.join("");
    }

    const turnPlayer = room.players.find(function (p) { return p.id === gs.turnPlayerId; });
    const actingId = this._actingPlayer(ctx);
    const viewHand = this.sortHand(this.getHand(ctx, actingId).slice());
    const isTurn = this.isMyTurn(ctx);
    const mustLead = !gs.table;
    const willAutoPass = this.shouldAutoPass(ctx);

    html.push('<div class="phase-banner"><h2>大富豪</h2>');
    html.push('<p>ラウンド ' + gs.round + '/' + gs.maxRounds + '　');
    html.push('ターン：<strong>' + escapeHtml(turnPlayer ? turnPlayer.name : "？") + '</strong></p>');
    html.push(TrumpUi.renderTurnOrderBlock(room, gs));
    html.push('</div>');

    if (!ctx.isOnline && turnPlayer) {
      html.push('<section class="card"><p class="note">📱 <strong>' + escapeHtml(turnPlayer.name) + '</strong> さんの番です。</p></section>');
    }
    if (willAutoPass) {
      html.push('<p class="note daifugo-auto-pass-note">出せるカードがないため、5秒後に自動パスします…</p>');
    }
    if (this._autoPassNotice) {
      html.push('<p class="note daifugo-auto-pass-done">場のカードより強いカードがないためスキップしました</p>');
    }

    if (gs.finished.length) {
      html.push('<section class="card"><p class="note">上がり：');
      gs.finished.forEach(function (pid, i) {
        const p = room.players.find(function (x) { return x.id === pid; });
        html.push((i + 1) + '位 ' + escapeHtml(p.name) + '　');
      });
      html.push('</p></section>');
    }

    const canPlayToTable = isTurn && !gs.pending && gs.finished.indexOf(actingId) < 0;
    let tableCls = "card table-area";
    if (canPlayToTable) tableCls += " is-playable";
    html.push('<section class="' + tableCls + '"' + (canPlayToTable ? ' data-action="daifugo-play" role="button" tabindex="0" aria-label="場をタップして出す"' : "") + ">");
    html.push('<h2 class="table-heading">場');
    if (gs.fieldRevolution) {
      html.push('<span class="table-effect-tag">Jバック</span>');
    }
    if (gs.revolution) {
      html.push('<span class="table-effect-tag">革命</span>');
    }
    html.push("</h2>");
    if (canPlayToTable) {
      html.push('<p class="table-play-hint">タップで出す</p>');
    }
    html.push('<div class="table-cards">');
    if (gs.table) {
      gs.table.cards.forEach(function (c) {
        html.push(DaifugoGame._cardHtml(c, false, false));
      });
    } else {
      html.push('<p class="table-empty">場は空です。リードしてください。</p>');
    }
    html.push('</div>');
    html.push(this._renderRuleFlash());
    html.push('</section>');

    if (gs.pending && gs.pending.type === "seven_pass") {
      this.cancelAutoPass();
      const pending = gs.pending;
      const actor = room.players.find(function (p) { return p.id === pending.playerId; });
      html.push('<section class="card"><h2>手札 <small>' + viewHand.length + '枚</small></h2>');
      if (pending.step === "choose_target" && isTurn) {
        html.push('<p class="note">7渡し：相手を選んで ' + pending.count + '枚渡します</p>');
        html.push('<div class="btn-row">');
        room.players.forEach(function (p) {
          if (p.id === pending.playerId || gs.finished.indexOf(p.id) >= 0) return;
          html.push('<button type="button" class="btn btn-secondary" data-action="daifugo-seven-target" data-player="' + escapeHtml(p.id) + '">' + escapeHtml(p.name) + ' に渡す</button>');
        });
        html.push('</div>');
      } else if (pending.step === "give" && isTurn) {
        const target = room.players.find(function (p) { return p.id === pending.targetId; });
        html.push('<p class="note">7渡し：' + escapeHtml(target.name) + ' に ' + pending.count + '枚渡す</p>');
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          html.push(DaifugoGame._cardHtml(c, DaifugoGame._selected.indexOf(c.id) >= 0, true));
        });
        html.push('</div>');
        html.push('<button class="btn btn-primary" data-action="daifugo-seven-give">渡す（' + pending.count + '枚）</button>');
      } else if (pending.step === "return" && isTurn) {
        const backTo = room.players.find(function (p) { return p.id === pending.toId; });
        html.push('<p class="note">7渡し：' + escapeHtml(backTo.name) + ' に ' + pending.count + '枚返す</p>');
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          html.push(DaifugoGame._cardHtml(c, DaifugoGame._selected.indexOf(c.id) >= 0, true));
        });
        html.push('</div>');
        html.push('<button class="btn btn-primary" data-action="daifugo-seven-return">返す（' + pending.count + '枚）</button>');
      } else {
        html.push('<p class="note">7渡し処理中…（' + escapeHtml(actor ? actor.name : "？") + '）</p>');
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          html.push(DaifugoGame._cardHtml(c, false, false));
        });
        html.push('</div>');
      }
      html.push('</section>');
      html.push(this._renderPlayChrome(ctx, gs, false, true));
      return html.join("");
    }

    if (gs.pending && gs.pending.type === "ten_discard") {
      this.cancelAutoPass();
      html.push('<section class="card"><h2>手札 <small>' + viewHand.length + '枚</small></h2>');
      if (isTurn) {
        html.push('<p class="note">最大' + gs.pending.count + '枚捨てられます（任意）</p>');
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          html.push(DaifugoGame._cardHtml(c, DaifugoGame._selected.indexOf(c.id) >= 0, true));
        });
        html.push('</div>');
        html.push('<div class="btn-row" style="margin-top:0.75rem">');
        html.push('<button class="btn btn-primary" data-action="daifugo-ten-discard">捨てる</button>');
        html.push('<button class="btn btn-secondary" data-action="daifugo-ten-skip">捨てずに次へ</button>');
        html.push('</div>');
      } else {
        html.push('<p class="note">10捨て処理中…</p>');
        html.push('<div class="hand-row">');
        viewHand.forEach(function (c) {
          html.push(DaifugoGame._cardHtml(c, false, false));
        });
        html.push('</div>');
      }
      html.push('</section>');
      html.push(this._renderPlayChrome(ctx, gs, false, true));
      return html.join("");
    }

    html.push('<section class="card"><h2>手札 <small>' + viewHand.length + '枚</small></h2>');

    if (gs.finished.indexOf(actingId) >= 0) {
      html.push('<p class="note">上がりました 🎉</p>');
    } else if (isTurn) {
      html.push('<div class="hand-row" id="handRow">');
      viewHand.forEach(function (c) {
        html.push(DaifugoGame._cardHtml(c, DaifugoGame._selected.indexOf(c.id) >= 0, true));
      });
      html.push('</div>');
      html.push('<div class="btn-row" style="margin-top:0.75rem">');
      html.push('<button class="btn btn-primary" data-action="daifugo-play">出す</button>');
      html.push('<button class="btn btn-secondary" data-action="daifugo-clear">選択解除</button>');
      html.push('</div>');
      if (mustLead) html.push('<p class="note">場が空なのでカードを出してください。</p>');
    } else if (ctx.isOnline) {
      html.push('<div class="hand-row">');
      viewHand.forEach(function (c) {
        html.push(DaifugoGame._cardHtml(c, false, false));
      });
      html.push('</div>');
      html.push('<p class="note">' + escapeHtml(turnPlayer ? turnPlayer.name : "？") + ' さんの番です</p>');
    } else {
      html.push('<div class="hand-row">');
      viewHand.forEach(function (c) {
        html.push(DaifugoGame._cardHtml(c, false, false));
      });
      html.push('</div>');
    }

    html.push('</section>');
    html.push(this._renderPlayChrome(ctx, gs, isTurn, mustLead));
    return html.join("");
  },

  _typeLabel: function (type) {
    return {
      single: "シングル",
      pair: "ペア",
      triple: "スリーカード",
      straight: "階段",
      four: "重ね数字"
    }[type] || type;
  },

  _renderBasicRulesBody: function () {
    return (
      '<ul class="clue-list trump-rules-list">' +
      "<li>♢3 持ちの人が親（2戦目以降は大貧民が親）</li>" +
      "<li>出せる形：シングル / ペア / スリーカード / 階段 / 重ね数字</li>" +
      "<li>同じ枚数・同じ形で、前より強いカードだけ出せる</li>" +
      "<li>出せないときはパス。全員パスで場が流れる</li>" +
      "<li>先に手札をなくした順に大富豪・富豪・平民・貧民・大貧民</li>" +
      "</ul>"
    );
  },

  _renderLocalRulesBody: function (gs) {
    const rules = gs.localRules || this.LOCAL_RULES;
    const labels = {
      revolution: "革命（同じ数字4枚で強さ反転）",
      straightRevolution: "階段革命（同マーク4枚以上の連番）",
      elevenBack: "Jバック（Jでその場だけ革命）",
      elevenBackWild: "激Jバック（Jを含む役でその場だけ革命）",
      eightCut: "8切り（8を含む役で場流し）",
      sevenPass: "7渡し（7の枚数だけ渡して同数返す）",
      tenDiscard: "10捨て（10の枚数だけ捨てる）",
      nineReverse: "9リバース（順番逆回転）",
      fiveJump: "5飛び（次を1人飛ばす）"
    };
    let html = '<ul class="clue-list trump-rules-list">';
    Object.keys(labels).forEach(function (key) {
      const on = rules[key];
      html += "<li>" + labels[key] + "：" + (on ? "<strong>ON</strong>" : "OFF") + "</li>";
    });
    html += "</ul>";
    return html;
  },

  _renderPlayChrome: function (ctx, gs, isTurn, mustLead) {
    if (typeof TrumpUi === "undefined") return "";
    const finished = Array.isArray(gs.finished) ? gs.finished : [];
    const actingId = this._actingPlayer(ctx);
    const html = [];
    const canPass = isTurn && !mustLead && finished.indexOf(actingId) < 0;

    html.push(TrumpUi.renderFooter({
      passAction: "daifugo-pass",
      canPass: canPass,
      rulesAction: "daifugo-rules-toggle",
      localRulesAction: "daifugo-local-rules-toggle"
    }));
    html.push(TrumpUi.renderRulesPanel("daifugoRulesPanel", "ルール", this._renderBasicRulesBody()));
    html.push(TrumpUi.renderRulesPanel("daifugoLocalRulesPanel", "ローカルルール", this._renderLocalRulesBody(gs)));
    return html.join("");
  }
};

DaifugoGame._selected = [];

DaifugoGame.getSelected = function () {
  return DaifugoGame._selected.slice();
};

DaifugoGame.toggleCard = function (cardId) {
  const idx = DaifugoGame._selected.indexOf(cardId);
  if (idx >= 0) DaifugoGame._selected.splice(idx, 1);
  else DaifugoGame._selected.push(cardId);
  document.querySelectorAll("[data-card]").forEach(function (el) {
    el.classList.toggle("is-selected", DaifugoGame._selected.indexOf(el.dataset.card) >= 0);
  });
};

DaifugoGame.clearSelected = function () {
  DaifugoGame._selected = [];
  document.querySelectorAll(".playing-card.is-selected").forEach(function (el) {
    el.classList.remove("is-selected");
  });
};

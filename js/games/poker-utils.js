/**
 * ポーカー共通ユーティリティ
 * 役判定・チップ・カード表示・初心者向けガイド
 */

const PokerUtils = {
  SUITS: ["spade", "heart", "diamond", "club"],
  SUIT_LABEL: { spade: "♠", heart: "♥", diamond: "♦", club: "♣" },
  RANK_LABEL: { 11: "J", 12: "Q", 13: "K", 14: "A" },

  STARTING_CHIPS: 1000,
  SMALL_BLIND: 10,
  BIG_BLIND: 20,

  HAND_NAMES: {
    9: "ストレートフラッシュ",
    8: "フォーカード",
    7: "フルハウス",
    6: "フラッシュ",
    5: "ストレート",
    4: "スリーカード",
    3: "ツーペア",
    2: "ワンペア",
    1: "ハイカード"
  },

  isPokerGame: function (gameId) {
    return gameId === "texas_holdem" || gameId === "seven_stud" || gameId === "five_draw";
  },

  createDeck: function () {
    const deck = [];
    this.SUITS.forEach(function (suit) {
      for (let rank = 2; rank <= 14; rank++) {
        deck.push({ id: suit + rank, suit: suit, rank: rank });
      }
    });
    return deck;
  },

  label: function (card) {
    const r = this.RANK_LABEL[card.rank] || card.rank;
    return this.SUIT_LABEL[card.suit] + r;
  },

  cardHtml: function (card, faceDown, small) {
    return PlayingCards.cardHtml(card, {
      faceDown: faceDown,
      small: small,
      asButton: false
    });
  },

  initChips: function (players, amount) {
    const chips = {};
    players.forEach(function (p) { chips[p.id] = amount || PokerUtils.STARTING_CHIPS; });
    return chips;
  },

  combinations: function (arr, k) {
    const result = [];
    function helper(start, combo) {
      if (combo.length === k) {
        result.push(combo.slice());
        return;
      }
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    }
    helper(0, []);
    return result;
  },

  evaluateFive: function (cards) {
    const ranks = cards.map(function (c) { return c.rank; }).sort(function (a, b) { return b - a; });
    const suits = cards.map(function (c) { return c.suit; });
    const isFlush = suits.every(function (s) { return s === suits[0]; });

    const unique = [];
    ranks.forEach(function (r) {
      if (unique.indexOf(r) < 0) unique.push(r);
    });

    let straightHigh = 0;
    for (let i = 0; i <= unique.length - 5; i++) {
      if (unique[i] - unique[i + 4] === 4) {
        straightHigh = unique[i];
        break;
      }
    }
    if (!straightHigh && unique.indexOf(14) >= 0 && unique.indexOf(5) >= 0 &&
        unique.indexOf(4) >= 0 && unique.indexOf(3) >= 0 && unique.indexOf(2) >= 0) {
      straightHigh = 5;
    }
    const isStraight = straightHigh > 0;

    const counts = {};
    ranks.forEach(function (r) { counts[r] = (counts[r] || 0) + 1; });
    const groups = Object.keys(counts).map(function (r) {
      return { rank: parseInt(r, 10), count: counts[r] };
    }).sort(function (a, b) {
      return b.count - a.count || b.rank - a.rank;
    });

    const scoreBase = function (cat, tie) {
      let s = cat * 100000000;
      tie.forEach(function (v, i) {
        s += v * Math.pow(15, 4 - i);
      });
      return s;
    };

    if (isFlush && isStraight) {
      const royal = straightHigh === 14 && isFlush;
      return {
        category: 9,
        name: royal ? "ロイヤルフラッシュ" : "ストレートフラッシュ",
        tiebreak: [straightHigh],
        score: scoreBase(9, [straightHigh]),
        cards: cards
      };
    }
    if (groups[0].count === 4) {
      return {
        category: 8,
        name: "フォーカード",
        tiebreak: [groups[0].rank, groups[1].rank],
        score: scoreBase(8, [groups[0].rank, groups[1].rank]),
        cards: cards
      };
    }
    if (groups[0].count === 3 && groups[1].count === 2) {
      return {
        category: 7,
        name: "フルハウス",
        tiebreak: [groups[0].rank, groups[1].rank],
        score: scoreBase(7, [groups[0].rank, groups[1].rank]),
        cards: cards
      };
    }
    if (isFlush) {
      return {
        category: 6,
        name: "フラッシュ",
        tiebreak: ranks,
        score: scoreBase(6, ranks),
        cards: cards
      };
    }
    if (isStraight) {
      return {
        category: 5,
        name: "ストレート",
        tiebreak: [straightHigh],
        score: scoreBase(5, [straightHigh]),
        cards: cards
      };
    }
    if (groups[0].count === 3) {
      const kickers = groups.slice(1).map(function (g) { return g.rank; });
      return {
        category: 4,
        name: "スリーカード",
        tiebreak: [groups[0].rank].concat(kickers),
        score: scoreBase(4, [groups[0].rank].concat(kickers)),
        cards: cards
      };
    }
    if (groups[0].count === 2 && groups[1].count === 2) {
      const highPair = Math.max(groups[0].rank, groups[1].rank);
      const lowPair = Math.min(groups[0].rank, groups[1].rank);
      const kicker = groups[2] ? groups[2].rank : 0;
      return {
        category: 3,
        name: "ツーペア",
        tiebreak: [highPair, lowPair, kicker],
        score: scoreBase(3, [highPair, lowPair, kicker]),
        cards: cards
      };
    }
    if (groups[0].count === 2) {
      const kickers = groups.slice(1).map(function (g) { return g.rank; });
      return {
        category: 2,
        name: "ワンペア",
        tiebreak: [groups[0].rank].concat(kickers),
        score: scoreBase(2, [groups[0].rank].concat(kickers)),
        cards: cards
      };
    }
    return {
      category: 1,
      name: "ハイカード",
      tiebreak: ranks,
      score: scoreBase(1, ranks),
      cards: cards
    };
  },

  bestHand: function (cards) {
    if (cards.length < 5) return null;
    if (cards.length === 5) return this.evaluateFive(cards);
    let best = null;
    const combos = this.combinations(cards, 5);
    combos.forEach(function (combo) {
      const ev = PokerUtils.evaluateFive(combo);
      if (!best || ev.score > best.score) best = ev;
    });
    return best;
  },

  getHoleCards: function (ctx, playerId) {
    const gs = ctx.room.gameState;
    if (!ctx.isOnline) {
      if (!gs || !gs.holeCards) return [];
      return gs.holeCards[playerId] || [];
    }
    if (playerId === ctx.me.id && ctx.secrets && ctx.secrets.holeCards) {
      return ctx.secrets.holeCards;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.holeCards) {
      return ctx.hostSecrets.holeCards[playerId] || [];
    }
    return [];
  },

  attachHostSecrets: function (room, hostSecrets) {
    const gs = room && room.gameState;
    if (!gs || !hostSecrets) return false;
    let attached = false;
    if (hostSecrets.holeCards) {
      gs.holeCards = JSON.parse(JSON.stringify(hostSecrets.holeCards));
      attached = true;
    }
    if (hostSecrets.deck) {
      gs.deck = hostSecrets.deck.slice();
      attached = true;
    }
    return attached;
  },

  syncHostSecretsFromState: function (gs, hostSecrets) {
    if (!gs || !hostSecrets) return;
    if (gs.holeCards) hostSecrets.holeCards = gs.holeCards;
    if (gs.deck) hostSecrets.deck = gs.deck;
  },

  playerName: function (room, id) {
    const p = room.players.find(function (x) { return x.id === id; });
    return p ? p.name : "—";
  },

  activePlayers: function (room, gs) {
    return room.players.filter(function (p) {
      return gs.inHand.indexOf(p.id) >= 0 && gs.folded.indexOf(p.id) < 0 && (gs.chips[p.id] > 0 || gs.allIn.indexOf(p.id) >= 0);
    });
  },

  normalizeBettingState: function (gs) {
    if (!gs) return;
    gs.currentBet = Number(gs.currentBet) || 0;
    gs.pot = Number(gs.pot) || 0;
    gs.bigBlind = Number(gs.bigBlind) || PokerUtils.BIG_BLIND;
    gs.smallBlind = Number(gs.smallBlind) || PokerUtils.SMALL_BLIND;
    if (!gs.streetBets || typeof gs.streetBets !== "object") {
      gs.streetBets = {};
    }
    Object.keys(gs.streetBets).forEach(function (key) {
      gs.streetBets[key] = Number(gs.streetBets[key]) || 0;
    });
    if (!gs.actedThisStreet || typeof gs.actedThisStreet !== "object") {
      gs.actedThisStreet = {};
    }
  },

  amountToCall: function (gs, playerId) {
    this.normalizeBettingState(gs);
    const bet = Number(gs.streetBets[playerId] || 0);
    const current = Number(gs.currentBet || 0);
    return Math.max(0, current - bet);
  },

  canCheck: function (gs, playerId) {
    return this.amountToCall(gs, playerId) === 0;
  },

  placeBet: function (gs, playerId, amount) {
    const available = gs.chips[playerId] || 0;
    const actual = Math.min(Math.max(0, amount), available);
    gs.chips[playerId] -= actual;
    gs.streetBets[playerId] = (gs.streetBets[playerId] || 0) + actual;
    gs.pot += actual;
    if (gs.chips[playerId] === 0 && gs.allIn.indexOf(playerId) < 0) {
      gs.allIn.push(playerId);
    }
    return actual;
  },

  resetStreetBets: function (gs) {
    gs.streetBets = {};
    gs.currentBet = 0;
    gs.lastRaise = 0;
  },

  nextPlayer: function (room, gs, fromId) {
    const order = gs.inHand.filter(function (pid) {
      return gs.folded.indexOf(pid) < 0;
    });
    const idx = order.indexOf(fromId);
    for (let i = 1; i <= order.length; i++) {
      const next = order[(idx + i) % order.length];
      if (gs.allIn.indexOf(next) >= 0) continue;
      const toCall = PokerUtils.amountToCall(gs, next);
      if (toCall > 0 || !gs.actedThisStreet[next]) return next;
    }
    return null;
  },

  bettingComplete: function (room, gs) {
    const active = gs.inHand.filter(function (pid) {
      return gs.folded.indexOf(pid) < 0 && gs.allIn.indexOf(pid) < 0;
    });
    if (active.length <= 1) return true;
    return active.every(function (pid) {
      return gs.actedThisStreet[pid] && PokerUtils.amountToCall(gs, pid) === 0;
    });
  },

  applyAction: function (gs, playerId, action, amount) {
    if (gs.folded.indexOf(playerId) >= 0 || gs.allIn.indexOf(playerId) >= 0) {
      return { ok: false, error: "アクションできません" };
    }

    if (action === "fold") {
      gs.folded.push(playerId);
      gs.actedThisStreet[playerId] = true;
      gs.lastAction = { playerId: playerId, action: "fold" };
      return { ok: true };
    }

    if (action === "check") {
      if (!PokerUtils.canCheck(gs, playerId)) {
        return { ok: false, error: "チェックできません。コールが必要です" };
      }
      gs.actedThisStreet[playerId] = true;
      gs.lastAction = { playerId: playerId, action: "check" };
      return { ok: true };
    }

    if (action === "call") {
      const toCall = PokerUtils.amountToCall(gs, playerId);
      if (toCall <= 0) {
        if (!PokerUtils.canCheck(gs, playerId)) {
          return { ok: false, error: "コールするベットがありません" };
        }
        gs.actedThisStreet[playerId] = true;
        gs.lastAction = { playerId: playerId, action: "check" };
        return { ok: true };
      }
      PokerUtils.placeBet(gs, playerId, toCall);
      gs.actedThisStreet[playerId] = true;
      gs.lastAction = { playerId: playerId, action: "call", amount: toCall };
      return { ok: true };
    }

    if (action === "bet" || action === "raise") {
      const toCall = PokerUtils.amountToCall(gs, playerId);
      const minRaise = gs.lastRaise || gs.bigBlind || PokerUtils.BIG_BLIND;
      const total = toCall + (amount || minRaise);
      if (total <= toCall && action === "raise") {
        return { ok: false, error: "レイズ額が足りません" };
      }
      const placed = PokerUtils.placeBet(gs, playerId, total);
      const newStreetBet = gs.streetBets[playerId];
      if (newStreetBet > gs.currentBet) {
        gs.lastRaise = newStreetBet - gs.currentBet;
        gs.currentBet = newStreetBet;
        const active = gs.inHand.filter(function (pid) {
          return gs.folded.indexOf(pid) < 0 && gs.allIn.indexOf(pid) < 0 && pid !== playerId;
        });
        active.forEach(function (pid) { gs.actedThisStreet[pid] = false; });
      }
      gs.actedThisStreet[playerId] = true;
      gs.lastAction = { playerId: playerId, action: action, amount: placed };
      return { ok: true };
    }

    if (action === "allin") {
      const chips = gs.chips[playerId] || 0;
      if (chips <= 0) return { ok: false, error: "チップがありません" };
      const placed = PokerUtils.placeBet(gs, playerId, chips);
      const newStreetBet = gs.streetBets[playerId];
      if (newStreetBet > gs.currentBet) {
        gs.lastRaise = newStreetBet - gs.currentBet;
        gs.currentBet = newStreetBet;
        const active = gs.inHand.filter(function (pid) {
          return gs.folded.indexOf(pid) < 0 && gs.allIn.indexOf(pid) < 0 && pid !== playerId;
        });
        active.forEach(function (pid) { gs.actedThisStreet[pid] = false; });
      }
      gs.actedThisStreet[playerId] = true;
      gs.lastAction = { playerId: playerId, action: "allin", amount: placed };
      return { ok: true };
    }

    return { ok: false, error: "不明なアクション" };
  },

  resolveShowdown: function (room, gs, getPlayerCards) {
    const contenders = gs.inHand.filter(function (pid) { return gs.folded.indexOf(pid) < 0; });
    if (contenders.length === 1) {
      return { winners: [contenders[0]], hands: {}, reason: "fold" };
    }

    const hands = {};
    let best = null;
    const winners = [];

    contenders.forEach(function (pid) {
      const cards = getPlayerCards(pid);
      const hand = PokerUtils.bestHand(cards);
      hands[pid] = hand;
      if (!hand) return;
      if (!best || hand.score > best.score) {
        best = hand;
        winners.length = 0;
        winners.push(pid);
      } else if (hand.score === best.score) {
        winners.push(pid);
      }
    });

    return { winners: winners, hands: hands, best: best, reason: "showdown" };
  },

  awardPot: function (gs, winnerIds) {
    const share = Math.floor(gs.pot / winnerIds.length);
    winnerIds.forEach(function (pid) {
      gs.chips[pid] = (gs.chips[pid] || 0) + share;
    });
    gs.pot = gs.pot - share * winnerIds.length;
  },

  renderChipTable: function (room, gs) {
    let html = '<section class="card poker-chips"><h2>💰 チップ</h2><div class="poker-chip-grid">';
    room.players.forEach(function (p) {
      const c = gs.chips[p.id] || 0;
      const inPot = gs.streetBets[p.id] || 0;
      const folded = gs.folded.indexOf(p.id) >= 0;
      html += '<div class="poker-chip-item' + (folded ? " is-folded" : "") + '">';
      html += '<strong>' + escapeHtml(p.name) + '</strong>';
      html += '<span class="poker-chip-stack">' + c + '</span>';
      if (inPot) html += '<small>ベット中 ' + inPot + '</small>';
      html += '</div>';
    });
    html += '</div><p class="poker-pot">ポット：<strong>' + gs.pot + '</strong> チップ</p></section>';
    return html;
  },

  renderGuide: function (variant) {
    let html = '<section class="card poker-guide"><h2>📖 初心者ガイド</h2>';
    html += '<p class="note"><strong>チップ</strong>＝ポーカーのお金。ベット・レイズでポットに積み、最強の役で獲得します。</p>';

    if (variant === "holdem") {
      html += '<p><strong>テキサスホールデム</strong>：手札2枚＋場札5枚から5枚を選んで役を作る。WSOPでも採用の一番人気ルール。</p>';
      html += '<ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">';
      html += '<li>プリフロップ → フロップ(3枚) → ターン(1枚) → リバー(1枚) の順にベット</li>';
      html += '<li>SB(10)・BB(20)が強制ベット。ディーラーボタンが毎ハンド回る</li>';
      html += '<li>フォールド / チェック / コール / レイズ / オールイン</li></ul>';
    } else if (variant === "stud") {
      html += '<p><strong>セブンカード・スタッド</strong>：場札なし。自分に配られる最大7枚から5枚で役を作る昔ながらのポーカー。</p>';
      html += '<ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">';
      html += '<li>表向きのカードは全員に見える。裏向きは自分だけ</li>';
      html += '<li>カードが配られるたびにベットラウンド</li></ul>';
    } else {
      html += '<p><strong>ファイブカード・ドロー</strong>：5枚配られ、不要なカードを交換して役を作る映画でおなじみのポーカー。</p>';
      html += '<ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">';
      html += '<li>1回目ベット → カード交換（0〜5枚）→ 2回目ベット → ショーダウン</li></ul>';
    }

    html += '<details style="margin-top:0.75rem"><summary><strong>役の強さ（弱い→強い）</strong></summary>';
    html += '<ol class="clue-list" style="font-size:0.85rem;color:var(--text-dim);margin-top:0.5rem">';
    html += '<li>ハイカード</li><li>ワンペア</li><li>ツーペア</li><li>スリーカード</li>';
    html += '<li>ストレート（連番5枚）</li><li>フラッシュ（同スート5枚）</li>';
    html += '<li>フルハウス</li><li>フォーカード</li><li>ストレートフラッシュ</li>';
    html += '<li>ロイヤルフラッシュ（10〜A同スート）</li></ol></details></section>';
    return html;
  },

  renderHint: function (cards) {
    if (!cards || cards.length < 2) return "";
    const hand = PokerUtils.bestHand(cards);
    if (!hand) return '<p class="note poker-hint">💡 ヒント：あと' + (5 - cards.length) + '枚で役が決まります</p>';
    return '<p class="note poker-hint">💡 現在の最強役：<strong>' + hand.name + '</strong></p>';
  }
};

/**
 * 秘密情報の分割・取得（オンライン用）
 */

const Secrets = {
  stripFromRoom: function (room) {
    const copy = JSON.parse(JSON.stringify(room));
    const hostSecrets = { numbers: null, roles: null, hands: null, words: null, holeCards: null, deck: null };
    const playerSecrets = {};

    if (!copy.gameState) {
      return { room: copy, hostSecrets: null, playerSecrets: {} };
    }

    const gs = copy.gameState;

    if (gs.numbers) {
      hostSecrets.numbers = gs.numbers;
      Object.keys(gs.numbers).forEach(function (pid) {
        playerSecrets[pid] = playerSecrets[pid] || {};
        playerSecrets[pid].number = gs.numbers[pid];
      });
      delete gs.numbers;
    }

    if (gs.roles) {
      if (copy.phase === "wolf_end" || copy.phase === "wordwolf_end" || copy.phase === "draw_werewolf_end") {
        gs.revealedRoles = Object.assign({}, gs.roles);
      }
      hostSecrets.roles = gs.roles;
      const wolves = copy.players.filter(function (p) { return gs.roles[p.id] === "wolf"; });
      Object.keys(gs.roles).forEach(function (pid) {
        playerSecrets[pid] = playerSecrets[pid] || {};
        playerSecrets[pid].role = gs.roles[pid];
        if (gs.roles[pid] === "wolf") {
          playerSecrets[pid].wolfMates = wolves
            .filter(function (w) { return w.id !== pid; })
            .map(function (w) { return w.id; });
        }
      });
      delete gs.roles;
    }

    if (gs.hands) {
      if (copy.game === "ito") {
        gs.handCounts = {};
        Object.keys(gs.hands).forEach(function (pid) {
          gs.handCounts[pid] = (gs.hands[pid] || []).length;
        });
      }
      // matryoshka_ttt: hands are keyed by owner (1/2), not player id — keep on public state
      if (copy.game !== "oldmaid" && copy.game !== "sevens" && copy.game !== "matryoshka_ttt") {
        hostSecrets.hands = gs.hands;
        if (copy.game === "skull") {
          hostSecrets.skullTypes = hostSecrets.skullTypes || {};
          Object.keys(gs.hands).forEach(function (pid) {
            (gs.hands[pid] || []).forEach(function (card) {
              if (card.type) hostSecrets.skullTypes[card.id] = card.type;
            });
          });
        }
        Object.keys(gs.hands).forEach(function (pid) {
          playerSecrets[pid] = playerSecrets[pid] || {};
          playerSecrets[pid].hand = gs.hands[pid];
        });
        delete gs.hands;
      }
    }

    if (gs.words) {
      if (copy.phase === "wordwolf_end" || copy.phase === "draw_werewolf_end") {
        gs.revealedWords = Object.assign({}, gs.words);
      }
      hostSecrets.words = gs.words;
      Object.keys(gs.words).forEach(function (pid) {
        playerSecrets[pid] = playerSecrets[pid] || {};
        playerSecrets[pid].word = gs.words[pid];
      });
      delete gs.words;
    }

    if (gs.ngWords && copy.game === "ngword") {
      if (copy.phase === "ngword_end") {
        gs.revealedNgWords = Object.assign({}, gs.ngWords);
      }
      hostSecrets.ngWords = gs.ngWords;
      Object.keys(gs.ngWords).forEach(function (pid) {
        const others = {};
        Object.keys(gs.ngWords).forEach(function (otherId) {
          if (otherId !== pid) {
            others[otherId] = gs.ngWords[otherId];
          }
        });
        playerSecrets[pid] = playerSecrets[pid] || {};
        playerSecrets[pid].ngOthers = others;
      });
      delete gs.ngWords;
    }

    if (gs.holeCards && PokerUtils.isPokerGame(copy.game)) {
      hostSecrets.holeCards = gs.holeCards;
      Object.keys(gs.holeCards).forEach(function (pid) {
        playerSecrets[pid] = playerSecrets[pid] || {};
        playerSecrets[pid].holeCards = gs.holeCards[pid];
      });
      delete gs.holeCards;
    }

    if (gs.deck && (PokerUtils.isPokerGame(copy.game) || copy.game === "blackjack")) {
      hostSecrets.deck = gs.deck;
      delete gs.deck;
    }

    if (gs.bj && copy.game === "blackjack") {
      hostSecrets.bjStates = gs.bj;
      Object.keys(gs.bj).forEach(function (pid) {
        playerSecrets[pid] = playerSecrets[pid] || {};
        playerSecrets[pid].bjState = gs.bj[pid];
        gs.bj[pid] = BlackjackGame.stripPublicPlayer(gs.bj[pid]);
      });
    }

    return { room: copy, hostSecrets: hostSecrets, playerSecrets: playerSecrets };
  },

  /** オンライン時の手札取得（秘密情報 → 公開 hands の順） */
  getTrumpHand: function (ctx, playerId) {
    if (playerId === ctx.me.id && ctx.secrets && ctx.secrets.hand) {
      return ctx.secrets.hand;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.hands && ctx.hostSecrets.hands[playerId]) {
      return ctx.hostSecrets.hands[playerId];
    }
    const gs = ctx.room && ctx.room.gameState;
    if (gs && gs.hands && gs.hands[playerId]) {
      return gs.hands[playerId];
    }
    return [];
  },

  getNumber: function (ctx, playerId) {
    if (!ctx.isOnline) {
      return ctx.room.gameState && ctx.room.gameState.numbers
        ? ctx.room.gameState.numbers[playerId]
        : null;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.numbers) {
      return ctx.hostSecrets.numbers[playerId];
    }
    if (playerId === ctx.me.id && ctx.secrets) {
      return ctx.secrets.number;
    }
    return null;
  },

  getRole: function (ctx, playerId) {
    if (!ctx.isOnline) {
      return ctx.room.gameState && ctx.room.gameState.roles
        ? ctx.room.gameState.roles[playerId]
        : null;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.roles) {
      return ctx.hostSecrets.roles[playerId];
    }
    if (playerId === ctx.me.id && ctx.secrets) {
      return ctx.secrets.role;
    }
    return null;
  },

  getWolfMates: function (ctx) {
    if (!ctx.isOnline) {
      return WerewolfGame.getWolves(ctx.room).filter(function (w) { return w.id !== ctx.me.id; });
    }
    if (!ctx.secrets || !ctx.secrets.wolfMates) return [];
    return ctx.secrets.wolfMates
      .map(function (id) { return ctx.room.players.find(function (p) { return p.id === id; }); })
      .filter(Boolean);
  }
};

/**
 * 秘密情報の分割・取得（オンライン用）
 */

const Secrets = {
  stripFromRoom: function (room) {
    const copy = JSON.parse(JSON.stringify(room));
    const hostSecrets = { numbers: null, roles: null, hands: null, words: null };
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
      if (copy.phase === "wolf_end" || copy.phase === "wordwolf_end") {
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
      // matryoshka_ttt: hands are keyed by owner (1/2), not player id — keep on public state
      if (copy.game !== "oldmaid" && copy.game !== "sevens" && copy.game !== "matryoshka_ttt") {
        hostSecrets.hands = gs.hands;
        Object.keys(gs.hands).forEach(function (pid) {
          playerSecrets[pid] = playerSecrets[pid] || {};
          playerSecrets[pid].hand = gs.hands[pid];
        });
        delete gs.hands;
      }
    }

    if (gs.words) {
      if (copy.phase === "wordwolf_end") {
        gs.revealedWords = Object.assign({}, gs.words);
      }
      hostSecrets.words = gs.words;
      Object.keys(gs.words).forEach(function (pid) {
        playerSecrets[pid] = playerSecrets[pid] || {};
        playerSecrets[pid].word = gs.words[pid];
      });
      delete gs.words;
    }

    if (gs.card && copy.game === "ngword") {
      hostSecrets.ngCard = gs.card;
      const explainerId = gs.explainerId;
      if (explainerId) {
        playerSecrets[explainerId] = playerSecrets[explainerId] || {};
        playerSecrets[explainerId].ngCard = gs.card;
      }
      delete gs.card;
    }

    return { room: copy, hostSecrets: hostSecrets, playerSecrets: playerSecrets };
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

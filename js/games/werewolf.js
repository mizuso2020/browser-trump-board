/**
 * 人狼 — 拡張ルール（人数別おすすめ構成）
 */

const WerewolfGame = {
  id: "werewolf",
  name: "人狼",
  minPlayers: 4,
  maxPlayers: 13,

  roleNames: {
    villager: "村人",
    seer: "占い師",
    medium: "霊能者",
    hunter: "狩人",
    shared: "共有者",
    wolf: "人狼",
    madman: "狂人",
    fanatic: "狂信者",
    wolf_boy: "狼少年",
    nekomata: "猫又",
    fox: "妖狐",
    lover: "恋人"
  },

  ROLE_SETUPS: {
    4: ["villager", "villager", "seer", "wolf"],
    5: ["villager", "villager", "seer", "wolf", "madman"],
    6: ["villager", "villager", "seer", "hunter", "wolf", "madman"],
    7: ["villager", "villager", "seer", "medium", "hunter", "wolf", "madman"],
    8: ["villager", "villager", "seer", "medium", "hunter", "wolf", "wolf", "madman"],
    9: ["villager", "villager", "seer", "medium", "hunter", "wolf", "wolf", "madman", "fox"],
    10: ["villager", "villager", "seer", "medium", "hunter", "shared", "shared", "wolf", "wolf", "madman"],
    11: ["villager", "villager", "seer", "medium", "hunter", "shared", "shared", "wolf", "wolf", "wolf", "madman"],
    12: ["villager", "villager", "villager", "seer", "medium", "hunter", "shared", "shared", "wolf", "wolf", "wolf", "madman"],
    13: ["villager", "villager", "villager", "seer", "medium", "hunter", "shared", "shared", "wolf", "wolf", "wolf", "madman", "fox"]
  },

  SETUP_HINTS: {
    4: "村人2・占い師・人狼",
    5: "村人2・占い師・人狼・狂人",
    6: "村人2・占い師・狩人・人狼・狂人",
    7: "村人2・占い師・霊能者・狩人・人狼・狂人",
    8: "村人2・占い師・霊能者・狩人・人狼2・狂人",
    9: "村人2・占い師・霊能者・狩人・人狼2・狂人・妖狐",
    10: "村人2・占い師・霊能者・狩人・共有者2・人狼2・狂人",
    11: "村人2・占い師・霊能者・狩人・共有者2・人狼3・狂人",
    12: "村人3・占い師・霊能者・狩人・共有者2・人狼3・狂人",
    13: "村人3・占い師・霊能者・狩人・共有者2・人狼3・狂人・妖狐"
  },

  PLAYABLE_ROLE_IDS: ["villager", "seer", "medium", "hunter", "shared", "wolf", "madman", "fanatic", "fox"],

  ROLE_CARD_IMAGE_BASE: "images/roles/",
  ROLE_CARD_BACK_IMAGE: "images/roles/card-back.png",

  ROLE_CARD_META: {
    villager: { icon: "👤", team: "村人陣営", cardDesc: "夜の行動なし。議論と投票", titleColor: "#f8fafc", desc: "会話で人狼を見つけ出す" },
    seer: { icon: "🔮", team: "村人陣営", cardDesc: "夜に1人占う（人狼か調べる）", titleColor: "#c4b5fd", desc: "夜に1人を占い、人狼か調べる" },
    medium: { icon: "👁", team: "村人陣営", cardDesc: "処刑された人が人狼か、自分だけ分かる", titleColor: "#7dd3fc", desc: "処刑された人が人狼か分かる" },
    hunter: { icon: "🛡", team: "村人陣営", cardDesc: "夜に1人護衛", titleColor: "#86efac", desc: "夜に1人を護衛する" },
    shared: { icon: "🤝", team: "村人陣営", cardDesc: "相棒の共有者が分かる（2人いる）", titleColor: "#fdba74", desc: "相棒の共有者と共に戦う" },
    wolf: { icon: "🐺", team: "人狼陣営", cardDesc: "2日目以降、夜に襲撃先を選ぶ", titleColor: "#fca5a5", desc: "夜に襲撃する相手を選ぶ" },
    madman: { icon: "😈", team: "人狼陣営", cardDesc: "夜の行動なし。人狼陣営の勝ちを狙う", titleColor: "#d8b4fe", desc: "人狼の勝利を助ける" },
    fanatic: { icon: "🕯", team: "人狼陣営", cardDesc: "人狼が誰か分かる（カスタムで選択可）", titleColor: "#ef4444", desc: "人狼が誰か知っている" },
    wolf_boy: { icon: "🌙", team: "第三陣営", cardDesc: "占われると人狼と出る", titleColor: "#e2e8f0", desc: "占われると人狼と出る" },
    nekomata: { icon: "🐱", team: "第三陣営", cardDesc: "死亡時に道連れ", titleColor: "#e2e8f0", desc: "道連れ能力を持つ" },
    fox: { icon: "🦊", team: "妖狐", cardDesc: "人狼の襲撃では死なない。占われると死ぬ", titleColor: "#fdba74", desc: "襲撃では死なない第三陣営" },
    lover: { icon: "💕", team: "恋人", cardDesc: "相方と運命を共にする", titleColor: "#fda4af", desc: "相方と運命を共にする" }
  },

  ROLE_GUIDE: {
    villager: {
      ability: "夜の行動はありません。昼の議論と投票で人狼を見つけましょう。",
      win: "人狼を全員いなくすと村人陣営の勝利です。"
    },
    seer: {
      ability: "夜に1人を占い、その人が人狼かどうか分かります（狂人・狂信者は人狼ではありません）。妖狐を占うと妖狐が死亡します。",
      win: "人狼を全員いなくすと村人陣営の勝利です。"
    },
    medium: {
      ability: "処刑された人が人狼だったか、あなただけに教えられます。",
      win: "人狼を全員いなくすと村人陣営の勝利です。"
    },
    hunter: {
      ability: "夜に自分以外の1人を護衛できます。護衛した人は人狼の襲撃を免れます。",
      win: "人狼を全員いなくすと村人陣営の勝利です。"
    },
    shared: {
      ability: "もう1人の共有者が誰か分かります。夜の行動はありません。",
      win: "人狼を全員いなくすと村人陣営の勝利です。"
    },
    wolf: {
      ability: "2日目以降の夜に、襲撃する相手を選べます。初日は村長が犠牲になり、参加者は襲撃されません。",
      win: "生存者のうち人狼とそれ以外が同数になったら人狼陣営の勝利です。"
    },
    madman: {
      ability: "夜の行動はありません。人狼陣営ですが、人狼が誰かは分かりません。",
      win: "生存者のうち人狼とそれ以外が同数になったら人狼陣営の勝利です。"
    },
    fanatic: {
      ability: "夜の行動はありません。人狼が誰か分かります。",
      win: "生存者のうち人狼とそれ以外が同数になったら人狼陣営の勝利です。"
    },
    fox: {
      ability: "人狼の襲撃では死亡しません。占い師に占われると死亡します。",
      win: "最後に自分だけが生き残ったら、妖狐の単独勝利です。"
    },
    wolf_boy: {
      ability: "占われると人狼判定になります。",
      win: "第三陣営として生き残る（未対応）。"
    },
    nekomata: {
      ability: "死亡時に道連れ能力があります。",
      win: "第三陣営として生き残る（未対応）。"
    },
    lover: {
      ability: "恋人の相方と運命を共にします。",
      win: "恋人同士で生き残る（未対応）。"
    }
  },

  isWolfRole: function (role) {
    return role === "wolf";
  },

  isWolfTeam: function (role) {
    return role === "wolf" || role === "madman" || role === "fanatic";
  },

  CUSTOM_ROLE_IDS: ["wolf", "seer", "medium", "hunter", "shared", "madman", "fanatic", "fox"],

  CUSTOM_ROLE_RULES: {
    wolf: { min: 1, max: 3 },
    seer: { min: 0, max: 1 },
    medium: { min: 0, max: 1 },
    hunter: { min: 0, max: 1 },
    shared: { min: 0, max: 2, step: 2 },
    madman: { min: 0, max: 2 },
    fanatic: { min: 0, max: 1 },
    fox: { min: 0, max: 1 }
  },

  SETUP_ROLE_ORDER: ["villager", "seer", "medium", "hunter", "shared", "wolf", "madman", "fanatic", "fox", "wolf_boy", "nekomata", "lover"],

  buildSetupHint: function (roles) {
    const counts = {};
    roles.forEach(function (role) {
      counts[role] = (counts[role] || 0) + 1;
    });
    const parts = [];
    const self = this;
    this.SETUP_ROLE_ORDER.forEach(function (role) {
      const count = counts[role];
      if (!count) return;
      const name = self.roleNames[role] || role;
      parts.push(count > 1 ? name + count : name);
    });
    return parts.join("・");
  },

  getSetupPresets: function (count) {
    const basicRoles = this.ROLE_SETUPS[count];
    if (!basicRoles) {
      const fallback = ["wolf"];
      while (fallback.length < count) fallback.push("villager");
      return [{
        id: "basic",
        name: "基本構成",
        hint: this.buildSetupHint(fallback),
        roles: fallback
      }];
    }

    return [{
      id: "basic",
      name: "基本構成",
      hint: this.SETUP_HINTS[count] || this.buildSetupHint(basicRoles),
      roles: basicRoles.slice()
    }];
  },

  roleListToCounts: function (roles) {
    const counts = {};
    this.CUSTOM_ROLE_IDS.forEach(function (id) { counts[id] = 0; });
    roles.forEach(function (role) {
      if (role === "villager") return;
      if (counts[role] !== undefined) counts[role] += 1;
    });
    return counts;
  },

  defaultCustomRoleCounts: function (count) {
    const basic = this.getSetupPresets(count)[0];
    return this.roleListToCounts(basic.roles);
  },

  sumCustomCounts: function (counts) {
    let total = 0;
    this.CUSTOM_ROLE_IDS.forEach(function (role) {
      total += counts[role] || 0;
    });
    return total;
  },

  buildCustomRoles: function (count, counts) {
    const roles = [];
    this.CUSTOM_ROLE_IDS.forEach(function (role) {
      const n = counts[role] || 0;
      for (let i = 0; i < n; i++) roles.push(role);
    });
    const villagerCount = count - roles.length;
    if (villagerCount < 0) return null;
    for (let i = 0; i < villagerCount; i++) roles.push("villager");
    return roles;
  },

  buildCustomPreviewHint: function (count, counts) {
    const roles = this.buildCustomRoles(count, counts);
    if (!roles) return "人数に対して役職が多すぎます";
    return this.buildSetupHint(roles);
  },

  validateCustomSetup: function (count, counts) {
    const wolves = counts.wolf || 0;
    const shared = counts.shared || 0;
    const total = this.sumCustomCounts(counts);

    if (wolves < 1) return { ok: false, message: "人狼は1人以上必要です" };
    if (total > count) return { ok: false, message: "役職の合計が人数を超えています" };
    if (shared !== 0 && shared !== 2) return { ok: false, message: "共有者は0人か2人にしてください" };
    if (!this.buildCustomRoles(count, counts)) return { ok: false, message: "村人が0人以下になる構成です" };

    return { ok: true, message: "" };
  },

  getSetupPreset: function (count, setupId, gs) {
    if (setupId === "custom" && gs && gs.customRoles) {
      const roles = this.buildCustomRoles(count, gs.customRoles);
      if (!roles) return this.getSetupPresets(count)[0];
      return {
        id: "custom",
        name: "カスタム",
        hint: this.buildSetupHint(roles),
        roles: roles
      };
    }

    const presets = this.getSetupPresets(count);
    return presets.find(function (preset) { return preset.id === setupId; }) || presets[0];
  },

  selectSetup: function (room, setupId) {
    const gs = room.gameState;
    const count = room.players.length;

    if (setupId === "custom") {
      if (!gs.customRoles) gs.customRoles = this.defaultCustomRoleCounts(count);
      gs.selectedSetupId = "custom";
      gs.setupPreviewName = "カスタム";
      gs.setupPreviewHint = this.buildCustomPreviewHint(count, gs.customRoles);
      return room;
    }

    const preset = this.getSetupPreset(count, "basic", gs);
    gs.selectedSetupId = "basic";
    gs.setupPreviewHint = preset.hint;
    gs.setupPreviewName = preset.name;
    return room;
  },

  adjustCustomRole: function (room, role, delta) {
    const gs = room.gameState;
    const count = room.players.length;
    const rules = this.CUSTOM_ROLE_RULES[role];
    if (!rules) return room;

    if (!gs.customRoles) gs.customRoles = this.defaultCustomRoleCounts(count);
    const counts = Object.assign({}, gs.customRoles);
    let next = counts[role] || 0;

    if (role === "shared") {
      next = next >= 2 ? 0 : 2;
    } else {
      next = Math.max(rules.min, Math.min(rules.max, next + delta));
    }

    counts[role] = next;
    if (this.sumCustomCounts(counts) > count) return room;

    gs.customRoles = counts;
    gs.selectedSetupId = "custom";
    gs.setupPreviewName = "カスタム";
    gs.setupPreviewHint = this.buildCustomPreviewHint(count, counts);
    return room;
  },

  beginWithSetup: function (room) {
    const gs = room.gameState;
    const count = room.players.length;
    const setupId = gs.selectedSetupId || "basic";

    if (setupId === "custom") {
      const validation = this.validateCustomSetup(count, gs.customRoles || {});
      if (!validation.ok) return validation.message;
    }

    const preset = this.getSetupPreset(count, setupId, gs);
    const roles = shuffle(preset.roles.slice());
    const shuffledPlayers = shuffle(room.players);
    const roleMap = {};

    shuffledPlayers.forEach(function (p, i) {
      roleMap[p.id] = roles[i];
    });

    const sharedIds = [];
    Object.keys(roleMap).forEach(function (pid) {
      if (roleMap[pid] === "shared") sharedIds.push(pid);
    });

    gs.roles = roleMap;
    gs.sharedPair = sharedIds.length === 2 ? sharedIds : null;
    gs.setupHint = preset.hint;
    gs.setupName = preset.name;
    gs.phase = room.mode !== "local" ? "ready" : "reveal";
    gs.revealIndex = 0;
    gs.revealDone = false;
    gs.roleConfirmed = {};

    if (room.mode !== "local") {
      room.phase = "wolf_ready";
    } else {
      room.phase = "wolf_reveal";
    }

    return null;
  },

  assignRoles: function (count, setupId) {
    const preset = this.getSetupPreset(count, setupId || "basic", null);
    return shuffle(preset.roles.slice());
  },

  init: function (room) {
    const count = room.players.length;
    const defaultPreset = this.getSetupPreset(count, "basic");

    room.gameState = {
      roles: null,
      alive: room.players.map(function (p) { return p.id; }),
      sharedPair: null,
      day: 1,
      phase: "setup",
      selectedSetupId: "basic",
      customRoles: this.defaultCustomRoleCounts(count),
      setupPreviewHint: defaultPreset.hint,
      setupPreviewName: defaultPreset.name,
      revealIndex: 0,
      revealDone: false,
      roleConfirmed: {},
      nightTurnIndex: -1,
      voteTurnIndex: -1,
      discussionEndsAt: null,
      proceedReady: {},
      nightActions: {
        wolfTarget: null,
        seerTarget: null,
        seerResult: null,
        guardTarget: null
      },
      lastVictim: null,
      lastExecuted: null,
      lastMediumResult: null,
      mediumRevealDone: true,
      foxDivinedDeath: false,
      winner: null,
      votes: {},
      setupHint: null,
      setupName: null
    };

    room.phase = "wolf_setup";
    return room;
  },

  getAlivePlayers: function (room) {
    return room.players.filter(function (p) {
      return room.gameState.alive.includes(p.id);
    });
  },

  getWolves: function (room) {
    return this.getWolvesWithRoles(room, room.gameState.roles);
  },

  getWolvesWithRoles: function (room, roles) {
    const gs = room.gameState;
    const roleMap = roles || {};
    return room.players.filter(function (p) {
      return gs.alive.includes(p.id) && roleMap[p.id] === "wolf";
    });
  },

  getAliveMedium: function (room, roles) {
    return this.getAlivePlayers(room).find(function (p) {
      return roles[p.id] === "medium";
    }) || null;
  },

  needsMediumReveal: function (room, roles) {
    const gs = room.gameState;
    if (!gs.lastMediumResult) return false;
    return !!this.getAliveMedium(room, roles);
  },

  closeMediumReveal: function (room) {
    room.gameState.mediumRevealDone = true;
    return room;
  },

  renderMediumResultCard: function (room, gs) {
    const mediumTarget = room.players.find(function (p) {
      return p.id === gs.lastMediumResult.playerId;
    });
    const mediumText = gs.lastMediumResult.wasWolf ? "人狼でした" : "人狼ではありませんでした";
    return this.renderResultCard(
      "霊能結果（あなただけ）",
      '<p class="big-result">🔮 <strong>' + escapeHtml(mediumTarget ? mediumTarget.name : "？") + '</strong> は ' + mediumText + '</p>',
      "medium"
    );
  },

  getRoles: function (ctx) {
    const gs = ctx.room.gameState;
    if (gs && gs.revealedRoles) return gs.revealedRoles;
    if (ctx.hostSecrets && ctx.hostSecrets.roles) return ctx.hostSecrets.roles;
    if (gs && gs.roles) return gs.roles;
    return {};
  },

  removePlayer: function (room, playerId, roles) {
    const gs = room.gameState;
    if (!gs.alive.includes(playerId)) return room;
    gs.alive = gs.alive.filter(function (id) { return id !== playerId; });
    this.checkWin(room, roles);
    return room;
  },

  checkWin: function (room, roles) {
    const gs = room.gameState;
    const roleMap = roles || {};
    const alive = this.getAlivePlayers(room);

    if (alive.length === 1 && roleMap[alive[0].id] === "fox") {
      gs.winner = "fox";
      room.phase = "wolf_end";
      gs.revealedRoles = Object.assign({}, roleMap);
      return true;
    }

    const wolves = alive.filter(function (p) { return roleMap[p.id] === "wolf"; });
    const nonWolves = alive.filter(function (p) { return roleMap[p.id] !== "wolf"; });

    if (wolves.length === 0) {
      gs.winner = "villagers";
      room.phase = "wolf_end";
      gs.revealedRoles = Object.assign({}, roleMap);
      return true;
    }

    if (wolves.length === nonWolves.length) {
      gs.winner = "wolves";
      room.phase = "wolf_end";
      gs.revealedRoles = Object.assign({}, roleMap);
      return true;
    }

    return false;
  },

  confirmRole: function (room, playerId) {
    const gs = room.gameState;
    if (!gs.roleConfirmed) gs.roleConfirmed = {};
    gs.roleConfirmed[playerId] = true;
    return room;
  },

  allRolesConfirmed: function (room) {
    const confirmed = (room.gameState && room.gameState.roleConfirmed) || {};
    return room.players.every(function (p) {
      return confirmed[p.id];
    });
  },

  freshNightActions: function () {
    return { wolfTarget: null, seerTarget: null, seerResult: null, guardTarget: null };
  },

  NIGHT_ACTION_ROLES: ["wolf", "seer", "hunter"],

  DISCUSSION_MS: 3 * 60 * 1000,

  FIRST_NIGHT_SACRIFICE_NAME: "村長",

  isFirstNight: function (gs) {
    return gs.day === 1;
  },

  startNight: function (room, roles) {
    const gs = room.gameState;
    gs.phase = "night";
    gs.nightTurnIndex = -1;
    gs.nightActions = this.freshNightActions();
    gs.lastMediumResult = null;
    gs.mediumRevealDone = true;
    gs.discussionEndsAt = null;
    this.advanceNightTurn(room);
    room.phase = "wolf_night";
    return room;
  },

  getNightTurnPlayer: function (room) {
    const gs = room.gameState;
    const idx = gs.nightTurnIndex;
    if (idx < 0 || idx >= room.players.length) return null;
    const player = room.players[idx];
    if (!gs.alive.includes(player.id)) return null;
    return player;
  },

  getNightTurnLabel: function (room) {
    const gs = room.gameState;
    const alive = this.getAlivePlayers(room);
    const current = this.getNightTurnPlayer(room);
    if (!current) {
      return { current: alive.length, total: alive.length };
    }
    let pos = 0;
    for (let i = 0; i <= gs.nightTurnIndex; i++) {
      if (gs.alive.includes(room.players[i].id)) pos += 1;
    }
    return { current: pos, total: alive.length };
  },

  needsNightAction: function (role, gs) {
    if (role === "wolf") {
      if (this.isFirstNight(gs)) return false;
      if (!gs.nightActions.wolfTarget) return true;
      return false;
    }
    if (role === "seer" && !gs.nightActions.seerTarget) return true;
    if (role === "hunter" && !gs.nightActions.guardTarget) return true;
    return false;
  },

  canAdvanceNightTurn: function (room, roles) {
    const turnPlayer = this.getNightTurnPlayer(room);
    if (!turnPlayer) return true;
    return !this.needsNightAction(roles[turnPlayer.id], room.gameState);
  },

  advanceNightTurn: function (room) {
    const gs = room.gameState;
    for (let i = gs.nightTurnIndex + 1; i < room.players.length; i++) {
      if (gs.alive.includes(room.players[i].id)) {
        gs.nightTurnIndex = i;
        return room;
      }
    }
    gs.nightTurnIndex = room.players.length;
    return room;
  },

  allNightTurnsDone: function (room) {
    return room.gameState.nightTurnIndex >= room.players.length;
  },

  closeRoleReveal: function (room) {
    room.gameState.revealDone = true;
    return room;
  },

  nextReveal: function (room, roles) {
    const gs = room.gameState;
    if (!gs.revealDone) return room;
    gs.revealDone = false;
    if (gs.revealIndex < room.players.length - 1) {
      gs.revealIndex += 1;
    } else {
      this.startNight(room, roles);
    }
    return room;
  },

  setWolfTarget: function (room, targetId) {
    room.gameState.nightActions.wolfTarget = targetId;
    return room;
  },

  setGuardTarget: function (room, guardId, targetId) {
    if (guardId === targetId) return room;
    room.gameState.nightActions.guardTarget = targetId;
    return room;
  },

  divineRole: function (targetRole) {
    if (targetRole === "wolf" || targetRole === "wolf_boy") return "wolf";
    return "not_wolf";
  },

  seerResultText: function (result) {
    if (result === "wolf") return "人狼です";
    if (result === "fox") return "妖狐でした（死亡）";
    return "人狼ではありません";
  },

  formatSeerResult: function (room, gs, roles) {
    const target = room.players.find(function (p) {
      return p.id === gs.nightActions.seerTarget;
    });
    const name = target ? target.name : "？";
    const roleMap = roles && Object.keys(roles).length ? roles : gs.roles;
    let result = gs.nightActions.seerResult;
    if (!result && gs.nightActions.seerTarget && roleMap) {
      result = this.divineRole(roleMap[gs.nightActions.seerTarget]);
    }
    if (result === "wolf") {
      return escapeHtml(name) + "さんは<strong>人狼</strong>です";
    }
    if (result === "fox") {
      return escapeHtml(name) + "さんは妖狐でした（死亡）";
    }
    return escapeHtml(name) + "さんは<strong>人狼ではありません</strong>";
  },

  setSeerTarget: function (room, targetId, roles) {
    const gs = room.gameState;
    const roleMap = roles && Object.keys(roles).length ? roles : gs.roles;
    const targetRole = roleMap ? roleMap[targetId] : null;
    gs.nightActions.seerTarget = targetId;

    if (targetRole === "fox") {
      gs.nightActions.seerResult = "fox";
      gs.foxDivinedDeath = true;
      this.removePlayer(room, targetId, roleMap || roles);
      return room;
    }

    gs.nightActions.seerResult = this.divineRole(targetRole);
    return room;
  },

  nightReadyToResolve: function (room, roles) {
    const gs = room.gameState;
    const alive = this.getAlivePlayers(room);

    if (!this.isFirstNight(gs)) {
      if (alive.some(function (p) { return roles[p.id] === "wolf"; }) && !gs.nightActions.wolfTarget) {
        return false;
      }
    }
    if (alive.some(function (p) { return roles[p.id] === "seer"; }) && !gs.nightActions.seerTarget) {
      return false;
    }
    if (alive.some(function (p) { return roles[p.id] === "hunter"; }) && !gs.nightActions.guardTarget) {
      return false;
    }
    return true;
  },

  resolveNight: function (room, roles) {
    const gs = room.gameState;

    if (this.isFirstNight(gs)) {
      gs.computerSacrificeMorning = true;
      gs.lastVictim = null;
    } else {
      gs.computerSacrificeMorning = false;
      const target = gs.nightActions.wolfTarget;
      const guarded = gs.nightActions.guardTarget;

      if (target && gs.alive.includes(target) && target !== guarded) {
        if (roles[target] === "fox") {
          gs.lastVictim = null;
        } else {
          gs.lastVictim = target;
          this.removePlayer(room, target, roles);
          if (room.phase === "wolf_end") return room;
        }
      } else if (target && target === guarded) {
        gs.lastVictim = null;
      } else {
        gs.lastVictim = null;
      }
    }

    if (this.checkWin(room, roles)) return room;

    gs.phase = "morning";
    room.phase = "wolf_morning";
    return room;
  },

  startDayDiscussion: function (room) {
    const gs = room.gameState;
    gs.computerSacrificeMorning = false;
    gs.foxDivinedDeath = false;
    gs.phase = "day";
    gs.discussionEndsAt = Date.now() + this.DISCUSSION_MS;
    gs.proceedReady = {};
    room.phase = "wolf_day";
    return room;
  },

  startVoting: function (room) {
    const gs = room.gameState;
    gs.phase = "vote";
    gs.votes = {};
    gs.voteTurnIndex = -1;
    room = this.syncVoteTurn(room);
    room.phase = "wolf_vote";
    return room;
  },

  getFirstUnvotedAlive: function (room) {
    const gs = room.gameState;
    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i];
      if (gs.alive.includes(p.id) && !gs.votes[p.id]) {
        return { player: p, index: i };
      }
    }
    return null;
  },

  syncVoteTurn: function (room) {
    const gs = room.gameState;
    const next = this.getFirstUnvotedAlive(room);
    if (next) {
      gs.voteTurnIndex = next.index;
    } else {
      gs.voteTurnIndex = room.players.length;
    }
    return room;
  },

  getCurrentVotePlayer: function (room) {
    const gs = room.gameState;
    const next = this.getFirstUnvotedAlive(room);
    if (next) {
      if (gs.voteTurnIndex !== next.index) {
        gs.voteTurnIndex = next.index;
      }
      return next.player;
    }
    return null;
  },

  getVoteTurnPlayer: function (room) {
    return this.getCurrentVotePlayer(room);
  },

  getVoteTurnLabel: function (room) {
    const gs = room.gameState;
    const alive = this.getAlivePlayers(room);
    const current = this.getCurrentVotePlayer(room);
    if (!current) {
      return { current: alive.length, total: alive.length };
    }
    let pos = 0;
    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i];
      if (gs.alive.includes(p.id)) {
        pos += 1;
        if (p.id === current.id) {
          return { current: pos, total: alive.length };
        }
      }
    }
    return { current: 0, total: alive.length };
  },

  hasMoreVoteTurns: function (room) {
    const gs = room.gameState;
    const current = this.getCurrentVotePlayer(room);
    if (!current) return false;
    let found = false;
    for (let i = 0; i < room.players.length; i++) {
      const p = room.players[i];
      if (p.id === current.id) {
        found = true;
        continue;
      }
      if (found && gs.alive.includes(p.id) && !gs.votes[p.id]) {
        return true;
      }
    }
    return false;
  },

  castVote: function (room, voterId, targetId) {
    room.gameState.votes[voterId] = targetId;
    return room;
  },

  allVoted: function (room) {
    const alive = this.getAlivePlayers(room);
    const gs = room.gameState;
    return alive.every(function (p) { return gs.votes[p.id]; });
  },

  countVotesCast: function (room) {
    const gs = room.gameState;
    return this.getAlivePlayers(room).filter(function (p) { return gs.votes[p.id]; }).length;
  },

  hasVoteMajority: function (room) {
    const total = this.getAlivePlayers(room).length;
    if (!total) return false;
    return this.countVotesCast(room) > total / 2;
  },

  canResolveVote: function (room) {
    return this.allVoted(room) || this.hasVoteMajority(room);
  },

  countProceedReady: function (room) {
    const ready = room.gameState.proceedReady || {};
    return room.players.filter(function (p) { return ready[p.id]; }).length;
  },

  hasProceedMajority: function (room) {
    const total = room.players.length;
    if (!total) return false;
    return this.countProceedReady(room) > total / 2;
  },

  markProceedReady: function (room, playerId) {
    const gs = room.gameState;
    if (!gs.proceedReady) gs.proceedReady = {};
    gs.proceedReady[playerId] = true;
    return room;
  },

  renderProceedReadyPanel: function (room, me, action) {
    const gs = room.gameState;
    const ready = gs.proceedReady || {};
    const total = room.players.length;
    const count = this.countProceedReady(room);
    const majority = Math.floor(total / 2) + 1;
    const html = [];

    html.push('<section class="card"><h2>投票に進む</h2>');
    html.push('<p class="note">残り時間を待たず、過半数（' + majority + '人）が賛成すると投票に進みます。</p>');
    html.push('<ul class="player-list">');
    room.players.forEach(function (p) {
      html.push('<li>' + escapeHtml(p.name) + (ready[p.id] ? ' ✓' : '') + '</li>');
    });
    html.push('</ul>');
    html.push('<p class="note">' + count + '/' + total + '人が賛成</p>');

    if (!ready[me.id]) {
      html.push('<button type="button" class="btn btn-secondary btn-block" data-action="' + action + '">投票に進みたい</button>');
    } else {
      html.push('<p class="note">あなたは投票に進みたいに賛成済みです</p>');
    }
    html.push('</section>');
    return html.join("");
  },

  resolveVote: function (room, roles) {
    const gs = room.gameState;
    const tally = {};

    Object.values(gs.votes).forEach(function (id) {
      tally[id] = (tally[id] || 0) + 1;
    });

    let max = 0;
    let executed = null;
    let tie = false;

    Object.keys(tally).forEach(function (id) {
      if (tally[id] > max) {
        max = tally[id];
        executed = id;
        tie = false;
      } else if (tally[id] === max) {
        tie = true;
      }
    });

    gs.lastExecuted = null;
    gs.lastMediumResult = null;
    gs.mediumRevealDone = true;

    if (!tie && executed) {
      gs.lastExecuted = executed;
      gs.lastMediumResult = {
        playerId: executed,
        wasWolf: roles[executed] === "wolf"
      };
      if (this.getAliveMedium(room, roles)) {
        gs.mediumRevealDone = false;
      }
      this.removePlayer(room, executed, roles);
      if (room.phase === "wolf_end") return room;
    }

    gs.votes = {};
    gs.voteTurnIndex = -1;
    room.phase = "wolf_after_vote";
    return room;
  },

  continueToNight: function (room, roles) {
    const gs = room.gameState;
    gs.day += 1;
    return this.startNight(room, roles);
  },

  renderRoleExtras: function (ctx, playerId) {
    const roles = this.getRoles(ctx);
    const role = ctx.getRole(playerId);
    const gs = ctx.room.gameState;
    const html = [];

    if (role === "wolf") {
      const mates = ctx.isOnline && ctx.secrets && ctx.secrets.wolfMates
        ? ctx.getWolfMates()
        : this.getWolvesWithRoles(ctx.room, roles).filter(function (w) {
            return w.id !== playerId;
          });
      if (mates.length) {
        html.push('<p class="note">仲間：' + mates.map(function (m) {
          return escapeHtml(m.name);
        }).join("、") + '</p>');
      }
    }

    if (role === "fanatic") {
      const wolves = this.getWolvesWithRoles(ctx.room, roles);
      if (wolves.length) {
        html.push('<p class="note">人狼：' + wolves.map(function (m) {
          return escapeHtml(m.name);
        }).join("、") + '</p>');
      }
    }

    if (role === "shared" && gs.sharedPair) {
      const mateId = gs.sharedPair.find(function (id) { return id !== playerId; });
      const mate = ctx.room.players.find(function (p) { return p.id === mateId; });
      if (mate) {
        html.push('<p class="note">共有者の相棒：<strong>' + escapeHtml(mate.name) + '</strong>（お互い村人陣営）</p>');
      }
    }

    return html.join("");
  },

  renderGameGuide: function () {
    return (
      '<div class="jinrou-game-guide">' +

        '<div class="guide-toggle-wrap">' +
          '<button type="button" class="btn btn-primary guide-toggle-btn" data-guide-toggle="werewolf" aria-expanded="false">' +
            '説明を見る' +
          '</button>' +
          '<div class="guide-toggle-panel hidden" id="guide-werewolf">' +

            '<section class="jinrou-guide-section">' +
              '<h4 class="jinrou-guide-heading">勝利条件</h4>' +
              '<div class="jinrou-guide-win-grid">' +
                '<article class="jinrou-guide-win-card">' +
                  '<h5 class="jinrou-guide-win-title">🏘️ 村人陣営</h5>' +
                  '<p class="jinrou-guide-text">すべての人狼を追放すると勝利です。</p>' +
                '</article>' +
                '<article class="jinrou-guide-win-card">' +
                  '<h5 class="jinrou-guide-win-title">🐺 人狼陣営</h5>' +
                  '<p class="jinrou-guide-text">人狼の人数が村人陣営の人数と同じになった時点で勝利です。</p>' +
                '</article>' +
              '</div>' +
            '</section>' +

            '<section class="jinrou-guide-section">' +
              '<h4 class="jinrou-guide-heading">ゲームの流れ</h4>' +

              '<article class="jinrou-guide-phase">' +
                '<h5 class="jinrou-guide-phase-title">🌙 夜</h5>' +
                '<p class="jinrou-guide-text">夜になると、役職ごとに能力を使用します。</p>' +
                '<ul class="jinrou-guide-list">' +
                  '<li>人狼は襲撃するプレイヤーを1人選びます。</li>' +
                  '<li>占い師は1人を占います。</li>' +
                  '<li>狩人は1人を護衛します。</li>' +
                  '<li>その他の役職も、それぞれ能力を使用します。</li>' +
                '</ul>' +
                '<p class="jinrou-guide-text">全員の行動が終わると朝になります。</p>' +
              '</article>' +

              '<article class="jinrou-guide-phase">' +
                '<h5 class="jinrou-guide-phase-title">☀️ 朝</h5>' +
                '<p class="jinrou-guide-text">夜に襲撃されたプレイヤーがいる場合は、その結果が発表されます。</p>' +
                '<p class="jinrou-guide-text">その後、生存者全員で話し合いを行います。</p>' +
                '<ul class="jinrou-guide-list jinrou-guide-list--compact">' +
                  '<li>誰が怪しいのか</li>' +
                  '<li>発言に矛盾はないか</li>' +
                  '<li>誰を信じるのか</li>' +
                '</ul>' +
                '<p class="jinrou-guide-text">自由に議論しましょう。</p>' +
              '</article>' +

              '<article class="jinrou-guide-phase">' +
                '<h5 class="jinrou-guide-phase-title">🗳️ 投票</h5>' +
                '<p class="jinrou-guide-text">議論終了後、生存者全員が追放したいプレイヤーへ投票します。</p>' +
                '<p class="jinrou-guide-text">最も票が集まったプレイヤーが追放されます。</p>' +
                '<p class="jinrou-guide-text">同票の場合は再投票、またはルールに従って処理されます。</p>' +
                '<p class="jinrou-guide-text">追放後、再び夜になります。</p>' +
              '</article>' +
            '</section>' +

            '<section class="jinrou-guide-section">' +
              '<h4 class="jinrou-guide-heading">役職カード</h4>' +
              '<p class="jinrou-guide-text">ゲームで使える役職です。役職ごとに能力が異なります。</p>' +
              '<div class="jinrou-role-catalog-section">' +
                this.renderRoleCatalogGrid() +
              '</div>' +
            '</section>' +

          '</div>' +
        '</div>' +

      '</div>'
    );
  },

  renderRoleGuide: function (role) {
    const guide = this.ROLE_GUIDE[role];
    if (!guide) return "";

    return (
      '<div class="role-guide-block">' +
        '<p class="role-guide-label">できること</p>' +
        '<p class="role-guide-text">' + escapeHtml(guide.ability) + '</p>' +
        '<p class="role-guide-label">勝利条件</p>' +
        '<p class="role-guide-text">' + escapeHtml(guide.win) + '</p>' +
      '</div>'
    );
  },

  getPlayerSlot: function (room, playerId) {
    const idx = room.players.findIndex(function (p) { return p.id === playerId; });
    return idx < 0 ? 0 : idx + 1;
  },

  getRoleCardImageSrc: function (role) {
    if (!role) return this.ROLE_CARD_BACK_IMAGE;
    return this.ROLE_CARD_IMAGE_BASE + role + ".png";
  },

  renderRoleCatalogCard: function (role, options) {
    const opts = options || {};
    const name = this.roleNames[role] || "？";
    const tag = opts.wrapper === false ? "div" : "article";
    const cls = "jinrou-role-card jinrou-role-card--" + (role || "unknown") + (opts.reveal ? " jinrou-role-card--reveal" : "") + (opts.back ? " jinrou-role-card--back" : "");
    const src = opts.back ? this.ROLE_CARD_BACK_IMAGE : this.getRoleCardImageSrc(role);
    const alt = opts.back ? "役職カード（裏）" : escapeHtml(name) + "の役職カード";

    return (
      "<" + tag + ' class="' + cls + '">' +
        '<img class="jinrou-role-card-img" src="' + src + '" alt="' + alt + '" loading="lazy" decoding="async">' +
      "</" + tag + ">"
    );
  },

  renderRoleCatalogGrid: function (roleIds) {
    const ids = roleIds || this.PLAYABLE_ROLE_IDS;
    const self = this;
    return (
      '<div class="jinrou-role-catalog">' +
      ids.map(function (id) { return self.renderRoleCatalogCard(id); }).join("") +
      "</div>"
    );
  },

  renderRoleCardBack: function () {
    return this.renderRoleCatalogCard(null, { back: true, wrapper: false });
  },

  renderRoleCard: function (role) {
    return '<div class="game-card-stage">' + this.renderRoleCatalogCard(role, { reveal: true, wrapper: false }) + "</div>";
  },

  renderRoleCardFace: function (role) {
    return this.renderRoleCatalogCard(role, { reveal: true, wrapper: false });
  },

  renderRoleFlipScene: function (ctx, playerId, options) {
    const opts = options || {};
    const role = ctx.getRole(playerId);
    const html = [];

    html.push('<div class="role-reveal-wrap">');
    html.push('<div class="role-flip-scene">');
    html.push('<div class="role-flip-card" id="roleReveal">');
    html.push('<div class="role-flip-face role-flip-back">' + this.renderRoleCardBack() + '</div>');
    html.push('<div class="role-flip-face role-flip-front">' + this.renderRoleCardFace(role) + '</div>');
    html.push('</div></div>');
    html.push('<div class="role-extras-revealed">' + this.renderRoleExtras(ctx, playerId) + this.renderRoleGuide(role) + '</div>');
    html.push('<button type="button" class="btn btn-primary btn-block role-show-btn" data-action="wolf-show-role">' + (opts.showButtonLabel || "役職を見る") + '</button>');
    if (opts.showHideButton) {
      html.push('<button type="button" class="btn btn-secondary btn-block role-hide-btn" data-action="wolf-hide-role">画面を閉じる</button>');
    }
    html.push('</div>');
    return html.join("");
  },

  renderAlivePlayerStrip: function (room, gs, options) {
    const opts = options || {};
    const html = ['<div class="alive-strip">'];
    this.getAlivePlayers(room).forEach(function (p) {
      const voted = opts.showVotes && gs.votes && gs.votes[p.id];
      html.push(
        '<div class="player-card player-card--display' + (voted ? " player-card--voted" : "") + '">' +
          '<span class="player-card-slot">プレイヤー' + WerewolfGame.getPlayerSlot(room, p.id) + '</span>' +
          '<span class="player-card-name">' + escapeHtml(p.name) + '</span>' +
          (voted ? '<span class="player-card-sub">投票済</span>' : '') +
        '</div>'
      );
    });
    html.push('</div>');
    return html.join("");
  },

  renderPlayerCards: function (room, players, action, options) {
    const opts = options || {};
    const html = ['<div class="player-card-grid">'];
    players.forEach(function (p) {
      const slot = WerewolfGame.getPlayerSlot(room, p.id);
      html.push(
        '<button type="button" class="player-card" data-action="' + escapeHtml(action) + '" data-player="' + p.id + '">' +
          '<span class="player-card-slot">プレイヤー' + slot + '</span>' +
          '<span class="player-card-name">' + escapeHtml(p.name) + '</span>' +
          (opts.subtitle ? '<span class="player-card-sub">' + escapeHtml(opts.subtitle) + '</span>' : '') +
        '</button>'
      );
    });
    html.push('</div>');
    return html.join("");
  },

  renderRoleGuideSection: function (role) {
    const guide = this.ROLE_GUIDE[role];
    if (!guide) return "";

    const roleName = this.roleNames[role] || role;
    return (
      '<div class="role-guide-inline">' +
        '<button type="button" class="btn btn-secondary btn-block" data-action="wolf-show-role-guide">役職の説明を見る</button>' +
        '<div id="wolfRoleGuidePanel" class="hidden role-guide-block">' +
          '<p class="role-guide-label">役職</p>' +
          '<p class="role-guide-text"><strong>' + escapeHtml(roleName) + '</strong></p>' +
          '<p class="role-guide-label">能力</p>' +
          '<p class="role-guide-text">' + escapeHtml(guide.ability) + '</p>' +
          '<p class="role-guide-label">勝利条件</p>' +
          '<p class="role-guide-text">' + escapeHtml(guide.win) + '</p>' +
          '<button type="button" class="btn btn-secondary btn-block" style="margin-top:0.75rem" data-action="wolf-hide-role-guide">閉じる</button>' +
        '</div>' +
      '</div>'
    );
  },

  renderNightActionCard: function (room, turnPlayer, role, prompt, innerHtml) {
    const roleName = this.roleNames[role] || "？";
    const meta = this.ROLE_CARD_META[role] || { icon: "❓" };
    const slot = this.getPlayerSlot(room, turnPlayer.id);
    return (
      '<div class="night-action-card">' +
        '<div class="night-action-head">' +
          '<span class="night-action-icon">' + meta.icon + '</span>' +
          '<div>' +
            '<p class="night-action-player">' + escapeHtml(turnPlayer.name) + '（プレイヤー' + slot + '）</p>' +
            '<p class="night-action-role role-' + (role || "unknown") + '">' + escapeHtml(roleName) + '</p>' +
          '</div>' +
        '</div>' +
        '<p class="night-prompt">' + escapeHtml(prompt) + '</p>' +
        innerHtml +
        this.renderRoleGuideSection(role) +
      '</div>'
    );
  },

  renderResultCard: function (title, bodyHtml, tone) {
    const cls = tone ? " result-card--" + tone : "";
    return (
      '<div class="result-card' + cls + '">' +
        '<p class="result-card-title">' + escapeHtml(title) + '</p>' +
        '<div class="result-card-body">' + bodyHtml + '</div>' +
      '</div>'
    );
  },

  renderNightTurn: function (ctx, turnPlayer, roles) {
    const gs = ctx.room.gameState;
    const turnRole = roles[turnPlayer.id];
    const room = ctx.room;

    if (turnRole === "wolf") {
      if (this.isFirstNight(gs)) {
        return this.renderNightActionCard(
          room,
          turnPlayer,
          turnRole,
          "初日の襲撃",
          '<p class="note">初日は<strong>' + escapeHtml(this.FIRST_NIGHT_SACRIFICE_NAME) + '</strong>が襲撃の犠牲になります。</p>' +
          '<p class="note">参加者は襲撃されません。次の人へ渡してください。</p>'
        );
      }
      if (!gs.nightActions.wolfTarget) {
        const picks = this.renderPlayerCards(
          room,
          this.getAlivePlayers(room).filter(function (p) { return roles[p.id] !== "wolf"; }),
          "wolf-kill"
        );
        return this.renderNightActionCard(room, turnPlayer, turnRole, "誰を襲撃しますか？", picks);
      }
      const victim = room.players.find(function (p) { return p.id === gs.nightActions.wolfTarget; });
      return this.renderNightActionCard(
        room,
        turnPlayer,
        turnRole,
        "襲撃先",
        '<p class="note">襲撃先：<strong>' + escapeHtml(victim ? victim.name : "？") + '</strong></p>' +
        '<p class="note">襲撃は決まりました。次の人へ渡してください。</p>'
      );
    }

    if (turnRole === "seer") {
      if (!gs.nightActions.seerTarget) {
        const picks = this.renderPlayerCards(room, this.getAlivePlayers(room), "wolf-seer");
        return this.renderNightActionCard(room, turnPlayer, turnRole, "誰を占いますか？", picks);
      }
      return this.renderNightActionCard(
        room,
        turnPlayer,
        turnRole,
        "占い結果",
        '<p class="seer-result">' + this.formatSeerResult(room, gs, roles) + '</p>'
      );
    }

    if (turnRole === "hunter") {
      if (!gs.nightActions.guardTarget) {
        const picks = this.renderPlayerCards(
          room,
          this.getAlivePlayers(room).filter(function (p) { return p.id !== turnPlayer.id; }),
          "wolf-guard"
        );
        return this.renderNightActionCard(room, turnPlayer, turnRole, "誰を守りますか？", picks);
      }
      const guarded = room.players.find(function (p) { return p.id === gs.nightActions.guardTarget; });
      return this.renderNightActionCard(
        room,
        turnPlayer,
        turnRole,
        "護衛先",
        '<p class="note">護衛先：<strong>' + escapeHtml(guarded ? guarded.name : "？") + '</strong></p>'
      );
    }

    const meta = this.ROLE_CARD_META[turnRole] || { icon: "👤" };
    return (
      '<div class="night-action-card night-action-card--idle">' +
        '<div class="night-action-head">' +
          '<span class="night-action-icon">' + meta.icon + '</span>' +
          '<div>' +
            '<p class="night-action-player">' + escapeHtml(turnPlayer.name) + '（プレイヤー' + this.getPlayerSlot(room, turnPlayer.id) + '）</p>' +
            '<p class="night-action-role role-' + (turnRole || "villager") + '">' + escapeHtml(this.roleNames[turnRole] || "村人") + '</p>' +
          '</div>' +
        '</div>' +
        '<p class="night-prompt">やることはありません</p>' +
        '<p class="note">目を閉じたまま、スマホを次の人へ渡してください。</p>' +
        this.renderRoleGuideSection(turnRole) +
      '</div>'
    );
  },

  renderLocalVote: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const turnPlayer = this.getCurrentVotePlayer(room);
    const canManage = this.canManage(ctx);

    if (turnPlayer) {
      const slot = this.getPlayerSlot(room, turnPlayer.id);
      html.push('<section class="card secret-panel vote-card-panel">');
      html.push('<div class="vote-card-header">');
      html.push('<span class="vote-card-icon">⚖</span>');
      html.push('<div><p class="vote-card-player">' + escapeHtml(turnPlayer.name) + '（プレイヤー' + slot + '）さんの番</p>');
      html.push('<p class="vote-card-prompt">処刑する人を1人選んでください</p></div>');
      html.push('</div>');
      html.push(this.renderPlayerCards(
        room,
        this.getAlivePlayers(room).filter(function (p) { return p.id !== turnPlayer.id; }),
        "wolf-vote"
      ));
      html.push('</section>');
    }

    if (canManage && this.canResolveVote(room)) {
      html.push('<button class="btn btn-danger btn-block" data-action="wolf-resolve-vote">投票を集計して処刑へ</button>');
      if (!this.allVoted(room)) {
        html.push('<p class="note">過半数の投票が揃いました。未投票の人がいても集計できます。</p>');
      }
    } else if (canManage && !turnPlayer) {
      const voted = this.countVotesCast(room);
      const alive = this.getAlivePlayers(room).length;
      const majority = Math.floor(alive / 2) + 1;
      html.push('<p class="note">投票済み ' + voted + '/' + alive + '人（過半数 ' + majority + '人で集計可能）</p>');
    }

    html.push('<section class="card"><h2>生存者</h2>' + this.renderAlivePlayerStrip(room, gs, { showVotes: true }) + '</section>');
    return html.join("");
  },

  canManage: function (ctx) {
    return ctx.isHost || ctx.room.mode === "local";
  },

  normalizePhase: function (room) {
    const gs = room.gameState;
    if (!gs) return room;
    if (!gs.roleConfirmed) gs.roleConfirmed = {};
    if (!gs.alive) gs.alive = room.players.map(function (p) { return p.id; });
    if (!gs.proceedReady) gs.proceedReady = {};
    if (room.phase === "wolf_day" && gs.votes && Object.keys(gs.votes).length > 0) {
      room.phase = "wolf_vote";
      gs.phase = "vote";
    }
    if (room.phase === "wolf_night" && (gs.nightTurnIndex === undefined || gs.nightTurnIndex === null)) {
      gs.nightTurnIndex = -1;
      this.advanceNightTurn(room);
    }
    if (gs.mediumRevealDone === undefined) {
      gs.mediumRevealDone = !gs.lastMediumResult || !this.getAliveMedium(room, gs.roles || {});
    }
    if (room.phase === "wolf_setup" && !gs.customRoles) {
      gs.customRoles = this.defaultCustomRoleCounts(room.players.length);
    }
    return room;
  },

  syncLobbySetupPlayerCount: function (room) {
    if (!room.lobbyWerewolf) return room;
    const count = room.players.length;
    const lobby = room.lobbyWerewolf;
    if (this.sumCustomCounts(lobby.customRoles) > count) {
      lobby.customRoles = this.defaultCustomRoleCounts(count);
    }
    if (lobby.selectedSetupId === "custom") {
      lobby.setupPreviewHint = this.buildCustomPreviewHint(count, lobby.customRoles);
    }
    return room;
  },

  ensureLobbySetup: function (room) {
    const count = room.players.length;
    if (!room.lobbyWerewolf) {
      const basic = this.getSetupPresets(count)[0];
      room.lobbyWerewolf = {
        selectedSetupId: "basic",
        customRoles: this.defaultCustomRoleCounts(count),
        setupPreviewHint: basic.hint,
        setupPreviewName: "基本構成"
      };
    }
    return room.lobbyWerewolf;
  },

  selectLobbySetup: function (room, setupId) {
    const lobby = this.ensureLobbySetup(room);
    const count = room.players.length;

    if (setupId === "custom") {
      lobby.selectedSetupId = "custom";
      lobby.setupPreviewName = "カスタム";
      lobby.setupPreviewHint = this.buildCustomPreviewHint(count, lobby.customRoles);
      return room;
    }

    const preset = this.getSetupPreset(count, "basic", null);
    lobby.selectedSetupId = "basic";
    lobby.setupPreviewHint = preset.hint;
    lobby.setupPreviewName = "基本構成";
    return room;
  },

  adjustLobbyCustomRole: function (room, role, delta) {
    const lobby = this.ensureLobbySetup(room);
    const count = room.players.length;
    const rules = this.CUSTOM_ROLE_RULES[role];
    if (!rules) return room;

    const counts = Object.assign({}, lobby.customRoles);
    let next = counts[role] || 0;

    if (role === "shared") {
      next = next >= 2 ? 0 : 2;
    } else {
      next = Math.max(rules.min, Math.min(rules.max, next + delta));
    }

    counts[role] = next;
    if (this.sumCustomCounts(counts) > count) return room;

    lobby.customRoles = counts;
    lobby.selectedSetupId = "custom";
    lobby.setupPreviewName = "カスタム";
    lobby.setupPreviewHint = this.buildCustomPreviewHint(count, counts);
    return room;
  },

  applyLobbySetupToGameState: function (room) {
    const gs = room.gameState;
    const lobby = this.ensureLobbySetup(room);
    gs.selectedSetupId = lobby.selectedSetupId || "basic";
    gs.customRoles = Object.assign({}, lobby.customRoles);

    if (gs.selectedSetupId === "custom") {
      gs.setupPreviewName = "カスタム";
      gs.setupPreviewHint = this.buildCustomPreviewHint(room.players.length, gs.customRoles);
    } else {
      const preset = this.getSetupPreset(room.players.length, "basic", gs);
      gs.setupPreviewHint = preset.hint;
      gs.setupPreviewName = preset.name;
    }
    return room;
  },

  getLobbySetupView: function (room) {
    if (room.lobbyWerewolf) return room.lobbyWerewolf;
    const count = room.players.length;
    const basic = this.getSetupPresets(count)[0];
    return {
      selectedSetupId: "basic",
      customRoles: this.defaultCustomRoleCounts(count),
      setupPreviewHint: basic.hint,
      setupPreviewName: "基本構成"
    };
  },

  renderLobbySetup: function (room, canManage) {
    if (canManage) {
      this.ensureLobbySetup(room);
    }
    const lobby = canManage ? room.lobbyWerewolf : this.getLobbySetupView(room);
    const count = room.players.length;
    const basic = this.getSetupPresets(count)[0];
    const selectedId = lobby.selectedSetupId || "basic";
    const customCounts = lobby.customRoles;
    const customTotal = this.sumCustomCounts(customCounts);
    const villagerCount = count - customTotal;
    const customValid = this.validateCustomSetup(count, customCounts).ok;
    const html = ['<section class="card setup-panel lobby-setup-panel">'];
    const self = this;

    html.push('<h2>役職構成</h2>');
    html.push('<p class="section-lead">ゲーム開始前に構成を選んでください</p>');
    html.push('<div class="setup-options">');

    [
      { id: "basic", name: "基本構成", hint: basic.hint },
      { id: "custom", name: "カスタム", hint: selectedId === "custom" ? lobby.setupPreviewHint : "人狼の数や役職を自分で設定" }
    ].forEach(function (option) {
      const selected = option.id === selectedId;
      if (canManage) {
        html.push(
          '<button type="button" class="setup-option' + (selected ? " is-selected" : "") + '" data-action="wolf-lobby-select-setup" data-setup="' + escapeHtml(option.id) + '">' +
            '<span class="setup-option-name">' + escapeHtml(option.name) + '</span>' +
            '<span class="setup-option-hint">' + escapeHtml(option.hint) + '</span>' +
          '</button>'
        );
      } else {
        html.push(
          '<div class="setup-option setup-option--readonly' + (selected ? " is-selected" : "") + '">' +
            '<span class="setup-option-name">' + escapeHtml(option.name) + '</span>' +
            '<span class="setup-option-hint">' + escapeHtml(option.hint) + '</span>' +
          '</div>'
        );
      }
    });

    html.push('</div>');

    if (selectedId === "custom" && canManage) {
      html.push('<div class="custom-role-panel">');
      html.push('<p class="custom-role-title">役職の人数</p>');
      html.push('<div class="custom-role-grid">');

      this.CUSTOM_ROLE_IDS.forEach(function (role) {
        const rules = self.CUSTOM_ROLE_RULES[role];
        const value = customCounts[role] || 0;
        const meta = self.ROLE_CARD_META[role] || { icon: "❓" };
        const atMin = role === "shared" ? value === 0 : value <= rules.min;
        const atMax = role === "shared"
          ? value >= 2
          : value >= rules.max || customTotal >= count;

        html.push('<div class="custom-role-row">');
        html.push('<div class="custom-role-label"><span class="custom-role-icon">' + meta.icon + '</span><span>' + escapeHtml(self.roleNames[role]) + '</span></div>');
        html.push('<div class="custom-role-controls">');
        html.push('<button type="button" class="btn btn-secondary custom-role-btn" data-action="wolf-lobby-custom-role" data-role="' + role + '" data-delta="-1" ' + (atMin ? "disabled" : "") + '>−</button>');
        html.push('<span class="custom-role-value">' + value + '</span>');
        html.push('<button type="button" class="btn btn-secondary custom-role-btn" data-action="wolf-lobby-custom-role" data-role="' + role + '" data-delta="1" ' + (atMax ? "disabled" : "") + '>＋</button>');
        html.push('</div></div>');
      });

      html.push('</div>');
      html.push('<p class="custom-role-summary">村人' + Math.max(0, villagerCount) + '人（自動） · 合計 ' + count + '人</p>');
      if (!customValid) {
        html.push('<p class="note custom-role-error">' + escapeHtml(this.validateCustomSetup(count, customCounts).message) + '</p>');
      }
      html.push('</div>');
    }

    if (!canManage) {
      html.push('<p class="note" style="margin-top:1rem">ホストが構成を選ぶのを待っています…</p>');
    }

    html.push('</section>');
    return html.join("");
  },

  renderPhaseBanner: function (title, room, gs, subtitle) {
    const html = ['<div class="phase-banner"><h2>' + title + '</h2>'];
    if (gs.setupHint) {
      html.push('<p class="phase-meta">' + room.players.length + '人 · ' + escapeHtml(gs.setupHint) + '</p>');
    } else {
      html.push('<p class="phase-meta">' + room.players.length + '人</p>');
    }
    if (subtitle) {
      html.push('<p class="phase-subtitle">' + escapeHtml(subtitle) + '</p>');
    }
    html.push('</div>');
    return html.join("");
  },

  renderSetupOptions: function (room, gs, canManage) {
    const count = room.players.length;
    const basic = this.getSetupPresets(count)[0];
    const selectedId = gs.selectedSetupId || "basic";
    const customCounts = gs.customRoles || this.defaultCustomRoleCounts(count);
    const customTotal = this.sumCustomCounts(customCounts);
    const villagerCount = count - customTotal;
    const customValid = this.validateCustomSetup(count, customCounts).ok;
    const html = ['<section class="card setup-panel">'];
    const self = this;

    html.push('<h2>役職構成を選ぶ</h2>');
    html.push('<p class="section-lead">' + count + '人プレイ用の構成です。始める前に選んでください。</p>');
    html.push('<div class="setup-options">');

    [
      { id: "basic", name: "基本構成", hint: basic.hint },
      { id: "custom", name: "カスタム", hint: selectedId === "custom" ? gs.setupPreviewHint : "人狼の数や役職を自分で設定" }
    ].forEach(function (option) {
      const selected = option.id === selectedId;
      if (canManage) {
        html.push(
          '<button type="button" class="setup-option' + (selected ? " is-selected" : "") + '" data-action="wolf-select-setup" data-setup="' + escapeHtml(option.id) + '">' +
            '<span class="setup-option-name">' + escapeHtml(option.name) + '</span>' +
            '<span class="setup-option-hint">' + escapeHtml(option.hint) + '</span>' +
          '</button>'
        );
      } else {
        html.push(
          '<div class="setup-option setup-option--readonly' + (selected ? " is-selected" : "") + '">' +
            '<span class="setup-option-name">' + escapeHtml(option.name) + '</span>' +
            '<span class="setup-option-hint">' + escapeHtml(option.hint) + '</span>' +
          '</div>'
        );
      }
    });

    html.push('</div>');

    if (selectedId === "custom") {
      html.push('<div class="custom-role-panel">');
      html.push('<p class="custom-role-title">役職の人数</p>');
      html.push('<div class="custom-role-grid">');

      this.CUSTOM_ROLE_IDS.forEach(function (role) {
        const rules = self.CUSTOM_ROLE_RULES[role];
        const value = customCounts[role] || 0;
        const meta = self.ROLE_CARD_META[role] || { icon: "❓" };
        const atMin = role === "shared" ? value === 0 : value <= rules.min;
        const atMax = role === "shared"
          ? value >= 2
          : value >= rules.max || customTotal >= count;

        html.push('<div class="custom-role-row">');
        html.push('<div class="custom-role-label"><span class="custom-role-icon">' + meta.icon + '</span><span>' + escapeHtml(self.roleNames[role]) + '</span></div>');

        if (canManage) {
          html.push('<div class="custom-role-controls">');
          html.push('<button type="button" class="btn btn-secondary custom-role-btn" data-action="wolf-custom-role" data-role="' + role + '" data-delta="-1" ' + (atMin ? "disabled" : "") + '>−</button>');
          html.push('<span class="custom-role-value">' + value + '</span>');
          html.push('<button type="button" class="btn btn-secondary custom-role-btn" data-action="wolf-custom-role" data-role="' + role + '" data-delta="1" ' + (atMax ? "disabled" : "") + '>＋</button>');
          html.push('</div>');
        } else {
          html.push('<span class="custom-role-value">' + value + '</span>');
        }

        html.push('</div>');
      });

      html.push('</div>');
      html.push('<p class="custom-role-summary">村人' + Math.max(0, villagerCount) + '人（自動） · 合計 ' + count + '人</p>');
      if (!customValid) {
        html.push('<p class="note custom-role-error">' + escapeHtml(this.validateCustomSetup(count, customCounts).message) + '</p>');
      }
      html.push('</div>');
    }

    if (canManage) {
      const startLabel = selectedId === "custom" ? "カスタム構成でゲームを始める" : "基本構成でゲームを始める";
      const disabled = selectedId === "custom" && !customValid;
      html.push('<button type="button" class="btn btn-primary btn-block" style="margin-top:1rem" data-action="wolf-begin-setup" ' + (disabled ? "disabled" : "") + '>');
      html.push(startLabel);
      html.push('</button>');
    } else {
      html.push('<p class="note" style="margin-top:1rem">ホストが構成を選ぶのを待っています…</p>');
    }

    html.push('</section>');
    return html.join("");
  },

  render: function (ctx) {
    const room = ctx.room;
    const me = ctx.me;
    this.normalizePhase(room);
    const gs = room.gameState;
    const html = [];
    const myRole = ctx.getRole(me.id);
    const roles = this.getRoles(ctx);
    const canManage = this.canManage(ctx);

    if (room.phase === "wolf_setup") {
      html.push(this.renderPhaseBanner(
        "役職構成",
        room,
        { setupHint: gs.setupPreviewHint },
        "ゲーム開始前に役職の組み合わせを選びます"
      ));
      html.push(this.renderSetupOptions(room, gs, canManage));
      return html.join("");
    }

    if (room.phase === "wolf_ready") {
      html.push(this.renderPhaseBanner("役職確認", room, gs, "自分の端末で役職を確認してください"));
      html.push('<section class="card secret-panel role-reveal-panel">');
      html.push(this.renderRoleFlipScene(ctx, me.id, { showButtonLabel: "自分の役職を見る" }));

      const confirmed = gs.roleConfirmed || {};
      if (!confirmed[me.id]) {
        html.push('<button type="button" class="btn btn-success btn-block" style="margin-top:1rem" data-action="wolf-confirm-role">役職を確認した</button>');
      } else {
        html.push('<p class="note" style="margin-top:1rem">確認済み ✓</p>');
      }
      html.push('</section>');

      if (canManage) {
        const allDone = this.allRolesConfirmed(room);
        html.push('<button type="button" class="btn btn-primary btn-block" data-action="wolf-start-night" ' + (allDone ? "" : "disabled") + '>夜へ進む</button>');
        if (!allDone) html.push('<p class="note">全員の確認を待っています</p>');
      }
      return html.join("");
    }

    if (room.phase === "wolf_reveal") {
      const target = room.players[gs.revealIndex];
      const slot = this.getPlayerSlot(room, target.id);
      html.push(this.renderPhaseBanner(
        "役職確認 " + (gs.revealIndex + 1) + "/" + room.players.length,
        room,
        gs,
        "1人ずつスマホを見て、見終わったら画面を閉じて隣へ渡してください"
      ));
      html.push('<section class="card secret-panel role-reveal-panel">');
      html.push('<p class="role-reveal-player"><strong>' + escapeHtml(target.name) + '（プレイヤー' + slot + '）</strong> さんの役職</p>');
      html.push(this.renderRoleFlipScene(ctx, target.id, { showHideButton: true }));
      if (canManage) {
        const canNext = gs.revealDone;
        html.push('<button type="button" class="btn btn-success btn-block" style="margin-top:1rem" data-action="wolf-next-reveal" ' + (canNext ? "" : "disabled") + '>次の人へ</button>');
        if (!canNext) html.push('<p class="note">画面を閉じてから次へ進んでください</p>');
      }
      html.push('</section>');
      return html.join("");
    }

    if (room.phase === "wolf_night") {
      const isLocal = room.mode === "local";
      const turnPlayer = isLocal ? this.getNightTurnPlayer(room) : null;
      const nightLabel = isLocal ? this.getNightTurnLabel(room) : null;

      html.push(this.renderPhaseBanner(
        "夜 " + gs.day + (isLocal && nightLabel ? " — " + nightLabel.current + "/" + nightLabel.total + "人目" : ""),
        room,
        gs,
        this.isFirstNight(gs)
          ? "初日は" + this.FIRST_NIGHT_SACRIFICE_NAME + "が襲撃の犠牲になります（参加者は無事）"
          : (isLocal ? "全員目を閉じて、プレイヤー1から順にスマホを回してください" : "該当役職の人だけ操作してください")
      ));

      if (isLocal) {
        html.push('<section class="card secret-panel">');

        if (turnPlayer) {
          html.push('<p class="note">' + escapeHtml(turnPlayer.name) + ' さんにスマホを渡してください</p>');
          html.push(this.renderNightTurn(ctx, turnPlayer, roles));
        } else {
          html.push('<p class="note">全員の番が終わりました</p>');
        }
        html.push('</section>');

        if (canManage) {
          const ready = this.nightReadyToResolve(room, roles);
          if (turnPlayer && this.canAdvanceNightTurn(room, roles)) {
            html.push('<button class="btn btn-success btn-block" data-action="wolf-next-night-turn">次の人へ</button>');
          } else if (turnPlayer) {
            html.push('<p class="note">行動を完了してから「次の人へ」を押してください</p>');
          }
          html.push('<button class="btn btn-primary btn-block" style="margin-top:0.75rem" data-action="wolf-resolve-night" ' + (ready ? "" : "disabled") + '>朝へ進む</button>');
          if (!ready) {
            html.push('<p class="note">' + (this.isFirstNight(gs)
              ? "占い師・狩人の行動が終わるまでお待ちください"
              : "人狼・占い師・狩人の行動が終わるまでお待ちください") + '</p>');
          }
        }
        return html.join("");
      }

      if (myRole === "wolf" && gs.alive.includes(me.id)) {
        if (this.isFirstNight(gs)) {
          html.push('<section class="card secret-panel">' + this.renderNightActionCard(
            room,
            me,
            "wolf",
            "初日の襲撃",
            '<p class="note">初日は<strong>' + escapeHtml(this.FIRST_NIGHT_SACRIFICE_NAME) + '</strong>が襲撃の犠牲になります。</p>' +
            '<p class="note">参加者は襲撃されません。</p>'
          ) + '</section>');
        } else if (!gs.nightActions.wolfTarget) {
          const picks = this.renderPlayerCards(
            room,
            this.getAlivePlayers(room).filter(function (p) { return roles[p.id] !== "wolf"; }),
            "wolf-kill"
          );
          html.push('<section class="card secret-panel">' + this.renderNightActionCard(room, me, "wolf", "誰を襲撃しますか？", picks) + '</section>');
        }
      }
      if (myRole === "seer" && gs.alive.includes(me.id) && !gs.nightActions.seerTarget) {
        const picks = this.renderPlayerCards(
          room,
          this.getAlivePlayers(room).filter(function (p) { return p.id !== me.id; }),
          "wolf-seer"
        );
        html.push('<section class="card secret-panel">' + this.renderNightActionCard(room, me, "seer", "誰を占いますか？", picks) + '</section>');
      } else if (myRole === "seer" && gs.nightActions.seerTarget) {
        html.push('<section class="card secret-panel">' + this.renderNightActionCard(room, me, "seer", "占い結果", '<p class="seer-result">' + this.formatSeerResult(room, gs, roles) + '</p>') + '</section>');
      }
      if (myRole === "hunter" && gs.alive.includes(me.id) && !gs.nightActions.guardTarget) {
        const picks = this.renderPlayerCards(
          room,
          this.getAlivePlayers(room).filter(function (p) { return p.id !== me.id; }),
          "wolf-guard"
        );
        html.push('<section class="card secret-panel">' + this.renderNightActionCard(room, me, "hunter", "誰を守りますか？", picks) + '</section>');
      }
      if (myRole !== "wolf" && myRole !== "seer" && myRole !== "hunter") {
        html.push('<section class="card secret-panel"><div class="night-action-card night-action-card--idle"><p class="night-prompt">目を閉じてお待ちください…</p>' + this.renderRoleGuideSection(myRole) + '</div></section>');
      }

      if (canManage) {
        const ready = this.nightReadyToResolve(room, roles);
        html.push('<button class="btn btn-primary" style="margin-top:0.75rem" data-action="wolf-resolve-night" ' + (ready ? "" : "disabled") + '>朝に進む</button>');
        if (!ready) {
          html.push('<p class="note">' + (this.isFirstNight(gs)
            ? "占い師・狩人の行動が終わるまでお待ちください"
            : "人狼・占い師・狩人の行動が終わるまでお待ちください") + '</p>');
        }
      }
      return html.join("");
    }

    if (room.phase === "wolf_morning") {
      html.push(this.renderPhaseBanner("朝 " + gs.day, room, gs));

      if (gs.foxDivinedDeath) {
        html.push(this.renderResultCard(
          "昨晩の出来事",
          '<p class="big-result">昨夜、妖狐が占われて死亡しました</p>',
          "danger"
        ));
      }

      if (gs.computerSacrificeMorning) {
        html.push(this.renderResultCard(
          "昨夜の襲撃",
          '<p class="big-result">昨夜、<strong>' + escapeHtml(this.FIRST_NIGHT_SACRIFICE_NAME) + '</strong>が襲撃されました</p>' +
          '<p class="note">参加者は全員無事です</p>',
          "safe"
        ));
      } else if (gs.lastVictim) {
        const v = room.players.find(function (p) { return p.id === gs.lastVictim; });
        html.push(this.renderResultCard(
          "昨夜の襲撃",
          '<p class="big-result">昨夜、<strong>' + escapeHtml(v ? v.name : "？") + '</strong>さんが襲撃されました</p>',
          "danger"
        ));
      } else {
        html.push(this.renderResultCard("昨夜の襲撃", '<p class="big-result">誰も死亡しませんでした</p>', "safe"));
      }

      html.push('<section class="card"><h2>生存者</h2>' + this.renderAlivePlayerStrip(room, gs) + '</section>');

      if (canManage) {
        html.push('<button type="button" class="btn btn-primary btn-block" data-action="wolf-start-day">昼へ進む</button>');
      } else {
        html.push('<p class="note">昼へ進むのを待っています…</p>');
      }
      return html.join("");
    }

    if (room.phase === "wolf_after_vote") {
      html.push(this.renderPhaseBanner("処刑結果", room, gs));

      if (gs.lastExecuted) {
        const executed = room.players.find(function (p) { return p.id === gs.lastExecuted; });
        html.push(this.renderResultCard(
          "処刑",
          '<p class="big-result"><strong>' + escapeHtml(executed ? executed.name : "？") + '</strong>さんが処刑されました</p>',
          "danger"
        ));
      } else {
        html.push(this.renderResultCard("処刑", '<p class="big-result">同票のため、処刑されませんでした</p>', "neutral"));
      }

      if (gs.lastMediumResult) {
        const mediumPlayer = this.getAliveMedium(room, roles);
        if (room.mode !== "local") {
          if (myRole === "medium" && gs.alive.includes(me.id)) {
            html.push(this.renderMediumResultCard(room, gs));
          }
        } else if (mediumPlayer) {
          const slot = this.getPlayerSlot(room, mediumPlayer.id);
          html.push('<section class="card secret-panel">');
          html.push('<p class="note">霊能者の <strong>' + escapeHtml(mediumPlayer.name) + '（プレイヤー' + slot + '）</strong> さんにスマホを渡してください</p>');
          if (!gs.mediumRevealDone) {
            html.push('<button type="button" class="btn btn-primary btn-block" data-action="wolf-show-medium-result">霊能結果を見る</button>');
            html.push('<div id="mediumReveal" class="hidden">');
            html.push(this.renderMediumResultCard(room, gs));
            html.push('<button type="button" class="btn btn-secondary btn-block" style="margin-top:0.75rem" data-action="wolf-hide-medium-result">閉じる</button>');
            html.push('</div>');
          } else {
            html.push('<p class="note">霊能者が結果を確認しました ✓</p>');
          }
          html.push('</section>');
        }
      }

      html.push('<section class="card"><h2>生存者</h2>' + this.renderAlivePlayerStrip(room, gs) + '</section>');

      if (room.phase !== "wolf_end" && canManage) {
        const waitMedium = room.mode === "local" && this.needsMediumReveal(room, roles) && !gs.mediumRevealDone;
        html.push('<button type="button" class="btn btn-primary btn-block" data-action="wolf-continue-night" ' + (waitMedium ? "disabled" : "") + '>夜へ進む</button>');
        if (waitMedium) html.push('<p class="note">霊能者が結果を確認するまでお待ちください</p>');
      } else if (room.phase !== "wolf_end") {
        html.push('<p class="note">夜へ進むのを待っています…</p>');
      }
      return html.join("");
    }

    if (room.phase === "wolf_day") {
      html.push(this.renderPhaseBanner("昼 " + gs.day + " — 議論", room, gs, "みんなで議論してください（制限時間3分）"));

      html.push('<section class="card discussion-panel">');
      html.push('<p class="discussion-timer-label">残り時間</p>');
      html.push('<p class="discussion-timer" id="discussionTimer">3:00</p>');
      html.push('</section>');

      html.push('<section class="card"><h2>生存者</h2>' + this.renderAlivePlayerStrip(room, gs) + '</section>');

      if (me) {
        html.push(this.renderProceedReadyPanel(room, me, "wolf-proceed-ready"));
      }

      if (canManage) {
        html.push('<button type="button" class="btn btn-primary btn-block" data-action="wolf-start-vote">投票を始める</button>');
        html.push('<p class="note">ホストはいつでも投票を始められます（残り時間を待つ必要はありません）</p>');
      } else {
        html.push('<p class="note">過半数が賛成するか、ホストが投票を始めるのを待っています…</p>');
      }
      return html.join("");
    }

    if (room.phase === "wolf_vote") {
      const isLocal = room.mode === "local";
      const label = this.getVoteTurnLabel(room);

      html.push(this.renderPhaseBanner(
        "投票 " + label.current + "/" + label.total,
        room,
        gs,
        "スマホを順番に回して投票してください"
      ));

      if (isLocal) {
        html.push(this.renderLocalVote(ctx));
        return html.join("");
      }

      html.push('<section class="card"><h2>生存者</h2>' + this.renderAlivePlayerStrip(room, gs, { showVotes: true }) + '</section>');

      if (gs.alive.includes(me.id) && !gs.votes[me.id]) {
        html.push('<section class="card secret-panel vote-card-panel">');
        html.push('<div class="vote-card-header">');
        html.push('<span class="vote-card-icon">⚖</span>');
        html.push('<div><p class="vote-card-player">' + escapeHtml(me.name) + ' さんの投票</p>');
        html.push('<p class="vote-card-prompt">処刑する人を1人選んでください</p></div>');
        html.push('</div>');
        html.push(this.renderPlayerCards(
          room,
          this.getAlivePlayers(room).filter(function (p) { return p.id !== me.id; }),
          "wolf-vote"
        ));
        html.push('</section>');
      }

      if (canManage && this.canResolveVote(room)) {
        html.push('<button type="button" class="btn btn-danger btn-block" data-action="wolf-resolve-vote">投票を集計して処刑へ</button>');
        if (!this.allVoted(room)) {
          html.push('<p class="note">過半数の投票が揃いました。未投票の人がいても集計できます。</p>');
        }
      } else if (canManage) {
        const voted = this.countVotesCast(room);
        const alive = this.getAlivePlayers(room).length;
        const majority = Math.floor(alive / 2) + 1;
        html.push('<p class="note">投票済み ' + voted + '/' + alive + '人（過半数 ' + majority + '人で集計可能）</p>');
      }
      return html.join("");
    }

    if (room.phase === "wolf_end") {
      let winText = "村人陣営の勝利！人狼を全員追い出しました";
      let winTone = "safe";
      if (gs.winner === "wolves") {
        winText = "人狼陣営の勝利！人狼とそれ以外が同数になりました";
        winTone = "danger";
      } else if (gs.winner === "fox") {
        winText = "妖狐の単独勝利！最後まで生き残りました";
        winTone = "medium";
      }

      html.push(this.renderPhaseBanner("ゲーム終了", room, gs, winText));
      html.push(this.renderResultCard("勝利", '<p class="big-result">' + escapeHtml(winText) + '</p>', winTone));

      const endRoles = this.getRoles(ctx);
      html.push('<section class="card"><h2>役職一覧</h2><div class="end-role-grid">');
      room.players.forEach(function (p) {
        const role = endRoles[p.id];
        const meta = WerewolfGame.ROLE_CARD_META[role] || { icon: "❓" };
        html.push(
          '<div class="end-role-item">' +
            '<div class="end-role-player">' + escapeHtml(p.name) + '（プレイヤー' + WerewolfGame.getPlayerSlot(room, p.id) + '）</div>' +
            '<div class="mini-role-card role-card--' + (role || "unknown") + '">' +
              '<span class="mini-role-icon">' + meta.icon + '</span>' +
              '<span class="mini-role-name role-' + (role || "unknown") + '">' + escapeHtml(WerewolfGame.roleNames[role] || "？") + '</span>' +
            '</div>' +
          '</div>'
        );
      });
      html.push('</div></section>');
      if (canManage) {
        html.push('<button type="button" class="btn btn-primary btn-block" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    return "";
  }
};

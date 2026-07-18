/**
 * ルーム画面メイン（ローカル / オンライン）
 */

const GAMES = GameRegistry.getLiveModules();

function getGameModule(gameId) {
  return GAMES[gameId] || GameRegistry.getModule(gameId);
}

const app = document.getElementById("app");
const roomCode = (getQueryParam("code") || sessionStorage.getItem("partyGames_roomCode") || "").toUpperCase();
const mode = getQueryParam("mode") || localStorage.getItem("partyGames_mode") || sessionStorage.getItem("partyGames_roomMode") || (roomCode ? "room" : "local");
let playerId = getQueryParam("player");

let room = null;
let playerSecret = null;
let hostSecrets = null;
let pollTimer = null;
let roomActionLock = false;
let pendingRoomUpdate = null;
let discussionTimerId = null;
let drawTurnTimerId = null;
let drawTurnAutoSubmitPending = false;
let lobbyAutoSyncTimer = null;
let lastSyncError = null;
let lastServerPhase = null;
let lastServerGame = null;
let lobbyAutoSyncActive = false;
let syncRequestId = 0;
let syncChain = Promise.resolve();
let recoverRedirected = false;

function clearDiscussionTimer() {
  if (discussionTimerId) {
    clearInterval(discussionTimerId);
    discussionTimerId = null;
  }
}

function startDiscussionTimer(endsAt) {
  clearDiscussionTimer();
  const el = document.getElementById("discussionTimer");
  if (!el) return;

  function tick() {
    const left = Math.max(0, endsAt - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    el.textContent = m + ":" + String(s).padStart(2, "0");
    if (left <= 0) clearDiscussionTimer();
  }

  tick();
  discussionTimerId = setInterval(tick, 1000);
}

function clearDrawTurnTimer() {
  if (drawTurnTimerId) {
    clearInterval(drawTurnTimerId);
    drawTurnTimerId = null;
  }
}

function startDrawTurnTimer(endsAt, ctx) {
  clearDrawTurnTimer();
  drawTurnAutoSubmitPending = false;
  const el = document.getElementById("dwDrawTimer");
  if (!el || !endsAt) return;

  function tick() {
    const left = Math.max(0, endsAt - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    el.textContent = m + ":" + String(s).padStart(2, "0");
    if (el.classList) {
      el.classList.toggle("is-urgent", left > 0 && left <= 15000);
    }
    if (left > 0 || drawTurnAutoSubmitPending) return;
    drawTurnAutoSubmitPending = true;
    clearDrawTurnTimer();
    if (!room || room.game !== "drawing_werewolf" || room.phase !== "draw_werewolf_draw") return;
    const drawer = DrawingWerewolfGame.getCurrentDrawer(room);
    if (!drawer) return;
    const canAuto =
      room.mode === "local" ||
      (ctx && ctx.me && ctx.me.id === drawer.id);
    if (!canAuto) {
      drawTurnAutoSubmitPending = false;
      return;
    }
    showToast("時間切れ！次の人へ進みます");
    handleAction("dw-submit-draw", { auto: "1" }, ctx).catch(function (err) {
      drawTurnAutoSubmitPending = false;
      showToast(err.message || "自動進行に失敗しました");
    });
  }

  tick();
  drawTurnTimerId = setInterval(tick, 250);
}

function getLobbyPlayerRange() {
  const prefGameId = getQueryParam("game");
  const prefMeta = prefGameId ? GameRegistry.get(prefGameId) : null;

  let min = 99;
  let max = 2;
  GameRegistry.live().forEach(function (g) {
    if (g.minPlayers < min) min = g.minPlayers;
    if (g.maxPlayers > max) max = g.maxPlayers;
  });

  let hint = formatPlayerRange(min, max) + "で遊べます";
  if (prefMeta && prefMeta.status === "live") {
    hint = "選択中の " + prefMeta.name + " は " + formatPlayerRange(prefMeta.minPlayers, prefMeta.maxPlayers);
  }
  return { min: min, max: max, hint: hint };
}

function defaultPlayerName(index) {
  return "プレイヤー" + (index + 1);
}

function ensureExpectedCount() {
  const range = getLobbyPlayerRange();
  if (!room.expectedCount) {
    room.expectedCount = Math.max(range.min, room.players.length);
  }
  room.expectedCount = Math.max(range.min, Math.min(range.max, room.expectedCount));
}

function syncPlayersToCount(count) {
  const range = getLobbyPlayerRange();
  count = Math.max(range.min, Math.min(range.max, count));
  room.expectedCount = count;

  const host = room.players.find(function (p) { return p.isHost; }) || room.players[0];
  if (host && room.players[0].id !== host.id) {
    room.players = [host].concat(room.players.filter(function (p) { return p.id !== host.id; }));
  }

  while (room.players.length < count) {
    room.players.push({
      id: generateId(),
      name: defaultPlayerName(room.players.length),
      isHost: false
    });
  }
  while (room.players.length > count) {
    room.players.pop();
  }
}

if (!roomCode) {
  window.location.href = "index.html";
} else {
  boot();
}

function pickPlayerIdFromRoom(targetRoom) {
  if (!targetRoom || !Array.isArray(targetRoom.players)) return Sync.uid;
  const candidates = [
    getQueryParam("player"),
    sessionStorage.getItem("partyGames_roomPlayerId"),
    sessionStorage.getItem("partyGames_playerId"),
    getCookie("partyGames_playerId"),
    Sync.uid
  ];
  for (let i = 0; i < candidates.length; i++) {
    const pid = candidates[i];
    if (pid && /^[a-z0-9]{6,16}$/.test(pid) && targetRoom.players.some(function (p) { return p.id === pid; })) {
      return pid;
    }
  }
  return Sync.uid;
}

function updateRoomUrlPlayer(pid) {
  if (!pid || !/^[a-z0-9]{6,16}$/.test(pid)) return;
  const params = new URLSearchParams(window.location.search);
  params.set("player", pid);
  params.set("code", roomCode);
  params.set("mode", mode);
  const game = getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame");
  if (game) params.set("game", game);
  window.history.replaceState(null, "", window.location.pathname + "?" + params.toString());
}

async function resolvePlayerIdentity(targetRoom) {
  if (!Sync.isOnline() || !targetRoom) return;

  const picked = pickPlayerIdFromRoom(targetRoom);
  if (targetRoom.players.some(function (p) { return p.id === picked; })) {
    playerId = picked;
    rememberRoomSession(targetRoom.code || roomCode, mode, playerId);
    updateRoomUrlPlayer(playerId);
    return;
  }

  const name = loadPlayerName();
  if (!name) return;

  try {
    const resolved = await Sync.resolvePlayer(roomCode, name, playerId);
    if (resolved && resolved.playerId && targetRoom.players.some(function (p) { return p.id === resolved.playerId; })) {
      playerId = resolved.playerId;
      rememberRoomSession(targetRoom.code || roomCode, mode, playerId);
      updateRoomUrlPlayer(playerId);
    }
  } catch (e) {
    /* ignore */
  }
}

async function boot() {
  try {
    if (roomCode && mode === "local" && !getQueryParam("player")) {
      const params = new URLSearchParams(window.location.search);
      params.set("mode", "room");
      params.set("code", roomCode);
      window.location.replace(window.location.pathname + "?" + params.toString());
      return;
    }

    if ((mode === "online" || mode === "room") && !Sync.canUseMultiDevice(mode)) {
      showFatal("ルーム機能が利用できません。しばらくしてから再度お試しください。");
      return;
    }

    await Sync.init(mode);

    room = await Sync.load(roomCode);
    if (!room) {
      showFatal("ルームが見つかりません。トップから作り直してください。");
      return;
    }

    if (room.game === "blackjack" && room.gameState && room.gameState.phase && room.phase === "lobby") {
      room.phase = room.gameState.phase;
    }
    if (room.gameStartedAt) {
      rememberGameStartedAt(room.gameStartedAt);
    }

    if (Sync.isOnline()) {
      await resolvePlayerIdentity(room);
      if (room.phase !== "lobby" && room.game) {
        await loadSecretsWithRetry();
      }
    } else if (!playerId) {
      showFatal("プレイヤー情報がありません。トップから入り直してください。");
      return;
    }

    if (Sync.isOnline() && !getMe()) {
      await resolvePlayerIdentity(room);
      if (!getMe() && room.phase === "lobby") {
        try {
          const name = loadPlayerName() || "ゲスト";
          const sameName = room.players.find(function (p) { return p.name === name; });
          if (sameName) {
            playerId = sameName.id;
            rememberRoomSession(roomCode, mode, playerId);
            updateRoomUrlPlayer(playerId);
          } else {
            await Sync.joinOnline(roomCode, name);
            room = await Sync.load(roomCode);
          }
        } catch (joinErr) {
          showFatal(joinErr.message || "ルームへの参加に失敗しました");
          return;
        }
      }
    }

    if (!getMe()) {
      showNotInRoomMessage();
      return;
    }

    if (room.game === "werewolf" && room.gameState) {
      const phaseBefore = room.phase;
      WerewolfGame.normalizePhase(room);
      if (phaseBefore !== room.phase && isHost()) {
        await Sync.save(room);
      }
    }

    if (!Sync.isOnline() && room.players.length === 1 && room.expectedCount > 1) {
      ensureExpectedCount();
      syncPlayersToCount(room.expectedCount);
      await Sync.save(room);
    }

    await loadSecrets();
    if (isHost() && room.phase === "lobby" && !room.lobbyWerewolf) {
      const pref = sessionStorage.getItem("partyGames_pendingGame") || getQueryParam("game");
      if (pref === "werewolf") {
        WerewolfGame.ensureLobbySetup(room);
        await Sync.save(room);
      }
      if (pref === "wordwolf") {
        const saved = sessionStorage.getItem("partyGames_wordwolfSetup");
        let preset = null;
        if (saved) {
          try { preset = JSON.parse(saved); } catch (e) { preset = null; }
          sessionStorage.removeItem("partyGames_wordwolfSetup");
        }
        WordWolfGame.ensureLobbySetup(room, preset);
        await Sync.save(room);
      }
      if (pref === "drawing_werewolf") {
        const saved = sessionStorage.getItem("partyGames_drawingWerewolfSetup");
        let preset = null;
        if (saved) {
          try { preset = JSON.parse(saved); } catch (e) { preset = null; }
          sessionStorage.removeItem("partyGames_drawingWerewolfSetup");
        }
        DrawingWerewolfGame.ensureLobbySetup(room, preset);
        await Sync.save(room);
      }
    }
    pollTimer = Sync.subscribe(roomCode, onRoomUpdate);
    bindRoomSyncRefresh();
    lastServerPhase = room.phase;
    lastServerGame = room.game;
    if (Sync.isOnline() && !isHost() && room.phase === "lobby") {
      await pullRoomFromServer();
    }
    await tryAutoStartPreferredGame();
    markRoomSyncedSnapshot(room);
    render();
  } catch (err) {
    showFatal(err.message || "接続に失敗しました");
  }
}

async function loadSecrets() {
  if (!Sync.isOnline()) return;

  playerSecret = await Sync.getPlayerSecret(roomCode, playerId);
  if (room.hostId === playerId) {
    hostSecrets = await Sync.getHostSecrets(roomCode);
  }
}

async function loadSecretsWithRetry() {
  await loadSecrets();
  if (!room || !room.game) return;
  const needsRole = room.game === "werewolf" && room.phase === "wolf_ready";
  const needsWordwolfSecret = room.game === "wordwolf" && room.phase === "wordwolf_ready";
  const needsDrawWolfSecret = room.game === "drawing_werewolf" &&
    (room.phase === "draw_werewolf_ready" || room.phase === "draw_werewolf_draw");
  const needsNgOthers = room.game === "ngword" && room.phase === "ngword_play";
  if (
    (needsRole || needsWordwolfSecret || needsDrawWolfSecret || needsNgOthers) &&
    (!playerSecret ||
      (needsRole && !playerSecret.role) ||
      (needsWordwolfSecret && !playerSecret.word) ||
      (needsDrawWolfSecret && !playerSecret.role) ||
      (needsNgOthers && !playerSecret.ngOthers))
  ) {
    await new Promise(function (resolve) { setTimeout(resolve, 600); });
    await loadSecrets();
  }
}

function roomUpdatedAt(value) {
  const n = Number(value);
  return isFinite(n) ? n : 0;
}

function roomPublicSnapshot(targetRoom) {
  if (!targetRoom) return "";
  const copy = JSON.parse(JSON.stringify(targetRoom));
  delete copy._syncedGameState;
  delete copy._syncedAt;
  delete copy._creatorName;
  delete copy.updatedAt;
  delete copy.gameStartedAt;
  return JSON.stringify(copy);
}

function lobbyRenderFingerprint(room, ctx) {
  if (!room || room.phase !== "lobby" || room.game) return "";
  const prefGame = getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame") || room.pendingGame || room.game || "";
  return JSON.stringify({
    code: room.code,
    mode: room.mode,
    players: (room.players || []).map(function (p) {
      return { id: p.id, name: p.name, isHost: !!p.isHost };
    }),
    pendingGame: room.pendingGame || null,
    lobbyWerewolf: room.lobbyWerewolf || null,
    lobbyWordwolf: room.lobbyWordwolf || null,
    lobbyIto: room.lobbyIto || null,
    lobbyNgword: room.lobbyNgword || null,
    isHost: !!ctx.isHost,
    meId: ctx.me ? ctx.me.id : null,
    prefGame: prefGame,
    lastSyncError: lastSyncError || "",
    serverPhase: lastServerPhase || "",
    serverGame: lastServerGame || null
  });
}

let lastLobbyRenderFingerprint = "";

function roomsAreEquivalent(a, b) {
  return roomPublicSnapshot(a) === roomPublicSnapshot(b);
}

function isStaleSaveError(err) {
  return !!(err && err.message && err.message.indexOf("保存が古くなりました") >= 0);
}

function markRoomSyncedSnapshot(targetRoom) {
  if (!targetRoom) return;
  targetRoom._syncedGameState = JSON.stringify(targetRoom.gameState || null);
  targetRoom._syncedAt = roomUpdatedAt(targetRoom.updatedAt);
}

async function prepareOnlineSave() {
  if (!Sync.isOnline()) return true;

  let fresh;
  try {
    fresh = await Sync.load(roomCode);
  } catch (e) {
    return true;
  }
  if (!fresh || !fresh.code) return true;

  room.updatedAt = roomUpdatedAt(fresh.updatedAt);

  if (!room.game || room.phase === "lobby") {
    return true;
  }

    const freshGs = JSON.stringify(fresh.gameState || null);
    const localGs = JSON.stringify(room.gameState || null);

    if (freshGs === localGs) {
      room.updatedAt = roomUpdatedAt(fresh.updatedAt);
      markRoomSyncedSnapshot(room);
      return false;
    }

  const baseGs = room._syncedGameState;
  if (baseGs && freshGs !== baseGs) {
    await syncRoomFromServer(fresh);
    return false;
  }

  return true;
}

function isServerGameStarted(latest) {
  if (!latest) return false;
  const phase = latest.phase || "lobby";
  return !!(latest.game && phase !== "lobby");
}

function isLocalInLobby() {
  return !room || !room.game || room.phase === "lobby";
}

function rememberGameStartedAt(value) {
  const n = roomUpdatedAt(value);
  if (!n) return;
  sessionStorage.setItem("partyGames_knownGameStartedAt", String(n));
}

function knownGameStartedAt() {
  return roomUpdatedAt(sessionStorage.getItem("partyGames_knownGameStartedAt"));
}

function shouldForceRecover(latest) {
  if (isHost() || !latest || recoverRedirected) return false;
  if (isLocalStuckInLobby(latest)) return true;
  const serverAt = roomUpdatedAt(latest.gameStartedAt);
  if (serverAt && isLocalInLobby() && serverAt > knownGameStartedAt()) return true;
  if (isServerGameStarted(latest) && isLocalInLobby()) return true;
  return false;
}

function isLocalStuckInLobby(latest) {
  if (isHost() || !latest) return false;
  return isServerGameStarted(latest) && isLocalInLobby();
}

function hardRecoverToRoom(latest) {
  if (recoverRedirected || isHost() || !latest) return;
  recoverRedirected = true;
  rememberRoomSession(latest.code || roomCode, mode, playerId);
  const params = new URLSearchParams();
  params.set("code", String(latest.code || roomCode).toUpperCase());
  params.set("mode", mode || "room");
  if (playerId && /^[a-z0-9]{6,16}$/.test(playerId)) params.set("player", playerId);
  const game = latest.game || latest.pendingGame || getQueryParam("game") || "werewolf";
  if (game) params.set("game", game);
  params.set("recover", String(Date.now()));
  window.location.replace("room.html?" + params.toString());
}

function shouldApplyServerRoom(latest) {
  if (!latest || !latest.code || !Array.isArray(latest.players)) return false;
  if (latest.phase === "lobby" && !latest.game && room && room.game) return true;
  if (isLocalStuckInLobby(latest)) return true;
  if (isServerGameStarted(latest) && isLocalInLobby()) return true;
  const serverAt = roomUpdatedAt(latest.gameStartedAt);
  if (serverAt && isLocalInLobby() && serverAt > knownGameStartedAt()) return true;
  const prevAt = roomUpdatedAt(room && room.updatedAt);
  const nextAt = roomUpdatedAt(latest.updatedAt);
  return nextAt >= prevAt;
}

async function finishRoomSync(latest) {
  if (!latest || latest.__syncFailed) return;
  await resolvePlayerIdentity(latest);
  if (shouldForceRecover(latest)) {
    hardRecoverToRoom(latest);
    return;
  }
  await applyRoomUpdate(latest);
  if (latest.gameStartedAt) rememberGameStartedAt(latest.gameStartedAt);
  if (isLocalStuckInLobby(latest)) {
    hardRecoverToRoom(latest);
  }
}

function clearLobbyAutoSync() {
  if (lobbyAutoSyncTimer) {
    clearInterval(lobbyAutoSyncTimer);
    lobbyAutoSyncTimer = null;
  }
  lobbyAutoSyncActive = false;
}

function startLobbyAutoSync() {
  if (lobbyAutoSyncActive || !Sync.isOnline() || isHost()) return;
  lobbyAutoSyncActive = true;
  lobbyAutoSyncTimer = setInterval(function () {
    if (room && room.phase === "lobby" && !roomActionLock) {
      pullRoomFromServer();
    }
  }, 1500);
}

function bindRoomSyncRefresh() {
  if (!Sync.isOnline()) return;

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") pullRoomFromServer();
  });

  window.addEventListener("focus", function () {
    pullRoomFromServer();
  });

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) pullRoomFromServer();
  });
}

function pullRoomFromServer() {
  const reqId = ++syncRequestId;
  syncChain = syncChain.then(async function () {
    if (reqId !== syncRequestId) return { ok: false, stale: true };
    if (!roomCode || roomActionLock) return { ok: false };
    try {
      const latest = await Sync.load(roomCode);
      if (reqId !== syncRequestId) return { ok: false, stale: true };
      if (!latest || !latest.code) {
        lastSyncError = "ルーム情報を取得できませんでした";
        render();
        return { ok: false };
      }
      lastSyncError = null;
      lastServerPhase = latest.phase || "lobby";
      lastServerGame = latest.game || null;
      if (roomActionLock) {
        pendingRoomUpdate = latest;
        return { ok: false, queued: true };
      }
      await finishRoomSync(latest);
      if (recoverRedirected) return { ok: true, recovering: true };
      if (pollTimer && typeof pollTimer.resetPollCache === "function") {
        pollTimer.resetPollCache();
      }
      return { ok: true, phase: room.phase, game: room.game, serverPhase: lastServerPhase };
    } catch (e) {
      if (reqId !== syncRequestId) return { ok: false, stale: true };
      lastSyncError = e.message || "通信に失敗しました";
      render();
      return { ok: false, error: lastSyncError };
    }
  });
  return syncChain;
}

async function forceRoomSync() {
  const result = await pullRoomFromServer();
  if (result && result.error) {
    showToast(result.error);
  }
  return result || { ok: false };
}

async function flushPendingRoomUpdate() {
  if (!pendingRoomUpdate) return;
  const latest = pendingRoomUpdate;
  pendingRoomUpdate = null;
  await applyRoomUpdate(latest);
}

async function onRoomUpdate(latest) {
  if (!latest) return;
  if (latest.__syncFailed) {
    lastSyncError = latest.error || "通信に失敗しました";
    render();
    return;
  }
  if (roomActionLock) {
    pendingRoomUpdate = latest;
    return;
  }
  lastServerPhase = latest.phase || "lobby";
  lastServerGame = latest.game || null;
  if (room && roomsAreEquivalent(room, latest)) return;
  await finishRoomSync(latest);
}

async function syncRoomFromServer(latest) {
  if (!shouldApplyServerRoom(latest)) return;

  lastServerPhase = latest.phase || "lobby";
  lastServerGame = latest.game || null;

  const prevGame = room && room.game;
  const prevPhase = room && room.phase;
  const prevMatryoshkaTurn = room && room.game === "matryoshka_ttt" && room.gameState ? room.gameState.turn : null;
  const prevMatryoshkaBoard = room && room.game === "matryoshka_ttt" && room.gameState ? JSON.stringify(room.gameState.board) : null;

  room = JSON.parse(JSON.stringify(latest));
  markRoomSyncedSnapshot(room);

  if (room.gameState && PokerUtils.isPokerGame(room.game)) {
    PokerUtils.normalizeBettingState(room.gameState);
  }

  if (room.game === "matryoshka_ttt" && room.gameState) {
    const boardChanged = prevMatryoshkaBoard && JSON.stringify(room.gameState.board) !== prevMatryoshkaBoard;
    const turnChanged = prevMatryoshkaTurn !== null && room.gameState.turn !== prevMatryoshkaTurn;
    if (boardChanged || turnChanged) {
      MatryoshkaTttGame.clearLocalSelection();
    }
  }

  if (room.game === "werewolf" && room.gameState) {
    WerewolfGame.normalizePhase(room);
  }
  if (room.game === "blackjack" && room.gameState && room.gameState.phase && room.phase === "lobby") {
    room.phase = room.gameState.phase;
  }
  if (!room.game && room.phase === "lobby" && isHost()) {
    WerewolfGame.syncLobbySetupPlayerCount(room);
    WordWolfGame.syncLobbySetupPlayerCount(room);
  }

  try {
    if (Sync.isOnline()) {
      const gameStarted = !prevGame && room.game;
      const leftLobby = prevPhase === "lobby" && room.phase !== "lobby";
      if (gameStarted || leftLobby || (room.game && !playerSecret)) {
        await loadSecretsWithRetry();
      }
    }
  } finally {
    render();
  }
}

async function applyRoomUpdate(latest) {
  if (!latest || latest.__syncFailed || !latest.code) return;
  if (!shouldApplyServerRoom(latest)) return;

  const prevGame = room && room.game;
  const prevPhase = room && room.phase;
  const majorChange = prevGame !== latest.game || prevPhase !== latest.phase;

  if (!majorChange) {
    if (roomsAreEquivalent(room, latest)) return;
  }

  await syncRoomFromServer(latest);
}

function showFatal(message) {
  app.innerHTML = '<section class="card"><h2>エラー</h2><p>' + escapeHtml(message) + '</p><a href="index.html" class="btn btn-primary">トップへ</a></section>';
}

function showNotInRoomMessage() {
  const started = room && room.phase && room.phase !== "lobby";
  const msg = started
    ? "この端末のプレイヤーIDがずれています。下のボタンから、同じ名前でもう一度入り直してください。"
    : "このルームに参加していません。参加リンクから入り直してください。";
  const game = getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame") || (room && room.pendingGame) || "werewolf";
  const joinUrl = RoomQr.buildJoinUrl(roomCode, { game: game, mode: mode === "online" ? "online" : "room" });
  app.innerHTML =
    '<section class="card"><h2>参加できません</h2><p>' + escapeHtml(msg) + '</p>' +
    '<p class="note">名前: ' + escapeHtml(loadPlayerName() || "（未保存）") + '</p>' +
    '<a href="' + escapeHtml(joinUrl) + '" class="btn btn-primary">参加リンクを開く</a>' +
    '<button type="button" class="btn btn-secondary btn-block" data-action="hard-reload-room" style="margin-top:0.5rem">IDを再設定して入り直す</button>' +
    '<a href="index.html" class="btn btn-secondary" style="margin-top:0.5rem">トップへ</a></section>';
  bindHardReloadOnly();
}

function bindHardReloadOnly() {
  const btn = app.querySelector("[data-action=hard-reload-room]");
  if (!btn) return;
  btn.addEventListener("click", async function () {
    if (room) await resolvePlayerIdentity(room);
    rememberRoomSession(roomCode, mode, playerId);
    window.location.href = buildRoomUrl(roomCode, mode, {
      playerId: playerId,
      game: getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame")
    });
  });
}

function getMe() {
  return room.players.find(function (p) { return p.id === playerId; });
}

function isHost() {
  return room.hostId === playerId;
}

function buildCtx() {
  const me = getMe();
  const ctx = {
    room: room,
    me: me,
    isHost: isHost(),
    isOnline: Sync.isOnline(),
    secrets: playerSecret,
    hostSecrets: hostSecrets,
    getNumber: function (pid) {
      return Secrets.getNumber(ctx, pid);
    },
    getRole: function (pid) {
      return Secrets.getRole(ctx, pid);
    },
    getWolfMates: function () {
      return Secrets.getWolfMates(ctx);
    }
  };
  return ctx;
}

async function withOnlineMutation(fn) {
  if (!Sync.isOnline()) return fn();
  roomActionLock = true;
  try {
    return await fn();
  } finally {
    if (roomActionLock) {
      roomActionLock = false;
      flushPendingRoomUpdate();
    }
  }
}

async function persistPlayerHand(ctx, newHand) {
  playerSecret = playerSecret || {};
  playerSecret.hand = newHand;
  await Sync.updatePlayerSecret(roomCode, ctx.me.id, { hand: newHand });
  await Sync.patchHostHand(roomCode, ctx.me.id, newHand);
  if (hostSecrets && hostSecrets.hands) {
    hostSecrets.hands[ctx.me.id] = newHand;
  }
}

async function getRemoteTrumpHand(playerId) {
  const secret = await Sync.getPlayerSecret(roomCode, playerId);
  return (secret && secret.hand) || [];
}

async function saveAndRender(secretBundle) {
  roomActionLock = true;
  let boardAnim = null;
  try {
    if ((room.game === "reversi" || room.game === "gomoku" || room.game === "vanishing_ttt" || room.game === "tic_tac_toe") && room.gameState && room.gameState.lastMove) {
      boardAnim = room.gameState.lastMove;
      delete room.gameState.lastMove;
    }

    const shouldSave = await prepareOnlineSave();
    if (!shouldSave) {
      render();
      return;
    }

    let saved = false;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      room.updatedAt = Date.now();
      try {
        await Sync.save(room, secretBundle);
        saved = true;
      } catch (err) {
        if (!isStaleSaveError(err) || attempt >= 2) throw err;
        const fresh = await Sync.load(roomCode);
        if (!fresh || !fresh.code) throw err;
        const freshGs = JSON.stringify(fresh.gameState || null);
        const localGs = JSON.stringify(room.gameState || null);
        if (freshGs === localGs) {
          room.updatedAt = roomUpdatedAt(fresh.updatedAt);
          saved = true;
          break;
        }
        const baseGs = room._syncedGameState;
        if (baseGs && freshGs !== baseGs) {
          await syncRoomFromServer(fresh);
          return;
        }
        room.updatedAt = roomUpdatedAt(fresh.updatedAt);
      }
    }

    if (secretBundle) {
      playerSecret = secretBundle.playerSecrets[playerId] || playerSecret;
      if (isHost()) hostSecrets = secretBundle.hostSecrets;
    }

    if (boardAnim && room.gameState) {
      room.gameState.lastMove = boardAnim;
    }

    markRoomSyncedSnapshot(room);
    render();

    if (boardAnim) {
      setTimeout(function () {
        if (room.gameState) delete room.gameState.lastMove;
        render();
      }, 380);
    }
  } finally {
    roomActionLock = false;
    flushPendingRoomUpdate();
  }
}

function updatePageTheme() {
  const pendingGame = sessionStorage.getItem("partyGames_pendingGame");
  const queryGame = getQueryParam("game");
  const activeGame = room && room.game ? room.game : (queryGame || pendingGame);
  document.body.classList.toggle("werewolf-theme", activeGame === "werewolf");
}

function render() {
  updatePageTheme();

  if (!isHost() && Sync.isOnline() && isLocalInLobby()) {
    if (lastServerPhase && lastServerPhase !== "lobby") {
      hardRecoverToRoom({
        code: roomCode,
        game: lastServerGame,
        phase: lastServerPhase
      });
      return;
    }
  }

  const me = getMe();
  if (!me) {
    showNotInRoomMessage();
    return;
  }

  const ctx = buildCtx();

  if (room.game === "texas_holdem" && room.phase === "poker_street_pending" && ctx.isHost) {
    completePendingPokerStreetAdvance();
  }

  if (room.game === "texas_holdem" && room.phase === "poker_showdown_pending" && ctx.isHost) {
    completePendingPokerShowdown();
  }

  if (room.game === "skull" && ctx.isHost) {
    completePendingSkullActions();
  }

  if (room.game === "blackjack" && ctx.isHost) {
    completePendingBlackjackActions();
  }

  let body = "";

  const modeLabel = room.mode === "local"
    ? '<span class="status-dot local"></span>スマホ1台'
    : room.mode === "room"
      ? '<span class="status-dot online"></span>各自のスマホ'
      : '<span class="status-dot online"></span>オンライン';

  const roomTitle = room.mode === "local"
    ? "ルーム"
    : ('ルーム <span class="room-code">' + escapeHtml(room.code || roomCode) + '</span>');
  body += '<header class="header" style="padding-top:1rem"><div class="logo">' + roomTitle + '</div>';
  body += '<p class="tagline">' + modeLabel + '　' + escapeHtml(me.name) + (ctx.isHost ? '（ホスト）' : '') + '</p></header>';

  if (!room.game || room.phase === "lobby") {
    const lobbyFingerprint = lobbyRenderFingerprint(room, ctx);
    if (lobbyFingerprint && lobbyFingerprint === lastLobbyRenderFingerprint) {
      if (room.mode !== "local") renderLobbyQr(room);
      return;
    }
    lastLobbyRenderFingerprint = lobbyFingerprint;
    body += renderLobby(ctx);
    startLobbyAutoSync();
  } else {
    lastLobbyRenderFingerprint = "";
    clearLobbyAutoSync();
    if (room.game === "ito") {
    body += ItoGame.render(ctx);
  } else if (room.game === "werewolf") {
    body += WerewolfGame.render(ctx);
  } else if (room.game === "daifugo") {
    body += DaifugoGame.render(ctx);
  } else if (room.game === "doubt") {
    body += DoubtGame.render(ctx);
  } else if (room.game === "wordwolf") {
    body += WordWolfGame.render(ctx);
  } else if (room.game === "drawing_werewolf") {
    body += DrawingWerewolfGame.render(ctx);
  } else if (room.game === "ngword") {
    body += NgWordGame.render(ctx);
  } else if (room.game === "coyote") {
    body += CoyoteGame.render(ctx);
  } else if (room.game === "codenames") {
    body += CodenamesGame.render(ctx);
  } else if (room.game === "oldmaid") {
    body += OldMaidGame.render(ctx);
  } else if (room.game === "sevens") {
    body += SevensGame.render(ctx);
  } else if (room.game === "ninetyNine") {
    body += NinetyNineGame.render(ctx);
  } else if (room.game === "skull") {
    body += SkullGame.render(ctx);
  } else if (room.game === "blackjack") {
    body += BlackjackGame.render(ctx);
  } else if (room.game === "texas_holdem") {
    body += TexasHoldemGame.render(ctx);
  } else if (room.game === "seven_stud") {
    body += SevenStudGame.render(ctx);
  } else if (room.game === "five_draw") {
    body += FiveDrawGame.render(ctx);
  } else if (room.game === "reversi") {
    body += ReversiGame.render(ctx);
  } else if (room.game === "gomoku") {
    body += GomokuGame.render(ctx);
  } else if (room.game === "shogi") {
    body += ShogiGame.render(ctx);
  } else if (room.game === "vanishing_ttt") {
    body += VanishingTttGame.render(ctx);
  } else if (room.game === "tic_tac_toe") {
    body += TicTacToeGame.render(ctx);
  } else if (room.game === "matryoshka_ttt") {
    body += MatryoshkaTttGame.render(ctx);
  }
  }

  if (isGameFinished(room)) {
    body += renderEndGameNav(ctx);
  }

  if (room.mode !== "local" && !isGameFinished(room)) {
    body += '<section class="card"><button class="btn btn-secondary" data-action="copy-link">参加リンクをコピー</button>';
    if (room.mode === "room") {
      body += '<p class="note">QRコードを読み取るか、リンクを送って「各自のスマホで遊ぶ」から参加してもらってください。</p>';
    } else if (Sync.isOnline()) {
      body += '<p class="note">友達にコードを送って、トップから「オンライン」で参加してもらってください。</p>';
    }
    body += '</section>';
  }

  app.innerHTML = body;
  bindEvents(ctx);

  if (room.game === "daifugo" && typeof DaifugoGame.scheduleAutoPassIfNeeded === "function") {
    DaifugoGame.scheduleAutoPassIfNeeded(ctx);
  }

  if ((!room.game || room.phase === "lobby") && room.mode !== "local") {
    renderLobbyQr(room);
  }

  clearDiscussionTimer();
  if (room.phase === "wolf_day" && room.gameState && room.gameState.discussionEndsAt) {
    startDiscussionTimer(room.gameState.discussionEndsAt);
  }
  if (room.phase === "wordwolf_discuss" && room.gameState && room.gameState.discussionEndsAt) {
    startDiscussionTimer(room.gameState.discussionEndsAt);
  }
  if (room.phase === "draw_werewolf_discuss" && room.gameState && room.gameState.discussionEndsAt) {
    startDiscussionTimer(room.gameState.discussionEndsAt);
  }
  if (room.phase === "draw_werewolf_draw" && room.gameState && room.gameState.drawTurnEndsAt) {
    startDrawTurnTimer(room.gameState.drawTurnEndsAt, ctx);
  } else {
    clearDrawTurnTimer();
  }
  if (room.game === "drawing_werewolf" && typeof DrawingWerewolfGame.afterRender === "function") {
    DrawingWerewolfGame.afterRender();
  }
  if (room.game === "shogi" && typeof ShogiGame.afterRender === "function") {
    ShogiGame.afterRender(render);
  }
}

async function tryAutoStartPreferredGame() {
  const gameId = getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame");
  if (!gameId || gameId === "werewolf" || gameId === "wordwolf" || gameId === "drawing_werewolf" || !isHost() || room.phase !== "lobby" || room.game) return;

  const game = getGameModule(gameId);
  const meta = GameRegistry.get(gameId);
  if (!game || !meta || meta.status !== "live") return;

  sessionStorage.removeItem("partyGames_pendingGame");

  const ok = room.players.length >= meta.minPlayers && room.players.length <= meta.maxPlayers;
  if (!ok) {
    showToast(meta.name + " は " + formatPlayerRange(meta.minPlayers, meta.maxPlayers) + "です。人数を " + formatPlayerRange(meta.minPlayers, meta.maxPlayers) + " に合わせてください（現在 " + room.players.length + "人）");
    return;
  }

  if ((gameId === "daifugo" || gameId === "texas_holdem" || gameId === "ninetyNine" || gameId === "skull" || gameId === "blackjack" || gameId === "ito" || gameId === "shogi") && room.mode !== "room") {
    showToast(meta.name + " は各自のスマホモードのみ対応です");
    return;
  }

  roomActionLock = true;
  try {
    room.game = gameId;
    room = game.init(room);

    if (gameId === "werewolf" && room.lobbyWerewolf) {
      WerewolfGame.applyLobbySetupToGameState(room);
      const setupError = WerewolfGame.beginWithSetup(room);
      if (setupError) {
        throw new Error(setupError);
      }
    }

    if (room.game === "daifugo") DaifugoGame.clearSelected();
    if (room.game === "doubt") DoubtGame.clearSelected();
    if (room.game === "sevens") SevensGame.clearSelected();
    if (room.game === "ninetyNine") NinetyNineGame.clearSelected();
    if (room.game === "skull") SkullGame.clearSelected();
    if (room.game === "five_draw") FiveDrawGame.clearSelected();

    if (Sync.isOnline()) {
      const bundle = Secrets.stripFromRoom(room);
      room = bundle.room;
      await saveAndRender({
        hostSecrets: bundle.hostSecrets,
        playerSecrets: bundle.playerSecrets
      });
    } else {
      await saveAndRender();
    }

    if (typeof PlayStats !== "undefined" && room.mode === "local") {
      PlayStats.recordPlay();
    }
  } catch (err) {
    room.game = null;
    room.phase = "lobby";
    room.gameState = null;
    throw err;
  } finally {
    roomActionLock = false;
  }
}

function renderLobbyCodeCard(code) {
  return (
    '<section class="card lobby-code-card">' +
      '<p class="lobby-code-label">ルームコード</p>' +
      '<p class="lobby-code-value">' + escapeHtml(code) + '</p>' +
      '<div id="lobbyQrCode" class="lobby-qr-wrap"></div>' +
      '<a id="lobbyJoinUrl" class="lobby-join-url hidden" target="_blank" rel="noopener noreferrer"></a>' +
      '<p class="lobby-code-hint">QRコードを読み取るか、下のリンクをタップして参加してもらおう</p>' +
    '</section>'
  );
}

let lastRenderedLobbyQrUrl = "";

function renderLobbyQr(room) {
  const wrap = document.getElementById("lobbyQrCode");
  if (!wrap) return;
  const game = getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame") || room.pendingGame || room.game || "werewolf";
  const mode = room.mode === "online" ? "online" : "room";
  const joinUrl = RoomQr.buildJoinUrl(room.code, { game: game, mode: mode });
  const hasQr = wrap.querySelector("canvas, img, .lobby-qr-canvas");
  if (joinUrl === lastRenderedLobbyQrUrl && hasQr) {
    RoomQr.bindJoinLink(joinUrl);
    return;
  }
  lastRenderedLobbyQrUrl = joinUrl;
  RoomQr.render(wrap, joinUrl);
  RoomQr.bindJoinLink(joinUrl);
}

function isModeAvailableForGame(meta, roomMode) {
  if (!meta || !meta.modesSoon) return true;
  return meta.modesSoon.indexOf(roomMode) === -1;
}

var FINISHED_GAME_PHASES = {
  wolf_end: true,
  wordwolf_end: true,
  draw_werewolf_end: true,
  ngword_end: true,
  ito_gameover: true,
  ito_victory: true,
  poker_result: true,
  codenames_result: true,
  daifugo_result: true,
  doubt_result: true,
  oldmaid_result: true,
  coyote_result: true,
  sevens_result: true,
  ninety_nine_result: true,
  skull_result: true,
  bj_game_over: true
};

function isGameFinished(targetRoom) {
  if (!targetRoom || !targetRoom.game || targetRoom.phase === "lobby") return false;
  const gs = targetRoom.gameState;
  if (gs && gs.finished === true) return true;
  if (gs && gs.gameOver === true) return true;
  if (targetRoom.game === "blackjack" && gs && gs.phase === "bj_game_over") return true;
  return !!FINISHED_GAME_PHASES[targetRoom.phase];
}

function getPlayableGamesForRoom(targetRoom, options) {
  options = options || {};
  const count = targetRoom.players.length;
  const roomMode = targetRoom.mode || "local";
  const excludeId = options.excludeCurrent ? targetRoom.game : null;

  return GameRegistry.live().filter(function (meta) {
    if (excludeId && meta.id === excludeId) return false;
    if (!getGameModule(meta.id)) return false;
    if (count < meta.minPlayers || count > meta.maxPlayers) return false;
    if (roomMode !== "local" && !isModeAvailableForGame(meta, roomMode)) return false;
    return true;
  });
}

function renderEndGameNav(ctx) {
  const html = [];

  html.push('<section class="card end-game-nav">');
  html.push("<h2>次にやること</h2>");

  if (ctx.isHost) {
    html.push('<button type="button" class="btn btn-primary btn-block" data-action="back-lobby">ロビーに戻る</button>');
  } else {
    html.push('<p class="note">ホストがロビーに戻ると、自動でロビー画面に切り替わります</p>');
  }

  html.push('<a href="index.html" class="btn btn-secondary btn-block" style="margin-top:0.75rem">トップに戻る</a>');
  html.push("</section>");
  return html.join("");
}

function getBoardMarkHint(gameId, targetRoom, me) {
  if (!me || !targetRoom || !Array.isArray(targetRoom.players)) return "";
  const idx = targetRoom.players.findIndex(function (p) { return p.id === me.id; });
  if (idx < 0) return "";
  if (gameId === "matryoshka_ttt") return idx === 0 ? "赤（先手）" : "青（後攻）";
  if (gameId === "tic_tac_toe" || gameId === "vanishing_ttt") return idx === 0 ? "〇（先攻）" : "×（後攻）";
  if (gameId === "reversi" || gameId === "gomoku") return idx === 0 ? "黒（先手）" : "白（後攻）";
  if (gameId === "shogi") return idx === 0 ? "先手（▲）" : "後手（△）";
  return "";
}

function renderLobby(ctx) {
  const html = [];
  const prefGame = getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame") || ctx.room.pendingGame || ctx.room.game;
  const prefMeta = prefGame ? GameRegistry.get(prefGame) : null;
  const isWerewolfLobby = prefMeta && prefMeta.id === "werewolf" && prefMeta.status === "live";
  const isWordwolfLobby = prefMeta && prefMeta.id === "wordwolf" && prefMeta.status === "live";
  const isDrawingWerewolfLobby = prefMeta && prefMeta.id === "drawing_werewolf" && prefMeta.status === "live";
  const isItoLobby = prefMeta && prefMeta.id === "ito" && prefMeta.status === "live";
  const isNgwordLobby = prefMeta && prefMeta.id === "ngword" && prefMeta.status === "live";

  if (ctx.room.mode !== "local" && ctx.isHost) {
    html.push(renderLobbyCodeCard(ctx.room.code));
  }

  if (isWerewolfLobby) {
    let customInvalid = false;
    if (ctx.isHost) {
      WerewolfGame.syncLobbySetupPlayerCount(ctx.room);
      const lobby = WerewolfGame.ensureLobbySetup(ctx.room);
      customInvalid = lobby.selectedSetupId === "custom" &&
        !WerewolfGame.validateCustomSetup(ctx.room.players.length, lobby.customRoles).ok;
    }
    const prefOk = ctx.room.players.length >= prefMeta.minPlayers && ctx.room.players.length <= prefMeta.maxPlayers;

    html.push('<p class="note lobby-game-label">🎯 <strong>' + escapeHtml(prefMeta.name) + '</strong></p>');
    html.push(WerewolfGame.renderLobbySetup(ctx.room, ctx.isHost));

    if (!ctx.isHost) {
      html.push('<p class="note lobby-wait-hint">ゲームが始まると自動で画面が切り替わります</p>');
    } else if (ctx.isHost) {
      html.push('<section class="card lobby-start-card">');
      html.push('<p class="note">全員が入ってから<strong>10秒ほど待って</strong>から始めてください</p>');
      html.push('<button type="button" class="btn btn-primary lobby-start-btn" data-action="start-game" data-game="werewolf" ' + ((!prefOk || customInvalid) ? "disabled" : "") + '>');
      html.push('人狼を始める（' + ctx.room.players.length + '人）');
      html.push('</button>');
      if (!prefOk) {
        html.push('<p class="note">' + formatPlayerRange(prefMeta.minPlayers, prefMeta.maxPlayers) + '揃ってから始められます</p>');
      } else if (customInvalid) {
        html.push('<p class="note">カスタム構成を直してください</p>');
      }
      html.push('</section>');
    }
  } else if (isWordwolfLobby) {
    WordWolfGame.syncLobbySetupPlayerCount(ctx.room);
    const prefOk = ctx.room.players.length >= prefMeta.minPlayers && ctx.room.players.length <= prefMeta.maxPlayers;

    html.push('<p class="note lobby-game-label">🎯 <strong>' + escapeHtml(prefMeta.name) + '</strong></p>');
    html.push(WordWolfGame.renderLobbySetup(ctx.room, ctx.isHost));

    if (!ctx.isHost && ctx.room.mode !== "local") {
      html.push('<p class="note lobby-wait-hint">ゲームが始まると自動で画面が切り替わります</p>');
    } else if (ctx.isHost || ctx.room.mode === "local") {
      html.push('<section class="card lobby-start-card">');
      html.push('<button type="button" class="btn btn-primary lobby-start-btn" data-action="start-game" data-game="wordwolf" ' + (!prefOk ? "disabled" : "") + '>');
      html.push('ワードウルフを始める（' + ctx.room.players.length + '人）');
      html.push('</button>');
      if (!prefOk) {
        html.push('<p class="note">' + formatPlayerRange(prefMeta.minPlayers, prefMeta.maxPlayers) + '揃ってから始められます</p>');
      }
      html.push('</section>');
    }
  } else if (isDrawingWerewolfLobby) {
    DrawingWerewolfGame.syncLobbySetupPlayerCount(ctx.room);
    const prefOk = ctx.room.players.length >= prefMeta.minPlayers && ctx.room.players.length <= prefMeta.maxPlayers;

    html.push('<p class="note lobby-game-label">🎯 <strong>' + escapeHtml(prefMeta.name) + '</strong></p>');
    html.push(DrawingWerewolfGame.renderLobbySetup(ctx.room, ctx.isHost || ctx.room.mode === "local"));

    if (!ctx.isHost && ctx.room.mode !== "local") {
      html.push('<p class="note lobby-wait-hint">ゲームが始まると自動で画面が切り替わります</p>');
    } else if (ctx.isHost || ctx.room.mode === "local") {
      html.push('<section class="card lobby-start-card">');
      html.push('<button type="button" class="btn btn-primary lobby-start-btn" data-action="start-game" data-game="drawing_werewolf" ' + (!prefOk ? "disabled" : "") + '>');
      html.push('お絵描き人狼を始める（' + ctx.room.players.length + '人）');
      html.push('</button>');
      if (!prefOk) {
        html.push('<p class="note">' + formatPlayerRange(prefMeta.minPlayers, prefMeta.maxPlayers) + '揃ってから始められます</p>');
      }
      html.push('</section>');
    }
  } else if (isItoLobby) {
    ItoGame.syncLobbySetupPlayerCount(ctx.room);
    const prefOk = ctx.room.players.length >= prefMeta.minPlayers && ctx.room.players.length <= prefMeta.maxPlayers;

    html.push('<p class="note lobby-game-label">🎯 <strong>' + escapeHtml(prefMeta.name) + '</strong></p>');
    html.push(ItoGame.renderLobbySetup(ctx.room, ctx.isHost || ctx.room.mode === "local"));

    if (ctx.isHost || ctx.room.mode === "local") {
      html.push('<section class="card lobby-start-card">');
      html.push('<button type="button" class="btn btn-primary lobby-start-btn" data-action="start-game" data-game="ito" ' + (!prefOk ? "disabled" : "") + '>');
      html.push('ナンバーリンクを始める（' + ctx.room.players.length + '人）');
      html.push('</button>');
      if (!prefOk) {
        html.push('<p class="note">' + formatPlayerRange(prefMeta.minPlayers, prefMeta.maxPlayers) + '揃ってから始められます</p>');
      }
      html.push('</section>');
    }
  } else if (isNgwordLobby) {
    NgWordGame.ensureLobbySetup(ctx.room);
    const prefOk = ctx.room.players.length >= prefMeta.minPlayers && ctx.room.players.length <= prefMeta.maxPlayers;
    const themeOk = NgWordGame.canStartWithLobby(ctx.room);

    html.push('<p class="note lobby-game-label">🎯 <strong>' + escapeHtml(prefMeta.name) + '</strong></p>');
    html.push('<section class="card"><p class="note">各自に言っちゃダメなワードが配られます。自分のは見えず、他の人のNGワードだけ分かります。⚡ 早押しで早い順に点！</p></section>');
    html.push(NgWordGame.renderLobbySetup(ctx.room, ctx.isHost || ctx.room.mode === "local"));

    if (!ctx.isHost && ctx.room.mode !== "local") {
      html.push('<p class="note lobby-wait-hint">ゲームが始まると自動で画面が切り替わります</p>');
    } else if (ctx.isHost || ctx.room.mode === "local") {
      html.push('<section class="card lobby-start-card">');
      html.push('<button type="button" class="btn btn-primary lobby-start-btn" data-action="start-game" data-game="ngword" ' + ((!prefOk || !themeOk) ? "disabled" : "") + '>');
      html.push('NGワードゲームを始める（' + ctx.room.players.length + '人）');
      html.push('</button>');
      if (!prefOk) {
        html.push('<p class="note">' + formatPlayerRange(prefMeta.minPlayers, prefMeta.maxPlayers) + '揃ってから始められます</p>');
      } else if (!themeOk) {
        html.push('<p class="note">ジャンルを選び直してください</p>');
      }
      html.push('</section>');
    }
  } else if (prefMeta && prefMeta.status === "live") {
    const prefOk = ctx.room.players.length >= prefMeta.minPlayers && ctx.room.players.length <= prefMeta.maxPlayers;
    const markHint = getBoardMarkHint(prefMeta.id, ctx.room, ctx.me);
    html.push('<p class="note lobby-game-label">🎯 <strong>' + escapeHtml(prefMeta.name) + '</strong></p>');
    if (markHint && ctx.room.mode !== "local") {
      html.push('<p class="note">あなたの手番: <strong>' + escapeHtml(markHint) + "</strong></p>");
    }
    if (ctx.isHost || ctx.room.mode === "local") {
      html.push('<section class="card lobby-start-card">');
      if (prefMeta.maxPlayers === 2) {
        html.push('<p class="note">2人揃ったら開始してください（ホストが先攻）</p>');
      }
      html.push('<button type="button" class="btn btn-primary lobby-start-btn" data-action="start-game" data-game="' + prefMeta.id + '" ' + (!prefOk ? "disabled" : "") + '>');
      html.push(prefMeta.name + ' を始める（' + ctx.room.players.length + '人）');
      html.push('</button>');
      if (!prefOk) {
        html.push('<p class="note">' + formatPlayerRange(prefMeta.minPlayers, prefMeta.maxPlayers) + 'に人数を合わせてください</p>');
      }
      html.push('</section>');
    } else if (ctx.room.mode !== "local") {
      const waitMsg = prefMeta.maxPlayers === 2
        ? "2人揃うとホストが始めます。始まると自動で画面が切り替わります"
        : "ホストが始めるのを待っています";
      html.push('<p class="note lobby-wait-hint">' + waitMsg + "</p>");
    }
  }

  html.push('<section class="card"><h2>プレイヤー（' + ctx.room.players.length + '人）</h2><ul class="player-list">');
  ctx.room.players.forEach(function (p) {
    html.push('<li><span>' + escapeHtml(p.name) + (p.isHost ? ' 👑' : '') + '</span></li>');
  });
  html.push('</ul></section>');

  if (ctx.isHost && !isWerewolfLobby && !isWordwolfLobby && !isItoLobby && !isNgwordLobby) {
    html.push('<section class="card"><h2>ゲームを選ぶ</h2>');

    Object.keys(GAME_CATEGORIES).forEach(function (catKey) {
      const cat = GAME_CATEGORIES[catKey];
      const games = GameRegistry.byCategory(catKey).filter(function (g) { return g.status === "live"; });
      if (!games.length) return;

      html.push('<p class="lobby-cat-label">' + cat.icon + ' ' + cat.name + '</p>');
      html.push('<div class="lobby-game-list">');
      games.forEach(function (meta) {
        if (!getGameModule(meta.id)) return;
        const ok = ctx.room.players.length >= meta.minPlayers && ctx.room.players.length <= meta.maxPlayers;
        html.push('<button type="button" class="btn btn-primary' + (ok ? "" : " btn-unavailable") + '" style="margin-bottom:0.5rem" data-action="start-game" data-game="' + meta.id + '">');
        html.push(meta.name + '（' + formatPlayerRange(meta.minPlayers, meta.maxPlayers) + '）');
        if (!ok) html.push(' — 今は' + ctx.room.players.length + '人');
        html.push('</button>');
      });
      html.push('</div>');
    });

    html.push('</section>');
  } else if (!isWerewolfLobby && !isWordwolfLobby && !isItoLobby && !isNgwordLobby) {
    html.push('<section class="card"><p>ホストがゲームを選ぶのを待っています…</p></section>');
  }

  return html.join("");
}

function bindEvents(ctx) {
  app.querySelectorAll("[data-action]").forEach(function (el) {
    el.addEventListener("click", function () {
      handleAction(el.dataset.action, el.dataset, ctx).catch(function (err) {
        console.error(err);
        if (isStaleSaveError(err)) {
          forceRoomSync();
          return;
        }
        showToast(err && err.message ? err.message : "操作に失敗しました");
      });
    });
  });
}

function getRolesMap(ctx) {
  if (!ctx.isOnline && ctx.room.gameState && ctx.room.gameState.roles) {
    return ctx.room.gameState.roles;
  }
  if (ctx.hostSecrets && ctx.hostSecrets.roles) return ctx.hostSecrets.roles;
  if (ctx.room.gameState && ctx.room.gameState.roles) return ctx.room.gameState.roles;
  return {};
}

function getWordWolfRoles(ctx) {
  return getRolesMap(ctx);
}

function getPokerGame(room) {
  if (room.game === "texas_holdem") return TexasHoldemGame;
  if (room.game === "seven_stud") return SevenStudGame;
  if (room.game === "five_draw") return FiveDrawGame;
  return null;
}

let pokerShowdownQueued = false;
let pokerStreetAdvanceQueued = false;
let skullActionQueued = false;
let blackjackActionQueued = false;

function maybeRunBlackjackDealerLocal(ctx) {
  if (!ctx.isOnline && room && room.gameState && room.gameState.pendingDealer) {
    BlackjackGame.dealerPlay(room, null);
  }
}

async function saveBlackjackOnlineState() {
  if (hostSecrets) {
    BlackjackGame.syncBjSecrets(room, hostSecrets);
  }
  const bundle = Secrets.stripFromRoom(room);
  room = bundle.room;
  if (hostSecrets) {
    if (bundle.hostSecrets && bundle.hostSecrets.deck) {
      hostSecrets.deck = bundle.hostSecrets.deck;
    }
    if (bundle.hostSecrets && bundle.hostSecrets.bjStates) {
      hostSecrets.bjStates = bundle.hostSecrets.bjStates;
    }
  }
  if (playerSecret && bundle.playerSecrets[playerId] && bundle.playerSecrets[playerId].bjState) {
    playerSecret.bjState = bundle.playerSecrets[playerId].bjState;
  }
  await saveAndRender({
    hostSecrets: hostSecrets || bundle.hostSecrets,
    playerSecrets: bundle.playerSecrets
  });
}

async function saveItoOnlineState() {
  if (hostSecrets) {
    ItoGame.syncItoSecrets(room, hostSecrets);
  }
  const bundle = Secrets.stripFromRoom(room);
  room = bundle.room;
  if (hostSecrets) {
    if (bundle.hostSecrets && bundle.hostSecrets.hands) {
      hostSecrets.hands = bundle.hostSecrets.hands;
    }
    if (bundle.hostSecrets && bundle.hostSecrets.numbers) {
      hostSecrets.numbers = bundle.hostSecrets.numbers;
    }
  }
  if (playerSecret && bundle.playerSecrets[playerId]) {
    if (bundle.playerSecrets[playerId].hand) {
      playerSecret.hand = bundle.playerSecrets[playerId].hand;
    }
    if (bundle.playerSecrets[playerId].number) {
      playerSecret.number = bundle.playerSecrets[playerId].number;
    }
  }
  await saveAndRender({
    hostSecrets: hostSecrets || bundle.hostSecrets,
    playerSecrets: bundle.playerSecrets
  });
}

async function completePendingBlackjackActions() {
  if (!room || room.game !== "blackjack" || !isHost()) return;
  if (roomActionLock || blackjackActionQueued) return;
  const gs = room.gameState;
  if (!gs) return;

  blackjackActionQueued = true;
  roomActionLock = true;
  try {
    let changed = false;
    BlackjackGame.attachBjSecrets(room, hostSecrets);

    if (gs.pendingDeal) {
      const result = BlackjackGame.dealRound(room, hostSecrets);
      if (result.ok) changed = true;
    }

    if (gs.bjPendingAction) {
      const result = BlackjackGame.processPendingAction(room, hostSecrets);
      if (result.ok) changed = true;
    }

    if (gs.pendingDealer || gs.phase === "bj_dealer_pending") {
      const result = BlackjackGame.dealerPlay(room, hostSecrets);
      if (result.ok) changed = true;
    }

    if (!changed) return;
    await saveBlackjackOnlineState();
  } finally {
    blackjackActionQueued = false;
    roomActionLock = false;
  }
}

async function saveSkullOnlineState() {
  if (hostSecrets) SkullGame.syncHandsToSecrets(room, hostSecrets);
  const bundle = Secrets.stripFromRoom(room);
  room = bundle.room;
  if (hostSecrets) {
    if (bundle.hostSecrets && bundle.hostSecrets.hands) {
      hostSecrets.hands = bundle.hostSecrets.hands;
    }
    if (bundle.hostSecrets && bundle.hostSecrets.skullTypes) {
      hostSecrets.skullTypes = bundle.hostSecrets.skullTypes;
    }
  }
  await saveAndRender({
    hostSecrets: hostSecrets || bundle.hostSecrets,
    playerSecrets: bundle.playerSecrets
  });
}

async function completePendingSkullActions() {
  if (!room || room.game !== "skull" || !isHost()) return;
  if (roomActionLock || skullActionQueued) return;
  const gs = room.gameState;
  if (!gs) return;

  skullActionQueued = true;
  roomActionLock = true;
  try {
    let changed = false;

    if (gs.pendingFlip && room.phase === "skull_flip" && hostSecrets && hostSecrets.skullTypes) {
      const type = hostSecrets.skullTypes[gs.pendingFlip.cardId];
      if (type) {
        SkullGame.resolveFlip(room, type, hostSecrets);
        if (hostSecrets.hands) SkullGame.syncHandsToSecrets(room, hostSecrets);
        changed = true;
      }
    }

    if (gs.pendingPickLoss && room.phase === "skull_pick") {
      const pick = gs.pendingPickLoss;
      const loserId = gs.pickLoss && gs.pickLoss.loserId;
      const result = SkullGame.pickLossCard(room, pick.pickerId, pick.cardId, null, hostSecrets);
      if (result.ok) {
        gs.pendingPickLoss = null;
        if (hostSecrets && hostSecrets.hands) {
          SkullGame.syncHandsToSecrets(room, hostSecrets);
        }
        if (loserId && hostSecrets && hostSecrets.hands && hostSecrets.hands[loserId]) {
          await Sync.updatePlayerSecret(roomCode, loserId, { hand: hostSecrets.hands[loserId] });
        }
        changed = true;
      }
    }

    if (!changed) return;
    await saveSkullOnlineState();
  } finally {
    skullActionQueued = false;
    roomActionLock = false;
  }
}

async function completePendingPokerStreetAdvance() {
  if (!room || room.game !== "texas_holdem" || room.phase !== "poker_street_pending" || !isHost()) return;
  if (!room.gameState || !room.gameState.pendingStreetAdvance) return;
  if (roomActionLock || pokerStreetAdvanceQueued || pokerShowdownQueued) return;
  pokerStreetAdvanceQueued = true;
  roomActionLock = true;
  try {
    const result = TexasHoldemGame.advancePendingStreet(room, hostSecrets);
    if (!result.ok) return;
    const bundle = Secrets.stripFromRoom(room);
    room = bundle.room;
    if (hostSecrets) {
      if (bundle.hostSecrets && bundle.hostSecrets.holeCards) {
        hostSecrets.holeCards = bundle.hostSecrets.holeCards;
      }
      if (bundle.hostSecrets && bundle.hostSecrets.deck) {
        hostSecrets.deck = bundle.hostSecrets.deck;
      }
    }
    await saveAndRender({
      hostSecrets: hostSecrets || bundle.hostSecrets,
      playerSecrets: bundle.playerSecrets
    });
  } finally {
    pokerStreetAdvanceQueued = false;
    roomActionLock = false;
  }
}

async function completePendingPokerShowdown() {
  if (!room || room.game !== "texas_holdem" || room.phase !== "poker_showdown_pending" || !isHost()) return;
  if (roomActionLock || pokerShowdownQueued) return;
  pokerShowdownQueued = true;
  roomActionLock = true;
  try {
    PokerUtils.attachHostSecrets(room, hostSecrets);
    TexasHoldemGame.completeShowdown(room);
    PokerUtils.syncHostSecretsFromState(room.gameState, hostSecrets);
    const bundle = Secrets.stripFromRoom(room);
    room = bundle.room;
    await saveAndRender({
      hostSecrets: hostSecrets,
      playerSecrets: bundle.playerSecrets
    });
    showToast("ハンド終了！");
  } finally {
    pokerShowdownQueued = false;
    roomActionLock = false;
  }
}

async function savePokerOnlineState() {
  const bundle = Secrets.stripFromRoom(room);
  room = bundle.room;
  if (hostSecrets) {
    if (bundle.hostSecrets && bundle.hostSecrets.holeCards) {
      hostSecrets.holeCards = bundle.hostSecrets.holeCards;
    }
    if (bundle.hostSecrets && bundle.hostSecrets.deck) {
      hostSecrets.deck = bundle.hostSecrets.deck;
    }
  }
  await saveAndRender({
    hostSecrets: hostSecrets || bundle.hostSecrets,
    playerSecrets: bundle.playerSecrets
  });
}

function applyPlayerNamesFromInputs() {
  app.querySelectorAll("[data-player-slot]").forEach(function (input) {
    const idx = parseInt(input.dataset.playerSlot, 10);
    const name = input.value.trim();
    if (room.players[idx]) {
      room.players[idx].name = name || defaultPlayerName(idx);
    }
  });
}

async function handleAction(action, data, ctx) {
  switch (action) {
    case "start-game":
      if (!ctx.isHost) return;
      const startMeta = GameRegistry.get(data.game);
      const game = getGameModule(data.game);
      if (!startMeta || !game) {
        showToast("ゲームを読み込めませんでした");
        return;
      }

      roomActionLock = true;
      try {
        const savedLobbyWerewolf = room.lobbyWerewolf ? JSON.parse(JSON.stringify(room.lobbyWerewolf)) : null;
        const savedLobbyIto = room.lobbyIto ? JSON.parse(JSON.stringify(room.lobbyIto)) : null;
        const savedLobbyWordwolf = room.lobbyWordwolf ? JSON.parse(JSON.stringify(room.lobbyWordwolf)) : null;
        const savedLobbyDrawingWerewolf = room.lobbyDrawingWerewolf ? JSON.parse(JSON.stringify(room.lobbyDrawingWerewolf)) : null;
        const savedLobbyNgword = room.lobbyNgword ? JSON.parse(JSON.stringify(room.lobbyNgword)) : null;

        if (Sync.isOnline()) {
          const fresh = await Sync.load(room.code);
          if (fresh) {
            room = fresh;
            if (savedLobbyWerewolf) room.lobbyWerewolf = savedLobbyWerewolf;
            if (savedLobbyIto) room.lobbyIto = savedLobbyIto;
            if (savedLobbyWordwolf) room.lobbyWordwolf = savedLobbyWordwolf;
            if (savedLobbyDrawingWerewolf) room.lobbyDrawingWerewolf = savedLobbyDrawingWerewolf;
            if (savedLobbyNgword) room.lobbyNgword = savedLobbyNgword;
          }
        }

        if (room.players.length < startMeta.minPlayers || room.players.length > startMeta.maxPlayers) {
          showToast(startMeta.name + " は " + formatPlayerRange(startMeta.minPlayers, startMeta.maxPlayers) + "です（現在 " + room.players.length + "人）");
          return;
        }

        if (data.game === "ngword" && !NgWordGame.canStartWithLobby(room)) {
          showToast("ジャンルを選び直してください");
          return;
        }

        if (data.game === "daifugo" && room.mode !== "room") {
          showToast("大富豪は各自のスマホモードのみ対応です");
          return;
        }

        if (data.game === "texas_holdem" && room.mode !== "room") {
          showToast("テキサスホールデムは各自のスマホモードのみ対応です");
          return;
        }

        if (data.game === "ninetyNine" && room.mode !== "room") {
          showToast("99は各自のスマホモードのみ対応です");
          return;
        }

        if (data.game === "skull" && room.mode !== "room") {
          showToast("爆弾は各自のスマホモードのみ対応です");
          return;
        }

        if (data.game === "blackjack" && room.mode !== "room") {
          showToast("ブラックジャックは各自のスマホモードのみ対応です");
          return;
        }

        if (data.game === "ito" && room.mode !== "room") {
          showToast("ナンバーリンクは各自のスマホモードのみ対応です");
          return;
        }

        if (data.game === "shogi" && room.mode !== "room") {
          showToast("将棋は各自のスマホモードのみ対応です");
          return;
        }

        room.game = data.game;

        if (data.game === "ito") {
          ItoGame.ensureLobbySetup(room);
        }

        if (data.game === "ngword") {
          NgWordGame.ensureLobbySetup(room);
        }

        room = game.init(room);
        room.gameStartedAt = Date.now();
        rememberGameStartedAt(room.gameStartedAt);

        if (data.game === "werewolf" && room.lobbyWerewolf) {
          WerewolfGame.applyLobbySetupToGameState(room);
          const setupError = WerewolfGame.beginWithSetup(room);
          if (setupError) {
            showToast(setupError);
            room.game = null;
            room.phase = "lobby";
            room.gameState = null;
            roomActionLock = false;
            render();
            return;
          }
        }

        if (room.game === "daifugo") {
          DaifugoGame.clearSelected();
        }
        if (room.game === "doubt") {
          DoubtGame.clearSelected();
        }
        if (room.game === "sevens") {
          SevensGame.clearSelected();
        }
        if (room.game === "ninetyNine") {
          NinetyNineGame.clearSelected();
        }
        if (room.game === "skull") {
          SkullGame.clearSelected();
        }
        if (room.game === "five_draw") {
          FiveDrawGame.clearSelected();
        }

        if (Sync.isOnline()) {
          const bundle = Secrets.stripFromRoom(room);
          room = bundle.room;
          await saveAndRender({
            hostSecrets: bundle.hostSecrets,
            playerSecrets: bundle.playerSecrets
          });
        } else {
          await saveAndRender();
        }

        if (typeof PlayStats !== "undefined" && room.mode === "local") {
          PlayStats.recordPlay();
        }
      } catch (err) {
        room.game = null;
        room.phase = "lobby";
        room.gameState = null;
        throw err;
      } finally {
        roomActionLock = false;
      }
      break;

    case "back-lobby":
      if (!ctx.isHost) return;
      if (room.game === "matryoshka_ttt") MatryoshkaTttGame.clearLocalSelection();
      const lobbyPendingGame = getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame") || room.pendingGame || room.game;
      room.game = null;
      room.phase = "lobby";
      room.gameState = null;
      if (lobbyPendingGame) room.pendingGame = lobbyPendingGame;
      if (room.gameStartedAt) delete room.gameStartedAt;
      sessionStorage.removeItem("partyGames_knownGameStartedAt");
      await saveAndRender();
      break;

    case "go-top":
      window.location.href = "index.html";
      break;

    case "copy-link":
      {
        const game = getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame") || room.pendingGame || room.game || "werewolf";
        const mode = room.mode === "online" ? "online" : "room";
        const joinUrl = RoomQr.buildJoinUrl(room.code, { game: game, mode: mode });
        const text = "ルームコード: " + room.code + "\n参加URL:\n" + joinUrl;
        copyText(text).then(function () { showToast("参加リンクをコピーしました"); });
      }
      break;

    case "refresh-room":
      {
        const beforePhase = room.phase;
        const result = await forceRoomSync();
        if (result.ok && beforePhase === "lobby" && room.phase === "lobby") {
          showToast("サーバー: " + (result.serverPhase || "?") + " ／ この画面: lobby");
        } else if (result.ok) {
          showToast("ルームを更新しました（" + (room.phase || "") + "）");
        }
      }
      break;

    case "hard-reload-room":
      rememberRoomSession(roomCode, mode, playerId);
      window.location.href = buildRoomUrl(roomCode, mode, {
        playerId: playerId,
        game: getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame")
      });
      break;

    /* --- Ito（クモノイト） --- */
    case "ito-lobby-select-setup":
      if (!ctx.isHost && ctx.room.mode !== "local") return;
      room = ItoGame.selectLobbySetup(room, data.setup);
      await saveAndRender();
      break;

    case "ito-lobby-custom":
      if (!ctx.isHost && ctx.room.mode !== "local") return;
      room = ItoGame.adjustLobbyCustom(room, data.stat, parseInt(data.delta, 10));
      await saveAndRender();
      break;

    case "ito-random-theme":
      if (!ItoGame.canManage(ctx)) return;
      room = ItoGame.applyRandomTheme(room);
      await saveAndRender();
      showToast("お題：「" + room.gameState.theme + "」");
      break;

    case "ito-custom-theme":
      if (!ItoGame.canManage(ctx)) return;
      const itoCustom = document.getElementById("customTheme");
      if (!itoCustom || !itoCustom.value.trim()) { showToast("お題を入力してください"); return; }
      room = ItoGame.setTheme(room, itoCustom.value.trim());
      await saveAndRender();
      break;

    case "ito-next-reveal": {
      const gsReveal = room.gameState;
      const currentReveal = gsReveal ? room.players[gsReveal.revealIndex] : null;
      if (!ItoGame.canRevealAdvance(ctx, currentReveal ? currentReveal.id : null)) return;
      room = ItoGame.advanceReveal(room);
      await saveAndRender();
      break;
    }

    case "ito-reveal-number": {
      const zone = document.getElementById("itoRevealFlipZone");
      const revealEl = document.getElementById("revealArea");
      const btn = document.querySelector(".ito-reveal-btn");
      if (btn) btn.classList.add("hidden");
      if (zone) zone.classList.add("is-flipped");
      if (revealEl) {
        const cardCount = zone ? zone.querySelectorAll(".ito-flip-card").length : 1;
        const waitMs = 520 + Math.max(0, cardCount - 1) * 90;
        setTimeout(function () {
          revealEl.classList.remove("hidden");
        }, waitMs);
      }
      break;
    }

    case "ito-hide-number": {
      const zone = document.getElementById("itoRevealFlipZone");
      const revealEl = document.getElementById("revealArea");
      const btn = document.querySelector(".ito-reveal-btn");
      if (revealEl) revealEl.classList.add("hidden");
      if (zone) zone.classList.remove("is-flipped");
      if (btn) {
        const cardCount = zone ? zone.querySelectorAll(".ito-flip-card").length : 1;
        const waitMs = 520 + Math.max(0, cardCount - 1) * 90;
        setTimeout(function () {
          btn.classList.remove("hidden");
        }, waitMs);
      }
      break;
    }

    case "ito-peek-player": {
      const peekEl = document.getElementById("peekArea");
      if (!peekEl) break;
      if (ctx.isOnline && room.mode === "room" && !ctx.isHost && data.player !== ctx.me.id) {
        showToast("自分の数字のみ確認できます");
        return;
      }
      const hand = ItoGame.getHand(ctx, data.player);
      const pname = ItoGame.playerName(room, data.player);
      peekEl.innerHTML = '<p class="ito-secret-label">' + escapeHtml(pname) + ' の数字</p><div class="ito-hand-preview">' +
        ItoGame.renderHandCards(hand) + '</div><button type="button" class="btn btn-primary" data-action="ito-hide-peek">隠す</button>';
      peekEl.classList.remove("hidden");
      bindEvents(ctx);
      break;
    }

    case "ito-hide-peek": {
      const peekHide = document.getElementById("peekArea");
      if (peekHide) {
        peekHide.classList.add("hidden");
        peekHide.innerHTML = "";
      }
      break;
    }

    case "ito-play-card": {
      if (!ItoGame.canManage(ctx)) {
        showToast("ホストがカードを選びます");
        return;
      }
      if (ctx.isOnline && isHost()) ItoGame.attachItoSecrets(room, hostSecrets);
      const playResult = ItoGame.playCard(room, data.player);
      if (!playResult.ok) {
        showToast(playResult.error || "出せません");
        return;
      }
      room = playResult.room;
      if (ctx.isOnline) await saveItoOnlineState();
      else await saveAndRender();
      if (room.gameState.lastPlayResult) {
        const r = room.gameState.lastPlayResult;
        if (r.success) showToast(r.name + " が " + r.number + " を出した — 成功！");
        else showToast("失敗！ライフ -1");
      }
      break;
    }

    case "ito-continue-play":
      if (!ItoGame.canManage(ctx)) return;
      room = ItoGame.continueAfterPlay(room);
      await saveAndRender();
      break;

    case "ito-next-stage": {
      if (!ItoGame.canManage(ctx)) return;
      if (ctx.isOnline && isHost()) ItoGame.attachItoSecrets(room, hostSecrets);
      room = ItoGame.startNextStage(room);
      if (ctx.isOnline) await saveItoOnlineState();
      else await saveAndRender();
      break;
    }

    case "ito-restart": {
      if (!ItoGame.canManage(ctx)) return;
      room = ItoGame.restart(room);
      if (ctx.isOnline) await saveItoOnlineState();
      else await saveAndRender();
      break;
    }

    /* --- Werewolf --- */
    case "wolf-show-role":
      {
        const revealEl = document.getElementById("roleReveal");
        if (revealEl) {
          revealEl.classList.add("is-flipped");
          const wrap = revealEl.closest(".role-reveal-wrap");
          if (wrap) wrap.classList.add("is-revealed");
        }
      }
      break;

    case "wolf-hide-role":
      {
        const revealEl = document.getElementById("roleReveal");
        if (revealEl) {
          revealEl.classList.remove("is-flipped");
          const wrap = revealEl.closest(".role-reveal-wrap");
          if (wrap) wrap.classList.remove("is-revealed");
        }
        room = WerewolfGame.closeRoleReveal(room);
        await saveAndRender();
      }
      break;

    case "wolf-show-medium-result":
      {
        const mediumEl = document.getElementById("mediumReveal");
        if (mediumEl) mediumEl.classList.remove("hidden");
      }
      break;

    case "wolf-hide-medium-result":
      {
        const mediumEl = document.getElementById("mediumReveal");
        if (mediumEl) mediumEl.classList.add("hidden");
        room = WerewolfGame.closeMediumReveal(room);
        await saveAndRender();
      }
      break;

    case "wolf-show-role-guide":
      {
        const guideEl = document.getElementById("wolfRoleGuidePanel");
        if (guideEl) guideEl.classList.remove("hidden");
      }
      break;

    case "wolf-hide-role-guide":
      {
        const guideEl = document.getElementById("wolfRoleGuidePanel");
        if (guideEl) guideEl.classList.add("hidden");
      }
      break;

    case "wolf-confirm-role":
      room = WerewolfGame.confirmRole(room, ctx.me.id);
      await saveAndRender();
      break;

    case "wolf-lobby-select-setup":
      if (!ctx.isHost) return;
      room = WerewolfGame.selectLobbySetup(room, data.setup);
      await saveAndRender();
      break;

    case "wolf-lobby-custom-role":
      if (!ctx.isHost) return;
      room = WerewolfGame.adjustLobbyCustomRole(room, data.role, parseInt(data.delta, 10) || 0);
      await saveAndRender();
      break;

    case "wolf-select-setup":
      if (!WerewolfGame.canManage(ctx)) return;
      room = WerewolfGame.selectSetup(room, data.setup);
      await saveAndRender();
      break;

    case "wolf-custom-role":
      if (!WerewolfGame.canManage(ctx)) return;
      room = WerewolfGame.adjustCustomRole(room, data.role, parseInt(data.delta, 10) || 0);
      await saveAndRender();
      break;

    case "wolf-begin-setup":
      if (!WerewolfGame.canManage(ctx)) return;
      {
        const setupError = WerewolfGame.beginWithSetup(room);
        if (setupError) {
          showToast(setupError);
          await saveAndRender();
          break;
        }
        if (Sync.isOnline()) {
          const bundle = Secrets.stripFromRoom(room);
          room = bundle.room;
          await saveAndRender({
            hostSecrets: bundle.hostSecrets,
            playerSecrets: bundle.playerSecrets
          });
        } else {
          await saveAndRender();
        }
      }
      break;

    case "wolf-start-night":
      if (!WerewolfGame.canManage(ctx)) return;
      room = WerewolfGame.startNight(room, getRolesMap(ctx));
      await saveAndRender();
      break;

    case "wolf-next-reveal":
      if (!WerewolfGame.canManage(ctx)) return;
      if (!room.gameState.revealDone) {
        showToast("画面を閉じてから次へ進んでください");
        return;
      }
      room = WerewolfGame.nextReveal(room, getRolesMap(ctx));
      await saveAndRender();
      break;

    case "wolf-next-night-turn":
      if (!WerewolfGame.canManage(ctx) || room.mode !== "local") return;
      {
        const rolesStep = getRolesMap(ctx);
        if (!WerewolfGame.canAdvanceNightTurn(room, rolesStep)) {
          showToast("行動を完了してから次へ進んでください");
          return;
        }
        room = WerewolfGame.advanceNightTurn(room);
      }
      await saveAndRender();
      break;

    case "wolf-kill":
      if (WerewolfGame.isFirstNight(room.gameState)) return;
      if (room.mode === "local") {
        const wolfTurn = WerewolfGame.getNightTurnPlayer(room);
        if (!wolfTurn || getRolesMap(ctx)[wolfTurn.id] !== "wolf") return;
      } else if (ctx.getRole(ctx.me.id) !== "wolf") {
        return;
      }
      room = WerewolfGame.setWolfTarget(room, data.player);
      await saveAndRender();
      break;

    case "wolf-seer":
      if (room.mode === "local") {
        const seerTurn = WerewolfGame.getNightTurnPlayer(room);
        if (!seerTurn || getRolesMap(ctx)[seerTurn.id] !== "seer") return;
      } else if (ctx.getRole(ctx.me.id) !== "seer") {
        return;
      }
      room = WerewolfGame.setSeerTarget(room, data.player, getRolesMap(ctx));
      await saveAndRender();
      break;

    case "wolf-guard":
      if (room.mode === "local") {
        const guardTurn = WerewolfGame.getNightTurnPlayer(room);
        if (!guardTurn || getRolesMap(ctx)[guardTurn.id] !== "hunter") return;
        room = WerewolfGame.setGuardTarget(room, guardTurn.id, data.player);
      } else {
        if (ctx.getRole(ctx.me.id) !== "hunter") return;
        room = WerewolfGame.setGuardTarget(room, ctx.me.id, data.player);
      }
      await saveAndRender();
      break;

    case "wolf-resolve-night":
      if (!WerewolfGame.canManage(ctx)) return;
      room = WerewolfGame.resolveNight(room, getRolesMap(ctx));
      await saveAndRender();
      break;

    case "wolf-start-day":
      if (!WerewolfGame.canManage(ctx)) return;
      room = WerewolfGame.startDayDiscussion(room);
      await saveAndRender();
      break;

    case "wolf-start-vote":
      if (!WerewolfGame.canManage(ctx)) return;
      room = WerewolfGame.startVoting(room);
      await saveAndRender();
      break;

    case "wolf-proceed-ready":
      if (!ctx.me || !ctx.me.id) return;
      if (room.phase !== "wolf_day") return;
      if (room.gameState.proceedReady && room.gameState.proceedReady[ctx.me.id]) return;
      room = WerewolfGame.markProceedReady(room, ctx.me.id);
      if (WerewolfGame.hasProceedMajority(room)) {
        room = WerewolfGame.startVoting(room);
      }
      await saveAndRender();
      break;

    case "wolf-vote":
      if (!data.player) {
        showToast("投票先を選んでください");
        return;
      }
      if (room.mode === "local") {
        const voter = WerewolfGame.getCurrentVotePlayer(room);
        if (!voter || !room.gameState.alive.includes(voter.id)) return;
        if (room.gameState.votes[voter.id]) return;
        room = WerewolfGame.castVote(room, voter.id, data.player);
        room = WerewolfGame.syncVoteTurn(room);
        if (WerewolfGame.allVoted(room)) {
          room = WerewolfGame.resolveVote(room, getRolesMap(ctx));
          if (!room.gameState.lastExecuted && room.phase === "wolf_after_vote") {
            showToast("同票のため処刑なし");
          }
        }
      } else {
        room = WerewolfGame.castVote(room, ctx.me.id, data.player);
      }
      await saveAndRender();
      break;

    case "wolf-next-vote-turn":
      if (!WerewolfGame.canManage(ctx) || room.mode !== "local") return;
      {
        const currentVoter = WerewolfGame.getCurrentVotePlayer(room);
        if (currentVoter && !room.gameState.votes[currentVoter.id]) {
          showToast("投票してから次へ進んでください");
          return;
        }
        room = WerewolfGame.syncVoteTurn(room);
      }
      await saveAndRender();
      break;

    case "wolf-resolve-vote":
      if (!WerewolfGame.canManage(ctx)) return;
      if (!WerewolfGame.canResolveVote(room)) {
        showToast("過半数の投票が揃うまで待ってください");
        return;
      }
      room = WerewolfGame.resolveVote(room, getRolesMap(ctx));
      if (!room.gameState.lastExecuted && room.phase === "wolf_after_vote") {
        showToast("同票のため処刑なし");
      }
      await saveAndRender();
      break;

    case "wolf-continue-night":
      if (!WerewolfGame.canManage(ctx)) return;
      if (
        room.mode === "local" &&
        WerewolfGame.needsMediumReveal(room, getRolesMap(ctx)) &&
        !room.gameState.mediumRevealDone
      ) {
        showToast("霊能者が結果を確認してから進んでください");
        return;
      }
      room = WerewolfGame.continueToNight(room, getRolesMap(ctx));
      await saveAndRender();
      break;

    /* --- 大富豪 --- */
    case "daifugo-toggle":
      if (!DaifugoGame.isMyTurn(ctx)) return;
      DaifugoGame.toggleCard(data.card);
      break;

    case "daifugo-clear":
      DaifugoGame.clearSelected();
      break;

    case "daifugo-rules-toggle":
      TrumpUi.togglePanel("daifugoRulesPanel");
      break;

    case "daifugo-local-rules-toggle":
      TrumpUi.togglePanel("daifugoLocalRulesPanel");
      break;

    case "sv-rules-toggle":
      TrumpUi.togglePanel("svRulesPanel");
      break;

    case "nn-rules-toggle":
      TrumpUi.togglePanel("nnRulesPanel");
      break;

    case "nn-toggle":
      if (!NinetyNineGame.isMyTurn(ctx)) return;
      NinetyNineGame.toggleCard(data.card);
      break;

    case "nn-play": {
      const actingId = NinetyNineGame._actingPlayer(ctx);
      if (!NinetyNineGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const cardId = NinetyNineGame._selected;
      if (!cardId) { showToast("カードを選んでください"); return; }

      const gs = room.gameState;
      if (!gs.hands) gs.hands = {};

      if (!ctx.isOnline) {
        const result = NinetyNineGame.playCard(room, actingId, cardId, gs.hands);
        if (!result.ok) { showToast(result.error || "出せません"); return; }
        NinetyNineGame.clearSelected();
        if (result.bust) showToast("99を超えて脱落！");
        if (room.phase === "ninety_nine_result") showToast("勝者が決まりました！");
        await saveAndRender();
        break;
      }

      await withOnlineMutation(async function () {
        const hand = NinetyNineGame.getHand(ctx, ctx.me.id);
        const tempHands = {};
        tempHands[ctx.me.id] = hand;
        const result = NinetyNineGame.playCard(room, ctx.me.id, cardId, tempHands);
        if (!result.ok) { showToast(result.error || "出せません"); return; }

        await persistPlayerHand(ctx, result.hand || []);
        NinetyNineGame.clearSelected();
        if (result.bust) showToast("99を超えて脱落！");
        if (room.phase === "ninety_nine_result") showToast("勝者が決まりました！");
        await saveAndRender();
      });
      break;
    }

    case "nn-effect": {
      const gs = room.gameState;
      if (!gs.pendingChoice || gs.pendingChoice.playerId !== ctx.me.id) {
        showToast("選べる効果がありません");
        return;
      }
      const result = NinetyNineGame.applyChoice(room, ctx.me.id, data.choice, data.value);
      if (!result.ok) { showToast(result.error || "選べません"); return; }
      if (result.bust) showToast("99を超えて脱落！");
      if (room.phase === "ninety_nine_result") showToast("勝者が決まりました！");
      await saveAndRender();
      break;
    }

    /* --- 爆弾 --- */
    case "sk-rules-toggle":
      TrumpUi.togglePanel("skRulesPanel");
      break;

    case "sk-toggle":
      if (!SkullGame.isMyTurn(ctx)) return;
      SkullGame.toggleCard(data.card);
      break;

    case "sk-play": {
      const actingId = SkullGame._actingPlayer(ctx);
      if (!SkullGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const cardId = SkullGame._selected;
      if (!cardId) { showToast("カードを選んでください"); return; }

      const gs = room.gameState;
      if (!gs.hands) gs.hands = {};

      if (!ctx.isOnline) {
        const result = SkullGame.playCard(room, actingId, cardId, gs.hands);
        if (!result.ok) { showToast(result.error || "出せません"); return; }
        SkullGame.clearSelected();
        if (result.beginFlip) showToast("裏返しフェーズ！");
        if (room.phase === "skull_result") showToast("勝者が決まりました！");
        await saveAndRender();
        break;
      }

      const hand = SkullGame.getHand(ctx, ctx.me.id);
      const tempHands = {};
      tempHands[ctx.me.id] = hand;
      const result = SkullGame.playCard(room, ctx.me.id, cardId, tempHands);
      if (!result.ok) { showToast(result.error || "出せません"); return; }

      const newHand = result.hand || [];
      playerSecret = playerSecret || {};
      playerSecret.hand = newHand;
      await Sync.updatePlayerSecret(roomCode, ctx.me.id, { hand: newHand });
      if (hostSecrets && hostSecrets.hands) {
        hostSecrets.hands[ctx.me.id] = newHand;
        await Sync.updateHostSecrets(roomCode, { hands: hostSecrets.hands });
      }

      SkullGame.clearSelected();
      if (result.beginFlip) showToast("裏返しフェーズ！");
      if (room.phase === "skull_result") showToast("勝者が決まりました！");
      await saveSkullOnlineState();
      break;
    }

    case "sk-bid": {
      const actingId = SkullGame._actingPlayer(ctx);
      if (!SkullGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const amount = data.amount ? parseInt(data.amount, 10) : 1;
      const result = SkullGame.startBid(room, actingId, amount);
      if (!result.ok) { showToast(result.error || "ビッドできません"); return; }
      if (result.beginFlip) showToast("裏返しフェーズ！");
      if (ctx.isOnline) await saveSkullOnlineState();
      else await saveAndRender();
      break;
    }

    case "sk-pass": {
      const actingId = SkullGame._actingPlayer(ctx);
      if (!SkullGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const result = SkullGame.passBid(room, actingId);
      if (!result.ok) { showToast(result.error || "パスできません"); return; }
      if (result.beginFlip) showToast("裏返しフェーズ！");
      if (ctx.isOnline) await saveSkullOnlineState();
      else await saveAndRender();
      break;
    }

    case "sk-flip": {
      if (!SkullGame.isFlipper(ctx)) { showToast("あなたの番ではありません"); return; }
      const result = SkullGame.requestFlip(room, ctx.me.id, data.owner, data.card);
      if (!result.ok) { showToast(result.error || "裏返せません"); return; }

      if (!ctx.isOnline) {
        const type = SkullGame.getCardType(ctx, data.card);
        SkullGame.resolveFlip(room, type, null);
        if (room.phase === "skull_result") showToast("勝者が決まりました！");
        await saveAndRender();
        break;
      }

      if (isHost() && hostSecrets && hostSecrets.skullTypes) {
        const type = hostSecrets.skullTypes[data.card];
        SkullGame.resolveFlip(room, type, hostSecrets);
        if (hostSecrets.hands) SkullGame.syncHandsToSecrets(room, hostSecrets);
        if (room.phase === "skull_result") showToast("勝者が決まりました！");
        await saveSkullOnlineState();
      } else {
        await saveSkullOnlineState();
      }
      break;
    }

    case "sk-pick-loss": {
      const gs = room.gameState;
      if (!gs.pickLoss || gs.pickLoss.pickerId !== ctx.me.id) {
        showToast("選べる状態ではありません");
        return;
      }

      if (!ctx.isOnline) {
        const result = SkullGame.pickLossCard(room, ctx.me.id, data.card, gs.hands, null);
        if (!result.ok) { showToast(result.error || "選べません"); return; }
        if (room.phase === "skull_result") showToast("勝者が決まりました！");
        await saveAndRender();
        break;
      }

      if (isHost()) {
        const loserId = gs.pickLoss.loserId;
        const result = SkullGame.pickLossCard(room, ctx.me.id, data.card, null, hostSecrets);
        if (!result.ok) { showToast(result.error || "選べません"); return; }
        if (hostSecrets) SkullGame.syncHandsToSecrets(room, hostSecrets);
        if (hostSecrets && hostSecrets.hands && hostSecrets.hands[loserId]) {
          await Sync.updatePlayerSecret(roomCode, loserId, { hand: hostSecrets.hands[loserId] });
        }
        if (room.phase === "skull_result") showToast("勝者が決まりました！");
        await saveSkullOnlineState();
      } else {
        const result = SkullGame.requestPickLoss(room, ctx.me.id, data.card);
        if (!result.ok) { showToast(result.error || "選べません"); return; }
        await saveSkullOnlineState();
      }
      break;
    }

    case "sk-continue": {
      const result = SkullGame.dismissResult(room);
      if (!result.ok) return;
      if (ctx.isOnline) await saveSkullOnlineState();
      else await saveAndRender();
      break;
    }

    /* --- ブラックジャック --- */
    case "bj-bet": {
      if (ctx.isOnline && isHost()) BlackjackGame.attachBjSecrets(room, hostSecrets);
      const result = BlackjackGame.placeBet(room, ctx.me.id, data.amount);
      if (!result.ok) { showToast(result.error || "ベットできません"); return; }
      if (!ctx.isOnline && room.gameState.pendingDeal) {
        BlackjackGame.dealRound(room, null);
      }
      if (ctx.isOnline) await saveBlackjackOnlineState();
      else await saveAndRender();
      break;
    }

    case "bj-insurance": {
      if (ctx.isOnline && isHost()) BlackjackGame.attachBjSecrets(room, hostSecrets);
      const take = data.take === "1";
      const result = BlackjackGame.setInsurance(room, ctx.me.id, take);
      if (!result.ok) { showToast(result.error || "選択できません"); return; }
      if (ctx.isOnline) await saveBlackjackOnlineState();
      else await saveAndRender();
      break;
    }

    case "bj-hit": {
      if (!BlackjackGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      if (ctx.isOnline) {
        const result = BlackjackGame.queuePlayerAction(room, ctx.me.id, "hit");
        if (!result.ok) { showToast(result.error || "ヒットできません"); return; }
        await saveBlackjackOnlineState();
      } else {
        const result = BlackjackGame.hit(room, ctx.me.id, hostSecrets);
        if (!result.ok) { showToast(result.error || "ヒットできません"); return; }
        maybeRunBlackjackDealerLocal(ctx);
        await saveAndRender();
      }
      break;
    }

    case "bj-stand": {
      if (!BlackjackGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      if (ctx.isOnline) {
        const result = BlackjackGame.queuePlayerAction(room, ctx.me.id, "stand");
        if (!result.ok) { showToast(result.error || "できません"); return; }
        await saveBlackjackOnlineState();
      } else {
        const result = BlackjackGame.stand(room, ctx.me.id);
        if (!result.ok) { showToast(result.error || "できません"); return; }
        maybeRunBlackjackDealerLocal(ctx);
        await saveAndRender();
      }
      break;
    }

    case "bj-surrender": {
      if (!BlackjackGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      if (ctx.isOnline) {
        const result = BlackjackGame.queuePlayerAction(room, ctx.me.id, "surrender");
        if (!result.ok) { showToast(result.error || "できません"); return; }
        await saveBlackjackOnlineState();
      } else {
        const result = BlackjackGame.surrender(room, ctx.me.id);
        if (!result.ok) { showToast(result.error || "できません"); return; }
        maybeRunBlackjackDealerLocal(ctx);
        await saveAndRender();
      }
      break;
    }

    case "bj-double": {
      if (!BlackjackGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      if (ctx.isOnline) {
        const result = BlackjackGame.queuePlayerAction(room, ctx.me.id, "double");
        if (!result.ok) { showToast(result.error || "できません"); return; }
        await saveBlackjackOnlineState();
      } else {
        const result = BlackjackGame.doubleDown(room, ctx.me.id, hostSecrets);
        if (!result.ok) { showToast(result.error || "できません"); return; }
        maybeRunBlackjackDealerLocal(ctx);
        await saveAndRender();
      }
      break;
    }

    case "bj-split": {
      if (!BlackjackGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      if (ctx.isOnline) {
        const result = BlackjackGame.queuePlayerAction(room, ctx.me.id, "split");
        if (!result.ok) { showToast(result.error || "できません"); return; }
        await saveBlackjackOnlineState();
      } else {
        const result = BlackjackGame.split(room, ctx.me.id, hostSecrets);
        if (!result.ok) { showToast(result.error || "できません"); return; }
        maybeRunBlackjackDealerLocal(ctx);
        await saveAndRender();
      }
      break;
    }

    case "bj-next-round": {
      if (!ctx.isHost) return;
      if (ctx.isOnline && isHost()) BlackjackGame.attachBjSecrets(room, hostSecrets);
      const result = BlackjackGame.nextRound(room);
      if (!result.ok) { showToast(result.error || "次のラウンドに進めません"); return; }
      if (result.gameOver) showToast("全員チップ切れで終了");
      if (ctx.isOnline) await saveBlackjackOnlineState();
      else await saveAndRender();
      break;
    }

    case "doubt-rules-toggle":
      TrumpUi.togglePanel("doubtRulesPanel");
      break;

    case "om-rules-toggle":
      TrumpUi.togglePanel("omRulesPanel");
      break;

    case "daifugo-play": {
      const tableEl = app.querySelector(".table-area");
      if (tableEl) {
        tableEl.classList.add("is-play-flash");
        setTimeout(function () {
          tableEl.classList.remove("is-play-flash");
        }, 380);
      }
      const actingId = DaifugoGame._actingPlayer(ctx);
      if (!DaifugoGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const cardIds = DaifugoGame.getSelected();
      if (!cardIds.length) { showToast("カードを選んでください"); return; }

      const gs = room.gameState;

      if (!ctx.isOnline) {
        if (!gs.hands) gs.hands = {};
        const result = DaifugoGame.playCards(room, actingId, cardIds, gs.hands);
        if (!result.ok) { showToast(result.error || "出せません"); return; }
        DaifugoGame.clearSelected();
        if (result.roundEnd) showToast("ラウンド終了");
        await saveAndRender();
        break;
      }

      await withOnlineMutation(async function () {
        const hand = DaifugoGame.getHand(ctx, ctx.me.id);
        const selected = hand.filter(function (c) { return cardIds.indexOf(c.id) >= 0; });
        const play = DaifugoGame.analyzePlay(selected);
        if (!play) { showToast("出せる組み合わせではありません"); return; }
        if (gs.table && !DaifugoGame.canBeat(gs.table, play, DaifugoGame._isRevolutionActive(gs))) {
          showToast("場のカードより強くありません"); return;
        }

        const tempHands = {};
        tempHands[ctx.me.id] = hand;
        const result = DaifugoGame.playCards(room, ctx.me.id, cardIds, tempHands);
        if (!result.ok) { showToast(result.error || "出せません"); return; }

        await persistPlayerHand(ctx, result.hand || []);
        DaifugoGame.clearSelected();
        if (result.tochi) showToast("都落ち！");
        if (result.roundEnd) showToast("ラウンド終了");
        await saveAndRender();
      });
      break;
    }

    case "daifugo-pass": {
      const actingId = DaifugoGame._actingPlayer(ctx);
      if (!DaifugoGame.isMyTurn(ctx)) return;
      if (!ctx.isOnline) {
        const result = DaifugoGame.pass(room, actingId);
        if (!result.ok) { showToast(result.error || "パスできません"); return; }
        DaifugoGame.clearSelected();
        await saveAndRender();
        break;
      }
      await withOnlineMutation(async function () {
        const result = DaifugoGame.pass(room, actingId);
        if (!result.ok) { showToast(result.error || "パスできません"); return; }
        DaifugoGame.clearSelected();
        await saveAndRender();
      });
      break;
    }

    case "daifugo-seven-target": {
      const actingId = DaifugoGame._actingPlayer(ctx);
      if (!DaifugoGame.isMyTurn(ctx) || !data.player) return;
      if (!ctx.isOnline) {
        const result = DaifugoGame.chooseSevenTarget(room, actingId, data.player);
        if (!result.ok) { showToast(result.error || "選べません"); return; }
        await saveAndRender();
        break;
      }
      await withOnlineMutation(async function () {
        const result = DaifugoGame.chooseSevenTarget(room, actingId, data.player);
        if (!result.ok) { showToast(result.error || "選べません"); return; }
        await saveAndRender();
      });
      break;
    }

    case "daifugo-seven-give": {
      const actingId = DaifugoGame._actingPlayer(ctx);
      if (!DaifugoGame.isMyTurn(ctx)) return;
      const cardIds = DaifugoGame.getSelected();
      const pending = room.gameState.pending;
      if (!pending || cardIds.length !== pending.count) {
        showToast(pending ? pending.count + "枚選んでください" : "7渡し中ではありません");
        return;
      }

      if (!ctx.isOnline) {
        if (!room.gameState.hands) room.gameState.hands = {};
        const gsHands = room.gameState.hands;
        if (!gsHands[pending.targetId]) gsHands[pending.targetId] = [];
        const result = DaifugoGame.submitSevenGive(room, actingId, cardIds, gsHands);
        if (!result.ok) { showToast(result.error || "渡せません"); return; }
        DaifugoGame.clearSelected();
        await saveAndRender();
        break;
      }

      await withOnlineMutation(async function () {
        const hand = DaifugoGame.getHand(ctx, ctx.me.id);
        const tempHands = {};
        tempHands[ctx.me.id] = hand;
        tempHands[pending.targetId] = await getRemoteTrumpHand(pending.targetId);
        const result = DaifugoGame.submitSevenGive(room, ctx.me.id, cardIds, tempHands);
        if (!result.ok) { showToast(result.error || "渡せません"); return; }
        await persistPlayerHand(ctx, result.hand);
        await Sync.patchHostHand(roomCode, pending.targetId, result.toHand);
        if (hostSecrets && hostSecrets.hands) {
          hostSecrets.hands[pending.targetId] = result.toHand;
        }
        DaifugoGame.clearSelected();
        await saveAndRender();
      });
      break;
    }

    case "daifugo-seven-return": {
      const actingId = DaifugoGame._actingPlayer(ctx);
      if (!DaifugoGame.isMyTurn(ctx)) return;
      const cardIds = DaifugoGame.getSelected();
      const pending = room.gameState.pending;
      if (!pending || cardIds.length !== pending.count) {
        showToast(pending ? pending.count + "枚選んでください" : "7渡し中ではありません");
        return;
      }

      if (!ctx.isOnline) {
        if (!room.gameState.hands) room.gameState.hands = {};
        const gsHands = room.gameState.hands;
        if (!gsHands[pending.toId]) gsHands[pending.toId] = [];
        const result = DaifugoGame.submitSevenReturn(room, actingId, cardIds, gsHands);
        if (!result.ok) { showToast(result.error || "返せません"); return; }
        DaifugoGame.clearSelected();
        await saveAndRender();
        break;
      }

      await withOnlineMutation(async function () {
        const hand = DaifugoGame.getHand(ctx, ctx.me.id);
        const tempHands = {};
        tempHands[ctx.me.id] = hand;
        tempHands[pending.toId] = await getRemoteTrumpHand(pending.toId);
        const result = DaifugoGame.submitSevenReturn(room, ctx.me.id, cardIds, tempHands);
        if (!result.ok) { showToast(result.error || "返せません"); return; }
        await persistPlayerHand(ctx, result.fromHand);
        await Sync.patchHostHand(roomCode, pending.toId, result.toHand);
        if (hostSecrets && hostSecrets.hands) {
          hostSecrets.hands[pending.toId] = result.toHand;
        }
        DaifugoGame.clearSelected();
        await saveAndRender();
      });
      break;
    }

    case "daifugo-ten-discard": {
      const actingId = DaifugoGame._actingPlayer(ctx);
      if (!DaifugoGame.isMyTurn(ctx)) return;
      const cardIds = DaifugoGame.getSelected();
      const pending = room.gameState.pending;
      if (!pending) return;
      if (cardIds.length > pending.count) { showToast("捨てすぎです"); return; }

      if (!ctx.isOnline) {
        const gs = room.gameState;
        const result = DaifugoGame.discardTenExtra(room, actingId, cardIds);
        if (!result.ok) { showToast(result.error || "捨てられません"); return; }
        DaifugoGame.clearSelected();
        await saveAndRender();
        break;
      }

      await withOnlineMutation(async function () {
        const hand = DaifugoGame.getHand(ctx, ctx.me.id);
        const tempHands = {};
        tempHands[ctx.me.id] = hand;
        const result = DaifugoGame.discardTenExtra(room, ctx.me.id, cardIds, tempHands);
        if (!result.ok) { showToast(result.error || "捨てられません"); return; }
        await persistPlayerHand(ctx, result.hand);
        DaifugoGame.clearSelected();
        await saveAndRender();
      });
      break;
    }

    case "daifugo-ten-skip": {
      const actingId = DaifugoGame._actingPlayer(ctx);
      if (!DaifugoGame.isMyTurn(ctx)) return;
      if (!ctx.isOnline) {
        const result = DaifugoGame.skipTenDiscard(room, actingId);
        if (!result.ok) return;
        DaifugoGame.clearSelected();
        await saveAndRender();
        break;
      }
      await withOnlineMutation(async function () {
        const result = DaifugoGame.skipTenDiscard(room, actingId);
        if (!result.ok) return;
        DaifugoGame.clearSelected();
        await saveAndRender();
      });
      break;
    }

    case "daifugo-exchange": {
      const step = DaifugoGame.getCurrentExchangeStep(room);
      if (!step) return;
      const actingId = ctx.isOnline ? ctx.me.id : step.fromId;
      if (actingId !== step.fromId) return;
      const cardIds = DaifugoGame.getSelected();
      if (!cardIds.length) { showToast(step.count + "枚選んでください"); return; }

      if (!ctx.isOnline) {
        const gs = room.gameState;
        const result = DaifugoGame.submitExchangeCards(room, actingId, cardIds, gs.hands);
        if (!result.ok) { showToast(result.error || "交換できません"); return; }
        DaifugoGame.clearSelected();
        if (result.exchangeDone) {
          room = DaifugoGame.startNextRound(room);
        }
        await saveAndRender();
        break;
      }

      await withOnlineMutation(async function () {
        const hand = DaifugoGame.getHand(ctx, ctx.me.id);
        const tempHands = {};
        tempHands[ctx.me.id] = hand;
        tempHands[step.toId] = await getRemoteTrumpHand(step.toId);
        const result = DaifugoGame.submitExchangeCards(room, ctx.me.id, cardIds, tempHands);
        if (!result.ok) { showToast(result.error || "交換できません"); return; }

        await persistPlayerHand(ctx, result.hand);
        await Sync.patchHostHand(roomCode, step.toId, tempHands[step.toId]);

        DaifugoGame.clearSelected();
        if (result.exchangeDone && ctx.isHost) {
          room = DaifugoGame.startNextRound(room);
          const bundle = Secrets.stripFromRoom(room);
          room = bundle.room;
          hostSecrets = bundle.hostSecrets;
          playerSecret = bundle.playerSecrets[ctx.me.id] || playerSecret;
        }
        await saveAndRender({
          hostSecrets: hostSecrets,
          playerSecrets: playerSecret ? { [ctx.me.id]: playerSecret } : {}
        });
      });
      break;
    }

    case "daifugo-exchange-auto":
      if (!ctx.isHost) return;
      {
        const gs = room.gameState;
        const hands = ctx.isOnline && hostSecrets && hostSecrets.hands
          ? hostSecrets.hands
          : gs.hands;
        DaifugoGame._applyExchangeAuto(room, hands);
        if (ctx.isOnline && hostSecrets) {
          hostSecrets.hands = hands;
          await Sync.updateHostSecrets(roomCode, { hands: hands });
        } else {
          gs.hands = hands;
        }
        room = DaifugoGame.startNextRound(room);
        if (ctx.isOnline) {
          const bundle = Secrets.stripFromRoom(room);
          room = bundle.room;
          await saveAndRender({ hostSecrets: bundle.hostSecrets });
        } else {
          await saveAndRender();
        }
      }
      break;

    case "daifugo-next-round":
      if (!ctx.isHost) return;
      room = DaifugoGame.startNextRound(room);
      if (ctx.isOnline) {
        const bundle = Secrets.stripFromRoom(room);
        room = bundle.room;
        await saveAndRender({ hostSecrets: bundle.hostSecrets });
      } else {
        await saveAndRender();
      }
      break;

    /* --- ダウト --- */
    case "doubt-toggle":
      if (!DoubtGame.isMyTurn(ctx)) return;
      DoubtGame.toggleCard(data.card);
      break;

    case "doubt-clear":
      DoubtGame.clearSelected();
      break;

    case "doubt-play": {
      const actingId = DoubtGame._actingPlayer(ctx);
      if (!DoubtGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const cardIds = DoubtGame.getSelected();
      if (!cardIds.length) { showToast("1〜4枚選んでください"); return; }
      if (cardIds.length > 4) { showToast("最大4枚です"); return; }

      const gs = room.gameState;

      if (!ctx.isOnline) {
        if (!gs.hands) gs.hands = {};
        const result = DoubtGame.playCards(room, actingId, cardIds, gs.hands);
        if (!result.ok) { showToast(result.error || "出せません"); return; }
        DoubtGame.clearSelected();
        await saveAndRender();
        break;
      }

      await withOnlineMutation(async function () {
        const hand = DoubtGame.getHand(ctx, ctx.me.id);
        const tempHands = {};
        tempHands[ctx.me.id] = hand;
        const result = DoubtGame.playCards(room, ctx.me.id, cardIds, tempHands);
        if (!result.ok) { showToast(result.error || "出せません"); return; }

        await persistPlayerHand(ctx, result.hand || []);
        DoubtGame.clearSelected();
        await saveAndRender();
      });
      break;
    }

    case "doubt-proceed": {
      const gs = room.gameState;
      const nextId = DoubtGame._nextPlayerAfterLast(room);
      if (ctx.isOnline && ctx.me.id !== nextId) {
        showToast("次のプレイヤーだけが進められます");
        return;
      }

      let hands = gs.hands;
      if (ctx.isOnline && gs.lastPlay) {
        hands = {};
        for (let i = 0; i < room.players.length; i++) {
          const p = room.players[i];
          if (p.id === ctx.me.id && playerSecret && playerSecret.hand) {
            hands[p.id] = playerSecret.hand;
          } else {
            const s = await Sync.getPlayerSecret(roomCode, p.id);
            if (s && s.hand) hands[p.id] = s.hand;
          }
        }
      }

      const result = DoubtGame.proceed(room, nextId, hands);
      if (!result.ok) { showToast(result.error || "進められません"); return; }
      if (room.phase === "doubt_result") showToast("勝者が決まりました！");
      await saveAndRender();
      break;
    }

    case "doubt-call": {
      const doubterId = data.doubter || ctx.me.id;
      const gs = room.gameState;

      if (doubterId === gs.lastPlay.playerId) {
        showToast("自分のプレイにはダウトできません");
        return;
      }

      if (!ctx.isOnline) {
        if (!gs.hands) gs.hands = {};
        const result = DoubtGame.callDoubt(room, doubterId, gs.hands);
        if (!result.ok) { showToast(result.error || "ダウトできません"); return; }
        showToast(result.reveal && result.reveal.wasLie ? "嘘がバレた！" : "本当だった！");
        if (room.phase === "doubt_result") showToast("勝者が決まりました！");
        await saveAndRender();
        break;
      }

      const tempHands = {};
      for (let i = 0; i < room.players.length; i++) {
        const p = room.players[i];
        if (p.id === ctx.me.id && playerSecret && playerSecret.hand) {
          tempHands[p.id] = playerSecret.hand.slice();
        } else {
          const s = await Sync.getPlayerSecret(roomCode, p.id);
          tempHands[p.id] = (s && s.hand) ? s.hand.slice() : [];
        }
      }

      const result = DoubtGame.callDoubt(room, doubterId, tempHands);
      if (!result.ok) { showToast(result.error || "ダウトできません"); return; }

      const loserId = result.reveal.loserId;
      const newHand = result.hand || [];
      await Sync.updatePlayerSecret(roomCode, loserId, { hand: newHand });
      if (loserId === ctx.me.id) {
        playerSecret = playerSecret || {};
        playerSecret.hand = newHand;
      }
      if (hostSecrets && hostSecrets.hands) {
        hostSecrets.hands[loserId] = newHand;
        await Sync.updateHostSecrets(roomCode, { hands: hostSecrets.hands });
      }

      showToast(result.reveal.wasLie ? "嘘がバレた！" : "本当だった！");
      if (room.phase === "doubt_result") showToast("勝者が決まりました！");
      await saveAndRender();
      break;
    }

    /* --- ワードウルフ --- */
    case "ww-show-word":
      document.getElementById("wordReveal").classList.remove("hidden");
      break;

    case "ww-confirm-word":
      room = WordWolfGame.confirmWord(room, ctx.me.id);
      await saveAndRender();
      break;

    case "ww-start-discuss":
      if (!WordWolfGame.canManage(ctx)) return;
      room = WordWolfGame.startDiscussion(room);
      await saveAndRender();
      break;

    case "ww-next-reveal":
      if (!WordWolfGame.canManage(ctx)) return;
      room = WordWolfGame.nextReveal(room);
      await saveAndRender();
      break;

    case "ww-start-vote":
      if (!WordWolfGame.canManage(ctx)) return;
      room = WordWolfGame.startVote(room);
      await saveAndRender();
      break;

    case "ww-proceed-ready":
      if (!ctx.me || !ctx.me.id) return;
      if (room.phase !== "wordwolf_discuss") return;
      if (room.gameState.proceedReady && room.gameState.proceedReady[ctx.me.id]) return;
      room = WordWolfGame.markProceedReady(room, ctx.me.id);
      if (WordWolfGame.hasProceedMajority(room)) {
        room = WordWolfGame.startVote(room);
      }
      await saveAndRender();
      break;

    case "ww-vote": {
      let voterId = ctx.me.id;
      if (room.mode === "local") {
        const voter = WordWolfGame.getCurrentVoter(room);
        if (!voter) {
          showToast("全員の投票が終わっています");
          return;
        }
        voterId = voter.id;
      }
      room = WordWolfGame.castVote(room, voterId, data.player);
      await saveAndRender();
      break;
    }

    case "ww-resolve-vote":
      if (!WordWolfGame.canManage(ctx)) return;
      if (!WordWolfGame.canResolveVote(room)) {
        showToast("過半数の投票が揃うまで待ってください");
        return;
      }
      room = WordWolfGame.resolveVote(room, getWordWolfRoles(ctx));
      await saveAndRender();
      break;

    case "ww-submit-guess": {
      if (room.gameState.executed && room.gameState.executed !== ctx.me.id && Sync.isOnline()) {
        showToast("ワードウルフ本人だけが回答できます");
        return;
      }
      const guessInput = document.getElementById("wwGuessInput");
      if (!guessInput || !guessInput.value.trim()) {
        showToast("市民のお題を入力してください");
        return;
      }
      room = WordWolfGame.submitWolfGuess(room, guessInput.value);
      await saveAndRender();
      break;
    }

    case "ww-skip-guess":
      if (!WordWolfGame.canManage(ctx)) return;
      room.gameState.winner = "citizens";
      room.phase = "wordwolf_end";
      await saveAndRender();
      break;

    case "ww-restart":
      if (!WordWolfGame.canManage(ctx)) return;
      room = WordWolfGame.init(room);
      if (Sync.isOnline()) {
        const bundle = Secrets.stripFromRoom(room);
        room = bundle.room;
        await saveAndRender({
          hostSecrets: bundle.hostSecrets,
          playerSecrets: bundle.playerSecrets
        });
      } else {
        await saveAndRender();
      }
      break;

    case "ww-lobby-theme":
      if (!WordWolfGame.canManage(ctx)) return;
      room = WordWolfGame.selectLobbyTheme(room, data.theme);
      await saveAndRender();
      break;

    case "ww-lobby-wolves": {
      if (!WordWolfGame.canManage(ctx)) return;
      const delta = parseInt(data.delta, 10);
      if (!delta) return;
      room = WordWolfGame.adjustLobbyWolfCount(room, delta);
      await saveAndRender();
      break;
    }

    /* --- お絵描き人狼 --- */
    case "dw-show-word": {
      const el = document.getElementById("dwWordReveal");
      if (el) el.classList.remove("hidden");
      break;
    }

    case "dw-confirm-word":
      room = DrawingWerewolfGame.confirmWord(room, ctx.me.id);
      await saveAndRender();
      break;

    case "dw-start-draw":
      if (!DrawingWerewolfGame.canManage(ctx)) return;
      room = DrawingWerewolfGame.startDraw(room);
      await saveAndRender();
      break;

    case "dw-next-reveal":
      if (!DrawingWerewolfGame.canManage(ctx)) return;
      room = DrawingWerewolfGame.nextReveal(room);
      await saveAndRender();
      break;

    case "dw-submit-draw": {
      const drawer = DrawingWerewolfGame.getCurrentDrawer(room);
      if (!drawer) {
        showToast("全員の加筆が終わっています");
        return;
      }
      if (room.mode !== "local" && drawer.id !== ctx.me.id) {
        showToast("あなたの番ではありません");
        return;
      }
      const dataUrl = DrawingWerewolfGame.captureCanvas();
      const prevKey = DrawingWerewolfGame.draftKey(room, drawer.id);
      const result = DrawingWerewolfGame.submitDrawing(room, drawer.id, dataUrl);
      if (!result.ok) {
        showToast(result.error || "提出できませんでした");
        return;
      }
      room = result.room;
      if (DrawingWerewolfGame._drafts) delete DrawingWerewolfGame._drafts[prevKey];
      await saveAndRender();
      break;
    }

    case "dw-start-discuss":
      if (!DrawingWerewolfGame.canManage(ctx)) return;
      room = DrawingWerewolfGame.startDiscussion(room);
      await saveAndRender();
      break;

    case "dw-start-vote":
      if (!DrawingWerewolfGame.canManage(ctx)) return;
      room = DrawingWerewolfGame.startVote(room);
      await saveAndRender();
      break;

    case "dw-proceed-ready":
      if (!ctx.me || !ctx.me.id) return;
      if (room.phase !== "draw_werewolf_discuss") return;
      if (room.gameState.proceedReady && room.gameState.proceedReady[ctx.me.id]) return;
      room = DrawingWerewolfGame.markProceedReady(room, ctx.me.id);
      if (DrawingWerewolfGame.hasProceedMajority(room)) {
        room = DrawingWerewolfGame.startVote(room);
      }
      await saveAndRender();
      break;

    case "dw-vote": {
      let voterId = ctx.me.id;
      if (room.mode === "local") {
        const voter = DrawingWerewolfGame.getCurrentVoter(room);
        if (!voter) {
          showToast("全員の投票が終わっています");
          return;
        }
        voterId = voter.id;
      }
      room = DrawingWerewolfGame.castVote(room, voterId, data.player);
      await saveAndRender();
      break;
    }

    case "dw-resolve-vote":
      if (!DrawingWerewolfGame.canManage(ctx)) return;
      if (!DrawingWerewolfGame.canResolveVote(room)) {
        showToast("過半数の投票が揃うまで待ってください");
        return;
      }
      room = DrawingWerewolfGame.resolveVote(room, DrawingWerewolfGame.getRolesMap(ctx));
      await saveAndRender();
      break;

    case "dw-submit-guess": {
      if (room.phase !== "draw_werewolf_wolf_guess") return;
      if (room.mode !== "local") {
        if (!room.gameState.executed || room.gameState.executed !== ctx.me.id) {
          showToast("人狼本人だけが回答できます");
          return;
        }
      }
      const guessInput = document.getElementById("dwGuessInput");
      const rawGuess = guessInput ? guessInput.value : "";
      const cleanedGuess = DrawingWerewolfGame.sanitizeHiraganaInput(rawGuess);
      if (guessInput) guessInput.value = cleanedGuess;
      if (!cleanedGuess) {
        showToast("ひらがなでお題を入力してください");
        return;
      }
      if (!DrawingWerewolfGame.isHiraganaAnswer(cleanedGuess)) {
        showToast("ひらがなのみで答えてください");
        return;
      }
      room = DrawingWerewolfGame.submitWolfGuess(room, cleanedGuess);
      if (room.gameState.wolfGuessCorrect) {
        showToast("正解！人狼の逆転勝利！");
      } else {
        showToast("不正解…市民の勝利");
      }
      await saveAndRender();
      break;
    }

    case "dw-restart":
      if (!DrawingWerewolfGame.canManage(ctx)) return;
      room = DrawingWerewolfGame.init(room);
      if (Sync.isOnline()) {
        const bundle = Secrets.stripFromRoom(room);
        room = bundle.room;
        await saveAndRender({
          hostSecrets: bundle.hostSecrets,
          playerSecrets: bundle.playerSecrets
        });
      } else {
        await saveAndRender();
      }
      break;

    case "dw-lobby-theme":
      if (!DrawingWerewolfGame.canManage(ctx)) return;
      room = DrawingWerewolfGame.selectLobbyTheme(room, data.dwTheme || data.theme);
      await saveAndRender();
      break;

    case "dw-lobby-wolves": {
      if (!DrawingWerewolfGame.canManage(ctx)) return;
      const delta = parseInt(data.delta, 10);
      if (!delta) return;
      room = DrawingWerewolfGame.adjustLobbyWolfCount(room, delta);
      await saveAndRender();
      break;
    }

    /* --- NGワードゲーム --- */
    case "ng-lobby-theme":
      if (!NgWordGame.canManage(ctx)) return;
      if (!data.theme) return;
      room = NgWordGame.selectLobbyTheme(room, data.theme);
      await saveAndRender();
      break;

    case "ng-violation": {
      if (!data.player) {
        showToast("対象プレイヤーを選んでください");
        return;
      }
      if (ctx.me && NgWordGame.isEliminated(room, ctx.me.id)) {
        showToast("脱落したため早押しできません");
        return;
      }
      if (ctx.me && data.player === ctx.me.id) {
        showToast("自分自身は選べません");
        return;
      }
      const target = room.players.find(function (p) { return p.id === data.player; });
      if (!target) return;
      const actorId = ctx.me ? ctx.me.id : null;
      if (!NgWordGame.canBuzzTarget(room, data.player, actorId)) {
        const violation = NgWordGame.getViolation(room.gameState, data.player);
        if (actorId && violation && violation.buzzers.indexOf(actorId) >= 0) {
          showToast("すでに押しています");
        } else if (NgWordGame.getNextBuzzPoints(room, data.player) <= 0) {
          showToast("これ以上点は入りません");
        } else {
          showToast(target.name + " さんには今押せません");
        }
        return;
      }
      const outcome = NgWordGame.markPlayerViolation(room, data.player, actorId);
      room = outcome.room;
      const result = outcome.result;
      if (result.duplicate) {
        showToast("すでに押しています");
        return;
      }
      if (result.noPoints) {
        showToast("これ以上点は入りません");
        return;
      }
      if (room.phase === "ngword_end") {
        room = NgWordGame.prepareEndReveal(room, ctx);
      }
      if (room.phase === "ngword_end" && room.gameState.winnerId) {
        const winner = room.players.find(function (p) { return p.id === room.gameState.winnerId; });
        showToast((winner ? winner.name : "プレイヤー") + " さんの勝利！（" + (room.gameState.scores[room.gameState.winnerId] || 0) + "点）");
      } else if (actorId) {
        const actor = room.players.find(function (p) { return p.id === actorId; });
        let toast = "⚡ +" + result.points + "点！" + (actor ? actor.name : "あなた");
        if (result.targetEliminated) {
          toast += "（" + target.name + " さん脱落）";
        }
        showToast(toast);
      } else {
        let toast = target.name + " さんがNGワードを言いました";
        if (result.targetEliminated) toast += "（脱落）";
        showToast(toast);
      }
      await saveAndRender();
      break;
    }

    case "ng-next-view":
      if (room.mode !== "local") return;
      room = NgWordGame.cycleViewPlayer(room);
      await saveAndRender();
      break;

    case "ng-finish":
      if (!NgWordGame.canManage(ctx)) return;
      room = NgWordGame.finishSession(room);
      room = NgWordGame.prepareEndReveal(room, ctx);
      await saveAndRender();
      break;

    /* --- コヨーテ --- */
    case "coyote-declare": {
      const actingId = CoyoteGame._actingPlayer(ctx);
      if (!CoyoteGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const input = document.getElementById("coyoteDeclare");
      if (!input || input.value === "") { showToast("数字を入力してください"); return; }
      const result = CoyoteGame.declare(room, actingId, input.value);
      if (!result.ok) { showToast(result.error || "宣言できません"); return; }
      await saveAndRender();
      break;
    }

    case "coyote-call": {
      const actingId = CoyoteGame._actingPlayer(ctx);
      if (!CoyoteGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const gs = room.gameState;
      const result = CoyoteGame.callCoyote(room, actingId, gs.stacks);
      if (!result.ok) { showToast(result.error || "コヨーテできません"); return; }
      if (room.phase === "coyote_result") showToast("勝者が決まりました！");
      else showToast(result.result.overclaimed ? "宣言が高すぎた！" : "宣言は正しかった！");
      await saveAndRender();
      break;
    }

    case "coyote-continue": {
      const actingId = CoyoteGame._actingPlayer(ctx);
      const result = CoyoteGame.dismissResult(room, actingId);
      if (!result.ok) return;
      await saveAndRender();
      break;
    }

    /* --- コードネーム --- */
    case "cn-confirm-key": {
      const team = data.team;
      const gs = room.gameState;
      const smId = gs.spymasters[team];
      if (!smId) return;
      const result = CodenamesGame.confirmKey(room, smId);
      if (!result.ok) { showToast(result.error || "確認できません"); return; }
      await saveAndRender();
      break;
    }

    case "cn-submit-clue": {
      const gs = room.gameState;
      const smId = gs.spymasters[gs.turn];
      if (ctx.isOnline && ctx.me.id !== smId) {
        showToast("スパイマスターだけがヒントを出せます");
        return;
      }
      const wordInput = document.getElementById("cnClueWord");
      const countInput = document.getElementById("cnClueCount");
      const result = CodenamesGame.submitClue(room, smId, wordInput ? wordInput.value : "", countInput ? countInput.value : "");
      if (!result.ok) { showToast(result.error || "ヒントを出せません"); return; }
      await saveAndRender();
      break;
    }

    case "cn-guess": {
      const gs = room.gameState;
      const team = gs.turn;
      const operativeId = ctx.isOnline
        ? ctx.me.id
        : gs.teams[team].find(function (pid) { return gs.spymasters[team] !== pid; });

      if (ctx.isOnline && operativeId !== ctx.me.id) {
        showToast("オペレーティブだけが選べます");
        return;
      }
      if (gs.spymasters[team] === operativeId) {
        showToast("スパイマスターは選べません");
        return;
      }

      const result = CodenamesGame.guess(room, operativeId, data.cell, gs.cells);
      if (!result.ok) { showToast(result.error || "選べません"); return; }
      if (result.message) showToast(result.message);
      if (room.phase === "codenames_result") showToast("勝者が決まりました！");
      await saveAndRender();
      break;
    }

    case "cn-end-turn": {
      const gs = room.gameState;
      const team = gs.turn;
      const operativeId = ctx.isOnline
        ? ctx.me.id
        : gs.teams[team].find(function (pid) { return gs.spymasters[team] !== pid; });

      if (ctx.isOnline && operativeId !== ctx.me.id) {
        showToast("オペレーティブだけが終了できます");
        return;
      }
      const result = CodenamesGame.endTurn(room, operativeId);
      if (!result.ok) { showToast(result.error || "終了できません"); return; }
      await saveAndRender();
      break;
    }

    /* --- ババ抜き --- */
    case "om-draw": {
      const actingId = OldMaidGame._actingPlayer(ctx);
      if (!OldMaidGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const gs = room.gameState;
      if (!gs.hands) gs.hands = {};
      const result = OldMaidGame.drawCard(room, actingId, data.index, gs.hands);
      if (!result.ok) { showToast(result.error || "引けません"); return; }
      if (room.phase === "oldmaid_result") showToast("ババが決まりました！");
      await saveAndRender();
      break;
    }

    /* --- 七並べ --- */
    case "sv-toggle":
      if (!SevensGame.isMyTurn(ctx)) return;
      SevensGame.toggleCard(data.card);
      break;

    case "sv-play": {
      const actingId = SevensGame._actingPlayer(ctx);
      if (!SevensGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const cardId = SevensGame._selected;
      if (!cardId) { showToast("カードを選んでください"); return; }

      const gs = room.gameState;
      if (!ctx.isOnline) {
        if (!gs.hands) gs.hands = {};
        const result = SevensGame.playCard(room, actingId, cardId, gs.hands);
        if (!result.ok) { showToast(result.error || "出せません"); return; }
        SevensGame.clearSelected();
        if (room.phase === "sevens_result") showToast("勝者が決まりました！");
        await saveAndRender();
        break;
      }

      await withOnlineMutation(async function () {
        if (!gs.hands) gs.hands = {};
        const hand = SevensGame.getHand(ctx, ctx.me.id);
        if (!gs.hands[ctx.me.id]) gs.hands[ctx.me.id] = hand;
        const result = SevensGame.playCard(room, ctx.me.id, cardId, gs.hands);
        if (!result.ok) { showToast(result.error || "出せません"); return; }
        SevensGame.clearSelected();
        if (room.phase === "sevens_result") showToast("勝者が決まりました！");
        await saveAndRender();
      });
      break;
    }

    case "sv-pass": {
      const actingId = SevensGame._actingPlayer(ctx);
      if (!SevensGame.isMyTurn(ctx)) return;
      if (!ctx.isOnline) {
        const result = SevensGame.pass(room, actingId);
        if (!result.ok) { showToast(result.error || "パスできません"); return; }
        SevensGame.clearSelected();
        await saveAndRender();
        break;
      }
      await withOnlineMutation(async function () {
        const result = SevensGame.pass(room, actingId);
        if (!result.ok) { showToast(result.error || "パスできません"); return; }
        SevensGame.clearSelected();
        await saveAndRender();
      });
      break;
    }

    /* --- ポーカー共通 --- */
    case "pk-fold":
    case "pk-check":
    case "pk-call":
    case "pk-raise":
    case "pk-allin": {
      const pk = getPokerGame(room);
      if (!pk) return;
      if (roomActionLock) return;
      const actingId = pk._actingPlayer(ctx);
      if (!pk.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      let pokerAction = action;
      const toCall = PokerUtils.amountToCall(room.gameState, actingId);
      if (action === "pk-call" && toCall <= 0) {
        pokerAction = "pk-check";
      }
      if (action === "pk-check" && toCall > 0) {
        showToast("コールが必要です（" + toCall + "）");
        return;
      }
      const actMap = {
        "pk-fold": "fold",
        "pk-check": "check",
        "pk-call": "call",
        "pk-raise": "raise",
        "pk-allin": "allin"
      };
      const amount = data.amount ? parseInt(data.amount, 10) : null;
      if (ctx.isOnline && isHost()) {
        PokerUtils.attachHostSecrets(room, hostSecrets);
      }
      const pokerOpts = ctx.isOnline
        ? { isOnline: true, isHost: ctx.isHost, hostSecrets: hostSecrets }
        : null;
      const result = pk.doAction(room, actingId, actMap[pokerAction], amount, pokerOpts);
      if (!result.ok) { showToast(result.error || "できません"); return; }
      if (ctx.isOnline && isHost() && hostSecrets) {
        PokerUtils.syncHostSecretsFromState(room.gameState, hostSecrets);
      }
      if (room.phase === "poker_showdown") showToast("ハンド終了！");
      if (ctx.isOnline) {
        await savePokerOnlineState();
      } else {
        await saveAndRender();
      }
      break;
    }

    case "pk-next-hand": {
      if (!ctx.isHost) return;
      const pk = getPokerGame(room);
      if (!pk) return;
      if (ctx.isOnline) {
        PokerUtils.attachHostSecrets(room, hostSecrets);
      }
      room = pk.nextHand(room);
      if (room.phase === "poker_result") showToast("ゲーム終了！");
      if (ctx.isOnline) {
        await savePokerOnlineState();
      } else {
        await saveAndRender();
      }
      break;
    }

    case "pd-toggle":
      if (!FiveDrawGame.isMyTurn(ctx)) return;
      FiveDrawGame.toggleDiscard(data.discard);
      break;

    case "pd-clear":
      FiveDrawGame.clearSelected();
      break;

    case "pd-draw": {
      const gs = room.gameState;
      const playerId = ctx.isOnline ? ctx.me.id : FiveDrawGame.getPendingDrawPlayer(gs);
      if (!playerId) return;
      if (!FiveDrawGame.isMyTurn(ctx)) { showToast("あなたの番ではありません"); return; }
      const result = FiveDrawGame.confirmDraw(room, playerId, FiveDrawGame._selected.slice());
      if (!result.ok) { showToast(result.error || "交換できません"); return; }
      FiveDrawGame.clearSelected();
      await saveAndRender();
      break;
    }

    case "reversi-play": {
      if (!ReversiGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const row = parseInt(data.row, 10);
      const col = parseInt(data.col, 10);
      const result = ReversiGame.play(room, row, col);
      if (!result.ok) {
        showToast(result.error || "置けません");
        return;
      }
      room = result.room;
      await saveAndRender();
      break;
    }

    case "reversi-restart":
      if (!ctx.isHost) return;
      room = ReversiGame.restart(room);
      await saveAndRender();
      break;

    case "gomoku-play": {
      if (!GomokuGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const row = parseInt(data.row, 10);
      const col = parseInt(data.col, 10);
      const result = GomokuGame.play(room, row, col);
      if (!result.ok) {
        showToast(result.error || "置けません");
        return;
      }
      room = result.room;
      await saveAndRender();
      break;
    }

    case "gomoku-restart":
      if (!ctx.isHost) return;
      room = GomokuGame.restart(room);
      await saveAndRender();
      break;

    case "vttt-play": {
      if (!VanishingTttGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const index = parseInt(data.index, 10);
      const result = VanishingTttGame.play(room, index);
      if (!result.ok) {
        showToast(result.error || "置けません");
        return;
      }
      room = result.room;
      await saveAndRender();
      break;
    }

    case "vttt-restart":
      if (!ctx.isHost) return;
      room = VanishingTttGame.restart(room);
      await saveAndRender();
      break;

    case "ttt-play": {
      if (!TicTacToeGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const index = parseInt(data.index, 10);
      const result = TicTacToeGame.play(room, index);
      if (!result.ok) {
        showToast(result.error || "置けません");
        return;
      }
      room = result.room;
      await saveAndRender();
      break;
    }

    case "ttt-restart":
      if (!ctx.isHost) return;
      room = TicTacToeGame.restart(room);
      await saveAndRender();
      break;

    case "mttt-select-hand": {
      if (!MatryoshkaTttGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const result = MatryoshkaTttGame.selectHand(room, data.size);
      if (!result.ok) {
        showToast(result.error || "選べません");
        return;
      }
      room = result.room;
      render();
      break;
    }

    case "mttt-cell": {
      if (!MatryoshkaTttGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const row = parseInt(data.row, 10);
      const col = parseInt(data.col, 10);
      const result = MatryoshkaTttGame.handleCell(room, row, col);
      if (!result.ok) {
        showToast(result.error || "操作できません");
        return;
      }
      room = result.room;
      if (result.needsSave) {
        await saveAndRender();
      } else {
        render();
      }
      break;
    }

    case "mttt-cancel":
      if (!MatryoshkaTttGame.isMyTurn(ctx)) return;
      room = MatryoshkaTttGame.cancelSelect(room);
      render();
      break;

    case "mttt-restart":
      if (!ctx.isHost) return;
      room = MatryoshkaTttGame.restart(room);
      await saveAndRender();
      break;

    case "shogi-cell": {
      if (!ShogiGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const row = parseInt(data.row, 10);
      const col = parseInt(data.col, 10);
      const result = ShogiGame.selectSquare(room, row, col);
      if (!result.ok) {
        showToast(result.error || "指せません");
        return;
      }
      room = result.room;
      await saveAndRender();
      if (result.captured) {
        showToast(ShogiGame.pieceLabel(result.captured) + " を取った！持ち駒に追加");
      }
      break;
    }

    case "shogi-drop": {
      if (!ShogiGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const result = ShogiGame.selectDrop(room, data.piece);
      if (!result.ok) {
        showToast(result.error || "打てません");
        return;
      }
      room = result.room;
      await saveAndRender();
      if (room.gameState.selected && room.gameState.selected.drop) {
        showToast("打つマスを選んでください");
      }
      break;
    }

    case "shogi-promote": {
      if (!ShogiGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const result = ShogiGame.confirmPromotion(room, data.promote === "1");
      if (!result.ok) {
        showToast(result.error || "指せません");
        return;
      }
      room = result.room;
      await saveAndRender();
      if (result.captured) {
        showToast(ShogiGame.pieceLabel(result.captured) + " を取った！持ち駒に追加");
      }
      break;
    }

    case "shogi-cancel-promo": {
      if (!ShogiGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const result = ShogiGame.cancelPromotion(room);
      if (!result.ok) return;
      room = result.room;
      await saveAndRender();
      break;
    }

    case "shogi-resign": {
      if (!ShogiGame.isMyTurn(ctx)) {
        showToast("あなたの番ではありません");
        return;
      }
      const side = ShogiGame.getSideForPlayer(room, ctx.me.id);
      room = ShogiGame.resign(room, side != null ? side : room.gameState.turn);
      await saveAndRender();
      break;
    }

    case "shogi-restart":
      if (!ctx.isHost) return;
      room = ShogiGame.restart(room);
      await saveAndRender();
      break;
  }
}

window.__daifugoRunAutoPass = async function (expectedKey) {
  try {
    if (!room || room.game !== "daifugo") return;
    const ctx = buildCtx();
    const gs = room.gameState;
    if (!gs) return;
    if (expectedKey && DaifugoGame._autoPassStateKey(gs) !== expectedKey) return;
    if (!DaifugoGame.shouldAutoPass(ctx)) return;

    const actingId = DaifugoGame._actingPlayer(ctx);
    DaifugoGame.cancelAutoPass();
    DaifugoGame.showAutoPassNotice();

    if (!ctx.isOnline) {
      const result = DaifugoGame.pass(room, actingId);
      if (!result.ok) {
        showToast(result.error || "パスできません");
        return;
      }
      DaifugoGame.clearSelected();
      await saveAndRender();
      return;
    }

    await withOnlineMutation(async function () {
      const result = DaifugoGame.pass(room, actingId);
      if (!result.ok) {
        showToast(result.error || "パスできません");
        return;
      }
      DaifugoGame.clearSelected();
      await saveAndRender();
    });
  } catch (err) {
    console.error(err);
    showToast(err && err.message ? err.message : "自動パスに失敗しました");
  }
};

window.addEventListener("beforeunload", function () {
  Sync.unsubscribe();
  if (pollTimer) clearInterval(pollTimer);
});

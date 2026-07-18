/**
 * ゲーム別プレイページ：遊び方選択・ルーム作成
 */

const playModeStep = document.getElementById("playModeStep");
const playLocalStep = document.getElementById("playLocalStep");
const playRoomStep = document.getElementById("playRoomStep");
const playOnlineStep = document.getElementById("playOnlineStep");
const playGameTitle = document.getElementById("playGameTitle");

const modePassBtn = document.getElementById("modePass");
const modeRoomBtn = document.getElementById("modeRoom");
const modeOnlineBtn = document.getElementById("modeOnline");

const createRoomBtn = document.getElementById("createRoomBtn");
const createRoomBtnRoom = document.getElementById("createRoomBtnRoom");
const createRoomBtnOnline = document.getElementById("createRoomBtnOnline");

const joinRoomBtnRoom = document.getElementById("joinRoomBtnRoom");
const joinRoomBtnOnline = document.getElementById("joinRoomBtnOnline");

const playerNameInput = document.getElementById("playerName");
const playerNameInputOnline = document.getElementById("playerNameOnline");
const joinPlayerNameInputRoom = document.getElementById("joinPlayerNameRoom");
const joinPlayerNameInputOnline = document.getElementById("joinPlayerNameOnline");
const roomCodeInputRoom = document.getElementById("roomCodeRoom");
const roomCodeInputOnline = document.getElementById("roomCodeOnline");

const firebaseNoteRoom = document.getElementById("firebaseNoteRoom");
const firebaseNoteOnline = document.getElementById("firebaseNoteOnline");

const setupRangeHint = document.getElementById("setupRangeHint");
const setupPlayerCountEl = document.getElementById("setupPlayerCount");
const setupPlayerSlots = document.getElementById("setupPlayerSlots");
const setupCountDown = document.getElementById("setupCountDown");
const setupCountUp = document.getElementById("setupCountUp");

let selectedMode = "local";
let setupPlayerCount = 4;
let wordwolfThemeId = "all";
let wordwolfWolfCount = 1;
let drawingWerewolfThemeId = "all";
let drawingWerewolfWolfCount = 1;
let itoSetupMode = "basic";
let itoCustomLife = 3;
let itoCustomTurns = 5;

const wordwolfPlaySetupEl = document.getElementById("wordwolfPlaySetup");
const drawingWerewolfPlaySetupEl = document.getElementById("drawingWerewolfPlaySetup");
const drawingWerewolfPlaySetupRoomEl = document.getElementById("drawingWerewolfPlaySetupRoom");
const itoPlaySetupEl = document.getElementById("itoPlaySetup");

const savedName = loadPlayerName();
if (playerNameInput) playerNameInput.value = savedName;
if (playerNameInputOnline) playerNameInputOnline.value = savedName;
if (joinPlayerNameInputRoom) joinPlayerNameInputRoom.value = savedName;
if (joinPlayerNameInputOnline) joinPlayerNameInputOnline.value = savedName;

function getInviteJoinCode() {
  return (getQueryParam("code") || getQueryParam("join") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

function isRoomInviteJoin() {
  const code = getInviteJoinCode();
  if (code.length !== 4) return false;
  const mode = getQueryParam("mode");
  return mode === "room" || !mode;
}

function setupRoomInviteJoinUI(joinCode) {
  const createPanel = document.getElementById("roomCreatePanel");
  const codeRow = document.getElementById("roomCodeJoinRow");
  const inviteBadge = document.getElementById("roomInviteBadge");
  const inviteNote = document.getElementById("roomJoinInviteNote");
  const backBtn = document.getElementById("backToModeFromRoom");
  const stepLead = document.getElementById("playRoomStepLead");
  const joinTitle = document.getElementById("roomJoinTitle");
  const stepHeader = document.querySelector("#playRoomStep .play-step-header h2");

  if (createPanel) createPanel.classList.add("hidden");
  if (codeRow) codeRow.classList.add("hidden");
  if (inviteBadge) {
    inviteBadge.textContent = "ルームコード " + joinCode;
    inviteBadge.classList.remove("hidden");
  }
  if (inviteNote) inviteNote.classList.remove("hidden");
  if (backBtn) backBtn.classList.add("hidden");
  if (stepHeader) stepHeader.textContent = "ルームに参加";
  if (stepLead) stepLead.textContent = "名前を入れてルームに入ってください。";
  if (joinTitle) joinTitle.textContent = "名前を入力";
  if (joinRoomBtnRoom) {
    joinRoomBtnRoom.textContent = "ルームに入る";
    joinRoomBtnRoom.classList.remove("btn-secondary");
    joinRoomBtnRoom.classList.add("btn-primary");
  }
  if (roomCodeInputRoom) roomCodeInputRoom.value = joinCode;
}

function isMultiDeviceMode(mode) {
  return mode === "room" || mode === "online";
}

function getUnavailableModes(meta) {
  if (!meta || !meta.modesSoon) return [];
  return meta.modesSoon;
}

function isModeAvailable(mode) {
  return getUnavailableModes(getActiveGameMeta()).indexOf(mode) === -1;
}

function applyModeAvailability() {
  const unavailable = getUnavailableModes(getActiveGameMeta());
  const buttons = [
    { el: modePassBtn, mode: "local" },
    { el: modeRoomBtn, mode: "room" },
    { el: modeOnlineBtn, mode: "online" }
  ];

  buttons.forEach(function (item) {
    if (!item.el) return;
    const soon = unavailable.indexOf(item.mode) !== -1;
    item.el.classList.toggle("mode-card--soon", soon);
    item.el.disabled = soon;

    let badge = item.el.querySelector(".mode-soon-badge");
    if (soon) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "badge badge-soon mode-soon-badge";
        badge.textContent = "準備中";
        item.el.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  });
}

function getActiveGameMeta() {
  const gameId = getQueryParam("game");
  return gameId ? GameRegistry.get(gameId) : null;
}

function pendingGameQuery() {
  const gameId = getQueryParam("game");
  return gameId ? "&game=" + encodeURIComponent(gameId) : "";
}

function updatePlayUrl(step) {
  const gameId = getQueryParam("game");
  if (!gameId) return;

  let url = "play.html?game=" + encodeURIComponent(gameId);
  if (step && step !== "mode") {
    url += "&mode=" + encodeURIComponent(step);
  }
  const joinCode = (getQueryParam("code") || getQueryParam("join") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  if (joinCode && (step === "room" || step === "online")) {
    url += "&code=" + encodeURIComponent(joinCode);
  }
  window.history.replaceState(null, "", url);
}

function showPlayStep(step) {
  selectedMode = step === "mode" ? selectedMode : step;

  if (playModeStep) playModeStep.classList.toggle("hidden", step !== "mode");
  if (playLocalStep) playLocalStep.classList.toggle("hidden", step !== "local");
  if (playRoomStep) playRoomStep.classList.toggle("hidden", step !== "room");
  if (playOnlineStep) playOnlineStep.classList.toggle("hidden", step !== "online");

  if (step === "local") {
    initLocalSetup();
  }
  if (step === "room") {
    updateRemoteStepNotes("room");
    loadDrawingWerewolfPlaySetup();
    renderDrawingWerewolfPlaySetupPanel();
  }
  if (step === "online") {
    updateRemoteStepNotes("online");
  }

  updatePlayUrl(step);
}

function goToModeSelect() {
  applyModeAvailability();
  showPlayStep("mode");
  if (playModeStep) {
    playModeStep.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function isInstantLocalGame(meta) {
  return !!(meta && meta.instantLocal);
}

async function startInstantLocalGame() {
  const meta = getActiveGameMeta();
  if (!meta || !isInstantLocalGame(meta)) return false;

  if (modePassBtn) {
    modePassBtn.disabled = true;
  }

  try {
    await Sync.init("local");

    const hostId = generateId();
    const players = [
      { id: hostId, name: defaultPlayerName(0), isHost: true },
      { id: generateId(), name: defaultPlayerName(1), isHost: false }
    ];
    const code = generateRoomCode();
    const room = {
      code: code,
      mode: "local",
      hostId: hostId,
      game: null,
      phase: "lobby",
      players: players,
      expectedCount: meta.minPlayers,
      gameState: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    Sync.saveLocal(room);
    sessionStorage.setItem("partyGames_pendingGame", meta.id);
    window.location.href = "room.html?code=" + code + "&player=" + hostId + "&mode=local&game=" + encodeURIComponent(meta.id);
    return true;
  } catch (err) {
    if (modePassBtn) modePassBtn.disabled = false;
    showToast(err.message || "開始に失敗しました");
    return false;
  }
}

function goToModeSetup(mode) {
  if (!isModeAvailable(mode)) {
    showToast("この遊び方は準備中です");
    goToModeSelect();
    return;
  }

  if (mode === "local" && isInstantLocalGame(getActiveGameMeta())) {
    startInstantLocalGame();
    return;
  }

  selectedMode = mode;
  localStorage.setItem("partyGames_mode", mode);
  showPlayStep(mode);
  const stepEl = mode === "local" ? playLocalStep : mode === "room" ? playRoomStep : playOnlineStep;
  if (stepEl) {
    stepEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function defaultPlayerName(index) {
  const meta = getActiveGameMeta();
  if (meta && meta.id === "shogi") {
    return index === 0 ? "先手" : "後手";
  }
  if (meta && meta.id === "matryoshka_ttt") {
    return index === 0 ? "赤" : "青";
  }
  if (meta && (meta.id === "vanishing_ttt" || meta.id === "tic_tac_toe")) {
    return index === 0 ? "〇" : "×";
  }
  if (meta && (meta.id === "reversi" || meta.id === "gomoku")) {
    return index === 0 ? "黒" : "白";
  }
  return "プレイヤー" + (index + 1);
}

function playerNamePlaceholder(index) {
  const meta = getActiveGameMeta();
  if (meta && meta.id === "shogi") {
    return index === 0 ? "先手" : "後手";
  }
  if (meta && meta.id === "matryoshka_ttt") {
    return index === 0 ? "赤" : "青";
  }
  if (meta && (meta.id === "vanishing_ttt" || meta.id === "tic_tac_toe")) {
    return index === 0 ? "〇（先攻）" : "×";
  }
  if (meta && (meta.id === "reversi" || meta.id === "gomoku")) {
    return index === 0 ? "黒（先攻）" : "白";
  }
  return "ここに名前を記入してね";
}

function usesPrefillPlayerName(index) {
  const meta = getActiveGameMeta();
  if (!meta) return false;
  return (
    meta.id === "shogi" ||
    meta.id === "matryoshka_ttt" ||
    meta.id === "vanishing_ttt" ||
    meta.id === "tic_tac_toe" ||
    meta.id === "reversi" ||
    meta.id === "gomoku"
  );
}

function getSetupPlayerRange() {
  const meta = getActiveGameMeta();

  let min = 99;
  let max = 2;
  GameRegistry.live().forEach(function (g) {
    if (g.minPlayers < min) min = g.minPlayers;
    if (g.maxPlayers > max) max = g.maxPlayers;
  });

  if (meta && meta.status === "live") {
    return {
      min: meta.minPlayers,
      max: meta.maxPlayers,
      defaultCount: meta.minPlayers,
      hint: meta.name + "は " + formatPlayerRange(meta.minPlayers, meta.maxPlayers) + "です"
    };
  }

  return {
    min: min,
    max: max,
    defaultCount: Math.max(4, min),
    hint: formatPlayerRange(min, max) + "で遊べます"
  };
}

function loadWordwolfPlaySetup() {
  try {
    const raw = sessionStorage.getItem("partyGames_wordwolfSetup");
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.themeId) wordwolfThemeId = saved.themeId;
    if (saved.wolfCount) wordwolfWolfCount = saved.wolfCount;
  } catch (e) {
    /* ignore */
  }
}

function saveWordwolfPlaySetup() {
  sessionStorage.setItem("partyGames_wordwolfSetup", JSON.stringify({
    themeId: wordwolfThemeId,
    wolfCount: wordwolfWolfCount
  }));
}

function isWordwolfGame() {
  const meta = getActiveGameMeta();
  return meta && meta.id === "wordwolf";
}

function renderWordwolfPlaySetupPanel() {
  if (!wordwolfPlaySetupEl) return;
  if (!isWordwolfGame()) {
    wordwolfPlaySetupEl.classList.add("hidden");
    wordwolfPlaySetupEl.innerHTML = "";
    return;
  }

  wordwolfWolfCount = WordWolfGame.clampWolfCount(setupPlayerCount, wordwolfWolfCount);
  wordwolfPlaySetupEl.classList.remove("hidden");
  wordwolfPlaySetupEl.innerHTML = WordWolfGame.renderPlaySetup(setupPlayerCount, wordwolfThemeId, wordwolfWolfCount, true);
  bindWordwolfPlaySetupPanel();
}

function bindWordwolfPlaySetupPanel() {
  if (!wordwolfPlaySetupEl || wordwolfPlaySetupEl.classList.contains("hidden")) return;

  wordwolfPlaySetupEl.querySelectorAll("[data-ww-theme]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      wordwolfThemeId = btn.dataset.wwTheme;
      renderWordwolfPlaySetupPanel();
    });
  });

  wordwolfPlaySetupEl.querySelectorAll("[data-ww-wolves-delta]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const delta = parseInt(btn.dataset.wwWolvesDelta, 10);
      wordwolfWolfCount = WordWolfGame.clampWolfCount(setupPlayerCount, wordwolfWolfCount + delta);
      renderWordwolfPlaySetupPanel();
    });
  });
}

function loadDrawingWerewolfPlaySetup() {
  try {
    const raw = sessionStorage.getItem("partyGames_drawingWerewolfSetup");
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.themeId) drawingWerewolfThemeId = saved.themeId;
    if (saved.wolfCount) drawingWerewolfWolfCount = saved.wolfCount;
  } catch (e) {
    /* ignore */
  }
}

function saveDrawingWerewolfPlaySetup() {
  sessionStorage.setItem("partyGames_drawingWerewolfSetup", JSON.stringify({
    themeId: drawingWerewolfThemeId,
    wolfCount: drawingWerewolfWolfCount
  }));
}

function isDrawingWerewolfGame() {
  const meta = getActiveGameMeta();
  return meta && meta.id === "drawing_werewolf";
}

function drawingWerewolfSetupTargets() {
  return [drawingWerewolfPlaySetupEl, drawingWerewolfPlaySetupRoomEl].filter(Boolean);
}

function renderDrawingWerewolfPlaySetupPanel() {
  const targets = drawingWerewolfSetupTargets();
  if (!targets.length) return;

  if (!isDrawingWerewolfGame()) {
    targets.forEach(function (el) {
      el.classList.add("hidden");
      el.innerHTML = "";
    });
    return;
  }

  const wolfCountForLocal = DrawingWerewolfGame.clampWolfCount(setupPlayerCount, drawingWerewolfWolfCount);
  drawingWerewolfWolfCount = wolfCountForLocal;

  targets.forEach(function (el) {
    const countHint = el.id === "drawingWerewolfPlaySetupRoom" ? 4 : setupPlayerCount;
    el.classList.remove("hidden");
    el.innerHTML = DrawingWerewolfGame.renderPlaySetup(
      countHint,
      drawingWerewolfThemeId,
      DrawingWerewolfGame.clampWolfCount(countHint, drawingWerewolfWolfCount),
      true
    );
  });
  bindDrawingWerewolfPlaySetupPanel();
}

function bindDrawingWerewolfPlaySetupPanel() {
  drawingWerewolfSetupTargets().forEach(function (root) {
    if (!root || root.classList.contains("hidden")) return;

    root.querySelectorAll("[data-dw-theme]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        drawingWerewolfThemeId = btn.dataset.dwTheme || btn.getAttribute("data-dw-theme");
        saveDrawingWerewolfPlaySetup();
        renderDrawingWerewolfPlaySetupPanel();
      });
    });

    root.querySelectorAll("[data-dw-wolves-delta]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const delta = parseInt(btn.dataset.dwWolvesDelta, 10);
        drawingWerewolfWolfCount = DrawingWerewolfGame.clampWolfCount(
          setupPlayerCount,
          drawingWerewolfWolfCount + delta
        );
        saveDrawingWerewolfPlaySetup();
        renderDrawingWerewolfPlaySetupPanel();
      });
    });
  });
}

function loadItoPlaySetup() {
  try {
    const raw = sessionStorage.getItem("partyGames_itoSetup");
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.setupMode) itoSetupMode = saved.setupMode === "custom" ? "custom" : "basic";
    if (saved.customLife) itoCustomLife = saved.customLife;
    if (saved.customTurns) itoCustomTurns = saved.customTurns;
  } catch (e) {
    /* ignore */
  }
}

function saveItoPlaySetup() {
  sessionStorage.setItem("partyGames_itoSetup", JSON.stringify({
    setupMode: itoSetupMode,
    customLife: itoCustomLife,
    customTurns: itoCustomTurns
  }));
}

function isItoGame() {
  const meta = getActiveGameMeta();
  return meta && meta.id === "ito";
}

function getItoPlaySetupState() {
  const basic = ItoGame.getBasicConfig(setupPlayerCount);
  if (itoSetupMode !== "custom") {
    itoCustomLife = basic.life;
    itoCustomTurns = basic.turns;
  }
  return {
    setupMode: itoSetupMode,
    customLife: ItoGame.clampCustomLife(itoCustomLife),
    customTurns: ItoGame.clampCustomTurns(itoCustomTurns)
  };
}

function renderItoPlaySetupPanel() {
  if (!itoPlaySetupEl) return;
  if (!isItoGame()) {
    itoPlaySetupEl.classList.add("hidden");
    itoPlaySetupEl.innerHTML = "";
    return;
  }

  const setup = getItoPlaySetupState();
  itoPlaySetupEl.classList.remove("hidden");
  itoPlaySetupEl.innerHTML = ItoGame.renderPlaySetup(setupPlayerCount, setup, true);
  bindItoPlaySetupPanel();
}

function bindItoPlaySetupPanel() {
  if (!itoPlaySetupEl || itoPlaySetupEl.classList.contains("hidden")) return;

  itoPlaySetupEl.querySelectorAll("[data-ito-setup]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      itoSetupMode = btn.dataset.itoSetup === "custom" ? "custom" : "basic";
      if (itoSetupMode === "basic") {
        const basic = ItoGame.getBasicConfig(setupPlayerCount);
        itoCustomLife = basic.life;
        itoCustomTurns = basic.turns;
      }
      saveItoPlaySetup();
      renderItoPlaySetupPanel();
    });
  });

  itoPlaySetupEl.querySelectorAll("[data-ito-life-delta]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      itoSetupMode = "custom";
      itoCustomLife = ItoGame.clampCustomLife(itoCustomLife + parseInt(btn.dataset.itoLifeDelta, 10));
      saveItoPlaySetup();
      renderItoPlaySetupPanel();
    });
  });

  itoPlaySetupEl.querySelectorAll("[data-ito-turns-delta]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      itoSetupMode = "custom";
      itoCustomTurns = ItoGame.clampCustomTurns(itoCustomTurns + parseInt(btn.dataset.itoTurnsDelta, 10));
      saveItoPlaySetup();
      renderItoPlaySetupPanel();
    });
  });
}

function initLocalSetup() {
  loadWordwolfPlaySetup();
  loadDrawingWerewolfPlaySetup();
  loadItoPlaySetup();
  const range = getSetupPlayerRange();
  setupPlayerCount = range.defaultCount;
  if (setupRangeHint) setupRangeHint.textContent = range.hint;
  renderLocalSetup();
}

function renderLocalSetup() {
  const range = getSetupPlayerRange();
  const previousNames = [];

  if (setupPlayerSlots) {
    setupPlayerSlots.querySelectorAll("[data-setup-slot]").forEach(function (input) {
      const idx = parseInt(input.dataset.setupSlot, 10);
      previousNames[idx] = input.value.trim();
    });
  }

  setupPlayerCount = Math.max(range.min, Math.min(range.max, setupPlayerCount));

  if (setupPlayerCountEl) setupPlayerCountEl.textContent = String(setupPlayerCount);
  if (setupCountDown) setupCountDown.disabled = setupPlayerCount <= range.min;
  if (setupCountUp) setupCountUp.disabled = setupPlayerCount >= range.max;

  if (!setupPlayerSlots) return;

  let html = "";
  for (let i = 0; i < setupPlayerCount; i++) {
    const def = defaultPlayerName(i);
    let value = "";
    if (previousNames[i] !== undefined) {
      value = previousNames[i];
    } else if (usesPrefillPlayerName(i)) {
      value = def;
    }
    const placeholder = playerNamePlaceholder(i);
    html += '<div class="player-name-slot">';
    html += '<label for="setupSlot' + i + '">' + (i + 1) + '.</label>';
    html += '<input type="text" id="setupSlot' + i + '" data-setup-slot="' + i + '" value="' + escapeHtml(value) + '" maxlength="12" autocomplete="off" placeholder="' + escapeHtml(placeholder) + '">';
    if (i === 0) html += '<span class="player-host-badge">👑</span>';
    html += '</div>';
  }
  setupPlayerSlots.innerHTML = html;
  renderWordwolfPlaySetupPanel();
  renderDrawingWerewolfPlaySetupPanel();
  renderItoPlaySetupPanel();
  if (typeof window.partyGamesItoBoot === "function") {
    window.partyGamesItoBoot();
  }
}

function collectSetupPlayers() {
  const hostId = generateId();
  const players = [];

  for (let i = 0; i < setupPlayerCount; i++) {
    const input = document.querySelector('[data-setup-slot="' + i + '"]');
    const name = input && input.value.trim() ? input.value.trim() : defaultPlayerName(i);
    players.push({
      id: i === 0 ? hostId : generateId(),
      name: name,
      isHost: i === 0
    });
  }

  return { hostId: hostId, players: players };
}

function updateRemoteStepNotes(mode) {
  const noteEl = mode === "room" ? firebaseNoteRoom : firebaseNoteOnline;
  if (!noteEl) return;

  if (mode === "room") {
    noteEl.classList.add("hidden");
    return;
  }

  if (!isFirebaseConfigured()) {
    noteEl.classList.remove("hidden");
    noteEl.textContent = "Firebase が未設定です。js/firebase-config.js を編集してください（README 参照）。";
    return;
  }

  noteEl.classList.remove("hidden");
  noteEl.textContent = "離れた場所にいるメンバーとも、ルームコードで参加できます。";
}

function initPlayPage() {
  const gameId = getQueryParam("game");
  const meta = gameId ? GameRegistry.get(gameId) : null;

  if (!meta || meta.status !== "live") {
    if (meta && meta.status !== "live") {
      showToast(meta.name + "は準備中です");
    }
    window.location.replace("index.html");
    return;
  }

  sessionStorage.setItem("partyGames_pendingGame", gameId);
  document.title = meta.name + " | " + getSiteName();
  document.body.classList.remove("werewolf-theme");

  if (playGameTitle) {
    playGameTitle.textContent = meta.name;
  }

  const joinCode = (getQueryParam("code") || getQueryParam("join") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  let modeParam = getQueryParam("mode");
  if (!modeParam && joinCode) modeParam = "room";

  applyModeAvailability();

  if (modeParam === "local" || modeParam === "room" || modeParam === "online") {
    if (!isModeAvailable(modeParam)) {
      goToModeSelect();
      return;
    }
    if (modeParam === "local" && isInstantLocalGame(meta)) {
      startInstantLocalGame();
      return;
    }
    goToModeSetup(modeParam);
    if (joinCode && modeParam === "room") {
      if (roomCodeInputRoom) roomCodeInputRoom.value = joinCode;
      if (isRoomInviteJoin()) {
        setupRoomInviteJoinUI(joinCode);
      }
      if (joinPlayerNameInputRoom) joinPlayerNameInputRoom.focus();
    }
    if (joinCode && modeParam === "online" && roomCodeInputOnline) {
      roomCodeInputOnline.value = joinCode;
      if (joinPlayerNameInputOnline) joinPlayerNameInputOnline.focus();
    }
  } else {
    goToModeSelect();
  }
}

function getNameOrAlert(input) {
  const name = input ? input.value.trim() : "";
  if (!name) {
    showToast("名前を入力してください");
    if (input) input.focus();
    return null;
  }
  savePlayerName(name);
  return name;
}

function setLoading(btn, loading, idleText) {
  btn.disabled = loading;
  btn.textContent = loading ? "接続中…" : idleText;
}

function bindRoomCodeInput(input) {
  if (!input) return;
  input.addEventListener("input", function () {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
}

async function createRoom(mode, nameInput, btn) {
  if (isMultiDeviceMode(mode) && !Sync.canUseMultiDevice(mode)) {
    showToast("ルーム機能の設定が必要です");
    return;
  }

  const idleLabel = mode === "local" ? "PLAY" : "ルームを作る";
  setLoading(btn, true, btn.textContent);

  try {
    await Sync.init(mode);

    if (mode === "local") {
      const setup = collectSetupPlayers();
      if (isWordwolfGame()) {
        saveWordwolfPlaySetup();
      }
      if (isDrawingWerewolfGame()) {
        saveDrawingWerewolfPlaySetup();
      }
      if (isItoGame()) {
        saveItoPlaySetup();
      }
      const code = generateRoomCode();
      const room = {
        code: code,
        mode: "local",
        hostId: setup.hostId,
        game: null,
        phase: "lobby",
        players: setup.players,
        expectedCount: setup.players.length,
        gameState: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      Sync.saveLocal(room);
      window.location.href = "room.html?code=" + code + "&player=" + setup.hostId + "&mode=local" + pendingGameQuery();
      return;
    }

    const name = getNameOrAlert(nameInput);
    if (!name) {
      setLoading(btn, false, idleLabel);
      return;
    }

    if (isWordwolfGame()) {
      saveWordwolfPlaySetup();
    }
    if (isDrawingWerewolfGame()) {
      saveDrawingWerewolfPlaySetup();
    }
    if (isItoGame()) {
      saveItoPlaySetup();
    }

    const code = generateRoomCode();
    const pendingGame = getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame");
    const room = {
      code: code,
      phase: "lobby",
      game: null,
      gameState: null,
      mode: mode,
      pendingGame: pendingGame || null,
      _creatorName: name,
      createdAt: Date.now()
    };
    await Sync.createOnline(room);
    rememberRoomSession(code, mode, Sync.uid);
    window.location.href = buildRoomUrl(code, mode, { playerId: Sync.uid });
  } catch (err) {
    showToast(err.message || "ルーム作成に失敗しました");
    setLoading(btn, false, idleLabel);
  }
}

async function joinRoom(mode, nameInput, codeInput, btn) {
  const name = getNameOrAlert(nameInput);
  if (!name) return;

  const code = codeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    showToast("ルームコードは4桁です");
    return;
  }

  if (isMultiDeviceMode(mode) && !Sync.canUseMultiDevice(mode)) {
    showToast("ルーム機能の設定が必要です");
    return;
  }

  setLoading(btn, true, "参加する");

  try {
    await Sync.init(mode);
    await Sync.joinOnline(code, name);
    rememberRoomSession(code, mode, Sync.uid);
    window.location.href = buildRoomUrl(code, mode, { playerId: Sync.uid });
  } catch (err) {
    showToast(err.message || "参加に失敗しました");
    setLoading(btn, false, isRoomInviteJoin() ? "ルームに入る" : "参加する");
  }
}

modePassBtn.addEventListener("click", function () { goToModeSetup("local"); });
modeRoomBtn.addEventListener("click", function () { goToModeSetup("room"); });
modeOnlineBtn.addEventListener("click", function () { goToModeSetup("online"); });

document.getElementById("backToModeFromLocal").addEventListener("click", goToModeSelect);
document.getElementById("backToModeFromRoom").addEventListener("click", goToModeSelect);
document.getElementById("backToModeFromOnline").addEventListener("click", goToModeSelect);

setupCountDown.addEventListener("click", function () {
  setupPlayerCount -= 1;
  renderLocalSetup();
});

setupCountUp.addEventListener("click", function () {
  setupPlayerCount += 1;
  renderLocalSetup();
});

createRoomBtn.addEventListener("click", function () {
  createRoom("local", null, createRoomBtn);
});

createRoomBtnRoom.addEventListener("click", function () {
  createRoom("room", playerNameInput, createRoomBtnRoom);
});

createRoomBtnOnline.addEventListener("click", function () {
  createRoom("online", playerNameInputOnline, createRoomBtnOnline);
});

joinRoomBtnRoom.addEventListener("click", function () {
  joinRoom("room", joinPlayerNameInputRoom, roomCodeInputRoom, joinRoomBtnRoom);
});

if (joinPlayerNameInputRoom) {
  joinPlayerNameInputRoom.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && playRoomStep && !playRoomStep.classList.contains("hidden")) {
      joinRoom("room", joinPlayerNameInputRoom, roomCodeInputRoom, joinRoomBtnRoom);
    }
  });
}

joinRoomBtnOnline.addEventListener("click", function () {
  joinRoom("online", joinPlayerNameInputOnline, roomCodeInputOnline, joinRoomBtnOnline);
});

bindRoomCodeInput(roomCodeInputRoom);
bindRoomCodeInput(roomCodeInputOnline);

initPlayPage();

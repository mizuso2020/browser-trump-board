/**
 * 共通ユーティリティ
 */

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
}

function setCookie(name, value, days) {
  const maxAge = Math.max(1, days) * 86400;
  document.cookie = name + "=" + encodeURIComponent(value) + ";path=/;max-age=" + maxAge + ";SameSite=Lax";
}

function getStablePlayerId() {
  let id = "";
  try { id = localStorage.getItem("partyGames_playerId") || ""; } catch (e) { id = ""; }
  if (!id) {
    try { id = sessionStorage.getItem("partyGames_playerId") || ""; } catch (e) { id = ""; }
  }
  if (!id) id = getCookie("partyGames_playerId");
  if (!id || !/^[a-z0-9]{6,16}$/.test(id)) {
    id = generateId();
  }
  try { localStorage.setItem("partyGames_playerId", id); } catch (e) { /* ignore */ }
  try { sessionStorage.setItem("partyGames_playerId", id); } catch (e) { /* ignore */ }
  setCookie("partyGames_playerId", id, 365);
  return id;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function getSiteName() {
  if (window.PartyGamesConfig && window.PartyGamesConfig.siteName) {
    return String(window.PartyGamesConfig.siteName).trim();
  }
  return "ブラウザ・トランプ＆ボード";
}

function getPublicBaseUrl() {
  if (window.PartyGamesConfig && window.PartyGamesConfig.publicBaseUrl) {
    const base = String(window.PartyGamesConfig.publicBaseUrl).trim();
    return base.endsWith("/") ? base : base + "/";
  }

  const path = window.location.pathname;
  const gamesPrefix = "/games";
  const idx = path.indexOf(gamesPrefix);
  if (idx >= 0) {
    return window.location.origin + path.slice(0, idx + gamesPrefix.length) + "/";
  }

  const dir = path.replace(/[^/]+$/, "");
  return window.location.origin + (dir || "/");
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 2800);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  return Promise.resolve();
}

function rememberRoomSession(code, modeName, playerIdOpt) {
  const pid = playerIdOpt || (typeof Sync !== "undefined" ? Sync.uid : "");
  sessionStorage.setItem("partyGames_roomCode", String(code || "").toUpperCase());
  sessionStorage.setItem("partyGames_roomMode", modeName || "room");
  if (pid) sessionStorage.setItem("partyGames_roomPlayerId", pid);
}

function buildRoomUrl(code, modeName, options) {
  options = options || {};
  const params = new URLSearchParams();
  params.set("code", String(code || "").toUpperCase());
  params.set("mode", modeName || "room");
  const pid = options.playerId || (typeof Sync !== "undefined" && Sync.uid ? Sync.uid : "") || getQueryParam("player");
  if (pid && /^[a-z0-9]{6,16}$/.test(pid)) params.set("player", pid);
  const game = options.game || getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame");
  if (game) params.set("game", game);
  return "room.html?" + params.toString();
}

function savePlayerName(name) {
  localStorage.setItem("partyGames_playerName", name);
}

function loadPlayerName() {
  return localStorage.getItem("partyGames_playerName") || "";
}

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

function getStablePlayerId() {
  let id = localStorage.getItem("partyGames_playerId");
  if (!id || !/^[a-z0-9]{6,16}$/.test(id)) {
    id = generateId();
    localStorage.setItem("partyGames_playerId", id);
  }
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

function savePlayerName(name) {
  localStorage.setItem("partyGames_playerName", name);
}

function loadPlayerName() {
  return localStorage.getItem("partyGames_playerName") || "";
}

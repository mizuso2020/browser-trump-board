(function () {
  function defineFn(name, fn) {
    if (typeof window[name] !== "function") window[name] = fn;
  }

  defineFn("generateRoomCode", function () {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var code = "";
    for (var i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  });

  defineFn("getCookie", function (name) {
    var match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  });

  defineFn("setCookie", function (name, value, days) {
    var maxAge = Math.max(1, days) * 86400;
    document.cookie = name + "=" + encodeURIComponent(value) + ";path=/;max-age=" + maxAge + ";SameSite=Lax";
  });

  defineFn("generateId", function () {
    return Math.random().toString(36).slice(2, 10);
  });

  defineFn("getStablePlayerId", function () {
    var id = "";
    try { id = localStorage.getItem("partyGames_playerId") || ""; } catch (e) { id = ""; }
    if (!id) {
      try { id = sessionStorage.getItem("partyGames_playerId") || ""; } catch (e) { id = ""; }
    }
    if (!id) id = window.getCookie("partyGames_playerId");
    if (!id || !/^[a-z0-9]{6,16}$/.test(id)) id = window.generateId();
    try { localStorage.setItem("partyGames_playerId", id); } catch (e) { /* ignore */ }
    try { sessionStorage.setItem("partyGames_playerId", id); } catch (e) { /* ignore */ }
    window.setCookie("partyGames_playerId", id, 365);
    return id;
  });

  defineFn("shuffle", function (array) {
    var arr = array.slice();
    var i = arr.length - 1;
    for (; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  });

  defineFn("getQueryParam", function (key) {
    return new URLSearchParams(window.location.search).get(key);
  });

  defineFn("getSiteName", function () {
    if (window.PartyGamesConfig && window.PartyGamesConfig.siteName) {
      return String(window.PartyGamesConfig.siteName).trim();
    }
    return "\u30d6\u30e9\u30a6\u30b6\u30fb\u30c8\u30e9\u30f3\u30d7\uff06\u30dc\u30fc\u30c9";
  });

  defineFn("getPublicBaseUrl", function () {
    if (window.PartyGamesConfig && window.PartyGamesConfig.publicBaseUrl) {
      var base = String(window.PartyGamesConfig.publicBaseUrl).trim();
      return base.endsWith("/") ? base : base + "/";
    }
    var path = window.location.pathname;
    var gamesPrefix = "/games";
    var idx = path.indexOf(gamesPrefix);
    if (idx >= 0) {
      return window.location.origin + path.slice(0, idx + gamesPrefix.length) + "/";
    }
    var dir = path.replace(/[^/]+$/, "");
    return window.location.origin + (dir || "/");
  });

  defineFn("showToast", function (message) {
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2800);
  });

  defineFn("escapeHtml", function (text) {
    var div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  });

  defineFn("copyText", function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return Promise.resolve();
  });

  defineFn("rememberRoomSession", function (code, modeName, playerIdOpt) {
    var pid = playerIdOpt || (typeof Sync !== "undefined" ? Sync.uid : "");
    sessionStorage.setItem("partyGames_roomCode", String(code || "").toUpperCase());
    sessionStorage.setItem("partyGames_roomMode", modeName || "room");
    if (pid) sessionStorage.setItem("partyGames_roomPlayerId", pid);
  });

  defineFn("buildRoomUrl", function (code, modeName, options) {
    options = options || {};
    var params = new URLSearchParams();
    params.set("code", String(code || "").toUpperCase());
    params.set("mode", modeName || "room");
    var pid = options.playerId || (typeof Sync !== "undefined" && Sync.uid ? Sync.uid : "") || window.getQueryParam("player");
    if (pid && /^[a-z0-9]{6,16}$/.test(pid)) params.set("player", pid);
    var game = options.game || window.getQueryParam("game") || sessionStorage.getItem("partyGames_pendingGame");
    if (game) params.set("game", game);
    return "room.html?" + params.toString();
  });

  defineFn("savePlayerName", function (name) {
    localStorage.setItem("partyGames_playerName", name);
  });

  defineFn("loadPlayerName", function () {
    return localStorage.getItem("partyGames_playerName") || "";
  });

  defineFn("formatPlayerRange", function (min, max) {
    var lo = parseInt(min, 10);
    var hi = parseInt(max, 10);
    if (lo === hi) return lo + "人";
    return lo + "〜" + hi + "人";
  });

  if (typeof window.TrumpUi === "undefined") {
    window.TrumpUi = {
      buildPlayOrder: function () { return []; },
      renderTurnOrderStrip: function () { return ""; },
      renderTurnOrderBlock: function () { return ""; },
      renderTurnOrder: function () { return ""; },
      renderFooter: function () { return ""; },
      renderRulesPanel: function () { return ""; },
      togglePanel: function () {},
      hidePanel: function () {}
    };
  }
})();

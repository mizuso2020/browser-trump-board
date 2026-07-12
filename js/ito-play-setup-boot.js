/**
 * イト用プレイ設定（play.js のキャッシュに依存しない）
 */
(function () {
  var state = {
    setupMode: "basic",
    customLife: 3,
    customTurns: 5
  };

  function gameId() {
    return new URLSearchParams(window.location.search).get("game");
  }

  function playerCount() {
    var el = document.getElementById("setupPlayerCount");
    var n = el ? parseInt(el.textContent, 10) : 4;
    return Number.isFinite(n) ? n : 4;
  }

  function loadState() {
    if (typeof ItoGame === "undefined") return;
    var saved = ItoGame.loadPlaySetupFromSession();
    if (saved) {
      state.setupMode = saved.setupMode;
      state.customLife = saved.customLife;
      state.customTurns = saved.customTurns;
    }
    syncBasicIfNeeded();
  }

  function saveState() {
    sessionStorage.setItem("partyGames_itoSetup", JSON.stringify({
      setupMode: state.setupMode,
      customLife: state.customLife,
      customTurns: state.customTurns
    }));
  }

  function syncBasicIfNeeded() {
    if (typeof ItoGame === "undefined") return;
    if (state.setupMode !== "custom") {
      var basic = ItoGame.getBasicConfig(playerCount());
      state.customLife = basic.life;
      state.customTurns = basic.turns;
    }
  }

  function render() {
    var wrap = document.getElementById("itoPlaySetup");
    var localStep = document.getElementById("playLocalStep");
    if (!wrap || typeof ItoGame === "undefined") return;
    if (!localStep || localStep.classList.contains("hidden")) {
      wrap.classList.add("hidden");
      return;
    }

    syncBasicIfNeeded();
    wrap.classList.remove("hidden");
    wrap.innerHTML = ItoGame.renderPlaySetup(playerCount(), {
      setupMode: state.setupMode,
      customLife: state.customLife,
      customTurns: state.customTurns
    }, true);

    wrap.querySelectorAll("[data-ito-setup]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.setupMode = btn.dataset.itoSetup === "custom" ? "custom" : "basic";
        syncBasicIfNeeded();
        saveState();
        render();
      });
    });

    wrap.querySelectorAll("[data-ito-life-delta]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.setupMode = "custom";
        state.customLife = ItoGame.clampCustomLife(state.customLife + parseInt(btn.dataset.itoLifeDelta, 10));
        saveState();
        render();
      });
    });

    wrap.querySelectorAll("[data-ito-turns-delta]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.setupMode = "custom";
        state.customTurns = ItoGame.clampCustomTurns(state.customTurns + parseInt(btn.dataset.itoTurnsDelta, 10));
        saveState();
        render();
      });
    });
  }

  function boot() {
    if (gameId() !== "ito") return;
    loadState();
    render();
  }

  function watchSetup() {
    var localStep = document.getElementById("playLocalStep");
    if (localStep) {
      new MutationObserver(boot).observe(localStep, { attributes: true, attributeFilter: ["class"] });
    }

    var countEl = document.getElementById("setupPlayerCount");
    if (countEl) {
      new MutationObserver(function () {
        setTimeout(boot, 30);
      }).observe(countEl, { childList: true, characterData: true, subtree: true });
    }

    ["setupCountDown", "setupCountUp"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener("click", function () { setTimeout(boot, 50); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    watchSetup();
    boot();
  });

  if (document.readyState !== "loading") {
    watchSetup();
    boot();
  }

  window.partyGamesItoBoot = boot;
})();

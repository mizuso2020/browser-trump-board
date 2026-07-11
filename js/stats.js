/**
 * 累計プレイ回数
 */
const PlayStats = {
  apiBase: function () {
    const path = window.location.pathname;
    const idx = path.indexOf("/games");
    if (idx >= 0) {
      return window.location.origin + path.slice(0, idx) + "/games/api";
    }
    return window.location.origin + "/games/api";
  },

  bootScriptUrl: function () {
    const path = window.location.pathname;
    const idx = path.indexOf("/games");
    const base = idx >= 0 ? path.slice(0, idx) + "/games/" : "/games/";
    return window.location.origin + base + "js/stats-boot.js?t=" + Date.now();
  },

  getBootCount: function () {
    const count = Number(window.PARTY_GAMES_PLAY_COUNT);
    return Number.isFinite(count) && count >= 0 ? count : null;
  },

  formatCount: function (count) {
    const n = Number(count);
    if (!Number.isFinite(n) || n < 0) return "0";
    return n.toLocaleString("ja-JP");
  },

  loadBootScript: function () {
    return new Promise(function (resolve) {
      if (PlayStats.getBootCount() !== null) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = PlayStats.bootScriptUrl();
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  },

  fetchCount: async function () {
    try {
      const res = await fetch(this.apiBase() + "/stats/plays?t=" + Date.now(), {
        cache: "no-store"
      });
      if (!res.ok) return null;
      const data = await res.json();
      const count = Number(data.playCount);
      return Number.isFinite(count) ? count : null;
    } catch (err) {
      return null;
    }
  },

  beaconIncrement: function () {
    const img = new Image();
    img.src = this.apiBase() + "/stats/plays/inc?_=" + Date.now();
  },

  recordPlay: async function () {
    try {
      const res = await fetch(this.apiBase() + "/stats/plays", {
        method: "POST",
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        const count = Number(data.playCount);
        if (Number.isFinite(count)) {
          window.PARTY_GAMES_PLAY_COUNT = count;
          this.updateNav(count);
          return count;
        }
      }
    } catch (err) {
      /* fall through */
    }

    this.beaconIncrement();
    const boot = this.getBootCount();
    if (boot !== null) {
      window.PARTY_GAMES_PLAY_COUNT = boot + 1;
      this.updateNav(window.PARTY_GAMES_PLAY_COUNT);
    }
    return null;
  },

  updateNav: function (count) {
    const el = document.getElementById("sitePlayCount");
    if (!el || count === null || count === undefined) return;
    el.textContent = this.formatCount(count) + "回プレイ";
    el.hidden = false;
    el.classList.remove("hidden");
  },

  renderNav: async function () {
    const el = document.getElementById("sitePlayCount");
    if (!el) return;

    await this.loadBootScript();

    const boot = this.getBootCount();
    if (boot !== null) {
      this.updateNav(boot);
    }

    const count = await this.fetchCount();
    if (count !== null) {
      window.PARTY_GAMES_PLAY_COUNT = count;
      this.updateNav(count);
    }
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    PlayStats.renderNav();
  });
} else {
  PlayStats.renderNav();
}

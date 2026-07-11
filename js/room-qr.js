/**
 * ルーム参加用 QR コード
 */

const RoomQr = {
  buildJoinUrl: function (code, options) {
    options = options || {};
    const game = options.game || sessionStorage.getItem("partyGames_pendingGame") || "werewolf";
    const mode = options.mode || "room";
    const params = new URLSearchParams({
      game: game,
      mode: mode,
      code: String(code || "").toUpperCase()
    });
    return getPublicBaseUrl() + "play.html?" + params.toString();
  },

  render: function (container, url) {
    if (!container) return;

    container.innerHTML = "";

    if (typeof QRCode === "undefined") {
      container.innerHTML = '<p class="note">QRコードを読み込めません</p>';
      return;
    }

    container.setAttribute("role", "img");
    container.setAttribute("aria-label", "参加用QRコード");

    try {
      new QRCode(container, {
        text: url,
        width: 220,
        height: 220,
        colorDark: "#111111",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });

      const visual = container.querySelector("canvas, img");
      if (visual) visual.className = "lobby-qr-canvas";
    } catch (err) {
      container.innerHTML = '<p class="note">QRコードを表示できません</p>';
    }
  },

  bindJoinLink: function (url) {
    const link = document.getElementById("lobbyJoinUrl");
    if (!link) return;
    link.href = url;
    link.textContent = url;
    link.classList.remove("hidden");
  }
};

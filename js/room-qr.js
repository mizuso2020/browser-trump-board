/**
 * ルーム参加用 QR コード
 */

const RoomQr = {
  _cachedUrl: "",
  _cachedDataUrl: "",

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

    if (url && url === this._cachedUrl && this._cachedDataUrl) {
      container.innerHTML = "";
      const img = document.createElement("img");
      img.src = this._cachedDataUrl;
      img.className = "lobby-qr-canvas";
      img.alt = "参加用QRコード";
      container.setAttribute("role", "img");
      container.setAttribute("aria-label", "参加用QRコード");
      container.appendChild(img);
      return;
    }

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
      if (visual) {
        visual.className = "lobby-qr-canvas";
        if (visual.tagName === "CANVAS") {
          this._cachedUrl = url;
          this._cachedDataUrl = visual.toDataURL("image/png");
        } else if (visual.src) {
          this._cachedUrl = url;
          this._cachedDataUrl = visual.src;
        }
      }
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

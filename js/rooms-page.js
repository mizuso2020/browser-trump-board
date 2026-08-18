/**
 * 募集中の部屋一覧ページ
 *
 * サーバーは秘密情報を返さない。部屋コード・ゲーム・人数・更新時刻だけを見て
 * 表示する。参加者の名前は募集判断に要らないので受け取っていない。
 */

const RoomsPage = {
  REFRESH_MS: 8000,
  timer: null,
  joining: false,

  el: function (id) { return document.getElementById(id); },

  init: function () {
    const self = this;
    this.el("refreshRoomsBtn").addEventListener("click", function () { self.load(); });

    // 名前は次回のために覚えておく
    const saved = this.savedName();
    if (saved) this.el("joinNameRooms").value = saved;

    this.el("roomsList").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-join-code]");
      if (btn) self.join(btn.dataset.joinCode, btn.dataset.joinGame);
    });

    this.load();
    this.timer = setInterval(function () { self.load(); }, this.REFRESH_MS);
  },

  savedName: function () {
    try { return localStorage.getItem("partyGames_playerName") || ""; } catch (e) { return ""; }
  },

  rememberName: function (name) {
    try { localStorage.setItem("partyGames_playerName", name); } catch (e) { /* ignore */ }
  },

  load: async function () {
    const data = await Sync.fetchOpenRooms();
    if (!data || !Array.isArray(data.rooms)) {
      this.el("roomsList").innerHTML =
        '<p class="rooms-empty">部屋の一覧を取得できませんでした。少し待って「更新」を押してください。</p>';
      return;
    }
    this.render(data.rooms);
  },

  render: function (rooms) {
    if (!rooms.length) {
      this.el("roomsList").innerHTML =
        '<p class="rooms-empty">いま募集中の部屋はありません。<br>' +
        '<a href="index.html" class="text-link">ゲームを選んで</a>「オンラインで遊ぶ」から' +
        '「公開して募集する」を選ぶと、ここに載ります。</p>';
      return;
    }

    const html = rooms.map(function (r) {
      const meta = GameRegistry.get(r.game);
      const name = meta ? meta.name : (r.game || "ゲーム未選択");
      const full = r.players >= r.capacity;
      return '' +
        '<li class="room-card">' +
          '<div class="room-card-main">' +
            '<span class="room-card-game">' + escapeHtml(name) + "</span>" +
            '<span class="room-card-meta">' +
              escapeHtml(String(r.players)) + " / " + escapeHtml(String(r.capacity)) + "人" +
              ' · <span class="room-card-code">' + escapeHtml(r.code) + "</span>" +
              " · " + RoomsPage.ago(r.updatedAt) +
            "</span>" +
          "</div>" +
          '<button type="button" class="btn btn-primary room-card-join"' +
            ' data-join-code="' + escapeHtml(r.code) + '"' +
            ' data-join-game="' + escapeHtml(r.game || "") + '"' +
            (full ? " disabled" : "") + ">" +
            (full ? "満員" : "参加する") +
          "</button>" +
        "</li>";
    }).join("");

    this.el("roomsList").innerHTML = '<ul class="rooms-list">' + html + "</ul>";
  },

  ago: function (ms) {
    const sec = Math.max(0, Math.round((Date.now() - Number(ms || 0)) / 1000));
    if (sec < 60) return sec + "秒前";
    const min = Math.round(sec / 60);
    return min + "分前";
  },

  join: async function (code, game) {
    if (this.joining) return;
    const nameEl = this.el("joinNameRooms");
    const name = nameEl.value.trim();
    if (!name) {
      showToast("名前を入れてください");
      nameEl.focus();
      return;
    }
    this.rememberName(name);
    this.joining = true;

    try {
      await Sync.init("online");
      const joined = await Sync.joinServer(code, name);
      if (!joined) throw new Error("参加できませんでした");
      const params = new URLSearchParams({
        code: code,
        mode: "online",
        player: Sync.uid
      });
      if (game) params.set("game", game);
      window.location.href = "room.html?" + params.toString();
    } catch (err) {
      const msg = err && err.message ? err.message : "参加できませんでした";
      showToast(msg);
      this.joining = false;
      this.load();
    }
  }
};

RoomsPage.init();

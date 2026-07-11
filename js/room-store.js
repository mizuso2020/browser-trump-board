/**
 * ローカルルーム保存（localStorage）
 * 1台の端末でルーム状態を共有。オンライン同期は今後 Firebase 等で拡張予定。
 */

const RoomStore = {
  prefix: "partyGames_room_",

  save: function (code, room) {
    localStorage.setItem(this.prefix + code, JSON.stringify(room));
  },

  load: function (code) {
    const raw = localStorage.getItem(this.prefix + code);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  remove: function (code) {
    localStorage.removeItem(this.prefix + code);
  }
};

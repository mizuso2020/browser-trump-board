/**
 * 新しいゲームを追加するときのテンプレート
 *
 * 手順:
 * 1. このファイルをコピーして js/games/新ゲーム名.js を作る
 * 2. js/game-registry.js に登録（status: "live", module: "XxxGame"）
 * 3. room.html に <script src="js/games/新ゲーム名.js"></script> を追加
 *
 * 必須プロパティ:
 *   id, name, minPlayers, maxPlayers, init(room), render(ctx)
 */

const TemplateGame = {
  id: "template",
  name: "テンプレート",
  minPlayers: 2,
  maxPlayers: 4,

  init: function (room) {
    room.gameState = { phase: "start" };
    room.phase = "template_start";
    return room;
  },

  render: function (ctx) {
    return '<section class="card"><h2>' + escapeHtml(this.name) + '</h2><p>ゲーム画面をここに実装</p></section>';
  }
};

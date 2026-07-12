/**
 * 消える○× — 1台で2人交代プレイ
 * 4個目を置くと最古の自分の駒が消える三目並べ
 */
const VanishingTttGame = {
  id: "vanishing_ttt",
  name: "消える○×",
  minPlayers: 2,
  maxPlayers: 2,
  BOARD_SIZE: 3,
  MAX_PIECES: 3,
  MAX_TURNS: 30,
  EMPTY: 0,
  CIRCLE: 1,
  CROSS: 2,
  WIN_LINES: [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ],

  init: function (room) {
    room.gameState = {
      board: new Array(9).fill(this.EMPTY),
      circleHistory: [],
      crossHistory: [],
      turn: this.CIRCLE,
      turnCount: 0,
      finished: false,
      winner: null,
      winningLine: null
    };
    room.phase = "vttt_play";
    return room;
  },

  opponent: function (player) {
    return player === this.CIRCLE ? this.CROSS : this.CIRCLE;
  },

  historyFor: function (gs, player) {
    return player === this.CIRCLE ? gs.circleHistory : gs.crossHistory;
  },

  getPlayerForMark: function (room, mark) {
    if (!room.players || room.players.length < 2) return null;
    return mark === this.CIRCLE ? room.players[0] : room.players[1];
  },

  isRemoteRoom: function (room) {
    return room.mode === "room" || room.mode === "online";
  },

  isMyTurn: function (ctx) {
    if (!this.isRemoteRoom(ctx.room)) return true;
    const gs = ctx.room.gameState;
    if (!gs || gs.finished) return false;
    const player = this.getPlayerForMark(ctx.room, gs.turn);
    return !!(ctx.me && player && player.id === ctx.me.id);
  },

  renderTurnNote: function (ctx, current, markLabel) {
    if (!current) return "";
    if (!this.isRemoteRoom(ctx.room)) {
      return '<p class="vttt-turn-note"><strong>' + escapeHtml(current.name) + "（" + markLabel + "）</strong> の番です。スマホを渡して置いてください。</p>";
    }
    if (this.isMyTurn(ctx)) {
      return '<p class="vttt-turn-note"><strong>あなたの番</strong>（' + markLabel + "）です。マスをタップしてください。</p>";
    }
    return '<p class="vttt-turn-note"><strong>' + escapeHtml(current.name) + "（" + markLabel + "）</strong> の番です。相手の操作を待っています…</p>";
  },

  markLabel: function (mark) {
    return mark === this.CIRCLE ? "〇" : "×";
  },

  indexToRowCol: function (index) {
    return {
      row: Math.floor(index / this.BOARD_SIZE),
      col: index % this.BOARD_SIZE
    };
  },

  findWinningLine: function (board, player) {
    const self = this;
    for (let i = 0; i < this.WIN_LINES.length; i++) {
      const line = this.WIN_LINES[i];
      if (line.every(function (idx) { return board[idx] === player; })) {
        return line.slice();
      }
    }
    return null;
  },

  trimOldest: function (gs, player) {
    const history = this.historyFor(gs, player);
    if (history.length <= this.MAX_PIECES) return null;

    const removed = history.shift();
    gs.board[removed] = this.EMPTY;
    return removed;
  },

  play: function (room, index) {
    const gs = room.gameState;
    if (gs.finished) return { ok: false, error: "ゲームは終了しています" };
    if (index < 0 || index > 8 || gs.board[index] !== this.EMPTY) {
      return { ok: false, error: "そこには置けません" };
    }

    const player = gs.turn;
    const history = this.historyFor(gs, player);

    gs.lastMove = {
      placed: index,
      removed: null,
      mark: player
    };

    gs.board[index] = player;
    history.push(index);

    const removed = this.trimOldest(gs, player);
    if (removed !== null) {
      gs.lastMove.removed = removed;
    }

    const winningLine = this.findWinningLine(gs.board, player);
    if (winningLine) {
      gs.finished = true;
      gs.winner = player;
      gs.winningLine = winningLine;
      return { ok: true, room: room };
    }

    gs.turnCount += 1;
    if (gs.turnCount >= this.MAX_TURNS) {
      gs.finished = true;
      gs.winner = 0;
      return { ok: true, room: room };
    }

    gs.turn = this.opponent(player);
    return { ok: true, room: room };
  },

  restart: function (room) {
    return this.init(room);
  },

  isWinningCell: function (winningLine, index) {
    if (!winningLine) return false;
    return winningLine.indexOf(index) !== -1;
  },

  renderMark: function (mark, index, lastMove, winningLine) {
    const symbol = mark === this.CIRCLE ? "〇" : "×";
    const isPlaced = lastMove && lastMove.placed === index;
    const isRemoved = lastMove && lastMove.removed === index;
    const isWin = this.isWinningCell(winningLine, index);
    let cls = "vttt-mark vttt-mark--" + (mark === this.CIRCLE ? "circle" : "cross");
    if (isPlaced) cls += " anim-place";
    if (isRemoved) cls += " anim-remove";
    if (isWin) cls += " is-win";
    return '<span class="' + cls + '" aria-hidden="true">' + symbol + "</span>";
  },

  render: function (ctx) {
    const gs = ctx.room.gameState;
    const board = gs.board;
    const lastMove = gs.lastMove || null;
    const winningLine = gs.winningLine || null;
    const current = this.getPlayerForMark(ctx.room, gs.turn);
    const circlePlayer = this.getPlayerForMark(ctx.room, this.CIRCLE);
    const crossPlayer = this.getPlayerForMark(ctx.room, this.CROSS);
    let html = "";

    html += '<section class="card vttt-card">';
    html += '<p class="vttt-rule-note">4個目を置くと、いちばん古い自分のマークが消えます。</p>';

    html += '<div class="vttt-scoreboard">';
    html += '<div class="vttt-player vttt-player--circle' + (gs.turn === this.CIRCLE && !gs.finished ? " is-active" : "") + '">';
    html += '<span class="vttt-mark vttt-mark--circle">〇</span>';
    html += "<span>" + escapeHtml(circlePlayer ? circlePlayer.name : "〇") + "</span>";
    html += "<strong>先攻</strong>";
    html += "</div>";
    html += '<div class="vttt-player vttt-player--cross' + (gs.turn === this.CROSS && !gs.finished ? " is-active" : "") + '">';
    html += '<span class="vttt-mark vttt-mark--cross">×</span>';
    html += "<span>" + escapeHtml(crossPlayer ? crossPlayer.name : "×") + "</span>";
    html += "<strong>後攻</strong>";
    html += "</div>";
    html += "</div>";

    if (!gs.finished && current) {
      html += this.renderTurnNote(ctx, current, this.markLabel(gs.turn));
    }

    html += '<div class="vttt-meta">';
    html += "<span>ターン " + gs.turnCount + " / " + this.MAX_TURNS + "</span>";
    html += "<span>〇 " + gs.circleHistory.length + " · × " + gs.crossHistory.length + "</span>";
    html += "</div>";

    html += '<div class="vttt-board-wrap">';
    html += '<div class="vttt-board" role="grid" aria-label="消える○×盤">';
    for (let i = 0; i < 9; i++) {
      const cell = board[i];
      const pos = this.indexToRowCol(i);
      let classes = "vttt-cell";
      if (cell === this.CIRCLE) classes += " has-circle";
      if (cell === this.CROSS) classes += " has-cross";

      html += '<button type="button" class="' + classes + '" data-action="vttt-play" data-index="' + i + '"';
      if (gs.finished || cell !== this.EMPTY || !this.isMyTurn(ctx)) html += " disabled";
      html += ' aria-label="' + (pos.row + 1) + "行" + (pos.col + 1) + "列\">";
      if (cell !== this.EMPTY) {
        html += this.renderMark(cell, i, lastMove, winningLine);
      }
      html += "</button>";
    }
    html += "</div></div>";

    if (gs.finished) {
      let result = "30ターン経過で引き分けです";
      if (gs.winner === this.CIRCLE) {
        result = escapeHtml(circlePlayer ? circlePlayer.name : "〇") + "（〇）の勝ち！";
      } else if (gs.winner === this.CROSS) {
        result = escapeHtml(crossPlayer ? crossPlayer.name : "×") + "（×）の勝ち！";
      }
      html += '<p class="vttt-result">' + result + "</p>";
      if (ctx.isHost) {
        html += '<button type="button" class="btn btn-primary" data-action="vttt-restart">もう一局</button>';
        html += '<button type="button" class="btn btn-secondary" data-action="back-lobby" style="margin-top:0.5rem">ロビーに戻る</button>';
      }
    }

    html += "</section>";
    return html;
  }
};

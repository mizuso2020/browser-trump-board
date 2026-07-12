/**
 * ノーマル○×ゲーム — 1台で2人交代プレイ
 */
const TicTacToeGame = {
  id: "tic_tac_toe",
  name: "ノーマル○×ゲーム",
  minPlayers: 2,
  maxPlayers: 2,
  BOARD_SIZE: 3,
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
      turn: this.CIRCLE,
      finished: false,
      winner: null,
      winningLine: null
    };
    room.phase = "ttt_play";
    return room;
  },

  opponent: function (player) {
    return player === this.CIRCLE ? this.CROSS : this.CIRCLE;
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
    for (let i = 0; i < this.WIN_LINES.length; i++) {
      const line = this.WIN_LINES[i];
      if (line.every(function (idx) { return board[idx] === player; })) {
        return line.slice();
      }
    }
    return null;
  },

  isBoardFull: function (board) {
    return board.every(function (cell) { return cell !== TicTacToeGame.EMPTY; });
  },

  play: function (room, index) {
    const gs = room.gameState;
    if (gs.finished) return { ok: false, error: "ゲームは終了しています" };
    if (index < 0 || index > 8 || gs.board[index] !== this.EMPTY) {
      return { ok: false, error: "そこには置けません" };
    }

    const player = gs.turn;

    gs.lastMove = {
      placed: index,
      mark: player
    };

    gs.board[index] = player;

    const winningLine = this.findWinningLine(gs.board, player);
    if (winningLine) {
      gs.finished = true;
      gs.winner = player;
      gs.winningLine = winningLine;
      return { ok: true, room: room };
    }

    if (this.isBoardFull(gs.board)) {
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

  countMarks: function (board, mark) {
    let count = 0;
    board.forEach(function (cell) {
      if (cell === mark) count += 1;
    });
    return count;
  },

  renderMark: function (mark, index, lastMove, winningLine) {
    const symbol = mark === this.CIRCLE ? "〇" : "×";
    const isPlaced = lastMove && lastMove.placed === index;
    const isWin = this.isWinningCell(winningLine, index);
    let cls = "vttt-mark vttt-mark--" + (mark === this.CIRCLE ? "circle" : "cross");
    if (isPlaced) cls += " anim-place";
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
    const circleCount = this.countMarks(board, this.CIRCLE);
    const crossCount = this.countMarks(board, this.CROSS);
    let html = "";

    html += '<section class="card vttt-card">';
    html += '<p class="vttt-rule-note">横・縦・斜めのいずれかに3つ並べた方の勝ちです。</p>';

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
    html += "<span>〇 " + circleCount + " · × " + crossCount + "</span>";
    html += "</div>";

    html += '<div class="vttt-board-wrap">';
    html += '<div class="vttt-board" role="grid" aria-label="ノーマル○×盤">';
    for (let i = 0; i < 9; i++) {
      const cell = board[i];
      const pos = this.indexToRowCol(i);
      let classes = "vttt-cell";
      if (cell === this.CIRCLE) classes += " has-circle";
      if (cell === this.CROSS) classes += " has-cross";

      html += '<button type="button" class="' + classes + '" data-action="ttt-play" data-index="' + i + '"';
      if (gs.finished || cell !== this.EMPTY || !this.isMyTurn(ctx)) html += " disabled";
      html += ' aria-label="' + (pos.row + 1) + "行" + (pos.col + 1) + "列\">";
      if (cell !== this.EMPTY) {
        html += this.renderMark(cell, i, lastMove, winningLine);
      }
      html += "</button>";
    }
    html += "</div></div>";

    if (gs.finished) {
      let result = "引き分けです";
      if (gs.winner === this.CIRCLE) {
        result = escapeHtml(circlePlayer ? circlePlayer.name : "〇") + "（〇）の勝ち！";
      } else if (gs.winner === this.CROSS) {
        result = escapeHtml(crossPlayer ? crossPlayer.name : "×") + "（×）の勝ち！";
      }
      html += '<p class="vttt-result">' + result + "</p>";
      if (ctx.isHost) {
        html += '<button type="button" class="btn btn-primary" data-action="ttt-restart">もう一局</button>';
        html += '<button type="button" class="btn btn-secondary" data-action="back-lobby" style="margin-top:0.5rem">ロビーに戻る</button>';
      }
    }

    html += "</section>";
    return html;
  }
};

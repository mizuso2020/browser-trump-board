/**
 * 五目並べ — 1台で2人交代プレイ
 */
const GomokuGame = {
  id: "gomoku",
  name: "五目並べ",
  minPlayers: 2,
  maxPlayers: 2,
  BOARD_SIZE: 15,
  EMPTY: 0,
  BLACK: 1,
  WHITE: 2,
  WIN_COUNT: 5,
  DIRECTIONS: [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ],

  init: function (room) {
    room.gameState = {
      board: this.createEmptyBoard(),
      turn: this.BLACK,
      finished: false,
      winner: null,
      winningLine: null
    };
    room.phase = "gomoku_play";
    return room;
  },

  createEmptyBoard: function () {
    const size = this.BOARD_SIZE;
    const board = [];
    for (let r = 0; r < size; r++) {
      board.push(new Array(size).fill(this.EMPTY));
    }
    return board;
  },

  inBounds: function (r, c) {
    return r >= 0 && r < this.BOARD_SIZE && c >= 0 && c < this.BOARD_SIZE;
  },

  opponent: function (player) {
    return player === this.BLACK ? this.WHITE : this.BLACK;
  },

  countLine: function (board, row, col, dr, dc, player) {
    let count = 1;
    let r = row + dr;
    let c = col + dc;

    while (this.inBounds(r, c) && board[r][c] === player) {
      count++;
      r += dr;
      c += dc;
    }

    r = row - dr;
    c = col - dc;
    while (this.inBounds(r, c) && board[r][c] === player) {
      count++;
      r -= dr;
      c -= dc;
    }

    return count;
  },

  findWinningLine: function (board, row, col, player) {
    const self = this;
    for (let i = 0; i < this.DIRECTIONS.length; i++) {
      const dir = this.DIRECTIONS[i];
      if (this.countLine(board, row, col, dir[0], dir[1], player) < this.WIN_COUNT) continue;

      const line = [[row, col]];
      let r = row + dir[0];
      let c = col + dir[1];
      while (self.inBounds(r, c) && board[r][c] === player) {
        line.push([r, c]);
        r += dir[0];
        c += dir[1];
      }
      r = row - dir[0];
      c = col - dir[1];
      while (self.inBounds(r, c) && board[r][c] === player) {
        line.unshift([r, c]);
        r -= dir[0];
        c -= dir[1];
      }

      if (line.length >= this.WIN_COUNT) {
        return line.slice(0, this.WIN_COUNT);
      }
    }
    return null;
  },

  isBoardFull: function (board) {
    for (let r = 0; r < this.BOARD_SIZE; r++) {
      for (let c = 0; c < this.BOARD_SIZE; c++) {
        if (board[r][c] === this.EMPTY) return false;
      }
    }
    return true;
  },

  getPlayerForColor: function (room, color) {
    if (!room.players || room.players.length < 2) return null;
    return color === this.BLACK ? room.players[0] : room.players[1];
  },

  colorLabel: function (color) {
    return color === this.BLACK ? "黒" : "白";
  },

  play: function (room, row, col) {
    const gs = room.gameState;
    if (gs.finished) return { ok: false, error: "ゲームは終了しています" };
    if (!this.inBounds(row, col) || gs.board[row][col] !== this.EMPTY) {
      return { ok: false, error: "そこには置けません" };
    }

    gs.lastMove = {
      placed: [row, col],
      color: gs.turn
    };

    gs.board[row][col] = gs.turn;

    const winningLine = this.findWinningLine(gs.board, row, col, gs.turn);
    if (winningLine) {
      gs.finished = true;
      gs.winner = gs.turn;
      gs.winningLine = winningLine;
      return { ok: true, room: room };
    }

    if (this.isBoardFull(gs.board)) {
      gs.finished = true;
      gs.winner = 0;
      return { ok: true, room: room };
    }

    gs.turn = this.opponent(gs.turn);
    return { ok: true, room: room };
  },

  restart: function (room) {
    return this.init(room);
  },

  isWinningCell: function (winningLine, row, col) {
    if (!winningLine) return false;
    return winningLine.some(function (pos) {
      return pos[0] === row && pos[1] === col;
    });
  },

  renderPiece: function (cell, row, col, lastMove, winningLine) {
    const color = cell === this.BLACK ? "black" : "white";
    const isPlaced = lastMove && lastMove.placed[0] === row && lastMove.placed[1] === col;
    const isWin = this.isWinningCell(winningLine, row, col);
    let cls = "gomoku-piece gomoku-piece--" + color;
    if (isPlaced) cls += " anim-place";
    if (isWin) cls += " is-win";
    return '<span class="' + cls + '" aria-hidden="true"></span>';
  },

  render: function (ctx) {
    const gs = ctx.room.gameState;
    const board = gs.board;
    const lastMove = gs.lastMove || null;
    const winningLine = gs.winningLine || null;
    const current = this.getPlayerForColor(ctx.room, gs.turn);
    const blackPlayer = this.getPlayerForColor(ctx.room, this.BLACK);
    const whitePlayer = this.getPlayerForColor(ctx.room, this.WHITE);
    let html = "";

    html += '<section class="card gomoku-card">';
    html += '<div class="gomoku-scoreboard">';
    html += '<div class="gomoku-player gomoku-player--black' + (gs.turn === this.BLACK && !gs.finished ? " is-active" : "") + '">';
    html += '<span class="gomoku-stone gomoku-stone--black"></span>';
    html += '<span>' + escapeHtml(blackPlayer ? blackPlayer.name : "黒") + '</span>';
    html += '<strong>先攻</strong>';
    html += '</div>';
    html += '<div class="gomoku-player gomoku-player--white' + (gs.turn === this.WHITE && !gs.finished ? " is-active" : "") + '">';
    html += '<span class="gomoku-stone gomoku-stone--white"></span>';
    html += '<span>' + escapeHtml(whitePlayer ? whitePlayer.name : "白") + '</span>';
    html += '<strong>後攻</strong>';
    html += '</div>';
    html += '</div>';

    if (!gs.finished && current) {
      html += '<p class="gomoku-turn-note"><strong>' + escapeHtml(current.name) + '（' + this.colorLabel(gs.turn) + '）</strong> の番です。スマホを渡して置いてください。</p>';
    }

    html += '<div class="gomoku-board-wrap">';
    html += '<div class="gomoku-board" role="grid" aria-label="五目並べ盤">';
    for (let r = 0; r < this.BOARD_SIZE; r++) {
      for (let c = 0; c < this.BOARD_SIZE; c++) {
        const cell = board[r][c];
        let classes = "gomoku-cell";
        if (cell === this.BLACK) classes += " has-black";
        if (cell === this.WHITE) classes += " has-white";

        html += '<button type="button" class="' + classes + '" data-action="gomoku-play" data-row="' + r + '" data-col="' + c + '"';
        if (gs.finished || cell !== this.EMPTY) html += ' disabled';
        html += ' aria-label="' + (r + 1) + '行' + (c + 1) + '列">';
        if (cell !== this.EMPTY) {
          html += this.renderPiece(cell, r, c, lastMove, winningLine);
        }
        html += '</button>';
      }
    }
    html += '</div></div>';

    if (gs.finished) {
      let result = "引き分けです";
      if (gs.winner === this.BLACK) {
        result = escapeHtml(blackPlayer ? blackPlayer.name : "黒") + "（黒）の勝ち！";
      } else if (gs.winner === this.WHITE) {
        result = escapeHtml(whitePlayer ? whitePlayer.name : "白") + "（白）の勝ち！";
      }
      html += '<p class="gomoku-result">' + result + '</p>';
      if (ctx.isHost) {
        html += '<button type="button" class="btn btn-primary" data-action="gomoku-restart">もう一局</button>';
        html += '<button type="button" class="btn btn-secondary" data-action="back-lobby" style="margin-top:0.5rem">ロビーに戻る</button>';
      }
    }

    html += '</section>';
    return html;
  }
};

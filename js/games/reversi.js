/**
 * オセロ（リバーシ）— 1台で2人交代プレイ
 */
const ReversiGame = {
  id: "reversi",
  name: "オセロ",
  minPlayers: 2,
  maxPlayers: 2,
  BOARD_SIZE: 8,
  EMPTY: 0,
  BLACK: 1,
  WHITE: 2,
  DIRECTIONS: [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ],

  init: function (room) {
    room.gameState = {
      board: this.createInitialBoard(),
      turn: this.BLACK,
      passesInRow: 0,
      finished: false,
      winner: null
    };
    room.phase = "reversi_play";
    return room;
  },

  createInitialBoard: function () {
    const size = this.BOARD_SIZE;
    const board = [];
    for (let r = 0; r < size; r++) {
      board.push(new Array(size).fill(this.EMPTY));
    }
    const mid = size / 2;
    board[mid - 1][mid - 1] = this.WHITE;
    board[mid - 1][mid] = this.BLACK;
    board[mid][mid - 1] = this.BLACK;
    board[mid][mid] = this.WHITE;
    return board;
  },

  inBounds: function (r, c) {
    return r >= 0 && r < this.BOARD_SIZE && c >= 0 && c < this.BOARD_SIZE;
  },

  opponent: function (player) {
    return player === this.BLACK ? this.WHITE : this.BLACK;
  },

  getFlips: function (board, row, col, player) {
    if (board[row][col] !== this.EMPTY) return null;

    const opponent = this.opponent(player);
    let allFlips = [];

    this.DIRECTIONS.forEach(function (dir) {
      const flips = [];
      let r = row + dir[0];
      let c = col + dir[1];

      while (ReversiGame.inBounds(r, c) && board[r][c] === opponent) {
        flips.push([r, c]);
        r += dir[0];
        c += dir[1];
      }

      if (flips.length > 0 && ReversiGame.inBounds(r, c) && board[r][c] === player) {
        allFlips = allFlips.concat(flips);
      }
    });

    return allFlips.length ? allFlips : null;
  },

  getLegalMoves: function (board, player) {
    const moves = [];
    for (let r = 0; r < this.BOARD_SIZE; r++) {
      for (let c = 0; c < this.BOARD_SIZE; c++) {
        if (this.getFlips(board, r, c, player)) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  },

  countDiscs: function (board) {
    let black = 0;
    let white = 0;
    board.forEach(function (row) {
      row.forEach(function (cell) {
        if (cell === ReversiGame.BLACK) black++;
        else if (cell === ReversiGame.WHITE) white++;
      });
    });
    return { black: black, white: white };
  },

  getWinner: function (board) {
    const score = this.countDiscs(board);
    if (score.black > score.white) return this.BLACK;
    if (score.white > score.black) return this.WHITE;
    return 0;
  },

  getPlayerForColor: function (room, color) {
    if (!room.players || room.players.length < 2) return null;
    return color === this.BLACK ? room.players[0] : room.players[1];
  },

  isRemoteRoom: function (room) {
    return room.mode === "room" || room.mode === "online";
  },

  isMyTurn: function (ctx) {
    if (!this.isRemoteRoom(ctx.room)) return true;
    const gs = ctx.room.gameState;
    if (!gs || gs.finished) return false;
    const player = this.getPlayerForColor(ctx.room, gs.turn);
    return !!(ctx.me && player && player.id === ctx.me.id);
  },

  renderTurnNote: function (ctx, current, colorLabel) {
    if (!current) return "";
    if (!this.isRemoteRoom(ctx.room)) {
      return '<p class="reversi-turn-note"><strong>' + escapeHtml(current.name) + "（" + colorLabel + "）</strong> の番です。スマホを渡して置いてください。</p>";
    }
    if (this.isMyTurn(ctx)) {
      return '<p class="reversi-turn-note"><strong>あなたの番</strong>（' + colorLabel + "）です。置けるマスをタップしてください。</p>";
    }
    return '<p class="reversi-turn-note"><strong>' + escapeHtml(current.name) + "（" + colorLabel + "）</strong> の番です。相手の操作を待っています…</p>";
  },

  colorLabel: function (color) {
    return color === this.BLACK ? "黒" : "白";
  },

  advanceTurn: function (gs) {
    gs.turn = this.opponent(gs.turn);

    if (this.getLegalMoves(gs.board, gs.turn).length) {
      gs.passesInRow = 0;
      return;
    }

    gs.passesInRow++;
    gs.turn = this.opponent(gs.turn);

    if (!this.getLegalMoves(gs.board, gs.turn).length) {
      gs.finished = true;
      gs.winner = this.getWinner(gs.board);
    }
  },

  play: function (room, row, col) {
    const gs = room.gameState;
    if (gs.finished) return { ok: false, error: "ゲームは終了しています" };

    const flips = this.getFlips(gs.board, row, col, gs.turn);
    if (!flips) return { ok: false, error: "そこには置けません" };

    gs.lastMove = {
      placed: [row, col],
      flipped: flips.slice(),
      toColor: gs.turn,
      fromColor: this.opponent(gs.turn)
    };

    gs.board[row][col] = gs.turn;
    flips.forEach(function (pos) {
      gs.board[pos[0]][pos[1]] = gs.turn;
    });

    this.advanceTurn(gs);
    return { ok: true, room: room };
  },

  restart: function (room) {
    return this.init(room);
  },

  clearAnimation: function (room) {
    if (room.gameState && room.gameState.lastMove) {
      delete room.gameState.lastMove;
    }
  },

  isFlippedCell: function (lastMove, row, col) {
    if (!lastMove || !lastMove.flipped) return false;
    return lastMove.flipped.some(function (pos) {
      return pos[0] === row && pos[1] === col;
    });
  },

  renderPiece: function (cell, row, col, lastMove) {
    const color = cell === this.BLACK ? "black" : "white";
    const isPlaced = lastMove && lastMove.placed[0] === row && lastMove.placed[1] === col;
    const isFlipped = this.isFlippedCell(lastMove, row, col);

    if (isFlipped) {
      const fromColor = lastMove.toColor === this.BLACK ? "white" : "black";
      const toColor = color;
      return (
        '<span class="reversi-piece anim-flip" aria-hidden="true">' +
          '<span class="reversi-face reversi-face--' + fromColor + '"></span>' +
          '<span class="reversi-face reversi-face--' + toColor + ' reversi-face--back"></span>' +
        '</span>'
      );
    }

    let cls = "reversi-piece reversi-piece--" + color;
    if (isPlaced) cls += " anim-place";
    return '<span class="' + cls + '" aria-hidden="true"></span>';
  },

  render: function (ctx) {
    const gs = ctx.room.gameState;
    const board = gs.board;
    const lastMove = gs.lastMove || null;
    const legal = gs.finished ? [] : this.getLegalMoves(board, gs.turn);
    const legalKey = {};
    legal.forEach(function (move) {
      legalKey[move[0] + "," + move[1]] = true;
    });
    const score = this.countDiscs(board);
    const current = this.getPlayerForColor(ctx.room, gs.turn);
    const blackPlayer = this.getPlayerForColor(ctx.room, this.BLACK);
    const whitePlayer = this.getPlayerForColor(ctx.room, this.WHITE);
    let html = "";

    html += '<section class="card reversi-card">';
    html += '<div class="reversi-scoreboard">';
    html += '<div class="reversi-player reversi-player--black' + (gs.turn === this.BLACK && !gs.finished ? " is-active" : "") + '">';
    html += '<span class="reversi-disc reversi-disc--black"></span>';
    html += '<span>' + escapeHtml(blackPlayer ? blackPlayer.name : "黒") + '</span>';
    html += '<strong>' + score.black + '</strong>';
    html += '</div>';
    html += '<div class="reversi-player reversi-player--white' + (gs.turn === this.WHITE && !gs.finished ? " is-active" : "") + '">';
    html += '<span class="reversi-disc reversi-disc--white"></span>';
    html += '<span>' + escapeHtml(whitePlayer ? whitePlayer.name : "白") + '</span>';
    html += '<strong>' + score.white + '</strong>';
    html += '</div>';
    html += '</div>';

    if (!gs.finished && current) {
      html += this.renderTurnNote(ctx, current, this.colorLabel(gs.turn));
    }

    html += '<div class="reversi-board" role="grid" aria-label="オセロ盤">';
    for (let r = 0; r < this.BOARD_SIZE; r++) {
      for (let c = 0; c < this.BOARD_SIZE; c++) {
        const cell = board[r][c];
        const isLegal = legalKey[r + "," + c];
        let classes = "reversi-cell";
        if (isLegal) classes += " is-legal";
        if (cell === this.BLACK) classes += " has-black";
        if (cell === this.WHITE) classes += " has-white";

        html += '<button type="button" class="' + classes + '" data-action="reversi-play" data-row="' + r + '" data-col="' + c + '"';
        if (gs.finished || !isLegal || !this.isMyTurn(ctx)) html += ' disabled';
        html += ' aria-label="' + (r + 1) + '行' + (c + 1) + '列">';
        if (cell !== this.EMPTY) {
          html += this.renderPiece(cell, r, c, lastMove);
        }
        html += '</button>';
      }
    }
    html += '</div>';

    if (gs.finished) {
      let result = "引き分けです";
      if (gs.winner === this.BLACK) {
        result = escapeHtml(blackPlayer ? blackPlayer.name : "黒") + "（黒）の勝ち！";
      } else if (gs.winner === this.WHITE) {
        result = escapeHtml(whitePlayer ? whitePlayer.name : "白") + "（白）の勝ち！";
      }
      html += '<p class="reversi-result">' + result + "（黒 " + score.black + " － 白 " + score.white + "）</p>";
      if (ctx.isHost) {
        html += '<button type="button" class="btn btn-primary" data-action="reversi-restart">もう一局</button>';
        html += '<button type="button" class="btn btn-secondary" data-action="back-lobby" style="margin-top:0.5rem">ロビーに戻る</button>';
      }
    }

    html += '</section>';
    return html;
  }
};

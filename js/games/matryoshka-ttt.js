/**
 * マトリョーシカ○× — 1台で2人交代プレイ
 * 小・中・大のコマを重ねて三目を狙う
 */
const MatryoshkaTttGame = {
  id: "matryoshka_ttt",
  name: "マトリョーシカ○×",
  minPlayers: 2,
  maxPlayers: 2,
  BOARD_SIZE: 3,
  PLAYER1: 1,
  PLAYER2: 2,
  SIZE_LABELS: { 1: "小", 2: "中", 3: "大" },
  WIN_LINES: [
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]]
  ],

  init: function (room) {
    room.gameState = {
      board: this.createEmptyBoard(),
      hands: this.createInitialHands(),
      turn: this.PLAYER1,
      selected: null,
      finished: false,
      winner: null,
      winningLines: [],
      drawReason: null
    };
    room.phase = "mttt_play";
    return room;
  },

  createEmptyBoard: function () {
    const board = [];
    for (let r = 0; r < this.BOARD_SIZE; r++) {
      const row = [];
      for (let c = 0; c < this.BOARD_SIZE; c++) {
        row.push([]);
      }
      board.push(row);
    }
    return board;
  },

  createInitialHands: function () {
    return {
      1: { 1: 3, 2: 3, 3: 3 },
      2: { 1: 3, 2: 3, 3: 3 }
    };
  },

  opponent: function (player) {
    return player === this.PLAYER1 ? this.PLAYER2 : this.PLAYER1;
  },

  getPlayerForOwner: function (room, owner) {
    if (!room.players || room.players.length < 2) return null;
    return owner === this.PLAYER1 ? room.players[0] : room.players[1];
  },

  ownerLabel: function (owner) {
    return owner === this.PLAYER1 ? "赤" : "青";
  },

  topPiece: function (cell) {
    if (!cell || !cell.length) return null;
    return cell[cell.length - 1];
  },

  pieceKey: function (piece) {
    return piece.owner + "-" + piece.size;
  },

  selectionKey: function (sel) {
    if (!sel) return "";
    if (sel.type === "hand") return "hand-" + sel.owner + "-" + sel.size;
    return "board-" + sel.row + "-" + sel.col;
  },

  canPlaceOn: function (piece, targetCell, selection) {
    if (selection.type === "board" && selection.row === undefined) return false;
    if (selection.type === "board") {
      if (selection.row === null) return false;
    }

    const top = this.topPiece(targetCell);
    if (!top) return true;
    return piece.size > top.size;
  },

  isSameCell: function (selection, row, col) {
    return selection && selection.type === "board" && selection.row === row && selection.col === col;
  },

  getMovingPiece: function (selection) {
    return { owner: selection.owner, size: selection.size };
  },

  getLegalTargets: function (gs) {
    const sel = gs.selected;
    if (!sel || sel.owner !== gs.turn) return [];

    const piece = this.getMovingPiece(sel);
    const targets = [];

    for (let r = 0; r < this.BOARD_SIZE; r++) {
      for (let c = 0; c < this.BOARD_SIZE; c++) {
        if (this.isSameCell(sel, r, c)) continue;
        if (this.canPlaceOn(piece, gs.board[r][c], sel)) {
          targets.push([r, c]);
        }
      }
    }
    return targets;
  },

  isLegalTarget: function (gs, row, col) {
    const targets = this.getLegalTargets(gs);
    return targets.some(function (pos) {
      return pos[0] === row && pos[1] === col;
    });
  },

  evaluateWin: function (board) {
    const p1Lines = [];
    const p2Lines = [];
    const self = this;

    this.WIN_LINES.forEach(function (line) {
      const tops = line.map(function (pos) {
        return self.topPiece(board[pos[0]][pos[1]]);
      });
      if (tops.some(function (p) { return !p; })) return;
      const owner = tops[0].owner;
      if (!tops.every(function (p) { return p.owner === owner; })) return;
      if (owner === self.PLAYER1) p1Lines.push(line);
      if (owner === self.PLAYER2) p2Lines.push(line);
    });

    if (p1Lines.length && p2Lines.length) {
      return { winner: 0, winningLines: p1Lines.concat(p2Lines), drawReason: "simultaneous" };
    }
    if (p1Lines.length) {
      return { winner: this.PLAYER1, winningLines: p1Lines, drawReason: null };
    }
    if (p2Lines.length) {
      return { winner: this.PLAYER2, winningLines: p2Lines, drawReason: null };
    }
    return null;
  },

  applyMove: function (gs, selection, row, col) {
    const piece = this.getMovingPiece(selection);

    if (selection.type === "hand") {
      gs.hands[selection.owner][selection.size] -= 1;
      gs.board[row][col].push({ owner: piece.owner, size: piece.size });
      return;
    }

    const sourceCell = gs.board[selection.row][selection.col];
    sourceCell.pop();
    gs.board[row][col].push(piece);
  },

  selectHand: function (room, size) {
    const gs = room.gameState;
    if (gs.finished) return { ok: false, error: "ゲームは終了しています" };

    const turn = gs.turn;
    const parsedSize = parseInt(size, 10);
    if (parsedSize < 1 || parsedSize > 3) return { ok: false, error: "コマを選べません" };
    if (gs.hands[turn][parsedSize] <= 0) return { ok: false, error: "そのコマはもうありません" };

    const current = gs.selected;
    if (current && current.type === "hand" && current.size === parsedSize && current.owner === turn) {
      gs.selected = null;
      return { ok: true, room: room };
    }

    gs.selected = { type: "hand", owner: turn, size: parsedSize };
    return { ok: true, room: room };
  },

  handleCell: function (room, row, col) {
    const gs = room.gameState;
    if (gs.finished) return { ok: false, error: "ゲームは終了しています" };

    const turn = gs.turn;
    const cell = gs.board[row][col];
    const top = this.topPiece(cell);
    const sel = gs.selected;

    if (!sel) {
      if (top && top.owner === turn) {
        gs.selected = { type: "board", owner: top.owner, size: top.size, row: row, col: col };
        return { ok: true, room: room };
      }
      return { ok: false, error: "手持ちか盤面の自分のコマを選んでください" };
    }

    if (this.isSameCell(sel, row, col)) {
      gs.selected = null;
      return { ok: true, room: room };
    }

    if (top && top.owner === turn) {
      gs.selected = { type: "board", owner: top.owner, size: top.size, row: row, col: col };
      return { ok: true, room: room };
    }

    if (!this.isLegalTarget(gs, row, col)) {
      return { ok: false, error: "そこには置けません" };
    }

    this.applyMove(gs, sel, row, col);
    gs.selected = null;

    const result = this.evaluateWin(gs.board);
    if (result) {
      gs.finished = true;
      gs.winner = result.winner;
      gs.winningLines = result.winningLines;
      gs.drawReason = result.drawReason;
      return { ok: true, room: room };
    }

    gs.turn = this.opponent(turn);
    return { ok: true, room: room };
  },

  cancelSelect: function (room) {
    if (room.gameState) room.gameState.selected = null;
    return room;
  },

  restart: function (room) {
    return this.init(room);
  },

  isWinningCell: function (winningLines, row, col) {
    if (!winningLines || !winningLines.length) return false;
    return winningLines.some(function (line) {
      return line.some(function (pos) {
        return pos[0] === row && pos[1] === col;
      });
    });
  },

  renderPieceDisc: function (piece, extraClass) {
    const ownerClass = piece.owner === this.PLAYER1 ? "p1" : "p2";
    let cls = "mttt-disc mttt-disc--size" + piece.size + " mttt-disc--" + ownerClass;
    if (extraClass) cls += " " + extraClass;
    return '<span class="' + cls + '" aria-hidden="true"></span>';
  },

  renderBoardCell: function (ctx, row, col, gs, legalTargets) {
    const cell = gs.board[row][col];
    const top = this.topPiece(cell);
    const sel = gs.selected;
    const isSource = this.isSameCell(sel, row, col);
    const isTarget = legalTargets.some(function (pos) {
      return pos[0] === row && pos[1] === col;
    });
    const isWin = this.isWinningCell(gs.winningLines, row, col);

    let classes = "mttt-cell";
    if (top) classes += " has-piece";
    if (isSource) classes += " is-source";
    if (isTarget) classes += " is-target";
    if (isWin) classes += " is-win";

    let html = '<button type="button" class="' + classes + '" data-action="mttt-cell" data-row="' + row + '" data-col="' + col + '"';
    if (gs.finished) html += " disabled";
    html += ' aria-label="' + (row + 1) + "行" + (col + 1) + "列\">";

    if (top) {
      html += this.renderPieceDisc(top, "is-top");
    }
    html += "</button>";
    return html;
  },

  renderHand: function (ctx, owner, gs) {
    const player = this.getPlayerForOwner(ctx.room, owner);
    const hand = gs.hands[owner];
    const isTurn = gs.turn === owner && !gs.finished;
    const sel = gs.selected;
    let html = '<div class="mttt-hand mttt-hand--' + (owner === this.PLAYER1 ? "p1" : "p2") + (isTurn ? " is-active" : "") + '">';
    html += "<p class=\"mttt-hand-label\">" + escapeHtml(player ? player.name : this.ownerLabel(owner)) + " の手持ち</p>";
    html += '<div class="mttt-hand-pieces">';

    [1, 2, 3].forEach(function (size) {
      const count = hand[size];
      const selected = sel && sel.type === "hand" && sel.owner === owner && sel.size === size;
      const disabled = !isTurn || count <= 0 || gs.finished;
      let cls = "mttt-hand-btn";
      if (selected) cls += " is-selected";
      if (count <= 0) cls += " is-empty";

      html += '<button type="button" class="' + cls + '" data-action="mttt-select-hand" data-size="' + size + '"';
      if (disabled) html += " disabled";
      html += ">";
      html += MatryoshkaTttGame.renderPieceDisc({ owner: owner, size: size }, "in-hand");
      html += '<span class="mttt-hand-count">×' + count + "</span>";
      html += '<span class="mttt-hand-size">' + MatryoshkaTttGame.SIZE_LABELS[size] + "</span>";
      html += "</button>";
    });

    html += "</div></div>";
    return html;
  },

  render: function (ctx) {
    const gs = ctx.room.gameState;
    const current = this.getPlayerForOwner(ctx.room, gs.turn);
    const p1 = this.getPlayerForOwner(ctx.room, this.PLAYER1);
    const p2 = this.getPlayerForOwner(ctx.room, this.PLAYER2);
    const legalTargets = gs.selected && !gs.finished ? this.getLegalTargets(gs) : [];
    let html = "";

    html += '<section class="card mttt-card">';
    html += '<p class="mttt-rule-note">小・中・大のコマを重ねて三目を狙います。上のコマより大きいサイズだけ重ねられます。</p>';

    html += '<div class="mttt-scoreboard">';
    html += '<div class="mttt-player mttt-player--p1' + (gs.turn === this.PLAYER1 && !gs.finished ? " is-active" : "") + '">';
    html += '<span class="mttt-player-dot mttt-player-dot--p1"></span>';
    html += "<span>" + escapeHtml(p1 ? p1.name : "赤") + "</span>";
    html += "<strong>先手</strong>";
    html += "</div>";
    html += '<div class="mttt-player mttt-player--p2' + (gs.turn === this.PLAYER2 && !gs.finished ? " is-active" : "") + '">';
    html += '<span class="mttt-player-dot mttt-player-dot--p2"></span>';
    html += "<span>" + escapeHtml(p2 ? p2.name : "青") + "</span>";
    html += "<strong>後攻</strong>";
    html += "</div>";
    html += "</div>";

    if (!gs.finished && current) {
      html += '<p class="mttt-turn-note"><strong>' + escapeHtml(current.name) + "（" + this.ownerLabel(gs.turn) + "）</strong> の番です。";
      if (gs.selected) {
        html += " 置き先のマスをタップしてください。";
      } else {
        html += " 手持ちか盤面の自分のコマをタップしてください。";
      }
      html += "</p>";
    }

    html += this.renderHand(ctx, this.PLAYER1, gs);
    html += this.renderHand(ctx, this.PLAYER2, gs);

    if (gs.selected && !gs.finished) {
      html += '<div class="mttt-select-bar">';
      html += "<span>選択中: ";
      if (gs.selected.type === "hand") {
        html += this.SIZE_LABELS[gs.selected.size] + "（手持ち）";
      } else {
        html += this.SIZE_LABELS[gs.selected.size] + "（盤面）";
      }
      html += '</span><button type="button" class="btn btn-secondary mttt-cancel-btn" data-action="mttt-cancel">選択解除</button>';
      html += "</div>";
    }

    html += '<div class="mttt-board-wrap">';
    html += '<div class="mttt-board" role="grid" aria-label="マトリョーシカ○×盤">';
    for (let r = 0; r < this.BOARD_SIZE; r++) {
      for (let c = 0; c < this.BOARD_SIZE; c++) {
        html += this.renderBoardCell(ctx, r, c, gs, legalTargets);
      }
    }
    html += "</div></div>";

    if (gs.finished) {
      let result = "引き分けです";
      if (gs.drawReason === "simultaneous") {
        result = "両者同時に三目が成立したため、引き分けです";
      } else if (gs.winner === this.PLAYER1) {
        result = escapeHtml(p1 ? p1.name : "赤") + "（先手）の勝ち！";
      } else if (gs.winner === this.PLAYER2) {
        result = escapeHtml(p2 ? p2.name : "青") + "（後攻）の勝ち！";
      }
      html += '<p class="mttt-result">' + result + "</p>";
      if (ctx.isHost) {
        html += '<button type="button" class="btn btn-primary" data-action="mttt-restart">もう一局</button>';
        html += '<button type="button" class="btn btn-secondary" data-action="back-lobby" style="margin-top:0.5rem">ロビーに戻る</button>';
      }
    } else if (ctx.isHost) {
      html += '<button type="button" class="btn btn-secondary mttt-reset-btn" data-action="mttt-restart">最初から</button>';
    }

    html += "</section>";
    return html;
  }
};

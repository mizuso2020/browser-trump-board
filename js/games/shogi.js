/**
 * 将棋 — 1台で2人交代プレイ
 * 座標: board[row][col], row0=9段(後手側), row8=1段(先手側), col0=9筋, col8=1筋
 */
const ShogiGame = {
  id: "shogi",
  name: "将棋",
  minPlayers: 2,
  maxPlayers: 2,
  SIZE: 9,
  SENTE: 0,
  GOTE: 1,

  PIECE_LABEL: {
    K: "玉", R: "飛", B: "角", G: "金", S: "銀", N: "桂", L: "香", P: "歩"
  },

  CAN_PROMOTE: { R: true, B: true, S: true, N: true, L: true, P: true },

  /* 駒画像（images/shogi）— opponent は先に向きが反転済み */
  PIECE_IMG_BASE: "images/shogi/",
  PIECE_IMG_VERSION: "20260715a",
  PIECE_IMG: {
    "0:K": "09_king_gyoku_smooth.png",
    "0:R": "02_rook_smooth.png",
    "0:B": "03_bishop_smooth.png",
    "0:G": "04_gold_general_smooth.png",
    "0:S": "05_silver_general_smooth.png",
    "0:N": "06_knight_smooth.png",
    "0:L": "07_lance_smooth.png",
    "0:P": "08_pawn_smooth.png",
    "0:R:p": "10_promoted_rook_ryuo_smooth.png",
    "0:B:p": "11_promoted_bishop_ryuma_smooth.png",
    "0:S:p": "12_promoted_silver_smooth.png",
    "0:N:p": "13_promoted_knight_smooth.png",
    "0:L:p": "14_promoted_lance_smooth.png",
    "0:P:p": "15_promoted_pawn_to_smooth.png",
    "1:K": "16_king_ou_opponent_smooth.png",
    "1:R": "17_rook_opponent_smooth.png",
    "1:B": "18_bishop_opponent_smooth.png",
    "1:G": "19_gold_general_opponent_smooth.png",
    "1:S": "20_silver_general_opponent_smooth.png",
    "1:N": "21_knight_opponent_smooth.png",
    "1:L": "22_lance_opponent_smooth.png",
    "1:P": "23_pawn_opponent_smooth.png",
    "1:R:p": "25_promoted_rook_ryuo_opponent_smooth.png",
    "1:B:p": "26_promoted_bishop_ryuma_opponent_smooth.png",
    "1:S:p": "27_promoted_silver_opponent_smooth.png",
    "1:N:p": "28_promoted_knight_opponent_smooth.png",
    "1:L:p": "29_promoted_lance_opponent_smooth.png",
    "1:P:p": "30_promoted_pawn_to_opponent_smooth.png"
  },

  pieceImageSrc: function (piece) {
    if (!piece) return "";
    const owner = piece.o === this.GOTE ? 1 : 0;
    const key = piece.pr ? owner + ":" + piece.t + ":p" : owner + ":" + piece.t;
    const file = this.PIECE_IMG[key];
    if (!file) return "";
    return this.PIECE_IMG_BASE + file + "?v=" + this.PIECE_IMG_VERSION;
  },

  _checkFlashSide: null,
  _mateFlashWinner: null,
  _checkFlashTimer: null,

  triggerCheckFlash: function (side) {
    this._mateFlashWinner = null;
    this._checkFlashSide = side;
  },

  triggerMateFlash: function (winner) {
    this._checkFlashSide = null;
    this._mateFlashWinner = winner;
  },

  clearCheckFlash: function () {
    this._checkFlashSide = null;
    this._mateFlashWinner = null;
    if (this._checkFlashTimer) {
      clearTimeout(this._checkFlashTimer);
      this._checkFlashTimer = null;
    }
  },

  afterRender: function (redraw) {
    const self = this;
    let duration = 0;
    if (self._mateFlashWinner != null) duration = Math.max(duration, 2200);
    if (self._checkFlashSide != null) duration = Math.max(duration, 1300);
    if (!duration) return;
    if (self._checkFlashTimer) clearTimeout(self._checkFlashTimer);
    self._checkFlashTimer = setTimeout(function () {
      self._checkFlashSide = null;
      self._mateFlashWinner = null;
      self._checkFlashTimer = null;
      if (typeof redraw === "function") redraw();
    }, duration);
  },

  init: function (room) {
    this.clearCheckFlash();
    room.gameState = {
      board: this.createInitialBoard(),
      hand: { 0: this.emptyHand(), 1: this.emptyHand() },
      turn: this.SENTE,
      selected: null,
      pendingPromotion: null,
      inCheck: { 0: false, 1: false },
      finished: false,
      winner: null,
      endReason: null,
      positionCounts: {},
      moveCount: 0,
      lastMove: null,
      lastCapture: null
    };
    this.recordPosition(room.gameState);
    room.phase = "shogi_play";
    return room;
  },

  emptyHand: function () {
    return { P: 0, L: 0, N: 0, S: 0, G: 0, B: 0, R: 0 };
  },

  normalizeHand: function (hand) {
    const out = { 0: this.emptyHand(), 1: this.emptyHand() };
    [this.SENTE, this.GOTE].forEach(function (owner) {
      const src = hand && hand[owner] ? hand[owner] : {};
      Object.keys(src).forEach(function (type) {
        const count = src[type] || 0;
        if (count > 0) out[owner][type] = count;
      });
    });
    return out;
  },

  ensureGameState: function (gs) {
    if (!gs) return;
    if (typeof gs.moveCount !== "number") gs.moveCount = 0;
    gs.hand = this.normalizeHand(gs.hand || {});
    if (!gs.inCheck) gs.inCheck = { 0: false, 1: false };
    if (!gs.positionCounts) gs.positionCounts = {};
  },

  getDisplayMoveNumber: function (gs) {
    return (gs.moveCount || 0) + 1;
  },

  finishIfNoMoves: function (gs, winner, loser) {
    const legal = this.getLegalMoves(gs.board, gs.hand, loser);
    if (legal.length) return false;
    gs.finished = true;
    gs.winner = winner;
    gs.endReason = this.isInCheck(gs.board, loser) ? "checkmate" : "no_moves";
    if (gs.endReason === "checkmate") {
      this.triggerMateFlash(winner);
    }
    return true;
  },

  createInitialBoard: function () {
    const b = [];
    const back = ["L", "N", "S", "G", "K", "G", "S", "N", "L"];
    for (let r = 0; r < this.SIZE; r++) {
      b.push(new Array(this.SIZE).fill(null));
    }
    for (let c = 0; c < this.SIZE; c++) {
      b[0][c] = { t: back[c], o: this.GOTE, pr: false };
      b[2][c] = { t: "P", o: this.GOTE, pr: false };
      b[6][c] = { t: "P", o: this.SENTE, pr: false };
      b[8][c] = { t: back[c], o: this.SENTE, pr: false };
    }
    b[1][7] = { t: "R", o: this.GOTE, pr: false };
    b[1][1] = { t: "B", o: this.GOTE, pr: false };
    b[7][7] = { t: "R", o: this.SENTE, pr: false };
    b[7][1] = { t: "B", o: this.SENTE, pr: false };
    return b;
  },

  inBounds: function (r, c) {
    return r >= 0 && r < this.SIZE && c >= 0 && c < this.SIZE;
  },

  opponent: function (owner) {
    return owner === this.SENTE ? this.GOTE : this.SENTE;
  },

  forwardDelta: function (owner) {
    return owner === this.SENTE ? -1 : 1;
  },

  isPromoZone: function (owner, row) {
    if (owner === this.SENTE) return row <= 2;
    return row >= 6;
  },

  pieceLabel: function (piece) {
    if (!piece) return "";
    if (piece.pr) {
      if (piece.t === "R") return "龍";
      if (piece.t === "B") return "馬";
      if (piece.t === "S") return "全";
      if (piece.t === "N") return "圭";
      if (piece.t === "L") return "杏";
      if (piece.t === "P") return "と";
    }
    if (piece.t === "K") return piece.o === this.SENTE ? "玉" : "王";
    return this.PIECE_LABEL[piece.t] || "?";
  },

  renderPieceHtml: function (piece, forHand) {
    const gote = piece.o === this.GOTE;
    const promoted = piece.pr;
    const src = this.pieceImageSrc(piece);
    const label = this.pieceLabel(piece);
    let cls = "shogi-piece";
    if (gote) cls += " shogi-piece--gote";
    else cls += " shogi-piece--sente";
    if (promoted) cls += " is-promoted";
    if (forHand) cls += " shogi-piece--hand";
    if (src) cls += " shogi-piece--img";
    if (src) {
      return (
        '<span class="' + cls + '">' +
          '<img class="shogi-piece-img" src="' + src + '" alt="' + escapeHtml(label) + '" draggable="false">' +
        "</span>"
      );
    }
    return '<span class="' + cls + '"><span class="shogi-piece-shape">' + escapeHtml(label) + "</span></span>";
  },

  handCount: function (hand, owner, type) {
    if (!hand[owner]) return 0;
    return hand[owner][type] || 0;
  },

  addToHand: function (hand, owner, piece) {
    if (!hand[owner]) hand[owner] = this.emptyHand();
    const type = piece.t;
    hand[owner][type] = (hand[owner][type] || 0) + 1;
  },

  cloneBoard: function (board) {
    return board.map(function (row) {
      return row.map(function (cell) {
        return cell ? { t: cell.t, o: cell.o, pr: cell.pr } : null;
      });
    });
  },

  cloneHand: function (hand) {
    const out = { 0: Object.assign(this.emptyHand(), hand[0] || {}), 1: Object.assign(this.emptyHand(), hand[1] || {}) };
    return out;
  },

  findKing: function (board, owner) {
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        const p = board[r][c];
        if (p && p.o === owner && p.t === "K") return [r, c];
      }
    }
    return null;
  },

  relMoves: function (owner, deltas) {
    const f = this.forwardDelta(owner);
    return deltas.map(function (d) {
      return d[0] === "F" ? [f, d[1]] : [d[0], d[1]];
    });
  },

  goldDeltas: function () {
    return [["F", -1], ["F", 0], ["F", 1], [0, -1], [0, 1], [-1, 0]];
  },

  silverDeltas: function () {
    return [["F", -1], ["F", 0], ["F", 1], [-1, -1], [-1, 1]];
  },

  kingDeltas: function () {
    return [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  },

  slideMoves: function (board, row, col, owner, dr, dc) {
    const moves = [];
    let r = row + dr;
    let c = col + dc;
    while (this.inBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        moves.push([r, c]);
      } else {
        if (target.o !== owner) moves.push([r, c]);
        break;
      }
      r += dr;
      c += dc;
    }
    return moves;
  },

  stepMoves: function (board, row, col, owner, deltas) {
    const moves = [];
    const self = this;
    deltas.forEach(function (d) {
      const r = row + d[0];
      const c = col + d[1];
      if (!self.inBounds(r, c)) return;
      const target = board[r][c];
      if (!target || target.o !== owner) moves.push([r, c]);
    });
    return moves;
  },

  rawMovesForPiece: function (board, row, col, piece) {
    const owner = piece.o;
    const t = piece.t;
    const pr = piece.pr;
    let moves = [];

    if (pr && (t === "P" || t === "S" || t === "N" || t === "L")) {
      return this.stepMoves(board, row, col, owner, this.relMoves(owner, this.goldDeltas()));
    }

    if (t === "K" || (pr && t !== "R" && t !== "B")) {
      return this.stepMoves(board, row, col, owner, this.kingDeltas());
    }

    if (t === "G") {
      return this.stepMoves(board, row, col, owner, this.relMoves(owner, this.goldDeltas()));
    }

    if (t === "S") {
      return this.stepMoves(board, row, col, owner, this.relMoves(owner, this.silverDeltas()));
    }

    if (t === "P") {
      const f = this.forwardDelta(owner);
      const r = row + f;
      const c = col;
      if (this.inBounds(r, c)) {
        const target = board[r][c];
        if (!target || target.o !== owner) moves.push([r, c]);
      }
      return moves;
    }

    if (t === "L") {
      const f = this.forwardDelta(owner);
      return this.slideMoves(board, row, col, owner, f, 0);
    }

    if (t === "N") {
      const f = this.forwardDelta(owner);
      return this.stepMoves(board, row, col, owner, [[f * 2, -1], [f * 2, 1]]);
    }

    if (t === "R") {
      moves = moves.concat(this.slideMoves(board, row, col, owner, -1, 0));
      moves = moves.concat(this.slideMoves(board, row, col, owner, 1, 0));
      moves = moves.concat(this.slideMoves(board, row, col, owner, 0, -1));
      moves = moves.concat(this.slideMoves(board, row, col, owner, 0, 1));
      if (pr) moves = moves.concat(this.stepMoves(board, row, col, owner, this.kingDeltas()));
      return moves;
    }

    if (t === "B") {
      moves = moves.concat(this.slideMoves(board, row, col, owner, -1, -1));
      moves = moves.concat(this.slideMoves(board, row, col, owner, -1, 1));
      moves = moves.concat(this.slideMoves(board, row, col, owner, 1, -1));
      moves = moves.concat(this.slideMoves(board, row, col, owner, 1, 1));
      if (pr) moves = moves.concat(this.stepMoves(board, row, col, owner, this.kingDeltas()));
      return moves;
    }

    return moves;
  },

  mustPromote: function (owner, row, pieceType) {
    if (pieceType === "P" || pieceType === "L") {
      return owner === this.SENTE ? row === 0 : row === 8;
    }
    if (pieceType === "N") {
      return owner === this.SENTE ? row <= 1 : row >= 7;
    }
    return false;
  },

  canChoosePromote: function (owner, fromRow, toRow, piece) {
    if (!this.CAN_PROMOTE[piece.t] || piece.pr) return false;
    return this.isPromoZone(owner, fromRow) || this.isPromoZone(owner, toRow);
  },

  isDropRankIllegal: function (owner, row, type) {
    if (type === "P" || type === "L") {
      return owner === this.SENTE ? row === 0 : row === 8;
    }
    if (type === "N") {
      return owner === this.SENTE ? row <= 1 : row >= 7;
    }
    return false;
  },

  hasUnpromotedPawnInFile: function (board, owner, col) {
    for (let r = 0; r < this.SIZE; r++) {
      const p = board[r][col];
      if (p && p.o === owner && p.t === "P" && !p.pr) return true;
    }
    return false;
  },

  applyMove: function (board, hand, move, owner) {
    board = this.cloneBoard(board);
    hand = this.cloneHand(hand);
    const toR = move.to[0];
    const toC = move.to[1];

    if (move.drop) {
      board[toR][toC] = { t: move.drop, o: owner, pr: false };
      hand[owner][move.drop] = (hand[owner][move.drop] || 0) - 1;
      if (hand[owner][move.drop] <= 0) hand[owner][move.drop] = 0;
      return { board: board, hand: hand, captured: null };
    }

    const fromR = move.from[0];
    const fromC = move.from[1];
    const piece = board[fromR][fromC];
    const captured = board[toR][toC];

    board[fromR][fromC] = null;
    if (captured) {
      this.addToHand(hand, owner, { t: captured.t, o: owner, pr: false });
    }

    const promoted = move.promote || this.mustPromote(owner, toR, piece.t);
    board[toR][toC] = { t: piece.t, o: owner, pr: promoted || piece.pr };
    return { board: board, hand: hand, captured: captured };
  },

  isSquareAttacked: function (board, row, col, byOwner) {
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        const p = board[r][c];
        if (!p || p.o !== byOwner) continue;
        const moves = this.rawMovesForPiece(board, r, c, p);
        if (moves.some(function (m) { return m[0] === row && m[1] === col; })) return true;
      }
    }
    return false;
  },

  isInCheck: function (board, owner) {
    const king = this.findKing(board, owner);
    if (!king) return true;
    return this.isSquareAttacked(board, king[0], king[1], this.opponent(owner));
  },

  isCheckmate: function (board, hand, owner) {
    if (!this.isInCheck(board, owner)) return false;
    return this.getLegalMoves(board, hand, owner).length === 0;
  },

  isUchifuzume: function (board, hand, owner, toR, toC) {
    const result = this.applyMove(board, hand, { drop: "P", to: [toR, toC] }, owner);
    const opp = this.opponent(owner);
    return this.isCheckmate(result.board, result.hand, opp);
  },

  getLegalMoves: function (board, hand, owner) {
    const moves = [];
    const self = this;

    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        const piece = board[r][c];
        if (!piece || piece.o !== owner) continue;
        const targets = this.rawMovesForPiece(board, r, c, piece);
        targets.forEach(function (to) {
          const toR = to[0];
          const toC = to[1];
          const forced = self.mustPromote(owner, toR, piece.t);
          const canPromo = self.canChoosePromote(owner, r, toR, piece);
          const promoOptions = [];
          if (forced) promoOptions.push(true);
          else if (canPromo) {
            promoOptions.push(false);
            promoOptions.push(true);
          } else promoOptions.push(false);

          promoOptions.forEach(function (promote) {
            const mv = { from: [r, c], to: [toR, toC], promote: promote };
            const applied = self.applyMove(board, hand, mv, owner);
            if (!self.isInCheck(applied.board, owner)) moves.push(mv);
          });
        });
      }
    }

    const handPieces = hand[owner] || {};
    Object.keys(handPieces).forEach(function (type) {
      const count = handPieces[type];
      if (!count) return;
      for (let r = 0; r < self.SIZE; r++) {
        for (let c = 0; c < self.SIZE; c++) {
          if (board[r][c]) continue;
          if (self.isDropRankIllegal(owner, r, type)) continue;
          if (type === "P" && self.hasUnpromotedPawnInFile(board, owner, c)) continue;
          const mv = { drop: type, to: [r, c] };
          if (type === "P" && self.isUchifuzume(board, hand, owner, r, c)) continue;
          const applied = self.applyMove(board, hand, mv, owner);
          if (!self.isInCheck(applied.board, owner)) moves.push(mv);
        }
      }
    });

    return moves;
  },

  positionKey: function (gs) {
    const rows = gs.board.map(function (row) {
      return row.map(function (cell) {
        if (!cell) return ".";
        return cell.t + (cell.pr ? "+" : "") + cell.o;
      }).join("");
    }).join("/");
    const h0 = Object.keys(gs.hand[0] || {}).sort().map(function (k) {
      return k + (gs.hand[0][k] || 0);
    }).join("");
    const h1 = Object.keys(gs.hand[1] || {}).sort().map(function (k) {
      return k + (gs.hand[1][k] || 0);
    }).join("");
    return rows + "|" + h0 + "|" + h1 + "|" + gs.turn;
  },

  recordPosition: function (gs) {
    const key = this.positionKey(gs);
    gs.positionCounts[key] = (gs.positionCounts[key] || 0) + 1;
    return gs.positionCounts[key];
  },

  moveEquals: function (a, b) {
    if (!a || !b) return false;
    if (a.drop || b.drop) return a.drop === b.drop && a.to[0] === b.to[0] && a.to[1] === b.to[1];
    return a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1] && !!a.promote === !!b.promote;
  },

  selectSquare: function (room, row, col) {
    const gs = room.gameState;
    this.ensureGameState(gs);
    if (gs.finished) return { ok: false, error: "対局は終了しています" };

    const owner = gs.turn;
    const piece = gs.board[row][col];
    const selected = gs.selected;

    if (selected && selected.drop) {
      const mv = { drop: selected.drop, to: [row, col] };
      return this.tryExecuteMove(room, mv);
    }

    if (selected && selected.from) {
      const fromR = selected.from[0];
      const fromC = selected.from[1];
      if (fromR === row && fromC === col) {
        gs.selected = null;
        return { ok: true, room: room };
      }
      const mv = { from: [fromR, fromC], to: [row, col], promote: false };
      const legal = this.getLegalMoves(gs.board, gs.hand, owner);
      const match = legal.filter(function (m) {
        return m.from && m.from[0] === fromR && m.from[1] === fromC && m.to[0] === row && m.to[1] === col;
      });
      if (!match.length) {
        if (piece && piece.o === owner) {
          gs.selected = { from: [row, col] };
          return { ok: true, room: room };
        }
        return { ok: false, error: "そこには指せません" };
      }
      const needPromoChoice = match.some(function (m) { return m.promote; }) && match.some(function (m) { return !m.promote; });
      const forced = match.length === 1 && match[0].promote;
      if (needPromoChoice && !forced) {
        gs.pendingPromotion = { from: [fromR, fromC], to: [row, col] };
        gs.selected = null;
        return { ok: true, room: room };
      }
      mv.promote = match[0].promote;
      return this.tryExecuteMove(room, mv);
    }

    if (piece && piece.o === owner) {
      gs.selected = { from: [row, col] };
      return { ok: true, room: room };
    }

    return { ok: false, error: "自分の駒を選んでください" };
  },

  selectDrop: function (room, type) {
    const gs = room.gameState;
    this.ensureGameState(gs);
    if (gs.finished || gs.pendingPromotion) return { ok: false, error: gs.pendingPromotion ? "成るか成らないかを選んでください" : "対局は終了しています" };
    const owner = gs.turn;
    if (!this.handCount(gs.hand, owner, type)) return { ok: false, error: "その駒は持ち駒にありません" };
    if (gs.selected && gs.selected.drop === type) {
      gs.selected = null;
      return { ok: true, room: room };
    }
    const canDrop = this.getLegalMoves(gs.board, gs.hand, owner).some(function (m) {
      return m.drop === type;
    });
    if (!canDrop) return { ok: false, error: "今はその駒を打てません" };
    gs.selected = { drop: type };
    return { ok: true, room: room };
  },

  cancelPromotion: function (room) {
    const gs = room.gameState;
    if (!gs.pendingPromotion) return { ok: false };
    gs.pendingPromotion = null;
    return { ok: true, room: room };
  },

  confirmPromotion: function (room, promote) {
    const gs = room.gameState;
    const pending = gs.pendingPromotion;
    if (!pending) return { ok: false };
    const mv = { from: pending.from, to: pending.to, promote: !!promote };
    gs.pendingPromotion = null;
    return this.tryExecuteMove(room, mv);
  },

  tryExecuteMove: function (room, move) {
    const gs = room.gameState;
    this.ensureGameState(gs);
    const owner = gs.turn;
    const legal = this.getLegalMoves(gs.board, gs.hand, owner);
    const ok = legal.some(function (m) { return ShogiGame.moveEquals(m, move); });
    if (!ok) return { ok: false, error: "反則手です" };

    const opp = this.opponent(owner);
    const wasOppInCheck = this.isInCheck(gs.board, opp);
    const applied = this.applyMove(gs.board, gs.hand, move, owner);
    gs.board = applied.board;
    gs.hand = this.normalizeHand(applied.hand);
    gs.selected = null;
    gs.pendingPromotion = null;
    gs.lastMove = move;
    gs.lastCapture = applied.captured ? { t: applied.captured.t, o: applied.captured.o, pr: applied.captured.pr } : null;
    gs.moveCount = (gs.moveCount || 0) + 1;

    if (applied.captured && applied.captured.t === "K") {
      gs.finished = true;
      gs.winner = owner;
      gs.endReason = "checkmate";
      this.triggerMateFlash(owner);
      return { ok: true, room: room, captured: applied.captured };
    }

    gs.inCheck[this.SENTE] = this.isInCheck(gs.board, this.SENTE);
    gs.inCheck[this.GOTE] = this.isInCheck(gs.board, this.GOTE);

    if (!wasOppInCheck && gs.inCheck[opp]) {
      this.triggerCheckFlash(opp);
    }

    if (this.isCheckmate(gs.board, gs.hand, opp)) {
      gs.finished = true;
      gs.winner = owner;
      gs.endReason = "checkmate";
      this.triggerMateFlash(owner);
      return { ok: true, room: room, captured: applied.captured };
    }

    gs.turn = opp;

    if (this.finishIfNoMoves(gs, owner, opp)) {
      return { ok: true, room: room, captured: applied.captured };
    }

    const rep = this.recordPosition(gs);
    if (rep >= 4) {
      gs.finished = true;
      gs.winner = null;
      gs.endReason = "repetition";
      return { ok: true, room: room, captured: applied.captured };
    }

    return { ok: true, room: room, captured: applied.captured };
  },

  resign: function (room, owner) {
    const gs = room.gameState;
    if (gs.finished) return room;
    gs.finished = true;
    gs.winner = this.opponent(owner);
    gs.endReason = "resign";
    return room;
  },

  restart: function (room) {
    return this.init(room);
  },

  getPlayerForSide: function (room, side) {
    if (!room.players || room.players.length < 2) return null;
    return side === this.SENTE ? room.players[0] : room.players[1];
  },

  isRemoteRoom: function (room) {
    return room.mode === "room" || room.mode === "online";
  },

  getSideForPlayer: function (room, playerId) {
    if (!room.players || room.players.length < 2 || !playerId) return null;
    if (room.players[0].id === playerId) return this.SENTE;
    if (room.players[1].id === playerId) return this.GOTE;
    return null;
  },

  isMyTurn: function (ctx) {
    const gs = ctx.room.gameState;
    if (!gs || gs.finished || gs.pendingPromotion) return false;
    if (!this.isRemoteRoom(ctx.room)) return true;
    const side = this.getSideForPlayer(ctx.room, ctx.me && ctx.me.id);
    return side !== null && gs.turn === side;
  },

  renderTurnNote: function (ctx, current, side) {
    if (!current) return "";
    const sideLabel = this.sideLabel(side);
    if (!this.isRemoteRoom(ctx.room)) {
      return '<p class="shogi-turn-note"><strong>' + escapeHtml(current.name) + "（" + sideLabel + "）</strong> の番です。スマホを渡して指してください。</p>";
    }
    if (this.isMyTurn(ctx)) {
      return '<p class="shogi-turn-note"><strong>あなたの番</strong>（' + sideLabel + "）です。駒をタップして指してください。</p>";
    }
    return '<p class="shogi-turn-note"><strong>' + escapeHtml(current.name) + "（" + sideLabel + "）</strong> の番です。相手の手を待っています…</p>";
  },

  sideLabel: function (side) {
    return side === this.SENTE ? "先手" : "後手";
  },

  isLastMoveSquare: function (lastMove, row, col) {
    if (!lastMove) return false;
    if (lastMove.to[0] === row && lastMove.to[1] === col) return true;
    if (lastMove.from && lastMove.from[0] === row && lastMove.from[1] === col) return true;
    return false;
  },

  isLegalTarget: function (gs, row, col, legalMoves) {
    if (!gs.selected) return false;
    const moves = legalMoves || this.getLegalMoves(gs.board, gs.hand, gs.turn);
    if (gs.selected.drop) {
      return moves.some(function (m) {
        return m.drop === gs.selected.drop && m.to[0] === row && m.to[1] === col;
      });
    }
    if (!gs.selected.from) return false;
    return moves.some(function (m) {
      return m.from && m.from[0] === gs.selected.from[0] && m.from[1] === gs.selected.from[1] && m.to[0] === row && m.to[1] === col;
    });
  },

  getDroppableTypes: function (legalMoves) {
    const types = {};
    legalMoves.forEach(function (m) {
      if (m.drop) types[m.drop] = true;
    });
    return types;
  },

  renderPlayerBar: function (gs, owner, player, turn, legalMoves, canInteract) {
    const selectedDrop = canInteract && gs.selected && gs.selected.drop ? gs.selected.drop : null;
    const droppable = canInteract ? this.getDroppableTypes(legalMoves) : {};
    const active = turn === owner && !gs.finished;
    let html = '<div class="shogi-player shogi-player--' + (owner === this.GOTE ? "gote" : "sente") + (active ? " is-active" : "") + '">';
    html += '<strong>' + (owner === this.GOTE ? "△ " : "▲ ") + escapeHtml(player ? player.name : this.sideLabel(owner)) + '</strong>';
    if (gs.inCheck[owner]) html += '<span class="shogi-check">王手</span>';
    html += this.renderHand(gs, owner, selectedDrop, canInteract, droppable, gs.pendingPromotion);
    html += '</div>';
    return html;
  },

  renderHand: function (gs, owner, selectedDrop, canInteract, droppableTypes, pendingPromotion) {
    const hand = gs.hand[owner] || {};
    const order = ["R", "B", "G", "S", "N", "L", "P"];
    const self = this;
    const drops = droppableTypes || {};
    const handLocked = !canInteract || pendingPromotion;
    let html = '<div class="shogi-komadai">';
    html += '<p class="shogi-komadai-label">持ち駒</p>';
    html += '<div class="shogi-hand' + (handLocked ? " is-locked" : "") + '">';
    let hasAny = false;
    order.forEach(function (type) {
      const n = hand[type] || 0;
      if (!n) return;
      hasAny = true;
      const sel = selectedDrop === type ? " is-selected" : "";
      const canDrop = !!drops[type];
      const dim = canInteract && !canDrop && !sel ? " is-unavailable" : "";
      html += '<button type="button" class="shogi-hand-piece' + sel + dim + '" data-action="shogi-drop" data-piece="' + type + '">';
      html += self.renderPieceHtml({ t: type, o: owner, pr: false }, true);
      if (n > 1) html += '<span class="shogi-hand-count">' + n + '</span>';
      html += '</button>';
    });
    if (!hasAny) html += '<span class="shogi-hand-empty">なし</span>';
    html += '</div></div>';
    return html;
  },

  isCaptureTarget: function (gs, row, col) {
    if (!gs.selected || gs.selected.drop) return false;
    const cell = gs.board[row][col];
    return !!(cell && cell.o !== gs.turn);
  },

  render: function (ctx) {
    const gs = ctx.room.gameState;
    this.ensureGameState(gs);
    const board = gs.board;
    const turn = gs.turn;
    const current = this.getPlayerForSide(ctx.room, turn);
    const sentePlayer = this.getPlayerForSide(ctx.room, this.SENTE);
    const gotePlayer = this.getPlayerForSide(ctx.room, this.GOTE);
    const myTurn = this.isMyTurn(ctx);
    const canPlay = !gs.finished && !gs.pendingPromotion;
    const legalMoves = canPlay ? this.getLegalMoves(gs.board, gs.hand, turn) : [];
    let html = "";

    html += '<section class="card shogi-card">';
    html += '<div class="shogi-status-bar">';
    if (gs.finished) {
      html += '<span class="shogi-move-count">全 ' + gs.moveCount + ' 手</span>';
    } else {
      html += '<span class="shogi-move-count">第 ' + this.getDisplayMoveNumber(gs) + ' 手</span>';
      html += '<span class="shogi-status-turn">' + this.sideLabel(turn) + 'の番</span>';
    }
    html += '</div>';

    html += this.renderPlayerBar(gs, this.GOTE, gotePlayer, turn, legalMoves, turn === this.GOTE && canPlay && myTurn);

    if (!gs.finished && current) {
      html += this.renderTurnNote(ctx, current, turn);
      if (sentePlayer && gotePlayer) {
        html += TrumpUi.renderTurnOrderBlock(ctx.room, {}, {
          turnPlayerId: current.id,
          orderIds: [sentePlayer.id, gotePlayer.id]
        });
      }
    }

    if (gs.pendingPromotion) {
      html += '<section class="card shogi-promo-panel">';
      html += '<p>第 ' + this.getDisplayMoveNumber(gs) + ' 手 — 成りますか？</p>';
      html += '<button type="button" class="btn btn-primary" data-action="shogi-promote" data-promote="1">成る</button>';
      html += '<button type="button" class="btn btn-secondary" data-action="shogi-promote" data-promote="0" style="margin-left:0.5rem">成らない</button>';
      html += '<button type="button" class="btn btn-ghost" data-action="shogi-cancel-promo" style="margin-left:0.5rem">やり直す</button>';
      html += '</section>';
    } else if (gs.selected && gs.selected.drop && turn === gs.turn && !gs.finished) {
      html += '<p class="shogi-drop-hint">持ち駒「' + escapeHtml(this.pieceLabel({ t: gs.selected.drop, o: turn, pr: false })) + '」を打つマスを選んでください（もう一度タップで取消）</p>';
    }

    if (!gs.finished && gs.inCheck[turn]) {
      html += '<p class="shogi-check-note">王手がかかっています</p>';
    }

    html += '<div class="shogi-board-wrap">';
    html += '<div class="shogi-board" role="grid" aria-label="将棋盤">';
    for (let r = 0; r < this.SIZE; r++) {
      html += '<div class="shogi-board-row">';
      for (let c = 0; c < this.SIZE; c++) {
        const cell = board[r][c];
        const isSelected = gs.selected && gs.selected.from && gs.selected.from[0] === r && gs.selected.from[1] === c;
        const isTarget = this.isLegalTarget(gs, r, c, legalMoves);
        const isLast = this.isLastMoveSquare(gs.lastMove, r, c);
        const isCapture = this.isCaptureTarget(gs, r, c);
        let cls = "shogi-cell";
        if (isSelected) cls += " is-selected";
        if (isTarget) cls += " is-target";
        if (isCapture && isTarget) cls += " is-capture";
        if (isLast) cls += " is-last";
        html += '<button type="button" class="' + cls + '" data-action="shogi-cell" data-row="' + r + '" data-col="' + c + '"';
        if (gs.finished || gs.pendingPromotion || !myTurn) html += ' disabled';
        html += '>';
        if (cell) {
          html += this.renderPieceHtml(cell, false);
        }
        html += '</button>';
      }
      html += '</div>';
    }
    html += '</div></div>';

    html += this.renderPlayerBar(gs, this.SENTE, sentePlayer, turn, legalMoves, turn === this.SENTE && canPlay && myTurn);

    if (gs.finished) {
      let result = "千日手で引き分け";
      if (gs.winner === this.SENTE) {
        result = escapeHtml(sentePlayer ? sentePlayer.name : "先手") + "（先手）の勝ち！";
        if (gs.endReason === "checkmate") result += " — 詰み";
        if (gs.endReason === "resign") result += " — 投了";
        if (gs.endReason === "no_moves") result += " — 指せる手がなくなった";
      } else if (gs.winner === this.GOTE) {
        result = escapeHtml(gotePlayer ? gotePlayer.name : "後手") + "（後手）の勝ち！";
        if (gs.endReason === "checkmate") result += " — 詰み";
        if (gs.endReason === "resign") result += " — 投了";
        if (gs.endReason === "no_moves") result += " — 指せる手がなくなった";
      }
      if (gs.endReason === "repetition") result = "全 " + gs.moveCount + " 手で千日手の引き分け";
      html += '<p class="shogi-result">' + result + '</p>';
      if (ctx.isHost) {
        html += '<button type="button" class="btn btn-primary" data-action="shogi-restart">もう一局</button>';
      }
    } else if (myTurn) {
      html += '<button type="button" class="btn btn-secondary shogi-resign-btn" data-action="shogi-resign">投了</button>';
    }

    html += '</section>';

    if (this._mateFlashWinner != null) {
      const winner = this._mateFlashWinner;
      const winnerPlayer = winner === this.SENTE ? sentePlayer : gotePlayer;
      const winnerMark = winner === this.SENTE ? "▲" : "△";
      html += '<div class="shogi-mate-flash" aria-live="assertive">';
      html += '<div class="shogi-mate-flash-inner">';
      html += '<span class="shogi-mate-flash-text">詰み！</span>';
      html += '<span class="shogi-mate-flash-sub">' + winnerMark + " " + escapeHtml(winnerPlayer ? winnerPlayer.name : this.sideLabel(winner)) + " の勝ち</span>";
      html += "</div></div>";
    } else if (this._checkFlashSide != null) {
      const flashSide = this._checkFlashSide;
      const flashPlayer = flashSide === this.SENTE ? sentePlayer : gotePlayer;
      const flashMark = flashSide === this.SENTE ? "▲" : "△";
      html += '<div class="shogi-check-flash" aria-live="assertive">';
      html += '<div class="shogi-check-flash-inner">';
      html += '<span class="shogi-check-flash-text">王手！</span>';
      html += '<span class="shogi-check-flash-sub">' + flashMark + ' ' + escapeHtml(flashPlayer ? flashPlayer.name : this.sideLabel(flashSide)) + '</span>';
      html += '</div></div>';
    }

    return html;
  }
};

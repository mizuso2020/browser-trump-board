/**
 * コードネーム（Codenames）
 * スパイマスターの1語ヒントで、自チームのワードを当てる
 */

const CodenamesGame = {
  id: "codenames",
  name: "コードネーム",
  minPlayers: 4,
  maxPlayers: 8,

  TEAM_LABEL: { red: "赤", blue: "青" },
  TYPE_LABEL: { red: "赤", blue: "青", neutral: "ベージュ", assassin: "黒（暗殺者）" },

  WORD_POOL: [
    "東京", "大阪", "富士山", "桜", "海", "川", "山", "森", "砂漠", "島",
    "犬", "猫", "ライオン", "象", "馬", "鳥", "魚", "虫", "熊", "兎",
    "りんご", "バナナ", "パン", "寿司", "ラーメン", "コーヒー", "紅茶", "チーズ", "卵", "米",
    "学校", "病院", "駅", "空港", "図書館", "美術館", "公園", "城", "橋", "塔",
    "車", "電車", "飛行機", "船", "自転車", "バス", "ロケット", "ヘリ", "タクシー", "地下鉄",
    "太陽", "月", "星", "雨", "雪", "風", "雷", "雲", "虹", "台風",
    "王様", "女王", "騎士", "海賊", "忍者", "侍", "医者", "先生", "警察", "科学者",
    "剣", "盾", "鍵", "地図", "望遠鏡", "時計", "本", "手紙", "電話", "カメラ",
    "音楽", "映画", "絵画", "ダンス", "歌", "劇場", "ゲーム", "スポーツ", "野球", "サッカー",
    "火", "水", "土", "金", "木", "氷", "岩", "花", "葉", "種",
    "春", "夏", "秋", "冬", "朝", "夜", "夢", "愛", "心", "力"
  ],

  init: function (room) {
    const assignment = this._assignTeams(room.players);
    const cells = this._buildBoard();

    room.gameState = {
      cells: cells,
      teams: assignment.teams,
      spymasters: assignment.spymasters,
      turn: "red",
      currentClue: null,
      guessesLeft: 0,
      guessesThisTurn: [],
      redRemaining: 9,
      blueRemaining: 8,
      winner: null,
      winReason: null,
      keyRevealIndex: 0,
      keyConfirmed: {}
    };

    if (room.mode === "online") {
      room.phase = "codenames_play";
    } else {
      room.phase = "codenames_key";
    }
    return room;
  },

  _assignTeams: function (players) {
    const shuffled = shuffle(players);
    const mid = Math.ceil(shuffled.length / 2);
    const redPlayers = shuffled.slice(0, mid);
    const bluePlayers = shuffled.slice(mid);

    return {
      teams: {
        red: redPlayers.map(function (p) { return p.id; }),
        blue: bluePlayers.map(function (p) { return p.id; })
      },
      spymasters: {
        red: redPlayers[0].id,
        blue: bluePlayers[0].id
      }
    };
  },

  _buildBoard: function () {
    const words = shuffle(this.WORD_POOL).slice(0, 25);
    const types = []
      .concat(Array(9).fill("red"))
      .concat(Array(8).fill("blue"))
      .concat(Array(7).fill("neutral"))
      .concat(["assassin"]);
    const shuffledTypes = shuffle(types);

    return words.map(function (word, i) {
      return { id: i, word: word, type: shuffledTypes[i], revealed: false };
    });
  },

  getKey: function (ctx) {
    return ctx.room.gameState.cells || [];
  },

  isSpymaster: function (ctx) {
    const gs = ctx.room.gameState;
    return gs.spymasters.red === ctx.me.id || gs.spymasters.blue === ctx.me.id;
  },

  myTeam: function (ctx) {
    const gs = ctx.room.gameState;
    if (gs.teams.red.includes(ctx.me.id)) return "red";
    if (gs.teams.blue.includes(ctx.me.id)) return "blue";
    return null;
  },

  getCellType: function (ctx, cell) {
    if (cell.revealed) return cell.type;
    if (this.isSpymaster(ctx)) return cell.type;
    if (!ctx.isOnline && ctx.room.phase === "codenames_key") return cell.type;
    return null;
  },

  canSeeKey: function (ctx) {
    if (!ctx.isOnline && ctx.room.phase === "codenames_key") return true;
    return this.isSpymaster(ctx);
  },

  _playerName: function (room, id) {
    const p = room.players.find(function (x) { return x.id === id; });
    return p ? p.name : "—";
  },

  _teamOf: function (gs, playerId) {
    if (gs.teams.red.includes(playerId)) return "red";
    if (gs.teams.blue.includes(playerId)) return "blue";
    return null;
  },

  confirmKey: function (room, playerId) {
    const gs = room.gameState;
    if (room.phase !== "codenames_key") return { room: room, ok: false };

    const team = this._teamOf(gs, playerId);
    if (!team || gs.spymasters[team] !== playerId) {
      return { room: room, ok: false, error: "スパイマスターだけが確認できます" };
    }

    gs.keyConfirmed[team] = true;
    if (gs.keyConfirmed.red && gs.keyConfirmed.blue) {
      room.phase = "codenames_play";
    } else {
      gs.keyRevealIndex += 1;
    }
    return { room: room, ok: true };
  },

  submitClue: function (room, playerId, word, count) {
    const gs = room.gameState;
    if (room.phase !== "codenames_play") {
      return { room: room, ok: false, error: "ゲーム中ではありません" };
    }
    if (gs.currentClue) {
      return { room: room, ok: false, error: "すでにヒントが出ています" };
    }
    if (gs.spymasters[gs.turn] !== playerId) {
      return { room: room, ok: false, error: "スパイマスターだけがヒントを出せます" };
    }

    const clueWord = (word || "").trim();
    const num = parseInt(count, 10);
    if (!clueWord) return { room: room, ok: false, error: "ヒントを入力してください" };
    if (isNaN(num) || num < 0 || num > 9) {
      return { room: room, ok: false, error: "数字は0〜9で入力してください" };
    }

    const lower = clueWord.toLowerCase();
    const onBoard = gs.cells.some(function (c) {
      return c.word.toLowerCase() === lower || c.word === clueWord;
    });
    if (onBoard) {
      return { room: room, ok: false, error: "場のワードと同じヒントは出せません" };
    }

    gs.currentClue = { word: clueWord, count: num, team: gs.turn };
    gs.guessesLeft = num + 1;
    gs.guessesThisTurn = [];
    return { room: room, ok: true };
  },

  guess: function (room, playerId, cellId, keyOverride) {
    const gs = room.gameState;
    if (room.phase !== "codenames_play" || !gs.currentClue) {
      return { room: room, ok: false, error: "ヒントが出された後に選べます" };
    }

    const team = this._teamOf(gs, playerId);
    if (!team || team !== gs.turn) {
      return { room: room, ok: false, error: "自分のチームの番です" };
    }
    if (gs.spymasters[team] === playerId) {
      return { room: room, ok: false, error: "スパイマスターはワードを選べません" };
    }

    const idx = parseInt(cellId, 10);
    const cell = gs.cells.find(function (c) { return c.id === idx; });
    if (!cell || cell.revealed) {
      return { room: room, ok: false, error: "選べないワードです" };
    }

    const key = keyOverride || gs.cells;
    const keyEntry = key.find(function (k) { return k.id === idx; });
    const type = keyEntry ? keyEntry.type : cell.type;

    cell.revealed = true;
    cell.type = type;
    gs.guessesThisTurn.push(idx);
    gs.guessesLeft -= 1;

    let turnEnded = false;
    let message = "";

    if (type === "assassin") {
      gs.winner = gs.turn === "red" ? "blue" : "red";
      gs.winReason = "assassin";
      room.phase = "codenames_result";
      message = "暗殺者！ " + this.TEAM_LABEL[gs.winner] + "チームの勝ち";
      return { room: room, ok: true, type: type, turnEnded: true, message: message };
    }

    if (type === gs.turn) {
      if (gs.turn === "red") gs.redRemaining -= 1;
      else gs.blueRemaining -= 1;

      if ((gs.turn === "red" && gs.redRemaining <= 0) || (gs.turn === "blue" && gs.blueRemaining <= 0)) {
        gs.winner = gs.turn;
        gs.winReason = "all_found";
        room.phase = "codenames_result";
        message = this.TEAM_LABEL[gs.turn] + "チーム全ワード達成！";
        return { room: room, ok: true, type: type, turnEnded: true, message: message };
      }

      if (gs.guessesLeft <= 0) turnEnded = true;
      else message = "正解！ まだ選べます";
    } else {
      turnEnded = true;
      message = type === "neutral" ? "ベージュ（中立）でターン終了" : "相手チームのワードでターン終了";
    }

    if (turnEnded) {
      this._endTurn(gs);
    }

    return { room: room, ok: true, type: type, turnEnded: turnEnded, message: message };
  },

  endTurn: function (room, playerId) {
    const gs = room.gameState;
    if (room.phase !== "codenames_play" || !gs.currentClue) {
      return { room: room, ok: false, error: "ターンを終了できません" };
    }

    const team = this._teamOf(gs, playerId);
    if (!team || team !== gs.turn) {
      return { room: room, ok: false, error: "自分のチームの番です" };
    }
    if (gs.spymasters[team] === playerId) {
      return { room: room, ok: false, error: "スパイマスターは操作できません" };
    }

    this._endTurn(gs);
    return { room: room, ok: true };
  },

  _endTurn: function (gs) {
    gs.turn = gs.turn === "red" ? "blue" : "red";
    gs.currentClue = null;
    gs.guessesLeft = 0;
    gs.guessesThisTurn = [];
  },

  _keyRevealTeam: function (room) {
    const gs = room.gameState;
    return gs.keyRevealIndex === 0 ? "red" : "blue";
  },

  _cellClass: function (type, revealed, forSpymaster) {
    let cls = "cn-cell";
    if (forSpymaster && !revealed) cls += " cn-key-" + type;
    else if (revealed && type) cls += " cn-revealed-" + type;
    else cls += " cn-unrevealed";
    return cls;
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    const html = [];
    const seeKey = this.canSeeKey(ctx);
    const myTeam = this.myTeam(ctx);
    const amSpymaster = this.isSpymaster(ctx);

    if (room.phase === "codenames_result") {
      html.push('<div class="phase-banner"><h2>ゲーム終了 🎉</h2>');
      html.push('<p><strong>' + this.TEAM_LABEL[gs.winner] + 'チーム</strong> の勝ち！');
      if (gs.winReason === "assassin") html.push('（暗殺者を踏んだ）');
      html.push('</p></div>');
      html.push(this._renderBoard(ctx, true));
      if (ctx.isHost) {
        html.push('<button class="btn btn-primary" data-action="back-lobby">ロビーに戻る</button>');
      }
      return html.join("");
    }

    if (room.phase === "codenames_key") {
      const team = this._keyRevealTeam(room);
      const sm = gs.spymasters[team];
      const smName = this._playerName(room, sm);
      html.push('<div class="phase-banner"><h2>キーカード確認</h2>');
      html.push('<p><strong>' + this.TEAM_LABEL[team] + 'チーム</strong> スパイマスター：<strong>' + escapeHtml(smName) + '</strong></p>');
      html.push('<p class="note">📱 端末を渡して、色の配置を確認してください（オペレーティブには見せない）</p></div>');
      html.push(this._renderBoard(ctx, true));
      html.push('<section class="card">');
      html.push('<button class="btn btn-primary" data-action="cn-confirm-key" data-team="' + team + '">確認した（次へ）</button>');
      html.push('</section>');
      return html.join("");
    }

    html.push('<div class="phase-banner"><h2>コードネーム</h2>');
    html.push('<p>ターン：<strong class="cn-turn-' + gs.turn + '">' + this.TEAM_LABEL[gs.turn] + 'チーム</strong>');
    html.push('　残り：赤 ' + gs.redRemaining + ' / 青 ' + gs.blueRemaining + '</p>');
    if (gs.currentClue) {
      html.push('<p>ヒント：<strong class="rank-big">' + escapeHtml(gs.currentClue.word) + ' ' + gs.currentClue.count + '</strong>');
      html.push('　残り選択：' + gs.guessesLeft + ' 回</p>');
    }
    html.push('</div>');

    html.push('<section class="card cn-teams"><h2>チーム</h2><div class="cn-team-cols">');
    ["red", "blue"].forEach(function (team) {
      html.push('<div class="cn-team-block cn-team-' + team + '">');
      html.push('<h3>' + CodenamesGame.TEAM_LABEL[team] + (gs.turn === team ? ' ◀ 番' : '') + '</h3><ul class="player-list">');
      gs.teams[team].forEach(function (pid) {
        const p = room.players.find(function (x) { return x.id === pid; });
        const role = gs.spymasters[team] === pid ? "スパイマスター" : "オペレーティブ";
        html.push('<li><span>' + escapeHtml(p.name));
        if (pid === ctx.me.id) html.push('（あなた）');
        html.push(' <small>' + role + '</small></span></li>');
      });
      html.push('</ul></div>');
    });
    html.push('</div></section>');

    if (seeKey && amSpymaster) {
      html.push('<section class="card"><p class="note">👁 スパイマスター用：色付きキーカード</p></section>');
    }

    html.push(this._renderBoard(ctx, seeKey && (amSpymaster || !ctx.isOnline)));

    if (room.phase === "codenames_play") {
      const isMyTeamTurn = myTeam === gs.turn;
      const iAmSpymaster = gs.spymasters[gs.turn] === ctx.me.id;

      if (!gs.currentClue && isMyTeamTurn && (iAmSpymaster || !ctx.isOnline)) {
        html.push('<section class="card"><h2>ヒントを出す（スパイマスター）</h2>');
        if (!ctx.isOnline) {
          html.push('<p class="note">📱 ' + escapeHtml(this._playerName(room, gs.spymasters[gs.turn])) + ' さん（スパイマスター）に端末を渡してください</p>');
        }
        html.push('<p class="note">1語のヒントと、関連ワードの数（0〜9）を入力</p>');
        html.push('<div class="btn-row"><input type="text" id="cnClueWord" class="coyote-input" placeholder="ヒント（1語）" maxlength="20">');
        html.push('<input type="number" id="cnClueCount" class="cn-count-input" placeholder="数" min="0" max="9" value="1">');
        html.push('<button class="btn btn-primary" data-action="cn-submit-clue">ヒントを出す</button></div></section>');
      } else if (gs.currentClue && (ctx.isOnline ? (isMyTeamTurn && !iAmSpymaster) : true)) {
        html.push('<section class="card"><h2>ワードを選ぶ（オペレーティブ）</h2>');
        if (!ctx.isOnline) {
          html.push('<p class="note">📱 ' + this.TEAM_LABEL[gs.turn] + 'チームのオペレーティブがワードを選んでください</p>');
        } else {
          html.push('<p class="note">グリッドのワードをタップして当ててください</p>');
        }
        html.push('<button class="btn btn-secondary" data-action="cn-end-turn">ターン終了（パス）</button></section>');
      } else if (ctx.isOnline && isMyTeamTurn && !iAmSpymaster && !gs.currentClue) {
        html.push('<section class="card"><p class="note">スパイマスターがヒントを出すのを待っています…</p></section>');
      } else if (ctx.isOnline && isMyTeamTurn && iAmSpymaster && !gs.currentClue) {
        /* フォームは上で表示 */
      } else {
        html.push('<section class="card"><p class="note">' + this.TEAM_LABEL[gs.turn] + 'チームの番です…</p></section>');
      }
    }

    html.push('<section class="card"><h2>ルール（簡易）</h2><ul class="clue-list" style="font-size:0.85rem;color:var(--text-dim)">');
    html.push('<li>赤9・青8・ベージュ7・黒1（暗殺者）の25ワード</li>');
    html.push('<li>スパイマスターは色が見える。1語＋数字のヒントだけ出せる</li>');
    html.push('<li>オペレーティブがワードを選ぶ。自チーム色なら続行（回数まで＋1回ボーナス）</li>');
    html.push('<li>ベージュ・相手色でターン終了。黒を選ぶと即負け</li>');
    html.push('<li>先に自チームのワードを全て当てた方が勝ち（赤が先手）</li>');
    html.push('</ul></section>');

    return html.join("");
  },

  _renderBoard: function (ctx, showKey) {
    const gs = ctx.room.gameState;
    const html = [];
    html.push('<section class="card"><h2>ワードボード</h2><div class="cn-grid">');

    gs.cells.forEach(function (cell) {
      const type = CodenamesGame.getCellType(ctx, cell);
      const forKey = showKey && !cell.revealed;
      const cls = CodenamesGame._cellClass(type, cell.revealed, forKey);
      const canGuess = ctx.room.phase === "codenames_play" &&
        gs.currentClue &&
        !cell.revealed &&
        (ctx.isOnline
          ? (CodenamesGame.myTeam(ctx) === gs.turn && gs.spymasters[gs.turn] !== ctx.me.id)
          : true);

      if (canGuess) {
        html.push('<button type="button" class="' + cls + '" data-action="cn-guess" data-cell="' + cell.id + '">');
      } else {
        html.push('<div class="' + cls + '">');
      }
      html.push('<span class="cn-word">' + escapeHtml(cell.word) + '</span>');
      if (cell.revealed && type) {
        html.push('<span class="cn-type-tag">' + CodenamesGame.TYPE_LABEL[type] + '</span>');
      }
      html.push(canGuess ? '</button>' : '</div>');
    });

    html.push('</div></section>');
    return html.join("");
  }
};

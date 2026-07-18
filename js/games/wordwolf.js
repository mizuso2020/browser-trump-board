/**
 * ワードウルフ（Word Wolf）
 * 市民は同じお題、ウルフだけ少し違うお題。話し合いからウルフを当てる
 */
const WordWolfGame = {
  id: "wordwolf",
  name: "ワードウルフ",
  minPlayers: 4,
  maxPlayers: 12,
  DISCUSSION_MS: 5 * 60 * 1000,
  WIN_CARD_BASE: "images/wordwolf/",
  WIN_CARD_VERSION: "20260715d",

  roleNames: {
    wolf: "ワードウルフ",
    citizen: "市民"
  },

  THEMES: [
    { id: "all", name: "おまかせ", hint: "" },
    { id: "animal", name: "動物系", hint: "" },
    { id: "food", name: "食べ物系", hint: "" },
    { id: "daily", name: "日常系", hint: "" },
    { id: "nature", name: "自然・季節系", hint: "" },
    { id: "place", name: "場所・乗り物系", hint: "" },
    { id: "sports", name: "スポーツ系", hint: "" },
    { id: "shimeta", name: "飲み会系", hint: "" },
    { id: "game", name: "ゲーム系", hint: "" },
    { id: "anime", name: "アニメ系", hint: "" }
  ],

  WORD_PAIRS: [
    /* 動物系 ×15 */
    { citizen: "犬", wolf: "猫", theme: "animal" },
    { citizen: "猫", wolf: "ライオン", theme: "animal" },
    { citizen: "うさぎ", wolf: "ハムスター", theme: "animal" },
    { citizen: "ライオン", wolf: "トラ", theme: "animal" },
    { citizen: "パンダ", wolf: "コアラ", theme: "animal" },
    { citizen: "ゾウ", wolf: "キリン", theme: "animal" },
    { citizen: "馬", wolf: "牛", theme: "animal" },
    { citizen: "豚", wolf: "羊", theme: "animal" },
    { citizen: "鶏", wolf: "アヒル", theme: "animal" },
    { citizen: "カメ", wolf: "トカゲ", theme: "animal" },
    { citizen: "ヘビ", wolf: "ワニ", theme: "animal" },
    { citizen: "イルカ", wolf: "クジラ", theme: "animal" },
    { citizen: "ペンギン", wolf: "アザラシ", theme: "animal" },
    { citizen: "熊", wolf: "鹿", theme: "animal" },
    { citizen: "蝶", wolf: "トンボ", theme: "animal" },

    /* 食べ物系 ×15 */
    { citizen: "りんご", wolf: "みかん", theme: "food" },
    { citizen: "ラーメン", wolf: "うどん", theme: "food" },
    { citizen: "コーヒー", wolf: "紅茶", theme: "food" },
    { citizen: "寿司", wolf: "天ぷら", theme: "food" },
    { citizen: "カレー", wolf: "シチュー", theme: "food" },
    { citizen: "パン", wolf: "ごはん", theme: "food" },
    { citizen: "牛乳", wolf: "ヨーグルト", theme: "food" },
    { citizen: "チーズ", wolf: "バター", theme: "food" },
    { citizen: "焼肉", wolf: "しゃぶしゃぶ", theme: "food" },
    { citizen: "たこ焼き", wolf: "お好み焼き", theme: "food" },
    { citizen: "ピザ", wolf: "ハンバーガー", theme: "food" },
    { citizen: "ケーキ", wolf: "プリン", theme: "food" },
    { citizen: "アイス", wolf: "かき氷", theme: "food" },
    { citizen: "味噌汁", wolf: "スープ", theme: "food" },
    { citizen: "餃子", wolf: "春巻き", theme: "food" },

    /* 日常系 ×15 */
    { citizen: "朝ごはん", wolf: "昼ごはん", theme: "daily" },
    { citizen: "スマホ", wolf: "パソコン", theme: "daily" },
    { citizen: "学校", wolf: "塾", theme: "daily" },
    { citizen: "歯磨き", wolf: "洗顔", theme: "daily" },
    { citizen: "映画", wolf: "ドラマ", theme: "daily" },
    { citizen: "財布", wolf: "キーケース", theme: "daily" },
    { citizen: "時計", wolf: "カレンダー", theme: "daily" },
    { citizen: "布団", wolf: "毛布", theme: "daily" },
    { citizen: "掃除", wolf: "洗濯", theme: "daily" },
    { citizen: "買い物", wolf: "ネット通販", theme: "daily" },
    { citizen: "鏡", wolf: "くし", theme: "daily" },
    { citizen: "充電器", wolf: "モバイルバッテリー", theme: "daily" },
    { citizen: "傘", wolf: "雨合羽", theme: "daily" },
    { citizen: "眼鏡", wolf: "サングラス", theme: "daily" },
    { citizen: "仕事", wolf: "バイト", theme: "daily" },

    /* 自然・季節系 ×15 */
    { citizen: "夏", wolf: "冬", theme: "nature" },
    { citizen: "桜", wolf: "紅葉", theme: "nature" },
    { citizen: "山", wolf: "海", theme: "nature" },
    { citizen: "春", wolf: "秋", theme: "nature" },
    { citizen: "雪", wolf: "氷", theme: "nature" },
    { citizen: "台風", wolf: "雷雨", theme: "nature" },
    { citizen: "朝日", wolf: "夕日", theme: "nature" },
    { citizen: "川", wolf: "湖", theme: "nature" },
    { citizen: "森林", wolf: "草原", theme: "nature" },
    { citizen: "虹", wolf: "雷", theme: "nature" },
    { citizen: "満月", wolf: "新月", theme: "nature" },
    { citizen: "花火", wolf: "篝火", theme: "nature" },
    { citizen: "朝霧", wolf: "夕霧", theme: "nature" },
    { citizen: "蝉", wolf: "コオロギ", theme: "nature" },
    { citizen: "向日葵", wolf: "チューリップ", theme: "nature" },

    /* 場所・乗り物系 ×15 */
    { citizen: "電車", wolf: "バス", theme: "place" },
    { citizen: "映画館", wolf: "ライブハウス", theme: "place" },
    { citizen: "コンビニ", wolf: "スーパー", theme: "place" },
    { citizen: "空港", wolf: "港", theme: "place" },
    { citizen: "図書館", wolf: "美術館", theme: "place" },
    { citizen: "公園", wolf: "遊園地", theme: "place" },
    { citizen: "病院", wolf: "薬局", theme: "place" },
    { citizen: "カフェ", wolf: "レストラン", theme: "place" },
    { citizen: "銀行", wolf: "郵便局", theme: "place" },
    { citizen: "ホテル", wolf: "旅館", theme: "place" },
    { citizen: "警察署", wolf: "消防署", theme: "place" },
    { citizen: "神社", wolf: "お寺", theme: "place" },
    { citizen: "高速道路", wolf: "一般道", theme: "place" },
    { citizen: "地下鉄", wolf: "路面電車", theme: "place" },
    { citizen: "自転車", wolf: "バイク", theme: "place" },

    /* スポーツ系 ×15 */
    { citizen: "サッカー", wolf: "野球", theme: "sports" },
    { citizen: "テニス", wolf: "バドミントン", theme: "sports" },
    { citizen: "バスケ", wolf: "バレー", theme: "sports" },
    { citizen: "卓球", wolf: "スカッシュ", theme: "sports" },
    { citizen: "ゴルフ", wolf: "ボウリング", theme: "sports" },
    { citizen: "水泳", wolf: "ダイビング", theme: "sports" },
    { citizen: "マラソン", wolf: "ウォーキング", theme: "sports" },
    { citizen: "柔道", wolf: "空手", theme: "sports" },
    { citizen: "スキー", wolf: "スノボ", theme: "sports" },
    { citizen: "登山", wolf: "キャンプ", theme: "sports" },
    { citizen: "釣り", wolf: "潜水", theme: "sports" },
    { citizen: "ボクシング", wolf: "キックボクシング", theme: "sports" },
    { citizen: "体操", wolf: "新体操", theme: "sports" },
    { citizen: "陸上", wolf: "トライアスロン", theme: "sports" },
    { citizen: "相撲", wolf: "プロレス", theme: "sports" },

    /* 飲み会系 ×15 */
    { citizen: "おなら", wolf: "げっぷ", theme: "shimeta" },
    { citizen: "トイレ", wolf: "お風呂", theme: "shimeta" },
    { citizen: "パンツ", wolf: "ズボン", theme: "shimeta" },
    { citizen: "鼻くそ", wolf: "耳垢", theme: "shimeta" },
    { citizen: "腋", wolf: "足裏", theme: "shimeta" },
    { citizen: "しゃべくり", wolf: "くしゃみ", theme: "shimeta" },
    { citizen: "ゲップ", wolf: "あくび", theme: "shimeta" },
    { citizen: "毛穴", wolf: "ほくろ", theme: "shimeta" },
    { citizen: "よだれ", wolf: "鼻血", theme: "shimeta" },
    { citizen: "破れた靴下", wolf: "穴あき靴下", theme: "shimeta" },
    { citizen: "腹筋", wolf: "ぽっこりお腹", theme: "shimeta" },
    { citizen: "口臭", wolf: "体臭", theme: "shimeta" },
    { citizen: "肉球", wolf: "足の指", theme: "shimeta" },
    { citizen: "背中の痒いところ", wolf: "肩のこり", theme: "shimeta" },
    { citizen: "咳", wolf: "せきこみ", theme: "shimeta" },

    /* ゲーム系 ×15 */
    { citizen: "マリオ", wolf: "ルイージ", theme: "game" },
    { citizen: "ポケモン", wolf: "モンスター狩り", theme: "game" },
    { citizen: "RPG", wolf: "アクション", theme: "game" },
    { citizen: "Switch", wolf: "PlayStation", theme: "game" },
    { citizen: "格闘ゲーム", wolf: "シューティング", theme: "game" },
    { citizen: "マインクラフト", wolf: "サンドボックスゲーム", theme: "game" },
    { citizen: "オンライン対戦", wolf: "協力プレイ", theme: "game" },
    { citizen: "ゲームセンター", wolf: "ネットカフェ", theme: "game" },
    { citizen: "パズルゲーム", wolf: "脳トレゲーム", theme: "game" },
    { citizen: "レースゲーム", wolf: "ドライブゲーム", theme: "game" },
    { citizen: "音ゲー", wolf: "リズムゲーム", theme: "game" },
    { citizen: "ガチャ", wolf: "課金", theme: "game" },
    { citizen: "セーブ", wolf: "ロード", theme: "game" },
    { citizen: "ボス戦", wolf: "ラスボス", theme: "game" },
    { citizen: "攻略本", wolf: "実況動画", theme: "game" },

    /* アニメ系 ×15 */
    { citizen: "魔法少女", wolf: "ヒーロー", theme: "anime" },
    { citizen: "転生", wolf: "異世界", theme: "anime" },
    { citizen: "少年漫画", wolf: "少女漫画", theme: "anime" },
    { citizen: "忍者", wolf: "海賊", theme: "anime" },
    { citizen: "ロボット", wolf: "メカ", theme: "anime" },
    { citizen: "学園もの", wolf: "バトルもの", theme: "anime" },
    { citizen: "ツンデレ", wolf: "ヤンデレ", theme: "anime" },
    { citizen: "アニメ", wolf: "漫画", theme: "anime" },
    { citizen: "声優", wolf: "歌手", theme: "anime" },
    { citizen: "オープニング", wolf: "エンディング", theme: "anime" },
    { citizen: "キャラクターグッズ", wolf: "フィギュア", theme: "anime" },
    { citizen: "コスプレ", wolf: "オタク", theme: "anime" },
    { citizen: "原作", wolf: "アニメ化", theme: "anime" },
    { citizen: "主人公", wolf: "ライバル", theme: "anime" },
    { citizen: "必殺技", wolf: "奥義", theme: "anime" }
  ],

  getTheme: function (themeId) {
    if (themeId === "adult") themeId = "shimeta";
    const theme = this.THEMES.find(function (t) { return t.id === themeId; });
    return theme || this.THEMES[0];
  },

  getPairsForTheme: function (themeId) {
    if (themeId === "adult") themeId = "shimeta";
    if (!themeId || themeId === "all") return this.WORD_PAIRS.slice();
    return this.WORD_PAIRS.filter(function (pair) { return pair.theme === themeId; });
  },

  getMaxWolves: function (playerCount) {
    if (playerCount <= 5) return 1;
    if (playerCount <= 9) return 2;
    return 3;
  },

  clampWolfCount: function (playerCount, wolfCount) {
    const max = this.getMaxWolves(playerCount);
    return Math.max(1, Math.min(max, wolfCount || 1));
  },

  ensureLobbySetup: function (room, preset) {
    const count = room.players.length;
    if (!room.lobbyWordwolf) {
      room.lobbyWordwolf = {
        themeId: "all",
        wolfCount: 1
      };
    }
    if (preset) {
      if (preset.themeId) room.lobbyWordwolf.themeId = preset.themeId === "adult" ? "shimeta" : preset.themeId;
      if (preset.wolfCount) room.lobbyWordwolf.wolfCount = preset.wolfCount;
    }
    room.lobbyWordwolf.wolfCount = this.clampWolfCount(count, room.lobbyWordwolf.wolfCount);
    return room.lobbyWordwolf;
  },

  syncLobbySetupPlayerCount: function (room) {
    if (!room.lobbyWordwolf) return room;
    room.lobbyWordwolf.wolfCount = this.clampWolfCount(room.players.length, room.lobbyWordwolf.wolfCount);
    return room;
  },

  selectLobbyTheme: function (room, themeId) {
    const lobby = this.ensureLobbySetup(room);
    lobby.themeId = themeId === "adult" ? "shimeta" : themeId;
    return room;
  },

  adjustLobbyWolfCount: function (room, delta) {
    const lobby = this.ensureLobbySetup(room);
    lobby.wolfCount = this.clampWolfCount(room.players.length, lobby.wolfCount + delta);
    return room;
  },

  assignRoles: function (count, wolfCount) {
    const roles = [];
    const wolves = this.clampWolfCount(count, wolfCount);
    for (let i = 0; i < wolves; i++) roles.push("wolf");
    while (roles.length < count) roles.push("citizen");
    return shuffle(roles);
  },

  init: function (room) {
    const setup = this.ensureLobbySetup(room);
    const pairs = this.getPairsForTheme(setup.themeId);
    const pair = shuffle(pairs)[0];
    const wolfCount = this.clampWolfCount(room.players.length, setup.wolfCount);
    const roles = this.assignRoles(room.players.length, wolfCount);
    const shuffledPlayers = shuffle(room.players);
    const roleMap = {};
    const wordMap = {};
    const theme = this.getTheme(setup.themeId);

    shuffledPlayers.forEach(function (p, i) {
      roleMap[p.id] = roles[i];
      wordMap[p.id] = roles[i] === "wolf" ? pair.wolf : pair.citizen;
    });

    room.gameState = {
      roles: roleMap,
      words: wordMap,
      pair: pair,
      themeId: setup.themeId,
      themeName: theme.name,
      wolfCount: wolfCount,
      votes: {},
      voteIndex: 0,
      wordConfirmed: {},
      winner: null,
      executed: null,
      wolfGuess: null,
      discussionEndsAt: null,
      proceedReady: {}
    };

    if (room.mode === "online" || room.mode === "room") {
      room.phase = "wordwolf_ready";
    } else {
      room.phase = "wordwolf_reveal";
      room.gameState.revealIndex = 0;
    }
    return room;
  },

  getRole: function (ctx, playerId) {
    return Secrets.getRole(ctx, playerId);
  },

  getWord: function (ctx, playerId) {
    if (!ctx.isOnline) {
      return ctx.room.gameState.words ? ctx.room.gameState.words[playerId] : null;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.words) {
      return ctx.hostSecrets.words[playerId];
    }
    if (playerId === ctx.me.id && ctx.secrets && ctx.secrets.word) {
      return ctx.secrets.word;
    }
    return null;
  },

  confirmWord: function (room, playerId) {
    room.gameState.wordConfirmed[playerId] = true;
    return room;
  },

  allWordsConfirmed: function (room) {
    return room.players.every(function (p) {
      return room.gameState.wordConfirmed[p.id];
    });
  },

  startDiscussion: function (room) {
    room.gameState.discussionEndsAt = Date.now() + this.DISCUSSION_MS;
    room.gameState.proceedReady = {};
    room.phase = "wordwolf_discuss";
    return room;
  },

  nextReveal: function (room) {
    const gs = room.gameState;
    if (gs.revealIndex < room.players.length - 1) {
      gs.revealIndex += 1;
    } else {
      this.startDiscussion(room);
    }
    return room;
  },

  startVote: function (room) {
    room.gameState.votes = {};
    room.gameState.voteIndex = 0;
    room.phase = "wordwolf_vote";
    return room;
  },

  getCurrentVoter: function (room) {
    if (room.mode === "local") {
      const idx = room.gameState.voteIndex;
      if (idx >= room.players.length) return null;
      return room.players[idx];
    }
    return null;
  },

  castVote: function (room, voterId, targetId) {
    const gs = room.gameState;
    gs.votes[voterId] = targetId;
    if (room.mode === "local") {
      gs.voteIndex += 1;
    }
    return room;
  },

  allVoted: function (room) {
    return room.players.every(function (p) {
      return room.gameState.votes[p.id];
    });
  },

  countVotesCast: function (room) {
    const gs = room.gameState;
    return room.players.filter(function (p) { return gs.votes[p.id]; }).length;
  },

  hasVoteMajority: function (room) {
    const total = room.players.length;
    if (!total) return false;
    return this.countVotesCast(room) > total / 2;
  },

  canResolveVote: function (room) {
    return this.allVoted(room) || this.hasVoteMajority(room);
  },

  countProceedReady: function (room) {
    const ready = room.gameState.proceedReady || {};
    return room.players.filter(function (p) { return ready[p.id]; }).length;
  },

  hasProceedMajority: function (room) {
    const total = room.players.length;
    if (!total) return false;
    return this.countProceedReady(room) > total / 2;
  },

  markProceedReady: function (room, playerId) {
    const gs = room.gameState;
    if (!gs.proceedReady) gs.proceedReady = {};
    gs.proceedReady[playerId] = true;
    return room;
  },

  renderProceedReadyPanel: function (room, me, action) {
    const gs = room.gameState;
    const ready = gs.proceedReady || {};
    const total = room.players.length;
    const count = this.countProceedReady(room);
    const majority = Math.floor(total / 2) + 1;
    const html = [];

    html.push('<section class="card"><h2>投票に進む</h2>');
    html.push('<p class="note">残り時間を待たず、過半数（' + majority + '人）が賛成すると投票に進みます。</p>');
    html.push('<ul class="player-list">');
    room.players.forEach(function (p) {
      html.push('<li>' + escapeHtml(p.name) + (ready[p.id] ? ' ✓' : '') + '</li>');
    });
    html.push('</ul>');
    html.push('<p class="note">' + count + '/' + total + '人が賛成</p>');

    if (!ready[me.id]) {
      html.push('<button type="button" class="btn btn-secondary btn-block" data-action="' + action + '">投票に進みたい</button>');
    } else {
      html.push('<p class="note">あなたは投票に進みたいに賛成済みです</p>');
    }
    html.push('</section>');
    return html.join("");
  },

  normalizeGuess: function (text) {
    return String(text || "").trim().replace(/\s+/g, "");
  },

  submitWolfGuess: function (room, guess) {
    const gs = room.gameState;
    const normalized = this.normalizeGuess(guess);
    gs.wolfGuess = normalized;
    if (normalized && this.normalizeGuess(gs.pair.citizen) === normalized) {
      gs.winner = "wolf";
    } else {
      gs.winner = "citizens";
    }
    room.phase = "wordwolf_end";
    return room;
  },

  getVoteTally: function (room) {
    const tally = {};
    Object.values((room.gameState && room.gameState.votes) || {}).forEach(function (id) {
      if (!id) return;
      tally[id] = (tally[id] || 0) + 1;
    });
    return tally;
  },

  getTopVotes: function (room) {
    const tally = this.getVoteTally(room);
    let max = 0;
    Object.keys(tally).forEach(function (id) {
      if (tally[id] > max) max = tally[id];
    });
    const ids = Object.keys(tally).filter(function (id) {
      return tally[id] === max;
    });
    return { max: max, ids: ids, tally: tally };
  },

  playerNameById: function (room, id) {
    const p = room.players.find(function (player) { return player.id === id; });
    return p ? p.name : "？";
  },

  renderVoteResults: function (room) {
    const gs = room.gameState;
    const top = this.getTopVotes(room);
    const html = [];
    html.push('<section class="card wordwolf-vote-results">');

    if (gs.executed) {
      html.push(
        '<p>最多票：<strong>' +
          escapeHtml(this.playerNameById(room, gs.executed)) +
          '</strong>（' + top.max + '票）</p>'
      );
    } else {
      html.push('<p>同票のため、追放されませんでした</p>');
      if (top.ids.length && top.max > 0) {
        const names = top.ids.map(function (id) {
          return WordWolfGame.playerNameById(room, id);
        }).join("、");
        html.push(
          '<p>最多票：<strong>' +
            escapeHtml(names) +
            '</strong>（各 ' + top.max + '票）</p>'
        );
      }
    }

    html.push('<h3 class="wordwolf-vote-heading">投票の内訳</h3>');
    html.push('<ul class="player-list wordwolf-vote-breakdown">');
    room.players.forEach(function (p) {
      const targetId = gs.votes && gs.votes[p.id];
      if (!targetId) {
        html.push('<li><span>' + escapeHtml(p.name) + '：未投票</span></li>');
        return;
      }
      html.push(
        '<li><span>' +
          escapeHtml(p.name) +
          ' → ' +
          escapeHtml(WordWolfGame.playerNameById(room, targetId)) +
          '</span></li>'
      );
    });
    html.push('</ul></section>');
    return html.join("");
  },

  resolveVote: function (room, roles) {
    const gs = room.gameState;
    const top = this.getTopVotes(room);
    const tally = top.tally;

    let max = 0;
    let executed = null;
    let tie = false;

    Object.keys(tally).forEach(function (id) {
      if (tally[id] > max) {
        max = tally[id];
        executed = id;
        tie = false;
      } else if (tally[id] === max) {
        tie = true;
      }
    });

    gs.executed = tie ? null : executed;

    if (tie || !executed) {
      gs.winner = "wolf";
      room.phase = "wordwolf_end";
      return room;
    }

    if (roles[executed] === "wolf") {
      gs.winner = "citizens_pending";
      room.phase = "wordwolf_wolf_guess";
      return room;
    }

    gs.winner = "wolf";
    room.phase = "wordwolf_end";
    return room;
  },

  canManage: function (ctx) {
    return ctx.isHost || ctx.room.mode === "local";
  },

  isRemoteRoom: function (room) {
    return room.mode === "room" || room.mode === "online";
  },

  getRolesMap: function (ctx) {
    const gs = ctx.room.gameState;
    if (!ctx.isOnline) return gs && gs.roles ? gs.roles : {};
    if (gs && gs.revealedRoles) return gs.revealedRoles;
    if (ctx.hostSecrets && ctx.hostSecrets.roles) return ctx.hostSecrets.roles;
    if (gs && gs.roles) return gs.roles;
    return {};
  },

  getWordsMap: function (ctx) {
    const gs = ctx.room.gameState;
    if (!ctx.isOnline) return gs && gs.words ? gs.words : {};
    if (gs && gs.revealedWords) return gs.revealedWords;
    if (ctx.hostSecrets && ctx.hostSecrets.words) return ctx.hostSecrets.words;
    if (gs && gs.words) return gs.words;
    return {};
  },

  renderLobbySetup: function (room, canManage) {
    const lobby = this.ensureLobbySetup(room);
    const count = room.players.length;
    const maxWolves = this.getMaxWolves(count);
    const html = ['<section class="card setup-panel lobby-setup-panel">'];
    const self = this;

    html.push('<h2>ゲーム設定</h2>');
    html.push('<p class="section-lead">お題の系統とウルフの人数を選んでください</p>');

    html.push('<h3 class="setup-subtitle">お題の系統</h3>');
    html.push('<div class="setup-options ww-theme-options">');
    this.THEMES.forEach(function (theme) {
      const selected = lobby.themeId === theme.id;
      if (canManage) {
        html.push(
          '<button type="button" class="setup-option' + (selected ? " is-selected" : "") + '" data-action="ww-lobby-theme" data-theme="' + theme.id + '">' +
            '<span class="setup-option-name">' + escapeHtml(theme.name) + '</span>' +
            (theme.hint ? '<span class="setup-option-hint">' + escapeHtml(theme.hint) + '</span>' : "") +
          '</button>'
        );
      } else if (selected) {
        html.push(
          '<div class="setup-option setup-option--readonly is-selected">' +
            '<span class="setup-option-name">' + escapeHtml(theme.name) + '</span>' +
            (theme.hint ? '<span class="setup-option-hint">' + escapeHtml(theme.hint) + '</span>' : "") +
          '</div>'
        );
      }
    });
    html.push('</div>');

    html.push('<h3 class="setup-subtitle" style="margin-top:1rem">ウルフの人数</h3>');
    html.push('<div class="player-count-row">');
    if (canManage) {
      html.push('<button type="button" class="btn btn-secondary player-count-btn" data-action="ww-lobby-wolves" data-delta="-1" ' + (lobby.wolfCount <= 1 ? "disabled" : "") + '>−</button>');
    }
    html.push('<span class="player-count-value">' + lobby.wolfCount + '</span>');
    if (canManage) {
      html.push('<button type="button" class="btn btn-secondary player-count-btn" data-action="ww-lobby-wolves" data-delta="1" ' + (lobby.wolfCount >= maxWolves ? "disabled" : "") + '>＋</button>');
    }
    html.push('<span class="player-count-hint">人（最大 ' + maxWolves + '人）</span>');
    html.push('</div>');

    if (!canManage) {
      html.push('<p class="note">ホストが設定を選びます</p>');
    }

    html.push('</section>');
    return html.join("");
  },

  renderPlaySetup: function (playerCount, themeId, wolfCount, canEdit) {
    const lobby = {
      themeId: themeId || "all",
      wolfCount: this.clampWolfCount(playerCount, wolfCount || 1)
    };
    const maxWolves = this.getMaxWolves(playerCount);
    let html = '<div class="wordwolf-play-setup-inner">';
    html.push('<h3 class="setup-title">ゲーム設定</h3>');
    html.push('<p class="note">お題の系統とウルフの人数</p>');

    html.push('<div class="setup-options ww-theme-options">');
    this.THEMES.forEach(function (theme) {
      const selected = lobby.themeId === theme.id;
      if (canEdit) {
        html.push(
          '<button type="button" class="setup-option' + (selected ? " is-selected" : "") + '" data-ww-theme="' + theme.id + '">' +
            '<span class="setup-option-name">' + escapeHtml(theme.name) + '</span>' +
            (theme.hint ? '<span class="setup-option-hint">' + escapeHtml(theme.hint) + '</span>' : "") +
          '</button>'
        );
      }
    });
    html.push('</div>');

    html.push('<div class="player-count-row" style="margin-top:0.75rem">');
    html.push('<span class="player-count-label">ウルフ</span>');
    if (canEdit) {
      html.push('<button type="button" class="btn btn-secondary player-count-btn" data-ww-wolves-delta="-1" ' + (lobby.wolfCount <= 1 ? "disabled" : "") + '>−</button>');
    }
    html.push('<span class="player-count-value" id="wwPlayWolfCount">' + lobby.wolfCount + '</span>');
    if (canEdit) {
      html.push('<button type="button" class="btn btn-secondary player-count-btn" data-ww-wolves-delta="1" ' + (lobby.wolfCount >= maxWolves ? "disabled" : "") + '>＋</button>');
    }
    html.push('<span class="player-count-hint">人（最大 ' + maxWolves + '人）</span>');
    html.push('</div></div>');
    return html;
  },

  renderWinCard: function (winner) {
    const isCitizens = winner === "citizens" || winner === "citizens_pending";
    const file = isCitizens ? "villager.card.png" : "werewolf.card.png";
    const alt = isCitizens ? "市民の勝利" : "ワードウルフの勝利";
    const src = this.WIN_CARD_BASE + file + "?v=" + this.WIN_CARD_VERSION;
    return (
      '<div class="wordwolf-win-card-stage">' +
        '<img class="wordwolf-win-card" src="' + src + '" alt="' + alt + '" decoding="async">' +
      "</div>"
    );
  },

  renderWordReveal: function (word) {
    return (
      '<div id="wordReveal" class="hidden secret-panel">' +
        '<p class="note">あなたのお題</p>' +
        '<p class="big" style="color:var(--accent-2)">' + escapeHtml(word || "？") + '</p>' +
        '<p class="note" style="margin-top:0.75rem">ウルフかどうかは分かりません。お題について話し合いましょう。</p>' +
      '</div>'
    );
  },

  renderDiscussionTimer: function () {
    return (
      '<section class="card discussion-panel">' +
        '<p class="discussion-timer-label">話し合い 残り時間</p>' +
        '<p class="discussion-timer" id="discussionTimer">5:00</p>' +
        '<p class="note">お題を直接言わず、連想やヒントで会話してください。</p>' +
      '</section>'
    );
  },

  renderVoteGrid: function (room, action, excludeId) {
    let html = '<div class="player-pick-grid">';
    room.players.filter(function (p) { return p.id !== excludeId; }).forEach(function (p) {
      html += '<button type="button" class="player-pick" data-action="' + action + '" data-player="' + p.id + '">' + escapeHtml(p.name) + '</button>';
    });
    html += '</div>';
    return html;
  },

  render: function (ctx) {
    const room = ctx.room;
    const me = ctx.me;
    const gs = room.gameState;
    const html = [];
    const myWord = this.getWord(ctx, me.id);
    const canManage = this.canManage(ctx);

    if (room.phase === "wordwolf_ready") {
      html.push('<div class="phase-banner"><h2>お題確認</h2><p>' + (this.isRemoteRoom(room) ? "自分のスマホでお題だけを確認してください" : "自分のお題だけを確認してください") + '</p></div>');
      html.push('<section class="card secret-panel">');
      html.push('<button type="button" class="btn btn-primary" data-action="ww-show-word">お題を見る</button>');
      html.push(this.renderWordReveal(myWord));

      if (!gs.wordConfirmed[me.id]) {
        html.push('<button type="button" class="btn btn-success" style="margin-top:1rem" data-action="ww-confirm-word">確認した</button>');
      } else {
        html.push('<p class="note" style="margin-top:1rem">確認済み ✓</p>');
      }
      html.push('</section>');

      const confirmedCount = room.players.filter(function (p) { return gs.wordConfirmed[p.id]; }).length;
      html.push('<p class="note" style="text-align:center">確認済み ' + confirmedCount + ' / ' + room.players.length + '人</p>');

      if (canManage) {
        const allDone = this.allWordsConfirmed(room);
        html.push('<button type="button" class="btn btn-primary" data-action="ww-start-discuss" ' + (allDone ? "" : "disabled") + '>話し合いを始める</button>');
        if (!allDone) html.push('<p class="note">全員の確認を待っています</p>');
      }
      return html.join("");
    }

    if (room.phase === "wordwolf_reveal") {
      const target = room.players[gs.revealIndex];
      html.push('<div class="phase-banner"><h2>お題確認 ' + (gs.revealIndex + 1) + '/' + room.players.length + '</h2><p>端末を回して本人だけが見てください</p></div>');
      html.push('<section class="card secret-panel">');
      html.push('<p><strong>' + escapeHtml(target.name) + '</strong> さん</p>');
      html.push('<button type="button" class="btn btn-primary" data-action="ww-show-word">お題を見る</button>');
      html.push(this.renderWordReveal(this.getWord(ctx, target.id)));
      if (canManage) {
        html.push('<button type="button" class="btn btn-success" style="margin-top:1rem" data-action="ww-next-reveal">次へ</button>');
      }
      html.push('</section>');
      return html.join("");
    }

    if (room.phase === "wordwolf_discuss") {
      html.push('<div class="phase-banner"><h2>話し合い</h2><p>' + (this.isRemoteRoom(room) ? "みんなで自由に話し合ってください（5分）" : "お題について自由に会話してください（5分）") + '</p></div>');
      if (gs.themeName) {
        html.push('<p class="note" style="text-align:center;margin:-0.5rem 0 1rem">' + escapeHtml(gs.themeName) + ' · ウルフ ' + gs.wolfCount + '人</p>');
      }
      html.push(this.renderDiscussionTimer());
      html.push('<section class="card"><h2>参加者</h2><ul class="player-list">');
      room.players.forEach(function (p) {
        html.push('<li>' + escapeHtml(p.name) + '</li>');
      });
      html.push('</ul></section>');

      if (me && room.mode !== "local") {
        html.push(this.renderProceedReadyPanel(room, me, "ww-proceed-ready"));
      }

      if (canManage) {
        html.push('<button type="button" class="btn btn-primary" data-action="ww-start-vote">投票へ進む</button>');
        if (room.mode === "local") {
          html.push('<p class="note">話し合いが終わったら投票へ進んでください</p>');
        } else {
          html.push('<p class="note">ホストはいつでも投票へ進めます（残り時間を待つ必要はありません）</p>');
        }
      } else {
        html.push('<p class="note">過半数が賛成するか、ホストが投票へ進むのを待っています…</p>');
      }
      return html.join("");
    }

    if (room.phase === "wordwolf_vote") {
      html.push('<div class="phase-banner"><h2>投票</h2><p>ワードウルフだと思う人に投票してください</p></div>');

      if (room.mode === "local") {
        const voter = this.getCurrentVoter(room);
        if (voter) {
          html.push('<section class="card secret-panel vote-card-panel">');
          html.push('<p class="vote-card-player"><strong>' + escapeHtml(voter.name) + '</strong> さんの番</p>');
          html.push('<p class="vote-card-prompt">ウルフだと思う人を選んでください</p>');
          html.push(this.renderVoteGrid(room, "ww-vote", voter.id));
          html.push('</section>');
        }
      } else if (!gs.votes[me.id]) {
        html.push('<section class="card"><h2>ウルフだと思う人</h2>');
        html.push(this.renderVoteGrid(room, "ww-vote", me.id));
        html.push('</section>');
      } else {
        html.push('<p class="note">投票済み。他の人を待っています。</p>');
      }

      html.push('<section class="card"><h2>投票状況</h2><ul class="player-list">');
      room.players.forEach(function (p) {
        html.push('<li>' + escapeHtml(p.name) + (gs.votes[p.id] ? " ✓" : "") + '</li>');
      });
      html.push('</ul></section>');

      if (canManage && this.canResolveVote(room)) {
        html.push('<button type="button" class="btn btn-danger" data-action="ww-resolve-vote">投票を集計</button>');
        if (!this.allVoted(room)) {
          html.push('<p class="note">過半数の投票が揃いました。未投票の人がいても集計できます。</p>');
        }
      } else if (canManage) {
        const voted = this.countVotesCast(room);
        const total = room.players.length;
        const majority = Math.floor(total / 2) + 1;
        html.push('<p class="note">投票済み ' + voted + '/' + total + '人（過半数 ' + majority + '人で集計可能）</p>');
      }
      return html.join("");
    }

    if (room.phase === "wordwolf_wolf_guess") {
      const executed = room.players.find(function (p) { return p.id === gs.executed; });
      const roles = this.getRolesMap(ctx);
      const isExecutedWolf = executed && roles[executed.id] === "wolf";
      const canGuess = executed && (
        (!ctx.isOnline && room.mode === "local") ||
        (ctx.isOnline && executed.id === me.id)
      );

      html.push('<div class="phase-banner"><h2>逆転チャンス</h2><p>ワードウルフが見つかりました</p></div>');
      html.push('<section class="card">');
      html.push('<p>最多票：<strong>' + escapeHtml(executed ? executed.name : "？") + '</strong></p>');
      html.push('<p class="note">市民のお題を当てると、ワードウルフの逆転勝利です。</p>');
      html.push('</section>');

      if (canGuess) {
        html.push('<section class="card secret-panel">');
        html.push('<h2>市民のお題を予想</h2>');
        html.push('<p>あなたのお題：<strong style="color:var(--accent-2)">' + escapeHtml(this.getWord(ctx, executed.id)) + '</strong></p>');
        html.push('<input type="text" id="wwGuessInput" placeholder="例：犬" maxlength="20" autocomplete="off">');
        html.push('<button type="button" class="btn btn-primary" style="margin-top:0.75rem" data-action="ww-submit-guess">答えを出す</button>');
        html.push('</section>');
      } else if (room.mode === "local" && executed) {
        html.push('<section class="card secret-panel">');
        html.push('<p><strong>' + escapeHtml(executed.name) + '</strong> さんに端末を渡してください。</p>');
        html.push('<button type="button" class="btn btn-secondary" data-action="ww-show-word">お題を見る</button>');
        html.push(this.renderWordReveal(this.getWord(ctx, executed.id)));
        html.push('<input type="text" id="wwGuessInput" placeholder="市民のお題を入力" maxlength="20" autocomplete="off">');
        html.push('<button type="button" class="btn btn-primary" style="margin-top:0.75rem" data-action="ww-submit-guess">答えを出す</button>');
        html.push('</section>');
      } else if (isExecutedWolf) {
        html.push('<p class="note">ワードウルフの回答を待っています…</p>');
      }

      if (canManage && !isExecutedWolf) {
        html.push('<button type="button" class="btn btn-secondary" data-action="ww-skip-guess">結果を表示</button>');
      }
      return html.join("");
    }

    if (room.phase === "wordwolf_end") {
      const roles = this.getRolesMap(ctx);
      const words = this.getWordsMap(ctx);
      const isCitizensWin = gs.winner === "citizens" || gs.winner === "citizens_pending";
      const winners = room.players.filter(function (p) {
        const role = roles[p.id];
        return isCitizensWin ? role === "citizen" : role === "wolf";
      });

      html.push('<div class="phase-banner"><h2>結果</h2></div>');
      html.push(this.renderWinCard(gs.winner));
      html.push('<div class="wordwolf-win-headline">勝利</div>');
      html.push('<ul class="wordwolf-win-players">');
      winners.forEach(function (p) {
        html.push('<li>' + escapeHtml(p.name) + '</li>');
      });
      html.push('</ul>');

      html.push('<section class="card wordwolf-end-summary">');
      html.push('<p class="wordwolf-theme-line">お題の系統：<strong>' + escapeHtml(gs.themeName || "おまかせ") + '</strong></p>');
      html.push('<p class="wordwolf-topic-line">市民のお題：<strong>' + escapeHtml(gs.pair.citizen) + '</strong></p>');
      html.push('<p class="wordwolf-topic-line">ウルフのお題：<strong>' + escapeHtml(gs.pair.wolf) + '</strong></p>');
      html.push('</section>');

      html.push(this.renderVoteResults(room));

      if (gs.wolfGuess !== null && gs.wolfGuess !== undefined && gs.wolfGuess !== "") {
        const ok = this.normalizeGuess(gs.wolfGuess) === this.normalizeGuess(gs.pair.citizen);
        html.push('<section class="card"><p>ワードウルフの予想：<strong>' + escapeHtml(gs.wolfGuess) + '</strong> — ' + (ok ? "正解！逆転勝利" : "不正解") + '</p></section>');
      }

      html.push('<section class="card"><h2>お題一覧</h2><ul class="player-list wordwolf-topic-list">');
      room.players.forEach(function (p) {
        const word = words[p.id];
        html.push('<li><span>' + escapeHtml(p.name) + '：' + escapeHtml(word || "？") + '</span></li>');
      });
      html.push('</ul></section>');

      if (canManage) {
        html.push('<button type="button" class="btn btn-primary" data-action="ww-restart">もう一局</button>');
      }
      return html.join("");
    }

    return "";
  }
};

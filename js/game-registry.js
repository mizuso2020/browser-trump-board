/**
 * ゲームカタログ — ボードゲーム・トランプ・パーティーゲーム一覧
 * 新しいゲームはここに登録するだけでサイトに表示される
 */

const GAME_CATEGORIES = {
  party: {
    id: "party",
    name: "パーティゲーム",
    description: "推理・心理戦・みんなで盛り上がるゲーム",
    icon: "🎭"
  },
  trump: {
    id: "trump",
    name: "カードゲーム",
    description: "トランプ・ポーカーなどカードで遊ぶ",
    icon: "🃏",
    iconImage: "images/games/playing-cards-icon.png"
  },
  board: {
    id: "board",
    name: "ボードゲーム",
    description: "盤面や駒を使って遊ぶ定番ゲーム",
    icon: "♟️"
  },
  coop: {
    id: "coop",
    name: "協力ゲーム",
    description: "全員で協力してクリアを目指す",
    icon: "🤝"
  },
  dice: {
    id: "dice",
    name: "サイコロ・運試し",
    description: "サイコロや運要素が楽しいゲーム",
    icon: "🎲"
  }
};

/**
 * 開発優先リスト（ユーザー指定）
 * priorityOrder の順で実装予定
 */
const GAME_REGISTRY = {
  /* --- 対応済み --- */
  werewolf: {
    id: "werewolf",
    name: "人狼",
    iconImage: "images/games/werewolf-icon.png",
    category: "party",
    description: "正体を隠し、仲間を信じ、相手を見抜く定番の正体隠匿ゲーム",
    minPlayers: 5,
    maxPlayers: 13,
    status: "live",
    featured: true,
    priority: true,
    priorityOrder: 3,
    modesSoon: ["online"],
    module: "WerewolfGame"
  },
  /* --- 協力・ワード（対応済み） --- */
  ngword: {
    id: "ngword",
    name: "NGワードゲーム",
    category: "coop",
    description: "お題を説明するが、NGワードは禁止。言ったら負け（タブー型）",
    minPlayers: 3,
    maxPlayers: 8,
    status: "soon",
    featured: true,
    module: "NgWordGame"
  },
  ito: {
    id: "ito",
    name: "イト（Ito）",
    category: "coop",
    description: "1〜100の数字を、お題に沿った言葉だけで協力して昇順に並べるクモノイト",
    minPlayers: 2,
    maxPlayers: 8,
    status: "live",
    playCaution: "バグあるかも",
    modesSoon: ["room", "online"],
    module: "ItoGame"
  },

  /* --- 開発優先（準備中） --- */
  daifugo: {
    id: "daifugo",
    name: "大富豪",
    category: "trump",
    description: "階級ありのトランプ。大富豪を目指してカードを出し合う",
    minPlayers: 3,
    maxPlayers: 6,
    status: "soon",
    featured: true,
    priority: true,
    priorityOrder: 1,
    module: "DaifugoGame"
  },
  doubt: {
    id: "doubt",
    name: "ダウト",
    category: "trump",
    description: "4枚のカードを裏向きで出し、嘘か本当かを見破る心理戦トランプ",
    minPlayers: 2,
    maxPlayers: 4,
    status: "soon",
    featured: true,
    priority: true,
    priorityOrder: 2,
    module: "DoubtGame"
  },
  wordwolf: {
    id: "wordwolf",
    name: "ワードウルフ",
    iconImage: "images/games/wordwolf-icon.png",
    category: "party",
    description: "お題について話し合い、違うお題を持つワードウルフを見つける心理戦",
    minPlayers: 4,
    maxPlayers: 12,
    status: "live",
    featured: true,
    priority: true,
    priorityOrder: 4,
    modesSoon: ["room", "online"],
    module: "WordWolfGame"
  },
  coyote: {
    id: "coyote",
    name: "コヨーテ",
    category: "party",
    description: "数字カードを裏向きで重ね、合計を超えたら負け。ブラフが楽しい",
    minPlayers: 3,
    maxPlayers: 6,
    status: "soon",
    featured: true,
    priority: true,
    priorityOrder: 5,
    module: "CoyoteGame"
  },
  codenames: {
    id: "codenames",
    name: "コードネーム",
    category: "coop",
    description: "スパイマスターの1語ヒントで、自チームのワードを当てる",
    minPlayers: 4,
    maxPlayers: 8,
    status: "soon",
    featured: true,
    priority: true,
    priorityOrder: 6,
    module: "CodenamesGame"
  },
  skull: {
    id: "skull",
    name: "スカル",
    category: "party",
    description: "花か髑髏か。かけて裏返し、最後まで残った人が勝ち",
    minPlayers: 3,
    maxPlayers: 6,
    status: "soon",
    priority: true,
    priorityOrder: 7
  },
  cockroach: {
    id: "cockroach",
    name: "ごきぶりポーカー",
    category: "party",
    description: "虫カードを渡し合い、最後にゴキブリが残った人の負け",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon",
    priority: true,
    priorityOrder: 8
  },
  catan: {
    id: "catan",
    name: "カタン",
    category: "board",
    description: "資源を集めて開拓地を広げる。交渉と戦略のボードゲーム",
    minPlayers: 3,
    maxPlayers: 4,
    status: "soon",
    priority: true,
    priorityOrder: 9
  },
  dixit: {
    id: "dixit",
    name: "ディクシット",
    category: "coop",
    description: "絵カードに連想するヒントを出し、当てすぎず外しすぎずを狙う",
    minPlayers: 3,
    maxPlayers: 6,
    status: "soon",
    priority: true,
    priorityOrder: 10
  },

  /* --- その他（準備中） --- */
  oldmaid: {
    id: "oldmaid",
    name: "ババ抜き",
    category: "trump",
    description: "ペアを揃えて手札を減らす。最後にジョーカーが残った人の負け",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon",
    featured: true,
    module: "OldMaidGame"
  },
  sevens: {
    id: "sevens",
    name: "七並べ",
    category: "trump",
    description: "7を中心に並べていく定番トランプ",
    minPlayers: 2,
    maxPlayers: 4,
    status: "soon",
    featured: true,
    module: "SevensGame"
  },
  memory: {
    id: "memory",
    name: "神経衰弱",
    category: "trump",
    description: "裏向きのカードをめくってペアを揃える。枚数多い人が勝ち",
    minPlayers: 2,
    maxPlayers: 4,
    status: "soon"
  },
  speed: {
    id: "speed",
    name: "スピード",
    category: "trump",
    description: "場のカード±1で出し切る早押しトランプ",
    minPlayers: 2,
    maxPlayers: 2,
    status: "soon"
  },
  ninetyNine: {
    id: "ninetyNine",
    name: "99",
    category: "trump",
    description: "出したカードの合計が99を超えたら負け。心理戦トランプ",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon"
  },
  pageOne: {
    id: "pageOne",
    name: "大富豪（ページワン）",
    category: "trump",
    description: "1枚ずつ出して同じ数字・マークで縛り。1枚残しで勝ち",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon"
  },
  texas_holdem: {
    id: "texas_holdem",
    name: "テキサスホールデム ⭐",
    category: "trump",
    description: "手札2枚＋場札5枚。WSOPでも採用の一番人気ポーカー",
    minPlayers: 2,
    maxPlayers: 9,
    status: "soon",
    featured: true,
    module: "TexasHoldemGame"
  },
  seven_stud: {
    id: "seven_stud",
    name: "セブンカード・スタッド",
    category: "trump",
    description: "場札なし。最大7枚から5枚で役を作る昔ながらのポーカー",
    minPlayers: 2,
    maxPlayers: 8,
    status: "soon",
    featured: true,
    module: "SevenStudGame"
  },
  five_draw: {
    id: "five_draw",
    name: "ファイブカード・ドロー",
    category: "trump",
    description: "5枚配られ、カードを交換して役を作る。映画でおなじみのポーカー",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon",
    featured: true,
    module: "FiveDrawGame"
  },
  reversi: {
    id: "reversi",
    name: "オセロ",
    iconImage: "images/games/reversi-icon.png",
    category: "board",
    description: "石を裏返しながら陣地を広げる2人対戦。1台または各自のスマホで対戦",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    modesSoon: ["online"],
    module: "ReversiGame"
  },
  gomoku: {
    id: "gomoku",
    name: "五目並べ",
    iconImage: "images/games/gomoku-icon.png",
    category: "board",
    description: "黒白の石を交互に置き、5つ並べたら勝ち。1台のスマホを交代で操作",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    modesSoon: ["room", "online"],
    module: "GomokuGame"
  },
  shogi: {
    id: "shogi",
    name: "将棋",
    iconImage: "images/games/shogi-icon.png",
    category: "board",
    description: "駒を動かして相手の玉を詰ます。1台のスマホを交代で操作",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    modesSoon: ["room", "online"],
    module: "ShogiGame"
  },
  vanishing_ttt: {
    id: "vanishing_ttt",
    name: "消える○×",
    iconImage: "images/games/marubatu-icon.png",
    category: "board",
    description: "3×3で〇×を並べるが、4個目を置くと最古の駒が消える三目並べ",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    instantLocal: true,
    modesSoon: ["online"],
    module: "VanishingTttGame"
  },
  tic_tac_toe: {
    id: "tic_tac_toe",
    name: "ノーマル○×ゲーム",
    iconImage: "images/games/marubatu-icon.png",
    category: "board",
    description: "3×3の定番○×。横・縦・斜めに3つ並べた方の勝ち",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    instantLocal: true,
    modesSoon: ["online"],
    module: "TicTacToeGame"
  },
  matryoshka_ttt: {
    id: "matryoshka_ttt",
    name: "マトリョーシカ○×",
    iconImage: "images/games/marubatu-icon.png",
    category: "board",
    description: "小・中・大のコマを重ねて三目を狙う。大きいコマだけ上に置ける",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    instantLocal: true,
    modesSoon: ["online"],
    module: "MatryoshkaTttGame"
  },
  chinchiro: {
    id: "chinchiro",
    name: "チンチロ",
    category: "dice",
    description: "サイコロ3つで役を競う",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon"
  }
};

const GameRegistry = {
  all: function () {
    return Object.values(GAME_REGISTRY);
  },

  featured: function () {
    return this.all().filter(function (g) { return g.featured && g.status === "live"; });
  },

  priority: function () {
    return this.all()
      .filter(function (g) { return g.priority; })
      .sort(function (a, b) { return a.priorityOrder - b.priorityOrder; });
  },

  live: function () {
    return this.all().filter(function (g) { return g.status === "live"; });
  },

  soon: function () {
    return this.all().filter(function (g) { return g.status === "soon"; });
  },

  get: function (id) {
    return GAME_REGISTRY[id] || null;
  },

  byCategory: function (categoryId) {
    return this.all().filter(function (g) { return g.category === categoryId; });
  },

  resolveModule: function (moduleName) {
    if (!moduleName) return null;
    if (typeof window[moduleName] !== "undefined") {
      return window[moduleName];
    }
    try {
      return (0, eval)(moduleName);
    } catch (e) {
      return null;
    }
  },

  getModule: function (id) {
    const meta = this.get(id);
    if (!meta || !meta.module || meta.status !== "live") return null;
    return this.resolveModule(meta.module);
  },

  getLiveModules: function () {
    const map = {};
    const self = this;
    this.live().forEach(function (meta) {
      const mod = self.resolveModule(meta.module);
      if (mod) map[meta.id] = mod;
    });
    return map;
  },

  countByStatus: function () {
    return {
      live: this.live().length,
      soon: this.soon().length,
      total: this.all().length,
      priority: this.priority().length
    };
  }
};
